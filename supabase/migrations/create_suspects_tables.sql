-- Jalankan SQL ini di Supabase Dashboard SQL Editor

-- Create enum types if they don't exist
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

-- Create suspects table
CREATE TABLE IF NOT EXISTS public.suspects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact TEXT,
    address TEXT,
    identification_number TEXT,
    status suspect_status DEFAULT 'suspect' NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create case_suspects junction table
CREATE TABLE IF NOT EXISTS public.case_suspects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
    suspect_id UUID REFERENCES public.suspects(id) ON DELETE CASCADE NOT NULL,
    involvement_level involvement_level DEFAULT 'primary' NOT NULL,
    relationship_to_case TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (case_id, suspect_id)
);

-- Enable Row Level Security
ALTER TABLE public.suspects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_suspects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suspects
DROP POLICY IF EXISTS "Viewers can view all suspects" ON public.suspects;
CREATE POLICY "Viewers can view all suspects"
ON public.suspects FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins and investigators can insert suspects" ON public.suspects;
CREATE POLICY "Admins and investigators can insert suspects"
ON public.suspects FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'investigator')
);

DROP POLICY IF EXISTS "Admins and investigators can update suspects" ON public.suspects;
CREATE POLICY "Admins and investigators can update suspects"
ON public.suspects FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'investigator')
);

DROP POLICY IF EXISTS "Admins can delete suspects" ON public.suspects;
CREATE POLICY "Admins can delete suspects"
ON public.suspects FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for case_suspects
DROP POLICY IF EXISTS "Viewers can view all case_suspects" ON public.case_suspects;
CREATE POLICY "Viewers can view all case_suspects"
ON public.case_suspects FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins and investigators can insert case_suspects" ON public.case_suspects;
CREATE POLICY "Admins and investigators can insert case_suspects"
ON public.case_suspects FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'investigator')
);

DROP POLICY IF EXISTS "Admins and investigators can update case_suspects" ON public.case_suspects;
CREATE POLICY "Admins and investigators can update case_suspects"
ON public.case_suspects FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'investigator')
);

DROP POLICY IF EXISTS "Admins can delete case_suspects" ON public.case_suspects;
CREATE POLICY "Admins can delete case_suspects"
ON public.case_suspects FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_suspects_created_by ON public.suspects(created_by);
CREATE INDEX IF NOT EXISTS idx_suspects_status ON public.suspects(status);
CREATE INDEX IF NOT EXISTS idx_case_suspects_case_id ON public.case_suspects(case_id);
CREATE INDEX IF NOT EXISTS idx_case_suspects_suspect_id ON public.case_suspects(suspect_id);

-- Create triggers for updated_at
CREATE OR REPLACE TRIGGER update_suspects_updated_at
  BEFORE UPDATE ON public.suspects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_case_suspects_updated_at
  BEFORE UPDATE ON public.case_suspects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ON public.suspects FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins and investigators can insert suspects" ON public.suspects;
CREATE POLICY "Admins and investigators can insert suspects"
ON public.suspects FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'investigator')
);

DROP POLICY IF EXISTS "Admins and investigators can update suspects" ON public.suspects;
CREATE POLICY "Admins and investigators can update suspects"
ON public.suspects FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'investigator')
);

DROP POLICY IF EXISTS "Admins can delete suspects" ON public.suspects;
CREATE POLICY "Admins can delete suspects"
ON public.suspects FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for case_suspects
DROP POLICY IF EXISTS "Viewers can view all case_suspects" ON public.case_suspects;
CREATE POLICY "Viewers can view all case_suspects"
ON public.case_suspects FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins and investigators can insert case_suspects" ON public.case_suspects;
CREATE POLICY "Admins and investigators can insert case_suspects"
ON public.case_suspects FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'investigator')
);

DROP POLICY IF EXISTS "Admins and investigators can update case_suspects" ON public.case_suspects;
CREATE POLICY "Admins and investigators can update case_suspects"
ON public.case_suspects FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'investigator')
);

DROP POLICY IF EXISTS "Admins can delete case_suspects" ON public.case_suspects;
CREATE POLICY "Admins can delete case_suspects"
ON public.case_suspects FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_suspects_created_by ON public.suspects(created_by);
CREATE INDEX IF NOT EXISTS idx_suspects_status ON public.suspects(status);
CREATE INDEX IF NOT EXISTS idx_case_suspects_case_id ON public.case_suspects(case_id);
CREATE INDEX IF NOT EXISTS idx_case_suspects_suspect_id ON public.case_suspects(suspect_id);

-- Create triggers for updated_at
CREATE OR REPLACE TRIGGER update_suspects_updated_at
  BEFORE UPDATE ON public.suspects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_case_suspects_updated_at
  BEFORE UPDATE ON public.case_suspects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
