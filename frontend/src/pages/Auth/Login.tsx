import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { ShieldAlert, ArrowRight, Key, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const { login, verify2FA, error, clearError, loading } = useAuthStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('ADMIN');
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [code, setCode] = useState('');

  const demoAccounts = {
    ADMIN:        { email: 'admin@sentinel.com',   pass: 'password123', label: 'Insurer Admin'  },
    CLAIMS_STAFF: { email: 'claims@sentinel.com',  pass: 'password123', label: 'Claims Staff'   },
    SUPPORT_STAFF:{ email: 'support@sentinel.com', pass: 'password123', label: 'Support Staff'  },
    AUDITOR:      { email: 'auditor@sentinel.com', pass: 'password123', label: 'Auditor'        },
  };

  const handleRoleSelect = (roleKey: keyof typeof demoAccounts) => {
    setSelectedRole(roleKey);
    setEmail(demoAccounts[roleKey].email);
    setPassword(demoAccounts[roleKey].pass);
    clearError();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      const res = await login(email, password, selectedRole);
      if (res.requires2FA) setRequires2FA(true);
      else navigate('/');
    } catch {}
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    try {
      await verify2FA(code);
      navigate('/');
    } catch {}
  };

  /* ── shared input style ── */
  const inputCls =
    'w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-slate-50 ' +
    'text-slate-900 placeholder:text-slate-400 ' +
    'focus:outline-none focus:bg-white focus:border-red-400 focus:ring-4 focus:ring-red-500/8 ' +
    'transition-all duration-150';

  return (
    /* ── full-screen centred wrapper ── */
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12 relative overflow-hidden">

      {/* very subtle background texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(to right,#94a3b8 1px,transparent 1px),' +
            'linear-gradient(to bottom,#94a3b8 1px,transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />
      {/* faint ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[360px] rounded-full bg-red-500/5 blur-[100px] pointer-events-none" />

      {/* ── AUTH CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[440px] bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60 px-8 py-9"
      >

        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-7">
          <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shadow-md shadow-red-600/25 shrink-0">
            <span className="text-white font-bold text-base leading-none">H</span>
          </div>
          <div>
            <p className="font-bold text-sm text-slate-900 leading-tight tracking-tight">HealthPass</p>
            <p className="text-[10px] text-slate-400 leading-tight tracking-wide">Insurance Partner Portal</p>
          </div>
        </div>

        {/* ── AnimatePresence for stage transitions ── */}
        <AnimatePresence mode="wait">

          {/* ═══════════════ STAGE 1 — LOGIN ═══════════════ */}
          {!requires2FA && (
            <motion.div
              key="login-form"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.18 }}
            >
              {/* Heading */}
              <div className="mb-6">
                <h1 className="text-[22px] font-bold text-slate-900 tracking-tight leading-snug">
                  Welcome back
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Sign in to your partner account.
                </p>
              </div>

              {/* Role selector */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-slate-500 mb-2">
                  Access role
                </label>
                {/* segmented pill row */}
                <div className="flex gap-1.5 flex-wrap">
                  {Object.entries(demoAccounts).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleRoleSelect(key as keyof typeof demoAccounts)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-150 ${
                        selectedRole === key
                          ? 'bg-red-600 border-red-600 text-white shadow-sm shadow-red-600/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex gap-2 items-start px-3.5 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium overflow-hidden"
                  >
                    <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearError(); }}
                    required
                    placeholder="you@sentinel.com"
                    className={inputCls}
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-600">Password</label>
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:text-red-700 font-medium hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); clearError(); }}
                      required
                      placeholder="••••••••"
                      className={`${inputCls} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1.5 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg shadow-md shadow-red-600/20 hover:shadow-lg hover:shadow-red-600/25 transition-all duration-150 group"
                >
                  {loading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <>
                      <span>Sign in</span>
                      <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-150" />
                    </>
                  )}
                </button>
              </form>

              {/* Demo note */}
              <div className="mt-5 px-3.5 py-3 bg-slate-50 border border-slate-100 rounded-lg">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  <span className="font-semibold text-slate-700">Demo tip:</span>{' '}
                  Selecting <span className="text-red-600 font-medium">Insurer Admin</span> triggers a
                  2FA challenge to demonstrate enterprise vault security.
                </p>
              </div>

              {/* Compliance footer */}
              <div className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
                <ShieldCheck size={11} className="text-slate-400" />
                <span>HIPAA Compliant · ISO 27001 · End-to-end encrypted</span>
              </div>
            </motion.div>
          )}

          {/* ═══════════════ STAGE 2 — 2FA ═══════════════ */}
          {requires2FA && (
            <motion.div
              key="2fa-form"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
            >
              {/* Icon + heading */}
              <div className="mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mb-4">
                  <Key size={18} />
                </div>
                <h1 className="text-[22px] font-bold text-slate-900 tracking-tight leading-snug">
                  Two-factor check
                </h1>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Enter the 6-digit code from your authenticator app to complete sign-in.
                </p>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex gap-2 items-start px-3.5 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium overflow-hidden"
                  >
                    <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handle2FASubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    6-digit passcode
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={e => { setCode(e.target.value.replace(/\D/g, '')); clearError(); }}
                    required
                    placeholder="123456"
                    autoFocus
                    className="w-full px-4 py-3 text-center text-2xl font-bold tracking-[0.6em] rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-300 placeholder:tracking-normal focus:outline-none focus:bg-white focus:border-red-400 focus:ring-4 focus:ring-red-500/8 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg shadow-md shadow-red-600/20 hover:shadow-lg hover:shadow-red-600/25 transition-all duration-150"
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : 'Verify and continue'}
                </button>

                <button
                  type="button"
                  onClick={() => { setRequires2FA(false); clearError(); setCode(''); }}
                  className="w-full text-center text-xs text-slate-500 hover:text-slate-700 font-medium py-1 transition-colors"
                >
                  ← Back to sign in
                </button>
              </form>

              {/* Sandbox bypass note */}
              <div className="mt-5 px-3.5 py-3 bg-amber-50 border border-amber-100 rounded-lg">
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  <span className="font-semibold">Sandbox mode:</span>{' '}
                  Enter{' '}
                  <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">123456</code>
                  {' '}or{' '}
                  <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">000000</code>
                  {' '}to authenticate.
                </p>
              </div>

              {/* Compliance footer */}
              <div className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
                <ShieldCheck size={11} />
                <span>HIPAA Compliant · ISO 27001 · End-to-end encrypted</span>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>

      {/* page footer */}
      <p className="absolute bottom-5 text-[11px] text-slate-400">
        © 2026 HealthPass Technology Partners LLC
      </p>
    </div>
  );
}
