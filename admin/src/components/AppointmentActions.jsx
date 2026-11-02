import { Check, X, Loader2 } from 'lucide-react';
import { getAppointmentActions } from '../lib/appointmentActions.js';

const styles = {
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  completed: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  cancelled: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
};

export default function AppointmentActions({ appointment, now, busy, onStatusChange }) {
  if (busy) return <span role="status" aria-label="Updating appointment"><Loader2 className="w-4 h-4 text-[#9CA3AF] animate-spin" /></span>;
  const actions = getAppointmentActions(appointment, now);
  if (!actions.length) return <span className="text-xs text-[#9CA3AF]">No actions</span>;
  return <div className="flex flex-wrap items-center gap-1.5">
    {actions.map(action => <button key={action.status} type="button" disabled={action.disabled}
      title={action.reason || undefined}
      aria-label={action.reason ? `${action.label}: ${action.reason}` : action.label}
      onClick={() => onStatusChange(appointment._id, action.status)}
      className={`flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:hover:bg-gray-100 ${styles[action.status]}`}>
      {action.status === 'cancelled' ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
      {action.label}
    </button>)}
  </div>;
}
