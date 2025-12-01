import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  FolderOpen,
  Users,
  FileSearch,
  ClipboardCheck,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

interface Stats {
  totalCases: number;
  openCases: number;
  inProgressCases: number;
  closedCases: number;
  totalVictims: number;
  totalEvidence: number;
  totalActions: number;
  completedActions: number;
}

interface CaseTypeData {
  name: string;
  value: number;
}

interface MonthlyTrend {
  month: string;
  cases: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalCases: 0,
    openCases: 0,
    inProgressCases: 0,
    closedCases: 0,
    totalVictims: 0,
    totalEvidence: 0,
    totalActions: 0,
    completedActions: 0,
  });
  const [caseTypeData, setCaseTypeData] = useState<CaseTypeData[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch cases
      const { data: cases } = await supabase.from("cases").select("*");
      
      // Fetch victims
      const { data: victims } = await supabase.from("victims").select("id");
      
      // Fetch evidence
      const { data: evidence } = await supabase.from("evidence").select("*");
      
      // Fetch forensic actions
      const { data: actions } = await supabase.from("forensic_actions").select("*");

      // Calculate stats
      const openCases = cases?.filter((c) => c.status === "open").length || 0;
      const inProgressCases = cases?.filter((c) => c.status === "in_progress").length || 0;
      const closedCases = cases?.filter((c) => c.status === "closed").length || 0;
      const completedActions = actions?.filter((a) => a.is_completed).length || 0;

      setStats({
        totalCases: cases?.length || 0,
        openCases,
        inProgressCases,
        closedCases,
        totalVictims: victims?.length || 0,
        totalEvidence: evidence?.length || 0,
        totalActions: actions?.length || 0,
        completedActions,
      });

      // Calculate case types
      const caseTypes = cases?.reduce((acc: Record<string, number>, curr) => {
        acc[curr.case_type] = (acc[curr.case_type] || 0) + 1;
        return acc;
      }, {});

      setCaseTypeData(
        Object.entries(caseTypes || {}).map(([name, value]) => ({
          name: name.replace(/_/g, " "),
          value,
        }))
      );

      // Calculate monthly trend (last 6 months)
      const monthlyData = new Map<string, number>();
      cases?.forEach((c) => {
        const date = new Date(c.created_at);
        const monthYear = date.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
        monthlyData.set(monthYear, (monthlyData.get(monthYear) || 0) + 1);
      });

      setMonthlyTrend(
        Array.from(monthlyData.entries()).map(([month, cases]) => ({
          month,
          cases,
        }))
      );

      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Kasus",
      value: stats.totalCases,
      icon: FolderOpen,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Korban",
      value: stats.totalVictims,
      icon: Users,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Barang Bukti",
      value: stats.totalEvidence,
      icon: FileSearch,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Tindakan Selesai",
      value: `${stats.completedActions}/${stats.totalActions}`,
      icon: ClipboardCheck,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  const statusCards = [
    { title: "Kasus Terbuka", value: stats.openCases, icon: AlertCircle, color: "text-destructive" },
    { title: "Dalam Progress", value: stats.inProgressCases, icon: Clock, color: "text-accent" },
    { title: "Kasus Selesai", value: stats.closedCases, icon: CheckCircle2, color: "text-primary" },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Ringkasan dan analitik sistem forensik digital</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="glass shadow-glow overflow-hidden transition-all hover:shadow-glow-strong animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="mt-2 text-3xl font-bold">{stat.value}</p>
                </div>
                <div className={`rounded-2xl p-3 ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {statusCards.map((stat, index) => (
          <Card key={index} className="glass shadow-glow overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Case Types Pie Chart */}
        <Card className="glass shadow-glow p-6">
          <h3 className="mb-4 text-lg font-semibold">Jenis Kasus</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={caseTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => entry.name}
                outerRadius={80}
                fill="hsl(var(--primary))"
                dataKey="value"
              >
                {caseTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Monthly Trend Line Chart */}
        <Card className="glass shadow-glow p-6">
          <h3 className="mb-4 text-lg font-semibold">Tren Kasus Bulanan</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="cases"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Case Status Bar Chart */}
      <Card className="glass shadow-glow p-6">
        <h3 className="mb-4 text-lg font-semibold">Status Kasus</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={[
              { name: "Terbuka", value: stats.openCases },
              { name: "Progress", value: stats.inProgressCases },
              { name: "Selesai", value: stats.closedCases },
              { name: "Arsip", value: 0 },
            ]}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
