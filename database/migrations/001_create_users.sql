CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coc_tag TEXT UNIQUE NOT NULL,
  coc_name TEXT NOT NULL,
  coc_role TEXT NOT NULL DEFAULT 'member',
  password_hash TEXT NOT NULL,
  is_first_login BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
