import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { 
  Search, 
  Filter, 
  BellRing, 
  DollarSign, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Globe,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Policy {
  id: string;
  policyNumber: string;
  holderName: string;
  holderEmail: string;
  planName: string;
  premiumAmount: number;
  premiumDueDate: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'GRACE_PERIOD' | 'EXPIRED' | 'SUSPENDED';
  renewalOffered: boolean;
  renewalProbability: number;
  createdAt: string;
}

export default function PoliciesCenter() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [validateQuery, setValidateQuery] = useState('POL-908123-HP');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validationLoading, setValidationLoading] = useState(false);

  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'danger' | 'warning'; text: string } | null>(null);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const res = await api.get('/policies', {
        params: { status: statusFilter || undefined, search: searchTerm || undefined }
      });
      setPolicies(res.data);
    } catch (err) {
      console.error('Failed to load policies register:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPolicies(); }, [searchTerm, statusFilter]);

  const triggerAlert = (type: 'success' | 'danger' | 'warning', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 4500);
  };

  const handleValidateHandshake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateQuery) return;
    setValidationLoading(true);
    setValidationResult(null);
    setTimeout(async () => {
      try {
        const res = await api.post('/policies/validate', { policyNumber: validateQuery });
        setValidationResult(res.data);
      } catch (err: any) {
        const errData = err.response?.data;
        if (errData?.error === 'INTEGRATION_SUSPENDED') {
          setValidationResult({ isValid: false, suspendedError: true, message: errData.message });
        } else {
          setValidationResult({ isValid: false, message: 'Validation handshake timeout.' });
        }
      } finally {
        setValidationLoading(false);
      }
    }, 1200);
  };

  const handleSyncReminders = async (id: string) => {
    try {
      const res = await api.post(`/policies/${id}/sync-reminders`);
      triggerAlert('success', res.data.message);
      fetchPolicies();
    } catch { triggerAlert('danger', 'Failed to dispatch premium reminders.'); }
  };

  const handleRegisterPayment = async (id: string) => {
    try {
      const res = await api.post(`/policies/${id}/payment`);
      triggerAlert('success', res.data.message);
      fetchPolicies();
    } catch { triggerAlert('danger', 'Failed to record premium payment.'); }
  };

  const handleTriggerRenewal = async (id: string) => {
    try {
      const res = await api.post(`/policies/${id}/renew`);
      triggerAlert('success', res.data.message);
      fetchPolicies();
    } catch { triggerAlert('danger', 'Renewal extension failed.'); }
  };

  const handleStatusOverride = async (id: string, newStatus: string) => {
    try {
      await api.put(`/policies/${id}/status`, { status: newStatus });
      triggerAlert('warning', `Policy status updated to: ${newStatus}`);
      fetchPolicies();
    } catch { triggerAlert('danger', 'Status override failed.'); }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':       return 'bg-emerald-100 text-emerald-700';
      case 'GRACE_PERIOD': return 'bg-amber-100 text-amber-700';
      case 'EXPIRED':      return 'bg-red-100 text-red-700';
      default:             return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="space-y-5 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Linked Policies</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage policyholders, dispatch reminders, and validate coverage.</p>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {alertMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium ${
              alertMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              alertMsg.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
              'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <span>{alertMsg.text}</span>
            <button onClick={() => setAlertMsg(null)} className="text-xs opacity-60 hover:opacity-100 ml-4">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Validation Sandbox */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
            <div className="bg-slate-900 px-5 py-4">
              <div className="flex items-center gap-2.5 mb-1">
                <Globe size={15} className="text-red-400" />
                <h3 className="text-sm font-semibold text-white">Policy Validation</h3>
              </div>
              <p className="text-xs text-slate-400">IUC04 — Query the Sentinel authorization gateway</p>
            </div>

            <div className="p-5">
              <form onSubmit={handleValidateHandshake} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Policy Number</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={validateQuery}
                      onChange={e => setValidateQuery(e.target.value)}
                      required
                      placeholder="e.g. POL-908123-HP"
                      className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={validationLoading}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors flex items-center"
                    >
                      {validationLoading ? <Loader2 size={14} className="animate-spin" /> : 'Query'}
                    </button>
                  </div>
                </div>
              </form>

              <p className="mt-4 text-xs text-slate-400">
                Try: <button onClick={() => setValidateQuery('POL-908123-HP')} className="text-red-600 hover:underline">POL-908123-HP</button>,{' '}
                <button onClick={() => setValidateQuery('POL-445892-HP')} className="text-red-600 hover:underline">POL-445892-HP</button>, or{' '}
                <button onClick={() => setValidateQuery('POL-231149-HP')} className="text-red-600 hover:underline">POL-231149-HP</button>
              </p>
            </div>
          </div>

          {/* Validation Result */}
          <AnimatePresence>
            {validationResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className={`bg-white border rounded-xl p-4 ${
                  validationResult.suspendedError ? 'border-red-200' :
                  validationResult.isValid ? 'border-emerald-200' :
                  'border-red-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="shrink-0 mt-0.5">
                    {validationResult.suspendedError ? <AlertTriangle size={16} className="text-red-500" /> :
                     validationResult.isValid ? <CheckCircle2 size={16} className="text-emerald-600" /> :
                     <XCircle size={16} className="text-red-600" />}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {validationResult.suspendedError ? 'Endpoint Offline' :
                       validationResult.isValid ? 'Coverage Verified' : 'Validation Failed'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{validationResult.message}</p>
                    {validationResult.policy && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-slate-500">Holder</span><span className="font-medium text-slate-800">{validationResult.policy.holderName}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Plan</span><span className="font-medium text-slate-800">{validationResult.policy.planName}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Valid</span><span className="font-medium text-slate-800">{validationResult.policy.startDate} – {validationResult.policy.endDate}</span></div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Status</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge(validationResult.policy.status)}`}>{validationResult.policy.status}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Policies Table */}
        <div className="xl:col-span-2">
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
            {/* Table controls */}
            <div className="flex flex-col sm:flex-row gap-3 px-5 py-3.5 border-b border-slate-100">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, plan..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
                />
              </div>
              <div className="relative shrink-0">
                <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="pl-8 pr-8 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="GRACE_PERIOD">Grace Period</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="py-3 px-5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Policy</th>
                    <th className="py-3 px-5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Holder</th>
                    <th className="py-3 px-5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Premium</th>
                    <th className="py-3 px-5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {policies.length > 0 ? policies.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-5 text-sm font-semibold text-slate-900">{p.policyNumber}</td>
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-xs font-semibold shrink-0">
                            {p.holderName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{p.holderName}</p>
                            <p className="text-xs text-slate-400">{p.holderEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <p className="text-sm font-medium text-slate-900">${p.premiumAmount.toFixed(2)}</p>
                        <p className="text-xs text-slate-400">Due {p.premiumDueDate}</p>
                      </td>
                      <td className="py-3 px-5">
                        <select
                          value={p.status}
                          onChange={e => handleStatusOverride(p.id, e.target.value)}
                          className={`text-[11px] font-medium px-2.5 py-1 rounded-full border-0 outline-none cursor-pointer appearance-none ${statusBadge(p.status)}`}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="GRACE_PERIOD">GRACE</option>
                          <option value="EXPIRED">EXPIRED</option>
                          <option value="SUSPENDED">SUSPENDED</option>
                        </select>
                      </td>
                      <td className="py-3 px-5 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSyncReminders(p.id)}
                            title="Send premium reminder"
                            className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                          >
                            <BellRing size={13} />
                          </button>
                          {(p.status === 'GRACE_PERIOD' || p.status === 'EXPIRED') && (
                            <button
                              onClick={() => handleRegisterPayment(p.id)}
                              title="Register payment"
                              className="p-1.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                            >
                              <DollarSign size={13} />
                            </button>
                          )}
                          {p.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleTriggerRenewal(p.id)}
                              title="Renew policy"
                              className="p-1.5 rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            >
                              <RefreshCw size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-slate-400">
                        No policies found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
