export const DEFAULT_GAME_ICONS = ['🎮', '🎯', '🎲', '🎪', '🎭', '🎨', '🎵', '🎬', '🏆', '⭐'];

export const GAME_COLORS = [
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#3b82f6',
  '#ef4444',
  '#14b8a6',
  '#f97316',
  '#6366f1'
];

export const DEFAULT_TAGS = ['热门', '推荐', '新人', '红包', '红包版', '赚钱'];

export const CURRENCY_SYMBOLS = {
  CNY: '¥',
  USD: '$',
  EUR: '€'
};

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function formatCurrency(amount: number, symbol: string = '¥'): string {
  return `${symbol}${amount.toFixed(2)}`;
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return formatDate(date);
}

export function getCurrentMonthPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getCurrentYearPeriod(): string {
  return new Date().getFullYear().toString();
}
