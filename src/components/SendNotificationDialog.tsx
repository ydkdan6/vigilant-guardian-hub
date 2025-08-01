import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const notificationSchema = z.object({
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type NotificationFormData = z.infer<typeof notificationSchema>;

interface SendNotificationDialogProps {
  children: React.ReactNode;
  report: {
    id: string;
    reporter_id: string;
    title: string;
  };
  officerId?: string;
}

export const SendNotificationDialog = ({ children, report, officerId }: SendNotificationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      message: '',
    },
  });

  const onSubmit = async (data: NotificationFormData) => {
    if (!officerId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('distress_notifications')
        .insert({
          incident_id: report.id,
          officer_id: officerId,
          user_id: report.reporter_id,
          message: data.message,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Notification sent to user successfully',
      });

      form.reset();
      setOpen(false);
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to send notification',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Update to User</DialogTitle>
          <DialogDescription>
            Send a notification update regarding incident: "{report.title}"
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter your message to the user..."
                      className="min-h-[120px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Notification'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};