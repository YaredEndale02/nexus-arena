import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth, type UserRole } from "@/hooks/useAuth";
import { ShieldAlert, UserCheck } from "lucide-react";

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
  description = "Choose a demo account to continue through the Phase 1 MVP flows.",
}: ProtectedRouteProps) {
  const { user, isLoading, demoUsers, loginAs } = useAuth();

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
        <div className="max-w-3xl mx-auto py-16">
          <Card className="glass border-white/10">
            <CardHeader>
              <CardTitle className="font-heading text-2xl flex items-center gap-3">
                <UserCheck className="w-6 h-6 text-primary" />
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {demoUsers.map((demoUser) => (
                <Button
                  key={demoUser.id}
                  variant="outline"
                  className="h-auto flex-col items-start gap-1 border-white/10 bg-white/5 p-4 text-left"
                  onClick={() => loginAs(demoUser.id)}
                >
                  <span className="font-heading text-base">{demoUser.name}</span>
                  <span className="text-xs text-muted-foreground">{demoUser.role}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
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
            <CardContent className="grid gap-3 md:grid-cols-3">
              {demoUsers
                .filter((demoUser) => allowedRoles.includes(demoUser.role))
                .map((demoUser) => (
                  <Button
                    key={demoUser.id}
                    variant="outline"
                    className="h-auto flex-col items-start gap-1 border-white/10 bg-white/5 p-4 text-left"
                    onClick={() => loginAs(demoUser.id)}
                  >
                    <span className="font-heading text-base">{demoUser.name}</span>
                    <span className="text-xs text-muted-foreground">{demoUser.role}</span>
                  </Button>
                ))}
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return <>{children}</>;
}
