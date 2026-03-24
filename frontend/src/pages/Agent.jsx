import { useState, useRef, useEffect } from 'react'
import { agentChat, createTask, updateTask, deleteTask, createCourse } from '../api/api'
import { useTasks } from '../hooks/useTasks.jsx'

function SuggestionModal({ suggestions, onConfirm, onClose }) {
  const [accepted, setAccepted] = useState(
    suggestions.reduce((acc, s, i) => ({ ...acc, [i]: true }), {})
  )
  const [executing, setExecuting] = useState(false)

  const typeColor = (type) => {
    switch (type) {
      case 'delete_task': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/40'
      case 'create_task': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/40'
      case 'create_course': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/40'
      default: return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/40'
    }
  }

  const typeLabel = (type) => {
    switch (type) {
      case 'create_task': return 'Create'
      case 'update_task': return 'Update'
      case 'delete_task': return 'Delete'
      case 'create_course': return 'Create course'
      default: return type
    }
  }

  const handleConfirm = async () => {
    setExecuting(true)
    const toExecute = suggestions.filter((_, i) => accepted[i])
    await onConfirm(toExecute)
    setExecuting(false)
  }

  const acceptedCount = Object.values(accepted).filter(Boolean).length

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg border border-gray-200 dark:border-gray-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Confirm suggested changes
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} — review and accept or reject each one
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-5 py-3.5 ${
                i !== 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''
              } ${!accepted[i] ? 'opacity-40' : ''} transition-all duration-150`}
            >
              <div className="flex items-center gap-3 flex-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border flex-shrink-0 ${typeColor(s.type)}`}>
                  {typeLabel(s.type)}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300">{s.label}</span>
              </div>
              <div className="flex gap-2 flex-shrink-0 ml-4">
                <button
                  onClick={() => setAccepted(prev => ({ ...prev, [i]: true }))}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all duration-150 cursor-pointer ${
                    accepted[i]
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400 font-medium'
                      : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  Accept
                </button>
                <button
                  onClick={() => setAccepted(prev => ({ ...prev, [i]: false }))}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all duration-150 cursor-pointer ${
                    !accepted[i]
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 font-medium'
                      : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {acceptedCount} of {suggestions.length} accepted
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all duration-150 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={executing || acceptedCount === 0}
              className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all duration-150 font-medium cursor-pointer disabled:opacity-50"
            >
              {executing ? 'Applying...' : `Apply ${acceptedCount} change${acceptedCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Agent() {
  const { loadTasks } = useTasks()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm Track, your academic assistant. Ask me anything about your deadlines, or tell me to create, update, or delete tasks.",
      suggestions: null,
      data: null
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingSuggestions, setPendingSuggestions] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const getHistory = () => messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }))

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg = { role: 'user', content: text, suggestions: null, data: null }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await agentChat(text, getHistory())
      const assistantMsg = {
        role: 'assistant',
        content: res.message,
        suggestions: res.suggestions || null,
        data: res.data || null
      }
      setMessages(prev => [...prev, assistantMsg])

      if (res.suggestions && res.suggestions.length > 0) {
        setPendingSuggestions(res.suggestions)
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        suggestions: null,
        data: null
      }])
    }
    setLoading(false)
  }

  const executeSuggestion = async (s) => {
    const { type, data } = s
    switch (type) {
      case 'create_task':
        await createTask({
          title: data.title,
          moduleCode: data.moduleCode || null,
          type: data.type || 'ASSIGNMENT',
          dueDate: data.dueDate || null,
          dueTime: data.dueTime ? data.dueTime + ':00' : null,
          weightage: data.weightage || null,
          note: data.note || null,
          status: data.dueDate ? 'CONFIRMED' : 'PENDING_DATE',
        })
        break
      case 'update_task':
        await updateTask(data.id, {
          title: data.title,
          moduleCode: data.moduleCode,
          type: data.type,
          dueDate: data.dueDate || null,
          dueTime: data.dueTime ? data.dueTime + ':00' : null,
          weightage: data.weightage || null,
          status: data.status,
          note: data.note,
          user: { id: localStorage.getItem('firebase_uid') }
        })
        break
      case 'delete_task':
        await deleteTask(data.id)
        break
      case 'create_course':
        await createCourse({
          moduleCode: data.moduleCode,
          name: data.name || null,
          prof: data.prof || null,
          examDate: data.examDate || null,
          examVenue: data.examVenue || null,
        })
        break
      default:
        break
    }
  }

  const handleConfirmSuggestions = async (accepted) => {
    const results = await Promise.allSettled(accepted.map(s => executeSuggestion(s)))
    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    // Refresh shared task state so all pages reflect changes immediately
    await loadTasks()

    const summary = failed > 0
      ? `Applied ${succeeded} change${succeeded !== 1 ? 's' : ''}, ${failed} failed.`
      : `Applied ${succeeded} change${succeeded !== 1 ? 's' : ''} successfully.`

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: summary,
      suggestions: null,
      data: null
    }])
    setPendingSuggestions(null)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100">Agent</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Ask me to manage your deadlines in plain English</p>
        </div>
        <button
          onClick={() => setMessages([{
            role: 'assistant',
            content: "Hi! I'm Track, your academic assistant. Ask me anything about your deadlines, or tell me to create, update, or delete tasks.",
            suggestions: null,
            data: null
          }])}
          className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 cursor-pointer"
        >
          Clear chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xl ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-tr-sm'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>

              {/* Suggestions pill */}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <button
                  onClick={() => setPendingSuggestions(msg.suggestions)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all duration-150 cursor-pointer"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    {msg.suggestions.length} suggested change{msg.suggestions.length !== 1 ? 's' : ''} — click to review
                  </span>
                </button>
              )}

              {/* Structured data */}
              {msg.data && msg.data.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden w-full">
                  {msg.data.map((item, j) => (
                    <div key={j} className={`px-4 py-2.5 flex items-center justify-between ${
                      j !== 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''
                    }`}>
                      <div>
                        <div className="text-xs font-medium text-gray-900 dark:text-gray-100">{item.title || item.moduleCode}</div>
                        {item.moduleCode && item.title && (
                          <div className="text-xs text-gray-400 dark:text-gray-500">{item.moduleCode}</div>
                        )}
                      </div>
                      {item.dueDate && (
                        <div className="text-xs text-gray-400 dark:text-gray-500">{item.dueDate}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask me anything — 'What's due this week?' or 'Add a quiz for SC2000 worth 20%'"
            className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-200 active:scale-95 transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {[
            "What's due this week?",
            "Summarize my workload",
            "What's my heaviest module?",
          ].map(suggestion => (
            <button
              key={suggestion}
              onClick={() => setInput(suggestion)}
              className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Confirmation modal */}
      {pendingSuggestions && (
        <SuggestionModal
          suggestions={pendingSuggestions}
          onConfirm={handleConfirmSuggestions}
          onClose={() => setPendingSuggestions(null)}
        />
      )}
    </div>
  )
}

export default Agent