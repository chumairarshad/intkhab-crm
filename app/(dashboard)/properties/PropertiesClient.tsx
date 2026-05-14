'use client';
import { useState } from 'react';

interface Property {
  id: number; title: string; address: string; price: number;
  propertyType: string; bedrooms: number; bathrooms: number;
  area: number; status: string; description: string;
  agentId: number; agentIds: number[]; createdAt: string;
}
interface Agent { id: number; name: string; }

function formatPKR(n: number) {
  if (n >= 10000000) return `₨${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₨${(n / 100000).toFixed(1)}L`;
  return `₨${n.toLocaleString()}`;
}

const AGENT_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4'];
function agentColor(id: number) { return AGENT_COLORS[id % AGENT_COLORS.length]; }
function agentInitials(name: string) { return name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase(); }

export default function PropertiesClient({ properties: initial, agents, isAdmin, currentUserId }: {
  properties: Property[]; agents: Agent[]; isAdmin: boolean; currentUserId: number;
}) {
  const [properties, setProperties] = useState(initial.map(p => ({ ...p, agentIds: p.agentIds || [p.agentId] })));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProp, setEditProp] = useState<Property | null>(null);
  const [msg, setMsg] = useState('');
  const [selectedAgentIds, setSelectedAgentIds] = useState<number[]>([]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const filtered = properties.filter((p) => {
    const q = search.toLowerCase();
    const ms = !q || p.title.toLowerCase().includes(q) || p.address.toLowerCase().includes(q);
    const mst = !statusFilter || p.status === statusFilter;
    const mt = !typeFilter || p.propertyType === typeFilter;
    const ma = !agentFilter || (p.agentIds || [p.agentId]).includes(parseInt(agentFilter));
    return ms && mst && mt && ma;
  });

  const openAdd = () => {
    setEditProp(null);
    setSelectedAgentIds(isAdmin ? [] : [currentUserId]);
    setShowModal(true);
  };

  const openEdit = (p: Property) => {
    setEditProp(p);
    setSelectedAgentIds(p.agentIds || [p.agentId]);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditProp(null); setSelectedAgentIds([]); };

  const toggleAgent = (id: number) => {
    setSelectedAgentIds(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body: any = Object.fromEntries(fd);
    body.agent_ids = JSON.stringify(selectedAgentIds.length ? selectedAgentIds : [parseInt(body.agent_id) || currentUserId]);
    const url = editProp ? `/api/properties/${editProp.id}` : '/api/properties';
    const method = editProp ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    const updated = { ...data, agentIds: data.agentIds || selectedAgentIds };
    if (editProp) {
      setProperties(properties.map(p => p.id === editProp.id ? { ...p, ...updated } : p));
      flash('Property updated!');
    } else {
      setProperties([updated, ...properties]);
      flash('Property added!');
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this property?')) return;
    await fetch(`/api/properties/${id}`, { method: 'DELETE' });
    setProperties(properties.filter(p => p.id !== id));
    flash('Property deleted.');
  };

  const types = [...new Set(properties.map(p => p.propertyType))];

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Properties</div>
          <div className="topbar-sub">Manage your real estate portfolio</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={openAdd}>
            <i className="fas fa-plus"></i> Add Property
          </button>
        </div>
      </div>

      <div className="page-content">
        {msg && <div className="card" style={{ background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid #A7F3D0', padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>{msg}</div>}

        <div className="card">
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
              <i className="fas fa-search"></i>
              <input placeholder="Search properties..." value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, width: '100%' }} />
            </div>
            <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option>Available</option><option>Under Offer</option><option>Sold</option>
            </select>
            <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {types.map(t => <option key={t}>{t}</option>)}
            </select>
            {isAdmin && (
              <select className="filter-select" value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
                <option value="">All Agents</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Price (PKR)</th>
                  <th>Beds/Baths</th>
                  <th>Area (sqft)</th>
                  <th>Status</th>
                  {isAdmin && <th>Agents</th>}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const propAgents = (p.agentIds || [p.agentId]).map(id => agents.find(a => a.id === id)).filter(Boolean) as Agent[];
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{p.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}><i className="fas fa-map-marker-alt" style={{ marginRight: 4 }}></i>{p.address}</div>
                      </td>
                      <td><span className="badge badge-new">{p.propertyType}</span></td>
                      <td style={{ fontWeight: 800, color: 'var(--accent)' }}>{formatPKR(p.price)}</td>
                      <td style={{ fontSize: 13 }}>{p.bedrooms}🛏 / {p.bathrooms}🚿</td>
                      <td>{p.area.toLocaleString()}</td>
                      <td>
                        <span className={`badge badge-${p.status === 'Available' ? 'available' : p.status === 'Sold' ? 'sold' : 'offer'}`}>
                          {p.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                            {propAgents.length > 0 ? propAgents.map(a => (
                              <div key={a.id} title={a.name} style={{ width: 28, height: 28, borderRadius: 8, background: agentColor(a.id), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10, flexShrink: 0, border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
                                {agentInitials(a.name)}
                              </div>
                            )) : (
                              <span style={{ fontSize: 11, color: 'var(--text4)' }}>—</span>
                            )}
                            {propAgents.length > 0 && (
                              <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 2 }}>
                                {propAgents.length} agent{propAgents.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>
                            <i className="fas fa-edit"></i>
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>
                            <i className="fas fa-trash"></i>
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
                <i className="fas fa-building" style={{ fontSize: 44, opacity: 0.3 }}></i>
                <h3>No properties found</h3>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Action Bar */}
      <div className="mobile-bottom-bar">
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={openAdd}>
          <i className="fas fa-plus"></i> Add Property
        </button>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editProp ? 'Edit Property' : 'Add Property'}</div>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" name="title" defaultValue={editProp?.title} required />
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-input" name="address" defaultValue={editProp?.address} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Price (PKR)</label>
                  <input className="form-input" name="price" type="number" defaultValue={editProp?.price} placeholder="e.g. 50000000" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-input" name="property_type" defaultValue={editProp?.propertyType}>
                    <option>House</option><option>Apartment</option><option>Villa</option>
                    <option>Penthouse</option><option>Condo</option><option>Plot</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Bedrooms</label>
                  <input className="form-input" name="bedrooms" type="number" defaultValue={editProp?.bedrooms} />
                </div>
                <div className="form-group">
                  <label className="form-label">Bathrooms</label>
                  <input className="form-input" name="bathrooms" type="number" defaultValue={editProp?.bathrooms} />
                </div>
                <div className="form-group">
                  <label className="form-label">Area (sqft)</label>
                  <input className="form-input" name="area" type="number" defaultValue={editProp?.area} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" name="status" defaultValue={editProp?.status}>
                    <option>Available</option><option>Under Offer</option><option>Sold</option>
                  </select>
                </div>
              </div>

              {isAdmin && (
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-users" style={{ color: 'var(--accent)' }}></i>
                    Assign Agents
                    <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>— select one or more</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '10px 12px', background: 'var(--bg2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                    {agents.map(a => {
                      const selected = selectedAgentIds.includes(a.id);
                      return (
                        <button key={a.id} type="button" onClick={() => toggleAgent(a.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
                            borderRadius: 8, border: `1.5px solid ${selected ? agentColor(a.id) : 'var(--border)'}`,
                            background: selected ? `${agentColor(a.id)}18` : 'white',
                            cursor: 'pointer', fontSize: 12, fontWeight: selected ? 700 : 400,
                            color: selected ? agentColor(a.id) : 'var(--text2)',
                            transition: 'all 0.15s',
                          }}>
                          <div style={{ width: 22, height: 22, borderRadius: 6, background: selected ? agentColor(a.id) : '#E2E8F0', color: selected ? 'white' : '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 9 }}>
                            {agentInitials(a.name)}
                          </div>
                          {a.name}
                          {selected && <i className="fas fa-check" style={{ fontSize: 10 }}></i>}
                        </button>
                      );
                    })}
                  </div>
                  {selectedAgentIds.length === 0 && (
                    <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 6 }}>
                      <i className="fas fa-exclamation-triangle" style={{ marginRight: 4 }}></i>
                      Please select at least one agent
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" name="description" rows={3} defaultValue={editProp?.description} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isAdmin && selectedAgentIds.length === 0}>
                  {editProp ? 'Update' : 'Add'} Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
