

import { useEffect, useState } from 'react';
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
  Search,
  Filter,
  Eye,
  MessageSquare,
  History as HistoryIcon
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

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
  verificationComment?: string;
  verifiedBy?: string;
  aiAnalysis?: {
    disposalDistance?: number;
    nearestDustbin?: {
      _id?: string;
      name?: string;
      lat?: number;
      lng?: number;
    };
  };
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

const Verify = () => {
  const userType = localStorage.getItem('userType') as 'collector' | 'employee';
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterStatus, setFilterStatus] =
    useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [comments, setComments] = useState('');
  const [points, setPoints] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [dustbinData, setDustbinData] = useState<any>(null);
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);

  const openViewer = (src: string) => {
    setViewerSrc(src);
    setViewerOpen(true);
  };

  // Fetch linked dustbin data when a report is selected
  useEffect(() => {
    if (!selectedReport?.dustbinId) {
      setDustbinData(null);
      return;
    }

    const fetchDustbin = async () => {
      try {
        const res = await apiFetch(`/dustbins/${selectedReport.dustbinId}`);
        if (res.ok) {
          const data = await res.json();
          setDustbinData(data);
        } else {
          console.error("Failed to fetch dustbin details");
          setDustbinData(null);
        }
      } catch (err) {
        console.error("Failed to fetch dustbin details:", err);
        setDustbinData(null);
      }
    };
    fetchDustbin();
  }, [selectedReport]);

  const getDistanceMeters = (
    a?: { lat: number; lng: number },
    b?: { lat: number; lng: number }
  ) => {
    if (!a || !b) return null;
    const R = 6371e3;
    const φ1 = a.lat * Math.PI / 180;
    const φ2 = b.lat * Math.PI / 180;
    const Δφ = (b.lat - a.lat) * Math.PI / 180;
    const Δλ = (b.lng - a.lng) * Math.PI / 180;
    const s1 = Math.sin(Δφ / 2);
    const s2 = Math.sin(Δλ / 2);
    const h = s1 * s1 + Math.cos(φ1) * Math.cos(φ2) * s2 * s2;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return R * c;
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
        console.error(error);
        if (error.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('userType');
          window.location.href = '/';
        } else {
          toast({
            title: "Unable to load reports",
            description: error.message || "Please try again later.",
            variant: "destructive"
          });
        }
      }
    };
    fetchReports();
  }, [toast]);

  useEffect(() => {
    if (!selectedReport) return;
    setComments(selectedReport.verificationComment || '');
    setPoints(selectedReport.points || 0);
  }, [selectedReport]);

  const filteredReports = reports.filter(report => {
    if (filterStatus === 'all') return true;
    return report.status === filterStatus;
  });

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
    setReports(prev => prev.map(r => (r._id === updated._id ? updated : r)));
    setSelectedReport(updated);
  };

  const handleApprove = async (reportId: string) => {
    if (points <= 0) {
      toast({
        title: "Points required",
        description: "Please assign points before approving.",
        variant: "destructive"
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
          verificationComment: comments,
          verifiedBy: userType === 'employee' ? 'Government Officer' : undefined
        })
      });
      const updated = (await res.json()) as Report;
      updateReportInState(updated);
      toast({
        title: "Report Approved",
        description: "The collector has been awarded points and notified."
      });
    } catch (err) {
      const error = err as Error & { message?: string };
      toast({
        title: "Approval Failed",
        description: error.message || "Unable to approve report",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reportId: string) => {
    if (!comments.trim()) {
      toast({
        title: "Comment Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
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
      toast({
        title: "Report Rejected",
        description: "Collector has been notified about the rejection.",
        variant: "destructive",
      });
    } catch (err) {
      const error = err as Error & { message?: string };
      toast({
        title: "Rejection Failed",
        description: error.message || "Unable to reject report",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetails = async (report: Report) => {
    try {
      const res = await apiFetch(`/reports/${report._id || report.id}`);
      const fullReport = await res.json();
      setSelectedReport(fullReport);
    } catch (err: unknown) {
      toast({
        title: "Failed to load report details",
        description: (err as Error)?.message || "Please try again",
        variant: "destructive"
      });
      setSelectedReport(report);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={userType} />

      <main className="lg:ml-64 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <div className="bg-gradient-eco rounded-lg p-5 sm:p-6 text-white">
            <h1 className="text-xl sm:text-2xl font-bold mb-2">
              Verification Center
            </h1>
            <p className="text-white/90 text-sm sm:text-base">
              Review and verify waste collection reports from collectors
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-warning/10 rounded-full">
                    <Clock className="h-6 w-6 text-eco-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Review</p>
                    <p className="text-2xl font-bold text-eco-warning">
                      {reports.filter(r => r.status === 'pending').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-success/10 rounded-full">
                    <CheckCircle className="h-6 w-6 text-eco-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Approved</p>
                    <p className="text-2xl font-bold text-eco-success">
                      {reports.filter(r => r.status === 'approved').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-destructive/10 rounded-full">
                    <X className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rejected</p>
                    <p className="text-2xl font-bold text-destructive">
                      {reports.filter(r => r.status === 'rejected').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-eco-forest-primary/10 rounded-full">
                    <Shield className="h-6 w-6 text-eco-forest-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Reports</p>
                    <p className="text-2xl font-bold">{reports.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Reports List */}
            <div className="lg:col-span-2 space-y-6 order-1">

              {/* Filter */}
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <Select
                    value={filterStatus}
                    onValueChange={(value: 'pending' | 'approved' | 'rejected' | 'all') =>
                      setFilterStatus(value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Reports</SelectItem>
                      <SelectItem value="pending">Pending Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Reports */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-eco-forest-primary" />
                    Waste Collection Reports ({filteredReports.length})
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {filteredReports.map((report) => (
                      <div
                        key={report._id || report.id}
                        className="p-4 sm:p-6 bg-muted/50 rounded-lg space-y-4"
                      >

                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="font-bold text-lg">
                                Report #{(report._id || report.id)?.toString().slice(-6)}
                              </h3>
                              {getStatusBadge(report.status)}
                            </div>
                            {report.collectorEmail && (
                              <p className="text-muted-foreground text-sm">
                                by {report.collectorEmail}
                              </p>
                            )}
                          </div>

                          <Button
                            onClick={() => handleViewDetails(report)}
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                        </div>

                        {/* Locations */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-3 w-3" />
                              <span>
                                Pickup:{' '}
                                {report.pickupLocation
                                  ? `${report.pickupLocation.lat?.toFixed(5)}, ${report.pickupLocation.lng?.toFixed(5)}`
                                  : '—'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {new Date(report.submittedAt).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Disposal:</span>
                              <span className="font-medium">
                                {report.disposalLocation
                                  ? `${report.disposalLocation.lat?.toFixed(5)}, ${report.disposalLocation.lng?.toFixed(5)}`
                                  : '—'}
                              </span>
                            </div>

                            {report.pickupLocation && report.disposalLocation && (
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Pickup → Disposal:</span>
                                <span>
                                  {Math.round(
                                    getDistanceMeters(
                                      report.pickupLocation,
                                      report.disposalLocation
                                    ) || 0
                                  )}{' '}
                                  m
                                </span>
                              </div>
                            )}

                            {typeof report.aiAnalysis?.disposalDistance === 'number' && (
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Disposal → Dustbin:</span>
                                <span>
                                  {Math.round(report.aiAnalysis.disposalDistance)} m
                                </span>
                              </div>
                            )}

                            {report.status === 'approved' && (
                              <div className="flex justify-between text-sm">
                                <span>Points Awarded:</span>
                                <Badge variant="default">
                                  +{report.points || 0} pts
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {report.status === 'pending' && (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end pt-2 border-t gap-2">
                            <Button
                              onClick={() => handleReject(report._id || report.id)}
                              variant="outline"
                              size="sm"
                              className="w-full sm:w-auto"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                            <Button
                              onClick={() => handleApprove(report._id || report.id)}
                              variant="eco"
                              size="sm"
                              className="w-full sm:w-auto"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                          </div>
                        )}

                        {/* Verification Comment */}
                        {(report.status === 'approved' || report.status === 'rejected') &&
                          report.verificationComment && (
                            <div className="pt-2 border-t">
                              <div className="flex items-start gap-2 text-sm">
                                <MessageSquare className="h-3 w-3 mt-1" />
                                <div>
                                  <p className="font-medium">
                                    Verification Comment:
                                  </p>
                                  <p className="text-muted-foreground">
                                    {report.verificationComment}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    - {report.verifiedBy}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Detailed View */}
            <div className="space-y-6 order-2 lg:order-none">
              {selectedReport ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5 text-eco-forest-primary" />
                      Report Details
                    </CardTitle>
                    <CardDescription>
                      Review images and locations for Report #
                      {(selectedReport._id || selectedReport.id)
                        ?.toString()
                        .slice(-6)}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">

                    {/* Distance Verification */}
                    <div className="bg-muted/30 p-4 rounded-lg border">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Distance Verification (1m Precision)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Calculated Distance</p>
                          <div className="flex items-baseline gap-2">
                            <span className={`text-2xl font-bold ${(selectedReport.aiAnalysis?.disposalDistance || 0) <= 1
                              ? 'text-eco-success'
                              : 'text-destructive'
                              }`}>
                              {selectedReport.aiAnalysis?.disposalDistance?.toFixed(2) || 'N/A'}m
                            </span>
                          </div>
                          <div className={`text-xs font-medium px-2 py-1 rounded inline-block ${(selectedReport.aiAnalysis?.disposalDistance || 0) <= 1
                            ? 'bg-eco-success/10 text-eco-success'
                            : 'bg-destructive/10 text-destructive'
                            }`}>
                            {(selectedReport.aiAnalysis?.disposalDistance || 0) <= 1
                              ? '✓ Within Range (≤ 1m)'
                              : '⚠ Out of Range (> 1m)'}
                          </div>
                        </div>
                        <div className="space-y-2 text-xs overflow-hidden">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-muted-foreground whitespace-nowrap">Dustbin Coords:</span>
                            <span className="font-mono truncate" title={`${dustbinData?.coordinates?.lat !== undefined
                              ? dustbinData.coordinates.lat.toFixed(6)
                              : '—'
                              }, ${dustbinData?.coordinates?.lng !== undefined
                                ? dustbinData.coordinates.lng.toFixed(6)
                                : '—'
                              }`}>
                              {dustbinData?.coordinates?.lat !== undefined
                                ? dustbinData.coordinates.lat.toFixed(6)
                                : '—'
                              }, {dustbinData?.coordinates?.lng !== undefined
                                ? dustbinData.coordinates.lng.toFixed(6)
                                : '—'
                              }
                            </span>
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-muted-foreground whitespace-nowrap">Report Coords:</span>
                            <span className="font-mono truncate" title={`${selectedReport.disposalLocation?.lat !== undefined
                              ? selectedReport.disposalLocation.lat.toFixed(6)
                              : '—'
                              }, ${selectedReport.disposalLocation?.lng !== undefined
                                ? selectedReport.disposalLocation.lng.toFixed(6)
                                : '—'
                              }`}>
                              {selectedReport.disposalLocation?.lat !== undefined
                                ? selectedReport.disposalLocation.lat.toFixed(6)
                                : '—'
                              }, {selectedReport.disposalLocation?.lng !== undefined
                                ? selectedReport.disposalLocation.lng.toFixed(6)
                                : '—'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Image History Comparison */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <HistoryIcon className="h-4 w-4" />
                        Visual Evidence Comparison
                      </h3>
                      <div className="flex flex-col gap-6">
                        {/* 1. Initial State */}
                        <div className="space-y-2 w-full">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium">Initial Deployment</span>
                            <Badge variant="outline" className="text-[10px]">Reference</Badge>
                          </div>
                          <div className="w-full bg-muted rounded-lg overflow-hidden border relative">
                            {dustbinData?.initialPhotoBase64 ? (
                              <>
                                <img
                                  src={dustbinData.initialPhotoBase64.startsWith('data:') ? dustbinData.initialPhotoBase64 : `data:image/png;base64,${dustbinData.initialPhotoBase64}`}
                                  alt="Initial State"
                                  className="w-full h-auto object-contain bg-black"
                                />
                                <div className="flex justify-end mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      openViewer(
                                        dustbinData.initialPhotoBase64.startsWith('http') || dustbinData.initialPhotoBase64.startsWith('data:')
                                          ? dustbinData.initialPhotoBase64
                                          : `data:image/png;base64,${dustbinData.initialPhotoBase64}`
                                      )
                                    }
                                    className="flex items-center gap-1"
                                  >
                                    <Eye className="h-4 w-4" />
                                    Maximize
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                                No initial photo
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 2. Previous Verified State */}
                        <div className="space-y-2 w-full">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium">Latest Verified</span>
                            <Badge variant="outline" className="text-[10px]">Before Report</Badge>
                          </div>
                          <div className="w-full bg-muted rounded-lg overflow-hidden border relative">
                            {dustbinData?.photoBase64 ? (
                              <>
                                <img
                                  src={dustbinData.photoBase64.startsWith('data:') ? dustbinData.photoBase64 : `data:image/png;base64,${dustbinData.photoBase64}`}
                                  alt="Previous State"
                                  className="w-full h-auto object-contain bg-black"
                                />
                                <div className="flex justify-end mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      openViewer(
                                        dustbinData.photoBase64.startsWith('http') || dustbinData.photoBase64.startsWith('data:')
                                          ? dustbinData.photoBase64
                                          : `data:image/png;base64,${dustbinData.photoBase64}`
                                      )
                                    }
                                    className="flex items-center gap-1"
                                  >
                                    <Eye className="h-4 w-4" />
                                    Maximize
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                                No previous photo
                              </div>
                            )}
                          </div>
                          {dustbinData?.photoHistory && dustbinData.photoHistory.length > 0 && (
                            <div className="pt-2">
                              <p className="text-[10px] text-muted-foreground mb-1 font-medium">History (Last 3)</p>
                              <div className="flex flex-col gap-2">
                                {[...dustbinData.photoHistory].reverse().slice(0, 3).map((hist: any, idx: number) => (
                                  <div key={idx} className="w-full bg-muted rounded overflow-hidden border relative" title={new Date(hist.updatedAt).toLocaleDateString()}>
                                    <img
                                      src={hist.photo.startsWith('data:') ? hist.photo : `data:image/png;base64,${hist.photo}`}
                                      alt={`History ${idx + 1}`}
                                      className="w-full h-auto object-contain bg-black rounded"
                                    />
                                    <div className="flex justify-end mt-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          openViewer(
                                            hist.photo.startsWith('http') || hist.photo.startsWith('data:')
                                              ? hist.photo
                                              : `data:image/png;base64,${hist.photo}`
                                          )
                                        }
                                        className="flex items-center gap-1"
                                      >
                                        <Eye className="h-4 w-4" />
                                        Maximize
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 3. Pickup Image */}
                        <div className="space-y-2 w-full">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium">Pickup Image</span>
                            <Badge variant="secondary" className="text-[10px]">Collection</Badge>
                          </div>
                          <div className="w-full bg-muted rounded-lg overflow-hidden border relative">
                            {(selectedReport.pickupImageBase64 || selectedReport.pickupImage) ? (
                              (() => {
                                const img = selectedReport.pickupImageBase64 || selectedReport.pickupImage || '';
                                const src = (img.startsWith('http') || img.startsWith('data:')) ? img : `data:image/png;base64,${img}`;
                                return (
                                  <>
                                    <img
                                      src={src}
                                      alt="Pickup Evidence"
                                      className="w-full h-auto object-contain bg-black"
                                    />
                                    <div className="flex justify-end mt-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openViewer(src)}
                                        className="flex items-center gap-1"
                                      >
                                        <Eye className="h-4 w-4" />
                                        Maximize
                                      </Button>
                                    </div>
                                  </>
                                );
                              })()
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                                No pickup photo
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 4. Disposal Image (Report Image) */}
                        <div className="space-y-2 w-full">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium">Disposal Image</span>
                            <Badge variant={selectedReport.status === 'approved' ? 'default' : 'secondary'} className="text-[10px]">
                              {selectedReport.status === 'pending' ? 'New Evidence' : 'Reported'}
                            </Badge>
                          </div>
                          <div className="w-full bg-muted rounded-lg overflow-hidden border-2 border-primary relative">
                            {(selectedReport.disposalImageBase64 || selectedReport.disposalImage) ? (
                              (() => {
                                const img = selectedReport.disposalImageBase64 || selectedReport.disposalImage || '';
                                const src = (img.startsWith('http') || img.startsWith('data:')) ? img : `data:image/png;base64,${img}`;
                                return (
                                  <>
                                    <img
                                      src={src}
                                      alt="Disposal Evidence"
                                      className="w-full h-auto object-contain bg-black"
                                    />
                                    <div className="flex justify-end mt-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openViewer(src)}
                                        className="flex items-center gap-1"
                                      >
                                        <Eye className="h-4 w-4" />
                                        Maximize
                                      </Button>
                                    </div>
                                  </>
                                );
                              })()
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                                No disposal photo
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Form */}
                    {selectedReport.status === 'pending' && (
                      <div className="space-y-4 pt-4 border-t">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Points to Award</label>
                          <Input
                            type="number"
                            value={points}
                            onChange={(e) => setPoints(Number(e.target.value))}
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Comments</label>
                          <Textarea
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder="Add verification notes..."
                            className="bg-background"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            onClick={() => handleReject(selectedReport._id || selectedReport.id!)}
                            disabled={actionLoading}
                            variant="destructive"
                            className="w-full"
                          >
                            Reject
                          </Button>
                          <Button
                            onClick={() => handleApprove(selectedReport._id || selectedReport.id!)}
                            disabled={actionLoading}
                            className="w-full bg-eco-success hover:bg-eco-success/90"
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Read Only View for Processed Reports */}
                    {selectedReport.status !== 'pending' && (
                      <div className="bg-muted/30 p-6 rounded-lg border">
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-muted-foreground">Verification Comment</p>
                            <p className="mt-1">{selectedReport.verificationComment || "No comments"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-muted-foreground">Awarded Points</p>
                            <p className="text-2xl font-bold text-primary">{selectedReport.points}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">No Report Selected</h3>
                    <p className="text-sm text-muted-foreground">
                      Select a report from the list to view detailed information
                      and verification options.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Guidelines */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-eco-warning" />
                    Verification Guidelines
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-eco-success rounded-full mt-2"></div>
                    <span>AI confidence should be above 85%</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-eco-success rounded-full mt-2"></div>
                    <span>GPS accuracy should be within 2 meters</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-eco-success rounded-full mt-2"></div>
                    <span>Images should clearly show waste and location</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-eco-success rounded-full mt-2"></div>
                    <span>Waste type should match the disposal bin type</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <ImageViewer
        src={viewerSrc}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
};

export default Verify;