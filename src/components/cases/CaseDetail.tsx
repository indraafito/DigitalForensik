import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  User, 
  Package, 
  CheckSquare, 
  Calendar, 
  MapPin, 
  Phone, 
  FileText,
  ArrowLeft,
  Edit,
  CheckCircle2,
  Circle,
  UserX,
  Trash2,
  Clock,
  Shield,
  AlertTriangle,
  Activity,
  Users,
  FolderOpen,
  CheckCircle
} from "lucide-react";

interface CaseVictim {
  victim_id: string;
  victims: {
    name: string;
    contact: string;
    location?: string;
  };
}

interface Suspect {
  suspect_id: string;
  name: string;
  contact: string;
  status: string;
  address: string;
  identification_number: string;
  notes: string;
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
  template_id: string;
  action_type: string;
  description: string;
  is_checked: boolean;
  is_completed: boolean;
  performed_by: string;
  completed_at: string | null;
  case_id: string;
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

interface CaseDetailProps {
  caseData: Case;
  onUpdate: () => void;
  onEdit?: (caseData: Case) => void;
  onDelete?: (caseData: Case) => void;
}

export function CaseDetail({ caseData, onUpdate, onEdit, onDelete }: CaseDetailProps) {
  const [loading, setLoading] = useState(false);
  const [isRealtime, setIsRealtime] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const statusColors = {
    open: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    closed: "bg-green-100 text-green-800",
    archived: "bg-gray-100 text-gray-800"
  };

  const suspectStatusColors = {
    suspect: "bg-red-100 text-red-800",
    person_of_interest: "bg-orange-100 text-orange-800", 
    charged: "bg-purple-100 text-purple-800",
    cleared: "bg-green-100 text-green-800"
  };

  const involvementLevelColors = {
    primary: "bg-red-100 text-red-800",
    secondary: "bg-orange-100 text-orange-800",
    witness: "bg-blue-100 text-blue-800"
  };

  const caseTypeColors = {
    cybercrime: "bg-blue-100 text-blue-800 border-blue-200",
    data_breach: "bg-orange-100 text-orange-800 border-orange-200",
    malware: "bg-red-100 text-red-800 border-red-200",
    fraud: "bg-yellow-100 text-yellow-800 border-yellow-200",
    intellectual_property: "bg-purple-100 text-purple-800 border-purple-200",
    other: "bg-gray-100 text-gray-800 border-gray-200"
  };

  const getCaseProgress = () => {
    if (!caseData.forensic_actions || caseData.forensic_actions.length === 0) return 0;
    const completed = caseData.forensic_actions.filter(a => a.is_completed).length;
    return Math.round((completed / caseData.forensic_actions.length) * 100);
  };

  const getSeverityColor = (caseType: string) => {
    switch (caseType) {
      case 'malware': return 'text-red-600';
      case 'data_breach': return 'text-orange-600';
      case 'cybercrime': return 'text-blue-600';
      case 'fraud': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  useEffect(() => {
    // Real-time subscription disabled to prevent state loops
    return () => {
      // Cleanup function
    };
  }, [caseData.id, onUpdate, isRealtime]);

  const updateCaseStatus = async (newStatus: "open" | "in_progress" | "closed" | "archived") => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("cases")
        .update({ status: newStatus })
        .eq("id", caseData.id);

      if (error) throw error;
      
      toast.success("Status kasus berhasil diperbarui");
      onUpdate();
    } catch (error: unknown) {
      console.error('Error updating case status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error("Gagal memperbarui status: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleActionStatus = async (actionId: string, isCompleted: boolean) => {
    setActionLoading(actionId); // Set loading for this specific action
    
    // Optimistic UI update - update immediately
    const updatedActions = caseData.forensic_actions?.map((action) =>
      action.id === actionId 
        ? { ...action, is_completed: isCompleted }
        : action
    );
    
    // Update parent immediately for instant feedback
    if (updatedActions) {
      const updatedCaseData = { ...caseData, forensic_actions: updatedActions };
      // This will trigger immediate UI update
      setTimeout(() => onUpdate(), 0);
    }
    
    try {
      const { error } = await supabase
        .from("forensic_actions")
        .update({ 
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq("id", actionId);

      if (error) throw error;
      
      toast.success(`Tindakan ${isCompleted ? 'diselesaikan' : 'dibatalkan'}`);
      
      // Real-time subscription will sync with server
    } catch (error: unknown) {
      console.error('Error updating action status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error("Gagal memperbarui tindakan: " + errorMessage);
      // Revert on error
      onUpdate();
    } finally {
      setActionLoading(null); // Clear loading state
    }
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Case Header */}
      <Card className="p-6 shadow-lg border-0 bg-gradient-to-r from-slate-50 to-blue-50/50">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Shield className={`h-6 w-6 ${getSeverityColor(caseData.case_type)}`} />
                <h1 className="text-3xl font-bold text-gray-900">{caseData.case_number}</h1>
              </div>
              <Badge className={`${statusColors[caseData.status as keyof typeof statusColors]} border font-medium px-3 py-1`}>
                {caseData.status === 'open' ? 'Terbuka' : 
                 caseData.status === 'in_progress' ? 'Dalam Progres' :
                 caseData.status === 'closed' ? 'Ditutup' : 'Diarsipkan'}
              </Badge>
              <Badge className={`${caseTypeColors[caseData.case_type as keyof typeof caseTypeColors]} border font-medium px-3 py-1`}>
                {caseData.case_type === 'cybercrime' ? 'Kejahatan Siber' :
                 caseData.case_type === 'data_breach' ? 'Kebocoran Data' :
                 caseData.case_type === 'malware' ? 'Malware' :
                 caseData.case_type === 'fraud' ? 'Penipuan' :
                 caseData.case_type === 'intellectual_property' ? 'Hak Kekayaan Intelektual' : 'Lainnya'}
              </Badge>
            </div>
            <p className="text-gray-700 text-lg mb-4 leading-relaxed">{caseData.summary}</p>
            
            {/* Compact Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600">Progress:</span>
                <div className="flex-1 max-w-xs">
                  <Progress value={getCaseProgress()} className="h-2" />
                </div>
                <span className="text-sm font-semibold text-gray-700">{getCaseProgress()}%</span>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Kejadian:</span>
                {new Date(caseData.incident_date).toLocaleDateString('id-ID', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Dibuat:</span>
                {new Date(caseData.created_at).toLocaleDateString('id-ID', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            {onEdit && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onEdit?.(caseData)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => {
                  if (window.confirm('Apakah Anda yakin ingin menghapus kasus ini? Tindakan ini tidak dapat dibatalkan.')) {
                    onDelete(caseData);
                  }
                }}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Hapus
              </Button>
            )}
            {onEdit && (
              <Select value={caseData.status} onValueChange={updateCaseStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Terbuka</SelectItem>
                  <SelectItem value="in_progress">Dalam Progres</SelectItem>
                  <SelectItem value="closed">Ditutup</SelectItem>
                  <SelectItem value="archived">Diarsipkan</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </Card>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-white shadow-md border">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Ringkasan
          </TabsTrigger>
          <TabsTrigger value="people" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Pihak Terkait
          </TabsTrigger>
          <TabsTrigger value="evidence" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Barang Bukti
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Tindakan
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 shadow-md">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Detail Kejadian
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Nomor Kasus</span>
                  <p className="text-gray-900 font-semibold">{caseData.case_number}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Jenis Kasus</span>
                  <p className="text-gray-900">{caseData.case_type}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Tanggal Kejadian</span>
                  <p className="text-gray-900">{new Date(caseData.incident_date).toLocaleDateString('id-ID', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Status</span>
                  <div className="mt-1">
                    <Badge className={statusColors[caseData.status as keyof typeof statusColors]}>
                      {caseData.status === 'open' ? 'Terbuka' : 
                       caseData.status === 'in_progress' ? 'Dalam Progres' :
                       caseData.status === 'closed' ? 'Ditutup' : 'Diarsipkan'}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-md">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Statistik Kasus
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-blue-700">Total Tersangka</span>
                  <span className="text-2xl font-bold text-blue-900">{caseData.case_suspects?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <span className="text-sm font-medium text-orange-700">Barang Bukti</span>
                  <span className="text-2xl font-bold text-orange-900">{caseData.evidence?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-green-700">Progress</span>
                  <span className="text-2xl font-bold text-green-900">{getCaseProgress()}%</span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* People Tab */}
        <TabsContent value="people" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Victims */}
            <Card className="p-6 shadow-md">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                Korban
                <Badge variant="outline" className="ml-2">
                  {caseData.victims ? '1' : '0'}
                </Badge>
              </h2>
              
              {caseData.victims ? (
                <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50/50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-lg">{caseData.victims.name}</div>
                      <div className="text-sm text-gray-600">Korban Utama</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {caseData.victims.contact && (
                      <div className="flex items-center gap-2 p-2 bg-white rounded">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{caseData.victims.contact}</span>
                      </div>
                    )}
                    {caseData.victims.location && (
                      <div className="flex items-center gap-2 p-2 bg-white rounded">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{caseData.victims.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-lg">
                  <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Belum ada korban</p>
                  <p className="text-sm text-gray-400 mt-1">Tambahkan korban untuk melengkapi data kasus</p>
                </div>
              )}
            </Card>

            {/* Suspects */}
            <Card className="p-6 shadow-md">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <UserX className="h-5 w-5 text-red-500" />
                Tersangka
                <Badge variant="outline" className="ml-2">
                  {caseData.case_suspects?.length || 0}
                </Badge>
              </h2>
              
              {caseData.case_suspects && caseData.case_suspects.length > 0 ? (
                <div className="space-y-3">
                  {caseData.case_suspects.map((caseSuspect) => (
                    <div key={caseSuspect.suspect_id} className="p-4 border-2 border-red-200 rounded-lg bg-red-50/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <UserX className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-lg">{caseSuspect.suspects.name}</div>
                            <div className="text-sm text-gray-600">Tersangka</div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="text-xs">
                            {caseSuspect.involvement_level === 'primary' ? 'Utama' :
                             caseSuspect.involvement_level === 'secondary' ? 'Sekunder' :
                             caseSuspect.involvement_level === 'witness' ? 'Saksi' : 'Tidak Diketahui'}
                          </Badge>
                          <Badge className={
                            caseSuspect.suspects.status === 'suspect' ? 'bg-red-100 text-red-800 border-red-200' :
                            caseSuspect.suspects.status === 'person_of_interest' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                            caseSuspect.suspects.status === 'charged' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                            caseSuspect.suspects.status === 'cleared' ? 'bg-green-100 text-green-800 border-green-200' :
                            'bg-gray-100 text-gray-800 border-gray-200'
                          }>
                            {caseSuspect.suspects.status === 'suspect' ? 'Tersangka' :
                             caseSuspect.suspects.status === 'person_of_interest' ? 'Orang Penting' :
                             caseSuspect.suspects.status === 'charged' ? 'Dituntut' :
                             caseSuspect.suspects.status === 'cleared' ? 'Dibebaskan' : caseSuspect.suspects.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {caseSuspect.suspects.contact && (
                          <div className="flex items-center gap-2 p-2 bg-white rounded">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">{caseSuspect.suspects.contact}</span>
                          </div>
                        )}
                        {caseSuspect.suspects.address && (
                          <div className="flex items-center gap-2 p-2 bg-white rounded">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">{caseSuspect.suspects.address}</span>
                          </div>
                        )}
                        {caseSuspect.suspects.identification_number && (
                          <div className="p-2 bg-white rounded">
                            <span className="text-xs font-medium text-gray-500">Nomor Identitas</span>
                            <p className="text-sm font-mono">{caseSuspect.suspects.identification_number}</p>
                          </div>
                        )}
                        {caseSuspect.suspects.notes && (
                          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <span className="text-xs font-medium text-yellow-700">Catatan</span>
                            <p className="text-sm text-gray-700 mt-1">{caseSuspect.suspects.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-lg">
                  <UserX className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Belum ada tersangka</p>
                  <p className="text-sm text-gray-400 mt-1">Tambahkan tersangka untuk melengkapi data kasus</p>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Evidence Tab */}
        <TabsContent value="evidence" className="space-y-6">
          <Card className="p-6 shadow-md">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              Barang Bukti
              <Badge variant="outline" className="ml-2">
                {caseData.evidence?.length || 0}
              </Badge>
            </h2>
            
            {caseData.evidence && caseData.evidence.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {caseData.evidence.map((item) => (
                  <div key={item.id} className="p-4 border-2 border-orange-200 rounded-lg bg-orange-50/50 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                          <Package className="h-4 w-4 text-orange-600" />
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.evidence_type}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="p-2 bg-white rounded">
                        <span className="text-xs font-medium text-gray-500">Nomor Bukti</span>
                        <p className="text-sm font-mono font-semibold">{item.evidence_number}</p>
                      </div>
                      {item.file_name && (
                        <div className="flex items-center gap-2 p-2 bg-white rounded">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="text-sm truncate">{item.file_name}</span>
                        </div>
                      )}
                      {item.description && (
                        <div className="p-2 bg-white rounded">
                          <span className="text-xs font-medium text-gray-500">Deskripsi</span>
                          <p className="text-sm text-gray-700 mt-1 line-clamp-2">{item.description}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500 p-2 bg-gray-50 rounded">
                        <Calendar className="h-3 w-3" />
                        <span>Diambil: {new Date(item.collection_date).toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-lg">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Belum ada barang bukti</p>
                <p className="text-sm text-gray-400 mt-1">Tambahkan barang bukti untuk melengkapi data kasus</p>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-6">
          <Card className="p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-green-500" />
                Tindakan Forensik
                <Badge variant="outline" className="ml-2">
                  {caseData.forensic_actions?.filter((a) => a.is_completed).length || 0}/{caseData.forensic_actions?.length || 0}
                </Badge>
              </h2>
              <div className="text-sm text-gray-600">
                Progress: {getCaseProgress()}%
              </div>
            </div>
            
            {caseData.forensic_actions && caseData.forensic_actions.length > 0 ? (
              <div className="space-y-3">
                {caseData.forensic_actions.map((action) => (
                  <div 
                    key={action.id} 
                    className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${
                      action.is_completed 
                        ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => onEdit && toggleActionStatus(action.id, !action.is_completed)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {actionLoading === action.id ? (
                          <div className="h-6 w-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                        ) : action.is_completed ? (
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 border-2 border-gray-300 rounded-full flex items-center justify-center">
                            <Circle className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold text-lg">{action.action_type}</div>
                          {action.is_completed && (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              Selesai
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 mb-2">{action.description}</div>
                        {action.is_completed && action.completed_at && (
                          <div className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Selesai: {new Date(action.completed_at).toLocaleDateString('id-ID', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                        {action.performed_by && (
                          <div className="text-xs text-gray-500 mt-1">
                            Pelaksana: {action.performed_by}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-lg">
                <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Belum ada tindakan forensik</p>
                <p className="text-sm text-gray-400 mt-1">Tambahkan tindakan forensik untuk memulai proses penanganan</p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
