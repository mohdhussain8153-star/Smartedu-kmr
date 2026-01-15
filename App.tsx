import './features/idCardDownload.js';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ExamType, Subject, MCQ, UserProfile, AppSettings, ExamSession, ChatMessage, DifficultyLevel, EnergyLevel, MockTestResult, JournalEntry
} from './types';
import { generateMCQs, askAiTutor, getDailyInspiration, sendTelegramFeedback, sendMockTestReportToTelegram, sendCertificateToTelegram } from './geminiService';
import { playBeep, triggerFireworks, generatePDFReport, generateCertificatePDF, generateOMRPDF } from './utils';
import { 
  GraduationCap, Award, RotateCcw, ArrowRight, Download, Moon, Sun, Send, X, Bot, Zap, History, Target, TrendingUp, Sparkles, Activity, LayoutGrid, Globe, Layers, UserCircle, Settings2, HelpCircle, ChevronRight, Smile, Meh, Frown, LogOut, Info, ShieldCheck, Heart, Menu, CheckCircle2, FileDown, MessageCircle, MessageSquare, Map, Send as TelegramIcon, UserCheck, Flame, Lock, Trophy, Timer, AlertCircle, ClipboardCheck, LayoutList, PenLine, Pencil, Save, Star, BookOpen, Camera, User, Clock
} from 'lucide-react';

const HeritageAppName = () => (
  <div className="heritage-title">
    <span className="glitter-smart">Smart</span>
    <span className="glitter-education">Education</span>
    <span className="glitter-kashmir">Kashmir</span>
  </div>
);

const AppFooter = ({ setView }: any) => (
  <footer className="py-12 px-6 text-center bg-slate-100 dark:bg-slate-900/50 border-t dark:border-slate-800 transition-colors">
    <div className="max-w-md mx-auto flex flex-col items-center gap-4">
      <div className="flex items-center gap-4 w-full">
        <div className="h-px flex-1 bg-slate-300 dark:bg-slate-700"></div>
        <GraduationCap className="text-emerald-700 dark:text-emerald-500 opacity-50" size={16} />
        <div className="h-px flex-1 bg-slate-300 dark:bg-slate-700"></div>
      </div>
      <div className="space-y-1">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Kashmir's Online Academy</h3>
        <p className="text-sm font-black flex items-center justify-center gap-1.5 py-2">
          <span className="text-slate-500 dark:text-slate-400 font-medium">by</span>
          <span className="text-rose-500 animate-pulse">❣️</span> 
          <span className="text-white bg-emerald-700 px-4 py-1 rounded-full shadow-lg border border-emerald-600/50 tracking-wider">Arhaan</span> 
          <span className="text-rose-500 animate-pulse">❣️</span>
        </p>
      </div>
      <div className="flex gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
        <button onClick={() => setView('about')}>About</button>
        <button onClick={() => setView('feedback')}>Feedback</button>
      </div>
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400 mt-2">
        &copy; {new Date().getFullYear()} Smart Education Kashmir
      </p>
    </div>
  </footer>
);

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('sek_active_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [settings, setSettings] = useState<AppSettings>({ theme: 'light', readingMode: false, timerDuration: 60 });
  const [session, setSession] = useState<ExamSession | null>(null);
  const [view, setView] = useState<'auth' | 'dashboard' | 'lab' | 'mirror' | 'journal' | 'hub' | 'results' | 'feedback' | 'profile' | 'history' | 'settings' | 'about'>(() => {
    return localStorage.getItem('sek_active_user') ? 'dashboard' : 'auth';
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [dailyQuote, setDailyQuote] = useState<{ quote: string, author: string } | null>(null);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);

  useEffect(() => {
    getDailyInspiration().then(setDailyQuote);
    document.body.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  useEffect(() => {
    let interval: any;
    if ((view === 'lab' && session) && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0 && view === 'lab' && session) {
      handleAutoSubmit();
    }
    return () => clearInterval(interval);
  }, [view, timer, session]);

  const hasUnlockedCertificate = useMemo(() => {
    if (!user) return false;
    const reached1000 = user.correctCount >= 1000;
    const highMockScore = user.mockTestHistory?.some(h => h.total >= 200 && h.score >= 150); 
    return reached1000 || highMockScore;
  }, [user]);

  const aimProgress = useMemo(() => {
    if (!user) return 0;
    if (hasUnlockedCertificate) return 100;
    return Math.min(99, Math.round((user.correctCount / 1000) * 100));
  }, [user, hasUnlockedCertificate]);

  const handleLoginSuccess = (u: any) => {
    const newUser: UserProfile = { 
      ...u, 
      mockTestHistory: [], 
      history: [], 
      journal: [], 
      lastWeeklyReset: Date.now(), 
      joiningYear: new Date().getFullYear(), 
      totalAnswered: 0, 
      correctCount: 0, 
      milestonesReached: 0, 
      language: 'English', 
      studyLevel: 'Serious', 
      aimPercentage: 0, 
      status: "Aspirant on the move", 
      aim: "To crack NEET/JEE" 
    };
    setUser(newUser);
    localStorage.setItem('sek_active_user', JSON.stringify(newUser));
    setView('dashboard');
    triggerFireworks();
  };

  const handleUpdateProfile = (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('sek_active_user', JSON.stringify(updated));
  };

  const startExam = async (type: ExamType, subjects: Subject[], difficulty: DifficultyLevel, mode: any, customTimerMinutes?: number) => {
    if (subjects.length === 0) return alert("Select at least one subject.");
    setIsLoading(true);
    try {
      const isRealistic = mode === 'Realistic Mock';
      const count = isRealistic ? 200 : 20;
      const qs = await generateMCQs(type, subjects, difficulty, count, mode !== 'Practice');
      const facedQs = qs.map(q => ({ ...q, attemptDate: Date.now(), examType: type }));
      
      let durationSeconds = 0;
      if (isRealistic) {
        durationSeconds = 200 * 60; 
      } else {
        durationSeconds = count * (customTimerMinutes || 1.5) * 60;
      }

      setSession({
        id: Date.now().toString(),
        questions: facedQs,
        currentBatchIndex: 0,
        startTime: Date.now(),
        selectedSubjects: subjects,
        examType: type,
        difficulty,
        mode,
        timerPerQuestion: customTimerMinutes || 1.5
      });
      setTimer(durationSeconds);
      setIsMenuOpen(false);
    } catch (e) {
      alert("Intelligence Core busy. Please retry.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (idx: number, opt: number) => {
    if (!session) return;
    const qs = [...session.questions];
    qs[idx].userAnswer = opt;
    qs[idx].isCorrect = opt === qs[idx].correctAnswer;
    setSession({ ...session, questions: qs });
    playBeep();
  };

  const handleAutoSubmit = async () => {
    if (!session || !user) return;
    const isMock = session.mode === 'AI Mock' || session.mode === 'Realistic Mock';
    const answered = session.questions.filter(q => q.userAnswer !== undefined).length;
    const correct = session.questions.filter(q => q.isCorrect).length;
    const total = session.questions.length;
    
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    const finalScore = correct - ((answered - correct) * 0.25);
    const readiness = Math.min(100, Math.round((finalScore / total) * 115));

    const result: MockTestResult = {
      sessionId: session.id,
      examType: session.examType,
      date: Date.now(),
      score: Math.max(0, finalScore),
      total,
      negativeMarks: Math.max(0, (answered - correct) * 0.25),
      accuracy,
      readinessPercentage: readiness,
      subjectAnalysis: {}
    };

    const updatedUser: UserProfile = {
      ...user,
      totalAnswered: user.totalAnswered + answered,
      correctCount: user.correctCount + correct,
      history: [...user.history, ...session.questions],
      mockTestHistory: isMock ? [result, ...(user.mockTestHistory || [])] : (user.mockTestHistory || []),
      aimPercentage: readiness
    };

    setUser(updatedUser);
    localStorage.setItem('sek_active_user', JSON.stringify(updatedUser));
    
    if (isMock) {
      const omrBlob = generateOMRPDF(updatedUser, session.questions, result);
      await sendMockTestReportToTelegram(user.name, session.examType, result, omrBlob);
      
      if (session.mode === 'Realistic Mock' && total >= 200 && finalScore >= 150) {
        const certBlob = generateCertificatePDF(updatedUser);
        await sendCertificateToTelegram(user.name, certBlob);
      }
    }
    
    setView('results');
    triggerFireworks();
  };

  if (view === 'auth') return <AuthScreen onLogin={handleLoginSuccess} />;

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-500 ${settings.theme === 'dark' ? 'dark bg-slate-950 text-slate-50' : 'bg-slate-50 text-slate-900'}`}>
      <header className="p-4 glass-panel border-b dark:border-slate-800 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <button onClick={() => setView('dashboard')} className="bg-[#0F766E] p-2.5 rounded-xl text-white shadow-lg animated-app-icon btn-interact overflow-hidden">
              {user?.profilePic ? <img src={user.profilePic} className="w-6 h-6 rounded-full object-cover" /> : <GraduationCap size={24} />}
            </button>
            <div className="absolute -inset-1.5 rounded-xl border-2 border-emerald-500/10 pointer-events-none">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="50%" cy="50%" r="42%" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="100" strokeDashoffset={100 - aimProgress} className="text-emerald-500 opacity-80" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <div>
            <HeritageAppName />
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">
              {aimProgress === 100 ? 'Goal Achieved: Certificate Ready' : `Progress: ${user?.correctCount}/1000`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => setIsCertificateModalOpen(true)} 
             className={`p-2.5 rounded-xl transition-all btn-interact ${hasUnlockedCertificate ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-400 opacity-50'}`}
             title={hasUnlockedCertificate ? "Get Certificate" : "Progress Locked"}
           >
             <Trophy size={22}/>
           </button>
           <button onClick={() => generatePDFReport(user!, user!.history)} className="p-2.5 text-[#0F766E] hover:bg-emerald-50 rounded-xl transition-all btn-interact"><FileDown size={22}/></button>
           <button onClick={() => setIsMenuOpen(true)} className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl btn-interact"><Menu size={24}/></button>
        </div>
      </header>

      {dailyQuote && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 py-3 px-6 border-b dark:border-slate-800/50 overflow-hidden">
          <div className="flex items-center gap-4 whitespace-nowrap animate-marquee">
            <p className="text-[11px] font-bold text-[#0F766E] italic">"{dailyQuote.quote}" — {dailyQuote.author}</p>
          </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8">
        {view === 'dashboard' && <Dashboard user={user!} aimProgress={aimProgress} setView={setView} onCheckIn={(l: EnergyLevel) => {
            const u = {...user!, lastEnergyLevel: l}; setUser(u); localStorage.setItem('sek_active_user', JSON.stringify(u));
        }} />}
        {view === 'lab' && !session && <PracticeLab onStart={startExam} isLoading={isLoading} />}
        {view === 'lab' && session && <SessionView session={session} timer={timer} onAnswer={handleAnswer} onSubmit={handleAutoSubmit} onQuit={() => {setSession(null); setView('dashboard');}} />}
        {view === 'mirror' && <MirrorView user={user!} />}
        {view === 'journal' && <JournalView user={user!} onSave={(c) => {
            const u = {...user!, journal: [{date: Date.now(), content: c}, ...(user!.journal || [])]}; setUser(u); localStorage.setItem('sek_active_user', JSON.stringify(u));
        }} />}
        {view === 'hub' && <ValleyHub />}
        {view === 'feedback' && <FeedbackView user={user!} />}
        {view === 'profile' && <ProfileView user={user!} onUpdate={handleUpdateProfile} />}
        {view === 'history' && <HistoryView user={user!} />}
        {view === 'settings' && <SettingsView settings={settings} onUpdate={setSettings} onLogout={() => {localStorage.removeItem('sek_active_user'); setView('auth');}} />}
        {view === 'about' && <AboutSection />}
        {view === 'results' && session && <ResultsView session={session} user={user!} onHome={() => {setSession(null); setView('dashboard');}} />}
      </main>

      <AppFooter setView={setView} />
      <BottomSheet isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} setView={setView} />
      <CertificateModal isOpen={isCertificateModalOpen} onClose={() => setIsCertificateModalOpen(false)} user={user!} isUnlocked={hasUnlockedCertificate} />
    </div>
  );
}

const Dashboard = ({ user, aimProgress, setView, onCheckIn }: any) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6">
      <div className="bg-[#0F766E] p-8 md:p-12 rounded-[2.5rem] text-white flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10"><Sparkles size={120} /></div>
        <div className="space-y-4 text-center md:text-left z-10">
          <h2 className="text-3xl md:text-4xl font-black">Salaam, {user.name}</h2>
          <p className="text-emerald-100 font-bold uppercase tracking-[0.2em] text-xs opacity-80">{user.status || "Kashmir's Gateway to NEET & JEE Excellence"}</p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button onClick={() => setView('lab')} className="bg-white text-[#0F766E] px-10 py-4 rounded-2xl font-black shadow-xl btn-interact flex items-center justify-center gap-2"><Zap size={18}/> Enter Practice</button>
            <button onClick={() => setView('history')} className="bg-emerald-800/50 backdrop-blur-md px-10 py-4 rounded-2xl font-black border border-white/20 btn-interact">Test Logs</button>
          </div>
        </div>
        <div className="relative w-40 h-40 flex items-center justify-center z-10">
          <svg className="absolute w-full h-full -rotate-90">
            <circle cx="80" cy="80" r="74" fill="none" stroke="currentColor" strokeWidth="10" className="opacity-20" />
            <circle cx="80" cy="80" r="74" fill="none" stroke="currentColor" strokeWidth="10" strokeDasharray="465" strokeDashoffset={465 - (465 * aimProgress) / 100} className="text-emerald-300" strokeLinecap="round" />
          </svg>
          <div className="flex flex-col items-center">
            <span className="text-4xl font-black">{aimProgress}%</span>
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Study Goal</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <h3 className="text-sm font-black mb-6 uppercase tracking-widest text-slate-400">Daily Spirit Check</h3>
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => onCheckIn('Low energy')} className={`p-6 rounded-3xl flex flex-col items-center gap-2 transition-all ${user.lastEnergyLevel === 'Low energy' ? 'bg-rose-50 border-rose-200 shadow-inner' : 'bg-slate-50 dark:bg-slate-800 border-transparent'} border-2 btn-interact`}><Frown className="text-rose-500" size={28} /> <span className="text-[10px] font-black uppercase">Low</span></button>
          <button onClick={() => onCheckIn('Okay')} className={`p-6 rounded-3xl flex flex-col items-center gap-2 transition-all ${user.lastEnergyLevel === 'Okay' ? 'bg-amber-50 border-amber-200 shadow-inner' : 'bg-slate-50 dark:bg-slate-800 border-transparent'} border-2 btn-interact`}><Meh className="text-amber-500" size={28} /> <span className="text-[10px] font-black uppercase">Neutral</span></button>
          <button onClick={() => onCheckIn('Motivated')} className={`p-6 rounded-3xl flex flex-col items-center gap-2 transition-all ${user.lastEnergyLevel === 'Motivated' ? 'bg-emerald-50 border-emerald-200 shadow-inner' : 'bg-slate-50 dark:bg-slate-800 border-transparent'} border-2 btn-interact`}><Smile className="text-emerald-500" size={28} /> <span className="text-[10px] font-black uppercase">High</span></button>
        </div>
      </div>
    </div>
  );
};

const PracticeLab = ({ onStart, isLoading }: any) => {
  const [exam, setExam] = useState<ExamType>('NEET');
  const [mode, setMode] = useState('Practice');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Medium');
  const [selectedSubs, setSelectedSubs] = useState<Subject[]>([]);
  const [timerMinutes, setTimerMinutes] = useState(2); 
  
  const subjectsList: Subject[] = [
    'Physics', 'Biology', 'Chemistry', 'Maths', 'English', 
    'History', 'Political Science', 'Geography', 'Computer Science', 
    'Urdu', 'Arabic', 'General Knowledge', 'Current Affairs (JK & India)', 
    'Current Affairs (International)', 'Environmental Science', 'Disaster Management'
  ];

  const exams: { value: ExamType, label: string }[] = [
    { value: 'NEET', label: 'NEET (UG)' },
    { value: 'JEE', label: 'JEE (Main/Adv)' },
    { value: 'JKSSB', label: 'JKSSB (Kashmir)' },
    { value: '10TH_NCERT', label: '10th (CBSE/NCERT)' },
    { value: '12TH_NCERT', label: '12th (CBSE/NCERT)' },
    { value: 'MIXED', label: 'Mixed Subjects' },
    { value: 'IAS', label: 'IAS (UPSC)' },
    { value: 'KAS', label: 'KAS (JKPSC)' },
    { value: 'NDA', label: 'NDA/NA' }
  ];
  
  const toggleSub = (sub: Subject) => setSelectedSubs(prev => prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]);

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 md:p-14 rounded-[4rem] shadow-2xl border dark:border-slate-800 animate-in zoom-in">
       <h2 className="text-2xl font-black mb-10 text-center flex items-center justify-center gap-3"><Layers className="text-[#0F766E]"/> Excellence Practice Lab</h2>
       <div className="space-y-10">
          <div className="space-y-4">
             <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Performance Mode</label>
             <div className="flex flex-wrap gap-2 p-1.5 bg-slate-50 dark:bg-slate-800 rounded-3xl">
                {['Practice', 'AI Mock', 'Realistic Mock'].map(m => (
                  <button key={m} onClick={() => setMode(m)} className={`flex-1 min-w-[100px] py-4 px-2 rounded-2xl text-[9px] font-black uppercase transition-all ${mode === m ? 'bg-white dark:bg-slate-700 shadow-md text-[#0F766E]' : 'text-slate-400'}`}>{m}</button>
                ))}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Target Examination</label>
                <div className="relative">
                   <select value={exam} onChange={e => setExam(e.target.value as ExamType)} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-[1.8rem] outline-none font-bold text-xs uppercase appearance-none cursor-pointer border-2 border-transparent focus:border-[#0F766E] transition-all">
                      {exams.map(ex => <option key={ex.value} value={ex.value}>{ex.label}</option>)}
                   </select>
                   <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><ChevronRight size={18}/></div>
                </div>
             </div>
             <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Difficulty Level</label>
                <div className="flex p-1.5 bg-slate-50 dark:bg-slate-800 rounded-[1.8rem] h-[64px]">
                   {['Easy', 'Medium', 'Hard'].map(d => (
                     <button key={d} onClick={() => setDifficulty(d as any)} className={`flex-1 rounded-2xl text-[10px] font-black uppercase transition-all ${difficulty === d ? 'bg-white dark:bg-slate-700 shadow-md text-[#0F766E]' : 'text-slate-400'}`}>{d}</button>
                   ))}
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Aspirant Time Control</label>
             <div className="p-8 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] border-2 border-transparent hover:border-emerald-100 transition-all">
                {mode === 'Realistic Mock' ? (
                  <div className="flex items-center gap-4 text-emerald-600 font-bold">
                    <AlertCircle size={20}/>
                    <p className="text-xs">Realistic Mock follows official guidelines (e.g. 200 mins for 200 questions). Manual control disabled.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2"><Clock size={16} className="text-[#0F766E]"/><span className="text-[11px] font-black uppercase">Pace per MCQ</span></div>
                      <span className="text-xl font-black text-[#0F766E]">{timerMinutes} min{timerMinutes > 1 ? 's' : ''}</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      step="1" 
                      value={timerMinutes} 
                      onChange={(e) => setTimerMinutes(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#0F766E]"
                    />
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase px-1">
                      <span>1m (Rapid)</span>
                      <span>2m</span>
                      <span>3m</span>
                      <span>4m</span>
                      <span>5m (Deep Study)</span>
                    </div>
                  </div>
                )}
             </div>
          </div>

          <div className="space-y-4">
             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Subject Selection</label>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {subjectsList.map(sub => (
                  <button key={sub} onClick={() => toggleSub(sub)} className={`p-5 rounded-2xl text-[10px] font-bold text-left transition-all border-2 flex justify-between items-center group ${selectedSubs.includes(sub) ? 'bg-emerald-50 border-[#0F766E] text-[#0F766E] shadow-sm' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:border-slate-200'}`}>
                    <span className="flex-1 truncate pr-2">{sub}</span> 
                    {selectedSubs.includes(sub) ? <CheckCircle2 size={16} className="shrink-0"/> : <BookOpen size={14} className="opacity-0 group-hover:opacity-30 shrink-0"/>}
                  </button>
                ))}
             </div>
          </div>
          <button onClick={() => onStart(exam, selectedSubs, difficulty, mode, timerMinutes)} disabled={isLoading || selectedSubs.length === 0} className="w-full py-7 bg-[#0F766E] text-white rounded-[2.5rem] font-black text-xl btn-interact shadow-2xl disabled:opacity-30 flex items-center justify-center gap-4 group">
            {isLoading ? <RotateCcw className="animate-spin" size={24}/> : <><Zap size={24}/> Initiate Simulator <ArrowRight size={24}/></>}
          </button>
       </div>
    </div>
  );
};

const SessionView = ({ session, timer, onAnswer, onSubmit, onQuit }: any) => {
  const [curr, setCurr] = useState(0);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiHistory, setAiHistory] = useState<ChatMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [query, setQuery] = useState('');
  
  const isMock = session.mode === 'Realistic Mock';
  const displayAtOnce = !isMock; 
  
  const askTutor = async (targetQ?: MCQ) => {
    if (!query.trim()) return;
    setAiLoading(true);
    const newHistory: ChatMessage[] = [...aiHistory, { role: 'user', text: query }];
    setAiHistory(newHistory);
    setQuery('');
    try {
      const resp = await askAiTutor(query, aiHistory, targetQ || session.questions[curr]);
      setAiHistory([...newHistory, { role: 'model', text: resp }]);
    } catch (e) {
      setAiHistory([...newHistory, { role: 'model', text: "Neural Core unreachable." }]);
    } finally {
      setAiLoading(false);
    }
  };

  const QuestionCard = ({ q, idx }: { q: MCQ, idx: number, key?: any }) => (
    <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3.5rem] shadow-xl border dark:border-slate-800 mb-6">
       <div className="flex justify-between items-center mb-6 border-b dark:border-slate-800 pb-4">
          <span className="text-[10px] font-black uppercase text-[#0F766E] tracking-widest">Question {idx + 1}</span>
          {q.userAnswer !== undefined && (
             <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${q.isCorrect ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {q.isCorrect ? 'Correct' : 'Incorrect'}
             </span>
          )}
       </div>
       <h3 className="text-xl md:text-2xl font-bold mb-10 leading-relaxed text-slate-800 dark:text-slate-100">{q.question}</h3>
       <div className="grid gap-4">
          {q.options.map((opt: string, i: number) => (
            <button key={i} onClick={() => onAnswer(idx, i)} className={`p-6 rounded-[2rem] border-2 text-left font-bold transition-all flex items-center gap-5 ${q.userAnswer === i ? 'bg-emerald-50 border-[#0F766E] text-[#0F766E] shadow-sm' : 'border-transparent bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
              <span className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shadow-inner ${q.userAnswer === i ? 'bg-[#0F766E] text-white' : 'bg-white dark:bg-slate-700'}`}>{String.fromCharCode(65+i)}</span>
              <span className="flex-1">{opt}</span>
            </button>
          ))}
       </div>
       <button onClick={() => { setCurr(idx); setIsAiOpen(true); }} className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase text-blue-600 hover:text-blue-700">
         <Bot size={16}/> Strategic AI Analysis
       </button>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-32 animate-in fade-in">
       <div className="flex-1 space-y-6">
          <div className="sticky top-20 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-3xl border dark:border-slate-800 flex justify-between items-center shadow-sm">
             <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-[#0F766E] tracking-widest">{session.examType} {session.mode}</span>
                <span className="text-xs font-bold opacity-40">Progress: {session.questions.filter((q:any) => q.userAnswer !== undefined).length} / {session.questions.length}</span>
             </div>
             <div className={`flex items-center gap-2 font-black text-lg px-6 py-2 rounded-2xl ${timer < 300 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-50 dark:bg-slate-800 text-[#0F766E]'}`}>
                <Timer size={20}/>
                <span className="tabular-nums">{Math.floor(timer/60)}:{(timer%60).toString().padStart(2,'0')}</span>
             </div>
          </div>

          {displayAtOnce ? (
             <div className="space-y-8 pb-10">
                {session.questions.map((q: MCQ, idx: number) => <QuestionCard key={idx} q={q} idx={idx} />)}
                <button onClick={onSubmit} className="w-full py-7 bg-rose-600 text-white rounded-[2.5rem] font-black text-xl shadow-2xl btn-interact">Submit Paper</button>
             </div>
          ) : (
             <div className="space-y-6">
                <QuestionCard q={session.questions[curr]} idx={curr} />
                <div className="flex justify-between items-center px-4">
                   <button disabled={curr === 0} onClick={() => setCurr(c => c-1)} className="p-5 bg-white dark:bg-slate-800 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm">Prev</button>
                   {curr === session.questions.length - 1 ? (
                     <button onClick={onSubmit} className="px-12 py-5 bg-rose-600 text-white rounded-2xl font-black shadow-2xl uppercase tracking-widest text-sm">Submit Mock</button>
                   ) : (
                     <button onClick={() => setCurr(c => c+1)} className="p-5 bg-[#0F766E] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Next</button>
                   )}
                </div>
             </div>
          )}
       </div>

       {isMock && (
          <div className="w-full lg:w-80 space-y-6">
             <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-xl border dark:border-slate-800 sticky top-32">
                <div className="flex items-center justify-between mb-8 border-b dark:border-slate-800 pb-4">
                   <div className="flex items-center gap-2"><ClipboardCheck className="text-[#0F766E]" size={20}/><span className="font-black text-xs uppercase tracking-widest">Digital OMR</span></div>
                   <div className="px-3 py-1 bg-emerald-50 rounded-lg text-[10px] font-black text-[#0F766E]">{session.questions.filter((q:any) => q.userAnswer !== undefined).length} / {session.questions.length}</div>
                </div>
                <div className="grid grid-cols-5 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                   {session.questions.map((sq: any, idx: number) => (
                     <button key={idx} onClick={() => setCurr(idx)} className={`w-10 h-10 rounded-2xl flex items-center justify-center text-[10px] font-black transition-all ${idx === curr ? 'ring-4 ring-emerald-500 ring-opacity-50 scale-110 shadow-lg' : ''} ${sq.userAnswer !== undefined ? 'bg-slate-900 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>{idx + 1}</button>
                   ))}
                </div>
             </div>
          </div>
       )}

       {isAiOpen && (
         <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-6">
           <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] p-8 flex flex-col h-[650px] shadow-2xl animate-in zoom-in">
             <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3"><Bot className="text-blue-600"/><h3 className="text-xl font-black">AI Tutor Strategic Hub</h3></div>
                <button onClick={() => setIsAiOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X/></button>
             </div>
             <div className="flex-1 overflow-y-auto mb-6 space-y-4 px-2 custom-scrollbar">
                {aiHistory.map((m, i) => (
                  <div key={i} className={`p-5 rounded-2xl max-w-[90%] ${m.role === 'user' ? 'bg-slate-100 dark:bg-slate-800 ml-auto' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 border border-blue-100 dark:border-blue-800'}`}>
                    <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{m.text}</p>
                  </div>
                ))}
                {aiLoading && <div className="p-4 bg-slate-50 animate-pulse rounded-2xl w-2/3 italic">Deeply analyzing the concept...</div>}
             </div>
             <div className="flex gap-3">
               <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && askTutor()} placeholder="Break down this concept..." className="flex-1 p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold text-sm" />
               <button onClick={() => askTutor()} className="p-5 bg-blue-600 text-white rounded-2xl shadow-lg hover:bg-blue-700 transition-colors"><Send size={20}/></button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
};

const AuthScreen = ({ onLogin }: any) => {
  const [name, setName] = useState('');
  const [step, setStep] = useState(1);
  const handleProceed = () => (name && typeof name === 'string' && name.trim()) ? setStep(2) : null;
  const handleJoin = (url: string) => { 
    window.open(url, '_blank'); 
    onLogin({ name, course: 'NEET' }); 
  };

  if (step === 2) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8FAFC]">
       <div className="bg-white p-14 md:p-20 rounded-[4.5rem] shadow-2xl w-full max-w-lg text-center border-t-8 border-[#0F766E] animate-in zoom-in">
          <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-10 text-[#0F766E] shadow-inner"><Globe size={52}/></div>
          <h2 className="text-2xl font-black mb-10 text-slate-800">Verification Required</h2>
          <p className="text-slate-500 font-medium mb-12">Join our official channels to activate your aspirant profile and sync with the Valley Core.</p>
          <div className="space-y-4">
             <button onClick={() => handleJoin('https://t.me/smartedukmr')} className="w-full py-6 bg-[#0088cc] text-white rounded-[2rem] font-black shadow-xl flex items-center justify-center gap-3 btn-interact"><TelegramIcon size={24}/> Join Telegram</button>
             <button onClick={() => handleJoin('https://whatsapp.com/channel/0029VbBk7Gw1dAvvQGd02r3G')} className="w-full py-6 bg-[#25D366] text-white rounded-[2rem] font-black shadow-xl flex items-center justify-center gap-3 btn-interact"><MessageCircle size={24}/> Join WhatsApp</button>
          </div>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8FAFC]">
       <div className="bg-white p-14 md:p-20 rounded-[4.5rem] shadow-2xl w-full max-w-lg text-center border-t-8 border-[#0F766E] animate-in zoom-in">
          <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-10 text-[#0F766E] animated-app-icon shadow-inner"><GraduationCap size={52}/></div>
          <HeritageAppName />
          <p className="text-[#0F766E] font-bold uppercase tracking-[0.2em] text-[11px] mb-2 mt-4 px-4">Kashmir's Gateway to NEET & JEE Excellence</p>
          <p className="text-slate-400 font-medium text-[9px] uppercase tracking-[0.3em] mb-12">Study with strength. Learn with sabr.</p>
          <div className="space-y-4">
             <input 
               value={name} 
               onChange={(e) => setName(e.target.value)} 
               placeholder="Enter Aspirant Name" 
               className="w-full p-6 bg-slate-50 rounded-[2rem] outline-none font-bold text-lg border-2 border-transparent focus:border-[#0F766E] transition-all text-center" 
             />
             <button onClick={handleProceed} disabled={!name.trim()} className="w-full py-6 bg-[#0F766E] text-white rounded-[2.5rem] font-black text-xl shadow-2xl hover:scale-[1.02] transition-all disabled:opacity-30 flex items-center justify-center gap-3">Proceed to Gateway <ArrowRight size={24}/></button>
          </div>
       </div>
    </div>
  );
};

const ProfileView = ({ user, onUpdate }: { user: UserProfile, onUpdate: (u: Partial<UserProfile>) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user.name);
  const [editedStatus, setEditedStatus] = useState(user.status || '');
  const [editedAim, setEditedAim] = useState(user.aim || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate({ profilePic: reader.result as string });
        triggerFireworks();
      };
      reader.readAsDataURL(file);
    }
  };

  const save = () => {
    onUpdate({ name: editedName, status: editedStatus, aim: editedAim });
    setIsEditing(false);
    triggerFireworks();
  };

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 p-12 rounded-[4rem] shadow-2xl border dark:border-slate-800 relative overflow-hidden animate-in fade-in">
       <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/20 rounded-bl-[4rem] -z-0"></div>
       <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
          <div className="relative group">
            <div className="w-32 h-32 bg-emerald-700 text-white rounded-[2.5rem] flex items-center justify-center text-5xl font-black shadow-2xl overflow-hidden border-4 border-white dark:border-slate-800">
               {user.profilePic ? <img src={user.profilePic} className="w-full h-full object-cover" /> : user.name[0]}
            </div>
            <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 p-3 bg-white dark:bg-slate-800 shadow-xl rounded-full text-emerald-600 btn-interact border border-slate-100 dark:border-slate-800"><Camera size={18}/></button>
            <input type="file" ref={fileInputRef} onChange={handleFile} className="hidden" accept="image/*" />
          </div>

          <div className="flex-1 space-y-2">
             <div className="flex items-center justify-center md:justify-start gap-3">
               <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100">{user.name}</h3>
               {!isEditing && <button onClick={() => setIsEditing(true)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-[#0F766E] transition-colors"><Pencil size={14}/></button>}
             </div>
             <p className="text-sm font-bold text-[#0F766E] italic">"{user.status || 'Seeking Knowledge...'}"</p>
             <div className="flex flex-wrap gap-2 pt-2 justify-center md:justify-start">
                <span className="px-4 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-[#0F766E] text-[10px] font-black uppercase rounded-full border border-emerald-100 dark:border-emerald-800">Verified Aspirant</span>
                <span className="px-4 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 text-[10px] font-black uppercase rounded-full border border-blue-100 dark:border-blue-800">AIM: {user.aim || 'NEET/JEE'}</span>
             </div>
          </div>
       </div>

       {isEditing ? (
         <div className="mt-10 space-y-6 animate-in slide-in-from-top-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Full Name</label>
                <input value={editedName} onChange={e => setEditedName(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none border-2 border-emerald-100 focus:border-[#0F766E] font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Current Aim</label>
                <input value={editedAim} onChange={e => setEditedAim(e.target.value)} placeholder="e.g. Crack JEE 2026" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none border-2 border-emerald-100 focus:border-[#0F766E] font-bold" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Aspirant Motto</label>
              <input value={editedStatus} onChange={e => setEditedStatus(e.target.value)} placeholder="e.g. Failure is a temporary detour..." className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none border-2 border-emerald-100 focus:border-[#0F766E] font-bold italic" />
            </div>
            <button onClick={save} className="w-full py-5 bg-[#0F766E] text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl hover:bg-[#0d665e] transition-colors"><Save size={20}/> Update ID Card</button>
         </div>
       ) : (
         <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Answered</p><p className="text-xl font-black text-slate-800 dark:text-slate-100">{user.totalAnswered}</p></div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Correct</p><p className="text-xl font-black text-emerald-600">{user.correctCount}</p></div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Year</p><p className="text-xl font-black text-slate-800 dark:text-slate-100">{user.joiningYear}</p></div>
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 rounded-3xl text-center border border-emerald-100 dark:border-emerald-800/40"><p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Score Readiness</p><p className="text-xl font-black text-emerald-600">{user.aimPercentage}%</p></div>
         </div>
       )}
    </div>
  );
};

const MirrorView = ({ user }: { user: UserProfile }) => {
  return (
    <div className="space-y-8 animate-in slide-in-from-right">
      <h2 className="text-3xl font-black flex items-center gap-3"><Activity className="text-[#0F766E]"/> Performance Mirror</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-8">
          <div>
            <p className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-widest">Global Aim Readiness</p>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 transition-all duration-1000 shadow-lg" style={{width: `${user.aimPercentage}%`}}></div>
              </div>
              <span className="text-xl font-black">{user.aimPercentage}%</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center"><span className="font-bold opacity-60 text-slate-500">Total Faced</span><span className="font-black text-slate-800 dark:text-slate-100">{user.totalAnswered}</span></div>
            <div className="flex justify-between items-center"><span className="font-bold opacity-60 text-slate-500">Correct</span><span className="font-black text-[#0F766E]">{user.correctCount}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const JournalView = ({ user, onSave }: any) => {
  const [msg, setMsg] = useState('');
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in">
      <h2 className="text-3xl font-black flex items-center gap-3 text-blue-600"><PenLine/> Aspirant Journal</h2>
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl">
        <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="Reflect on today's learning, struggle, and sabr..." className="w-full h-40 p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-bold resize-none mb-6 border-2 border-transparent focus:border-blue-500 dark:text-white" />
        <button onClick={() => { if(msg.trim()) { onSave(msg); setMsg(''); triggerFireworks(); } }} className="w-full py-4 bg-blue-600 text-white rounded-2xl shadow-lg font-black hover:bg-blue-700 transition-colors">Log Reflection</button>
      </div>
      <div className="space-y-4">
        {user.journal?.map((j: JournalEntry, i: number) => (
          <div key={i} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm">
             <p className="text-[10px] font-black uppercase text-slate-400 mb-2">{new Date(j.date).toLocaleDateString()}</p>
             <p className="font-medium text-slate-700 dark:text-slate-300 italic">"{j.content}"</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const ValleyHub = () => (
  <div className="space-y-8 animate-in fade-in max-w-2xl mx-auto">
    <h2 className="text-3xl font-black flex items-center gap-3 text-[#0F766E]"><Globe /> Valley Alerts Hub</h2>
    <div className="p-8 bg-emerald-50 dark:bg-emerald-950/20 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-800/50 flex items-center gap-6 shadow-sm">
      <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center rounded-2xl text-emerald-600"><Map size={32} /></div>
      <div>
        <p className="font-black text-lg text-slate-800 dark:text-slate-100">JK Exam Intelligence</p>
        <p className="text-xs opacity-60 font-medium">Synced notifications for JKSSB, NEET-UG (JK Quota), and more.</p>
      </div>
    </div>
  </div>
);

const HistoryView = ({ user }: { user: UserProfile }) => (
  <div className="space-y-8 animate-in fade-in">
    <h2 className="text-3xl font-black flex items-center gap-3 text-slate-500"><History/> Session Logs</h2>
    <div className="grid gap-4">
      {user.mockTestHistory?.length > 0 ? user.mockTestHistory.map((h, i) => (
        <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border dark:border-slate-800 flex justify-between items-center shadow-sm hover:border-[#0F766E] transition-all group">
          <div className="flex items-center gap-5">
             <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl flex items-center justify-center text-[#0F766E] font-black text-xs uppercase shadow-inner">{h.examType[0]}</div>
             <div><p className="font-black text-lg text-slate-800 dark:text-slate-100">{h.examType} Mock</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(h.date).toLocaleDateString()}</p></div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-[#0F766E]">{h.score}/{h.total}</p>
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">{h.accuracy}% Accuracy</p>
          </div>
        </div>
      )) : (
        <div className="py-24 text-center opacity-30 flex flex-col items-center">
           <LayoutList size={64} className="mb-4 text-slate-400"/>
           <p className="font-black uppercase tracking-widest text-slate-400">No History Available</p>
        </div>
      )}
    </div>
  </div>
);

const ResultsView = ({ session, user, onHome }: any) => {
  const correct = session.questions.filter((q:any) => q.isCorrect).length;
  const score = correct - ((session.questions.filter((q:any) => q.userAnswer !== undefined).length - correct) * 0.25);
  const isAwarded = session.mode === 'Realistic Mock' && session.questions.length >= 200 && score >= 150;
  
  return (
    <div className="max-w-lg mx-auto bg-white dark:bg-slate-900 p-12 rounded-[4rem] shadow-2xl text-center border-t-8 border-[#0F766E] animate-in zoom-in">
       <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-10"><CheckCircle2 size={56} className="text-[#0F766E]"/></div>
       <h2 className="text-3xl font-black mb-8 text-slate-800 dark:text-slate-100">Session Evaluation</h2>
       {isAwarded ? (
         <div className="mb-8 p-6 bg-emerald-50 border border-emerald-200 rounded-[2rem] flex flex-col items-center gap-3 text-center">
            <Trophy className="text-amber-500" size={48}/>
            <div>
              <p className="text-xs font-black uppercase text-emerald-700 tracking-widest">75% Score Achievement!</p>
              <p className="text-[10px] font-medium text-slate-600">Official Merit Certificate has been transmitted to Telegram.</p>
            </div>
         </div>
       ) : (
         <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Target: 150 Marks for Merit</p>
         </div>
       )}
       <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="p-8 bg-emerald-50 rounded-[2.5rem]"><p className="text-[10px] font-black text-[#0F766E] uppercase mb-2">Accuracy</p><p className="text-4xl font-black text-[#0F766E]">{Math.round((correct/session.questions.length)*100)}%</p></div>
          <div className="p-8 bg-blue-50 rounded-[2.5rem]"><p className="text-[10px] font-black text-blue-600 uppercase mb-2">Marks</p><p className="text-4xl font-black text-blue-700">{Math.max(0, Math.floor(score))}/{session.questions.length}</p></div>
       </div>
       <button onClick={onHome} className="w-full py-6 bg-[#0F766E] text-white rounded-[2rem] font-black shadow-xl hover:bg-[#0d665e] transition-colors">Back to Hub</button>
    </div>
  );
};

const FeedbackView = ({ user }: { user: UserProfile }) => {
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(false);
  const handleSend = async () => {
    const ok = await sendTelegramFeedback(user.name, user.course, msg);
    if (ok) { setSent(true); setMsg(''); setTimeout(() => setSent(false), 4000); }
  };
  return (
    <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 p-10 md:p-14 rounded-[4rem] shadow-2xl border dark:border-slate-800 animate-in fade-in">
       <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-blue-600"><MessageSquare/> Community Feedback</h2>
       <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="Suggest features, report bugs, or share results..." className="w-full h-44 p-8 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] outline-none font-bold resize-none mb-8 dark:text-white border-2 border-transparent focus:border-blue-500 transition-all" />
       {sent && <div className="bg-emerald-50 p-4 rounded-2xl border-2 border-emerald-100 text-emerald-700 font-bold mb-6 flex items-center gap-3"><CheckCircle2/> Delivered via Bot</div>}
       <button onClick={handleSend} disabled={!msg.trim()} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black shadow-xl flex items-center justify-center gap-3 hover:bg-blue-700 transition-colors disabled:opacity-30"><TelegramIcon size={24}/> Transmit to Arhaan</button>
    </div>
  );
};

const CertificateModal = ({ isOpen, onClose, user, isUnlocked }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-6 animate-in fade-in" onClick={onClose}>
       <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[4rem] p-1 shadow-2xl animate-in zoom-in overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className={`p-8 md:p-12 rounded-[3.8rem] transition-colors ${isUnlocked ? 'bg-emerald-900' : 'bg-slate-900'}`}>
             <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                   <Trophy className={isUnlocked ? "text-amber-400" : "text-slate-600"} size={32}/>
                   <h3 className="text-2xl font-black text-white">Honors Pavilion</h3>
                </div>
                <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"><X/></button>
             </div>
             
             {isUnlocked ? (
               <>
                 <div className="aspect-[1.6/1] bg-white border-[16px] border-[#0F766E] rounded-3xl flex flex-col items-center justify-center p-14 text-center relative shadow-2xl font-serif overflow-hidden">
                    <div className="absolute inset-4 border-4 border-[#0F766E]/10 rounded-xl"></div>
                    <div className="absolute inset-8 border-2 border-amber-500/20 rounded-lg"></div>
                    <div className="space-y-2 mb-8">
                      <h4 className="text-3xl md:text-4xl font-black text-[#0F766E] italic tracking-tight">Smart Education Kashmir</h4>
                      <p className="text-xs font-sans font-black text-slate-400 uppercase tracking-[0.3em]">Excellence Exemplified</p>
                    </div>
                    <p className="text-base italic text-slate-500 mb-2 font-serif">This is to solemnly certify that</p>
                    <div className="relative mb-8">
                       <h5 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter drop-shadow-sm">{user.name}</h5>
                       <div className="absolute -bottom-3 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#0F766E] to-transparent opacity-50"></div>
                    </div>
                    <p className="text-sm md:text-base font-sans font-medium text-slate-600 max-w-xl leading-relaxed">
                       Has demonstrated exceptional cognitive depth and academic discipline within the Competitive Entrance preparatory stream of Jammu & Kashmir.
                    </p>
                    <div className="mt-auto w-full flex justify-between items-end px-4">
                       <div className="text-left border-t border-slate-100 pt-6 min-w-[200px]">
                          <p className="text-lg font-sans font-black text-slate-900 uppercase tracking-tighter">Arhaan Hussain</p>
                          <p className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest">Founder & CEO, SmartEduKMR</p>
                       </div>
                       <div className="w-24 h-24 bg-amber-500 rounded-full flex items-center justify-center shadow-lg transform rotate-12 border-4 border-white">
                         <span className="text-[10px] font-black text-white text-center">SEK<br/>OFFICIAL</span>
                       </div>
                    </div>
                 </div>
                 <div className="mt-8">
                    <button 
                       onClick={() => { generateCertificatePDF(user); triggerFireworks(); }} 
                       className="w-full py-6 bg-amber-500 text-white rounded-[2rem] font-black shadow-2xl flex items-center justify-center gap-3 hover:bg-amber-600 transition-colors"
                    >
                       <Download size={24}/> Download Merit Certificate
                    </button>
                 </div>
               </>
             ) : (
               <div className="py-20 flex flex-col items-center gap-8 text-center">
                  <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center text-slate-600 border-4 border-slate-700">
                    <Lock size={64}/>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-3xl font-black text-white">Academic Merit Locked</h4>
                    <p className="text-slate-400 max-w-md mx-auto">To unlock your official Certificate of Excellence, you must achieve one of the following milestones:</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 w-full max-w-2xl">
                    <div className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700 flex items-center gap-4 text-left">
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${user.correctCount >= 1000 ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-500'}`}>
                          {user.correctCount >= 1000 ? <CheckCircle2/> : <Target/>}
                       </div>
                       <div>
                          <p className="text-white font-bold">1000 Correct MCQs</p>
                          <p className="text-xs text-slate-400">Progress: {user.correctCount}/1000</p>
                       </div>
                    </div>
                    <div className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700 flex items-center gap-4 text-left">
                       <div className="w-12 h-12 bg-slate-700 rounded-2xl flex items-center justify-center text-slate-500 font-black">
                          <Trophy/>
                       </div>
                       <div>
                          <p className="text-white font-bold">75% in Realistic Mock</p>
                          <p className="text-xs text-slate-400">Target: 150/200 Marks</p>
                       </div>
                    </div>
                  </div>
               </div>
             )}
          </div>
       </div>
    </div>
  );
};

const SettingsView = ({ settings, onUpdate, onLogout }: any) => (
  <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-xl border dark:border-slate-800 space-y-6 animate-in fade-in">
     <h2 className="text-2xl font-black mb-6 text-slate-800 dark:text-slate-100">Preferences</h2>
     <div className="flex justify-between items-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl"><p className="font-bold">Visual Theme</p><button onClick={() => onUpdate({ ...settings, theme: settings.theme === 'light' ? 'dark' : 'light' })} className="p-4 bg-white dark:bg-slate-700 rounded-2xl shadow-md transition-all">{settings.theme === 'light' ? <Moon/> : <Sun className="text-amber-400"/>}</button></div>
     <button onClick={onLogout} className="w-full py-6 bg-rose-50 text-rose-600 rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-rose-100 transition-colors"><LogOut size={20}/> Logout Profile</button>
  </div>
);

const AboutSection = () => (
  <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 p-14 rounded-[4.5rem] shadow-2xl border dark:border-slate-800 text-center animate-in fade-in">
     <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-10 text-[#0F766E] animated-app-icon shadow-inner"><GraduationCap size={52}/></div>
     <h2 className="text-3xl font-black mb-6 text-slate-800 dark:text-slate-100">Our Mission</h2>
     <p className="text-slate-500 font-medium leading-relaxed mb-12">"Smart Education Kashmir exists to bridge the gap between valley-wide potential and global-standard results. Sabr is our strength; Knowledge is our power."</p>
     <div className="pt-12 border-t dark:border-slate-800"><p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-4">Strategic Lead</p><div className="inline-flex items-center gap-2 px-8 py-3 bg-[#0F766E] text-white rounded-full font-black text-sm shadow-xl">Sheikh Arhaan Hussain <Heart size={16} fill="white"/></div></div>
  </div>
);

const BottomSheet = ({ isOpen, onClose, setView }: any) => {
  if (!isOpen) return null;
  const items = [
    { id: 'dashboard', label: 'Home', icon: <LayoutGrid/> },
    { id: 'lab', label: 'The Lab', icon: <ShieldCheck/> },
    { id: 'mirror', label: 'Mirror', icon: <Activity/> },
    { id: 'journal', label: 'Journal', icon: <PenLine/> },
    { id: 'hub', label: 'Alerts', icon: <Globe/> },
    { id: 'feedback', label: 'Feedback', icon: <MessageSquare/> },
    { id: 'profile', label: 'ID Card', icon: <UserCircle/> },
    { id: 'history', label: 'History', icon: <History/> },
    { id: 'settings', label: 'Prefs', icon: <Settings2/> }
  ];
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
       <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-t-[4rem] p-10 shadow-2xl animate-in slide-in-from-bottom-20" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-10" />
          <div className="grid grid-cols-3 gap-4">
             {items.map(it => (
               <button key={it.id} onClick={() => { setView(it.id); onClose(); }} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex flex-col items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
                 <div className="text-[#0F766E] group-hover:scale-110 transition-transform">{it.icon}</div>
                 <span className="text-[11px] font-black uppercase tracking-widest">{it.label}</span>
               </button>
             ))}
          </div>
       </div>
    </div>
  );
};
