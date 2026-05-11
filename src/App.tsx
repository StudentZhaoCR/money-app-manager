import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Home, Gamepad2, TrendingUp, Target, Settings } from 'lucide-react';
import { useStore } from './store';
import { formatCurrency, formatRelativeTime, getCurrentMonthPeriod, getCurrentYearPeriod, DEFAULT_GAME_ICONS, GAME_COLORS, DEFAULT_TAGS, CURRENCY_SYMBOLS } from './utils';

function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: '首页' },
    { path: '/games', icon: Gamepad2, label: '游戏' },
    { path: '/records', icon: TrendingUp, label: '记录' },
    { path: '/goals', icon: Target, label: '目标' },
    { path: '/settings', icon: Settings, label: '设置' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold gradient-text">🎮 赚钱小游戏记录</h1>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 pb-24">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 backdrop-blur-lg bg-white/90 border-t border-[var(--color-border)] z-50">
        <div className="max-w-4xl mx-auto px-2">
          <div className="flex justify-around items-center py-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center px-3 py-2 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white scale-105'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/50'
                  }`}
                >
                  <Icon size={20} className="mb-1" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const { games, records, goals, settings } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currencySymbol = CURRENCY_SYMBOLS[settings.currency as keyof typeof CURRENCY_SYMBOLS] || '¥';
  const currentMonth = getCurrentMonthPeriod();
  
  const totalIncome = records.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
  const monthlyIncome = records.filter(r => r.type === 'income' && r.date.startsWith(currentMonth)).reduce((sum, r) => sum + r.amount, 0);
  const today = new Date().toISOString().split('T')[0];
  const todayIncome = records.filter(r => r.type === 'income' && r.date === today).reduce((sum, r) => sum + r.amount, 0);
  const recentRecords = records.slice(0, 5);
  const currentGoal = goals.find(g => g.type === 'monthly' && g.period === currentMonth);

  const getGame = (gameId: string) => games.find(g => g.id === gameId);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="card-hover bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm opacity-90">总收益</span>
            <TrendingUp size={20} />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(totalIncome, currencySymbol)}</div>
        </div>
        
        <div className="card-hover bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm opacity-90">本月收益</span>
            <Settings size={20} />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(monthlyIncome, currencySymbol)}</div>
        </div>
        
        <div className="card-hover bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm opacity-90">今日收益</span>
            <TrendingUp size={20} />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(todayIncome, currencySymbol)}</div>
        </div>
        
        <div className="card-hover bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm opacity-90">活跃游戏</span>
            <Gamepad2 size={20} />
          </div>
          <div className="text-2xl font-bold">{games.length}</div>
        </div>
      </div>

      {currentGoal && (
        <div className="card-hover bg-[var(--color-surface)] rounded-2xl p-6 shadow-lg border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="text-[var(--color-accent)]" />
              <h3 className="font-bold text-[var(--color-text)]">本月目标</h3>
            </div>
            <button
              onClick={() => navigate('/goals')}
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              管理
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">{formatCurrency(currentGoal.current, currencySymbol)}</span>
              <span className="text-[var(--color-text-secondary)]">{formatCurrency(currentGoal.amount, currencySymbol)}</span>
            </div>
            
            <div className="h-4 bg-[var(--color-border)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] transition-all duration-500"
                style={{ width: `${Math.min(100, (currentGoal.current / currentGoal.amount) * 100)}%` }}
              />
            </div>
            
            <div className="text-center text-sm font-medium text-[var(--color-text-secondary)]">
              {Math.round((currentGoal.current / currentGoal.amount) * 100)}% 已完成
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <TrendingUp size={20} />
          记录收益
        </button>
        
        <button
          onClick={() => navigate('/games')}
          className="btn-secondary flex items-center justify-center gap-2"
        >
          <Gamepad2 size={20} />
          管理游戏
        </button>
      </div>

      {recentRecords.length > 0 && (
        <div className="card-hover bg-[var(--color-surface)] rounded-2xl p-6 shadow-lg border border-[var(--color-border)]">
          <h3 className="font-bold text-[var(--color-text)] mb-4">最近记录</h3>
          
          <div className="space-y-3">
            {recentRecords.map((record) => {
              const game = getGame(record.gameId);
              return (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-background)]/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: game?.color || '#8b5cf6' }}
                    >
                      {game?.icon || '🎮'}
                    </div>
                    <div>
                      <div className="font-medium text-[var(--color-text)]">{game?.name || '未知游戏'}</div>
                      <div className="text-sm text-[var(--color-text-secondary)]">{record.date}</div>
                    </div>
                  </div>
                  
                  <div
                    className={`font-bold ${
                      record.type === 'income'
                        ? 'text-[var(--color-success)]'
                        : 'text-[var(--color-error)]'
                    }`}
                  >
                    {record.type === 'income' ? '+' : '-'}{formatCurrency(record.amount, currencySymbol)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isModalOpen && (
        <AddRecordModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}

function AddRecordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { games, addRecord } = useStore();
  const [selectedGame, setSelectedGame] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'withdraw'>('income');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGame || !amount) return;
    
    addRecord({
      gameId: selectedGame,
      amount: parseFloat(amount),
      type,
      date,
      note: note || undefined
    });
    
    onClose();
    setSelectedGame('');
    setAmount('');
    setNote('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--color-surface)] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-xl font-bold text-[var(--color-text)]">记录收益</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--color-border)]/50 transition-colors"
          >
            <Settings size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">选择游戏</label>
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
              required
            >
              <option value="">请选择游戏...</option>
              {games.map((game) => (
                <option key={game.id} value={game.id}>{game.icon} {game.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">金额</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
              placeholder="请输入金额"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">类型</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setType('income')}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  type === 'income' ? 'bg-[var(--color-success)] text-white' : 'bg-[var(--color-border)]/50 text-[var(--color-text-secondary)]'
                }`}
              >
                收益
              </button>
              <button
                type="button"
                onClick={() => setType('withdraw')}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  type === 'withdraw' ? 'bg-[var(--color-error)] text-white' : 'bg-[var(--color-border)]/50 text-[var(--color-text-secondary)]'
                }`}
              >
                提现
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">备注</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
              placeholder="添加备注（可选）"
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GamesPage() {
  const { games, addGame, updateGame, deleteGame } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<string | null>(null);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold gradient-text">我的游戏</h2>
        <button
          onClick={() => {
            setEditingGame(null);
            setIsModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <TrendingUp size={20} />
          添加
        </button>
      </div>

      {games.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎮</div>
          <p className="text-[var(--color-text-secondary)]">还没有添加游戏</p>
          <p className="text-sm text-[var(--color-text-secondary)] opacity-70 mt-2">点击上方按钮添加你的第一个游戏</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {games.map((game) => (
            <div
              key={game.id}
              className="card-hover bg-[var(--color-surface)] rounded-2xl p-5 shadow-lg border border-[var(--color-border)]"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                    style={{ backgroundColor: game.color }}
                  >
                    {game.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[var(--color-text)]">{game.name}</h3>
                    {game.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {game.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingGame(game.id);
                      setIsModalOpen(true);
                    }}
                    className="p-2 rounded-xl hover:bg-[var(--color-border)]/50 transition-colors"
                  >
                    <Settings size={18} className="text-[var(--color-primary)]" />
                  </button>
                  <button
                    onClick={() => deleteGame(game.id)}
                    className="p-2 rounded-xl hover:bg-[var(--color-error)]/10 transition-colors"
                  >
                    <TrendingUp size={18} className="text-[var(--color-error)]" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <GameModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editingGame={editingGame}
        />
      )}
    </div>
  );
}

function GameModal({ isOpen, onClose, editingGame }: { isOpen: boolean; onClose: () => void; editingGame: string | null }) {
  const { games, addGame, updateGame } = useStore();
  const existingGame = editingGame ? games.find(g => g.id === editingGame) : undefined;
  
  const [name, setName] = useState(existingGame?.name || '');
  const [icon, setIcon] = useState(existingGame?.icon || DEFAULT_GAME_ICONS[0]);
  const [color, setColor] = useState(existingGame?.color || GAME_COLORS[0]);
  const [selectedTags, setSelectedTags] = useState<string[]>(existingGame?.tags || []);
  const [description, setDescription] = useState(existingGame?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const gameData = {
      name: name.trim(),
      icon,
      color,
      tags: selectedTags,
      description: description.trim() || undefined
    };
    
    if (existingGame) {
      updateGame(existingGame.id, gameData);
    } else {
      addGame(gameData);
    }
    
    onClose();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--color-surface)] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-xl font-bold text-[var(--color-text)]">{existingGame ? '编辑游戏' : '添加游戏'}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--color-border)]/50 transition-colors"
          >
            <Settings size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">游戏名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
              placeholder="输入游戏名称"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">选择图标</label>
            <div className="flex flex-wrap gap-3">
              {DEFAULT_GAME_ICONS.map((gameIcon) => (
                <button
                  key={gameIcon}
                  type="button"
                  onClick={() => setIcon(gameIcon)}
                  className={`w-12 h-12 rounded-xl text-2xl transition-all flex items-center justify-center ${
                    icon === gameIcon ? 'ring-2 ring-[var(--color-primary)] scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {gameIcon}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">选择颜色</label>
            <div className="flex flex-wrap gap-3">
              {GAME_COLORS.map((gameColor) => (
                <button
                  key={gameColor}
                  type="button"
                  onClick={() => setColor(gameColor)}
                  className={`w-10 h-10 rounded-full transition-all ${
                    color === gameColor ? 'ring-2 ring-[var(--color-text)] scale-110' : ''
                  }`}
                  style={{ backgroundColor: gameColor }}
                />
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">标签</label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedTags.includes(tag)
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-border)]/50 text-[var(--color-text-secondary)]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">备注</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
              placeholder="添加备注（可选）"
              rows={3}
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
            >
              {existingGame ? '保存' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordsPage() {
  const { records, games, deleteRecord, updateRecord, settings } = useStore();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<string | null>(null);

  const currencySymbol = CURRENCY_SYMBOLS[settings.currency as keyof typeof CURRENCY_SYMBOLS] || '¥';
  const getGame = (gameId: string) => games.find(g => g.id === gameId);

  const groupedRecords = records.reduce((acc, record) => {
    if (!acc[record.date]) {
      acc[record.date] = [];
    }
    acc[record.date].push(record);
    return acc;
  }, {} as Record<string, typeof records>);

  const sortedDates = Object.keys(groupedRecords).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-2xl font-bold gradient-text">收益记录</h2>

      {records.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-[var(--color-text-secondary)]">还没有记录</p>
          <p className="text-sm text-[var(--color-text-secondary)] opacity-70 mt-2">去首页添加你的第一笔记录</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">{date}</h3>
              <div className="space-y-3">
                {groupedRecords[date].map((record) => {
                  const game = getGame(record.gameId);
                  return (
                    <div
                      key={record.id}
                      className="card-hover bg-[var(--color-surface)] rounded-2xl p-4 shadow-lg border border-[var(--color-border)]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                            style={{ backgroundColor: game?.color || '#8b5cf6' }}
                          >
                            {record.type === 'income' ? <TrendingUp size={20} color="white" /> : <TrendingUp size={20} color="white" />}
                          </div>
                          <div>
                            <div className="font-medium text-[var(--color-text)]">{game?.name || '未知游戏'}</div>
                            {record.note && <div className="text-sm text-[var(--color-text-secondary)]">{record.note}</div>}
                            <div className="text-xs text-[var(--color-text-secondary)] opacity-70">{formatRelativeTime(record.createdAt)}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div
                            className={`font-bold text-lg ${
                              record.type === 'income'
                                ? 'text-[var(--color-success)]'
                                : 'text-[var(--color-error)]'
                            }`}
                          >
                            {record.type === 'income' ? '+' : '-'}{formatCurrency(record.amount, currencySymbol)}
                          </div>
                          
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingRecord(record.id);
                                setIsEditModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-[var(--color-border)]/50 transition-colors"
                            >
                              <Settings size={16} className="text-[var(--color-primary)]" />
                            </button>
                            <button
                              onClick={() => deleteRecord(record.id)}
                              className="p-1.5 rounded-lg hover:bg-[var(--color-error)]/10 transition-colors"
                            >
                              <TrendingUp size={16} className="text-[var(--color-error)]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {editingRecord && (
        <EditRecordModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingRecord(null);
          }}
          recordId={editingRecord}
        />
      )}
    </div>
  );
}

function EditRecordModal({ isOpen, onClose, recordId }: { isOpen: boolean; onClose: () => void; recordId: string }) {
  const { records, updateRecord } = useStore();
  const record = records.find(r => r.id === recordId);
  
  const [amount, setAmount] = useState(record?.amount.toString() || '');
  const [type, setType] = useState<'income' | 'withdraw'>(record?.type || 'income');
  const [date, setDate] = useState(record?.date || new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState(record?.note || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    
    updateRecord(recordId, {
      amount: parseFloat(amount),
      type,
      date,
      note: note || undefined
    });
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--color-surface)] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-xl font-bold text-[var(--color-text)]">编辑记录</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--color-border)]/50 transition-colors"
          >
            <Settings size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">金额</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">类型</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setType('income')}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  type === 'income' ? 'bg-[var(--color-success)] text-white' : 'bg-[var(--color-border)]/50 text-[var(--color-text-secondary)]'
                }`}
              >
                收益
              </button>
              <button
                type="button"
                onClick={() => setType('withdraw')}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  type === 'withdraw' ? 'bg-[var(--color-error)] text-white' : 'bg-[var(--color-border)]/50 text-[var(--color-text-secondary)]'
                }`}
              >
                提现
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">备注</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
              placeholder="添加备注（可选）"
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GoalsPage() {
  const { goals, addGoal, deleteGoal, records, settings } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currencySymbol = CURRENCY_SYMBOLS[settings.currency as keyof typeof CURRENCY_SYMBOLS] || '¥';

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold gradient-text">目标管理</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <TrendingUp size={20} />
          添加
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-12">
          <Target size={64} className="mx-auto mb-4 text-[var(--color-text-secondary)] opacity-50" />
          <p className="text-[var(--color-text-secondary)]">还没有设置目标</p>
          <p className="text-sm text-[var(--color-text-secondary)] opacity-70 mt-2">点击上方按钮添加你的第一个目标</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const progress = Math.min(100, (goal.current / goal.amount) * 100);
            const isCompleted = goal.current >= goal.amount;
            
            return (
              <div
                key={goal.id}
                className={`card-hover bg-[var(--color-surface)] rounded-2xl p-5 shadow-lg border border-[var(--color-border)] ${
                  isCompleted ? 'ring-2 ring-[var(--color-success)]' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-[var(--color-text)]">{goal.description || '目标'}</h3>
                      {isCompleted && <span className="text-[var(--color-warning)]">🏆</span>}
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {goal.type === 'monthly' ? '月度目标' : goal.type === 'yearly' ? '年度目标' : '自定义目标'}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="p-2 rounded-xl hover:bg-[var(--color-error)]/10 transition-colors"
                  >
                    <TrendingUp size={18} className="text-[var(--color-error)]" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)]">已完成: {formatCurrency(goal.current, currencySymbol)}</span>
                    <span className="text-[var(--color-text-secondary)]">目标: {formatCurrency(goal.amount, currencySymbol)}</span>
                  </div>
                  
                  <div className="h-4 bg-[var(--color-border)] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isCompleted ? 'bg-[var(--color-success)]' : 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  
                  <div className="text-center text-sm font-medium text-[var(--color-text-secondary)]">
                    {progress.toFixed(1)}% 已完成
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <GoalModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}

function GoalModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { addGoal, records } = useStore();
  const [type, setType] = useState<'monthly' | 'yearly' | 'custom'>('monthly');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const getCurrentProgress = () => {
    if (type === 'monthly') {
      const currentMonth = getCurrentMonthPeriod();
      return records.filter(r => r.type === 'income' && r.date.startsWith(currentMonth)).reduce((sum, r) => sum + r.amount, 0);
    } else if (type === 'yearly') {
      const currentYear = getCurrentYearPeriod();
      return records.filter(r => r.type === 'income' && r.date.startsWith(currentYear)).reduce((sum, r) => sum + r.amount, 0);
    }
    return 0;
  };

  const getPeriod = () => {
    if (type === 'monthly') return getCurrentMonthPeriod();
    if (type === 'yearly') return getCurrentYearPeriod();
    return 'custom';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    
    addGoal({
      type,
      amount: parseFloat(amount),
      current: getCurrentProgress(),
      period: getPeriod(),
      description: description.trim() || undefined
    });
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--color-surface)] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-xl font-bold text-[var(--color-text)]">添加目标</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--color-border)]/50 transition-colors"
          >
            <Settings size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">目标类型</label>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setType('monthly')}
                className={`p-3 rounded-xl text-left transition-all ${
                  type === 'monthly'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-border)]/50 text-[var(--color-text-secondary)]'
                }`}
              >
                月度目标
              </button>
              <button
                type="button"
                onClick={() => setType('yearly')}
                className={`p-3 rounded-xl text-left transition-all ${
                  type === 'yearly'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-border)]/50 text-[var(--color-text-secondary)]'
                }`}
              >
                年度目标
              </button>
              <button
                type="button"
                onClick={() => setType('custom')}
                className={`p-3 rounded-xl text-left transition-all ${
                  type === 'custom'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-border)]/50 text-[var(--color-text-secondary)]'
                }`}
              >
                自定义目标
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">目标金额</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
              placeholder="输入目标金额"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">目标描述</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
              placeholder="添加描述（可选）"
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
            >
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SettingsPage() {
  const { theme, setTheme, settings, updateSettings, exportData, importData, resetAllData } = useStore();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [importJson, setImportJson] = useState('');

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `money-tracker-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const success = importData(importJson);
    if (success) {
      setIsImportModalOpen(false);
      setImportJson('');
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-2xl font-bold gradient-text">设置</h2>
      
      <div className="card-hover bg-[var(--color-surface)] rounded-2xl p-5 shadow-lg border border-[var(--color-border)]">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="text-[var(--color-primary)]" />
          <h3 className="font-bold text-lg text-[var(--color-text)]">主题设置</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {['default', 'ocean', 'sunset', 'forest'].map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`p-4 rounded-xl text-left transition-all ${
                theme === t ? 'ring-2 ring-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'hover:bg-[var(--color-border)]/50'
              }`}
            >
              <div className="font-medium text-[var(--color-text)]">{t}</div>
            </button>
          ))}
        </div>
      </div>
      
      <div className="card-hover bg-[var(--color-surface)] rounded-2xl p-5 shadow-lg border border-[var(--color-border)]">
        <h3 className="font-bold text-lg text-[var(--color-text)] mb-4">货币设置</h3>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">货币</label>
          <select
            value={settings.currency}
            onChange={(e) => updateSettings({ currency: e.target.value as any })}
            className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
          >
            <option value="CNY">人民币 (¥)</option>
            <option value="USD">美元 ($)</option>
            <option value="EUR">欧元 (€)</option>
          </select>
        </div>
      </div>
      
      <div className="card-hover bg-[var(--color-surface)] rounded-2xl p-5 shadow-lg border border-[var(--color-border)]">
        <h3 className="font-bold text-lg text-[var(--color-text)] mb-4">数据管理</h3>
        
        <div className="space-y-3">
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
          >
            <Settings size={20} />
            导出数据
          </button>
          
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
          >
            <Settings size={20} />
            导入数据
          </button>
          
          <button
            onClick={() => setIsResetModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[var(--color-error)] text-white hover:opacity-90 transition-opacity"
          >
            <Settings size={20} />
            重置数据
          </button>
        </div>
      </div>

      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsImportModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-[var(--color-surface)] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-xl font-bold text-[var(--color-text)]">导入数据</h2>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-2 rounded-full hover:bg-[var(--color-border)]/50 transition-colors"
              >
                <Settings size={20} />
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">粘贴 JSON 数据</label>
                <textarea
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                  rows={8}
                  placeholder="在此粘贴导出的 JSON 数据..."
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="flex-1 btn-secondary"
                >
                  取消
                </button>
                <button
                  onClick={handleImport}
                  className="flex-1 btn-primary"
                >
                  导入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsResetModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-[var(--color-surface)] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-xl font-bold text-[var(--color-text)]">确认重置</h2>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="p-2 rounded-full hover:bg-[var(--color-border)]/50 transition-colors"
              >
                <Settings size={20} />
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <p className="text-[var(--color-text)]">确定要重置所有数据吗？此操作无法撤销！</p>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 btn-secondary"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    resetAllData();
                    setIsResetModalOpen(false);
                  }}
                  className="flex-1 btn-primary"
                  style={{ background: 'var(--color-error)' }}
                >
                  确认重置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
