'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';
import { getCountryFromPhone } from '@/lib/phone-country';

interface LeadActivity {
  id: number; type: 'call' | 'whatsapp' | 'voice' | 'deal'; note: string; audioUrl: string; followUpDate: string; createdAt: string;
}
interface Lead {
  id: number; name: string; email: string; phone: string;
  source: string; stage: string; budget: number; notes: string;
  gender: 'Male' | 'Female' | '';
  agentId: number; propertyId: number | null; createdAt: string;
  customContactName: string; customContactPhone: string; customContactAddress: string;
  activities: LeadActivity[];
}
interface Agent { id: number; name: string; }
interface Property { id: number; title: string; }

function formatPKR(n: number) {
  if (n >= 10000000) return `₨${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₨${(n / 100000).toFixed(1)}L`;
  return `₨${n.toLocaleString()}`;
}

const STAGES = ['New', 'Contacted', 'Viewing', 'Negotiating', 'Closed', 'Lost'];
const SOURCES = ['Website', 'Referral', 'Social Media', 'Walk-in', 'Cold Call'];
const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100];

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map((line) => {
    const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
}

const AGENT_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4'];
function agentColor(id: number) { return AGENT_COLORS[id % AGENT_COLORS.length]; }
function agentInitials(name: string) { return name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase(); }

export default function LeadsClient({ leads: initial, agents, properties, isAdmin }: {
  leads: Lead[]; agents: Agent[]; properties: Property[]; isAdmin: boolean;
}) {
  const router = useRouter();
  const [leads, setLeads] = useState(initial);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [msg, setMsg] = useState('');
  const [activityLead, setActivityLead] = useState<Lead | null>(null);
  const [activityNote, setActivityNote] = useState('');
  const [activityType, setActivityType] = useState<'call' | 'whatsapp'>('call');
  const [activityTab, setActivityTab] = useState<'activity' | 'deal'>('activity');
  const [dealSiteVisitDate, setDealSiteVisitDate] = useState('');
  const [dealSiteVisitTime, setDealSiteVisitTime] = useState('');
  const [dealSiteLocation, setDealSiteLocation] = useState('');
  const [dealSiteAgent, setDealSiteAgent] = useState('');
  const [dealTotalPrice, setDealTotalPrice] = useState('');
  const [dealDownpayment, setDealDownpayment] = useState('');
  const [dealMonthlyInstallment, setDealMonthlyInstallment] = useState('');
  const [dealTotalInstallments, setDealTotalInstallments] = useState('');
  const [dealDuration, setDealDuration] = useState('');
  const [dealNextDate, setDealNextDate] = useState('');
  const [dealNextType, setDealNextType] = useState<'call'|'whatsapp'|'visit'>('call');
  const [dealNextNote, setDealNextNote] = useState('');
  const [useCustomContact, setUseCustomContact] = useState(false);
  const [customContactName, setCustomContactName] = useState('');
  const [customContactPhone, setCustomContactPhone] = useState('');
  const [customContactAddress, setCustomContactAddress] = useState('');
  const [csvLoading, setCsvLoading] = useState(false);
  const csvRef = useRef<HTMLInputElement>(null);

  // ── Voice Recording ────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [followUpDate, setFollowUpDate] = useState('');
  const [quickFollowupLead, setQuickFollowupLead] = useState<Lead | null>(null);
  const [quickDate, setQuickDate] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceUploadRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkAssignAgentId, setBulkAssignAgentId] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [leadType, setLeadType] = useState<''|'overseas'|'local'>('');
  const [genderFilter, setGenderFilter] = useState<''|'Male'|'Female'>('');
  const [callFilter, setCallFilter] = useState<''|'called'|'notcalled'>('');
  const [showAgentView, setShowAgentView] = useState(false);

  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a.name]));

  const agentStats = agents.map((a) => {
    const al = leads.filter((l) => l.agentId === a.id);
    return { ...a, total: al.length, byStage: Object.fromEntries(STAGES.map((s) => [s, al.filter((l) => l.stage === s).length])) };
  });
  const unassigned = leads.filter((l) => !agents.find((a) => a.id === l.agentId));

  // Detect Pakistan local number
  const isPakistaniNumber = (phone: string) => {
    const p = phone.replace(/[\s\-().]/g, '');
    return /^(\+92|0092|03|923)/.test(p) || p === '';
  };

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    const ms = !q || l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.phone.includes(q);
    const mst = !stageFilter || l.stage === stageFilter;
    const ma = !agentFilter || (agentFilter === 'unassigned' ? !agents.find((a) => a.id === l.agentId) : l.agentId === parseInt(agentFilter));
    const mt = !leadType || (leadType === 'local' ? isPakistaniNumber(l.phone) : !isPakistaniNumber(l.phone));
    const mg = !genderFilter || l.gender === genderFilter;
    const hasCalled = (l.activities || []).some((a) => a.type === 'call' || a.type === 'voice');
    const mc = !callFilter || (callFilter === 'called' ? hasCalled : !hasCalled);
    return ms && mst && ma && mt && mg && mc;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const flash = (m: string, persist = false) => { setMsg(m); if (!persist) setTimeout(() => setMsg(''), 4000); };
  const openAdd = () => {
    setEditLead(null);
    setUseCustomContact(false);
    setCustomContactName(''); setCustomContactPhone(''); setCustomContactAddress('');
    setShowModal(true);
  };
  const openEdit = (l: Lead) => {
    setEditLead(l);
    const hasCustom = !!(l.customContactName || l.customContactPhone || l.customContactAddress);
    setUseCustomContact(hasCustom);
    setCustomContactName(l.customContactName || '');
    setCustomContactPhone(l.customContactPhone || '');
    setCustomContactAddress(l.customContactAddress || '');
    setShowModal(true);
  };
  const close = () => { setShowModal(false); setEditLead(null); };
  const clearSelection = () => setSelectedIds(new Set());
  const resetPage = () => { setPage(1); clearSelection(); };
  const handleSearch = (v: string) => { setSearch(v); resetPage(); };
  const handleStageFilter = (v: string) => { setStageFilter(v); resetPage(); };
  const handleAgentFilter = (v: string) => { setAgentFilter(v); resetPage(); };

  const allPageSelected = paginated.length > 0 && paginated.every((l) => selectedIds.has(l.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allPageSelected) { clearSelection(); }
    else { setSelectedIds(new Set(paginated.map((l) => l.id))); }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (!confirm(`Delete ${count} selected lead${count > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setBulkLoading(true);
    const res = await fetch('/api/leads/bulk-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', ids: Array.from(selectedIds) }) });
    const data = await res.json();
    if (data.success) { setLeads(leads.filter((l) => !selectedIds.has(l.id))); clearSelection(); flash(`🗑️ ${data.count} lead${data.count > 1 ? 's' : ''} deleted.`); }
    setBulkLoading(false);
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignAgentId) return;
    setBulkLoading(true);
    const res = await fetch('/api/leads/bulk-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'assign', ids: Array.from(selectedIds), agentId: parseInt(bulkAssignAgentId) }) });
    const data = await res.json();
    if (data.success) {
      const updatedMap = new Map((data.leads as Lead[]).map((l) => [l.id, l]));
      setLeads(leads.map((l) => updatedMap.has(l.id) ? { ...l, ...updatedMap.get(l.id) } : l));
      clearSelection(); setShowBulkAssignModal(false); setBulkAssignAgentId('');
      flash(`✅ ${data.count} lead${data.count > 1 ? 's' : ''} reassigned.`);
    }
    setBulkLoading(false);
  };

  const handleUnassignLead = async (id: number) => {
    if (!confirm('Remove agent assignment from this lead?')) return;
    const res = await fetch(`/api/leads/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent_id: null }) });
    const data = await res.json();
    setLeads(leads.map((l) => l.id === id ? { ...l, agentId: data.agentId ?? null } : l));
    flash('✅ Lead unassigned.');
  };

  const handleBulkUnassign = async () => {
    const count = selectedIds.size;
    if (!confirm(`Remove agent from ${count} lead${count > 1 ? 's' : ''}?`)) return;
    setBulkLoading(true);
    const res = await fetch('/api/leads/bulk-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unassign', ids: Array.from(selectedIds) }) });
    const data = await res.json();
    if (data.success) {
      setLeads(leads.map((l) => selectedIds.has(l.id) ? { ...l, agentId: null as any } : l));
      clearSelection();
      flash(`✅ ${data.count} lead${data.count > 1 ? 's' : ''} unassigned.`);
    }
    setBulkLoading(false);
  };

  const downloadTemplate = () => {
    const csv = 'name,email,phone,source,stage,budget,notes\nAli Hassan,ali@email.com,+923001234567,Website,New,5000000,Interested in DHA\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'leads-template.csv'; a.click();
  };

  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvLoading(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) { flash('⚠️ CSV is empty or invalid!'); return; }

      const CHUNK = 2000;
      let total = 0;
      const totalChunks = Math.ceil(rows.length / CHUNK);
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunkIndex = Math.floor(i / CHUNK) + 1;
        flash(`⏳ Importing... ${total} / ${rows.length} leads (batch ${chunkIndex}/${totalChunks})`, true);
        const chunk = rows.slice(i, i + CHUNK);
        const res = await fetch('/api/leads/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: chunk }) });
        if (!res.ok) {
          const text = await res.text();
          flash(`❌ Import failed: ${text.slice(0, 150)}`);
          return;
        }
        const data = await res.json();
        if (data.error) { flash(`❌ Import failed: ${data.error}`); return; }
        total += data.count;
      }

      if (total === 0) {
        flash('⚠️ No valid leads in CSV. Make sure the "name" column is filled.');
        return;
      }
      flash(`✅ ${total} lead${total !== 1 ? 's' : ''} imported successfully! Reloading page...`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      flash(`❌ Import error: ${err.message}`);
    } finally {
      setCsvLoading(false);
      if (csvRef.current) csvRef.current.value = '';
    }
  };

  // ── XLSX Upload ───────────────────────────────────────────────
  const xlsxRef = useRef<HTMLInputElement>(null);

  const handleXLSX = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (!rawRows.length) { flash('⚠️ XLSX file is empty!'); return; }
      const rows = rawRows.map((r) => {
        const normalized: Record<string, string> = {};
        for (const key of Object.keys(r)) {
          normalized[key.toLowerCase().trim()] = String(r[key] ?? '').trim();
        }
        return normalized;
      });

      const CHUNK = 2000;
      let total = 0;
      const totalChunks = Math.ceil(rows.length / CHUNK);
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunkIndex = Math.floor(i / CHUNK) + 1;
        flash(`⏳ Importing... ${total} / ${rows.length} leads (batch ${chunkIndex}/${totalChunks})`, true);
        const chunk = rows.slice(i, i + CHUNK);
        const res = await fetch('/api/leads/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: chunk }),
        });
        if (!res.ok) {
          const text = await res.text();
          flash(`❌ Import failed: ${text.slice(0, 150)}`);
          return;
        }
        const data = await res.json();
        if (data.error) { flash(`❌ Import failed: ${data.error}`); return; }
        total += data.count;
      }

      if (total === 0) { flash('⚠️ No valid leads found. Make sure the "name" column is filled.'); return; }
      flash(`✅ ${total} lead${total !== 1 ? 's' : ''} imported from XLSX successfully! Reloading page...`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      flash(`❌ XLSX error: ${err.message}`);
    } finally {
      setCsvLoading(false);
      if (xlsxRef.current) xlsxRef.current.value = '';
    }
  };

  const downloadXLSXTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['name', 'email', 'phone', 'source', 'stage', 'budget', 'notes'],
      ['Ali Hassan', 'ali@email.com', '+923001234567', 'Website', 'New', '5000000', 'Interested in DHA'],
    ]);
    // Column widths
    ws['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 14 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, 'leads-template.xlsx');
  };

  // ── Close dropdowns on outside click ─────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.import-dropdown-wrap')) {
        ['import-dropdown','upload-dropdown'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.style.display = 'none';
        });
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Voice Recording Helpers ───────────────────────────────────
  const resetAudio = () => {
    setAudioBlobUrl(null);
    setAudioBase64(null);
    setRecordingSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const resetDealFields = () => {
    setDealSiteVisitDate(''); setDealSiteVisitTime(''); setDealSiteLocation(''); setDealSiteAgent('');
    setDealTotalPrice(''); setDealDownpayment(''); setDealMonthlyInstallment('');
    setDealTotalInstallments(''); setDealDuration('');
    setDealNextDate(''); setDealNextType('call'); setDealNextNote('');
  };

  const saveDealNote = async () => {
    if (!activityLead) return;
    const dealData = {
      siteVisit: { date: dealSiteVisitDate, time: dealSiteVisitTime, location: dealSiteLocation, agent: dealSiteAgent },
      paymentPlan: { totalPrice: dealTotalPrice, downpayment: dealDownpayment, monthlyInstallment: dealMonthlyInstallment, totalInstallments: dealTotalInstallments, duration: dealDuration },
      nextConnection: { date: dealNextDate, type: dealNextType, note: dealNextNote },
    };
    const res = await fetch(`/api/leads/${activityLead.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _action: 'log_activity', type: 'deal', note: JSON.stringify(dealData), audioUrl: '', followUpDate: dealNextDate }),
    });
    const data = await res.json();
    setLeads(leads.map((l) => l.id === activityLead.id ? { ...l, activities: data.activities } : l));
    setActivityLead((prev) => prev ? { ...prev, activities: data.activities } : null);
    resetDealFields();
    flash('🤝 Deal details saved!');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlobUrl(url);
        const reader = new FileReader();
        reader.onloadend = () => { setAudioBase64(reader.result as string); };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start(250);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      flash('❌ Mic access denied. Please allow microphone permission.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleVoiceFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { flash('❌ Audio file too large (max 5MB)'); return; }
    const url = URL.createObjectURL(file);
    setAudioBlobUrl(url);
    const reader = new FileReader();
    reader.onloadend = () => { setAudioBase64(reader.result as string); };
    reader.readAsDataURL(file);
  };

  const saveActivityNote = async () => {
    if (!activityLead) return;
    const isVoice = !!audioBase64;
    const type = isVoice ? 'voice' : activityType;
    const res = await fetch(`/api/leads/${activityLead.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _action: 'log_activity', type, note: activityNote, audioUrl: audioBase64 || '', followUpDate }),
    });
    const data = await res.json();
    setLeads(leads.map((l) => l.id === activityLead.id ? { ...l, activities: data.activities } : l));
    setActivityLead((prev) => prev ? { ...prev, activities: data.activities } : null);
    setActivityNote('');
    setFollowUpDate('');
    resetAudio();
    if (voiceUploadRef.current) voiceUploadRef.current.value = '';
    flash('✅ Activity saved!');
  };

  const exportCSV = () => {
    const rows = filtered;
    if (!rows.length) { flash('⚠️ No leads to export!'); return; }
    const headers = ['Name', 'Email', 'Phone', 'Gender', 'Source', 'Stage', 'Budget', 'Notes', 'Created'];
    const csvRows = [
      headers.join(','),
      ...rows.map((l) => [
        `"${l.name}"`, `"${l.email}"`, `"${l.phone}"`,
        `"${l.gender || ''}"`, `"${l.source}"`, `"${l.stage}"`,
        l.budget, `"${l.notes?.replace(/"/g, "'") || ''}"`,
        new Date(l.createdAt).toLocaleDateString('en-PK'),
      ].join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    flash(`✅ ${rows.length} leads exported!`);
  };

  const saveQuickFollowup = async () => {
    if (!quickFollowupLead || !quickDate) return;
    setQuickSaving(true);
    const res = await fetch('/api/leads/' + quickFollowupLead.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _action: 'log_activity', type: 'call', note: quickNote || 'Follow-up scheduled', audioUrl: '', followUpDate: quickDate }),
    });
    const data = await res.json();
    setLeads(leads.map((l) => l.id === quickFollowupLead.id ? { ...l, activities: data.activities } : l));
    setQuickSaving(false);
    setQuickFollowupLead(null);
    setQuickDate('');
    setQuickNote('');
    flash('📅 Follow-up set! ' + new Date(quickDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd);
    if (useCustomContact) {
      (body as any).customContactName = customContactName;
      (body as any).customContactPhone = customContactPhone;
      (body as any).customContactAddress = customContactAddress;
      (body as any).agent_id = '';
    }
    const url = editLead ? `/api/leads/${editLead.id}` : '/api/leads';
    const method = editLead ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (editLead) { setLeads(leads.map((l) => l.id === editLead.id ? { ...l, ...data } : l)); flash('Lead updated!'); }
    else { setLeads([{ ...data, activities: [] }, ...leads]); flash('Lead added!'); }
    close();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this lead?')) return;
    await fetch(`/api/leads/${id}`, { method: 'DELETE' });
    setLeads(leads.filter((l) => l.id !== id));
    flash('Lead deleted.');
  };

  const logCall = async (lead: Lead) => {
    const res = await fetch(`/api/leads/${lead.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _action: 'log_activity', type: 'call', note: 'Called' }) });
    const data = await res.json();
    setLeads(leads.map((l) => l.id === lead.id ? { ...l, activities: data.activities } : l));
    window.location.href = `tel:${lead.phone}`;
  };

  const logWhatsApp = async (lead: Lead) => {
    const res = await fetch(`/api/leads/${lead.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _action: 'log_activity', type: 'whatsapp', note: 'WhatsApp message sent' }) });
    const data = await res.json();
    setLeads(leads.map((l) => l.id === lead.id ? { ...l, activities: data.activities } : l));
    const phone = lead.phone.replace(/\D/g, '');
    const salutation = lead.gender === 'Female' ? 'Ma\'am' : 'Sir';
    const msg = encodeURIComponent(`Assalam o Alaikum ${lead.name} Bhai Kaisay Hain Ap?`);
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${msg}&app_absent=0`, '_blank');
  };


  const stageBadge = (s: string) => {
    const map: Record<string, string> = { New: 'badge-new', Contacted: 'badge-contacted', Viewing: 'badge-viewing', Negotiating: 'badge-negotiating', Closed: 'badge-closed' };
    return map[s] || 'badge-new';
  };

  const getLastActivity = (lead: Lead) => (lead.activities || []).slice(-1)[0] || null;

  const pageNumbers: (number | string)[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - safePage) <= 2) { pageNumbers.push(i); }
    else if (pageNumbers[pageNumbers.length - 1] !== '...') { pageNumbers.push('...'); }
  }

  const btnBase = { border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, cursor: 'pointer' as const };

  return (
    <>
      {/* ── Responsive Lead Action Buttons CSS ── */}
      <style>{`
        /* Lead card layout for mobile/tablet */
        .lead-card {
          background: white;
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px;
          margin-bottom: 12px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }
        .lead-card-top {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 10px;
        }
        .lead-card-body {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 14px;
          margin-bottom: 10px;
          font-size: 12px;
          color: var(--text3);
        }
        /* ── ACTION BUTTONS ROW ── */
        .lead-action-bar {
          display: flex !important;
          align-items: center;
          gap: 6px;
          padding-top: 10px;
          border-top: 1px solid var(--border);
          flex-wrap: wrap;
        }
        .lead-action-bar .left-btns {
          display: flex;
          gap: 6px;
          flex: 1;
          flex-wrap: wrap;
        }
        .lead-action-bar button {
          display: inline-flex !important;
          align-items: center;
          gap: 5px;
          padding: 7px 13px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          white-space: nowrap;
          justify-content: center;
        }
        .btn-call   { background: #EFF6FF; color: #2563EB; }
        .btn-call:hover { background: #DBEAFE; }
        .btn-wa     { background: #DCFCE7; color: #16A34A; }
        .btn-wa:hover { background: #BBF7D0; }
        .btn-notes  { background: #FEF9C3; color: #A16207; }
        .btn-notes:hover { background: #FEF08A; }
        .btn-edit   { background: #F3F4F6; color: #374151; }
        .btn-edit:hover { background: #E5E7EB; }
        .btn-del    { background: #FEE2E2; color: #DC2626; }
        .btn-del:hover { background: #FECACA; }

        /* All screens: show cards, hide table */
        .lead-cards-view  { display: block !important; }
        .lead-table-view  { display: none !important; }
      `}</style>

      <div className="topbar" style={{ paddingLeft: 60 }}>
        <div>
          <div className="topbar-title">Leads</div>
          <div className="topbar-sub">{leads.length} leads in pipeline</div>
        </div>
        <div className="topbar-actions">
          <input ref={csvRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSV} />
          <input ref={xlsxRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleXLSX} />
          {isAdmin && (
            <button className={`btn ${showAgentView ? 'btn-primary' : 'btn-outline'}`} onClick={() => setShowAgentView((v) => !v)}>
              <i className="fas fa-users"></i><span className="hide-xs"> Agent View</span>
            </button>
          )}
          <div style={{ position: 'relative', display: 'inline-block' }} className="import-dropdown-wrap">
            <button className="btn btn-outline" title="Download Templates"
              onClick={() => {
                const el = document.getElementById('import-dropdown');
                if (el) el.style.display = el.style.display === 'block' ? 'none' : 'block';
              }}>
              <i className="fas fa-download"></i> <span className="hide-xs"> Template</span>
            </button>
            <div id="import-dropdown" style={{ display: 'none', position: 'absolute', top: '110%', left: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 200, minWidth: 180, overflow: 'hidden' }}>
              <button onClick={() => { downloadTemplate(); const el = document.getElementById('import-dropdown'); if(el) el.style.display='none'; }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit' }}>
                <i className="fas fa-file-csv" style={{ color: '#059669', width: 16 }}></i> CSV Template
              </button>
              <button onClick={() => { downloadXLSXTemplate(); const el = document.getElementById('import-dropdown'); if(el) el.style.display='none'; }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', borderTop: '1px solid var(--border)' }}>
                <i className="fas fa-file-excel" style={{ color: '#1D6F42', width: 16 }}></i> XLSX Template
              </button>
            </div>
          </div>
          <div style={{ position: 'relative', display: 'inline-block' }} className="import-dropdown-wrap">
            <button className="btn btn-outline" disabled={csvLoading} style={{ color: 'var(--green)', borderColor: '#A7F3D0' }}
              onClick={() => {
                const el = document.getElementById('upload-dropdown');
                if (el) el.style.display = el.style.display === 'block' ? 'none' : 'block';
              }}>
              {csvLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-upload"></i>}
              <span className="hide-xs">{csvLoading ? ' Importing...' : ' Import'}</span>
              <i className="fas fa-chevron-down" style={{ fontSize: 10, marginLeft: 4 }}></i>
            </button>
            <div id="upload-dropdown" style={{ display: 'none', position: 'absolute', top: '110%', left: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 200, minWidth: 180, overflow: 'hidden' }}>
              <button onClick={() => { csvRef.current?.click(); const el = document.getElementById('upload-dropdown'); if(el) el.style.display='none'; }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit' }}>
                <i className="fas fa-file-csv" style={{ color: '#059669', width: 16 }}></i> Upload CSV
              </button>
              <button onClick={() => { xlsxRef.current?.click(); const el = document.getElementById('upload-dropdown'); if(el) el.style.display='none'; }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', borderTop: '1px solid var(--border)' }}>
                <i className="fas fa-file-excel" style={{ color: '#1D6F42', width: 16 }}></i> Upload XLSX
              </button>
            </div>
          </div>
          <button className="btn btn-outline" onClick={exportCSV} title="Export leads to CSV">
            <i className="fas fa-file-export"></i> <span className="hide-xs">Export CSV</span>
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <i className="fas fa-plus"></i> <span className="hide-xs">Add Lead</span>
          </button>
        </div>
      </div>

      <div className="page-content">
        {msg && <div style={{ background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid #A7F3D0', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>{msg}</div>}

        {/* Agent Overview Panel */}
        {isAdmin && showAgentView && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-chart-bar" style={{ color: 'var(--accent)' }}></i> Agent Lead Distribution
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {agentStats.map((a) => (
                <div key={a.id} onClick={() => handleAgentFilter(agentFilter === String(a.id) ? '' : String(a.id))}
                  style={{ background: agentFilter === String(a.id) ? 'var(--blue-bg)' : 'white', border: `1.5px solid ${agentFilter === String(a.id) ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: agentColor(a.id), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                      {agentInitials(a.name)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{a.total} leads total</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {STAGES.map((s) => a.byStage[s] > 0 && (
                      <span key={s} className={`badge ${stageBadge(s)}`} style={{ fontSize: 10 }}>{s}: {a.byStage[s]}</span>
                    ))}
                    {a.total === 0 && <span style={{ fontSize: 11, color: 'var(--text4)' }}>No leads assigned</span>}
                  </div>
                </div>
              ))}
              {unassigned.length > 0 && (
                <div onClick={() => handleAgentFilter(agentFilter === 'unassigned' ? '' : 'unassigned')}
                  style={{ background: agentFilter === 'unassigned' ? '#FEF3C7' : 'white', border: `1.5px solid ${agentFilter === 'unassigned' ? '#F59E0B' : 'var(--border)'}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F59E0B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                      <i className="fas fa-user-slash"></i>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>Unassigned</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{unassigned.length} leads</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#B45309' }}>Click to filter unassigned leads</div>
                </div>
              )}
            </div>
            {agentFilter && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                  Filtered: <strong>{agentFilter === 'unassigned' ? 'Unassigned' : agentMap[parseInt(agentFilter)]}</strong> — {filtered.length} leads
                </span>
                <button onClick={() => handleAgentFilter('')} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Clear</button>
              </div>
            )}
          </div>
        )}

        {/* Bulk Action Bar */}
        {someSelected && (
          <div style={{ background: 'var(--accent)', color: 'white', borderRadius: 12, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(59,130,246,0.25)' }}>
            <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>
              <i className="fas fa-check-square" style={{ marginRight: 7 }}></i>{selectedIds.size} lead{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            {isAdmin && (
              <button onClick={() => { setBulkAssignAgentId(''); setShowBulkAssignModal(true); }} disabled={bulkLoading}
                style={{ background: 'white', color: 'var(--accent)', border: 'none', borderRadius: 8, padding: '7px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="fas fa-user-check"></i> Assign Agent
              </button>
            )}
            {isAdmin && (
              <button onClick={handleBulkUnassign} disabled={bulkLoading}
                style={{ background: '#F59E0B', color: 'white', border: 'none', borderRadius: 8, padding: '7px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {bulkLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-user-minus"></i>} Unassign
              </button>
            )}
            <button onClick={handleBulkDelete} disabled={bulkLoading}
              style={{ background: '#EF4444', color: 'white', border: 'none', borderRadius: 8, padding: '7px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {bulkLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash"></i>} Delete
            </button>
            <button onClick={clearSelection}
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: 8, padding: '7px 14px', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        )}

        <div className="card">
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <div className="search-box" style={{ flex: 1, minWidth: 160 }}>
              <i className="fas fa-search"></i>
              <input placeholder="Search leads..." value={search} onChange={(e) => handleSearch(e.target.value)}
                style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, width: '100%' }} />
            </div>
            <select className="filter-select" value={stageFilter} onChange={(e) => handleStageFilter(e.target.value)}>
              <option value="">All Stages</option>
              {STAGES.map((s) => <option key={s}>{s}</option>)}
            </select>
            {isAdmin && (
              <select className="filter-select" value={agentFilter} onChange={(e) => handleAgentFilter(e.target.value)}>
                <option value="">All Agents</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                <option value="unassigned">Unassigned</option>
              </select>
            )}
            {/* Page size selector */}
            <select className="filter-select" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); resetPage(); }}>
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>Show {n}</option>)}
            </select>
          </div>

          {/* Overseas / Local PK + Gender toggles */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {([['', '🌐 All'], ['local', '🇵🇰 Local PK'], ['overseas', '✈️ Overseas']] as const).map(([val, label]) => (
              <button key={val} onClick={() => { setLeadType(val); resetPage(); }}
                style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${leadType === val ? 'var(--accent)' : 'var(--border)'}`, background: leadType === val ? 'var(--accent)' : 'white', color: leadType === val ? 'white' : 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
            <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
            {([['', '👥 All Gender'], ['Male', '👨 Male'], ['Female', '👩 Female']] as const).map(([val, label]) => (
              <button key={val} onClick={() => { setGenderFilter(val); resetPage(); }}
                style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${genderFilter === val ? (val === 'Female' ? '#EC4899' : val === 'Male' ? '#3B82F6' : 'var(--accent)') : 'var(--border)'}`, background: genderFilter === val ? (val === 'Female' ? '#EC4899' : val === 'Male' ? '#3B82F6' : 'var(--accent)') : 'white', color: genderFilter === val ? 'white' : 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
            {(leadType || genderFilter) && (
              <span style={{ fontSize: 12, color: 'var(--text3)', alignSelf: 'center', marginLeft: 4 }}>
                {filtered.length} leads
              </span>
            )}
          </div>

          {/* Call Status Filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: 4 }}>Calls:</span>
            {([['', '📋 All'], ['called', '✅ Called'], ['notcalled', '📵 Not Called']] as const).map(([val, label]) => (
              <button key={val} onClick={() => { setCallFilter(val); resetPage(); }}
                style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${callFilter === val ? (val === 'called' ? '#059669' : val === 'notcalled' ? '#EF4444' : 'var(--accent)') : 'var(--border)'}`, background: callFilter === val ? (val === 'called' ? '#059669' : val === 'notcalled' ? '#EF4444' : 'var(--accent)') : 'white', color: callFilter === val ? 'white' : 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
            {callFilter && (
              <span style={{ fontSize: 12, color: 'var(--text3)', alignSelf: 'center', marginLeft: 4 }}>
                {filtered.length} leads
              </span>
            )}
          </div>

          {/* ═══════════════════════════════════════════
              MOBILE + TABLET VIEW — CARDS with bottom buttons
          ═══════════════════════════════════════════ */}
          <div className="lead-cards-view" style={{ display: 'none' }}>
            {/* Select All bar for cards */}
            {paginated.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg2)', borderRadius: 10, marginBottom: 10, border: '1px solid var(--border)' }}>
                <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAll} style={{ cursor: 'pointer', width: 16, height: 16 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>
                  {allPageSelected ? 'Deselect All' : 'Select All'} ({paginated.length} leads)
                </span>
                {someSelected && (
                  <span style={{ fontSize: 12, color: 'var(--accent)', marginLeft: 4 }}>
                    — {selectedIds.size} selected
                  </span>
                )}
              </div>
            )}
            {paginated.map((l) => {
              const lastAct = getLastActivity(l);
              const actCount = (l.activities || []).length;
              const isSelected = selectedIds.has(l.id);
              const agent = agents.find((a) => a.id === l.agentId);
              return (
                <div key={l.id} className="lead-card" style={{ background: isSelected ? 'var(--blue-bg)' : 'white' }}>
                  {/* Top: checkbox + name + stage + DELETE button */}
                  <div className="lead-card-top">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(l.id)}
                      style={{ cursor: 'pointer', width: 16, height: 16, marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{l.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(l.createdAt).toLocaleDateString()}</div>
                    </div>
                    <span className={`badge ${stageBadge(l.stage)}`}>{l.stage}</span>
                    <button className="btn-del" onClick={() => handleDelete(l.id)} title="Delete Lead"
                      style={{ marginLeft: 8, padding: '5px 10px', fontSize: 11 }}>
                      <i className="fas fa-trash"></i> Delete
                    </button>
                    <button onClick={() => { setQuickFollowupLead(l); setQuickDate(''); setQuickNote(''); }} title="Set Follow-up"
                      style={{ marginLeft: 4, padding: '5px 10px', fontSize: 11, background: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA', borderRadius: 8, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <i className="fas fa-bell"></i> Follow-up
                    </button>
                  </div>

                  {/* Body: contact + budget + source + agent */}
                  <div className="lead-card-body">
                    {l.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <i className="fas fa-phone" style={{ fontSize: 10, color: '#2563EB' }}></i>
                        <span>{l.phone}</span>
                      </div>
                    )}
                    {l.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <i className="fas fa-envelope" style={{ fontSize: 10 }}></i>
                        <span>{l.email}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <i className="fas fa-wallet" style={{ fontSize: 10, color: 'var(--accent)' }}></i>
                      <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatPKR(l.budget)}</span>
                    </div>
                    <span className="badge badge-new">{l.source}</span>
                    {l.gender && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: l.gender === 'Female' ? '#FDF2F8' : '#EFF6FF', color: l.gender === 'Female' ? '#BE185D' : '#1D4ED8', fontWeight: 600, border: `1px solid ${l.gender === 'Female' ? '#FBCFE8' : '#BFDBFE'}`}}>{l.gender === 'Female' ? '👩 Female' : '👨 Male'}</span>}
                    {isAdmin && agent && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 5, background: agentColor(agent.id), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 9 }}>
                          {agentInitials(agent.name)}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{agent.name}</span>
                        {isAdmin && (
                          <button onClick={() => handleUnassignLead(l.id)} title="Remove assignment"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', fontSize: 11, padding: '1px 3px' }}>
                            <i className="fas fa-times-circle"></i>
                          </button>
                        )}
                      </div>
                    )}
                    {isAdmin && !agent && (
                      <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>
                        <i className="fas fa-exclamation-circle" style={{ marginRight: 3 }}></i>Unassigned
                      </span>
                    )}
                    {actCount > 0 && (
                      <div onClick={() => setActivityLead(l)} style={{ cursor: 'pointer' }}>
                        {lastAct?.type === 'call'
                          ? <span className="badge badge-contacted"><i className="fas fa-phone-alt" style={{ fontSize: 9 }}></i> Called ({actCount})</span>
                          : <span className="badge badge-available"><i className="fab fa-whatsapp" style={{ fontSize: 10 }}></i> WA ({actCount})</span>}
                      </div>
                    )}
                  </div>

                  {/* ── BOTTOM ACTION BUTTONS ── */}
                  <div className="lead-action-bar">
                    <div className="left-btns">
                      {l.phone && (
                        <button className="btn-call" onClick={() => logCall(l)} title={`Call ${l.phone}`}>
                          <i className="fas fa-phone"></i> Call
                        </button>
                      )}
                      {l.phone && (
                        <button className="btn-wa" onClick={() => logWhatsApp(l)} title={`WhatsApp ${l.phone}`}>
                          <i className="fab fa-whatsapp"></i> WhatsApp
                        </button>
                      )}
                      <button onClick={() => { setQuickFollowupLead(l); setQuickDate(''); setQuickNote(''); }} title="Set Follow-up"
                        style={{ background: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <i className="fas fa-bell"></i> Follow-up
                      </button>
                      <button className="btn-notes" onClick={() => { setActivityLead(l); setActivityNote(''); setActivityType('call'); }} title="Add Note">
                        <i className="fas fa-sticky-note"></i> Notes
                      </button>
                      <button className="btn-edit" onClick={() => openEdit(l)} title="Edit Lead">
                        <i className="fas fa-edit"></i> Edit
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="empty-state">
                <i className="fas fa-user-tie" style={{ fontSize: 44, opacity: 0.3 }}></i>
                <h3>No leads found</h3>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════
              DESKTOP VIEW — Table with labelled buttons
          ═══════════════════════════════════════════ */}
          <div className="lead-table-view">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: 'center' }}>
                      <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAll} style={{ cursor: 'pointer', width: 15, height: 15 }} />
                    </th>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Source</th>
                    <th>Budget (PKR)</th>
                    <th>Stage</th>
                    {isAdmin && <th>Agent</th>}
                    <th>Activity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((l) => {
                    const lastAct = getLastActivity(l);
                    const actCount = (l.activities || []).length;
                    const isSelected = selectedIds.has(l.id);
                    const agent = agents.find((a) => a.id === l.agentId);
                    return (
                      <tr key={l.id} style={{ background: isSelected ? 'var(--blue-bg)' : undefined }}>
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(l.id)} style={{ cursor: 'pointer', width: 15, height: 15 }} />
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{l.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(l.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: 12 }}>{l.email}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{l.phone}</div>n                          {l.phone && (() => { const c = getCountryFromPhone(l.phone); return c ? (<span style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'2px 6px', borderRadius:6, fontSize:10, fontWeight:600, marginTop:3, background:c.bgColor, color:c.textColor, border:`1px solid ${c.borderColor}` }}>{c.flag} {c.name}</span>) : null; })()}
                        </td>
                        <td><span className="badge badge-new">{l.source}</span></td>
                        <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatPKR(l.budget)}</td>
                        <td><span className={`badge ${stageBadge(l.stage)}`}>{l.stage}</span></td>
                        {isAdmin && (
                          <td>
                            {agent ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <div style={{ width: 26, height: 26, borderRadius: 7, background: agentColor(agent.id), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10, flexShrink: 0 }}>
                                  {agentInitials(agent.name)}
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600 }}>{agent.name}</span>
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>
                                <i className="fas fa-exclamation-circle" style={{ marginRight: 4 }}></i>Unassigned
                              </span>
                            )}
                            {isAdmin && agent && (
                              <button onClick={() => handleUnassignLead(l.id)} title="Remove assignment"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', fontSize: 11, padding: '2px 4px', borderRadius: 4, marginLeft: 2 }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text4)')}>
                                <i className="fas fa-times-circle"></i>
                              </button>
                            )}
                          </td>
                        )}
                        <td>
                          {actCount > 0 ? (
                            <div onClick={() => setActivityLead(l)} style={{ cursor: 'pointer' }}>
                              {lastAct?.type === 'call'
                                ? <span className="badge badge-contacted"><i className="fas fa-phone-alt" style={{ fontSize: 9 }}></i> Called ({actCount})</span>
                                : <span className="badge badge-available"><i className="fab fa-whatsapp" style={{ fontSize: 10 }}></i> WA ({actCount})</span>}
                            </div>
                          ) : <span style={{ fontSize: 11, color: 'var(--text4)' }}>—</span>}
                        </td>
                        {/* Desktop action buttons — labelled */}
                        <td>
                          <div className="table-action-bar">
                            {l.phone && (
                              <button className="btn-call" onClick={() => logCall(l)} title={`Call ${l.phone}`}>
                                <i className="fas fa-phone"></i> Call
                              </button>
                            )}
                            {l.phone && (
                              <button className="btn-wa" onClick={() => logWhatsApp(l)} title={`WhatsApp ${l.phone}`}>
                                <i className="fab fa-whatsapp"></i> WA
                              </button>
                            )}
                            <button className="btn-notes" onClick={() => { setActivityLead(l); setActivityNote(''); setActivityType('call'); }} title="Add Note">
                              <i className="fas fa-sticky-note"></i> Notes
                            </button>
                            <button className="btn-edit" onClick={() => openEdit(l)}>
                              <i className="fas fa-edit"></i> Edit
                            </button>
                            <button className="btn-del" onClick={() => handleDelete(l.id)}>
                              <i className="fas fa-trash"></i> Del
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="empty-state">
                  <i className="fas fa-user-tie" style={{ fontSize: 44, opacity: 0.3 }}></i>
                  <h3>No leads found</h3>
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, marginTop: 8, borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length} leads
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => { setPage(1); clearSelection(); }} disabled={safePage === 1}
                  style={{ ...btnBase, padding: '6px 10px', background: safePage === 1 ? 'var(--bg2)' : 'white', color: safePage === 1 ? 'var(--text4)' : 'var(--text1)', cursor: safePage === 1 ? 'default' : 'pointer' }}>
                  <i className="fas fa-angle-double-left"></i>
                </button>
                <button onClick={() => { setPage((p) => Math.max(1, p - 1)); clearSelection(); }} disabled={safePage === 1}
                  style={{ ...btnBase, padding: '6px 12px', fontWeight: 600, background: safePage === 1 ? 'var(--bg2)' : 'white', color: safePage === 1 ? 'var(--text4)' : 'var(--text1)', cursor: safePage === 1 ? 'default' : 'pointer' }}>
                  <i className="fas fa-angle-left"></i> Prev
                </button>
                {pageNumbers.map((p, i) =>
                  p === '...' ? (
                    <span key={'e' + i} style={{ padding: '6px 4px', fontSize: 12, color: 'var(--text4)' }}>…</span>
                  ) : (
                    <button key={p} onClick={() => { setPage(p as number); clearSelection(); }}
                      style={{ ...btnBase, padding: '6px 11px', borderColor: safePage === p ? 'var(--accent)' : 'var(--border)', background: safePage === p ? 'var(--accent)' : 'white', color: safePage === p ? 'white' : 'var(--text1)', fontWeight: safePage === p ? 700 : 400 }}>
                      {p}
                    </button>
                  )
                )}
                <button onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); clearSelection(); }} disabled={safePage === totalPages}
                  style={{ ...btnBase, padding: '6px 12px', fontWeight: 600, background: safePage === totalPages ? 'var(--bg2)' : 'white', color: safePage === totalPages ? 'var(--text4)' : 'var(--text1)', cursor: safePage === totalPages ? 'default' : 'pointer' }}>
                  Next <i className="fas fa-angle-right"></i>
                </button>
                <button onClick={() => { setPage(totalPages); clearSelection(); }} disabled={safePage === totalPages}
                  style={{ ...btnBase, padding: '6px 10px', background: safePage === totalPages ? 'var(--bg2)' : 'white', color: safePage === totalPages ? 'var(--text4)' : 'var(--text1)', cursor: safePage === totalPages ? 'default' : 'pointer' }}>
                  <i className="fas fa-angle-double-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="mobile-bottom-bar">
        <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', color: 'var(--green)', borderColor: '#A7F3D0' }} onClick={() => csvRef.current?.click()}>
          <i className="fas fa-file-csv"></i> CSV
        </button>
        <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={openAdd}>
          <i className="fas fa-plus"></i> Add Lead
        </button>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editLead ? 'Edit Lead' : 'Add Lead'}</div>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Full Name</label><input className="form-input" name="name" defaultValue={editLead?.name} required /></div>
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" name="email" type="email" defaultValue={editLead?.email} /></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" name="phone" defaultValue={editLead?.phone} /></div>
                <div className="form-group"><label className="form-label">Gender</label><select className="form-input" name="gender" defaultValue={editLead?.gender || ''}><option value="">-- Select --</option><option value="Male">👨 Male</option><option value="Female">👩 Female</option></select></div>
                <div className="form-group"><label className="form-label">Source</label><select className="form-input" name="source" defaultValue={editLead?.source}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Stage</label><select className="form-input" name="stage" defaultValue={editLead?.stage}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Budget (PKR)</label><input className="form-input" name="budget" type="number" defaultValue={editLead?.budget} /></div>
                <div className="form-group"><label className="form-label">Property Interest</label><select className="form-input" name="property_id" defaultValue={editLead?.propertyId || ''}><option value="">None</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
                {isAdmin && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Assign Agent</label>
                    <select className="form-input" name="agent_id" value={useCustomContact ? 'custom' : (editLead?.agentId ?? '')}
                      onChange={(e) => { if (e.target.value === 'custom') { setUseCustomContact(true); } else { setUseCustomContact(false); } }}>
                      <option value="">— Unassigned —</option>
                      {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      <option value="custom">➕ Custom Person (باہر کا آدمی)</option>
                    </select>
                  </div>
                )}
                {useCustomContact && (
                  <div style={{ gridColumn: '1 / -1', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#EA580C', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <i className="fas fa-user-plus" style={{ marginRight: 5 }}></i>Custom Contact (Registered Agent Nahi)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div className="form-group"><label className="form-label">Name</label><input className="form-input" placeholder="Custom person ka naam" value={customContactName} onChange={(e) => setCustomContactName(e.target.value)} /></div>
                      <div className="form-group"><label className="form-label">Phone</label><input className="form-input" placeholder="+92..." value={customContactPhone} onChange={(e) => setCustomContactPhone(e.target.value)} /></div>
                      <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Address</label><input className="form-input" placeholder="Address ya area" value={customContactAddress} onChange={(e) => setCustomContactAddress(e.target.value)} /></div>
                    </div>
                  </div>
                )}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Notes</label><textarea className="form-input" name="notes" rows={3} defaultValue={editLead?.notes} style={{ resize: 'vertical' }} /></div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={close}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editLead ? 'Update' : 'Add'} Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {activityLead && (
        <div className="modal-backdrop" onClick={() => { setActivityLead(null); resetAudio(); resetDealFields(); }}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title"><i className="fas fa-history" style={{ marginRight: 8, color: 'var(--accent)' }}></i>{activityLead.name} — Activity</div>
              <button className="modal-close" onClick={() => { setActivityLead(null); resetAudio(); resetDealFields(); }}>×</button>
            </div>

            {/* Activity History */}
            <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 14 }}>
              {(activityLead.activities || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text4)', fontSize: 13 }}>No activity yet</div>
              ) : [...(activityLead.activities || [])].reverse().map((a) => {
                let dealParsed: any = null;
                if (a.type === 'deal') { try { dealParsed = JSON.parse(a.note); } catch {} }
                return (
                  <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: a.type === 'deal' ? '#F0FDF4' : a.type === 'voice' ? '#FEF3C7' : a.type === 'call' ? 'var(--blue-bg)' : '#DCFCE7',
                      color: a.type === 'deal' ? '#15803D' : a.type === 'voice' ? '#B45309' : a.type === 'call' ? 'var(--accent)' : '#16A34A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                      <i className={a.type === 'deal' ? 'fas fa-handshake' : a.type === 'voice' ? 'fas fa-microphone' : a.type === 'call' ? 'fas fa-phone-alt' : 'fab fa-whatsapp'}></i>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {a.type === 'deal' ? '🤝 Deal Details' : a.type === 'voice' ? '🎙️ Voice Note' : a.type === 'call' ? '📞 Call Made' : '💬 WhatsApp Sent'}
                      </div>
                      {a.type === 'deal' && dealParsed ? (
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, lineHeight: 1.6 }}>
                          {dealParsed.siteVisit?.date && <div>📍 Site Visit: {dealParsed.siteVisit.date} {dealParsed.siteVisit.time} — {dealParsed.siteVisit.location}</div>}
                          {dealParsed.paymentPlan?.totalPrice && <div>💰 Price: ₨{Number(dealParsed.paymentPlan.totalPrice).toLocaleString()} | Down: ₨{Number(dealParsed.paymentPlan.downpayment).toLocaleString()}</div>}
                          {dealParsed.nextConnection?.date && <div>📅 Next: {dealParsed.nextConnection.date} via {dealParsed.nextConnection.type}</div>}
                        </div>
                      ) : (
                        a.note && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{a.note}</div>
                      )}
                      {a.audioUrl && <audio controls src={a.audioUrl} style={{ marginTop: 6, width: '100%', height: 32, borderRadius: 6 }} />}
                      <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 4 }}>{new Date(a.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tab Switcher */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 14, borderBottom: '2px solid var(--border)' }}>
              <button
                style={{ flex: 1, padding: '9px', background: 'none', border: 'none', borderBottom: `2.5px solid var(--accent)`, color: 'var(--accent)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: -2 }}>
                <i className="fas fa-phone-alt"></i> Activity
              </button>
            </div>

            {/* ACTIVITY TAB */}
            {activityTab === 'activity' && (
              <div>
                {!audioBlobUrl && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    {(['call', 'whatsapp'] as const).map((t) => (
                      <button key={t} onClick={() => setActivityType(t)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${activityType === t ? (t === 'call' ? 'var(--accent)' : '#16A34A') : 'var(--border)'}`, background: activityType === t ? (t === 'call' ? 'var(--blue-bg)' : '#DCFCE7') : 'white', color: activityType === t ? (t === 'call' ? 'var(--accent)' : '#16A34A') : 'var(--text3)', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <i className={t === 'call' ? 'fas fa-phone-alt' : 'fab fa-whatsapp'}></i> {t === 'call' ? 'Call' : 'WhatsApp'}
                      </button>
                    ))}
                  </div>
                )}
                <textarea className="form-input" placeholder="Add a note (optional)..." value={activityNote} onChange={(e) => setActivityNote(e.target.value)} rows={2} style={{ resize: 'none', marginBottom: 10 }} />
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>📅 Follow-up Date (optional)</label>
                  <input type="date" className="form-input" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                </div>
                <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '12px 14px', marginBottom: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>🎙️ Voice Note</div>
                  {!audioBlobUrl && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {!isRecording ? (
                        <button onClick={startRecording} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          <i className="fas fa-circle"></i> Record
                        </button>
                      ) : (
                        <button onClick={stopRecording} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: '#374151', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          <i className="fas fa-stop"></i> Stop ({recordingSeconds}s)
                        </button>
                      )}
                      <span style={{ color: 'var(--text4)', fontSize: 11 }}>or</span>
                      <button onClick={() => voiceUploadRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'white', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        <i className="fas fa-upload"></i> Upload Audio
                      </button>
                      <input ref={voiceUploadRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleVoiceFileUpload} />
                      {isRecording && <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>● Recording...</span>}
                    </div>
                  )}
                  {audioBlobUrl && (
                    <div>
                      <audio controls src={audioBlobUrl} style={{ width: '100%', height: 36, borderRadius: 6, marginBottom: 8 }} />
                      <button onClick={resetAudio} style={{ fontSize: 11, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>✕ Remove & re-record</button>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline" onClick={() => { setActivityLead(null); resetAudio(); }}>Close</button>
                  <button className="btn btn-primary" onClick={saveActivityNote} disabled={isRecording}><i className="fas fa-save"></i> Save</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <div className="modal-backdrop" onClick={() => setShowBulkAssignModal(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title"><i className="fas fa-user-check" style={{ marginRight: 8, color: 'var(--accent)' }}></i>Assign {selectedIds.size} Lead{selectedIds.size > 1 ? 's' : ''}</div>
              <button className="modal-close" onClick={() => setShowBulkAssignModal(false)}>×</button>
            </div>
            <div style={{ padding: '4px 0 20px' }}>
              <div className="form-group">
                <label className="form-label">Select Agent</label>
                <select className="form-input" value={bulkAssignAgentId} onChange={(e) => setBulkAssignAgentId(e.target.value)}>
                  <option value="">— Choose an agent —</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>All {selectedIds.size} selected lead{selectedIds.size > 1 ? 's' : ''} will be reassigned.</div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowBulkAssignModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleBulkAssign} disabled={!bulkAssignAgentId || bulkLoading}>
                {bulkLoading ? <><i className="fas fa-spinner fa-spin"></i> Assigning...</> : <><i className="fas fa-user-check"></i> Assign</>}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Quick Follow-up Modal */}
      {quickFollowupLead && (
        <div className="modal-backdrop" onClick={() => setQuickFollowupLead(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title"><i className="fas fa-bell" style={{ marginRight: 8, color: '#EA580C' }}></i>Quick Follow-up — {quickFollowupLead.name}</div>
              <button className="modal-close" onClick={() => setQuickFollowupLead(null)}>×</button>
            </div>
            <div style={{ padding: '4px 0' }}>
              <div className="form-group">
                <label className="form-label">Follow-up Date</label>
                <input type="date" className="form-input" value={quickDate} onChange={(e) => setQuickDate(e.target.value)} min={new Date().toISOString().split('T')[0]} autoFocus />
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {['Tomorrow', '+3 Days', 'Next Week'].map((label, i) => {
                  const d = new Date(); d.setDate(d.getDate() + [1,3,7][i]);
                  return (
                    <button key={label} onClick={() => setQuickDate(d.toISOString().split('T')[0])}
                      style={{ flex: 1, padding: '6px', borderRadius: 8, border: '1px solid var(--border)', background: quickDate === d.toISOString().split('T')[0] ? '#EA580C' : 'white', color: quickDate === d.toISOString().split('T')[0] ? 'white' : 'var(--text2)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="form-group">
                <label className="form-label">Note (optional)</label>
                <textarea className="form-input" placeholder="Kya discuss karna hai..." value={quickNote} onChange={(e) => setQuickNote(e.target.value)} rows={2} style={{ resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button className="btn btn-outline" onClick={() => setQuickFollowupLead(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveQuickFollowup} disabled={!quickDate || quickSaving}
                  style={{ background: '#EA580C', borderColor: '#EA580C' }}>
                  {quickSaving ? 'Saving...' : <><i className="fas fa-bell"></i> Set Follow-up</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
