-- ==============================================================================
-- 1. PROFILES TABLE
-- Store user profile data that syncs across devices (unlike chrome.storage.local)
-- ==============================================================================
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  plan text default 'free', -- 'free' or 'pro'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  primary key (id)
);

-- ==============================================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- Secure the data so users can only read/update their own profile
-- ==============================================================================
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- ==============================================================================
-- 3. AUTOMATIC PROFILE CREATION TRIGGER
-- Automatically create a row in public.profiles when a user signs up via Auth
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, plan)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'plan', 'free')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==============================================================================
-- 4. USAGE TRACKING (OPTIONAL - FOR STRICTER LIMITS)
-- ==============================================================================
create table public.user_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature_name text not null,
  usage_count int default 0,
  last_reset_date date default current_date,
  
  primary key (user_id, feature_name)
);

alter table public.user_usage enable row level security;

create policy "Users can view own usage"
  on user_usage for select
  using ( auth.uid() = user_id );

-- We typically verify usage updates via Postgres Functions/Edge Functions 
-- to prevent users from resetting their own limits via client-side code.
