
import React, { useState } from 'react';
import { Beaker, XCircle, Play, Loader2, Globe, Cpu, CheckCircle2, AlertTriangle, Bug, Server, RefreshCcw, AlertCircle, HelpCircle, Terminal, Cloud, LayoutTemplate } from 'lucide-react';
import { analyzeInventory } from '../utils/dataProcessor';
import { generateExecutiveReport } from '../services/geminiService';
import { InventoryItem } from '../types';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'running' | 'idle' | 'warning';
  expected: string;
  actual: string;
  duration: number;
  type?: 'logic' | 'api' | 'server';
  details?: string;
}

export const TestSuite: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [showRestartHelp, setShowRestartHelp] = useState(false);

  // Helper to create consistent mock items for unit testing
  const createMockItem = (overrides: Partial<InventoryItem>): InventoryItem => ({
    id: `mock-${Math.random().toString(36).substr(2, 9)}`,
    sku: 'TEST-SKU',
    dc: 'TEST-DC',
    demandType: 'Static',
    mohBase: 1,
    transit: 0,
    woo: 0,
    mohTotal: 1,
    accuracy: 0.9,
    onHand: 100,
    threeMonthActuals: 50,
    supplier: 'Test Vendor',
    leadTime: 10,
    otd: 0.95,
    originalData: {},
    ...overrides
  });

  const checkServerHealth = async () => {
    const start = performance.now();
    try {
        // First try relative path (Standard production/single-server setup)
        let res = await fetch('/api/health');
        
        // If 404, the server is running but is OLD code
        if (res.status === 404) {
            setShowRestartHelp(true);
            return {
                ok: true, // TREATING AS SUCCESS (Fallback)
                status: 'warning',
                msg: "Online (Legacy v1.0)",
                details: "The backend is online but hasn't restarted to load the new v1.1 code. Core analysis will still work."
            };
        }

        // If generic failure, try localhost:8080 (Split dev setup)
        if (!res.ok) {
            try {
                res = await fetch('http://localhost:8080/api/health');
            } catch (innerE) {
                // If this also fails, throw the original error
                throw new Error(`HTTP ${res.status} (Relative) & Connection Refused (Port 8080)`);
            }
        }

        const data = await res.json();
        return {
            ok: true,
            status: 'passed',
            msg: `Server Online (v${data.version || '1.0'})`,
            duration: Math.round(performance.now() - start)
        };
    } catch (e: any) {
        return {
            ok: false,
            status: 'failed',
            msg: "Connection Failed",
            details: `Backend unreachable. Ensure 'app.py' is running on port 8080. Error: ${e.message}`,
            duration: Math.round(performance.now() - start)
        };
    }
  };

  const runDiagnostics = async () => {
    setIsTestRunning(true);
    setResults([]);
    setShowRestartHelp(false);
    
    // We use a local array to accumulate results to avoid state batching issues during rapid execution
    const currentResults: TestResult[] = [];

    // --- UNIT TEST SUITE FOR ANALYSE ROUTINE ---
    // These tests run entirely in the browser (Client-Side)
    const unitTests = [
      {
        name: 'Unit Test: Shortfall Logic',
        item: createMockItem({ sku: 'SHORT', mohTotal: 1.5, accuracy: 0.9, onHand: 10 }),
        check: (res: any) => res.shortfall.length === 1 && res.shortfall[0].item.sku === 'SHORT',
        expected: 'Identified as Shortfall'
      },
      {
        name: 'Unit Test: Oversupply Logic',
        item: createMockItem({ sku: 'OVER', mohTotal: 3.0, accuracy: 0.5, onHand: 1000 }),
        check: (res: any) => res.oversupply.length === 1 && res.oversupply[0].item.sku === 'OVER',
        expected: 'Identified as Oversupply'
      },
      {
        name: 'Unit Test: Dead Stock Logic',
        item: createMockItem({ sku: 'DEAD', onHand: 50, threeMonthActuals: 0, mohTotal: 0 }),
        check: (res: any) => res.deadStock.length === 1 && res.deadStock[0].item.sku === 'DEAD',
        expected: 'Identified as Dead Stock'
      },
      {
        name: 'Unit Test: Supplier Risk Logic',
        item: createMockItem({ sku: 'RISK', leadTime: 70, otd: 0.9 }),
        check: (res: any) => res.supplierRisk.length === 1 && res.supplierRisk[0].item.sku === 'RISK',
        expected: 'Identified as Supplier Risk'
      },
      {
        name: 'Unit Test: Healthy Item',
        item: createMockItem({ sku: 'HEALTHY', mohTotal: 1.5, accuracy: 0.7, onHand: 100, threeMonthActuals: 100, leadTime: 30, otd: 0.95 }),
        check: (res: any) => 
          res.shortfall.length === 0 && 
          res.oversupply.length === 0 && 
          res.deadStock.length === 0 && 
          res.supplierRisk.length === 0,
        expected: 'No Risks Identified'
      }
    ];

    // Execute Unit Tests Synchronously
    unitTests.forEach(test => {
      const start = performance.now();
      try {
        const result = analyzeInventory([test.item]);
        const passed = test.check(result);
        
        currentResults.push({
          name: test.name,
          status: passed ? 'passed' : 'failed',
          expected: test.expected,
          actual: passed ? 'Pass' : 'Logic Mismatch',
          duration: Math.round(performance.now() - start),
          type: 'logic'
        });
      } catch (e: any) {
        currentResults.push({
          name: test.name,
          status: 'failed',
          expected: test.expected,
          actual: `Error: ${e.message}`,
          duration: 0,
          type: 'logic'
        });
      }
    });
    setResults([...currentResults]);

    // --- STEP 2: SERVER HEALTH CHECK ---
    const healthIndex = currentResults.push({
      name: 'Network: Backend Reachability',
      status: 'running',
      expected: '200 OK',
      actual: 'Checking Server...',
      duration: 0,
      type: 'server'
    }) - 1;
    setResults([...currentResults]);

    const healthResult = await checkServerHealth();
    
    currentResults[healthIndex] = {
        name: 'Network: Backend Reachability',
        status: (healthResult.status as any) || (healthResult.ok ? 'passed' : 'failed'),
        expected: '200 OK',
        actual: healthResult.msg,
        duration: healthResult.duration,
        type: 'server',
        details: healthResult.details
    };
    setResults([...currentResults]);

    // --- STEP 3: API CONNECTIVITY TEST ---
    // Only run if server is reachable (even if it's the old version)
    if (healthResult.ok) {
      const apiIndex = currentResults.push({
        name: 'Integration: AI Service Check',
        status: 'running',
        expected: 'Diagnostic Response',
        actual: 'Calling AI Model...',
        duration: 0,
        type: 'api'
      }) - 1;
      setResults([...currentResults]);

      const apiStart = performance.now();
      try {
        // Create a lightweight payload for the API test
        const apiMockData = analyzeInventory([
          createMockItem({ sku: 'API-TEST', mohTotal: 1.0, accuracy: 0.95 })
        ]);

        // Trigger 'diagnosticMode' (3rd param true)
        const response = await generateExecutiveReport(apiMockData, "yuKVek24", true);
        
        if (response && response.emailText === "Diagnostic OK") {
          currentResults[apiIndex] = {
            name: 'Integration: AI Service Check',
            status: 'passed',
            expected: 'Diagnostic Response',
            actual: 'System Operational',
            duration: Math.round(performance.now() - apiStart),
            type: 'api'
          };
        } else {
           throw new Error("Invalid diagnostic response signature");
        }
      } catch (e: any) {
        currentResults[apiIndex] = {
          name: 'Integration: AI Service Check',
          status: 'failed',
          expected: 'Diagnostic Response',
          actual: 'Test Failed',
          duration: Math.round(performance.now() - apiStart),
          type: 'api',
          details: `Error: ${e.message}. Check server logs for 'API_KEY' issues.`
        };
      }
      setResults([...currentResults]);
    }

    setIsTestRunning(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
              <Beaker className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-lg uppercase tracking-tight">Diagnostic Engine</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unit & Integration Testing</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
          <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-2xl overflow-hidden relative">
             <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
             
             <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-2">
                   <Bug className="w-4 h-4 text-emerald-400" />
                   <span className="text-xs font-black uppercase tracking-widest text-slate-400">Test Execution</span>
                </div>
                <button 
                  onClick={runDiagnostics}
                  disabled={isTestRunning}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/50 active:scale-95"
                >
                  {isTestRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                  Run Suite
                </button>
             </div>

             <div className="space-y-3 relative z-10">
                {results.length === 0 && !isTestRunning && (
                   <div className="py-12 text-center opacity-50">
                      <Cpu className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">Ready to verify logic</p>
                   </div>
                )}
                
                {results.map((res, i) => (
                   <div key={i} className={`p-4 rounded-2xl border flex flex-col gap-2 transition-all duration-300 ${
                      res.status === 'passed' ? 'bg-emerald-500/10 border-emerald-500/20' : 
                      res.status === 'warning' ? 'bg-orange-500/10 border-orange-500/20' : 
                      res.status === 'failed' ? 'bg-rose-500/10 border-rose-500/20' : 
                      res.status === 'running' ? 'bg-indigo-500/10 border-indigo-500/20 animate-pulse' :
                      'bg-slate-800 border-slate-700'
                   }`}>
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            {res.type === 'api' ? <Globe className="w-3 h-3 text-sky-400" /> : 
                             res.type === 'server' ? <Server className="w-3 h-3 text-orange-400" /> :
                             <Cpu className="w-3 h-3 text-indigo-400" />}
                            <span className="text-[10px] font-black uppercase tracking-widest">{res.name}</span>
                         </div>
                         <div className="flex items-center gap-2">
                             {res.status === 'warning' && (
                                <button 
                                  onClick={() => setShowRestartHelp(!showRestartHelp)}
                                  className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-orange-400 hover:text-white bg-orange-500/10 hover:bg-orange-500/20 px-2 py-0.5 rounded border border-orange-500/20 transition-colors"
                                >
                                  <HelpCircle className="w-3 h-3" />
                                  How to Restart?
                                </button>
                             )}
                             {res.status === 'running' ? (
                                <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
                             ) : res.status === 'passed' ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                             ) : res.status === 'warning' ? (
                                <AlertCircle className="w-3 h-3 text-orange-400" />
                             ) : (
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                             )}
                         </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-[10px] font-mono mt-1">
                          <div className="text-slate-400">Exp: <span className="text-slate-200">{res.expected}</span></div>
                          <div className="text-slate-400">Act: <span className={
                              res.status === 'failed' ? 'text-rose-400 font-bold' : 
                              res.status === 'warning' ? 'text-orange-400 font-bold' : 
                              'text-emerald-400'
                          }>{res.actual}</span></div>
                      </div>
                      
                      {/* Detailed Help Guide for Restarts */}
                      {res.status === 'warning' && showRestartHelp && (
                         <div className="mt-3 p-3 bg-slate-900 rounded-xl border border-white/10 animate-in fade-in slide-in-from-top-2">
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                              <RefreshCcw className="w-3 h-3" /> Restart Instructions
                            </h4>
                            <div className="space-y-2">
                                <div className="flex gap-2 items-start">
                                    <Terminal className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-300 uppercase">Local Terminal</p>
                                        <p className="text-[9px] text-slate-500 leading-tight">Click terminal, press <code className="bg-black/50 px-1 rounded text-slate-300">Ctrl+C</code>, then run <code className="bg-black/50 px-1 rounded text-slate-300">python app.py</code></p>
                                    </div>
                                </div>
                                <div className="flex gap-2 items-start">
                                    <Cloud className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-300 uppercase">Google Cloud Run</p>
                                        <p className="text-[9px] text-slate-500 leading-tight">Go to Cloud Console &gt; Run &gt; Your Service &gt; Edit & Deploy New Revision &gt; <strong>Deploy</strong>.</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 items-start">
                                    <LayoutTemplate className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-300 uppercase">AI Studio / Project IDX</p>
                                        <p className="text-[9px] text-slate-500 leading-tight">Press <code className="bg-black/50 px-1 rounded text-slate-300">Cmd+Shift+P</code> &gt; Search "Restart Dev Server" or force reload browser.</p>
                                    </div>
                                </div>
                            </div>
                         </div>
                      )}

                      {res.details && (res.status === 'failed') && (
                         <div className={`mt-2 pt-2 border-t border-white/5 text-[9px] font-mono leading-relaxed break-all text-rose-300/80`}>
                            {res.details}
                         </div>
                      )}
                   </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
