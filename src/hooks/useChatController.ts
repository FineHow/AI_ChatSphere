import { useState } from 'react';
import { useStore } from '../store/useStore';
import { geminiService } from '../services/gemini';
import { SessionType, Message, DualMode } from '../types';

export const useChatController = () => {
  // 只需要从 Store 里取数据，不需要自己维护 Session 状态
  const { 
    sessions, currentSessionId, agents, 
    updateCurrentSession, addMessage 
  } = useStore();

  const [userInput, setUserInput] = useState('');
  
  const currentSession = sessions.find(s => s.id === currentSessionId);

  // 发送消息逻辑
  const handleSendMessage = async () => {
    if (!currentSession || !userInput.trim()) return;
    if (currentSession.type === SessionType.DUAL) return;

    const input = userInput;
    const newUserMsg: Message = {
      id: `msg-${Date.now()}`, role: 'user', content: input,
      timestamp: Date.now(), memoriesUsed: []
    };

    // 1. UI 立即更新用户消息
    addMessage(currentSession.id, newUserMsg);
    setUserInput('');
    
    if (currentSession.type === SessionType.SINGLE) {
      updateCurrentSession({ isRunning: true });
      
      try {
        const agent = agents.find(a => a.id === currentSession.agentIds[0]) || agents[0];
        // 注意：这里获取的是更新前的 messages，实际上应该把 newUserMsg 拼进去传给 API
        const history = [...currentSession.messages, newUserMsg];
        
        const result = await geminiService.generateResponse(agent, history, input);
        
        const modelMsg: Message = {
          id: `msg-${Date.now()}`, role: 'model', content: result.content,
          agentId: agent.id, agentName: agent.name, timestamp: Date.now(),
          memoriesUsed: result.memoriesUsed, rawRequest: result.rawRequest, rawResponse: result.rawResponse
        };

        addMessage(currentSession.id, modelMsg);
      } catch (err) {
        console.error(err);
      } finally {
        updateCurrentSession({ isRunning: false });
      }
    }
  };

  // 研讨/双机逻辑 (最复杂的那个循环)
  const startWorkshop = async () => {
    if (!currentSession || currentSession.isRunning) return;
    if (currentSession.agentIds.length < 2) return alert("研讨需要至少选择两个智能体。");

    updateCurrentSession({ isRunning: true, currentRound: 0 });

    const baseAgents = currentSession.agentIds.map(id => agents.find(a => a.id === id)!).filter(Boolean);
    let turnSequence = [...baseAgents];

    // 处理先手逻辑
    if (currentSession.type === SessionType.DUAL && currentSession.firstSpeakerId) {
      const firstIdx = turnSequence.findIndex(a => a.id === currentSession.firstSpeakerId);
      if (firstIdx > 0) {
        const first = turnSequence.splice(firstIdx, 1);
        turnSequence = [first[0], ...turnSequence];
      }
    }

    // 循环逻辑
    for (let round = 0; round < currentSession.maxRounds; round++) {
      // 关键：在循环中每次都必须重新从 store 获取最新状态，判断是否被暂停
      const latestSession = useStore.getState().sessions.find(s => s.id === currentSession.id);
      
      if (!latestSession || !latestSession.isRunning) break;

      const actingAgent = turnSequence[round % turnSequence.length];
      
      // ... 构建 Prompt 逻辑 (省略部分字符串拼接，和之前一样) ...
      const sharedBg = latestSession.backgroundContext || '探讨中...';
      const specificPrompt = latestSession.agentSpecificPrompts?.[actingAgent.id] || '';
      
      let sysMsg = `共同背景: ${sharedBg}\n你的特定立场: ${specificPrompt}\n当前是研讨轮次: ${round + 1}/${latestSession.maxRounds}`;

      if (latestSession.type === SessionType.MULTI) {
              sysMsg = `[会议室模式] 共同议题: ${sharedBg}\n请参与讨论。轮次: ${round + 1}/${latestSession.maxRounds}`;
            } else if (latestSession.type === SessionType.DUAL) {
              if (latestSession.dualMode === DualMode.DEBATE) {
                sysMsg = `[对抗辩论模式] 当前议题: ${sharedBg}\n你的特定辩论任务: ${specificPrompt}\n请针对前文的观点进行辩论、反驳或深化。保持你的角色性格。轮次: ${round + 1}`;
              } else {
                sysMsg = `[演绎扮演模式] 剧情背景: ${sharedBg}\n你的角色在此场景中的特定任务/立场: ${specificPrompt}\n请与其他角色互动，推动剧情发展。保持角色一致性，完成你的目标。轮次: ${round + 1}`;
              }
            }

      try {
        const result = await geminiService.generateResponse(
            actingAgent, 
            latestSession.messages, 
            latestSession.messages[latestSession.messages.length - 1]?.content || "Start", 
            sysMsg
        );
        
        const modelMsg: Message = {
           // ... (构建消息对象)
           id: `msg-${Date.now()}`, role: 'model', content: result.content,
           agentId: actingAgent.id, agentName: actingAgent.name, timestamp: Date.now(),
           memoriesUsed: result.memoriesUsed
        };

        // 更新 Store
        addMessage(currentSession.id, modelMsg);
        updateCurrentSession({ currentRound: round + 1 });

        await new Promise(r => setTimeout(r, 2200)); // 思考延迟
      } catch (err) {
        console.error("Workshop Error:", err);
        break;
      }
    }
    
    updateCurrentSession({ isRunning: false });
  };

  const stopGeneration = () => {
    updateCurrentSession({ isRunning: false });
  };

  return {
    userInput,
    setUserInput,
    handleSendMessage,
    startWorkshop,
    stopGeneration
  };
};