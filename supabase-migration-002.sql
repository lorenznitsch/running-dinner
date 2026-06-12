-- Running Dinner – Migration 002
-- Neue Felder: Event-Datum & Uhrzeit in surveys, zweite E-Mail-Adresse in responses
-- Führe dieses SQL im Supabase SQL-Editor aus: Dashboard → SQL Editor → New Query

-- surveys: Event-Datum und Uhrzeit der Vorspeise
alter table surveys add column if not exists event_date   text;
alter table surveys add column if not exists time_starter text default '18:00 Uhr';

-- responses: zweite E-Mail-Adresse
alter table responses add column if not exists email2 text;
