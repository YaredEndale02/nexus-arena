import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthConfirm() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Supabase puts tokens in the URL hash after email confirmation
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", "?").replace("#", "&"));
    const type = params.get("type");
    const accessToken = params.get("access_token");
    const errorDesc = params.get("error_description");

    if (errorDesc) {
      setErrorMsg(decodeURIComponent(errorDesc.replace(/\+/g, " ")));
      setStatus("error");
      return;
    }

    if (!supabase) {
      setStatus("error");
      setErrorMsg("Supabase is not configured.");
      return;
    }

    if (accessToken) {
      // Let Supabase handle the session; it will fire onAuthStateChange
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setStatus("success");
          setTimeout(() => navigate("/"), 3000);
        } else {
          setStatus("error");
          setErrorMsg("Could not establish a session. The link may have expired.");
        }
      });
    } else if (type === "recovery") {
      // Password reset — redirect to the reset page
      navigate("/auth/reset-password" + window.location.hash);
    } else {
      setStatus("error");
      setErrorMsg("Invalid confirmation link.");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="glass border border-white/10 rounded-2xl p-10 max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-neon-purple flex items-center justify-center mx-auto">
          <Trophy className="w-8 h-8 text-primary-foreground" />
        </div>

        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <p className="font-heading text-xl font-bold text-foreground">Verifying your account...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">Email Confirmed!</h1>
              <p className="text-muted-foreground mt-2">
                Your account is verified and ready. Redirecting you to the arena…
              </p>
            </div>
            <Button asChild className="w-full bg-primary text-primary-foreground font-bold">
              <Link to="/">Go to Arena Now</Link>
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-14 h-14 text-destructive mx-auto" />
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">Confirmation Failed</h1>
              <p className="text-muted-foreground mt-2">
                {errorMsg || "This link may have expired or already been used."}
              </p>
            </div>
            <Button asChild variant="outline" className="w-full border-white/10">
              <Link to="/">Back to Arena</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
