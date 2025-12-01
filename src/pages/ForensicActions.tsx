import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";

export default function ForensicActions() {
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActions();
  }, []);

  const fetchActions = async () => {
    try {
      const { data, error } = await supabase
        .from("forensic_actions")
        .select("*, cases(case_number)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setActions(data || []);
    } catch (error: any) {
      toast.error("Gagal memuat tindakan forensik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tindakan Forensik</h1>
        <p className="text-muted-foreground">Kelola tindakan investigasi forensik</p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : actions.length > 0 ? (
        <div className="grid gap-4">
          {actions.map((a) => (
            <Card key={a.id} className="glass shadow-glow p-6">
              <ClipboardList className="mb-2 h-5 w-5 text-primary" />
              <h3 className="font-semibold">{a.action_type}</h3>
              <p className="text-sm text-muted-foreground">{a.description}</p>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass shadow-glow p-12 text-center">
          <h3>Belum ada tindakan forensik</h3>
        </Card>
      )}
    </div>
  );
}
