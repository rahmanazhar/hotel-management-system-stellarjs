import React, { useState } from 'react';
import { useLocalStorage, useAsync } from '@rahmanazhar/stellar-js/dist/hooks';
import { authService } from '../api/services';

interface Props {
  onLogin: (auth: { token: string; user: any }) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', firstName: '', lastName: '', phone: '' });
  const [error, setError] = useState('');

  const loginAsync = useAsync(authService.login);
  const registerAsync = useAsync(authService.register);

  const busy = loginAsync.isPending || registerAsync.isPending;

  function set(field: string, val: string) {
    setForm(prev => ({ ...prev, [field]: val }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      let result: any;
      if (tab === 'login') {
        result = await loginAsync.execute({ email: form.email, password: form.password });
      } else {
        if (!form.name || !form.email || !form.password) {
          setError('Name, email and password are required');
          return;
        }
        result = await registerAsync.execute({
          name: form.name,
          email: form.email,
          password: form.password,
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          phone: form.phone || undefined,
        });
      }
      onLogin({ token: result.token, user: result.user });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Something went wrong';
      setError(msg);
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <h1>🏨 <span className="accent">Hotel</span> System</h1>
        <p className="subtitle">Powered by StellarJS</p>

        <div style={{ display: 'flex', gap: 0, marginBottom: 24, border: '1.5px solid #e0e3e8', borderRadius: 8, overflow: 'hidden' }}>
          {(['login', 'register'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); }}
              style={{
                flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 600, fontSize: 14,
                background: tab === t ? '#e94560' : 'transparent',
                color: tab === t ? '#fff' : '#666',
                transition: 'all 0.2s',
              }}>
              {t === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {tab === 'register' && (
            <>
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" placeholder="John Doe" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input type="text" placeholder="John" value={form.firstName} onChange={e => set('firstName', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input type="text" placeholder="Doe" value={form.lastName} onChange={e => set('lastName', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="text" placeholder="+60123456789" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
            </>
          )}
          <div className="form-group">
            <label>Email *</label>
            <input type="email" placeholder="admin@hotel.com" value={form.email} onChange={e => set('email', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password *</label>
            <input type="password" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} disabled={busy}>
            {busy ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {tab === 'login' && (
          <p style={{ fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: 16 }}>
            Demo admin: admin@hotel.com / Admin@1234
          </p>
        )}
      </div>
    </div>
  );
}
