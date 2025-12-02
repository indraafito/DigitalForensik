import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FolderOpen, Plus, Eye } from "lucide-react";
import { toast } from "sonner";
import { CaseForm } from "@/components/cases/CaseForm";
import { CaseDetail } from "@/components/cases/CaseDetail";

interface Victim {
  id: string;
  name: string;
  contact: string;
  location?: string;
}

interface Evidence {
  id: string;
  evidence_number: string;
  evidence_type: string;
  file_name: string;
  description: string;
  case_id: string;
  collected_by: string;
  collection_date?: string;
}

interface ForensicAction {
  id: string;
  template_id?: string;
  action_type: string;
  description: string;
  is_checked?: boolean;
  is_completed: boolean;
  performed_by: string;
  completed_at: string | null;
  case_id: string;
  status?: string;
}

interface Case {
  id: string;
  case_number: string;
  case_type: string;
  incident_date: string;
  summary: string;
  status: 'open' | 'in_progress' | 'closed' | 'archived';
  victim_id?: string;
  victims?: {
    id: string;
    name: string;
    contact?: string;
    location?: string;
  };
  case_suspects?: Array<{
    suspect_id: string;
    involvement_level: string;
    relationship_to_case?: string;
    suspects: {
      id: string;
      name: string;
      contact?: string;
      address?: string;
      identification_number?: string;
      status: string;
      notes?: string;
    };
  }>;
  evidence: Evidence[];
  forensic_actions: ForensicAction[];
}

interface CaseFormData {
  id?: string;
  case_number: string;
  case_type: string;
  incident_date: string;
  summary: string;
  victims?: Victim[];
  suspects?: Suspect[];
  evidence?: Evidence[];
  actions?: {
    template_id: string;
    action_type: string;
    description: string;
    is_completed?: boolean;
    completed_at?: string | null;
  }[];
}

export default function Cases() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [hasShownBackToast, setHasShownBackToast] = useState(false);
  const { user, userRole } = useAuth();

  // Debug logging for state changes (minimal)
  useEffect(() => {
    // Show feedback when returning to list (only once)
    if (selectedCase === null && !showForm && !editingCase && !hasShownBackToast) {
      toast.success('Kembali ke daftar kasus');
      setHasShownBackToast(true);
    }
    
    // Reset flag when navigating away from list
    if (selectedCase !== null || showForm || editingCase) {
      setHasShownBackToast(false);
    }
  }, [selectedCase, editingCase, showForm, userRole, hasShownBackToast]);

  const fetchCases = useCallback(async () => {
    try {
      // Fetch cases without suspects first
      const { data: casesData, error: casesError } = await supabase
        .from("cases")
        .select(`
          *,
          victims:victim_id(
            id,
            name,
            contact,
            location
          ),
          evidence(*),
          forensic_actions(*)
        `)
        .order("created_at", { ascending: false });

      if (casesError) throw casesError;
      
      // Debug log
      console.log('Fetched cases data:', casesData);
      
      // If no cases exist, show a message
      if (!casesData || casesData.length === 0) {
        toast.info('Tidak ada kasus yang ditemukan. Silakan buat kasus baru.');
        setCases([]);
        return;
      }
      
      // Fetch suspects separately for each case
      const casesWithSuspects = await Promise.all(
        casesData.map(async (caseItem) => {
          const { data: caseSuspects, error: suspectsError } = await supabase
            .from("case_suspects" as any)
            .select(`
              suspect_id,
              involvement_level,
              relationship_to_case,
              suspects(
                id,
                name,
                contact,
                address,
                identification_number,
                status,
                notes
              )
            `)
            .eq("case_id", caseItem.id);

          if (suspectsError) {
            console.error('Error fetching suspects for case:', caseItem.id, suspectsError);
            return {
              ...caseItem,
              case_suspects: []
            };
          }

          return {
            ...caseItem,
            case_suspects: caseSuspects || []
          };
        })
      );
      
      // Process data to handle null values
      const processedData = casesWithSuspects.map(caseItem => ({
        ...caseItem,
        case_suspects: caseItem.case_suspects || [],
        evidence: caseItem.evidence || [],
        forensic_actions: caseItem.forensic_actions || []
      }));
      
      console.log('Processed cases data:', processedData);
      setCases(processedData);
      
      // Update selected case if it exists (but not if user is navigating back)
      if (selectedCase && !hasShownBackToast) {
        const updatedCase = processedData?.find(c => c.id === selectedCase.id);
        if (updatedCase) {
          setSelectedCase(updatedCase);
        }
      }
    } catch (error: unknown) {
      console.error('Error fetching cases:', error);
      toast.error("Gagal memuat data kasus");
    } finally {
      setLoading(false);
    }
  }, []); // Remove dependencies to prevent infinite loops

  useEffect(() => {
    fetchCases();
    
    // Set up real-time subscription
    const casesSubscription = supabase
      .channel('cases-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cases' },
        () => {
          fetchCases();
        }
      )
      .subscribe();

    const forensicActionsSubscription = supabase
      .channel('forensic-actions-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'forensic_actions' },
        () => {
          fetchCases();
        }
      )
      .subscribe();

    const caseSuspectsSubscription = supabase
      .channel('case-suspects-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'case_suspects' },
        () => {
          fetchCases();
        }
      )
      .subscribe();

    const suspectsSubscription = supabase
      .channel('suspects-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'suspects' },
        () => {
          fetchCases();
        }
      )
      .subscribe();

    return () => {
      casesSubscription.unsubscribe();
      forensicActionsSubscription.unsubscribe();
      caseSuspectsSubscription.unsubscribe();
      suspectsSubscription.unsubscribe();
    };
  }, []); // Remove fetchCases dependency to prevent infinite loop

  const handleEditCase = (caseData: Case) => {
    // Only allow edit for admin and investigator
    if (userRole === 'admin' || userRole === 'investigator') {
      setEditingCase(caseData);
      setSelectedCase(null);
    }
  };

  const handleDeleteCase = async (caseToDelete: Case) => {
    // Only allow delete for admin
    if (userRole !== 'admin') {
      toast.error("Hanya admin yang dapat menghapus kasus");
      return;
    }
    
    // Confirm deletion
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus kasus "${caseToDelete.case_number}"?\n\n` +
      `Data yang akan dihapus:\n` +
      `- Korban: ${caseToDelete.victims ? '1 korban' : 'Tidak ada'}\n` +
      `- Tersangka: ${caseToDelete.case_suspects?.length || 0} tersangka\n` +
      `- Bukti: ${caseToDelete.evidence?.length || 0} bukti\n` +
      `- Tindakan: ${caseToDelete.forensic_actions?.length || 0} tindakan\n\n` +
      `Tindakan ini tidak dapat dibatalkan!`
    );
    
    if (!confirmed) return;
    
    try {
      setLoading(true);
      
      console.log('Deleting case:', caseToDelete.id);
      
      // Delete case_suspects relationships first
      const { error: caseSuspectsError } = await supabase
        .from("case_suspects" as any)
        .delete()
        .eq("case_id", caseToDelete.id);
      
      if (caseSuspectsError) {
        console.error("Error deleting case_suspects:", caseSuspectsError);
      } else {
        console.log("Case_suspects deleted successfully");
      }
      
      // Delete evidence
      const { error: evidenceError } = await supabase
        .from("evidence")
        .delete()
        .eq("case_id", caseToDelete.id);
      
      if (evidenceError) {
        console.error("Error deleting evidence:", evidenceError);
      } else {
        console.log("Evidence deleted successfully");
      }
      
      // Delete forensic actions
      const { error: actionsError } = await supabase
        .from("forensic_actions")
        .delete()
        .eq("case_id", caseToDelete.id);
      
      if (actionsError) {
        console.error("Error deleting forensic actions:", actionsError);
      } else {
        console.log("Forensic actions deleted successfully");
      }
      
      // Check if victim is only used by this case before deleting
      if (caseToDelete.victim_id) {
        const { data: otherCases } = await supabase
          .from("cases")
          .select("id")
          .eq("victim_id", caseToDelete.victim_id)
          .neq("id", caseToDelete.id);
        
        if (!otherCases || otherCases.length === 0) {
          // Safe to delete victim
          const { error: victimError } = await supabase
            .from("victims")
            .delete()
            .eq("id", caseToDelete.victim_id);
          
          if (victimError) {
            console.error("Error deleting victim:", victimError);
          } else {
            console.log("Victim deleted successfully");
          }
        } else {
          console.log("Victim not deleted as it's used by other cases");
        }
      }
      
      // Check if suspects are only used by this case before deleting
      if (caseToDelete.case_suspects && caseToDelete.case_suspects.length > 0) {
        for (const caseSuspect of caseToDelete.case_suspects) {
          if (caseSuspect.suspect_id) {
            const { data: otherCasesForSuspect } = await supabase
              .from("case_suspects" as any)
              .select("case_id")
              .eq("suspect_id", caseSuspect.suspect_id)
              .neq("case_id", caseToDelete.id);
            
            if (!otherCasesForSuspect || otherCasesForSuspect.length === 0) {
              // Safe to delete suspect
              const { error: suspectError } = await supabase
                .from("suspects" as any)
                .delete()
                .eq("id", caseSuspect.suspect_id);
              
              if (suspectError) {
                console.error("Error deleting suspect:", suspectError);
              } else {
                console.log("Suspect deleted successfully:", caseSuspect.suspect_id);
              }
            } else {
              console.log("Suspect not deleted as it's used by other cases:", caseSuspect.suspect_id);
            }
          }
        }
      }
      
      // Finally delete the case
      const { error: caseError } = await supabase
        .from("cases")
        .delete()
        .eq("id", caseToDelete.id);
      
      if (caseError) throw caseError;
      
      console.log("Case deleted successfully");
      toast.success("Kasus dan semua data terkait berhasil dihapus");
      setSelectedCase(null);
      fetchCases(); // Refresh the list
    } catch (error) {
      console.error("Error deleting case:", error);
      toast.error("Gagal menghapus kasus: " + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCaseSubmit = async (caseData: CaseFormData) => {
    // Only allow submit for admin and investigator
    if (userRole !== 'admin' && userRole !== 'investigator') {
      toast.error("Anda tidak memiliki izin untuk mengubah kasus");
      return;
    }
    
    // Debug: Log the received data
    console.log('handleCaseSubmit received data:', caseData);
    console.log('case_number value:', caseData.case_number);
    console.log('suspects data:', caseData.suspects);
    console.log('suspects length:', caseData.suspects?.length);
    
    try {
      if (caseData.id) {
        // Update existing case
        const { error: caseError } = await supabase
          .from("cases")
          .update({
            case_number: caseData.case_number,
            case_type: caseData.case_type,
            incident_date: caseData.incident_date,
            summary: caseData.summary,
          })
          .eq("id", caseData.id);

        if (caseError) throw caseError;

        // Update victims
        if (caseData.victims && caseData.victims.length > 0) {
          const validVictims = caseData.victims.filter(v => v.name.trim() !== '');
          
          // Update existing victim or create new one
          const primaryVictim = validVictims[0];
          if (primaryVictim) {
            if (primaryVictim.id && !primaryVictim.id.startsWith('new-')) {
              // Update existing victim
              await supabase
                .from("victims")
                .update({
                  name: primaryVictim.name,
                  contact: primaryVictim.contact,
                  location: primaryVictim.location
                })
                .eq("id", primaryVictim.id);
            } else {
              // Create new victim and link to case
              const { data: newVictim } = await supabase
                .from("victims")
                .insert({
                  name: primaryVictim.name,
                  contact: primaryVictim.contact,
                  location: primaryVictim.location
                })
                .select()
                .single();

              // Update case with new victim ID
              await supabase
                .from("cases")
                .update({ victim_id: newVictim.id })
                .eq("id", caseData.id);
            }
          }
        }

        // Update suspects
        if (caseData.suspects && caseData.suspects.length > 0) {
          const validSuspects = caseData.suspects.filter(s => s.name.trim() !== '');
          
          // Delete existing case-suspect relationships
          const { error: deleteError } = await supabase
            .from("case_suspects" as any)
            .delete()
            .eq("case_id", caseData.id);

          if (deleteError) throw deleteError;

          // Add new suspect relationships
          for (const suspect of validSuspects) {
            let suspectId;
            
            if (suspect.id && !suspect.id.startsWith('new-')) {
              // Use existing suspect (check if it's a valid UUID)
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
              if (uuidRegex.test(suspect.id)) {
                suspectId = suspect.id;
                
                // Update suspect info
                await supabase
                  .from("suspects" as any)
                  .update({
                    name: suspect.name,
                    contact: suspect.contact,
                    address: suspect.address,
                    identification_number: suspect.identification_number,
                    status: suspect.status,
                    notes: suspect.notes
                  })
                  .eq("id", suspectId);
              } else {
                // Invalid UUID, create new suspect instead
                console.log('Invalid suspect ID, creating new suspect:', suspect.id);
              }
            }
            
            // If no valid suspectId, create new suspect
            if (!suspectId) {
              const { data: newSuspect, error: insertError } = await supabase
                .from("suspects" as any)
                .insert({
                  name: suspect.name,
                  contact: suspect.contact,
                  address: suspect.address,
                  identification_number: suspect.identification_number,
                  status: suspect.status || 'suspect',
                  notes: suspect.notes,
                  created_by: user?.id
                })
                .select()
                .single();

              if (insertError) throw insertError;
              
              suspectId = (newSuspect as any)?.id;
            }
            
            // Link suspect to case
            console.log('Linking suspect to case:', {
              case_id: caseData.id,
              suspect_id: suspectId,
              involvement_level: suspect.involvement_level || 'primary',
              relationship_to_case: suspect.notes || ''
            });
            await supabase
              .from("case_suspects" as any)
              .insert({
                case_id: caseData.id,
                suspect_id: suspectId,
                involvement_level: suspect.involvement_level || 'primary',
                relationship_to_case: suspect.notes || ''
              });
          }
        }

        // Update evidence (delete existing and add new ones)
        if (caseData.evidence && caseData.evidence.length > 0) {
          // Delete existing evidence
          await supabase
            .from("evidence")
            .delete()
            .eq("case_id", caseData.id);

          // Add new evidence
          const evidenceData = caseData.evidence
            .filter(evidence => evidence.evidence_type && evidence.evidence_type.trim() !== '') // Filter out empty evidence_type
            .map((evidence, index: number) => ({
              case_id: caseData.id!,
              evidence_number: `EVI-${String(index + 1).padStart(3, '0')}`,
              evidence_type: (evidence.evidence_type || "other") as "other" | "file" | "image" | "video" | "document" | "log" | "network_capture" | "memory_dump",
              file_name: evidence.file_name || '',
              description: evidence.description || '',
              file_size: (evidence as any).file_size || null,
              storage_location: (evidence as any).file_url || null,
              collected_by: user?.id || ''
            }));

          // Only insert if we have valid evidence
          if (evidenceData.length > 0) {
            const { error: evidenceError } = await supabase
              .from("evidence")
              .insert(evidenceData);

            if (evidenceError) {
              console.error('Evidence insert error:', evidenceError);
              throw evidenceError;
            }
          }
        }

        // Update forensic actions (delete existing and add new ones)
        if (caseData.actions && caseData.actions.length > 0) {
          // Delete existing actions
          await supabase
            .from("forensic_actions")
            .delete()
            .eq("case_id", caseData.id);

          // Add new actions
          const actionData = caseData.actions?.map((action) => ({
            case_id: caseData.id,
            template_id: action.template_id,
            action_type: action.action_type,
            description: action.description,
            is_checked: true, // Mark as selected
            is_completed: action.is_completed || false,
            performed_by: user?.id,
            completed_at: action.completed_at || null
          }));

          const { error: actionError } = await supabase
            .from("forensic_actions")
            .insert(actionData);

          if (actionError) throw actionError;
        }

        toast.success("Kasus berhasil diperbarui");
        setEditingCase(null);
      } else {
        // Create new case
        // Get the first victim for victim_id (current schema limitation)
        let firstVictim = caseData.victims && caseData.victims.length > 0 ? caseData.victims[0] : null;
        
        let newCase;
        let caseError;
        let attempts = 0;
        const maxAttempts = 10; // Increased attempts
        
        // Function to check if case number exists
        const checkCaseNumberExists = async (caseNumber: string): Promise<boolean> => {
          const { data, error } = await supabase
            .from("cases")
            .select("case_number")
            .eq("case_number", caseNumber)
            .single();
          
          return !error && data !== null;
        };
        
        // Function to generate new case number with suffix
        const generateNewCaseNumber = (baseNumber: string, attempt: number): string => {
          return `${baseNumber}-${attempt}`;
        };
        
        // Keep trying until we find a unique case number
        do {
          attempts++;
          
          // Check if current case number exists
          const caseNumberExists = await checkCaseNumberExists(caseData.case_number);
          
          if (caseNumberExists) {
            console.log(`Case number ${caseData.case_number} already exists, generating new one (attempt ${attempts})`);
            caseData.case_number = generateNewCaseNumber(caseData.case_number, attempts);
            continue;
          }
          
          // Try to insert the case
          const { data: tempCase, error: tempError } = await supabase
            .from("cases")
            .insert({
              case_number: caseData.case_number,
              case_type: caseData.case_type,
              incident_date: caseData.incident_date,
              summary: caseData.summary,
              victim_id: firstVictim?.id || null,
              status: 'open',
              created_by: user?.id
            })
            .select()
            .single();

          newCase = tempCase;
          caseError = tempError;
          
          // If any error occurred (not just duplicate), regenerate and retry
          if (caseError && attempts < maxAttempts) {
            console.log(`Error inserting case (${caseError.message}), regenerating case number (attempt ${attempts})`);
            caseData.case_number = generateNewCaseNumber(caseData.case_number, attempts);
          }
        } while (caseError && attempts < maxAttempts);

        if (caseError) {
          console.error('Failed to create case after all attempts:', caseError);
          throw caseError;
        }
        
        if (!newCase) {
          throw new Error('Failed to create case: newCase is undefined');
        }

        // Process victims - create/update all victims
        if (caseData.victims && caseData.victims.length > 0) {
          const validVictims = caseData.victims.filter(v => v.name.trim() !== '');
          
          for (const victim of validVictims) {
            if (victim.id && victim.id.startsWith('new-')) {
              // Create new victim
              const { data: victimData, error: victimError } = await supabase
                .from("victims")
                .insert({
                  name: victim.name,
                  contact: victim.contact,
                  location: victim.location
                })
                .select()
                .single();

              if (victimError) throw victimError;
              
              // Update case with first victim ID if not set
              if (!firstVictim) {
                firstVictim = victimData;
                await supabase
                  .from("cases")
                  .update({ victim_id: victimData.id })
                  .eq("id", newCase.id);
              }
            }
          }
        }

        // Add evidence to case
        if (caseData.evidence && caseData.evidence.length > 0) {
          const evidenceData = caseData.evidence
            .filter(evidence => evidence.evidence_type && evidence.evidence_type.trim() !== '') // Filter out empty evidence_type
            .map((evidence, index: number) => ({
              case_id: newCase.id,
              evidence_number: `EVI-${String(index + 1).padStart(3, '0')}`,
              evidence_type: (evidence.evidence_type || "other") as "other" | "file" | "image" | "video" | "document" | "log" | "network_capture" | "memory_dump",
              file_name: evidence.file_name || '',
              description: evidence.description || '',
              file_size: (evidence as any).file_size || null,
              storage_location: (evidence as any).file_url || null,
              collected_by: user?.id || ''
            }));

          // Only insert if we have valid evidence
          if (evidenceData.length > 0) {
            const { error: evidenceError } = await supabase
              .from("evidence")
              .insert(evidenceData);

            if (evidenceError) {
              console.error('Evidence insert error:', evidenceError);
              throw evidenceError;
            }
          }
        }

        // Add suspects to case
        if (caseData.suspects && caseData.suspects.length > 0) {
          const validSuspects = caseData.suspects.filter(s => s.name.trim() !== '');
          
          for (const suspect of validSuspects) {
            if (suspect.id && suspect.id.startsWith('new-')) {
              // Create new suspect
              const { data: suspectData, error: suspectError } = await supabase
                .from("suspects" as any)
                .insert({
                  name: suspect.name,
                  contact: suspect.contact,
                  address: suspect.address,
                  identification_number: suspect.identification_number,
                  status: suspect.status || 'suspect',
                  notes: suspect.notes,
                  created_by: user?.id
                })
                .select()
                .single();

              if (suspectError) throw suspectError;
              
              // Link suspect to case
              const { error: linkError } = await supabase
                .from("case_suspects" as any)
                .insert({
                  case_id: newCase.id,
                  suspect_id: suspectData.id,
                  involvement_level: suspect.involvement_level || 'primary',
                  relationship_to_case: suspect.notes || ''
                });

              if (linkError) {
                console.error('Case-suspect link error:', linkError);
                throw linkError;
              }
            }
          }
        }

        // Add forensic actions to case
        if (caseData.actions && caseData.actions.length > 0) {
          const actionData = caseData.actions.map((action) => ({
            case_id: newCase.id,
            template_id: action.template_id,
            action_type: action.action_type,
            description: action.description,
            is_checked: true, // Mark as selected
            is_completed: false, // Start as not completed
            performed_by: user?.id,
            completed_at: null // Not completed yet
          }));

          const { error: actionError } = await supabase
            .from("forensic_actions")
            .insert(actionData);

          if (actionError) throw actionError;
        }

        toast.success("Kasus berhasil ditambahkan dengan semua data terkait");
        setShowForm(false);
      }
      fetchCases();
    } catch (error: unknown) {
      console.error('Error submitting case:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error("Gagal " + (caseData.id ? "memperbarui" : "menambahkan") + " kasus: " + errorMessage);
    }
  };

  const statusColors = {
    open: "bg-destructive/10 text-destructive",
    in_progress: "bg-accent/10 text-accent",
    closed: "bg-primary/10 text-primary",
    archived: "bg-muted",
  };

  const caseTypeColors = {
    cybercrime: "bg-blue-100 text-blue-800",
    data_breach: "bg-orange-100 text-orange-800",
    malware: "bg-red-100 text-red-800",
    fraud: "bg-yellow-100 text-yellow-800",
    intellectual_property: "bg-purple-100 text-purple-800",
    other: "bg-gray-100 text-gray-800",
  };

  if ((showForm || editingCase) && (userRole === 'admin' || userRole === 'investigator')) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {editingCase ? 'Edit Kasus' : 'Tambah Kasus Baru'}
            </h1>
            <p className="text-muted-foreground">
              {editingCase ? 'Edit informasi lengkap kasus forensik' : 'Form terintegrasi untuk kasus, korban, bukti, dan tindakan'}
            </p>
          </div>
          <Button variant="outline" onClick={() => {
            setShowForm(false);
            setEditingCase(null);
          }}>
            Batal
          </Button>
        </div>
        
        <CaseForm 
          onSubmit={handleCaseSubmit} 
          onCancel={() => {
            setShowForm(false);
            setEditingCase(null);
          }} 
          initialData={editingCase as any}
          isEdit={!!editingCase}
        />
      </div>
    );
  }

  if (selectedCase) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Detail Kasus</h1>
            <p className="text-muted-foreground">Informasi lengkap kasus forensik</p>
          </div>
          <Button variant="outline" onClick={() => {
              toast.info('Kembali ke daftar kasus...');
              setSelectedCase(null);
            }}>
              Kembali
            </Button>
        </div>
        
        {(userRole === 'admin' || userRole === 'investigator') && (
          <CaseDetail 
            caseData={selectedCase as any} 
            onUpdate={fetchCases} 
            onEdit={handleEditCase}
            onDelete={userRole === 'admin' ? handleDeleteCase : undefined}
          />
        )}
        {userRole === 'viewer' && (
          <CaseDetail 
            caseData={selectedCase as any} 
            onUpdate={fetchCases} 
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kasus</h1>
          <p className="text-muted-foreground">Kelola kasus investigasi forensik digital</p>
        </div>
        {(userRole === 'admin' || userRole === 'investigator') && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Tambah Kasus
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : cases && cases.length > 0 ? (
        <div className="grid gap-4">
          {cases.map((c) => {
            console.log('Rendering case:', c);
            return (
              <Card key={c.id} className="glass shadow-glow p-6 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedCase(c)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FolderOpen className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">{c.case_number}</h3>
                      <Badge className={statusColors[c.status as keyof typeof statusColors]}>{c.status}</Badge>
                      <Badge className={caseTypeColors[c.case_type as keyof typeof caseTypeColors]}>{c.case_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{c.summary}</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Korban: {c.victims ? 1 : 0}</span>
                        <span>Tersangka: {c.case_suspects?.length || 0}</span>
                        <span>Bukti: {c.evidence?.length || 0}</span>
                        <span>Tindakan: {c.forensic_actions?.filter((a) => a.is_completed).length || 0}/{c.forensic_actions?.length || 0}</span>
                      </div>
                      
                      {c.forensic_actions && c.forensic_actions.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progress Tindakan</span>
                            <span>{Math.round(((c.forensic_actions?.filter((a) => a.is_completed).length || 0) / (c.forensic_actions?.length || 1)) * 100)}%</span>
                          </div>
                          <Progress 
                            value={c.forensic_actions ? (c.forensic_actions.filter((a) => a.is_completed).length / c.forensic_actions.length) * 100 : 0} 
                            className="h-2"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedCase(c); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Lihat Detail</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="glass shadow-glow p-12 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Belum ada kasus</h3>
          <p className="text-muted-foreground mb-4">
            {userRole === 'viewer' 
              ? 'Tidak ada kasus yang tersedia untuk dilihat'
              : 'Mulai dengan menambahkan kasus forensik pertama'
            }
          </p>
          {(userRole === 'admin' || userRole === 'investigator') && (
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Buat Kasus Pertama
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
