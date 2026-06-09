import { getCertificateStatus, getStatusClass } from '../../utils/format';

export function StatusBadge({ status, expiresAt }) {
  const statusText = typeof status === 'string' ? status : getCertificateStatus(status, expiresAt);
  const statusClass = getStatusClass(statusText);

  return (
    <span className={`status-badge ${statusClass}`}>
      {statusText}
    </span>
  );
}

export function RoleBadge({ role }) {
  const roleColors = {
    Admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    Issuer: 'bg-primary-500/20 text-primary-400 border-primary-500/30',
    Holder: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Public: 'bg-dark-500/20 text-dark-400 border-dark-500/30',
  };

  return (
    <span className={`status-badge ${roleColors[role] || roleColors.Public}`}>
      {role}
    </span>
  );
}

export function EventTypeBadge({ type }) {
  const typeColors = {
    CertificateIssued: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    CertificateRevoked: 'bg-red-500/20 text-red-400 border-red-500/30',
    IssuerGranted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    IssuerRevoked: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };

  const typeLabels = {
    CertificateIssued: 'Issued',
    CertificateRevoked: 'Revoked',
    IssuerGranted: 'Issuer Granted',
    IssuerRevoked: 'Issuer Revoked',
  };

  return (
    <span className={`status-badge ${typeColors[type] || 'bg-dark-500/20 text-dark-400'}`}>
      {typeLabels[type] || type}
    </span>
  );
}

export function TransactionStatusBadge({ status }) {
  const statusColors = {
    pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    submitted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    confirmed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <span className={`status-badge ${statusColors[status] || 'bg-dark-500/20 text-dark-400'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function TypeBadge({ type }) {
  const typeColors = {
    degree: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    professional: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    course: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    achievement: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    membership: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  };

  const typeLabels = {
    degree: 'Degree',
    professional: 'Professional',
    course: 'Course',
    achievement: 'Achievement',
    membership: 'Membership',
  };

  return (
    <span className={`status-badge ${typeColors[type] || 'bg-dark-500/20 text-dark-400 border-dark-500/30'}`}>
      {typeLabels[type] || type || 'Unknown'}
    </span>
  );
}
