'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

type Language = 'en' | 'am' | 'om';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  inputType?: 'text' | 'voice' | 'photo';
  attachmentName?: string;
}

export default function ApplyPage() {
  const [sessionId, setSessionId] = useState<string>('');
  const [language, setLanguage] = useState<Language>('en');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [licensePhoto, setLicensePhoto] = useState<File | null>(null);
  const [workshopPhoto, setWorkshopPhoto] = useState<File | null>(null);
  
  // Application State
  const [flatEvidence, setFlatEvidence] = useState<Record<string, any>>({});
  const [gaps, setGaps] = useState<any[]>([]);
  const [contradictions, setContradictions] = useState<any[]>([]);
  const [sdgSuggestions, setSdgSuggestions] = useState<any[]>([]);
  const [progress, setProgress] = useState<number>(0);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'chat' | 'evidence' | 'gaps' | 'sdgs'>('chat');
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or restore session
  useEffect(() => {
    let existingSession = localStorage.getItem('fundflow_session_id');
    if (!existingSession) {
      existingSession = `web-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('fundflow_session_id', existingSession);
    }
    setSessionId(existingSession);

    // Initial greeting
    sendMessage('', existingSession, 'en', true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice recording logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const file = new File([audioBlob], 'voice-recording.wav', { type: 'audio/wav' });
        setAudioFile(file);
        // Automatically send voice note
        await handleSend(file, null, null);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError('Microphone access denied or not supported in this browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleLanguageChange = async (newLang: Language) => {
    setLanguage(newLang);
    // Notify session service of language change
    await sendMessage(`/lang ${newLang}`, sessionId, newLang);
  };

  const sendMessage = async (
    text: string,
    sessId: string,
    lang: Language,
    isInitial = false,
    audioOverride?: File | null,
    licenseOverride?: File | null,
    workshopOverride?: File | null
  ) => {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('userId', 'web-applicant');
    formData.append('sessionId', sessId || sessionId);
    if (text) formData.append('text', text);
    
    const curAudio = audioOverride !== undefined ? audioOverride : audioFile;
    if (curAudio) formData.append('audio', curAudio);

    const curLicense = licenseOverride !== undefined ? licenseOverride : licensePhoto;
    const curWorkshop = workshopOverride !== undefined ? workshopOverride : workshopPhoto;

    if (curLicense) formData.append('photos', curLicense);
    if (curWorkshop) formData.append('photos', curWorkshop);

    // Display user message in chat bubble
    if (!isInitial) {
      let attachmentName: string | undefined;
      let msgType: 'text' | 'voice' | 'photo' = 'text';

      if (curAudio) {
        msgType = 'voice';
        attachmentName = 'Voice Note';
      } else if (curLicense || curWorkshop) {
        msgType = 'photo';
        attachmentName = curLicense ? 'Business License' : 'Workshop Photo';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2),
          role: 'user',
          content: text || (curAudio ? '[Voice Note Sent]' : '[Photo Uploaded]'),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          inputType: msgType,
          attachmentName,
        },
      ]);
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'x-language': lang,
        },
        body: formData,
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (data.text) {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2),
            role: 'assistant',
            content: data.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }

      if (data.evidence) setFlatEvidence(data.evidence);
      if (data.gaps) setGaps(data.gaps);
      if (data.contradictions) setContradictions(data.contradictions);
      if (data.sdgSuggestions) setSdgSuggestions(data.sdgSuggestions);
      if (data.progress !== undefined) setProgress(data.progress);

      // Reset file attachments after successful send
      setInputText('');
      setAudioFile(null);
      setLicensePhoto(null);
      setWorkshopPhoto(null);
    } catch (err: any) {
      setError(err.message || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (
    audioOverride?: File | null,
    licenseOverride?: File | null,
    workshopOverride?: File | null
  ) => {
    if (!inputText.trim() && !audioOverride && !licenseOverride && !workshopOverride && !audioFile && !licensePhoto && !workshopPhoto) {
      return;
    }
    await sendMessage(inputText, sessionId, language, false, audioOverride, licenseOverride, workshopOverride);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      {/* Top App Bar */}
      <header className="h-16 border-b border-slate-800 bg-[#0d121d]/90 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
            ←
          </Link>
          <div>
            <h1 className="font-bold text-white text-base md:text-lg flex items-center gap-2">
              FUNDflow Intake
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                Live Session
              </span>
            </h1>
            <p className="text-xs text-slate-400">SME Support Scheme Application</p>
          </div>
        </div>

        {/* Language Switcher & Progress */}
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => handleLanguageChange('en')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                language === 'en' ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              English
            </button>
            <button
              onClick={() => handleLanguageChange('am')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                language === 'am' ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              አማርኛ
            </button>
            <button
              onClick={() => handleLanguageChange('om')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                language === 'om' ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Oromoo
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="hidden sm:flex flex-col items-end">
            <div className="text-xs font-semibold text-slate-300">Readiness: {progress}%</div>
            <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 max-w-7xl w-full mx-auto p-2 md:p-4 gap-4 overflow-hidden">
        {/* Left Column / Mobile Tabs: Chat Console */}
        <div className="lg:col-span-8 flex flex-col h-[calc(100vh-5rem)] bg-[#121721] rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
          {/* Mobile Tab Switcher */}
          <div className="flex lg:hidden border-b border-slate-800 bg-[#0d121d] text-xs font-medium">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-center border-b-2 ${
                activeTab === 'chat' ? 'border-cyan-500 text-cyan-400 font-semibold' : 'border-transparent text-slate-400'
              }`}
            >
              Conversation
            </button>
            <button
              onClick={() => setActiveTab('evidence')}
              className={`flex-1 py-3 text-center border-b-2 ${
                activeTab === 'evidence' ? 'border-cyan-500 text-cyan-400 font-semibold' : 'border-transparent text-slate-400'
              }`}
            >
              Evidence ({Object.keys(flatEvidence).length})
            </button>
            <button
              onClick={() => setActiveTab('gaps')}
              className={`flex-1 py-3 text-center border-b-2 ${
                activeTab === 'gaps' ? 'border-cyan-500 text-cyan-400 font-semibold' : 'border-transparent text-slate-400'
              }`}
            >
              Gaps ({gaps.length})
            </button>
          </div>

          {/* Chat Messages Window */}
          <div
            className={`flex-1 overflow-y-auto p-4 space-y-4 ${
              activeTab !== 'chat' ? 'hidden lg:block' : 'block'
            }`}
          >
            {/* Contradiction Warning Alert */}
            {contradictions.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1 animate-fade-in">
                <div className="font-semibold flex items-center gap-1.5 text-rose-400">
                  <span>⚠️</span> Verification Warning Detected
                </div>
                {contradictions.map((c, idx) => (
                  <p key={idx} className="leading-relaxed">
                    {c.message}
                  </p>
                ))}
              </div>
            )}

            {/* Chat Bubbles */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1 animate-slide-up`}
              >
                <div className="flex items-center gap-2 text-[10px] text-slate-500 px-1">
                  <span>{msg.role === 'user' ? 'Applicant' : 'FUNDflow AI'}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div
                  className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-tr-none shadow-md shadow-cyan-600/10'
                      : 'bg-[#1e2636] text-slate-100 border border-slate-700/60 rounded-tl-none shadow-sm'
                  }`}
                >
                  {msg.inputType === 'voice' && (
                    <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-white/20 text-xs font-medium">
                      <span>🎙️</span> {msg.attachmentName || 'Voice Recording'}
                    </div>
                  )}
                  {msg.inputType === 'photo' && (
                    <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-white/20 text-xs font-medium">
                      <span>📷</span> {msg.attachmentName || 'Photo Upload'}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
                FUNDflow is parsing evidence & updating application state...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Controls Bar */}
          <div className="p-3 bg-[#0d121d] border-t border-slate-800 space-y-2">
            {/* Attached files preview pill bar */}
            {(licensePhoto || workshopPhoto || audioFile) && (
              <div className="flex items-center gap-2 px-2 py-1 text-xs text-slate-300">
                {licensePhoto && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 border border-cyan-500/30 text-cyan-400">
                    📄 License: {licensePhoto.name.slice(0, 15)}
                    <button onClick={() => setLicensePhoto(null)} className="ml-1 text-slate-400 hover:text-white">
                      ×
                    </button>
                  </span>
                )}
                {workshopPhoto && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 border border-purple-500/30 text-purple-400">
                    🏭 Workshop: {workshopPhoto.name.slice(0, 15)}
                    <button onClick={() => setWorkshopPhoto(null)} className="ml-1 text-slate-400 hover:text-white">
                      ×
                    </button>
                  </span>
                )}
                {audioFile && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 border border-emerald-500/30 text-emerald-400">
                    🎙️ Voice Note Recorded
                    <button onClick={() => setAudioFile(null)} className="ml-1 text-slate-400 hover:text-white">
                      ×
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && <div className="text-xs text-rose-400 px-2">{error}</div>}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              {/* Photo Upload Action Buttons */}
              <label
                title="Upload Business License Photo"
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 cursor-pointer transition-colors border border-slate-700/60"
              >
                <span className="text-base">📄</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setLicensePhoto(e.target.files[0]);
                  }}
                />
              </label>

              <label
                title="Upload Workshop/Premises Photo"
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 cursor-pointer transition-colors border border-slate-700/60"
              >
                <span className="text-base">🏭</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setWorkshopPhoto(e.target.files[0]);
                  }}
                />
              </label>

              {/* Push-To-Talk Voice Recording Button */}
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  title="Record Voice Note"
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-emerald-400 transition-colors border border-slate-700/60"
                >
                  🎙️
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-2 animate-pulse"
                >
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                  Stop ({recordingTime}s)
                </button>
              )}

              {/* Text Input Field */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  language === 'am'
                    ? 'ስለ ኩባንያዎ እዚህ ይጻፉ ወይም በድምጽ ይናገሩ...'
                    : language === 'om'
                    ? 'Dhaabbata keessan ilaalchisee asitti barreessaa...'
                    : 'Explain your business, sales, or workers...'
                }
                className="flex-1 bg-[#161c28] border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-md shadow-cyan-500/20"
              >
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Evidence Provenance, Gaps & SDGs Side Panel */}
        <div className="lg:col-span-4 flex flex-col h-[calc(100vh-5rem)] gap-4 overflow-hidden">
          {/* Readiness Card Header */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Application Readiness</span>
              <span className="font-bold text-cyan-400">{progress}% Complete</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Established: {Object.keys(flatEvidence).length} fields</span>
              <span>Gaps: {gaps.length} remaining</span>
            </div>
          </div>

          {/* Evidence Provenance Panel */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span>🛡️</span> Evidence Provenance
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                Zero-Uncertainty Engine
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
              {Object.keys(flatEvidence).length === 0 ? (
                <div className="text-center py-8 text-slate-500 italic">
                  No structured evidence extracted yet. Start by sending a text or voice message.
                </div>
              ) : (
                Object.entries(flatEvidence).map(([key, item]: [string, any]) => (
                  <div key={key} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">
                        {key.split('.').pop()?.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          item.state === 'document_supported'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : item.state === 'visually_observed'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : item.state === 'self_reported'
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {item.state?.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-slate-300 font-mono text-xs">
                      {typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value)}
                      {item.isApproximate && <span className="text-amber-400 text-[10px] font-sans ml-1">(approx)</span>}
                    </div>

                    {item.notes && <div className="text-[10px] text-slate-400 italic">{item.notes}</div>}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SDG Potential Alignment Draft Card */}
          {sdgSuggestions.length > 0 && (
            <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span>🌱</span> ImpactProtocol Draft
              </div>
              <div className="space-y-1.5 max-h-28 overflow-y-auto">
                {sdgSuggestions.map((s, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-slate-900/40 border border-slate-800 text-[11px] space-y-0.5">
                    <div className="font-semibold text-emerald-400 flex items-center justify-between">
                      <span>SDG {s.sdgId}: {s.title}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        {s.alignmentStatus}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[10px]">{s.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}