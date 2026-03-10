import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, 
  Users, 
  LayoutDashboard, 
  Settings, 
  Plus, 
  Trash2, 
  Mail, 
  Bell,
  Calendar,
  BookOpen,
  Image as ImageIcon,
  User as UserIcon,
  FileText,
  Download,
  Vote,
  BarChart3,
  CheckCircle2,
  Sun,
  Moon
} from 'lucide-react';
import { User, NewsItem, Activity, ReportCard } from './types';
import { Carousel } from './components/Carousel';
import { EmailModal } from './components/EmailModal';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'dashboard' | 'content' | 'users' | 'boletim' | 'polls'>('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  
  // Data states
  const [news, setNews] = useState<NewsItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  
  // Admin form states
  const [newNews, setNewNews] = useState({ title: '', content: '', image_url: '' });
  const [newActivity, setNewActivity] = useState({ title: '', image_url: '' });
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'student' as const });
  const [newReportCard, setNewReportCard] = useState({ user_id: 0, period: '' });
  const [newPoll, setNewPoll] = useState({ question: '', options: ['', ''] });
  const [showPollModal, setShowPollModal] = useState(false);
  const [activePoll, setActivePoll] = useState<any>(null);
  const [reportCardFile, setReportCardFile] = useState<File | null>(null);
  const [newsFile, setNewsFile] = useState<File | null>(null);
  const [activityFiles, setActivityFiles] = useState<File[]>([]);
  const [selectedUserForEmail, setSelectedUserForEmail] = useState<User | null>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, view]);

  const fetchData = async () => {
    const [newsRes, actRes, pollRes] = await Promise.all([
      fetch('/api/news'),
      fetch('/api/activities'),
      fetch(`/api/polls${user ? `?userId=${user.id}` : ''}`)
    ]);
    setNews(await newsRes.json());
    setActivities(await actRes.json());
    const pollData = await pollRes.json();
    setPolls(pollData);

    // Check for active poll to show to student
    if (user?.role === 'student') {
      const pendingPoll = pollData.find((p: any) => p.userVoted === null);
      if (pendingPoll) {
        setActivePoll(pendingPoll);
        setShowPollModal(true);
      }
    }

    if (user?.role === 'admin') {
      const usersRes = await fetch('/api/users');
      setAllUsers(await usersRes.json());
    }

    if (view === 'boletim' || view === 'content') {
      const url = user?.role === 'admin' ? '/api/report-cards' : `/api/report-cards?userId=${user?.id}`;
      console.log(`Fetching report cards from: ${url}`);
      const res = await fetch(url);
      const data = await res.json();
      console.log(`Fetched ${data.length} report cards`);
      setReportCards(data);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Erro ao conectar ao servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', newNews.title);
    formData.append('content', newNews.content);
    if (newsFile) {
      formData.append('file', newsFile);
    } else if (newNews.image_url) {
      formData.append('image_url', newNews.image_url);
    }

    await fetch('/api/news', {
      method: 'POST',
      body: formData,
    });
    setNewNews({ title: '', content: '', image_url: '' });
    setNewsFile(null);
    fetchData();
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', newActivity.title);
    
    if (activityFiles.length > 0) {
      activityFiles.forEach(file => {
        formData.append('files', file);
      });
    } else if (newActivity.image_url) {
      formData.append('image_url', newActivity.image_url);
    }

    await fetch('/api/activities', {
      method: 'POST',
      body: formData,
    });
    setNewActivity({ title: '', image_url: '' });
    setActivityFiles([]);
    fetchData();
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
    setNewUser({ email: '', name: '', role: 'student' });
    fetchData();
  };

  const handleAddReportCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newReportCard.user_id === 0 || !reportCardFile) {
      alert('Selecione um aluno e um arquivo');
      return;
    }

    const formData = new FormData();
    formData.append('user_id', newReportCard.user_id.toString());
    formData.append('period', newReportCard.period);
    formData.append('file', reportCardFile);

    await fetch('/api/report-cards', {
      method: 'POST',
      body: formData,
    });
    setNewReportCard({ user_id: 0, period: '' });
    setReportCardFile(null);
    fetchData();
  };

  const handleAddPoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoll.question || newPoll.options.some(o => !o)) {
      alert('Preencha a pergunta e todas as opções');
      return;
    }
    await fetch('/api/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPoll),
    });
    setNewPoll({ question: '', options: ['', ''] });
    fetchData();
  };

  const handleVote = async (pollId: number, optionIndex: number) => {
    if (!user) return;
    const res = await fetch(`/api/polls/${pollId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, optionIndex }),
    });
    if (res.ok) {
      setShowPollModal(false);
      fetchData();
    } else {
      const data = await res.json();
      alert(data.error);
    }
  };

  const deleteItem = async (type: 'news' | 'activities' | 'users' | 'report-cards' | 'polls', id: number) => {
    // Alerta inicial para confirmar que a função foi disparada
    alert(`Solicitação de exclusão recebida para ${type} com ID: ${id}`);
    
    if (!id) {
      alert('Erro crítico: ID do item está vazio ou inválido.');
      return;
    }
    
    try {
      const url = `/api/${type}/${id}`;
      console.log(`Executando DELETE em: ${url}`);
      
      const res = await fetch(url, { 
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const data = await res.json().catch(() => ({}));
      console.log('Resposta do servidor:', data);
      
      if (res.ok) {
        alert('✅ SUCESSO: O item foi excluído do banco de dados.');
        await fetchData();
      } else {
        alert(`❌ ERRO DO SERVIDOR: ${data.error || 'O servidor recusou a exclusão (Status: ' + res.status + ')'}`);
      }
    } catch (err) {
      console.error('Erro na requisição DELETE:', err);
      alert(`❌ ERRO DE REDE: Não foi possível se comunicar com o servidor. Detalhe: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 ${darkMode ? 'bg-bg-dark' : 'bg-bg-light'}`}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-surface-light dark:bg-surface-dark rounded-3xl shadow-2xl overflow-hidden border border-transparent dark:border-white/5"
        >
          <div className="bg-gradient-to-br from-brand-500 to-brand-700 p-8 text-center text-white relative">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
              title={darkMode ? "Modo Claro" : "Modo Escuro"}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md shadow-lg">
              <BookOpen size={32} />
            </div>
            <h1 className="text-4xl font-bold font-nba tracking-wider italic drop-shadow-md">1003</h1>
            <p className="text-brand-50 mt-2 font-medium">Acesse sua sala de aula virtual</p>
          </div>
          
          <form onSubmit={handleLogin} className="p-8 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/30">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2 opacity-80">Seu E-mail</label>
              <input
                required
                type="email"
                className="input-field"
                placeholder="aluno@escola.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 italic">Dica: Use admin@escola.com para testar o painel administrativo.</p>
            </div>
            <button
              disabled={loading}
              type="submit"
              className="w-full btn-primary h-12 text-lg shadow-lg shadow-brand-500/20"
            >
              {loading ? 'Entrando...' : 'Entrar no Sistema'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${darkMode ? 'bg-[#020617] text-[#f1f5f9]' : 'bg-white text-[#0f172a]'}`}>
      {/* Header */}
      <header className={`border-b sticky top-0 z-40 transition-colors ${darkMode ? 'bg-[#0f172a] border-white/5' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
              <BookOpen size={20} />
            </div>
            <span className="text-2xl font-bold font-nba tracking-wider text-text-light dark:text-text-dark hidden sm:block italic">1003</span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-white/5 rounded-lg transition-all"
              title={darkMode ? "Modo Claro" : "Modo Escuro"}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-white/5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{user.name}</span>
            </div>
            
            <button 
              onClick={() => setUser(null)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full">
        {/* Sidebar */}
        <aside className="w-full md:w-64 p-4 space-y-2 border-r border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-surface-dark transition-colors">
          <button
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              view === 'dashboard' ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5'
            }`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>

          <button
            onClick={() => setView('boletim')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              view === 'boletim' ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5'
            }`}
          >
            <FileText size={20} />
            Boletim
          </button>
          
          {user.role === 'admin' && (
            <>
              <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Administração</div>
              <button
                onClick={() => setView('content')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                  view === 'content' ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5'
                }`}
              >
                <ImageIcon size={20} />
                Gestão de Conteúdo
              </button>
              <button
                onClick={() => setView('polls')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                  view === 'polls' ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5'
                }`}
              >
                <Vote size={20} />
                Gestão de Enquetes
              </button>
              <button
                onClick={() => setView('users')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                  view === 'users' ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5'
                }`}
              >
                <Users size={20} />
                Gestão de Usuários
              </button>
            </>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            {view === 'dashboard' ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <section>
                  <h2 className="text-2xl font-bold font-display mb-6 flex items-center gap-2 text-text-light dark:text-text-dark">
                    <ImageIcon className="text-brand-600" />
                    Atividades em Destaque
                  </h2>
                  <Carousel activities={activities} />
                </section>

                {polls.length > 0 && (
                  <section>
                    <h2 className="text-2xl font-bold font-display mb-6 flex items-center gap-2 text-text-light dark:text-text-dark">
                      <BarChart3 className="text-brand-600" />
                      Enquetes da Escola
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {polls.map((poll) => (
                        <div key={poll.id} className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 transition-colors">
                          <h4 className="font-bold text-lg mb-4 text-text-light dark:text-text-dark">{poll.question}</h4>
                          <div className="space-y-3">
                            {poll.results.map((res: any, idx: number) => {
                              const totalVotes = poll.results.reduce((acc: number, r: any) => acc + r.count, 0);
                              const percentage = totalVotes > 0 ? Math.round((res.count / totalVotes) * 100) : 0;
                              const hasVotedThis = poll.userVoted === idx;
                              const showResults = poll.userVoted !== null || user?.role === 'admin';
                              
                              return (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between text-sm font-medium">
                                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                      {res.option}
                                      {hasVotedThis && <CheckCircle2 size={14} className="text-green-500" />}
                                    </span>
                                    {showResults && <span className="text-slate-500 dark:text-slate-400">{percentage}%</span>}
                                  </div>
                                  {showResults && (
                                    <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${hasVotedThis ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                  )}
                                  {!showResults && (
                                    <div className="w-full h-2 bg-slate-50 dark:bg-bg-dark rounded-full border border-slate-100 dark:border-white/5" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {poll.userVoted === null && (
                            <button 
                              onClick={() => {
                                setActivePoll(poll);
                                setShowPollModal(true);
                              }}
                              className="w-full mt-4 py-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-xl font-medium hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"
                            >
                              Votar Agora
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <h2 className="text-2xl font-bold font-display mb-6 flex items-center gap-2 text-text-light dark:text-text-dark">
                    <Bell className="text-brand-600" />
                    Mural de Notícias
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {news.slice(0, 4).map((item) => (
                      <div key={item.id} className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-white/5 hover:shadow-md transition-all flex gap-6">
                        {item.image_url && (
                          <img 
                            src={item.image_url} 
                            className="w-24 h-24 rounded-xl object-cover flex-shrink-0" 
                            alt=""
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg text-text-light dark:text-text-dark">{item.title}</h3>
                            <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-md">
                              {new Date(item.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 line-clamp-3 text-sm leading-relaxed">
                            {item.content}
                          </p>
                        </div>
                      </div>
                    ))}
                    {news.length === 0 && (
                      <div className="col-span-full p-12 text-center bg-surface-light dark:bg-surface-dark rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/5 text-slate-400">
                        Nenhuma notícia cadastrada no momento.
                      </div>
                    )}
                  </div>
                </section>
              </motion.div>
            ) : view === 'boletim' ? (
              <motion.div
                key="boletim"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold font-display flex items-center gap-2 text-text-light dark:text-text-dark">
                    <FileText className="text-brand-600" />
                    {user.role === 'admin' ? 'Gerenciar Boletins' : 'Meu Boletim'}
                  </h2>
                </div>

                {user.role === 'admin' && (
                  <section className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 mb-8 transition-colors">
                    <h3 className="font-bold mb-4 text-text-light dark:text-text-dark">Enviar Boletim (Arquivo)</h3>
                    <form onSubmit={handleAddReportCard} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Aluno</label>
                        <select 
                          required
                          className="input-field"
                          value={newReportCard.user_id}
                          onChange={e => setNewReportCard({...newReportCard, user_id: parseInt(e.target.value)})}
                        >
                          <option value="0">Selecionar Aluno</option>
                          {allUsers.filter(u => u.role === 'student').map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Bimestre</label>
                        <select 
                          required
                          className="input-field"
                          value={newReportCard.period}
                          onChange={e => setNewReportCard({...newReportCard, period: e.target.value})}
                        >
                          <option value="">Selecionar Bimestre</option>
                          <option value="1º Bimestre">1º Bimestre</option>
                          <option value="2º Bimestre">2º Bimestre</option>
                          <option value="3º Bimestre">3º Bimestre</option>
                          <option value="4º Bimestre">4º Bimestre</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Arquivo (PDF, Imagem, etc)</label>
                        <label className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors">
                          <ImageIcon size={18} className="text-slate-400" />
                          <span className="text-sm text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                            {reportCardFile ? reportCardFile.name : 'Escolher Arquivo'}
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => setReportCardFile(e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                      <button type="submit" className="btn-primary flex items-center justify-center gap-2 h-[42px]">
                        <Plus size={18} /> Enviar Boletim
                      </button>
                    </form>
                  </section>
                )}

                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden transition-colors">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                      <tr>
                        {user.role === 'admin' && <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Aluno</th>}
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Arquivo</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Bimestre</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Data de Envio</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {reportCards.map(rc => (
                        <tr key={rc.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                          {user.role === 'admin' && <td className="px-6 py-4 font-medium text-text-light dark:text-text-dark">{rc.student_name}</td>}
                          <td className="px-6 py-4">
                            <a 
                              href={rc.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-brand-600 dark:text-brand-400 hover:underline font-medium"
                            >
                              <FileText size={16} />
                              {rc.file_name}
                            </a>
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{rc.period}</td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-500 text-sm">
                            {new Date(rc.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <a 
                                href={rc.file_url} 
                                download={rc.file_name}
                                className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                                title="Baixar"
                              >
                                <Download size={18} />
                              </a>
                              {user.role === 'admin' && (
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    deleteItem('report-cards', rc.id);
                                  }}
                                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center"
                                  title="Excluir"
                                  type="button"
                                >
                                  <Trash2 size={18} className="pointer-events-none" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {reportCards.length === 0 && (
                        <tr>
                          <td colSpan={user.role === 'admin' ? 5 : 3} className="px-6 py-12 text-center text-slate-400 dark:text-slate-600 italic">
                            Nenhuma nota lançada ainda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : view === 'content' ? (
              <motion.div
                key="content"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-12"
              >
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* News Management */}
                  <div>
                    <h2 className="text-2xl font-bold font-display mb-6 flex items-center gap-2 text-text-light dark:text-text-dark">
                      <Bell className="text-brand-600" />
                      Gerenciar Notícias
                    </h2>
                    <form onSubmit={handleAddNews} className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 mb-6 space-y-4 transition-colors">
                      <input
                        required
                        className="input-field"
                        placeholder="Título da Notícia"
                        value={newNews.title}
                        onChange={e => setNewNews({...newNews, title: e.target.value})}
                      />
                      <textarea
                        required
                        className="input-field h-24"
                        placeholder="Conteúdo"
                        value={newNews.content}
                        onChange={e => setNewNews({...newNews, content: e.target.value})}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          className="input-field"
                          placeholder="Ou cole a URL da Imagem"
                          value={newNews.image_url}
                          onChange={e => setNewNews({...newNews, image_url: e.target.value})}
                        />
                        <label className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors">
                          <ImageIcon size={18} className="text-slate-400" />
                          <span className="text-sm text-slate-600 dark:text-slate-400 truncate">
                            {newsFile ? newsFile.name : 'Upload de Foto'}
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => setNewsFile(e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                      <button type="submit" className="w-full btn-primary flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20">
                        <Plus size={18} /> Publicar Notícia
                      </button>
                    </form>
                    <div className="space-y-3">
                      {news.map(n => (
                        <div key={n.id} className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-slate-100 dark:border-white/5 flex justify-between items-center transition-colors">
                          <span className="font-medium truncate mr-4 text-text-light dark:text-text-dark">{n.title}</span>
                          <button onClick={() => deleteItem('news', n.id)} className="text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Activity Management */}
                  <div>
                    <h2 className="text-2xl font-bold font-display mb-6 flex items-center gap-2 text-text-light dark:text-text-dark">
                      <ImageIcon className="text-brand-600" />
                      Gerenciar Carrossel
                    </h2>
                    <form onSubmit={handleAddActivity} className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 mb-6 space-y-4 transition-colors">
                      <input
                        required
                        className="input-field"
                        placeholder="Título da Atividade"
                        value={newActivity.title}
                        onChange={e => setNewActivity({...newActivity, title: e.target.value})}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          className="input-field"
                          placeholder="Ou cole a URL da Imagem"
                          value={newActivity.image_url}
                          onChange={e => setNewActivity({...newActivity, image_url: e.target.value})}
                        />
                        <label className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors">
                          <ImageIcon size={18} className="text-slate-400" />
                          <span className="text-sm text-slate-600 dark:text-slate-400 truncate">
                            {activityFiles.length > 0 ? `${activityFiles.length} fotos selecionadas` : 'Upload de Fotos (até 5)'}
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []).slice(0, 5);
                              setActivityFiles(files);
                            }}
                          />
                        </label>
                      </div>
                      <button type="submit" className="w-full btn-primary flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20">
                        <Plus size={18} /> Adicionar ao Carrossel
                      </button>
                    </form>
                    <div className="space-y-3">
                      {activities.map(a => (
                        <div key={a.id} className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-slate-100 dark:border-white/5 flex justify-between items-center transition-colors">
                          <div className="flex items-center gap-3">
                            <img src={a.image_url} className="w-10 h-10 rounded-lg object-cover" alt="" referrerPolicy="no-referrer" />
                            <span className="font-medium text-text-light dark:text-text-dark">{a.title}</span>
                          </div>
                          <button onClick={() => deleteItem('activities', a.id)} className="text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </motion.div>
            ) : view === 'users' ? (
              <motion.div
                key="users"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-12"
              >
                <section>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold font-display flex items-center gap-2 text-text-light dark:text-text-dark">
                      <Users className="text-brand-600" />
                      Gestão de Usuários
                    </h2>
                  </div>
                  
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-1">
                      <form onSubmit={handleAddUser} className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 sticky top-24 transition-colors">
                        <h3 className="font-bold mb-4 text-text-light dark:text-text-dark">Novo Usuário</h3>
                        <div className="space-y-4">
                          <input
                            required
                            className="input-field"
                            placeholder="Nome Completo"
                            value={newUser.name}
                            onChange={e => setNewUser({...newUser, name: e.target.value})}
                          />
                          <input
                            required
                            type="email"
                            className="input-field"
                            placeholder="Email"
                            value={newUser.email}
                            onChange={e => setNewUser({...newUser, email: e.target.value})}
                          />
                          <select 
                            className="input-field"
                            value={newUser.role}
                            onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                          >
                            <option value="student">Aluno</option>
                            <option value="admin">Administrador</option>
                          </select>
                          <button type="submit" className="w-full btn-primary flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20">
                            <Plus size={18} /> Adicionar
                          </button>
                        </div>
                      </form>
                    </div>

                    <div className="xl:col-span-2">
                      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden transition-colors">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                            <tr>
                              <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Usuário</th>
                              <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Papel</th>
                              <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400 text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {allUsers.map(u => (
                              <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400">
                                      <UserIcon size={16} />
                                    </div>
                                    <div>
                                      <div className="font-medium text-text-light dark:text-text-dark">{u.name}</div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                                    u.role === 'admin' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                  }`}>
                                    {u.role === 'admin' ? 'Admin' : 'Aluno'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-2">
                                    <button 
                                      onClick={() => setSelectedUserForEmail(u)}
                                      className="p-2 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
                                      title="Enviar E-mail"
                                    >
                                      <Mail size={18} />
                                    </button>
                                    <button 
                                      onClick={() => deleteItem('users', u.id)}
                                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                      title="Excluir"
                                    >
                                      <Trash2 size={18} />
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
                </section>
              </motion.div>
            ) : view === 'polls' ? (
              <motion.div
                key="polls"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold font-display flex items-center gap-2 text-text-light dark:text-text-dark">
                    <Vote className="text-brand-600" />
                    Gestão de Enquetes
                  </h2>
                </div>

                <section className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 mb-8 transition-colors">
                  <h3 className="font-bold mb-4 text-text-light dark:text-text-dark">Criar Nova Enquete</h3>
                  <form onSubmit={handleAddPoll} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Pergunta</label>
                      <input 
                        required
                        className="input-field"
                        placeholder="Ex: Qual tema você prefere para a festa junina?"
                        value={newPoll.question}
                        onChange={e => setNewPoll({...newPoll, question: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Opções</label>
                      {newPoll.options.map((opt, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input 
                            required
                            className="input-field"
                            placeholder={`Opção ${idx + 1}`}
                            value={opt}
                            onChange={e => {
                              const newOpts = [...newPoll.options];
                              newOpts[idx] = e.target.value;
                              setNewPoll({...newPoll, options: newOpts});
                            }}
                          />
                          {newPoll.options.length > 2 && (
                            <button 
                              type="button"
                              onClick={() => {
                                const newOpts = newPoll.options.filter((_, i) => i !== idx);
                                setNewPoll({...newPoll, options: newOpts});
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button 
                        type="button"
                        onClick={() => setNewPoll({...newPoll, options: [...newPoll.options, '']})}
                        className="text-sm text-brand-600 font-medium hover:underline flex items-center gap-1"
                      >
                        <Plus size={14} /> Adicionar Opção
                      </button>
                    </div>
                    <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20">
                      <Plus size={18} /> Criar Enquete
                    </button>
                  </form>
                </section>

                <section>
                  <h3 className="font-bold mb-4 text-text-light dark:text-text-dark">Enquetes Ativas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {polls.map((poll) => (
                      <div key={poll.id} className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 relative transition-colors">
                        <button 
                          onClick={() => deleteItem('polls', poll.id)}
                          className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                        <h4 className="font-bold text-lg mb-4 pr-8 text-text-light dark:text-text-dark">{poll.question}</h4>
                        <div className="space-y-3">
                          {poll.results.map((res: any, idx: number) => {
                            const totalVotes = poll.results.reduce((acc: number, r: any) => acc + r.count, 0);
                            const percentage = totalVotes > 0 ? Math.round((res.count / totalVotes) * 100) : 0;
                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-sm font-medium">
                                  <span className="text-slate-700 dark:text-slate-300">{res.option}</span>
                                  <span className="text-slate-500 dark:text-slate-400">{res.count} votos ({percentage}%)</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-brand-500 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </motion.div>
            ) : (
              <div />
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Modals */}
      {showPollModal && activePoll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-surface-light dark:bg-surface-dark rounded-3xl p-8 max-w-md w-full shadow-2xl border border-transparent dark:border-white/5 transition-colors"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center text-brand-600 dark:text-brand-400">
                <Vote size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-light dark:text-text-dark">Nova Enquete!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Sua opinião é muito importante.</p>
              </div>
            </div>

            <p className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-6">{activePoll.question}</p>

            <div className="space-y-3">
              {activePoll.options.map((opt: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => handleVote(activePoll.id, idx)}
                  className="w-full p-4 text-left border border-slate-200 dark:border-white/10 rounded-2xl hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-white/5 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-brand-700 dark:group-hover:text-brand-400">{opt}</span>
                    <Plus size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-brand-500" />
                  </div>
                </button>
              ))}
            </div>

            <button 
              onClick={() => setShowPollModal(false)}
              className="w-full mt-6 py-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium transition-colors"
            >
              Votar depois
            </button>
          </motion.div>
        </div>
      )}

      {selectedUserForEmail && (
        <EmailModal 
          user={selectedUserForEmail} 
          onClose={() => setSelectedUserForEmail(null)} 
        />
      )}

      {/* Footer */}
      <footer className="bg-surface-light dark:bg-surface-dark border-t border-slate-200 dark:border-white/5 py-6 text-center text-slate-400 dark:text-slate-500 text-sm transition-colors">
        &copy; {new Date().getFullYear()} 1003 - Sistema de Gestão Escolar
      </footer>
    </div>
  );
}
