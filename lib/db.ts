import { createClient } from '@libsql/client';
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
function getClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (url && token) {
    return createClient({ url, authToken: token });
  }
  return createClient({ url: 'file:./data/crm.db' });
}

const g = globalThis as typeof globalThis & { __tursoClient?: ReturnType<typeof getClient>; __dbInit?: boolean };
if (!g.__tursoClient) g.__tursoClient = getClient();
export const turso = g.__tursoClient;

// ── Schema & Seed ──────────────────────────────────────────────────────────
export async function initDb() {
  if (g.__dbInit) return;
  g.__dbInit = true;

  await turso.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL UNIQUE,
      password   TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'agent',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS properties (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT NOT NULL,
      address       TEXT NOT NULL,
      price         REAL NOT NULL DEFAULT 0,
      propertyType TEXT NOT NULL DEFAULT 'House',
      bedrooms      INTEGER NOT NULL DEFAULT 0,
      bathrooms     INTEGER NOT NULL DEFAULT 0,
      area          REAL NOT NULL DEFAULT 0,
      status        TEXT NOT NULL DEFAULT 'Available',
      description   TEXT NOT NULL DEFAULT '',
      agentId       INTEGER NOT NULL,
      createdAt     TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS property_agents (
      propertyId INTEGER NOT NULL,
      agentId    INTEGER NOT NULL,
      PRIMARY KEY (propertyId, agentId)
    );
    CREATE TABLE IF NOT EXISTS leads (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL DEFAULT '',
      phone       TEXT NOT NULL DEFAULT '',
      source      TEXT NOT NULL DEFAULT 'Website',
      stage       TEXT NOT NULL DEFAULT 'New',
      budget      REAL NOT NULL DEFAULT 0,
      notes       TEXT NOT NULL DEFAULT '',
      agentId     INTEGER NOT NULL,
      propertyId INTEGER,
      createdAt   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS lead_activities (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      leadId     INTEGER NOT NULL,
      type       TEXT NOT NULL,
      note       TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      startTime   TEXT NOT NULL,
      endTime     TEXT NOT NULL,
      leadId      INTEGER,
      agentId     INTEGER NOT NULL,
      eventType   TEXT NOT NULL DEFAULT 'Call',
      createdAt   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS seed_flag (
      id   INTEGER PRIMARY KEY,
      done INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      invoiceNumber TEXT NOT NULL UNIQUE,
      agentId       INTEGER NOT NULL,
      status        TEXT NOT NULL DEFAULT 'draft',
      issueDate     TEXT NOT NULL DEFAULT (date('now')),
      dueDate       TEXT NOT NULL DEFAULT (date('now', '+30 days')),
      notes         TEXT NOT NULL DEFAULT '',
      totalAmount   REAL NOT NULL DEFAULT 0,
      createdAt     TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS invoice_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      invoiceId    INTEGER NOT NULL,
      description  TEXT NOT NULL DEFAULT '',
      leadCount    INTEGER NOT NULL DEFAULT 0,
      pricePerLead REAL NOT NULL DEFAULT 0,
      total        REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      email     TEXT NOT NULL,
      status    TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migrate: add audioUrl column if it doesn't exist yet
  try {
    await turso.execute("ALTER TABLE lead_activities ADD COLUMN audioUrl TEXT NOT NULL DEFAULT ''");
  } catch (_) { /* column already exists — safe to ignore */ }

  // Migrate: add followUpDate column to lead_activities
  try {
    await turso.execute("ALTER TABLE lead_activities ADD COLUMN followUpDate TEXT NOT NULL DEFAULT ''");
  } catch (_) { /* already exists */ }

  // Migrate: add gender column to leads
  try {
    await turso.execute("ALTER TABLE leads ADD COLUMN gender TEXT NOT NULL DEFAULT ''");
  } catch (_) { /* column already exists — safe to ignore */ }

  // Migrate: add custom contact columns to leads
  try {
    await turso.execute("ALTER TABLE leads ADD COLUMN customContactName TEXT NOT NULL DEFAULT ''");
  } catch (_) { /* already exists */ }
  try {
    await turso.execute("ALTER TABLE leads ADD COLUMN customContactPhone TEXT NOT NULL DEFAULT ''");
  } catch (_) { /* already exists */ }
  try {
    await turso.execute("ALTER TABLE leads ADD COLUMN customContactAddress TEXT NOT NULL DEFAULT ''");
  } catch (_) { /* already exists */ }

  const flagRow = await turso.execute('SELECT done FROM seed_flag WHERE id = 1');
  if (flagRow.rows.length > 0 && Number(flagRow.rows[0][0]) === 1) return;

  const adminPw = bcrypt.hashSync('admin123', 10);
  const agentPw = bcrypt.hashSync('agent123', 10);

  await turso.execute({ sql: `INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?,?,?,?)`, args: ['Admin User', 'admin@crm.com', adminPw, 'admin'] });
  const r2 = await turso.execute({ sql: `INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?,?,?,?)`, args: ['Sarah Mitchell', 'sarah@crm.com', agentPw, 'agent'] });
  const r3 = await turso.execute({ sql: `INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?,?,?,?)`, args: ['James Carter', 'james@crm.com', agentPw, 'agent'] });

  const agent1Id = Number(r2.lastInsertRowid);
  const agent2Id = Number(r3.lastInsertRowid);

  const propData: any[][] = [
    ['Luxury Penthouse Downtown', 'Sky Tower Block, Blue Area, Islamabad', 695000000, 'Penthouse', 4, 3, 3200, 'Available', 'Stunning penthouse with panoramic city views.', agent1Id],
    ['Modern Villa with Pool', 'DHA Phase 6, Lahore', 1334400000, 'Villa', 6, 5, 6500, 'Under Offer', 'Elegant villa with infinity pool and smart home tech.', agent1Id],
    ['Cozy Studio Apartment', 'Gulberg III, Lahore', 88960000, 'Apartment', 1, 1, 650, 'Available', 'Perfect starter home in vibrant neighbourhood.', agent2Id],
    ['Suburban Family Home', 'Bahria Town Phase 4, Rawalpindi', 208500000, 'House', 4, 2, 2800, 'Sold', 'Spacious home with large lawn and great schools nearby.', agent2Id],
    ['Beachfront Condo', 'Emaar Crescent Bay, Karachi', 333600000, 'Condo', 3, 2, 1800, 'Available', 'Wake up to sea views every morning.', agent1Id],
  ];
  for (const p of propData) {
    await turso.execute({ sql: `INSERT OR IGNORE INTO properties (title,address,price,propertyType,bedrooms,bathrooms,area,status,description,agentId) VALUES (?,?,?,?,?,?,?,?,?,?)`, args: p });
  }

  const names = ['Emma Thompson','Liam Johnson','Olivia Davis','Noah Wilson','Ava Martinez','William Brown','Sophia Garcia','Benjamin Lee','Isabella Anderson','Mason Taylor'];
  const phones = ['+923001234567','+923001234568','+923001234569','+923001234570','+923001234571','+923001234572','+923001234573','+923001234574','+923001234575','+923001234576'];
  const stages = ['New','Contacted','Viewing','Negotiating','Closed'];
  const sources = ['Website','Referral','Social Media','Walk-in','Cold Call'];
  for (let i = 0; i < names.length; i++) {
    const email = names[i].toLowerCase().replace(' ', '.') + '@email.com';
    await turso.execute({ sql: `INSERT OR IGNORE INTO leads (name,email,phone,source,stage,budget,notes,agentId) VALUES (?,?,?,?,?,?,?,?)`, args: [names[i], email, phones[i], sources[i % 5], stages[i % 5], (Math.floor(Math.random() * 4700 + 300)) * 1000 * 278, `Interested in ${i % 3 === 0 ? 'downtown' : i % 3 === 1 ? 'suburban' : 'beachfront'} properties.`, i % 2 === 0 ? agent1Id : agent2Id] });
  }

  const eventTitles = ['Property Viewing','Client Call','Site Visit','Contract Signing'];
  for (let i = 0; i < 5; i++) {
    const start = new Date(Date.now() + (i + 1) * 86400000 * 2);
    const end = new Date(start.getTime() + 3600000);
    await turso.execute({ sql: `INSERT OR IGNORE INTO events (title,description,startTime,endTime,leadId,agentId,eventType) VALUES (?,?,?,?,?,?,?)`, args: [eventTitles[i % 4], 'Scheduled appointment', start.toISOString(), end.toISOString(), i + 1, i % 2 === 0 ? agent1Id : agent2Id, i % 2 === 0 ? 'Viewing' : 'Call'] });
  }

  await turso.execute(`INSERT OR REPLACE INTO seed_flag (id, done) VALUES (1, 1)`);
}

// ── Query Helpers ──────────────────────────────────────────────────────────
export async function getUsers(): Promise<Omit<User, 'password'>[]> {
  await initDb();
  const res = await turso.execute('SELECT id, name, email, role, createdAt FROM users ORDER BY id');
  return res.rows.map((r) => ({ id: Number(r[0]), name: String(r[1]), email: String(r[2]), role: r[3] as 'admin'|'agent', createdAt: new Date(String(r[4])) }));
}

export async function getUserByEmail(email: string): Promise<User | null> {
  await initDb();
  const res = await turso.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email] });
  if (!res.rows.length) return null;
  const r = res.rows[0];
  return { id: Number(r[0]), name: String(r[1]), email: String(r[2]), password: String(r[3]), role: r[4] as 'admin'|'agent', createdAt: new Date(String(r[5])) };
}

export async function createUser(name: string, email: string, password: string, role: 'admin'|'agent') {
  await initDb();
  const hash = bcrypt.hashSync(password, 10);
  const res = await turso.execute({ sql: 'INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)', args: [name, email, hash, role] });
  const row = await turso.execute({ sql: 'SELECT id,name,email,role,createdAt FROM users WHERE id = ?', args: [Number(res.lastInsertRowid)] });
  const r = row.rows[0];
  return { id: Number(r[0]), name: String(r[1]), email: String(r[2]), role: r[3] as 'admin'|'agent', createdAt: new Date(String(r[4])) };
}

export async function deleteUser(id: number) {
  await initDb();
  await turso.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] });
}

export async function getProperties(isAdmin: boolean, userId: number): Promise<Property[]> {
  await initDb();
  const res = isAdmin
    ? await turso.execute('SELECT * FROM properties ORDER BY createdAt DESC')
    : await turso.execute({ sql: 'SELECT * FROM properties WHERE agentId = ? ORDER BY createdAt DESC', args: [userId] });
  return res.rows.map((r) => rowToProperty(r as any));
}

function rowToProperty(r: any): Property {
  return { id: Number(r[0]), title: String(r[1]), address: String(r[2]), price: Number(r[3]), propertyType: String(r[4]), bedrooms: Number(r[5]), bathrooms: Number(r[6]), area: Number(r[7]), status: r[8] as Property['status'], description: String(r[9]), agentId: Number(r[10]), createdAt: new Date(String(r[11])) };
}

export async function getPropertyAgents(propertyId: number): Promise<number[]> {
  await initDb();
  const res = await turso.execute({ sql: 'SELECT agentId FROM property_agents WHERE propertyId = ?', args: [propertyId] });
  return res.rows.map((r: any) => Number(r[0]));
}

export async function getPropertyAgentsBulk(propertyIds: number[]): Promise<Record<number, number[]>> {
  if (!propertyIds.length) return {};
  await initDb();
  const res = await turso.execute({ sql: `SELECT propertyId, agentId FROM property_agents WHERE propertyId IN (${propertyIds.map(() => '?').join(',')})`, args: propertyIds });
  const map: Record<number, number[]> = {};
  for (const r of res.rows) { const pid = Number(r[0]); if (!map[pid]) map[pid] = []; map[pid].push(Number(r[1])); }
  return map;
}

export async function setPropertyAgents(propertyId: number, agentIds: number[]): Promise<void> {
  await initDb();
  await turso.execute({ sql: 'DELETE FROM property_agents WHERE propertyId = ?', args: [propertyId] });
  for (const agentId of agentIds) {
    await turso.execute({ sql: 'INSERT OR IGNORE INTO property_agents (propertyId, agentId) VALUES (?, ?)', args: [propertyId, agentId] });
  }
}

export async function createProperty(data: Omit<Property, 'id'|'createdAt'>): Promise<Property> {
  await initDb();
  const res = await turso.execute({ sql: 'INSERT INTO properties (title,address,price,propertyType,bedrooms,bathrooms,area,status,description,agentId) VALUES (?,?,?,?,?,?,?,?,?,?)', args: [data.title, data.address, data.price, data.propertyType, data.bedrooms, data.bathrooms, data.area, data.status, data.description, data.agentId] });
  const row = await turso.execute({ sql: 'SELECT * FROM properties WHERE id = ?', args: [Number(res.lastInsertRowid)] });
  return rowToProperty(row.rows[0] as any);
}

export async function updateProperty(id: number, data: any): Promise<Property | null> {
  await initDb();
  const fields: string[] = []; const args: any[] = [];
  if (data.title !== undefined) { fields.push('title = ?'); args.push(data.title); }
  if (data.address !== undefined) { fields.push('address = ?'); args.push(data.address); }
  if (data.price !== undefined) { fields.push('price = ?'); args.push(parseFloat(data.price)); }
  if (data.property_type !== undefined) { fields.push('propertyType = ?'); args.push(data.property_type); }
  if (data.bedrooms !== undefined) { fields.push('bedrooms = ?'); args.push(parseInt(data.bedrooms)); }
  if (data.bathrooms !== undefined) { fields.push('bathrooms = ?'); args.push(parseInt(data.bathrooms)); }
  if (data.area !== undefined) { fields.push('area = ?'); args.push(parseFloat(data.area)); }
  if (data.status !== undefined) { fields.push('status = ?'); args.push(data.status); }
  if (data.description !== undefined) { fields.push('description = ?'); args.push(data.description); }
  if (!fields.length) return null;
  args.push(id);
  await turso.execute({ sql: `UPDATE properties SET ${fields.join(', ')} WHERE id = ?`, args });
  const row = await turso.execute({ sql: 'SELECT * FROM properties WHERE id = ?', args: [id] });
  return row.rows.length ? rowToProperty(row.rows[0] as any) : null;
}

export async function deleteProperty(id: number) {
  await initDb();
  await turso.execute({ sql: 'DELETE FROM properties WHERE id = ?', args: [id] });
}

export async function getLeads(isAdmin: boolean, userId: number, limit = 500, offset = 0): Promise<Lead[]> {
  await initDb();
  const res = isAdmin
    ? await turso.execute({ sql: 'SELECT * FROM leads ORDER BY createdAt DESC LIMIT ? OFFSET ?', args: [limit, offset] })
    : await turso.execute({ sql: 'SELECT * FROM leads WHERE agentId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?', args: [userId, limit, offset] });
  const leads = res.rows.map((r) => rowToLead(r as any));
  if (leads.length > 0) {
    const leadIds = leads.map((l) => l.id);
    const actMap: Record<number, LeadActivity[]> = {};
    for (let i = 0; i < leadIds.length; i += 100) {
      const chunk = leadIds.slice(i, i + 100);
      const actRes = await turso.execute({ sql: `SELECT * FROM lead_activities WHERE leadId IN (${chunk.map(() => '?').join(',')}) ORDER BY createdAt ASC`, args: chunk });
      for (const r of actRes.rows) { const a = rowToActivity(r as any); if (!actMap[a.leadId]) actMap[a.leadId] = []; actMap[a.leadId].push(a); }
    }
    for (const lead of leads) lead.activities = actMap[lead.id] ?? [];
  }
  return leads;
}

function rowToLead(r: any): Lead {
  return {
    id: Number(r[0]), name: String(r[1]), email: String(r[2]), phone: String(r[3]),
    source: String(r[4]), stage: r[5] as Lead['stage'], budget: Number(r[6]),
    notes: String(r[7]), agentId: Number(r[8]), propertyId: r[9] ? Number(r[9]) : null,
    createdAt: new Date(String(r[10])), gender: String(r[11] || '') as Lead['gender'],
    customContactName: String(r[12] || ''), customContactPhone: String(r[13] || ''),
    customContactAddress: String(r[14] || ''), activities: []
  };
}

function rowToActivity(r: any): LeadActivity {
  return { id: Number(r[0]), leadId: Number(r[1]), type: r[2] as 'call'|'whatsapp'|'voice'|'deal', note: String(r[3]), createdAt: new Date(String(r[4])), audioUrl: String(r[5] || ''), followUpDate: String(r[6] || '') };
}

export async function createLead(data: Omit<Lead, 'id'|'createdAt'|'activities'>): Promise<Lead> {
  await initDb();
  const res = await turso.execute({ sql: 'INSERT INTO leads (name,email,phone,source,stage,budget,notes,agentId,propertyId,gender,customContactName,customContactPhone,customContactAddress) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', args: [data.name, data.email, data.phone, data.source, data.stage, data.budget, data.notes, data.agentId, data.propertyId ?? null, data.gender || '', data.customContactName || '', data.customContactPhone || '', data.customContactAddress || ''] });
  const row = await turso.execute({ sql: 'SELECT * FROM leads WHERE id = ?', args: [Number(res.lastInsertRowid)] });
  return { ...rowToLead(row.rows[0] as any), activities: [] };
}

export async function updateLead(id: number, data: any): Promise<Lead | null> {
  await initDb();
  const row = await turso.execute({ sql: 'SELECT * FROM leads WHERE id = ?', args: [id] });
  if (!row.rows.length) return null;

  if (data._action === 'log_activity') {
    await turso.execute({ sql: 'INSERT INTO lead_activities (leadId,type,note,audioUrl,followUpDate) VALUES (?,?,?,?,?)', args: [id, data.type, data.note || '', data.audioUrl || '', data.followUpDate || ''] });
    const activities = await getActivitiesForLead(id);
    return { ...rowToLead(row.rows[0] as any), activities };
  }

  const fields: string[] = []; const args: any[] = [];
  if (data.name !== undefined) { fields.push('name = ?'); args.push(data.name); }
  if (data.email !== undefined) { fields.push('email = ?'); args.push(data.email); }
  if (data.phone !== undefined) { fields.push('phone = ?'); args.push(data.phone); }
  if (data.source !== undefined) { fields.push('source = ?'); args.push(data.source); }
  if (data.stage !== undefined) { fields.push('stage = ?'); args.push(data.stage); }
  if (data.budget !== undefined) { fields.push('budget = ?'); args.push(parseFloat(data.budget)); }
  if (data.notes !== undefined) { fields.push('notes = ?'); args.push(data.notes); }
  if (data.gender !== undefined) { fields.push('gender = ?'); args.push(data.gender); }
  if (data.customContactName !== undefined) { fields.push('customContactName = ?'); args.push(data.customContactName); }
  if (data.customContactPhone !== undefined) { fields.push('customContactPhone = ?'); args.push(data.customContactPhone); }
  if (data.customContactAddress !== undefined) { fields.push('customContactAddress = ?'); args.push(data.customContactAddress); }
  if (data.agent_id !== undefined) { fields.push('agentId = ?'); args.push(parseInt(data.agent_id)); }
  if (data.property_id !== undefined) { fields.push('propertyId = ?'); args.push(data.property_id ? parseInt(data.property_id) : null); }
  if (fields.length) { args.push(id); await turso.execute({ sql: `UPDATE leads SET ${fields.join(', ')} WHERE id = ?`, args }); }

  const updated = await turso.execute({ sql: 'SELECT * FROM leads WHERE id = ?', args: [id] });
  const activities = await getActivitiesForLead(id);
  return { ...rowToLead(updated.rows[0] as any), activities };
}

async function getActivitiesForLead(leadId: number): Promise<LeadActivity[]> {
  const res = await turso.execute({ sql: 'SELECT * FROM lead_activities WHERE leadId = ? ORDER BY createdAt ASC', args: [leadId] });
  return res.rows.map((r) => rowToActivity(r as any));
}

export async function getAgents() {
  await initDb();
  const res = await turso.execute("SELECT id, name, email FROM users WHERE role = 'agent'");
  return res.rows.map((r: any) => ({ id: Number(r[0]), name: String(r[1]), email: String(r[2]) }));
}

export async function getFollowUps(isAdmin: boolean, agentId: number) {
  await initDb();
  const sql = isAdmin
    ? `SELECT la.id, la.leadId, la.type, la.note, la.audioUrl, la.followUpDate, la.createdAt,
              l.name, l.phone, l.stage, l.gender, l.agentId
       FROM lead_activities la
       JOIN leads l ON l.id = la.leadId
       WHERE la.followUpDate != ''
       ORDER BY la.followUpDate ASC`
    : `SELECT la.id, la.leadId, la.type, la.note, la.audioUrl, la.followUpDate, la.createdAt,
              l.name, l.phone, l.stage, l.gender, l.agentId
       FROM lead_activities la
       JOIN leads l ON l.id = la.leadId
       WHERE la.followUpDate != '' AND l.agentId = ?
       ORDER BY la.followUpDate ASC`;
  const res = isAdmin
    ? await turso.execute(sql)
    : await turso.execute({ sql, args: [agentId] });
  return res.rows.map((r: any) => ({
    id: Number(r[0]), leadId: Number(r[1]), type: String(r[2]),
    note: String(r[3] || ''), audioUrl: String(r[4] || ''),
    followUpDate: String(r[5] || ''), createdAt: new Date(String(r[6])),
    leadName: String(r[7]), leadPhone: String(r[8]),
    leadStage: String(r[9]), leadGender: String(r[10] || ''),
    agentId: Number(r[11]),
  }));
}

export async function deleteActivity(activityId: number) {
  await initDb();
  await turso.execute({ sql: 'DELETE FROM lead_activities WHERE id = ?', args: [activityId] });
}

export async function deleteLead(id: number) {
  await initDb();
  await turso.execute({ sql: 'DELETE FROM lead_activities WHERE leadId = ?', args: [id] });
  await turso.execute({ sql: 'DELETE FROM leads WHERE id = ?', args: [id] });
}

export async function getEvents(isAdmin: boolean, userId: number): Promise<CalendarEvent[]> {
  await initDb();
  const res = isAdmin
    ? await turso.execute('SELECT * FROM events ORDER BY startTime ASC')
    : await turso.execute({ sql: 'SELECT * FROM events WHERE agentId = ? ORDER BY startTime ASC', args: [userId] });
  return res.rows.map((r) => ({ id: Number(r[0]), title: String(r[1]), description: String(r[2]), startTime: new Date(String(r[3])), endTime: new Date(String(r[4])), leadId: r[5] ? Number(r[5]) : null, agentId: Number(r[6]), eventType: String(r[7]), createdAt: new Date(String(r[8])) }));
}

export async function createEvent(data: Omit<CalendarEvent, 'id'|'createdAt'>): Promise<CalendarEvent> {
  await initDb();
  const res = await turso.execute({ sql: 'INSERT INTO events (title,description,startTime,endTime,leadId,agentId,eventType) VALUES (?,?,?,?,?,?,?)', args: [data.title, data.description, data.startTime.toISOString(), data.endTime.toISOString(), data.leadId ?? null, data.agentId, data.eventType] });
  const row = await turso.execute({ sql: 'SELECT * FROM events WHERE id = ?', args: [Number(res.lastInsertRowid)] });
  const r = row.rows[0];
  return { id: Number(r[0]), title: String(r[1]), description: String(r[2]), startTime: new Date(String(r[3])), endTime: new Date(String(r[4])), leadId: r[5] ? Number(r[5]) : null, agentId: Number(r[6]), eventType: String(r[7]), createdAt: new Date(String(r[8])) };
}

export async function deleteEvent(id: number) {
  await initDb();
  await turso.execute({ sql: 'DELETE FROM events WHERE id = ?', args: [id] });
}

export function formatPKR(amount: number): string {
  if (amount >= 10000000) return `₨${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₨${(amount / 100000).toFixed(1)}L`;
  return `₨${amount.toLocaleString('en-PK')}`;
}
export async function getDealActivities(isAdmin: boolean, agentId: number) {
  await initDb();
  const sql = isAdmin
    ? `SELECT la.id, la.leadId, la.note, la.followUpDate, la.createdAt,
              l.name, l.phone, l.stage, l.gender, l.agentId,
              u.name as agentName
       FROM lead_activities la
       JOIN leads l ON l.id = la.leadId
       LEFT JOIN users u ON u.id = l.agentId
       WHERE la.type = 'deal'
       ORDER BY la.createdAt DESC`
    : `SELECT la.id, la.leadId, la.note, la.followUpDate, la.createdAt,
              l.name, l.phone, l.stage, l.gender, l.agentId,
              u.name as agentName
       FROM lead_activities la
       JOIN leads l ON l.id = la.leadId
       LEFT JOIN users u ON u.id = l.agentId
       WHERE la.type = 'deal' AND l.agentId = ?
       ORDER BY la.createdAt DESC`;
  const res = isAdmin
    ? await turso.execute(sql)
    : await turso.execute({ sql, args: [agentId] });
  return res.rows.map((r: any) => ({
    id: Number(r[0]), leadId: Number(r[1]),
    note: String(r[2] || ''), followUpDate: String(r[3] || ''),
    createdAt: new Date(String(r[4])),
    leadName: String(r[5]), leadPhone: String(r[6]),
    leadStage: String(r[7]), leadGender: String(r[8] || ''),
    agentId: Number(r[9]), agentName: String(r[10] || 'Unassigned'),
  }));
}

// ── Invoice Helpers ────────────────────────────────────────────────────────

async function getInvoiceItems(invoiceIds: number[]): Promise<Record<number, InvoiceItem[]>> {
  if (!invoiceIds.length) return {};
  const res = await turso.execute({ sql: `SELECT * FROM invoice_items WHERE invoiceId IN (${invoiceIds.map(() => '?').join(',')})`, args: invoiceIds });
  const map: Record<number, InvoiceItem[]> = {};
  for (const r of res.rows) {
    const item: InvoiceItem = { id: Number(r[0]), invoiceId: Number(r[1]), description: String(r[2]), leadCount: Number(r[3]), pricePerLead: Number(r[4]), total: Number(r[5]) };
    if (!map[item.invoiceId]) map[item.invoiceId] = [];
    map[item.invoiceId].push(item);
  }
  return map;
}

function rowToInvoice(r: any): Invoice {
  return {
    id: Number(r[0]), invoiceNumber: String(r[1]), agentId: Number(r[2]),
    agentName: r[8] ? String(r[8]) : undefined,
    status: r[3] as Invoice['status'], issueDate: String(r[4]),
    dueDate: String(r[5]), notes: String(r[6] || ''),
    totalAmount: Number(r[7]), createdAt: new Date(String(r[9] ?? r[8] ?? '')),
    items: [],
  };
}

export async function getInvoices(isAdmin: boolean, userId: number): Promise<Invoice[]> {
  await initDb();
  const sql = isAdmin
    ? `SELECT i.id, i.invoiceNumber, i.agentId, i.status, i.issueDate, i.dueDate, i.notes, i.totalAmount, u.name as agentName, i.createdAt
       FROM invoices i LEFT JOIN users u ON u.id = i.agentId ORDER BY i.createdAt DESC`
    : `SELECT i.id, i.invoiceNumber, i.agentId, i.status, i.issueDate, i.dueDate, i.notes, i.totalAmount, u.name as agentName, i.createdAt
       FROM invoices i LEFT JOIN users u ON u.id = i.agentId WHERE i.agentId = ? ORDER BY i.createdAt DESC`;
  const res = isAdmin ? await turso.execute(sql) : await turso.execute({ sql, args: [userId] });
  const invoices = res.rows.map((r) => rowToInvoice(r as any));
  if (invoices.length > 0) {
    const itemsMap = await getInvoiceItems(invoices.map((i) => i.id));
    for (const inv of invoices) inv.items = itemsMap[inv.id] ?? [];
  }
  return invoices;
}

export async function createInvoice(data: { agentId: number; issueDate: string; dueDate: string; notes: string; items: { description: string; leadCount: number; pricePerLead: number }[] }): Promise<Invoice> {
  await initDb();
  // Generate invoice number: INV-YYYYMM-XXXX
  const countRes = await turso.execute('SELECT COUNT(*) FROM invoices');
  const count = Number(countRes.rows[0][0]) + 1;
  const now = new Date();
  const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(count).padStart(4, '0')}`;
  const totalAmount = data.items.reduce((s, item) => s + item.leadCount * item.pricePerLead, 0);
  const res = await turso.execute({ sql: 'INSERT INTO invoices (invoiceNumber, agentId, status, issueDate, dueDate, notes, totalAmount) VALUES (?,?,?,?,?,?,?)', args: [invoiceNumber, data.agentId, 'draft', data.issueDate, data.dueDate, data.notes, totalAmount] });
  const invoiceId = Number(res.lastInsertRowid);
  for (const item of data.items) {
    await turso.execute({ sql: 'INSERT INTO invoice_items (invoiceId, description, leadCount, pricePerLead, total) VALUES (?,?,?,?,?)', args: [invoiceId, item.description, item.leadCount, item.pricePerLead, item.leadCount * item.pricePerLead] });
  }
  const row = await turso.execute({ sql: `SELECT i.id, i.invoiceNumber, i.agentId, i.status, i.issueDate, i.dueDate, i.notes, i.totalAmount, u.name as agentName, i.createdAt FROM invoices i LEFT JOIN users u ON u.id = i.agentId WHERE i.id = ?`, args: [invoiceId] });
  const invoice = rowToInvoice(row.rows[0] as any);
  const itemsMap = await getInvoiceItems([invoiceId]);
  invoice.items = itemsMap[invoiceId] ?? [];
  return invoice;
}

export async function updateInvoiceStatus(id: number, status: Invoice['status']): Promise<void> {
  await initDb();
  await turso.execute({ sql: 'UPDATE invoices SET status = ? WHERE id = ?', args: [status, id] });
}

export async function deleteInvoice(id: number): Promise<void> {
  await initDb();
  await turso.execute({ sql: 'DELETE FROM invoice_items WHERE invoiceId = ?', args: [id] });
  await turso.execute({ sql: 'DELETE FROM invoices WHERE id = ?', args: [id] });
}

export async function updateUserPassword(userId: number, newPassword: string): Promise<void> {
  await initDb();
  const hash = bcrypt.hashSync(newPassword, 10);
  await turso.execute({ sql: 'UPDATE users SET password = ? WHERE id = ?', args: [hash, userId] });
}

// ── Password Reset Request Helpers ────────────────────────────────────────

export async function createPasswordResetRequest(email: string): Promise<void> {
  await initDb();
  // Check user exists
  const user = await getUserByEmail(email);
  if (!user) throw new Error('No account found with this email address.');
  // Avoid duplicate pending requests
  await turso.execute({ sql: `DELETE FROM password_reset_requests WHERE email = ? AND status = 'pending'`, args: [email] });
  await turso.execute({ sql: `INSERT INTO password_reset_requests (email) VALUES (?)`, args: [email] });
}

export async function getPasswordResetRequests(): Promise<{ id: number; email: string; name: string; status: string; createdAt: string }[]> {
  await initDb();
  const res = await turso.execute(`
    SELECT r.id, r.email, u.name, r.status, r.createdAt
    FROM password_reset_requests r
    LEFT JOIN users u ON u.email = r.email
    WHERE r.status = 'pending'
    ORDER BY r.createdAt DESC
  `);
  return res.rows.map((r: any) => ({
    id: Number(r[0]), email: String(r[1]), name: String(r[2] || r[1]),
    status: String(r[3]), createdAt: String(r[4]),
  }));
}

export async function resolvePasswordResetRequest(id: number, userId: number, newPassword: string): Promise<void> {
  await initDb();
  await updateUserPassword(userId, newPassword);
  await turso.execute({ sql: `UPDATE password_reset_requests SET status = 'resolved' WHERE id = ?`, args: [id] });
}

export async function dismissPasswordResetRequest(id: number): Promise<void> {
  await initDb();
  await turso.execute({ sql: `UPDATE password_reset_requests SET status = 'dismissed' WHERE id = ?`, args: [id] });
}
