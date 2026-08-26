import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, KeyRound, Mail, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Step = "request" | "sent" | "set-password" | "done";

export default function AuthResetPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("request");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detect if Supabase put a recovery token in the hash
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", "?").replace("#", "&"));
    const type = params.get("type");
    const accessToken = params.get("access_token");

    if (type === "recovery" && accessToken && supabase) {
      // Set the session from the recovery link so updateUser works
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: params.get("refresh_token") ?? "",
      }).then(() => setStep("set-password"));
    }
  }, []);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return;
    setIsSubmitting(true);
    try {
      await resetPassword(identifier);
      setStep("sent");
    } catch (err) {
      toast({
        title: "Failed to send reset link",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (!supabase) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStep("done");
      setTimeout(() => navigate("/settings"), 2500);
    } catch (err) {
      toast({
        title: "Could not update password",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="glass border border-white/10 rounded-2xl p-8 sm:p-10 max-w-md w-full space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-neon-purple flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Reset Password</h1>
            <p className="text-xs text-muted-foreground">Nexus Arena account recovery</p>
          </div>
        </div>

        {/* Step 1: request reset email */}
        {step === "request" && (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Email or Phone Number
              </Label>
              <Input
                id="identifier"
                type="text"
                placeholder="you@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="bg-white/5 border-white/10"
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting || !identifier}
              className="w-full bg-primary text-primary-foreground font-bold"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Send Reset Link
            </Button>
            <Button asChild variant="ghost" className="w-full text-muted-foreground text-xs">
              <Link to="/">Back to Arena</Link>
            </Button>
          </form>
        )}

        {/* Step 2: email sent confirmation */}
        {step === "sent" && (
          <div className="text-center space-y-4">
            <Mail className="w-14 h-14 text-primary mx-auto" />
            <div>
              <p className="font-heading text-xl font-bold text-foreground">Check your inbox</p>
              <p className="text-sm text-muted-foreground mt-2">
                We sent a reset link to <span className="text-foreground font-semibold">{identifier}</span>.
                Click the link in the email to set a new password.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full border-white/10">
              <Link to="/">Back to Arena</Link>
            </Button>
          </div>
        )}

        {/* Step 3: set new password (after clicking email link) */}
        {step === "set-password" && (
          <form onSubmit={handleSetPassword} className="space-y-4">
            <p className="text-sm text-muted-foreground">Choose a new password for your account.</p>
            <div className="space-y-2">
              <Label htmlFor="new-password" className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" />
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="bg-white/5 border-white/10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                placeholder="Repeat new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="bg-white/5 border-white/10"
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting || !password || !confirm}
              className="w-full bg-primary text-primary-foreground font-bold"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update Password
            </Button>
          </form>
        )}

        {/* Step 4: done */}
        {step === "done" && (
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
            <div>
              <p className="font-heading text-xl font-bold text-foreground">Password Updated!</p>
              <p className="text-sm text-muted-foreground mt-2">Redirecting you to your settings…</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
