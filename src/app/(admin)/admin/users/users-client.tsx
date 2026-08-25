'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Plus, Power, Search, Trash2 } from 'lucide-react';
import { api } from '@/lib/client';
import { Badge, Button, PageHeader, TableWrap } from '@/components/ui';
import { Modal } from '@/components/modal';
import { fmtDateTime } from '@/lib/format';
import type { AdminUserRow } from './page';

const roleTone = { SUPER_ADMIN: 'indigo', BRAND_ADMIN: 'indigo', BRAND_USER: 'slate' } as const;
const roleLabel = { SUPER_ADMIN: 'super admin', BRAND_ADMIN: 'brand admin', BRAND_USER: 'staff' } as const;

export function UsersClient({
  users,
  brands,
  currentUserId,
}: {
  users: AdminUserRow[];
  brands: { id: string; name: string }[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'BRAND_USER',
    brandId: '',
  });
  const [pwModal, setPwModal] = useState<{ open: boolean; user: AdminUserRow | null }>({ open: false, user: null });
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.brandName ?? '').toLowerCase().includes(q)
    );
  }, [users, search]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          ...createForm,
          brandId: createForm.role === 'SUPER_ADMIN' ? null : createForm.brandId || null,
        }),
      });
      setCreateOpen(false);
      setCreateForm({ name: '', email: '', password: '', role: 'BRAND_USER', brandId: '' });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(user: AdminUserRow) {
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

  async function deleteUser(user: AdminUserRow) {
    if (!window.confirm(`Permanently delete ${user.name} (${user.email})? Their past invoices are kept.`)) return;
    try {
      await api(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function resetPassword(e: React.FormEvent) {    e.preventDefault();
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

  return (
    <div>
      <PageHeader title="Users" description="Accounts, roles, and login frequency across the platform.">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Add user
        </Button>
      </PageHeader>

      <div className="mb-4 sm:w-80">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search name, email, brand…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <TableWrap>
        <thead className="bg-slate-50">
          <tr>
            <th className="th">User</th>
            <th className="th">Brand</th>
            <th className="th">Role</th>
            <th className="th text-right">Logins</th>
            <th className="th">Last login</th>
            <th className="th">Status</th>
            <th className="th" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {filtered.map((u) => (
            <tr key={u.id} className={`transition hover:bg-slate-50 ${u.isActive ? '' : 'opacity-60'}`}>
              <td className="td">
                <div className="font-medium text-slate-900">
                  {u.name}
                  {u.id === currentUserId ? <span className="ml-1 text-xs text-slate-400">(you)</span> : null}
                </div>
                <div className="text-xs text-slate-500">{u.email}</div>
              </td>
              <td className="td">{u.brandName ?? <span className="text-slate-400">—</span>}</td>
              <td className="td">
                <Badge tone={roleTone[u.role]}>{roleLabel[u.role]}</Badge>
              </td>
              <td className="td text-right font-medium">{u.loginCount}</td>
              <td className="td text-slate-500">{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'never'}</td>
              <td className="td">
                <div className="flex flex-wrap gap-1">
                  <Badge tone={u.isActive ? 'green' : 'red'}>{u.isActive ? 'active' : 'disabled'}</Badge>
                  {!u.emailVerified ? <Badge tone="amber">unverified email</Badge> : null}
                </div>
              </td>
              <td className="td">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setError(null);
                      setNewPassword('');
                      setPwModal({ open: true, user: u });
                    }}
                    aria-label={`Reset password for ${u.name}`}
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(u)}
                    className={u.isActive ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}
                    disabled={u.id === currentUserId}
                    aria-label={`Toggle ${u.name}`}
                  >
                    <Power className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteUser(u)}
                    disabled={u.id === currentUserId || u.role === 'SUPER_ADMIN'}
                    className="text-red-600 hover:bg-red-50"
                    aria-label={`Delete ${u.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      {/* Create user modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add a user">
        <form onSubmit={createUser} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}
          <div>
            <label className="label">Full name *</label>
            <input
              className="input"
              required
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Email *</label>
            <input
              className="input"
              type="email"
              required
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            />
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
              placeholder="10+ chars with a letter and a number — share securely"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Role</label>
              <select
                className="input"
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
              >
                <option value="BRAND_USER">Brand staff</option>
                <option value="BRAND_ADMIN">Brand admin</option>
                <option value="SUPER_ADMIN">Super admin</option>
              </select>
            </div>
            <div>
              <label className="label">Brand</label>
              <select
                className="input"
                value={createForm.brandId}
                onChange={(e) => setCreateForm({ ...createForm, brandId: e.target.value })}
                disabled={createForm.role === 'SUPER_ADMIN'}
              >
                <option value="">— Select brand —</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create user'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset password modal */}
      <Modal
        open={pwModal.open}
        onClose={() => setPwModal({ open: false, user: null })}
        title={pwModal.user ? `Set new password — ${pwModal.user.name}` : 'Set new password'}
      >
        <form onSubmit={resetPassword} className="space-y-4">
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
            <p className="mt-1 text-xs text-slate-400">
              Their existing sessions will be signed out. Share the new password securely — they can change
              it later via “Forgot password”.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPwModal({ open: false, user: null })}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={busy}>
              {busy ? 'Saving…' : 'Set password'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
