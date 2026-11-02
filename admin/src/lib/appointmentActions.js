import { BOOKING_TRANSITIONS } from '@buildestate/contracts';

export function getAppointmentActions(appointment, now = Date.now()) {
  const transitions = BOOKING_TRANSITIONS[appointment.status] || [];
  const endsAt = typeof appointment.endsAt === 'string' && appointment.endsAt.trim() ? Date.parse(appointment.endsAt) : NaN;
  return transitions.map(status => {
    const disabled = status === 'completed' && (!Number.isFinite(endsAt) || endsAt > now);
    return {
      status,
      label: { confirmed: 'Confirm', completed: 'Complete', cancelled: 'Cancel' }[status],
      disabled,
      reason: disabled ? Number.isFinite(endsAt) ? 'Available after the scheduled viewing ends.' : 'Scheduled end time is unavailable. Refresh the appointment details.' : '',
    };
  });
}
