// src/store/useStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 引入切片
import { createAgentSlice, AgentSlice } from './slices/createAgentSlice';
import { createSessionSlice, SessionSlice } from './slices/createSessionSlice';
import { createUISlice, UISlice } from './slices/createUISlice';

// 组合所有 Interface
export type AppState = AgentSlice & SessionSlice & UISlice;

export const useStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createAgentSlice(...a),
      ...createSessionSlice(...a),
      ...createUISlice(...a),
    }),
    {
      name: 'nexus_storage',
      storage: createJSONStorage(() => localStorage),
      
      // ★ 关键修改：partialize (持久化白名单/黑名单)
      // 我们不希望 'agents' 被持久化到 localStorage，
      // 因为每次刷新 App.tsx 都会从数据库拉取最新的 Agents。
      // 如果存了 localStorage，可能会导致本地旧数据覆盖了数据库新数据。
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
        activeMode: state.activeMode,
        uiState: { isDarkMode: state.uiState.isDarkMode } // 只存夜间模式偏好
      }),
    }
  )
);