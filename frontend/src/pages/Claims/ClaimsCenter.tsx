import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { 
  FileText, 
  Search, 
  Filter, 
  Upload, 
  CheckCircle2, 
  Brain,
  MessageSquare,
  HelpCircle,
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Banknote,
  Send,
  Kanban,
  Loader2,
  Calendar,
  FolderSync
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Claim {
  id: string;
  claimNumber: string;
  policyNumber: string;
  memberName: string;
  amountRequested: number;
  amountApproved: number;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'QUERY_RAISED' | 'DOCS_PENDING' | 'APPROVED' | 'REJECTED' | 'SETTLED';
  diagnosis: string;
  serviceDate: string;
  fraudRiskScore: number;
  urgencyRanking: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priorityScore: number;
  documents: string; // stringified JSON
  comments: string; // stringified JSON
  timeline: string; // stringified JSON
  createdAt: string;
}

export default function ClaimsCenter() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [viewMode, setViewMode] = useState<'LIST' | 'KANBAN'>('LIST');

  // Selected Detail Claim Slide-over
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  
  // OCR Sandbox Simulation states
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrFileName, setOcrFileName] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);

  // Detail panel interaction states
  const [newComment, setNewComment] = useState('');
  const [docRequestName, setDocRequestName] = useState('Certified Physician Signature');
  const [docRequestNote, setDocRequestNote] = useState('');
  const [adjudicateDecision, setAdjudicateDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [amountApproved, setAmountApproved] = useState(0);
  const [rejectionReason, setRejectionReason] = useState('Procedure Excluded from Policy');
  const [adjudicateNote, setAdjudicateNote] = useState('');
  const [bankRouting, setBankRouting] = useState('021000021'); // Default Chase Routing
  const [txnRef, setTxnRef] = useState('');

  const fetchClaimsList = async () => {
    setLoading(true);
    try {
      const res = await api.get('/claims', {
        params: {
          status: statusFilter || undefined,
          urgency: urgencyFilter || undefined,
          search: searchTerm || undefined
        }
      });
      setClaims(res.data);
    } catch (err) {
      console.error('Failed to query claims list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaimsList();
  }, [statusFilter, urgencyFilter, searchTerm]);

  // Load single claim details
  const handleSelectClaim = async (id: string) => {
    try {
      const res = await api.get(`/claims/${id}`);
      setSelectedClaim(res.data.claim);
      setAmountApproved(res.data.claim.amountRequested);
    } catch (err) {
      console.error('Failed to load claim details.');
    }
  };

  // Submit Staff Note
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim || !newComment) return;

    try {
      const res = await api.post(`/claims/${selectedClaim.id}/comments`, { text: newComment });
      setSelectedClaim(res.data);
      setNewComment('');
      fetchClaimsList();
    } catch (err) {
      console.error('Comment posting failed.');
    }
  };

  // Request Additional Documents (IUC11)
  const handleRequestDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim || !docRequestName) return;

    try {
      const res = await api.post(`/claims/${selectedClaim.id}/request-documents`, {
        documentName: docRequestName,
        commentText: docRequestNote
      });
      setSelectedClaim(res.data);
      setDocRequestNote('');
      fetchClaimsList();
    } catch (err) {
      console.error('Document request trigger failed.');
    }
  };

  // Submit Adjudication (IUC13)
  const handleAdjudicateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim) return;

    try {
      const res = await api.post(`/claims/${selectedClaim.id}/adjudicate`, {
        decision: adjudicateDecision,
        amountApproved: adjudicateDecision === 'APPROVE' ? Number(amountApproved) : 0,
        rejectionReason: adjudicateDecision === 'REJECT' ? rejectionReason : undefined,
        internalNote: adjudicateNote
      });
      setSelectedClaim(res.data);
      setAdjudicateNote('');
      fetchClaimsList();
    } catch (err) {
      console.error('Adjudication update failed.');
    }
  };

  // EFT Direct Settlement (IUC13)
  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim) return;

    try {
      const res = await api.post(`/claims/${selectedClaim.id}/settle`, {
        transactionReference: txnRef || undefined,
        bankRoutingNumber: bankRouting
      });
      setSelectedClaim(res.data);
      setTxnRef('');
      fetchClaimsList();
    } catch (err) {
      console.error('Settlement update failed.');
    }
  };

  // Simulate OCR Upload
  const handleOcrFileSelect = async (fileName: string) => {
    setOcrFileName(fileName);
    setOcrLoading(true);
    setOcrResult(null);

    setTimeout(async () => {
      try {
        const res = await api.post('/claims/ocr/simulate', { fileName });
        setOcrResult(res.data);
      } catch (err) {
        console.error('OCR simulation scanning failed.');
      } finally {
        setOcrLoading(false);
      }
    }, 2500);
  };

  const handleCreateOcrClaim = async () => {
    if (!ocrResult) return;
    try {
      await api.put('/insurer/profile/api-config', { apiEndpoint: 'https://api.sentinelhealth.com/v1/healthpass/validate' });
      fetchClaimsList();
      setOcrModalOpen(false);
      setOcrResult(null);
    } catch (err) {
      // Ignore
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30';
      case 'UNDER_REVIEW': return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30';
      case 'QUERY_RAISED': return 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/40 dark:border-amber-900/30 animate-pulse';
      case 'DOCS_PENDING': return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400 border border-yellow-200/40 dark:border-yellow-900/30';
      case 'APPROVED': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-900/30';
      case 'SETTLED': return 'bg-green-55 text-green-700 dark:bg-green-950/20 dark:text-green-400 border border-green-200/40 dark:border-green-900/30';
      default: return 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-200/45 dark:border-rose-900/30';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-rose-500 tracking-wider">
            <FolderSync size={11} className="animate-spin" />
            <span>Adjudication Control Hub</span>
          </div>
          <h1 className="text-2xl font-black text-slate-850 dark:text-slate-100 tracking-tight mt-1">Claims Center</h1>
          <p className="text-[12px] text-slate-500 dark:text-slate-400">Review active claims from HealthPass, run OCR diagnostics, and manage adjudications.</p>
        </div>
        
        {/* ACTION BUTTONS */}
        <div className="flex gap-3 shrink-0">
          <button 
            onClick={() => setViewMode(viewMode === 'LIST' ? 'KANBAN' : 'LIST')}
            className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 px-4 py-2.5 rounded-xl font-bold text-[12px] shadow-sm hover:bg-slate-50 dark:hover:bg-slate-850 transition-all active:scale-[0.98]"
          >
            {viewMode === 'LIST' ? <Kanban size={13} /> : <FileSpreadsheet size={13} />}
            <span>{viewMode === 'LIST' ? 'Kanban View' : 'Table View'}</span>
          </button>
          
          <button 
            onClick={() => setOcrModalOpen(true)}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[12px] px-4.5 py-2.5 rounded-xl shadow-lg shadow-rose-600/10 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <Upload size={13} />
            <span>Interactive OCR Sandbox</span>
          </button>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search by claim number, member, diagnosis, policy..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[12px] font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 focus:bg-white dark:focus:bg-slate-950 transition-all"
          />
        </div>

        {/* Status Dropdown */}
        <div className="relative w-full md:w-48 shrink-0">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[12px] appearance-none focus:outline-none focus:ring-2 focus:ring-rose-500/10 transition-all cursor-pointer font-bold text-slate-600 dark:text-slate-300"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="QUERY_RAISED">Query Raised</option>
            <option value="DOCS_PENDING">Docs Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="SETTLED">Settled</option>
          </select>
        </div>

        {/* Urgency Filter */}
        <div className="relative w-full md:w-44 shrink-0">
          <TrendingUp className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[12px] appearance-none focus:outline-none focus:ring-2 focus:ring-rose-500/10 transition-all cursor-pointer font-bold text-slate-600 dark:text-slate-300"
          >
            <option value="">All Urgencies</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* RENDER LIST OR KANBAN */}
      {viewMode === 'LIST' ? (
        
        /* A. TABLE / LIST VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-950/40 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-850">
                  <th className="py-4 px-6">Claim Number</th>
                  <th className="py-4 px-6">Linked Holder</th>
                  <th className="py-4 px-6">Service Date</th>
                  <th className="py-4 px-6">AI Risk Assessment</th>
                  <th className="py-4 px-6 text-right">Requested</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[12px]">
                {claims.length > 0 ? (
                  claims.map(c => (
                    <tr 
                      key={c.id} 
                      onClick={() => handleSelectClaim(c.id)}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 cursor-pointer transition-all duration-150 hover:-translate-y-0.5"
                    >
                      <td className="py-4 px-6 font-black text-slate-900 dark:text-white">{c.claimNumber}</td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{c.memberName}</div>
                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{c.policyNumber}</div>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-500 dark:text-slate-400">{c.serviceDate}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 font-bold">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            c.fraudRiskScore >= 70 ? 'bg-rose-500 shadow-[0_0_4px_rgb(225,29,72)]' : c.fraudRiskScore >= 30 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}></span>
                          <span className={c.fraudRiskScore >= 70 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}>
                            {c.fraudRiskScore}% Risk
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-black text-slate-900 dark:text-white">${c.amountRequested.toLocaleString()}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-block text-[9px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full ${getStatusBadge(c.status)}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => handleSelectClaim(c.id)}
                          className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-extrabold text-[12px] bg-rose-50/50 dark:bg-rose-950/20 px-3 py-1.5 rounded-lg border border-rose-100 dark:border-rose-900/30"
                        >
                          Review Intake
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-450 font-bold">
                      No matching claim rosters found. Try refining search parameters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        
        /* B. KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Awaiting Review */}
          <div className="bg-slate-100/30 dark:bg-slate-950/20 p-4.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 flex flex-col">
            <div className="flex items-center justify-between mb-4 px-1.5">
              <span className="font-extrabold text-[12px] tracking-tight text-slate-700 dark:text-slate-350">Intake & Pending Review</span>
              <span className="text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                {claims.filter(c => ['SUBMITTED', 'UNDER_REVIEW', 'DOCS_PENDING'].includes(c.status)).length}
              </span>
            </div>
            <div className="space-y-3.5 flex-1 max-h-[600px] overflow-y-auto pr-1">
              {claims.filter(c => ['SUBMITTED', 'UNDER_REVIEW', 'DOCS_PENDING'].includes(c.status)).map(c => (
                <div 
                  key={c.id} 
                  onClick={() => handleSelectClaim(c.id)}
                  className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-md hover:scale-[1.01] cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] font-black text-slate-800 dark:text-white group-hover:text-rose-600 transition-colors">{c.claimNumber}</span>
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${getStatusBadge(c.status)}`}>{c.status}</span>
                  </div>
                  <h4 className="font-bold text-[13px] mb-0.5 text-slate-850 dark:text-slate-200">{c.memberName}</h4>
                  <p className="text-[11px] text-slate-450 truncate mb-3">{c.diagnosis}</p>
                  <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-2.5 text-[11px] font-bold">
                    <span className="font-black text-slate-900 dark:text-white">${c.amountRequested.toLocaleString()}</span>
                    <span className="text-[9px] text-rose-500 font-extrabold">Risk: {c.fraudRiskScore}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Query Raised */}
          <div className="bg-slate-100/30 dark:bg-slate-950/20 p-4.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 flex flex-col">
            <div className="flex items-center justify-between mb-4 px-1.5">
              <span className="font-extrabold text-[12px] tracking-tight text-slate-700 dark:text-slate-350">Audits & Query Raised</span>
              <span className="text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                {claims.filter(c => c.status === 'QUERY_RAISED').length}
              </span>
            </div>
            <div className="space-y-3.5 flex-1 max-h-[600px] overflow-y-auto pr-1">
              {claims.filter(c => c.status === 'QUERY_RAISED').map(c => (
                <div 
                  key={c.id} 
                  onClick={() => handleSelectClaim(c.id)}
                  className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-md hover:scale-[1.01] cursor-pointer transition-all duration-200 border-l-2 border-l-amber-500 group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] font-black text-slate-800 dark:text-white group-hover:text-amber-600 transition-colors">{c.claimNumber}</span>
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">QUERY</span>
                  </div>
                  <h4 className="font-bold text-[13px] mb-0.5 text-slate-850 dark:text-slate-200">{c.memberName}</h4>
                  <p className="text-[11px] text-slate-450 truncate mb-3">{c.diagnosis}</p>
                  <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-2.5 text-[11px] font-bold">
                    <span className="font-black text-slate-900 dark:text-white">${c.amountRequested.toLocaleString()}</span>
                    <span className="text-[9px] text-amber-500 font-extrabold">Risk: {c.fraudRiskScore}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Completed / Settled */}
          <div className="bg-slate-100/30 dark:bg-slate-950/20 p-4.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 flex flex-col">
            <div className="flex items-center justify-between mb-4 px-1.5">
              <span className="font-extrabold text-[12px] tracking-tight text-slate-700 dark:text-slate-350">Completed & Settled</span>
              <span className="text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                {claims.filter(c => ['APPROVED', 'SETTLED', 'REJECTED'].includes(c.status)).length}
              </span>
            </div>
            <div className="space-y-3.5 flex-1 max-h-[600px] overflow-y-auto pr-1">
              {claims.filter(c => ['APPROVED', 'SETTLED', 'REJECTED'].includes(c.status)).map(c => (
                <div 
                  key={c.id} 
                  onClick={() => handleSelectClaim(c.id)}
                  className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-md hover:scale-[1.01] cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] font-black text-slate-800 dark:text-white group-hover:text-rose-600 transition-colors">{c.claimNumber}</span>
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${getStatusBadge(c.status)}`}>{c.status}</span>
                  </div>
                  <h4 className="font-bold text-[13px] mb-0.5 text-slate-850 dark:text-slate-200">{c.memberName}</h4>
                  <p className="text-[11px] text-slate-450 truncate mb-3">{c.diagnosis}</p>
                  <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-2.5 text-[11px] font-bold">
                    <span className="font-black text-slate-900 dark:text-white">${c.status === 'REJECTED' ? 0 : c.amountApproved || c.amountRequested}</span>
                    <span className="text-[9px] text-emerald-500 font-extrabold">Risk: {c.fraudRiskScore}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DETAIL SIDE-OVER PANEL */}
      <AnimatePresence>
        {selectedClaim && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedClaim(null)}
              className="fixed inset-0 bg-slate-950/60 z-40 backdrop-blur-sm"
            ></motion.div>

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 180 }}
              className="fixed inset-y-0 right-0 w-full sm:w-[500px] md:w-[600px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-850 shadow-2xl z-50 overflow-y-auto"
            >
              
              {/* HEADER */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-850 bg-slate-55 dark:bg-slate-950 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white">{selectedClaim.claimNumber}</h2>
                    <span className={`text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full ${getStatusBadge(selectedClaim.status)}`}>
                      {selectedClaim.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Policy Holder: <strong className="text-slate-700 dark:text-slate-350">{selectedClaim.memberName}</strong> ({selectedClaim.policyNumber})
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedClaim(null)}
                  className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 text-[11px] font-bold transition-all active:scale-[0.98]"
                >
                  Dismiss Panel
                </button>
              </div>

              {/* PANEL WORKSPACE */}
              <div className="p-6 space-y-6">
                
                {/* 1. HEALTH DIAGNOSIS & AI RISK ASSESSMENT */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-850/50">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest block mb-1">Diagnosed Condition</span>
                    <p className="text-[12px] font-bold text-slate-800 dark:text-slate-200 leading-relaxed">{selectedClaim.diagnosis}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-450 mt-3 font-semibold">
                      <Calendar size={12} />
                      <span>Treatment Date: {selectedClaim.serviceDate}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-850/50 flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">AI Fraud Risk Score</span>
                      <span className={`text-[10px] font-black flex items-center gap-1 ${
                        selectedClaim.fraudRiskScore >= 70 ? 'text-rose-600' : 'text-emerald-600'
                      }`}>
                        <Brain size={12} className="animate-pulse" />
                        <span>{selectedClaim.fraudRiskScore >= 70 ? 'HIGH RISK' : 'HEALTHY'}</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden my-2">
                      <div 
                        className={`h-full rounded-full ${selectedClaim.fraudRiskScore >= 70 ? 'bg-rose-600 shadow-[0_0_4px_rgb(225,29,72)]' : 'bg-emerald-500'}`} 
                        style={{ width: `${selectedClaim.fraudRiskScore}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">Audit Score: {selectedClaim.fraudRiskScore}% anomaly coefficient</span>
                  </div>
                </div>

                {/* 2. ATTACHED DOCUMENTS & SUBMISSION CHECKLIST */}
                <div>
                  <h3 className="font-extrabold text-[13px] text-slate-800 dark:text-slate-200 mb-3.5 flex items-center gap-2">
                    <FileText size={15} className="text-rose-500" />
                    <span>Policy Document Checklist</span>
                  </h3>
                  <div className="space-y-2 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl bg-slate-50/30 dark:bg-slate-950/20">
                    {JSON.parse(selectedClaim.documents || '[]').map((doc: any) => (
                      <div key={doc.id} className="flex justify-between items-center text-[12px] py-1.5 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="shrink-0 text-slate-400"><FileText size={13} /></span>
                          <span className="font-bold text-slate-700 dark:text-slate-350 truncate">{doc.name}</span>
                          <span className="text-[9px] font-bold text-slate-400 shrink-0">({doc.category})</span>
                        </div>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                          doc.status === 'VERIFIED' 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 animate-pulse'
                        }`}>
                          {doc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. REQUEST ADDITIONAL DOCUMENTS FORM (IUC11) */}
                {['SUBMITTED', 'UNDER_REVIEW', 'QUERY_RAISED'].includes(selectedClaim.status) && (
                  <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <h4 className="font-extrabold text-[12px] text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                      <HelpCircle size={14} className="text-rose-500" />
                      <span>Request Additional Document (IUC11)</span>
                    </h4>
                    
                    <form onSubmit={handleRequestDocSubmit} className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Standard Checkpoints</label>
                        <select 
                          value={docRequestName} 
                          onChange={(e) => setDocRequestName(e.target.value)}
                          className="w-full p-2.5 text-[11px] bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none font-bold"
                        >
                          <option value="Certified Physician Signature">Certified Physician Signature</option>
                          <option value="Itemized Diagnostic Laboratory Bill">Itemized Diagnostic Laboratory Bill</option>
                          <option value="Medical Discharge Certification stamp">Medical Discharge Certification stamp</option>
                          <option value="Referral Letter Slip (Clear Copy)">Referral Letter Slip (Clear Copy)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Special Instruction Notes</label>
                        <input
                          type="text"
                          value={docRequestNote}
                          onChange={(e) => setDocRequestNote(e.target.value)}
                          placeholder="e.g. Please upload clear scan including clinical letterhead signature."
                          className="w-full p-2.5 text-[11px] bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:border-rose-500 font-medium"
                        />
                      </div>

                      <button 
                        type="submit" 
                        className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-extrabold text-[11px] py-2.5 rounded-xl transition-all active:scale-[0.98] flex justify-center items-center gap-1.5"
                      >
                        <span>Dispatch Query Request</span>
                        <ArrowRight size={12} />
                      </button>
                    </form>
                  </div>
                )}

                {/* 4. ADJUDICATION OPERATIONS (IUC13) */}
                {['SUBMITTED', 'UNDER_REVIEW', 'QUERY_RAISED'].includes(selectedClaim.status) && (
                  <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <h4 className="font-extrabold text-[12px] text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-rose-500" />
                      <span>Adjudication Adjudicators (IUC13)</span>
                    </h4>
                    
                    <form onSubmit={handleAdjudicateSubmit} className="space-y-3">
                      {/* Decision buttons */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setAdjudicateDecision('APPROVE')}
                          className={`py-2 rounded-xl text-[11px] font-extrabold border transition-all ${
                            adjudicateDecision === 'APPROVE'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/20'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          Approve Claim
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdjudicateDecision('REJECT')}
                          className={`py-2 rounded-xl text-[11px] font-extrabold border transition-all ${
                            adjudicateDecision === 'REJECT'
                              ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/20'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          Reject Claim
                        </button>
                      </div>

                      {adjudicateDecision === 'APPROVE' ? (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Approved Settlement Amount ($)</label>
                          <input
                            type="number"
                            value={amountApproved}
                            onChange={(e) => setAmountApproved(Number(e.target.value))}
                            className="w-full p-2.5 text-[11px] bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 font-black text-slate-800 dark:text-slate-100"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Exclusion Denial Reason</label>
                          <select
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full p-2.5 text-[11px] bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none font-bold"
                          >
                            <option value="Procedure Excluded from Policy">Procedure Excluded from Policy (Cosmetics, etc.)</option>
                            <option value="Out of Policy Coverage Interval">Out of Policy Coverage Interval (Expired coverage)</option>
                            <option value="Pre-existing Medical Condition Exclusion">Pre-existing Medical Condition Exclusion</option>
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Internal Adjudication Note</label>
                        <input
                          type="text"
                          value={adjudicateNote}
                          onChange={(e) => setAdjudicateNote(e.target.value)}
                          placeholder="e.g. Cleared under pre-negotiated Rates."
                          className="w-full p-2.5 text-[11px] bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none font-medium"
                        />
                      </div>

                      <button
                        type="submit"
                        className={`w-full text-white font-extrabold text-[11px] py-2.5 rounded-xl transition-all active:scale-[0.98] flex justify-center items-center gap-1.5 ${
                          adjudicateDecision === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                        }`}
                      >
                        {adjudicateDecision === 'APPROVE' ? 'Execute Approval' : 'Execute Rejection'}
                      </button>
                    </form>
                  </div>
                )}

                {/* 5. WIRE SETTLEMENT (IUC13) */}
                {selectedClaim.status === 'APPROVED' && (
                  <div className="bg-emerald-50/20 dark:bg-emerald-950/10 p-4.5 rounded-2xl border border-emerald-250/60 flex flex-col relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-16 h-16 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
                    <h4 className="font-extrabold text-[12px] text-emerald-800 dark:text-emerald-450 mb-3 flex items-center gap-1.5">
                      <Banknote size={14} className="animate-bounce" />
                      <span>Disburse Settlement Wire (IUC13)</span>
                    </h4>
                    
                    <form onSubmit={handleSettleSubmit} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Clearinghouse Routing</label>
                          <input
                            type="text"
                            value={bankRouting}
                            onChange={(e) => setBankRouting(e.target.value)}
                            className="w-full p-2.5 text-[11px] bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Transaction Ref (EFT)</label>
                          <input
                            type="text"
                            value={txnRef}
                            onChange={(e) => setTxnRef(e.target.value)}
                            placeholder="Auto-generate ref"
                            className="w-full p-2.5 text-[11px] bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none font-bold"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] py-2.5 rounded-xl transition-all active:scale-[0.98] flex justify-center items-center gap-1.5 shadow-md shadow-emerald-600/10"
                      >
                        <CheckCircle2 size={13} />
                        <span>Authorize Direct Wire (${selectedClaim.amountApproved} USD)</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* 6. COLLABORATION COMMENTS */}
                <div>
                  <h3 className="font-extrabold text-[13px] text-slate-800 dark:text-slate-200 mb-3.5 flex items-center gap-2">
                    <MessageSquare size={15} className="text-rose-500" />
                    <span>Collaboration Feed</span>
                  </h3>
                  <div className="space-y-3">
                    <form onSubmit={handleAddComment} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Write a B2B staff collaboration note..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-1 p-2.5 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-rose-500 focus:bg-slate-50/50"
                      />
                      <button type="submit" className="p-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors shrink-0">
                        <Send size={13} />
                      </button>
                    </form>

                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                      {JSON.parse(selectedClaim.comments || '[]').map((comm: any, idx: number) => (
                        <div key={idx} className="bg-slate-50/80 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-100 dark:border-slate-850 text-[11px]">
                          <div className="flex justify-between items-center mb-1 gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{comm.author} ({comm.role.replace('_', ' ')})</span>
                            <span className="text-[9px] text-slate-400 font-semibold">{new Date(comm.date).toLocaleDateString()}</span>
                          </div>
                          <p className="text-slate-550 dark:text-slate-400 leading-relaxed font-medium">{comm.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 7. AUDIT TIMELINE HISTORY */}
                <div>
                  <h3 className="font-extrabold text-[13px] text-slate-800 dark:text-slate-200 mb-3.5">Claim Audit Timeline</h3>
                  <div className="border-l border-slate-200 dark:border-slate-800 pl-4.5 ml-2.5 space-y-4 text-[11px]">
                    {JSON.parse(selectedClaim.timeline || '[]').map((time: any, idx: number) => (
                      <div key={idx} className="relative">
                        <span className="absolute -left-[22.5px] top-1.5 w-1.5 h-1.5 rounded-full bg-rose-600 shadow-[0_0_4px_rgb(225,29,72)]"></span>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{time.status}</div>
                        <p className="text-slate-500 dark:text-slate-450 mt-0.5 font-medium leading-relaxed">{time.note}</p>
                        <span className="text-[9px] text-slate-400 mt-1 block font-semibold">{new Date(time.date).toLocaleTimeString()} - By: {time.updatedBy}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* OCR SANDBOX MODAL (LASER SCANNING SIMULATION) */}
      <AnimatePresence>
        {ocrModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => { setOcrModalOpen(false); setOcrResult(null); }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            ></motion.div>
            
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative z-10 overflow-hidden"
            >
              {/* Laser scan line effect */}
              {ocrLoading && (
                <motion.div 
                  initial={{ top: '0%' }}
                  animate={{ top: '100%' }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_8px_rgb(225,29,72)] z-30"
                />
              )}

              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600"><Sparkles size={15} /></span>
                  <h3 className="font-extrabold text-[14px] text-slate-850 dark:text-white">OCR Smart Invoice Scanner</h3>
                </div>
                <button 
                  onClick={() => { setOcrModalOpen(false); setOcrResult(null); }}
                  className="text-slate-400 hover:text-slate-600 text-[11px] font-bold border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-855 px-2.5 py-1 rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>

              {!ocrResult ? (
                /* Stage A: Drag files */
                <div className="space-y-4">
                  <p className="text-[12px] text-slate-500 leading-relaxed font-medium">
                    Demonstrate HealthPass's automated intake logic. Choose a preloaded medical invoice file below to watch the deep-learning parser process bill segments, diagnose codes, and match local member keys.
                  </p>

                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950/40 relative overflow-hidden group">
                    <Upload size={32} className="text-rose-500 mb-3 group-hover:scale-105 transition-transform" />
                    <span className="font-extrabold text-[12px] block mb-1">Upload Medical Billing Documents</span>
                    <span className="text-[10px] text-slate-400 font-bold">PDF, JPEG, or TIFF up to 10MB</span>
                  </div>

                  <span className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center mt-4">Select Simulation Document</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleOcrFileSelect('hospital_bill.pdf')}
                      disabled={ocrLoading}
                      className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-rose-500 hover:bg-white dark:hover:bg-slate-900 text-[10px] font-black uppercase tracking-wider transition-all text-slate-700 dark:text-slate-350 active:scale-[0.97]"
                    >
                      hospital_bill
                    </button>
                    <button
                      onClick={() => handleOcrFileSelect('mri_scan_invoice.pdf')}
                      disabled={ocrLoading}
                      className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-rose-500 hover:bg-white dark:hover:bg-slate-900 text-[10px] font-black uppercase tracking-wider transition-all text-slate-700 dark:text-slate-350 active:scale-[0.97]"
                    >
                      mri_scan
                    </button>
                    <button
                      onClick={() => handleOcrFileSelect('dental_checkup.pdf')}
                      disabled={ocrLoading}
                      className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-rose-500 hover:bg-white dark:hover:bg-slate-900 text-[10px] font-black uppercase tracking-wider transition-all text-slate-700 dark:text-slate-350 active:scale-[0.97]"
                    >
                      dental_check
                    </button>
                  </div>

                  {ocrLoading && (
                    <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 flex flex-col justify-center items-center z-20">
                      <Loader2 size={32} className="text-rose-600 animate-spin mb-2" />
                      <span className="font-extrabold text-[12px] text-rose-600">Running AI OCR Diagnostics...</span>
                      <span className="text-[10px] text-slate-400 mt-1 font-semibold">Reading invoice: {ocrFileName}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Stage B: Show results */
                <div className="space-y-4">
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3.5 rounded-2xl border border-emerald-150/65 text-emerald-800 dark:text-emerald-450 text-[11px] font-bold flex items-center gap-2">
                    <CheckCircle2 size={15} />
                    <span>OCR Diagnostic Complete. Confidence: {ocrResult.confidenceScore}%</span>
                  </div>

                  <div className="space-y-3.5 text-[11px] border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl">
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
                      <span className="text-slate-400 font-bold">Extracted Holder Name:</span>
                      <span className="font-black text-slate-800 dark:text-white">{ocrResult.patientName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
                      <span className="text-slate-400 font-bold">Policy Match Candidate:</span>
                      <span className="font-black text-rose-600 dark:text-rose-450">{ocrResult.policyCandidate}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
                      <span className="text-slate-400 font-bold">Diagnosis:</span>
                      <span className="font-bold text-right pl-4 max-w-[280px]">{ocrResult.extractedDiagnosis}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
                      <span className="text-slate-400 font-bold">Treatment Date:</span>
                      <span className="font-bold">{ocrResult.serviceDate}</span>
                    </div>
                    <div className="flex justify-between pb-1 items-center">
                      <span className="text-slate-400 font-bold">Total Bill Amount:</span>
                      <span className="font-black text-base text-rose-600 dark:text-rose-450">${ocrResult.extractedAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => setOcrResult(null)}
                      className="py-2.5 border border-slate-200 dark:border-slate-850 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 text-[11px] font-bold text-slate-550 dark:text-slate-450 active:scale-[0.98]"
                    >
                      Rescan Document
                    </button>
                    <button
                      onClick={handleCreateOcrClaim}
                      className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-[11px] shadow-lg shadow-rose-600/10 active:scale-[0.98]"
                    >
                      Ingest to Review List
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
