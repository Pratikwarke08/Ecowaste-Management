import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';
import { Clock, Eye, CheckCircle, X } from 'lucide-react';

interface PendingReport {
  _id: string;
  collectorEmail?: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  pickupLocation?: { lat: number; lng: number };
  disposalLocation?: { lat: number; lng: number };
}

const PendingReviews = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<PendingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const res = await apiFetch('/reports');
        const data = await res.json();
        const reportsList = Array.isArray(data) ? data : (data.reports || []);
        const pending = reportsList.filter((r: PendingReport) => r.status === 'pending');
        setReports(pending);
      } catch (err) {
        const error = err as Error & { status?: number; message?: string };
        console.error(error);
        setError(error.message || 'Failed to load pending reports');
        if (error.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('userType');
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="employee" />
      <main className="lg:ml-64 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-gradient-eco rounded-lg p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">Pending Reviews</h1>
            <p className="text-white/90">All collections awaiting review</p>
          </div>

          {error && (
            <Card className="border-destructive">
              <CardContent className="p-4 text-destructive flex items-center gap-3">
                <X className="h-5 w-5" />
                <span>{error}</span>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-eco-warning" />
                Pending Reports ({reports.length})
              </CardTitle>
              <CardDescription>Reports waiting for verification</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading reports...</p>
              ) : reports.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-eco-success mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">No pending reports at this time.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div key={report._id} className="p-4 bg-muted/50 rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-bold">Report #{report._id.slice(-6)}</h3>
                            <Badge variant="secondary" className="bg-eco-warning/10 text-eco-warning">
                              Pending
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Collector: {report.collectorEmail || 'Unknown'}</p>
                            <p>Submitted: {new Date(report.submittedAt).toLocaleString()}</p>
                            {report.pickupLocation && (
                              <p>Pickup: {report.pickupLocation.lat.toFixed(5)}, {report.pickupLocation.lng.toFixed(5)}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => navigate('/verify')}
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PendingReviews;