
import React, { useState } from 'react';
import { Beaker, CheckCircle2, XCircle, Play, ChevronRight, Bug, Activity } from 'lucide-react';
import { analyzeInventory } from '../utils/dataProcessor';
import { InventoryItem, RiskCategory } from '../types';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'idle';
  expected: string;
  actual: string;
  duration: number;
}

export const TestSuite: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    const startTime = performance.now();
    
    const mockItem = (overrides: Partial<InventoryItem>): InventoryItem => ({
      id: 'test-id',
      sku: 'TEST-SKU',
      dc: 'TEST-DC',
      demandType: 'Static',
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

    const tests: { name: string; item: InventoryItem; expectedRisk: RiskCategory }[] = [
      {
        name: 'Shortfall Rule (MOH < 2 & Acc >= 0.8)',
        item: mockItem({ mohTotal: 1.5, accuracy: 0.85 }),
        expectedRisk: RiskCategory.SHORTFALL
      },
      {
        name: 'Oversupply Rule (MOH > 2 & Acc < 0.8)',
        item: mockItem({ mohTotal: 4, accuracy: 0.6 }),
        expectedRisk: RiskCategory.OVERSUPPLY
      },
      {
        name: 'Dead Stock Rule (OH > 0 & Sales == 0)',
        item: mockItem({ onHand: 50, threeMonthActuals: 0 }),
        expectedRisk: RiskCategory.DEAD_STOCK
      },
      {
        name: 'Supplier Risk Rule (Lead Time > 60)',
        item: mockItem({ leadTime: 75 }),
        expectedRisk: RiskCategory.SUPPLIER_RISK
      },
      {
        name: 'Supplier Risk Rule (OTD < 85%)',
        item: mockItem({ otd: 0.70 }),
        expectedRisk: RiskCategory.SUPPLIER_RISK
      }
    ];

    const newResults: TestResult[] = tests.map(t => {
      const testStart = performance.now();
      const analysis = analyzeInventory([t.item]);
      
      // Find if the expected risk is in any of the categories
      const actualRisks: string[] = [];
      if (analysis.shortfall.length > 0) actualRisks.push(RiskCategory.SHORTFALL);
      if (analysis.oversupply.length > 0) actualRisks.push(RiskCategory.OVERSUPPLY);
      if (analysis.deadStock.length > 0) actualRisks.push(RiskCategory.DEAD_STOCK);
      if (analysis.supplierRisk.length > 0) actualRisks.push(RiskCategory.SUPPLIER_RISK);

      const passed = actualRisks.includes(t.expectedRisk);
      
      return {
        name: t.name,
        status: passed ? 'passed' : 'failed',
        expected: t.expectedRisk,
        actual: actualRisks.join(', ') || 'Healthy',
        duration: Math.round(performance.now() - testStart)
      };
    });

    setTimeout(() => {
      setResults(newResults);
      setIsRunning(false);
    }, 600); // Visual delay for better UX
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Beaker className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-lg uppercase tracking-tight">Diagnostic Engine</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Integrity Verification</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-slate-900 rounded-2xl p-6 text-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-widest">Test Runner v1.0.4</span>
              </div>
              <button 
                onClick={runTests}
                disabled={isRunning}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
              >
                {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                Run Diagnostics
              </button>
            </div>

            {results.length === 0 && !isRunning && (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <Bug className="w-8 h-8 mx-auto opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">No tests executed in this session</p>
              </div>
            )}

            {isRunning && (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-white/5 rounded-xl border border-white/5" />
                ))}
              </div>
            )}

            <div className="space-y-3">
              {results.map((res, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2 group hover:border-white/20 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">{res.name}</span>
                    {res.status === 'passed' ? (
                      <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Pass
                      </span>
                    ) : (
                      <span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Fail
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-600">Expected:</span>
                      <span className="text-emerald-500/70">{res.expected}</span>
                    </div>
                    <ChevronRight className="w-3 h-3" />
                    <div className="flex items-center gap-1">
                      <span className="text-slate-600">Actual:</span>
                      <span className={res.status === 'passed' ? 'text-emerald-500/70' : 'text-rose-500/70'}>{res.actual}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Inventory Alert Agent Security Diagnostic Module
          </p>
        </div>
      </div>
    </div>
  );
};

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
);
