import { transaction } from '../services/domain/transaction.js';
import { audit } from '../services/domain/audit.js';
import { AuthSession } from '../models/authSessionModel.js';
import { ContractError } from '@buildestate/contracts';
import { respondError } from '../utils/httpErrors.js';
import { createSession, rotateSession, closeSession } from '../services/sessionService.js';
import { accountDenial, publicUser, sessionVersion, versionFilter, revokeSessionUpdate, USER_AUTH_FIELDS, ADMIN_AUTH_FIELDS } from '../utils/accountPolicy.js';
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import validator from "validator";
import crypto from "crypto";
import userModel from "../models/userModel.js";
import { Admin } from "../models/userModel.js";
import emailService from "../services/emailService.js";
import { validateEmail, isDisposableEmail } from "../utils/emailValidation.js";

const backendurl = process.env.BACKEND_URL;

// ── User session: short-lived access token + rotating httpOnly refresh token ──
const USER_REFRESH_COOKIE = 'user_refresh';

const userRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
});

// rememberMe → 30d refresh token; else → 7d
const issueUserSession = async (res, user, rememberMe = false, req = {}) => {
  const issued = await createSession(user, 'user', rememberMe, req);
  res.cookie(USER_REFRESH_COOKIE, issued.raw, { ...userRefreshCookieOptions(), maxAge: issued.maxAge });
  return issued.token;
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
    const Registeruser = await userModel.findOne({ email }).select(USER_AUTH_FIELDS);
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

    const denial = accountDenial(Registeruser);
    if (denial) return res.status(403).json({ success: false, message: denial });
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

        let verificationEmailSent = true;
        try {
          const verificationUrl = `${process.env.WEBSITE_URL}/verify-email/${verificationToken}`;
          await emailService.sendEmailVerification(email, Registeruser.name, verificationUrl);
        } catch (emailError) {
          verificationEmailSent = false;
          console.error('Failed to send verification email:', emailError);
        }

        return res.status(403).json({
          message: verificationEmailSent ? "We sent a verification email. Please verify your email to continue." : "Please verify your email. Delivery failed; use Resend verification email to retry.",
          success: false,
          requiresVerification: true,
          emailSent: verificationEmailSent
        });
      }
    }

    const token = await issueUserSession(res, Registeruser, rememberMe, req);
    return res.json({
      token,
      user: publicUser(Registeruser),
      success: true,
    });
  } catch (error) {
    console.error(error);
    respondError(res, error);
  }
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format", success: false });
    }

    // Validate against disposable/fake emails
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ message: emailValidation.reason, success: false });
    }

    // Check for existing account before attempting insert
    const existing = await userModel.findOne({ email }).select(USER_AUTH_FIELDS);
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists.", success: false });
    }

    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters and at most 72 UTF-8 bytes.' });
    }

    // Hash password (cost 12 — ~250ms on modern hardware, well above brute-force threshold)
    const hashedPassword = await bcrypt.hash(password, 12);

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

    let verificationEmailSent = true;
    // Send verification email (not welcome email)
    try {
      const verificationUrl = `${process.env.WEBSITE_URL}/verify-email/${verificationToken}`;
      await emailService.sendEmailVerification(email, name, verificationUrl);
    } catch (emailError) {
      verificationEmailSent = false;
      console.error('Failed to send verification email:', emailError);
      // Don't fail the registration if email fails, but log it
    }

    // DO NOT return token yet - user must verify email first
    return res.json({
      message: verificationEmailSent ? "Registration successful! Please check your email to verify your account." : "Account created. Verification email delivery failed; request a new link.",
      success: true,
      requiresVerification: true,
      verificationEmailSent
    });
  } catch (error) {
    // Handle race-condition duplicate inserts (two simultaneous requests)
    if (error.code === 11000) {
      return res.status(409).json({ message: "An account with this email already exists.", success: false });
    }
    console.error(error);
    return respondError(res, error);
  }
};

const forgotpassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await userModel.findOne({ email }).select(USER_AUTH_FIELDS);
    if (!user) {
      // Return 200 to prevent user enumeration
      return res.status(200).json({ message: "If an account with that email exists, a reset link has been sent.", success: true });
    }

    // Generate cryptographically secure token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash the token before storing in database
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetToken = hashedToken;
    user.resetTokenExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send password reset email (non-fatal — token is already saved)
    const resetUrl = `${process.env.WEBSITE_URL}/reset/${resetToken}`;
    try {
      await emailService.sendPasswordResetEmail(email, resetUrl);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
    }

    // Generic message regardless of whether email exists — prevents user enumeration
    return res.status(200).json({ message: "If an account with that email exists, a reset link has been sent.", success: true });
  } catch (error) {
    console.error(error);
    return respondError(res, error);
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
    }).select(USER_AUTH_FIELDS);

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token", success: false });
    }

    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters and at most 72 UTF-8 bytes.' });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    await transaction(async session => {
      const updated = await userModel.findOneAndUpdate({ _id: user._id, resetToken: hashedToken, resetTokenExpire: { $gt: Date.now() }, ...versionFilter(user) }, {
        $set: { password: hashedPassword }, $inc: { ...revokeSessionUpdate.$inc, __v: 1 },
        $unset: { ...revokeSessionUpdate.$unset, resetToken: '', resetTokenExpire: '' },
      }, { new: true, session });
      if (!updated) throw new ContractError('Invalid or expired token', 'token');
      await AuthSession.updateMany({ subjectId: user._id, subjectType: 'user', revokedAt: null }, { $set: { revokedAt: new Date(), revokeReason: 'password_reset' } }, { session });
      await audit({ ...req, user: updated }, 'password_reset', 'user', updated, {}, session);
    });
    res.clearCookie(USER_REFRESH_COOKIE, userRefreshCookieOptions());

    return res.status(200).json({ message: "Password reset successful", success: true });
  } catch (error) {
    console.error(error);
    return respondError(res, error);
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

const issueAdminSession = async (res, admin, req) => {
  const issued = await createSession(admin, 'admin', true, req);
  res.cookie(ADMIN_REFRESH_COOKIE, issued.raw, { ...refreshCookieOptions(), maxAge: issued.maxAge });
  return issued.token;
};

const adminlogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email }).select(ADMIN_AUTH_FIELDS);
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

    await admin.save();
    const token = await issueAdminSession(res, admin, req);
    return res.json({ token, success: true });
  } catch (error) {
    console.error(error);
    return respondError(res, error);
  }
};

const refresh = kind => async (req, res) => {
  const cookie = kind === 'admin' ? ADMIN_REFRESH_COOKIE : USER_REFRESH_COOKIE;
  const options = kind === 'admin' ? refreshCookieOptions() : userRefreshCookieOptions();
  try {
    const issued = await rotateSession(req.cookies?.[cookie], kind, req);
    res.cookie(cookie, issued.raw, { ...options, maxAge: issued.maxAge });
    return res.json({ success: true, token: issued.token });
  } catch (error) {
    // A database/provider outage does not invalidate the browser's credential.
    if ([401, 403].includes(error.statusCode)) res.clearCookie(cookie, options);
    return respondError(res, Object.assign(error, { statusCode: error.statusCode || 503 }));
  }
};
const signOut = kind => async (req, res) => {
  const cookie = kind === 'admin' ? ADMIN_REFRESH_COOKIE : USER_REFRESH_COOKIE;
  const options = kind === 'admin' ? refreshCookieOptions() : userRefreshCookieOptions();
  try {
    await closeSession(req.cookies?.[cookie], kind, req);
    res.clearCookie(cookie, options);
    return res.json({ success: true, message: 'Logged out' });
  } catch (error) { return res.status(503).json({ success: false, message: 'Unable to revoke session. Please retry.' }); }
};
const adminRefresh = refresh('admin');
const userRefresh = refresh('user');
const adminLogout = signOut('admin');
const logout = signOut('user');

// Email verification endpoint
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Hash the received token to compare with database
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await userModel.findOne({
      emailVerificationToken: hashedToken,
      verificationTokenExpiry: { $gt: Date.now() },
    }).select(USER_AUTH_FIELDS);

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired verification link. Please register again or contact support.",
        success: false
      });
    }

    const denial = accountDenial(user);
    if (denial) return res.status(403).json({ success: false, message: denial });
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

    // Auto-login after verification — issue a session with rememberMe=true (30d refresh cookie)
    const authToken = await issueUserSession(res, user, true, req);

    return res.status(200).json({
      message: "Email verified successfully! You can now log in.",
      success: true,
      token: authToken,
      user: publicUser(user)
    });
  } catch (error) {
    console.error(error);
    return respondError(res, error);
  }
};

const getname = async (req, res) => {
  try {
    return res.json(publicUser(req.user));
  }
  catch (error) {
    console.error(error);
    return respondError(res, error);
  }
}

const updateProfile = async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const user = await userModel.findById(req.user.id).select(USER_AUTH_FIELDS);
    if (!user) return res.status(404).json({ message: "User not found", success: false });

    if (accountDenial(user) || sessionVersion(user) !== sessionVersion(req.user)) throw new ContractError('Account changed. Please sign in again.', 'account', 409);

    if (name !== undefined) {
      const trimmed = name.trim();
      if (!trimmed) return res.status(400).json({ message: "Name cannot be empty", success: false });
      user.name = trimmed;
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required to change your password", success: false });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect", success: false });
      }
      if (typeof newPassword !== 'string' || newPassword.length < 8 || Buffer.byteLength(newPassword, 'utf8') > 72) {
        return res.status(400).json({ message: "New password must be at least 8 characters", success: false });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      const changed = await transaction(async session => {
        const result = await userModel.findOneAndUpdate({ _id: user._id, password: user.password, ...versionFilter(user) }, {
          $set: { password: hashedPassword, name: user.name }, $inc: { ...revokeSessionUpdate.$inc, __v: 1 }, $unset: revokeSessionUpdate.$unset,
        }, { new: true, session });
        if (!result) throw new ContractError('Account changed. Please sign in again.', 'account', 409);
        await AuthSession.updateMany({ subjectId: user._id, subjectType: 'user', revokedAt: null }, { $set: { revokedAt: new Date(), revokeReason: 'password_change' } }, { session });
        await audit(req, 'password_change', 'user', result, {}, session);
        return result;
      });
      res.clearCookie(USER_REFRESH_COOKIE, userRefreshCookieOptions());
      return res.json({ success: true, sessionRevoked: true, message: 'Password changed. Please sign in again.', user: publicUser(changed) });
    }

    const saved = await transaction(async session => {
      const current = await userModel.findOneAndUpdate({ _id: user._id, ...versionFilter(user), __v: user.__v === undefined ? { $exists: false } : user.__v }, { $set: { name: user.name }, $inc: { __v: 1 } }, { new: true, session, runValidators: true });
      if (!current || accountDenial(current)) throw new ContractError('Account changed. Refresh before updating.', 'account', 409);
      await audit(req, 'update_profile', 'user', current, {}, session);
      return current;
    });
    return res.json({ message: 'Profile updated successfully', success: true, user: publicUser(saved) });
  } catch (error) {
    console.error(error);
    return respondError(res, error);
  }
};



const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required', success: false });
    }

    const user = await userModel.findOne({ email: email.toLowerCase().trim() });

    // Generic response to prevent user enumeration
    if (!user || user.isEmailVerified) {
      return res.status(200).json({ message: 'If this account exists and is unverified, a new link has been sent.', success: true });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    user.emailVerificationToken = hashedToken;
    user.verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    try {
      const verificationUrl = `${process.env.WEBSITE_URL}/verify-email/${verificationToken}`;
      await emailService.sendEmailVerification(email, user.name, verificationUrl);
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError);
      return res.status(503).json({ success: false, message: 'Verification email could not be sent. Please retry later.' });
    }

    return res.status(200).json({ message: 'If this account exists and is unverified, a new link has been sent.', success: true });
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server error', success: false });
  }
};

export { login, register, forgotpassword, resetpassword, adminlogin, adminRefresh, adminLogout, logout, userRefresh, getname, verifyEmail, updateProfile, resendVerification };