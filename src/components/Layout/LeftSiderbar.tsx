import React from 'react';
import { Bot, ChevronLeft, Plus, Settings2, PlusCircle, History, Trash2, Sun, Moon, Zap } from 'lucide-react';
import { Session, Agent, SessionType } from '../../types';
import { COLORS } from '../../constants';



/* --- 左侧边栏 (响应式：手机端控制显示) --- */

//定义接口数据
interface LeftSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
  agents: Agent[];
  currentSessionId: string | null;
  activeMode: SessionType;
  isDarkMode: boolean;
  // 动作类 Props
  onToggleDarkMode: () => void;  //切换黑夜模式
  onCreateNewSession: (type: SessionType) => void; //创建新对话
  onDeleteSession: (id: string, e: React.MouseEvent) => void; //删除当前对话
  onSelectSession: (id: string, type: SessionType) => void;  //选择当前对话
  onSelectAgent: (agentId: string) => void; // 处理点击头像的逻辑
  onEditAgent: (agent: Agent) => void;  //编辑智能体
  onToggleAgentInGroup: (agentId: string) => void;
  onLinkCreateAgent: () => void;  //创建新智能体
}

// 切换对话模式
const getSessionTypeLabel = (type: SessionType) => {
    switch(type) {
      case SessionType.SINGLE: return '对话';
      case SessionType.DUAL: return '双机';
      case SessionType.MULTI: return '会议';
      default: return '未知';
    }
};

// 获取模型名称
const getSessionModels = (session: Session, agents: Agent[]) => {
    const sAgents = session.agentIds.map(id => agents.find(a => a.id === id));
    const models = [...new Set(sAgents.map(a => a?.model.split('-')[1] || 'Unknown'))];
    return models.join(' / ');
};

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  isOpen, onClose, sessions, agents, currentSessionId, activeMode, isDarkMode,
  onToggleDarkMode, onCreateNewSession, onDeleteSession, onSelectSession, 
  onSelectAgent, onEditAgent, onToggleAgentInGroup, onLinkCreateAgent
}) => {
    // 在组件内部找到当前选中的 session 对象，用于判断智能体高亮
  const currentSession = sessions.find(s => s.id === currentSessionId);
  
  return (
    <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 md:relative md:w-64 border-r border-gray-200 dark:border-[#2C2C2E] flex flex-col glass shrink-0 transition-transform duration-300 transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
                <div className="h-16 flex items-center px-6 justify-between border-b border-gray-200 dark:border-[#2C2C2E]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#007AFF] flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <Bot size={18} className="text-white" />
                    </div>
                    <h1 className="font-bold text-base tracking-tight opacity-80 uppercase">聊想ChatSphere</h1>
                  </div>
                  <button onClick={onClose} className="md:hidden p-2 text-gray-400">
                    <ChevronLeft size={20} />
                  </button>
                </div>
        
                <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-6 scrollbar-hide">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <span>AI列表</span>
                      <button onClick={onLinkCreateAgent} className="hover:text-blue-500 transition-colors">
                        <Plus size={14}/>
                      </button>
                    </div>
                    <div className="space-y-1">
                      {agents.map(a => {
                        const isSelected = activeMode === SessionType.SINGLE && currentSession?.agentIds.includes(a.id);
                        // const isDualInvolved = activeMode === SessionType.DUAL && currentSession?.agentIds.includes(a.id);
                        const isDualInvolved = (activeMode === SessionType.DUAL || activeMode === SessionType.MULTI) && currentSession?.agentIds.includes(a.id);


                        return (
                          <div key={a.id} className={`group flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer border ${
                            isSelected || isDualInvolved
                              ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400' 
                              : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-300'
                          }`}
                        onClick={() => onSelectAgent(a.id)}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0 ${COLORS[a.color as keyof typeof COLORS]} ${isSelected || isDualInvolved ? 'shadow-lg shadow-blue-500/10' : 'shadow-sm opacity-80'}`}>
                            {a.avatar}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <div className="text-[12px] font-bold truncate">{a.name}</div>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation();  onEditAgent({ ...a }); }}
                            className={`p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-all ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}
                          >
                            <Settings2 size={12} />
                          </button>
                        </div>
                      )})}
                    </div>
                  </div>
        
                  <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-[#2C2C2E]">
                    <button 
                      onClick={() =>onCreateNewSession(activeMode)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-all font-bold text-xs group"
                    >
                      <PlusCircle size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
                      <span>新建话题</span>
                    </button>
        
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <History size={12} />
                        <span>历史话题</span>
                      </div>
                      <div className="space-y-2 max-h-[40vh] overflow-y-auto scrollbar-hide px-1">
                        {sessions.map(s => (
                          <div 
                            key={s.id}
                            onClick={() => onSelectSession(s.id, s.type)}
                            className={`group relative p-3 rounded-2xl cursor-pointer transition-all border ${
                              currentSessionId === s.id 
                                ? 'bg-white dark:bg-[#1C1C1E] border-gray-200 dark:border-white/10 shadow-sm' 
                                : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                          >
                            <button 
                              onClick={(e) => onDeleteSession(s.id, e)}
                              className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-40 hover:opacity-100 hover:text-red-500 transition-all rounded-lg"
                            >
                              <Trash2 size={12} />
                            </button>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter ${
                                s.type === SessionType.SINGLE ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20' : 
                                s.type === SessionType.DUAL ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/20' : 
                                'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20'
                              }`}>
                                {getSessionTypeLabel(s.type)}
                              </span>
                              <span className="text-[8px] font-mono opacity-20 uppercase truncate max-w-[60px] mr-4">{getSessionModels(s, agents)}</span>
                            </div>
                            <div className={`text-[12px] font-bold truncate pr-4 ${currentSessionId === s.id ? 'opacity-100' : 'opacity-50'}`}>
                              {s.title}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
        
                <div className="p-4 border-t border-gray-200 dark:border-[#2C2C2E] flex items-center justify-between shrink-0">
                    <button onClick={onToggleDarkMode} >
                        {isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}
                    </button>
                   <button className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-400 opacity-30 hover:opacity-100 transition-all"><Zap size={18}/></button>
                </div>
    </aside>
  );
};