import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { FileSearch } from "lucide-react";
import { toast } from "sonner";

export default function Evidence() {
  const [evidence, setEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvidence();
  }, []);

  const fetchEvidence = async () => {
    try {
      const { data, error } = await supabase
        .from("evidence")
        .select("*, cases(case_number)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEvidence(data || []);
    } catch (error: any) {
      toast.error("Gagal memuat barang bukti");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Barang Bukti Digital</h1>
        <p className="text-muted-foreground">Kelola bukti digital dengan hash SHA-256</p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : evidence.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {evidence.map((e) => (
            <Card key={e.id} className="glass shadow-glow p-6">
              <FileSearch className="mb-2 h-6 w-6 text-primary" />
              <h3 className="font-semibold">{e.evidence_number}</h3>
              <p className="text-sm text-muted-foreground">{e.description}</p>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass shadow-glow p-12 text-center">
          <h3>Belum ada barang bukti</h3>
        </Card>
      )}
    </div>
  );
}
