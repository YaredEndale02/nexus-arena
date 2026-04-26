import sys

# Patch useAuth.tsx
with open('src/hooks/useAuth.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
'''export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  riotId?: string;
}

interface SignUpInput {
  email: string;
  password: string;
  name: string;
  role: Exclude<UserRole, "ADMIN">;
  riotId?: string;
}''',
'''export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  riotId?: string;
  phoneNumber?: string;
}

interface SignUpInput {
  email: string;
  password: string;
  name: string;
  role: Exclude<UserRole, "ADMIN">;
  riotId?: string;
  phoneNumber?: string;
}'''
)

content = content.replace(
'''type ProfileRow = {
  id: string;
  name: string | null;
  role: string;
  riot_id: string | null;
};''',
'''type ProfileRow = {
  id: string;
  name: string | null;
  role: string;
  riot_id: string | null;
  phone_number: string | null;
};'''
)

content = content.replace(
'''    role: typeof metadata.role === "string" ? metadata.role : "PLAYER",
    riot_id: typeof metadata.riot_id === "string" ? metadata.riot_id : null,
  };''',
'''    role: typeof metadata.role === "string" ? metadata.role : "PLAYER",
    riot_id: typeof metadata.riot_id === "string" ? metadata.riot_id : null,
    phone_number: typeof metadata.phone_number === "string" ? metadata.phone_number : null,
  };'''
)

content = content.replace(
'''    role: (profile.role as UserRole) ?? "PLAYER",
    riotId: profile.riot_id ?? undefined,
  };''',
'''    role: (profile.role as UserRole) ?? "PLAYER",
    riotId: profile.riot_id ?? undefined,
    phoneNumber: profile.phone_number ?? undefined,
  };'''
)

content = content.replace(
'''          name: input.name,
          role: input.role,
          riot_id: input.riotId ?? null,
        },''',
'''          name: input.name,
          role: input.role,
          riot_id: input.riotId ?? null,
          phone_number: input.phoneNumber ?? null,
        },'''
)

with open('src/hooks/useAuth.tsx', 'w', encoding='utf-8') as f:
    f.write(content)


# Patch AuthPanel.tsx
with open('src/components/AuthPanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
'''  const [riotId, setRiotId] = useState("");
  const [role, setRole] = useState<Exclude<UserRole, "ADMIN">>("PLAYER");''',
'''  const [riotId, setRiotId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [role, setRole] = useState<Exclude<UserRole, "ADMIN">>("PLAYER");'''
)

content = content.replace(
'''          riotId: riotId || undefined,
          role,
        });''',
'''          riotId: riotId || undefined,
          phoneNumber: phoneNumber || undefined,
          role,
        });'''
)

content = content.replace(
'''              <div className="space-y-2">
                <Label htmlFor="auth-riot">Riot ID</Label>
                <Input id="auth-riot" value={riotId} onChange={(e) => setRiotId(e.target.value)} />
              </div>
            </>''',
'''              <div className="space-y-2">
                <Label htmlFor="auth-riot">Riot ID</Label>
                <Input id="auth-riot" value={riotId} onChange={(e) => setRiotId(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-phone">Phone Number</Label>
                <Input id="auth-phone" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
              </div>
            </>'''
)

with open('src/components/AuthPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(content)


# Patch schema.sql
with open('supabase/schema.sql', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
'''  insert into public.users (
    id,
    email,
    name,
    username,
    role,
    riot_id,
    timezone
  )
  values (
    new.id::text,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'username', ''),
    coalesce(new.raw_user_meta_data->>'role', 'PLAYER'),
    nullif(new.raw_user_meta_data->>'riot_id', ''),
    nullif(new.raw_user_meta_data->>'timezone', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = excluded.name,
    username = coalesce(excluded.username, public.users.username),
    role = excluded.role,
    riot_id = excluded.riot_id,
    timezone = coalesce(excluded.timezone, public.users.timezone);''',
'''  insert into public.users (
    id,
    email,
    name,
    username,
    role,
    riot_id,
    timezone,
    phone_number
  )
  values (
    new.id::text,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'username', ''),
    coalesce(new.raw_user_meta_data->>'role', 'PLAYER'),
    nullif(new.raw_user_meta_data->>'riot_id', ''),
    nullif(new.raw_user_meta_data->>'timezone', ''),
    nullif(new.raw_user_meta_data->>'phone_number', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = excluded.name,
    username = coalesce(excluded.username, public.users.username),
    role = excluded.role,
    riot_id = excluded.riot_id,
    phone_number = coalesce(excluded.phone_number, public.users.phone_number),
    timezone = coalesce(excluded.timezone, public.users.timezone);'''
)

with open('supabase/schema.sql', 'w', encoding='utf-8') as f:
    f.write(content)

print("Auth Patch Complete")
