// src/routes/session.ts
import { Router } from 'express';
import prisma from '../db';

const router = Router();

// 获取某个用户的所有会话
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }, // 按时间倒序，最新的在前面
      include: {
        // 可选：加载每个会话的最新的 1 条消息作为预览
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: '获取会话失败' });
  }
});

// 创建新会话
router.post('/', async (req, res) => {
  const { userId, title, type, agentIds, config } = req.body;
  try {
    const newSession = await prisma.session.create({
      data: {
        userId,
        title,
        type,
        agentIds, // 这里的 agentIds 会自动对应你定义的 Json 字段
        config
      }
    });
    res.json(newSession);
  } catch (error) {
    res.status(500).json({ error: '创建会话失败' });
  }
});

export default router;