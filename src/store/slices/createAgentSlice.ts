//智能体状态控制
import { StateCreator } from 'zustand';
import { Agent } from '../../types';
import { AppState } from '../useStore';

// 定义 API 地址
const API_URL = 'http://localhost:3001/api/agents';
const USER_ID = "test-user-123"; 

export interface AgentSlice {
  agents: Agent[];
  // 核心动作
  loadAgents: () => Promise<boolean>; // 返回 boolean 表示是否为空(判断是否需要初始化智能体)
  addAgent: (agent: Omit<Agent, 'id'>) => Promise<void>;
  updateAgent: (id: string, updates: Partial<Agent>) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
}

export const createAgentSlice: StateCreator<AppState, [], [], AgentSlice> = (set, get) => ({
  agents: [],

  // 1. 加载智能体
  loadAgents: async () => {
    try {
      const res = await fetch(`${API_URL}/user/${USER_ID}`);
      if (!res.ok) throw new Error("加载失败");
      
      const dbAgents = await res.json();
      
      // 核心：解包 config (Backend -> Frontend)
      const formattedAgents = dbAgents.map((a: any) => ({
        id: a.id,
        name: a.name,
        persona: a.persona,
        ...a.config // 展开config让前端展示 
      }));

      set({ agents: formattedAgents });
      return formattedAgents.length === 0; // 如果数组为空，返回 true
    } catch (err) {
      console.error("Fetch Agents Error:", err);
      return false; 
    }
  },

  // 2. 新增智能体
  addAgent: async (agentData) => {
    try {
      // 打包 config (Frontend -> Backend)
      const payload = {
        userId: USER_ID,
        name: agentData.name,
        persona: agentData.persona,
        config: {
          avatar: agentData.avatar,
          model: agentData.model,
          temperature: agentData.temperature,
          color:agentData.color,
          maxOutputTokens:agentData.maxOutputTokens
        }
      };

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const newDbAgent = await res.json();
      
      // 转换回前端格式
      const newAgent: Agent = {
        id: newDbAgent.id,
        name: newDbAgent.name,
        persona: newDbAgent.persona,
        ...newDbAgent.config
      };

      set(state => ({ agents: [...state.agents, newAgent] }));
    } catch (err) {
      console.error("Add Agent Error:", err);
    }
  },

  // 3. 更新智能体
  updateAgent: async (id, updates) => {
    set(state => ({
      agents: state.agents.map(a => a.id === id ? { ...a, ...updates } : a)
    }));

    try {
      // 获取完整对象以确保 config 数据完整
      const currentAgent = get().agents.find(a => a.id === id);
      if (!currentAgent) return;

      const payload = {
        name: currentAgent.name,
        persona: currentAgent.persona,
        config: {
          avatar: currentAgent.avatar,
          model: currentAgent.model,
          temperature: currentAgent.temperature,
          color:currentAgent.color,
          maxOutputTokens:currentAgent.maxOutputTokens
        }
      };

      await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error("Update Agent Error:", err);
    }
  },

  // 4. 删除智能体
  deleteAgent: async (id:string) => {
    set(state => ({ agents: state.agents.filter(a => a.id !== id) }));
    
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error("Delete Agent Error:", err);
    }
  }
});