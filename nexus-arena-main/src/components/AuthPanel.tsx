import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, type UserRole } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface AuthPanelProps {
  title?: string;
  description?: string;
}

export function AuthPanel({
  title = "Sign in",
  description = "Use your Supabase account to access organizer and team operations.",
}: AuthPanelProps) {
  const { signIn, signUp, isLoading } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [riotId, setRiotId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [role, setRole] = useState<Exclude<UserRole, "ADMIN">>("PLAYER");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === "sign-in") {
        await signIn(email, password);
        toast({
          title: "Signed in",
          description: "Your Supabase session is ready.",
        });
      } else {
        const result = await signUp({
          email,
          password,
          name,
          riotId: riotId || undefined,
          phoneNumber: phoneNumber || undefined,
          role,
        });

        toast({
          title: result.pendingConfirmation ? "Confirm your email" : "Account created",
          description: result.pendingConfirmation
            ? "Check your inbox to confirm your account, then sign in."
            : "Your account is ready to use.",
        });

        if (result.pendingConfirmation) {
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

  return (
    <Card className="glass border-white/10">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-2">
          <Button
            type="button"
            variant={mode === "sign-in" ? "default" : "outline"}
            className="flex-1"
            onClick={() => setMode("sign-in")}
          >
            Sign in
          </Button>
          <Button
            type="button"
            variant={mode === "sign-up" ? "default" : "outline"}
            className="flex-1"
            onClick={() => setMode("sign-up")}
          >
            Sign up
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "sign-up" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="auth-name">Display name</Label>
                <Input id="auth-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-role">Role</Label>
                <select
                  id="auth-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Exclude<UserRole, "ADMIN">)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="PLAYER">Player</option>
                  <option value="ORGANIZER">Organizer</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-riot">Riot ID</Label>
                <Input id="auth-riot" value={riotId} onChange={(e) => setRiotId(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-phone">Phone Number</Label>
                <Input id="auth-phone" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || isLoading}>
            {isSubmitting ? "Working..." : mode === "sign-in" ? "Sign in" : "Create account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
