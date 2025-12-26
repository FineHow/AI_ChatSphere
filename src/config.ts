// src/config.ts
import dotenv from 'dotenv';

// 在 Node 环境中，process.env 没有 VITE_* 时手动加载 .env 文件
if (typeof process !== 'undefined' && process.release?.name === 'node') {
  dotenv.config();
}

interface AppConfig {
  geminiApiKey: string;
  useProxy: string;
}

export function getConfig(): AppConfig {
  let geminiApiKey: string;
  let useProxy: string;

  // 前端（Vite 环境）
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    geminiApiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
    useProxy = (import.meta as any).env.VITE_USE_PROXY;
  } 
  // 后端(Node / ts-node)
  else if (typeof process !== 'undefined' && process.env) {
    geminiApiKey = process.env.VITE_GEMINI_API_KEY || '';
    useProxy = process.env.VITE_USE_PROXY || '';
  } else {
    // 都没取到，返回空字符串
    geminiApiKey = '';
    useProxy = '';
  }

  if (!geminiApiKey) {
    throw new Error('❌ Missing VITE_GEMINI_API_KEY in environment variables');
  }
  if (!useProxy) {
    throw new Error('❌ Missing VITE_USE_PROXY in environment variables');
  }

  return { geminiApiKey, useProxy };
}