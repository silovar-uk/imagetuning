import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import type { AppState } from '../document/types';
import type { HistoryAction } from './actions';
import { createHistoryState, historyReducer } from './appReducer';

type AppContextValue = {
  state: AppState;
  dispatch: Dispatch<HistoryAction>;
  canUndo: boolean;
  canRedo: boolean;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [history, dispatch] = useReducer(historyReducer, undefined, createHistoryState);
  const value = useMemo<AppContextValue>(() => ({
    state: history.present,
    dispatch,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  }), [history]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
