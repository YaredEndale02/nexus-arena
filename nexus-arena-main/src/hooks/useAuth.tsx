import { createContext, useContext, useEffect, useState } from "react";

export type UserRole = "ADMIN" | "ORGANIZER" | "PLAYER";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  riotId?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  demoUsers: User[];
  login: (userId?: string) => void;
  loginAs: (userId: string) => void;
  logout: () => void;
}

const STORAGE_KEY = "nexus-arena-auth";

const DEMO_USERS: User[] = [
  {
    id: "user-admin-1",
    name: "ControlRoom",
    role: "ADMIN",
    riotId: "ControlRoom#HQ",
  },
  {
    id: "user-1",
    name: "FragMaster99",
    role: "ORGANIZER",
    riotId: "FragMaster#NA1",
  },
  {
    id: "user-player-1",
    name: "AceRunner",
    role: "PLAYER",
    riotId: "AceRunner#EUW",
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUserId = window.localStorage.getItem(STORAGE_KEY);
      const storedUser = DEMO_USERS.find((demoUser) => demoUser.id === storedUserId) ?? null;
      setUser(storedUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, user.id);
  }, [user]);

  const loginAs = (userId: string) => {
    const nextUser = DEMO_USERS.find((demoUser) => demoUser.id === userId);
    if (!nextUser) return;
    setUser(nextUser);
  };

  const login = (userId = DEMO_USERS[1].id) => {
    loginAs(userId);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, demoUsers: DEMO_USERS, login, loginAs, logout }}>
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
