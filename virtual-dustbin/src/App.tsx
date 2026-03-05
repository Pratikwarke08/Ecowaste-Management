import { useEffect, useMemo, useState } from 'react';

type Notice = {
  type: 'success' | 'error';
  text: string;
} | null;

type ReportContext = {
  reportId: string;
  status: string;
  collectorEmail?: string;
  submittedAt?: string;
  pickupImageBase64?: string;
  pickupLocation?: { lat: number; lng: number };
  disposalLocation?: { lat: number; lng: number };
  points?: number;
  dustbinSignals?: {
    weightBeforeKg?: number;
    weightAfterKg?: number;
    depthBefore?: number;
    depthAfter?: number;
    depthUnit?: 'meter' | 'percent';
  };
};

const API_BASE =
  import.meta.env.PROD
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api';

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

export default function App() {
  const queryParams = new URLSearchParams(window.location.search);
  const reportIdFromQuery = queryParams.get('reportId')?.trim() || '';

  const [reportId, setReportId] = useState(reportIdFromQuery);
  const [context, setContext] = useState<ReportContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(Boolean(reportIdFromQuery));

  const [beforeImage, setBeforeImage] = useState<File | null>(null);
  const [afterImage, setAfterImage] = useState<File | null>(null);
  const [weightBeforeKg, setWeightBeforeKg] = useState('');
  const [weightAfterKg, setWeightAfterKg] = useState('');
  const [depthBefore, setDepthBefore] = useState('');
  const [depthAfter, setDepthAfter] = useState('');
  const [depthUnit, setDepthUnit] = useState<'meter' | 'percent'>('meter');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const beforePreview = useMemo(() => (beforeImage ? URL.createObjectURL(beforeImage) : ''), [beforeImage]);
  const afterPreview = useMemo(() => (afterImage ? URL.createObjectURL(afterImage) : ''), [afterImage]);

  useEffect(() => {
    return () => {
      if (beforePreview) URL.revokeObjectURL(beforePreview);
      if (afterPreview) URL.revokeObjectURL(afterPreview);
    };
  }, [beforePreview, afterPreview]);

  useEffect(() => {
    if (!reportIdFromQuery) return;

    const loadContext = async () => {
      try {
        setLoadingContext(true);
        setNotice(null);

        const response = await fetch(`${API_BASE}/reports/${reportIdFromQuery}/virtual-dustbin/context`, {
          method: 'GET',
          headers: getAuthHeaders()
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load report context.');
        }

        setContext(data);
        setReportId(data.reportId);
        setWeightBeforeKg(String(data?.dustbinSignals?.weightBeforeKg ?? ''));
        setWeightAfterKg(String(data?.dustbinSignals?.weightAfterKg ?? ''));
        setDepthBefore(String(data?.dustbinSignals?.depthBefore ?? ''));
        setDepthAfter(String(data?.dustbinSignals?.depthAfter ?? ''));
        setDepthUnit(data?.dustbinSignals?.depthUnit === 'percent' ? 'percent' : 'meter');
      } catch (err) {
        setNotice({ type: 'error', text: (err as Error).message });
      } finally {
        setLoadingContext(false);
      }
    };

    loadContext();
  }, [reportIdFromQuery]);

  const resetForm = () => {
    setBeforeImage(null);
    setAfterImage(null);
    setWeightBeforeKg('');
    setWeightAfterKg('');
    setDepthBefore('');
    setDepthAfter('');
    setDepthUnit('meter');
    setNotice(null);
  };

  const submit = async () => {
    setNotice(null);

    if (!reportId.trim()) {
      setNotice({ type: 'error', text: 'Missing linked report ID.' });
      return;
    }
    if (!beforeImage || !afterImage) {
      setNotice({ type: 'error', text: 'Please upload both before and after images.' });
      return;
    }

    const wb = Number(weightBeforeKg);
    const wa = Number(weightAfterKg);
    const db = Number(depthBefore);
    const da = Number(depthAfter);

    if ([wb, wa, db, da].some((v) => Number.isNaN(v))) {
      setNotice({ type: 'error', text: 'Weight and depth values must be valid numbers.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const [beforeImageBase64, afterImageBase64] = await Promise.all([
        fileToBase64(beforeImage),
        fileToBase64(afterImage)
      ]);

      const response = await fetch(`${API_BASE}/reports/${reportId}/virtual-dustbin`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          beforeImageBase64,
          afterImageBase64,
          weightBeforeKg: wb,
          weightAfterKg: wa,
          depthBefore: db,
          depthAfter: da,
          depthUnit
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to send virtual dustbin inputs.');
      }

      setNotice({
        type: 'success',
        text: `Updated report ${data.reportId}. Genuinity: ${data?.genuinity?.isGenuine ? 'Genuine' : 'Flagged'} (${data?.genuinity?.confidenceScore ?? 0}%).`
      });

      setBeforeImage(null);
      setAfterImage(null);
    } catch (err) {
      setNotice({ type: 'error', text: (err as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Ecowaste Virtual Dustbin</h1>
        <p>{reportIdFromQuery ? 'Linked request received from frontend report click' : 'Open this page from pickup image action in frontend'}</p>
      </div>

      <div className="grid">
        <section className="card">
          <h2>Linked Report</h2>
          <div className="row">
            <label htmlFor="report-id">Report ID</label>
            <input id="report-id" value={reportId} disabled placeholder="Linked report id" onChange={(e) => setReportId(e.target.value)} />
          </div>

          {loadingContext && <p>Loading report context...</p>}

          {!loadingContext && context && (
            <>
              <div className="row">
                <label>Status</label>
                <input value={context.status} disabled />
              </div>
              <div className="row">
                <label>Collector</label>
                <input value={context.collectorEmail || 'Unknown'} disabled />
              </div>
              <div className="row">
                <label>Submitted</label>
                <input value={context.submittedAt ? new Date(context.submittedAt).toLocaleString() : '-'} disabled />
              </div>
              {context.pickupImageBase64 && (
                <div className="row">
                  <label>Pickup Evidence (From Frontend)</label>
                  <img
                    src={context.pickupImageBase64.startsWith('data:') ? context.pickupImageBase64 : `data:image/png;base64,${context.pickupImageBase64}`}
                    alt="Pickup evidence"
                    className="preview"
                  />
                </div>
              )}
            </>
          )}

          {!loadingContext && !context && reportIdFromQuery && (
            <p>Unable to load report details for this request.</p>
          )}

          <div className="row">
            <label htmlFor="depth-unit">Depth Input Unit</label>
            <select id="depth-unit" value={depthUnit} onChange={(e) => setDepthUnit(e.target.value as 'meter' | 'percent')}>
              <option value="meter">Meter (1 m = 10%)</option>
              <option value="percent">Percent</option>
            </select>
          </div>
        </section>

        <section className="card">
          <h2>Dustbin Images</h2>
          <div className="row">
            <label htmlFor="before-image">Before Disposal Image</label>
            <input id="before-image" type="file" accept="image/*" onChange={(e) => setBeforeImage(e.target.files?.[0] || null)} />
            {beforePreview && <img src={beforePreview} alt="Before preview" className="preview" />}
          </div>
          <div className="row">
            <label htmlFor="after-image">After Disposal Image</label>
            <input id="after-image" type="file" accept="image/*" onChange={(e) => setAfterImage(e.target.files?.[0] || null)} />
            {afterPreview && <img src={afterPreview} alt="After preview" className="preview" />}
          </div>
        </section>

        <section className="card">
          <h2>Weight and Depth</h2>
          <div className="row">
            <label htmlFor="weight-before">Weight Before Disposal (kg)</label>
            <input id="weight-before" type="number" step="0.01" value={weightBeforeKg} onChange={(e) => setWeightBeforeKg(e.target.value)} />
          </div>
          <div className="row">
            <label htmlFor="weight-after">Weight After Disposal (kg)</label>
            <input id="weight-after" type="number" step="0.01" value={weightAfterKg} onChange={(e) => setWeightAfterKg(e.target.value)} />
          </div>
          <div className="row">
            <label htmlFor="depth-before">Depth Before ({depthUnit === 'meter' ? 'm' : '%'})</label>
            <input id="depth-before" type="number" step="0.01" value={depthBefore} onChange={(e) => setDepthBefore(e.target.value)} />
          </div>
          <div className="row">
            <label htmlFor="depth-after">Depth After ({depthUnit === 'meter' ? 'm' : '%'})</label>
            <input id="depth-after" type="number" step="0.01" value={depthAfter} onChange={(e) => setDepthAfter(e.target.value)} />
          </div>
        </section>
      </div>

      <div className="actions">
        <button className="secondary" disabled={isSubmitting} onClick={resetForm}>Reset Inputs</button>
        <button className="primary" disabled={isSubmitting || loadingContext || !reportId} onClick={submit}>
          {isSubmitting ? 'Submitting...' : 'Submit Before/After Signals'}
        </button>
      </div>

      {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}
    </div>
  );
}
