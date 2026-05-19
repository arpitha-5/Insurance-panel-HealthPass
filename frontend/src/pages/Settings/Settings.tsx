import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { 
  Settings as SettingsIcon, 
  Globe, 
  ToggleLeft, 
  ToggleRight, 
  Trash2, 
  Laptop, 
  ShieldCheck, 
  FileDown, 
  Printer, 
  CheckCircle2, 
  Loader2,
  Copy,
  Building,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [secretToken, setSecretToken] = useState('');
  const [integrationActive, setIntegrationActive] = useState(true);

  const [toast, setToast] = useState<{ type: 'success' | 'warning' | 'danger'; text: string } | null>(null);

  const triggerToast = (type: 'success' | 'warning' | 'danger', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSettingsData = async () => {
    setLoading(true);

    // 1. Load insurer profile — backend returns profile directly, not wrapped in .profile
    try {
      const res = await api.get('/insurer/profile');
      const prof = res.data; // direct object, not res.data.profile
      setProfile(prof);
      setCompanyName(prof.companyName || '');
      setContactEmail(prof.supportEmail || ''); // backend field is supportEmail
      setApiEndpoint(prof.apiEndpoint || '');
      setSecretToken(prof.apiToken || '');      // backend field is apiToken
      setIntegrationActive(prof.integrationActive ?? true);
    } catch {
      // Fallback sandbox values if backend is offline
      const fallback = {
        companyName: 'Sentinel Health Group',
        supportEmail: 'integrations@sentinelhealth.com',
        apiEndpoint: 'https://api.sentinelhealth.com/v1/healthpass/validate',
        apiToken: 'shp_live_sandbox_demo_token_00000000',
        integrationActive: true
      };
      setProfile(fallback);
      setCompanyName(fallback.companyName);
      setContactEmail(fallback.supportEmail);
      setApiEndpoint(fallback.apiEndpoint);
      setSecretToken(fallback.apiToken);
      setIntegrationActive(fallback.integrationActive);
    }

    // 2. Load sessions — correct route is GET /auth/sessions
    try {
      const res = await api.get('/auth/sessions');
      setSessions(Array.isArray(res.data) ? res.data : []);
    } catch {
      setSessions([
        { id: 'sess_sandbox_1', device: 'macOS Chrome Enterprise', role: 'ADMINISTRATOR', ipAddress: '192.168.1.45', lastActive: new Date().toISOString() },
        { id: 'sess_sandbox_2', device: 'Windows 11 Gateway Node', role: 'COMPLIANCE_AUDITOR', ipAddress: '10.0.4.110', lastActive: new Date(Date.now() - 15 * 60000).toISOString() }
      ]);
    }

    setLoading(false);
  };

  useEffect(() => { fetchSettingsData(); }, []);

  // Update profile — backend accepts: companyName, taxId, supportEmail, supportPhone, address, logo
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProfile(true);
    try {
      const res = await api.put('/insurer/profile', {
        companyName,
        supportEmail: contactEmail,  // map contactEmail → supportEmail
      });
      const updated = res.data;
      setProfile(updated);
      setCompanyName(updated.companyName || companyName);
      setContactEmail(updated.supportEmail || contactEmail);
      triggerToast('success', 'Company profile updated successfully.');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to update profile.';
      triggerToast('danger', msg);
    } finally {
      setSubmittingProfile(false);
    }
  };

  // Update webhook — correct route: PUT /insurer/profile/api-config
  const handleUpdateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.put('/insurer/profile/api-config', { apiEndpoint });
      const updated = res.data;
      setProfile(updated);
      setApiEndpoint(updated.apiEndpoint || apiEndpoint);
      triggerToast('success', 'Webhook endpoint configured successfully.');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to configure webhook.';
      triggerToast('danger', msg);
    }
  };

  // Regenerate token — correct route: POST /insurer/profile/regenerate-token
  // Response: { apiToken: string }
  const handleRegenerateToken = async () => {
    setGeneratingToken(true);
    try {
      const res = await api.post('/insurer/profile/regenerate-token');
      const newToken = res.data.apiToken;  // backend returns { apiToken }
      setSecretToken(newToken);
      triggerToast('warning', 'Token regenerated — update your webhook authorization headers.');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Token generation failed.';
      triggerToast('danger', msg);
    } finally {
      setGeneratingToken(false);
    }
  };

  // Toggle integration — correct route: PUT /insurer/profile/integration-toggle
  const handleToggleIntegration = async () => {
    const next = !integrationActive;
    setIntegrationActive(next); // optimistic
    try {
      const res = await api.put('/insurer/profile/integration-toggle', { active: next });
      const updated = res.data;
      setProfile(updated);
      setIntegrationActive(updated.integrationActive);
      triggerToast(
        updated.integrationActive ? 'success' : 'warning',
        updated.integrationActive
          ? 'Integration restored. Validation gateway is live.'
          : 'Integration suspended. All B2B handshakes are blocked.'
      );
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      setIntegrationActive(!next); // rollback
      const msg = err?.response?.data?.error || 'Failed to toggle integration.';
      triggerToast('danger', msg);
    }
  };

  // Terminate session — correct route: POST /auth/sessions/:id/terminate
  const handleTerminateSession = async (sessionId: string) => {
    try {
      await api.post(`/auth/sessions/${sessionId}/terminate`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      triggerToast('danger', 'Session terminated successfully.');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to terminate session.';
      triggerToast('danger', msg);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerToast('success', 'Token copied to clipboard.');
  };

  const inputClass = "w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all";

  if (loading || !profile) {
    return (
      <div className="space-y-5">
        <div className="h-7 w-36 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-80 bg-white border border-slate-100 rounded-xl animate-pulse" />
          <div className="h-80 bg-white border border-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your integration, webhook, device sessions, and exports.</p>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-5 right-5 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg z-50 text-sm font-medium border ${
              toast.type === 'success' ? 'bg-slate-900 border-emerald-700/40 text-emerald-400' :
              toast.type === 'warning' ? 'bg-slate-900 border-amber-700/40 text-amber-400' :
              'bg-slate-900 border-red-700/40 text-red-400'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={14} /> : <ShieldAlert size={14} />}
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-5">

          {/* Master sync toggle */}
          <div className="bg-slate-900 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600 rounded-lg"><SettingsIcon size={15} className="text-white" /></div>
                <div>
                  <p className="text-sm font-semibold text-white">Master Sync Connection</p>
                  <p className="text-[10px] text-red-400 font-medium uppercase tracking-wider mt-0.5">IUC15 — Gateway Kill Switch</p>
                </div>
              </div>
              <button
                onClick={handleToggleIntegration}
                className="focus:outline-none active:scale-95 transition-transform"
              >
                {integrationActive
                  ? <ToggleRight size={40} className="text-red-500" />
                  : <ToggleLeft size={40} className="text-slate-600" />}
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${integrationActive ? 'bg-emerald-400' : 'bg-red-500'}`} />
              <p className="text-xs text-slate-400">
                Status: <span className={`font-semibold ${integrationActive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {integrationActive ? 'Active — Gateway online' : 'Suspended — All handshakes blocked'}
                </span>
              </p>
            </div>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Toggle <strong className="text-slate-300">OFF</strong> to immediately block all B2B member validation handshakes across the Sentinel gateway.
            </p>
          </div>

          {/* Company profile */}
          <div className="bg-white border border-slate-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building size={15} className="text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900">Company Profile</h3>
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Support Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={submittingProfile}
                className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
              >
                {submittingProfile && <Loader2 size={13} className="animate-spin" />}
                Save Profile
              </button>
            </form>
          </div>

          {/* Webhook config */}
          <div className="bg-white border border-slate-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={15} className="text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900">Webhook Configuration</h3>
            </div>
            <form onSubmit={handleUpdateWebhook} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">B2B Endpoint URL</label>
                <input
                  type="url"
                  value={apiEndpoint}
                  onChange={e => setApiEndpoint(e.target.value)}
                  required
                  placeholder="https://api.example.com/validate"
                  className={inputClass}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-600">API Token</label>
                  <button
                    type="button"
                    onClick={handleRegenerateToken}
                    disabled={generatingToken}
                    className="text-xs text-red-600 font-medium hover:underline disabled:opacity-50"
                  >
                    {generatingToken ? 'Regenerating...' : 'Regenerate'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={secretToken}
                    className={`${inputClass} font-mono text-xs text-slate-500 flex-1 truncate`}
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(secretToken)}
                    title="Copy token"
                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors shrink-0"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Save Webhook Config
              </button>
            </form>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-5">

          {/* Active sessions */}
          <div className="bg-white border border-slate-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Laptop size={15} className="text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900">Active Device Sessions</h3>
              <span className="ml-auto text-xs text-slate-400">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
            </div>

            {sessions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No active sessions found.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {sessions.map(s => (
                  <div key={s.id} className="py-3.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Laptop size={14} className="text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        {/* backend field is 'device', not 'deviceName' */}
                        <p className="text-sm font-medium text-slate-800 truncate">{s.device || s.deviceName || 'Unknown Device'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {s.ipAddress} · {s.lastActive ? new Date(s.lastActive).toLocaleTimeString() : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTerminateSession(s.id)}
                      title="Terminate session"
                      className="p-1.5 rounded-md border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Compliance info card */}
          <div className="bg-white border border-slate-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={15} className="text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-900">Integration Status</h3>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Company</span>
                <span className="font-medium text-slate-800">{profile.companyName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Tax ID</span>
                <span className="font-medium text-slate-800">{profile.taxId || '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Support Phone</span>
                <span className="font-medium text-slate-800">{profile.supportPhone || '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Gateway</span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  integrationActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                  {integrationActive ? 'Online' : 'Suspended'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Endpoint</span>
                <span className="text-xs text-slate-400 truncate max-w-[160px]" title={profile.apiEndpoint}>
                  {profile.apiEndpoint ? new URL(profile.apiEndpoint).hostname : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Exports */}
          <div className="bg-white border border-slate-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1.5">
              <FileDown size={15} className="text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900">Data Export Center</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">Download compliance CSV files directly from the database.</p>

            <div className="space-y-2.5">
              <a
                href="http://localhost:5050/api/analytics/export-csv?type=claims"
                download
                className="flex items-center justify-between p-3.5 border border-slate-200 rounded-lg hover:border-red-300 hover:bg-red-50/30 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <FileDown size={14} className="text-red-600" />
                  <span className="text-sm font-medium text-slate-700">Claims CSV Export</span>
                </div>
                <ArrowRight size={13} className="text-slate-400 group-hover:text-red-500 transition-colors" />
              </a>

              <a
                href="http://localhost:5050/api/analytics/export-csv?type=policies"
                download
                className="flex items-center justify-between p-3.5 border border-slate-200 rounded-lg hover:border-red-300 hover:bg-red-50/30 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <FileDown size={14} className="text-red-600" />
                  <span className="text-sm font-medium text-slate-700">Policies CSV Export</span>
                </div>
                <ArrowRight size={13} className="text-slate-400 group-hover:text-red-500 transition-colors" />
              </a>

              <button
                onClick={() => window.print()}
                className="w-full flex items-center justify-center gap-2 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-600 transition-colors"
              >
                <Printer size={14} />
                Print / PDF Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
