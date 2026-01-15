import React from 'react';
import { BrainCircuit } from 'lucide-react';
import { Message, Agent, Session, SessionType } from '../../types'; // 确保路径正确

// --- 子组件：消息气泡 ---
interface MessageBubbleProps {
  message: Message;
  agents: Agent[];
  session: Session;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, agents, session, isSelected, onSelect 
}) => {
  const isModel = message.role === 'model';
  const agent = agents.find(a => a.id === message.agentId);
  const isDual = session.type === SessionType.DUAL;
  
  // 对抗模式逻辑：第一个智能体在左，第二个在右
  let alignment = isModel ? 'items-start' : 'items-end';
  let bubbleStyle = 'bg-gray-200 dark:bg-[#1C1C1E] text-black dark:text-white rounded-bl-sm';
  
  if (isDual && isModel) {
    const agentIndex = session.agentIds.indexOf(message.agentId || '');
    if (agentIndex === 0) {
      alignment = 'items-start mr-8 md:mr-12';
      bubbleStyle = 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 border border-purple-200 dark:border-purple-800 rounded-bl-sm';
    } else {
      alignment = 'items-end ml-8 md:ml-12';
      bubbleStyle = 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800 rounded-br-sm';
    }
  } else if (!isModel) {
    bubbleStyle = 'bg-[#007AFF] text-white rounded-br-sm font-medium shadow-sm shadow-blue-500/10';
  }

    return (
      <div 
        onClick={onSelect}
        className={`flex flex-col mb-4 md:mb-6 w-full ${alignment} transition-all duration-500 animate-in slide-in-from-bottom-2 cursor-pointer ${isSelected ? 'ring-2 ring-blue-500/50 rounded-2xl ring-offset-4 ring-offset-[#F2F2F7] dark:ring-offset-black' : ''}`}
      >
        <div className="flex items-center gap-2 mb-1.5 px-3">
          {isDual && agent && (
            <span className="text-sm">{agent.avatar}</span>
          )}
          <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.1em]">
            {isModel ? (agent?.name || 'AI') : '用户'}
          </span>
        </div>
        <div className={`max-w-[92%] md:max-w-[75%] px-4 md:px-5 py-2.5 md:py-3 rounded-[20px] text-[14px] md:text-[15px] leading-relaxed shadow-sm ${bubbleStyle}`}>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="flex items-center gap-2 mt-1.5 px-2 opacity-20 text-[9px] font-mono">
          <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {message.memoriesUsed && message.memoriesUsed.length > 0 && <BrainCircuit size={10} />}
        </div>
      </div>
    );
};
