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
import { DEFAULT_AGENTS } from './constants';


export default function App() {

  const { setSessions, setCurrentSessionId } = useStore();
  const {  fetchSessionMessages } = useStore();

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
    uiState, 
    loadAgents, 
    addAgent,
    deleteAgent, 
    updateAgent, 
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
 
  useEffect(() => {
    if (currentSessionId) {
      // 当选中的 ID 变化时，去后端拉取该会话的消息
      fetchSessionMessages(currentSessionId);
    }
  }, [currentSessionId, fetchSessionMessages]);
 
  useEffect(() => {                       
    const initData = async () => {
      const userId = "test-user-123"; // 暂时硬编码，以后换 Logto

      // 1. 尝试加载 Agents，并获取是否为空的结果
      const isEmpty = await loadAgents();

      // 2. 如果数据库是空的，开始初始化
      if (isEmpty) {
        console.log("数据库为空，正在初始化默认智能体...");
        for (const agent of DEFAULT_AGENTS) {
          // 注意：DEFAULT_AGENTS 里的 id 是死数据，addAgent 会忽略它，让数据库生成新 ID
          await addAgent({
            name: agent.name,
            persona: agent.persona,
            avatar: agent.avatar,
            model: agent.model,
            temperature:  agent.temperature,
            color: agent.color,
            maxOutputTokens: agent.maxOutputTokens
          });
        }
        console.log("初始化完成！");
      }
      try {
        // A. 向后端请求列表
        const res = await fetch(`http://localhost:3001/api/sessions/user/${userId}`);
        const data = await res.json();

        if (data.length > 0) {

          const formattedSessions = data.map((s: any) => ({
            ...s,
            messages: [], 
            agentIds: s.agentIds || [], 
            isRunning: false 
          }));
          
          setSessions(formattedSessions);
          setCurrentSessionId(formattedSessions[0].id);
        } else {
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
          onDelete={async (id:string) => {
            if (confirm('确定要删除这个智能体吗？此操作无法撤销。')) {
              await deleteAgent(id); // 调用 Store 的异步动作（请求后端 -> 更新 UI）
              setEditingAgent(null); // 关闭弹窗
            }
          }}
            onSave={async (agentData) => {
              const isExisting = agents.some(a => a.id === agentData.id);

              if (isExisting) {

                await updateAgent(agentData.id, agentData);
              } else {
                const { id, ...createPayload } = agentData;
                await addAgent(createPayload);
              }
            setEditingAgent(null);
          }}
        />
      )}

    </div>
  );
}
