import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { appointmentsAPI, userListingsAPI, userAPI } from '../services/api';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppointmentProperty {
  _id: string;
  title: string;
  location: string;
  image?: string[];
}

interface Appointment {
  _id: string;
  propertyId: AppointmentProperty | null;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  meetingLink?: string;
  cancelReason?: string;
  createdAt: string;
}

interface ListingSummary {
  _id: string;
  status: 'pending' | 'active' | 'rejected' | 'expired';
}

// ── Status config ─────────────────────────────────────────────────────────────

const APPOINTMENT_STATUS = {
  pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-400' },
  confirmed: { label: 'Confirmed', bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
  completed: { label: 'Completed', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function isUpcoming(apt: Appointment): boolean {
  return (
    (apt.status === 'pending' || apt.status === 'confirmed') &&
    new Date(apt.date).getTime() >= Date.now() - 24 * 60 * 60 * 1000
  );
}

// ── Settings tab ──────────────────────────────────────────────────────────────

const SettingsTab: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name cannot be empty.'); return; }

    setSaving(true);
    try {
      const payload: { name?: string; currentPassword?: string; newPassword?: string } = {};
      if (name.trim() !== user?.name) payload.name = name.trim();

      if (newPassword) {
        if (newPassword.length < 8) { toast.error('New password must be at least 8 characters.'); setSaving(false); return; }
        if (newPassword !== confirmPassword) { toast.error('Passwords do not match.'); setSaving(false); return; }
        if (!currentPassword) { toast.error('Enter your current password to set a new one.'); setSaving(false); return; }
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      if (Object.keys(payload).length === 0) { toast.info('No changes to save.'); setSaving(false); return; }

      const { data } = await userAPI.updateProfile(payload);
      if (data.success) {
        if (data.user) updateUser(data.user);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        toast.success('Profile updated.');
      } else {
        toast.error(data.message || 'Update failed.');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveProfile} className="max-w-lg space-y-8">
      {/* Profile */}
      <section className="bg-white border border-[#E6E0DA] rounded-2xl p-6">
        <h3 className="font-syne font-bold text-base text-[#221410] mb-5">Profile</h3>
        <div className="space-y-4">
          <div>
            <label className="font-manrope text-xs font-semibold text-[#4B5563] mb-1.5 block">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-[#E6E0DA] rounded-xl px-4 py-2.5 font-manrope text-sm text-[#221410] focus:outline-none focus:border-[#D4755B] transition-[border-color]"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="font-manrope text-xs font-semibold text-[#4B5563] mb-1.5 block">Email</label>
            <input
              type="email"
              value={user?.email ?? ''}
              disabled
              className="w-full border border-[#E6E0DA] rounded-xl px-4 py-2.5 font-manrope text-sm text-[#9CA3AF] bg-[#FAF8F4] cursor-not-allowed"
            />
            <p className="font-manrope text-[11px] text-[#9CA3AF] mt-1">Email cannot be changed.</p>
          </div>
        </div>
      </section>

      {/* Password */}
      <section className="bg-white border border-[#E6E0DA] rounded-2xl p-6">
        <h3 className="font-syne font-bold text-base text-[#221410] mb-1">Change Password</h3>
        <p className="font-manrope text-xs text-[#9CA3AF] mb-5">Leave blank to keep your current password.</p>
        <div className="space-y-4">
          <div>
            <label className="font-manrope text-xs font-semibold text-[#4B5563] mb-1.5 block">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border border-[#E6E0DA] rounded-xl px-4 py-2.5 font-manrope text-sm text-[#221410] focus:outline-none focus:border-[#D4755B] transition-[border-color]"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="font-manrope text-xs font-semibold text-[#4B5563] mb-1.5 block">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-[#E6E0DA] rounded-xl px-4 py-2.5 font-manrope text-sm text-[#221410] focus:outline-none focus:border-[#D4755B] transition-[border-color]"
              placeholder="Min 8 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="font-manrope text-xs font-semibold text-[#4B5563] mb-1.5 block">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-[#E6E0DA] rounded-xl px-4 py-2.5 font-manrope text-sm text-[#221410] focus:outline-none focus:border-[#D4755B] transition-[border-color]"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
        </div>
      </section>

      <button
        type="submit"
        disabled={saving}
        className="bg-[#D4755B] font-manrope font-bold text-sm text-white px-6 py-2.5 rounded-xl hover:bg-[#B86851] transition-[background-color] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'settings';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // ── Auth guard ──────────────────────────────────────────────

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error('Please sign in to view your dashboard.');
      navigate('/signin', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // ── Fetch data ──────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setFetchLoading(true);
    const [aptRes, listRes] = await Promise.allSettled([
      appointmentsAPI.getByUser(),
      userListingsAPI.getMyListings(),
    ]);

    if (aptRes.status === 'fulfilled') {
      setAppointments(aptRes.value.data.appointments ?? []);
    } else {
      toast.error('Failed to load your appointments.');
    }

    if (listRes.status === 'fulfilled') {
      setListings(listRes.value.data.properties ?? listRes.value.data ?? []);
    }

    setFetchLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated, fetchData]);

  // ── Cancel appointment ──────────────────────────────────────

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await appointmentsAPI.cancel(cancelTarget._id, 'Cancelled by user from dashboard');
      toast.success('Appointment cancelled.');
      setAppointments((prev) =>
        prev.map((a) => (a._id === cancelTarget._id ? { ...a, status: 'cancelled' } : a))
      );
    } catch {
      toast.error('Failed to cancel the appointment. Please try again.');
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  // ── Derived stats ───────────────────────────────────────────

  const upcomingCount = appointments.filter(isUpcoming).length;
  const liveListings = listings.filter((l) => l.status === 'active').length;

  const stats = [
    { label: 'Upcoming Viewings', value: upcomingCount, icon: 'event' },
    { label: 'Total Appointments', value: appointments.length, icon: 'calendar_month' },
    { label: 'My Listings', value: listings.length, icon: 'home_work' },
    { label: 'Live Listings', value: liveListings, icon: 'verified' },
  ];

  const sortedAppointments = [...appointments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (isLoading || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-28 pb-16">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-syne font-bold text-3xl text-[#221410] mb-1">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="font-manrope text-sm text-[#4B5563]">
            Your appointments and property listings in one place.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-[#E6E0DA]">
          {(['overview', 'settings'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`font-manrope font-semibold text-sm px-5 py-2.5 -mb-px border-b-2 transition-[color,border-color] capitalize ${
                activeTab === tab
                  ? 'border-[#D4755B] text-[#D4755B]'
                  : 'border-transparent text-[#4B5563] hover:text-[#221410]'
              }`}
            >
              {tab === 'overview' ? 'Overview' : 'Settings'}
            </button>
          ))}
        </div>

        {activeTab === 'settings' && <SettingsTab />}

        {activeTab === 'overview' && <>
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {stats.map(({ label, value, icon }) => (
            <div
              key={label}
              className="bg-white border border-[#E6E0DA] rounded-2xl p-5 shadow-sm"
            >
              <span className="font-material-icons text-[#D4755B] text-2xl" aria-hidden="true">{icon}</span>
              <div className="font-syne font-bold text-2xl text-[#221410] mt-2 tabular-nums">
                {fetchLoading ? '—' : value}
              </div>
              <div className="font-manrope text-xs text-[#64748B] mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3 mb-10">
          <Link
            to="/my-listings"
            className="bg-white border border-[#E6E0DA] font-manrope font-semibold text-sm text-[#221410] px-5 py-2.5 rounded-xl hover:border-[#D4755B] hover:text-[#D4755B] transition-[border-color,color]"
          >
            Manage My Listings
          </Link>
          <Link
            to="/add-property"
            className="bg-[#D4755B] font-manrope font-bold text-sm text-white px-5 py-2.5 rounded-xl hover:bg-[#B86851] transition-[background-color]"
          >
            + List a Property
          </Link>
          <Link
            to="/properties"
            className="bg-white border border-[#E6E0DA] font-manrope font-semibold text-sm text-[#221410] px-5 py-2.5 rounded-xl hover:border-[#D4755B] hover:text-[#D4755B] transition-[border-color,color]"
          >
            Browse Properties
          </Link>
        </div>

        {/* Appointments */}
        <section>
          <h2 className="font-syne font-bold text-xl text-[#221410] mb-4">My Appointments</h2>

          {fetchLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-[#E6E0DA] rounded-2xl h-24 animate-pulse" />
              ))}
            </div>
          ) : sortedAppointments.length === 0 ? (
            <div className="bg-white border border-[#E6E0DA] rounded-2xl p-10 text-center">
              <span className="font-material-icons text-4xl text-[#D4755B]/40" aria-hidden="true">event_busy</span>
              <p className="font-manrope text-sm text-[#4B5563] mt-3 mb-5">
                No appointments yet. Book a viewing from any property page.
              </p>
              <Link
                to="/properties"
                className="inline-block bg-[#D4755B] font-manrope font-bold text-sm text-white px-5 py-2.5 rounded-xl hover:bg-[#B86851] transition-[background-color]"
              >
                Browse Properties
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedAppointments.map((apt) => {
                const status = APPOINTMENT_STATUS[apt.status];
                const cancellable = apt.status === 'pending' || apt.status === 'confirmed';
                return (
                  <div
                    key={apt._id}
                    className="bg-white border border-[#E6E0DA] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    {/* Property thumbnail */}
                    {apt.propertyId?.image?.[0] ? (
                      <img
                        src={apt.propertyId.image[0]}
                        alt={apt.propertyId.title}
                        className="w-full sm:w-20 h-32 sm:h-16 object-cover rounded-xl shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full sm:w-20 h-32 sm:h-16 bg-[#FAF8F4] border border-[#E6E0DA] rounded-xl flex items-center justify-center shrink-0">
                        <span className="font-material-icons text-[#D4755B]/40" aria-hidden="true">home</span>
                      </div>
                    )}

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-manrope font-bold text-sm text-[#221410] truncate">
                          {apt.propertyId?.title ?? 'Property no longer available'}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-manrope font-semibold ${status.bg} ${status.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </div>
                      {apt.propertyId?.location && (
                        <p className="font-manrope text-xs text-[#64748B] mt-0.5 truncate">
                          {apt.propertyId.location}
                        </p>
                      )}
                      <p className="font-manrope text-xs text-[#4B5563] mt-1 tabular-nums">
                        {formatDate(apt.date)} · {apt.time}
                      </p>
                      {apt.status === 'cancelled' && apt.cancelReason && (
                        <p className="font-manrope text-xs text-red-500 mt-1">{apt.cancelReason}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {apt.meetingLink && apt.status === 'confirmed' && (
                        <a
                          href={apt.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-manrope font-semibold text-xs text-white bg-[#221410] px-4 py-2 rounded-lg hover:bg-[#D4755B] transition-[background-color]"
                        >
                          Join Meeting
                        </a>
                      )}
                      {apt.propertyId && (
                        <Link
                          to={`/property/${apt.propertyId._id}`}
                          className="font-manrope font-semibold text-xs text-[#221410] border border-[#E6E0DA] px-4 py-2 rounded-lg hover:border-[#D4755B] hover:text-[#D4755B] transition-[border-color,color]"
                        >
                          View
                        </Link>
                      )}
                      {cancellable && (
                        <button
                          onClick={() => setCancelTarget(apt)}
                          className="font-manrope font-semibold text-xs text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-[background-color]"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        </>}
      </main>

      <Footer />

      {/* Cancel confirmation */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this viewing?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget?.propertyId?.title
                ? `Your viewing of "${cancelTarget.propertyId.title}" on ${formatDate(cancelTarget.date)} at ${cancelTarget.time} will be cancelled.`
                : 'This appointment will be cancelled.'}{' '}
              A confirmation email will be sent to you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DashboardPage;
