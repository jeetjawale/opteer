-- ============================================
-- TABLE: user_api_keys
-- ============================================
create table user_api_keys (
    user_id           uuid primary key references auth.users(id) on delete cascade not null,
    provider          text not null,
    encrypted_api_key text not null,
    created_at        timestamptz default now(),
    updated_at        timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table user_api_keys enable row level security;

create policy "users can manage own api keys"
  on user_api_keys for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
