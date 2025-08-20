import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { signOut, updateUserRole } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { ReportIncidentDialog } from './ReportIncidentDialog';
import { NotificationsList } from './NotificationsList';
import { 
  Shield, 
  LogOut, 
  AlertTriangle, 
  Video, 
  User,
  History,
  Bell
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
}

const UserDashboard = () => {
  const { profile } = useAuth();
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch reports when profile is available and has user_id
    if (profile?.user_id) {
      fetchReports();
    } else if (profile === null) {
      // Profile is explicitly null (not loading), stop loading
      setLoading(false);
    }
  }, [profile?.user_id]); // Depend on user_id specifically

  const fetchReports = async () => {
    // Guard clause to ensure user_id exists and is not undefined/null
    if (!profile?.user_id || profile.user_id === 'undefined') {
      console.warn('Cannot fetch reports: user_id is not available or invalid');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching reports for user_id:', profile.user_id); // Debug log
      const { data, error } = await supabase
        .from('incident_reports')
        .select('*')
        .eq('reporter_id', profile.user_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
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

  // Show loading state while profile is being fetched
  if (profile === undefined) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state if profile failed to load
  if (profile === null) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-lg">Failed to load user profile</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

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
                  Security Monitor
                </h1>
                <p className="text-primary-foreground/80">
                  Welcome, {profile.full_name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Report incidents or upload surveillance footage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ReportIncidentDialog onReportSubmitted={fetchReports}>
                    <Button className="h-24 flex flex-col items-center justify-center space-y-2">
                      <AlertTriangle className="h-6 w-6" />
                      <span>Report Incident</span>
                    </Button>
                  </ReportIncidentDialog>
                  
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col items-center justify-center space-y-2"
                  >
                    <Video className="h-6 w-6" />
                    <span>Upload Video</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Reports History */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  My Reports
                </CardTitle>
                <CardDescription>
                  View your incident reports and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground">Loading reports...</p>
                ) : reports.length === 0 ? (
                  <p className="text-muted-foreground">No reports submitted yet.</p>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <div key={report.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{report.title}</h4>
                          <Badge className={getStatusColor(report.status)}>
                            {report.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {report.description}
                        </p>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{report.incident_type} • {report.location}</span>
                          <span>{new Date(report.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Profile Info */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Name</p>
                  <p className="text-sm text-muted-foreground">{profile.full_name}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">{profile.address}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{profile.phone_number}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium">Role</p>
                  <Badge variant="secondary">{profile.role}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
                <CardDescription>
                  Recent updates from security officers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NotificationsList userId={profile.user_id} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;