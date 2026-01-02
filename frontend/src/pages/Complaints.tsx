import { useState, useEffect } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare,
  AlertTriangle,
  Lightbulb,
  Camera,
  MapPin,
  Send,
  Plus,
  Eye,
  Globe
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getReliableLocation } from '@/lib/location';

type ComplaintType = 'complaint' | 'suggestion' | 'issue';
type ComplaintStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

type Complaint = {
  _id: string;
  type: ComplaintType;
  title: string;
  description: string;
  photoBase64?: string;
  location: { lat: number; lng: number };
  citizenName: string;
  citizenEmail: string;
  citizenPhone?: string;
  status: ComplaintStatus;
  priority: Priority;
  createdAt: string;
  resolutionComment?: string;
};

const Complaints = () => {
  const userType = localStorage.getItem('userType') as 'collector' | 'employee';
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | ComplaintStatus>('all');
  const [resolutionText, setResolutionText] = useState('');
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    type: 'complaint' as ComplaintType,
    title: '',
    description: '',
    citizenName: '',
    citizenEmail: '',
    citizenPhone: '',
    priority: 'medium' as Priority,
    location: { lat: 0, lng: 0 },
    photoBase64: ''
  });

  useEffect(() => {
    fetchComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedComplaint) {
      setResolutionText(selectedComplaint.resolutionComment || '');
    }
  }, [selectedComplaint]);

  const fetchComplaints = async () => {
    try {
      const res = await apiFetch('/complaints');
      const data = await res.json();
      setComplaints(data);
    } catch (err) {
      toast({
        title: "Failed to load complaints",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  };

  const updateComplaintStatus = async (complaintId: string, status: ComplaintStatus, resolutionComment?: string) => {
    try {
      const res = await apiFetch(`/complaints/${complaintId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, resolutionComment })
      });
      
      if (res.ok) {
        toast({
          title: "Complaint Updated",
          description: `Status changed to ${status.replace('_', ' ').toUpperCase()}`
        });
        fetchComplaints();
        setSelectedComplaint(null);
      }
    } catch (err) {
      toast({
        title: "Update Failed",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  };

  const filteredComplaints = complaints.filter(complaint => {
    if (filterStatus === 'all') return true;
    return complaint.status === filterStatus;
  });

  const getCurrentLocation = async () => {
    try {
      const coords = await getReliableLocation();
      setFormData(prev => ({
        ...prev,
        location: coords
      }));
      toast({ title: 'Location captured', description: 'Coordinates filled from your device.' });
    } catch (e) {
      toast({
        title: 'Location Error',
        description: (e as Error)?.message || 'Could not get your location. Please enable GPS or enter coordinates manually.',
        variant: 'destructive'
      });
    }
  };

  const getNetworkLocation = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) throw new Error('Network geolocation service unavailable');
      const data = await res.json();
      if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        setFormData(prev => ({
          ...prev,
          location: { lat: data.latitude, lng: data.longitude }
        }));
        toast({ title: 'Approximate location set', description: 'Filled using network location (IP-based).' });
      } else if (data.lat && data.lon) {
        setFormData(prev => ({
          ...prev,
          location: { lat: Number(data.lat), lng: Number(data.lon) }
        }));
        toast({ title: 'Approximate location set', description: 'Filled using network location (IP-based).' });
      } else {
        throw new Error('Could not parse network location');
      }
    } catch (e: unknown) {
      toast({ title: 'Network Location Error', description: (e as Error)?.message || 'Unable to fetch approximate location.', variant: 'destructive' });
    }
  };

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          photoBase64: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await apiFetch('/complaints', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast({
          title: "Complaint Submitted",
          description: "Your complaint has been submitted successfully."
        });
        setShowForm(false);
        setFormData({
          type: 'complaint',
          title: '',
          description: '',
          citizenName: '',
          citizenEmail: '',
          citizenPhone: '',
          priority: 'medium',
          location: { lat: 0, lng: 0 },
          photoBase64: ''
        });
        fetchComplaints();
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Submission failed');
      }
    } catch (err: unknown) {
      toast({
        title: "Submission Failed",
        description: (err as Error).message || "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    const variants = {
      pending: 'secondary',
      in_progress: 'default',
      resolved: 'default',
      rejected: 'destructive'
    } as const;

    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: Priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };

    return (
      <Badge variant="outline" className={colors[priority]}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const getTypeIcon = (type: ComplaintType) => {
    switch (type) {
      case 'complaint': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'suggestion': return <Lightbulb className="h-4 w-4 text-yellow-500" />;
      case 'issue': return <MessageSquare className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={userType} />
      <main className="lg:ml-64 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-gradient-eco rounded-lg p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">
              {userType === 'employee' ? 'Review Citizen Complaints' : 'Citizen Complaints & Suggestions'}
            </h1>
            <p className="text-white/90">
              {userType === 'employee' 
                ? 'Review and manage complaints, issues, and suggestions from citizens'
                : 'Report issues, complaints, and suggestions from your community'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Complaints List */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-eco-forest-primary" />
                      Recent Submissions ({filteredComplaints.length})
                    </CardTitle>
                    {userType === 'collector' && (
                      <Button onClick={() => setShowForm(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Complaint
                      </Button>
                    )}
                  </div>
                  {userType === 'employee' && (
                    <div className="flex gap-2">
                      <Select value={filterStatus} onValueChange={(value: 'all' | ComplaintStatus) => setFilterStatus(value)}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredComplaints.map((complaint) => (
                      <div key={complaint._id} className="p-6 bg-muted/50 rounded-lg space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              {getTypeIcon(complaint.type)}
                              <h3 className="font-bold text-lg">{complaint.title}</h3>
                              {getStatusBadge(complaint.status)}
                            </div>
                            <p className="text-muted-foreground">by {complaint.citizenName}</p>
                          </div>
                          <Button 
                            onClick={() => setSelectedComplaint(complaint)}
                            variant="outline" 
                            size="sm"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm">{complaint.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{complaint.location.lat.toFixed(6)}, {complaint.location.lng.toFixed(6)}</span>
                            </div>
                            <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
                            {getPriorityBadge(complaint.priority)}
                          </div>
                        </div>

                        {complaint.resolutionComment && (
                          <div className="pt-2 border-t">
                            <p className="text-sm font-medium text-green-700">Resolution:</p>
                            <p className="text-sm text-muted-foreground">{complaint.resolutionComment}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Form or Details */}
            <div className="space-y-6">
              {showForm && userType === 'collector' ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Submit New Complaint</CardTitle>
                    <CardDescription>Report an issue or share a suggestion</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Type</label>
                        <Select value={formData.type} onValueChange={(value: ComplaintType) => setFormData(prev => ({ ...prev, type: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="complaint">Complaint</SelectItem>
                            <SelectItem value="suggestion">Suggestion</SelectItem>
                            <SelectItem value="issue">Issue</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Priority</label>
                        <Select value={formData.priority} onValueChange={(value: Priority) => setFormData(prev => ({ ...prev, priority: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Input
                        placeholder="Title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        required
                      />

                      <Textarea
                        placeholder="Describe the issue or suggestion..."
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        required
                      />

                      <Input
                        placeholder="Your Name"
                        value={formData.citizenName}
                        onChange={(e) => setFormData(prev => ({ ...prev, citizenName: e.target.value }))}
                        required
                      />

                      <Input
                        type="email"
                        placeholder="Your Email"
                        value={formData.citizenEmail}
                        onChange={(e) => setFormData(prev => ({ ...prev, citizenEmail: e.target.value }))}
                        required
                      />

                      <Input
                        type="tel"
                        placeholder="Your Phone (Optional)"
                        value={formData.citizenPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, citizenPhone: e.target.value }))}
                      />

                      <div>
                        <label className="text-sm font-medium">Photo (Optional)</label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoCapture}
                          className="mt-1"
                        />
                        {formData.photoBase64 && (
                          <img
                            src={formData.photoBase64}
                            alt="Preview"
                            className="mt-2 w-full h-32 object-cover rounded"
                          />
                        )}
                      </div>

                      <div>
                        <label className="text-sm font-medium">Location</label>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <Input
                            placeholder="Latitude"
                            value={formData.location.lat}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              location: { ...prev.location, lat: parseFloat(e.target.value) || 0 }
                            }))}
                            required
                          />
                          <Input
                            placeholder="Longitude"
                            value={formData.location.lng}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              location: { ...prev.location, lng: parseFloat(e.target.value) || 0 }
                            }))}
                            required
                          />
                          <Button type="button" onClick={getCurrentLocation} variant="outline">
                            <MapPin className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-2">
                          <Button
                            type="button"
                            onClick={getNetworkLocation}
                            variant="secondary"
                            className="gap-2 whitespace-nowrap shadow-sm"
                            title="Approximate location via network/IP"
                          >
                            <Globe className="h-4 w-4" />
                            Use Network Location
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Tip: If precise GPS fails, try "Use Network Location" or enter coordinates manually.</p>
                      </div>

                      <div className="flex gap-2">
                        <Button type="submit" disabled={loading} className="flex-1">
                          <Send className="mr-2 h-4 w-4" />
                          {loading ? 'Submitting...' : 'Submit'}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              ) : selectedComplaint ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getTypeIcon(selectedComplaint.type)}
                      {selectedComplaint.title}
                    </CardTitle>
                    <CardDescription>
                      {getStatusBadge(selectedComplaint.status)} {getPriorityBadge(selectedComplaint.priority)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedComplaint.photoBase64 && (
                      <div>
                        <h4 className="font-medium mb-2">Photo</h4>
                        <img
                          src={selectedComplaint.photoBase64}
                          alt="Complaint photo"
                          className="w-full h-48 object-cover rounded"
                        />
                      </div>
                    )}

                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm">{selectedComplaint.description}</p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Contact Information</h4>
                      <div className="text-sm space-y-1">
                        <p><strong>Name:</strong> {selectedComplaint.citizenName}</p>
                        <p><strong>Email:</strong> {selectedComplaint.citizenEmail}</p>
                        {selectedComplaint.citizenPhone && (
                          <p><strong>Phone:</strong> {selectedComplaint.citizenPhone}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Location</h4>
                      <div className="text-sm">
                        <p>Lat: {selectedComplaint.location.lat.toFixed(6)}</p>
                        <p>Lng: {selectedComplaint.location.lng.toFixed(6)}</p>
                      </div>
                    </div>

                    {selectedComplaint.resolutionComment && (
                      <div>
                        <h4 className="font-medium mb-2">Resolution</h4>
                        <p className="text-sm">{selectedComplaint.resolutionComment}</p>
                      </div>
                    )}

                    {userType === 'employee' && (
                      <div className="space-y-3 pt-2 border-t">
                        <h4 className="font-medium">Review Actions</h4>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Resolution Comment (optional)</label>
                          <Textarea
                            placeholder="Add a note or resolution details..."
                            value={resolutionText}
                            onChange={(e) => setResolutionText(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            onClick={() => updateComplaintStatus(selectedComplaint._id, 'in_progress', resolutionText)}
                          >
                            Mark In Progress
                          </Button>
                          <Button
                            variant="eco"
                            onClick={() => updateComplaintStatus(selectedComplaint._id, 'resolved', resolutionText)}
                          >
                            Resolve
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => updateComplaintStatus(selectedComplaint._id, 'rejected', resolutionText)}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}

                    <Button variant="outline" onClick={() => setSelectedComplaint(null)} className="w-full">
                      Close
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">No Selection</h3>
                    <p className="text-sm text-muted-foreground">
                      Select a complaint to view details or create a new one.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Complaints;
