import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Game, Record, Goal, AppSettings } from './types';
import { generateId, getCurrentMonthPeriod, getCurrentYearPeriod } from './utils';

interface AppState {
  games: Game[];
  records: Record[];
  goals: Goal[];
  settings: AppSettings;
  theme: string;
  
  addGame: (game: Omit<Game, 'id' | 'createdAt'>) => void;
  updateGame: (id: string, game: Partial<Game>) => void;
  deleteGame: (id: string) => void;
  
  addRecord: (record: Omit<Record, 'id' | 'createdAt'>) => void;
  updateRecord: (id: string, record: Partial<Record>) => void;
  deleteRecord: (id: string) => void;
  
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  updateGoal: (id: string, goal: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  
  updateSettings: (settings: Partial<AppSettings>) => void;
  setTheme: (theme: string) => void;
  
  exportData: () => string;
  importData: (data: string) => boolean;
  resetAllData: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      games: [],
      records: [],
      goals: [],
      settings: {
        currency: 'CNY'
      },
      theme: 'default',
      
      addGame: (game) => set((state) => ({
        games: [...state.games, {
          ...game,
          id: generateId(),
          createdAt: new Date().toISOString()
        }]
      })),
      
      updateGame: (id, game) => set((state) => ({
        games: state.games.map((g) => g.id === id ? { ...g, ...game } : g)
      })),
      
      deleteGame: (id) => set((state) => ({
        games: state.games.filter((g) => g.id !== id),
        records: state.records.filter((r) => r.gameId !== id)
      })),
      
      addRecord: (record) => set((state) => ({
        records: [...state.records, {
          ...record,
          id: generateId(),
          createdAt: new Date().toISOString()
        }]
      })),
      
      updateRecord: (id, record) => set((state) => ({
        records: state.records.map((r) => r.id === id ? { ...r, ...record } : r)
      })),
      
      deleteRecord: (id) => set((state) => ({
        records: state.records.filter((r) => r.id !== id)
      })),
      
      addGoal: (goal) => set((state) => ({
        goals: [...state.goals, {
          ...goal,
          id: generateId(),
          createdAt: new Date().toISOString()
        }]
      })),
      
      updateGoal: (id, goal) => set((state) => ({
        goals: state.goals.map((g) => g.id === id ? { ...g, ...goal } : g)
      })),
      
      deleteGoal: (id) => set((state) => ({
        goals: state.goals.filter((g) => g.id !== id)
      })),
      
      updateSettings: (settings) => set((state) => ({
        settings: { ...state.settings, ...settings }
      })),
      
      setTheme: (theme) => set({ theme }),
      
      exportData: () => {
        const state = get();
        return JSON.stringify({
          games: state.games,
          records: state.records,
          goals: state.goals,
          settings: state.settings,
          theme: state.theme
        }, null, 2);
      },
      
      importData: (dataStr) => {
        try {
          const data = JSON.parse(dataStr);
          set({
            games: data.games || [],
            records: data.records || [],
            goals: data.goals || [],
            settings: data.settings || { currency: 'CNY' },
            theme: data.theme || 'default'
          });
          return true;
        } catch (e) {
          return false;
        }
      },
      
      resetAllData: () => set({
        games: [],
        records: [],
        goals: [],
        settings: { currency: 'CNY' },
        theme: 'default'
      })
    }),
    {
      name: 'money-tracker-store'
    }
  )
);
