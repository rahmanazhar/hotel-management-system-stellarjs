import React, { useEffect, useState } from 'react';
import { useAsync, useDebounce } from '@rahmanazhar/stellar-js/dist/hooks';
import { customerService } from '../api/services';
import { useToast } from '../context/ToastContext';
import { Search, Users, UserX } from 'lucide-react';

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  nationality: string;
  idType: string;
  idNumber: string;
  userId: { _id: string; name: string; email: string; role: string; isActive: boolean };
}

export default function CustomersPage({ userRole }: { userRole: string }) {
  const toast = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch]       = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const isAdmin = userRole === 'admin';

  const listAsync = useAsync(() => customerService.getAll({ search: debouncedSearch || undefined }));

  function load() {
    listAsync.execute().then(res => setCustomers(res.data || [])).catch(() => {});
  }

  useEffect(() => { load(); }, [debouncedSearch]);

  async function handleDeactivate(id: string, name: string) {
    if (!confirm(`Deactivate ${name}? They will lose access to the system.`)) return;
    try {
      await customerService.delete(id);
      toast.success(`${name} deactivated`);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to deactivate');
    }
  }

  return (
    <div>
      {/* ── Header ────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p>{customers.length} guest{customers.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* ── Search ────────────────────────────────────────── */}
      <div className="filter-bar">
        <div className="search-wrap">
          <span className="search-icon"><Search size={15} /></span>
          <input
            className="form-input search-input"
            placeholder="Search by name, email, phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Loading ───────────────────────────────────────── */}
      {listAsync.isPending && (
        <div className="loading-wrap">
          <div className="spinner" />
          <span>Loading customers…</span>
        </div>
      )}

      {/* ── Empty ─────────────────────────────────────────── */}
      {!listAsync.isPending && customers.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={28} /></div>
            <h3>No customers found</h3>
            <p>{search ? 'Try a different search term.' : 'Customers appear here once they register an account.'}</p>
          </div>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────── */}
      {!listAsync.isPending && customers.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Nationality</th>
                  <th>ID Document</th>
                  <th>Role</th>
                  <th>Status</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: 'var(--clr-brand-50)',
                          color: 'var(--clr-brand-600)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 13, flexShrink: 0,
                        }}>
                          {(c.firstName?.[0] ?? c.userId?.name?.[0] ?? '?').toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {c.firstName || c.lastName
                              ? `${c.firstName} ${c.lastName}`.trim()
                              : c.userId?.name ?? '—'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                            ID: {c._id.slice(-6).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--color-text-2)', fontSize: 13 }}>
                      {c.userId?.email ?? '—'}
                    </td>
                    <td>{c.phone || '—'}</td>
                    <td>{c.nationality || '—'}</td>
                    <td>
                      {c.idNumber ? (
                        <span className="text-mono" style={{ fontSize: 12 }}>
                          {c.idType}: {c.idNumber}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <span className={`badge badge-${c.userId?.role}`}>
                        {c.userId?.role ?? '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${c.userId?.isActive ? 'badge-active' : 'badge-inactive'}`}>
                        {c.userId?.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        {c.userId?.isActive && (
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                            onClick={() => handleDeactivate(c._id, `${c.firstName} ${c.lastName}`.trim() || c.userId?.name)}
                          >
                            <UserX size={13} /> Deactivate
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-footer" style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
            Showing {customers.length} guest{customers.length !== 1 ? 's' : ''}
            {search && ` matching "${search}"`}
          </div>
        </div>
      )}
    </div>
  );
}
