-- ============================================
-- Intkhab CRM — Neon Database Setup Script
-- Run this in Neon Dashboard > SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'agent',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS properties (
  id              SERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  address         TEXT NOT NULL,
  price           NUMERIC NOT NULL DEFAULT 0,
  "propertyType"  TEXT NOT NULL DEFAULT 'House',
  bedrooms        INTEGER NOT NULL DEFAULT 0,
  bathrooms       INTEGER NOT NULL DEFAULT 0,
  area            NUMERIC NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'Available',
  description     TEXT NOT NULL DEFAULT '',
  "agentId"       INTEGER NOT NULL,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_agents (
  "propertyId"  INTEGER NOT NULL,
  "agentId"     INTEGER NOT NULL,
  PRIMARY KEY ("propertyId", "agentId")
);

CREATE TABLE IF NOT EXISTS leads (
  id                    SERIAL PRIMARY KEY,
  name                  TEXT NOT NULL,
  email                 TEXT NOT NULL DEFAULT '',
  phone                 TEXT NOT NULL DEFAULT '',
  source                TEXT NOT NULL DEFAULT 'Website',
  stage                 TEXT NOT NULL DEFAULT 'New',
  budget                NUMERIC NOT NULL DEFAULT 0,
  notes                 TEXT NOT NULL DEFAULT '',
  "agentId"             INTEGER NOT NULL,
  "propertyId"          INTEGER,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  gender                TEXT NOT NULL DEFAULT '',
  "customContactName"   TEXT NOT NULL DEFAULT '',
  "customContactPhone"  TEXT NOT NULL DEFAULT '',
  "customContactAddress" TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS lead_activities (
  id              SERIAL PRIMARY KEY,
  "leadId"        INTEGER NOT NULL,
  type            TEXT NOT NULL,
  note            TEXT NOT NULL DEFAULT '',
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "audioUrl"      TEXT NOT NULL DEFAULT '',
  "followUpDate"  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS events (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  "startTime"   TIMESTAMPTZ NOT NULL,
  "endTime"     TIMESTAMPTZ NOT NULL,
  "leadId"      INTEGER,
  "agentId"     INTEGER NOT NULL,
  "eventType"   TEXT NOT NULL DEFAULT 'Call',
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seed_flag (
  id    INTEGER PRIMARY KEY,
  done  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS invoices (
  id                SERIAL PRIMARY KEY,
  "invoiceNumber"   TEXT NOT NULL UNIQUE,
  "agentId"         INTEGER NOT NULL,
  status            TEXT NOT NULL DEFAULT 'draft',
  "issueDate"       TEXT NOT NULL DEFAULT CURRENT_DATE,
  "dueDate"         TEXT NOT NULL DEFAULT CURRENT_DATE,
  notes             TEXT NOT NULL DEFAULT '',
  "totalAmount"     NUMERIC NOT NULL DEFAULT 0,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id              SERIAL PRIMARY KEY,
  "invoiceId"     INTEGER NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  "leadCount"     INTEGER NOT NULL DEFAULT 0,
  "pricePerLead"  NUMERIC NOT NULL DEFAULT 0,
  total           NUMERIC NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id          SERIAL PRIMARY KEY,
  email       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ✅ All tables created! App will auto-seed users on first login.
