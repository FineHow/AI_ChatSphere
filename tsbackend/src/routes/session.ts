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

// 3. 更新会话配置 (PATCH)
// 前端可能只发来 title，或者只发来 config，或者 agentIds
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, type, agentIds, config } = req.body;

  try {
    const updatedSession = await prisma.session.update({
      where: { id },
      data: {
        // Prisma 允许 undefined，如果是 undefined 就不会更新该字段
        title, 
        type,
        agentIds, 
        config 
      }
    });
    res.json(updatedSession);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '更新会话失败' });
  }
});

// 4. 删除会话 (既然做了 CRUD，顺便加上删除)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.session.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除会话失败' });
  }
});

export default router;