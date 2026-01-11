// src/routes/message.ts
import { Router } from 'express';
import prisma from '../db';

const router = Router();

// 保存新消息
router.post('/', async (req, res) => {
  const { sessionId, role, content, agentId, agentName, metadata } = req.body;
  try {
    const message = await prisma.message.create({
      data: {
        sessionId,
        role,
        content,
        agentId,
        agentName,
        metadata
      }
    });
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: '保存消息失败' });
  }
});

// 获取某个会话的所有消息
router.get('/session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' } // 对话按时间正序排列
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: '获取消息失败' });
  }
});

export default router;