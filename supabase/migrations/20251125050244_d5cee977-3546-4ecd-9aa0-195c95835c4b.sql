-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'investigator', 'viewer');

-- Create enum for case status
CREATE TYPE public.case_status AS ENUM ('open', 'in_progress', 'closed', 'archived');

-- Create enum for case types
CREATE TYPE public.case_type AS ENUM ('cybercrime', 'data_breach', 'malware', 'fraud', 'intellectual_property', 'other');

-- Create enum for evidence types
CREATE TYPE public.evidence_type AS ENUM ('file', 'image', 'video', 'document', 'log', 'network_capture', 'memory_dump', 'other');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create victims table
CREATE TABLE public.victims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact TEXT,
    location TEXT,
    address TEXT,
    report_date DATE DEFAULT CURRENT_DATE NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create cases table
CREATE TABLE public.cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number TEXT UNIQUE NOT NULL,
    case_type case_type NOT NULL,
    victim_id UUID REFERENCES public.victims(id) ON DELETE SET NULL,
    incident_date DATE NOT NULL,
    summary TEXT NOT NULL,
    status case_status DEFAULT 'open' NOT NULL,
    assigned_to UUID REFERENCES auth.users(id),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create evidence table
CREATE TABLE public.evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
    evidence_number TEXT NOT NULL,
    evidence_type evidence_type NOT NULL,
    file_name TEXT,
    file_size BIGINT,
    file_hash_sha256 TEXT,
    storage_location TEXT,
    collection_date TIMESTAMPTZ DEFAULT now() NOT NULL,
    description TEXT,
    collected_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (case_id, evidence_number)
);

-- Create forensic_actions table
CREATE TABLE public.forensic_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    is_completed BOOLEAN DEFAULT false NOT NULL,
    performed_by UUID REFERENCES auth.users(id) NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create activity_logs table
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.victims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forensic_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'admin' THEN 1
    WHEN 'investigator' THEN 2
    WHEN 'viewer' THEN 3
  END
  LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- RLS Policies for victims
CREATE POLICY "Viewers can view all victims"
ON public.victims FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and investigators can insert victims"
ON public.victims FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'investigator')
);

CREATE POLICY "Admins and investigators can update victims"
ON public.victims FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'investigator')
);

CREATE POLICY "Admins can delete victims"
ON public.victims FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for cases
CREATE POLICY "Viewers can view all cases"
ON public.cases FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and investigators can insert cases"
ON public.cases FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'investigator')
);

CREATE POLICY "Admins and investigators can update cases"
ON public.cases FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'investigator')
);

CREATE POLICY "Admins can delete cases"
ON public.cases FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for evidence
CREATE POLICY "Viewers can view all evidence"
ON public.evidence FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and investigators can insert evidence"
ON public.evidence FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'investigator')
);

CREATE POLICY "Admins and investigators can update evidence"
ON public.evidence FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'investigator')
);

CREATE POLICY "Admins can delete evidence"
ON public.evidence FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for forensic_actions
CREATE POLICY "Viewers can view all forensic actions"
ON public.forensic_actions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and investigators can insert forensic actions"
ON public.forensic_actions FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'investigator')
);

CREATE POLICY "Admins and investigators can update forensic actions"
ON public.forensic_actions FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'investigator')
);

CREATE POLICY "Admins can delete forensic actions"
ON public.forensic_actions FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for activity_logs
CREATE POLICY "Users can view their own activity logs"
ON public.activity_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity logs"
ON public.activity_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "All authenticated users can insert activity logs"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  
  -- Assign default role based on email or default to viewer
  IF new.email = 'admin@forensic.local' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin');
  ELSIF new.email = 'investigator@forensic.local' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'investigator');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'viewer');
  END IF;
  
  RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_victims_updated_at
  BEFORE UPDATE ON public.victims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evidence_updated_at
  BEFORE UPDATE ON public.evidence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forensic_actions_updated_at
  BEFORE UPDATE ON public.forensic_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add types for suspect status and involvement level
DO $$ BEGIN
    CREATE TYPE suspect_status AS ENUM ('suspect', 'person_of_interest', 'charged', 'cleared');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE involvement_level AS ENUM ('primary', 'secondary', 'witness');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_victims_created_by ON public.victims(created_by);
CREATE INDEX idx_cases_victim_id ON public.cases(victim_id);
CREATE INDEX idx_cases_status ON public.cases(status);
CREATE INDEX idx_cases_case_type ON public.cases(case_type);
CREATE INDEX idx_cases_assigned_to ON public.cases(assigned_to);
CREATE INDEX idx_evidence_case_id ON public.evidence(case_id);
CREATE INDEX idx_evidence_collected_by ON public.evidence(collected_by);
CREATE INDEX idx_forensic_actions_case_id ON public.forensic_actions(case_id);
CREATE INDEX idx_forensic_actions_performed_by ON public.forensic_actions(performed_by);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity_type ON public.activity_logs(entity_type);