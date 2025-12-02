import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, X, User, Package, CheckSquare, UserX, RefreshCw, ClipboardList, Upload, File, Image, Video, FileText } from "lucide-react";

interface Victim {
  id: string;
  name: string;
  contact: string;
  location: string;
}

interface Suspect {
  id: string;
  name: string;
  contact?: string;
  address?: string;
  identification_number?: string;
  status: 'suspect' | 'person_of_interest' | 'charged' | 'cleared';
  involvement_level: 'primary' | 'secondary' | 'unknown';
  notes?: string;
}

interface Evidence {
  id: string;
  evidence_type: string;
  file_name: string;
  description: string;
  file?: File;
  file_url?: string;
  file_size?: number;
}

interface Action {
  template_id: string;
  action_type: string;
  description: string;
  is_checked: boolean;
}

interface ActionTemplate {
  id: string;
  action_type: string;
  description: string;
  is_default: boolean;
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
  actions?: Action[];
}

interface CaseFormProps {
  onSubmit: (data: CaseFormData) => void;
  onCancel: () => void;
  initialData?: CaseFormData;
  isEdit?: boolean;
}

export function CaseForm({ onSubmit, onCancel, initialData, isEdit = false }: CaseFormProps) {
  const { user } = useAuth();
  
  // Define templates first to make them available for useEffect
  const defaultTemplates = useMemo(() => [
    { id: '1', action_type: 'Pengumpulan Bukti', description: 'Kumpulkan semua barang bukti digital', is_default: true },
    { id: '2', action_type: 'Analisis Log', description: 'Analisis log sistem untuk mencari aktivitas mencurigakan', is_default: true },
    { id: '3', action_type: 'Pemulihan Data', description: 'Coba pulihkan data yang terhapus atau rusak', is_default: false },
    { id: '4', action_type: 'Analisis Malware', description: 'Identifikasi dan analisis malware yang ditemukan', is_default: false },
    { id: '5', action_type: 'Pelaporan', description: 'Buat laporan lengkap hasil investigasi', is_default: true },
  ], []);

  const [formData, setFormData] = useState({
    case_number: '',
    case_type: '',
    incident_date: '',
    summary: '',
  });
  
  const [victims, setVictims] = useState<Victim[]>([]);
  const [suspects, setSuspects] = useState<Suspect[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [actionTemplates, setActionTemplates] = useState<ActionTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActionTemplates = useCallback(async () => {
    try {
      // Use hardcoded templates since action_templates table might not be available
      setActionTemplates(defaultTemplates);
      
      // Initialize actions with default templates
      const defaultActions = defaultTemplates.map(template => ({
        template_id: template.id,
        action_type: template.action_type,
        description: template.description,
        is_checked: false
      }));
      setActions(defaultActions);
    } catch (error) {
      console.error("Error setting up action templates:", error);
    }
  }, [defaultTemplates]);

  const generateCaseNumber = useCallback(async () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
    const random1 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetter1 = letters.charAt(Math.floor(Math.random() * letters.length));
    const randomLetter2 = letters.charAt(Math.floor(Math.random() * letters.length));
    
    // Format: CASE-YYYYMMDD-HHMMSS-LLL-RRR
    setFormData(prev => ({
      ...prev,
      case_number: `CASE-${year}${month}${day}-${hours}${minutes}${seconds}-${randomLetter1}${randomLetter2}${milliseconds}-${random1}`
    }));
  }, []);

  useEffect(() => {
    fetchActionTemplates();
    
    // Generate case number for new cases only
    if (!isEdit) {
      generateCaseNumber();
    }
    
    if (isEdit && initialData) {
      // Populate form with existing data
      setFormData({
        case_number: initialData.case_number || '',
        case_type: initialData.case_type || '',
        incident_date: initialData.incident_date || '',
        summary: initialData.summary || '',
      });
      
      // Populate victims (read-only for edit mode)
      if (initialData.victims) {
        setVictims([{
          id: initialData.victims.id,
          name: initialData.victims.name || '',
          contact: initialData.victims.contact || '',
          location: initialData.victims.location || ''
        }]);
      }
      
      // Populate evidence
      if (initialData.evidence) {
        setEvidence(initialData.evidence.map((e) => ({
          id: e.id,
          evidence_type: e.evidence_type || '',
          file_name: e.file_name || '',
          description: e.description || '',
          file: null, // Initialize with null for edit mode
          file_url: (e as any).storage_location || null, // Map storage_location to file_url
          file_size: (e as any).file_size || null
        })));
      }
      
      // Populate suspects
      if (initialData.case_suspects) {
        setSuspects(initialData.case_suspects.map((cs) => ({
          id: cs.suspect_id,
          name: cs.suspects?.name || '',
          contact: cs.suspects?.contact || '',
          address: cs.suspects?.address || '',
          identification_number: cs.suspects?.identification_number || '',
          status: cs.suspects?.status || 'suspect',
          involvement_level: cs.involvement_level || 'unknown',
          notes: cs.suspects?.notes || ''
        })));
      }
      
      // Populate actions
      if (initialData.forensic_actions) {
        const existingActions = initialData.forensic_actions.map((action) => ({
          template_id: action.template_id,
          action_type: action.action_type,
          description: action.description,
          is_checked: true
        }));
        setActions(existingActions);
      }
    }
  }, [isEdit, initialData, fetchActionTemplates, generateCaseNumber]);

  // Templates already defined above

  const addNewVictim = () => {
    const newVictim = {
      id: `new-${Date.now()}`,
      name: '',
      contact: '',
      location: ''
    };
    setVictims([...victims, newVictim]);
  };

  const updateVictim = (id: string, field: string, value: string) => {
    setVictims(victims.map(v => 
      v.id === id ? { ...v, [field]: value } : v
    ));
  };

  const removeVictim = (id: string) => {
    setVictims(victims.filter(v => v.id !== id));
  };

  const addSuspect = () => {
    const newSuspect: Suspect = {
      id: Date.now().toString(),
      name: '',
      contact: '',
      address: '',
      identification_number: '',
      status: 'suspect',
      involvement_level: 'primary',
      notes: ''
    };
    setSuspects([...suspects, newSuspect]);
  };

  const updateSuspect = (id: string, field: keyof Suspect, value: string) => {
    setSuspects(suspects.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const removeSuspect = (id: string) => {
    setSuspects(suspects.filter(s => s.id !== id));
  };

  const updateAction = (template_id: string, field: string, value: any) => {
    setActions(actions.map(action => 
      action.template_id === template_id ? { ...action, [field]: value } : action
    ));
  };

  const addEvidence = () => {
    const newEvidence = {
      id: `new-${Date.now()}`,
      type: '',
      file_name: '',
      description: ''
    };
    setEvidence([...evidence, newEvidence]);
  };

  const updateEvidence = (id: string, field: string, value: any) => {
    console.log('updateEvidence called:', { id, field, value, valueType: typeof value });
    setEvidence(evidence.map(e => 
      e.id === id ? { ...e, [field]: value } : e
    ));
  };

  const removeEvidence = (id: string) => {
    setEvidence(evidence.filter(e => e.id !== id));
  };

  const uploadFile = async (file: File, caseId: string, evidenceId: string): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${caseId}/${evidenceId}/${Date.now()}.${fileExt}`;
      
      console.log('Starting upload to ecotrade bucket:', fileName);
      
      // Use supabaseAdmin for upload (has higher permissions)
      const { data, error } = await supabaseAdmin.storage
        .from('ecotrade')  // Use ecotrade bucket instead of evidence
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw error;
      }

      console.log('Upload successful, getting public URL...');
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('ecotrade')  // Use ecotrade bucket instead of evidence
        .getPublicUrl(fileName);

      console.log('Public URL generated:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, evidenceId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('handleFileUpload called with file:', file.name, 'size:', file.size);
    console.log('Current evidence before update:', evidence.find(e => e.id === evidenceId));

    // Update evidence with file info
    updateEvidence(evidenceId, 'file', file);
    updateEvidence(evidenceId, 'file_name', file.name);
    updateEvidence(evidenceId, 'file_size', file.size);

    // Auto-detect file type
    const fileType = detectFileType(file);
    updateEvidence(evidenceId, 'evidence_type', fileType);

    console.log('Evidence updated with file info');
    
    // Check evidence state after update (with timeout)
    setTimeout(() => {
      const updatedEvidence = evidence.find(e => e.id === evidenceId);
      console.log('Evidence after update:', updatedEvidence);
    }, 100);
  };

  const detectFileType = (file: File): string => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type === 'application/pdf' || file.type.includes('document') || file.type.includes('text')) return 'document';
    if (extension === 'log' || file.name.toLowerCase().includes('log')) return 'log';
    if (extension === 'dmp' || file.name.toLowerCase().includes('memory')) return 'memory_dump';
    if (extension === 'pcap' || file.name.toLowerCase().includes('network')) return 'network_capture';
    
    return 'file';
  };

  const toggleAction = (templateId: string) => {
    setActions(actions.map(action => 
      action.template_id === templateId 
        ? { ...action, is_checked: !action.is_checked }
        : action
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Debug log
      console.log('Submitting form with suspects:', suspects);
      console.log('Suspects data before processing:', suspects.filter(s => s.name.trim() !== ''));
      
      // Create new victims first (only for new cases)
      let processedVictims = [];
      
      if (!isEdit) {
        const validVictims = victims.filter(v => v.name.trim() !== '');
        const createdVictims = [];
        
        for (const victim of validVictims) {
          const { data, error } = await supabase
            .from("victims")
            .insert({
              name: victim.name,
              contact: victim.contact,
              location: victim.location,
              created_by: user?.id
            })
            .select()
            .single();

          if (error) throw error;
          createdVictims.push(data);
        }
        processedVictims = createdVictims;
      } else {
        // For edit, use existing victims
        processedVictims = victims.filter(v => v.name.trim() !== '');
      }

      // Create new suspects
      const processedSuspects = suspects.filter(s => s.name.trim() !== '');
      
      console.log('Processed suspects:', processedSuspects);

      // Process evidence with file uploads
      const processedEvidence = [];
      const caseId = isEdit ? initialData.id : `temp-${Date.now()}`;
      
      console.log('Processing evidence:', evidence.length, 'items');
      
      for (const e of evidence) {
        console.log('Processing evidence item:', e);
        console.log('Has file property:', 'file' in e);
        console.log('File property value:', e.file);
        console.log('Evidence type:', e.evidence_type);
        console.log('Has description:', !!e.description);
        
        if (e.file && e.evidence_type && e.description) {
          try {
            console.log('Uploading file:', e.file.name, 'Size:', e.file.size);
            // Upload file to Supabase Storage
            const fileUrl = await uploadFile(e.file, caseId, e.id);
            console.log('File uploaded successfully:', fileUrl);
            
            processedEvidence.push({
              id: e.id,
              evidence_type: e.evidence_type,
              file_name: e.file_name,
              description: e.description,
              file_url: fileUrl,
              file_size: e.file_size
            });
          } catch (error) {
            console.error('Error uploading evidence file:', error);
            // Still add evidence without file URL if upload fails
            processedEvidence.push({
              id: e.id,
              evidence_type: e.evidence_type,
              file_name: e.file_name,
              description: e.description
            });
          }
        } else if (e.evidence_type && e.description) {
          console.log('Adding evidence without file');
          // Add evidence without file
          processedEvidence.push({
            id: e.id,
            evidence_type: e.evidence_type,
            file_name: e.file_name,
            description: e.description
          });
        }
      }

      onSubmit({
        id: isEdit ? initialData.id : undefined,
        case_number: formData.case_number,
        case_type: formData.case_type,
        incident_date: formData.incident_date,
        summary: formData.summary,
        victims: processedVictims,
        suspects: processedSuspects,
        evidence: processedEvidence,
        actions: actions.filter(a => a.is_checked).map(action => ({
          ...action,
          is_completed: isEdit && initialData?.forensic_actions?.find((fa) => fa.template_id === action.template_id)?.is_completed || false,
          completed_at: isEdit && initialData?.forensic_actions?.find((fa) => fa.template_id === action.template_id)?.completed_at || null
        }))
      });
    } catch (error) {
      console.error("Error submitting case:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Case Information */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">
          {isEdit ? 'Edit Informasi Kasus' : 'Informasi Kasus'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="case_number">Nomor Kasus</Label>
            <div className="flex gap-2">
              <Input
                id="case_number"
                value={formData.case_number}
                readOnly
                className="bg-muted"
                required
              />
              {!isEdit && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={generateCaseNumber}
                  title="Generate nomor kasus baru"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
            {isEdit && (
              <p className="text-xs text-muted-foreground mt-1">
                Nomor kasus tidak dapat diubah saat mengedit
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="case_type">Jenis Kasus</Label>
            <Select value={formData.case_type} onValueChange={(value) => setFormData({...formData, case_type: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih jenis kasus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cybercrime">Cybercrime</SelectItem>
                <SelectItem value="data_breach">Data Breach</SelectItem>
                <SelectItem value="malware">Malware</SelectItem>
                <SelectItem value="fraud">Fraud</SelectItem>
                <SelectItem value="intellectual_property">Intellectual Property</SelectItem>
                <SelectItem value="other">Lainnya</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="incident_date">Tanggal Kejadian</Label>
            <Input
              id="incident_date"
              type="date"
              value={formData.incident_date}
              onChange={(e) => setFormData({...formData, incident_date: e.target.value})}
              required
            />
          </div>
        </div>
        <div className="mt-4">
          <Label htmlFor="summary">Ringkasan Kasus</Label>
          <Textarea
            id="summary"
            value={formData.summary}
            onChange={(e) => setFormData({...formData, summary: e.target.value})}
            rows={3}
            required
          />
        </div>
      </Card>

      {/* Victims */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            Korban
          </h2>
          <Button type="button" onClick={addNewVictim} variant="outline" size="sm">
            <Plus className="h-4 w-4" />
            Tambah Korban
          </Button>
        </div>

        <div className="space-y-3">
          {victims.map((victim) => (
            <div key={victim.id} className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  placeholder="Nama korban"
                  value={victim.name}
                  onChange={(e) => !isEdit && updateVictim(victim.id, 'name', e.target.value)}
                  disabled={isEdit}
                />
                <Input
                  placeholder="Kontak"
                  value={victim.contact}
                  onChange={(e) => !isEdit && updateVictim(victim.id, 'contact', e.target.value)}
                  disabled={isEdit}
                />
                <Input
                  placeholder="Lokasi"
                  value={victim.location}
                  onChange={(e) => !isEdit && updateVictim(victim.id, 'location', e.target.value)}
                  disabled={isEdit}
                />
              </div>
              {!isEdit && (
                <Button type="button" onClick={() => removeVictim(victim.id)} variant="ghost" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Suspects */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserX className="h-5 w-5" />
            Tersangka
          </h2>
          <Button type="button" onClick={addSuspect} variant="outline" size="sm">
            <Plus className="h-4 w-4" />
            Tambah Tersangka
          </Button>
        </div>

        <div className="space-y-3">
          {suspects.map((suspect) => (
            <div key={suspect.id} className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <Input
                  placeholder="Nama tersangka"
                  value={suspect.name}
                  onChange={(e) => updateSuspect(suspect.id, 'name', e.target.value)}
                />
                <Input
                  placeholder="Kontak"
                  value={suspect.contact || ''}
                  onChange={(e) => updateSuspect(suspect.id, 'contact', e.target.value)}
                />
                <Input
                  placeholder="Alamat"
                  value={suspect.address || ''}
                  onChange={(e) => updateSuspect(suspect.id, 'address', e.target.value)}
                />
                <Input
                  placeholder="No. Identitas"
                  value={suspect.identification_number || ''}
                  onChange={(e) => updateSuspect(suspect.id, 'identification_number', e.target.value)}
                />
                <Select value={suspect.status} onValueChange={(value) => updateSuspect(suspect.id, 'status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suspect">Tersangka</SelectItem>
                    <SelectItem value="person_of_interest">Orang yang Berkepentingan</SelectItem>
                    <SelectItem value="charged">Dituntut</SelectItem>
                    <SelectItem value="cleared">Dibebaskan</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={suspect.involvement_level} onValueChange={(value) => updateSuspect(suspect.id, 'involvement_level', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tingkat Keterlibatan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Utama</SelectItem>
                    <SelectItem value="secondary">Sekunder</SelectItem>
                    <SelectItem value="witness">Saksi</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Catatan"
                  value={suspect.notes || ''}
                  onChange={(e) => updateSuspect(suspect.id, 'notes', e.target.value)}
                  className="md:col-span-2 lg:col-span-3"
                />
              </div>
              <Button type="button" onClick={() => removeSuspect(suspect.id)} variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {suspects.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <UserX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Belum ada tersangka</p>
          </div>
        )}
      </Card>

      {/* Evidence */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Barang Bukti
          </h2>
          <Button type="button" onClick={addEvidence} variant="outline" size="sm">
            <Plus className="h-4 w-4" />
            Tambah Bukti
          </Button>
        </div>

        <div className="space-y-3">
          {evidence.map((item) => (
            <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <Select value={item.evidence_type} onValueChange={(value) => updateEvidence(item.id, 'evidence_type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipe bukti" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="file">File</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="log">Log</SelectItem>
                    <SelectItem value="network_capture">Network Capture</SelectItem>
                    <SelectItem value="memory_dump">Memory Dump</SelectItem>
                    <SelectItem value="other">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="relative">
                  <Input
                    type="file"
                    id={`file-${item.id}`}
                    onChange={(e) => handleFileUpload(e, item.id)}
                    className="sr-only"
                    accept="*/*"
                  />
                  <Button
                    type="button"
                    onClick={() => document.getElementById(`file-${item.id}`)?.click()}
                    variant="outline"
                    className="w-full h-10"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {item.file ? item.file.name : 'Pilih File'}
                  </Button>
                  {item.file_size && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {(item.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}
                </div>
                
                <Input
                  placeholder="Nama file"
                  value={item.file_name}
                  onChange={(e) => updateEvidence(item.id, 'file_name', e.target.value)}
                />
                
                <Input
                  placeholder="Deskripsi"
                  value={item.description}
                  onChange={(e) => updateEvidence(item.id, 'description', e.target.value)}
                />
              </div>
              
              {!isEdit && (
                <Button type="button" onClick={() => removeEvidence(item.id)} variant="ghost" size="sm" className="mt-1">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Forensic Actions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Tindakan Forensik
          </h2>
        </div>

        <div className="space-y-3">
          {actions.map((action, index) => (
            <div key={action.template_id} className="flex items-center gap-3 p-3 border rounded-lg">
              <Checkbox
                id={`action-${action.template_id}`}
                checked={action.is_checked}
                onCheckedChange={(checked) => updateAction(action.template_id, 'is_checked', checked as boolean)}
                disabled={isEdit}
              />
              <div className="flex-1">
                <label 
                  htmlFor={`action-${action.template_id}`}
                  className="font-medium cursor-pointer hover:text-primary"
                >
                  {action.action_type}
                </label>
                <div className="text-sm text-muted-foreground">{action.description}</div>
              </div>
            </div>
          ))}
        </div>

        {actions.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Belum ada tindakan forensik</p>
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" onClick={onCancel} variant="outline">
          Batal
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (isEdit ? "Memperbarui..." : "Menyimpan...") : (isEdit ? "Perbarui Kasus" : "Simpan Kasus")}
        </Button>
      </div>
    </form>
  );
}
