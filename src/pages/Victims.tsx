import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, User, Phone, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Victim {
  id: string;
  name: string;
  contact: string | null;
  location: string | null;
  address: string | null;
  report_date: string;
  description: string | null;
  created_at: string;
}

export default function Victims() {
  const { userRole, user } = useAuth();
  const [victims, setVictims] = useState<Victim[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVictim, setEditingVictim] = useState<Victim | null>(null);
  const canManage = userRole === "admin" || userRole === "investigator";

  useEffect(() => {
    fetchVictims();
  }, []);

  const fetchVictims = async () => {
    try {
      const { data, error } = await supabase
        .from("victims")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVictims(data || []);
    } catch (error: any) {
      toast.error("Gagal memuat data korban");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const victimData = {
      name: formData.get("name") as string,
      contact: formData.get("contact") as string,
      location: formData.get("location") as string,
      address: formData.get("address") as string,
      report_date: formData.get("report_date") as string,
      description: formData.get("description") as string,
      created_by: user?.id,
    };

    try {
      if (editingVictim) {
        const { error } = await supabase
          .from("victims")
          .update(victimData)
          .eq("id", editingVictim.id);

        if (error) throw error;
        toast.success("Data korban berhasil diperbarui");
      } else {
        const { error } = await supabase.from("victims").insert([victimData]);

        if (error) throw error;
        toast.success("Data korban berhasil ditambahkan");
      }

      // Log activity
      await supabase.from("activity_logs").insert([
        {
          user_id: user?.id,
          action: editingVictim ? "UPDATE" : "CREATE",
          entity_type: "victim",
          entity_id: editingVictim?.id,
          details: { name: victimData.name },
        },
      ]);

      setDialogOpen(false);
      setEditingVictim(null);
      fetchVictims();
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus data korban ini?")) return;

    try {
      const { error } = await supabase.from("victims").delete().eq("id", id);

      if (error) throw error;

      await supabase.from("activity_logs").insert([
        {
          user_id: user?.id,
          action: "DELETE",
          entity_type: "victim",
          entity_id: id,
        },
      ]);

      toast.success("Data korban berhasil dihapus");
      fetchVictims();
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus data korban");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Korban</h1>
          <p className="text-muted-foreground">Kelola informasi korban kejahatan digital</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-gradient-to-r from-primary to-accent shadow-glow hover:shadow-glow-strong"
                onClick={() => setEditingVictim(null)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Tambah Korban
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingVictim ? "Edit" : "Tambah"} Data Korban</DialogTitle>
                <DialogDescription>
                  Masukkan informasi lengkap korban kejahatan digital
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Lengkap *</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingVictim?.name}
                      required
                      className="glass"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact">Kontak</Label>
                    <Input
                      id="contact"
                      name="contact"
                      defaultValue={editingVictim?.contact || ""}
                      className="glass"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="location">Lokasi</Label>
                    <Input
                      id="location"
                      name="location"
                      defaultValue={editingVictim?.location || ""}
                      className="glass"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="report_date">Tanggal Laporan *</Label>
                    <Input
                      id="report_date"
                      name="report_date"
                      type="date"
                      defaultValue={editingVictim?.report_date || new Date().toISOString().split("T")[0]}
                      required
                      className="glass"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Alamat Lengkap</Label>
                  <Textarea
                    id="address"
                    name="address"
                    defaultValue={editingVictim?.address || ""}
                    className="glass"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi Singkat</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={editingVictim?.description || ""}
                    className="glass"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-primary to-accent">
                    {editingVictim ? "Simpan" : "Tambah"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Memuat data...</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {victims.map((victim, index) => (
            <Card key={victim.id} className="glass shadow-glow hover:shadow-glow-strong transition-all animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
              <div className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{victim.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(victim.report_date), "dd MMM yyyy", { locale: localeId })}
                      </p>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingVictim(victim);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {userRole === "admin" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(victim.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  {victim.contact && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {victim.contact}
                    </div>
                  )}
                  {victim.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {victim.location}
                    </div>
                  )}
                  {victim.description && (
                    <p className="mt-3 text-muted-foreground line-clamp-2">{victim.description}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && victims.length === 0 && (
        <Card className="glass shadow-glow p-12 text-center">
          <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">Belum ada data korban</h3>
          <p className="text-muted-foreground">Mulai tambahkan data korban untuk sistem forensik</p>
        </Card>
      )}
    </div>
  );
}
