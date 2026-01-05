// src/components/Chat/ChatView.tsx
import React, { useRef, useEffect } from 'react';
import { Session, SessionType, DualMode, Agent, Message } from '../../types';
import { Menu, Share2, Cpu, Eye, Send, Square, Play, Coffee } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { ThinkingBubble } from './ThinkingBubble';

interface ChatViewProps {
  // 数据
  session: Session | undefined;
  activeMode: SessionType;
  agents: Agent[];
  userInput: string;
  isRightPanelOpen: boolean;
  selectedMsgId: string | null;

  // 动作
  onMenuClick: () => void; // 手机端打开左侧栏
  onToggleRightPanel: () => void;
  onSwitchMode: (mode: SessionType) => void;
  onShare: () => void;
  onInputChange: (val: string) => void;
  onSendMessage: () => void;
  onStopGeneration: () => void;
  onStartWorkshop: () => void;
  onMsgSelect: (id: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  session, activeMode, agents, userInput, isRightPanelOpen, selectedMsgId,
  onMenuClick, onToggleRightPanel, onSwitchMode, onShare, 
  onInputChange, onSendMessage, onStopGeneration, onStartWorkshop, onMsgSelect
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动逻辑移动到这里，因为它是视图行为
  useEffect(() => {
    if (scrollRef.current) {
      const scroll = scrollRef.current;
      scroll.scrollTo({ top: scroll.scrollHeight, behavior: 'smooth' });
    }
  }, [session?.messages, session?.isRunning, session?.currentRound]);

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden h-full">
      {/* --- Header --- */}
      <header className="h-16 px-4 md:px-6 flex items-center justify-between glass z-10 border-b border-gray-200 dark:border-[#2C2C2E] shrink-0">
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={onMenuClick} className="md:hidden p-2 text-gray-500 hover:text-blue-500 transition-colors">
            <Menu size={20} />
          </button>
          <div className="flex bg-gray-200/50 dark:bg-white/5 p-1 rounded-xl">
            {[SessionType.SINGLE, SessionType.DUAL, SessionType.MULTI].map((type) => (
              <button 
                key={type}
                onClick={() => onSwitchMode(type)}
                className={`px-2.5 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all ${activeMode === type ? 'bg-white dark:bg-[#3A3A3C] shadow-sm text-black dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
              >
                {type === SessionType.SINGLE ? '对话' : type === SessionType.DUAL ? '双机' : '会议'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={onShare} title="分享对话" className="p-2 rounded-xl bg-gray-200 dark:bg-white/5 text-gray-400 hover:text-blue-500 transition-all">
            <Share2 size={18} />
          </button>
          <button onClick={onToggleRightPanel}
            className={`p-2 rounded-xl transition-all ${isRightPanelOpen ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-200 dark:bg-white/5 text-gray-400 hover:text-black dark:hover:text-white'}`}>
            <Cpu size={18} />
          </button>
        </div>
      </header>

      {/* --- Message List --- */}
      <div className="flex-1 flex flex-col p-3 md:p-8 overflow-y-auto overflow-x-hidden scrollbar-hide" ref={scrollRef}>
        <div className="max-w-4xl mx-auto w-full relative">
          {activeMode === SessionType.DUAL && (
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px flex justify-center pointer-events-none opacity-[0.03] dark:opacity-[0.05]">
              <div className="w-full h-full bg-white dark:bg-white" />
            </div>
          )}

          {session?.messages.length === 0 && !session?.isRunning && (
            <div className="py-24 flex flex-col items-center opacity-10">
              <div className="p-8 rounded-[40px] bg-gray-300 dark:bg-white/10 mb-6"><Coffee size={64}/></div>
              <p className="text-lg font-black tracking-[0.3em] uppercase">等待开启</p>
            </div>
          )}
          
          {session?.messages.map(msg => (
            <MessageBubble 
              key={msg.id} 
              message={msg} 
              agents={agents} 
              session={session}
              isSelected={selectedMsgId === msg.id}
              onSelect={() => onMsgSelect(msg.id)}
            />
          ))}
          
          {session?.isRunning && (
            <ThinkingBubble 
              agent={agents.find(a => a.id === session.agentIds[session.currentRound % session.agentIds.length])} 
              isDual={activeMode === SessionType.DUAL}
              isRightSide={activeMode === SessionType.DUAL && (session.currentRound % 2 !== 0)}
            />
          )}
        </div>
      </div>

      {/* --- Input Area --- */}
      <div className="p-4 md:p-6 pb-6 md:pb-10 glass border-t border-gray-200 dark:border-[#2C2C2E] shrink-0">
        <div className="max-w-4xl mx-auto flex items-end gap-3">
          <div className="flex-1 relative">
            {activeMode === SessionType.DUAL ? (
              <div className="w-full bg-gray-100 dark:bg-white/5 border border-dashed border-gray-300 dark:border-white/10 rounded-[22px] px-5 py-3 text-xs md:text-sm flex items-center justify-center gap-2 text-gray-400 font-medium">
                <Eye size={16} /> <span>{session?.dualMode === DualMode.DEBATE ? '对抗辩论' : '演绎扮演'}模式：用户暂不参与讨论</span>
              </div>
            ) : (
              <>
                <textarea 
                  className="w-full bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10 rounded-[22px] px-5 py-2.5 md:py-3 text-[14px] md:text-[15px] focus:outline-none focus:border-blue-500 transition-all resize-none shadow-sm placeholder:opacity-30"
                  placeholder={session?.isRunning ? "讨论中，您可以补充观点..." : "发送消息..."}
                  value={userInput}
                  onChange={(e) => onInputChange(e.target.value)}
                  rows={1}
                  onKeyDown={(e) => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault(); onSendMessage();}}}
                />
                <button onClick={onSendMessage} disabled={!userInput.trim()}
                  className="absolute right-2.5 bottom-2 p-1.5 rounded-full bg-blue-500 text-white disabled:opacity-20 hover:scale-105 active:scale-95 transition-all">
                  <Send size={18} fill="currentColor"/>
                </button>
              </>
            )}
          </div>
          {activeMode !== SessionType.SINGLE && (
            <div className="flex gap-2">
              {session?.isRunning ? (
                <button onClick={onStopGeneration}
                  className="p-3 md:p-3.5 rounded-[18px] md:rounded-[20px] bg-red-100 dark:bg-red-500/10 text-red-500 hover:bg-red-200 dark:hover:bg-red-500/20 transition-all shadow-sm">
                  <Square size={20} fill="currentColor" />
                </button>
              ) : (
                <button onClick={onStartWorkshop}
                  className="p-3 md:p-3.5 rounded-[18px] md:rounded-[20px] bg-blue-100 dark:bg-blue-500/10 text-blue-500 hover:bg-blue-200 dark:hover:bg-blue-500/20 transition-all shadow-sm">
                  <Play size={20} fill="currentColor" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};