import { Router } from 'express';
import prisma from '../db';

const router = Router();

// 1. 获取某用户的所有 Agent
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const agents = await prisma.agent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: '获取智能体失败' });
  }
});

// 2. 创建新 Agent
router.post('/', async (req, res) => {
  const { userId, name, persona, config } = req.body;
  try {
    const newAgent = await prisma.agent.create({
      data: {
        userId,
        name,
        persona,
        config: config || {} // 存 temperature, avatar 等
      }
    });
    res.json(newAgent);
  } catch (error) {
    res.status(500).json({ error: '创建智能体失败' });
  }
});

// 3. 更新 Agent
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, persona, config } = req.body;
  try {
    const updatedAgent = await prisma.agent.update({
      where: { id },
      data: { name, persona, config }
    });
    res.json(updatedAgent);
  } catch (error) {
    res.status(500).json({ error: '更新智能体失败' });
  }
});

// 4. 删除 Agent
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.agent.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除智能体失败' });
  }
});

export default router;
