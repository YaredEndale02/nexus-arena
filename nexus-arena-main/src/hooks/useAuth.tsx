import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

export type UserRole = "ADMIN" | "ORGANIZER" | "PLAYER";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  riotId?: string;
  phoneNumber?: string;
  telegramChatId?: string;
}

interface SignUpInput {
  email: string;
  password: string;
  name: string;
  role: Exclude<UserRole, "ADMIN">;
  riotId?: string;
  phoneNumber?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ pendingConfirmation: boolean }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

type ProfileRow = {
  id: string;
  name: string | null;
  role: string;
  riot_id: string | null;
  phone_number: string | null;
  telegram_chat_id: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function requireSupabaseAuth() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase auth is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  return supabase;
}

async function syncProfileFromSession(session: Session | null): Promise<User | null> {
  if (!session) return null;

  const client = requireSupabaseAuth();
  const authUser = session.user;
  const metadata = authUser.user_metadata ?? {};

  const payload = {
    id: authUser.id,
    name: typeof metadata.name === "string" ? metadata.name : authUser.email?.split("@")[0] ?? "Arena Player",
    role: typeof metadata.role === "string" ? metadata.role : "PLAYER",
    riot_id: typeof metadata.riot_id === "string" ? metadata.riot_id : null,
    phone_number: typeof metadata.phone_number === "string" ? metadata.phone_number : null,
  };

  const { error: upsertError } = await client.from("users").upsert(payload, { onConflict: "id" });
  if (upsertError) throw upsertError;

  const { data, error } = await client.from("users").select("*").eq("id", authUser.id).single();
  if (error) throw error;

  const profile = data as ProfileRow;
  return {
    id: authUser.id,
    email: authUser.email ?? "",
    name: profile.name ?? payload.name,
    role: (profile.role as UserRole) ?? "PLAYER",
    riotId: profile.riot_id ?? undefined,
    phoneNumber: profile.phone_number ?? undefined,
    telegramChatId: profile.telegram_chat_id ?? undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    const bootstrap = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setUser(await syncProfileFromSession(session));
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncProfileFromSession(session)
        .then((nextUser) => setUser(nextUser))
        .catch(() => setUser(null))
        .finally(() => setIsLoading(false));
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const client = requireSupabaseAuth();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (input: SignUpInput) => {
    const client = requireSupabaseAuth();
    const { data, error } = await client.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          name: input.name,
          role: input.role,
          riot_id: input.riotId ?? null,
          phone_number: input.phoneNumber ?? null,
        },
      },
    });

    if (error) throw error;

    if (data.session) {
      setUser(await syncProfileFromSession(data.session));
    }

    return {
      pendingConfirmation: !data.session,
    };
  };

  const logout = async () => {
    const client = requireSupabaseAuth();
    const { error } = await client.auth.signOut();
    if (error) throw error;
    setUser(null);
  };

  const refreshProfile = async () => {
    const client = requireSupabaseAuth();
    const {
      data: { session },
    } = await client.auth.getSession();
    setUser(await syncProfileFromSession(session));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
