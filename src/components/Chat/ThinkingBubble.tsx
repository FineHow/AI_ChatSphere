import { Agent } from '../../types'; // 确保路径正确
import React from 'react';


// --- 子组件：思考中气泡 ---
interface ThinkingBubble {
  agent: Agent[];
  isDual?: boolean;
  isRightSide?: boolean;
}

export const ThinkingBubble: React.FC<ThinkingBubble> = ({ 
    agent, isDual, isRightSide 
}) => (
    <div className={`flex flex-col mb-4 w-full animate-pulse ${isRightSide ? 'items-end ml-12' : 'items-start mr-12'}`}>
        <div className="flex items-center gap-1.5 mb-1 px-3">
        <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest text-blue-500">
            {agent?.name || 'AI'} 正在构思响应
        </span>
        </div>
        <div className={`px-5 py-4 rounded-[22px] ${isRightSide ? 'bg-blue-50 dark:bg-blue-900/20 rounded-br-sm' : 'bg-purple-50 dark:bg-purple-900/20 rounded-bl-sm'}`}>
        <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-current opacity-40 animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-2 h-2 rounded-full bg-current opacity-40 animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 rounded-full bg-current opacity-40 animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
        </div>
    </div>

  
);