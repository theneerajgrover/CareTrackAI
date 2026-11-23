import { useState, useEffect, useRef } from 'react'
import {
  Sparkles, Send, Bot, AlertTriangle,
  Plus, MessageSquare, Trash2, HeartPulse,
  ArrowRight, RefreshCw, Lock, ArrowDown,
  X, History, ShieldCheck
} from 'lucide-react'
import {
  getChatSessions,
  getChatSessionMessages,
  sendChatMessageStream,
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
  const [, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [patientStats, setPatientStats] = useState<UserStats | null>(null)
  const [mobileSessionsOpen, setMobileSessionsOpen] = useState(false)
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false)

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isNearBottomRef = useRef(true)

  // Load sessions and patient context on mount
  useEffect(() => {
    loadSessions()
    getUserStats()
      .then((res) => setPatientStats(res.stats))
      .catch(() => {})
  }, [])

  // Smart auto-scroll handling
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const el = messagesContainerRef.current
    if (!el) return
    el.scrollTo({
      top: el.scrollHeight,
      behavior
    })
  }

  const handleScroll = () => {
    const el = messagesContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const atBottom = distanceFromBottom <= 80
    isNearBottomRef.current = atBottom
    setShowScrollBottomBtn(!atBottom && el.scrollHeight > el.clientHeight + 120)
  }

  // Auto-scroll when messages update or during streaming, ONLY if user is already near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom(sending ? 'auto' : 'smooth')
    }
  }, [messages, sending])

  // Scroll to bottom when session switches
  useEffect(() => {
    isNearBottomRef.current = true
    setShowScrollBottomBtn(false)
    scrollToBottom('auto')
  }, [currentSessionId])

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
    setMobileSessionsOpen(false)
    try {
      const res = await getChatSessionMessages(sessionId)
      setMessages(res.messages || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation.')
    } finally {
      setLoadingMessages(false)
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }

  function handleStartNewSession() {
    setCurrentSessionId(null)
    setMessages([])
    setError(null)
    setMobileSessionsOpen(false)
    setTimeout(() => textareaRef.current?.focus(), 100)
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

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value)
    // Auto-adjust height up to max 110px
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 110)}px`
  }

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '42px'
    }
  }

  async function handleSendMessage(textToSend?: string) {
    const text = (textToSend || inputText).trim()
    if (!text || sending) return

    setInputText('')
    resetTextareaHeight()
    setError(null)
    setSending(true)

    // Reset user scroll state to follow response
    isNearBottomRef.current = true
    setShowScrollBottomBtn(false)

    // Optimistically append user message
    const tempUserMsg: ChatMessage = {
      id: 'temp-' + Date.now(),
      sender: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }

    // Temporary streaming assistant message placeholder
    const tempAiId = 'temp-ai-' + Date.now()
    const tempAiMsg: ChatMessage = {
      id: tempAiId,
      sender: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, tempUserMsg, tempAiMsg])
    setTimeout(() => scrollToBottom('smooth'), 20)

    try {
      const res = await sendChatMessageStream(
        text,
        currentSessionId || undefined,
        (delta) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempAiId ? { ...m, content: m.content + delta } : m))
          )
        },
        (newSessionId) => {
          if (!currentSessionId) {
            setCurrentSessionId(newSessionId)
            getChatSessions().then((s) => setSessions(s.sessions || [])).catch(() => {})
          }
        }
      )

      // Replace temp streaming message with official persisted message
      setMessages((prev) =>
        prev.map((m) => (m.id === tempAiId ? res.message : m))
      )
    } catch (err: any) {
      // Remove empty streaming bubble if request failed before token generation
      setMessages((prev) => prev.filter((m) => m.id !== tempAiId))
      setError(err.message || "Sorry, I'm unable to respond right now. Please try again shortly.")
    } finally {
      setSending(false)
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }

  const latestCondition = patientStats?.latest_analysis?.disease
  const latestRisk = patientStats?.latest_analysis?.risk_level
  const currentSession = sessions.find((s) => s.id === currentSessionId)

  return (
    <div className="h-full flex flex-col min-h-0 w-full overflow-hidden">
      {/* ── Top Header Bar (Fixed & Compact) ── */}
      <div className="flex-shrink-0 mb-2.5 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight truncate">
              Medical Assistant
            </h1>
            <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10.5px] font-bold tracking-wide uppercase">
                <Bot size={11} />
                Clinical AI
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10.5px] font-semibold">
                <Lock size={10} />
                Private & Encrypted
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mobile Past Consultations Drawer Toggle */}
            <button
              type="button"
              onClick={() => setMobileSessionsOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border bg-card text-foreground font-semibold text-xs hover:bg-secondary transition-all"
              title="View Past Consultations"
            >
              <History size={13} className="text-accent" />
              <span>Past Chats</span>
              {sessions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-accent/15 text-accent font-mono text-[10px]">
                  {sessions.length}
                </span>
              )}
            </button>

            {/* New Consultation Button */}
            <button
              type="button"
              onClick={handleStartNewSession}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-accent text-white font-semibold text-xs shadow-xs hover:bg-accent-hover transition-all flex-shrink-0 cursor-pointer"
            >
              <Plus size={13} />
              <span className="hidden sm:inline">New Consultation</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>

        {/* Clinical Advisory Banner */}
        <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-foreground flex items-center justify-between gap-2.5 text-xs flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
            <p className="text-[11px] leading-tight text-foreground/90 truncate sm:whitespace-normal">
              <strong className="text-amber-700 font-semibold mr-1">Clinical Advisory:</strong>
              CareTrack AI answers general health questions based on medical data. For emergency symptoms, contact emergency services immediately.
            </p>
          </div>
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-amber-700/80 font-medium flex-shrink-0">
            <ShieldCheck size={12} /> HIPAA Compliant Architecture
          </span>
        </div>
      </div>

      {/* ── Main Chat Interface Layout (Fits remaining viewport height) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 min-h-0 h-full overflow-hidden">
        {/* Left Column: Past Consultations Panel (Desktop) */}
        <div className="hidden lg:flex lg:col-span-4 xl:col-span-3.5 rounded-2xl border border-border bg-card flex-col h-full min-h-0 overflow-hidden shadow-xs">
          {/* Header */}
          <div className="px-3.5 py-2.5 border-b border-border flex items-center justify-between flex-shrink-0 bg-secondary/15">
            <div className="flex items-center gap-2">
              <MessageSquare size={13} className="text-accent" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                Past Consultations
              </span>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground px-1.5 py-0.5 rounded-md bg-secondary">
              {sessions.length}
            </span>
          </div>

          {/* Sessions List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1 chat-custom-scrollbar">
            {loadingSessions ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                <RefreshCw size={14} className="animate-spin mx-auto mb-2 text-accent" />
                Loading conversations...
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12 px-3 text-xs text-muted-foreground">
                <MessageSquare size={20} className="mx-auto mb-2 opacity-35" />
                <p className="font-semibold text-foreground mb-1">No Consultations Yet</p>
                <p className="text-[11px]">Start a conversation to receive AI clinical guidance.</p>
              </div>
            ) : (
              sessions.map((s) => {
                const isSelected = s.id === currentSessionId
                return (
                  <div
                    key={s.id}
                    onClick={() => selectSession(s.id)}
                    className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                      isSelected
                        ? 'bg-accent text-white font-semibold shadow-xs'
                        : 'bg-secondary/30 hover:bg-secondary text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                      <MessageSquare size={13} className={isSelected ? 'text-white' : 'text-accent flex-shrink-0'} />
                      <div className="truncate min-w-0">
                        <p className="truncate font-medium text-[11.5px] leading-tight">
                          {s.title || 'Medical Consultation'}
                        </p>
                        <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                          {s.message_count} msgs • {s.updated_at ? new Date(s.updated_at).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      className={`opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/20 transition-all flex-shrink-0 ml-1.5 ${
                        isSelected ? 'text-white hover:text-white' : 'text-muted-foreground hover:text-red-500'
                      }`}
                      title="Delete Session"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Patient Context Card Preview */}
          {latestCondition && (
            <div className="flex-shrink-0 p-2.5 border-t border-border bg-secondary/10 text-[11px]">
              <span className="font-semibold text-foreground block mb-1 text-[10.5px]">Recent Analysis Linked:</span>
              <div className="p-2 rounded-xl bg-accent/[0.05] border border-accent/15 flex items-center justify-between">
                <span className="font-semibold text-accent capitalize truncate">{latestCondition.replace(/_/g, ' ')}</span>
                <span className="text-[9.5px] font-mono uppercase font-bold text-muted-foreground ml-2 px-1.5 py-0.5 rounded bg-card border border-border">
                  {latestRisk || 'Analyzed'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Chat Conversation & Message Composer */}
        <div className="col-span-1 lg:col-span-8 xl:col-span-8.5 rounded-2xl border border-border bg-card flex flex-col h-full min-h-0 overflow-hidden shadow-xs">
          {/* Chat Panel Header */}
          <div className="px-4 py-2.5 border-b border-border bg-card flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="min-w-0">
                <h2 className="text-xs font-bold text-foreground truncate leading-tight">
                  {currentSession?.title || 'New Consultation'}
                </h2>
                <span className="text-[10px] text-muted-foreground block">
                  {messages.length} message{messages.length !== 1 ? 's' : ''} in consultation
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10.5px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-secondary/60 hidden sm:inline">
                Gemini 2.5 Flash
              </span>
            </div>
          </div>

          {/* Conversation Messages Scroll Area (Independently scrollable) */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 chat-custom-scrollbar relative"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-6">
                <div className="w-11 h-11 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-3 shadow-xs">
                  <HeartPulse size={22} />
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">
                  How can I assist your health journey?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4 max-w-md">
                  Ask questions about your health analysis, understand symptom causes, get specialist guidance, or prepare for appointments.
                </p>

                {/* Quick Prompts */}
                <div className="w-full space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Suggested Medical Questions
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {QUICK_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(prompt)}
                        className="text-left p-2.5 rounded-xl border border-border/80 bg-secondary/30 hover:bg-accent/10 hover:border-accent/30 text-[11.5px] text-foreground/90 font-medium transition-all flex items-center justify-between group cursor-pointer"
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
                if (!msg.content && msg.sender === 'assistant') {
                  return null
                }
                const isUser = msg.sender === 'user'
                const isStreaming = sending && msg.id?.startsWith('temp-ai-')
                return (
                  <div
                    key={msg.id || index}
                    className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-lg bg-accent text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                        <Bot size={14} />
                      </div>
                    )}

                    <div
                      className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        isUser
                          ? 'bg-accent text-white font-medium shadow-xs rounded-tr-xs'
                          : 'bg-secondary/60 text-foreground border border-border/70 rounded-tl-xs'
                      }`}
                    >
                      {/* Message Content */}
                      <div className="space-y-1.5 whitespace-pre-wrap break-words">
                        {msg.content}
                        {isStreaming && (
                          <span className="inline-block w-1.5 h-3.5 bg-accent ml-1 animate-pulse align-middle" />
                        )}
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-3 text-[10px] opacity-70">
                        <span>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        {!isUser && isStreaming ? (
                          <span className="font-mono text-[9px] text-accent animate-pulse font-semibold">Generating...</span>
                        ) : !isUser && msg.response_time_ms ? (
                          <span className="font-mono text-[9px]">AI • {msg.response_time_ms}ms</span>
                        ) : null}
                      </div>
                    </div>

                    {isUser && (
                      <div className="w-7 h-7 rounded-lg bg-secondary text-foreground flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-bold border border-border">
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>
                )
              })
            )}

            {/* Typing indicator: Show while waiting for first streaming token */}
            {sending && (!messages.length || (messages[messages.length - 1].sender === 'assistant' && !messages[messages.length - 1].content)) && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-accent text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                  <Bot size={14} />
                </div>
                <div className="p-3 rounded-2xl rounded-tl-xs bg-secondary/60 border border-border/70 text-xs text-muted-foreground flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="font-medium text-[11px]">AI Medical Assistant is formulating guidance...</span>
                </div>
              </div>
            )}

            {/* Floating Scroll-to-Latest Button */}
            {showScrollBottomBtn && (
              <button
                type="button"
                onClick={() => {
                  isNearBottomRef.current = true
                  scrollToBottom('smooth')
                  setShowScrollBottomBtn(false)
                }}
                className="sticky bottom-2 left-1/2 -translate-x-1/2 mx-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-white text-xs font-semibold shadow-md hover:bg-accent-hover transition-all z-20 cursor-pointer"
              >
                <ArrowDown size={12} />
                <span>Scroll to latest</span>
              </button>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-3.5 mb-2 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center justify-between flex-shrink-0">
              <span className="truncate pr-2">{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-[10px] font-bold hover:underline flex-shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Message Composer (Permanently accessible, non-shrinking flex child) */}
          <div
            className="p-3 sm:p-3.5 border-t border-border bg-card flex-shrink-0"
            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder="Ask a medical question (e.g. explain my symptoms, specialist to consult)..."
                value={inputText}
                onChange={handleTextareaChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                disabled={sending}
                className="flex-1 min-h-[42px] max-h-[110px] py-2.5 px-3.5 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent resize-none disabled:opacity-50 transition-all chat-custom-scrollbar"
              />

              <button
                type="button"
                disabled={!inputText.trim() || sending}
                onClick={() => handleSendMessage()}
                className="h-[42px] px-3.5 sm:px-4 rounded-xl bg-accent text-white font-semibold text-xs shadow-xs hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all flex-shrink-0 cursor-pointer"
              >
                <Send size={14} />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>

            <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground px-1">
              <span>Press <strong className="font-semibold text-foreground/80">Enter</strong> to send, <strong className="font-semibold text-foreground/80">Shift + Enter</strong> for new line</span>
              <span className="hidden sm:inline">Clinical Educational Guidance</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Slide-Over Drawer for Past Consultations ── */}
      {mobileSessionsOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSessionsOpen(false)}
          />

          {/* Slide-over Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-card border-r border-border flex flex-col shadow-2xl z-50">
            {/* Header */}
            <div className="p-3.5 border-b border-border flex items-center justify-between bg-secondary/20">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-accent" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Past Consultations
                </span>
                <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">
                  {sessions.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileSessionsOpen(false)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            {/* New Consultation CTA inside drawer */}
            <div className="p-2.5 border-b border-border">
              <button
                type="button"
                onClick={handleStartNewSession}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-xl bg-accent text-white font-semibold text-xs shadow-xs hover:bg-accent-hover transition-all"
              >
                <Plus size={14} />
                Start New Consultation
              </button>
            </div>

            {/* Scrollable Sessions List */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5 chat-custom-scrollbar">
              {sessions.length === 0 ? (
                <div className="text-center py-10 px-3 text-xs text-muted-foreground">
                  <MessageSquare size={20} className="mx-auto mb-2 opacity-35" />
                  <p className="font-semibold text-foreground mb-1">No Consultations Yet</p>
                  <p className="text-[11px]">Start a conversation to receive AI clinical guidance.</p>
                </div>
              ) : (
                sessions.map((s) => {
                  const isSelected = s.id === currentSessionId
                  return (
                    <div
                      key={s.id}
                      onClick={() => selectSession(s.id)}
                      className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                        isSelected
                          ? 'bg-accent text-white font-semibold shadow-xs'
                          : 'bg-secondary/40 hover:bg-secondary text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                        <MessageSquare size={13} className={isSelected ? 'text-white' : 'text-accent flex-shrink-0'} />
                        <div className="truncate min-w-0">
                          <p className="truncate font-medium text-[11.5px] leading-tight">
                            {s.title || 'Medical Consultation'}
                          </p>
                          <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                            {s.message_count} msgs • {s.updated_at ? new Date(s.updated_at).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(e, s.id)}
                        className={`p-1 rounded-md hover:bg-red-500/20 transition-all flex-shrink-0 ml-1.5 ${
                          isSelected ? 'text-white' : 'text-muted-foreground hover:text-red-500'
                        }`}
                        title="Delete Session"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            {/* Patient Context Card */}
            {latestCondition && (
              <div className="p-3 border-t border-border bg-secondary/15 text-[11px] flex-shrink-0">
                <span className="font-semibold text-foreground block mb-1 text-[10.5px]">Recent Analysis Linked:</span>
                <div className="p-2 rounded-xl bg-accent/[0.05] border border-accent/15 flex items-center justify-between">
                  <span className="font-semibold text-accent capitalize truncate">{latestCondition.replace(/_/g, ' ')}</span>
                  <span className="text-[9.5px] font-mono uppercase font-bold text-muted-foreground ml-2 px-1.5 py-0.5 rounded bg-card border border-border">
                    {latestRisk || 'Analyzed'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
