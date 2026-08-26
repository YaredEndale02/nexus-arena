import { createContext, useContext, useEffect, useState } from "react";
import type { Session, Provider } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { toAuthEmailCredential, normalizePhoneNumber } from "@/lib/phoneAuth";

export type UserRole = "ADMIN" | "ORGANIZER" | "PLAYER";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  riotId?: string;
  phoneNumber?: string;
  telegramChatId?: string;
  organizationName?: string;
  venueLocation?: string;
}

export interface SignUpInput {
  identifier: string; // Phone number or Email
  password: string;
  name: string;
  role: Exclude<UserRole, "ADMIN">;
  riotId?: string;
  phoneNumber?: string;
  organizationName?: string;
  venueLocation?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ pendingConfirmation: boolean }>;
  signInWithProvider: (provider: Provider) => Promise<void>;
  resetPassword: (identifier: string) => Promise<void>;
  updateProfile: (updates: { name?: string; phoneNumber?: string; riotId?: string; telegramChatId?: string }) => Promise<void>;
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

  const signIn = async (identifier: string, password: string) => {
    const client = requireSupabaseAuth();
    const emailCredential = toAuthEmailCredential(identifier);
    const { error } = await client.auth.signInWithPassword({ email: emailCredential, password });
    if (error) throw error;
  };

  const signUp = async (input: SignUpInput) => {
    const client = requireSupabaseAuth();
    const emailCredential = toAuthEmailCredential(input.identifier);
    const phone = input.phoneNumber || (input.identifier.includes("@") ? undefined : normalizePhoneNumber(input.identifier));

    const { data, error } = await client.auth.signUp({
      email: emailCredential,
      password: input.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        data: {
          name: input.name,
          role: input.role,
          riot_id: input.riotId ?? null,
          phone_number: phone ?? null,
          organization_name: input.organizationName ?? null,
          venue_location: input.venueLocation ?? null,
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

  const signInWithProvider = async (provider: Provider) => {
    const client = requireSupabaseAuth();
    const { error } = await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const resetPassword = async (identifier: string) => {
    const client = requireSupabaseAuth();
    const emailCredential = toAuthEmailCredential(identifier);
    const { error } = await client.auth.resetPasswordForEmail(emailCredential, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  };

  const updateProfile = async (updates: { name?: string; phoneNumber?: string; riotId?: string; telegramChatId?: string }) => {
    if (!user) return;
    const client = requireSupabaseAuth();

    const payload: Partial<ProfileRow> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.phoneNumber !== undefined) payload.phone_number = updates.phoneNumber;
    if (updates.riotId !== undefined) payload.riot_id = updates.riotId;
    if (updates.telegramChatId !== undefined) payload.telegram_chat_id = updates.telegramChatId;

    const { error } = await client.from("users").update(payload).eq("id", user.id);
    if (error) throw error;

    setUser((prev) => (prev ? { ...prev, ...updates } : null));
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
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signUp,
        signInWithProvider,
        resetPassword,
        updateProfile,
        logout,
        refreshProfile,
      }}
    >
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
