import express from "express";
import { protect, adminProtect } from '../middleware/authMiddleware.js';
import {
  scheduleViewing,
  getAllAppointments,
  updateAppointmentStatus,
  getAppointmentsByUser,
  cancelAppointment,
  updateAppointmentMeetingLink,
  getAppointmentStats,
  submitAppointmentFeedback,
  getUpcomingAppointments
} from "../controller/appointmentController.js";


const router = express.Router();

// User routes — guest booking supported (no protect), auth booking also supported
router.post("/schedule", scheduleViewing);              // Guest booking (no auth required)
router.post("/schedule/auth", protect, scheduleViewing); // Authenticated booking
router.get("/user", protect, getAppointmentsByUser);
router.put("/cancel/:id", protect, cancelAppointment);
router.put("/feedback/:id", protect, submitAppointmentFeedback);
router.get("/upcoming", protect, getUpcomingAppointments);

// Admin routes
router.get("/all", adminProtect, getAllAppointments);
router.get("/stats", adminProtect, getAppointmentStats);
router.put("/status", adminProtect, updateAppointmentStatus);
router.put("/update-meeting", adminProtect, updateAppointmentMeetingLink);

export default router;