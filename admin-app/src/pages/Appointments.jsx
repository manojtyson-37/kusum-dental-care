import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import Spinner from '../components/Spinner.jsx';
import { apiFetch } from '../lib/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import TimeSelect from '../components/TimeSelect.jsx';
import { useRealtimeTables } from '../lib/useRealtimeTables.js';

const LIVE_TABLES = ['appointments'];

const STATUS_OPTIONS = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

// One-tap buttons for the transitions that actually happen during a clinic day,
// so the common path is a single click instead of reading through the dropdown.
// The dropdown stays for everything else (the edit modal has no status field).
const QUICK_ACTIONS = {
  SCHEDULED: [
    { label: 'Arrived', next: 'IN_PROGRESS', primary: true },
    { label: 'No-show', next: 'NO_SHOW' },
  ],
  IN_PROGRESS: [{ label: 'Complete', next: 'COMPLETED', primary: true }],
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime12(hhmmss) {
  if (!hhmmss) return '—';
  const [h, m] = hhmmss.split(':');
  const n = Number(h);
  const period = n >= 12 ? 'PM' : 'AM';
  let h12 = n % 12;
  if (h12 === 0) h12 = 12;
  return `${String(h12).padStart(2, '0')}:${m} ${period}`;
}

// Chrome silently increments/decrements a focused date/time input on mouse
// wheel scroll, with no visual cue — blurring on wheel stops a page scroll
// from quietly changing an appointment's date underneath the doctor.
function blurOnWheel(e) {
  e.target.blur();
}

function NewAppointmentForm({ onCreated, onCancel }) {
  const [patientMode, setPatientMode] = useState('search');
  const [patients, setPatients] = useState([]);
  const [newPatient, setNewPatient] = useState({ fullName: '', phone: '', email: '' });
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientError, setPatientError] = useState('');
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({
    patientId: '',
    staffId: '',
    serviceId: '',
    appointmentDate: todayISO(),
    startTime: '',
    endTime: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch('/admin/staff').then(setStaff).catch(() => {});
    apiFetch('/services?pageSize=100').then((r) => setServices(r.items ?? [])).catch(() => {});
    apiFetch('/admin/patients?pageSize=100')
      .then((r) => setPatients(r.items ?? []))
      .catch(() => setPatients([]));
  }, []);

  // Guards against the easy-to-hit mistake of typing an existing patient's
  // name into "+ New patient" (which always creates a fresh record) instead
  // of finding them via search — surfaces a same-name match before it
  // silently creates a duplicate patient.
  useEffect(() => {
    if (patientMode !== 'new' || newPatient.fullName.trim().length < 2) {
      setDuplicateMatches([]);
      return undefined;
    }
    const timeout = setTimeout(() => {
      apiFetch(`/admin/patients?search=${encodeURIComponent(newPatient.fullName.trim())}`)
        .then((r) => setDuplicateMatches(r.items ?? []))
        .catch(() => setDuplicateMatches([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [newPatient.fullName, patientMode]);

  function switchMode(mode) {
    setPatientMode(mode);
    setSelectedPatient(null);
    setPatientError('');
    setForm((f) => ({ ...f, patientId: '' }));
  }

  function selectExistingPatient(id, list = patients) {
    const patient = list.find((p) => p.id === id) ?? null;
    setSelectedPatient(patient);
    setForm((f) => ({ ...f, patientId: id }));
  }

  async function handleAddPatient() {
    setPatientError('');
    if (!newPatient.fullName.trim()) {
      setPatientError('Enter the patient\'s name.');
      return null;
    }
    setCreatingPatient(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(newPatient).filter(([, v]) => v.trim() !== ''),
      );
      const patient = await apiFetch('/admin/patients', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setSelectedPatient(patient);
      setForm((f) => ({ ...f, patientId: patient.id }));
      return patient.id;
    } catch (err) {
      setPatientError(err.message);
      return null;
    } finally {
      setCreatingPatient(false);
    }
  }

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    let patientId = form.patientId;
    if (!patientId && patientMode === 'new') {
      patientId = await handleAddPatient();
      if (!patientId) return;
    }
    if (!patientId) {
      setError('Select or add a patient first.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/admin/appointments', {
        method: 'POST',
        body: JSON.stringify({ ...form, patientId }),
      });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form card" style={{ maxWidth: 520, marginBottom: 20 }}>
      <h3 className="chart-card__title">New appointment</h3>

      <div className="patient-mode-toggle">
        <button
          type="button"
          className={patientMode === 'search' ? '' : 'secondary'}
          onClick={() => switchMode('search')}
        >
          Existing patient
        </button>
        <button
          type="button"
          className={patientMode === 'new' ? '' : 'secondary'}
          onClick={() => switchMode('new')}
        >
          + New patient
        </button>
      </div>

      {selectedPatient ? (
        <div className="patient-selected">
          <span>
            Patient: <strong>{selectedPatient.full_name}</strong>
            {selectedPatient.email ? ` — ${selectedPatient.email}` : ''}
          </span>
          <button type="button" className="link-action" onClick={() => switchMode(patientMode)}>
            Change
          </button>
        </div>
      ) : patientMode === 'new' ? (
        <div className="patient-new-fields">
          <label>
            Patient name
            <input
              type="text"
              value={newPatient.fullName}
              onChange={(e) => setNewPatient((p) => ({ ...p, fullName: e.target.value }))}
            />
          </label>
          {duplicateMatches.length > 0 && (
            <div className="duplicate-warning">
              <p>Already in the system — did you mean one of these instead of adding a new patient?</p>
              {duplicateMatches.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="link-action"
                  onClick={() => {
                    switchMode('search');
                    selectExistingPatient(p.id, [p]);
                  }}
                >
                  {p.full_name}{p.email ? ` — ${p.email}` : ''}
                </button>
              ))}
            </div>
          )}
          <div className="admin-form__row">
            <label>
              Phone <span className="admin-form__optional">(optional)</span>
              <input
                type="tel"
                value={newPatient.phone}
                onChange={(e) => setNewPatient((p) => ({ ...p, phone: e.target.value }))}
              />
            </label>
            <label>
              Email <span className="admin-form__optional">(optional)</span>
              <input
                type="email"
                value={newPatient.email}
                onChange={(e) => setNewPatient((p) => ({ ...p, email: e.target.value }))}
              />
            </label>
          </div>
          {patientError && <p className="error-text" role="alert">{patientError}</p>}
          <button type="button" className="secondary" onClick={handleAddPatient} disabled={creatingPatient}>
            {creatingPatient && <span className="spinner spinner--inline" aria-hidden="true" />}
            {creatingPatient ? 'Adding…' : 'Add & select patient'}
          </button>
        </div>
      ) : (
        <label>
          Patient
          <select value={form.patientId} onChange={(e) => selectExistingPatient(e.target.value)}>
            <option value="">Select a patient…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name} — {p.email}</option>
            ))}
          </select>
        </label>
      )}

      <label>
        Dentist / staff
        <select value={form.staffId} onChange={update('staffId')} required>
          <option value="">Select…</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.full_name}</option>
          ))}
        </select>
      </label>

      <label>
        Service
        <select value={form.serviceId} onChange={update('serviceId')} required>
          <option value="">Select…</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </label>

      <div className="admin-form__row">
        <label>
          Date
          <input type="date" value={form.appointmentDate} onChange={update('appointmentDate')} onWheel={blurOnWheel} required />
        </label>
        <label>
          Start time
          <TimeSelect value={form.startTime} onChange={(v) => update('startTime')({ target: { value: v } })} required />
        </label>
      </div>
      <label>
        End time
        <TimeSelect value={form.endTime} onChange={(v) => update('endTime')({ target: { value: v } })} required />
      </label>
      <label>
        Notes
        <input type="text" value={form.notes} onChange={update('notes')} />
      </label>

      {error && <p className="error-text" role="alert">{error}</p>}

      <div className="admin-form__actions">
        <button
          type="submit"
          disabled={loading || creatingPatient || (!form.patientId && patientMode === 'search')}
        >
          {loading || creatingPatient ? 'Booking…' : 'Book appointment'}
        </button>
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function EditAppointmentModal({ appointment, onSaved, onCancel }) {
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({
    staffId: appointment.staff?.id ?? '',
    serviceId: appointment.service?.id ?? '',
    appointmentDate: appointment.appointment_date,
    startTime: (appointment.start_time ?? '').slice(0, 5),
    endTime: (appointment.end_time ?? '').slice(0, 5),
    notes: appointment.notes ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch('/admin/staff').then(setStaff).catch(() => {});
    apiFetch('/services?pageSize=100').then((r) => setServices(r.items ?? [])).catch(() => {});
  }, []);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const updated = await apiFetch(`/admin/appointments/${appointment.id}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      onSaved(updated.appointment_date);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__header">
          <h3 className="chart-card__title">Edit appointment</h3>
          <button type="button" className="modal-card__close" onClick={onCancel} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSave} className="admin-form">
          <div className="admin-form__row">
            <label>
              Dentist / staff
              <select value={form.staffId} onChange={update('staffId')} required>
                <option value="">Select…</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </label>
            <label>
              Service
              <select value={form.serviceId} onChange={update('serviceId')} required>
                <option value="">Select…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="admin-form__row">
            <label>
              Date
              <input type="date" value={form.appointmentDate} onChange={update('appointmentDate')} onWheel={blurOnWheel} required />
            </label>
            <label>
              Start time
              <TimeSelect value={form.startTime} onChange={(v) => update('startTime')({ target: { value: v } })} required />
            </label>
          </div>
          <label>
            End time
            <TimeSelect value={form.endTime} onChange={(v) => update('endTime')({ target: { value: v } })} required />
          </label>
          <label>
            Notes
            <input type="text" value={form.notes} onChange={update('notes')} />
          </label>

          {error && <p className="error-text" role="alert">{error}</p>}

          <div className="admin-form__actions">
            <button type="submit" disabled={saving}>{saving && <span className="spinner spinner--inline" aria-hidden="true" />}{saving ? 'Saving…' : 'Save changes'}</button>
            <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Appointments() {
  const [date, setDate] = useState(todayISO());
  const [status, setStatus] = useState('');
  const [appointments, setAppointments] = useState(null);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(() => searchParams.get('new') === '1');
  const [editingId, setEditingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  function load() {
    const params = new URLSearchParams({ date });
    if (status) params.set('status', status);
    apiFetch(`/admin/appointments?${params}`).then(setAppointments).catch((err) => setError(err.message));
  }

  useEffect(load, [date, status]);
  useRealtimeTables(LIVE_TABLES, load);

  async function updateStatus(id, newStatus) {
    setError('');
    setUpdatingId(id);
    try {
      await apiFetch(`/admin/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  function closeForm() {
    setShowForm(false);
    if (searchParams.get('new')) {
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Appointments</h1>
        <button onClick={() => (showForm ? closeForm() : setShowForm(true))}>{showForm ? 'Close' : 'New appointment'}</button>
      </div>

      {showForm && (
        <NewAppointmentForm
          onCreated={() => {
            closeForm();
            load();
          }}
          onCancel={closeForm}
        />
      )}

      <div className="admin-filter-bar">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} onWheel={blurOnWheel} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {error && <p className="error-text" role="alert">{error}</p>}

      {!appointments ? (
        <Spinner />
      ) : appointments.length === 0 ? (
        <div className="empty-state empty-state--action">
          <p>No appointments on this date.</p>
          <button type="button" onClick={() => setShowForm(true)}>New appointment</button>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient</th>
                <th>Dentist</th>
                <th>Service</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td className="admin-time-range">{formatTime12(a.start_time)} – {formatTime12(a.end_time)}</td>
                  <td>{a.patient?.full_name ?? '—'}</td>
                  <td>{a.staff?.full_name ?? '—'}</td>
                  <td>{a.service?.name ?? '—'}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {(QUICK_ACTIONS[a.status] ?? []).map((qa) => (
                      <button
                        key={qa.next}
                        type="button"
                        className={`appt-quick${qa.primary ? ' appt-quick--primary' : ''}`}
                        disabled={updatingId === a.id}
                        onClick={() => updateStatus(a.id, qa.next)}
                      >
                        {qa.label}
                      </button>
                    ))}
                    <select
                      value={a.status}
                      disabled={updatingId === a.id}
                      onChange={(e) => updateStatus(a.id, e.target.value)}
                      style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="link-action"
                      onClick={() => setEditingId(a.id)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingId && appointments?.find((a) => a.id === editingId) && (
        <EditAppointmentModal
          appointment={appointments.find((a) => a.id === editingId)}
          onSaved={(newDate) => {
            setEditingId(null);
            if (newDate && newDate !== date) {
              // Jump the filter to wherever the appointment now lives —
              // otherwise a rescheduled appointment just falls out of the
              // current date's view and looks like it vanished.
              setDate(newDate);
            } else {
              load();
            }
          }}
          onCancel={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
