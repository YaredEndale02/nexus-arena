import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, type UserRole } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, KeyRound, Sparkles, Shield, User, MapPin, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthPanelProps {
  title?: string;
  description?: string;
  onSuccess?: () => void;
}

export function AuthPanel({
  title = "Sign In / Register",
  description = "Access tournament brackets, LAN station desks, and live broadcasts.",
  onSuccess,
}: AuthPanelProps) {
  const { signIn, signUp, signInWithProvider, resetPassword, isLoading } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "forgot-password">("sign-in");
  
  // Registration Role State
  const [role, setRole] = useState<Exclude<UserRole, "ADMIN">>("PLAYER");
  
  // Credentials & Meta State
  const [identifier, setIdentifier] = useState(""); // Phone number or Email
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [riotId, setRiotId] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [venueLocation, setVenueLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === "forgot-password") {
        await resetPassword(identifier);
        toast({
          title: "Password reset link sent",
          description: "Check your email/SMS instructions to reset your password.",
        });
        setMode("sign-in");
      } else if (mode === "sign-in") {
        await signIn(identifier, password);
        toast({
          title: "Signed in successfully",
          description: "Welcome back to ADWA ARENA!",
        });
        onSuccess?.();
      } else {
        const result = await signUp({
          identifier,
          password,
          name: role === "ORGANIZER" ? (name || organizationName) : name,
          riotId: role === "PLAYER" ? (riotId || undefined) : undefined,
          organizationName: role === "ORGANIZER" ? (organizationName || name) : undefined,
          venueLocation: role === "ORGANIZER" ? (venueLocation || undefined) : undefined,
          role,
        });

        toast({
          title: result.pendingConfirmation ? "Confirm account" : "Account created",
          description: result.pendingConfirmation
            ? "Your account is registered. You can now sign in."
            : `Welcome! Your ${role.toLowerCase()} account is ready.`,
        });

        if (!result.pendingConfirmation) {
          onSuccess?.();
        } else {
          setMode("sign-in");
        }
      }
    } catch (error) {
      toast({
        title: "Authentication failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = async (provider: "discord" | "google") => {
    try {
      await signInWithProvider(provider);
    } catch (err) {
      toast({
        title: "Social login failed",
        description: (err as any)?.message || "Could not connect to provider",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="glass border-white/10 shadow-2xl w-full max-w-md mx-auto overflow-hidden">
      <CardHeader className="p-5 sm:p-7 pb-3 sm:pb-4 space-y-1.5">
        <CardTitle className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight">{title}</CardTitle>
        <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{description}</CardDescription>
      </CardHeader>

      <CardContent className="p-5 sm:p-7 pt-0 space-y-5 sm:space-y-6">
        {/* Mode Switcher Tabs */}
        <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            className={cn(
              "flex-1 py-2 sm:py-2.5 rounded-lg text-xs font-bold transition-all text-center",
              mode === "sign-in" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setMode("sign-in")}
          >
            Sign In
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 py-2 sm:py-2.5 rounded-lg text-xs font-bold transition-all text-center",
              mode === "sign-up" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setMode("sign-up")}
          >
            Register Account
          </button>
        </div>

        {/* 1-Click Social Logins */}
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialLogin("discord")}
            className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 text-xs font-bold gap-2 h-10 sm:h-11"
          >
            🎮 Discord
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialLogin("google")}
            className="border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 text-xs font-bold gap-2 h-10 sm:h-11"
          >
            🌐 Google
          </Button>
        </div>

        <div className="relative flex items-center justify-center my-2">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-background px-3 text-[10px] text-muted-foreground uppercase font-mono shrink-0 tracking-wider">
            or continue below
          </span>
          <div className="border-t border-white/10 w-full" />
        </div>

        {/* Role Selector Cards (Only shown during Sign-Up) */}
        {mode === "sign-up" && (
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground uppercase tracking-wider">Select Account Role</Label>
            <div className="grid grid-cols-2 gap-2.5">
              <div
                onClick={() => setRole("PLAYER")}
                className={cn(
                  "p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3",
                  role === "PLAYER"
                    ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/50"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
                )}
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">Player</p>
                  <p className="text-[10px] text-muted-foreground truncate">Tournaments & teams</p>
                </div>
              </div>

              <div
                onClick={() => setRole("ORGANIZER")}
                className={cn(
                  "p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3",
                  role === "ORGANIZER"
                    ? "border-amber-500/50 bg-amber-500/10 text-foreground ring-1 ring-amber-500/50"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
                )}
              >
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">Organizer</p>
                  <p className="text-[10px] text-muted-foreground truncate">Host LANs & desks</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* PLAYER-Specific Registration Fields (Vertical 1-Column for clean breathing room) */}
          {mode === "sign-up" && role === "PLAYER" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="auth-name" className="text-xs font-bold">Gamer Tag / Display Name</Label>
                <Input
                  id="auth-name"
                  placeholder="e.g. ApexLegend"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-sm h-10 sm:h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-riot" className="text-xs font-bold">Riot ID / Tag (Optional)</Label>
                <Input
                  id="auth-riot"
                  placeholder="e.g. Player#1234"
                  value={riotId}
                  onChange={(e) => setRiotId(e.target.value)}
                  className="bg-white/5 border-white/10 text-sm h-10 sm:h-11"
                />
              </div>
            </>
          )}

          {/* ORGANIZER-Specific Registration Fields (Vertical 1-Column) */}
          {mode === "sign-up" && role === "ORGANIZER" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="auth-org-name" className="text-xs font-bold flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-amber-400" /> Club / Org Name
                </Label>
                <Input
                  id="auth-org-name"
                  placeholder="e.g. Addis Esports Arena"
                  value={organizationName}
                  onChange={(e) => {
                    setOrganizationName(e.target.value);
                    setName(e.target.value);
                  }}
                  required
                  className="bg-white/5 border-white/10 text-sm h-10 sm:h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-venue" className="text-xs font-bold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" /> Venue / City
                </Label>
                <Input
                  id="auth-venue"
                  placeholder="e.g. Addis Ababa"
                  value={venueLocation}
                  onChange={(e) => setVenueLocation(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-sm h-10 sm:h-11"
                />
              </div>
            </>
          )}

          {/* Identifier Input (Phone or Email) */}
          <div className="space-y-2">
            <Label htmlFor="auth-identifier" className="text-xs font-bold flex items-center justify-between">
              <span>{role === "ORGANIZER" && mode === "sign-up" ? "Official Email / Phone" : "Phone Number or Email"}</span>
              <span className="text-[10px] text-primary font-mono font-bold">
                {role === "PLAYER" && mode === "sign-up" ? "Phone Preferred" : "Email Preferred"}
              </span>
            </Label>
            <div className="relative">
              <Input
                id="auth-identifier"
                placeholder={role === "PLAYER" ? "0911223344 or name@example.com" : "organizer@adwa.local"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-sm pr-10 h-10 sm:h-11"
              />
              <div className="absolute right-3.5 top-3 text-muted-foreground pointer-events-none">
                {identifier.includes("@") ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4 text-primary" />}
              </div>
            </div>
          </div>

          {mode !== "forgot-password" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="auth-password" className="text-xs font-bold">Password</Label>
                {mode === "sign-in" && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot-password")}
                    className="text-[11px] text-primary font-bold hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <Input
                id="auth-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-sm h-10 sm:h-11"
              />
            </div>
          )}

          <Button type="submit" className="w-full font-black uppercase tracking-wider h-11 sm:h-12 text-xs sm:text-sm gap-2 mt-2" disabled={isSubmitting || isLoading}>
            {isSubmitting ? (
              "Working..."
            ) : mode === "forgot-password" ? (
              <><KeyRound className="w-4 h-4" /> Reset Password</>
            ) : mode === "sign-in" ? (
              "Sign In to Arena"
            ) : (
              <><Sparkles className="w-4 h-4" /> Create {role === "ORGANIZER" ? "Organizer" : "Player"} Account</>
            )}
          </Button>

          {mode === "forgot-password" && (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-xs h-9 mt-1"
              onClick={() => setMode("sign-in")}
            >
              Back to Sign In
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
