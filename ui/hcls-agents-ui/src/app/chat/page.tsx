"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

export default function ChatPage() {
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [instruction, setInstruction] = useState('You are a medical research assistant AI specializing in cancer biomarker analysis and discovery. Coordinate sub-agents to fulfill user questions.');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);

  const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const sendMessage = async () => {
    if (!input.trim()) return;
    const timestamp = new Date().toISOString();
    const userMessage = { sender: 'You', text: input, timestamp };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    // Insert placeholder trace message immediately
    setMessages((prev) => [
      ...prev,
      {
        sender: 'HCLS Agentic AI',
        text: '',
        trace: [{ type: 'placeholder', text: 'Trace loading...' }],
        expandTrace: true
      }
    ]);

    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input, agents: selectedAgents, agent_instruction: instruction })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let finalText = '';
    let stepCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      chunk.split('\n\n').forEach(line => {
        if (!line.startsWith('data: ')) return;
        try {
          const parsed = JSON.parse(line.replace('data: ', ''));

          if (parsed.type === 'chunk') {
            finalText += parsed.data;
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              if (!lastMsg || lastMsg.sender !== 'HCLS Agentic AI') {
                return [...prev, { sender: 'HCLS Agentic AI', text: parsed.data, trace: [{ type: 'placeholder', text: 'Trace loading...' }], expandTrace: true }];
              }
              const updated = [...prev];
              updated[updated.length - 1].text += parsed.data;
              return updated;
            });
          }

          else if (['rationale', 'tool', 'observation', 'agent-collaborator'].includes(parsed.type)) {
            const step = parsed.step !== undefined ? parsed.step : stepCount + 1;
            stepCount = step;
            const agent = parsed.agent || parsed.data?.agent || 'unknown-agent';
            const traceStep = { ...parsed, step, agent };
            setMessages((prev) => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (!lastMsg || lastMsg.sender !== 'HCLS Agentic AI') {
              updated.push({ sender: 'HCLS Agentic AI', text: '', trace: [traceStep], expandTrace: true });
            } else {
              const existing = lastMsg.trace || [];
              const alreadyExists = existing.some(t =>
                t.step === traceStep.step &&
                t.type === traceStep.type &&
                t.text === traceStep.text
              );
              if (!alreadyExists) {
                lastMsg.trace = [...existing.filter(t => t.type !== 'placeholder'), traceStep];
lastMsg.trace.push(existing.find(t => t.type === 'placeholder'));
                }
                lastMsg.expandTrace = true;
              }
              return updated;
            });
          }

          else if (parsed.type === 'end') {
            setMessages((prev) => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.sender === 'HCLS Agentic AI') {
              lastMsg.text = parsed.finalMessage || finalText;
              lastMsg.timestamp = new Date().toISOString();
              lastMsg.image = parsed.image || null;
              lastMsg.trace = (lastMsg.trace || []).filter(t => t.type !== 'placeholder');
                lastMsg.expandTrace = true;
              }
              return updated;
            });
            setIsProcessing(false);
          }

        } catch (e) {
          console.error('Error parsing SSE:', e);
        }
      });
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const stored = localStorage.getItem('selectedAgents');
    if (stored) setSelectedAgents(JSON.parse(stored));
    const storedInstruction = localStorage.getItem('agent_instruction');
    if (storedInstruction) setInstruction(storedInstruction);
    const storedMessages = localStorage.getItem('chatMessages');
    if (storedMessages) setMessages(JSON.parse(storedMessages));
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
            <a
              href="/"
              className="block text-center bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white py-2 px-4 rounded-lg shadow-lg font-semibold tracking-wide transition-all duration-300 ease-in-out w-full"
            >
              ← Back to Catalog
            </a>
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
                {msg.image && (
                  <div className="mt-2">
                    <Image src={msg.image} alt="Generated Visual" width={400} height={300} className="rounded shadow border" />
                  </div>
                )}
                {msg.trace && (
                  <details open={msg.expandTrace} className="mt-3 border rounded-md bg-gray-50 p-3">
                    <summary className="cursor-pointer font-semibold text-blue-700">🧵 Trace Steps</summary>
                    <div className="mt-3 space-y-3">
                      {msg.trace.map((step, stepIdx) => (
                        <div key={stepIdx} className="p-3 rounded-lg border bg-white shadow-sm">
                          <div className="text-sm font-semibold text-blue-700 mb-1">Step {step.step}</div>
                          {step.type === 'rationale' && (
                            <div className="text-sm"><span className="font-semibold">💡 Rationale:</span> {step.text}</div>
                          )}
                          {step.type === 'agent-collaborator' && (
                            <div className="text-sm"><span className="font-semibold">👤➡️👤 Agent - {step.agent}:</span> {step.text}</div>
                          )}
                          {step.type === 'tool' && (
                            <div className="text-sm">
                              <div><span className="font-semibold">🧰 Tool:</span> {step.function || step.apiPath || 'Unknown'}</div>
                              <div><span className="font-semibold">Execution:</span> {step.executionType}</div>
                            </div>
                          )}
                          {step.type === 'observation' && (<div className="text-sm"><span className="font-semibold">📝 Observation:</span> {step.text}</div>)}
{step.type === 'placeholder' && (<div className="text-sm italic text-gray-400">⏳ {step.text}</div>)}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                {msg.text && (
                  <p className="mt-3">
                    <strong>{msg.sender}:</strong> {msg.text}
                    <span className="ml-2 text-xs text-gray-400">{formatTime(msg.timestamp)}</span>
                  </p>
                )}
              </div>
            ))}
            {isProcessing && (
              <div className="mb-4 animate-pulse text-blue-600 italic">Waiting for response...</div>
            )}
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
      </div>
    </div>
  );
}
