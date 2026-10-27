import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import Spinner from '../components/Spinner.jsx';

export default function Patients() {
  const [search, setSearch] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      apiFetch(`/admin/patients${query}`, { signal: controller.signal })
        .then(setResult)
        .catch((err) => {
          if (err.name !== 'AbortError') setError(err.message);
        });
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [search]);

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Patients</h1>
        <Link to="/patients/new" className="btn">Add patient</Link>
      </div>

      <div className="admin-filter-bar">
        <input
          type="search"
          placeholder="Search by name, email or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="error-text" role="alert">{error}</p>}

      {!result ? (
        <Spinner />
      ) : result.items.length === 0 ? (
        <div className="empty-state empty-state--action">
          <p>No patients yet.</p>
          <Link to="/patients/new"><button type="button">Add patient</button></Link>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Last visit</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/patients/${p.id}`}>{p.full_name}</Link>
                  </td>
                  <td>{p.email || '—'}</td>
                  <td>{p.phone || '—'}</td>
                  <td>{p.patients?.last_visit_date ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
