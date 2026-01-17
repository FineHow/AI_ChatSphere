// src/components/Layout/RightPanel.tsx
import React from 'react';
import { Settings2, BrainCircuit, Code, Terminal, Swords, Theater, X, History } from 'lucide-react';
import { Session, DualMode, Agent,SessionType } from '../../types';
import { MODELS } from '../../constants';



{/* --- 右侧配置面板 (响应式：手机端覆盖显示) --- */}
interface RightPanelProps {
  isOpen: boolean;
  activeTab: 'config' | 'memory' | 'json';
  session: Session | undefined;// 当前选中的会话
  agents: Agent[];// 所有智能体，用于匹配头像
  selectedMsgId: string | null;// 溯源/JSON 依赖的消息 ID

  onClose: () => void;
  onTabChange: (tab: 'config' | 'memory' | 'json') => void;
  onUpdateSession: (updates: Partial<Session>) => void;


}

export const RightPanel: React.FC<RightPanelProps> = ({
  onClose,isOpen, activeTab, session, agents, selectedMsgId, onTabChange, onUpdateSession
}) => {
  // 如果没有选中的 Session，显示空状态
  if (!session && isOpen) {
    return (
      <aside className="w-80 border-l dark:border-white/10 flex items-center justify-center text-gray-400 text-xs">
        请选择一个话题以进行配置
      </aside>
    );
  }

  return (
    <aside className={`
      fixed md:relative inset-y-0 right-0 z-50 transition-all duration-300 flex flex-col shrink-0 bg-[#F2F2F7] dark:bg-[#000000] border-l border-gray-200 dark:border-[#2C2C2E]
      ${isOpen ? 'w-full md:w-[400px] translate-x-0' : 'w-0 md:w-0 overflow-hidden translate-x-full md:translate-x-0 border-none'}
    `}>
      <div className="h-16 flex items-center px-6 justify-between border-b border-gray-200 dark:border-[#2C2C2E] shrink-0">
        <div className="flex gap-4">
          {['config', 'memory', 'json'].map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab as any)}
              className={`text-[10px] font-black uppercase tracking-[0.2em] pb-1 transition-all border-b-2 ${
                activeTab === tab ? 'border-blue-500 text-black dark:text-white' : 'border-transparent text-gray-400'
              }`}
            >
              {tab === 'config' ? '配置' : tab === 'memory' ? '溯源' : '数据'}
            </button>
          ))}


          
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors"><X size={18}/></button>
    </div>


     {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
        {activeTab === 'config' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* 话题名称修改 */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">话题议题</label>
              <input 
                className="w-full bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none shadow-sm"
                value={session?.title || ''}
                onChange={(e) => onUpdateSession({ title: e.target.value })}
              />
            </div>


            {/* 双机模式专有配置 */}
            {session?.type === SessionType.DUAL && (
              <div className="space-y-6">
                <div className="flex bg-gray-200/50 dark:bg-white/5 p-1 rounded-2xl border border-gray-200 dark:border-white/5">
                  <button onClick={() => onUpdateSession({ dualMode: DualMode.DEBATE })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold rounded-xl transition-all ${session.dualMode === DualMode.DEBATE ? 'bg-white dark:bg-[#3A3A3C] shadow-sm text-purple-600 dark:text-purple-400' : 'text-gray-400'}`}>
                    <Swords size={12}/> 辩论模式
                  </button>
                  <button onClick={() => onUpdateSession({ dualMode: DualMode.ROLEPLAY })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold rounded-xl transition-all ${session.dualMode === DualMode.ROLEPLAY ? 'bg-white dark:bg-[#3A3A3C] shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                    <Theater size={12}/> 演绎模式
                  </button>
                </div>

                {/* 角色特定 Prompt 列表 */}
                <div className="grid grid-cols-1 gap-4">
                  {session.agentIds.map((aid, idx) => {
                    const a = agents.find(ag => ag.id === aid);
                    return (
                      <div key={aid} className="space-y-2 p-4 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/5 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                            {session.dualMode === DualMode.DEBATE ? `辩论方 ${idx === 0 ? 'A' : 'B'}` : `角色立场 ${idx === 0 ? 'A' : 'B'}`}
                          </p>
                          <span className="text-xs">{a?.avatar} {a?.name}</span>
                        </div>
                        <textarea 
                          className="w-full h-24 bg-gray-50 dark:bg-black/20 border-none rounded-xl p-3 text-[12px] focus:outline-none resize-none"
                          value={session.agentSpecificPrompts?.[aid] || ''}
                          placeholder={session.dualMode === DualMode.DEBATE ? "设置该角色的核心论点..." : "设置该角色的任务/秘密动机..."} 
                          onChange={e => onUpdateSession({ 
                            agentSpecificPrompts: { ...session.agentSpecificPrompts, [aid]: e.target.value } 
                          })} 
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
             


            {/* 公共：背景设定 */}
            <div className="space-y-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">核心背景</p>
              <textarea 
                className="w-full h-32 bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10 rounded-[28px] p-5 text-[13px] focus:outline-none resize-none shadow-inner"
                placeholder="在这里定义辩论背景或演绎剧情的开端..."
                value={session?.backgroundContext || ''}
                onChange={e => onUpdateSession({ backgroundContext: e.target.value })} 
              />
            </div>

            {/* 公共：轮次滑动条 */}
            <div className="space-y-4 px-1">
              <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase">
                <span>研讨轮次上限</span>
                <span>{session?.maxRounds}</span>
              </div>
              <input 
                type="range" min="2" max="60" 
                className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-full accent-blue-500 cursor-pointer"
                value={session?.maxRounds || 12} 
                onChange={e => onUpdateSession({ maxRounds: parseInt(e.target.value) })} 
              />
            </div>
          </div>
        )}

         {/* 感知溯源 */}
        {activeTab  === 'memory' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="p-5 rounded-[28px] bg-blue-500/5 border border-blue-500/10 text-[12px] leading-relaxed text-blue-500 font-medium">
              <BrainCircuit size={16} className="mb-2 opacity-50" />
              <b>感知溯源</b>：分析当前选定响应的关联记忆片段及其推理权重。
            </div>
            {!selectedMsgId ? (
              <div className="py-20 flex flex-col items-center gap-3 opacity-10"><History size={40}/><p className="text-[10px] font-black uppercase tracking-widest">未选定消息</p></div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const msg = session?.messages.find(m => m.id === selectedMsgId);
                  if (!msg || msg.memoriesUsed.length === 0) return <p className="text-[10px] text-gray-400 italic px-2">该片段为原生即时生成。</p>;
                  return msg.memoriesUsed.map(mid => (
                    <div key={mid} className="p-4 rounded-[24px] bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-sm space-y-2">
                      <span className="text-[9px] font-mono text-blue-500 dark:text-blue-400 font-bold uppercase tracking-wider">#MEM_{mid.slice(-4)}</span>
                      <p className="text-[11px] text-gray-500 italic leading-snug line-clamp-3">"{session.messages.find(m => m.id === mid)?.content || '...'}"</p>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        )}
        {/* Json */}
         {activeTab === 'json' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {!selectedMsgId ? (
                <div className="py-20 flex flex-col items-center gap-3 opacity-10"><Terminal size={40}/><p className="text-[10px] font-black uppercase tracking-widest">无信号</p></div>
              ) : (
                <div className="space-y-6">
                    {(() => {
                      const msg = session?.messages.find(m => m.id === selectedMsgId);
                      if(!msg?.jsonrawRequest) return <p className="text-xs text-gray-400 italic">该消息无原始 JSON 链路数据。</p>;
                      return (
                        <>
                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1"><Code size={12}/> Request</p>
                            <pre className="p-4 rounded-[28px] bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10 text-[10px] font-mono text-blue-500/60 overflow-auto max-h-[300px] shadow-inner">{JSON.stringify(msg.jsonrawRequest, null, 2)}</pre>
                          </div>
                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1"><Terminal size={12}/> Response</p>
                            <pre className="p-4 rounded-[28px] bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10 text-[10px] font-mono text-purple-500/60 overflow-auto max-h-[300px] shadow-inner">{JSON.stringify(msg.jsonrawResponse, null, 2)}</pre>
                          </div>
                        </>
                      );
                    })()}
                </div>
              )}
            </div>
          )}

    </div>
    </aside>
  );
};