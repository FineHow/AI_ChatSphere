// src/components/Modals/AgentEditor.tsx
import { X, Trash2 } from 'lucide-react';
import { Agent } from '../../types';
import { MODELS } from '../../constants';
import React, { useState, useEffect } from 'react';

interface AgentEditorProps {
  agent: Agent | null;// 正在编辑的智能体对象
  totalAgentsCount: number; // 用于判断是否允许删除(不允许删除最后一个对话)

  onClose: () => void;
  onSave: (agent: Agent) => void;
  onDelete: (id: string) => void;

}

export const AgentEditor: React.FC<AgentEditorProps> = ({ 
  agent,totalAgentsCount, onClose, onSave, onDelete 
}) => {

  // 使用内部 state 托管编辑内容，实现“撤销”逻辑（不点保存就不更新外部）
  const [localAgent, setLocalAgent] = useState<Agent>({ ...agent });
 // 如果外部传入的 agent 变了（比如切换了编辑对象），同步更新内部 state
  useEffect(() => {
    setLocalAgent({ ...agent });
  }, [agent]);
  if (!localAgent) return null;

  return (
    
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 md:p-4">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px]" onClick={onClose}/>
      
      {/* 弹窗主体 */}
       <div className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] rounded-[30px] md:rounded-[40px] border border-gray-200 dark:border-white/10 shadow-2xl z-10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]">
       
       
       </div>
      
    </div>
  );
};