import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';

export default function PatientNew() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    address: '',
    city: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function updatePhone(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm((f) => ({ ...f, phone: digits }));
  }

  function updateAge(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
    setForm((f) => ({ ...f, age: digits }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { age, ...rest } = form;
      // Backend stores date_of_birth, not age — approximate from age since
      // we only collect whole years, not an exact birth date.
      const birthYear = new Date().getFullYear() - Number(age);
      const payload = {
        ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== '')),
        dateOfBirth: `${birthYear}-01-01`,
      };
      const patient = await apiFetch('/admin/patients', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      navigate(`/patients/${patient.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Link to="/patients" className="back-link">&larr; Patients</Link>
      <h1 className="admin-page__title" style={{ marginBottom: 20 }}>Add patient</h1>

      <form onSubmit={handleSubmit} className="admin-form">
        <label>
          Full name
          <input type="text" value={form.fullName} onChange={update('fullName')} required />
        </label>
        <label>
          Email <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
          <input type="email" value={form.email} onChange={update('email')} />
        </label>
        <div className="admin-form__row">
          <label>
            Phone
            <input type="tel" inputMode="numeric" value={form.phone} onChange={updatePhone} maxLength={10} pattern="\d{10}" required />
          </label>
          <label>
            Age
            <input type="text" inputMode="numeric" value={form.age} onChange={updateAge} maxLength={2} pattern="\d{1,2}" required />
          </label>
        </div>
        <label>
          Gender
          <input type="text" value={form.gender} onChange={update('gender')} required />
        </label>
        <label>
          Address
          <input type="text" value={form.address} onChange={update('address')} required />
        </label>
        <label>
          City
          <input type="text" value={form.city} onChange={update('city')} required />
        </label>

        {error && <p className="error-text" role="alert">{error}</p>}

        <button
          type="submit"
          disabled={
            loading ||
            !form.fullName.trim() ||
            form.phone.length !== 10 ||
            !form.age ||
            !form.gender.trim() ||
            !form.address.trim() ||
            !form.city.trim()
          }
        >
          {loading && <span className="spinner spinner--inline" aria-hidden="true" />}
          {loading ? 'Adding…' : 'Add patient'}
        </button>
      </form>
    </div>
  );
}
