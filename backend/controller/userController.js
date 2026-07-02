import express from "express";
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import validator from "validator";
import crypto from "crypto";
import userModel from "../models/userModel.js";
import { Admin } from "../models/userModel.js";
import emailService from "../services/emailService.js";
import { validateEmail, isDisposableEmail } from "../utils/emailValidation.js";

const backendurl = process.env.BACKEND_URL;

const createtoken = (id, rememberMe = false) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: rememberMe ? "30d" : "7d", // 30 days if Remember Me, else 7 days
  });
};

dotenv.config();

// Generic message so attackers can't tell which of email/password was wrong
const GENERIC_LOGIN_ERROR = "Invalid email or password";
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

const isAccountLocked = (account) => account.lockUntil && account.lockUntil > Date.now();

const lockedResponse = (res, account) => {
  const minutes = Math.ceil((account.lockUntil - Date.now()) / 60000);
  return res.status(423).json({
    message: `Too many failed attempts. Account locked — try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    success: false,
  });
};

const registerFailedAttempt = async (account) => {
  account.failedLoginAttempts = (account.failedLoginAttempts || 0) + 1;
  if (account.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
    account.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
    account.failedLoginAttempts = 0;
  }
  await account.save();
};

const clearFailedAttempts = async (account) => {
  if (account.failedLoginAttempts || account.lockUntil) {
    account.failedLoginAttempts = 0;
    account.lockUntil = undefined;
    await account.save();
  }
};

const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    const Registeruser = await userModel.findOne({ email });
    if (!Registeruser) {
      return res.status(401).json({ message: GENERIC_LOGIN_ERROR, success: false });
    }

    if (isAccountLocked(Registeruser)) {
      return lockedResponse(res, Registeruser);
    }

    // Verify password before revealing anything about account state
    // (verification status leaks account existence otherwise)
    const isMatch = await bcrypt.compare(password, Registeruser.password);
    if (!isMatch) {
      await registerFailedAttempt(Registeruser);
      return res.status(401).json({ message: GENERIC_LOGIN_ERROR, success: false });
    }

    await clearFailedAttempts(Registeruser);

    // Handle legacy users (registered before email verification was implemented)
    // They don't have isEmailVerified set and don't have a verification token
    const isLegacyUser = Registeruser.isEmailVerified === undefined &&
                         !Registeruser.emailVerificationToken;

    if (isLegacyUser) {
      // Auto-verify legacy users - they already confirmed their email when registering
      Registeruser.isEmailVerified = true;
      await Registeruser.save();
      console.log(`[Auth] Auto-verified legacy user: ${email}`);
    }

    // Check if email is verified (only for new users who haven't verified)
    if (!Registeruser.isEmailVerified && !isLegacyUser) {
      // Check if they have a verification token (means we've sent them an email)
      if (Registeruser.emailVerificationToken) {
        return res.status(403).json({
          message: "Please verify your email before logging in. Check your inbox for the verification link.",
          success: false,
          requiresVerification: true
        });
      } else {
        // Edge case: isEmailVerified is false but no token (shouldn't happen, but handle it)
        // Generate a new verification token and send email
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const hashedVerificationToken = crypto.createHash("sha256").update(verificationToken).digest("hex");

        Registeruser.emailVerificationToken = hashedVerificationToken;
        Registeruser.verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
        await Registeruser.save();

        try {
          const verificationUrl = `${process.env.WEBSITE_URL}/verify-email/${verificationToken}`;
          await emailService.sendEmailVerification(email, Registeruser.name, verificationUrl);
        } catch (emailError) {
          console.error('Failed to send verification email:', emailError);
        }

        return res.status(403).json({
          message: "We've sent a verification email to your inbox. Please verify your email to continue.",
          success: false,
          requiresVerification: true,
          emailSent: true
        });
      }
    }

    const token = createtoken(Registeruser._id, rememberMe);
    return res.json({
      token,
      user: { name: Registeruser.name, email: Registeruser.email },
      success: true,
      expiresIn: rememberMe ? "30 days" : "7 days"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", success: false });
  }
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.json({ message: "Invalid email format", success: false });
    }

    // Validate against disposable/fake emails
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.json({ message: emailValidation.reason, success: false });
    }

    // Check for existing account before attempting insert
    const existing = await userModel.findOne({ email });
    if (existing) {
      return res.json({ message: "An account with this email already exists.", success: false });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedVerificationToken = crypto.createHash("sha256").update(verificationToken).digest("hex");

    // Create new user (email NOT verified yet)
    const newUser = new userModel({
      name,
      email,
      password: hashedPassword,
      isEmailVerified: false,
      emailVerificationToken: hashedVerificationToken,
      verificationTokenExpiry: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });
    await newUser.save();

    // Send verification email (not welcome email)
    try {
      const verificationUrl = `${process.env.WEBSITE_URL}/verify-email/${verificationToken}`;
      await emailService.sendEmailVerification(email, name, verificationUrl);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail the registration if email fails, but log it
    }

    // DO NOT return token yet - user must verify email first
    return res.json({
      message: "Registration successful! Please check your email to verify your account.",
      success: true,
      requiresVerification: true
    });
  } catch (error) {
    // Handle race-condition duplicate inserts (two simultaneous requests)
    if (error.code === 11000) {
      return res.json({ message: "An account with this email already exists.", success: false });
    }
    console.error(error);
    return res.json({ message: "Server error", success: false });
  }
};

const forgotpassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email not found", success: false });
    }

    // Generate cryptographically secure token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash the token before storing in database
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetToken = hashedToken;
    user.resetTokenExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send password reset email
    const resetUrl = `${process.env.WEBSITE_URL}/reset/${resetToken}`;
    await emailService.sendPasswordResetEmail(email, resetUrl);

    return res.status(200).json({ message: "Email sent", success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", success: false });
  }
};

const resetpassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash the received token to compare with database
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await userModel.findOne({
      resetToken: hashedToken,
      resetTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token", success: false });
    }

    user.password = await bcrypt.hash(password, 12); // Increased salt rounds
    user.resetToken = undefined;
    user.resetTokenExpire = undefined;
    await user.save();

    return res.status(200).json({ message: "Password reset successful", success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", success: false });
  }
};

// ── Admin session: short-lived access token + rotating refresh token ─────────
// Access token: 2h JWT (response body, kept in admin localStorage as before).
// Refresh token: random 48-byte secret in an httpOnly cookie, SHA-256 hash
// stored on the Admin doc. Rotated on every refresh; cleared on logout.
const ADMIN_REFRESH_COOKIE = 'admin_refresh';
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

// Cross-site cookie (Vercel admin → Render API) needs SameSite=None; Secure.
// Path-scoped so the cookie is only sent to admin auth endpoints.
const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/api/users/admin',
});

const issueAdminSession = async (res, admin) => {
  const refreshToken = crypto.randomBytes(48).toString('hex');
  admin.refreshTokenHash = sha256(refreshToken);
  admin.refreshTokenExpiry = new Date(Date.now() + REFRESH_TTL_MS);
  await admin.save();

  res.cookie(ADMIN_REFRESH_COOKIE, refreshToken, {
    ...refreshCookieOptions(),
    maxAge: REFRESH_TTL_MS,
  });

  return jwt.sign({ email: admin.email }, process.env.JWT_SECRET, { expiresIn: '2h' });
};

const adminlogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials", success: false });
    }

    if (isAccountLocked(admin)) {
      return lockedResponse(res, admin);
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      await registerFailedAttempt(admin);
      return res.status(401).json({ message: "Invalid credentials", success: false });
    }

    admin.failedLoginAttempts = 0;
    admin.lockUntil = undefined;
    admin.lastLogin = new Date();

    const token = await issueAdminSession(res, admin);
    return res.json({ token, success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", success: false });
  }
};

const adminRefresh = async (req, res) => {
  try {
    const raw = req.cookies?.[ADMIN_REFRESH_COOKIE];
    if (!raw) {
      return res.status(401).json({ message: "Session expired. Please login again.", success: false });
    }

    const admin = await Admin.findOne({
      refreshTokenHash: sha256(raw),
      refreshTokenExpiry: { $gt: new Date() },
    });

    if (!admin) {
      res.clearCookie(ADMIN_REFRESH_COOKIE, refreshCookieOptions());
      return res.status(401).json({ message: "Session expired. Please login again.", success: false });
    }

    // Rotate: each refresh token is single-use
    const token = await issueAdminSession(res, admin);
    return res.json({ token, success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", success: false });
  }
};

const adminLogout = async (req, res) => {
  try {
    const raw = req.cookies?.[ADMIN_REFRESH_COOKIE];
    if (raw) {
      await Admin.updateOne(
        { refreshTokenHash: sha256(raw) },
        { $unset: { refreshTokenHash: '', refreshTokenExpiry: '' } }
      );
    }
    res.clearCookie(ADMIN_REFRESH_COOKIE, refreshCookieOptions());
    return res.json({ message: "Logged out", success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", success: false });
  }
};

const logout = async (req, res) => {
    try {
        return res.json({ message: "Logged out", success: true });
    } catch (error) {
        console.error(error);
        return res.json({ message: "Server error", success: false });
    }
};

// Email verification endpoint
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Hash the received token to compare with database
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await userModel.findOne({
      emailVerificationToken: hashedToken,
      verificationTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired verification link. Please register again or contact support.",
        success: false
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    // Send welcome email now that email is verified
    try {
      await emailService.sendWelcomeEmail(user.email, user.name);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail verification if welcome email fails
    }

    // Return token so user can be logged in automatically (30 days for convenience after verification)
    const authToken = createtoken(user._id, true);

    return res.status(200).json({
      message: "Email verified successfully! You can now log in.",
      success: true,
      token: authToken,
      user: { name: user.name, email: user.email }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", success: false });
  }
};

// get name and email

const getname = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).select("-password");
    return res.json(user);
  }
  catch (error) {
    console.error(error);
    return res.json({ message: "Server error", success: false });
  }
}



export { login, register, forgotpassword, resetpassword, adminlogin, adminRefresh, adminLogout, logout, getname, verifyEmail };