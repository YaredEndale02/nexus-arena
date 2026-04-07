import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/useAuth.tsx";
import Index from "./pages/Index.tsx";
import Bracket from "./pages/Bracket.tsx";
import Live from "./pages/Live.tsx";
import AdminTournaments from "./pages/AdminTournaments.tsx";
import Teams from "./pages/Teams.tsx";
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
            <Route path="/bracket" element={<Bracket />} />
            <Route path="/live" element={<Live />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/admin/tournaments" element={<AdminTournaments />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
