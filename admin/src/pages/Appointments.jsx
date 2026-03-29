import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Clock, User, Home, Check, X, Loader2,
  Filter, Search, Link as LinkIcon, Send, AlertCircle,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "../services/apiClient";
import { cn, formatDate } from "../lib/utils";

const STATUS_CONFIG = {
  pending: { label: "Pending", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  confirmed: { label: "Confirmed", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-700 border border-red-200" },
};

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || { label: status, className: "bg-gray-100 text-gray-700" };
  return (
    <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold", config.className)}>
      {config.label}
    </span>
  );
};

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMeetingLink, setEditingMeetingLink] = useState(null);
  const [meetingLink, setMeetingLink] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/appointments/all');
      if (response.data.success) {
        const valid = response.data.appointments.filter((apt) => apt.propertyId);
        setAppointments(valid);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Failed to fetch appointments");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      setUpdatingId(appointmentId);
      const response = await apiClient.put('/api/appointments/status', { appointmentId, status: newStatus });
      if (response.data.success) {
        toast.success(`Appointment ${newStatus} successfully`);
        fetchAppointments();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast.error("Failed to update appointment status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMeetingLinkUpdate = async (appointmentId) => {
    if (!meetingLink) { toast.error("Please enter a meeting link"); return; }
    try {
      const response = await apiClient.put('/api/appointments/update-meeting', { appointmentId, meetingLink });
      if (response.data.success) {
        toast.success("Meeting link sent successfully");
        setEditingMeetingLink(null);
        setMeetingLink("");
        fetchAppointments();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Error updating meeting link:", error);
      toast.error("Failed to update meeting link");
    }
  };

  useEffect(() => { fetchAppointments(); }, []);

  const filteredAppointments = appointments.filter((apt) => {
    const clientName = apt.userId?.name || apt.guestInfo?.name || "";
    const clientEmail = apt.userId?.email || apt.guestInfo?.email || "";
    const matchesSearch =
      !searchTerm ||
      apt.propertyId?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "all" || apt.status === filter;
    return matchesSearch && matchesFilter;
  });

  const counts = {
    all: appointments.length,
    pending: appointments.filter((a) => a.status === "pending").length,
    confirmed: appointments.filter((a) => a.status === "confirmed").length,
    cancelled: appointments.filter((a) => a.status === "cancelled").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-8 flex items-center justify-center bg-[#FAF8F4]">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-[#D4755B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#5A5856] font-medium">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-8 pb-12 px-4 bg-[#FAF8F4]">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-[#1C1B1A] mb-1">Appointments</h1>
          <p className="text-[#5A5856]">Manage and track property viewing appointments</p>
        </motion.div>

        {/* Filter Tabs + Search */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-4 border border-[#E6D5C3] shadow-card mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-[#FAF8F4] rounded-xl p-1">
              {["all", "pending", "confirmed", "cancelled"].map((status) => (
                <button key={status} onClick={() => setFilter(status)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 capitalize",
                    filter === status
                      ? "bg-[#1C1B1A] text-[#FAF8F4] shadow-sm"
                      : "text-[#5A5856] hover:text-[#1C1B1A]"
                  )}>
                  {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                  <span className={cn(
                    "ml-1.5 text-xs px-1.5 py-0.5 rounded-full",
                    filter === status ? "bg-white/20" : "bg-[#E6D5C3] text-[#5A5856]"
                  )}>
                    {counts[status]}
                  </span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input type="text" placeholder="Search by property, client..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[#FAF8F4] border border-[#E6D5C3] rounded-xl text-sm text-[#1C1B1A] placeholder-[#9CA3AF] outline-none focus:border-[#D4755B] focus:ring-2 focus:ring-[#D4755B]/15 transition-all" />
            </div>
          </div>
        </motion.div>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-[#E6D5C3] shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#1C1B1A]">
                  {["Property", "Client", "Date & Time", "Status", "Meeting Link", "Actions"].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F1E8]">
                <AnimatePresence>
                  {filteredAppointments.map((appointment) => (
                    <motion.tr key={appointment._id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="hover:bg-[#FAF8F4] transition-colors duration-150">

                      {/* Property */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-[#D4755B]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Home className="w-4 h-4 text-[#D4755B]" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#1C1B1A] line-clamp-1">
                              {appointment.propertyId.title}
                            </p>
                            <p className="text-xs text-[#9CA3AF]">{appointment.propertyId.location}</p>
                          </div>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", appointment.userId ? "bg-blue-50" : "bg-amber-50")}>
                            <User className={cn("w-4 h-4", appointment.userId ? "text-blue-500" : "text-amber-500")} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#1C1B1A]">
                              {appointment.userId?.name || appointment.guestInfo?.name || "Unknown"}
                            </p>
                            <p className="text-xs text-[#9CA3AF]">
                              {appointment.userId?.email || appointment.guestInfo?.email || "—"}
                            </p>
                            {!appointment.userId && appointment.guestInfo && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full font-medium">Guest</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#9CA3AF] flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-[#1C1B1A]">
                              {formatDate(appointment.date)}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-[#9CA3AF]">
                              <Clock className="w-3 h-3" />
                              {appointment.time}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <StatusBadge status={appointment.status} />
                      </td>

                      {/* Meeting Link */}
                      <td className="px-6 py-4">
                        {editingMeetingLink === appointment._id ? (
                          <div className="flex items-center gap-1.5">
                            <input type="url" value={meetingLink}
                              onChange={(e) => setMeetingLink(e.target.value)}
                              placeholder="Paste meeting link..."
                              className="px-2.5 py-1.5 border border-[#E6D5C3] rounded-lg text-xs w-40 outline-none focus:border-[#D4755B] focus:ring-1 focus:ring-[#D4755B]/20" />
                            <button onClick={() => handleMeetingLinkUpdate(appointment._id)}
                              className="p-1.5 bg-[#D4755B] text-white rounded-lg hover:bg-[#C05E44] transition-colors">
                              <Send className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { setEditingMeetingLink(null); setMeetingLink(""); }}
                              className="p-1.5 bg-[#E6D5C3] text-[#5A5856] rounded-lg hover:bg-[#D4B99A] transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {appointment.meetingLink ? (
                              <a href={appointment.meetingLink} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-[#D4755B] hover:text-[#C05E44] font-medium underline underline-offset-2">
                                <LinkIcon className="w-3.5 h-3.5" />
                                View Link
                              </a>
                            ) : (
                              <span className="text-xs text-[#9CA3AF]">No link</span>
                            )}
                            {appointment.status === "confirmed" && (
                              <button onClick={() => { setEditingMeetingLink(appointment._id); setMeetingLink(appointment.meetingLink || ""); }}
                                className="p-1 text-[#9CA3AF] hover:text-[#D4755B] transition-colors rounded">
                                <LinkIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        {appointment.status === "pending" && (
                          <div className="flex items-center gap-1.5">
                            {updatingId === appointment._id ? (
                              <Loader2 className="w-4 h-4 text-[#9CA3AF] animate-spin" />
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStatusChange(appointment._id, "confirmed")}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors">
                                  <Check className="w-3.5 h-3.5" />
                                  Confirm
                                </button>
                                <button
                                  onClick={() => handleStatusChange(appointment._id, "cancelled")}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors">
                                  <X className="w-3.5 h-3.5" />
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {filteredAppointments.length === 0 && (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-[#F5F1E8] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-7 h-7 text-[#E6D5C3]" />
              </div>
              <h3 className="text-base font-semibold text-[#1C1B1A] mb-1">No appointments found</h3>
              <p className="text-sm text-[#9CA3AF]">
                {searchTerm || filter !== "all" ? "Try adjusting your search or filters" : "No appointments have been scheduled yet"}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Appointments;
