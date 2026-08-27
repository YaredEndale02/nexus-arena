import { Link, useLocation } from "react-router-dom";
import { Trophy, Swords, Radio, BarChart3, Users, User, Shield, LogOut, ClipboardCheck, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
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

export function Navbar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const canManageTournaments = Boolean(user && ["ORGANIZER", "ADMIN"].includes(user.role));

  const navItems = [
    { key: "navTournaments" as const, label: t("navTournaments"), path: "/", icon: Trophy },
    { key: "navBrackets" as const, label: t("navBrackets"), path: "/bracket", icon: Swords },
    { key: "navLive" as const, label: t("navLive"), path: "/live", icon: Radio },
    { key: "navTeams" as const, label: t("navTeams"), path: "/teams", icon: Users },
    { key: "navMyRegistrations" as const, label: t("navMyRegistrations"), path: "/registrations", icon: ClipboardCheck },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (user?.role === "ORGANIZER") {
      return !["navTeams", "navMyRegistrations"].includes(item.key);
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

          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="ADWA ARENA"
              className="w-10 h-10 sm:w-11 sm:h-11 object-contain rounded-xl drop-shadow-[0_0_15px_rgba(234,179,8,0.4)] group-hover:scale-105 transition-transform"
            />
            <span className="font-heading text-lg sm:text-xl font-black tracking-wider text-foreground">
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
          <LanguageSwitcher />
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
              <DropdownMenuContent align="end" className="w-60 glass border-white/10 p-2">
                <DropdownMenuLabel className="space-y-1">
                  <p className="font-bold text-foreground truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate font-normal">{user.email}</p>
                  <div className="pt-1">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/30">
                      {user.role === "ORGANIZER" ? t("roleOrganizer") : t("rolePlayer")}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer font-semibold text-primary">
                    <Shield className="mr-2 h-4 w-4" />
                    {user.role === "PLAYER" ? t("roleSwitchToOrganizer") : t("roleSwitchToPlayer")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer">
                    <BarChart3 className="mr-2 h-4 w-4 text-primary" />
                    {t("navProfile")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={logout} className="text-red-400 focus:text-red-400 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("navSignOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={() => setIsAuthModalOpen(true)}
              className="font-bold bg-primary text-primary-foreground text-xs h-9 sm:h-10 px-3 sm:px-4 rounded-xl shadow-lg hover:brightness-110"
            >
              <User className="w-4 h-4 mr-1.5" />
              {t("navSignIn")}
            </Button>
          )}

          <AuthModal isOpen={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-black/40 backdrop-blur-xl animate-in slide-in-from-top duration-300">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Language / ቋንቋ</span>
              <LanguageSwitcher />
            </div>
            {filteredNavItems.map((item) => (
              <Link
                key={item.key}
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
                {t("navAdmin")}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
