
import React, { useState, useMemo } from 'react';
import { AggregatedAnalysis, AnalysisResult, RiskCategory, InventoryItem } from '../types';
import { AlertTriangle, TrendingDown, Archive, CheckCircle, Download, FileText, Truck, BarChart2, ScatterChart as ScatterIcon, RefreshCcw, Loader2, Search, X, Info, ChevronRight, Calculator, Layers, Package, ChevronUp, ChevronDown } from 'lucide-react';
import { generateExecutiveReport } from '../services/geminiService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  ScatterChart, Scatter, Label, ReferenceLine
} from 'recharts';

interface AnalysisDashboardProps {
  analysis: AggregatedAnalysis;
  fileName: string;
  onReset: () => void;
  accessToken: string;
}

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ analysis, fileName, onReset, accessToken }) => {
  const [activeTab, setActiveTab] = useState<RiskCategory | 'Overview'>('Overview');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<{ emailText: string, htmlDashboard: string } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [inspectedItem, setInspectedItem] = useState<InventoryItem | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof InventoryItem; direction: 'asc' | 'desc' }>({
    key: 'mohTotal',
    direction: 'desc'
  });

  const requestSort = (key: keyof InventoryItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setApiError(null);
    try {
      const report = await generateExecutiveReport(analysis, accessToken);
      setGeneratedReport(report);
    } catch (e: any) {
      console.error("Report Generation Error:", e);
      setApiError(e.message || "Failed to generate AI report. Please check your connection or try again later.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery) return [];
    return analysis.allItems.filter(item => 
      item.sku.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5);
  }, [searchQuery, analysis.allItems]);

  const downloadHtml = () => {
    if (!generatedReport) return;
    const blob = new Blob([generatedReport.htmlDashboard], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_ai_dashboard_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const chartData = [
    { name: 'Shortfall', count: analysis.shortfall.length, color: '#ef4444' },
    { name: 'Oversupply', count: analysis.oversupply.length, color: '#3b82f6' },
    { name: 'Dead Stock', count: analysis.deadStock.length, color: '#f97316' },
  ];

  const shortfallTotalUnits = analysis.shortfall.reduce((sum, r) => sum + r.item.onHand, 0);
  const oversupplyTotalUnits = analysis.oversupply.reduce((sum, r) => sum + r.item.onHand, 0);
  const deadStockTotalUnits = analysis.deadStock.reduce((sum, r) => sum + r.item.onHand, 0);

  const totalOnHand = analysis.allItems.reduce((sum, item) => sum + item.onHand, 0);
  const totalWoo = analysis.allItems.reduce((sum, item) => sum + item.woo, 0);
  const totalTransit = analysis.allItems.reduce((sum, item) => sum + item.transit, 0);
  const totalSales3m = analysis.allItems.reduce((sum, item) => sum + item.salesthreeMonthActuals, 0);

  const renderTable = (data: AnalysisResult[] | InventoryItem[], type: RiskCategory) => {
    const isInventoryItem = (item: any): item is InventoryItem => 'sku' in item;
    const items = isInventoryItem(data[0]) ? (data as InventoryItem[]).map(item => ({ item, risks: [] })) : data as AnalysisResult[];

    const sortedItems = [...items].sort((a, b) => {
      const aValue = a.item[sortConfig.key];
      const bValue = b.item[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    const SortIndicator = ({ columnKey }: { columnKey: keyof InventoryItem }) => {
      if (sortConfig.key !== columnKey) return <div className="w-4 h-4 opacity-0 group-hover:opacity-30 transition-opacity"><ChevronUp className="w-4 h-4" /></div>;
      return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-indigo-600" />;
    };

    const Header = ({ label, columnKey, center = false }: { label: string, columnKey: keyof InventoryItem, center?: boolean }) => (
      <th 
        onClick={() => requestSort(columnKey)}
        className={`px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors group ${center ? 'text-center' : 'text-left'}`}
      >
        <div className={`flex items-center gap-2 ${center ? 'justify-center' : ''}`}>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
          <SortIndicator columnKey={columnKey} />
        </div>
      </th>
    );

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <Header label="SKU" columnKey="sku" />
              <Header label="Location" columnKey="state" />
              <Header label="MOH (Total)" columnKey="mohTotal" center />
              <Header label="Accuracy" columnKey="accuracy" center />
              <Header label="On Hand" columnKey="onHand" center />
              <Header label="WOO" columnKey="woo" center />
              <Header label="In Transit" columnKey="transit" center />
              <Header label="3M Sales" columnKey="salesthreeMonthActuals" center />
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {sortedItems.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{row.item.sku}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{row.item.state}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center font-mono">
                  <span className="font-bold">{row.item.mohTotal.toFixed(1)}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center font-mono">{(row.item.accuracy * 100).toFixed(2)}%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 text-center font-bold font-mono">
                  {row.item.onHand.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center font-mono">{row.item.woo.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center font-mono">{row.item.transit.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center font-mono">{row.item.salesthreeMonthActuals.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                   <button 
                    onClick={() => setInspectedItem(row.item)}
                    className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                     <Info className="w-4 h-4" />
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Search Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <div className="space-y-1 flex-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Intelligence Dashboard</h2>
          <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{fileName}</span>
            <span>&bull;</span>
            <span>{analysis.totalItems.toLocaleString()} SKUs Scanned</span>
          </div>
        </div>

        <div className="relative w-full lg:w-96">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <input 
              type="text"
              placeholder="Search SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-bold"
            />
            {searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-[100] overflow-hidden">
                {filteredItems.length > 0 ? (
                  filteredItems.map(item => (
                    <button 
                      key={item.id} 
                      onClick={() => {
                        setInspectedItem(item);
                        setSearchQuery("");
                      }}
                      className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                    >
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-900">{item.sku}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.state}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs font-bold text-slate-400 uppercase">No SKU found</div>
                )}
              </div>
            )}
        </div>

        <div className="flex gap-4 w-full lg:w-auto">
          <button onClick={onReset} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-4 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl font-bold transition-all shadow-sm">
            <RefreshCcw className="w-4 h-4" /> Reset
          </button>
          <button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50 font-bold shadow-indigo-200 shadow-xl active:scale-[0.98]"
          >
            {isGeneratingReport ? (
              <><Loader2 className="animate-spin w-4 h-4" /> Synthesizing...</>
            ) : (
              <><FileText className="w-4 h-4" /> Generate AI Report</>
            )}
          </button>
        </div>
      </div>

      {/* SKU Inspector Modal */}
      {inspectedItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setInspectedItem(null)} />
          <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
               <div>
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">{inspectedItem.sku}</h3>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{inspectedItem.state}</p>
               </div>
               <button onClick={() => setInspectedItem(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
               </button>
            </div>
            <div className="p-8 space-y-8">
              
              {/* Formula Breakdown Section */}
              <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
                 <div className="flex items-center gap-3 mb-6">
                    <Calculator className="w-5 h-5 text-indigo-600" />
                    <h4 className="text-sm font-black text-indigo-900 uppercase tracking-widest">MOH Calculation Breakdown</h4>
                 </div>
                 <div className="grid grid-cols-4 gap-4 items-center">
                    <div className="text-center space-y-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Base MOH</p>
                       <p className="text-lg font-bold text-slate-700">{inspectedItem.mohBase.toFixed(2)}</p>
                    </div>
                    <div className="text-center text-slate-300 font-black">+</div>
                    <div className="text-center space-y-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Transit</p>
                       <p className="text-lg font-bold text-slate-700">{inspectedItem.transit.toFixed(2)}</p>
                    </div>
                    <div className="text-center text-slate-300 font-black">+</div>
                    <div className="text-center space-y-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Woo</p>
                       <p className="text-lg font-bold text-slate-700">{inspectedItem.woo.toFixed(2)}</p>
                    </div>
                    <div className="text-center text-slate-300 font-black">=</div>
                    <div className="text-center space-y-1 col-span-1 bg-white py-2 rounded-xl shadow-sm ring-1 ring-indigo-100">
                       <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">Total MOH</p>
                       <p className="text-xl font-black text-indigo-600">{inspectedItem.mohTotal.toFixed(2)}</p>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">On Hand</p>
                  <p className="text-xl font-bold text-slate-900">{inspectedItem.onHand.toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3m Accuracy</p>
                  <p className="text-xl font-bold text-slate-900">{(inspectedItem.accuracy * 100).toFixed(2)}%</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3m Actuals Units</p>
                  <p className="text-xl font-bold text-slate-900">{inspectedItem.salesthreeMonthActuals.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Layers className="w-3 h-3" /> Risk Status Analysis
                 </h4>
                 <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                       <span className="text-sm font-bold text-slate-700">Shortfall Rule (MOH &lt; 2 &amp; Acc &ge; 0.8)</span>
                       { (inspectedItem.mohTotal < 2 && inspectedItem.accuracy >= 0.8) ? (
                         <span className="text-rose-500 font-black text-[10px] uppercase bg-rose-50 px-2 py-1 rounded">Flagged</span>
                       ) : (
                         <span className="text-emerald-500 font-black text-[10px] uppercase bg-emerald-50 px-2 py-1 rounded">Clear</span>
                       )}
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                       <span className="text-sm font-bold text-slate-700">Oversupply Rule (MOH &gt; 2 &amp; Acc &lt; 0.8)</span>
                       { (inspectedItem.mohTotal > 2 && inspectedItem.accuracy < 0.8) ? (
                         <span className="text-blue-500 font-black text-[10px] uppercase bg-blue-50 px-2 py-1 rounded">Flagged</span>
                       ) : (
                         <span className="text-emerald-500 font-black text-[10px] uppercase bg-emerald-50 px-2 py-1 rounded">Clear</span>
                       )}
                    </div>
                 </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calculated by Agent Security Module v2.0</p>
            </div>
          </div>
        </div>
      )}

      {apiError && (
        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 px-6 py-4 rounded-r-2xl flex items-center gap-3 shadow-sm animate-in shake">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="font-bold text-sm">{apiError}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
        <button onClick={() => setActiveTab(RiskCategory.SHORTFALL)} className={`p-6 rounded-3xl border-2 transition-all text-left shadow-sm hover:shadow-lg ${activeTab === RiskCategory.SHORTFALL ? 'border-rose-500 bg-white ring-8 ring-rose-50' : 'border-white bg-white hover:border-slate-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl shadow-inner"><AlertTriangle className="w-7 h-7" /></div>
            <div className="text-right">
                <span className="text-2xl font-black text-rose-600 block">{analysis.shortfall.length.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Records</span>
            </div>
          </div>
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Shortfalls</h3>
        </button>

        <button onClick={() => setActiveTab(RiskCategory.OVERSUPPLY)} className={`p-6 rounded-3xl border-2 transition-all text-left shadow-sm hover:shadow-lg ${activeTab === RiskCategory.OVERSUPPLY ? 'border-blue-500 bg-white ring-8 ring-blue-50' : 'border-white bg-white hover:border-slate-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-inner"><TrendingDown className="w-7 h-7" /></div>
            <div className="text-right">
                <span className="text-2xl font-black text-blue-600 block">{analysis.oversupply.length.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Records</span>
            </div>
          </div>
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Oversupply</h3>
        </button>

        <button onClick={() => setActiveTab(RiskCategory.DEAD_STOCK)} className={`p-6 rounded-3xl border-2 transition-all text-left shadow-sm hover:shadow-lg ${activeTab === RiskCategory.DEAD_STOCK ? 'border-orange-500 bg-white ring-8 ring-orange-50' : 'border-white bg-white hover:border-slate-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl shadow-inner"><Archive className="w-7 h-7" /></div>
            <div className="text-right">
                <span className="text-2xl font-black text-orange-600 block">{analysis.deadStock.length.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Records</span>
            </div>
          </div>
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Dead Stock</h3>
        </button>

        <button onClick={() => setActiveTab(RiskCategory.ON_HAND)} className={`p-6 rounded-3xl border-2 transition-all text-left shadow-sm hover:shadow-lg ${activeTab === RiskCategory.ON_HAND ? 'border-indigo-500 bg-white ring-8 ring-indigo-50' : 'border-white bg-white hover:border-slate-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner"><Package className="w-7 h-7" /></div>
            <div className="text-right">
                <span className="text-2xl font-black text-indigo-600 block">{analysis.allItems.length.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Records</span>
            </div>
          </div>
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">On Hand</h3>
        </button>

        <button onClick={() => setActiveTab(RiskCategory.WOO)} className={`p-6 rounded-3xl border-2 transition-all text-left shadow-sm hover:shadow-lg ${activeTab === RiskCategory.WOO ? 'border-indigo-500 bg-white ring-8 ring-indigo-50' : 'border-white bg-white hover:border-slate-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner"><Calculator className="w-7 h-7" /></div>
            <div className="text-right">
                <span className="text-2xl font-black text-indigo-600 block">{analysis.allItems.filter(i => i.woo > 0).length.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Records</span>
            </div>
          </div>
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">WOO</h3>
        </button>

        <button onClick={() => setActiveTab(RiskCategory.IN_TRANSIT)} className={`p-6 rounded-3xl border-2 transition-all text-left shadow-sm hover:shadow-lg ${activeTab === RiskCategory.IN_TRANSIT ? 'border-indigo-500 bg-white ring-8 ring-indigo-50' : 'border-white bg-white hover:border-slate-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner"><Truck className="w-7 h-7" /></div>
            <div className="text-right">
                <span className="text-2xl font-black text-indigo-600 block">{analysis.allItems.filter(i => i.transit > 0).length.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Records</span>
            </div>
          </div>
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">In Transit</h3>
        </button>

        <button onClick={() => setActiveTab(RiskCategory.SALES_3M)} className={`p-6 rounded-3xl border-2 transition-all text-left shadow-sm hover:shadow-lg ${activeTab === RiskCategory.SALES_3M ? 'border-indigo-500 bg-white ring-8 ring-indigo-50' : 'border-white bg-white hover:border-slate-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner"><FileText className="w-7 h-7" /></div>
            <div className="text-right">
                <span className="text-2xl font-black text-indigo-600 block">{analysis.allItems.filter(i => i.salesthreeMonthActuals > 0).length.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Records</span>
            </div>
          </div>
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">3m Actual Sales</h3>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50/50 border-b border-slate-200 px-8 py-4 flex gap-8">
             <button onClick={() => setActiveTab('Overview')} className={`pb-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === 'Overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Visual Summary</button>
             <button onClick={() => setActiveTab(RiskCategory.SHORTFALL)} className={`pb-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === RiskCategory.SHORTFALL ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Risk Table</button>
        </div>

        <div className="p-8">
          {activeTab === 'Overview' ? (
            <div className="space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                           <BarChart2 className="w-4 h-4" /> Risk Distribution
                        </h3>
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartData}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                                  <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                                  <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                                      {chartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {generatedReport && (
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-[2.5rem] p-12 space-y-10 animate-in zoom-in-95 duration-500">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                             <div className="space-y-1">
                                <h3 className="text-2xl font-black text-indigo-900 flex items-center gap-4">
                                  <CheckCircle className="w-10 h-10 text-indigo-600" />
                                  Strategic Risk Assessment
                                </h3>
                                <p className="text-indigo-600/70 font-bold uppercase tracking-widest text-[10px]">AI-Generated Executive Briefing</p>
                             </div>
                             <button onClick={downloadHtml} className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-2xl font-bold transition-all shadow-sm">
                                <Download className="w-5 h-5" />
                                Export Dashboard
                             </button>
                        </div>
                        <div className="bg-white p-12 rounded-3xl border border-indigo-100 shadow-2xl shadow-indigo-100/20 max-h-[600px] overflow-y-auto custom-scrollbar">
                            <div className="prose prose-indigo max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap font-sans text-lg">
                                {generatedReport.emailText}
                            </div>
                        </div>
                    </div>
                )}
            </div>
          ) : (
            renderTable(
              activeTab === RiskCategory.SHORTFALL ? analysis.shortfall :
              activeTab === RiskCategory.OVERSUPPLY ? analysis.oversupply :
              activeTab === RiskCategory.DEAD_STOCK ? analysis.deadStock :
              activeTab === RiskCategory.ON_HAND ? analysis.allItems :
              activeTab === RiskCategory.WOO ? analysis.allItems.filter(i => i.woo > 0) :
              activeTab === RiskCategory.IN_TRANSIT ? analysis.allItems.filter(i => i.transit > 0) :
              activeTab === RiskCategory.SALES_3M ? analysis.allItems.filter(i => i.salesthreeMonthActuals > 0) :
              [],
              activeTab as RiskCategory
            )
          )}
        </div>
      </div>
    </div>
  );
};
