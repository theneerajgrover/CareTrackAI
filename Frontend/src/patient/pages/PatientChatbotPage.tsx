import { useState, useEffect, useRef } from 'react'
import {
  Sparkles, Send, Bot, User as UserIcon, AlertTriangle, ShieldCheck,
  Plus, MessageSquare, Trash2, Clock, CheckCircle2, Stethoscope,
  HeartPulse, ArrowRight, RefreshCw, Info, Lock
} from 'lucide-react'
import {
  getChatSessions,
  getChatSessionMessages,
  sendChatMessage,
  deleteChatSession,
  getUserStats
} from '../../services/api'
import type { ChatSession, ChatMessage, User, UserStats } from '../../types'

interface PatientChatbotPageProps {
  user: User | null
  initialQuery?: string
}

const QUICK_PROMPTS = [
  'Explain my latest health analysis results in simple terms',
  'Which doctor or specialist should I consult?',
  'What are general next steps for symptom relief?',
  'When should I seek urgent or emergency medical care?',
  'How can I prepare for my upcoming doctor appointment?',
]

export default function PatientChatbotPage({ user, initialQuery }: PatientChatbotPageProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [patientStats, setPatientStats] = useState<UserStats | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load sessions and patient context on mount
  useEffect(() => {
    loadSessions()
    getUserStats()
      .then((res) => setPatientStats(res.stats))
      .catch(() => {})
  }, [])

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  // Handle initial prompt if provided
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      handleSendMessage(initialQuery.trim())
    }
  }, [initialQuery])

  async function loadSessions() {
    setLoadingSessions(true)
    try {
      const res = await getChatSessions()
      setSessions(res.sessions || [])
      if (res.sessions && res.sessions.length > 0 && !currentSessionId) {
        selectSession(res.sessions[0].id)
      }
    } catch {
      // Graceful empty state
    } finally {
      setLoadingSessions(false)
    }
  }

  async function selectSession(sessionId: string) {
    setCurrentSessionId(sessionId)
    setLoadingMessages(true)
    setError(null)
    try {
      const res = await getChatSessionMessages(sessionId)
      setMessages(res.messages || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation.')
    } finally {
      setLoadingMessages(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  function handleStartNewSession() {
    setCurrentSessionId(null)
    setMessages([])
    setError(null)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  async function handleDeleteSession(e: React.MouseEvent, sessionId: string) {
    e.stopPropagation()
    try {
      await deleteChatSession(sessionId)
      const updated = sessions.filter((s) => s.id !== sessionId)
      setSessions(updated)
      if (currentSessionId === sessionId) {
        if (updated.length > 0) {
          selectSession(updated[0].id)
        } else {
          handleStartNewSession()
        }
      }
    } catch {
      // Ignore delete error
    }
  }

  async function handleSendMessage(textToSend?: string) {
    const text = (textToSend || inputText).trim()
    if (!text || sending) return

    setInputText('')
    setError(null)
    setSending(true)

    // Optimistically append user message
    const tempUserMsg: ChatMessage = {
      id: 'temp-' + Date.now(),
      sender: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      const res = await sendChatMessage(text, currentSessionId || undefined)
      if (!currentSessionId) {
        setCurrentSessionId(res.session_id)
        // Refresh session list in background
        getChatSessions().then((s) => setSessions(s.sessions || []))
      }
      setMessages((prev) => [...prev.filter((m) => m.id !== tempUserMsg.id), tempUserMsg, res.message])
    } catch (err: any) {
      setError(err.message || "Sorry, I'm unable to respond right now. Please try again shortly.")
    } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const latestCondition = patientStats?.latest_analysis?.disease
  const latestRisk = patientStats?.latest_analysis?.risk_level

  return (
    <div className="flex flex-col gap-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 text-accent text-[11px] font-bold tracking-wide uppercase">
              <Bot size={12} />
              OpenAI Clinical Assistant
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-semibold">
              <Lock size={11} />
              Private & Encrypted
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Medical Assistance Chatbot
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Ask patient-friendly questions about your health analyses, symptom meanings, specialist guidance, and wellness suggestions.
          </p>
        </div>

        <button
          onClick={handleStartNewSession}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-accent text-white font-semibold text-xs shadow-md shadow-accent/20 hover:bg-accent-hover transition-all flex-shrink-0"
        >
          <Plus size={15} />
          New Consultation
        </button>
      </div>

      {/* ── Context & Medical Disclaimer Banner ── */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-foreground flex items-start gap-3 text-xs leading-relaxed">
        <AlertTriangle size={17} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-amber-700 font-semibold block mb-0.5">Informational AI Medical Assistant</strong>
          CareTrack AI answers general health questions and explains diagnostic findings in simple language. It is not a licensed physician. If you have severe, acute, or emergency symptoms (such as crushing chest pain or severe difficulty breathing), please contact local emergency services immediately.
        </div>
      </div>

      {/* ── Main Chat Interface Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px] h-[calc(100vh-280px)]">
        {/* Left Sessions Sidebar (Desktop) */}
        <div className="hidden lg:flex lg:col-span-4 rounded-3xl border border-border bg-card p-4 flex-col justify-between overflow-hidden shadow-sm">
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="flex items-center justify-between mb-3 px-2">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                Past Consultations
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                {sessions.length} Session{sessions.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loadingSessions ? (
              <div className="text-center py-12 text-xs text-muted-foreground">
                <RefreshCw size={14} className="animate-spin mx-auto mb-2 text-accent" />
                Loading conversations...
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-16 px-4 text-xs text-muted-foreground">
                <MessageSquare size={24} className="mx-auto mb-2 opacity-40" />
                <p className="font-semibold text-foreground mb-1">No Consultations Yet</p>
                <p>Start a new conversation to ask medical questions.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {sessions.map((s) => {
                  const isSelected = s.id === currentSessionId
                  return (
                    <div
                      key={s.id}
                      onClick={() => selectSession(s.id)}
                      className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer text-xs transition-all ${
                        isSelected
                          ? 'bg-accent text-white font-semibold shadow-sm'
                          : 'bg-secondary/40 hover:bg-secondary text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <MessageSquare size={14} className={isSelected ? 'text-white' : 'text-accent'} />
                        <div className="truncate">
                          <p className="truncate font-medium">{s.title || 'Medical Consultation'}</p>
                          <span className={`text-[10px] block ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                            {s.message_count} messages • {s.updated_at ? new Date(s.updated_at).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(e, s.id)}
                        className={`opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 transition-all ${
                          isSelected ? 'text-white hover:text-white' : 'text-muted-foreground hover:text-red-500'
                        }`}
                        title="Delete Session"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Patient Context Card Preview */}
          {latestCondition && (
            <div className="mt-4 pt-3 border-t border-border/80 px-2 text-[11px] text-muted-foreground">
              <span className="font-bold text-foreground block mb-1">Recent Analysis Linked:</span>
              <div className="p-2.5 rounded-xl bg-accent/[0.04] border border-accent/15 flex items-center justify-between">
                <span className="font-semibold text-accent capitalize">{latestCondition.replace(/_/g, ' ')}</span>
                <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">{latestRisk || 'Analyzed'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Chat Thread & Input */}
        <div className="lg:col-span-8 rounded-3xl border border-border bg-card flex flex-col justify-between overflow-hidden shadow-sm">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-8">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-4 shadow-sm">
                  <HeartPulse size={24} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">
                  How can I help with your health today?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                  Ask questions about your health analysis, understand symptom causes, get wellness tips, or ask which specialist to consult.
                </p>

                {/* Quick Prompts */}
                <div className="w-full space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                    Suggested Questions
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {QUICK_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(prompt)}
                        className="text-left p-2.5 rounded-xl border border-border/80 bg-secondary/30 hover:bg-accent/10 hover:border-accent/30 text-xs text-foreground/90 font-medium transition-all flex items-center justify-between group"
                      >
                        <span className="truncate pr-2">{prompt}</span>
                        <ArrowRight size={12} className="text-muted-foreground group-hover:text-accent flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.sender === 'user'
                return (
                  <div
                    key={msg.id || index}
                    className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-lg bg-accent text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-xs">
                        <Bot size={14} />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        isUser
                          ? 'bg-accent text-white font-medium shadow-sm rounded-tr-xs'
                          : 'bg-secondary/60 text-foreground border border-border/70 rounded-tl-xs'
                      }`}
                    >
                      {/* Message Content with simple bold & linebreaks support */}
                      <div className="space-y-1.5 whitespace-pre-wrap">
                        {msg.content}
                      </div>

                      <div className="mt-1.5 flex items-center justify-between gap-3 text-[10px] opacity-70">
                        <span>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        {!isUser && msg.response_time_ms ? (
                          <span className="font-mono text-[9px]">AI • {msg.response_time_ms}ms</span>
                        ) : null}
                      </div>
                    </div>

                    {isUser && (
                      <div className="w-7 h-7 rounded-lg bg-secondary text-foreground flex items-center justify-center flex-shrink-0 mt-1 text-[11px] font-bold border border-border">
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>
                )
              })
            )}

            {/* Typing indicator */}
            {sending && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-accent text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-xs">
                  <Bot size={14} />
                </div>
                <div className="p-3.5 rounded-2xl rounded-tl-xs bg-secondary/60 border border-border/70 text-xs text-muted-foreground flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="font-medium text-[11px]">AI Medical Assistant is formulating guidance...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-4 mb-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-[10px] font-bold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Input Bar */}
          <div className="p-3.5 sm:p-4 border-t border-border bg-card flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask a medical question (e.g. explain my symptoms, which doctor to see)..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              disabled={sending}
              className="flex-1 h-11 px-4 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent disabled:opacity-50"
            />

            <button
              type="button"
              disabled={!inputText.trim() || sending}
              onClick={() => handleSendMessage()}
              className="h-11 px-4 rounded-xl bg-accent text-white font-semibold text-xs shadow-md shadow-accent/20 hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all flex-shrink-0"
            >
              <Send size={14} />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
