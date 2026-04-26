import { Link, useLocation } from "react-router-dom";
import { Trophy, Swords, Radio, BarChart3, Users, User, Shield, LogOut, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { AuthPanel } from "@/components/AuthPanel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { label: "Tournaments", path: "/", icon: Trophy },
  { label: "Bracket", path: "/bracket", icon: Swords },
  { label: "Live", path: "/live", icon: Radio },
  { label: "Teams", path: "/teams", icon: Users },
  { label: "Registrations", path: "/registrations", icon: ClipboardCheck },
];

export function Navbar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const canManageTournaments = Boolean(user && ["ORGANIZER", "ADMIN"].includes(user.role));

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/10">
      <div className="max-w-[1600px] mx-auto px-6 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-neon-purple flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-heading text-xl font-bold tracking-wider text-foreground">
            ARENA<span className="text-primary">X</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path &&
              item.label !== "Tournaments" &&
              item.label !== "Teams";
            return (
              <Link
                key={item.label}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary neon-glow-blue"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {item.label === "Live" && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </Link>
            );
          })}
          {canManageTournaments && (
            <Link
              to="/admin/tournaments"
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                location.pathname === "/admin/tournaments"
                  ? "bg-primary/10 text-primary neon-glow-blue"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <Shield className="w-4 h-4 text-primary" />
              Tournament Control
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button className="relative p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] font-bold flex items-center justify-center text-primary-foreground">3</span>
            <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10 transition-colors">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-purple to-primary flex items-center justify-center">
                  <User className="w-5 h-5 text-foreground" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-foreground">{user?.name ?? "Guest"}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {user?.role ?? "Not signed in"}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {user ? (
                <>
                  <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-400 focus:text-red-400">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </>
              ) : (
                <div className="p-2">
                  <AuthPanel title="Sign in" description="Access your organizer workspace." />
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
