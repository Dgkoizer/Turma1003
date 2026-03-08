import React, { useState } from 'react';
import { X, Send, Paperclip } from 'lucide-react';
import { User } from '../types';

interface EmailModalProps {
  user: User;
  onClose: () => void;
}

export const EmailModal: React.FC<EmailModalProps> = ({ user, onClose }) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const formData = new FormData();
    formData.append('to', user.email);
    formData.append('subject', subject);
    formData.append('body', body);
    if (file) formData.append('file', file);

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ type: 'success', msg: data.message || 'E-mail enviado com sucesso!' });
        setTimeout(onClose, 2000);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || 'Erro ao enviar e-mail' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-transparent dark:border-white/5 transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/5">
          <div>
            <h3 className="text-xl font-bold font-display text-text-light dark:text-text-dark">Enviar E-mail</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Para: {user.name} ({user.email})</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors text-slate-500 dark:text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {status && (
            <div className={`p-3 rounded-lg text-sm ${status.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
              {status.msg}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assunto</label>
            <input
              required
              type="text"
              className="input-field"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Nota da Atividade"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mensagem</label>
            <textarea
              required
              rows={5}
              className="input-field resize-none"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escreva sua mensagem aqui..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Anexo (Opcional)</label>
            <div className="flex items-center gap-4">
              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-white/5 transition-all cursor-pointer">
                <Paperclip size={18} className="text-slate-400 dark:text-slate-500" />
                <span className="text-sm text-slate-600 dark:text-slate-400 truncate">
                  {file ? file.name : 'Clique para anexar um arquivo'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
              {file && (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 font-medium hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              disabled={loading}
              type="submit"
              className="flex-1 btn-primary flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={18} />
                  Enviar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
