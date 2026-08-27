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
  updateProfile: (updates: {
    name?: string;
    phoneNumber?: string;
    riotId?: string;
    telegramChatId?: string;
    role?: UserRole;
    organizationName?: string;
    venueLocation?: string;
  }) => Promise<void>;
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
  organization_name?: string | null;
  venue_location?: string | null;
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

  // Extract display name prioritizing metadata name, full_name, or email prefix
  const resolvedName =
    (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
    (typeof metadata.name === "string" && metadata.name.trim()) ||
    (typeof metadata.custom_claims?.global_name === "string" && metadata.custom_claims.global_name.trim()) ||
    authUser.email?.split("@")[0] ||
    "Arena Player";

  // Check DB profile
  let dbProfile: ProfileRow | null = null;
  try {
    const { data } = await client
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();
    if (data) dbProfile = data as ProfileRow;
  } catch (err) {
    console.warn("DB profile lookup warning:", err);
  }

  // If no DB profile exists yet, create one
  if (!dbProfile) {
    const initialRole = typeof metadata.role === "string" ? metadata.role : "PLAYER";
    const payload = {
      id: authUser.id,
      name: resolvedName,
      role: initialRole,
      riot_id: typeof metadata.riot_id === "string" ? metadata.riot_id : null,
      phone_number: typeof metadata.phone_number === "string" ? metadata.phone_number : null,
      organization_name: typeof metadata.organization_name === "string" ? metadata.organization_name : null,
      venue_location: typeof metadata.venue_location === "string" ? metadata.venue_location : null,
    };

    try {
      await client.from("users").upsert(payload, { onConflict: "id" });
      const { data } = await client.from("users").select("*").eq("id", authUser.id).maybeSingle();
      if (data) dbProfile = data as ProfileRow;
    } catch (upsertError) {
      console.warn("Error creating user profile in DB:", upsertError);
    }
  }

  // Resolved role: prefer DB profile role, then metadata role, fallback to PLAYER
  const resolvedRole =
    (dbProfile?.role as UserRole) ||
    (metadata.role as UserRole) ||
    "PLAYER";

  return {
    id: authUser.id,
    email: authUser.email ?? "",
    name: dbProfile?.name ?? (typeof metadata.name === "string" ? metadata.name : resolvedName),
    role: resolvedRole,
    riotId: dbProfile?.riot_id ?? metadata.riot_id ?? undefined,
    phoneNumber: dbProfile?.phone_number ?? metadata.phone_number ?? undefined,
    telegramChatId: dbProfile?.telegram_chat_id ?? undefined,
    organizationName: dbProfile?.organization_name ?? metadata.organization_name ?? undefined,
    venueLocation: dbProfile?.venue_location ?? metadata.venue_location ?? undefined,
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

  const updateProfile = async (updates: {
    name?: string;
    phoneNumber?: string;
    riotId?: string;
    telegramChatId?: string;
    role?: UserRole;
    organizationName?: string;
    venueLocation?: string;
  }) => {
    if (!user) return;
    const client = requireSupabaseAuth();

    const payload: Partial<ProfileRow> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.phoneNumber !== undefined) payload.phone_number = updates.phoneNumber;
    if (updates.riotId !== undefined) payload.riot_id = updates.riotId;
    if (updates.telegramChatId !== undefined) payload.telegram_chat_id = updates.telegramChatId;
    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.organizationName !== undefined) payload.organization_name = updates.organizationName;
    if (updates.venueLocation !== undefined) payload.venue_location = updates.venueLocation;

    try {
      const { error } = await client.from("users").update(payload).eq("id", user.id);
      if (error) console.warn("Supabase DB profile update warning:", error);
    } catch (e) {
      console.warn("DB update skipped:", e);
    }

    try {
      await client.auth.updateUser({
        data: {
          ...(updates.role && { role: updates.role }),
          ...(updates.name && { name: updates.name }),
          ...(updates.organizationName && { organization_name: updates.organizationName }),
          ...(updates.venueLocation && { venue_location: updates.venueLocation }),
          ...(updates.phoneNumber && { phone_number: updates.phoneNumber }),
          ...(updates.riotId && { riot_id: updates.riotId }),
        },
      });
    } catch (e) {
      console.warn("Auth metadata update warning:", e);
    }

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
