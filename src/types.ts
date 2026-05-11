export interface Game {
  id: string;
  name: string;
  icon: string;
  color: string;
  tags: string[];
  description?: string;
  createdAt: string;
}

export interface Record {
  id: string;
  gameId: string;
  amount: number;
  type: 'income' | 'withdraw';
  date: string;
  note?: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  type: 'monthly' | 'yearly' | 'custom';
  amount: number;
  current: number;
  period: string;
  description?: string;
  createdAt: string;
}

export interface AppSettings {
  currency: 'CNY' | 'USD' | 'EUR';
}

export type ThemeName = 'default' | 'ocean' | 'sunset' | 'forest';

export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
  };
}
