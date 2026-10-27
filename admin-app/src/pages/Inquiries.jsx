import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Spinner from '../components/Spinner.jsx';

const STATUSES = ['PENDING', 'CONTACTED', 'CONFIRMED', 'ARCHIVED'];

export default function Inquiries() {
  const [inquiries, setInquiries] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  function load() {
    const query = status ? `?status=${status}` : '';
    apiFetch(`/admin/inquiries${query}`).then(setInquiries).catch((err) => setError(err.message));
  }

  useEffect(load, [status]);

  async function updateStatus(id, newStatus) {
    try {
      await apiFetch(`/admin/inquiries/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Booking Inquiries</h1>
      </div>

      <div className="admin-filter-bar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <p className="error-text" role="alert">{error}</p>}

      {!inquiries ? (
        <Spinner />
      ) : inquiries.length === 0 ? (
        <p className="empty-state">No inquiries yet.</p>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Service</th>
                <th>Preferred</th>
                <th>Status</th>
                <th>Received</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inq) => (
                <tr key={inq.id}>
                  <td>{inq.name}</td>
                  <td>{inq.phone || '—'}</td>
                  <td>{inq.service_interest || '—'}</td>
                  <td>
                    {inq.preferred_date
                      ? `${inq.preferred_date}${inq.preferred_time ? ` · ${inq.preferred_time}` : ''}`
                      : '—'}
                  </td>
                  <td><StatusBadge status={inq.status} /></td>
                  <td>{new Date(inq.created_at).toLocaleString('en-IN')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {inq.waLink && (
                        <a href={inq.waLink} target="_blank" rel="noopener noreferrer" className="btn secondary" style={{ fontSize: '0.8rem', padding: '6px 10px' }}>
                          Reply on WhatsApp
                        </a>
                      )}
                      <select
                        value={inq.status}
                        onChange={(e) => updateStatus(inq.id, e.target.value)}
                        style={{ width: 'auto', minWidth: 0 }}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
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
