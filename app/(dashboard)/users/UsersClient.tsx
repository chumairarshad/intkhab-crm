'use client';
import { useState } from 'react';

interface ResetRequest {
  id: number; email: string; name: string; status: string; createdAt: string;
}

interface User {
  id: number; name: string; email: string; role: string;
  createdAt: string; propertiesCount: number; leadsCount: number;
}

export default function UsersClient({ users: initial, currentUserId, resetRequests: initialReqs = [] }: { users: User[]; currentUserId?: number; resetRequests?: ResetRequest[] }) {
  const [users, setUsers] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [resetRequests, setResetRequests] = useState<ResetRequest[]>(initialReqs);
  const [resolveReq, setResolveReq] = useState<ResetRequest | null>(null);
  const [reqNewPw, setReqNewPw] = useState('');
  const [showReqPw, setShowReqPw] = useState(false);
  const [reqLoading, setReqLoading] = useState(false);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

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

  const handleRequestResolve = async () => {
    if (!resolveReq || reqNewPw.length < 6) return;
    setReqLoading(true);
    const res = await fetch('/api/password-reset', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: resolveReq.id, action: 'resolve', email: resolveReq.email, newPassword: reqNewPw }),
    });
    const data = await res.json();
    setReqLoading(false);
    if (!res.ok) { flash(data.error || 'Error'); return; }
    setResetRequests(resetRequests.filter(r => r.id !== resolveReq.id));
    setResolveReq(null); setReqNewPw('');
    flash(`Password for ${resolveReq.name} has been reset and request resolved.`);
  };

  const handleRequestDismiss = async (req: ResetRequest) => {
    const res = await fetch('/api/password-reset', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: req.id, action: 'dismiss' }),
    });
    if (res.ok) {
      setResetRequests(resetRequests.filter(r => r.id !== req.id));
      flash('Request dismissed.');
    }
  };

  const handleResetPassword = async () => {
    if (!resetUser || newPassword.length < 6) return;
    setResetLoading(true);
    const res = await fetch('/api/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: resetUser.id, newPassword }),
    });
    const data = await res.json();
    setResetLoading(false);
    if (!res.ok) { flash(data.error || 'Could not reset password'); return; }
    setResetUser(null);
    setNewPassword('');
    flash(`Password for ${resetUser.name} has been reset successfully.`);
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

        {/* ── Password Reset Requests Panel ── */}
        {resetRequests.length > 0 && (
          <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <i className="fas fa-key" style={{ color: '#D97706', fontSize: 16 }}></i>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#92400E' }}>
                Password Reset Requests ({resetRequests.length})
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {resetRequests.map(req => (
                <div key={req.id} style={{ background: 'white', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, background: '#F59E0B', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: 14, flexShrink: 0 }}>
                      {req.name[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#1E293B' }}>{req.name}</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>{req.email}</div>
                      <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                        {new Date(req.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => { setResolveReq(req); setReqNewPw(''); setShowReqPw(false); }}
                    >
                      <i className="fas fa-key"></i> Reset Password
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleRequestDismiss(req)}
                      title="Dismiss request"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          title="Reset Password"
                          onClick={() => { setResetUser(u); setNewPassword(''); setShowNewPw(false); }}
                        >
                          <i className="fas fa-key"></i>
                          <span className="hide-xs" style={{ marginLeft: 4 }}>Reset PW</span>
                        </button>
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
                          <span style={{ fontSize: 11, color: 'var(--text4)', padding: '4px 8px' }}>You</span>
                        )}
                      </div>
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
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignSelf: 'center' }}>
                <button
                  className="btn btn-outline btn-sm"
                  title="Reset Password"
                  onClick={() => { setResetUser(u); setNewPassword(''); setShowNewPw(false); }}
                >
                  <i className="fas fa-key"></i>
                </button>
                {u.id !== currentUserId && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => setConfirmDelete(u)}
                  >
                    <i className="fas fa-user-minus"></i>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Add User Modal ── */}
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

      {/* ── Reset Password Modal ── */}
      {resetUser && (
        <div className="modal-backdrop" onClick={() => setResetUser(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <i className="fas fa-key" style={{ marginRight: 8, color: 'var(--accent)' }}></i>Reset Password
              </div>
              <button className="modal-close" onClick={() => setResetUser(null)}>×</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, background: 'var(--accent)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: 'white', flexShrink: 0 }}>
                {resetUser.name[0]}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{resetUser.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{resetUser.email}</div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  minLength={6}
                  style={{ paddingRight: 42 }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14 }}
                >
                  <i className={`fas ${showNewPw ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              {newPassword.length > 0 && newPassword.length < 6 && (
                <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 5 }}>Password must be at least 6 characters.</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-outline" onClick={() => setResetUser(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleResetPassword}
                disabled={resetLoading || newPassword.length < 6}
              >
                {resetLoading
                  ? <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                  : <><i className="fas fa-check"></i> Save New Password</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Modal ── */}
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
                Are you sure you want to remove <strong>{confirmDelete.name}</strong> from the team? This action cannot be undone.
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
      {/* ── Resolve Reset Request Modal ── */}
      {resolveReq && (
        <div className="modal-backdrop" onClick={() => setResolveReq(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <i className="fas fa-key" style={{ marginRight: 8, color: '#F59E0B' }}></i>
                Reset Password for Agent
              </div>
              <button className="modal-close" onClick={() => setResolveReq(null)}>×</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FEF3C7', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, background: '#F59E0B', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: 'white', flexShrink: 0 }}>
                {resolveReq.name[0]}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{resolveReq.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{resolveReq.email}</div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Set New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showReqPw ? 'text' : 'password'}
                  value={reqNewPw}
                  onChange={(e) => setReqNewPw(e.target.value)}
                  placeholder="Min 6 characters"
                  minLength={6}
                  style={{ paddingRight: 42 }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowReqPw(!showReqPw)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14 }}
                >
                  <i className={`fas ${showReqPw ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              {reqNewPw.length > 0 && reqNewPw.length < 6 && (
                <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 5 }}>Password must be at least 6 characters.</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-outline" onClick={() => setResolveReq(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleRequestResolve}
                disabled={reqLoading || reqNewPw.length < 6}
              >
                {reqLoading
                  ? <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                  : <><i className="fas fa-check"></i> Reset & Resolve</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
