// 赚钱软件管理系统 - 主应用逻辑
const DATA_KEY = 'moneyAppData';

// 数据管理类
class DataManager {
    static loadData() {
        const savedData = localStorage.getItem(DATA_KEY);
        if (savedData) {
            return JSON.parse(savedData);
        }
        return {
            phones: [],
            settings: {
                yearlyGoal: 10000
            }
        };
    }

    static saveData(data) {
        localStorage.setItem(DATA_KEY, JSON.stringify(data));
    }

    static calculateYearlyGoal() {
        const data = this.loadData();
        const allApps = data.phones.flatMap(phone => phone.apps);
        const yearlyGoal = allApps.reduce((total, app) => {
            return total + (app.minWithdraw * 365);
        }, 0);
        data.settings.yearlyGoal = yearlyGoal;
        this.saveData(data);
        return yearlyGoal;
    }

    static addPhone(name) {
        const data = this.loadData();
        const phone = {
            id: Date.now().toString(),
            name,
            apps: []
        };
        data.phones.push(phone);
        this.saveData(data);
        return data;
    }

    static addApp(phoneId, appData) {
        const data = this.loadData();
        const phone = data.phones.find(p => p.id === phoneId);
        if (phone) {
            const app = {
                id: Date.now().toString(),
                name: appData.name,
                minWithdraw: parseFloat(appData.minWithdraw),
                balance: parseFloat(appData.balance) || 0,
                earned: parseFloat(appData.balance) || 0,
                withdrawn: 0,
                remainingWithdrawn: 0,
                historicalWithdrawn: 0,
                expenses: [],
                withdrawals: [],
                lastUpdated: new Date().toISOString()
            };
            phone.apps.push(app);
            this.saveData(data);
            this.calculateYearlyGoal();
        }
        return data;
    }

    static editApp(phoneId, appId, appData) {
        const data = this.loadData();
        const phone = data.phones.find(p => p.id === phoneId);
        if (phone) {
            const app = phone.apps.find(a => a.id === appId);
            if (app) {
                app.name = appData.name;
                app.minWithdraw = parseFloat(appData.minWithdraw);
                
                const oldBalance = app.balance;
                const newBalance = parseFloat(appData.balance) || 0;
                
                if (newBalance > oldBalance) {
                    app.earned = (app.earned || 0) + (newBalance - oldBalance);
                } else if (newBalance === 0 && oldBalance > 0) {
                    app.earned = Math.max(0, (app.earned || 0) - oldBalance);
                }
                
                app.balance = newBalance;
                app.historicalWithdrawn = appData.historicalWithdrawn || 0;
                app.lastUpdated = new Date().toISOString();
                
                this.saveData(data);
                this.calculateYearlyGoal();
            }
        }
        return data;
    }

    static withdraw(phoneId, appId, amount) {
        const data = this.loadData();
        const phone = data.phones.find(p => p.id === phoneId);
        if (phone) {
            const app = phone.apps.find(a => a.id === appId);
            if (app && app.balance >= amount) {
                app.balance -= amount;
                app.withdrawn = (app.withdrawn || 0) + amount;
                app.remainingWithdrawn = (app.remainingWithdrawn || 0) + amount;
                app.lastUpdated = new Date().toISOString();
                
                if (!app.withdrawals) {
                    app.withdrawals = [];
                }
                
                const now = new Date();
                const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                
                app.withdrawals.push({
                    id: Date.now().toString(),
                    amount: amount,
                    date: dateStr,
                    created: now.toISOString()
                });
                
                this.saveData(data);
            }
        }
        return data;
    }

    static addExpense(phoneId, appId, expenseData) {
        const data = this.loadData();
        const phone = data.phones.find(p => p.id === phoneId);
        if (phone) {
            const app = phone.apps.find(a => a.id === appId);
            if (app) {
                const expense = {
                    id: Date.now().toString(),
                    amount: parseFloat(expenseData.amount),
                    purpose: expenseData.purpose,
                    date: expenseData.date,
                    created: new Date().toISOString()
                };
                
                if (!app.expenses) {
                    app.expenses = [];
                }
                app.expenses.push(expense);
                app.remainingWithdrawn = parseFloat((app.remainingWithdrawn - expenseData.amount).toFixed(2));
                app.lastUpdated = new Date().toISOString();
                
                this.saveData(data);
            }
        }
        return data;
    }

    static deleteApp(phoneId, appId) {
        const data = this.loadData();
        const phone = data.phones.find(p => p.id === phoneId);
        if (phone) {
            phone.apps = phone.apps.filter(a => a.id !== appId);
            this.saveData(data);
            this.calculateYearlyGoal();
        }
        return data;
    }

    static clearAllData() {
        localStorage.removeItem(DATA_KEY);
        localStorage.removeItem('expandedPhones');
    }
}

// 全局状态
let currentPhoneId = null;
let currentAppId = null;
let expandedPhones = {};

// 初始化
function init() {
    // 加载展开状态
    const savedExpanded = localStorage.getItem('expandedPhones');
    if (savedExpanded) {
        expandedPhones = JSON.parse(savedExpanded);
    }
    
    // 设置默认日期
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    document.getElementById('target-date').value = dateStr;
    document.getElementById('expense-date').value = dateStr;
    
    // 初始化所有页面
    updateAllDates();
    renderDashboard();
    renderPhones();
    renderStats();
    renderSettings();
}

// 更新所有页面的日期
function updateAllDates() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekday = weekdays[now.getDay()];
    const dateStr = `${year}年${month}月${day}日 ${weekday}`;
    
    document.getElementById('current-date').textContent = dateStr;
    document.getElementById('phones-current-date').textContent = dateStr;
    document.getElementById('stats-current-date').textContent = dateStr;
    document.getElementById('forecast-current-date').textContent = dateStr;
    document.getElementById('settings-current-date').textContent = dateStr;
}

// 页面切换
function showPage(pageName) {
    // 先刷新页面数据，再显示页面，避免内容加载导致的弹跳
    if (pageName === 'dashboard') renderDashboard();
    if (pageName === 'phones') renderPhones();
    if (pageName === 'stats') renderStats();
    if (pageName === 'settings') renderSettings();
    if (pageName === 'withdraw-records') renderWithdrawRecords();
    if (pageName === 'expense-records') renderExpenseRecords();
    
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // 显示目标页面
    document.getElementById(`page-${pageName}`).classList.add('active');
    
    // 更新底部导航
    document.querySelectorAll('.tab-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });
}

// 渲染仪表盘
function renderDashboard() {
    DataManager.calculateYearlyGoal();
    const data = DataManager.loadData();
    
    // 统计数据
    const totalPhones = data.phones.length;
    const totalApps = data.phones.reduce((sum, phone) => sum + phone.apps.length, 0);
    const totalBalance = data.phones.reduce((sum, phone) => {
        return sum + phone.apps.reduce((appSum, app) => appSum + (app.balance || 0), 0);
    }, 0);
    const totalEarned = data.phones.reduce((sum, phone) => {
        return sum + phone.apps.reduce((appSum, app) => appSum + (app.earned || 0), 0);
    }, 0);
    const readyApps = data.phones.reduce((sum, phone) => {
        return sum + phone.apps.filter(app => (app.balance || 0) >= (app.minWithdraw || 0)).length;
    }, 0);
    
    // 全年目标进度
    const yearlyGoal = data.settings.yearlyGoal || 10000;
    const yearlyProgress = yearlyGoal > 0 ? Math.min((totalEarned / yearlyGoal) * 100, 100) : 0;
    
    // 更新DOM
    document.getElementById('total-phones').textContent = totalPhones;
    document.getElementById('total-apps').textContent = totalApps;
    document.getElementById('total-balance').textContent = `¥${totalBalance.toFixed(2)}`;
    document.getElementById('ready-apps').textContent = readyApps;
    document.getElementById('yearly-progress').textContent = `${yearlyProgress.toFixed(0)}%`;
    document.getElementById('yearly-progress-bar').style.width = `${yearlyProgress}%`;
    
    // 渲染今日需要关注的软件
    renderTodayApps(data);
}

// 渲染今日需要关注的软件
function renderTodayApps(data) {
    const now = new Date();
    const startDate = new Date('2026-01-01');
    const daysFromStart = Math.floor((now - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    let todayApps = [];
    
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            const minWithdraw = Number(app.minWithdraw) || 0;
            const balance = Number(app.balance) || 0;
            const earned = Number(app.earned) || balance;
            const shouldHaveEarned = daysFromStart * minWithdraw;
            
            if (earned < shouldHaveEarned) {
                todayApps.push({
                    ...app,
                    phoneName: phone.name,
                    daysFromStart,
                    shouldHaveEarned,
                    earned,
                    remaining: shouldHaveEarned - earned
                });
            }
        });
    });
    
    todayApps.sort((a, b) => a.remaining - b.remaining);
    
    const container = document.getElementById('today-apps-list');
    if (todayApps.length === 0) {
        container.innerHTML = '<div class="empty-state">今天没有需要关注的软件</div>';
        return;
    }
    
    container.innerHTML = todayApps.map(app => `
        <div class="app-item">
            <div class="app-header">
                <span class="app-name">${app.phoneName} - ${app.name}</span>
            </div>
            <div class="app-info">
                <span>最小提现: ¥${app.minWithdraw.toFixed(2)}</span>
                <span>当前余额: ¥${app.balance.toFixed(2)}</span>
            </div>
            <div class="app-info">
                <span>已赚金额: ¥${app.earned.toFixed(2)}</span>
                <span>截止今天应赚: ¥${app.shouldHaveEarned.toFixed(2)}</span>
            </div>
            <div class="app-info">
                <span>还需赚取: ¥${app.remaining.toFixed(2)}</span>
            </div>
            <div class="app-status">
                <span class="status-tag ${app.balance >= app.minWithdraw ? 'ready' : 'pending'}">
                    ${app.balance >= app.minWithdraw ? '可提现' : '待赚取'}
                </span>
                <span class="status-tag warning">需关注</span>
            </div>
        </div>
    `).join('');
}

// 渲染手机管理页面
function renderPhones() {
    const data = DataManager.loadData();
    const container = document.getElementById('phone-grid');
    
    if (data.phones.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无手机，请添加手机</div>';
        return;
    }
    
    // 确保所有手机都有展开状态
    data.phones.forEach(phone => {
        if (expandedPhones[phone.id] === undefined) {
            expandedPhones[phone.id] = true;
        }
    });
    
    container.innerHTML = data.phones.map((phone, index) => {
        const isExpanded = expandedPhones[phone.id];
        
        // 计算该手机的总赚取金额
        const totalEarned = phone.apps.reduce((sum, app) => {
            return sum + (app.earned || app.balance || 0);
        }, 0);
        
        // 计算该手机的总余额
        const totalBalance = phone.apps.reduce((sum, app) => {
            return sum + (app.balance || 0);
        }, 0);
        
        return `
            <div class="phone-card" data-phone-id="${phone.id}" data-index="${index}">
                <div class="phone-header">
                    <div class="phone-header-left">
                        <div class="phone-name-container">
                            <span class="phone-name" onclick="editPhoneName('${phone.id}')">${phone.name}</span>
                            <div class="phone-stats">
                                <span class="phone-stat-item">💰 总赚取: ¥${totalEarned.toFixed(2)}</span>
                                <span class="phone-stat-item">💳 总余额: ¥${totalBalance.toFixed(2)}</span>
                            </div>
                        </div>
                        <button class="btn btn-secondary" onclick="openAddAppModal('${phone.id}')">添加软件</button>
                    </div>
                    <div class="phone-header-right">
                        <button class="btn btn-icon" onclick="togglePhoneExpand('${phone.id}')">
                            ${isExpanded ? '▼' : '▶'}
                        </button>
                    </div>
                </div>
                ${isExpanded ? renderAppList(phone) : `<div class="collapsed-hint">点击展开查看 ${phone.apps.length} 个软件</div>`}
            </div>
        `;
    }).join('');
}

// 渲染软件列表
function renderAppList(phone) {
    if (phone.apps.length === 0) {
        return `
            <div class="empty-state">
                <div>暂无软件</div>
                <button class="btn btn-secondary mt-4" onclick="openAddAppModal('${phone.id}')">点击添加软件</button>
            </div>
        `;
    }
    
    const now = new Date();
    const startDate = new Date('2026-01-01');
    const daysFromStart = Math.floor((now - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    return phone.apps.map(app => {
        const shouldHaveEarned = daysFromStart * app.minWithdraw;
        const earned = app.earned || app.balance || 0;
        const daysIncome = Math.floor(earned / app.minWithdraw);
        const nextPlayDate = calculateNextPlayDate(earned, app.minWithdraw);
        const progressPercentage = shouldHaveEarned > 0 ? Math.min(100, Math.round((earned / shouldHaveEarned) * 100)) : 0;
        
        return `
            <div class="app-card">
                <div class="app-header">
                    <span class="app-name">${app.name}</span>
                    <span class="status-tag ${app.balance >= app.minWithdraw ? 'ready' : 'pending'}">
                        ${app.balance >= app.minWithdraw ? '可提现' : '待赚取'}
                    </span>
                </div>
                <div class="app-core-info">
                    <span class="core-label">当前余额:</span>
                    <span class="core-value">¥${(app.balance || 0).toFixed(2)}</span>
                </div>
                <div class="app-info-row">
                    <span>最小提现: ¥${(app.minWithdraw || 0).toFixed(2)}</span>
                    <span>已赚金额: ¥${earned.toFixed(2)}</span>
                </div>
                <div class="progress-section">
                    <div class="progress-header">
                        <span class="progress-label">任务进度</span>
                        <span class="progress-percentage">${progressPercentage}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                    </div>
                </div>
                <div class="app-info-row">
                    <span>截止今天应赚: ¥${shouldHaveEarned.toFixed(2)}</span>
                </div>
                <div class="app-info-row">
                    <span>相当于 ${daysIncome} 天的收入</span>
                    <span>下次玩: ${nextPlayDate}</span>
                </div>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="openWithdrawModal('${phone.id}', '${app.id}')">提现</button>
                    <button class="btn btn-secondary" onclick="openEditAppModal('${phone.id}', '${app.id}')">编辑</button>
                    <button class="btn btn-error" onclick="deleteApp('${phone.id}', '${app.id}')">删除</button>
                </div>
            </div>
        `;
    }).join('');
}

// 计算下次玩的日期
function calculateNextPlayDate(earned, minWithdraw) {
    const startDate = new Date('2026-01-01');
    const daysEarned = Math.floor(earned / minWithdraw);
    const targetDate = new Date(startDate);
    targetDate.setDate(targetDate.getDate() + daysEarned);
    return `${targetDate.getMonth() + 1}.${targetDate.getDate()}`;
}

// 切换手机展开/折叠
function togglePhoneExpand(phoneId) {
    expandedPhones[phoneId] = !expandedPhones[phoneId];
    localStorage.setItem('expandedPhones', JSON.stringify(expandedPhones));
    renderPhones();
}

// 编辑手机名称
function editPhoneName(phoneId) {
    const data = DataManager.loadData();
    const phone = data.phones.find(p => p.id === phoneId);
    if (!phone) return;
    
    showModal('编辑手机名称', `
        <div class="form-group">
            <label class="form-label">手机名称</label>
            <input type="text" id="edit-phone-name" class="form-input" value="${phone.name}">
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { 
            text: '保存', 
            class: 'btn-primary', 
            action: () => {
                const newName = document.getElementById('edit-phone-name').value.trim();
                if (newName) {
                    phone.name = newName;
                    DataManager.saveData(data);
                    renderPhones();
                    showToast('手机名称已更新！');
                }
                closeModal();
            }
        }
    ]);
}

// 打开添加手机模态框
function openAddPhoneModal() {
    showModal('添加手机', `
        <div class="form-group">
            <label class="form-label">手机名称</label>
            <input type="text" id="new-phone-name" class="form-input" placeholder="输入手机名称">
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { 
            text: '添加', 
            class: 'btn-primary', 
            action: () => {
                const name = document.getElementById('new-phone-name').value.trim();
                if (name) {
                    DataManager.addPhone(name);
                    renderPhones();
                    showToast('手机添加成功！');
                }
                closeModal();
            }
        }
    ]);
}

// 打开添加软件模态框
function openAddAppModal(phoneId) {
    currentPhoneId = phoneId;
    showModal('添加软件', `
        <div class="form-group">
            <label class="form-label">软件名称</label>
            <input type="text" id="app-name" class="form-input" placeholder="输入软件名称">
        </div>
        <div class="form-group">
            <label class="form-label">最小提现额度 (元)</label>
            <input type="number" id="app-min-withdraw" class="form-input" placeholder="输入最小提现额度" step="0.01">
        </div>
        <div class="form-group">
            <label class="form-label">当前余额 (元)</label>
            <input type="number" id="app-balance" class="form-input" placeholder="输入当前余额" step="0.01">
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { 
            text: '添加', 
            class: 'btn-primary', 
            action: () => {
                const name = document.getElementById('app-name').value.trim();
                const minWithdraw = document.getElementById('app-min-withdraw').value;
                const balance = document.getElementById('app-balance').value;
                
                if (name && minWithdraw) {
                    DataManager.addApp(phoneId, { name, minWithdraw, balance });
                    renderPhones();
                    showToast('软件添加成功！');
                }
                closeModal();
            }
        }
    ]);
}

// 打开编辑软件模态框
function openEditAppModal(phoneId, appId) {
    currentPhoneId = phoneId;
    currentAppId = appId;
    
    const data = DataManager.loadData();
    const phone = data.phones.find(p => p.id === phoneId);
    const app = phone ? phone.apps.find(a => a.id === appId) : null;
    
    if (!app) return;
    
    showModal('编辑软件', `
        <div class="form-group">
            <label class="form-label">软件名称</label>
            <input type="text" id="edit-app-name" class="form-input" value="${app.name}">
        </div>
        <div class="form-group">
            <label class="form-label">最小提现额度 (元)</label>
            <input type="number" id="edit-app-min-withdraw" class="form-input" value="${app.minWithdraw}" step="0.01">
        </div>
        <div class="form-group">
            <label class="form-label">当前余额 (元)</label>
            <input type="number" id="edit-app-balance" class="form-input" value="${app.balance}" step="0.01">
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { 
            text: '保存', 
            class: 'btn-primary', 
            action: () => {
                const name = document.getElementById('edit-app-name').value.trim();
                const minWithdraw = document.getElementById('edit-app-min-withdraw').value;
                const balance = document.getElementById('edit-app-balance').value;
                
                if (name && minWithdraw) {
                    DataManager.editApp(phoneId, appId, { 
                        name, 
                        minWithdraw, 
                        balance,
                        historicalWithdrawn: app.historicalWithdrawn || 0
                    });
                    renderPhones();
                    showToast('软件已更新！');
                }
                closeModal();
            }
        }
    ]);
}

// 打开提现模态框
function openWithdrawModal(phoneId, appId) {
    currentPhoneId = phoneId;
    currentAppId = appId;
    
    const data = DataManager.loadData();
    const phone = data.phones.find(p => p.id === phoneId);
    const app = phone ? phone.apps.find(a => a.id === appId) : null;
    
    if (!app) return;
    
    showModal('提现操作', `
        <div class="form-group">
            <label class="form-label">软件名称</label>
            <input type="text" class="form-input" value="${app.name}" disabled>
        </div>
        <div class="form-group">
            <label class="form-label">当前余额 (元)</label>
            <input type="text" class="form-input" value="${app.balance.toFixed(2)}" disabled>
        </div>
        <div class="form-group">
            <label class="form-label">提现金额 (元)</label>
            <input type="number" id="withdraw-amount" class="form-input" placeholder="输入提现金额" step="0.01">
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { 
            text: '确认提现', 
            class: 'btn-primary', 
            action: () => {
                const amount = parseFloat(document.getElementById('withdraw-amount').value);
                if (amount > 0 && amount <= app.balance) {
                    DataManager.withdraw(phoneId, appId, amount);
                    renderPhones();
                    showToast('提现成功！');
                } else {
                    showToast('提现金额无效！');
                }
                closeModal();
            }
        }
    ]);
}

// 删除软件
function deleteApp(phoneId, appId) {
    if (confirm('确定要删除这个软件吗？')) {
        DataManager.deleteApp(phoneId, appId);
        renderPhones();
        showToast('软件已删除！');
    }
}

// 渲染统计分析页面
function renderStats() {
    const data = DataManager.loadData();
    
    const allAppsWithPhone = [];
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            allAppsWithPhone.push({ ...app, phoneName: phone.name });
        });
    });
    
    const totalEarned = allAppsWithPhone.reduce((sum, app) => sum + (app.earned || app.balance), 0);
    const totalWithdrawn = allAppsWithPhone.reduce((sum, app) => {
        return sum + (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
    }, 0);
    const totalExpenses = allAppsWithPhone.reduce((sum, app) => {
        if (app.expenses && app.expenses.length > 0) {
            return sum + app.expenses.reduce((expenseSum, expense) => expenseSum + expense.amount, 0);
        }
        return sum;
    }, 0);
    const totalBalance = allAppsWithPhone.reduce((sum, app) => sum + app.balance, 0);
    
    const withdrawRate = totalEarned > 0 ? (totalWithdrawn / totalEarned) * 100 : 0;
    const expenseRate = totalWithdrawn > 0 ? (totalExpenses / totalWithdrawn) * 100 : 0;
    
    document.getElementById('stats-total-earned').textContent = `¥${totalEarned.toFixed(2)}`;
    document.getElementById('stats-total-withdrawn').textContent = `¥${totalWithdrawn.toFixed(2)}`;
    document.getElementById('stats-total-expenses').textContent = `¥${totalExpenses.toFixed(2)}`;
    document.getElementById('stats-total-balance').textContent = `¥${totalBalance.toFixed(2)}`;
    document.getElementById('stats-withdraw-rate').textContent = `${withdrawRate.toFixed(2)}%`;
    document.getElementById('stats-expense-rate').textContent = `${expenseRate.toFixed(2)}%`;
    
    // 渲染各软件提现情况
    const container = document.getElementById('app-withdraw-list');
    if (allAppsWithPhone.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无软件数据</div>';
        return;
    }
    
    container.innerHTML = allAppsWithPhone.map(app => {
        const earned = app.earned || app.balance;
        const withdrawn = (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
        const expenses = app.expenses && app.expenses.length > 0 ? 
            app.expenses.reduce((sum, expense) => sum + expense.amount, 0) : 0;
        const appWithdrawRate = earned > 0 ? (withdrawn / earned) * 100 : 0;
        
        return `
            <div class="app-item">
                <div class="app-header">
                    <span class="app-name">${app.phoneName} - ${app.name}</span>
                    <div class="app-status">
                        <span class="status-tag ${app.balance >= app.minWithdraw ? 'ready' : 'pending'}">
                            ${app.balance >= app.minWithdraw ? '可提现' : '待达标'}
                        </span>
                        <span class="min-withdraw">最小提现: ¥${app.minWithdraw.toFixed(2)}</span>
                    </div>
                </div>
                <div class="app-stats">
                    <div class="stat-item">
                        <span class="stat-label">已赚金额</span>
                        <span class="stat-value">¥${earned.toFixed(2)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">提现金额</span>
                        <span class="stat-value">¥${withdrawn.toFixed(2)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">剩余余额</span>
                        <span class="stat-value">¥${app.balance.toFixed(2)}</span>
                    </div>
                </div>
                <div class="app-progress">
                    <div class="progress-header">
                        <span>提现进度</span>
                        <span class="progress-value">${appWithdrawRate.toFixed(2)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(appWithdrawRate, 100)}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 计算提前预测
function calculateForecast() {
    const targetDateStr = document.getElementById('target-date').value;
    
    if (!targetDateStr) {
        showToast('请选择目标日期');
        return;
    }
    
    const startDate = new Date('2026-01-01');
    const targetDate = new Date(targetDateStr);
    
    if (targetDate < startDate) {
        showToast('目标日期不能早于2026年1月1日');
        return;
    }
    
    const daysFromStart = Math.ceil((targetDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    const data = DataManager.loadData();
    const forecastData = [];
    let totalNeeded = 0;
    
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            const totalShouldEarn = daysFromStart * app.minWithdraw;
            const currentEarned = app.earned || app.balance;
            const daysEarned = Math.floor(currentEarned / app.minWithdraw);
            
            const equivalentDate = new Date(startDate);
            equivalentDate.setDate(equivalentDate.getDate() + daysEarned);
            const equivalentDateStr = equivalentDate.toISOString().split('T')[0];
            
            let neededAmount = 0;
            let comparisonResult = '';
            
            if (equivalentDate >= targetDate) {
                comparisonResult = '已达到目标日期';
                neededAmount = 0;
            } else {
                const daysRemaining = Math.ceil((targetDate - equivalentDate) / (1000 * 60 * 60 * 24));
                neededAmount = daysRemaining * app.minWithdraw;
                comparisonResult = `还需 ${daysRemaining} 天`;
            }
            
            forecastData.push({
                phoneName: phone.name,
                appName: app.name,
                minWithdraw: app.minWithdraw,
                currentEarned,
                daysEarned,
                equivalentDateStr,
                daysFromStart,
                totalShouldEarn,
                neededAmount,
                comparisonResult
            });
            
            totalNeeded += neededAmount;
        });
    });
    
    document.getElementById('forecast-result').style.display = 'block';
    document.getElementById('forecast-empty').style.display = 'none';
    document.getElementById('forecast-days-info').textContent = `从2026年1月1日到 ${targetDateStr} 共 ${daysFromStart} 天`;
    document.getElementById('forecast-total-needed').textContent = `所有软件总共还需赚取: ¥${totalNeeded.toFixed(2)}`;
    
    document.getElementById('forecast-app-list').innerHTML = forecastData.map(item => `
        <div class="app-item">
            <div class="app-name">${item.phoneName} - ${item.appName}</div>
            <div class="app-info">
                <span>最小提现: ¥${item.minWithdraw.toFixed(2)}</span>
                <span>当前已赚: ¥${item.currentEarned.toFixed(2)}</span>
            </div>
            <div class="app-info">
                <span>相当于: ${item.daysEarned} 天</span>
                <span>等效日期: ${item.equivalentDateStr}</span>
            </div>
            <div class="app-info">
                <span>目标日期: ${targetDateStr}</span>
                <span>比较结果: ${item.comparisonResult}</span>
            </div>
            <div class="app-info">
                <span>到目标日期应赚: ¥${item.totalShouldEarn.toFixed(2)}</span>
                <span>还需赚取: ¥${item.neededAmount.toFixed(2)}</span>
            </div>
        </div>
    `).join('');
}

// 渲染设置页面
function renderSettings() {
    const data = DataManager.loadData();
    document.getElementById('yearly-goal').value = data.settings.yearlyGoal || 10000;
    
    // 计算剩余提现金额
    let totalWithdrawn = 0;
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            totalWithdrawn += app.remainingWithdrawn || app.withdrawn || 0;
        });
    });
    document.getElementById('total-withdrawn').value = totalWithdrawn.toFixed(2);
}

// 添加支出
function addExpense() {
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const purpose = document.getElementById('expense-purpose').value.trim();
    const date = document.getElementById('expense-date').value;
    const totalWithdrawn = parseFloat(document.getElementById('total-withdrawn').value);
    
    if (!amount || amount <= 0) {
        showToast('请输入有效的支出金额');
        return;
    }
    
    if (!purpose) {
        showToast('请输入支出用途');
        return;
    }
    
    if (!date) {
        showToast('请选择支出日期');
        return;
    }
    
    if (amount > totalWithdrawn) {
        showToast('支出金额不能超过总提现金额');
        return;
    }
    
    const data = DataManager.loadData();
    
    // 按比例分配支出到各个软件
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            const appWithdrawn = app.withdrawn || 0;
            if (appWithdrawn > 0 && totalWithdrawn > 0) {
                const ratio = appWithdrawn / totalWithdrawn;
                const appExpense = parseFloat((ratio * amount).toFixed(2));
                
                DataManager.addExpense(phone.id, app.id, {
                    amount: appExpense,
                    purpose,
                    date
                });
            }
        });
    });
    
    // 重置表单
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-purpose').value = '';
    
    renderSettings();
    showToast('支出添加成功！');
}

// 渲染提现记录
function renderWithdrawRecords() {
    const data = DataManager.loadData();
    const container = document.getElementById('withdraw-records-list');
    
    const allWithdrawals = [];
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            if (app.withdrawals && app.withdrawals.length > 0) {
                app.withdrawals.forEach(w => {
                    allWithdrawals.push({
                        ...w,
                        phoneName: phone.name,
                        appName: app.name
                    });
                });
            }
        });
    });
    
    // 按日期排序
    allWithdrawals.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (allWithdrawals.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无提现记录</div>';
        return;
    }
    
    // 按日期分组
    const groupedWithdrawals = allWithdrawals.reduce((groups, withdrawal) => {
        const date = withdrawal.date;
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(withdrawal);
        return groups;
    }, {});
    
    // 生成按日期分组的HTML
    let html = '';
    Object.entries(groupedWithdrawals).forEach(([date, withdrawals]) => {
        // 计算当日总提现金额
        const dailyTotal = withdrawals.reduce((sum, w) => sum + w.amount, 0);
        
        // 添加日期分组标题
        html += `
            <div class="withdraw-date-group">
                <div class="withdraw-date-header">
                    <div class="withdraw-date">${date}</div>
                    <div class="withdraw-date-total">
                        <span class="total-label">当日总计:</span>
                        <span class="total-amount">+¥${dailyTotal.toFixed(2)}</span>
                    </div>
                </div>
        `;
        
        // 添加当日的提现记录
        withdrawals.forEach(w => {
            html += `
                <div class="withdraw-record-item">
                    <div class="withdraw-record-content">
                        <div class="withdraw-record-left">
                            <div class="withdraw-record-source">${w.phoneName} - ${w.appName}</div>
                            <span class="status-tag ready">提现成功</span>
                        </div>
                        <div class="withdraw-record-right">
                            <div class="withdraw-record-amount">+¥${w.amount.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
    });
    
    container.innerHTML = html;
}

// 渲染支出记录
function renderExpenseRecords() {
    const data = DataManager.loadData();
    const container = document.getElementById('expense-records-list');
    
    const allExpenses = [];
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            if (app.expenses && app.expenses.length > 0) {
                app.expenses.forEach(e => {
                    allExpenses.push({
                        ...e,
                        phoneName: phone.name,
                        appName: app.name
                    });
                });
            }
        });
    });
    
    // 按日期排序
    allExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (allExpenses.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无支出记录</div>';
        return;
    }
    
    container.innerHTML = allExpenses.map(e => `
        <div class="expense-record-item">
            <div class="expense-record-header">
                <span class="expense-tag">💰 支出</span>
                <span class="expense-date">${e.date}</span>
            </div>
            <div class="expense-record-body">
                <div class="expense-info">
                    <h4 class="expense-purpose">${e.purpose}</h4>
                    <p class="expense-source">${e.phoneName} · ${e.appName}</p>
                </div>
                <div class="expense-amount">-¥${e.amount.toFixed(2)}</div>
            </div>
        </div>
    `).join('');
}

// 生成备份码
function generateBackupCode() {
    const data = DataManager.loadData();
    
    const simplifiedData = {
        v: 1,
        p: data.phones.map(phone => ({
            n: phone.name,
            a: phone.apps.map(app => ({
                n: app.name,
                m: app.minWithdraw,
                b: app.balance || 0,
                e: app.earned || 0
            }))
        })),
        s: {
            g: data.settings.yearlyGoal || 10000
        }
    };
    
    const jsonStr = JSON.stringify(simplifiedData);
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    
    showModal('备份码（请复制保存）', `
        <div class="form-group">
            <textarea class="form-input" rows="6" readonly>${base64}</textarea>
        </div>
        <div class="form-hint">请将此代码复制保存，用于数据恢复</div>
    `, [
        { 
            text: '复制', 
            class: 'btn-primary', 
            action: () => {
                navigator.clipboard.writeText(base64).then(() => {
                    showToast('已复制到剪贴板');
                });
            }
        },
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}

// 从备份码恢复
function restoreFromCode() {
    showModal('恢复数据', `
        <div class="form-group">
            <label class="form-label">备份码</label>
            <textarea id="restore-code" class="form-input" rows="6" placeholder="粘贴备份码"></textarea>
        </div>
        <div class="form-hint">恢复数据将覆盖当前所有数据</div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { 
            text: '恢复', 
            class: 'btn-primary', 
            action: () => {
                const code = document.getElementById('restore-code').value.replace(/\s/g, '');
                
                try {
                    const jsonStr = decodeURIComponent(escape(atob(code)));
                    const data = JSON.parse(jsonStr);
                    
                    if (!data.v || !data.p || !Array.isArray(data.p)) {
                        showToast('备份码格式错误');
                        return;
                    }
                    
                    const restoredData = {
                        phones: data.p.map((phone, phoneIndex) => ({
                            id: Date.now().toString() + phoneIndex,
                            name: phone.n,
                            apps: phone.a.map((app, appIndex) => ({
                                id: Date.now().toString() + phoneIndex + appIndex,
                                name: app.n,
                                minWithdraw: app.m,
                                balance: app.b,
                                earned: app.e,
                                withdrawn: 0,
                                remainingWithdrawn: 0,
                                historicalWithdrawn: 0,
                                expenses: [],
                                withdrawals: [],
                                lastUpdated: new Date().toISOString()
                            }))
                        })),
                        settings: {
                            yearlyGoal: (data.s && data.s.g) || 10000
                        }
                    };
                    
                    if (confirm(`将恢复 ${restoredData.phones.length} 部手机的数据，是否继续？`)) {
                        DataManager.saveData(restoredData);
                        renderDashboard();
                        renderPhones();
                        renderStats();
                        renderSettings();
                        showToast('恢复成功！');
                    }
                } catch (error) {
                    showToast('备份码无效');
                }
                closeModal();
            }
        }
    ]);
}

// 导出数据
function exportData() {
    const data = DataManager.loadData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `moneyApp_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('数据已导出！');
}

// 导入数据
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                
                if (!importedData.phones || !Array.isArray(importedData.phones)) {
                    showToast('数据格式错误');
                    return;
                }
                
                if (confirm('导入数据将覆盖当前所有数据，是否继续？')) {
                    DataManager.saveData(importedData);
                    renderDashboard();
                    renderPhones();
                    renderStats();
                    renderSettings();
                    showToast('导入成功！');
                }
            } catch (error) {
                showToast('文件格式错误');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

// 清空所有数据
function clearAllData() {
    if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
        DataManager.clearAllData();
        expandedPhones = {};
        renderDashboard();
        renderPhones();
        renderStats();
        renderSettings();
        showToast('数据已清空！');
    }
}

// 模态框状态管理
let modalIsShowing = false;

// 显示模态框
function showModal(title, body, buttons) {
    // 防止重复触发
    if (modalIsShowing) return;
    
    const modal = document.getElementById('modal');
    
    // 先确保模态框是隐藏状态
    modal.style.display = 'none';
    modal.classList.remove('show');
    
    // 清空按钮容器，移除事件监听器
    const buttonsContainer = document.getElementById('modal-buttons');
    buttonsContainer.innerHTML = '';
    
    // 更新内容
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    
    // 创建按钮，使用事件监听器
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.className = `btn ${btn.class}`;
        button.textContent = btn.text;
        button.addEventListener('click', btn.action);
        buttonsContainer.appendChild(button);
    });
    
    // 设置模态框显示状态
    modalIsShowing = true;
    
    // 先设置为flex，然后添加show类触发动画
    modal.style.display = 'flex';
    // 使用setTimeout确保DOM更新后再添加类
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// 关闭模态框
function closeModal() {
    const modal = document.getElementById('modal');
    
    // 移除show类触发淡出动画
    modal.classList.remove('show');
    
    // 动画结束后完全隐藏
    setTimeout(() => {
        modal.style.display = 'none';
        
        // 清空按钮容器，移除事件监听器
        document.getElementById('modal-buttons').innerHTML = '';
        
        // 重置模态框状态
        modalIsShowing = false;
    }, 300); // 与CSS过渡时间匹配
}

// 显示提示消息
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 2000);
}

// 点击模态框背景关闭
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
