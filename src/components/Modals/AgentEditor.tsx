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
       
      
      {/* 头部 */}
        <div className="h-14 md:h-16 px-6 md:px-8 flex items-center justify-between border-b border-gray-100 dark:border-white/5 shrink-0">
          <h3 className="font-bold text-[15px] md:text-[16px] opacity-70">配置AI角色</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-400 transition-all"><X size={20}/></button>
        </div>
      {/* 内容滚动区 */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 md:space-y-8 scrollbar-hide">
          
          {/* 头像与名称 */}
          <div className="flex gap-4 md:gap-6 items-end">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-[28px] md:rounded-[32px] bg-gray-100 dark:bg-white/5 flex items-center justify-center text-3xl md:text-4xl shadow-inner group relative shrink-0">
              <input 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                value={localAgent.avatar} 
                onChange={e => setLocalAgent({...localAgent, avatar: e.target.value})}
              />
              {localAgent.avatar}
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">代号</label>
              <input 
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-sm font-bold focus:outline-none" 
                value={localAgent.name} 
                onChange={e => setLocalAgent({...localAgent, name: e.target.value})}
              />
            </div>
          </div>

          {/* 人格底层提示词 */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">人格底层 (Persona)</label>
            <textarea 
              className="w-full h-32 md:h-40 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[24px] md:rounded-[32px] p-4 md:p-5 text-[13px] leading-relaxed focus:outline-none resize-none shadow-inner" 
              value={localAgent.persona} 
              onChange={e => setLocalAgent({...localAgent, persona: e.target.value})}
              placeholder="设定角色的人格、说话风格等..."
            />
          </div>

          {/* 模型引擎与 Token */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">逻辑引擎</label>
              <select 
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-3 text-[13px] font-bold focus:outline-none" 
                value={localAgent.model} 
                onChange={e => setLocalAgent({...localAgent, model: e.target.value})}
              >
                {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="space-y-3">
               <div className="flex justify-between px-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">最大输出</label>
                <span className="text-[10px] font-mono text-blue-500 font-bold">{localAgent.maxOutputTokens || 800}</span>
               </div>
               <input 
                type="range" min="100" max="4000" step="100" 
                className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-full accent-blue-500 mt-5" 
                value={localAgent.maxOutputTokens || 800} 
                onChange={e => setLocalAgent({...localAgent, maxOutputTokens: parseInt(e.target.value)})}
              />
            </div>
          </div>
          {/* temperature随机性控制 */}
          <div className="space-y-3">
            <div className="flex justify-between px-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">温度控制</label>
              <span className="text-[10px] font-mono">{localAgent.temperature}</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.1" 
              className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-full accent-blue-500 mt-5" 
              value={localAgent.temperature} 
              onChange={e => setLocalAgent({...localAgent, temperature: parseFloat(e.target.value)})}
            />
          </div>
        </div>

        {/* 底部操作栏-两个按钮 */}
        <div className="p-6 md:p-8 flex justify-between items-center bg-gray-50 dark:bg-white/[0.01] border-t border-gray-100 dark:border-white/5">
          <button 
            onClick={() => {
              if (totalAgentsCount <= 1) return alert("请至少保留一个智能体。");
              onDelete(localAgent.id);
            }} 
            className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
          >
            <Trash2 size={20}/>
          </button>
          <button 
            onClick={() => onSave(localAgent)} 
            className="px-8 md:px-10 py-3 md:py-3.5 bg-blue-500 text-white text-[13px] font-bold rounded-[20px] hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
          >
            保存配置
          </button>
        </div>
       </div>
      
    </div>
  );
};