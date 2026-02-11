
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Loader2, AlertCircle, ShieldCheck, Lock, ArrowRight, ShieldAlert } from 'lucide-react';
import { FileUpload } from './components/FileUpload';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { parseFile, analyzeInventory } from './utils/dataProcessor';
import { AggregatedAnalysis } from './types';

// The secure passcode for accessing the application.
const SECRET_PASSCODE = "yuKVek24";

function App() {
  const [analysis, setAnalysis] = useState<AggregatedAnalysis | null>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Auth State
  const [passcode, setPasscode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === SECRET_PASSCODE) {
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
      setTimeout(() => setAuthError(false), 2000);
    }
  };

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      setFileName(file.name);
      const items = await parseFile(file);
      if (items.length === 0) {
        setError("No valid inventory data found in the uploaded file.");
      } else {
        const result = analyzeInventory(items);
        setAnalysis(result);
      }
    } catch (err: any) {
      setError(`Failed to parse file: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAnalysis(null);
    setFileName("");
    setError(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 font-sans">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>
        </div>

        <div className="relative w-full max-w-md animate-in fade-in zoom-in duration-700">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl">
            <div className="text-center mb-10">
              <div className="inline-flex p-4 bg-indigo-500/10 rounded-2xl mb-6 ring-1 ring-indigo-500/20">
                <ShieldCheck className="w-10 h-10 text-indigo-400" />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">Security Portal</h1>
              <p className="text-slate-400 text-sm mt-3 font-medium">Enter your agent passcode to access the workspace</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className={`w-5 h-5 transition-colors ${authError ? 'text-rose-400' : 'text-slate-500 group-focus-within:text-indigo-400'}`} />
                </div>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••••••••••"
                  className={`w-full pl-12 pr-4 py-4 bg-white/5 border rounded-2xl focus:ring-4 transition-all outline-none font-mono text-white tracking-widest ${
                    authError 
                    ? 'border-rose-500/50 ring-rose-500/10 placeholder-rose-300' 
                    : 'border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/10 placeholder-slate-600'
                  }`}
                />
              </div>

              {authError && (
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-widest justify-center animate-in slide-in-from-top-2">
                  <ShieldAlert className="w-4 h-4" /> Access Denied
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
              >
                Unlock Terminal
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-white/5 text-center">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Secure AI Channel &bull; Encrypted Session</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-indigo-200 shadow-lg">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Inventory Agent</span>
          </div>
          
          <div className="flex items-center gap-4">
             <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1.5 border border-emerald-100">
                <ShieldCheck className="w-3 h-3" /> Agent Authenticated
              </span>
              <button 
                onClick={() => setIsAuthenticated(false)}
                className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors"
              >
                Logout
              </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="relative">
               <Loader2 className="animate-spin h-20 w-20 text-indigo-600" />
               <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-indigo-400" />
            </div>
            <p className="mt-8 text-slate-500 font-bold tracking-widest uppercase text-xs">Verifying Supply Chain Data</p>
          </div>
        ) : !analysis ? (
          <div className="max-w-3xl mx-auto space-y-12 animate-in slide-in-from-bottom-10 duration-700">
            <div className="text-center space-y-4">
              <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">Expert Intelligence</h1>
              <p className="text-xl text-slate-500 max-w-xl mx-auto leading-relaxed">Secure data processing for modern inventory management.</p>
            </div>
            
            <FileUpload onFileUpload={handleFileUpload} />
            
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2 animate-in shake">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}
          </div>
        ) : (
          <AnalysisDashboard 
            analysis={analysis} 
            fileName={fileName} 
            onReset={handleReset} 
          />
        )}
      </main>
    </div>
  );
}

export default App;
