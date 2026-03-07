import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Shield,
  CheckCircle,
  X,
  Clock,
  MapPin,
  Calendar,
  Camera,
  AlertTriangle,
  Eye,
  MessageSquare
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

const VIRTUAL_DUSTBIN_URL = import.meta.env.VITE_VIRTUAL_DUSTBIN_URL || 'http://localhost:5174';

type ReportStatus = 'pending' | 'approved' | 'rejected';

type Report = {
  _id: string;
  id?: string;
  status: ReportStatus;
  pickupImageBase64?: string;
  disposalImageBase64?: string;
  pickupImage?: string;
  disposalImage?: string;
  pickupLocation?: { lat: number; lng: number };
  disposalLocation?: { lat: number; lng: number };
  dustbinId?: string;
  collectorEmail?: string;
  submittedAt: string;
  points?: number;
  dustbinSignals?: {
    beforeImageBase64?: string;
    afterImageBase64?: string;
    weightBeforeKg?: number;
    weightAfterKg?: number;
    depthBefore?: number;
    depthAfter?: number;
    depthUnit?: 'meter' | 'percent';
    source?: string;
    submittedAt?: string;
  };
  verificationComment?: string;
  verifiedBy?: string;
  aiAnalysis?: {
    wasteItems?: {
      class_name: string;
      confidence: number;
      bbox: number[];
      points: number;
    }[];
    totalPoints?: number;
    confidenceMet?: boolean;
    disposalDistance?: number;
    verificationThresholdMeters?: number;
    withinVerificationRange?: boolean;
    nearestDustbin?: {
      _id?: string;
      name?: string;
      lat?: number;
      lng?: number;
    };
    estimatedWeightRangeGrams?: {
      min?: number;
      max?: number;
    };
    genuinity?: {
      isGenuine?: boolean;
      confidenceScore?: number;
      reasons?: string[];
      observed?: {
        weightDeltaGrams?: number;
        depthBeforePercentage?: number;
        depthAfterPercentage?: number;
        depthDeltaPercentage?: number;
        imageItemCountBefore?: number;
        imageItemCountAfter?: number;
        imageItemCountDelta?: number;
      };
    };
  };
};

type DustbinData = {
  coordinates?: { lat: number; lng: number };
  verificationRadius?: number;
  initialPhotoBase64?: string;
  photoHistory?: Array<{ photo: string; updatedAt: string }>;
};

type SectionKey = 'distance' | 'ai' | 'signals' | 'images';
type ManualWasteRow = {
  type: string;
  subtype: string;
  quantity: number;
  unitWeightGrams: number;
};

const WASTE_CATALOG: Record<string, Array<{ subtype: string; unitWeightGrams: number }>> = {
  Plastic: [
    { subtype: 'Water Bottle', unitWeightGrams: 15 },
    { subtype: 'Soft Drink Bottle', unitWeightGrams: 22 },
    { subtype: 'Food Wrapper', unitWeightGrams: 5 },
    { subtype: 'Carry Bag', unitWeightGrams: 6 }
  ],
  Metal: [
    { subtype: 'Aluminum Can', unitWeightGrams: 14 },
    { subtype: 'Tin Can', unitWeightGrams: 28 }
  ],
  Glass: [
    { subtype: 'Glass Bottle', unitWeightGrams: 250 }
  ],
  Paper: [
    { subtype: 'Newspaper', unitWeightGrams: 50 },
    { subtype: 'Cardboard', unitWeightGrams: 120 },
    { subtype: 'Paper Cup', unitWeightGrams: 10 }
  ],
  Organic: [
    { subtype: 'Food Scraps', unitWeightGrams: 120 },
    { subtype: 'Fruit Peel', unitWeightGrams: 80 }
  ],
  EWaste: [
    { subtype: 'Small Cable', unitWeightGrams: 35 },
    { subtype: 'Charger', unitWeightGrams: 70 }
  ]
};

const ImageViewer = ({
  src,
  open,
  onClose,
}: {
  src: string | null;
  open: boolean;
  onClose: () => void;
}) => {
  if (!open || !src) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      <button
        onClick={onClose}
        className="fixed top-4 right-4 bg-black/70 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl z-50"
      >
        ✕
      </button>
      <img
        src={src}
        className="max-h-[90vh] max-w-[95vw] object-contain"
        alt="Full View"
      />
    </div>
  );
};

const toImageSrc = (img?: string | null) => {
  if (!img) return null;
  if (img.startsWith('http') || img.startsWith('data:')) return img;
  return `data:image/png;base64,${img}`;
};

const sectionId = (reportId: string, key: SectionKey) => `${reportId}:${key}`;

const Verify = () => {
  const userType = localStorage.getItem('userType') as 'collector' | 'employee';
  const { toast } = useToast();

  const [reports, setReports] = useState<Report[]>([]);
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const [comments, setComments] = useState('');
  const [points, setPoints] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [manualWasteRows, setManualWasteRows] = useState<ManualWasteRow[]>([]);

  const [dustbinData, setDustbinData] = useState<DustbinData | null>(null);
  const [latestVerifiedAfterImage, setLatestVerifiedAfterImage] = useState<string | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);

  const openViewer = (src: string | null) => {
    if (!src) return;
    setViewerSrc(src);
    setViewerOpen(true);
  };

  const openVirtualDustbin = (reportId?: string) => {
    if (!reportId) return;
    const targetUrl = `${VIRTUAL_DUSTBIN_URL.replace(/\/$/, '')}?reportId=${encodeURIComponent(reportId)}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const fetchLatestVerifiedAfterImage = async (dustbinId?: string) => {
    if (!dustbinId) {
      setLatestVerifiedAfterImage(null);
      return;
    }
    try {
      const res = await apiFetch(`/reports/latest-disposal-image?dustbinId=${dustbinId}`);
      if (!res.ok) {
        setLatestVerifiedAfterImage(null);
        return;
      }
      const data = await res.json();
      setLatestVerifiedAfterImage(data?.afterImageBase64 || data?.disposalImageBase64 || null);
    } catch {
      setLatestVerifiedAfterImage(null);
    }
  };

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await apiFetch('/reports');
        const data = await res.json();
        const reportsList = Array.isArray(data) ? data : (data.reports || []);
        setReports(reportsList);
      } catch (err) {
        const error = err as Error & { status?: number; message?: string };
        if (error.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('userType');
          window.location.href = '/';
          return;
        }
        toast({
          title: 'Unable to load reports',
          description: error.message || 'Please try again later.',
          variant: 'destructive'
        });
      }
    };

    void fetchReports();
  }, [toast]);

  useEffect(() => {
    if (!selectedReport?.dustbinId) {
      setDustbinData(null);
      setLatestVerifiedAfterImage(null);
      return;
    }

    const fetchDustbin = async () => {
      try {
        const res = await apiFetch(`/dustbins/${selectedReport.dustbinId}`);
        if (!res.ok) {
          setDustbinData(null);
          return;
        }
        const data = await res.json();
        setDustbinData(data);
      } catch {
        setDustbinData(null);
      }
    };

    void fetchDustbin();
    void fetchLatestVerifiedAfterImage(selectedReport.dustbinId);
  }, [selectedReport?.dustbinId]);

  useEffect(() => {
    if (!selectedReport) return;
    setComments(selectedReport.verificationComment || '');
    setPoints(selectedReport.points || 0);
    setManualWasteRows([]);
  }, [selectedReport]);

  const addManualWasteRow = () => {
    const firstType = Object.keys(WASTE_CATALOG)[0];
    const firstSubtype = WASTE_CATALOG[firstType][0];
    setManualWasteRows((prev) => [
      ...prev,
      {
        type: firstType,
        subtype: firstSubtype.subtype,
        quantity: 1,
        unitWeightGrams: firstSubtype.unitWeightGrams
      }
    ]);
  };

  const updateManualWasteRow = (index: number, patch: Partial<ManualWasteRow>) => {
    setManualWasteRows((prev) => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;
      const merged = { ...current, ...patch };
      if (patch.type && patch.type !== current.type) {
        const firstSubtype = WASTE_CATALOG[patch.type]?.[0];
        if (firstSubtype) {
          merged.subtype = firstSubtype.subtype;
          merged.unitWeightGrams = firstSubtype.unitWeightGrams;
        }
      }
      if (patch.subtype && patch.subtype !== current.subtype) {
        const subtypeMeta = WASTE_CATALOG[merged.type]?.find((s) => s.subtype === patch.subtype);
        if (subtypeMeta) {
          merged.unitWeightGrams = subtypeMeta.unitWeightGrams;
        }
      }
      next[index] = merged;
      return next;
    });
  };

  const removeManualWasteRow = (index: number) => {
    setManualWasteRows((prev) => prev.filter((_, i) => i !== index));
  };

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (filterStatus === 'all') return true;
      return report.status === filterStatus;
    });
  }, [reports, filterStatus]);

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-eco-warning/10 text-eco-warning">Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-eco-success/10 text-eco-success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const updateReportInState = (updated: Report) => {
    setReports((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
    setSelectedReport(updated);
  };

  const handleApprove = async (reportId: string) => {
    if (points <= 0) {
      toast({
        title: 'Points required',
        description: 'Please assign points before approving.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setActionLoading(true);
      const res = await apiFetch(`/reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'approved',
          points,
          materialType: manualWasteRows.length
            ? manualWasteRows.map((r) => `${r.type} > ${r.subtype} x${r.quantity}`).join(' | ')
            : undefined,
          wasteWeightKg: manualWasteRows.length
            ? Number((manualWasteRows.reduce((sum, r) => sum + (r.quantity * r.unitWeightGrams), 0) / 1000).toFixed(4))
            : undefined,
          manualWasteEntries: manualWasteRows.length ? manualWasteRows : undefined,
          verificationComment: comments,
          verifiedBy: userType === 'employee' ? 'Government Officer' : undefined
        })
      });
      const updated = (await res.json()) as Report;
      updateReportInState(updated);
      await fetchLatestVerifiedAfterImage(updated?.dustbinId);
      toast({ title: 'Report Approved', description: 'The collector has been awarded points and notified.' });
    } catch (err) {
      const error = err as Error & { message?: string };
      toast({
        title: 'Approval Failed',
        description: error.message || 'Unable to approve report',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reportId: string) => {
    if (!comments.trim()) {
      toast({
        title: 'Comment Required',
        description: 'Please provide a reason for rejection.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setActionLoading(true);
      const res = await apiFetch(`/reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'rejected',
          verificationComment: comments,
          verifiedBy: userType === 'employee' ? 'Government Officer' : undefined
        })
      });
      const updated = (await res.json()) as Report;
      updateReportInState(updated);
      await fetchLatestVerifiedAfterImage(updated?.dustbinId);
      toast({ title: 'Report Rejected', description: 'Collector has been notified about the rejection.', variant: 'destructive' });
    } catch (err) {
      const error = err as Error & { message?: string };
      toast({
        title: 'Rejection Failed',
        description: error.message || 'Unable to reject report',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetails = async (report: Report) => {
    const id = report._id || report.id || '';
    if (!id) return;

    if (expandedReportId === id) {
      setExpandedReportId(null);
      setSelectedReport(null);
      return;
    }

    try {
      const res = await apiFetch(`/reports/${id}`);
      const fullReport = (await res.json()) as Report;
      setSelectedReport(fullReport);
      setExpandedReportId(id);
      setOpenSections({});
    } catch (err: unknown) {
      toast({
        title: 'Failed to load report details',
        description: (err as Error)?.message || 'Please try again',
        variant: 'destructive'
      });
      setSelectedReport(report);
      setExpandedReportId(id);
      setOpenSections({});
    }
  };

  const isSectionOpen = (reportId: string, key: SectionKey) => Boolean(openSections[sectionId(reportId, key)]);
  const toggleSection = (reportId: string, key: SectionKey) => {
    const id = sectionId(reportId, key);
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderImageRow = (label: string, image: string | null | undefined, extra?: ReactNode) => {
    const src = toImageSrc(image || null);
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border p-3 bg-background/70">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{src ? 'Image available' : 'No image available'}</p>
        </div>
        <div className="flex gap-2">
          {extra}
          <Button variant="outline" size="sm" disabled={!src} onClick={() => openViewer(src)}>
            <Eye className="h-4 w-4 mr-1" />
            View Image
          </Button>
        </div>
      </div>
    );
  };

  const selectedThreshold = selectedReport?.aiAnalysis?.verificationThresholdMeters || dustbinData?.verificationRadius || 10;
  const selectedDistance = selectedReport?.aiAnalysis?.disposalDistance;
  const selectedWithinRange =
    typeof selectedReport?.aiAnalysis?.withinVerificationRange === 'boolean'
      ? selectedReport.aiAnalysis.withinVerificationRange
      : typeof selectedDistance === 'number'
        ? selectedDistance <= selectedThreshold
        : false;
  const selectedWasteItems = selectedReport?.aiAnalysis?.wasteItems || [];
  const selectedAiTotalPoints = selectedReport?.aiAnalysis?.totalPoints || 0;
  const selectedGenuinity = selectedReport?.aiAnalysis?.genuinity;
  const selectedObserved = selectedGenuinity?.observed;

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={userType} />

      <main className="lg:ml-64 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-gradient-eco rounded-lg p-5 sm:p-6 text-white">
            <h1 className="text-xl sm:text-2xl font-bold mb-2">Verification Center</h1>
            <p className="text-white/90 text-sm sm:text-base">Review and verify waste collection reports from collectors</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-warning/10 rounded-full"><Clock className="h-6 w-6 text-eco-warning" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Review</p>
                    <p className="text-2xl font-bold text-eco-warning">{reports.filter((r) => r.status === 'pending').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-success/10 rounded-full"><CheckCircle className="h-6 w-6 text-eco-success" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Approved</p>
                    <p className="text-2xl font-bold text-eco-success">{reports.filter((r) => r.status === 'approved').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-destructive/10 rounded-full"><X className="h-6 w-6 text-destructive" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rejected</p>
                    <p className="text-2xl font-bold text-destructive">{reports.filter((r) => r.status === 'rejected').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-forest-primary/10 rounded-full"><Shield className="h-6 w-6 text-eco-forest-primary" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Reports</p>
                    <p className="text-2xl font-bold">{reports.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <Select value={filterStatus} onValueChange={(v: 'pending' | 'approved' | 'rejected' | 'all') => setFilterStatus(v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reports</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-eco-forest-primary" />Waste Collection Reports ({filteredReports.length})</CardTitle>
              <CardDescription>Report details now expand inside each report container.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredReports.map((report) => {
                  const reportId = report._id || report.id || '';
                  const isExpanded = expandedReportId === reportId && selectedReport;
                  const activeReport = isExpanded ? selectedReport : null;

                  return (
                    <div key={reportId} className="rounded-lg border bg-muted/40 p-4 sm:p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-lg">Report #{reportId.slice(-6)}</h3>
                            {getStatusBadge(report.status)}
                            <Badge variant="outline" className="text-[10px]">{new Date(report.submittedAt).toLocaleString()}</Badge>
                          </div>
                          {report.collectorEmail && <p className="text-muted-foreground text-sm">by {report.collectorEmail}</p>}
                        </div>
                        <Button onClick={() => handleViewDetails(report)} variant="outline" size="sm" className="w-full sm:w-auto">
                          <Eye className="h-3 w-3 mr-1" />
                          {isExpanded ? 'Hide Details' : 'View Details'}
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-md border bg-background/60 p-3">
                          <div className="flex items-center gap-2"><MapPin className="h-3 w-3" /><span>Pickup: {report.pickupLocation ? `${report.pickupLocation.lat?.toFixed(5)}, ${report.pickupLocation.lng?.toFixed(5)}` : '—'}</span></div>
                          <div className="mt-1 flex items-center gap-2"><MapPin className="h-3 w-3" /><span>Disposal: {report.disposalLocation ? `${report.disposalLocation.lat?.toFixed(5)}, ${report.disposalLocation.lng?.toFixed(5)}` : '—'}</span></div>
                        </div>
                        <div className="rounded-md border bg-background/60 p-3">
                          <div className="flex items-center gap-2"><Calendar className="h-3 w-3" /><span>{new Date(report.submittedAt).toLocaleString()}</span></div>
                          <div className="mt-1 text-xs text-muted-foreground">Status: {report.status}</div>
                        </div>
                      </div>

                      {report.status === 'pending' && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                          <Button onClick={() => handleReject(reportId)} variant="outline" size="sm" className="w-full sm:w-auto" disabled={actionLoading}>
                            <X className="h-3 w-3 mr-1" />Reject
                          </Button>
                          <Button onClick={() => handleApprove(reportId)} variant="eco" size="sm" className="w-full sm:w-auto" disabled={actionLoading}>
                            <CheckCircle className="h-3 w-3 mr-1" />Approve
                          </Button>
                        </div>
                      )}

                      {(report.status === 'approved' || report.status === 'rejected') && report.verificationComment && (
                        <div className="pt-2 border-t text-sm">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-3 w-3 mt-1" />
                            <div>
                              <p className="font-medium">Verification Comment</p>
                              <p className="text-muted-foreground">{report.verificationComment}</p>
                              <p className="text-xs text-muted-foreground mt-1">- {report.verifiedBy}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {isExpanded && activeReport && (
                        <div className="border-t pt-4 space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <Badge variant="secondary">Report Details</Badge>
                            <p className="text-xs text-muted-foreground">Mobile and desktop optimized expandable sections</p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between rounded-md border bg-background/60 p-3">
                              <p className="text-sm font-medium">Distance Verification (10m Rule)</p>
                              <Button variant="outline" size="sm" onClick={() => toggleSection(reportId, 'distance')}>
                                {isSectionOpen(reportId, 'distance') ? 'Hide' : 'View Details'}
                              </Button>
                            </div>
                            {isSectionOpen(reportId, 'distance') && (
                              <div className="rounded-md border p-3 text-sm bg-background/80">
                                <p>Calculated Distance: <span className={`font-semibold ${selectedWithinRange ? 'text-eco-success' : 'text-destructive'}`}>{typeof selectedDistance === 'number' ? `${selectedDistance.toFixed(2)}m` : 'N/A'}</span></p>
                                <p className="text-muted-foreground">Threshold: {selectedThreshold}m</p>
                                <p className="text-muted-foreground">Dustbin Coordinates: {dustbinData?.coordinates ? `${dustbinData.coordinates.lat.toFixed(6)}, ${dustbinData.coordinates.lng.toFixed(6)}` : '—'}</p>
                                <p className="text-muted-foreground">Report Disposal Coordinates: {activeReport.disposalLocation ? `${activeReport.disposalLocation.lat.toFixed(6)}, ${activeReport.disposalLocation.lng.toFixed(6)}` : '—'}</p>
                              </div>
                            )}

                            <div className="flex items-center justify-between rounded-md border bg-background/60 p-3">
                              <p className="text-sm font-medium">AI Waste Detection</p>
                              <Button variant="outline" size="sm" onClick={() => toggleSection(reportId, 'ai')}>
                                {isSectionOpen(reportId, 'ai') ? 'Hide' : 'View Details'}
                              </Button>
                            </div>
                            {isSectionOpen(reportId, 'ai') && (
                              <div className="rounded-md border p-3 text-sm bg-background/80 space-y-2">
                                <p>Detected Types: <span className="font-semibold">{selectedWasteItems.length}</span></p>
                                <p>AI Suggested Points: <span className="font-semibold">{selectedAiTotalPoints}</span></p>
                                {selectedWasteItems.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {selectedWasteItems.map((item, idx) => (
                                      <Badge key={`${item.class_name}-${idx}`} variant="outline">{item.class_name} ({(item.confidence * 100).toFixed(1)}%)</Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground">No waste type detected by AI for this pickup image.</p>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between rounded-md border bg-background/60 p-3">
                              <p className="text-sm font-medium">Dustbin Signal Verification</p>
                              <Button variant="outline" size="sm" onClick={() => toggleSection(reportId, 'signals')}>
                                {isSectionOpen(reportId, 'signals') ? 'Hide' : 'View Details'}
                              </Button>
                            </div>
                            {isSectionOpen(reportId, 'signals') && (
                              <div className="rounded-md border p-3 text-sm bg-background/80 space-y-2">
                                <p>Weight: {(activeReport.dustbinSignals?.weightBeforeKg ?? 0)} → {(activeReport.dustbinSignals?.weightAfterKg ?? 0)} kg</p>
                                <p>Depth: {(activeReport.dustbinSignals?.depthBefore ?? 0)} → {(activeReport.dustbinSignals?.depthAfter ?? 0)} {activeReport.dustbinSignals?.depthUnit === 'percent' ? '%' : 'meter'}</p>
                                <p>ML Genuinity: <span className={`font-semibold ${selectedGenuinity?.isGenuine ? 'text-eco-success' : 'text-destructive'}`}>{selectedGenuinity?.isGenuine ? 'Genuine' : 'Flagged'}</span> ({selectedGenuinity?.confidenceScore ?? 0}%)</p>
                                <p className="text-muted-foreground">Weight Delta: {typeof selectedObserved?.weightDeltaGrams === 'number' ? `${selectedObserved.weightDeltaGrams.toFixed(2)} g` : 'N/A'}</p>
                              </div>
                            )}

                            <div className="flex items-center justify-between rounded-md border bg-background/60 p-3">
                              <p className="text-sm font-medium">Image Evidence</p>
                              <Button variant="outline" size="sm" onClick={() => toggleSection(reportId, 'images')}>
                                {isSectionOpen(reportId, 'images') ? 'Hide' : 'View Details'}
                              </Button>
                            </div>
                            {isSectionOpen(reportId, 'images') && (
                              <div className="rounded-md border p-3 bg-background/80 space-y-2">
                                {renderImageRow('Initial Deployment', dustbinData?.initialPhotoBase64 || null)}
                                {renderImageRow('Latest Verified (Virtual After)', latestVerifiedAfterImage || null)}
                                {renderImageRow('Dustbin Before (Virtual)', activeReport.dustbinSignals?.beforeImageBase64 || null)}
                                {renderImageRow('Dustbin After (Virtual)', activeReport.dustbinSignals?.afterImageBase64 || null)}
                                {renderImageRow(
                                  'Pickup Image',
                                  activeReport.pickupImageBase64 || activeReport.pickupImage || null,
                                  <Button variant="outline" size="sm" onClick={() => openVirtualDustbin(activeReport._id || activeReport.id)}>Open Virtual</Button>
                                )}
                                {renderImageRow('Disposal Image', activeReport.disposalImageBase64 || activeReport.disposalImage || null)}
                              </div>
                            )}
                          </div>

                          {activeReport.status === 'pending' && (
                            <div className="space-y-3 border rounded-md p-3 bg-background/70">
                              <div>
                                <label className="text-sm font-medium">Points to Award</label>
                                <Input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} className="bg-background mt-1" />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Comments</label>
                                <Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Add verification notes..." className="bg-background mt-1" />
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <label className="text-sm font-medium">Manual Waste Entry (for AI-missed items)</label>
                                  <Button type="button" variant="outline" size="sm" onClick={addManualWasteRow}>Add Waste Type</Button>
                                </div>
                                {manualWasteRows.map((row, idx) => (
                                  <div key={`${row.type}-${row.subtype}-${idx}`} className="grid grid-cols-1 md:grid-cols-5 gap-2 border rounded p-2">
                                    <select
                                      className="border rounded px-2 py-1 text-sm"
                                      value={row.type}
                                      onChange={(e) => updateManualWasteRow(idx, { type: e.target.value })}
                                    >
                                      {Object.keys(WASTE_CATALOG).map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                      ))}
                                    </select>
                                    <select
                                      className="border rounded px-2 py-1 text-sm"
                                      value={row.subtype}
                                      onChange={(e) => updateManualWasteRow(idx, { subtype: e.target.value })}
                                    >
                                      {(WASTE_CATALOG[row.type] || []).map((sub) => (
                                        <option key={`${row.type}-${sub.subtype}`} value={sub.subtype}>
                                          {sub.subtype} ({sub.unitWeightGrams}g)
                                        </option>
                                      ))}
                                    </select>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={row.quantity}
                                      onChange={(e) => updateManualWasteRow(idx, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                                      placeholder="Qty"
                                    />
                                    <Input
                                      type="number"
                                      min={1}
                                      value={row.unitWeightGrams}
                                      onChange={(e) => updateManualWasteRow(idx, { unitWeightGrams: Math.max(1, Number(e.target.value) || row.unitWeightGrams) })}
                                      placeholder="Unit g"
                                    />
                                    <Button type="button" variant="destructive" size="sm" onClick={() => removeManualWasteRow(idx)}>
                                      Remove
                                    </Button>
                                  </div>
                                ))}
                                {manualWasteRows.length > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    Manual estimated weight: {(manualWasteRows.reduce((sum, r) => sum + (r.quantity * r.unitWeightGrams), 0) / 1000).toFixed(3)} kg
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-eco-warning" />Verification Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>AI confidence should be above 85%</p>
              <p>GPS accuracy should be within 2 meters</p>
              <p>Images should clearly show waste and location</p>
              <p>Waste type should match the disposal bin type</p>
            </CardContent>
          </Card>
        </div>
      </main>

      <ImageViewer src={viewerSrc} open={viewerOpen} onClose={() => setViewerOpen(false)} />
    </div>
  );
};

export default Verify;
