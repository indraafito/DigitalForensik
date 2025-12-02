-- Create suspects table
CREATE TABLE public.suspects (
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

-- Create junction table for case-suspect relationships
CREATE TABLE public.case_suspects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
    suspect_id UUID REFERENCES public.suspects(id) ON DELETE CASCADE NOT NULL,
    involvement_level involvement_level DEFAULT 'primary' NOT NULL,
    relationship_to_case TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (case_id, suspect_id)
);

-- Create indexes
CREATE INDEX idx_suspects_name ON public.suspects(name);
CREATE INDEX idx_suspects_status ON public.suspects(status);
CREATE INDEX idx_case_suspects_case_id ON public.case_suspects(case_id);
CREATE INDEX idx_case_suspects_suspect_id ON public.case_suspects(suspect_id);

-- Enable RLS
ALTER TABLE public.suspects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_suspects ENABLE ROW LEVEL SECURITY;

-- Create policies for suspects table
CREATE POLICY "Users can view suspects they created" ON public.suspects FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can insert suspects they create" ON public.suspects FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update suspects they created" ON public.suspects FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Admins can view all suspects" ON public.suspects FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND user_profiles.role = 'admin'
    )
);
CREATE POLICY "Admins can insert suspects" ON public.suspects FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND user_profiles.role = 'admin'
    )
);
CREATE POLICY "Admins can update suspects" ON public.suspects FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND user_profiles.role = 'admin'
    )
);

-- Create policies for case_suspects junction table
CREATE POLICY "Users can view case suspects they have access to" ON public.case_suspects FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.cases 
        WHERE cases.id = case_suspects.case_id 
        AND (
            cases.created_by = auth.uid() 
            OR cases.assigned_to = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE user_profiles.id = auth.uid() 
                AND user_profiles.role IN ('admin', 'investigator')
            )
        )
    )
);
CREATE POLICY "Users can insert case suspects for cases they manage" ON public.case_suspects FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.cases 
        WHERE cases.id = case_suspects.case_id 
        AND (
            cases.created_by = auth.uid() 
            OR cases.assigned_to = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE user_profiles.id = auth.uid() 
                AND user_profiles.role IN ('admin', 'investigator')
            )
        )
    )
);
CREATE POLICY "Users can update case suspects for cases they manage" ON public.case_suspects FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.cases 
        WHERE cases.id = case_suspects.case_id 
        AND (
            cases.created_by = auth.uid() 
            OR cases.assigned_to = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE user_profiles.id = auth.uid() 
                AND user_profiles.role IN ('admin', 'investigator')
            )
        )
    )
);
CREATE POLICY "Users can delete case suspects for cases they manage" ON public.case_suspects FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.cases 
        WHERE cases.id = case_suspects.case_id 
        AND (
            cases.created_by = auth.uid() 
            OR cases.assigned_to = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE user_profiles.id = auth.uid() 
                AND user_profiles.role IN ('admin', 'investigator')
            )
        )
    )
);

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
