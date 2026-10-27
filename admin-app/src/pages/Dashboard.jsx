import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import Spinner from '../components/Spinner.jsx';
import { useRealtimeTables } from '../lib/useRealtimeTables.js';
import {
  Calendar,
  CalendarDays,
  Clock,
  UserPlus,
  Users,
  IndianRupee,
  Plus,
  RefreshCw,
  ArrowRight,
  Download,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Activity,
  Sparkles,
} from 'lucide-react';

const LIVE_TABLES = ['appointments', 'payments', 'visit_logs', 'invoices'];

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

// Indian financial year (Apr–Mar), derived from the real clock
function currentFinancialYear() {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `FY ${startYear}–${String((startYear + 1) % 100).padStart(2, '0')}`;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(() => {
    setRefreshing(true);
    apiFetch('/admin/dashboard')
      .then((data) => {
        setStats(data);
        setLive(true);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(load, [load]);
  useRealtimeTables(LIVE_TABLES, load);

  async function handleExportPayments() {
    setExporting(true);
    try {
      const csv = await apiFetch('/admin/payments/export');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  if (error) {
    return (
      <div className="analytics-error-card">
        <AlertCircle size={24} className="text-amber-500" />
        <div>
          <h3>Unable to load dashboard</h3>
          <p>{error}</p>
        </div>
        <button type="button" onClick={load} className="btn secondary">
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="analytics-loading-wrap">
        <Spinner label="Loading clinical dashboard…" />
      </div>
    );
  }

  const totalPatients = (stats.patientsVisited || 0) + (stats.patientsInTreatment || 0);
  const visitedPct = totalPatients > 0 ? Math.round((stats.patientsVisited / totalPatients) * 100) : 50;
  const inTreatmentPct = totalPatients > 0 ? 100 - visitedPct : 50;

  const totalRevenue = (stats.paymentsCompletedAmount || 0) + (stats.paymentsPendingAmount || 0);
  const compAmtPct = totalRevenue > 0 ? Math.round((stats.paymentsCompletedAmount / totalRevenue) * 100) : 0;
  const pendAmtPct = totalRevenue > 0 ? 100 - compAmtPct : 0;

  const totalTransactions = (stats.paymentsCompletedCount || 0) + (stats.paymentsPendingCount || 0);

  return (
    <div className="analytics-view dashboard-view">
      {/* Header Banner */}
      <header className="analytics-header">
        <div className="analytics-header__info">
          <div className="analytics-header__badge">
            <span className="live-indicator__dot" aria-hidden="true" />
            <span>CLINIC ROSTER • LIVE</span>
          </div>
          <h1 className="analytics-header__title">Clinical Workspace &amp; Roster</h1>
          <p className="analytics-header__subtitle">
            Real-time daily roster, treatment pipelines, and revenue intake overview.
          </p>
        </div>

        <div className="analytics-header__actions">
          <button
            type="button"
            className="btn btn-primary dash-action-primary"
            onClick={() => navigate('/appointments?new=1')}
          >
            <Plus size={16} />
            <span>New Booking</span>
          </button>
          <button
            type="button"
            className="analytics-refresh-btn"
            onClick={load}
            disabled={refreshing}
            title="Refresh dashboard"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Syncing…' : 'Sync'}</span>
          </button>
        </div>
      </header>

      {/* Top 4 KPI Metric Cards */}
      <div className="analytics-kpi-grid">
        {/* KPI 1: Appointments Today */}
        <div className="kpi-card kpi-card--today">
          <div className="kpi-card__top">
            <div className="kpi-card__icon kpi-card__icon--emerald">
              <Calendar size={20} />
            </div>
            <span className="kpi-card__tag">Today's Roster</span>
          </div>
          <div className="kpi-card__body">
            <span className="kpi-card__value">{stats.appointmentsToday}</span>
            <div className="kpi-card__footer">
              <span className="kpi-card__sublabel">Consultations scheduled today</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Upcoming (7 Days) */}
        <div className="kpi-card kpi-card--upcoming">
          <div className="kpi-card__top">
            <div className="kpi-card__icon kpi-card__icon--blue">
              <CalendarDays size={20} />
            </div>
            <span className="kpi-card__tag">Next 7 Days</span>
          </div>
          <div className="kpi-card__body">
            <span className="kpi-card__value">{stats.appointmentsUpcoming}</span>
            <div className="kpi-card__footer">
              <span className="kpi-card__sublabel">Confirmed appointments in queue</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Available Slots */}
        <div className="kpi-card kpi-card--slots">
          <div className="kpi-card__top">
            <div className="kpi-card__icon kpi-card__icon--amber">
              <Clock size={20} />
            </div>
            <span className="kpi-card__tag">Capacity</span>
          </div>
          <div className="kpi-card__body">
            <span className="kpi-card__value">{stats.availableSlots}</span>
            <div className="kpi-card__footer">
              <span className="kpi-card__sublabel">Open slots from today onward</span>
            </div>
          </div>
        </div>

        {/* KPI 4: New Patients This Week */}
        <div className="kpi-card kpi-card--newpatients">
          <div className="kpi-card__top">
            <div className="kpi-card__icon kpi-card__icon--purple">
              <UserPlus size={20} />
            </div>
            <span className="kpi-card__tag">This Week</span>
          </div>
          <div className="kpi-card__body">
            <span className="kpi-card__value">{stats.newPatientsThisWeek}</span>
            <div className="kpi-card__footer">
              <span className="kpi-card__sublabel">Newly registered patient profiles</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="analytics-main-grid">
        {/* Card 1: Patient Clinical Pipeline */}
        <div className="analytics-chart-card">
          <div className="analytics-chart-card__header">
            <div>
              <div className="analytics-chart-card__badge">
                <Users size={15} />
                <span>PATIENT REGISTRY</span>
              </div>
              <h2 className="analytics-chart-card__title">Clinical Pipeline</h2>
              <p className="analytics-chart-card__subtitle">Active treatment distribution across all patients</p>
            </div>
            <button
              type="button"
              className="dash-link-btn"
              onClick={() => navigate('/patients')}
            >
              <span>View Registry</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="dash-pipeline-content">
            {/* Split Progress Track */}
            <div className="dash-split-track" role="progressbar" aria-label="Patient pipeline breakdown">
              <div
                className="dash-split-track__seg dash-split-track__seg--visited"
                style={{ width: `${visitedPct}%` }}
                title={`Visited: ${stats.patientsVisited} (${visitedPct}%)`}
              />
              <div
                className="dash-split-track__seg dash-split-track__seg--treatment"
                style={{ width: `${inTreatmentPct}%` }}
                title={`In Treatment: ${stats.patientsInTreatment} (${inTreatmentPct}%)`}
              />
            </div>

            {/* Metric Boxes */}
            <div className="dash-breakdown-grid">
              <div className="dash-metric-box dash-metric-box--visited">
                <div className="dash-metric-box__top">
                  <span className="dash-metric-box__dot dash-metric-box__dot--blue" />
                  <span className="dash-metric-box__title">Treatment Complete</span>
                </div>
                <div className="dash-metric-box__val-wrap">
                  <span className="dash-metric-box__num">{stats.patientsVisited}</span>
                  <span className="dash-metric-box__pct">{visitedPct}%</span>
                </div>
                <span className="dash-metric-box__note">Fully discharged or completed</span>
              </div>

              <div className="dash-metric-box dash-metric-box--treatment">
                <div className="dash-metric-box__top">
                  <span className="dash-metric-box__dot dash-metric-box__dot--amber" />
                  <span className="dash-metric-box__title">Active in Treatment</span>
                </div>
                <div className="dash-metric-box__val-wrap">
                  <span className="dash-metric-box__num">{stats.patientsInTreatment}</span>
                  <span className="dash-metric-box__pct">{inTreatmentPct}%</span>
                </div>
                <span className="dash-metric-box__note">Ongoing care or planned visits</span>
              </div>
            </div>
          </div>

          <div className="analytics-chart-card__footer">
            <span className="dash-footer-label">
              Total Active Portfolio: <strong>{totalPatients} Patients</strong>
            </span>
          </div>
        </div>

        {/* Card 2: Financial Collections & Billing */}
        <div className="analytics-chart-card">
          <div className="analytics-chart-card__header">
            <div>
              <div className="analytics-chart-card__badge analytics-chart-card__badge--purple">
                <IndianRupee size={15} />
                <span>FINANCIAL INTAKE</span>
              </div>
              <h2 className="analytics-chart-card__title">Billing &amp; Collections</h2>
              <p className="analytics-chart-card__subtitle">Summary of completed vs pending invoice balances</p>
            </div>
            <button
              type="button"
              className="dash-link-btn"
              onClick={() => navigate('/payments')}
            >
              <span>Payments</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="dash-pipeline-content">
            {/* Split Progress Track */}
            <div className="dash-split-track" role="progressbar" aria-label="Payment collection breakdown">
              <div
                className="dash-split-track__seg dash-split-track__seg--completed"
                style={{ width: `${compAmtPct}%` }}
                title={`Completed: ${formatINR(stats.paymentsCompletedAmount)} (${compAmtPct}%)`}
              />
              <div
                className="dash-split-track__seg dash-split-track__seg--pending"
                style={{ width: `${pendAmtPct}%` }}
                title={`Pending: ${formatINR(stats.paymentsPendingAmount)} (${pendAmtPct}%)`}
              />
            </div>

            {/* Metric Boxes */}
            <div className="dash-breakdown-grid">
              <div className="dash-metric-box dash-metric-box--completed">
                <div className="dash-metric-box__top">
                  <span className="dash-metric-box__dot dash-metric-box__dot--emerald" />
                  <span className="dash-metric-box__title">Settled / Collected</span>
                </div>
                <div className="dash-metric-box__val-wrap">
                  <span className="dash-metric-box__num">{formatINR(stats.paymentsCompletedAmount)}</span>
                </div>
                <span className="dash-metric-box__note">Cleared billing receipts</span>
              </div>

              <div className="dash-metric-box dash-metric-box--pending">
                <div className="dash-metric-box__top">
                  <span className="dash-metric-box__dot dash-metric-box__dot--rose" />
                  <span className="dash-metric-box__title">Pending Invoices</span>
                </div>
                <div className="dash-metric-box__val-wrap">
                  <span className="dash-metric-box__num">{formatINR(stats.paymentsPendingAmount)}</span>
                </div>
                <span className="dash-metric-box__note">Awaiting patient payment</span>
              </div>
            </div>
          </div>

          <div className="analytics-chart-card__footer">
            <span className="dash-footer-label">
              Total Invoiced: <strong>{formatINR(totalRevenue)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Card: Transaction Activity & Reporting */}
      <div className="analytics-chart-card dash-transaction-card">
        <div className="analytics-chart-card__header">
          <div>
            <div className="analytics-chart-card__badge">
              <FileSpreadsheet size={15} />
              <span>TRANSACTION AUDIT</span>
            </div>
            <h2 className="analytics-chart-card__title">Billing Index &amp; Audit Logs</h2>
            <p className="analytics-chart-card__subtitle">
              Transaction log indices categorized by billing confirmation for {currentFinancialYear()}
            </p>
          </div>
          <span className="analytics-stat-pill">{currentFinancialYear()}</span>
        </div>

        <div className="dash-audit-grid">
          <div className="dash-audit-stat">
            <div className="dash-audit-stat__icon dash-audit-stat__icon--emerald">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <span className="dash-audit-stat__label">Completed Transactions</span>
              <span className="dash-audit-stat__num">{stats.paymentsCompletedCount}</span>
            </div>
          </div>

          <div className="dash-audit-stat">
            <div className="dash-audit-stat__icon dash-audit-stat__icon--amber">
              <Clock size={18} />
            </div>
            <div>
              <span className="dash-audit-stat__label">Pending Transactions</span>
              <span className="dash-audit-stat__num">{stats.paymentsPendingCount}</span>
            </div>
          </div>

          <div className="dash-audit-stat">
            <div className="dash-audit-stat__icon dash-audit-stat__icon--blue">
              <Activity size={18} />
            </div>
            <div>
              <span className="dash-audit-stat__label">Total Recorded Activity</span>
              <span className="dash-audit-stat__num">{totalTransactions}</span>
            </div>
          </div>
        </div>

        <div className="analytics-chart-card__footer dash-transaction-footer">
          <span className="dash-footer-label">
            Audit-ready logging with real-time Supabase replication.
          </span>
          <button
            type="button"
            className="dash-export-btn"
            onClick={handleExportPayments}
            disabled={exporting}
          >
            <Download size={14} className={exporting ? 'animate-bounce' : ''} />
            <span>{exporting ? 'Exporting…' : 'Export Payments CSV'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
