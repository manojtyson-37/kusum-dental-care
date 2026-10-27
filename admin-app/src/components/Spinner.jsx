export default function Spinner({ label = 'Loading…' }) {
  return (
    <p className="empty-state spinner-row">
      <span className="spinner" aria-hidden="true" />
      {label}
    </p>
  );
}
