//话题状态控制
import { StateCreator } from 'zustand';
import { Session, SessionType, DualMode } from '../../types';
import { AppState } from '../useStore';
import { log } from 'console';

const API_URL = 'http://localhost:3001/api/sessions';
const USER_ID = "test-user-123";

export interface SessionSlice {
  sessions: Session[];
  currentSessionId: string | null;
  activeMode: SessionType;

  //话题相关
  setSessions: (sessions: Session[]) => void;
  setCurrentSessionId: (id: string) => void;
  setActiveMode: (mode: SessionType) => void;
  createNewSession: (type: SessionType) => Promise<void>;
  updateCurrentSession: (updates: Partial<Session>) => void;
  deleteSession: (id: string) => Promise<void>;
  switchActiveMode: (mode: SessionType) => void;


  // 消息相关
  fetchSessionMessages: (sessionId: string) => Promise<void>;
  addMessage: (sessionId: string, message: any) => void;
}

export const createSessionSlice: StateCreator<AppState, [], [], SessionSlice> = (set, get) => ({
  sessions: [],
  currentSessionId: null,
  activeMode: SessionType.SINGLE,

  setSessions: (sessions) => set({ sessions }),
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  setActiveMode: (mode) => set({ activeMode: mode }),

  //创建新话题
  createNewSession: async (type) => {
    const { agents } = get();
    // 确保有 Agent，否则无法创建
    if (agents.length === 0) {
        console.warn("没有智能体，无法创建会话");
        return;
    }
    const title = '新话题 ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const agentIds = type === SessionType.SINGLE ? [agents[0].id] : [agents[0].id, agents[1].id];

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
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: USER_ID,
          title, type, agentIds, config: configPayload
        })
      });

      if (!response.ok) throw new Error('创建会话失败');
      const savedData = await response.json();

      const newSession: Session = {
        id: savedData.id,
        title: savedData.title,
        type: savedData.type as SessionType,
        agentIds: savedData.agentIds,
        messages: [],
        isRunning: false,
        ...savedData.config 
      };

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
    }
  },

  //更新当前对话
  updateCurrentSession: async (updates) => {
      // 乐观更新 Store
      set((state) => ({
        sessions: state.sessions.map(s => 
          s.id === state.currentSessionId ? { ...s, ...updates } : s
        )
      }));
      const currentSession = get().sessions.find(s => s.id === get().currentSessionId);
      if(!currentSession) return;

      if (updates.title || updates.dualMode || updates.backgroundContext) {
        console.log("更新状态，但我还没想好");
        
      }
  },

  deleteSession: async (id) => {
    const { sessions, currentSessionId } = get();
    if (sessions.length <= 1) {
        alert("请至少保留一个对话。");
        return;
    } 
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      
      const updated = sessions.filter(s => s.id !== id);
      let newCurrentId = currentSessionId;
      let newMode = get().activeMode;
      
      if (currentSessionId === id) {
        newCurrentId = updated[0].id;
        newMode = updated[0].type;
      }
      set({ sessions: updated, currentSessionId: newCurrentId, activeMode: newMode });
    } catch (err) {
      console.error("删除会话失败", err);
    }
  },

   //切换话题选中模式
  switchActiveMode: (mode) => {
    const { sessions, createNewSession } = get();
    set({ activeMode: mode });
    const existingSession = sessions.find(s => s.type === mode);

    if (existingSession) {
      set({ 
        currentSessionId: existingSession.id,
        uiState: { 
          ...get().uiState, 
          showRightPanel: mode !== SessionType.SINGLE 
        }
      });
    } else {
      createNewSession(mode);
    }
  },


  //获取对话消息详情内容
  fetchSessionMessages: async (sessionId) => {
    const currentMessages = get().sessions.find(s => s.id === sessionId)?.messages;
    if (currentMessages && currentMessages.length > 0) return;

    try {
      const res = await fetch(`http://localhost:3001/api/messages/session/${sessionId}`);
      const dbMessages = await res.json();
      const formattedMessages = dbMessages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        agentId: msg.agentId,
        agentName: msg.agentName,
        timestamp: new Date(msg.createdAt).getTime(),
        memoriesUsed: msg.metadata?.memoriesUsed || []
      }));

      set(state => ({
        sessions: state.sessions.map(s => 
          s.id === sessionId ? { ...s, messages: formattedMessages } : s
        )
      }));
    } catch (err) {
      console.error("加载消息失败", err);
    }
  },
  
  addMessage: (sessionId, message) => set((state) => ({
    sessions: state.sessions.map(s => 
      s.id === sessionId ? { ...s, messages: [...s.messages, message] } : s
    )
  })),
});