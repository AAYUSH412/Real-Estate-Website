import Stats from "../models/statsModel.js";
import Property from "../models/propertymodel.js";
import Appointment from "../models/appointmentModel.js";
import User from "../models/Usermodel.js";
import transporter from "../config/nodemailer.js";
import { getEmailTemplate, getListingApprovedTemplate, getListingRejectedTemplate } from "../email.js";

const formatRecentProperties = (properties) => {
  return properties.map((property) => ({
    type: "property",
    description: `New property listed: ${property.title}`,
    timestamp: property.createdAt,
  }));
};

const formatRecentAppointments = (appointments) => {
  return appointments.map((appointment) => ({
    type: "appointment",
    description:
      appointment.userId && appointment.propertyId
        ? `${appointment.userId.name} scheduled viewing for ${appointment.propertyId.title}`
        : "Appointment scheduled (details unavailable)",
    timestamp: appointment.createdAt,
  }));
};

// Add these helper functions before the existing exports
export const getAdminStats = async (req, res) => {
  try {
    const [
      totalProperties,
      activeListings,
      totalUsers,
      pendingAppointments,
      recentActivity,
      viewsData,
    ] = await Promise.all([
      Property.countDocuments(),
      Property.countDocuments({ status: "active" }),
      User.countDocuments(),
      Appointment.countDocuments({ status: "pending" }),
      getRecentActivity(),
      getViewsData(),
    ]);

    res.json({
      success: true,
      stats: {
        totalProperties,
        activeListings,
        totalUsers,
        pendingAppointments,
        recentActivity,
        viewsData,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching admin statistics",
    });
  }
};

const getRecentActivity = async () => {
  try {
    const recentProperties = await Property.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title createdAt");

    const recentAppointments = await Appointment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("propertyId", "title")
      .populate("userId", "name");

    // Filter out appointments with missing user or property data
    const validAppointments = recentAppointments.filter(
      (appointment) => appointment.userId && appointment.propertyId
    );

    return [
      ...formatRecentProperties(recentProperties),
      ...formatRecentAppointments(validAppointments),
    ].sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Error getting recent activity:", error);
    return [];
  }
};

const getViewsData = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await Stats.aggregate([
      {
        $match: {
          endpoint: /^\/api\/products\/single\//,
          method: "GET",
          timestamp: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Generate dates for last 30 days
    const labels = [];
    const data = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split("T")[0];
      labels.push(dateString);

      const stat = stats.find((s) => s._id === dateString);
      data.push(stat ? stat.count : 0);
    }

    return {
      labels,
      datasets: [
        {
          label: "Property Views",
          data,
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          tension: 0.4,
          fill: true,
        },
      ],
    };
  } catch (error) {
    console.error("Error generating chart data:", error);
    return {
      labels: [],
      datasets: [
        {
          label: "Property Views",
          data: [],
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }
};

// Add these new controller functions
export const getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("propertyId", "title location")
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      appointments,
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching appointments",
    });
  }
};

export const updateAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId, status } = req.body;

    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status },
      { new: true }
    ).populate("propertyId userId");

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Send email notification using the template from email.js
    const mailOptions = {
      from: process.env.EMAIL,
      to: appointment.userId.email,
      subject: `Viewing Appointment ${
        status.charAt(0).toUpperCase() + status.slice(1)
      } - BuildEstate`,
      html: getEmailTemplate(appointment, status),
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: `Appointment ${status} successfully`,
      appointment,
    });
  } catch (error) {
    console.error("Error updating appointment:", error);
    res.status(500).json({
      success: false,
      message: "Error updating appointment",
    });
  }
};

// ── Admin listing review ──────────────────────────────────────────────────────

/** GET /api/admin/properties/pending — FIFO queue of user-submitted listings */
export const getPendingListings = async (req, res) => {
  try {
    const properties = await Property.find({ status: "pending" })
      .populate("postedBy", "name email")
      .sort({ createdAt: 1 }); // oldest first

    res.json({ success: true, properties });
  } catch (error) {
    console.error("Error fetching pending listings:", error);
    res.status(500).json({ success: false, message: "Error fetching pending listings" });
  }
};

/** PUT /api/admin/properties/:id/approve — approve a pending listing */
export const approveListing = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate("postedBy", "name email");

    if (!property) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    property.status = "active";
    property.rejectionReason = "";
    await property.save();

    // Email the submitter
    if (property.postedBy?.email) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL,
          to: property.postedBy.email,
          subject: "Your property listing is now live! — BuildEstate",
          html: getListingApprovedTemplate(property.title, property._id.toString()),
        });
      } catch (mailErr) {
        console.error("Approval email failed (non-fatal):", mailErr.message);
      }
    }

    res.json({ success: true, message: "Listing approved", property });
  } catch (error) {
    console.error("Error approving listing:", error);
    res.status(500).json({ success: false, message: "Error approving listing" });
  }
};

/** PUT /api/admin/properties/:id/reject — reject a pending listing */
export const rejectListing = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: "Rejection reason is required" });
    }

    const property = await Property.findById(req.params.id).populate("postedBy", "name email");

    if (!property) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    property.status = "rejected";
    property.rejectionReason = reason.trim();
    await property.save();

    // Email the submitter
    if (property.postedBy?.email) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL,
          to: property.postedBy.email,
          subject: "Update on your property listing — BuildEstate",
          html: getListingRejectedTemplate(property.title, reason.trim()),
        });
      } catch (mailErr) {
        console.error("Rejection email failed (non-fatal):", mailErr.message);
      }
    }

    res.json({ success: true, message: "Listing rejected", property });
  } catch (error) {
    console.error("Error rejecting listing:", error);
    res.status(500).json({ success: false, message: "Error rejecting listing" });
  }
};
