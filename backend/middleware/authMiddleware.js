import { restoreExpiredSuspension } from '../services/domain/maintenance.js';
import { validateAccessSession } from '../services/sessionService.js';
import jwt from "jsonwebtoken";
import userModel, { Admin } from "../models/userModel.js";
import Appointment from "../models/appointmentModel.js";
import { accountDenial, sessionVersion } from "../utils/accountPolicy.js";

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Please login to continue",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const user = await userModel.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const denial = accountDenial(user);
    if (denial || user.isEmailVerified === false) {
      return res.status(403).json({ success: false, message: denial || 'Please verify your email.' });
    }
    if ((decoded.sv ?? 0) !== sessionVersion(user)) {
      return res.status(401).json({ success: false, message: 'Session revoked. Please sign in again.' });
    }
    req.authSession = await validateAccessSession(decoded, 'user');
    if (user.status === 'suspended' && user.suspendedUntil && user.suspendedUntil <= new Date()) { await restoreExpiredSuspension(user._id); user.status = 'active'; }
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({
      success: false,
      message: "Not authorized",
    });
  }
};

export const adminProtect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Admin access denied - no token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    // Verify this is an admin token (has email field matching admin email)
    if (!decoded.email || decoded.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({
        success: false,
        message: "Admin access denied - invalid admin token",
      });
    }

    const admin = await Admin.findOne({ email: decoded.email });
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access denied' });
    }
    if ((decoded.sv ?? 0) !== (admin.sessionVersion || 0)) return res.status(401).json({ success: false, message: 'Session revoked' });
    req.authSession = await validateAccessSession(decoded, 'admin');
    req.admin = { _id: admin._id, email: admin.email };
    next();
  } catch (error) {
    const expired = error.name === 'TokenExpiredError';
    const expected = ['TokenExpiredError', 'JsonWebTokenError', 'NotBeforeError'].includes(error.name) || [401, 403].includes(error.statusCode);
    if (!expected) {
      console.error('Admin session validation unavailable:', error.name);
      return res.status(503).json({ success: false, message: 'Unable to verify session. Please retry.' });
    }
    return res.status(error.statusCode || 401).json({
      success: false,
      code: expired ? 'TOKEN_EXPIRED' : 'INVALID_SESSION',
      message: expired ? 'Access token expired. Refresh your session.' : 'Admin access denied - invalid session',
    });
  }
};

// In backend/middleware/authmiddleware.js
export const checkAppointmentOwnership = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (!appointment.userId || appointment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this appointment",
      });
    }

    req.appointment = appointment;
    next();
  } catch (error) {
    console.error("Error checking appointment ownership:", error);
    res.status(500).json({
      success: false,
      message: "Error checking appointment ownership",
    });
  }
};

export default protect;
