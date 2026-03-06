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
  dustbinId?: string;
  dustbinSignals?: {
    weightBeforeKg?: number;
    weightAfterKg?: number;
    depthBefore?: number;
    depthAfter?: number;
    depthUnit?: 'meter' | 'percent';
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

type DustbinOption = {
  _id: string;
  name: string;
  sector?: string;
  type?: string;
  coordinates?: { lat: number; lng: number };
  status?: string;
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
  const tempPickupIdFromQuery = queryParams.get('tempPickupId')?.trim() || '';

  const [reportId, setReportId] = useState(reportIdFromQuery);
  const [tempPickupId, setTempPickupId] = useState(tempPickupIdFromQuery);
  const [context, setContext] = useState<ReportContext | null>(null);
  const [tempContext, setTempContext] = useState<TempPickupContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(Boolean(reportIdFromQuery || tempPickupIdFromQuery));

  const [dustbins, setDustbins] = useState<DustbinOption[]>([]);
  const [selectedDustbinId, setSelectedDustbinId] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

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
    const loadDustbins = async () => {
      try {
        const response = await fetch(`${API_BASE}/reports/virtual-dustbin/dustbins`, {
          method: 'GET',
          headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) return;
        const options = Array.isArray(data?.dustbins) ? data.dustbins : [];
        setDustbins(options);
      } catch {
        setDustbins([]);
      }
    };

    loadDustbins();
  }, []);

  useEffect(() => {
    const loadReportContext = async (id: string) => {
      const response = await fetch(`${API_BASE}/reports/${id}/virtual-dustbin/context`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load report context.');
      }

      setContext(data);
      setTempContext(null);
      setReportId(data.reportId);
      setWeightBeforeKg(String(data?.dustbinSignals?.weightBeforeKg ?? ''));
      setWeightAfterKg(String(data?.dustbinSignals?.weightAfterKg ?? ''));
      setDepthBefore(String(data?.dustbinSignals?.depthBefore ?? ''));
      setDepthAfter(String(data?.dustbinSignals?.depthAfter ?? ''));
      setDepthUnit(data?.dustbinSignals?.depthUnit === 'percent' ? 'percent' : 'meter');
      if (typeof data?.dustbinId === 'string') {
        setSelectedDustbinId(data.dustbinId);
      }
    };

    const loadTempContext = async (id: string) => {
      const response = await fetch(`${API_BASE}/reports/pickup-temp/${id}/virtual-dustbin/context`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load temporary pickup context.');
      }

      setTempContext(data);
      setContext(null);
      setTempPickupId(data.tempPickupId);
      if (data.linkedReportId) {
        setReportId(String(data.linkedReportId));
      }
    };

    const loadContext = async () => {
      if (!reportId && !tempPickupId) return;
      try {
        setLoadingContext(true);
        setNotice(null);

        if (reportId) {
          await loadReportContext(reportId);
          return;
        }

        if (tempPickupId) {
          await loadTempContext(tempPickupId);
        }
      } catch (err) {
        setNotice({ type: 'error', text: (err as Error).message });
      } finally {
        setLoadingContext(false);
      }
    };

    loadContext();
  }, [reportId, tempPickupId]);

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

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to convert temporary pickup into a report.');
      }

      setReportId(String(data.reportId));
      setNotice({
        type: 'success',
        text: `Temporary pickup converted. Report ID: ${data.reportId}`
      });
    } catch (err) {
      setNotice({ type: 'error', text: (err as Error).message });
    } finally {
      setIsFinalizing(false);
    }
  };

  const submit = async () => {
    setNotice(null);

    if (!reportId.trim()) {
      setNotice({ type: 'error', text: 'Generate a report ID by selecting a dustbin first.' });
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

  const selectedDustbin = dustbins.find((d) => d._id === selectedDustbinId) || null;
  const pickupImageForPreview = context?.pickupImageBase64 || tempContext?.pickupImageBase64 || '';

  return (
    <div className="container">
      <div className="header">
        <h1>Ecowaste Virtual Dustbin</h1>
        <p>
          {reportId
            ? 'Linked to report and ready for dustbin signal submission'
            : tempPickupId
              ? 'Temporary pickup linked. Select dustbin to generate final report ID.'
              : 'Open this page from pickup image action in frontend'}
        </p>
      </div>

      <div className="grid">
        <section className="card">
          <h2>Linked Context</h2>

          <div className="row">
            <label htmlFor="temp-id">Temporary Pickup ID</label>
            <input id="temp-id" value={tempPickupId} disabled placeholder="temporary pickup id" onChange={(e) => setTempPickupId(e.target.value)} />
          </div>

          <div className="row">
            <label htmlFor="report-id">Report ID</label>
            <input id="report-id" value={reportId} disabled placeholder="generated after dustbin selection" onChange={(e) => setReportId(e.target.value)} />
          </div>

          {loadingContext && <p>Loading context...</p>}

          {!loadingContext && (context || tempContext) && (
            <>
              <div className="row">
                <label>Status</label>
                <input value={context?.status || tempContext?.status || '-'} disabled />
              </div>
              <div className="row">
                <label>Collector</label>
                <input value={context?.collectorEmail || tempContext?.collectorEmail || 'Unknown'} disabled />
              </div>
              <div className="row">
                <label>Created</label>
                <input value={context?.submittedAt ? new Date(context.submittedAt).toLocaleString() : tempContext?.createdAt ? new Date(tempContext.createdAt).toLocaleString() : '-'} disabled />
              </div>
              {pickupImageForPreview && (
                <div className="row">
                  <label>Pickup Evidence</label>
                  <img
                    src={pickupImageForPreview.startsWith('data:') ? pickupImageForPreview : `data:image/png;base64,${pickupImageForPreview}`}
                    alt="Pickup evidence"
                    className="preview"
                  />
                </div>
              )}
            </>
          )}

          {!loadingContext && !context && !tempContext && (reportIdFromQuery || tempPickupIdFromQuery) && (
            <p>Unable to load linked details for this request.</p>
          )}

          {!!tempPickupId && !reportId && (
            <>
              <div className="row">
                <label htmlFor="dustbin-select">Select Dustbin For Disposal</label>
                <select id="dustbin-select" value={selectedDustbinId} onChange={(e) => setSelectedDustbinId(e.target.value)}>
                  <option value="">Choose dustbin</option>
                  {dustbins.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} {d.sector ? `(${d.sector})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedDustbin && (
                <div className="row">
                  <label>Selected Dustbin Details</label>
                  <input
                    value={`${selectedDustbin.name}${selectedDustbin.type ? ` • ${selectedDustbin.type}` : ''}${selectedDustbin.coordinates ? ` • ${selectedDustbin.coordinates.lat.toFixed(5)}, ${selectedDustbin.coordinates.lng.toFixed(5)}` : ''}`}
                    disabled
                  />
                </div>
              )}

              <button className="primary" disabled={isFinalizing || !selectedDustbinId} onClick={finalizeTempPickup}>
                {isFinalizing ? 'Generating Report ID...' : 'Generate Final Report ID'}
              </button>
            </>
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
