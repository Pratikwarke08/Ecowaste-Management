import { useEffect, useMemo, useState } from 'react';

type Notice = {
  type: 'success' | 'error';
  text: string;
} | null;

type DustbinOption = {
  _id: string;
  name: string;
  sector?: string;
  type?: string;
  coordinates?: { lat: number; lng: number };
  status?: string;
};

type RequestStage = 'before_pending' | 'waiting_main_disposal' | 'after_pending' | 'completed';
type StageFilter = RequestStage | 'all';

type DashboardDustbin = {
  dustbinId: string;
  name: string;
  sector?: string;
  type?: string;
  status?: string;
  coordinates?: { lat: number; lng: number };
  counts: {
    total: number;
    before_pending: number;
    waiting_main_disposal: number;
    after_pending: number;
    completed: number;
  };
};

type DashboardRequest = {
  reportId: string;
  dustbinId: string;
  collectorEmail: string;
  status: string;
  stage: RequestStage;
  submittedAt?: string | null;
  verifiedAt?: string | null;
  points?: number;
  beforeSubmittedAt?: string | null;
  afterSubmittedAt?: string | null;
  mainDisposalSubmitted?: boolean;
};

type DashboardResponse = {
  dustbinFilter?: string | null;
  totalRequests: number;
  dustbins: DashboardDustbin[];
  requests: DashboardRequest[];
};

type ReportContext = {
  reportId: string;
  status: string;
  collectorEmail?: string;
  submittedAt?: string;
  pickupImageBase64?: string;
  pickupLocation?: { lat: number; lng: number };
  disposalLocation?: { lat: number; lng: number };
  points?: number;
  dustbinId?: string;
  dustbin?: DustbinOption;
  dustbinSignals?: {
    beforeImageBase64?: string;
    afterImageBase64?: string;
    weightBeforeKg?: number;
    weightAfterKg?: number;
    depthBefore?: number;
    depthAfter?: number;
    depthUnit?: 'meter' | 'percent';
    mainDisposalSubmitted?: boolean;
    beforeSubmittedAt?: string;
    afterSubmittedAt?: string;
  };
};

type TempPickupContext = {
  tempPickupId: string;
  status: 'active' | 'converted' | 'expired';
  collectorEmail?: string;
  createdAt?: string;
  expiresAt?: string;
  linkedReportId?: string | null;
  pickupImageBase64?: string;
  pickupLocation?: { lat: number; lng: number };
};

type SyncStage = 'before' | 'after';

const API_BASE = import.meta.env.PROD ? `${import.meta.env.VITE_API_URL}/api` : '/api';
const VIRTUAL_DUSTBIN_KEY = import.meta.env.VITE_VIRTUAL_DUSTBIN_KEY;

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).replace(/^data:image\/\w+;base64,/, ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(VIRTUAL_DUSTBIN_KEY ? { 'x-virtual-dustbin-key': VIRTUAL_DUSTBIN_KEY } : {})
  };
}

function toNum(value: string): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function stageLabel(stage: RequestStage) {
  if (stage === 'before_pending') return 'Before Pending';
  if (stage === 'waiting_main_disposal') return 'Waiting Main Disposal';
  if (stage === 'after_pending') return 'After Pending';
  return 'Completed';
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
}

function buildErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

async function parseJsonOrEmpty(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export default function App() {
  const queryParams = new URLSearchParams(window.location.search);
  const reportIdFromQuery = queryParams.get('reportId')?.trim() || '';
  const tempPickupIdFromQuery = queryParams.get('tempPickupId')?.trim() || '';
  const dustbinIdFromQuery = queryParams.get('dustbinId')?.trim() || '';

  const [reportId, setReportId] = useState(reportIdFromQuery);
  const [tempPickupId, setTempPickupId] = useState(tempPickupIdFromQuery);
  const [context, setContext] = useState<ReportContext | null>(null);
  const [tempContext, setTempContext] = useState<TempPickupContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);

  const [dustbins, setDustbins] = useState<DustbinOption[]>([]);
  const [selectedDustbinId, setSelectedDustbinId] = useState(dustbinIdFromQuery);

  const [dashboardDustbinFilter, setDashboardDustbinFilter] = useState(dustbinIdFromQuery);
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [searchText, setSearchText] = useState('');
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [lastDashboardSyncAt, setLastDashboardSyncAt] = useState('');

  const [isFinalizing, setIsFinalizing] = useState(false);
  const [beforeImage, setBeforeImage] = useState<File | null>(null);
  const [afterImage, setAfterImage] = useState<File | null>(null);
  const [weightBeforeKg, setWeightBeforeKg] = useState('');
  const [weightAfterKg, setWeightAfterKg] = useState('');
  const [depthBefore, setDepthBefore] = useState('');
  const [depthAfter, setDepthAfter] = useState('');
  const [depthUnit, setDepthUnit] = useState<'meter' | 'percent'>('meter');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastBeforeSyncAt, setLastBeforeSyncAt] = useState('');
  const [lastAfterSyncAt, setLastAfterSyncAt] = useState('');
  const [notice, setNotice] = useState<Notice>(null);

  const beforePreview = useMemo(() => (beforeImage ? URL.createObjectURL(beforeImage) : ''), [beforeImage]);
  const afterPreview = useMemo(() => (afterImage ? URL.createObjectURL(afterImage) : ''), [afterImage]);

  useEffect(() => {
    return () => {
      if (beforePreview) URL.revokeObjectURL(beforePreview);
      if (afterPreview) URL.revokeObjectURL(afterPreview);
    };
  }, [beforePreview, afterPreview]);

  const loadDustbins = async () => {
    const response = await fetch(`${API_BASE}/reports/virtual-dustbin/dustbins`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    const data = await parseJsonOrEmpty(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to load dustbins.');
    }
    setDustbins(Array.isArray(data?.dustbins) ? data.dustbins : []);
  };

  const loadDashboard = async (dustbinFilter = dashboardDustbinFilter) => {
    setLoadingDashboard(true);
    try {
      const q = dustbinFilter ? `?dustbinId=${encodeURIComponent(dustbinFilter)}` : '';
      const response = await fetch(`${API_BASE}/reports/virtual-dustbin/dashboard${q}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      const data = await parseJsonOrEmpty(response);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load dashboard.');
      }
      setDashboard(data as DashboardResponse);
      setLastDashboardSyncAt(new Date().toLocaleTimeString());
    } finally {
      setLoadingDashboard(false);
    }
  };

  const hydrateWorkspaceFromContext = (data: ReportContext) => {
    setContext(data);
    setTempContext(null);
    setReportId(data.reportId);

    if (typeof data?.dustbinId === 'string') {
      setSelectedDustbinId(data.dustbinId);
    }

    setWeightBeforeKg(String(data?.dustbinSignals?.weightBeforeKg ?? ''));
    setWeightAfterKg(String(data?.dustbinSignals?.weightAfterKg ?? ''));
    setDepthBefore(String(data?.dustbinSignals?.depthBefore ?? ''));
    setDepthAfter(String(data?.dustbinSignals?.depthAfter ?? ''));
    setDepthUnit(data?.dustbinSignals?.depthUnit === 'percent' ? 'percent' : 'meter');
  };

  const loadReportContext = async (id: string) => {
    const response = await fetch(`${API_BASE}/reports/${id}/virtual-dustbin/context`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    const data = await parseJsonOrEmpty(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to load report context.');
    }
    hydrateWorkspaceFromContext(data as ReportContext);
  };

  const loadTempContext = async (id: string) => {
    const response = await fetch(`${API_BASE}/reports/pickup-temp/${id}/virtual-dustbin/context`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    const data = await parseJsonOrEmpty(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to load temporary pickup context.');
    }

    setTempContext(data as TempPickupContext);
    setContext(null);
    setTempPickupId((data as TempPickupContext).tempPickupId);
    if ((data as TempPickupContext).linkedReportId) {
      await loadReportContext(String((data as TempPickupContext).linkedReportId));
    }
  };

  const reloadContext = async () => {
    if (!reportId && !tempPickupId) {
      setNotice({ type: 'error', text: 'Provide report ID or temporary pickup ID first.' });
      return;
    }
    setLoadingContext(true);
    try {
      if (reportId) {
        await loadReportContext(reportId);
      } else if (tempPickupId) {
        await loadTempContext(tempPickupId);
      }
      setNotice(null);
    } finally {
      setLoadingContext(false);
    }
  };

  useEffect(() => {
    const boot = async () => {
      try {
        setNotice(null);
        await loadDustbins();
        await loadDashboard(dashboardDustbinFilter);

        if (reportIdFromQuery) {
          await loadReportContext(reportIdFromQuery);
        } else if (tempPickupIdFromQuery) {
          await loadTempContext(tempPickupIdFromQuery);
        }
      } catch (err) {
        setNotice({ type: 'error', text: buildErrorMessage(err, 'Failed to initialize dashboard.') });
      }
    };
    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadDashboard();
    }, 15000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardDustbinFilter]);

  useEffect(() => {
    void loadDashboard(dashboardDustbinFilter).catch((err) => {
      setNotice({ type: 'error', text: buildErrorMessage(err, 'Failed to refresh dashboard.') });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardDustbinFilter]);

  const finalizeTempPickup = async () => {
    if (!tempPickupId) {
      setNotice({ type: 'error', text: 'Missing temporary pickup ID.' });
      return;
    }
    if (!selectedDustbinId) {
      setNotice({ type: 'error', text: 'Select a dustbin first.' });
      return;
    }

    try {
      setNotice(null);
      setIsFinalizing(true);

      const selectedDustbin = dustbins.find((d) => d._id === selectedDustbinId);
      const response = await fetch(`${API_BASE}/reports/pickup-temp/${tempPickupId}/finalize`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          dustbinId: selectedDustbinId,
          disposalLocation: selectedDustbin?.coordinates
        })
      });

      const data = await parseJsonOrEmpty(response);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to convert temporary pickup into a report.');
      }

      const newReportId = String(data.reportId);
      await loadReportContext(newReportId);
      await loadDashboard(selectedDustbinId);
      setDashboardDustbinFilter(selectedDustbinId);
      setNotice({ type: 'success', text: `Request linked successfully. Report ID: ${newReportId}` });
    } catch (err) {
      setNotice({ type: 'error', text: buildErrorMessage(err, 'Failed to link temporary pickup.') });
    } finally {
      setIsFinalizing(false);
    }
  };

  const syncSignals = async (stage: SyncStage) => {
    if (!reportId.trim()) {
      setNotice({ type: 'error', text: 'Select or enter a report first.' });
      return;
    }

    try {
      setNotice(null);
      setIsSubmitting(true);

      const body: Record<string, unknown> = { depthUnit };
      if (stage === 'before') {
        if (beforeImage) body.beforeImageBase64 = await fileToBase64(beforeImage);

        const wb = toNum(weightBeforeKg);
        const db = toNum(depthBefore);
        if (wb !== undefined) body.weightBeforeKg = wb;
        if (db !== undefined) body.depthBefore = db;
      }

      if (stage === 'after') {
        const mainSubmitted = Boolean(context?.dustbinSignals?.mainDisposalSubmitted);
        if (!mainSubmitted) {
          throw new Error('After data is locked until main report disposal is submitted.');
        }

        if (afterImage) body.afterImageBase64 = await fileToBase64(afterImage);

        const wa = toNum(weightAfterKg);
        const da = toNum(depthAfter);
        if (wa !== undefined) body.weightAfterKg = wa;
        if (da !== undefined) body.depthAfter = da;
      }

      const response = await fetch(`${API_BASE}/reports/${reportId}/virtual-dustbin`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });

      const data = await parseJsonOrEmpty(response);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to sync virtual dustbin data.');
      }

      if (stage === 'before') setLastBeforeSyncAt(new Date().toLocaleTimeString());
      if (stage === 'after') setLastAfterSyncAt(new Date().toLocaleTimeString());

      await loadReportContext(String(data.reportId));
      await loadDashboard();
      setNotice({ type: 'success', text: `Updated ${stage.toUpperCase()} signals for report ${data.reportId}.` });
    } catch (err) {
      setNotice({ type: 'error', text: buildErrorMessage(err, 'Failed to sync signals.') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDustbin =
    dustbins.find((d) => d._id === selectedDustbinId) ||
    dashboard?.dustbins.find((d) => d.dustbinId === selectedDustbinId) ||
    context?.dustbin ||
    null;

  const pickupImageForPreview = context?.pickupImageBase64 || tempContext?.pickupImageBase64 || '';
  const beforeSubmitted = Boolean(context?.dustbinSignals?.beforeSubmittedAt || context?.dustbinSignals?.beforeImageBase64);
  const mainDisposalSubmitted = Boolean(context?.dustbinSignals?.mainDisposalSubmitted);
  const afterSubmitted = Boolean(context?.dustbinSignals?.afterSubmittedAt || context?.dustbinSignals?.afterImageBase64);

  const stats = useMemo(() => {
    const base = {
      total: 0,
      before_pending: 0,
      waiting_main_disposal: 0,
      after_pending: 0,
      completed: 0
    };

    for (const req of dashboard?.requests || []) {
      base.total += 1;
      base[req.stage] += 1;
    }
    return base;
  }, [dashboard]);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return (dashboard?.requests || []).filter((req) => {
      if (stageFilter !== 'all' && req.stage !== stageFilter) return false;

      if (!normalizedSearch) return true;

      return (
        req.reportId.toLowerCase().includes(normalizedSearch) ||
        (req.collectorEmail || '').toLowerCase().includes(normalizedSearch) ||
        req.status.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [dashboard, searchText, stageFilter]);

  return (
    <div className="page-shell">
      <div className="container">
        <header className="hero">
          <div>
            <p className="eyebrow">Operations Console</p>
            <h1>Virtual Dustbin Dashboard</h1>
            <p className="hero-sub">Track incoming disposal requests and process before/after dustbin signals from one workspace.</p>
          </div>
          <div className="hero-meta">
            <span>Auto refresh: 15s</span>
            <span>Last sync: {lastDashboardSyncAt || '-'}</span>
          </div>
        </header>

        {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}

        <main className="layout">
          <section className="panel queue-panel">
            <div className="panel-header">
              <h2>Request Queue</h2>
              <div className="actions-row">
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => void loadDashboard()}
                  disabled={loadingDashboard}
                >
                  {loadingDashboard ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            <div className="filters-row">
              <div className="field compact">
                <label>Dustbin</label>
                <select value={dashboardDustbinFilter} onChange={(e) => setDashboardDustbinFilter(e.target.value)}>
                  <option value="">All dustbins</option>
                  {dustbins.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} {d.sector ? `(${d.sector})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field compact">
                <label>Stage</label>
                <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value as StageFilter)}>
                  <option value="all">All stages</option>
                  <option value="before_pending">Before Pending</option>
                  <option value="waiting_main_disposal">Waiting Main Disposal</option>
                  <option value="after_pending">After Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="field compact grow">
                <label>Search</label>
                <input
                  type="text"
                  placeholder="Report ID / collector / status"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>

            <div className="kpi-grid">
              <article className="kpi-card">
                <p className="kpi-label">Total Requests</p>
                <p className="kpi-value">{stats.total}</p>
              </article>
              <article className="kpi-card amber">
                <p className="kpi-label">Before Pending</p>
                <p className="kpi-value">{stats.before_pending}</p>
              </article>
              <article className="kpi-card sky">
                <p className="kpi-label">Waiting Disposal</p>
                <p className="kpi-value">{stats.waiting_main_disposal}</p>
              </article>
              <article className="kpi-card green">
                <p className="kpi-label">Completed</p>
                <p className="kpi-value">{stats.completed}</p>
              </article>
            </div>

            <div className="table-head">
              <span>Report</span>
              <span>Collector</span>
              <span>Stage</span>
              <span>Status</span>
              <span>Submitted</span>
            </div>

            <div className="request-list">
              {filteredRequests.map((request) => (
                <button
                  key={request.reportId}
                  type="button"
                  className={`request-item ${reportId === request.reportId ? 'active' : ''}`}
                  onClick={() => {
                    setReportId(request.reportId);
                    setTempPickupId('');
                    void loadReportContext(request.reportId).catch((err) => {
                      setNotice({ type: 'error', text: buildErrorMessage(err, 'Failed to load selected report.') });
                    });
                  }}
                >
                  <span className="mono">{request.reportId.slice(-10)}</span>
                  <span>{request.collectorEmail || 'Unknown'}</span>
                  <span><span className={`badge stage-${request.stage}`}>{stageLabel(request.stage)}</span></span>
                  <span className="status-text">{request.status}</span>
                  <span>{formatDate(request.submittedAt)}</span>
                </button>
              ))}

              {!loadingDashboard && filteredRequests.length === 0 && (
                <div className="empty-box">No requests match the current filters.</div>
              )}
            </div>
          </section>

          <section className="panel workspace-panel">
            <div className="panel-header">
              <h2>Request Workspace</h2>
              <button className="btn secondary" type="button" onClick={() => void reloadContext()} disabled={loadingContext}>
                {loadingContext ? 'Loading...' : 'Load Context'}
              </button>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Temporary Pickup ID</label>
                <input value={tempPickupId} placeholder="temp pickup id" onChange={(e) => setTempPickupId(e.target.value)} />
              </div>

              <div className="field">
                <label>Report ID</label>
                <input value={reportId} placeholder="report id" onChange={(e) => setReportId(e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label>Dustbin</label>
              <select value={selectedDustbinId} onChange={(e) => setSelectedDustbinId(e.target.value)}>
                <option value="">Choose dustbin</option>
                {dustbins.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} {d.sector ? `(${d.sector})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {!!tempPickupId && !reportId && (
              <button className="btn primary full" type="button" onClick={finalizeTempPickup} disabled={isFinalizing || !selectedDustbinId}>
                {isFinalizing ? 'Linking Temporary Pickup...' : 'Link Temporary Pickup To Dustbin'}
              </button>
            )}

            {!!selectedDustbin && (
              <p className="inline-note">Selected dustbin: {selectedDustbin.name} {selectedDustbin.type ? `• ${selectedDustbin.type}` : ''}</p>
            )}

            {pickupImageForPreview && (
              <div className="field">
                <label>Pickup Evidence</label>
                <img
                  src={pickupImageForPreview.startsWith('data:') ? pickupImageForPreview : `data:image/png;base64,${pickupImageForPreview}`}
                  alt="Pickup evidence"
                  className="preview"
                />
              </div>
            )}

            <div className="section-title">Before Disposal Signals</div>
            <div className="field">
              <label>Before Image</label>
              <input type="file" accept="image/*" onChange={(e) => setBeforeImage(e.target.files?.[0] || null)} />
              {beforePreview && <img src={beforePreview} alt="Before preview" className="preview" />}
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Weight Before (kg)</label>
                <input type="number" step="0.01" value={weightBeforeKg} onChange={(e) => setWeightBeforeKg(e.target.value)} />
              </div>
              <div className="field">
                <label>Depth Before ({depthUnit === 'meter' ? 'm' : '%'})</label>
                <input type="number" step="0.01" value={depthBefore} onChange={(e) => setDepthBefore(e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label>Depth Unit</label>
              <select value={depthUnit} onChange={(e) => setDepthUnit(e.target.value as 'meter' | 'percent')}>
                <option value="meter">Meter</option>
                <option value="percent">Percent</option>
              </select>
            </div>

            <p className="inline-note">Before sync: {lastBeforeSyncAt || (beforeSubmitted ? 'Already submitted' : 'Not synced yet')}</p>
            <button className="btn secondary full" type="button" onClick={() => void syncSignals('before')} disabled={!reportId || isSubmitting}>
              {beforeSubmitted ? 'Resubmit Before Data' : 'Submit Before Data'}
            </button>

            <div className="section-title">After Disposal Signals</div>
            {!mainDisposalSubmitted && (
              <div className="notice error small">After data is locked until main disposal is submitted from capture app.</div>
            )}

            <div className="field">
              <label>After Image</label>
              <input type="file" accept="image/*" disabled={!mainDisposalSubmitted} onChange={(e) => setAfterImage(e.target.files?.[0] || null)} />
              {afterPreview && <img src={afterPreview} alt="After preview" className="preview" />}
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Weight After (kg)</label>
                <input type="number" step="0.01" disabled={!mainDisposalSubmitted} value={weightAfterKg} onChange={(e) => setWeightAfterKg(e.target.value)} />
              </div>
              <div className="field">
                <label>Depth After ({depthUnit === 'meter' ? 'm' : '%'})</label>
                <input type="number" step="0.01" disabled={!mainDisposalSubmitted} value={depthAfter} onChange={(e) => setDepthAfter(e.target.value)} />
              </div>
            </div>

            <p className="inline-note">After sync: {lastAfterSyncAt || (afterSubmitted ? 'Already submitted' : 'Not synced yet')}</p>
            <button
              className="btn secondary full"
              type="button"
              onClick={() => void syncSignals('after')}
              disabled={!reportId || isSubmitting || !mainDisposalSubmitted}
            >
              {afterSubmitted ? 'Resubmit After Data' : 'Submit After Data'}
            </button>
          </section>
        </main>
      </div>
    </div>
  );
}
