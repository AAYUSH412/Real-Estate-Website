import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, X, Building2, MapPin, BedDouble, Bath,
  Maximize, User, Mail, Clock, RefreshCw, Search,
  ChevronLeft, ChevronRight, Images,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "../services/apiClient";
import { cn, formatPrice, formatDate } from "../lib/utils";

// ─── Image Gallery + Lightbox ─────────────────────────────────────────────────
const ImageGallery = ({ images, title }) => {
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const imgs = (images || []).filter(Boolean);

  const openLightbox = (idx, e) => {
    e.stopPropagation();
    setLightboxIdx(idx);
  };

  const closeLightbox = () => setLightboxIdx(null);

  const navigate = (dir, e) => {
    e.stopPropagation();
    setLightboxIdx((i) => (i + dir + imgs.length) % imgs.length);
  };

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") setLightboxIdx((i) => (i - 1 + imgs.length) % imgs.length);
      if (e.key === "ArrowRight") setLightboxIdx((i) => (i + 1) % imgs.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, imgs.length]);

  if (!imgs.length) {
    return (
      <div className="h-52 bg-[#F5F5F3] flex flex-col items-center justify-center gap-2 border-b border-[#E8E7E5]">
        <Building2 className="w-10 h-10 text-[#CCCCC9]" />
        <p className="text-xs text-[#9B9B99]">No images uploaded</p>
      </div>
    );
  }

  const count = imgs.length;

  return (
    <>
      {/* Gallery grid */}
      <div
        className={cn(
          "grid gap-0.5 overflow-hidden border-b border-[#E8E7E5]",
          count === 1 && "grid-cols-1",
          count === 2 && "grid-cols-2",
          count === 3 && "grid-cols-3",
          count >= 4 && "grid-cols-[2fr_1fr]"
        )}
        style={{ maxHeight: 260 }}
      >
        {/* Hero / main image */}
        <div
          className={cn(
            "relative overflow-hidden cursor-pointer group",
            count >= 4 ? "row-span-2" : "",
            count === 1 ? "aspect-[16/7]" : "aspect-[4/3]"
          )}
          onClick={(e) => openLightbox(0, e)}
        >
          <img
            src={imgs[0]}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
        </div>

        {/* Secondary images */}
        {count >= 4 ? (
          // Right column — 2 stacked
          <div className="grid grid-rows-2 gap-0.5">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="relative overflow-hidden cursor-pointer group"
                onClick={(e) => openLightbox(i, e)}
              >
                <img src={imgs[i]} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                {/* "See all" overlay on last thumb */}
                {i === 2 && count > 3 && (
                  <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-1">
                    <Images className="w-5 h-5 text-white" />
                    <span className="text-white font-bold text-sm">{count} photos</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
              </div>
            ))}
          </div>
        ) : count === 2 ? (
          <div className="relative overflow-hidden cursor-pointer group aspect-[4/3]" onClick={(e) => openLightbox(1, e)}>
            <img src={imgs[1]} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
          </div>
        ) : count === 3 ? (
          [1, 2].map((i) => (
            <div key={i} className="relative overflow-hidden cursor-pointer group aspect-[4/3]" onClick={(e) => openLightbox(i, e)}>
              <img src={imgs[i]} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
            </div>
          ))
        ) : null}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[100] backdrop-blur-lg flex flex-col items-center justify-center"
            onClick={closeLightbox}
          >
            {/* Close */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm font-manrope">
              {lightboxIdx + 1} / {imgs.length}
            </div>

            {/* Main image */}
            <motion.img
              key={lightboxIdx}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18 }}
              src={imgs[lightboxIdx]}
              alt=""
              className="max-h-[75vh] max-w-[85vw] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Prev / Next */}
            {imgs.length > 1 && (
              <>
                <button
                  onClick={(e) => navigate(-1, e)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => navigate(1, e)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Thumbnail strip */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 px-4" onClick={(e) => e.stopPropagation()}>
              {imgs.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIdx(i)}
                  className={cn(
                    "w-14 h-10 rounded overflow-hidden border-2 transition-all duration-150 flex-shrink-0",
                    i === lightboxIdx ? "border-white opacity-100" : "border-transparent opacity-50 hover:opacity-80"
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ─── Reject Modal ─────────────────────────────────────────────────────────────
const RejectModal = ({ listing, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState("");

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          className="absolute inset-0 bg-black/50"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          className="relative bg-white rounded-2xl border border-[#E8E7E5] shadow-2xl w-full max-w-md p-6 z-10"
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.18 }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <X className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-[#111110] text-sm">Reject Listing</h3>
                <p className="text-xs text-[#9B9B99] mt-0.5 truncate max-w-[220px]">{listing.title}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-[#9B9B99] hover:text-[#111110] p-1 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); if (reason.trim()) onConfirm(reason.trim()); }} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#6B6B6A] uppercase tracking-wider mb-2">
                Rejection reason <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="e.g. Missing price details, unclear photos, prohibited content…"
                className="w-full border border-[#E8E7E5] rounded-xl px-3 py-2.5 text-sm text-[#111110] focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 resize-none"
                autoFocus
              />
              <p className="text-xs text-[#9B9B99] mt-1">This will be emailed to the listing owner.</p>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} disabled={loading}
                className="flex-1 py-2.5 text-sm font-medium text-[#6B6B6A] border border-[#E8E7E5] rounded-xl hover:bg-[#F5F5F3] transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading || !reason.trim()}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && (
                  <motion.span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }} />
                )}
                Reject Listing
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// ─── Listing Card ─────────────────────────────────────────────────────────────
const ListingCard = ({ listing, onApprove, onReject, actionLoading }) => {
  const submitter = listing.postedBy;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.22 }}
      className="bg-white border border-[#E8E7E5] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      {/* Image gallery — full width at top */}
      <ImageGallery images={listing.image} title={listing.title} />

      {/* Property info */}
      <div className="p-5">
        {/* Title + badges */}
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <h3 className="font-semibold text-[#111110] text-base leading-snug flex-1 min-w-0">
            {listing.title}
          </h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs font-medium text-[#6B6B6A] bg-[#F5F5F3] border border-[#E8E7E5] px-2 py-0.5 rounded-full">
              {listing.type}
            </span>
            <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
              Under Review
            </span>
          </div>
        </div>

        {/* Location */}
        <p className="flex items-center gap-1.5 text-sm text-[#6B6B6A] mb-3">
          <MapPin className="w-3.5 h-3.5 text-[#D4755B] shrink-0" />
          <span className="line-clamp-1">{listing.location}</span>
        </p>

        {/* Specs */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="font-space-mono font-bold text-[#D4755B] text-base tabular-nums">
            {formatPrice(listing.price)}
          </span>
          <span className="text-[#CCCCC9]">·</span>
          <span className="flex items-center gap-1 text-xs text-[#6B6B6A]">
            <BedDouble className="w-3.5 h-3.5" /> {listing.beds} bed
          </span>
          <span className="flex items-center gap-1 text-xs text-[#6B6B6A]">
            <Bath className="w-3.5 h-3.5" /> {listing.baths} bath
          </span>
          <span className="flex items-center gap-1 text-xs text-[#6B6B6A]">
            <Maximize className="w-3.5 h-3.5" /> {listing.sqft?.toLocaleString()} sqft
          </span>
          {listing.availability && (
            <span className="text-xs text-[#9B9B99] bg-[#F5F5F3] px-2 py-0.5 rounded-full capitalize">
              {listing.availability}
            </span>
          )}
        </div>

        {/* Description */}
        {listing.description && (
          <p className="text-xs text-[#9B9B99] line-clamp-2 leading-relaxed mb-4">
            {listing.description}
          </p>
        )}

        {/* Submitter row */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#F5F5F3] mb-4">
          <div className="flex items-center gap-1.5 text-xs text-[#6B6B6A]">
            <User className="w-3.5 h-3.5 text-[#9B9B99]" />
            <span className="font-medium">{submitter?.name ?? "Unknown"}</span>
          </div>
          {submitter?.email && (
            <div className="flex items-center gap-1.5 text-xs text-[#9B9B99]">
              <Mail className="w-3.5 h-3.5" />
              <span>{submitter.email}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-[#9B9B99] ml-auto">
            <Clock className="w-3.5 h-3.5" />
            <span>Submitted {formatDate(listing.createdAt)}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onApprove(listing._id)}
            disabled={!!actionLoading}
            className={cn(
              "flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all",
              actionLoading === `approve-${listing._id}` && "opacity-60 cursor-not-allowed"
            )}
          >
            {actionLoading === `approve-${listing._id}` ? (
              <motion.span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }} />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Approve
          </button>
          <button
            onClick={() => onReject(listing)}
            disabled={!!actionLoading}
            className={cn(
              "flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 active:scale-[0.98] transition-all",
              actionLoading === `reject-${listing._id}` && "opacity-60 cursor-not-allowed"
            )}
          >
            {actionLoading === `reject-${listing._id}` ? (
              <motion.span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }} />
            ) : (
              <X className="w-4 h-4" />
            )}
            Reject
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const PendingListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/api/admin/properties/pending");
      const data = res.data.listings ?? res.data.properties ?? res.data ?? [];
      setListings(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch pending listings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleApprove = async (id) => {
    setActionLoading(`approve-${id}`);
    try {
      await apiClient.put(`/api/admin/properties/${id}/approve`, {});
      setListings((prev) => prev.filter((l) => l._id !== id));
      toast.success("Listing approved and is now live!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve listing.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async (reason) => {
    if (!rejectTarget) return;
    const id = rejectTarget._id;
    setActionLoading(`reject-${id}`);
    try {
      await apiClient.put(`/api/admin/properties/${id}/reject`, { reason });
      setListings((prev) => prev.filter((l) => l._id !== id));
      toast.success("Listing rejected. Owner has been notified.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject listing.");
    } finally {
      setActionLoading(null);
      setRejectTarget(null);
    }
  };

  const filtered = listings.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.title?.toLowerCase().includes(q) ||
      l.location?.toLowerCase().includes(q) ||
      l.postedBy?.name?.toLowerCase().includes(q) ||
      l.postedBy?.email?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="h-7 w-44 bg-[#EBEBEA] rounded animate-pulse mb-8" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E8E7E5] rounded-2xl overflow-hidden animate-pulse">
              <div className="h-52 bg-[#F5F5F3]" />
              <div className="p-5 space-y-3">
                <div className="h-5 w-2/3 bg-[#EBEBEA] rounded" />
                <div className="h-4 w-1/2 bg-[#EBEBEA] rounded" />
                <div className="h-10 bg-[#EBEBEA] rounded-xl mt-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3] px-6 py-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-[#111110] tracking-tight">Review Queue</h1>
              {listings.length > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200/60">
                  {listings.length} pending
                </span>
              )}
            </div>
            <p className="text-sm text-[#9B9B99]">Approve or reject user-submitted property listings.</p>
          </div>
          <button
            onClick={fetchPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#6B6B6A] bg-white border border-[#E8E7E5] rounded-lg hover:border-[#D4755B] hover:text-[#D4755B] active:scale-[0.97] transition-all shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* Search */}
        {listings.length > 0 && (
          <div className="relative mb-6">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9B99]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, location, or submitter…"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E8E7E5] rounded-xl text-sm text-[#111110] focus:outline-none focus:ring-2 focus:ring-[#D4755B]/20 focus:border-[#D4755B] transition-all"
            />
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              {searchQuery ? <Search className="w-7 h-7 text-emerald-500" /> : <Check className="w-7 h-7 text-emerald-500" />}
            </div>
            <h3 className="font-semibold text-[#111110] mb-1">
              {searchQuery ? "No results found" : "All clear!"}
            </h3>
            <p className="text-sm text-[#9B9B99]">
              {searchQuery
                ? `No listings match "${searchQuery}"`
                : "No listings waiting for review right now."}
            </p>
          </div>
        )}

        {/* Cards */}
        <AnimatePresence>
          <div className="space-y-5">
            {filtered.map((listing) => (
              <ListingCard
                key={listing._id}
                listing={listing}
                onApprove={handleApprove}
                onReject={setRejectTarget}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        </AnimatePresence>

        {/* Reject modal */}
        {rejectTarget && (
          <RejectModal
            listing={rejectTarget}
            onClose={() => setRejectTarget(null)}
            onConfirm={handleRejectConfirm}
            loading={actionLoading === `reject-${rejectTarget._id}`}
          />
        )}
      </div>
    </div>
  );
};

export default PendingListings;
