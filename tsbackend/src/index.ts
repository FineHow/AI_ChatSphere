
import express from 'express';
import cors from 'cors';
import sessionRoutes from './routes/session';
import messageRoutes from './routes/message';
import bodyParser from 'body-parser';  // 添加这行

const app = express();

app.use(cors()); // 允许前端跨域访问
// app.use(express.json());
app.use(bodyParser.json());  // 替换 express.json()

// 注册路由
app.use('/api/sessions', sessionRoutes);
app.use('/api/messages', messageRoutes);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend is running at http://localhost:${PORT}`);
});