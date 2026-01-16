// UI状态控制
import { StateCreator } from 'zustand';
import { AppState } from '../useStore';

export interface UISlice {
  uiState: {
    isDarkMode: boolean;
    showLeftSidebar: boolean;
    showRightPanel: boolean;
    rightPanelTab: 'config' | 'memory' | 'json';
  };
  toggleDarkMode: () => void;
  toggleLeftSidebar: (isOpen: boolean) => void;
  toggleRightPanel: (isOpen: boolean) => void;
  setRightPanelTab: (tab: 'config' | 'memory' | 'json') => void;
}

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set) => ({
  uiState: {
    isDarkMode: true,
    showLeftSidebar: false,
    showRightPanel: false,
    rightPanelTab: 'config',
  },
  toggleDarkMode: () => set((state) => ({ 
    uiState: { ...state.uiState, isDarkMode: !state.uiState.isDarkMode } 
  })),
  toggleLeftSidebar: (isOpen) => set((state) => ({
    uiState: { ...state.uiState, showLeftSidebar: isOpen }
  })),
  toggleRightPanel: (isOpen) => set((state) => ({
    uiState: { ...state.uiState, showRightPanel: isOpen }
  })),
  setRightPanelTab: (tab) => set((state) => ({
    uiState: { ...state.uiState, rightPanelTab: tab }
  })),
});