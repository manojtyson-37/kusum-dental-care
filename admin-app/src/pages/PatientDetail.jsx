import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import Spinner from '../components/Spinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useRealtimeTables } from '../lib/useRealtimeTables.js';

const LIVE_TABLES = ['visit_logs', 'invoices', 'appointments', 'payments'];

const ALERT_LABELS = {
  is_diabetic: 'Diabetic',
  is_hypertensive: 'Hypertensive',
  has_bleeding_risk: 'Bleeding risk',
  has_penicillin_allergy: 'Penicillin allergy',
};

function formatMoney(n) {
  return `₹${Number(n ?? 0).toLocaleString('en-IN')}`;
}

function VisitForm({ patientId, defaultTreatment, onLogged }) {
  const [treatment, setTreatment] = useState(defaultTreatment ?? '');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [prescription, setPrescription] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [amountCharged, setAmountCharged] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Prefill from the patient's booked service so staff don't retype it —
  // still editable in case the visit differs from what was booked.
  useEffect(() => {
    setTreatment(defaultTreatment ?? '');
  }, [defaultTreatment]);

  async function submit(e) {
    e.preventDefault();
    if (!treatment.trim()) return;
    setSaving(true);
    setError('');
    try {
      await apiFetch('/admin/visits', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          treatment: treatment.trim(),
          clinicalNotes: clinicalNotes.trim() || undefined,
          prescription: prescription.trim() || undefined,
          followUpDate: followUpDate || undefined,
          amountCharged: amountCharged ? Number(amountCharged) : undefined,
        }),
      });
      setTreatment('');
      setClinicalNotes('');
      setPrescription('');
      setFollowUpDate('');
      setAmountCharged('');
      onLogged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      {error && <p className="error-text" role="alert">{error}</p>}
      <label>
        Treatment *
        <input value={treatment} onChange={(e) => setTreatment(e.target.value)} placeholder="e.g. Root Canal — Session 1" required />
      </label>
      <label>
        Clinical notes *
        <input value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="Findings, procedure notes" required />
      </label>
      <label>
        Prescription *
        <input value={prescription} onChange={(e) => setPrescription(e.target.value)} placeholder="Medicines & dosage" required />
      </label>
      <div className="admin-form__row">
        <label>
          Follow-up date *
          <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} required />
        </label>
        <label>
          Amount charged (₹) *
          <input type="number" min="0" value={amountCharged} onChange={(e) => setAmountCharged(e.target.value)} required />
        </label>
      </div>
      <button
        type="submit"
        disabled={
          saving ||
          !treatment.trim() ||
          !clinicalNotes.trim() ||
          !prescription.trim() ||
          !followUpDate ||
          !amountCharged
        }
      >
        {saving && <span className="spinner spinner--inline" aria-hidden="true" />}
        {saving ? 'Logging…' : 'Log visit'}
      </button>
    </form>
  );
}

function FileUploadForm({ patientId, onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      await apiFetch(`/admin/patients/${patientId}/files`, { method: 'POST', body: form });
      setFile(null);
      e.target.reset();
      onUploaded();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      {error && <p className="error-text" role="alert">{error}</p>}
      <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files[0] ?? null)} />
      <button type="submit" disabled={uploading || !file}>
        {uploading && <span className="spinner spinner--inline" aria-hidden="true" />}
        {uploading ? 'Uploading…' : 'Upload X-ray / file'}
      </button>
    </form>
  );
}

function InvoiceForm({ patientId, onCreated }) {
  const [items, setItems] = useState([{ description: '', amount: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  function updateItem(i, field, value) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  async function submit(e) {
    e.preventDefault();
    const cleaned = items
      .filter((it) => it.description.trim() && Number(it.amount) > 0)
      .map((it) => ({ description: it.description.trim(), amount: Number(it.amount) }));
    if (!cleaned.length) return;
    setSaving(true);
    setError('');
    setResult(null);
    try {
      const invoice = await apiFetch('/admin/invoices', {
        method: 'POST',
        body: JSON.stringify({ patientId, items: cleaned }),
      });
      setItems([{ description: '', amount: '' }]);
      setResult(invoice);
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {error && <p className="error-text" role="alert">{error}</p>}
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: 10 }}>
          <input
            placeholder="Description (e.g. Scaling)"
            value={it.description}
            onChange={(e) => updateItem(i, 'description', e.target.value)}
            style={{ flex: 2 }}
          />
          <input
            type="number"
            min="0"
            placeholder="Amount"
            value={it.amount}
            onChange={(e) => updateItem(i, 'amount', e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="secondary" onClick={() => setItems((p) => [...p, { description: '', amount: '' }])}>
          + Add line
        </button>
        <button type="submit" disabled={saving}>
          {saving && <span className="spinner spinner--inline" aria-hidden="true" />}
          {saving ? 'Generating…' : 'Generate invoice'}
        </button>
      </div>
      {result?.waShareLink && (
        <a href={result.waShareLink} target="_blank" rel="noopener noreferrer" className="btn">
          Share on WhatsApp
        </a>
      )}
    </form>
  );
}

export default function PatientDetail() {
  const { id } = useParams();
  const fromLookup = useLocation().pathname.startsWith('/lookup');
  const [patient, setPatient] = useState(null);
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');

  function loadRecord() {
    apiFetch(`/admin/patients/${id}/record`).then(setRecord).catch((err) => setError(err.message));
  }

  useEffect(() => {
    apiFetch(`/admin/patients/${id}`).then(setPatient).catch((err) => setError(err.message));
    loadRecord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useRealtimeTables(LIVE_TABLES, loadRecord);

  if (error) return <p className="error-text" role="alert">{error}</p>;
  if (!patient || !record) return <Spinner />;

  const info = patient.patients ?? {};
  const patientInfo = record.patients ?? {};
  const alerts = Object.entries(ALERT_LABELS).filter(([key]) => patientInfo[key]);

  // patient.appointments is ordered most-recent-first (see AdminService.getPatient) —
  // prefer a scheduled one (what's actually being seen today) over a past one.
  const appts = patient.appointments ?? [];
  const relevantAppt = appts.find((a) => a.status === 'SCHEDULED' || a.status === 'IN_PROGRESS') ?? appts[0];
  const defaultTreatment = relevantAppt?.service?.name ?? '';

  return (
    <div>
      <Link to={fromLookup ? '/lookup' : '/patients'} className="back-link">
        &larr; {fromLookup ? 'Patient Lookup' : 'Patients'}
      </Link>
      <div className="admin-page__header">
        <h1 className="admin-page__title">{patient.full_name}</h1>
        <span className="status-badge status-badge--warning" style={{ fontSize: '0.85rem' }}>
          Outstanding: {formatMoney(record.outstandingBalance)}
        </span>
      </div>

      {alerts.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {alerts.map(([key, label]) => (
            <span key={key} className="status-badge status-badge--warning">{label}</span>
          ))}
        </div>
      )}

      <div className="chart-grid" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3 className="chart-card__title">Contact</h3>
          <p>{patient.email || 'No email on file'}</p>
          <p>{patient.phone || 'No phone on file'}</p>
          <p>{info.address ? `${info.address}, ${info.city ?? ''}` : 'No address on file'}</p>
        </div>
        <div className="card">
          <h3 className="chart-card__title">Emergency contact</h3>
          <p>{info.emergency_contact_name || '—'}</p>
          <p>{info.emergency_contact_phone || '—'}</p>
          <h3 className="chart-card__title" style={{ marginTop: 16 }}>Insurance</h3>
          <p>{info.insurance_provider ? `${info.insurance_provider} (${info.insurance_id ?? '—'})` : 'None on file'}</p>
        </div>
      </div>

      <h2 className="admin-page__title" style={{ fontSize: '1.05rem', marginBottom: 12 }}>
        Log a visit
      </h2>
      <div className="card" style={{ marginBottom: 28 }}>
        <VisitForm patientId={id} defaultTreatment={defaultTreatment} onLogged={loadRecord} />
      </div>

      <h2 className="admin-page__title" style={{ fontSize: '1.05rem', marginBottom: 12 }}>
        Visit history
      </h2>
      {record.visits.length === 0 ? (
        <p className="empty-state">No visits logged yet.</p>
      ) : (
        <div className="card" style={{ marginBottom: 28 }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Treatment</th>
                <th>Notes</th>
                <th>Follow-up</th>
                <th>Charged</th>
              </tr>
            </thead>
            <tbody>
              {record.visits.map((v) => (
                <tr key={v.id}>
                  <td>{v.visit_date}</td>
                  <td>{v.treatment}</td>
                  <td>{v.clinical_notes || '—'}</td>
                  <td>{v.follow_up_date || '—'}</td>
                  <td>{v.amount_charged ? formatMoney(v.amount_charged) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="admin-page__title" style={{ fontSize: '1.05rem', marginBottom: 12 }}>
        Appointment history
      </h2>
      {patient.appointments.length === 0 ? (
        <p className="empty-state">No appointments yet.</p>
      ) : (
        <div className="card" style={{ marginBottom: 28 }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Service</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {patient.appointments.map((a) => (
                <tr key={a.id}>
                  <td>{a.appointment_date}</td>
                  <td>{a.start_time}</td>
                  <td>{a.service?.name ?? '—'}</td>
                  <td><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="admin-page__title" style={{ fontSize: '1.05rem', marginBottom: 12 }}>
        X-rays &amp; files
      </h2>
      <div className="card" style={{ marginBottom: 28 }}>
        <FileUploadForm patientId={id} onUploaded={loadRecord} />
        {record.files.length > 0 && (
          <ul style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {record.files.map((f) => (
              <li key={f.id}>
                <a href={f.url} target="_blank" rel="noopener noreferrer">{f.file_name}</a>
                <span style={{ color: 'var(--admin-text-light)', fontSize: '0.8rem', marginLeft: 8 }}>
                  {new Date(f.created_at).toLocaleDateString('en-IN')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2 className="admin-page__title" style={{ fontSize: '1.05rem', marginBottom: 12 }}>
        Invoices &amp; receipts
      </h2>
      <div className="card" style={{ marginBottom: 28 }}>
        <InvoiceForm patientId={id} onCreated={loadRecord} />
        {record.invoices.length > 0 && (
          <table style={{ marginTop: 20 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {record.invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>{new Date(inv.created_at).toLocaleDateString('en-IN')}</td>
                  <td>{formatMoney(inv.amount)}</td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td>{inv.storage_path ? <span style={{ color: 'var(--admin-text-light)' }}>PDF generated</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
