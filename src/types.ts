
export enum SessionType {
  SINGLE = 'SINGLE',//单机模式
  DUAL = 'DUAL',  //双机模式
  MULTI = 'MULTI' // 会议室模式
}

export enum DualMode {
  DEBATE = 'DEBATE',
  ROLEPLAY = 'ROLEPLAY'
}

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  persona: string;
  model: string;
  temperature: number;
  color: string;
  maxOutputTokens?: number; // 最大输出字数限制
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  agentId?: string;
  agentName?: string;
  timestamp: number;
  memoriesUsed: string[];
  rawRequest?: any;
  rawResponse?: any;
}

export interface Session {
  id: string;
  title: string;
  type: SessionType;
  dualMode?: DualMode;
  agentIds: string[];
  messages: Message[];
  maxRounds: number;
  currentRound: number;
  isRunning: boolean;
  backgroundContext?: string;
  agentSpecificPrompts?: Record<string, string>;
  firstSpeakerId?: string; // 为双机模式新增：先手发言者 ID
}
