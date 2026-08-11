"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { 
  LayoutDashboard, 
  Calendar, 
  RefreshCcw, 
  Lightbulb, 
  MessageSquare, 
  Link2, 
  BarChart3, 
  Sun, 
  Moon, 
  LogOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isAuthenticated || pathname === "/login" || pathname === "/register") {
    return null;
  }

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/scheduling", label: "Scheduling", icon: Calendar },
    { href: "/rescheduling", label: "Rescheduling", icon: RefreshCcw },
    { href: "/insights", label: "AI Insights", icon: Lightbulb },
    { href: "/chat", label: "AI Chat", icon: MessageSquare },
    { href: "/upload", label: "Data Connect", icon: Link2 },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <aside 
      className={cn(
        "glass z-50 h-screen transition-all duration-300 flex flex-col border-r border-border",
        collapsed ? "w-[72px]" : "w-[280px]"
      )}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-border/50">
        {!collapsed && (
          <span className="font-bold text-xl text-gradient truncate">
            ManuMind AI
          </span>
        )}
        {collapsed && (
          <span className="font-bold text-xl text-gradient mx-auto">
            M
          </span>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors hidden md:block text-muted-foreground"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                isActive 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-foreground"
              )}
              title={collapsed ? link.label : undefined}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
              )}
              <Icon size={20} className={cn("shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              {!collapsed && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50 space-y-3">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={cn(
              "flex items-center space-x-3 px-3 py-2.5 rounded-lg w-full text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-foreground transition-colors",
              collapsed && "justify-center px-0"
            )}
            title={collapsed ? "Toggle Theme" : undefined}
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            {!collapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
          </button>
        )}

        <div className={cn(
          "flex items-center pt-2 mt-2 border-t border-border/50",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <div className="flex flex-col truncate pr-2">
              <span className="text-sm font-medium truncate">{user?.fullName || "Admin User"}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.email || "admin@manumind.ai"}</span>
            </div>
          )}
          <button
            onClick={logout}
            className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
