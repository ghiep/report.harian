import React, { useState } from 'react';
import { Bot, Send, Sparkles, User as UserIcon, RefreshCw, Lightbulb } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export const AIAssistantView: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: `Halo ${user?.name ? user.name.split(' ')[0] : ''}! Saya asisten produktivitas WorkFlow AI Anda. Saya memiliki akses ke data task, project, jadwal deadline, dan waktu kerja Anda. Ada yang bisa saya bantu analisis atau prioritaskan hari ini?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const quickPrompts = [
    'Bantu prioritaskan task saya hari ini',
    'Bagaimana cara mengatasi task yang tertunda?',
    'Analisis beban kerja dan risiko deadline saya',
    'Buat rekomendasi jadwal time-blocking untuk hari ini',
  ];

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: 'user', text: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      // Send history without first welcome message to save tokens
      const historyPayload = updatedMessages.slice(1, -1).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await api.askAssistant(text.trim(), historyPayload);
      setMessages((prev) => [...prev, { role: 'assistant', text: res.reply }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Maaf, terjadi kesalahan saat menghubungi asisten AI. Silakan coba kembali.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        text: `Halo ${user?.name ? user.name.split(' ')[0] : ''}! Riwayat obrolan telah dibersihkan. Apa yang ingin Anda diskusikan sekarang?`,
      },
    ]);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>WorkFlow AI Productivity Coach</span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-indigo-100 text-indigo-700">
                Gemini 2.5
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">
              Konsultasikan jadwal, strategi pengerjaan, dan optimasi alur kerja Anda
            </p>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition text-xs flex items-center gap-1"
          title="Bersihkan Riwayat Chat"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg, i) => {
          const isAssistant = msg.role === 'assistant';
          return (
            <div
              key={i}
              className={`flex items-start gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
            >
              {isAssistant && (
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-xs ${
                  isAssistant
                    ? 'bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-sm'
                    : 'bg-indigo-600 text-white rounded-tr-sm'
                }`}
              >
                {msg.text}
              </div>

              {!isAssistant && (
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3.5 rounded-2xl text-xs bg-slate-50 text-slate-500 border border-slate-200/80 flex items-center gap-2">
              <span>Asisten sedang memproses data pekerjaan Anda...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts Suggestions */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-2 text-xs">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-[11px] text-slate-400 shrink-0 font-medium">Saran:</span>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(qp)}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-[11px] font-medium shrink-0 transition"
            >
              {qp}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Tanyakan rekomendasi prioritas, breakdown project, atau tips fokus..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Kirim</span>
          </button>
        </form>
      </div>
    </div>
  );
};
