import React, { useState, useEffect, useRef } from 'react';
import { 
  Session, 
  SessionType, 
  Agent, 
  Message, 
  DualMode 
} from './types';
import { DEFAULT_AGENTS} from './constants';
import { geminiService } from './services/gemini';
import { 
  Cpu, 
  Send, 
  Play, 
  Square,
  Coffee,
  Eye,
  Share2,
  Menu,
} from 'lucide-react';

import { MessageBubble } from './components/Chat/MessageBubble';
import { ThinkingBubble } from './components/Chat/ThinkingBubble';
import { LeftSidebar } from './components/Layout/LeftSiderbar';
import { RightPanel } from './components/Layout/RightPanel';
import { AgentEditor } from './components/Modals/AgentEditor';




export default function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>(() => {
    const saved = localStorage.getItem('nexus_agents');
    return saved ? JSON.parse(saved) : DEFAULT_AGENTS;
  });
  const [activeMode, setActiveMode] = useState<SessionType>(SessionType.SINGLE);
  const [rightPanelTab, setRightPanelTab] = useState<'config' | 'memory' | 'json'>('config');
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [showLeftSidebar, setShowLeftSidebar] = useState(false); // 手机端左侧边栏控制
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [userInput, setUserInput] = useState('');
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const currentSession = sessions.find(s => s.id === currentSessionId);

  useEffect(() => {
    localStorage.setItem('nexus_agents', JSON.stringify(agents));
  }, [agents]);

  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) html.classList.add('dark');
    else html.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession(SessionType.SINGLE);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      const scroll = scrollRef.current;
      scroll.scrollTo({ top: scroll.scrollHeight, behavior: 'smooth' });
    }
  }, [currentSession?.messages, currentSession?.isRunning, currentSession?.currentRound]);

  const createNewSession = (type: SessionType = SessionType.SINGLE) => {
    const id = 'session-' + Date.now();
    const newSession: Session = {
      id, 
      title: '新话题 ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      type,
      dualMode: DualMode.DEBATE,
      agentIds: type === SessionType.SINGLE ? [agents[0].id] : [agents[0].id, agents[1].id],
      messages: [], 
      maxRounds: type === SessionType.SINGLE ? 1 : 12, 
      currentRound: 0, 
      isRunning: false,
      backgroundContext: type === SessionType.MULTI ? '探讨当前人工智能的伦理挑战' : (type === SessionType.DUAL ? '人类意识是否可以被数字永生替代？' : ''), 
      agentSpecificPrompts: {}, 
      firstSpeakerId: agents[0].id
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(id);
    setActiveMode(type);
    if (type !== SessionType.SINGLE) setShowRightPanel(true);
    setShowLeftSidebar(false); // 在手机端创建新会话后关闭侧边栏
  };

  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      alert("请至少保留一个对话。");
      return;
    }
    const updated = sessions.filter(s => s.id !== sessionId);
    setSessions(updated);
    if (currentSessionId === sessionId) {
      setCurrentSessionId(updated[0].id);
      setActiveMode(updated[0].type);
    }
  };

  const switchMode = (mode: SessionType) => {
    setActiveMode(mode);
    const existing = sessions.find(s => s.type === mode);
    if (existing) {
      setCurrentSessionId(existing.id);
    } else {
      createNewSession(mode);
    }
  };

  const handleSendMessage = async () => {
    if (!currentSession || !userInput.trim()) return;
    if (currentSession.type === SessionType.DUAL) return; // 双机模式不接受用户输入

    const input = userInput;
    const newUserMsg: Message = {
      id: `msg-${Date.now()}`, role: 'user', content: input,
      timestamp: Date.now(), memoriesUsed: []
    };

    setSessions(prev => prev.map(s => s.id === currentSessionId ? { 
      ...s, 
      messages: [...s.messages, newUserMsg],
      isRunning: s.type === SessionType.SINGLE ? true : s.isRunning 
    } : s));
    setUserInput('');

    if (currentSession.type === SessionType.SINGLE) {
      const agent = agents.find(a => a.id === currentSession.agentIds[0]) || agents[0];
      try {
        const result = await geminiService.generateResponse(agent, [...currentSession.messages, newUserMsg], input);
        const modelMsg: Message = {
          id: `msg-${Date.now()}`, role: 'model', content: result.content,
          agentId: agent.id, agentName: agent.name, timestamp: Date.now(),
          memoriesUsed: result.memoriesUsed, rawRequest: result.rawRequest, rawResponse: result.rawResponse
        };
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, modelMsg], isRunning: false } : s));
      } catch (err) { 
        console.error(err); 
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, isRunning: false } : s));
      }
    }
  };

  const startWorkshop = async () => {
    if (!currentSession || currentSession.isRunning) return;
    if (currentSession.agentIds.length < 2) return alert("研讨需要至少选择两个智能体。");

    setSessions(prev => prev.map(s => s.id === currentSession.id ? { ...s, isRunning: true, currentRound: 0 } : s));
    
    const baseAgents = currentSession.agentIds.map(id => agents.find(a => a.id === id)!).filter(Boolean);
    let turnSequence = [...baseAgents];
    
    if (currentSession.type === SessionType.DUAL && currentSession.firstSpeakerId) {
      const firstIdx = turnSequence.findIndex(a => a.id === currentSession.firstSpeakerId);
      if (firstIdx > 0) {
        const first = turnSequence.splice(firstIdx, 1);
        turnSequence = [first[0], ...turnSequence];
      }
    }

    for (let round = 0; round < currentSession.maxRounds; round++) {
      const latestSessions = await new Promise<Session[]>(resolve => setSessions(prev => { resolve(prev); return prev; }));
      const latestSession = latestSessions.find(s => s.id === currentSession.id);
      
      if (!latestSession || !latestSession.isRunning) break;

      const actingAgent = turnSequence[round % turnSequence.length];
      const sharedBg = latestSession.backgroundContext || '探讨中...';
      const specificPrompt = latestSession.agentSpecificPrompts?.[actingAgent.id] || '';
      
      let sysMsg = `共同背景: ${sharedBg}\n你的特定立场: ${specificPrompt}\n当前是研讨轮次: ${round + 1}/${latestSession.maxRounds}`;
      
      if (latestSession.type === SessionType.MULTI) {
        sysMsg = `[会议室模式] 共同议题: ${sharedBg}\n请参与讨论。轮次: ${round + 1}/${latestSession.maxRounds}`;
      } else if (latestSession.type === SessionType.DUAL) {
        if (latestSession.dualMode === DualMode.DEBATE) {
          sysMsg = `[对抗辩论模式] 当前议题: ${sharedBg}\n你的特定辩论任务: ${specificPrompt}\n请针对前文的观点进行辩论、反驳或深化。保持你的角色性格。轮次: ${round + 1}`;
        } else {
          sysMsg = `[演绎扮演模式] 剧情背景: ${sharedBg}\n你的角色在此场景中的特定任务/立场: ${specificPrompt}\n请与其他角色互动，推动剧情发展。保持角色一致性，完成你的目标。轮次: ${round + 1}`;
        }
      }

      try {
        const historyForAI = latestSession.messages;
        const lastMsgText = historyForAI.length > 0 ? historyForAI[historyForAI.length - 1].content : "开始。";
        
        const result = await geminiService.generateResponse(actingAgent, historyForAI, lastMsgText, sysMsg);
        
        const modelMsg: Message = {
          id: `msg-${Date.now()}`, role: 'model', content: result.content,
          agentId: actingAgent.id, agentName: actingAgent.name, timestamp: Date.now(),
          memoriesUsed: result.memoriesUsed, rawRequest: result.rawRequest, rawResponse: result.rawResponse
        };

        setSessions(prev => prev.map(s => s.id === currentSessionId ? { 
          ...s, 
          messages: [...s.messages, modelMsg], 
          currentRound: round + 1 
        } : s));

        await new Promise(r => setTimeout(r, 2200));
      } catch (err) { 
        console.error("Workshop Error:", err);
        break; 
      }
    }
    
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, isRunning: false } : s));
  };

  const toggleAgentInGroup = (agentId: string) => {
    if (!currentSession) return;
    let newIds = [...currentSession.agentIds];
    if (newIds.includes(agentId)) {
      if (newIds.length > 1) newIds = newIds.filter(id => id !== agentId);
    } else {
      if (currentSession.type === SessionType.DUAL && newIds.length >= 2) {
        newIds = [newIds[0], agentId];
      } else {
        newIds.push(agentId);
      }
    }
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, agentIds: newIds } : s));
  };

  const handleCreateAgent = () => {
    const newAgent: Agent = { 
      id: 'a-' + Date.now(), 
      name: '新角色', 
      avatar: '🧠', 
      persona: '', 
      model: 'gemini-3-flash-preview', 
      temperature: 0.7, 
      color: 'purple',
      maxOutputTokens: 800
    };
    setEditingAgent(newAgent);
  };

  const handleShare = () => {
    if (!currentSession) return;
    const shareText = currentSession.messages.map(m => {
      const roleName = m.role === 'user' ? '用户' : (m.agentName || 'AI');
      return `${roleName}: ${m.content}`;
    }).join('\n\n---\n\n');
    
    if (navigator.share) {
      navigator.share({
        title: currentSession.title,
        text: shareText
      }).catch(err => console.error('Share failed', err));
    } else {
      navigator.clipboard.writeText(shareText);
      alert('已成功复制对话内容到剪贴板！');
    }
  };


  const handleAgentClick = (agentId: string) => {
     if (activeMode === SessionType.SINGLE) {
        setSessions(prev => prev.map(s => s.id === currentSessionId ? {...s, agentIds: [agentId]} : s));
     } else {
        toggleAgentInGroup(agentId);
     }
  };

  // 1. 封装更新逻辑 (非常重要，这样 RightPanel 就不需要关心 setSessions 的复杂语法)
  const handleUpdateCurrentSession = (updates: Partial<Session>) => {
    if (!currentSessionId) return;
    setSessions(prev => prev.map(s => 
      s.id === currentSessionId ? { ...s, ...updates } : s
    ));
  };

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans text-black dark:text-white transition-colors duration-300">
      
      {/* --- 左侧边栏 (响应式：手机端控制显示) --- */}
      <LeftSidebar 
         isOpen={showLeftSidebar}
         onClose={() => setShowLeftSidebar(false)}
         sessions={sessions}
         agents={agents}
         currentSessionId={currentSessionId}
         activeMode={activeMode}
         isDarkMode={isDarkMode}
         onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
         onCreateNewSession={createNewSession}
         onDeleteSession={deleteSession}
         onSelectSession={(id, type) => {
            setCurrentSessionId(id);
            setActiveMode(type);
            setShowLeftSidebar(false);
         }}
         onSelectAgent={handleAgentClick}
         onEditAgent={(a) => setEditingAgent({...a})}
         onToggleAgentInGroup={toggleAgentInGroup}
         onLinkCreateAgent={handleCreateAgent}
      />

      {/* 遮罩层 (手机端侧边栏开启时) */}
      {showLeftSidebar && (
        <div onClick={() => setShowLeftSidebar(false)} className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm" />
      )}

      {/* --- 主对话区 --- */}
      <div className="flex-1 flex flex-row overflow-hidden bg-[#F2F2F7] dark:bg-black relative">
        
        <div className="flex-1 flex flex-col relative overflow-hidden h-full">
          <header className="h-16 px-4 md:px-6 flex items-center justify-between glass z-10 border-b border-gray-200 dark:border-[#2C2C2E] shrink-0">
            <div className="flex items-center gap-2 md:gap-4">
              <button onClick={() => setShowLeftSidebar(true)} className="md:hidden p-2 text-gray-500 hover:text-blue-500 transition-colors">
                <Menu size={20} />
              </button>
              <div className="flex bg-gray-200/50 dark:bg-white/5 p-1 rounded-xl">
                <button onClick={() => switchMode(SessionType.SINGLE)}
                  className={`px-2.5 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all ${activeMode === SessionType.SINGLE ? 'bg-white dark:bg-[#3A3A3C] shadow-sm text-black dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                  对话
                </button>
                <button onClick={() => switchMode(SessionType.DUAL)}
                  className={`px-2.5 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all ${activeMode === SessionType.DUAL ? 'bg-white dark:bg-[#3A3A3C] shadow-sm text-black dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                  双机
                </button>
                <button onClick={() => switchMode(SessionType.MULTI)}
                  className={`px-2.5 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all ${activeMode === SessionType.MULTI ? 'bg-white dark:bg-[#3A3A3C] shadow-sm text-black dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                  会议
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <button onClick={handleShare} title="分享对话" className="p-2 rounded-xl bg-gray-200 dark:bg-white/5 text-gray-400 hover:text-blue-500 transition-all">
                <Share2 size={18} />
              </button>
              <button onClick={() => setShowRightPanel(!showRightPanel)}
                className={`p-2 rounded-xl transition-all ${showRightPanel ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-200 dark:bg-white/5 text-gray-400 hover:text-black dark:hover:text-white'}`}>
                <Cpu size={18} />
              </button>
            </div>
          </header>

          <div className="flex-1 flex flex-col p-3 md:p-8 overflow-y-auto overflow-x-hidden scrollbar-hide" ref={scrollRef}>
            <div className="max-w-4xl mx-auto w-full relative">
              {activeMode === SessionType.DUAL && (
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px flex justify-center pointer-events-none opacity-[0.03] dark:opacity-[0.05]">
                  <div className="w-full h-full bg-white dark:bg-white" />
                </div>
              )}

              {currentSession?.messages.length === 0 && !currentSession?.isRunning && (
                <div className="py-24 flex flex-col items-center opacity-10">
                  <div className="p-8 rounded-[40px] bg-gray-300 dark:bg-white/10 mb-6"><Coffee size={64}/></div>
                  <p className="text-lg font-black tracking-[0.3em] uppercase">等待开启</p>
                </div>
              )}
              
              {currentSession?.messages.map(msg => (
                <MessageBubble 
                  key={msg.id} 
                  message={msg} 
                  agents={agents} 
                  session={currentSession}
                  isSelected={selectedMsgId === msg.id}
                  onSelect={() => setSelectedMsgId(msg.id)}
                />
              ))}
              
              {currentSession?.isRunning && (
                <ThinkingBubble 
                  agent={agents.find(a => a.id === currentSession.agentIds[currentSession.currentRound % currentSession.agentIds.length])} 
                  isDual={activeMode === SessionType.DUAL}
                  isRightSide={activeMode === SessionType.DUAL && (currentSession.currentRound % 2 !== 0)}
                />
              )}
            </div>
          </div>

          <div className="p-4 md:p-6 pb-6 md:pb-10 glass border-t border-gray-200 dark:border-[#2C2C2E] shrink-0">
            <div className="max-w-4xl mx-auto flex items-end gap-3">
              <div className="flex-1 relative">
                {activeMode === SessionType.DUAL ? (
                  <div className="w-full bg-gray-100 dark:bg-white/5 border border-dashed border-gray-300 dark:border-white/10 rounded-[22px] px-5 py-3 text-xs md:text-sm flex items-center justify-center gap-2 text-gray-400 font-medium">
                    <Eye size={16} /> <span>{currentSession.dualMode === DualMode.DEBATE ? '对抗辩论' : '演绎扮演'}模式：用户暂不参与讨论</span>
                  </div>
                ) : (
                  <>
                    <textarea 
                      className="w-full bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10 rounded-[22px] px-5 py-2.5 md:py-3 text-[14px] md:text-[15px] focus:outline-none focus:border-blue-500 transition-all resize-none shadow-sm placeholder:opacity-30"
                      placeholder={currentSession?.isRunning ? "讨论中，您可以补充观点..." : "发送消息..."}
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      rows={1}
                      onKeyDown={(e) => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault(); handleSendMessage();}}}
                    />
                    <button onClick={handleSendMessage} disabled={!userInput.trim()}
                      className="absolute right-2.5 bottom-2 p-1.5 rounded-full bg-blue-500 text-white disabled:opacity-20 hover:scale-105 active:scale-95 transition-all">
                      <Send size={18} fill="currentColor"/>
                    </button>
                  </>
                )}
              </div>
              {activeMode !== SessionType.SINGLE && (
                <div className="flex gap-2">
                  {currentSession?.isRunning ? (
                    <button onClick={() => setSessions(prev => prev.map(s => s.id === currentSession.id ? {...s, isRunning:false} : s))}
                      className="p-3 md:p-3.5 rounded-[18px] md:rounded-[20px] bg-red-100 dark:bg-red-500/10 text-red-500 hover:bg-red-200 dark:hover:bg-red-500/20 transition-all shadow-sm">
                      <Square size={20} fill="currentColor" />
                    </button>
                  ) : (
                    <button onClick={startWorkshop}
                      className="p-3 md:p-3.5 rounded-[18px] md:rounded-[20px] bg-blue-100 dark:bg-blue-500/10 text-blue-500 hover:bg-blue-200 dark:hover:bg-blue-500/20 transition-all shadow-sm">
                      <Play size={20} fill="currentColor" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <RightPanel 
        isOpen={showRightPanel}
        activeTab={rightPanelTab}
        session={sessions.find(s => s.id === currentSessionId)}
        agents={agents}
        selectedMsgId={selectedMsgId}
        onClose={() => setShowRightPanel(false)}
        onTabChange={setRightPanelTab}
        onUpdateSession={handleUpdateCurrentSession}
      /> 
      </div>

      {editingAgent && (
        <AgentEditor
          agent={editingAgent}
          totalAgentsCount={agents.length}
          onClose={() => setEditingAgent(null)}
          onDelete={(id) => {
            setAgents(agents.filter(a => a.id !== id));
            setEditingAgent(null);
          }}
          onSave={(updatedAgent) => {
            const exists = agents.find(a => a.id === updatedAgent.id);
            if (exists) {
              setAgents(agents.map(a => a.id === updatedAgent.id ? updatedAgent : a));
            } else {
              setAgents([...agents, updatedAgent]);
            }
            setEditingAgent(null);
          }}
        />
      )}

    </div>
  );
}
