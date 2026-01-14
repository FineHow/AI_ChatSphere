import { useState } from 'react';
import { useStore } from '../store/useStore';
import { geminiService } from '../services/gemini';
import { SessionType, Message, DualMode } from '../types';

export const useChatController = () => {


// 辅助函数：把后端返回的消息格式转为前端 Message 类型
// 后端可能返回 { id, content, createdAt ... }
// 前端需要 { id, content, timestamp ... }
const mapDbMessageToFrontend = (dbMsg: any): Message => ({
  id: dbMsg.id,
  role: dbMsg.role,
  content: dbMsg.content,
  agentId: dbMsg.agentId,
  agentName: dbMsg.agentName,
  timestamp: new Date(dbMsg.createdAt).getTime(), // 转换时间格式
  memoriesUsed: dbMsg.metadata?.memoriesUsed || [],
});



  // 只需要从 Store 里取数据，不需要自己维护 Session 状态
  const { 
    sessions, currentSessionId, agents, 
    updateCurrentSession, addMessage 
  } = useStore();

  const [userInput, setUserInput] = useState('');
  
  const currentSession = sessions.find(s => s.id === currentSessionId);

  const handleSendMessage = async () => {
    if (!currentSession || !userInput.trim()) return;
    if (currentSession.type === SessionType.DUAL) return;

    const inputContent = userInput;
    setUserInput(''); // 1. 先清空输入框，提升体验

    // 2. 准备发送给后端的数据
    const payload = {
        sessionId: currentSession.id,
        role: 'user',
        content: inputContent,
    };

    try {
        // --- 第一阶段：保存用户消息 ---
        
        // A. 调用后端 API
        const userRes = await fetch('http://localhost:3001/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!userRes.ok) throw new Error("用户消息保存失败");
        
        const savedUserMsg = await userRes.json();
        
        // B. 使用后端返回的完整数据（包含真实的 UUID）更新 UI
        // 注意：addMessage 最好能接收单个消息对象
        const frontendUserMsg = mapDbMessageToFrontend(savedUserMsg);
        addMessage(currentSession.id, frontendUserMsg);

        // --- 第二阶段：AI 生成并保存 ---

        if (currentSession.type === SessionType.SINGLE) {
            updateCurrentSession({ isRunning: true });
            
            const agent = agents.find(a => a.id === currentSession.agentIds[0]) || agents[0];
            
            // C. 准备历史上下文 (把刚才保存的用户消息拼进去)
            const history = [...currentSession.messages, frontendUserMsg];
            
            // D. 调用 Gemini AI
            const result = await geminiService.generateResponse(agent, history, inputContent);
            
            // E. 将 AI 的回复发送给后端保存
            const aiPayload = {
                sessionId: currentSession.id,
                role: 'model',
                content: result.content,
                agentId: agent.id,
                agentName: agent.name,
                metadata: { 
                    memoriesUsed: result.memoriesUsed,
                    rawRequest: result.rawRequest,
                    rawResponse: result.rawResponse
                }
            };

            const aiRes = await fetch('http://localhost:3001/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(aiPayload)
            });

            const savedAiMsg = await aiRes.json();
            
            // F. 更新 UI 显示 AI 回复
            addMessage(currentSession.id, mapDbMessageToFrontend(savedAiMsg));
        }

    } catch (err) {
        console.error("发送流程出错:", err);
        // 这里最好加上错误提示，比如 toast
    } finally {
        updateCurrentSession({ isRunning: false });
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