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


import { LeftSidebar } from './components/Layout/LeftSiderbar';
import { RightPanel } from './components/Layout/RightPanel';
import { AgentEditor } from './components/Modals/AgentEditor';
import {ChatView } from './components/Chat/ChatView';


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

  // 1. 封装更新逻辑 (这样 RightPanel 就不需要关心 setSessions 的复杂语法)
  const handleUpdateCurrentSession = (updates: Partial<Session>) => {
    if (!currentSessionId) return;
    setSessions(prev => prev.map(s => 
      s.id === currentSessionId ? { ...s, ...updates } : s
    ));
  };


  // 停止函数传递给子组件
  const handleStopGeneration = () => {
    if (!currentSessionId) return;
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, isRunning: false } : s));
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



     {/* 2. 主聊天视图 (中间部分) */}
      <div className="flex-1 flex flex-row overflow-hidden bg-[#F2F2F7] dark:bg-black relative">
        <ChatView 
          session={currentSession}
          activeMode={activeMode}
          agents={agents}
          userInput={userInput}
          isRightPanelOpen={showRightPanel}
          selectedMsgId={selectedMsgId}
          onMenuClick={() => setShowLeftSidebar(true)}
          onToggleRightPanel={() => setShowRightPanel(!showRightPanel)}
          onSwitchMode={switchMode}
          onShare={handleShare}
          onInputChange={setUserInput}
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          onStartWorkshop={startWorkshop}
          onMsgSelect={setSelectedMsgId}
        />

    {/* --- 右侧配置面板--- */}
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
      {/* ---智能体弹窗--- */}
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
