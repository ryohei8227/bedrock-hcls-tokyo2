"use client";

import Head from 'next/head';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Home() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [agents, setAgents] = useState([]);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);

  const categories = [
    { name: 'All', count: 15 },
    { name: 'Healthcare', count: 3 },
    { name: 'Life Sciences', count: 4 },
    { name: 'Pharmaceuticals', count: 1 },
    { name: 'Biotechnology', count: 4 },
    { name: 'Diagnostics', count: 2 },
  ];

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch('/api/agents');
        const agentData = await res.json();
        console.log("Fetched Agents Data:", agentData);
        setAgents(agentData);
      } catch (err) {
        console.error('Error fetching agents:', err);
      }
    }
    fetchAgents();
  }, []);

  const toggleAgentSelection = (agentId) => {
    setSelectedAgents(prev => 
      prev.includes(agentId) ? prev.filter(id => id !== agentId) : [...prev, agentId]
    );
  };

  const handleCardClick = (e, agent) => {
    // Prevent selection toggle from triggering card expansion
    if (e.target.type === 'checkbox') return;
    setSelectedAgent(agent);
  };

  return (
    <div>
      <Head>
        <title>Healthcare & Life Sciences AI Agents</title>
      </Head>
      <div className="container flex flex-col p-4 relative">
        <div className="flex flex-col items-center mb-4">
          <Image src="/images/aws-logo.svg" alt="AWS Logo" width={150} height={50} className="mb-4" />
          <h1 className="text-2xl font-bold">Welcome to AWS HCLS Agents Catalog</h1>
        </div>
        <div className="flex w-full">
          <aside className="w-64 bg-white p-4 shadow rounded">
            <h2 className="text-xl font-bold mb-4">Filter</h2>
            <ul>
              {categories.map((cat) => (
                <li key={cat.name} className={`p-2 cursor-pointer ${selectedCategory === cat.name ? 'bg-blue-200' : ''}`} onClick={() => setSelectedCategory(cat.name)}>
                  {cat.name} <span className="ml-2 text-sm text-gray-600">({cat.count})</span>
                </li>
              ))}
            </ul>
          </aside>
          <main className="flex-1 ml-4 relative">
            <input type="text" className="w-full p-2 border rounded mb-4" placeholder="Search for AI Healthcare Agents" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="grid grid-cols-2 gap-6 max-h-[500px] overflow-y-auto">
              {agents
                .filter(agent => agent.name.toLowerCase().includes(search.toLowerCase()) && (selectedCategory === 'All' || agent.category === selectedCategory))
                .map((agent) => (
                  <div key={agent.id} className="bg-white p-6 shadow-lg rounded-lg flex items-center cursor-pointer transition transform hover:scale-105 hover:shadow-2xl border border-gray-200" onClick={(e) => handleCardClick(e, agent)}>
                    <input type="checkbox" className="mr-4" checked={selectedAgents.includes(agent.id)} onChange={() => toggleAgentSelection(agent.id)} />
                    <img src={agent.image} alt="Agent Icon" className="w-20 h-20 mr-6 rounded-full border-2 border-blue-500 shadow-lg" />
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{agent.name}</h3>
                      <p className="text-sm text-gray-600">{agent.description}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {agent.tags && agent.tags.length > 0 ? (
                          agent.tags.map((tag) => (
                            <span key={tag} className="bg-blue-200 text-blue-800 text-xs px-3 py-1 rounded-full shadow-md">{tag}</span>
                          ))
                        ) : (
                          <span className="text-gray-500 text-xs">No tags available</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            <div className="mt-6 flex justify-center gap-4">
              <a href="register.html" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-700">Register New Agent</a>
              <a
                href="/chat"
                className={`bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 ${
                  selectedAgents.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={(e) => {
                  if (selectedAgents.length === 0) {
                    e.preventDefault();
                    return;
                  }

                  const agentData = agents.filter(agent => selectedAgents.includes(agent.id));
                  localStorage.setItem('selectedAgents', JSON.stringify(agentData));
                }}
              >
                Start Chat with Selected
              </a>

            </div>
          </main>
        </div>
        {selectedAgent && (
          <motion.div 
            initial={{ x: "100%" }} 
            animate={{ x: 0 }} 
            exit={{ x: "100%" }} 
            transition={{ duration: 0.3 }}
            className="fixed top-0 right-0 w-1/3 bg-white p-6 shadow-2xl h-full overflow-y-auto rounded-l-lg border-l-4 border-blue-500"
          >
            <button className="float-right text-lg font-bold text-gray-600 hover:text-gray-900" onClick={() => setSelectedAgent(null)}>×</button>
            <img src={selectedAgent.image} alt="Agent Icon" className="w-24 h-24 mx-auto mb-4 rounded-full border-4 border-blue-500 shadow-lg" />
            <h2 className="text-2xl font-bold text-center text-gray-900">{selectedAgent.name}</h2>
            <p className="text-center text-gray-600 mb-4">{selectedAgent.description}</p>
            <div className="p-4 bg-gray-100 rounded-lg">
              <h3 className="font-bold text-md text-gray-800">Details</h3>
              <ul className="text-sm text-gray-700 mt-2 space-y-1">
                <li><strong>Agent ID:</strong> {selectedAgent.agentId}</li>
                <li><strong>ARN:</strong> {selectedAgent.agentArn}</li>
                <li><strong>Collaboration:</strong> {selectedAgent.agentCollaboration}</li>
                <li><strong>Status:</strong> {selectedAgent.agentStatus}</li>
                <li><strong>Client Token:</strong> {selectedAgent.clientToken}</li>
                <li><strong>Version:</strong> {selectedAgent.version}</li>
                <li><strong>Foundation Model:</strong> {selectedAgent.foundationModel}</li>
                <li><strong>Orchestration Type:</strong> {selectedAgent.orchestrationType}</li>
                <li><strong>Instruction:</strong> {selectedAgent.instruction}</li>
                <li><strong>Created At:</strong> {selectedAgent.createdAt}</li>
                <li><strong>Updated At:</strong> {selectedAgent.updatedAt}</li>
              </ul>
            </div>
            <div className="mt-4">
              <h3 className="font-bold text-md text-gray-800">Tags</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedAgent.tags.length > 0 ? (
                  selectedAgent.tags.map((tag) => (
                    <span key={tag} className="bg-blue-300 text-blue-900 text-xs px-3 py-1 rounded-full shadow-md">{tag}</span>
                  ))
                ) : (
                  <span className="text-gray-500 text-xs">No tags available</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
