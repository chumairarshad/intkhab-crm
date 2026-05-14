'use client';
import { useState } from 'react';

interface User {
  id: number; name: string; email: string; role: string;
  createdAt: string; propertiesCount: number; leadsCount: number;
}

export default function UsersClient({ users: initial, currentUserId }: { users: User[]; currentUserId?: number }) {
  const [users, setUsers] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true); setErr('');
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setErr(data.error || 'Something went wrong'); return; }
    setUsers([...users, { ...data, propertiesCount: 0, leadsCount: 0, createdAt: new Date(data.createdAt).toISOString() }]);
    setShowModal(false);
    flash('User created successfully!');
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/users?id=${confirmDelete.id}`, { method: 'DELETE' });
    const data = await res.json();
    setDeleteLoading(false);
    if (!res.ok) { flash(data.error || 'Could not delete user'); setConfirmDelete(null); return; }
    setUsers(users.filter((u) => u.id !== confirmDelete.id));
    setConfirmDelete(null);
    flash('User removed successfully.');
  };

  return (
    <>
      <div className="topbar" style={{ paddingLeft: 60 }}>
        <div>
          <div className="topbar-title">User Management</div>
          <div className="topbar-sub">{users.length} team members</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={() => { setErr(''); setShowModal(true); }}>
            <i className="fas fa-user-plus"></i> <span className="hide-xs">Add User</span>
          </button>
        </div>
      </div>

      <div className="page-content">
        {msg && (
          <div style={{ background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid #A7F3D0', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
            <i className="fas fa-check-circle" style={{ marginRight: 8 }}></i>{msg}
          </div>
        )}

        {/* Desktop Table */}
        <div className="card users-table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Properties</th>
                  <th>Leads</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, background: 'var(--accent)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: 'white', flexShrink: 0 }}>
                          {u.name[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-negotiating' : 'badge-new'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{u.propertiesCount}</td>
                    <td style={{ fontWeight: 700 }}>{u.leadsCount}</td>
                    <td style={{ color: 'var(--text3)', fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      {u.id !== currentUserId ? (
                        <button
                          className="btn btn-danger btn-sm"
                          title="Remove user"
                          onClick={() => setConfirmDelete(u)}
                        >
                          <i className="fas fa-user-minus"></i>
                          <span className="hide-xs" style={{ marginLeft: 4 }}>Remove</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text4)' }}>You</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="users-mobile-cards">
          {users.map((u) => (
            <div key={u.id} className="user-mobile-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <div style={{ width: 44, height: 44, background: 'var(--accent)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: 'white', flexShrink: 0 }}>
                  {u.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    {u.name}
                    {u.id === currentUserId && <span style={{ fontSize: 10, background: '#EFF6FF', color: 'var(--accent)', padding: '1px 7px', borderRadius: 20, fontWeight: 600 }}>You</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={'badge ' + (u.role === 'admin' ? 'badge-negotiating' : 'badge-new')}>{u.role}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                      <i className="fas fa-building" style={{ marginRight: 3 }}></i>{u.propertiesCount} props
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                      <i className="fas fa-user-tie" style={{ marginRight: 3 }}></i>{u.leadsCount} leads
                    </span>
                  </div>
                </div>
              </div>
              {u.id !== currentUserId && (
                <button
                  className="btn btn-danger btn-sm"
                  style={{ flexShrink: 0, alignSelf: 'center' }}
                  onClick={() => setConfirmDelete(u)}
                >
                  <i className="fas fa-user-minus"></i>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title"><i className="fas fa-user-plus" style={{ marginRight: 8, color: 'var(--accent)' }}></i>Add New User</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            {err && (
              <div style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid #FECACA', borderRadius: 9, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
                <i className="fas fa-exclamation-circle" style={{ marginRight: 7 }}></i>{err}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" name="name" required placeholder="e.g. Ali Hassan" />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" name="email" type="email" required placeholder="e.g. ali@crm.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" name="password" type="password" required placeholder="Min 6 characters" minLength={6} />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-input" name="role">
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <><i className="fas fa-spinner fa-spin"></i> Creating...</> : <><i className="fas fa-user-plus"></i> Create User</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ color: 'var(--red)' }}>
                <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }}></i>Remove User
              </div>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>×</button>
            </div>
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--red-bg)', border: '1px solid #FECACA', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
                <div style={{ width: 42, height: 42, background: 'var(--red)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, color: 'white', flexShrink: 0 }}>
                  {confirmDelete.name[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{confirmDelete.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{confirmDelete.email}</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                Kya aap <strong>{confirmDelete.name}</strong> ko team se remove karna chahte hain? Ye action wapis nahi hoga.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading
                  ? <><i className="fas fa-spinner fa-spin"></i> Removing...</>
                  : <><i className="fas fa-user-minus"></i> Yes, Remove</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
