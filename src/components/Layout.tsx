import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  FileSearch,
  ClipboardList,
  LogOut,
  Menu,
  X,
  Shield,
  Moon,
  Sun,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "next-themes";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, userRole, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const canManage = userRole === "admin" || userRole === "investigator";

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, show: true },
    { name: "Korban", href: "/victims", icon: Users, show: true },
    { name: "Kasus", href: "/cases", icon: FolderOpen, show: true },
    { name: "Barang Bukti", href: "/evidence", icon: FileSearch, show: true },
    { name: "Tindakan Forensik", href: "/forensic-actions", icon: ClipboardList, show: true },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="glass-strong flex h-full flex-col border-r shadow-glow">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-border/50 px-6">
            <div className="rounded-lg bg-gradient-to-br from-primary to-accent p-2">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold">Digital Forensic</h1>
              <p className="text-xs text-muted-foreground">Incident Handling</p>
            </div>
          </div>

          {/* User info */}
          <div className="glass mx-4 mt-4 rounded-xl border p-4">
            <p className="text-sm font-medium">{user?.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {userRole}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map(
              (item) =>
                item.show && (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
                    activeClassName="bg-primary/20 text-primary shadow-glow"
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </NavLink>
                )
            )}
          </nav>

          {/* Bottom actions */}
          <div className="space-y-2 border-t border-border/50 p-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={signOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Top bar */}
        <header className="glass-strong sticky top-0 z-30 flex h-16 items-center gap-4 border-b px-4 shadow-glow lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div className="flex flex-1 items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Digital Forensic System</h2>
              <p className="text-xs text-muted-foreground">Incident Handling & Investigation</p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
