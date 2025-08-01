import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { signOut } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { SendNotificationDialog } from './SendNotificationDialog';
import { 
  Shield, 
  LogOut, 
  AlertTriangle, 
  Users,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare
} from 'lucide-react';

interface IncidentReport {
  id: string;
  title: string;
  description: string;
  incident_type: string;
  location: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  video_url?: string;
  created_at: string;
  reporter_id: string;
  profiles: {
    full_name: string;
    phone_number: string;
    address: string;
    email: string;
  };
}

const OfficerDashboard = () => {
  const { profile } = useAuth();
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<IncidentReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
    
    // Set up real-time subscription for new reports
    const channel = supabase
      .channel('incident-reports')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'incident_reports'
        },
        () => {
          fetchReports();
          toast({
            title: 'New Incident Report',
            description: 'A new incident has been reported',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('incident_reports')
        .select(`
          *,
          profiles!incident_reports_reporter_id_fkey (
            full_name,
            phone_number,
            address,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch reports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId: string, status: 'pending' | 'in_progress' | 'resolved' | 'closed') => {
    try {
      const { error } = await supabase
        .from('incident_reports')
        .update({ 
          status,
          assigned_officer_id: profile?.user_id 
        })
        .eq('id', reportId);

      if (error) throw error;
      
      fetchReports();
      toast({
        title: 'Success',
        description: 'Report status updated successfully',
      });
    } catch (error) {
      console.error('Error updating report status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update report status',
        variant: 'destructive',
      });
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      window.location.href = '/auth';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (type: string) => {
    const highPriority = ['emergency', 'violence', 'fire', 'medical'];
    return highPriority.includes(type.toLowerCase()) 
      ? 'border-l-red-500' 
      : 'border-l-yellow-500';
  };

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <header className="gradient-primary shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-primary-foreground" />
              <div>
                <h1 className="text-2xl font-bold text-primary-foreground">
                  Security Control Center
                </h1>
                <p className="text-primary-foreground/80">
                  Officer Dashboard - {profile?.full_name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20">
                Officer Access
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-card">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{reports.filter(r => r.status === 'pending').length}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Eye className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{reports.filter(r => r.status === 'in_progress').length}</p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{reports.filter(r => r.status === 'resolved').length}</p>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <XCircle className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{reports.filter(r => r.status === 'closed').length}</p>
                  <p className="text-sm text-muted-foreground">Closed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Incident Reports */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Incident Reports
            </CardTitle>
            <CardDescription>
              Monitor and respond to security incidents in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading reports...</p>
            ) : reports.length === 0 ? (
              <p className="text-muted-foreground">No reports available.</p>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div 
                    key={report.id} 
                    className={`border rounded-lg p-6 border-l-4 ${getPriorityColor(report.incident_type)} cursor-pointer hover:shadow-md transition-shadow`}
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-lg">{report.title}</h4>
                          <Badge className={getStatusColor(report.status)}>
                            {report.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline">
                            {report.incident_type}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-3">
                          {report.description}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-foreground">Reporter</p>
                            <p className="text-muted-foreground">{report.profiles.full_name}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Phone</p>
                            <p className="text-muted-foreground">{report.profiles.phone_number}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Location</p>
                            <p className="text-muted-foreground">{report.location}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Reported</p>
                            <p className="text-muted-foreground">
                              {new Date(report.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="flex flex-wrap gap-2">
                      {report.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateReportStatus(report.id, 'in_progress');
                          }}
                        >
                          Take Action
                        </Button>
                      )}
                      
                      {report.status === 'in_progress' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateReportStatus(report.id, 'resolved');
                            }}
                          >
                            Mark Resolved
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateReportStatus(report.id, 'closed');
                            }}
                          >
                            Close
                          </Button>
                        </>
                      )}

                      <SendNotificationDialog 
                        report={report}
                        officerId={profile?.user_id}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Send Update
                        </Button>
                      </SendNotificationDialog>

                      {report.video_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(report.video_url, '_blank');
                          }}
                        >
                          View Video
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OfficerDashboard;