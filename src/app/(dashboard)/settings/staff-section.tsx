'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Pencil, Plus, Power } from 'lucide-react';
import { api } from '@/lib/client';
import { Badge, Button, Card } from '@/components/ui';
import { Modal } from '@/components/modal';
import { fmtDateTime } from '@/lib/format';

type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: 'BRAND_ADMIN' | 'BRAND_USER';
  isActive: boolean;
  lastLoginAt: string | null;
  loginCount: number;
};

/** Brand-admin team management inside Settings: add staff, activate/deactivate, set password. */
export function StaffSection({ staff, currentUserId }: { staff: StaffRow[]; currentUserId: string }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'BRAND_USER' });
  const [editModal, setEditModal] = useState<{ open: boolean; user: StaffRow | null }>({ open: false, user: null });
  const [editForm, setEditForm] = useState({ name: '', role: 'BRAND_USER' });
  const [pwModal, setPwModal] = useState<{ open: boolean; user: StaffRow | null }>({ open: false, user: null });
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/brand/staff', { method: 'POST', body: JSON.stringify(createForm) });
      setCreateOpen(false);
      setCreateForm({ name: '', email: '', password: '', role: 'BRAND_USER' });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editModal.user) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/brand/staff/${editModal.user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: editForm.role }),
      });
      setEditModal({ open: false, user: null });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(user: StaffRow) {
    const verb = user.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`${verb === 'deactivate' ? 'Deactivate' : 'Activate'} ${user.name}?`)) return;
    try {
      await api(`/api/brand/staff/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function setPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwModal.user) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/brand/staff/${pwModal.user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ password: newPassword }),
      });
      setPwModal({ open: false, user: null });
      setNewPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Team</h2>
          <p className="text-xs text-slate-500">Staff and admins for your brand. Staff record sales; admins manage settings too.</p>
        </div>
        <Button onClick={() => { setError(null); setCreateOpen(true); }}>
          <Plus className="h-4 w-4" /> Add staff
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-2 pr-4">Member</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2 text-right">Logins</th>
              <th className="px-4 py-2">Last login</th>
              <th className="px-4 py-2">Status</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff.map((u) => (
              <tr key={u.id} className={u.isActive ? '' : 'opacity-60'}>
                <td className="py-2.5 pr-4">
                  <div className="font-medium text-slate-900">
                    {u.name}
                    {u.id === currentUserId ? <span className="ml-1 text-xs text-slate-400">(you)</span> : null}
                  </div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </td>
                <td className="px-4 py-2.5">
                  <Badge tone={u.role === 'BRAND_ADMIN' ? 'indigo' : 'slate'}>
                    {u.role === 'BRAND_ADMIN' ? 'admin' : 'staff'}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-right text-sm">{u.loginCount}</td>
                <td className="px-4 py-2.5 text-sm text-slate-500">
                  {u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'never'}
                </td>
                <td className="px-4 py-2.5">
                  <Badge tone={u.isActive ? 'green' : 'red'}>{u.isActive ? 'active' : 'disabled'}</Badge>
                </td>
                <td className="py-2.5 pl-2">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setError(null);
                        setEditForm({ name: u.name, role: u.role });
                        setEditModal({ open: true, user: u });
                      }}
                      aria-label={`Change role for ${u.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setError(null);
                        setNewPassword('');
                        setPwModal({ open: true, user: u });
                      }}
                      aria-label={`Set password for ${u.name}`}
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={u.id === currentUserId}
                      onClick={() => toggleActive(u)}
                      className={u.isActive ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}
                      aria-label={`Toggle ${u.name}`}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add staff */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add a team member">
        <form onSubmit={createStaff} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}
          <div>
            <label className="label">Full name *</label>
            <input className="input" required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email *</label>
            <input className="input" type="email" required value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Temporary password *</label>
            <input
              className="input"
              type="text"
              required
              minLength={10}
              maxLength={72}
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              placeholder="10+ chars with a letter and a number"
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select
              className="input"
              value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
            >
              <option value="BRAND_USER">Staff — record sales & expenses</option>
              <option value="BRAND_ADMIN">Admin — full brand control</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Add member'}</Button>
          </div>
        </form>
      </Modal>

      {/* Change role */}
      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, user: null })} title={editModal.user ? `Role — ${editModal.user.name}` : 'Role'}>
        <form onSubmit={saveEdit} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}
          <div>
            <label className="label">Role</label>
            <select className="input" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
              <option value="BRAND_USER">Staff — record sales & expenses</option>
              <option value="BRAND_ADMIN">Admin — full brand control</option>
            </select>
            <p className="mt-1 text-xs text-slate-400">A brand always keeps at least one active admin.</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditModal({ open: false, user: null })}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save role'}</Button>
          </div>
        </form>
      </Modal>

      {/* Set password */}
      <Modal open={pwModal.open} onClose={() => setPwModal({ open: false, user: null })} title={pwModal.user ? `Set password — ${pwModal.user.name}` : 'Set password'}>
        <form onSubmit={setPassword} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}
          <div>
            <label className="label">New password *</label>
            <input
              className="input"
              type="text"
              required
              minLength={10}
              maxLength={72}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="10+ chars with a letter and a number"
            />
            <p className="mt-1 text-xs text-slate-400">Their existing sessions will be signed out.</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPwModal({ open: false, user: null })}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={busy}>{busy ? 'Saving…' : 'Set password'}</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
