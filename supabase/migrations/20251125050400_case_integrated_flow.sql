-- Create junction tables for many-to-many relationships

-- Create case_victims junction table
CREATE TABLE public.case_victims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
    victim_id UUID REFERENCES public.victims(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (case_id, victim_id)
);

-- Create predefined forensic actions template
CREATE TABLE public.action_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Insert default forensic action templates
INSERT INTO public.action_templates (action_type, description, is_default) VALUES
('Data Collection', 'Collect and preserve digital evidence from various sources', true),
('Image Analysis', 'Analyze disk images and filesystem artifacts', true),
('Network Analysis', 'Examine network traffic and connections', true),
('Memory Analysis', 'Analyze memory dumps for running processes and artifacts', true),
('Malware Analysis', 'Analyze malicious software and its behavior', true),
('Log Analysis', 'Review system and application logs for suspicious activity', true),
('Timeline Analysis', 'Create timeline of events from various sources', true),
('Registry Analysis', 'Examine Windows registry for artifacts', true),
('Mobile Forensics', 'Extract and analyze mobile device data', true),
('Cloud Forensics', 'Collect and analyze cloud-based evidence', true);

-- Modify forensic_actions to support template-based creation

ALTER TABLE public.forensic_actions 
ADD COLUMN template_id UUID REFERENCES public.action_templates(id),
ADD COLUMN is_checked BOOLEAN DEFAULT false NOT NULL;

-- Enable RLS for new tables
ALTER TABLE public.case_victims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for case_victims
CREATE POLICY "Viewers can view case victims"
ON public.case_victims FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and investigators can manage case victims"
ON public.case_victims FOR ALL
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'investigator')
);

-- RLS Policies for action_templates
CREATE POLICY "Everyone can view action templates"
ON public.action_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage action templates"
ON public.action_templates FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes
CREATE INDEX idx_case_victims_case_id ON public.case_victims(case_id);
CREATE INDEX idx_case_victims_victim_id ON public.case_victims(victim_id);
CREATE INDEX idx_action_templates_is_default ON public.action_templates(is_default);
CREATE INDEX idx_forensic_actions_template_id ON public.forensic_actions(template_id);
CREATE INDEX idx_forensic_actions_is_checked ON public.forensic_actions(is_checked);
