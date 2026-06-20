-- Running Dinner – Migration 003
-- Dreiergruppen: Gruppengröße + dritte Person in responses
-- Führe dieses SQL im Supabase SQL-Editor aus: Dashboard → SQL Editor → New Query

alter table responses add column if not exists group_size integer default 2;
alter table responses add column if not exists name3      text;
alter table responses add column if not exists phone3     text;
alter table responses add column if not exists email3     text;
