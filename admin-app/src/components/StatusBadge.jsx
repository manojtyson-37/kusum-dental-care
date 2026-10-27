const GOOD = new Set(['COMPLETED', 'PAID', 'CONFIRMED']);
const WARNING = new Set(['PENDING', 'CANCELLED', 'NO_SHOW', 'FAILED', 'UNPAID', 'ARCHIVED']);

export default function StatusBadge({ status }) {
  const variant = GOOD.has(status) ? 'good' : WARNING.has(status) ? 'warning' : 'neutral';
  return <span className={`status-badge status-badge--${variant}`}>{status.toLowerCase().replace('_', ' ')}</span>;
}
