
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { UserPlus, Shield, User as UserIcon, Key, Copy, Check, Trash2, Users, Loader2, AlertCircle, RefreshCcw } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, query } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { generatePassword } from '../utils/auth';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('standard');
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList: User[] = [];
      snapshot.forEach((doc) => {
        userList.push(doc.data() as User);
      });
      setUsers(userList);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Error:", err);
      setError("Failed to load users. Check your permissions.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || isProvisioning) return;
    
    setIsProvisioning(true);
    setError(null);
    const password = generatePassword();
    
    // Secondary App Pattern to create user without logging out current admin
    const secondaryAppName = `Secondary-${Date.now()}`;
    let secondaryApp;
    try {
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);
      
      // 1. Create in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newEmail, password);
      const uid = userCredential.user.uid;
      
      // 2. Create in Firestore
      await setDoc(doc(db, 'users', uid), {
        email: newEmail,
        role: newRole,
        uid: uid,
        password: password // Store password for admin visibility
      });
      
      // 3. Clean up secondary app
      await signOut(secondaryAuth);
      
      setGeneratedPassword(password);
      setNewEmail('');
    } catch (err: any) {
      console.error("Provisioning Error:", err);
      if (err.message.includes('auth/email-already-in-use')) {
        setError("This email is already registered in the system.");
      } else if (err.message.includes('auth/weak-password')) {
        setError("The generated password was too weak. Please try again.");
      } else {
        setError(err.message || "Failed to provision new agent.");
      }
    } finally {
      if (secondaryApp) await deleteApp(secondaryApp);
      setIsProvisioning(false);
    }
  };

  const handleChangeRole = async (uid: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (err) {
      console.error("Update Role Error:", err);
      setError("Failed to update role.");
    }
  };

  const handleDeleteUser = async (uid: string) => {
    try {
      // Note: This only deletes from Firestore. 
      // Deleting from Firebase Auth requires Admin SDK or the user to be logged in.
      // For this prototype, we'll just remove their Firestore profile which revokes their app access.
      await deleteDoc(doc(db, 'users', uid));
    } catch (err) {
      console.error("Delete User Error:", err);
      setError("Failed to delete user profile.");
    }
  };

  const handleResetPassword = async (uid: string) => {
    const newPassword = generatePassword();
    try {
      await updateDoc(doc(db, 'users', uid), { password: newPassword });
      setGeneratedPassword(newPassword);
      setError(null);
    } catch (err) {
      console.error("Reset Password Error:", err);
      setError("Failed to reset password in database.");
    }
  };

  const handleViewPassword = (password?: string) => {
    if (password) {
      setGeneratedPassword(password);
    } else {
      setError("No password stored for this user.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">User Management</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Manage agent access and permissions</p>
        </div>
        <div className="bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{users.length} Active Agents</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2 animate-in shake">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add User Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-indigo-600 p-2 rounded-xl">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-slate-900">Provision New Agent</h3>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="agent@company.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Level</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRole('standard')}
                    className={`py-2 px-4 rounded-xl text-xs font-bold transition-all border ${
                      newRole === 'standard' 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole('admin')}
                    className={`py-2 px-4 rounded-xl text-xs font-bold transition-all border ${
                      newRole === 'admin' 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isProvisioning}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProvisioning ? <><Loader2 className="w-4 h-4 animate-spin" /> Provisioning...</> : 'Generate Credentials'}
              </button>
            </form>

            {generatedPassword && (
              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-3 animate-in zoom-in duration-300">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Key className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Agent Credentials</span>
                </div>
                <div className="flex items-center justify-between bg-white border border-emerald-200 p-3 rounded-xl">
                  <code className="text-sm font-mono font-bold text-slate-900">{generatedPassword}</code>
                  <button 
                    onClick={() => copyToClipboard(generatedPassword)}
                    className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-indigo-600"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[9px] text-emerald-600 font-medium leading-tight">
                  Copy this password now. It will not be shown again for security reasons.
                </p>
                <button 
                  onClick={() => setGeneratedPassword(null)}
                  className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>

        {/* User List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Agent</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((user) => (
                    <tr key={user.uid} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                            <UserIcon className="w-5 h-5" />
                          </div>
                          <span className="text-sm font-bold text-slate-900">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => user.uid && handleChangeRole(user.uid, user.role === 'admin' ? 'standard' : 'admin')}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                            user.role === 'admin'
                            ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                            : 'bg-slate-50 text-slate-500 border-slate-100'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          {user.role}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => handleViewPassword(user.password)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="View Password"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => user.uid && handleResetPassword(user.uid)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                            title="Reset Password"
                          >
                            <RefreshCcw className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => user.uid && handleDeleteUser(user.uid)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
