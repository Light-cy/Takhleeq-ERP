import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Bot, Send, X, Sparkles, Calendar, Clock, Info, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import apiClient from '../shared/apiClient';
import { User as ERPUser } from '../types';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

interface ChatbotProps {
  activeUser: ERPUser;
  jwtToken?: string | null;
}

export function Chatbot({ activeUser, jwtToken }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: `Hello ${activeUser?.name || 'there'}! 👋 I am your **Takhleeq ERP Facility Booking Assistant**, powered by Gemini.

Ask me questions like:
* "Which booking times are open on Wednesday?"
* "Is the Board Room free today?"
* "What is the capacity and purpose of the Podcast Room?"

How can I help you find the perfect reservation slot today?`,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle active user change to update greeting
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === 'welcome') {
      setMessages([
        {
          id: 'welcome',
          role: 'model',
          content: `Hello ${activeUser?.name || 'there'}! 👋 I am your **Takhleeq ERP Facility Booking Assistant**, powered by Gemini.

Ask me questions like:
* "Which booking times are open on Wednesday?"
* "Is the Board Room free today?"
* "What is the capacity and purpose of the Podcast Room?"

How can I help you find the perfect reservation slot today?`,
          timestamp: new Date()
        }
      ]);
    }
  }, [activeUser]);

  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setErrorText(null);

    // Map existing history to expected server format
    const historyPayload = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    try {
      const response = await apiClient.post<{ reply: string }>(
        '/api/chatbot',
        {
          message: trimmed,
          history: historyPayload
        },
        jwtToken
      );

      // Add model response
      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: response.reply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      console.error('[Chatbot Error]', err);
      setErrorText(err.message || 'Failed to generate response. Please make sure GEMINI_API_KEY is configured.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const suggestions = [
    "Which booking times are open on Wednesday?",
    "Is Cube 1 free today?",
    "What is the capacity of the Board Room?"
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end" id="takhleeq-chatbot-root">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="bg-gray-900 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm shrink-0">
                  <span className="text-white text-sm font-black font-mono">T</span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm tracking-tight flex items-center gap-1.5">
                    Takhleeq AI Assistant
                  </h3>
                  <p className="text-[10px] text-gray-400">Real-time room scheduling helper</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/50">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role !== 'user' && (
                    <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-xs">
                      <span className="text-white text-[11px] font-black font-mono">T</span>
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] rounded-2xl p-3 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none font-medium'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-3xs'
                    }`}
                  >
                    {/* Render message with linebreaks or formatting */}
                    <div className="whitespace-pre-line space-y-1">
                      {msg.content.split('\n\n').map((paragraph, idx) => {
                        // Very basic markdown formatting for list bullets or bold texts
                        const formatted = paragraph.split('\n').map((line, lIdx) => {
                          let processed = line;
                          // Bold match
                          processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                          // Bullet items matching
                          if (processed.startsWith('* ') || processed.startsWith('- ')) {
                            return (
                              <li
                                key={lIdx}
                                className="list-disc list-inside ml-1 text-inherit"
                                dangerouslySetInnerHTML={{ __html: processed.substring(2) }}
                              />
                            );
                          }
                          return (
                            <p
                              key={lIdx}
                              className="m-0 text-inherit"
                              dangerouslySetInnerHTML={{ __html: processed }}
                            />
                          );
                        });
                        return <div key={idx} className="space-y-1 text-inherit">{formatted}</div>;
                      })}
                    </div>
                    <span
                      className={`block text-[9px] mt-1 text-right ${
                        msg.role === 'user' ? 'text-indigo-200' : 'text-gray-400 font-medium'
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-2.5 justify-start">
                  <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-xs animate-pulse">
                    <span className="text-white text-[11px] font-black font-mono">T</span>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none p-3 shadow-3xs flex items-center gap-1.5 shrink-0">
                    <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce" />
                  </div>
                </div>
              )}

              {errorText && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Info className="h-3.5 w-3.5" /> Connection Issue
                  </div>
                  <p>{errorText}</p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            {messages.length === 1 && !isLoading && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 space-y-1.5 shrink-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Suggested Inquiries:</p>
                <div className="flex flex-col gap-1">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestClick(s)}
                      className="text-left text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/70 p-1.5 rounded-lg border border-indigo-100 transition-colors flex items-center justify-between cursor-pointer font-medium bg-white shadow-3xs"
                    >
                      {s}
                      <ArrowRight className="h-3 w-3 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Form Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText);
              }}
              className="p-3 bg-white border-t border-gray-200 flex gap-2 shrink-0 items-center"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask Takhleeq AI about open slots..."
                disabled={isLoading}
                className="flex-1 text-xs border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors cursor-pointer shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 bg-primary text-white rounded-full flex items-center justify-center shadow-xl hover:bg-[#5A0F0F] transition-colors relative cursor-pointer group animate-fade-in"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <>
            <span className="text-white text-lg font-black font-mono select-none">T</span>
            <div className="absolute right-16 bg-gray-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover:translate-x-0 shadow-md">
              Ask Takhleeq Assistant
            </div>
          </>
        )}
      </motion.button>
    </div>
  );
}
