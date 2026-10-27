import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Spinner from '../components/Spinner.jsx';

const STATUS_OPTIONS = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];

function formatINR(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

function RecordPaymentForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({
    appointmentId: '',
    patientId: '',
    amount: '',
    paymentMethod: '',
    status: 'COMPLETED',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/admin/payments', {
        method: 'POST',
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form card" style={{ maxWidth: 480, marginBottom: 20 }}>
      <h3 className="chart-card__title">Record payment</h3>

      <label>
        Appointment ID
        <input type="text" value={form.appointmentId} onChange={update('appointmentId')} required />
      </label>
      <label>
        Patient ID
        <input type="text" value={form.patientId} onChange={update('patientId')} required />
      </label>
      <div className="admin-form__row">
        <label>
          Amount (₹)
          <input type="number" min="0" step="1" value={form.amount} onChange={update('amount')} required />
        </label>
        <label>
          Method
          <input type="text" placeholder="Card, UPI, cash…" value={form.paymentMethod} onChange={update('paymentMethod')} />
        </label>
      </div>
      <label>
        Status
        <select value={form.status} onChange={update('status')}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      {error && <p className="error-text" role="alert">{error}</p>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="submit" disabled={loading}>{loading && <span className="spinner spinner--inline" aria-hidden="true" />}{loading ? 'Saving…' : 'Record payment'}</button>
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function Payments() {
  const [status, setStatus] = useState('');
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [exporting, setExporting] = useState(false);

  function load() {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    apiFetch(`/admin/payments?${params}`).then(setPayments).catch((err) => setError(err.message));
  }

  useEffect(load, [status]);

  async function updateStatus(id, newStatus) {
    try {
      await apiFetch(`/admin/payments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await apiFetch('/admin/payments/export');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'payments.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  const total = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Payments</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="secondary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Close' : 'Record payment'}</button>
        </div>
      </div>

      {showForm && (
        <RecordPaymentForm
          onCreated={() => {
            setShowForm(false);
            load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="admin-filter-bar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {payments && <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-light)' }}>Total: {formatINR(total)}</span>}
      </div>

      {error && <p className="error-text" role="alert">{error}</p>}

      {!payments ? (
        <Spinner />
      ) : payments.length === 0 ? (
        <div className="empty-state empty-state--action">
          <p>No payments recorded yet.</p>
          <span className="empty-state__hint">Payments appear here once an invoice is raised from a patient&apos;s record.</span>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Service</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.payment_date ? p.payment_date.slice(0, 10) : '—'}</td>
                  <td>{p.patient?.full_name ?? '—'}</td>
                  <td>{p.appointment?.service?.name ?? '—'}</td>
                  <td>{formatINR(p.amount)}</td>
                  <td>{p.payment_method || '—'}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>
                    <select
                      value={p.status}
                      onChange={(e) => updateStatus(p.id, e.target.value)}
                      style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
