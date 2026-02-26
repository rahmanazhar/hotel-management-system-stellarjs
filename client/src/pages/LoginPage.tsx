import React, { useState } from 'react';
import { useAsync } from '@rahmanazhar/stellar-js/dist/hooks';
import { authService } from '../api/services';
import { Building2, Mail, Lock, User, Phone, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  onLogin: (auth: { token: string; user: any }) => void;
}

const FEATURES = [
  'Real-time room availability tracking',
  'Seamless check-in / check-out workflow',
  'Guest profiles and booking history',
  'Revenue and occupancy analytics',
];

export default function LoginPage({ onLogin }: Props) {
  const [tab, setTab]   = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    firstName: '', lastName: '', phone: '',
  });
  const [error, setError] = useState('');

  const loginAsync    = useAsync(authService.login);
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
          name:      form.name,
          email:     form.email,
          password:  form.password,
          firstName: form.firstName || undefined,
          lastName:  form.lastName  || undefined,
          phone:     form.phone     || undefined,
        });
      }
      onLogin({ token: result.token, user: result.user });
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Something went wrong');
    }
  }

  return (
    <div className="login-page">

      {/* ── Left: branding panel ─────────────────────────── */}
      <div className="login-brand">
        <div className="login-brand-content">
          <div className="login-brand-logo">
            <Building2 size={28} />
          </div>
          <h1>Hotel<span>OS</span></h1>
          <p>Professional hotel management for modern hospitality businesses.</p>
          <div>
            {FEATURES.map(f => (
              <div className="login-feature" key={f}>
                <div className="login-feature-icon"><CheckCircle2 size={14} /></div>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: form panel ────────────────────────────── */}
      <div className="login-form-side">
        <div className="login-form-box">
          <div className="login-form-header">
            <h2>{tab === 'login' ? 'Welcome back' : 'Create account'}</h2>
            <p>
              {tab === 'login'
                ? 'Sign in to your management portal'
                : 'Join your hotel management platform'}
            </p>
          </div>

          <div className="login-tabs">
            {(['login', 'register'] as const).map(t => (
              <button
                key={t}
                className={`login-tab${tab === t ? ' active' : ''}`}
                onClick={() => { setTab(t); setError(''); }}
              >
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {error && (
            <div className="alert alert-error">
              <span className="alert-icon"><AlertCircle size={16} /></span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {tab === 'register' && (
              <>
                <div className="form-group">
                  <label className="form-label">
                    Full Name <span className="form-label-required">*</span>
                  </label>
                  <div className="form-input-wrap">
                    <span className="form-input-icon"><User size={15} /></span>
                    <input className="form-input has-icon" type="text" placeholder="John Doe"
                      value={form.name} onChange={e => set('name', e.target.value)} />
                  </div>
                </div>

                <div className="form-row" style={{ marginTop: 16 }}>
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input className="form-input" type="text" placeholder="John"
                      value={form.firstName} onChange={e => set('firstName', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input className="form-input" type="text" placeholder="Doe"
                      value={form.lastName} onChange={e => set('lastName', e.target.value)} />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label">Phone</label>
                  <div className="form-input-wrap">
                    <span className="form-input-icon"><Phone size={15} /></span>
                    <input className="form-input has-icon" type="text" placeholder="+60123456789"
                      value={form.phone} onChange={e => set('phone', e.target.value)} />
                  </div>
                </div>
              </>
            )}

            <div className="form-group" style={{ marginTop: tab === 'register' ? 16 : 0 }}>
              <label className="form-label">
                Email <span className="form-label-required">*</span>
              </label>
              <div className="form-input-wrap">
                <span className="form-input-icon"><Mail size={15} /></span>
                <input className="form-input has-icon" type="email" placeholder="you@hotel.com"
                  value={form.email} onChange={e => set('email', e.target.value)} required />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">
                Password <span className="form-label-required">*</span>
              </label>
              <div className="form-input-wrap">
                <span className="form-input-icon"><Lock size={15} /></span>
                <input className="form-input has-icon" type="password" placeholder="••••••••"
                  value={form.password} onChange={e => set('password', e.target.value)} required />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center', marginTop: 22 }}
              disabled={busy}
            >
              {busy ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {tab === 'login' && (
            <div className="login-demo">
              Demo admin: <code>admin@hotel.com</code> / <code>Admin@1234</code>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
