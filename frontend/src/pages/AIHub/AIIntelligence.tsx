import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { 
  ShieldAlert, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  TrendingUp, 
  AlertTriangle,
  Database
} from 'lucide-react';

interface ChatMessage {
  sender: 'BOT' | 'USER';
  text: string;
  data?: any[];
  timestamp: Date;
}

export default function AIIntelligence() {
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [fraudStats, setFraudStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([{
    sender: 'BOT',
    text: "Hello! I'm the Sentinel Operations Assistant. I can search active policies, list recent claims, calculate premium totals, or audit suspicious duplicates. How can I help?",
    timestamp: new Date()
  }]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  const suggestedPrompts = [
    { label: '🔍 List recent claims', text: 'List recent claims' },
    { label: '🛡️ Find fraud outliers', text: 'Show me high risk fraud outliers' },
    { label: '💳 Monthly premiums', text: 'What is our premium collection pipeline?' },
  ];

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/ai/fraud-stats');
        setFraudStats(res.data);
      } catch { console.error('Failed to load fraud stats'); }
      finally { setLoadingStats(false); }
    })();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendChat = async (text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { sender: 'USER', text, timestamp: new Date() }]);
    setChatInput('');
    setSendingChat(true);
    try {
      const res = await api.post('/ai/chat-assistant', { prompt: text });
      setMessages(prev => [...prev, { sender: 'BOT', text: res.data.reply, data: res.data.data, timestamp: new Date() }]);
    } catch {
      setMessages(prev => [...prev, { sender: 'BOT', text: 'Sorry, an error occurred connecting to the database.', timestamp: new Date() }]);
    } finally { setSendingChat(false); }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">AI Intelligence</h1>
        <p className="text-sm text-slate-500 mt-0.5">Fraud analytics, duplicate claim audits, and AI database assistant.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* Left: Fraud stats */}
        <div className="lg:col-span-4 space-y-4">

          {/* Fraud risk card */}
          <div className="bg-white border border-slate-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert size={15} className="text-red-600" />
              <h3 className="text-sm font-semibold text-slate-900">Fraud Risk Analytics</h3>
            </div>

            {loadingStats || !fraudStats ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-16 bg-slate-100 rounded-xl" />
                <div className="grid grid-cols-3 gap-2">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-slate-50 rounded-lg" />)}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                  <div>
                    <p className="text-xs font-medium text-red-600 mb-0.5">Avg Risk Index</p>
                    <p className="text-3xl font-bold text-red-700 leading-none">{fraudStats.summary.averageRiskPercentage}%</p>
                  </div>
                  <TrendingUp size={28} className="text-red-300" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xl font-bold text-red-600">{fraudStats.summary.highRiskCount}</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">High</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xl font-bold text-amber-600">{fraudStats.summary.mediumRiskCount}</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Medium</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xl font-bold text-emerald-600">{fraudStats.summary.lowRiskCount}</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Low</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Duplicate alerts */}
          <div className="bg-white border border-slate-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={15} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-900">Duplicate Claim Audits</h3>
            </div>
            {loadingStats || !fraudStats ? (
              <div className="h-16 bg-slate-100 rounded-lg animate-pulse" />
            ) : fraudStats.duplicateAlerts.length > 0 ? (
              <div className="space-y-3">
                {fraudStats.duplicateAlerts.map((alert: any, idx: number) => (
                  <div key={idx} className="p-3.5 bg-amber-50 border border-amber-100 rounded-lg">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-amber-900">{alert.holderName}</span>
                      <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{alert.policyNumber}</span>
                    </div>
                    <p className="text-xs text-amber-700 leading-relaxed">{alert.riskDescription}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-200/50 text-[10px] text-amber-600">
                      <span>Files: {alert.claimsCount}</span>
                      <span className="font-semibold">${alert.totalRequested}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-slate-400">No duplicate spikes detected this cycle.</div>
            )}
          </div>
        </div>

        {/* Right: Chat */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-xl flex flex-col h-[580px] overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <div className="p-2 rounded-lg bg-slate-900"><Database size={14} className="text-white" /></div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Sentinel Database Assistant</p>
              <p className="text-xs text-slate-400">Live SQLite compiler channel</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Connected
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 max-w-[86%] ${msg.sender === 'USER' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  msg.sender === 'BOT' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'
                }`}>
                  {msg.sender === 'BOT' ? <Bot size={14} /> : <User size={14} />}
                </div>
                <div className="space-y-2.5 min-w-0 flex-1">
                  <div className={`px-4 py-3 rounded-xl text-sm leading-relaxed ${
                    msg.sender === 'BOT'
                      ? 'bg-slate-50 border border-slate-100 text-slate-700'
                      : 'bg-red-600 text-white rounded-tr-sm'
                  }`}>
                    {msg.text}
                  </div>

                  {msg.data && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3 text-left text-slate-500 font-semibold">ID</th>
                            <th className="py-2 px-3 text-left text-slate-500 font-semibold">Holder</th>
                            <th className="py-2 px-3 text-right text-slate-500 font-semibold">Amount</th>
                            <th className="py-2 px-3 text-left text-slate-500 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {msg.data.map((row: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-semibold text-slate-900">{row.claimNumber || row.policyNumber}</td>
                              <td className="py-2 px-3 text-slate-600">{row.member || row.holder}</td>
                              <td className="py-2 px-3 text-right font-medium text-slate-900">{row.requested || row.dueDate || row.fraudScore}</td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                  ['ACTIVE', 'APPROVED', 'SETTLED'].includes(row.status) ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                }`}>{row.status || row.aiRenewalProbability || row.fraudRisk}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {sendingChat && (
              <div className="flex gap-3 max-w-[80%]">
                <div className="w-7 h-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center"><Bot size={14} /></div>
                <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-400 flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin text-red-500" />
                  Scanning database...
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Suggestions */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2">
            {suggestedPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSendChat(p.text)}
                disabled={sendingChat}
                className="text-xs px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-slate-600 hover:border-red-400 hover:text-red-600 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-slate-100 flex gap-2.5">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendChat(chatInput)}
              disabled={sendingChat}
              placeholder="Ask anything about your claims or policies..."
              className="flex-1 px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
            />
            <button
              onClick={() => handleSendChat(chatInput)}
              disabled={sendingChat || !chatInput.trim()}
              className="p-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
