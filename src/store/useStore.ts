import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Session, Agent, SessionType, DualMode } from '../types';
import { DEFAULT_AGENTS } from '../constants';

// 定义 Store 的状态和动作
interface AppState {
  // --- State (数据) ---
  sessions: Session[];
  agents: Agent[];
  currentSessionId: string | null;
  activeMode: SessionType;
  uiState: {
    isDarkMode: boolean;
    showLeftSidebar: boolean;
    showRightPanel: boolean;
    rightPanelTab: 'config' | 'memory' | 'json';
  };

  // --- Actions (简单的修改动作) ---
  setSessions: (sessions: Session[]) => void;
  updateCurrentSession: (updates: Partial<Session>) => void;
  addMessage: (sessionId: string, message: any) => void; // 简化类型
  setAgents: (agents: Agent[]) => void;
  setCurrentSessionId: (id: string) => void;
  setActiveMode: (mode: SessionType) => void;
  toggleDarkMode: () => void;
  toggleLeftSidebar: (isOpen: boolean) => void;
  toggleRightPanel: (isOpen: boolean) => void; 
  setRightPanelTab: (tab: 'config' | 'memory' | 'json') => void;
  switchActiveMode: (mode: SessionType) => void;
  createNewSession: (type: SessionType) => void;
  deleteSession: (id: string) => void;
}
// 假设后端 API 地址
const API_URL = 'http://localhost:3001/api/sessions';
const MOCK_USER_ID = "test-user-123"; // 暂时硬编码

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 1. 初始数据

      sessions: [],
      agents: DEFAULT_AGENTS, // 初始值，会被 localStorage 覆盖
      currentSessionId: null,
      activeMode: SessionType.SINGLE,
      uiState: {
        isDarkMode: true,
        showLeftSidebar: false,
        showRightPanel: false,
        rightPanelTab: 'config',
      },

      // 2. 动作实现

      setSessions: (sessions) => set({ sessions }),
      
      setAgents: (agents) => set({ agents }),
      
      setCurrentSessionId: (id) => set({ currentSessionId: id }),
      
      setActiveMode: (mode) => set({ activeMode: mode }),

      updateCurrentSession: (updates) => set((state) => ({
        sessions: state.sessions.map(s => 
          s.id === state.currentSessionId ? { ...s, ...updates } : s
        )
      })),

      addMessage: (sessionId, message) => set((state) => ({
        sessions: state.sessions.map(s => 
          s.id === sessionId ? { ...s, messages: [...s.messages, message] } : s
        )
      })),

      toggleDarkMode: () => set((state) => ({ 
        uiState: { ...state.uiState, isDarkMode: !state.uiState.isDarkMode } 
      })),

      toggleLeftSidebar: (isOpen) => set((state) => ({
        uiState: { ...state.uiState, showLeftSidebar: isOpen }
      })),

      toggleRightPanel: (isOpen) => set((state) => ({
        uiState: { ...state.uiState, showRightPanel: isOpen }
      })),
      
      setRightPanelTab: (tab) => set((state) => ({
        uiState: { ...state.uiState, rightPanelTab: tab }
      })),
      
      // 智能切换
      switchActiveMode: (mode) => {
        const { sessions, createNewSession } = get();
        
        // 1. 先更新模式状态
        set({ activeMode: mode });

        // 2. 查找该模式下的现有会话
        const existingSession = sessions.find(s => s.type === mode);

        if (existingSession) {
          // 3. 如果有，切换过去
          set({ 
            currentSessionId: existingSession.id,
            uiState: { 
              ...get().uiState, 
              // 如果是单机模式关掉右侧，其他模式打开右侧
              showRightPanel: mode !== SessionType.SINGLE 
            }
          });
        } else {
          // 4. 如果没有，直接创建新的
          // createNewSession 内部已经包含了 setCurrentSessionId 和 uiState 的更新
          createNewSession(mode);
        }
      },


      // ★★★ 修改后的 createNewSession ★★★
      createNewSession: async (type: SessionType) => {
        const { agents } = get();

        // 1. 准备数据 (和以前一样，算出初始值)
        const title = '新话题 ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // 逻辑：根据模式决定初始 agent
        const agentIds = type === SessionType.SINGLE 
          ? [agents[0].id] 
          : [agents[0].id, agents[1].id];

        // 逻辑：把“杂项”配置打包进 config 对象
        // 因为数据库 sessions 表只有 id, title, type, agentIds, config 这几个固定字段
        // 其他前端特有的 UI 逻辑参数，全部塞进 config (JSONB) 里
        const configPayload = {
          dualMode: DualMode.DEBATE,
          maxRounds: type === SessionType.SINGLE ? 1 : 12,
          currentRound: 0,
          backgroundContext: type === SessionType.MULTI 
            ? '探讨当前人工智能的伦理挑战' 
            : (type === SessionType.DUAL ? '人类意识是否可以被数字永生替代？' : ''),
          agentSpecificPrompts: {},
          firstSpeakerId: agents[0].id
        };

        try {
          // 2. 发送给后端 (POST)
          const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: MOCK_USER_ID,
              title: title,
              type: type,
              agentIds: agentIds,
              config: configPayload // 重点：把配置打包发过去
            })
          });

          if (!response.ok) throw new Error('创建会话失败');

          const savedData = await response.json();

          // 3. 将后端返回的数据转换为前端 Session 格式 (解包)
          // 后端返回: { id: "uuid...", title: "...", config: { dualMode: ... }, ... }
          // 前端需要: { id: "uuid...", title: "...", dualMode: ..., ... }
          
          const newSession: Session = {
            id: savedData.id, // ★ 这里拿到的就是数据库生成的 UUID 了
            title: savedData.title,
            type: savedData.type as SessionType,
            agentIds: savedData.agentIds,
            messages: [], // 新会话默认没消息
            isRunning: false, // UI 状态，数据库不存，默认 false
            
            // ★ 解包 config：把数据库里的 config 展开回根属性
            ...savedData.config 
          };

          // 4. 更新 Zustand Store (和以前一样，只是数据源变了)
          set((state) => ({
            sessions: [newSession, ...state.sessions],
            currentSessionId: newSession.id,
            activeMode: type,
            uiState: { 
              ...state.uiState, 
              showRightPanel: type !== SessionType.SINGLE,
              showLeftSidebar: false
            }
          }));

        } catch (error) {
          console.error("创建会话出错:", error);
          // 这里可以加一个 toast 提示用户失败
        }
      },

      deleteSession: (id) => {
        const { sessions, currentSessionId } = get();
        if (sessions.length <= 1) return alert("请至少保留一个对话。");
        
        const updated = sessions.filter(s => s.id !== id);
        let newCurrentId = currentSessionId;
        let newMode = get().activeMode;

        if (currentSessionId === id) {
          newCurrentId = updated[0].id;
          newMode = updated[0].type;
        }

        set({ sessions: updated, currentSessionId: newCurrentId, activeMode: newMode });
      }
    }),
    {
      name: 'nexus_storage', // localStorage 的 key
      storage: createJSONStorage(() => localStorage), // 默认就是这个，可省略
      partialize: (state) => ({ 
        // 决定哪些字段需要持久化保存，uiState 里的 sidebar 状态可能不需要保存
        sessions: state.sessions, 
        agents: state.agents,
        currentSessionId: state.currentSessionId,
        activeMode: state.activeMode,
        uiState: { isDarkMode: state.uiState.isDarkMode } 
      }),
    }
  )
);