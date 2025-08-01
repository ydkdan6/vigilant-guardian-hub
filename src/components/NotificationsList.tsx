import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  message: string;
  status: 'sent' | 'acknowledged' | 'resolved';
  created_at: string;
  acknowledged_at?: string;
  incident_id: string;
  officer_id: string;
}

interface NotificationsListProps {
  userId?: string;
}

export const NotificationsList = ({ userId }: NotificationsListProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
    fetchNotifications();
    
    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'distress_notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchNotifications();
          toast({
            title: 'New Notification',
            description: 'You have received a new update from security',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchNotifications = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('distress_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('distress_notifications')
        .update({ 
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;
      
      fetchNotifications();
      toast({
        title: 'Acknowledged',
        description: 'Notification acknowledged successfully',
      });
    } catch (error) {
      console.error('Error acknowledging notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to acknowledge notification',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'acknowledged':
        return 'bg-green-100 text-green-800';
      case 'resolved':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading notifications...</p>;
  }

  if (notifications.length === 0) {
    return <p className="text-sm text-muted-foreground">No notifications yet.</p>;
  }

  return (
    <div className="space-y-4">
      {notifications.map((notification, index) => (
        <div key={notification.id}>
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <Badge className={getStatusColor(notification.status)}>
                {notification.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </span>
            </div>
            
            <p className="text-sm">{notification.message}</p>
            
            {notification.status === 'sent' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => acknowledgeNotification(notification.id)}
                className="w-full"
              >
                Acknowledge
              </Button>
            )}
            
            {notification.acknowledged_at && (
              <p className="text-xs text-muted-foreground">
                Acknowledged {formatDistanceToNow(new Date(notification.acknowledged_at), { addSuffix: true })}
              </p>
            )}
          </div>
          
          {index < notifications.length - 1 && <Separator className="mt-4" />}
        </div>
      ))}
    </div>
  );
};