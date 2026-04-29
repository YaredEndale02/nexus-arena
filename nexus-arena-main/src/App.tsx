import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/useAuth.tsx";
import Index from "./pages/Index.tsx";
import Bracket from "./pages/Bracket.tsx";
import Live from "./pages/Live.tsx";
import AdminTournaments from "./pages/AdminTournaments.tsx";
import MyRegistrations from "./pages/MyRegistrations.tsx";
import TournamentDetails from "./pages/TournamentDetails.tsx";
import Teams from "./pages/Teams.tsx";
import Settings from "./pages/Settings.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/tournaments/:id" element={<TournamentDetails />} />
            <Route path="/bracket" element={<Bracket />} />
            <Route path="/live" element={<Live />} />
            <Route
              path="/teams"
              element={
                <ProtectedRoute title="Team management requires sign in">
                  <Teams />
                </ProtectedRoute>
              }
            />
            <Route
              path="/registrations"
              element={
                <ProtectedRoute title="Registrations require sign in">
                  <MyRegistrations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/tournaments"
              element={
                <ProtectedRoute
                  allowedRoles={["ORGANIZER", "ADMIN"]}
                  title="Organizer access required"
                  description="Sign in with an organizer account to manage tournaments."
                >
                  <AdminTournaments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute title="Settings require sign in">
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
