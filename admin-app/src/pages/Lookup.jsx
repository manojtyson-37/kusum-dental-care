import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';

export default function Lookup() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function search(e) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setError('');
    try {
      const data = await apiFetch(`/admin/patients/search?search=${encodeURIComponent(query.trim())}`);
      setResults(data);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Patient Lookup</h1>
      </div>

      <form onSubmit={search} className="admin-filter-bar">
        <input
          placeholder="Search by phone or name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          style={{ minWidth: 260 }}
        />
        <button type="submit">Search</button>
      </form>

      {error && <p className="error-text" role="alert">{error}</p>}

      {results && (
        results.length === 0 ? (
          <div className="empty-state empty-state--action">
          <p>No patients matched that search.</p>
          <span className="empty-state__hint">Try a partial name or phone number.</span>
        </div>
        ) : (
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Last visit</th>
                  <th>Alerts</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {results.map((p) => {
                  const info = p.patients ?? {};
                  const alertCount = [
                    info.is_diabetic,
                    info.is_hypertensive,
                    info.has_bleeding_risk,
                    info.has_penicillin_allergy,
                  ].filter(Boolean).length;
                  return (
                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/lookup/${p.id}`)}>
                      <td>{p.full_name}</td>
                      <td>{p.phone || '—'}</td>
                      <td>{info.last_visit_date || '—'}</td>
                      <td>
                        {alertCount > 0
                          ? <span className="status-badge status-badge--warning">{alertCount} alert{alertCount > 1 ? 's' : ''}</span>
                          : '—'}
                      </td>
                      <td>
                        <button type="button" className="secondary" style={{ fontSize: '0.8rem', padding: '6px 10px' }}>
                          Open record →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
