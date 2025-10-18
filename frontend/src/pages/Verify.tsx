import { useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  MessageSquare
} from 'lucide-react';

const Verify = () => {
  const userType = localStorage.getItem('userType') as 'collector' | 'employee';
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [comments, setComments] = useState('');
  const { toast } = useToast();

  const reports = [
    {
      id: 'WR001',
      collectorName: 'Priya Sharma',
      collectId: 'COL001',
      wasteType: 'Mixed Plastic',
      estimatedWeight: 8.5,
      points: 85,
      location: 'Main Market, Sector 12',
      submittedAt: '2024-01-06T14:30:00Z',
      status: 'pending',
      pickupImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjEwMCIgeT0iNzUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2YjcyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCI+UGlja3VwIEltYWdlPC90ZXh0Pjwvc3ZnPg==',
      disposalImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjEwMCIgeT0iNzUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2YjcyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCI+RGlzcG9zYWwgSW1hZ2U8L3RleHQ+PC9zdmc+',
      aiConfidence: 92,
      gpsAccuracy: 0.8,
      urgency: 'medium'
    },
    {
      id: 'WR002',
      collectorName: 'Raj Kumar',
      collectId: 'COL002',
      wasteType: 'Organic Waste',
      estimatedWeight: 12.3,
      points: 123,
      location: 'Community Center, Sector 15',
      submittedAt: '2024-01-06T12:15:00Z',
      status: 'pending',
      pickupImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjEwMCIgeT0iNzUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2YjcyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCI+UGlja3VwIEltYWdlPC90ZXh0Pjwvc3ZnPg==',
      disposalImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjEwMCIgeT0iNzUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2YjcyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCI+RGlzcG9zYWwgSW1hZ2U8L3RleHQ+PC9zdmc+',
      aiConfidence: 89,
      gpsAccuracy: 1.2,
      urgency: 'high'
    },
    {
      id: 'WR003',
      collectorName: 'Sneha Patel',
      collectId: 'COL003',
      wasteType: 'Paper & Cardboard',
      estimatedWeight: 5.7,
      points: 57,
      location: 'School Campus, Sector 8',
      submittedAt: '2024-01-06T09:45:00Z',
      status: 'approved',
      pickupImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjEwMCIgeT0iNzUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2YjcyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCI+UGlja3VwIEltYWdlPC90ZXh0Pjwvc3ZnPg==',
      disposalImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjEwMCIgeT0iNzUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2YjcyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCI+RGlzcG9zYWwgSW1hZ2U8L3RleHQ+PC9zdmc+',
      aiConfidence: 96,
      gpsAccuracy: 0.5,
      urgency: 'low',
      verifiedBy: 'Employee 001',
      verificationComment: 'Excellent work! Proper waste segregation and accurate location.'
    },
    {
      id: 'WR004',
      collectorName: 'Amit Singh',
      collectId: 'COL004',
      wasteType: 'Glass Bottles',
      estimatedWeight: 15.2,
      points: 152,
      location: 'Bus Stand, Sector 18',
      submittedAt: '2024-01-05T16:20:00Z',
      status: 'rejected',
      pickupImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjEwMCIgeT0iNzUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2YjcyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCI+UGlja3VwIEltYWdlPC90ZXh0Pjwvc3ZnPg==',
      disposalImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjEwMCIgeT0iNzUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2YjcyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCI+RGlzcG9zYWwgSW1hZ2U8L3RleHQ+PC9zdmc+',
      aiConfidence: 75,
      gpsAccuracy: 3.2,
      urgency: 'low',
      verifiedBy: 'Employee 002',
      verificationComment: 'GPS accuracy too low. Please ensure proper location verification.'
    },
  ];

  const filteredReports = reports.filter(report => {
    if (filterStatus === 'all') return true;
    return report.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
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

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return <Badge variant="destructive">High Priority</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-eco-warning/10 text-eco-warning">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low Priority</Badge>;
      default:
        return <Badge variant="outline">{urgency}</Badge>;
    }
  };

  const handleApprove = (reportId: string) => {
    toast({
      title: "Report Approved",
      description: `Report ${reportId} has been approved successfully!`,
    });
    setSelectedReport(null);
    setComments('');
  };

  const handleReject = (reportId: string) => {
    if (!comments.trim()) {
      toast({
        title: "Comment Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Report Rejected",
      description: `Report ${reportId} has been rejected.`,
      variant: "destructive",
    });
    setSelectedReport(null);
    setComments('');
  };

  const handleViewDetails = (report: any) => {
    setSelectedReport(report);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={userType} />
      <main className="lg:ml-64 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-gradient-eco rounded-lg p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">Verification Center</h1>
            <p className="text-white/90">Review and verify waste collection reports from collectors</p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
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
              <CardContent className="p-6">
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
              <CardContent className="p-6">
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
              <CardContent className="p-6">
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Reports List */}
            <div className="lg:col-span-2 space-y-6">
              {/* Filter */}
              <Card>
                <CardContent className="p-6">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
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
                      <div key={report.id} className="p-6 bg-muted/50 rounded-lg space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-bold text-lg">Report #{report.id}</h3>
                              {getStatusBadge(report.status)}
                              {getUrgencyBadge(report.urgency)}
                            </div>
                            <p className="text-muted-foreground">by {report.collectorName}</p>
                          </div>
                          <Button 
                            onClick={() => handleViewDetails(report)}
                            variant="outline" 
                            size="sm"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-3 w-3" />
                              <span>{report.location}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(report.submittedAt).toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Waste Type:</span>
                              <Badge variant="outline">{report.wasteType}</Badge>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Weight:</span>
                              <span className="font-medium">{report.estimatedWeight} kg</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Points:</span>
                              <span className="font-medium text-eco-forest-primary">{report.points} pts</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>AI Confidence: {report.aiConfidence}%</span>
                            <span>GPS Accuracy: {report.gpsAccuracy}m</span>
                          </div>
                          
                          {report.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button 
                                onClick={() => handleReject(report.id)}
                                variant="outline" 
                                size="sm"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                              <Button 
                                onClick={() => handleApprove(report.id)}
                                variant="eco" 
                                size="sm"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                            </div>
                          )}
                        </div>

                        {(report.status === 'approved' || report.status === 'rejected') && report.verificationComment && (
                          <div className="pt-2 border-t">
                            <div className="flex items-start gap-2 text-sm">
                              <MessageSquare className="h-3 w-3 mt-1" />
                              <div>
                                <p className="font-medium">Verification Comment:</p>
                                <p className="text-muted-foreground">{report.verificationComment}</p>
                                <p className="text-xs text-muted-foreground mt-1">- {report.verifiedBy}</p>
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
            <div className="space-y-6">
              {selectedReport ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5 text-eco-forest-primary" />
                      Report Details
                    </CardTitle>
                    <CardDescription>
                      Review images and AI analysis for Report #{selectedReport.id}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Pickup Image</h4>
                        <img 
                          src={selectedReport.pickupImage} 
                          alt="Waste pickup" 
                          className="w-full h-32 object-cover rounded border"
                        />
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Disposal Image</h4>
                        <img 
                          src={selectedReport.disposalImage} 
                          alt="Waste disposal" 
                          className="w-full h-32 object-cover rounded border"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">AI Analysis</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Confidence Score:</span>
                          <Badge variant={selectedReport.aiConfidence >= 90 ? 'default' : 'secondary'}>
                            {selectedReport.aiConfidence}%
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>GPS Accuracy:</span>
                          <Badge variant={selectedReport.gpsAccuracy <= 1 ? 'default' : 'secondary'}>
                            {selectedReport.gpsAccuracy}m
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {selectedReport.status === 'pending' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Verification Comments</label>
                          <Textarea
                            placeholder="Add comments about this report..."
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            rows={3}
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleReject(selectedReport.id)}
                            variant="outline" 
                            className="flex-1"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                          <Button 
                            onClick={() => handleApprove(selectedReport.id)}
                            variant="eco" 
                            className="flex-1"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
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
                      Select a report from the list to view detailed information and verification options.
                    </p>
                  </CardContent>
                </Card>
              )}

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
    </div>
  );
};

export default Verify;