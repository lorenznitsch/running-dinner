-- Running Dinner – Migration 001
-- Neue Felder für erweiterte Anmeldung (E-Mail, getrennte Telefonnummern, strukturierte Adressen)
-- Führe dieses SQL im Supabase SQL-Editor aus: Dashboard → SQL Editor → New Query

alter table responses add column if not exists email        text;
alter table responses add column if not exists phone1       text;
alter table responses add column if not exists phone2       text;
alter table responses add column if not exists street1      text;
alter table responses add column if not exists housenumber1 text;
alter table responses add column if not exists zip1         text;
alter table responses add column if not exists city1        text;
alter table responses add column if not exists doorbell1    text;
alter table responses add column if not exists street2      text;
alter table responses add column if not exists housenumber2 text;
alter table responses add column if not exists zip2         text;
alter table responses add column if not exists city2        text;
alter table responses add column if not exists doorbell2    text;
alter table responses add column if not exists address2     text;
