# 聊想 (AI ChatSphere)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)    [![GitHub Stars](https://img.shields.io/github/stars/yourusername/ai-chatsphere.svg)](https://github.com/yourusername/ai-chatsphere/stargazers)   [![Issues](https://img.shields.io/github/issues/yourusername/ai-chatsphere.svg)](https://github.com/yourusername/ai-chatsphere/issues)

**聊想 (AI ChatSphere)** 是一个创新的多智能体对话平台，旨在为用户提供一个充满创意与思想碰撞的虚拟互动空间。通过多模型AI技术，用户可以与个性化智能体深度交流、体验角色扮演的情景对话、参与或围观激烈的多方讨论，并探索AI的思维逻辑。无论是娱乐、学习还是创意激发，AI ChatSphere 都能为你带来独特体验。

## 项目介绍

AI ChatSphere 是一个基于自然语言处理（NLP）技术的多场景多智能体AI互动平台，核心目标是通过多样化的对话模式，满足用户在娱乐、学习和工作中的不同需求。项目支持用户与多个自定义AI智能体交互，同时提供情景演绎、会议室讨论和AI辩论等多种功能，创造出从轻松趣味到深度思考的广泛使用场景。

### 核心功能与技术亮点

- **个性化AI智能体对话**：用户可自定义AI智能体的性格、背景和语言风格，支持一对一或多方对话。
- **情景演绎模式**：允许用户为AI设定角色和剧情，生成沉浸式对话内容（如“CP”互动），通过预定义模板和动态 prompt 工程实现角色一致性和剧情灵活性，适合创意娱乐场景。
- **会议室与辩论模式**：支持多个AI智能体围绕某一话题展开讨论或对立辩论，利用冲突性 prompt 设计和多智能体协作框架，模拟真实思想碰撞，甚至“针锋相对”的趣味互动，供用户观察或参与。
- **记忆回溯功能**：提供AI决策透明化支持，用户可查看AI回复所依赖的历史对话上下文及其权重分布。该功能通过对话日志存储和注意力机制（Attention Mechanism）分析实现，为对AI行为感兴趣的用户提供深入洞察。
- **技术架构概述**：项目后端基于node.js 构建，前端采用 React 实现动态交互界面，

### 应用场景

- **创意娱乐**：通过情景演绎满足CP剧情互动需求，或围观会议室中的AI“辩论大战”。
- **学习与研究**：与AI探讨专业话题，或利用记忆回溯分析对话逻辑，适合NLP研究者和学生。
- **头脑风暴**：借助多智能体讨论模式，激发个人或团队创意。
- **情感陪伴**：定制贴心AI智能体，随时伴聊，缓解日常压力。

AI ChatSphere 的设计灵感来源于多智能体交互和人机协作研究，旨在通过技术手段打破传统对话工具的局限，为用户提供一个既有趣又实用的虚拟交流空间。

人设设置：
![1766769644746](images/README/1766769644746.png)

双机辩论：

![1766769666557](images/README/1766769666557.png)

记忆回溯：
![1766769684959](images/README/1766769684959.png)

会议室模式

![1766769704624](images/README/1766769704624.png)

UI黑夜模式和白天模式切换
[![1766769717518](images/README/1766769717518.png)]()

## 快速开始

以下是快速安装和运行 AI ChatSphere 的步骤：

```bash
# 克隆仓库
git clone https://github.com/FineHow/AI_ChatSphere.git
cd src
# 安装依赖
npm install
# 启动应用
npm run dev
```

访问 `http://localhost:3000` 开始你的AI对话体验！

> **注意**：请确保你的环境已安装 env 和必要的依赖项。

（具体看env example）
