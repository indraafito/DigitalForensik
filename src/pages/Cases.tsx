import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderOpen } from "lucide-react";
import { toast } from "sonner";

export default function Cases() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("*, victims(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error: any) {
      toast.error("Gagal memuat data kasus");
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    open: "bg-destructive/10 text-destructive",
    in_progress: "bg-accent/10 text-accent",
    closed: "bg-primary/10 text-primary",
    archived: "bg-muted",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kasus</h1>
          <p className="text-muted-foreground">Kelola kasus investigasi forensik digital</p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : cases.length > 0 ? (
        <div className="grid gap-4">
          {cases.map((c) => (
            <Card key={c.id} className="glass shadow-glow p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">{c.case_number}</h3>
                    <Badge className={statusColors[c.status as keyof typeof statusColors]}>{c.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.summary}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass shadow-glow p-12 text-center">
          <h3 className="text-lg font-semibold">Belum ada kasus</h3>
        </Card>
      )}
    </div>
  );
}
