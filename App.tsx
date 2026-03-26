import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Loader2, AlertCircle, ShieldCheck, Lock, ArrowRight, ShieldAlert, Beaker, Mail, Users, LogOut, Settings } from 'lucide-react';
import { FileUpload } from './components/FileUpload';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { TestSuite } from './components/TestSuite';
import { UserManagement } from './components/UserManagement';
import { parseFile, analyzeInventory } from './utils/dataProcessor';
import { AggregatedAnalysis, User, UserRole } from './types';

// Firebase Imports
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

function App() {
  const [analysis, setAnalysis] = useState<AggregatedAnalysis | null>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState("");
  
  // View State
  const [activeTab, setActiveTab] = useState<'inventory' | 'admin'>('inventory');
  const [isTestSuiteOpen, setIsTestSuiteOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const path = `users/${firebaseUser.uid}`;
        try {
          // Fetch role from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          let role: UserRole = 'standard';
          
          if (userDoc.exists()) {
            role = userDoc.data().role as UserRole;
          } else if (firebaseUser.email === ADMIN_EMAIL) {
            // Bootstrap first admin
            role = 'admin';
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              email: firebaseUser.email,
              role: 'admin',
              uid: firebaseUser.uid
            });
          }

          setCurrentUser({
            email: firebaseUser.email || '',
            role: role
          });
        } catch (err) {
          console.error("Error fetching user role:", err);
          // Only throw if it's a permission error that we want to handle specially
          if (err instanceof Error && err.message.includes('permission')) {
            handleFirestoreError(err, OperationType.GET, path);
          }
          
          // Fallback for bootstrap admin if Firestore fails initially
          if (firebaseUser.email === ADMIN_EMAIL) {
            setCurrentUser({ email: firebaseUser.email || '', role: 'admin' });
          } else {
            setCurrentUser({ email: firebaseUser.email || '', role: 'standard' });
          }
        }
      } else {
        // Default to guest user for unauthenticated access
        setCurrentUser({
          email: 'guest@access.granted',
          role: 'standard'
        });
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(false);
    setAuthErrorMessage("");
    try {
      if (isSignUp) {
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setEmail("");
      setPassword("");
    } catch (err: any) {
      console.error("Auth Error:", err);
      setAuthError(true);
      
      let message = "Authentication failed. Please try again.";
      if (err.message.includes('auth/invalid-credential')) {
        message = isSignUp 
          ? "Invalid registration details. Please check your email format." 
          : "Invalid email or password. If you haven't registered yet, click 'Sign Up' below.";
      } else if (err.message.includes('auth/email-already-in-use')) {
        message = "This email is already registered. Please login instead.";
      } else if (err.message.includes('auth/weak-password')) {
        message = "Password is too weak. Please use at least 6 characters.";
      } else if (err.message.includes('auth/operation-not-allowed')) {
        message = "Email/Password login is not enabled in Firebase. Please enable it in the console.";
      }
      
      setAuthErrorMessage(message);
      setTimeout(() => setAuthError(false), 5000);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveTab('inventory');
      setAnalysis(null);
    } catch (err) {
      console.error("Logout Error:", err);
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
      const msg = err.message || "Unknown error";
      if (msg.includes("corrupted") || msg.includes("format")) {
        setError(`Data Format Error: The file might be corrupted or in an unsupported format. Please ensure it is a valid .xlsx or .csv file.`);
      } else if (msg.includes("mapping") || msg.includes("column")) {
        setError(`Mapping Error: Could not find required columns. Please check if your file headers match the expected format (SKU, Entity, MOH, etc.).`);
      } else {
        setError(`System Error: ${msg}. Try refreshing the page or checking your internet connection.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAnalysis(null);
    setFileName("");
    setError(null);
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
      </div>
    );
  }

  // Removed mandatory login screen to allow unauthenticated access
  // if (!currentUser) { ... }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl shadow-indigo-200 shadow-lg">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">Inventory Agent</span>
            </div>

            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === 'inventory' 
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                Intelligence
              </button>
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    activeTab === 'admin' 
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Administration
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <button 
                onClick={() => setIsTestSuiteOpen(true)}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
              >
                <Beaker className="w-3 h-3" /> Diagnostics
              </button>
             <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">{currentUser.email.split('@')[0]}</p>
                  <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-1">{currentUser.role}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
             </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {activeTab === 'admin' && currentUser.role === 'admin' ? (
          <UserManagement />
        ) : (
          <>
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
                accessToken={import.meta.env.VITE_ACCESS_TOKEN} 
              />
            )}
          </>
        )}
      </main>

      <TestSuite isOpen={isTestSuiteOpen} onClose={() => setIsTestSuiteOpen(false)} />
    </div>
  );
}

export default App;
