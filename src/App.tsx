import React, { useState, useEffect } from 'react';
import { 
  SessionType, 
  Agent
} from './types';

import { useStore } from './store/useStore'; 
import { useChatController } from './hooks/useChatController'; 
import { LeftSidebar } from './components/Layout/LeftSiderbar';
import { RightPanel } from './components/Layout/RightPanel';
import { AgentEditor } from './components/Modals/AgentEditor';
import {ChatView } from './components/Chat/ChatView';


export default function App() {
  const { 
    sessions, 
    agents, 
    currentSessionId, 
    activeMode, 
    uiState, // 包含 isDarkMode, showRightPanel 等
    
    // Actions (修改数据的方法)
    setAgents,
    switchActiveMode,
    createNewSession,
    deleteSession,
    updateCurrentSession,
    toggleDarkMode,
    toggleLeftSidebar,
    toggleRightPanel,
    setRightPanelTab
  } = useStore();

  const { 
    userInput, 
    setUserInput, 
    handleSendMessage, 
    startWorkshop, 
    stopGeneration 
  } = useChatController();


  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);

  // 计算当前会话
  const currentSession = sessions.find(s => s.id === currentSessionId);

  // 监听暗黑模式 (数据来自 Store)
  useEffect(() => {
    const html = document.documentElement;
    if (uiState.isDarkMode) html.classList.add('dark');
    else html.classList.remove('dark');
  }, [uiState.isDarkMode]);

  // 初始化检查
  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession(SessionType.SINGLE);
    }
  }, [sessions.length, createNewSession]);
  

  // 这里的逻辑依然需要保留，因为它是具体的业务规则，利用 Store 的 updateCurrentSession 来实现
  const toggleAgentInGroup = (agentId: string) => {
    if (!currentSession) return;

    // 强制检查：确保我们操作的是当前会话对应的逻辑
    // 如果当前会话是单机，就不应该进入这里
    if (currentSession.type === SessionType.SINGLE) {
        updateCurrentSession({ agentIds: [agentId] });
        return;
    }

    let newIds = [...currentSession.agentIds];
    
    if (newIds.includes(agentId)) {
      // 至少保留一个
      if (newIds.length > 1) newIds = newIds.filter(id => id !== agentId);
    } else {
      // 双机模式限制 2 个
      if (currentSession.type === SessionType.DUAL && newIds.length >= 2) {
        newIds = [newIds[0], agentId]; // 替换第二个
      } else {
        newIds.push(agentId); // 会议室模式无限加
      }
    }
    updateCurrentSession({ agentIds: newIds });
  };

  const handleAgentClick = (agentId: string) => {
      // 优先判断 currentSession 是否存在
      if (!currentSession) return;

      if (currentSession.type === SessionType.SINGLE) {
        updateCurrentSession({ agentIds: [agentId] });
      } else {
        toggleAgentInGroup(agentId);
      }
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


  return (
    <div className="flex h-screen w-full overflow-hidden font-sans text-black dark:text-white transition-colors duration-300">
      
      {/* --- 左侧边栏 (响应式：手机端控制显示) --- */}
      <LeftSidebar 
        isOpen={uiState.showLeftSidebar} // 数据来自 store.uiState
         onClose={() => toggleLeftSidebar(false)} // 动作来自 store
         sessions={sessions}
         agents={agents}
         currentSessionId={currentSessionId}
         activeMode={activeMode}
         isDarkMode={uiState.isDarkMode}
         onToggleDarkMode={toggleDarkMode}
         onCreateNewSession={createNewSession}
         onDeleteSession={deleteSession}
         onSelectSession={(id, type) => {
            useStore.getState().setCurrentSessionId(id);
            useStore.getState().setActiveMode(type);
            useStore.getState().toggleLeftSidebar(false);
         }}
         onSelectAgent={handleAgentClick}
         onEditAgent={(a) => setEditingAgent({...a})}
         onToggleAgentInGroup={toggleAgentInGroup}
         onLinkCreateAgent={handleCreateAgent}
      />

      {/* 遮罩层 (手机端侧边栏开启时) */}
      {uiState.showLeftSidebar && (
        <div onClick={() => toggleLeftSidebar(false)} className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm" />
      )}



     {/* 2. 主聊天视图 (中间部分) */}
      <div className="flex-1 flex flex-row overflow-hidden bg-[#F2F2F7] dark:bg-black relative">
        <ChatView 
          session={currentSession}
          activeMode={activeMode}
          agents={agents}
          userInput={userInput}
          isRightPanelOpen={uiState.showRightPanel} // 来自 store
          selectedMsgId={selectedMsgId}
          onMenuClick={() => toggleLeftSidebar(true)}
          onToggleRightPanel={() => toggleRightPanel(!uiState.showRightPanel)}
          onSwitchMode={switchActiveMode} // 直接用 store 方法
          onShare={handleShare}
          onInputChange={setUserInput} // 直接用 hook 方法
          onSendMessage={handleSendMessage} // 直接用 hook 方法
          onStopGeneration={stopGeneration} // 直接用 hook 方法
          onStartWorkshop={startWorkshop} // 直接用 hook 方法
          onMsgSelect={setSelectedMsgId}
        />

    {/* --- 右侧配置面板--- */}
        <RightPanel 
        isOpen={uiState.showRightPanel}
        activeTab={uiState.rightPanelTab}
        session={currentSession}
        agents={agents}
        selectedMsgId={selectedMsgId}
        onClose={() => toggleRightPanel(false)}
          onTabChange={setRightPanelTab}
          onUpdateSession={updateCurrentSession} // 直接用 store 方法
      /> 
      </div>
      {/* ---智能体弹窗--- */}
      {editingAgent && (
        <AgentEditor
          agent={editingAgent}
          totalAgentsCount={agents.length}
          onClose={() => setEditingAgent(null)}
          onDelete={(id) => { // 这里调用 store 的 setAgents 来更新列表
            const newAgents = agents.filter(a => a.id !== id);
            setAgents(newAgents);
            setEditingAgent(null);
          }}
          onSave={(updatedAgent) => {// 同样调用 store 的 setAgents
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
