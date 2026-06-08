import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

// ── Types ──────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'agent';
  createdAt: Date;
}

export interface Property {
  id: number;
  title: string;
  address: string;
  price: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  status: 'Available' | 'Under Offer' | 'Sold';
  description: string;
  agentId: number;
  createdAt: Date;
}

export interface PropertyAgent {
  propertyId: number;
  agentId: number;
}

export interface LeadActivity {
  id: number;
  leadId: number;
  type: 'call' | 'whatsapp' | 'voice' | 'deal';
  note: string;
  audioUrl: string;
  followUpDate: string;
  createdAt: Date;
}

export interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  source: string;
  stage: 'New' | 'Contacted' | 'Viewing' | 'Negotiating' | 'Closed';
  budget: number;
  notes: string;
  gender: 'Male' | 'Female' | '';
  agentId: number;
  propertyId: number | null;
  customContactName: string;
  customContactPhone: string;
  customContactAddress: string;
  createdAt: Date;
  activities: LeadActivity[];
}

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  description: string;
  leadCount: number;
  pricePerLead: number;
  total: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  agentId: number;
  agentName?: string;
  status: 'draft' | 'sent' | 'paid';
  issueDate: string;
  dueDate: string;
  notes: string;
  totalAmount: number;
  items: InvoiceItem[];
  createdAt: Date;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  leadId: number | null;
  agentId: number;
  eventType: string;
  createdAt: Date;
}

// ── Client ─────────────────────────────────────────────────────────────────
const sql = neon(process.env.DATABASE_URL!);

const g = globalThis as typeof globalThis & { __dbInit?: boolean };

// ── Schema & Seed ──────────────────────────────────────────────────────────
export async function initDb() {
  if (g.__dbInit) return;
  g.__dbInit = true;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id        SERIAL PRIMARY KEY,
      name      TEXT NOT NULL,
      email     TEXT NOT NULL UNIQUE,
      password  TEXT NOT NULL,
      role      TEXT NOT NULL DEFAULT 'agent',
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS properties (
      id            SERIAL PRIMARY KEY,
      title         TEXT NOT NULL,
      address       TEXT NOT NULL,
      price         NUMERIC NOT NULL DEFAULT 0,
      "propertyType" TEXT NOT NULL DEFAULT 'House',
      bedrooms      INTEGER NOT NULL DEFAULT 0,
      bathrooms     INTEGER NOT NULL DEFAULT 0,
      area          NUMERIC NOT NULL DEFAULT 0,
      status        TEXT NOT NULL DEFAULT 'Available',
      description   TEXT NOT NULL DEFAULT '',
      "agentId"     INTEGER NOT NULL,
      "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS property_agents (
      "propertyId" INTEGER NOT NULL,
      "agentId"    INTEGER NOT NULL,
      PRIMARY KEY ("propertyId", "agentId")
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id                   SERIAL PRIMARY KEY,
      name                 TEXT NOT NULL,
      email                TEXT NOT NULL DEFAULT '',
      phone                TEXT NOT NULL DEFAULT '',
      source               TEXT NOT NULL DEFAULT 'Website',
      stage                TEXT NOT NULL DEFAULT 'New',
      budget               NUMERIC NOT NULL DEFAULT 0,
      notes                TEXT NOT NULL DEFAULT '',
      "agentId"            INTEGER NOT NULL,
      "propertyId"         INTEGER,
      "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      gender               TEXT NOT NULL DEFAULT '',
      "customContactName"  TEXT NOT NULL DEFAULT '',
      "customContactPhone" TEXT NOT NULL DEFAULT '',
      "customContactAddress" TEXT NOT NULL DEFAULT ''
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS lead_activities (
      id            SERIAL PRIMARY KEY,
      "leadId"      INTEGER NOT NULL,
      type          TEXT NOT NULL,
      note          TEXT NOT NULL DEFAULT '',
      "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "audioUrl"    TEXT NOT NULL DEFAULT '',
      "followUpDate" TEXT NOT NULL DEFAULT ''
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      "startTime" TIMESTAMPTZ NOT NULL,
      "endTime"   TIMESTAMPTZ NOT NULL,
      "leadId"    INTEGER,
      "agentId"   INTEGER NOT NULL,
      "eventType" TEXT NOT NULL DEFAULT 'Call',
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS seed_flag (
      id   INTEGER PRIMARY KEY,
      done INTEGER NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id              SERIAL PRIMARY KEY,
      "invoiceNumber" TEXT NOT NULL UNIQUE,
      "agentId"       INTEGER NOT NULL,
      status          TEXT NOT NULL DEFAULT 'draft',
      "issueDate"     TEXT NOT NULL DEFAULT CURRENT_DATE,
      "dueDate"       TEXT NOT NULL DEFAULT CURRENT_DATE,
      notes           TEXT NOT NULL DEFAULT '',
      "totalAmount"   NUMERIC NOT NULL DEFAULT 0,
      "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id              SERIAL PRIMARY KEY,
      "invoiceId"     INTEGER NOT NULL,
      description     TEXT NOT NULL DEFAULT '',
      "leadCount"     INTEGER NOT NULL DEFAULT 0,
      "pricePerLead"  NUMERIC NOT NULL DEFAULT 0,
      total           NUMERIC NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id        SERIAL PRIMARY KEY,
      email     TEXT NOT NULL,
      status    TEXT NOT NULL DEFAULT 'pending',
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const flagRow = await sql`SELECT done FROM seed_flag WHERE id = 1`;
  if (flagRow.length > 0 && Number(flagRow[0].done) === 1) return;

  const adminPw = bcrypt.hashSync('admin123', 10);
  const agentPw = bcrypt.hashSync('agent123', 10);

  await sql`INSERT INTO users (name, email, password, role) VALUES ('Admin User', 'admin@crm.com', ${adminPw}, 'admin') ON CONFLICT DO NOTHING`;
  const r2 = await sql`INSERT INTO users (name, email, password, role) VALUES ('Sarah Mitchell', 'sarah@crm.com', ${agentPw}, 'agent') ON CONFLICT DO NOTHING RETURNING id`;
  const r3 = await sql`INSERT INTO users (name, email, password, role) VALUES ('James Carter', 'james@crm.com', ${agentPw}, 'agent') ON CONFLICT DO NOTHING RETURNING id`;

  const sarahRow = await sql`SELECT id FROM users WHERE email = 'sarah@crm.com'`;
  const jamesRow = await sql`SELECT id FROM users WHERE email = 'james@crm.com'`;
  const agent1Id = Number(sarahRow[0]?.id);
  const agent2Id = Number(jamesRow[0]?.id);

  const propData = [
    ['Luxury Penthouse Downtown', 'Sky Tower Block, Blue Area, Islamabad', 695000000, 'Penthouse', 4, 3, 3200, 'Available', 'Stunning penthouse with panoramic city views.', agent1Id],
    ['Modern Villa with Pool', 'DHA Phase 6, Lahore', 1334400000, 'Villa', 6, 5, 6500, 'Under Offer', 'Elegant villa with infinity pool and smart home tech.', agent1Id],
    ['Cozy Studio Apartment', 'Gulberg III, Lahore', 88960000, 'Apartment', 1, 1, 650, 'Available', 'Perfect starter home in vibrant neighbourhood.', agent2Id],
    ['Suburban Family Home', 'Bahria Town Phase 4, Rawalpindi', 208500000, 'House', 4, 2, 2800, 'Sold', 'Spacious home with large lawn and great schools nearby.', agent2Id],
    ['Beachfront Condo', 'Emaar Crescent Bay, Karachi', 333600000, 'Condo', 3, 2, 1800, 'Available', 'Wake up to sea views every morning.', agent1Id],
  ];
  for (const p of propData) {
    await sql`INSERT INTO properties (title,address,price,"propertyType",bedrooms,bathrooms,area,status,description,"agentId") VALUES (${p[0]},${p[1]},${p[2]},${p[3]},${p[4]},${p[5]},${p[6]},${p[7]},${p[8]},${p[9]}) ON CONFLICT DO NOTHING`;
  }

  const names = ['Emma Thompson','Liam Johnson','Olivia Davis','Noah Wilson','Ava Martinez','William Brown','Sophia Garcia','Benjamin Lee','Isabella Anderson','Mason Taylor'];
  const phones = ['+923001234567','+923001234568','+923001234569','+923001234570','+923001234571','+923001234572','+923001234573','+923001234574','+923001234575','+923001234576'];
  const stages = ['New','Contacted','Viewing','Negotiating','Closed'];
  const sources = ['Website','Referral','Social Media','Walk-in','Cold Call'];
  for (let i = 0; i < names.length; i++) {
    const email = names[i].toLowerCase().replace(' ', '.') + '@email.com';
    const budget = (Math.floor(Math.random() * 4700 + 300)) * 1000 * 278;
    const note = `Interested in ${i % 3 === 0 ? 'downtown' : i % 3 === 1 ? 'suburban' : 'beachfront'} properties.`;
    const agentId = i % 2 === 0 ? agent1Id : agent2Id;
    await sql`INSERT INTO leads (name,email,phone,source,stage,budget,notes,"agentId") VALUES (${names[i]},${email},${phones[i]},${sources[i % 5]},${stages[i % 5]},${budget},${note},${agentId}) ON CONFLICT DO NOTHING`;
  }

  const eventTitles = ['Property Viewing','Client Call','Site Visit','Contract Signing'];
  for (let i = 0; i < 5; i++) {
    const start = new Date(Date.now() + (i + 1) * 86400000 * 2);
    const end = new Date(start.getTime() + 3600000);
    const agentId = i % 2 === 0 ? agent1Id : agent2Id;
    await sql`INSERT INTO events (title,description,"startTime","endTime","leadId","agentId","eventType") VALUES (${eventTitles[i % 4]},'Scheduled appointment',${start.toISOString()},${end.toISOString()},${i + 1},${agentId},${i % 2 === 0 ? 'Viewing' : 'Call'})`;
  }

  await sql`INSERT INTO seed_flag (id, done) VALUES (1, 1) ON CONFLICT (id) DO UPDATE SET done = 1`;
}

// ── Query Helpers ──────────────────────────────────────────────────────────
export async function getUsers(): Promise<Omit<User, 'password'>[]> {
  await initDb();
  const rows = await sql`SELECT id, name, email, role, "createdAt" FROM users ORDER BY id`;
  return rows.map((r) => ({ id: Number(r.id), name: String(r.name), email: String(r.email), role: r.role as 'admin'|'agent', createdAt: new Date(r.createdAt) }));
}

export async function getUserByEmail(email: string): Promise<User | null> {
  await initDb();
  const rows = await sql`SELECT * FROM users WHERE email = ${email}`;
  if (!rows.length) return null;
  const r = rows[0];
  return { id: Number(r.id), name: String(r.name), email: String(r.email), password: String(r.password), role: r.role as 'admin'|'agent', createdAt: new Date(r.createdAt) };
}

export async function createUser(name: string, email: string, password: string, role: 'admin'|'agent') {
  await initDb();
  const hash = bcrypt.hashSync(password, 10);
  const rows = await sql`INSERT INTO users (name,email,password,role) VALUES (${name},${email},${hash},${role}) RETURNING id,name,email,role,"createdAt"`;
  const r = rows[0];
  return { id: Number(r.id), name: String(r.name), email: String(r.email), role: r.role as 'admin'|'agent', createdAt: new Date(r.createdAt) };
}

export async function deleteUser(id: number) {
  await initDb();
  await sql`DELETE FROM users WHERE id = ${id}`;
}

export async function getProperties(isAdmin: boolean, userId: number): Promise<Property[]> {
  await initDb();
  const rows = isAdmin
    ? await sql`SELECT * FROM properties ORDER BY "createdAt" DESC`
    : await sql`SELECT * FROM properties WHERE "agentId" = ${userId} ORDER BY "createdAt" DESC`;
  return rows.map((r) => rowToProperty(r));
}

function rowToProperty(r: any): Property {
  return { id: Number(r.id), title: String(r.title), address: String(r.address), price: Number(r.price), propertyType: String(r.propertyType), bedrooms: Number(r.bedrooms), bathrooms: Number(r.bathrooms), area: Number(r.area), status: r.status as Property['status'], description: String(r.description), agentId: Number(r.agentId), createdAt: new Date(r.createdAt) };
}

export async function getPropertyAgents(propertyId: number): Promise<number[]> {
  await initDb();
  const rows = await sql`SELECT "agentId" FROM property_agents WHERE "propertyId" = ${propertyId}`;
  return rows.map((r: any) => Number(r.agentId));
}

export async function getPropertyAgentsBulk(propertyIds: number[]): Promise<Record<number, number[]>> {
  if (!propertyIds.length) return {};
  await initDb();
  const rows = await sql`SELECT "propertyId", "agentId" FROM property_agents WHERE "propertyId" = ANY(${propertyIds})`;
  const map: Record<number, number[]> = {};
  for (const r of rows) { const pid = Number(r.propertyId); if (!map[pid]) map[pid] = []; map[pid].push(Number(r.agentId)); }
  return map;
}

export async function setPropertyAgents(propertyId: number, agentIds: number[]): Promise<void> {
  await initDb();
  await sql`DELETE FROM property_agents WHERE "propertyId" = ${propertyId}`;
  for (const agentId of agentIds) {
    await sql`INSERT INTO property_agents ("propertyId", "agentId") VALUES (${propertyId}, ${agentId}) ON CONFLICT DO NOTHING`;
  }
}

export async function createProperty(data: Omit<Property, 'id'|'createdAt'>): Promise<Property> {
  await initDb();
  const rows = await sql`INSERT INTO properties (title,address,price,"propertyType",bedrooms,bathrooms,area,status,description,"agentId") VALUES (${data.title},${data.address},${data.price},${data.propertyType},${data.bedrooms},${data.bathrooms},${data.area},${data.status},${data.description},${data.agentId}) RETURNING *`;
  return rowToProperty(rows[0]);
}

export async function updateProperty(id: number, data: any): Promise<Property | null> {
  await initDb();
  // Fetch existing first
  const existing = await sql`SELECT * FROM properties WHERE id = ${id}`;
  if (!existing.length) return null;
  const e = existing[0];

  const title       = data.title !== undefined       ? data.title                    : e.title;
  const address     = data.address !== undefined     ? data.address                  : e.address;
  const price       = data.price !== undefined       ? parseFloat(data.price)        : Number(e.price);
  const propType    = data.property_type !== undefined ? data.property_type          : e.propertyType;
  const bedrooms    = data.bedrooms !== undefined    ? parseInt(data.bedrooms)       : Number(e.bedrooms);
  const bathrooms   = data.bathrooms !== undefined   ? parseInt(data.bathrooms)      : Number(e.bathrooms);
  const area        = data.area !== undefined        ? parseFloat(data.area)         : Number(e.area);
  const status      = data.status !== undefined      ? data.status                   : e.status;
  const description = data.description !== undefined ? data.description              : e.description;

  const rows = await sql`
    UPDATE properties
    SET title=${title}, address=${address}, price=${price}, "propertyType"=${propType},
        bedrooms=${bedrooms}, bathrooms=${bathrooms}, area=${area}, status=${status}, description=${description}
    WHERE id=${id}
    RETURNING *
  `;
  return rows.length ? rowToProperty(rows[0]) : null;
}

export async function deleteProperty(id: number) {
  await initDb();
  await sql`DELETE FROM properties WHERE id = ${id}`;
}

export async function getLeadsCount(isAdmin: boolean, userId: number): Promise<number> {
  await initDb();
  const rows = isAdmin
    ? await sql`SELECT COUNT(*) as count FROM leads`
    : await sql`SELECT COUNT(*) as count FROM leads WHERE "agentId" = ${userId}`;
  return Number(rows[0].count);
}

export async function getLeads(isAdmin: boolean, userId: number, limit = 50000, offset = 0): Promise<Lead[]> {
  await initDb();
  const rows = isAdmin
    ? await sql`SELECT * FROM leads ORDER BY "createdAt" DESC LIMIT ${limit} OFFSET ${offset}`
    : await sql`SELECT * FROM leads WHERE "agentId" = ${userId} ORDER BY "createdAt" DESC LIMIT ${limit} OFFSET ${offset}`;
  const leads = rows.map((r) => rowToLead(r));
  if (leads.length > 0) {
    const leadIds = leads.map((l) => l.id);
    const actMap: Record<number, LeadActivity[]> = {};
    const actRows = await sql`SELECT * FROM lead_activities WHERE "leadId" = ANY(${leadIds}) ORDER BY "createdAt" ASC`;
    for (const r of actRows) { const a = rowToActivity(r); if (!actMap[a.leadId]) actMap[a.leadId] = []; actMap[a.leadId].push(a); }
    for (const lead of leads) lead.activities = actMap[lead.id] ?? [];
  }
  return leads;
}

function rowToLead(r: any): Lead {
  return {
    id: Number(r.id), name: String(r.name), email: String(r.email), phone: String(r.phone),
    source: String(r.source), stage: r.stage as Lead['stage'], budget: Number(r.budget),
    notes: String(r.notes), agentId: Number(r.agentId), propertyId: r.propertyId ? Number(r.propertyId) : null,
    createdAt: new Date(r.createdAt), gender: String(r.gender || '') as Lead['gender'],
    customContactName: String(r.customContactName || ''), customContactPhone: String(r.customContactPhone || ''),
    customContactAddress: String(r.customContactAddress || ''), activities: []
  };
}

function rowToActivity(r: any): LeadActivity {
  return { id: Number(r.id), leadId: Number(r.leadId), type: r.type as 'call'|'whatsapp'|'voice'|'deal', note: String(r.note), createdAt: new Date(r.createdAt), audioUrl: String(r.audioUrl || ''), followUpDate: String(r.followUpDate || '') };
}

export async function createLead(data: Omit<Lead, 'id'|'createdAt'|'activities'>): Promise<Lead> {
  await initDb();
  const rows = await sql`INSERT INTO leads (name,email,phone,source,stage,budget,notes,"agentId","propertyId",gender,"customContactName","customContactPhone","customContactAddress") VALUES (${data.name},${data.email},${data.phone},${data.source},${data.stage},${data.budget},${data.notes},${data.agentId},${data.propertyId ?? null},${data.gender || ''},${data.customContactName || ''},${data.customContactPhone || ''},${data.customContactAddress || ''}) RETURNING *`;
  return { ...rowToLead(rows[0]), activities: [] };
}

export async function updateLead(id: number, data: any): Promise<Lead | null> {
  await initDb();
  const existing = await sql`SELECT * FROM leads WHERE id = ${id}`;
  if (!existing.length) return null;

  if (data._action === 'log_activity') {
    await sql`INSERT INTO lead_activities ("leadId",type,note,"audioUrl","followUpDate") VALUES (${id},${data.type},${data.note || ''},${data.audioUrl || ''},${data.followUpDate || ''})`;
    const activities = await getActivitiesForLead(id);
    return { ...rowToLead(existing[0]), activities };
  }

  const fields: string[] = []; const args: any[] = [];
  if (data.name !== undefined) { fields.push('name'); args.push(data.name); }
  if (data.email !== undefined) { fields.push('email'); args.push(data.email); }
  if (data.phone !== undefined) { fields.push('phone'); args.push(data.phone); }
  if (data.source !== undefined) { fields.push('source'); args.push(data.source); }
  if (data.stage !== undefined) { fields.push('stage'); args.push(data.stage); }
  if (data.budget !== undefined) { fields.push('budget'); args.push(parseFloat(data.budget)); }
  if (data.notes !== undefined) { fields.push('notes'); args.push(data.notes); }
  if (data.gender !== undefined) { fields.push('gender'); args.push(data.gender); }
  if (data.customContactName !== undefined) { fields.push('"customContactName"'); args.push(data.customContactName); }
  if (data.customContactPhone !== undefined) { fields.push('"customContactPhone"'); args.push(data.customContactPhone); }
  if (data.customContactAddress !== undefined) { fields.push('"customContactAddress"'); args.push(data.customContactAddress); }
  if (data.agent_id !== undefined) { fields.push('"agentId"'); args.push(parseInt(data.agent_id)); }
  if (data.property_id !== undefined) { fields.push('"propertyId"'); args.push(data.property_id ? parseInt(data.property_id) : null); }
  if (fields.length) {
    const existing2 = await sql`SELECT * FROM leads WHERE id = ${id}`;
    if (!existing2.length) return null;
    const e = existing2[0];

    const name       = data.name !== undefined       ? data.name                          : e.name;
    const email      = data.email !== undefined      ? data.email                         : e.email;
    const phone      = data.phone !== undefined      ? data.phone                         : e.phone;
    const source     = data.source !== undefined     ? data.source                        : e.source;
    const stage      = data.stage !== undefined      ? data.stage                         : e.stage;
    const budget     = data.budget !== undefined     ? parseFloat(data.budget)            : Number(e.budget);
    const notes      = data.notes !== undefined      ? data.notes                         : e.notes;
    const gender     = data.gender !== undefined     ? data.gender                        : e.gender;
    const ccName     = data.customContactName !== undefined  ? data.customContactName     : e.customContactName;
    const ccPhone    = data.customContactPhone !== undefined ? data.customContactPhone    : e.customContactPhone;
    const ccAddress  = data.customContactAddress !== undefined ? data.customContactAddress : e.customContactAddress;
    const agentId    = data.agent_id !== undefined   ? parseInt(data.agent_id)            : Number(e.agentId);
    const propertyId = data.property_id !== undefined ? (data.property_id ? parseInt(data.property_id) : null) : (e.propertyId ? Number(e.propertyId) : null);

    await sql`
      UPDATE leads
      SET name=${name}, email=${email}, phone=${phone}, source=${source}, stage=${stage},
          budget=${budget}, notes=${notes}, gender=${gender},
          "customContactName"=${ccName}, "customContactPhone"=${ccPhone},
          "customContactAddress"=${ccAddress}, "agentId"=${agentId}, "propertyId"=${propertyId}
      WHERE id=${id}
    `;
  }

  const updated = await sql`SELECT * FROM leads WHERE id = ${id}`;
  const activities = await getActivitiesForLead(id);
  return { ...rowToLead(updated[0]), activities };
}

async function getActivitiesForLead(leadId: number): Promise<LeadActivity[]> {
  const rows = await sql`SELECT * FROM lead_activities WHERE "leadId" = ${leadId} ORDER BY "createdAt" ASC`;
  return rows.map((r) => rowToActivity(r));
}

export async function getAgents() {
  await initDb();
  const rows = await sql`SELECT id, name, email FROM users WHERE role = 'agent'`;
  return rows.map((r: any) => ({ id: Number(r.id), name: String(r.name), email: String(r.email) }));
}

export async function getFollowUps(isAdmin: boolean, agentId: number) {
  await initDb();
  const rows = isAdmin
    ? await sql`
        SELECT la.id, la."leadId", la.type, la.note, la."audioUrl", la."followUpDate", la."createdAt",
               l.name, l.phone, l.stage, l.gender, l."agentId"
        FROM lead_activities la
        JOIN leads l ON l.id = la."leadId"
        WHERE la."followUpDate" != ''
        ORDER BY la."followUpDate" ASC`
    : await sql`
        SELECT la.id, la."leadId", la.type, la.note, la."audioUrl", la."followUpDate", la."createdAt",
               l.name, l.phone, l.stage, l.gender, l."agentId"
        FROM lead_activities la
        JOIN leads l ON l.id = la."leadId"
        WHERE la."followUpDate" != '' AND l."agentId" = ${agentId}
        ORDER BY la."followUpDate" ASC`;
  return rows.map((r: any) => ({
    id: Number(r.id), leadId: Number(r.leadId), type: String(r.type),
    note: String(r.note || ''), audioUrl: String(r.audioUrl || ''),
    followUpDate: String(r.followUpDate || ''), createdAt: new Date(r.createdAt),
    leadName: String(r.name), leadPhone: String(r.phone),
    leadStage: String(r.stage), leadGender: String(r.gender || ''),
    agentId: Number(r.agentId),
  }));
}

export async function deleteActivity(activityId: number) {
  await initDb();
  await sql`DELETE FROM lead_activities WHERE id = ${activityId}`;
}

export async function deleteLead(id: number) {
  await initDb();
  await sql`DELETE FROM lead_activities WHERE "leadId" = ${id}`;
  await sql`DELETE FROM leads WHERE id = ${id}`;
}

export async function getEvents(isAdmin: boolean, userId: number): Promise<CalendarEvent[]> {
  await initDb();
  const rows = isAdmin
    ? await sql`SELECT * FROM events ORDER BY "startTime" ASC`
    : await sql`SELECT * FROM events WHERE "agentId" = ${userId} ORDER BY "startTime" ASC`;
  return rows.map((r) => ({ id: Number(r.id), title: String(r.title), description: String(r.description), startTime: new Date(r.startTime), endTime: new Date(r.endTime), leadId: r.leadId ? Number(r.leadId) : null, agentId: Number(r.agentId), eventType: String(r.eventType), createdAt: new Date(r.createdAt) }));
}

export async function createEvent(data: Omit<CalendarEvent, 'id'|'createdAt'>): Promise<CalendarEvent> {
  await initDb();
  const rows = await sql`INSERT INTO events (title,description,"startTime","endTime","leadId","agentId","eventType") VALUES (${data.title},${data.description},${data.startTime.toISOString()},${data.endTime.toISOString()},${data.leadId ?? null},${data.agentId},${data.eventType}) RETURNING *`;
  const r = rows[0];
  return { id: Number(r.id), title: String(r.title), description: String(r.description), startTime: new Date(r.startTime), endTime: new Date(r.endTime), leadId: r.leadId ? Number(r.leadId) : null, agentId: Number(r.agentId), eventType: String(r.eventType), createdAt: new Date(r.createdAt) };
}

export async function deleteEvent(id: number) {
  await initDb();
  await sql`DELETE FROM events WHERE id = ${id}`;
}

export function formatPKR(amount: number): string {
  if (amount >= 10000000) return `₨${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₨${(amount / 100000).toFixed(1)}L`;
  return `₨${amount.toLocaleString('en-PK')}`;
}

export async function getDealActivities(isAdmin: boolean, agentId: number) {
  await initDb();
  const rows = isAdmin
    ? await sql`
        SELECT la.id, la."leadId", la.note, la."followUpDate", la."createdAt",
               l.name, l.phone, l.stage, l.gender, l."agentId",
               u.name as "agentName"
        FROM lead_activities la
        JOIN leads l ON l.id = la."leadId"
        LEFT JOIN users u ON u.id = l."agentId"
        WHERE la.type = 'deal'
        ORDER BY la."createdAt" DESC`
    : await sql`
        SELECT la.id, la."leadId", la.note, la."followUpDate", la."createdAt",
               l.name, l.phone, l.stage, l.gender, l."agentId",
               u.name as "agentName"
        FROM lead_activities la
        JOIN leads l ON l.id = la."leadId"
        LEFT JOIN users u ON u.id = l."agentId"
        WHERE la.type = 'deal' AND l."agentId" = ${agentId}
        ORDER BY la."createdAt" DESC`;
  return rows.map((r: any) => ({
    id: Number(r.id), leadId: Number(r.leadId),
    note: String(r.note || ''), followUpDate: String(r.followUpDate || ''),
    createdAt: new Date(r.createdAt),
    leadName: String(r.name), leadPhone: String(r.phone),
    leadStage: String(r.stage), leadGender: String(r.gender || ''),
    agentId: Number(r.agentId), agentName: String(r.agentName || 'Unassigned'),
  }));
}

// ── Invoice Helpers ────────────────────────────────────────────────────────

async function getInvoiceItems(invoiceIds: number[]): Promise<Record<number, InvoiceItem[]>> {
  if (!invoiceIds.length) return {};
  const rows = await sql`SELECT * FROM invoice_items WHERE "invoiceId" = ANY(${invoiceIds})`;
  const map: Record<number, InvoiceItem[]> = {};
  for (const r of rows) {
    const item: InvoiceItem = { id: Number(r.id), invoiceId: Number(r.invoiceId), description: String(r.description), leadCount: Number(r.leadCount), pricePerLead: Number(r.pricePerLead), total: Number(r.total) };
    if (!map[item.invoiceId]) map[item.invoiceId] = [];
    map[item.invoiceId].push(item);
  }
  return map;
}

function rowToInvoice(r: any): Invoice {
  return {
    id: Number(r.id), invoiceNumber: String(r.invoiceNumber), agentId: Number(r.agentId),
    agentName: r.agentName ? String(r.agentName) : undefined,
    status: r.status as Invoice['status'], issueDate: String(r.issueDate),
    dueDate: String(r.dueDate), notes: String(r.notes || ''),
    totalAmount: Number(r.totalAmount), createdAt: new Date(r.createdAt),
    items: [],
  };
}

export async function getInvoices(isAdmin: boolean, userId: number): Promise<Invoice[]> {
  await initDb();
  const rows = isAdmin
    ? await sql`
        SELECT i.id, i."invoiceNumber", i."agentId", i.status, i."issueDate", i."dueDate", i.notes, i."totalAmount", u.name as "agentName", i."createdAt"
        FROM invoices i LEFT JOIN users u ON u.id = i."agentId" ORDER BY i."createdAt" DESC`
    : await sql`
        SELECT i.id, i."invoiceNumber", i."agentId", i.status, i."issueDate", i."dueDate", i.notes, i."totalAmount", u.name as "agentName", i."createdAt"
        FROM invoices i LEFT JOIN users u ON u.id = i."agentId" WHERE i."agentId" = ${userId} ORDER BY i."createdAt" DESC`;
  const invoices = rows.map((r) => rowToInvoice(r));
  if (invoices.length > 0) {
    const itemsMap = await getInvoiceItems(invoices.map((i) => i.id));
    for (const inv of invoices) inv.items = itemsMap[inv.id] ?? [];
  }
  return invoices;
}

export async function createInvoice(data: { agentId: number; issueDate: string; dueDate: string; notes: string; items: { description: string; leadCount: number; pricePerLead: number }[] }): Promise<Invoice> {
  await initDb();
  const countRes = await sql`SELECT COUNT(*) as count FROM invoices`;
  const count = Number(countRes[0].count) + 1;
  const now = new Date();
  const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(count).padStart(4, '0')}`;
  const totalAmount = data.items.reduce((s, item) => s + item.leadCount * item.pricePerLead, 0);
  const invRows = await sql`INSERT INTO invoices ("invoiceNumber","agentId",status,"issueDate","dueDate",notes,"totalAmount") VALUES (${invoiceNumber},${data.agentId},'draft',${data.issueDate},${data.dueDate},${data.notes},${totalAmount}) RETURNING id`;
  const invoiceId = Number(invRows[0].id);
  for (const item of data.items) {
    await sql`INSERT INTO invoice_items ("invoiceId",description,"leadCount","pricePerLead",total) VALUES (${invoiceId},${item.description},${item.leadCount},${item.pricePerLead},${item.leadCount * item.pricePerLead})`;
  }
  const row = await sql`
    SELECT i.id, i."invoiceNumber", i."agentId", i.status, i."issueDate", i."dueDate", i.notes, i."totalAmount", u.name as "agentName", i."createdAt"
    FROM invoices i LEFT JOIN users u ON u.id = i."agentId" WHERE i.id = ${invoiceId}`;
  const invoice = rowToInvoice(row[0]);
  const itemsMap = await getInvoiceItems([invoiceId]);
  invoice.items = itemsMap[invoiceId] ?? [];
  return invoice;
}

export async function updateInvoiceStatus(id: number, status: Invoice['status']): Promise<void> {
  await initDb();
  await sql`UPDATE invoices SET status = ${status} WHERE id = ${id}`;
}

export async function deleteInvoice(id: number): Promise<void> {
  await initDb();
  await sql`DELETE FROM invoice_items WHERE "invoiceId" = ${id}`;
  await sql`DELETE FROM invoices WHERE id = ${id}`;
}

export async function updateUserPassword(userId: number, newPassword: string): Promise<void> {
  await initDb();
  const hash = bcrypt.hashSync(newPassword, 10);
  await sql`UPDATE users SET password = ${hash} WHERE id = ${userId}`;
}

// ── Password Reset Request Helpers ────────────────────────────────────────

export async function createPasswordResetRequest(email: string): Promise<void> {
  await initDb();
  const user = await getUserByEmail(email);
  if (!user) throw new Error('No account found with this email address.');
  await sql`DELETE FROM password_reset_requests WHERE email = ${email} AND status = 'pending'`;
  await sql`INSERT INTO password_reset_requests (email) VALUES (${email})`;
}

export async function getPasswordResetRequests(): Promise<{ id: number; email: string; name: string; status: string; createdAt: string }[]> {
  await initDb();
  const rows = await sql`
    SELECT r.id, r.email, u.name, r.status, r."createdAt"
    FROM password_reset_requests r
    LEFT JOIN users u ON u.email = r.email
    WHERE r.status = 'pending'
    ORDER BY r."createdAt" DESC
  `;
  return rows.map((r: any) => ({
    id: Number(r.id), email: String(r.email), name: String(r.name || r.email),
    status: String(r.status), createdAt: String(r.createdAt),
  }));
}

export async function resolvePasswordResetRequest(id: number, userId: number, newPassword: string): Promise<void> {
  await initDb();
  await updateUserPassword(userId, newPassword);
  await sql`UPDATE password_reset_requests SET status = 'resolved' WHERE id = ${id}`;
}

export async function dismissPasswordResetRequest(id: number): Promise<void> {
  await initDb();
  await sql`UPDATE password_reset_requests SET status = 'dismissed' WHERE id = ${id}`;
}

export async function getLeadsGenderStats(isAdmin: boolean, userId: number): Promise<{ total: number; male: number; female: number; stageCounts: Record<string, number> }> {
  await initDb();
  const rows = isAdmin
    ? await sql`SELECT gender, stage, COUNT(*) as count FROM leads GROUP BY gender, stage`
    : await sql`SELECT gender, stage, COUNT(*) as count FROM leads WHERE "agentId" = ${userId} GROUP BY gender, stage`;
  let total = 0, male = 0, female = 0;
  const stageCounts: Record<string, number> = {};
  for (const r of rows) {
    const c = Number(r.count);
    total += c;
    if (r.gender === 'Male') male += c;
    else if (r.gender === 'Female') female += c;
    stageCounts[String(r.stage)] = (stageCounts[String(r.stage)] || 0) + c;
  }
  return { total, male, female, stageCounts };
}

// ─── GAMIFICATION ──────────────────────────────────────────────
export async function initGamificationTables() {
  await sql`CREATE TABLE IF NOT EXISTS agent_streaks (
    "agentId" INTEGER PRIMARY KEY,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TEXT NOT NULL DEFAULT '',
    "totalXP" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS daily_challenges (
    id SERIAL PRIMARY KEY,
    "agentId" INTEGER NOT NULL,
    date TEXT NOT NULL,
    "callsTarget" INTEGER NOT NULL DEFAULT 10,
    "callsDone" INTEGER NOT NULL DEFAULT 0,
    "closedTarget" INTEGER NOT NULL DEFAULT 2,
    "closedDone" INTEGER NOT NULL DEFAULT 0,
    "whatsappTarget" INTEGER NOT NULL DEFAULT 5,
    "whatsappDone" INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    UNIQUE("agentId", date)
  )`;
}

export async function getAgentStreak(agentId: number) {
  await initGamificationTables();
  const rows = await sql`SELECT * FROM agent_streaks WHERE "agentId" = ${agentId}`;
  if (!rows.length) return { currentStreak: 0, longestStreak: 0, lastActiveDate: '', totalXP: 0 };
  return { currentStreak: Number(rows[0].currentStreak), longestStreak: Number(rows[0].longestStreak), lastActiveDate: String(rows[0].lastActiveDate), totalXP: Number(rows[0].totalXP) };
}

export async function getTodayChallenge(agentId: number) {
  await initGamificationTables();
  const today = new Date().toISOString().slice(0, 10);
  const rows = await sql`SELECT * FROM daily_challenges WHERE "agentId" = ${agentId} AND date = ${today}`;
  if (rows.length) return rows[0];
  // create today's challenge
  const newRows = await sql`INSERT INTO daily_challenges ("agentId", date, "callsTarget", "closedTarget", "whatsappTarget") VALUES (${agentId}, ${today}, 10, 2, 5) RETURNING *`;
  return newRows[0];
}

export async function updateTodayChallenge(agentId: number) {
  await initGamificationTables();
  const today = new Date().toISOString().slice(0, 10);
  const todayStart = new Date(today + 'T00:00:00.000Z');
  const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const [calls, closed, whatsapp] = await Promise.all([
    sql`SELECT COUNT(*) as c FROM lead_activities WHERE "agentId" = (SELECT id FROM users WHERE id = ${agentId} LIMIT 1) AND type = 'call' AND "createdAt" >= ${todayStart} AND "createdAt" < ${tomorrowStart}`.catch(() =>
      sql`SELECT COUNT(*) as c FROM lead_activities la JOIN leads l ON la."leadId" = l.id WHERE l."agentId" = ${agentId} AND la.type = 'call' AND la."createdAt" >= ${todayStart} AND la."createdAt" < ${tomorrowStart}`
    ),
    sql`SELECT COUNT(*) as c FROM leads WHERE "agentId" = ${agentId} AND stage = 'Closed' AND "createdAt" >= ${todayStart} AND "createdAt" < ${tomorrowStart}`,
    sql`SELECT COUNT(*) as c FROM lead_activities la JOIN leads l ON la."leadId" = l.id WHERE l."agentId" = ${agentId} AND la.type = 'whatsapp' AND la."createdAt" >= ${todayStart} AND la."createdAt" < ${tomorrowStart}`,
  ]);

  const callsDone = Number(calls[0]?.c || 0);
  const closedDone = Number(closed[0]?.c || 0);
  const whatsappDone = Number(whatsapp[0]?.c || 0);

  await sql`INSERT INTO daily_challenges ("agentId", date, "callsTarget", "closedTarget", "whatsappTarget", "callsDone", "closedDone", "whatsappDone", completed)
    VALUES (${agentId}, ${today}, 10, 2, 5, ${callsDone}, ${closedDone}, ${whatsappDone}, ${callsDone >= 10 && closedDone >= 2 && whatsappDone >= 5})
    ON CONFLICT ("agentId", date) DO UPDATE SET "callsDone"=${callsDone}, "closedDone"=${closedDone}, "whatsappDone"=${whatsappDone},
    completed=${callsDone >= 10 && closedDone >= 2 && whatsappDone >= 5}`;

  // update streak
  const todayStr = today;
  const yesterday = new Date(todayStart); yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  const streak = await sql`SELECT * FROM agent_streaks WHERE "agentId" = ${agentId}`;
  const cur = streak.length ? streak[0] : { currentStreak: 0, longestStreak: 0, lastActiveDate: '', totalXP: 0 };
  let newStreak = Number(cur.currentStreak);
  const last = String(cur.lastActiveDate);
  if (last === todayStr) { /* already updated */ }
  else if (last === yStr) { newStreak += 1; }
  else { newStreak = 1; }
  const longest = Math.max(newStreak, Number(cur.longestStreak));
  const xpGain = callsDone + (closedDone * 10) + (whatsappDone * 2);
  await sql`INSERT INTO agent_streaks ("agentId","currentStreak","longestStreak","lastActiveDate","totalXP") VALUES (${agentId},${newStreak},${longest},${todayStr},${xpGain})
    ON CONFLICT ("agentId") DO UPDATE SET "currentStreak"=${newStreak},"longestStreak"=${longest},"lastActiveDate"=${todayStr},"totalXP"=agent_streaks."totalXP"+${xpGain}`;

  return { callsDone, closedDone, whatsappDone, callsTarget: 10, closedTarget: 2, whatsappTarget: 5 };
}
