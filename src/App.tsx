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

  const { setSessions, setCurrentSessionId } = useStore();

  useEffect(() => {
    const initData = async () => {
      const userId = "test-user-123"; // 暂时硬编码
      try {
        const response = await fetch(`http://localhost:3001/api/sessions/user/${userId}`);
        const sessions = await response.json();
        
        if (sessions.length > 0) {
          setSessions(sessions);
          // 默认选中第一个会话
          setCurrentSessionId(sessions[0].id);
        }
      } catch (err) {
        console.error("加载初始数据失败:", err);
      }
    };
    initData();
  }, []);

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
  // useEffect(() => {
  //   if (sessions.length === 0) {
  //     createNewSession(SessionType.SINGLE);
  //   }
  // }, [sessions.length, createNewSession]);

  // 2. 添加新的异步加载 useEffect
  useEffect(() => {                       
    const initData = async () => {
      const userId = "test-user-123"; // 暂时硬编码，以后换 Logto
      try {
        // A. 向后端请求列表
        const res = await fetch(`http://localhost:3001/api/sessions/user/${userId}`);
        const data = await res.json();

        if (data.length > 0) {
          // B. 如果数据库有数据，转换格式并存入 Store
          // 注意：后端返回的数据字段是 createdAt，前端是 timestamp，可能需要 map 一下
          const formattedSessions = data.map((s: any) => ({
            ...s,
            // 确保数据库存的 JSON 字段能正确解析
            messages: [], // 列表接口通常不返回详细消息，消息需要点击会话后再懒加载
            agentIds: s.agentIds || [], 
            isRunning: false 
          }));
          
          setSessions(formattedSessions);
          // 默认选中最新的一个
          setCurrentSessionId(formattedSessions[0].id);
        } else {
          // C. 如果数据库是空的，才创建新会话
          // 这里需要确保 createNewSession 也是走 API 的
          createNewSession(SessionType.SINGLE);
        }
      } catch (err) {
        console.error("无法连接后端:", err);
      }
    };

    initData();
  }, []); // 空依赖数组，只在组件挂载时执行一次
  

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
