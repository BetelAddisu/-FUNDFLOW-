'use client';

import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  language?: 'en' | 'am' | 'om';
}

interface ApplicationPack {
  readinessScore: number;
  gaps: Array<{ fieldKey: string; fieldName: string; message: string; severity: string }>;
  sdgSuggestions: Array<{ sdgId: number; title: string; reason: string }>;
  declarations: Array<{ id: string; text: string; explained: boolean; systemTicked: boolean }>;
}

export default function ApplyPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<'en' | 'am' | 'om'>('en');
  const [sessionId] = useState(() => uuidv4());
  const [userId] = useState(() => uuidv4());
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [applicationPack, setApplicationPack] = useState<ApplicationPack | null>(null);
  const [showPack, setShowPack] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const languageLabels = {
    en: 'English',
    am: 'አማርኛ',
    om: 'Afaan Oromoo',
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (content: string, type: 'text' | 'voice' | 'photo' = 'text', audioBlob?: Blob) => {
    if (!content.trim() && !audioBlob) return;
    
    setIsLoading(true);
    
    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: content || '[Voice note]',
      language,
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('userId', userId);
      formData.append('language', language);
      
      if (type === 'text') {
        formData.append('text', content);
      } else if (type === 'voice' && audioBlob) {
        formData.append('audio', audioBlob, 'voice.mp3');
      } else if (type === 'photo') {
        // Handled separately
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: data.text,
        language: data.language,
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Check if application is complete
      if (data.applicationComplete && data.pack) {
        setApplicationPack(data.pack);
        setShowPack(true);
      }
    } catch (error) {
      console.error('Send message error:', error);
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  const handleVoiceStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setAudioChunks([]);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setAudioChunks(prev => [...prev, e.data]);
        }
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
        sendMessage('', 'voice', audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Recording error:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const handleVoiceStop = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handlePhotoUpload = async (type: 'license' | 'workshop') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('sessionId', sessionId);
        formData.append('type', type);

        await fetch('/api/upload/photo', {
          method: 'POST',
          body: formData,
        });

        sendMessage(`[Uploaded ${type === 'license' ? 'business license' : 'workshop photo'}]`, 'photo');
      } catch (error) {
        console.error('Photo upload error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    input.click();
  };

  return (
    <main className="container" style={{ maxWidth: '700px', paddingTop: '2rem', paddingBottom: '4rem' }}>
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>FundFlow Application</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Speak, type, or upload photos — {languageLabels[language]}</p>
        </div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'en' | 'am' | 'om')}
          style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
        >
          <option value="en">English</option>
          <option value="am">አማርኛ</option>
          <option value="om">Afaan Oromoo</option>
        </select>
      </header>

      {applicationPack && (
        <div style={{ 
          marginBottom: '1rem', 
          padding: '1rem', 
          backgroundColor: '#f0fdf4', 
          border: '1px solid #86efac', 
          borderRadius: '0.5rem' 
        }}>
          <h3 style={{ marginBottom: '0.5rem', color: '#166534' }}>Application Complete! ✓</h3>
          <p style={{ fontSize: '0.875rem', color: '#166534' }}>
            Readiness Score: {applicationPack.readinessScore}% | Gaps: {applicationPack.gaps.length} | SDG Suggestions: {applicationPack.sdgSuggestions.length}
          </p>
          <button 
            onClick={() => setShowPack(!showPack)}
            style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
          >
            {showPack ? 'Hide Details' : 'View Details'}
          </button>
        </div>
      )}

      {showPack && applicationPack && (
        <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.5rem', maxHeight: '300px', overflow: 'auto' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>Gaps ({applicationPack.gaps.length})</h4>
          <ul style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
            {applicationPack.gaps.map((gap, i) => (
              <li key={i} style={{ color: gap.severity === 'critical' ? '#dc2626' : '#ea580c' }}>
                {gap.fieldName}: {gap.message}
              </li>
            ))}
          </ul>
          <h4 style={{ marginBottom: '0.5rem' }}>SDG Suggestions ({applicationPack.sdgSuggestions.length})</h4>
          <ul style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
            {applicationPack.sdgSuggestions.map((sdg, i) => (
              <li key={i}>SDG {sdg.sdgId} - {sdg.title}: {sdg.reason}</li>
            ))}
          </ul>
          <h4 style={{ marginBottom: '0.5rem' }}>Declarations</h4>
          <ul style={{ fontSize: '0.875rem' }}>
            {applicationPack.declarations.map((decl, i) => (
              <li key={i} style={{ color: decl.systemTicked ? '#16a34a' : '#dc2626' }}>
                {decl.id}: {decl.explained ? 'Explained' : 'Not explained'} | {decl.systemTicked ? '✓ Ticked' : '✗ Not ticked'}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ 
        height: '500px', 
        overflowY: 'auto', 
        border: '1px solid #e5e7eb', 
        borderRadius: '0.5rem', 
        backgroundColor: 'white',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        marginBottom: '1rem'
      }}>
        <div ref={messagesEndRef} />
        {messages.length === 0 && (
          <div style={{ color: '#9ca3af', textAlign: 'center', paddingTop: '2rem' }}>
            Welcome! I'll help you complete your SME funding application.<br />
            You can type, send a voice note, or upload photos in {languageLabels[language]}.
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} style={{ 
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            padding: '0.75rem 1rem',
            borderRadius: '1rem',
            backgroundColor: msg.role === 'user' ? '#2563eb' : '#f3f4f6',
            color: msg.role === 'user' ? 'white' : '#111827',
          }}>
            {msg.content}
            {msg.audioUrl && (
              <audio controls src={msg.audioUrl} style={{ marginTop: '0.5rem', width: '100%' }} />
            )}
          </div>
        ))}
        {isLoading && (
          <div style={{ alignSelf: 'flex-start', color: '#9ca3af', fontStyle: 'italic' }}>
            Processing...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={language === 'en' ? 'Type your message...' : language === 'am' ? 'መልዕክትዎን ይጻፉ...' : 'Ergaa keessanii qorii...'}
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '1rem',
            disabled: isLoading,
          }}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: isLoading || !input.trim() ? '#9ca3af' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: 600,
            cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={isRecording ? handleVoiceStop : handleVoiceStart}
          disabled={isLoading}
          style={{ 
            padding: '0.5rem 1rem', 
            border: '1px solid #d1d5db', 
            borderRadius: '0.5rem', 
            background: isRecording ? '#dc2626' : 'white', 
            color: isRecording ? 'white' : '#111827',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isRecording ? '⏹️ Stop Recording' : '🎤 Voice Note'}
        </button>
        <button
          onClick={() => handlePhotoUpload('license')}
          disabled={isLoading}
          style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: 'white', cursor: isLoading ? 'not-allowed' : 'pointer' }}
        >
          📷 Upload License
        </button>
        <button
          onClick={() => handlePhotoUpload('workshop')}
          disabled={isLoading}
          style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: 'white', cursor: isLoading ? 'not-allowed' : 'pointer' }}
        >
          📷 Upload Workshop
        </button>
      </div>

      <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' }}>
        FundFlow — AI Funding Intake for Ethiopian SMEs
      </p>
    </main>
  );
}