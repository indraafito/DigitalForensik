-- Create suspects table
CREATE TABLE public.suspects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact TEXT,
    address TEXT,
    identification_number TEXT,
    status TEXT DEFAULT 'suspect' NOT NULL CHECK (status IN ('suspect', 'person_of_interest', 'charged', 'cleared')),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create case_suspects junction table
CREATE TABLE public.case_suspects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
    suspect_id UUID REFERENCES public.suspects(id) ON DELETE CASCADE NOT NULL,
    involvement_level TEXT DEFAULT 'primary' NOT NULL CHECK (involvement_level IN ('primary', 'secondary', 'witness')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (case_id, suspect_id)
);

-- Enable RLS for new tables
ALTER TABLE public.suspects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_suspects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suspects
CREATE POLICY "Everyone can view suspects"
ON public.suspects FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and investigators can manage suspects"
ON public.suspects FOR ALL
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'investigator')
);

-- RLS Policies for case_suspects
CREATE POLICY "Viewers can view case suspects"
ON public.case_suspects FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and investigators can manage case suspects"
ON public.case_suspects FOR ALL
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'investigator')
);

-- Create indexes
CREATE INDEX idx_suspects_status ON public.suspects(status);
CREATE INDEX idx_suspects_created_by ON public.suspects(created_by);
CREATE INDEX idx_case_suspects_case_id ON public.case_suspects(case_id);
CREATE INDEX idx_case_suspects_suspect_id ON public.case_suspects(suspect_id);

-- Update trigger for suspects
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_suspects_updated_at 
    BEFORE UPDATE ON public.suspects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample suspect data
INSERT INTO public.suspects (name, contact, address, identification_number, status, notes, created_by) VALUES
('John Doe', '+628123456789', 'Jakarta, Indonesia', '1234567890123456', 'suspect', 'Primary suspect in cybercrime case', 
 (SELECT id FROM public.profiles WHERE email = 'admin@example.com' LIMIT 1)),
('Jane Smith', '+628987654321', 'Surabaya, Indonesia', '9876543210987654', 'person_of_interest', 'Person of interest for further investigation', 
 (SELECT id FROM public.profiles WHERE email = 'admin@example.com' LIMIT 1));
