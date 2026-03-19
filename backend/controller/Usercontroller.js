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

const backendurl = process.env.BACKEND_URL;

const createtoken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d", // Reduced from 30d to 7d for better security
  });
};

dotenv.config();

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const Registeruser = await userModel.findOne({ email });
    if (!Registeruser) {
      return res.json({ message: "Email not found", success: false });
    }
    const isMatch = await bcrypt.compare(password, Registeruser.password);
    if (isMatch) {
      const token = createtoken(Registeruser._id);
      return res.json({ token, user: { name: Registeruser.name, email: Registeruser.email }, success: true });
    } else {
      return res.json({ message: "Invalid password", success: false });
    }
  } catch (error) {
    console.error(error);
    res.json({ message: "Server error", success: false });
  }
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!validator.isEmail(email)) {
      return res.json({ message: "Invalid email", success: false });
    }

    // Check for existing account before attempting insert
    const existing = await userModel.findOne({ email });
    if (existing) {
      return res.json({ message: "An account with this email already exists.", success: false });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new userModel({ name, email, password: hashedPassword });
    await newUser.save();
    const token = createtoken(newUser._id);

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(email, name);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the registration if email fails
    }

    return res.json({ token, user: { name: newUser.name, email: newUser.email }, success: true });
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

const adminlogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin in database
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: "Invalid credentials", success: false });
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials", success: false });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    const token = jwt.sign({ email: admin.email }, process.env.JWT_SECRET, { expiresIn: '2h' });
    return res.json({ token, success: true });
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



export { login, register, forgotpassword, resetpassword, adminlogin, logout, getname };