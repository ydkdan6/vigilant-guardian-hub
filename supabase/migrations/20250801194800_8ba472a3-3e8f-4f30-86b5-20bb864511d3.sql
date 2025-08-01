-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('user', 'officer');

-- Create enum for incident status
CREATE TYPE public.incident_status AS ENUM ('pending', 'in_progress', 'resolved', 'closed');

-- Create enum for notification status
CREATE TYPE public.notification_status AS ENUM ('sent', 'acknowledged', 'resolved');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  sex TEXT NOT NULL,
  gender TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create incident_reports table
CREATE TABLE public.incident_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  incident_type TEXT NOT NULL,
  location TEXT NOT NULL,
  video_url TEXT,
  status incident_status NOT NULL DEFAULT 'pending',
  assigned_officer_id UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create distress_notifications table
CREATE TABLE public.distress_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES public.incident_reports(id) ON DELETE CASCADE,
  officer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status notification_status NOT NULL DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distress_notifications ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Officers can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'officer');

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for incident_reports
CREATE POLICY "Users can view their own reports"
  ON public.incident_reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Officers can view all reports"
  ON public.incident_reports FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'officer');

CREATE POLICY "Users can create their own reports"
  ON public.incident_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Officers can update all reports"
  ON public.incident_reports FOR UPDATE
  USING (public.get_user_role(auth.uid()) = 'officer');

-- RLS Policies for distress_notifications
CREATE POLICY "Users can view notifications sent to them"
  ON public.distress_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Officers can view all notifications"
  ON public.distress_notifications FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'officer');

CREATE POLICY "Officers can create notifications"
  ON public.distress_notifications FOR INSERT
  WITH CHECK (public.get_user_role(auth.uid()) = 'officer');

CREATE POLICY "Users can update their own notifications"
  ON public.distress_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Create storage bucket for surveillance videos
INSERT INTO storage.buckets (id, name, public) VALUES ('surveillance-videos', 'surveillance-videos', false);

-- Storage policies for surveillance videos
CREATE POLICY "Users can upload their own surveillance videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'surveillance-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own surveillance videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'surveillance-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Officers can view all surveillance videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'surveillance-videos' AND public.get_user_role(auth.uid()) = 'officer');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_incident_reports_updated_at
  BEFORE UPDATE ON public.incident_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, address, phone_number, sex, gender)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'address', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone_number', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'sex', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'gender', '')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();