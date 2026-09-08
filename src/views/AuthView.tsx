import React, { useState } from 'react';
import { Sparkles, ArrowRight, Lock, Mail, User as UserIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export const AuthView: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      if (isForgotPassword) {
        const res = await api.forgotPassword(email);
        setInfoMessage(res.message);
      } else if (isRegister) {
        if (!name.trim()) throw new Error('Nama lengkap wajib diisi.');
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memproses permintaan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center px-4">
        {/* Brand Icon */}
        <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-400 flex items-center justify-center shadow-xl shadow-indigo-500/25 ring-1 ring-white/20 mb-3">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          WorkFlow <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-300">AI</span>
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-400 font-medium">
          Personal Work Management & Productivity System
        </p>
        <p className="text-[11px] text-indigo-300/80 font-mono tracking-wider mt-1 uppercase">
          Capture → Organize → Prioritize → Execute → Review → Analyze
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 relative z-10">
        <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl rounded-2xl">
          {/* Tab toggler (Login vs Register) */}
          {!isForgotPassword && (
            <div className="flex rounded-xl bg-slate-800/80 p-1 mb-6 border border-slate-700/50">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  !isRegister ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Masuk (Login)
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  isRegister ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Daftar Akun Baru
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && !isForgotPassword && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Pratama"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {!isForgotPassword && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Kata Sandi (Password)
                  </label>
                  {!isRegister && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError(null);
                      }}
                      className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300"
                    >
                      Lupa password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              <span>
                {loading
                  ? 'Memproses...'
                  : isForgotPassword
                  ? 'Kirim Link Reset'
                  : isRegister
                  ? 'Daftar & Masuk'
                  : 'Masuk ke Dashboard'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {isForgotPassword && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError(null);
                  setInfoMessage(null);
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                ← Kembali ke halaman Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
