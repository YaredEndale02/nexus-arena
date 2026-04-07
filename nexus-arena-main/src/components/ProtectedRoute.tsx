import { Layout } from "@/components/Layout";
import { AuthPanel } from "@/components/AuthPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth, type UserRole } from "@/hooks/useAuth";
import { ShieldAlert } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  title?: string;
  description?: string;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  title = "Sign in required",
  description = "Sign in with your Supabase account to continue.",
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Layout>
        <div className="py-20 text-center text-muted-foreground">Loading access controls...</div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto py-16">
          <AuthPanel title={title} description={description} />
        </div>
      </Layout>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-16">
          <Card className="glass border-white/10">
            <CardHeader>
              <CardTitle className="font-heading text-2xl flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-red-400" />
                Role restricted
              </CardTitle>
            <CardDescription>
              This area is limited to {allowedRoles.join(" or ")} accounts. Your current role is {user.role}.
            </CardDescription>
          </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Sign in with an organizer or admin account to continue.
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return <>{children}</>;
}
