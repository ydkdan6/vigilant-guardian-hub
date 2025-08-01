import { useAuth } from '@/hooks/useAuth';
import UserDashboard from './UserDashboard';
import OfficerDashboard from './OfficerDashboard';
import { Loader2 } from 'lucide-react';

const Dashboard = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen gradient-primary flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen gradient-primary flex items-center justify-center">
        <p className="text-primary-foreground">Loading profile...</p>
      </div>
    );
  }

  return profile.role === 'officer' ? <OfficerDashboard /> : <UserDashboard />;
};

export default Dashboard;