/**
 * UserStatusBadge Component
 *
 * Displays user status with appropriate colors and styling
 * Used in user tables, user details, and other user management interfaces
 */

const STATUS_CONFIG = {
  active: {
    label: 'Active',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    dotColor: 'bg-emerald-500'
  },
  suspended: {
    label: 'Suspended',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    dotColor: 'bg-amber-500'
  },
  banned: {
    label: 'Banned',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    dotColor: 'bg-red-500'
  }
};

const UserStatusBadge = ({ status, className = '' }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} ${className}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
};

export default UserStatusBadge;