'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Pencil, Power, Trash2 } from 'lucide-react';
import { api } from '@/lib/client';
import { Badge, Button, Card } from '@/components/ui';
import { Modal } from '@/components/modal';
import { fmtDateTime } from '@/lib/format';

type TeamUser = {
  id: string;
  name: string;
  email: string;
  role: 'BRAND_ADMIN' | 'BRAND_USER' | 'SUPER_ADMIN';
  isActive: boolean;
  emailVerified: boolean;
  loginCount: number;
  lastLoginAt: string | null;
};

/** Super admin: manage a brand's staff — edit name/email/role, set password, delete. */
export function UserManager({ users, brandId }: { users: TeamUser[]; brandId: string }) {
  const router = useRouter();
  const [editModal, setEditModal] = useState<{ open: boolean; user: TeamUser | null }>({ open: false, user: null });
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'BRAND_USER' });
  const [pwModal, setPwModal] = useState<{ open: boolean; user: TeamUser | null }>({ open: false, user: null });
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editModal.user) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/users/${editModal.user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          role: editForm.role,
          brandId,
        }),
      });
      setEditModal({ open: false, user: null });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(user: TeamUser) {
    const verb = user.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`${verb === 'deactivate' ? 'Deactivate' : 'Activate'} ${user.name}?`)) return;
    try {
      await api(`/api/admin/users/${user.id}`, {
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
      await api(`/api/admin/users/${pwModal.user.id}`, {
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

  async function deleteUser(user: TeamUser) {
    if (!window.confirm(`Permanently delete ${user.name} (${user.email})? Their past invoices are kept.`)) return;
    try {
      await api(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-semibold text-slate-900">Staff ({users.length})</h2>
        <p className="text-xs text-slate-500">
          Edit name, email or role · set passwords (signs out their sessions) · deactivate or delete accounts.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">User</th>
              <th className="th">Role</th>
              <th className="th text-right">Logins</th>
              <th className="th">Last login</th>
              <th className="th">Status</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {users.map((u) => (
              <tr key={u.id} className={`transition hover:bg-slate-50 ${u.isActive ? '' : 'opacity-60'}`}>
                <td className="td">
                  <div className="font-medium text-slate-900">{u.name}</div>
                  <div className="text-xs text-slate-500">
                    {u.email}
                    {!u.emailVerified ? <span className="ml-1 text-amber-600">· unverified</span> : null}
                  </div>
                </td>
                <td className="td">
                  <Badge tone={u.role === 'BRAND_ADMIN' ? 'indigo' : u.role === 'SUPER_ADMIN' ? 'indigo' : 'slate'}>
                    {u.role === 'SUPER_ADMIN' ? 'super admin' : u.role === 'BRAND_ADMIN' ? 'admin' : 'staff'}
                  </Badge>
                </td>
                <td className="td text-right">{u.loginCount}</td>
                <td className="td text-slate-500">{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'never'}</td>
                <td className="td">
                  <Badge tone={u.isActive ? 'green' : 'red'}>{u.isActive ? 'active' : 'disabled'}</Badge>
                </td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setError(null);
                        setEditForm({ name: u.name, email: u.email, role: u.role });
                        setEditModal({ open: true, user: u });
                      }}
                      aria-label={`Edit ${u.name}`}
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
                      onClick={() => toggleActive(u)}
                      disabled={u.role === 'SUPER_ADMIN'}
                      className={u.isActive ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}
                      aria-label={`Toggle ${u.name}`}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteUser(u)}
                      disabled={u.role === 'SUPER_ADMIN'}
                      className="text-red-600 hover:bg-red-50"
                      aria-label={`Delete ${u.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="td py-8 text-center text-slate-500">No staff yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Edit user */}
      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, user: null })} title={editModal.user ? `Edit — ${editModal.user.name}` : 'Edit user'}>
        <form onSubmit={saveEdit} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}
          <div>
            <label className="label">Name</label>
            <input className="input" required minLength={2} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
              <option value="BRAND_USER">Brand staff</option>
              <option value="BRAND_ADMIN">Brand admin</option>
              <option value="SUPER_ADMIN">Super admin (removes from brand)</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditModal({ open: false, user: null })}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
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
