import { Link, useLocation } from "react-router-dom";
import { Trophy, Swords, Radio, BarChart3, Users, User, Shield, LogOut, ClipboardCheck, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "./AuthModal";
import { NotificationBell } from "./NotificationBell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const canManageTournaments = Boolean(user && ["ORGANIZER", "ADMIN"].includes(user.role));

  const filteredNavItems = navItems.filter((item) => {
    if (user?.role === "ORGANIZER") {
      return !["Teams", "Registrations"].includes(item.label);
    }
    return true;
  });

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/10">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-primary to-neon-purple flex items-center justify-center">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-lg sm:text-xl font-bold tracking-wider text-foreground">
              ADWA <span className="text-primary">ARENA</span>
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path && item.label !== "Tournaments" && item.label !== "Teams";
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

        {/* User Profile & Notifications */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <NotificationBell />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-2 py-1 sm:px-3 sm:py-1.5 hover:bg-white/10 transition-colors">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-neon-purple to-primary flex items-center justify-center">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-semibold text-foreground">{user.name}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {user.role}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 glass border-white/10">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer">
                    <BarChart3 className="mr-2 h-4 w-4 text-primary" />
                    Settings & Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={logout} className="text-red-400 focus:text-red-400 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={() => setIsAuthModalOpen(true)}
              className="font-bold bg-primary text-primary-foreground text-xs h-9 sm:h-10 px-3 sm:px-4 rounded-xl shadow-lg hover:brightness-110"
            >
              <User className="w-4 h-4 mr-1.5" />
              Sign In / Register
            </Button>
          )}

          <AuthModal isOpen={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-black/40 backdrop-blur-xl animate-in slide-in-from-top duration-300">
          <div className="p-4 space-y-2">
            {filteredNavItems.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                  location.pathname === item.path ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-white/5"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
            {canManageTournaments && (
              <Link
                to="/admin/tournaments"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                  location.pathname === "/admin/tournaments" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-primary hover:bg-primary/5"
                )}
              >
                <Shield className="w-4 h-4" />
                Tournament Control
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
