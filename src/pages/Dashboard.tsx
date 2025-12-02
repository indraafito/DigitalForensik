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
  Shield,
  Activity,
  Target,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart } from "recharts";
import { useTheme } from "next-themes";

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
  const { theme } = useTheme();
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
  const darkMode = theme === "dark";

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
      bgColor: "glass",
      borderColor: "border-border/50",
      description: "Semua kasus terdaftar",
    },
    {
      title: "Tingkat Penyelesaian",
      value: `${stats.totalCases > 0 ? Math.round((stats.closedCases / stats.totalCases) * 100) : 0}%`,
      icon: Target,
      color: "text-primary",
      bgColor: "glass",
      borderColor: "border-border/50",
      description: "Kasus yang telah selesai",
    },
  ];

  const statusCards = [
    { 
      title: "Kasus Terbuka", 
      value: stats.openCases, 
      icon: AlertCircle, 
      color: "text-destructive",
      bgColor: "glass",
      borderColor: "border-border/50"
    },
    { 
      title: "Dalam Progress", 
      value: stats.inProgressCases, 
      icon: Clock, 
      color: "text-accent",
      bgColor: "glass",
      borderColor: "border-border/50"
    },
    { 
      title: "Kasus Selesai", 
      value: stats.closedCases, 
      icon: CheckCircle2, 
      color: "text-primary",
      bgColor: "glass",
      borderColor: "border-border/50"
    },
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
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="flex-1 space-y-4 sm:space-y-6 animate-fade-in p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Ringkasan dan analitik sistem forensik digital
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
          {statCards.map((stat, index) => (
            <Card key={index} className={`glass-strong border ${stat.borderColor} shadow-glow transition-all duration-300 hover:shadow-glow-strong animate-slide-up`} style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="relative p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="rounded-xl p-2 sm:p-3 bg-primary/10">
                    <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`} />
                  </div>
                  <div className="text-xs font-medium text-muted-foreground bg-primary/10 px-2 py-1 rounded-full">
                    {stat.description}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-2xl sm:text-3xl font-bold">{stat.value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

      {/* Status Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {statusCards.map((stat, index) => (
          <Card key={index} className={`glass border ${stat.borderColor} shadow-glow transition-all duration-300 hover:shadow-glow-strong animate-slide-up`} style={{ animationDelay: `${(index + 2) * 0.1}s` }}>
            <div className="relative p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="rounded-xl p-2 sm:p-3 bg-primary/10">
                  <stat.icon className={`h-6 w-6 sm:h-8 sm:w-8 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl sm:text-3xl font-bold">{stat.value}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 xl:grid-cols-2">
        {/* Case Types Pie Chart */}
        <Card className="glass-strong border border-border/50 shadow-glow">
          <div className="relative p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold">Jenis Kasus</h3>
              <div className="rounded-lg p-2 bg-primary/10">
                <FileSearch className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={caseTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {caseTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: any) => {
                    return [<span style={{ color: "hsl(var(--foreground))" }}>{value}</span>, null];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Monthly Trend Line Chart */}
        <Card className="glass-strong border border-border/50 shadow-glow">
          <div className="relative p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold">Tren Kasus Bulanan</h3>
              <div className="rounded-lg p-2 bg-primary/10">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: any) => {
                    return [<span style={{ color: "hsl(var(--foreground))" }}>{value}</span>, null];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cases"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCases)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Case Status Bar Chart */}
      <Card className="glass-strong border border-border/50 shadow-glow">
        <div className="relative p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-bold">Status Kasus</h3>
            <div className="rounded-lg p-2 bg-primary/10">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={[
                { name: "Terbuka", value: stats.openCases, color: "#ef4444" },
                { name: "Progress", value: stats.inProgressCases, color: "#f97316" },
                { name: "Selesai", value: stats.closedCases, color: "#22c55e" },
                { name: "Arsip", value: 0, color: "#6b7280" },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: any) => {
                  return [<span style={{ color: "hsl(var(--foreground))" }}>{value}</span>, null];
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {[
                  { fill: "#ef4444" },
                  { fill: "#f97316" },
                  { fill: "#22c55e" },
                  { fill: "#6b7280" }
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      </div>
    </div>
  );
}
