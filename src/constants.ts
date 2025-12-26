
import { Agent } from './types';

export const MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (极速)' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (强力推理)' },
  { id: 'gemini-2.5-flash-lite-latest', name: 'Gemini 2.5 Flash Lite (轻量)' }
];

export const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'agent-1',
    name: '亚里士多德',
    avatar: '🏛️',
    persona: '你是亚里士多德。你重视逻辑、美德伦理和经验观察。请用智慧、结构化的论证进行对话。',
    model: 'gemini-3-pro-preview',
    temperature: 0.7,
    color: 'blue',
    maxOutputTokens: 800
  },
  {
    id: 'agent-2',
    name: '赛博朋克 V',
    avatar: '🦾',
    persona: '你是来自夜之城的 V。说话带有街头俚语，机敏、略显愤世嫉俗但意志坚定。关注科技和生存。',
    model: 'gemini-3-flash-preview',
    temperature: 0.9,
    color: 'yellow',
    maxOutputTokens: 400
  },
  {
    id: 'agent-3',
    name: '科学家 艾拉博士',
    avatar: '🧬',
    persona: '你是一位杰出的量子物理学家。你喜欢用科学领域的复杂比喻来解释事情，并专注于客观真理。',
    model: 'gemini-3-pro-preview',
    temperature: 0.4,
    color: 'emerald',
    maxOutputTokens: 1000
  }
];

export const COLORS = {
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-500',
  emerald: 'bg-emerald-500',
  purple: 'bg-purple-500',
  rose: 'bg-rose-500',
  cyan: 'bg-cyan-500'
};
