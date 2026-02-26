import React, { useEffect, useState } from 'react';
import { useAsync, useDebounce } from '@rahmanazhar/stellar-js/dist/hooks';
import { customerService } from '../api/services';

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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const listAsync = useAsync(() => customerService.getAll({ search: debouncedSearch || undefined }));

  function load() {
    listAsync.execute().then(res => setCustomers(res.data || [])).catch(() => {});
  }

  useEffect(() => { load(); }, [debouncedSearch]);

  const isAdmin = userRole === 'admin';

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Deactivate customer ${name}?`)) return;
    try {
      await customerService.delete(id);
      load();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p>{customers.length} customer{customers.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="filters">
        <input
          placeholder="🔍 Search by name, phone, ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ minWidth: 280 }}
        />
      </div>

      {listAsync.isPending && <div className="loading">Loading customers…</div>}

      {!listAsync.isPending && customers.length === 0 && (
        <div className="empty"><div className="empty-icon">👥</div><p>No customers found</p></div>
      )}

      {customers.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Nationality</th>
                  <th>ID</th>
                  <th>Role</th>
                  <th>Status</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c._id}>
                    <td>
                      <strong>{c.firstName} {c.lastName}</strong>
                    </td>
                    <td style={{ fontSize: 13, color: '#555' }}>{c.userId?.email}</td>
                    <td>{c.phone}</td>
                    <td>{c.nationality || '—'}</td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace' }}>
                      {c.idNumber ? `${c.idType}: ${c.idNumber}` : '—'}
                    </td>
                    <td>
                      <span className={`badge badge-${c.userId?.role}`}>{c.userId?.role}</span>
                    </td>
                    <td>
                      <span className={`badge ${c.userId?.isActive ? 'badge-available' : 'badge-cancelled'}`}>
                        {c.userId?.isActive ? 'active' : 'inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        <button className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(c._id, `${c.firstName} ${c.lastName}`)}>
                          Deactivate
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
