import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { useRealtimeTables } from '../lib/useRealtimeTables.js';
import Spinner from '../components/Spinner.jsx';
import {
  TrendingUp,
  IndianRupee,
  CalendarCheck,
  UserX,
  Activity,
  BarChart3,
  PieChart,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

const LIVE_TABLES = ['payments', 'appointments'];
const MONTH_LABEL = new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' });

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

function monthLabel(isoMonth) {
  if (!isoMonth) return '';
  const [year, month] = isoMonth.split('-').map(Number);
  return MONTH_LABEL.format(new Date(Date.UTC(year, month - 1, 1)));
}

const PALETTE = [
  { bg: '#0d9488', light: 'rgba(13, 148, 136, 0.12)', text: '#0f766e', border: '#14b8a6' },
  { bg: '#3b82f6', light: 'rgba(59, 130, 246, 0.12)', text: '#1d4ed8', border: '#60a5fa' },
  { bg: '#f59e0b', light: 'rgba(245, 158, 11, 0.12)', text: '#b45309', border: '#fbbf24' },
  { bg: '#8b5cf6', light: 'rgba(139, 92, 246, 0.12)', text: '#6d28d9', border: '#a78bfa' },
  { bg: '#ec4899', light: 'rgba(236, 72, 153, 0.12)', text: '#be185d', border: '#f472b6' },
  { bg: '#10b981', light: 'rgba(16, 185, 129, 0.12)', text: '#047857', border: '#34d399' },
];

export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setRefreshing(true);
    apiFetch('/admin/analytics')
      .then((res) => {
        setData(res);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(load, [load]);
  useRealtimeTables(LIVE_TABLES, load);

  if (error) {
    return (
      <div className="analytics-error-card">
        <AlertTriangle size={24} className="text-amber-500" />
        <div>
          <h3>Unable to load analytics</h3>
          <p>{error}</p>
        </div>
        <button type="button" onClick={load} className="btn secondary">
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="analytics-loading-wrap">
        <Spinner label="Crunching clinic metrics & intelligence…" />
      </div>
    );
  }

  const {
    revenueByMonth = [],
    treatmentBreakdown = [],
    noShowRate = 0,
    noShowCount = 0,
    resolvedTotal = 0,
  } = data;

  const totalRevenue = revenueByMonth.reduce((sum, d) => sum + (Number(d.revenue) || 0), 0);
  const avgMonthlyRevenue = revenueByMonth.length > 0 ? Math.round(totalRevenue / revenueByMonth.length) : 0;
  const maxRevenueMonth = Math.max(1, ...revenueByMonth.map((d) => Number(d.revenue) || 0));

  const completedCount = Math.max(0, resolvedTotal - noShowCount);
  const completionRate = resolvedTotal > 0 ? Math.round((completedCount / resolvedTotal) * 100) : 100;
  const noShowPct = Math.round(noShowRate * 100);

  const totalTreatments = treatmentBreakdown.reduce((sum, d) => sum + (d.count || 0), 0);
  const topTreatment = treatmentBreakdown.length > 0
    ? [...treatmentBreakdown].sort((a, b) => b.count - a.count)[0]
    : null;

  return (
    <div className="analytics-view">
      {/* Header Banner */}
      <header className="analytics-header">
        <div className="analytics-header__info">
          <div className="analytics-header__badge">
            <Sparkles size={13} className="text-teal-600" />
            <span>EXECUTIVE INTELLIGENCE</span>
          </div>
          <h1 className="analytics-header__title">Clinic Performance &amp; Analytics</h1>
          <p className="analytics-header__subtitle">
            Real-time operational tracking, revenue trends, and patient treatment distributions.
          </p>
        </div>

        <div className="analytics-header__actions">
          <button
            type="button"
            className="analytics-refresh-btn"
            onClick={load}
            disabled={refreshing}
            title="Refresh analytics data"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing…' : 'Sync Data'}</span>
          </button>
        </div>
      </header>

      {/* Top 4 KPI Metric Cards */}
      <div className="analytics-kpi-grid">
        {/* KPI 1: Total Revenue */}
        <div className="kpi-card kpi-card--revenue">
          <div className="kpi-card__top">
            <div className="kpi-card__icon kpi-card__icon--emerald">
              <IndianRupee size={20} />
            </div>
            <span className="kpi-card__tag">6-Month Total</span>
          </div>
          <div className="kpi-card__body">
            <span className="kpi-card__value">{formatINR(totalRevenue)}</span>
            <div className="kpi-card__footer">
              <span className="kpi-card__sublabel">Avg {formatINR(avgMonthlyRevenue)} / month</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Resolved Consultations */}
        <div className="kpi-card kpi-card--consultations">
          <div className="kpi-card__top">
            <div className="kpi-card__icon kpi-card__icon--blue">
              <CalendarCheck size={20} />
            </div>
            <span className="kpi-card__tag">{completionRate}% Completed</span>
          </div>
          <div className="kpi-card__body">
            <span className="kpi-card__value">{resolvedTotal} Cases</span>
            <div className="kpi-card__footer">
              <span className="kpi-card__sublabel">{completedCount} attended successfully</span>
            </div>
          </div>
        </div>

        {/* KPI 3: No-Show Rate */}
        <div className="kpi-card kpi-card--noshow">
          <div className="kpi-card__top">
            <div className={`kpi-card__icon ${noShowPct > 20 ? 'kpi-card__icon--amber' : 'kpi-card__icon--teal'}`}>
              <UserX size={20} />
            </div>
            <span className={`kpi-badge ${noShowPct > 20 ? 'kpi-badge--warning' : 'kpi-badge--good'}`}>
              {noShowPct > 20 ? 'Needs Attention' : 'Optimal'}
            </span>
          </div>
          <div className="kpi-card__body">
            <span className="kpi-card__value">{noShowPct}%</span>
            <div className="kpi-card__footer">
              <span className="kpi-card__sublabel">{noShowCount} of {resolvedTotal} resolved appointments</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Top Treatment */}
        <div className="kpi-card kpi-card--treatment">
          <div className="kpi-card__top">
            <div className="kpi-card__icon kpi-card__icon--purple">
              <Activity size={20} />
            </div>
            <span className="kpi-card__tag">Top Treatment</span>
          </div>
          <div className="kpi-card__body">
            <span className="kpi-card__value kpi-card__value--text">
              {topTreatment ? topTreatment.name : 'No Treatments'}
            </span>
            <div className="kpi-card__footer">
              <span className="kpi-card__sublabel">
                {topTreatment
                  ? `${topTreatment.count} appointments (${Math.round((topTreatment.count / totalTreatments) * 100)}% share)`
                  : 'Awaiting appointments'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Visuals Grid */}
      <div className="analytics-main-grid">
        {/* Revenue Trend Chart Card */}
        <div className="analytics-chart-card">
          <div className="analytics-chart-card__header">
            <div>
              <div className="analytics-chart-card__badge">
                <BarChart3 size={15} />
                <span>FINANCIAL VELOCITY</span>
              </div>
              <h2 className="analytics-chart-card__title">Revenue Trajectory</h2>
              <p className="analytics-chart-card__subtitle">Monthly clinical collections across the last 6 months</p>
            </div>
            <span className="analytics-stat-pill">{formatINR(totalRevenue)} Recorded</span>
          </div>

          <div className="analytics-revenue-stage">
            <div className="analytics-bars-container">
              {revenueByMonth.map((d) => {
                const val = Number(d.revenue) || 0;
                const pct = maxRevenueMonth > 0 ? (val / maxRevenueMonth) * 100 : 0;
                const isZero = val === 0;

                return (
                  <div key={d.month} className="analytics-bar-col">
                    <div className="analytics-bar-track">
                      <div
                        className={`analytics-bar-fill ${isZero ? 'analytics-bar-fill--zero' : ''}`}
                        style={{ height: `${Math.max(6, pct)}%` }}
                      >
                        <span className="analytics-bar-tooltip">{formatINR(val)}</span>
                      </div>
                    </div>
                    <span className="analytics-bar-value">{formatINR(val)}</span>
                    <span className="analytics-bar-month">{monthLabel(d.month)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="analytics-chart-card__footer">
            <div className="analytics-metric-stat">
              <span className="analytics-metric-stat__lbl">6-Month Average</span>
              <span className="analytics-metric-stat__val">{formatINR(avgMonthlyRevenue)} / mo</span>
            </div>
            <div className="analytics-metric-stat">
              <span className="analytics-metric-stat__lbl">Peak Month Volume</span>
              <span className="analytics-metric-stat__val">{formatINR(maxRevenueMonth > 1 ? maxRevenueMonth : 0)}</span>
            </div>
          </div>
        </div>

        {/* Treatment-type Breakdown Card */}
        <div className="analytics-chart-card">
          <div className="analytics-chart-card__header">
            <div>
              <div className="analytics-chart-card__badge analytics-chart-card__badge--purple">
                <PieChart size={15} />
                <span>CLINICAL CASE MIX</span>
              </div>
              <h2 className="analytics-chart-card__title">Treatment Distribution</h2>
              <p className="analytics-chart-card__subtitle">Breakdown of patient procedures performed</p>
            </div>
            <span className="analytics-stat-pill">{totalTreatments} Total Procedures</span>
          </div>

          {totalTreatments === 0 ? (
            <div className="analytics-empty-state">
              <Activity size={32} className="text-slate-400" />
              <p>No completed procedures recorded yet.</p>
            </div>
          ) : (
            <div className="analytics-treatments-content">
              {/* Multi-color segment progress bar */}
              <div className="analytics-segment-bar" role="progressbar" aria-label="Treatment breakdown">
                {treatmentBreakdown.map((t, idx) => {
                  const share = totalTreatments > 0 ? (t.count / totalTreatments) * 100 : 0;
                  const color = PALETTE[idx % PALETTE.length];
                  return (
                    <div
                      key={t.name}
                      className="analytics-segment-bar__slice"
                      style={{ width: `${share}%`, background: color.bg }}
                      title={`${t.name}: ${t.count} (${Math.round(share)}%)`}
                    />
                  );
                })}
              </div>

              {/* Ranked Treatment List */}
              <div className="analytics-treatment-list">
                {treatmentBreakdown.map((t, idx) => {
                  const share = totalTreatments > 0 ? Math.round((t.count / totalTreatments) * 100) : 0;
                  const color = PALETTE[idx % PALETTE.length];
                  return (
                    <div key={t.name} className="analytics-treatment-row">
                      <div className="analytics-treatment-row__left">
                        <span className="analytics-treatment-rank" style={{ background: color.light, color: color.text }}>
                          #{idx + 1}
                        </span>
                        <div className="analytics-treatment-details">
                          <span className="analytics-treatment-name">{t.name}</span>
                          <div className="analytics-progress-mini">
                            <div
                              className="analytics-progress-mini__fill"
                              style={{ width: `${share}%`, background: color.bg }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="analytics-treatment-row__right">
                        <span className="analytics-treatment-count">{t.count} cases</span>
                        <span className="analytics-treatment-badge" style={{ background: color.light, color: color.text }}>
                          {share}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Operational Reliability & Attendance Summary */}
      <div className="analytics-insights-card">
        <div className="analytics-insights-card__item">
          <div className="analytics-insights-card__icon-wrap analytics-insights-card__icon-wrap--emerald">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h4 className="analytics-insights-card__heading">Patient Attendance Reliability</h4>
            <p className="analytics-insights-card__desc">
              <strong>{completionRate}%</strong> of scheduled consultations completed without cancellation or no-show.
            </p>
          </div>
        </div>

        <div className="analytics-insights-card__divider" />

        <div className="analytics-insights-card__item">
          <div className="analytics-insights-card__icon-wrap analytics-insights-card__icon-wrap--blue">
            <ArrowUpRight size={20} />
          </div>
          <div>
            <h4 className="analytics-insights-card__heading">Operational Efficiency</h4>
            <p className="analytics-insights-card__desc">
              All clinical records and treatment analytics sync in real-time with zero manual reconciliation required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
