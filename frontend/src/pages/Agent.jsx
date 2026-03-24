import { useState, useRef, useEffect } from 'react'
import { agentChat } from '../api/api'

function Agent() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm Track, your academic assistant. Ask me anything about your deadlines, or tell me to create, update, or delete tasks.",
      actionType: null,
      actionResult: null,
      data: null
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
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

    const userMsg = { role: 'user', content: text, actionType: null, actionResult: null, data: null }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await agentChat(text, getHistory())
      const assistantMsg = {
        role: 'assistant',
        content: res.message,
        actionType: res.actionType || null,
        actionResult: res.actionResult || null,
        data: res.data || null
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        actionType: null,
        actionResult: null,
        data: null
      }])
    }
    setLoading(false)
  }

  const actionLabel = (type) => {
    switch (type) {
      case 'create_task': return 'Task created'
      case 'update_task': return 'Task updated'
      case 'delete_task': return 'Task deleted'
      case 'create_course': return 'Course created'
      default: return null
    }
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
            actionType: null, actionResult: null, data: null
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
            <div className={`max-w-xl ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div className={`px-4 py-3 rounded-2xl text-sm ${
                msg.role === 'user'
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-tr-sm'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>

              {/* Action result pill */}
              {msg.actionType && actionLabel(msg.actionType) && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/40 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-xs text-green-700 dark:text-green-400 font-medium">
                    {actionLabel(msg.actionType)}
                  </span>
                </div>
              )}

              {/* Structured data table */}
              {msg.data && msg.data.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden w-full mt-1">
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
    </div>
  )
}

export default Agent