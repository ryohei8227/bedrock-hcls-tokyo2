"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatPage() {
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [instruction, setInstruction] = useState('You are a medical research assistant AI specializing in cancer biomarker analysis and discovery. Coordinate sub-agents to fulfill user questions.');
  const [activeTrace, setActiveTrace] = useState(null);
  const messagesEndRef = useRef(null);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const timestamp = new Date().toISOString();
    const userMessage = { sender: 'You', text: input, timestamp };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, agents: selectedAgents, agent_instruction: instruction })
      });
      const data = await res.json();
      const reply = {
        sender: 'HCLS Agentic AI',
        text: data.reply,
        trace: data.trace,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, reply]);
    } catch (err) {
      console.error('Failed to get AI response', err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const stored = localStorage.getItem('selectedAgents');
    if (stored) {
      setSelectedAgents(JSON.parse(stored));
    }
    const storedInstruction = localStorage.getItem('agent_instruction');
    if (storedInstruction) {
      setInstruction(storedInstruction);
    }
    const storedMessages = localStorage.getItem('chatMessages');
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-white shadow p-4 text-center text-2xl font-bold">
        <Image src="/images/aws-logo.svg" alt="AWS Logo" width={150} height={50} className="mx-auto mb-2" />
        Chat with Selected HCLS Agents
      </header>
      <div className="flex flex-1 p-4 gap-4 relative">
        <aside className="w-64 bg-white p-4 rounded shadow flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-4">Selected Agents</h3>
            {selectedAgents.map((agent, idx) => (
              <div key={idx} className="flex items-center mb-3">
                <Image src={agent.image || agent.icon} alt="Agent Icon" width={40} height={40} className="rounded-full mr-2" />
                <span>{agent.name}</span>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <button
              onClick={() => {
                setMessages([]);
                localStorage.removeItem('chatMessages');
              }}
              className="w-full text-center bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg shadow-md font-semibold transition duration-200 mb-3"
            >
              🗑️ Clear Chat
            </button>
            <a href="/" className="block text-center bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white py-2 px-4 rounded-lg shadow-lg font-semibold tracking-wide transition-all duration-300 ease-in-out w-full">← Back to Catalog</a>
          </div>
        </aside>
        <main className="flex flex-1 flex-col bg-white rounded shadow">
          <div className="p-2 border-b text-right text-xs text-gray-500">
            <details>
              <summary className="cursor-pointer underline inline-block">Edit Agent Instructions</summary>
              <textarea
                className="w-full border border-gray-300 rounded p-2 mt-2"
                placeholder="Enter shared instruction for agent collaboration..."
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                rows={3}
              />
            </details>
          </div>
          <div className="flex-1 p-4 overflow-y-auto" id="chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className="mb-4">
                <p className="mb-1">
                  <strong>{msg.sender}:</strong> {msg.text}
                  <span className="ml-2 text-xs text-gray-400">{formatTime(msg.timestamp)}</span>
                </p>
                {msg.sender === 'HCLS Agentic AI' && msg.trace && (
                  <button
                    onClick={() => setActiveTrace(prev => prev === msg ? null : msg)}
                    className="text-sm px-3 py-1 border border-blue-500 text-blue-600 rounded-full hover:bg-blue-50 transition duration-200 cursor-pointer shadow-sm"
                  >
                    View Trace
                  </button>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t border-gray-200 p-3 flex">
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded px-3 py-2"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button
              className="ml-3 bg-blue-600 text-white px-4 py-2 rounded"
              onClick={sendMessage}
            >
              Send
            </button>
          </div>
        </main>

        <AnimatePresence>
          {activeTrace && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3 }}
              className="absolute top-0 right-0 w-1/3 h-full bg-white p-6 shadow-2xl border-l-4 border-blue-500 rounded-l-lg overflow-y-auto z-50"
            >
              <button
                className="float-right text-lg font-bold text-gray-600 hover:text-gray-900"
                onClick={() => setActiveTrace(null)}
              >
                ×
              </button>
              <h2 className="text-xl font-bold mb-4">Trace Details</h2>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {activeTrace.trace}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
