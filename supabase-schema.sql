-- Running Dinner Generator – Supabase Schema
-- Führe dieses SQL im Supabase SQL-Editor aus (Dashboard → SQL Editor → New Query)

-- ─── Tabellen ────────────────────────────────────────────────────────────────

create table if not exists surveys (
  id         text primary key,
  admin_token text not null,
  event_name  text,
  created_at  timestamp default now()
);

create table if not exists responses (
  id           uuid primary key default gen_random_uuid(),
  survey_id    text references surveys(id),
  names        text not null,
  email        text,
  diet         text,
  allergies    text,
  -- Legacy combined address (used by plan/map algorithms)
  address      text,
  doorbell     text,
  phone        text,
  -- Structured address 1 (required)
  street1      text,
  housenumber1 text,
  zip1         text,
  city1        text,
  doorbell1    text,
  -- Structured address 2 (optional)
  street2      text,
  housenumber2 text,
  zip2         text,
  city2        text,
  doorbell2    text,
  address2     text,
  -- Split phone numbers
  phone1       text,
  phone2       text,
  notes        text,
  submitted_at timestamp default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table surveys   enable row level security;
alter table responses enable row level security;

-- Surveys: jeder darf lesen (für surveyId-Validierung), nur anonym einfügen
create policy "Jeder kann Surveys lesen"
  on surveys for select using (true);

create policy "Jeder kann Surveys anlegen"
  on surveys for insert with check (true);

-- Responses: jeder darf einfügen
create policy "Jeder kann Antworten einreichen"
  on responses for insert with check (true);

-- Responses: nur Admin darf lesen (via x-admin-token Header)
create policy "Nur Admin kann Antworten lesen"
  on responses for select
  using (
    survey_id in (
      select id from surveys
      where admin_token = (
        current_setting('request.headers', true)::json->>'x-admin-token'
      )
    )
  );
