import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { 
  ShieldCheck, 
  Users, 
  FileText, 
  DollarSign, 
  Clock, 
  Activity,
  ArrowUpRight,
  TrendingUp,
  BrainCircuit,
  Zap,
  Calendar,
  Layers,
  Percent,
  ArrowRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { motion } from 'framer-motion';

export default function DashboardIndex() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [priorityClaims, setPriorityClaims] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [kpiRes, trendsRes, claimsRes, auditRes] = await Promise.all([
          api.get('/analytics/kpi'),
          api.get('/analytics/trends'),
          api.get('/claims'),
          api.get('/auth/audit-logs')
        ]);

        setKpis(kpiRes.data);
        setTrends(trendsRes.data);
        setPriorityClaims(claimsRes.data.filter((c: any) => c.status === 'UNDER_REVIEW' || c.status === 'SUBMITTED').slice(0, 4));
        setAuditLogs(auditRes.data.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const COLORS = ['#ef4444', '#f59e0b', '#6366f1', '#64748b'];

  if (loading || !kpis) {
    return (
      <div className="space-y-5">
        <div className="h-7 w-40 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-white border border-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-72 bg-white border border-slate-100 rounded-xl animate-pulse" />
          <div className="h-72 bg-white border border-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  const kpiCards = [
    { label: 'Active Policies', value: kpis.policies.active, sub: `${kpis.policies.total} total`, icon: <ShieldCheck size={16} />, color: 'red' },
    { label: 'Members', value: kpis.policies.active, sub: '100% validated', icon: <Users size={16} />, color: 'emerald' },
    { label: 'Pending Claims', value: kpis.claims.pending, sub: 'Awaiting review', icon: <FileText size={16} />, color: 'amber' },
    { label: 'Premiums', value: `$${(kpis.financials.monthlyPremium / 1000).toFixed(1)}k`, sub: 'Collected monthly', icon: <DollarSign size={16} />, color: 'violet' },
    { label: 'Avg TAT', value: `${kpis.ratios.averageTatDays}d`, sub: `${kpis.ratios.approvalRate}% approved`, icon: <Clock size={16} />, color: 'sky' },
    { label: 'API Uptime', value: kpis.ratios.apiUptime > 0 ? `${kpis.ratios.apiUptime}%` : 'Offline', sub: kpis.ratios.apiHealthStatus, icon: <Activity size={16} />, color: kpis.ratios.apiUptime > 0 ? 'emerald' : 'red' },
  ];

  const colorMap: Record<string, { icon: string; text: string; bg: string }> = {
    red:     { icon: 'bg-red-50 text-red-600',     text: 'text-red-600',     bg: '' },
    emerald: { icon: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-600', bg: '' },
    amber:   { icon: 'bg-amber-50 text-amber-600',  text: 'text-amber-600',  bg: '' },
    violet:  { icon: 'bg-violet-50 text-violet-600', text: 'text-violet-600', bg: '' },
    sky:     { icon: 'bg-sky-50 text-sky-600',       text: 'text-sky-600',    bg: '' },
  };

  return (
    <div className="space-y-5 pb-8">
      
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Welcome back! Here's your insurance panel overview.</p>
        </div>
        <button
          onClick={() => navigate('/ai-hub')}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          <BrainCircuit size={14} />
          Launch AI
          <ArrowUpRight size={13} />
        </button>
      </div>

      {/* KPI CARDS */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        {kpiCards.map((card, i) => {
          const c = colorMap[card.color] || colorMap.red;
          return (
            <motion.div
              key={i}
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
              className="bg-white border border-slate-100 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500 font-medium">{card.label}</span>
                <span className={`p-1.5 rounded-lg ${c.icon}`}>{card.icon}</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 leading-none">{card.value}</div>
              <div className={`text-xs mt-1.5 ${c.text}`}>{card.sub}</div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ANALYTICS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Area Chart */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Claims Volume</h3>
              <p className="text-xs text-slate-500 mt-0.5">Submitted vs Approved by month</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2 rounded bg-red-500" /> Submitted</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2 rounded bg-violet-500" /> Approved</span>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends?.claimsMonthlyVolume || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradViolet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    background: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                  }}
                  cursor={{ stroke: '#e2e8f0' }}
                />
                <Area type="monotone" dataKey="valueSubmitted" stroke="#ef4444" strokeWidth={1.5} fill="url(#gradRed)" name="Submitted ($)" />
                <Area type="monotone" dataKey="valueApproved" stroke="#6366f1" strokeWidth={1.5} fill="url(#gradViolet)" name="Approved ($)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-white border border-slate-100 rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Claims Breakdown</h3>
            <p className="text-xs text-slate-500 mt-0.5">Adjudication ratios this month</p>
          </div>
          <div className="h-44 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trends?.claimAdjudicationRatios || []}
                  cx="50%" cy="50%"
                  innerRadius={52} outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {(trends?.claimAdjudicationRatios || []).map((_entry: any, index: number) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center text-center pointer-events-none">
              <span className="text-xl font-bold text-slate-900">{kpis.ratios.approvalRate}%</span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Approved</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-3 pt-3 border-t border-slate-100">
            {(trends?.claimAdjudicationRatios || []).map((entry: any, index: number) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[index % COLORS.length] }} />
                <span className="truncate">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LOWER SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left 2/3: Claims queue + Audit logs */}
        <div className="lg:col-span-2 space-y-4">

          {/* Claims queue */}
          <div className="bg-white border border-slate-100 rounded-xl">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-red-50"><Zap size={14} className="text-red-600" /></span>
                <h3 className="text-sm font-semibold text-slate-900">Priority Claims Queue</h3>
              </div>
              <button
                onClick={() => navigate('/claims')}
                className="inline-flex items-center gap-1 text-xs text-red-600 font-medium hover:underline"
              >
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {priorityClaims.length > 0 ? priorityClaims.map(c => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-slate-900">{c.claimNumber}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        c.urgencyRanking === 'CRITICAL' || c.urgencyRanking === 'HIGH'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}>
                        {c.urgencyRanking}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{c.memberName} · {c.diagnosis}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className="text-sm font-semibold text-slate-900">${c.amountRequested.toLocaleString()}</span>
                    <p className="text-xs text-slate-400 mt-0.5">Risk: <span className={c.fraudRiskScore > 50 ? 'text-red-600 font-medium' : 'text-slate-500'}>{c.fraudRiskScore}%</span></p>
                  </div>
                </div>
              )) : (
                <div className="px-5 py-8 text-center text-sm text-slate-400">No pending claims in queue</div>
              )}
            </div>
          </div>

          {/* Audit logs */}
          <div className="bg-white border border-slate-100 rounded-xl">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-slate-50"><Layers size={14} className="text-slate-600" /></span>
                <h3 className="text-sm font-semibold text-slate-900">Compliance Audit Log</h3>
              </div>
              <button onClick={() => navigate('/settings')} className="inline-flex items-center gap-1 text-xs text-red-600 font-medium hover:underline">
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {auditLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 leading-relaxed">
                      <span className="font-semibold">{log.userName}</span> <span className="text-slate-400">({log.userRole?.replace('_', ' ')})</span>: {log.details}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1"><Calendar size={9} /> {new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span>·</span>
                      <span>{log.ipAddress}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1/3: AI Insights panel */}
        <div className="bg-slate-900 rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="p-2 rounded-lg bg-red-600"><BrainCircuit size={15} className="text-white" /></span>
            <div>
              <h3 className="text-sm font-semibold text-white">Sentinel AI</h3>
              <span className="text-[10px] text-red-400 font-medium">Live Intelligence Feed</span>
            </div>
          </div>

          <div className="space-y-3 flex-1">
            <div className="bg-white/5 rounded-lg p-3.5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp size={11} className="text-red-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-red-400">Fraud Alert</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                North Region spine therapy invoices spiked <span className="text-red-400 font-semibold">12%</span>. Risk filters updated.
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-3.5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-1.5 mb-1.5">
                <ShieldCheck size={11} className="text-emerald-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400">Renewals</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Corporate group renewal probability at <span className="text-emerald-400 font-semibold">98.4%</span> this cycle.
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-3.5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Percent size={11} className="text-amber-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-400">Latency</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Validation endpoint healthy at <span className="text-amber-400 font-semibold">42ms</span>.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/ai-hub')}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Explore AI Hub
            <ArrowUpRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
