// 赚钱软件管理系统 - 主应用逻辑
const DATA_KEY = 'moneyAppData';
const PHONES_KEY = 'moneyApp_phones';
const INSTALLMENTS_KEY = 'moneyApp_installments';
const EXPENSES_KEY = 'moneyApp_expenses';
const SETTINGS_KEY = 'moneyApp_settings';

// 成就系统和游戏化存储键
const ACHIEVEMENTS_KEY = 'moneyApp_achievements';
const DAILY_TASKS_KEY = 'moneyApp_dailyTasks';
const USER_LEVEL_KEY = 'moneyApp_userLevel';
const CHECKIN_KEY = 'moneyApp_checkin';

// 游戏管理存储键
const DOWNLOADED_GAMES_KEY = 'moneyApp_downloadedGames';
const GAME_DRAW_HISTORY_KEY = 'moneyApp_gameDrawHistory';

// ==================== 通用计算函数 ====================

// 计算软件的已赚金额（累计）
// 公式：(当前余额 - 初始基准值) + 已提现金额
function calculateAppEarned(app) {
    const initialBalance = app.initialBalance || 0;
    const currentBalance = app.balance || 0;
    const balanceEarned = Math.max(0, currentBalance - initialBalance);
    const withdrawn = (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
    return balanceEarned + withdrawn;
}

// 计算手机的总已赚金额
function calculatePhoneTotalEarned(phone) {
    return phone.apps.reduce((sum, app) => sum + calculateAppEarned(app), 0);
}

// 全局变量和辅助函数定义
let modalIsShowing = false;

// 显示模态框
function showModal(title, body, buttons, enableScroll = false) {
    // 防止重复触发
    if (modalIsShowing) return;
    
    const modal = document.getElementById('modal');
    const modalContent = document.querySelector('.modal-content');
    const modalBody = document.getElementById('modal-body');
    
    // 先确保模态框是隐藏状态
    modal.style.display = 'none';
    modal.classList.remove('show');
    
    // 重置模态框样式
    modalContent.style.overflow = 'visible';
    modalContent.style.maxHeight = '';
    modalContent.style.display = '';
    modalBody.style.flex = '';
    modalBody.style.overflowY = '';
    modalBody.style.paddingRight = '';
    
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
    
    // 如果需要滚动功能，添加滚动样式
    if (enableScroll) {
        modalContent.style.overflow = 'hidden';
        modalContent.style.maxHeight = '80vh';
        modalContent.style.display = 'flex';
        modalContent.style.flexDirection = 'column';
        modalBody.style.flex = '1';
        modalBody.style.overflowY = 'auto';
        modalBody.style.paddingRight = '8px';
    }
    
    // 设置模态框显示状态
    modalIsShowing = true;
    
    // 先设置为flex，然后添加show类触发动画
    modal.style.display = 'flex';
    // 使用setTimeout确保DOM更新后再添加类
    setTimeout(() => {
        modal.classList.add('show');
        
        // 检查是否包含日期输入字段，如果包含，初始化日历
        const dateInputs = modal.querySelectorAll('input[type="date"]');
        dateInputs.forEach(input => {
            // 隐藏原生日期输入
            input.type = 'text';
            input.readOnly = true;
            input.classList.add('calendar-input');
            
            // 为每个日期输入创建日历实例
            new Calendar({
                input: input.id
            });
        });
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
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    
    // 移除所有类型类
    toast.classList.remove('toast-success', 'toast-error', 'toast-warning', 'toast-info');
    
    // 添加对应类型类
    toast.classList.add(`toast-${type}`);
    
    // 添加动画类
    toast.classList.add('toast-animate');
    
    setTimeout(() => {
        toast.style.display = 'none';
        toast.classList.remove('toast-animate');
    }, 2500);
}

// 显示成功提示
function showSuccess(message) {
    showToast(message, 'success');
}

// 显示错误提示
function showError(message) {
    showToast(message, 'error');
}

// 显示警告提示
function showWarning(message) {
    showToast(message, 'warning');
}

// 显示信息提示
function showInfo(message) {
    showToast(message, 'info');
}

// 输入验证函数
function validateInput(value, type, fieldName) {
    if (!value || value.toString().trim() === '') {
        showError(`${fieldName}不能为空`);
        return false;
    }
    
    switch (type) {
        case 'number':
            if (isNaN(parseFloat(value))) {
                showError(`${fieldName}必须是有效的数字`);
                return false;
            }
            if (parseFloat(value) < 0) {
                showError(`${fieldName}不能为负数`);
                return false;
            }
            break;
        case 'positive':
            if (parseFloat(value) <= 0) {
                showError(`${fieldName}必须大于0`);
                return false;
            }
            break;
        case 'date':
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(value)) {
                showError(`${fieldName}格式不正确`);
                return false;
            }
            break;
    }
    
    return true;
}

// 全局错误处理
function handleError(error, operation = '操作') {
    console.error(`${operation}出错:`, error);
    
    let errorMessage = `${operation}失败`;
    
    if (error.message) {
        if (error.message.includes('localStorage')) {
            errorMessage = '存储空间不足，请清理浏览器缓存';
        } else if (error.message.includes('JSON')) {
            errorMessage = '数据格式错误，请检查输入';
        } else if (error.message.includes('network')) {
            errorMessage = '网络连接失败，请检查网络';
        } else {
            errorMessage = error.message;
        }
    }
    
    showError(errorMessage);
}

// 安全执行函数（带错误处理）
function safeExecute(operation, fn) {
    try {
        return fn();
    } catch (error) {
        handleError(error, operation);
        return null;
    }
}

// 安全执行异步函数
async function safeExecuteAsync(operation, fn) {
    try {
        return await fn();
    } catch (error) {
        handleError(error, operation);
        return null;
    }
}

// 全局函数定义（提前定义以避免函数未定义错误）



function openAddInstallmentModal() {
    showModal('添加分期还款', `
        <div class="form-group">
            <label class="form-label">平台名称</label>
            <input type="text" id="installment-platform" class="form-input" placeholder="输入平台名称">
        </div>
        <div class="form-group">
            <label class="form-label">还款日期</label>
            <input type="date" id="installment-due-date" class="form-input">
        </div>
        <div class="form-group">
            <label class="form-label">还款金额 (元)</label>
            <input type="number" id="installment-amount" class="form-input" placeholder="输入还款金额" step="0.01">
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { 
            text: '添加', 
            class: 'btn-primary', 
            action: () => {
                const platform = document.getElementById('installment-platform').value.trim();
                const dueDate = document.getElementById('installment-due-date').value;
                const amount = document.getElementById('installment-amount').value;
                
                if (platform && dueDate && amount) {
                    DataManager.addInstallment({ platform, dueDate, amount });
                    renderInstallments();
                    showToast('分期添加成功！');
                }
                closeModal();
            }
        }
    ]);
}

function openEditInstallmentModal(installmentId) {
    const data = DataManager.loadData();
    const installment = data.installments.find(i => i.id === installmentId);
    
    if (!installment) return;
    
    showModal('编辑分期还款', `
        <div class="form-group">
            <label class="form-label">平台名称</label>
            <input type="text" id="edit-installment-platform" class="form-input" value="${installment.platform}">
        </div>
        <div class="form-group">
            <label class="form-label">还款日期</label>
            <input type="date" id="edit-installment-due-date" class="form-input" value="${installment.dueDate}">
        </div>
        <div class="form-group">
            <label class="form-label">还款金额 (元)</label>
            <input type="number" id="edit-installment-amount" class="form-input" value="${installment.amount}" step="0.01">
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { 
            text: '保存', 
            class: 'btn-primary', 
            action: () => {
                const platform = document.getElementById('edit-installment-platform').value.trim();
                const dueDate = document.getElementById('edit-installment-due-date').value;
                const amount = document.getElementById('edit-installment-amount').value;
                
                if (platform && dueDate && amount) {
                    DataManager.editInstallment(installmentId, { platform, dueDate, amount });
                    renderInstallments();
                    showToast('分期已更新！');
                }
                closeModal();
            }
        }
    ]);
}

function deleteInstallment(installmentId) {
    if (confirm('确定要删除这个分期吗？')) {
        DataManager.deleteInstallment(installmentId);
        renderInstallments();
        showToast('分期已删除！');
    }
}

function calculateInstallmentGoalsGlobal() {
    renderInstallments();
    showToast('计算完成！');
}

function renderInstallments() {
    const summary = DataManager.getInstallmentSummary();
    const { installments, phaseGoals } = DataManager.calculateInstallmentGoals();
    
    // 更新总览数据
    document.getElementById('total-installment-amount').textContent = `¥${summary.totalInstallmentAmount.toFixed(2)}`;
    document.getElementById('installment-earned').textContent = `¥${summary.pendingExpense.toFixed(2)}`;  // 待支出金额
    document.getElementById('installment-needed').textContent = `¥${summary.pendingWithdrawal.toFixed(2)}`;  // 待提现金额
    document.getElementById('installment-overall-progress').textContent = `${summary.overallProgress.toFixed(0)}%`;
    document.getElementById('installment-progress-bar').style.width = `${summary.overallProgress}%`;
    
    // 更新最近还款日期
    if (installments.length > 0) {
        const nearestInstallment = installments[0];
        document.getElementById('nearest-due-date').textContent = `${nearestInstallment.dueDate} (${nearestInstallment.daysRemaining}天)`;
    } else {
        document.getElementById('nearest-due-date').textContent = '暂无';
    }
    
    // 渲染分期列表
    const container = document.getElementById('installment-list');
    if (installments.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无分期记录</div>';
        return;
    }
    
    // 渲染阶段性目标概览
    let phaseGoalsHtml = '';
    if (phaseGoals.length > 0) {
        phaseGoalsHtml = `
            <div class="card mb-4" style="background: linear-gradient(135deg, #fef3c7, #fde68a); border: 2px solid #f59e0b;">
                <div class="section-header">
                    <div class="section-title" style="color: #92400e;">📊 阶段性每日目标</div>
                    <div class="section-divider" style="background: #f59e0b;"></div>
                </div>
                <div class="phase-goals-list">
                    ${phaseGoals.map((phase, index) => `
                        <div class="phase-goal-item" style="padding: 12px; margin-bottom: 8px; background: white; border-radius: 8px; border-left: 4px solid ${index === 0 ? '#22c55e' : '#3b82f6'};">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="font-weight: 600; color: #1f2937;">${phase.phaseName}: ${phase.platform}</span>
                                <span style="font-size: 12px; color: #6b7280;">${phase.dueDate}截止</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-size: 18px; font-weight: 700; color: ${index === 0 ? '#16a34a' : '#2563eb'};">
                                        每日需赚: ¥${phase.dailyTarget.toFixed(2)}
                                    </div>
                                    <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
                                        剩余${phase.daysRemaining}天 | 还需¥${phase.remainingAmount.toFixed(2)}
                                    </div>
                                </div>
                                ${index === 0 ? '<span style="background: #dcfce7; color: #16a34a; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">当前阶段</span>' : '<span style="background: #dbeafe; color: #2563eb; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">待开始</span>'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = phaseGoalsHtml + installments.map(installment => {
        // 确定紧急程度
        let urgencyClass = 'normal';
        if (installment.daysRemaining <= 3) {
            urgencyClass = 'urgent';
        } else if (installment.daysRemaining <= 7) {
            urgencyClass = 'warning';
        }
        
        return `
            <div class="installment-item ${urgencyClass}">
                <div class="installment-header">
                    <div>
                        <h3 class="installment-platform">${installment.platform}</h3>
                        <p class="installment-date">还款日期: ${installment.dueDate}</p>
                        <span style="display: inline-block; background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-top: 4px;">${installment.phaseName}</span>
                    </div>
                    <span class="status-tag ${installment.status === 'active' ? 'ready' : 'pending'}">
                        ${installment.status === 'active' ? '进行中' : '已完成'}
                    </span>
                </div>
                <div class="installment-amount">¥${installment.amount.toFixed(2)}</div>
                <div class="installment-details">
                    <span>剩余天数: ${installment.daysRemaining}天</span>
                    <span>每日需要: ¥${installment.dailyTarget.toFixed(2)}</span>
                </div>
                <div class="installment-progress">
                    <div class="progress-header">
                        <span>完成进度</span>
                        <span class="font-semibold">${installment.totalProgress.toFixed(0)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${installment.totalProgress}%"></div>
                    </div>
                </div>
                <div class="installment-app-goals">
                    <div class="section-title" style="font-size: 14px; margin-bottom: 12px;">各软件目标</div>
                    ${installment.appGoals.map(goal => `
                        <div class="installment-app-goal-item">
                            <div class="installment-app-goal-header">
                                <span class="installment-app-name">${goal.phoneName} - ${goal.appName}</span>
                                <span class="installment-app-target">目标: ¥${goal.totalTarget.toFixed(2)}</span>
                            </div>
                            <div class="installment-app-goal-details">
                                <span>每日要赚: ¥${goal.dailyTarget.toFixed(2)}</span>
                            </div>
                            <div class="progress-item">
                                <div class="progress-header">
                                    <span>已提现: ¥${goal.currentWithdrawn.toFixed(2)}</span>
                                    <span>${goal.progress.toFixed(0)}%</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${goal.progress}%"></div>
                                </div>
                            </div>
                            <div class="installment-app-goal-actions">
                                <button class="btn btn-secondary btn-sm" onclick="editAppGoalAmount('${installment.id}')">修改目标</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="installment-action-buttons">
                    <button class="btn btn-secondary" onclick="openEditInstallmentModal('${installment.id}')">编辑</button>
                    <button class="btn btn-error" onclick="deleteInstallment('${installment.id}')">删除</button>
                </div>
            </div>
        `;
    }).join('');
}

// 局部更新单个手机卡片（优化性能）
function updatePhoneCard(phoneId) {
    const data = DataManager.loadData();
    const phone = data.phones.find(p => p.id === phoneId);
    if (!phone) return;
    
    const cardElement = document.querySelector(`[data-phone-id="${phoneId}"]`);
    if (!cardElement) {
        // 如果找不到元素，回退到完整渲染
        renderPhones();
        return;
    }
    
    const index = data.phones.findIndex(p => p.id === phoneId);
    const isExpanded = expandedPhones[phoneId];
    
    // 计算该手机的总赚取金额
    const totalEarned = calculatePhoneTotalEarned(phone);
    
    // 计算该手机的未提现余额（当前可提现的金额）
    const totalBalance = phone.apps.reduce((sum, app) => {
        return sum + (app.balance || 0);
    }, 0);
    
    // 计算每日目标和进度
    const settings = DataManager.loadData().settings;
    const yearlyGoal = settings.yearlyGoal || 0;
    const phoneCount = data.phones.length || 1;
    const currentYear = getCurrentYear();
    const yearDays = getYearDays(currentYear);
    const dailyTarget = yearlyGoal > 0 ? yearlyGoal / yearDays / phoneCount : 0;
    
    // 计算今日已赚：手机总赚取金额相比昨天结束时的变化
    const today = new Date().toISOString().split('T')[0];
    const history = phone.dailyTotalEarnedHistory || {};
    // 使用新的计算函数获取当前总已赚金额
    const currentTotalEarned = calculatePhoneTotalEarned(phone);
    
    // 找到昨天结束时的总赚取作为今天开始的基准
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let yesterdayTotal = history[yesterday];
    
    if (yesterdayTotal === undefined) {
        // 昨天没有记录，找昨天之前最后一次记录
        const datesBeforeYesterday = Object.keys(history)
            .filter(d => d <= yesterday)
            .sort();
        
        if (datesBeforeYesterday.length > 0) {
            // 找到小于等于昨天的最大日期
            yesterdayTotal = history[datesBeforeYesterday[datesBeforeYesterday.length - 1]];
        } else {
            // 昨天之前没有任何记录，基准为0
            yesterdayTotal = 0;
        }
    }
    
    // 今日赚取 = 当前总赚取 - 昨天结束时的总赚取
    const todayEarned = Math.max(0, currentTotalEarned - yesterdayTotal);

    const progress = dailyTarget > 0 ? Math.min(100, Math.round((todayEarned / dailyTarget) * 100)) : 0;
    
    // 根据索引选择胶囊颜色（使用已有的index变量）
    const capsuleColors = ['purple', 'green', 'blue', 'orange', 'pink', 'cyan'];
    const capsuleColor = capsuleColors[index % capsuleColors.length];
    
    // 更新卡片内容
    cardElement.innerHTML = `
        <div class="phone-header">
            <div class="phone-header-top">
                <span class="phone-name-capsule capsule-${capsuleColor}" onclick="editPhoneName('${phone.id}')">${phone.name}</span>
                <div class="phone-header-actions">
                    <button class="btn-today-earn" onclick="showTodayEarnPage('${phone.id}')" title="今日赚取">📊 今日赚取</button>
                    <div class="phone-icon-buttons">
                        <button class="icon-btn icon-btn-add" onclick="openAddAppModal('${phone.id}')" title="添加软件">+</button>
                        <button class="icon-btn icon-btn-delete" onclick="deletePhone('${phone.id}')" title="删除手机">🗑️</button>
                        <button class="btn btn-icon" onclick="togglePhoneExpand('${phone.id}')">
                            ${isExpanded ? '▼' : '▶'}
                        </button>
                    </div>
                </div>
            </div>
            <div class="phone-header-stats">
                <div class="phone-stat-item">
                    <span class="stat-icon">💰</span>
                    <div class="stat-content">
                        <span class="stat-label">总赚取</span>
                        <span class="stat-value">¥${totalEarned.toFixed(2)}</span>
                    </div>
                </div>
                <div class="phone-stat-item">
                    <span class="stat-icon">💳</span>
                    <div class="stat-content">
                        <span class="stat-label">总余额</span>
                        <span class="stat-value">¥${totalBalance.toFixed(2)}</span>
                    </div>
                </div>
                <div class="phone-stat-item daily-stat">
                    <div class="daily-info">
                        <div class="daily-row">
                            <span class="daily-label">目标</span>
                            <span class="daily-value">¥${dailyTarget.toFixed(2)}</span>
                        </div>
                        <div class="daily-row">
                            <span class="daily-label">已赚</span>
                            <span class="daily-value earned">¥${todayEarned.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="daily-progress-ring">
                        <svg viewBox="0 0 36 36" class="circular-chart">
                            <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path class="circle" stroke-dasharray="${progress}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <text x="18" y="20.35" class="percentage">${progress}%</text>
                        </svg>
                    </div>
                </div>
            </div>
        </div>
        ${isExpanded ? renderAppList(phone) : `<div class="collapsed-hint">点击展开查看 ${phone.apps.length} 个软件</div>`}
    `;
}

// 局部更新单个软件卡片（优化性能）
function updateAppCard(phoneId, appId) {
    const data = DataManager.loadData();
    const phone = data.phones.find(p => p.id === phoneId);
    if (!phone) return;
    
    const app = phone.apps.find(a => a.id === appId);
    if (!app) return;
    
    // 找到软件卡片元素
    const appCards = document.querySelectorAll('.app-card');
    let targetCard = null;
    
    appCards.forEach(card => {
        const appName = card.querySelector('.app-name');
        if (appName && appName.textContent === app.name) {
            targetCard = card;
        }
    });
    
    if (!targetCard) {
        // 如果找不到元素，回退到更新整个手机卡片
        updatePhoneCard(phoneId);
        return;
    }
    
    const now = new Date();
    const startDate = new Date('2026-01-01');
    const daysFromStart = Math.floor((now - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    // 确保 minWithdraw 有效，使用软件存储的值或默认值
    let minWithdraw = parseFloat(app.minWithdraw);
    if (!minWithdraw || minWithdraw <= 0 || isNaN(minWithdraw)) {
        minWithdraw = 0.3; // 默认最小提现金额
    }
    
    const shouldHaveEarned = daysFromStart * minWithdraw;
    // 使用统一函数计算已赚金额
    const earned = calculateAppEarned(app);
    const daysIncome = Math.floor(earned / minWithdraw);
    const nextPlayDate = calculateNextPlayDate(earned, minWithdraw);
    const progressPercentage = shouldHaveEarned > 0 ? Math.min(100, Math.round((earned / shouldHaveEarned) * 100)) : 0;
    
    // 更新卡片内容
    targetCard.innerHTML = `
        <div class="app-header">
            <span class="app-name">${app.name}</span>
            <span class="status-tag ${app.balance >= minWithdraw ? 'ready' : 'pending'}">
                ${app.balance >= minWithdraw ? '可提现' : '待赚取'}
            </span>
        </div>
        <div class="app-core-info">
            <span class="core-label">当前余额:</span>
            <span class="core-value">¥${(app.balance || 0).toFixed(2)}</span>
        </div>
        <div class="app-info-row">
            <span>最小提现: ¥${minWithdraw.toFixed(2)}</span>
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
            <button class="btn btn-primary" onclick="openWithdrawModal('${phoneId}', '${appId}')">提现</button>
            <button class="btn btn-secondary" onclick="openEditAppModal('${phoneId}', '${appId}')">编辑</button>
            <button class="btn btn-error" onclick="deleteApp('${phoneId}', '${appId}')">删除</button>
        </div>
    `;
}

// 原始代码开始

// 数据管理类
class DataManager {
    static loadData() {
        // 尝试从分片存储加载数据
        const phones = localStorage.getItem(PHONES_KEY);
        const installments = localStorage.getItem(INSTALLMENTS_KEY);
        const expenses = localStorage.getItem(EXPENSES_KEY);
        const settings = localStorage.getItem(SETTINGS_KEY);

        let result;
        // 如果分片存储有数据，使用分片存储
        if (phones || installments || expenses || settings) {
            result = {
                phones: phones ? JSON.parse(phones) : [],
                installments: installments ? JSON.parse(installments) : [],
                expenses: expenses ? JSON.parse(expenses) : [],
                settings: settings ? JSON.parse(settings) : { yearlyGoal: 10000 }
            };
        } else {
            // 否则从旧的单文件存储加载数据（兼容旧版本）
            const savedData = localStorage.getItem(DATA_KEY);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                result = {
                    phones: parsedData.phones || [],
                    installments: parsedData.installments || [],
                    expenses: parsedData.expenses || [],
                    settings: {
                        yearlyGoal: parsedData.settings?.yearlyGoal || 10000
                    }
                };
            } else {
                result = {
                    phones: [],
                    installments: [],
                    expenses: [],
                    settings: {
                        yearlyGoal: 10000
                    }
                };
            }
        }

        // 数据迁移：为旧数据添加 dailyEarnedHistory 字段
        const today = new Date().toISOString().split('T')[0];
        let needsMigration = false;
        result.phones.forEach(phone => {
            // 为手机添加 dailyTotalEarnedHistory
            if (!phone.dailyTotalEarnedHistory) {
                const totalEarned = phone.apps.reduce((sum, a) => sum + (a.earned || 0), 0);
                phone.dailyTotalEarnedHistory = {
                    [today]: totalEarned
                };
                needsMigration = true;
            }
            // 为软件添加 dailyEarnedHistory
            phone.apps.forEach(app => {
                if (!app.dailyEarnedHistory) {
                    app.dailyEarnedHistory = {
                        [today]: app.earned || 0
                    };
                    needsMigration = true;
                }
            });
        });
        if (needsMigration) {
            this.saveData(result);
        }

        return result;
    }

    static saveData(data) {
        // 分片存储数据
        localStorage.setItem(PHONES_KEY, JSON.stringify(data.phones));
        localStorage.setItem(INSTALLMENTS_KEY, JSON.stringify(data.installments));
        localStorage.setItem(EXPENSES_KEY, JSON.stringify(data.expenses));
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
    }
    
    // 保存特定类型的数据（优化性能）
    static savePhones(phones) {
        localStorage.setItem(PHONES_KEY, JSON.stringify(phones));
    }
    
    static saveInstallments(installments) {
        localStorage.setItem(INSTALLMENTS_KEY, JSON.stringify(installments));
    }
    
    static saveExpenses(expenses) {
        localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    }
    
    static saveSettings(settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    static calculateYearlyGoal() {
        const data = this.loadData();
        // 根据当前所有软件自动计算全年目标
        const allApps = data.phones.flatMap(phone => phone.apps);
        const yearlyGoal = allApps.reduce((total, app) => {
            return total + ((app.minWithdraw || 0.3) * 365);
        }, 0);
        data.settings.yearlyGoal = yearlyGoal;
        this.saveData(data);
        return yearlyGoal;
    }
    
    // 获取用户设置的全年目标（如果用户手动设置了，返回设置的值；否则返回自动计算的值）
    static getYearlyGoal() {
        const data = this.loadData();
        return data.settings.yearlyGoal || 0;
    }

    // ==================== 成就系统 ====================

    // 获取成就数据
    static getAchievements() {
        const achievements = localStorage.getItem(ACHIEVEMENTS_KEY);
        return achievements ? JSON.parse(achievements) : {
            unlocked: [],
            firstWithdrawal: false,
            totalEarned100: false,
            totalEarned500: false,
            totalEarned1000: false,
            consecutiveCheckIn7: false,
            consecutiveCheckIn30: false,
            add10Apps: false,
            add5Phones: false
        };
    }

    // 保存成就数据
    static saveAchievements(achievements) {
        localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
    }

    // 检查并解锁成就
    static checkAchievements() {
        const data = this.loadData();
        const achievements = this.getAchievements();
        const newAchievements = [];

        // 计算总赚取金额
        const totalEarned = data.phones.reduce((sum, phone) => {
            return sum + calculatePhoneTotalEarned(phone);
        }, 0);

        // 检查首次提现成就
        const totalWithdrawn = data.phones.reduce((sum, phone) => {
            return sum + phone.apps.reduce((appSum, app) => {
                return appSum + (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
            }, 0);
        }, 0);
        if (totalWithdrawn > 0 && !achievements.firstWithdrawal) {
            achievements.firstWithdrawal = true;
            newAchievements.push('🎉 首次提现');
        }

        // 检查累计赚取成就
        if (totalEarned >= 100 && !achievements.totalEarned100) {
            achievements.totalEarned100 = true;
            newAchievements.push('💰 累计赚取100元');
        }
        if (totalEarned >= 500 && !achievements.totalEarned500) {
            achievements.totalEarned500 = true;
            newAchievements.push('💎 累计赚取500元');
        }
        if (totalEarned >= 1000 && !achievements.totalEarned1000) {
            achievements.totalEarned1000 = true;
            newAchievements.push('🏆 累计赚取1000元');
        }

        // 检查添加软件/手机成就
        const totalApps = data.phones.reduce((sum, phone) => sum + phone.apps.length, 0);
        if (totalApps >= 10 && !achievements.add10Apps) {
            achievements.add10Apps = true;
            newAchievements.push('📱 添加10个软件');
        }
        if (data.phones.length >= 5 && !achievements.add5Phones) {
            achievements.add5Phones = true;
            newAchievements.push('📲 添加5部手机');
        }

        this.saveAchievements(achievements);
        return newAchievements;
    }

    // ==================== 签到系统 ====================

    // 获取签到数据
    static getCheckInData() {
        const checkIn = localStorage.getItem(CHECKIN_KEY);
        return checkIn ? JSON.parse(checkIn) : {
            lastCheckIn: null,
            consecutiveDays: 0,
            totalDays: 0,
            history: []
        };
    }

    // 保存签到数据
    static saveCheckInData(checkIn) {
        localStorage.setItem(CHECKIN_KEY, JSON.stringify(checkIn));
    }

    // 执行签到
    static doCheckIn() {
        const checkIn = this.getCheckInData();
        const today = new Date().toISOString().split('T')[0];

        // 检查今天是否已经签到
        if (checkIn.lastCheckIn === today) {
            return { success: false, message: '今天已经签到过了' };
        }

        // 检查是否是连续签到
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (checkIn.lastCheckIn === yesterdayStr) {
            checkIn.consecutiveDays++;
        } else {
            checkIn.consecutiveDays = 1;
        }

        checkIn.lastCheckIn = today;
        checkIn.totalDays++;
        checkIn.history.push(today);

        // 只保留最近30天的记录
        if (checkIn.history.length > 30) {
            checkIn.history.shift();
        }

        this.saveCheckInData(checkIn);

        // 检查连续签到成就
        const achievements = this.getAchievements();
        let newAchievement = null;
        if (checkIn.consecutiveDays >= 7 && !achievements.consecutiveCheckIn7) {
            achievements.consecutiveCheckIn7 = true;
            newAchievement = '🔥 连续签到7天';
        }
        if (checkIn.consecutiveDays >= 30 && !achievements.consecutiveCheckIn30) {
            achievements.consecutiveCheckIn30 = true;
            newAchievement = '⭐ 连续签到30天';
        }
        if (newAchievement) {
            this.saveAchievements(achievements);
        }

        return {
            success: true,
            consecutiveDays: checkIn.consecutiveDays,
            totalDays: checkIn.totalDays,
            newAchievement
        };
    }

    // ==================== 等级系统 ====================

    // 获取用户等级数据
    static getUserLevel() {
        const level = localStorage.getItem(USER_LEVEL_KEY);
        return level ? JSON.parse(level) : {
            level: 1,
            exp: 0,
            totalExp: 0,
            title: '新手'
        };
    }

    // 保存用户等级数据
    static saveUserLevel(level) {
        localStorage.setItem(USER_LEVEL_KEY, JSON.stringify(level));
    }

    // 计算等级所需经验
    static getExpForLevel(level) {
        return Math.floor(100 * Math.pow(1.5, level - 1));
    }

    // 获取等级称号
    static getLevelTitle(level) {
        const titles = [
            '新手', '学徒', '达人', '高手', '专家',
            '大师', '宗师', '传说', '神话', '传奇'
        ];
        return titles[Math.min(level - 1, titles.length - 1)] || '传奇';
    }

    // 增加经验值
    static addExp(amount) {
        const level = this.getUserLevel();
        level.exp += amount;
        level.totalExp += amount;

        // 检查升级
        let leveledUp = false;
        const expNeeded = this.getExpForLevel(level.level);
        while (level.exp >= expNeeded) {
            level.exp -= expNeeded;
            level.level++;
            level.title = this.getLevelTitle(level.level);
            leveledUp = true;
        }

        this.saveUserLevel(level);
        return { level, leveledUp };
    }

    // ==================== 每日任务 ====================

    // 获取每日任务
    static getDailyTasks() {
        const tasks = localStorage.getItem(DAILY_TASKS_KEY);
        const today = new Date().toISOString().split('T')[0];

        if (!tasks) {
            return this.generateDailyTasks(today);
        }

        const tasksData = JSON.parse(tasks);
        // 检查是否是今天的任务
        if (tasksData.date !== today) {
            return this.generateDailyTasks(today);
        }

        return tasksData;
    }

    // 生成每日任务
    static generateDailyTasks(date) {
        const data = this.loadData();
        const totalEarned = data.phones.reduce((sum, phone) => {
            return sum + calculatePhoneTotalEarned(phone);
        }, 0);

        const tasks = {
            date,
            tasks: [
                {
                    id: 'checkin',
                    name: '每日签到',
                    description: '完成每日签到',
                    target: 1,
                    current: 0,
                    completed: false,
                    reward: 10
                },
                {
                    id: 'edit_app',
                    name: '更新软件余额',
                    description: '更新任意软件的余额',
                    target: 1,
                    current: 0,
                    completed: false,
                    reward: 20
                },
                {
                    id: 'earn_goal',
                    name: '赚取目标金额',
                    description: '今日赚取达到目标金额',
                    target: 1,
                    current: 0,
                    completed: false,
                    reward: 30
                }
            ]
        };

        localStorage.setItem(DAILY_TASKS_KEY, JSON.stringify(tasks));
        return tasks;
    }

    // 更新任务进度
    static updateTaskProgress(taskId, progress = 1) {
        const tasks = this.getDailyTasks();
        const task = tasks.tasks.find(t => t.id === taskId);

        if (task && !task.completed) {
            task.current += progress;
            if (task.current >= task.target) {
                task.completed = true;
                task.current = task.target;
                // 完成任务获得经验
                this.addExp(task.reward);
            }
            localStorage.setItem(DAILY_TASKS_KEY, JSON.stringify(tasks));
        }

        return tasks;
    }

    // 保存每日任务
    static saveDailyTasks(tasks) {
        localStorage.setItem(DAILY_TASKS_KEY, JSON.stringify(tasks));
    }

    static addPhone(name) {
        const data = this.loadData();
        const today = new Date().toISOString().split('T')[0];
        const phone = {
            id: Date.now().toString(),
            name,
            apps: [],
            dailyTotalEarnedHistory: {
                [today]: 0
            }
        };
        data.phones.push(phone);
        this.saveData(data);
        return data;
    }

    static addApp(phoneId, appData) {
        const data = this.loadData();
        const phone = data.phones.find(p => p.id === phoneId);
        if (phone) {
            const today = new Date().toISOString().split('T')[0];
            const initialBalance = parseFloat(appData.balance) || 0;
            
            // 计算添加软件前的手机总赚取
            const oldTotalEarned = phone.apps.reduce((sum, a) => sum + (a.earned || 0), 0);
            
            const app = {
                id: Date.now().toString(),
                name: appData.name,
                minWithdraw: parseFloat(appData.minWithdraw) || 0.3,  // 默认最小提现0.3元
                balance: initialBalance,
                initialBalance: initialBalance,  // 保存初始基准值
                earned: 0,  // 第一次添加，earned 设为 0，从下次编辑开始记录收益
                withdrawn: 0,
                remainingWithdrawn: 0,
                historicalWithdrawn: 0,
                expenses: [],
                withdrawals: [],
                lastUpdated: new Date().toISOString(),
                dailyEarnedHistory: {},  // 第一次添加，不创建历史记录
                lastEditBalance: initialBalance  // 上次编辑时的余额（添加时不设置lastEditDate，第一次编辑时才设置）
            };
            phone.apps.push(app);

            // 更新手机的总赚取历史记录
            if (!phone.dailyTotalEarnedHistory) {
                phone.dailyTotalEarnedHistory = {};
            }
            // 第一次添加软件，不更新手机的历史记录
            // 只有编辑软件增加收益时才更新

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
                app.minWithdraw = parseFloat(appData.minWithdraw) || 0.3;  // 默认最小提现0.3元

                const oldBalance = app.balance || 0;
                const oldEarned = app.earned || 0;
                const newBalance = parseFloat(appData.balance) || 0;
                const formattedBalance = parseFloat(newBalance.toFixed(2));
                const balanceChange = formattedBalance - oldBalance;

                const today = new Date().toISOString().split('T')[0];
                if (!app.dailyEarnedHistory) {
                    app.dailyEarnedHistory = {};
                }
                
                // 检查是否是第一次设置余额（初始状态：balance为0，earned为0，且没有编辑过）
                // 使用 lastEditDate 来判断是否编辑过
                const hasEditedBefore = app.lastEditDate !== undefined;
                const isFirstTimeSetup = (oldBalance === 0 && oldEarned === 0 && !hasEditedBefore);
                
                // 更新已赚金额：如果余额增加，earned也增加；如果余额减少，earned不变（因为可能是提现）
                // 第一次设置余额时也记录收益（从0到X的变化）
                if (balanceChange > 0) {
                    // 余额增加，说明有新收入
                    app.earned = oldEarned + balanceChange;
                }
                // 如果余额减少，可能是提现，earned保持不变

                // 保存今天最终的已赚金额（使用新的计算方式）
                // 无论是否是第一次设置，都保存历史记录
                app.dailyEarnedHistory[today] = calculateAppEarned(app);

                app.balance = formattedBalance;
                app.historicalWithdrawn = appData.historicalWithdrawn || 0;
                app.lastUpdated = new Date().toISOString();
                
                // 保存上次编辑信息
                app.lastEditBalance = formattedBalance;
                app.lastEditDate = today;

                // 更新手机的总赚取历史记录
                if (!phone.dailyTotalEarnedHistory) {
                    phone.dailyTotalEarnedHistory = {};
                }
                // 计算当前手机总赚取（使用新的计算方式）
                const currentTotalEarned = calculatePhoneTotalEarned(phone);
                // 保存今天的最终总赚取（无论是否是第一次设置）
                phone.dailyTotalEarnedHistory[today] = currentTotalEarned;

                this.saveData(data);
                this.calculateYearlyGoal();
                
                // 更新每日任务进度（无论是否是第一次设置）
                this.updateTaskProgress('edit_app');
            }
        }
        return data;
    }

    // ==================== 游戏管理功能 ====================

    // 获取下载的游戏列表（过滤掉已删除的）
    static getDownloadedGames() {
        const games = localStorage.getItem(DOWNLOADED_GAMES_KEY);
        if (!games) return [];
        const allGames = JSON.parse(games);
        // 只返回未删除的游戏
        return allGames.filter(g => !g.deleted);
    }
    
    // 获取所有游戏（包括已删除的，用于判断是否是重新下载）
    static getAllGames() {
        const games = localStorage.getItem(DOWNLOADED_GAMES_KEY);
        return games ? JSON.parse(games) : [];
    }

    // 保存下载的游戏列表
    static saveDownloadedGames(games) {
        localStorage.setItem(DOWNLOADED_GAMES_KEY, JSON.stringify(games));
    }

    // 添加新下载的游戏
    static addDownloadedGame(gameName) {
        const games = this.getDownloadedGames();
        const allGames = this.getAllGames();
        const today = new Date().toISOString().split('T')[0];
        
        // 检查是否之前下载过这个游戏（已删除的）
        const deletedGame = allGames.find(g => 
            g.name === gameName && g.deleted === true
        );
        
        // 如果是重新下载，只需要玩3天
        const isRedownload = !!deletedGame;
        const targetDays = isRedownload ? 3 : 7;
        
        const game = {
            id: Date.now().toString(),
            name: gameName,
            downloadDate: today,
            daysPlayed: 0,
            completed: false,
            canDelete: false,
            lastPlayedDate: null,
            targetDays: targetDays,  // 目标天数（7天或3天）
            isRedownload: isRedownload  // 是否是重新下载
        };
        
        games.push(game);
        this.saveDownloadedGames(games);
        return game;
    }

    // 更新游戏游玩天数
    static updateGamePlayDay(gameId) {
        const games = this.getDownloadedGames();
        const game = games.find(g => g.id === gameId);
        
        if (game && !game.completed) {
            const today = new Date().toISOString().split('T')[0];
            
            // 检查今天是否已经记录过
            if (game.lastPlayedDate !== today) {
                game.daysPlayed++;
                game.lastPlayedDate = today;
                
                // 使用目标天数（7天或3天）
                const targetDays = game.targetDays || 7;
                if (game.daysPlayed >= targetDays) {
                    game.completed = true;
                    game.canDelete = true;
                }
                
                this.saveDownloadedGames(games);
            }
        }
        
        return game;
    }

    // 标记游戏为可删除
    static markGameForDeletion(gameId) {
        const games = this.getDownloadedGames();
        const game = games.find(g => g.id === gameId);
        
        if (game) {
            game.canDelete = true;
            this.saveDownloadedGames(games);
        }
        
        return game;
    }

    // 删除游戏（标记为已删除，保留记录用于判断是否是重新下载）
    static deleteGame(gameId) {
        const games = this.getDownloadedGames();
        const game = games.find(g => g.id === gameId);
        
        if (game) {
            // 标记为已删除，而不是真正删除
            game.deleted = true;
            game.deleteDate = new Date().toISOString().split('T')[0];
            this.saveDownloadedGames(games);
        }
        
        // 返回未删除的游戏列表（用于显示）
        return games.filter(g => !g.deleted);
    }

    // 获取今日要玩的游戏（抽签决定）
    static getTodayGameToPlay() {
        const games = this.getDownloadedGames();
        const today = new Date().toISOString().split('T')[0];
        
        // 过滤出未完成的游戏
        const activeGames = games.filter(g => !g.completed);
        
        if (activeGames.length === 0) {
            return null;
        }
        
        // 如果有多个游戏，随机选择一个
        const randomIndex = Math.floor(Math.random() * activeGames.length);
        const selectedGame = activeGames[randomIndex];
        
        // 更新该游戏的游玩天数
        this.updateGamePlayDay(selectedGame.id);
        
        // 保存抽签历史
        const targetDays = selectedGame.targetDays || 7;
        const drawHistory = this.getGameDrawHistory();
        drawHistory.unshift({
            date: today,
            gameId: selectedGame.id,
            gameName: selectedGame.name,
            daysPlayed: selectedGame.daysPlayed,
            remainingDays: targetDays - selectedGame.daysPlayed,
            targetDays: targetDays,
            isRedownload: selectedGame.isRedownload || false
        });
        
        // 只保留最近30天的记录
        if (drawHistory.length > 30) {
            drawHistory.pop();
        }
        
        this.saveGameDrawHistory(drawHistory);
        
        return selectedGame;
    }

    // 获取抽签历史
    static getGameDrawHistory() {
        const history = localStorage.getItem(GAME_DRAW_HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    }

    // 保存抽签历史
    static saveGameDrawHistory(history) {
        localStorage.setItem(GAME_DRAW_HISTORY_KEY, JSON.stringify(history));
    }

    // 获取游戏统计
    static getGameStats() {
        const games = this.getDownloadedGames();
        const today = new Date().toISOString().split('T')[0];
        
        return {
            totalGames: games.length,
            activeGames: games.filter(g => !g.completed).length,
            completedGames: games.filter(g => g.completed).length,
            canDeleteGames: games.filter(g => g.canDelete).length,
            todayGames: games.filter(g => g.lastPlayedDate === today).length
        };
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

    static addTotalExpense(expenseData) {
        const data = this.loadData();
        const expense = {
            id: Date.now().toString(),
            amount: parseFloat(expenseData.amount),
            purpose: expenseData.purpose,
            date: expenseData.date,
            created: new Date().toISOString()
        };
        
        data.expenses.push(expense);
        
        // 按比例分配支出到各个软件
        const totalWithdrawn = data.phones.flatMap(phone => phone.apps)
            .reduce((sum, app) => sum + (app.withdrawn || 0), 0);
        
        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                const appWithdrawn = app.withdrawn || 0;
                if (appWithdrawn > 0 && totalWithdrawn > 0) {
                    const ratio = appWithdrawn / totalWithdrawn;
                    const appExpense = parseFloat((ratio * expenseData.amount).toFixed(2));
                    
                    if (!app.expenses) {
                        app.expenses = [];
                    }
                    
                    const appExpenseObj = {
                        id: Date.now().toString() + Math.random(),
                        amount: appExpense,
                        purpose: expenseData.purpose,
                        date: expenseData.date,
                        created: new Date().toISOString()
                    };
                    
                    app.expenses.push(appExpenseObj);
                    app.remainingWithdrawn = parseFloat((app.remainingWithdrawn - appExpense).toFixed(2));
                    app.lastUpdated = new Date().toISOString();
                }
            });
        });
        
        this.saveData(data);
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
    
    static deletePhone(phoneId) {
        const data = this.loadData();
        data.phones = data.phones.filter(p => p.id !== phoneId);
        this.saveData(data);
        this.calculateYearlyGoal();
        return data;
    }

    // ==================== 游戏管理功能 ====================
    
    static addGame(phoneId, gameName) {
        const data = this.loadData();
        const phone = data.phones.find(p => p.id === phoneId);
        if (phone) {
            if (!phone.games) {
                phone.games = [];
            }
            const game = {
                id: Date.now().toString(),
                name: gameName,
                addedDate: new Date().toISOString()
            };
            phone.games.push(game);
            this.saveData(data);
        }
        return data;
    }
    
    static deleteGame(phoneId, gameId) {
        const data = this.loadData();
        const phone = data.phones.find(p => p.id === phoneId);
        if (phone && phone.games) {
            phone.games = phone.games.filter(g => g.id !== gameId);
            this.saveData(data);
        }
        return data;
    }
    
    static getGames(phoneId) {
        const data = this.loadData();
        const phone = data.phones.find(p => p.id === phoneId);
        return phone ? (phone.games || []) : [];
    }
    
    // ==================== 游戏抽签历史记录功能 ====================
    
    static addGameDrawHistory(phoneId, drawResult) {
        const data = this.loadData();
        const phone = data.phones.find(p => p.id === phoneId);
        if (phone) {
            if (!phone.gameDrawHistory) {
                phone.gameDrawHistory = [];
            }
            const historyItem = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                games: drawResult.map(game => ({
                    ...game,
                    completed: false
                }))
            };
            phone.gameDrawHistory.unshift(historyItem); // 最新的在前面
            // 只保留最近30天的记录
            if (phone.gameDrawHistory.length > 30) {
                phone.gameDrawHistory = phone.gameDrawHistory.slice(0, 30);
            }
            this.saveData(data);
        }
        return data;
    }
    
    static toggleGameCompleted(phoneId, historyId, gameIndex) {
        const data = this.loadData();
        const phone = data.phones.find(p => p.id === phoneId);
        if (phone && phone.gameDrawHistory) {
            const historyItem = phone.gameDrawHistory.find(h => h.id === historyId);
            if (historyItem && historyItem.games[gameIndex]) {
                historyItem.games[gameIndex].completed = !historyItem.games[gameIndex].completed;
                this.saveData(data);
            }
        }
        return data;
    }
    
    static getGameDrawHistory(phoneId) {
        const data = this.loadData();
        const phone = data.phones.find(p => p.id === phoneId);
        return phone ? (phone.gameDrawHistory || []) : [];
    }

    static clearAllData() {
        // 清除旧的存储键
        localStorage.removeItem(DATA_KEY);
        localStorage.removeItem('expandedPhones');
        
        // 清除新的分片存储键
        localStorage.removeItem(PHONES_KEY);
        localStorage.removeItem(INSTALLMENTS_KEY);
        localStorage.removeItem(EXPENSES_KEY);
        localStorage.removeItem(SETTINGS_KEY);
        
        // 清除提醒相关的存储键
        localStorage.removeItem('withdraw_reminder');
        localStorage.removeItem('daily_goal_reminder');
        
        // 清除所有分期提醒键
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('installment_reminder_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }
    
    // 主题相关方法
    static getTheme() {
        return localStorage.getItem('app-theme') || 'default';
    }
    
    static setTheme(theme) {
        localStorage.setItem('app-theme', theme);
    }

    // 分期还款相关方法
    static addInstallment(installmentData) {
        const data = this.loadData();
        const installment = {
            id: Date.now().toString(),
            platform: installmentData.platform,
            dueDate: installmentData.dueDate,
            amount: parseFloat(installmentData.amount),
            status: 'active',
            createdAt: new Date().toISOString()
        };
        data.installments.push(installment);
        this.saveData(data);
        return data;
    }

    static editInstallment(installmentId, installmentData) {
        const data = this.loadData();
        const installment = data.installments.find(i => i.id === installmentId);
        if (installment) {
            installment.platform = installmentData.platform;
            installment.dueDate = installmentData.dueDate;
            installment.amount = parseFloat(installmentData.amount);
            this.saveData(data);
        }
        return data;
    }

    static deleteInstallment(installmentId) {
        const data = this.loadData();
        data.installments = data.installments.filter(i => i.id !== installmentId);
        this.saveData(data);
        return data;
    }

    static calculateInstallmentGoals() {
        const data = this.loadData();
        const now = new Date();
        
        // 过滤出活跃的分期
        const activeInstallments = data.installments.filter(i => i.status === 'active');
        
        // 按还款日期排序
        activeInstallments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        
        // 计算所有软件
        const allApps = data.phones.flatMap(phone => phone.apps);
        
        // 计算待支出金额（总提现 - 总支出）
        const totalWithdrawnAmount = data.phones.reduce((sum, phone) => {
            return sum + phone.apps.reduce((appSum, app) => {
                return appSum + (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
            }, 0);
        }, 0);
        const totalExpenses = data.expenses ? data.expenses.reduce((sum, e) => sum + e.amount, 0) : 0;
        const pendingExpense = totalWithdrawnAmount - totalExpenses; // 待支出金额
        
        // 计算阶段性目标
        // 逻辑：每个阶段的每日目标 = 当前分期/当前分期天数 + 后续所有分期/各自总天数
        const phaseGoals = [];
        
        activeInstallments.forEach((installment, index) => {
            const dueDate = new Date(installment.dueDate);
            const daysRemaining = Math.max(0, Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24)));
            
            // 当前分期的每日目标
            let dailyTarget = 0;
            
            // 加上当前分期的每日目标
            const currentInstallmentDays = Math.max(0, Math.ceil((new Date(installment.dueDate) - new Date(installment.createdAt || now)) / (1000 * 60 * 60 * 24)));
            dailyTarget += installment.amount / (currentInstallmentDays || daysRemaining || 1);
            
            // 加上后续每个分期的每日目标（按各自总天数平均）
            for (let i = index + 1; i < activeInstallments.length; i++) {
                const nextInstallment = activeInstallments[i];
                const nextTotalDays = Math.max(0, Math.ceil((new Date(nextInstallment.dueDate) - new Date(nextInstallment.createdAt || now)) / (1000 * 60 * 60 * 24)));
                dailyTarget += nextInstallment.amount / (nextTotalDays || 1);
            }
            
            // 扣除待支出（按天数分摊）
            if (index === 0 && pendingExpense > 0) {
                dailyTarget = Math.max(0, dailyTarget - (pendingExpense / daysRemaining));
            }
            
            // 计算该阶段需要准备的总金额
            const remainingAmount = dailyTarget * daysRemaining;
            
            phaseGoals.push({
                installmentId: installment.id,
                platform: installment.platform,
                dueDate: installment.dueDate,
                daysRemaining,
                remainingAmount,
                dailyTarget,
                phaseName: index === 0 ? '第一阶段' : `第${index + 1}阶段`
            });
        });
        
        // 计算每个分期的详细目标
        const installmentGoals = activeInstallments.map((installment, index) => {
            const dueDate = new Date(installment.dueDate);
            const daysRemaining = Math.max(0, Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24)));
            
            // 该分期还需要赚取的金额
            let amountBeforeThis = 0;
            for (let i = 0; i < index; i++) {
                amountBeforeThis += activeInstallments[i].amount;
            }
            const remainingAmount = Math.max(0, installment.amount - amountBeforeThis - pendingExpense);
            
            // 每日目标
            const dailyTarget = daysRemaining > 0 ? remainingAmount / daysRemaining : 0;
            
            // 计算每个软件的目标金额
            const appGoals = allApps.map(app => {
                const appDailyTarget = dailyTarget / allApps.length;
                const appTotalTarget = remainingAmount / allApps.length;
                
                return {
                    appId: app.id,
                    appName: app.name,
                    phoneName: data.phones.find(p => p.apps.some(a => a.id === app.id))?.name || '',
                    dailyTarget: appDailyTarget,
                    totalTarget: appTotalTarget,
                    currentBalance: app.balance || 0,
                    currentWithdrawn: app.withdrawn || 0,
                    progress: appTotalTarget > 0 ? Math.min(100, ((app.withdrawn || 0) / appTotalTarget) * 100) : 100
                };
            });
            
            return {
                ...installment,
                daysRemaining,
                remainingAmount,     // 该分期还需赚取的金额
                dailyTarget,         // 该分期的每日目标
                pendingExpense,      // 待支出金额
                phaseName: index === 0 ? '第一阶段' : `第${index + 1}阶段`,
                appGoals,
                totalProgress: appGoals.reduce((sum, goal) => sum + goal.progress, 0) / appGoals.length || 0
            };
        });
        
        return {
            installments: installmentGoals,
            phaseGoals
        };
    }

    static getInstallmentSummary() {
        const data = this.loadData();
        const { installments } = this.calculateInstallmentGoals();
        
        // 计算总体情况
        const totalInstallmentAmount = installments.reduce((sum, goal) => sum + goal.amount, 0);
        const totalDaysRemaining = installments.length > 0 ? 
            Math.min(...installments.map(goal => goal.daysRemaining)) : 0;
        
        // 计算待支出金额（总提现 - 总支出）
        const totalWithdrawnAmount = data.phones.reduce((sum, phone) => {
            return sum + phone.apps.reduce((appSum, app) => {
                return appSum + (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
            }, 0);
        }, 0);
        const totalExpenses = data.expenses ? data.expenses.reduce((sum, e) => sum + e.amount, 0) : 0;
        const pendingExpense = totalWithdrawnAmount - totalExpenses; // 待支出金额
        
        // 待提现金额 = 总还款金额 - 待支出余额
        const pendingWithdrawal = Math.max(0, totalInstallmentAmount - pendingExpense);
        
        // 进度 = 待支出 / 总还款金额
        // 表示已经准备好可以立即用于还款的金额比例
        const overallProgress = totalInstallmentAmount > 0 ? 
            Math.min(100, (pendingExpense / totalInstallmentAmount) * 100) : 0;
        
        return {
            totalInstallmentAmount,
            totalDaysRemaining,
            pendingExpense,        // 待支出金额（原已提现金额）
            pendingWithdrawal,     // 待提现金额
            overallProgress        // 进度 = 待支出 / 待提现
        };
    }
}

// 全局状态
let currentPhoneId = null;
let currentAppId = null;
let expandedPhones = {};
let currentTodayEarnPhoneId = null;
let currentTodayEarnTab = 'phone'; // 'phone' 或 'app'

// 手机抽签历史记录存储键
const PHONE_DRAW_HISTORY_KEY = 'phoneDrawHistory';

// 获取手机抽签历史
function getPhoneDrawHistory() {
    const history = localStorage.getItem(PHONE_DRAW_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
}

// 保存手机抽签历史
function savePhoneDrawHistory(history) {
    localStorage.setItem(PHONE_DRAW_HISTORY_KEY, JSON.stringify(history));
}

// 打开手机抽签弹窗
function openPhoneDrawModal() {
    const modal = document.getElementById('phone-draw-modal');
    modal.style.display = 'flex';
    modal.classList.add('show');
    renderPhoneDrawHistory();
}

// 关闭手机抽签弹窗
function closePhoneDrawModal() {
    const modal = document.getElementById('phone-draw-modal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// 显示手机抽签历史
function showPhoneDrawHistory() {
    openPhoneDrawModal();
}

// 开始手机抽签
function startPhoneDraw() {
    const data = DataManager.loadData();
    
    if (data.phones.length === 0) {
        showToast('请先添加手机');
        return;
    }
    
    // 随机打乱手机顺序
    const shuffledPhones = [...data.phones].sort(() => Math.random() - 0.5);
    
    // 为每个手机的软件也随机排序
    const phoneDrawResult = shuffledPhones.map(phone => {
        const shuffledApps = [...phone.apps].sort(() => Math.random() - 0.5);
        return {
            phoneId: phone.id,
            phoneName: phone.name,
            apps: shuffledApps.map(app => ({
                appId: app.id,
                appName: app.name,
                minWithdraw: app.minWithdraw || 0.3
            }))
        };
    });
    
    // 保存到历史记录
    const now = new Date();
    const historyEntry = {
        id: Date.now().toString(),
        date: now.toISOString(),
        dateStr: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
        result: phoneDrawResult
    };
    
    const history = getPhoneDrawHistory();
    history.unshift(historyEntry); // 添加到开头
    // 只保留最近30条记录
    if (history.length > 30) {
        history.pop();
    }
    savePhoneDrawHistory(history);
    
    // 显示结果
    renderPhoneDrawResult(historyEntry);
    
    showToast('手机抽签完成！');
}

// 渲染手机抽签结果
function renderPhoneDrawResult(entry) {
    const dateEl = document.getElementById('phone-draw-date');
    const listEl = document.getElementById('phone-draw-list');
    
    dateEl.textContent = entry.dateStr;
    
    listEl.innerHTML = entry.result.map((phone, phoneIndex) => `
        <div class="draw-result-item" style="margin-bottom: 20px; border: 2px solid var(--border-color); border-radius: var(--radius-lg); padding: 16px;">
            <div class="draw-result-header" style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed var(--border-color);">
                <span class="draw-result-rank" style="font-size: 24px; font-weight: bold; color: var(--primary-color);">${phoneIndex + 1}</span>
                <span class="draw-result-name" style="font-size: 18px; font-weight: 600; color: var(--text-primary);">📱 ${phone.phoneName}</span>
            </div>
            <div class="draw-result-apps" style="padding-left: 36px;">
                <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">软件顺序：</div>
                ${phone.apps.length > 0 ? phone.apps.map((app, appIndex) => `
                    <div class="draw-result-app-item" style="display: flex; align-items: center; gap: 8px; padding: 6px 0; color: var(--text-primary);">
                        <span style="color: var(--text-secondary); font-size: 12px;">${appIndex + 1}.</span>
                        <span>${app.appName}</span>
                        <span style="color: var(--text-secondary); font-size: 12px; margin-left: auto;">(最小提现: ¥${(app.minWithdraw || 0.3).toFixed(2)})</span>
                    </div>
                `).join('') : '<div style="color: var(--text-secondary); font-size: 14px;">暂无软件</div>'}
            </div>
        </div>
    `).join('');
}

// 渲染手机抽签历史
function renderPhoneDrawHistory() {
    const history = getPhoneDrawHistory();
    const listEl = document.getElementById('phone-draw-history-list');
    
    if (history.length === 0) {
        listEl.innerHTML = '<div class="empty-state">暂无抽签历史</div>';
        return;
    }
    
    listEl.innerHTML = history.map((entry, index) => `
        <div class="game-history-item" style="padding: 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-bottom: 8px; cursor: pointer;" onclick="showPhoneDrawResultById('${entry.id}')">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 500;">${entry.dateStr}</span>
                <span style="color: var(--text-secondary); font-size: 14px;">${entry.result.length} 部手机</span>
            </div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                ${entry.result.map(p => p.phoneName).join('、')}
            </div>
        </div>
    `).join('');
}

// 根据ID显示手机抽签结果
function showPhoneDrawResultById(id) {
    const history = getPhoneDrawHistory();
    const entry = history.find(h => h.id === id);
    if (entry) {
        renderPhoneDrawResult(entry);
    }
}

// 初始化
function init() {
    // 加载展开状态
    const savedExpanded = localStorage.getItem('expandedPhones');
    if (savedExpanded) {
        expandedPhones = JSON.parse(savedExpanded);
    }
    
    // 初始化主题
    initTheme();
    
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
    
    // 初始化提醒系统
    initNotificationSystem();
    checkReminders();
}

// 初始化主题
function initTheme() {
    const savedTheme = DataManager.getTheme();
    applyTheme(savedTheme);
}

// 应用主题
function applyTheme(theme) {
    if (theme === 'default') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
    updateThemeSelector(theme);
}

// 设置主题
function setTheme(theme) {
    DataManager.setTheme(theme);
    applyTheme(theme);
    showSuccess(`主题已切换为${getThemeName(theme)}`);
}

// 获取主题名称
function getThemeName(theme) {
    const themeNames = {
        'default': '梦幻紫',
        'youth-green': '青春绿',
        'vitality-orange': '活力橙',
        'ocean-blue': '海洋蓝',
        'sweet-pink': '甜美粉',
        'warm-sunset': '温暖夕阳'
    };
    return themeNames[theme] || '梦幻紫';
}

// 更新主题选择器状态
function updateThemeSelector(currentTheme) {
    const themeItems = document.querySelectorAll('.theme-item');
    themeItems.forEach(item => {
        const itemTheme = item.getAttribute('data-theme');
        if (itemTheme === currentTheme) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// 初始化通知系统
function initNotificationSystem() {
    // 请求通知权限
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('通知权限已获取');
                }
            });
        }
    }
}

// 发送浏览器通知
function sendNotification(title, body, icon = '💰') {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body: body,
            icon: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${icon}</text></svg>`
        });
        
        notification.onclick = function() {
            window.focus();
            notification.close();
        };
        
        // 3秒后自动关闭
        setTimeout(() => notification.close(), 3000);
    }
}

// 检查所有提醒
function checkReminders() {
    checkInstallmentReminders();
    checkWithdrawReminders();
    checkDailyGoalReminders();
}

// 分期还款提醒
function checkInstallmentReminders() {
    const data = DataManager.loadData();
    const now = new Date();
    
    data.installments.forEach(installment => {
        if (installment.status !== 'active') return;
        
        const dueDate = new Date(installment.dueDate);
        const daysRemaining = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        
        // 提前3天、1天提醒
        if (daysRemaining <= 3 && daysRemaining > 0) {
            const lastReminder = localStorage.getItem(`installment_reminder_${installment.id}`);
            const todayStr = now.toISOString().split('T')[0];
            
            // 每天只提醒一次
            if (lastReminder !== todayStr) {
                sendNotification(
                    '分期还款提醒',
                    `${installment.platform} 还款日期还有 ${daysRemaining} 天，请及时准备！`,
                    '💳'
                );
                localStorage.setItem(`installment_reminder_${installment.id}`, todayStr);
            }
        } else if (daysRemaining <= 0) {
            // 已过期提醒
            sendNotification(
                '分期还款逾期提醒',
                `${installment.platform} 已过期 ${Math.abs(daysRemaining)} 天，请尽快处理！`,
                '⚠️'
            );
        }
    });
}

// 提现提醒
function checkWithdrawReminders() {
    const data = DataManager.loadData();
    const readyApps = [];
    
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            if (app.balance >= app.minWithdraw) {
                readyApps.push({
                    phoneName: phone.name,
                    appName: app.name,
                    balance: app.balance
                });
            }
        });
    });
    
    if (readyApps.length > 0) {
        const lastReminder = localStorage.getItem('withdraw_reminder');
        const todayStr = new Date().toISOString().split('T')[0];
        
        // 每天只提醒一次
        if (lastReminder !== todayStr) {
            const appNames = readyApps.map(app => `${app.phoneName}-${app.appName}`).join('、');
            sendNotification(
                '提现提醒',
                `以下软件已达到提现门槛：${appNames}`,
                '💵'
            );
            localStorage.setItem('withdraw_reminder', todayStr);
        }
    }
}

// 每日目标提醒
function checkDailyGoalReminders() {
    const data = DataManager.loadData();
    const now = new Date();
    const startDate = new Date('2026-01-01');
    const daysFromStart = Math.floor((now - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    let totalEarnedToday = 0;
    let totalTargetToday = 0;
    
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            const dailyTarget = app.minWithdraw;
            totalTargetToday += dailyTarget;
            
            // 计算今日已赚（简化计算）
            const earned = app.earned || app.balance || 0;
            const yesterdayEarned = Math.max(0, earned - dailyTarget);
            totalEarnedToday += Math.max(0, earned - yesterdayEarned);
        });
    });
    
    const progress = totalTargetToday > 0 ? (totalEarnedToday / totalTargetToday) * 100 : 0;
    
    // 如果进度低于50%，发送提醒
    if (progress < 50 && totalTargetToday > 0) {
        const lastReminder = localStorage.getItem('daily_goal_reminder');
        const todayStr = now.toISOString().split('T')[0];
        
        // 每天只提醒一次
        if (lastReminder !== todayStr) {
            sendNotification(
                '每日目标提醒',
                `今日目标完成度：${progress.toFixed(0)}%，还需努力！目标：¥${totalTargetToday.toFixed(2)}`,
                '🎯'
            );
            localStorage.setItem('daily_goal_reminder', todayStr);
        }
    }
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
    document.getElementById('installments-current-date').textContent = dateStr;
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
    if (pageName === 'installments') renderInstallments();
    if (pageName === 'today-earn') renderTodayEarnPage();
    if (pageName === 'games') renderGamesPage();
    
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

// 显示今日赚取页面
function showTodayEarnPage(phoneId) {
    currentTodayEarnPhoneId = phoneId;
    currentTodayEarnTab = 'phone';
    
    const data = DataManager.loadData();
    const phone = data.phones.find(p => p.id === phoneId);
    if (phone) {
        document.getElementById('today-earn-title').textContent = `${phone.name} - 今日赚取`;
    }
    
    // 重置切换按钮状态
    document.getElementById('tab-phone-earn').classList.add('active');
    document.getElementById('tab-app-earn').classList.remove('active');
    document.getElementById('phone-earn-content').classList.remove('hidden');
    document.getElementById('app-earn-content').classList.add('hidden');
    
    showPage('today-earn');
}

// 切换今日赚取标签页
function switchTodayEarnTab(tab) {
    currentTodayEarnTab = tab;
    
    // 更新按钮状态
    document.getElementById('tab-phone-earn').classList.toggle('active', tab === 'phone');
    document.getElementById('tab-app-earn').classList.toggle('active', tab === 'app');
    
    // 显示/隐藏内容
    document.getElementById('phone-earn-content').classList.toggle('hidden', tab !== 'phone');
    document.getElementById('app-earn-content').classList.toggle('hidden', tab !== 'app');
    
    // 重新渲染
    renderTodayEarnPage();
}

// 渲染今日赚取页面
function renderTodayEarnPage() {
    if (!currentTodayEarnPhoneId) return;
    
    const data = DataManager.loadData();
    const phone = data.phones.find(p => p.id === currentTodayEarnPhoneId);
    if (!phone) return;
    
    if (currentTodayEarnTab === 'phone') {
        renderPhoneEarnContent(phone, data);
    } else {
        renderAppEarnContent(phone, data);
    }
}

// 渲染手机今日赚取内容
function renderPhoneEarnContent(phone, data) {
    const settings = data.settings;
    const yearlyGoal = settings.yearlyGoal || 0;
    const phoneCount = data.phones.length || 1;
    const currentYear = getCurrentYear();
    const yearDays = getYearDays(currentYear);
    const dailyTarget = yearlyGoal > 0 ? yearlyGoal / yearDays / phoneCount : 0;
    
    // 收集所有历史记录
    const allDates = new Set();
    const dateStats = {};
    
    phone.apps.forEach(app => {
        const history = app.dailyEarnedHistory || {};
        Object.keys(history).forEach(date => {
            allDates.add(date);
            if (!dateStats[date]) {
                dateStats[date] = {
                    totalEarned: 0,
                    totalTarget: dailyTarget,
                    apps: []
                };
            }
        });
    });
    
    // 计算每天的赚取情况
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(b) - new Date(a));
    
    // 计算今日数据
    const today = new Date().toISOString().split('T')[0];
    const phoneHistory = phone.dailyTotalEarnedHistory || {};
    // 使用新的计算函数获取当前总已赚金额
    const currentTotalEarned = calculatePhoneTotalEarned(phone);
    
    // 找到昨天结束时的总赚取作为今天开始的基准
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let yesterdayTotal = phoneHistory[yesterday];
    
    if (yesterdayTotal === undefined) {
        // 昨天没有记录，找昨天之前最后一次记录
        const datesBeforeYesterday = Object.keys(phoneHistory)
            .filter(d => d <= yesterday)
            .sort();
        
        if (datesBeforeYesterday.length > 0) {
            // 找到小于等于昨天的最大日期
            yesterdayTotal = phoneHistory[datesBeforeYesterday[datesBeforeYesterday.length - 1]];
        } else {
            // 昨天之前没有任何记录，基准为0
            yesterdayTotal = 0;
        }
    }
    
    // 今日赚取 = 当前总赚取 - 昨天结束时的总赚取
    const todayEarned = Math.max(0, currentTotalEarned - yesterdayTotal);

    const progress = dailyTarget > 0 ? Math.min(100, Math.round((todayEarned / dailyTarget) * 100)) : 0;
    
    // 更新概览数据
    document.getElementById('phone-daily-target').textContent = `¥${dailyTarget.toFixed(2)}`;
    document.getElementById('phone-today-earned').textContent = `¥${todayEarned.toFixed(2)}`;
    document.getElementById('phone-today-progress').textContent = `${progress}%`;
    document.getElementById('phone-progress-fill').style.width = `${progress}%`;
    
    // 渲染每日赚取记录 - 基于手机整体数据
    const container = document.getElementById('phone-earn-records');
    
    // 获取所有历史日期，并确保包含今天
    const phoneAllDates = new Set(Object.keys(phoneHistory));
    phoneAllDates.add(today);
    const phoneHistoryDates = Array.from(phoneAllDates).sort((a, b) => new Date(b) - new Date(a));

    if (phoneHistoryDates.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无赚取记录</div>';
        return;
    }

    // 按日期计算每天的手机总赚取
    let html = '';
    phoneHistoryDates.forEach((date, index) => {
        const dateTotal = phoneHistory[date];

        let dayEarned = 0;
        
        // 如果是今天，使用实时计算的值
        if (date === today) {
            dayEarned = todayEarned;
        } else if (dateTotal !== undefined) {
            // 找到前一天的记录来计算当日赚取
            const dateObj = new Date(date);
            const prevDate = new Date(dateObj - 86400000).toISOString().split('T')[0];
            let prevTotal = phoneHistory[prevDate];

            if (prevTotal === undefined) {
                // 找最近的历史记录
                const dates = Object.keys(phoneHistory).filter(d => d < date).sort();
                if (dates.length > 0) {
                    prevTotal = phoneHistory[dates[dates.length - 1]];
                } else {
                    prevTotal = 0;
                }
            }
            dayEarned = Math.max(0, dateTotal - prevTotal);
        }

        // 显示所有日期（包括今天，即使没有赚取）
        const dayProgress = dailyTarget > 0 ? Math.min(100, Math.round((dayEarned / dailyTarget) * 100)) : 0;

        // 对于今天，显示当前总赚取；对于历史日期，显示记录的总赚取
        const displayTotal = date === today ? currentTotalEarned : (dateTotal || currentTotalEarned);
        
        // 判断是否是今天
        const isToday = date === today;
        const todayLabel = isToday ? ' (今天)' : '';
        
        html += `
            <div class="earn-date-group ${isToday ? 'today' : ''}">
                <div class="earn-date-header">
                    <div class="earn-date">${date}${todayLabel}</div>
                    <div class="earn-date-stats">
                        <span class="earn-date-total">+¥${dayEarned.toFixed(2)}</span>
                        <span class="earn-date-progress">${dayProgress}%</span>
                    </div>
                </div>
                <div class="earn-record-item">
                    <div class="earn-record-header">
                        <span class="earn-record-name">${phone.name}</span>
                        <span class="earn-record-amount">总赚取: ¥${displayTotal.toFixed(2)}</span>
                    </div>
                    <div class="earn-record-details">
                        <span class="earn-record-target">当日新增: +¥${dayEarned.toFixed(2)} | 当日目标: ¥${dailyTarget.toFixed(2)}</span>
                    </div>
                    <div class="earn-record-progress">
                        <div class="earn-progress-bar">
                            <div class="earn-progress-fill" style="width: ${dayProgress}%"></div>
                        </div>
                        <span class="earn-progress-text">${dayProgress}%</span>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html || '<div class="empty-state">暂无赚取记录</div>';
}

// 获取软件在指定日期的已赚金额（使用新的计算方式）
function getAppEarnedOnDate(app, date) {
    const history = app.dailyEarnedHistory || {};
    
    // 如果历史记录中有该日期，直接返回
    if (history[date] !== undefined) {
        return history[date];
    }
    
    // 找到该日期之前（严格小于）的历史记录
    const dates = Object.keys(history).filter(d => d < date).sort();
    if (dates.length > 0) {
        return history[dates[dates.length - 1]];
    }
    
    // 如果没有历史记录，说明该日期之前没有编辑过
    // 返回初始状态（只有初始基准值，没有赚取）
    return 0;
}

// 渲染软件今日赚取内容
function renderAppEarnContent(phone, data) {
    // 计算该手机的每日目标
    const settings = data.settings;
    const yearlyGoal = settings.yearlyGoal || 0;
    const phoneCount = data.phones.length || 1;
    const currentYear = getCurrentYear();
    const yearDays = getYearDays(currentYear);
    const phoneDailyTarget = yearlyGoal > 0 ? yearlyGoal / yearDays / phoneCount : 0;
    
    // 计算每个软件的每日目标（手机每日目标除以软件数量）
    const appCount = phone.apps.length || 1;
    const appDailyTarget = phoneDailyTarget / appCount;
    
    // 收集所有日期
    const allDates = new Set();
    const today = new Date().toISOString().split('T')[0];
    
    phone.apps.forEach(app => {
        const history = app.dailyEarnedHistory || {};
        Object.keys(history).forEach(date => allDates.add(date));
    });
    // 确保包含今天
    allDates.add(today);
    
    // 按日期降序排序
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(b) - new Date(a));
    
    // 渲染软件记录
    const container = document.getElementById('app-earn-records');
    if (phone.apps.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无软件</div>';
        return;
    }
    
    let html = '';
    
    // 按日期分组显示每个软件的收益情况
    sortedDates.forEach(date => {
        let dayHtml = '';
        let hasEarnedOnThisDay = false;
        let dayTotalEarned = 0;
        
        phone.apps.forEach(app => {
            // 获取当天结束时的已赚金额
            const dateEarned = getAppEarnedOnDate(app, date);
            
            // 获取前一天结束时的已赚金额
            const dateObj = new Date(date);
            const prevDate = new Date(dateObj - 86400000).toISOString().split('T')[0];
            const prevEarned = getAppEarnedOnDate(app, prevDate);
            
            // 计算当日赚取 = 当天结束值 - 前一天结束值
            let displayEarned = 0;
            let hasRealChange = false;
            
            if (date === today) {
                // 对于今天，计算今日新增 = 当前余额 - 昨天结束时的余额
                const currentBalance = app.balance || 0;
                
                // 获取昨天结束时的余额
                const yesterdayEarned = getAppEarnedOnDate(app, prevDate);
                const yesterdayBalance = yesterdayEarned - (app.withdrawn || 0) - (app.historicalWithdrawn || 0) + (app.initialBalance || 0);
                
                // 检查今天是否有编辑记录
                const history = app.dailyEarnedHistory || {};
                const hasEditToday = history[today] !== undefined;
                
                if (hasEditToday) {
                    // 今天有编辑，计算从昨天结束到现在的总变化
                    displayEarned = Math.max(0, currentBalance - yesterdayBalance);
                } else {
                    // 今天没有编辑，但自动保存今天的最终状态
                    // 这样明天就能和今天比较
                    const todayEarned = calculateAppEarned(app);
                    history[today] = todayEarned;
                    displayEarned = 0;
                }
                
                hasRealChange = hasEditToday && displayEarned > 0;
            } else {
                // 对于历史日期
                displayEarned = Math.max(0, dateEarned - prevEarned);
                hasRealChange = displayEarned > 0;
            }
            
            // 只显示有实际赚取且今天有编辑记录的软件（对于今天）
            if (displayEarned > 0 && (date !== today || hasRealChange)) {
                hasEarnedOnThisDay = true;
                dayTotalEarned += displayEarned;
                const progress = appDailyTarget > 0 ? Math.min(100, Math.round((displayEarned / appDailyTarget) * 100)) : 0;
                
                dayHtml += `
                    <div class="app-earn-record">
                        <div class="app-earn-date-row">
                            <span class="app-earn-name">${app.name}</span>
                            <span class="app-earn-amount">+¥${displayEarned.toFixed(2)}</span>
                        </div>
                        <div class="app-earn-progress-row">
                            <div class="earn-progress-bar">
                                <div class="earn-progress-fill" style="width: ${progress}%"></div>
                            </div>
                            <span class="earn-progress-text">${progress}%</span>
                            <span class="app-earn-target">目标: ¥${appDailyTarget.toFixed(2)}</span>
                        </div>
                    </div>
                `;
            }
        });
        
        // 显示所有日期（包括今天，即使没有赚取）
        const isToday = date === today;
        const todayLabel = isToday ? ' (今天)' : '';
        
        // 计算该日总进度
        const totalTarget = appDailyTarget * phone.apps.length;
        const dayProgress = totalTarget > 0 ? Math.min(100, Math.round((dayTotalEarned / totalTarget) * 100)) : 0;
        
        html += `
            <div class="earn-date-group ${isToday ? 'today' : ''}">
                <div class="earn-date-header">
                    <div class="earn-date">${date}${todayLabel}</div>
                    <div class="earn-date-stats">
                        <span class="earn-date-total">+¥${dayTotalEarned.toFixed(2)}</span>
                        <span class="earn-date-progress">${dayProgress}%</span>
                    </div>
                </div>
                ${dayHtml || '<div class="empty-state" style="padding: 12px;">当日无赚取记录</div>'}
            </div>
        `;
    });
    
    container.innerHTML = html || '<div class="empty-state">暂无软件赚取记录</div>';
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
    
    // 计算待支出余额（总提现金额 - 总支出金额）
    const totalWithdrawnAmount = data.phones.reduce((sum, phone) => {
        return sum + phone.apps.reduce((appSum, app) => {
            return appSum + (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
        }, 0);
    }, 0);
    const totalExpenses = data.expenses ? data.expenses.reduce((sum, e) => sum + e.amount, 0) : 0;
    const pendingExpenseBalance = totalWithdrawnAmount - totalExpenses;
    const readyApps = data.phones.reduce((sum, phone) => {
        return sum + phone.apps.filter(app => (app.balance || 0) >= (app.minWithdraw || 0)).length;
    }, 0);
    
    // 全年目标进度
    const yearlyGoal = data.settings.yearlyGoal || 10000;
    const yearlyProgress = yearlyGoal > 0 ? Math.min((totalEarned / yearlyGoal) * 100, 100) : 0;
    
    // 更新DOM
    document.getElementById('total-phones').textContent = totalPhones;
    document.getElementById('total-apps').textContent = totalApps;
    document.getElementById('total-balance').textContent = `¥${pendingExpenseBalance.toFixed(2)}`;
    document.getElementById('ready-apps').textContent = readyApps;
    document.getElementById('yearly-progress').textContent = `${yearlyProgress.toFixed(0)}%`;
    document.getElementById('yearly-progress-bar').style.width = `${yearlyProgress}%`;
    
    // 渲染今日需要关注的软件
    renderTodayApps(data);
    
    // 更新用户等级和签到信息
    renderUserLevelAndCheckIn();
    
    // 渲染每日任务
    renderDailyTasks();
    
    // 检查成就
    const newAchievements = DataManager.checkAchievements();
    if (newAchievements.length > 0) {
        newAchievements.forEach(achievement => {
            showToast(`🎉 解锁成就: ${achievement}`);
        });
    }
}

// 渲染用户等级和签到信息
function renderUserLevelAndCheckIn() {
    const level = DataManager.getUserLevel();
    const checkIn = DataManager.getCheckInData();
    const today = new Date().toISOString().split('T')[0];
    
    // 更新等级信息
    document.getElementById('user-level-title').textContent = `Lv.${level.level} ${level.title}`;
    const expNeeded = DataManager.getExpForLevel(level.level);
    document.getElementById('user-exp').textContent = `经验值: ${level.exp}/${expNeeded}`;
    document.getElementById('exp-progress-bar').style.width = `${(level.exp / expNeeded) * 100}%`;
    
    // 更新签到信息
    document.getElementById('consecutive-days').textContent = checkIn.consecutiveDays;
    document.getElementById('total-checkin-days').textContent = checkIn.totalDays;
    
    // 更新签到按钮状态
    const checkInBtn = document.getElementById('checkin-btn');
    if (checkIn.lastCheckIn === today) {
        checkInBtn.textContent = '已签到';
        checkInBtn.disabled = true;
        checkInBtn.style.opacity = '0.6';
    } else {
        checkInBtn.textContent = '每日签到';
        checkInBtn.disabled = false;
        checkInBtn.style.opacity = '1';
    }
}

// 执行每日签到
function doDailyCheckIn() {
    const result = DataManager.doCheckIn();
    
    if (result.success) {
        showToast(`✅ 签到成功！连续${result.consecutiveDays}天`);
        
        // 更新任务进度
        DataManager.updateTaskProgress('checkin');
        
        // 如果有新成就
        if (result.newAchievement) {
            setTimeout(() => {
                showToast(`🎉 解锁成就: ${result.newAchievement}`);
            }, 1000);
        }
        
        // 重新渲染
        renderUserLevelAndCheckIn();
        renderDailyTasks();
    } else {
        showToast(result.message);
    }
}

// 渲染每日任务
function renderDailyTasks() {
    const tasksData = DataManager.getDailyTasks();
    const container = document.getElementById('daily-tasks-list');
    
    if (tasksData.tasks.length === 0) {
        container.innerHTML = '<div class="empty-state">今日无任务</div>';
        return;
    }
    
    container.innerHTML = tasksData.tasks.map(task => `
        <div class="task-item" style="display: flex; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-color); ${task.completed ? 'opacity: 0.6;' : ''}">
            <div style="flex: 1;">
                <div style="font-weight: 500; ${task.completed ? 'text-decoration: line-through;' : ''}">${task.name}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">${task.description}</div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 14px; color: var(--primary-color); font-weight: 600;">+${task.reward}EXP</div>
                <div style="font-size: 12px; color: var(--text-secondary);">${task.completed ? '已完成' : `${task.current}/${task.target}`}</div>
            </div>
            ${task.completed ? '<span style="color: #22c55e; margin-left: 8px;">✓</span>' : ''}
        </div>
    `).join('');
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
            // 使用统一函数计算已赚金额
            const earned = calculateAppEarned(app);
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
        const totalEarned = calculatePhoneTotalEarned(phone);
        
        // 计算该手机的总余额
        const totalBalance = phone.apps.reduce((sum, app) => {
            return sum + (app.balance || 0);
        }, 0);
        
        // 计算每日目标和进度
        const settings = DataManager.loadData().settings;
        const yearlyGoal = settings.yearlyGoal || 0;
        const phoneCount = data.phones.length || 1;
        const currentYear = getCurrentYear();
        const yearDays = getYearDays(currentYear);
        const dailyTarget = yearlyGoal > 0 ? yearlyGoal / yearDays / phoneCount : 0;
        
        // 计算今日已赚：手机总赚取金额相比昨天结束时的变化
        const today = new Date().toISOString().split('T')[0];
        const history = phone.dailyTotalEarnedHistory || {};
        // 使用新的计算函数获取当前总已赚金额
        const currentTotalEarned = calculatePhoneTotalEarned(phone);
        
        // 找到昨天结束时的总赚取作为今天开始的基准
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        let yesterdayTotal = history[yesterday];
        
        if (yesterdayTotal === undefined) {
            // 昨天没有记录，找昨天之前最后一次记录
            const datesBeforeYesterday = Object.keys(history)
                .filter(d => d <= yesterday)
                .sort();
            
            if (datesBeforeYesterday.length > 0) {
                // 找到小于等于昨天的最大日期
                yesterdayTotal = history[datesBeforeYesterday[datesBeforeYesterday.length - 1]];
            } else {
                // 昨天之前没有任何记录，基准为0
                yesterdayTotal = 0;
            }
        }
        
        // 今日赚取 = 当前总赚取 - 昨天结束时的总赚取
        const todayEarned = Math.max(0, currentTotalEarned - yesterdayTotal);

        const progress = dailyTarget > 0 ? Math.min(100, Math.round((todayEarned / dailyTarget) * 100)) : 0;
        
        // 根据索引选择胶囊颜色
        const capsuleColors = ['purple', 'green', 'blue', 'orange', 'pink', 'cyan'];
        const capsuleColor = capsuleColors[index % capsuleColors.length];
        
        return `
            <div class="phone-card" data-phone-id="${phone.id}" data-index="${index}">
                <div class="phone-header">
                    <div class="phone-header-top">
                        <span class="phone-name-capsule capsule-${capsuleColor}" onclick="editPhoneName('${phone.id}')">${phone.name}</span>
                        <div class="phone-header-actions">
                            <button class="btn-today-earn" onclick="showTodayEarnPage('${phone.id}')" title="今日赚取">📊 今日赚取</button>
                            <button class="btn-game-draw" onclick="openGameDrawModal('${phone.id}')" title="游戏抽签">🎮 游戏抽签</button>
                            <div class="phone-icon-buttons">
                                <button class="icon-btn icon-btn-add" onclick="openAddAppModal('${phone.id}')" title="添加软件">+</button>
                                <button class="icon-btn icon-btn-delete" onclick="deletePhone('${phone.id}')" title="删除手机">🗑️</button>
                                <button class="btn btn-icon" onclick="togglePhoneExpand('${phone.id}')">
                                    ${isExpanded ? '▼' : '▶'}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="phone-header-stats">
                        <div class="phone-stat-item">
                            <span class="stat-icon">💰</span>
                            <div class="stat-content">
                                <span class="stat-label">总赚取</span>
                                <span class="stat-value">¥${totalEarned.toFixed(2)}</span>
                            </div>
                        </div>
                        <div class="phone-stat-item">
                            <span class="stat-icon">💳</span>
                            <div class="stat-content">
                                <span class="stat-label">总余额</span>
                                <span class="stat-value">¥${totalBalance.toFixed(2)}</span>
                            </div>
                        </div>
                        <div class="phone-stat-item daily-stat">
                            <div class="daily-info">
                                <div class="daily-row">
                                    <span class="daily-label">目标</span>
                                    <span class="daily-value">¥${dailyTarget.toFixed(2)}</span>
                                </div>
                                <div class="daily-row">
                                    <span class="daily-label">已赚</span>
                                    <span class="daily-value earned">¥${todayEarned.toFixed(2)}</span>
                                </div>
                            </div>
                            <div class="daily-progress-ring">
                                <svg viewBox="0 0 36 36" class="circular-chart">
                                    <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    <path class="circle" stroke-dasharray="${progress}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    <text x="18" y="20.35" class="percentage">${progress}%</text>
                                </svg>
                            </div>
                        </div>
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

    // 计算该手机的每日目标
    const data = DataManager.loadData();
    const settings = data.settings;
    const yearlyGoal = settings.yearlyGoal || 0;
    const phoneCount = data.phones.length || 1;
    const currentYear = getCurrentYear();
    const yearDays = getYearDays(currentYear);
    const phoneDailyTarget = yearlyGoal > 0 ? yearlyGoal / yearDays / phoneCount : 0;

    // 计算每个软件的每日目标
    const appCount = phone.apps.length || 1;
    const appDailyTarget = phoneDailyTarget / appCount;

    return phone.apps.map(app => {
        // 确保 minWithdraw 有效，使用软件存储的值或默认值
        let minWithdraw = parseFloat(app.minWithdraw);
        if (!minWithdraw || minWithdraw <= 0 || isNaN(minWithdraw)) {
            minWithdraw = 0.3; // 默认最小提现金额
        }
        
        const shouldHaveEarned = daysFromStart * minWithdraw;
        // 使用统一函数计算已赚金额
        const earned = calculateAppEarned(app);
        const daysIncome = Math.floor(earned / minWithdraw);
        const nextPlayDate = calculateNextPlayDate(earned, minWithdraw);
        const progressPercentage = shouldHaveEarned > 0 ? Math.min(100, Math.round((earned / shouldHaveEarned) * 100)) : 0;

        return `
            <div class="app-card">
                <div class="app-header">
                    <span class="app-name">${app.name}</span>
                    <span class="status-tag ${app.balance >= minWithdraw ? 'ready' : 'pending'}">
                        ${app.balance >= minWithdraw ? '可提现' : '待赚取'}
                    </span>
                </div>
                <div class="app-core-info">
                    <span class="core-label">当前余额:</span>
                    <span class="core-value">¥${(app.balance || 0).toFixed(2)}</span>
                </div>
                <div class="app-info-row">
                    <span>最小提现: ¥${minWithdraw.toFixed(2)}</span>
                    <span>已赚金额: ¥${earned.toFixed(2)}</span>
                </div>
                <div class="app-info-row">
                    <span>每日目标: ¥${appDailyTarget.toFixed(2)}</span>
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
    // 防止除以0
    if (!minWithdraw || minWithdraw <= 0) {
        return '--';
    }
    const startDate = new Date('2026-01-01');
    const daysEarned = Math.floor(earned / minWithdraw);
    const targetDate = new Date(startDate);
    targetDate.setDate(targetDate.getDate() + daysEarned);
    return `${targetDate.getMonth() + 1}.${targetDate.getDate()}`;
}

// 获取指定年份的天数（考虑闰年）
function getYearDays(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0) ? 366 : 365;
}

// 获取当前年份
function getCurrentYear() {
    return new Date().getFullYear();
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

// 删除手机
function deletePhone(phoneId) {
    if (confirm('确定要删除这部手机吗？删除后将无法恢复。')) {
        DataManager.deletePhone(phoneId);
        renderPhones();
        showToast('手机已删除！');
    }
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
            <div class="prediction-container" id="app-prediction"></div>
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
    
    // 添加智能预测功能
    const appNameInput = document.getElementById('app-name');
    const predictionContainer = document.getElementById('app-prediction');
    
    appNameInput.addEventListener('input', function() {
        const inputText = this.value.trim();
        if (inputText.length >= 1) {
            showPredictions(inputText);
        } else {
            predictionContainer.innerHTML = '';
        }
    });
    
    function showPredictions(inputText) {
        const data = DataManager.loadData();
        const allApps = data.phones.flatMap(phone => phone.apps);
        
        // 计算每个软件的使用频率和最近使用时间
        const appsWithScore = allApps.map(app => {
            let score = 0;
            const name = app.name.toLowerCase();
            const input = inputText.toLowerCase();
            
            // 完全匹配得分最高
            if (name === input) {
                score += 100;
            }
            // 开头匹配得分较高
            else if (name.startsWith(input)) {
                score += 80;
            }
            // 包含匹配得分中等
            else if (name.includes(input)) {
                score += 60;
            }
            // 模糊匹配（每个字符都按顺序出现）
            else {
                let fuzzyScore = 0;
                let lastIndex = -1;
                for (let char of input) {
                    const index = name.indexOf(char, lastIndex + 1);
                    if (index > lastIndex) {
                        fuzzyScore += 10;
                        lastIndex = index;
                    } else {
                        fuzzyScore = 0;
                        break;
                    }
                }
                score += fuzzyScore;
            }
            
            // 根据余额增加得分（余额高的软件可能更常用）
            if (app.balance > 0) {
                score += Math.min(20, app.balance);
            }
            
            // 根据提现次数增加得分
            const withdrawCount = app.withdrawals ? app.withdrawals.length : 0;
            score += withdrawCount * 5;
            
            return {
                ...app,
                score
            };
        });
        
        // 按得分排序并取前5个
        const predictions = appsWithScore
            .filter(app => app.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
        
        if (predictions.length > 0) {
            // 计算推荐金额（基于历史平均值）
            const avgMinWithdraw = allApps.reduce((sum, app) => sum + app.minWithdraw, 0) / allApps.length;
            const avgBalance = allApps.reduce((sum, app) => sum + (app.balance || 0), 0) / allApps.length;
            
            predictionContainer.innerHTML = `
                <div class="prediction-list">
                    ${predictions.map(app => `
                        <div class="prediction-item" onclick="selectPrediction('${app.name}', ${app.minWithdraw})")>
                            <div class="prediction-name">${app.name}</div>
                            <div class="prediction-details">
                                <span>最小提现: ¥${app.minWithdraw.toFixed(2)}</span>
                            </div>
                        </div>
                    `).join('')}
                    <div class="prediction-item prediction-recommend" onclick="selectPrediction('', ${avgMinWithdraw.toFixed(2)})")>
                        <div class="prediction-name">💡 智能推荐</div>
                        <div class="prediction-details">
                            <span>最小提现: ¥${avgMinWithdraw.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // 如果没有匹配结果，显示智能推荐
            const avgMinWithdraw = allApps.length > 0 ? 
                allApps.reduce((sum, app) => sum + app.minWithdraw, 0) / allApps.length : 0.3;
            const avgBalance = allApps.length > 0 ? 
                allApps.reduce((sum, app) => sum + (app.balance || 0), 0) / allApps.length : 0;
            
            predictionContainer.innerHTML = `
                <div class="prediction-list">
                    <div class="prediction-item prediction-recommend" onclick="selectPrediction('', ${avgMinWithdraw.toFixed(2)})")>
                        <div class="prediction-name">💡 智能推荐（基于历史平均值）</div>
                        <div class="prediction-details">
                            <span>最小提现: ¥${avgMinWithdraw.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}

// 选择预测结果
function selectPrediction(name, minWithdraw) {
    document.getElementById('app-name').value = name;
    document.getElementById('app-min-withdraw').value = minWithdraw;
    document.getElementById('app-prediction').innerHTML = '';
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
            <input type="number" id="edit-app-balance" class="form-input" value="${app.balance.toFixed(2)}" step="0.01">
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
    
    // 已赚金额使用统一函数计算
    const totalEarned = allAppsWithPhone.reduce((sum, app) => sum + calculateAppEarned(app), 0);
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
        // 使用统一函数计算已赚金额
        const earned = calculateAppEarned(app);
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
                    <div class="stat-item stat-earned">
                        <span class="stat-label">已赚金额</span>
                        <span class="stat-value">¥${earned.toFixed(2)}</span>
                    </div>
                    <div class="stat-item stat-withdrawn">
                        <span class="stat-label">提现金额</span>
                        <span class="stat-value">¥${withdrawn.toFixed(2)}</span>
                    </div>
                    <div class="stat-item stat-balance">
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
                <span>相当于: ${item.daysEarned} 天</span>
            </div>
            <div class="app-info">
                <span>等效日期: ${item.equivalentDateStr}</span>
                <span>目标日期: ${targetDateStr}</span>
            </div>
            <div class="app-info">
                <span>比较结果: ${item.comparisonResult}</span>
                <span>到目标日期应赚: ¥${item.totalShouldEarn.toFixed(2)}</span>
            </div>
            <div class="app-info">
                <span>还需赚取: ¥${item.neededAmount.toFixed(2)}</span>
            </div>
        </div>
    `).join('');
}

// 渲染设置页面
function renderSettings() {
    const data = DataManager.loadData();
    document.getElementById('yearly-goal').value = data.settings.yearlyGoal || 0;
    
    // 显示当年天数信息
    const currentYear = getCurrentYear();
    const yearDays = getYearDays(currentYear);
    const yearDaysHint = document.getElementById('year-days-hint');
    if (yearDaysHint) {
        yearDaysHint.textContent = `${currentYear}年共${yearDays}天${yearDays === 366 ? '（闰年）' : ''}`;
    }
    
    // 计算待支出余额（总提现金额 - 总支出金额）
    // 总提现金额 = 所有软件的 withdrawn + historicalWithdrawn
    let totalWithdrawnAmount = 0;
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            totalWithdrawnAmount += (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
        });
    });
    
    // 计算总支出金额
    let totalExpenses = 0;
    if (data.expenses && data.expenses.length > 0) {
        totalExpenses = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    }
    
    // 待支出金额 = 总提现金额 - 总支出金额
    const pendingExpenseBalance = totalWithdrawnAmount - totalExpenses;
    document.getElementById('total-withdrawn').value = pendingExpenseBalance.toFixed(2);
}

// 批量添加手机
function bulkAddPhones() {
    const namesText = document.getElementById('bulk-phone-names').value.trim();
    
    if (!namesText) {
        showToast('请输入手机名称');
        return;
    }
    
    // 解析手机名称列表
    const phoneNames = namesText.split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);
    
    if (phoneNames.length === 0) {
        showToast('请输入有效的手机名称');
        return;
    }
    
    const data = DataManager.loadData();
    let addedCount = 0;
    let skippedCount = 0;
    
    phoneNames.forEach(phoneName => {
        // 检查是否已存在同名手机（不区分大小写）
        const exists = data.phones.some(phone => 
            phone.name.toLowerCase() === phoneName.toLowerCase()
        );
        
        if (exists) {
            skippedCount++;
        } else {
            // 添加手机
            const today = new Date().toISOString().split('T')[0];
            const phone = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: phoneName,
                apps: [],
                createdAt: new Date().toISOString(),
                dailyTotalEarnedHistory: {
                    [today]: 0
                }
            };
            data.phones.push(phone);
            addedCount++;
        }
    });
    
    // 保存数据
    DataManager.saveData(data);
    
    // 清空输入框
    document.getElementById('bulk-phone-names').value = '';
    
    // 显示结果
    if (addedCount > 0) {
        showToast(`成功添加 ${addedCount} 个手机，跳过 ${skippedCount} 个已存在的手机`);
        // 刷新手机列表
        renderPhones();
    } else {
        showToast(`所有手机已存在，跳过 ${skippedCount} 个`);
    }
}

// 批量添加软件到所有手机
function bulkAddApps() {
    const namesText = document.getElementById('bulk-app-names').value.trim();
    const minWithdraw = parseFloat(document.getElementById('bulk-app-min-withdraw').value) || 0.3;
    
    if (!namesText) {
        showToast('请输入软件名称');
        return;
    }
    
    // 解析软件名称列表
    const appNames = namesText.split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);
    
    if (appNames.length === 0) {
        showToast('请输入有效的软件名称');
        return;
    }
    
    const data = DataManager.loadData();
    
    if (data.phones.length === 0) {
        showToast('请先添加手机');
        return;
    }
    
    let addedCount = 0;
    let skippedCount = 0;
    
    // 遍历所有手机
    data.phones.forEach(phone => {
        appNames.forEach(appName => {
            // 检查手机中是否已存在同名软件（不区分大小写）
            const exists = phone.apps.some(app => 
                app.name.toLowerCase() === appName.toLowerCase()
            );
            
            if (exists) {
                skippedCount++;
            } else {
                // 添加软件
                const today = new Date().toISOString().split('T')[0];
                const app = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    name: appName,
                    minWithdraw: minWithdraw,
                    balance: 0,
                    initialBalance: 0,
                    earned: 0,
                    withdrawn: 0,
                    remainingWithdrawn: 0,
                    historicalWithdrawn: 0,
                    expenses: [],
                    withdrawals: [],
                    lastUpdated: new Date().toISOString(),
                    dailyEarnedHistory: {}
                };
                phone.apps.push(app);
                addedCount++;
            }
        });
    });
    
    // 保存数据
    DataManager.saveData(data);
    
    // 清空输入框
    document.getElementById('bulk-app-names').value = '';
    
    // 显示结果
    if (addedCount > 0) {
        showToast(`成功添加 ${addedCount} 个软件，跳过 ${skippedCount} 个已存在的软件`);
        // 刷新手机列表
        renderPhones();
    } else {
        showToast(`所有软件已存在，跳过 ${skippedCount} 个`);
    }
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
    
    // 添加总支出记录
    DataManager.addTotalExpense({ amount, purpose, date });
    
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
    
    const allExpenses = data.expenses || [];
    
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
            <div class="expense-divider"></div>
            <div class="expense-record-body">
                <div class="expense-info">
                    <h4 class="expense-purpose">${e.purpose}</h4>
                </div>
                <div class="expense-amount">-¥${e.amount.toFixed(2)}</div>
            </div>
        </div>
    `).join('');
}

// 渲染分期还款页面
function renderInstallments() {
    const summary = DataManager.getInstallmentSummary();
    const { installments: installmentGoals, phaseGoals } = DataManager.calculateInstallmentGoals();
    
    // 更新总览数据
    document.getElementById('total-installment-amount').textContent = `¥${summary.totalInstallmentAmount.toFixed(2)}`;
    document.getElementById('installment-earned').textContent = `¥${summary.pendingExpense.toFixed(2)}`;  // 待支出金额
    document.getElementById('installment-needed').textContent = `¥${summary.pendingWithdrawal.toFixed(2)}`;  // 待提现金额
    document.getElementById('installment-overall-progress').textContent = `${summary.overallProgress.toFixed(0)}%`;
    document.getElementById('installment-progress-bar').style.width = `${summary.overallProgress}%`;
    
    // 更新最近还款日期
    if (installmentGoals.length > 0) {
        const nearestInstallment = installmentGoals[0];
        document.getElementById('nearest-due-date').textContent = `${nearestInstallment.dueDate} (${nearestInstallment.daysRemaining}天)`;
    } else {
        document.getElementById('nearest-due-date').textContent = '暂无';
    }
    
    // 更新阶段性每日目标显示
    const phaseGoalsSummary = document.getElementById('phase-goals-summary');
    if (phaseGoals && phaseGoals.length > 0) {
        phaseGoalsSummary.style.display = 'block';
        // 第一阶段
        if (phaseGoals[0]) {
            document.getElementById('phase1-daily-target').textContent = `¥${phaseGoals[0].dailyTarget.toFixed(2)}`;
            document.getElementById('phase1-date').textContent = `至 ${phaseGoals[0].dueDate} (${phaseGoals[0].daysRemaining}天)`;
        }
        // 第二阶段
        if (phaseGoals[1]) {
            document.getElementById('phase2-daily-target').textContent = `¥${phaseGoals[1].dailyTarget.toFixed(2)}`;
            // 计算第二阶段的开始日期（第一阶段的第二天）
            const phase1EndDate = new Date(phaseGoals[0].dueDate);
            const phase2StartDate = new Date(phase1EndDate);
            phase2StartDate.setDate(phase2StartDate.getDate() + 1);
            const phase2StartStr = phase2StartDate.toISOString().split('T')[0];
            document.getElementById('phase2-date').textContent = `${phase2StartStr} 至 ${phaseGoals[1].dueDate} (${phaseGoals[1].daysRemaining}天)`;
        } else {
            document.getElementById('phase2-daily-target').textContent = '¥0.00';
            document.getElementById('phase2-date').textContent = '';
        }
    } else {
        phaseGoalsSummary.style.display = 'none';
    }
    
    // 渲染分期列表
    const container = document.getElementById('installment-list');
    if (installmentGoals.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无分期记录</div>';
        return;
    }
    
    container.innerHTML = installmentGoals.map(installment => {
        // 确定紧急程度
        let urgencyClass = 'normal';
        if (installment.daysRemaining <= 3) {
            urgencyClass = 'urgent';
        } else if (installment.daysRemaining <= 7) {
            urgencyClass = 'warning';
        }
        
        return `
            <div class="installment-item ${urgencyClass}">
                <div class="installment-header">
                    <div>
                        <h3 class="installment-platform">${installment.platform}</h3>
                        <p class="installment-date">还款日期: ${installment.dueDate}</p>
                    </div>
                    <span class="status-tag ${installment.status === 'active' ? 'ready' : 'pending'}">
                        ${installment.status === 'active' ? '进行中' : '已完成'}
                    </span>
                </div>
                <div class="installment-amount">¥${installment.amount.toFixed(2)}</div>
                <div class="installment-details">
                    <span>剩余天数: ${installment.daysRemaining}天</span>
                    <span>每日需要: ¥${((installment.amount - installment.pendingExpense) / (installment.daysRemaining || 1)).toFixed(2)}</span>
                </div>
                <div class="installment-progress">
                    <div class="progress-header">
                        <span>完成进度</span>
                        <span class="font-semibold">${installment.totalProgress.toFixed(0)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${installment.totalProgress}%"></div>
                    </div>
                </div>
                <div class="installment-app-goals">
                    <div class="section-title" style="font-size: 14px; margin-bottom: 12px;">各软件目标</div>
                    ${installment.appGoals.map(goal => `
                        <div class="installment-app-goal-item">
                            <div class="installment-app-goal-header">
                                <span class="installment-app-name">${goal.phoneName} - ${goal.appName}</span>
                                <span class="installment-app-target">目标: ¥${goal.totalTarget.toFixed(2)}</span>
                            </div>
                            <div class="installment-app-goal-details">
                                <span>每日要赚: ¥${goal.dailyTarget.toFixed(2)}</span>
                            </div>
                            <div class="progress-item">
                                <div class="progress-header">
                                    <span>已提现: ¥${goal.currentWithdrawn.toFixed(2)}</span>
                                    <span>${goal.progress.toFixed(0)}%</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${goal.progress}%"></div>
                                </div>
                            </div>
                            <div class="installment-app-goal-actions">
                                <button class="btn btn-secondary btn-sm" onclick="editAppGoalAmount('${installment.id}')">修改目标</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="installment-action-buttons">
                    <button class="btn btn-secondary" onclick="openEditInstallmentModal('${installment.id}')">编辑</button>
                    <button class="btn btn-error" onclick="deleteInstallment('${installment.id}')">删除</button>
                </div>
            </div>
        `;
    }).join('');
}

// 打开添加分期模态框
function openAddInstallmentModal() {
    showModal('添加分期还款', `
        <div class="form-group">
            <label class="form-label">平台名称</label>
            <input type="text" id="installment-platform" class="form-input" placeholder="输入平台名称">
        </div>
        <div class="form-group">
            <label class="form-label">还款日期</label>
            <input type="date" id="installment-due-date" class="form-input">
        </div>
        <div class="form-group">
            <label class="form-label">还款金额 (元)</label>
            <input type="number" id="installment-amount" class="form-input" placeholder="输入还款金额" step="0.01">
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { 
            text: '添加', 
            class: 'btn-primary', 
            action: () => {
                const platform = document.getElementById('installment-platform').value.trim();
                const dueDate = document.getElementById('installment-due-date').value;
                const amount = document.getElementById('installment-amount').value;
                
                if (platform && dueDate && amount) {
                    DataManager.addInstallment({ platform, dueDate, amount });
                    renderInstallments();
                    showToast('分期添加成功！');
                }
                closeModal();
            }
        }
    ], true);
}

// 打开编辑分期模态框
function openEditInstallmentModal(installmentId) {
    const data = DataManager.loadData();
    const installment = data.installments.find(i => i.id === installmentId);
    
    if (!installment) return;
    
    showModal('编辑分期还款', `
        <div class="form-group">
            <label class="form-label">平台名称</label>
            <input type="text" id="edit-installment-platform" class="form-input" value="${installment.platform}">
        </div>
        <div class="form-group">
            <label class="form-label">还款日期</label>
            <input type="date" id="edit-installment-due-date" class="form-input" value="${installment.dueDate}">
        </div>
        <div class="form-group">
            <label class="form-label">还款金额 (元)</label>
            <input type="number" id="edit-installment-amount" class="form-input" value="${installment.amount}" step="0.01">
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { 
            text: '保存', 
            class: 'btn-primary', 
            action: () => {
                const platform = document.getElementById('edit-installment-platform').value.trim();
                const dueDate = document.getElementById('edit-installment-due-date').value;
                const amount = document.getElementById('edit-installment-amount').value;
                
                if (platform && dueDate && amount) {
                    DataManager.editInstallment(installmentId, { platform, dueDate, amount });
                    renderInstallments();
                    showToast('分期已更新！');
                }
                closeModal();
            }
        }
    ]);
}

// 删除分期
function deleteInstallment(installmentId) {
    if (confirm('确定要删除这个分期吗？')) {
        DataManager.deleteInstallment(installmentId);
        renderInstallments();
        showToast('分期已删除！');
    }
}

// 修改软件目标金额
function editAppGoalAmount(installmentId) {
    const data = DataManager.loadData();
    const installment = data.installments.find(i => i.id === installmentId);
    if (!installment) return;
    
    const allApps = data.phones.flatMap(phone => phone.apps);
    const totalAmount = installment.amount;
    const averageAmount = totalAmount / allApps.length;
    
    // 生成软件目标列表HTML
    let appsHtml = '';
    allApps.forEach((app, index) => {
        const phoneName = data.phones.find(p => p.apps.some(a => a.id === app.id))?.name || '';
        appsHtml += `
            <div class="form-group">
                <label class="form-label">${phoneName} - ${app.name}</label>
                <input type="number" id="app-goal-${index}" class="form-input" value="${averageAmount.toFixed(2)}" step="0.01">
            </div>
        `;
    });
    
    showModal('修改软件目标金额', `
        <div class="form-group">
            <label class="form-label">总还款金额</label>
            <input type="number" id="total-goal-amount" class="form-input" value="${totalAmount.toFixed(2)}" step="0.01">
        </div>
        <div class="form-hint mb-4">修改总金额后点击"平均分配"按钮重新计算</div>
        ${appsHtml}
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { 
            text: '平均分配', 
            class: 'btn-accent', 
            action: () => {
                const newTotal = parseFloat(document.getElementById('total-goal-amount').value) || 0;
                const newAverage = newTotal / allApps.length;
                
                allApps.forEach((app, index) => {
                    const input = document.getElementById(`app-goal-${index}`);
                    if (input) {
                        input.value = newAverage.toFixed(2);
                    }
                });
            }
        },
        { 
            text: '保存', 
            class: 'btn-primary', 
            action: () => {
                const newTotal = parseFloat(document.getElementById('total-goal-amount').value) || 0;
                
                // 这里可以添加保存逻辑，但由于我们只是修改展示的目标金额，而不是实际的分期金额
                // 所以我们只需要更新分期的总金额，然后重新渲染
                installment.amount = newTotal;
                DataManager.saveData(data);
                
                renderInstallments();
                showToast('软件目标金额已更新！');
                closeModal();
            }
        }
    ]);
}

// 计算分期目标（全局函数）
function calculateInstallmentGoalsGlobal() {
    renderInstallments();
    showToast('计算完成！');
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

// 导出数据为JSON格式（包含所有数据）
function exportJSON() {
    const data = DataManager.loadData();
    
    // 构建完整的导出数据结构
    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        data: data
    };
    
    // 转换为格式化的JSON字符串
    const jsonStr = JSON.stringify(exportData, null, 2);
    
    // 创建Blob并下载
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `moneyApp_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('数据已导出为JSON格式！');
}

// 导入JSON数据
function importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                
                // 验证数据格式
                let dataToImport = null;
                
                // 检查是否是新的导出格式（包含version和data字段）
                if (importedData.version && importedData.data) {
                    dataToImport = importedData.data;
                } else if (importedData.phones && Array.isArray(importedData.phones)) {
                    // 旧格式直接导入
                    dataToImport = importedData;
                } else {
                    showToast('数据格式错误：无法识别的文件格式');
                    return;
                }
                
                // 验证必要字段
                if (!Array.isArray(dataToImport.phones)) {
                    showToast('数据格式错误：缺少手机数据');
                    return;
                }
                
                // 确保所有必要字段都存在
                const validatedData = {
                    phones: dataToImport.phones || [],
                    installments: dataToImport.installments || [],
                    expenses: dataToImport.expenses || [],
                    settings: dataToImport.settings || { yearlyGoal: 10000 }
                };
                
                // 显示确认对话框，包含数据摘要
                const phoneCount = validatedData.phones.length;
                const appCount = validatedData.phones.reduce((sum, phone) => sum + (phone.apps ? phone.apps.length : 0), 0);
                const expenseCount = validatedData.expenses.length;
                const installmentCount = validatedData.installments.length;
                
                const confirmMessage = `导入数据将覆盖当前所有数据，是否继续？\n\n导入数据摘要：\n- 手机数量：${phoneCount}\n- 软件数量：${appCount}\n- 支出记录：${expenseCount}\n- 分期还款：${installmentCount}`;
                
                if (confirm(confirmMessage)) {
                    DataManager.saveData(validatedData);
                    renderDashboard();
                    renderPhones();
                    renderStats();
                    renderSettings();
                    renderInstallments();
                    showToast('数据导入成功！');
                }
            } catch (error) {
                console.error('导入错误:', error);
                showToast('文件格式错误：' + error.message);
            }
        };
        reader.onerror = () => {
            showToast('文件读取失败');
        };
        reader.readAsText(file);
    };
    
    input.click();
}

// 导出数据为Excel兼容格式（CSV）
function exportData() {
    const data = DataManager.loadData();
    
    // 创建CSV内容
    let csvContent = "数据类型,手机名称,软件名称,最小提现,当前余额,已赚金额,已提现金额\n";
    
    // 添加手机和软件数据
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            const row = [
                "软件数据",
                `"${phone.name}"`,
                `"${app.name}"`,
                app.minWithdraw.toFixed(2),
                (app.balance || 0).toFixed(2),
                (app.earned || 0).toFixed(2),
                (app.withdrawn || 0).toFixed(2)
            ];
            csvContent += row.join(',') + '\n';
        });
    });
    
    // 添加统计信息
    const totalPhones = data.phones.length;
    const totalApps = data.phones.reduce((sum, phone) => sum + phone.apps.length, 0);
    const totalBalance = data.phones.reduce((sum, phone) => {
        return sum + phone.apps.reduce((appSum, app) => appSum + (app.balance || 0), 0);
    }, 0);
    const totalEarned = data.phones.reduce((sum, phone) => {
        return sum + phone.apps.reduce((appSum, app) => appSum + (app.earned || 0), 0);
    }, 0);
    
    csvContent += "\n";
    csvContent += "统计信息,,,,,,\n";
    csvContent += `总手机数,${totalPhones},,,\n`;
    csvContent += `总软件数,${totalApps},,,\n`;
    csvContent += `总余额,${totalBalance.toFixed(2)},,,\n`;
    csvContent += `总已赚,${totalEarned.toFixed(2)},,,\n`;
    
    // 创建Blob并下载
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `moneyApp_export_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('数据已导出为Excel格式！');
}

// 导入数据（兼容旧版JSON格式）
function importData() {
    importJSON();
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

// 卡通风格日历组件
class Calendar {
    constructor(options) {
        this.options = {
            input: null,
            minDate: null,
            maxDate: null,
            onSelect: null,
            ...options
        };
        
        this.currentDate = new Date();
        this.selectedDate = null;
        this.popup = null;
        
        if (this.options.input) {
            this.init();
        }
    }
    
    init() {
        const input = document.getElementById(this.options.input);
        if (!input) return;
        
        // 隐藏原生日期输入
        input.type = 'text';
        input.readOnly = true;
        input.classList.add('calendar-input');
        
        // 创建容器
        const container = document.createElement('div');
        container.className = 'calendar-container';
        
        // 将输入框移到容器中
        input.parentNode.insertBefore(container, input);
        container.appendChild(input);
        
        // 添加点击事件
        input.addEventListener('click', () => this.toggleCalendar());
        
        // 点击其他地方关闭日历
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                this.hideCalendar();
            }
        });
    }
    
    toggleCalendar() {
        if (this.popup) {
            this.hideCalendar();
        } else {
            this.showCalendar();
        }
    }
    
    showCalendar() {
        const input = document.getElementById(this.options.input);
        if (!input) return;
        
        // 创建日历弹窗
        this.popup = document.createElement('div');
        this.popup.className = 'calendar-popup';
        
        // 渲染日历
        this.renderCalendar();
        
        // 添加到容器
        const container = input.parentNode;
        container.appendChild(this.popup);
    }
    
    hideCalendar() {
        if (this.popup) {
            this.popup.remove();
            this.popup = null;
        }
    }
    
    renderCalendar() {
        if (!this.popup) return;
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // 渲染头部
        this.popup.innerHTML = `
            <div class="calendar-header">
                <button class="calendar-nav-btn prev-month">&lt;</button>
                <h3 class="calendar-title">${year}年${month + 1}月</h3>
                <button class="calendar-nav-btn next-month">&gt;</button>
            </div>
            <div class="calendar-weekdays">
                <div class="calendar-weekday">日</div>
                <div class="calendar-weekday">一</div>
                <div class="calendar-weekday">二</div>
                <div class="calendar-weekday">三</div>
                <div class="calendar-weekday">四</div>
                <div class="calendar-weekday">五</div>
                <div class="calendar-weekday">六</div>
            </div>
            <div class="calendar-days">
                ${this.renderDays()}
            </div>
            <div class="calendar-footer">
                <button class="calendar-footer-btn btn-secondary today-btn">今天</button>
                <button class="calendar-footer-btn btn-primary confirm-btn">确认</button>
            </div>
        `;
        
        // 添加事件监听器
        this.popup.querySelector('.prev-month').addEventListener('click', () => this.prevMonth());
        this.popup.querySelector('.next-month').addEventListener('click', () => this.nextMonth());
        this.popup.querySelector('.today-btn').addEventListener('click', () => this.today());
        this.popup.querySelector('.confirm-btn').addEventListener('click', () => this.confirm());
        
        // 添加日期点击事件
        const dayElements = this.popup.querySelectorAll('.calendar-day');
        dayElements.forEach((dayElement, index) => {
            const currentDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
            currentDay.setDate(currentDay.getDate() - currentDay.getDay() + index);
            
            if (!dayElement.classList.contains('disabled')) {
                dayElement.addEventListener('click', () => {
                    this.selectDate(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate());
                });
            }
        });
    }
    
    renderDays() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        const days = [];
        
        for (let i = 0; i < 42; i++) {
            const currentDay = new Date(startDate);
            currentDay.setDate(startDate.getDate() + i);
            
            const isToday = this.isSameDay(currentDay, new Date());
            const isSelected = this.selectedDate && this.isSameDay(currentDay, this.selectedDate);
            const isOtherMonth = currentDay.getMonth() !== month;
            const isDisabled = this.isDisabled(currentDay);
            
            let classes = 'calendar-day';
            if (isToday) classes += ' today';
            if (isSelected) classes += ' selected';
            if (isOtherMonth) classes += ' other-month';
            if (isDisabled) classes += ' disabled';
            
            days.push(`
                <div class="${classes}">
                    ${currentDay.getDate()}
                </div>
            `);
        }
        
        return days.join('');
    }
    
    isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }
    
    isDisabled(date) {
        if (this.options.minDate) {
            const minDate = new Date(this.options.minDate);
            if (date < minDate) return true;
        }
        
        if (this.options.maxDate) {
            const maxDate = new Date(this.options.maxDate);
            if (date > maxDate) return true;
        }
        
        return false;
    }
    
    selectDate(year, month, day) {
        const date = new Date(year, month, day);
        if (this.isDisabled(date)) return;
        
        this.selectedDate = date;
        this.renderCalendar();
        
        // 更新输入框
        const input = document.getElementById(this.options.input);
        if (input) {
            const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            input.value = formattedDate;
        }
    }
    
    prevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
    }
    
    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
    }
    
    today() {
        this.currentDate = new Date();
        this.selectDate(this.currentDate.getFullYear(), this.currentDate.getMonth(), this.currentDate.getDate());
        this.renderCalendar();
    }
    
    confirm() {
        if (this.selectedDate && this.options.onSelect) {
            this.options.onSelect(this.selectedDate);
        }
        this.hideCalendar();
    }
}

// 全局日历实例
let calendar = null;

// 初始化日历
function initCalendars() {
    // 初始化目标日期日历
    const targetDateInput = document.getElementById('target-date');
    if (targetDateInput) {
        calendar = new Calendar({
            input: 'target-date',
            minDate: '2026-01-01'
        });
    }
    
    // 初始化支出日期日历
    const expenseDateInput = document.getElementById('expense-date');
    if (expenseDateInput) {
        new Calendar({
            input: 'expense-date'
        });
    }
}

// ==================== 游戏抽签功能 ====================

let currentGameDrawPhoneId = null;

// 打开游戏抽签弹窗
function openGameDrawModal(phoneId) {
    currentGameDrawPhoneId = phoneId;
    const modal = document.getElementById('game-draw-modal');
    const manageSection = document.getElementById('game-manage-section');
    const resultSection = document.getElementById('game-draw-result-section');
    const historySection = document.getElementById('game-history-section');
    const drawBtn = document.getElementById('game-draw-btn');
    
    // 重置状态
    manageSection.classList.remove('hidden');
    resultSection.classList.add('hidden');
    historySection.classList.remove('hidden');
    drawBtn.textContent = '开始抽签';
    drawBtn.onclick = startGameDraw;
    
    // 加载游戏列表和历史记录
    renderGameList();
    renderGameHistory();
    
    modal.style.display = 'flex';
}

// 关闭游戏抽签弹窗
function closeGameDrawModal() {
    const modal = document.getElementById('game-draw-modal');
    modal.style.display = 'none';
    currentGameDrawPhoneId = null;
}

// 渲染游戏列表
function renderGameList() {
    const games = DataManager.getGames(currentGameDrawPhoneId);
    const container = document.getElementById('game-list');
    
    if (games.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无游戏，请添加游戏</div>';
        return;
    }
    
    let html = '';
    games.forEach(game => {
        html += `
            <div class="game-item">
                <span class="game-name">${game.name}</span>
                <button class="btn btn-error btn-sm" onclick="deleteGame('${game.id}')">删除</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 添加游戏
function addGame() {
    const input = document.getElementById('new-game-name');
    const gameName = input.value.trim();
    
    if (!gameName) {
        showToast('请输入游戏名称', 'warning');
        return;
    }
    
    DataManager.addGame(currentGameDrawPhoneId, gameName);
    input.value = '';
    renderGameList();
    showToast('游戏添加成功', 'success');
}

// 删除游戏
function deleteGame(gameId) {
    if (confirm('确定要删除这个游戏吗？')) {
        DataManager.deleteGame(currentGameDrawPhoneId, gameId);
        renderGameList();
        showToast('游戏删除成功', 'success');
    }
}

// 随机打乱数组
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 随机生成游玩时间（15-60分钟）
function getRandomPlayTime() {
    // 生成15-60分钟，步进5分钟
    const times = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
    return times[Math.floor(Math.random() * times.length)];
}

// 开始游戏抽签
function startGameDraw() {
    const games = DataManager.getGames(currentGameDrawPhoneId);
    
    if (games.length === 0) {
        showToast('请先添加游戏', 'warning');
        return;
    }
    
    const manageSection = document.getElementById('game-manage-section');
    const resultSection = document.getElementById('game-draw-result-section');
    const drawBtn = document.getElementById('game-draw-btn');
    const resultList = document.getElementById('game-draw-list');
    
    // 禁用按钮
    drawBtn.disabled = true;
    drawBtn.textContent = '抽签中...';
    
    // 动画效果
    let animationCount = 0;
    const emojis = ['🎲', '🎯', '🎰', '🎪', '🎨'];
    
    const animationInterval = setInterval(() => {
        drawBtn.textContent = `抽签中 ${emojis[animationCount % emojis.length]}`;
        animationCount++;
        
        if (animationCount >= 8) {
            clearInterval(animationInterval);
            
            // 执行抽签
            const result = performGameDraw(games);
            
            // 保存到历史记录
            DataManager.addGameDrawHistory(currentGameDrawPhoneId, result);
            
            // 刷新历史记录
            renderGameHistory();
            
            // 恢复按钮状态
            drawBtn.disabled = false;
            drawBtn.textContent = '开始抽签';
            
            // 显示弹出弹窗
            openGameResultPopup(result);
        }
    }, 200);
}

// 格式化日期
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 执行游戏抽签
function performGameDraw(games) {
    // 随机决定抽取游戏数量 (1-3个，但不超过总数)
    const maxGames = Math.min(3, games.length);
    const minGames = 1;
    const gameCount = Math.floor(Math.random() * (maxGames - minGames + 1)) + minGames;
    
    // 随机选择游戏
    const shuffledGames = shuffleArray(games);
    const selectedGames = shuffledGames.slice(0, gameCount);
    
    // 为每个游戏分配游玩时间
    return selectedGames.map(game => ({
        ...game,
        playTime: getRandomPlayTime()
    }));
}

// 显示游戏抽签结果
function displayGameDrawResult(result, container, showCheckbox = false, historyId = null) {
    let html = '';
    
    result.forEach((game, index) => {
        const isCompleted = game.completed || false;
        const completedClass = isCompleted ? 'completed' : '';
        const checkboxHtml = showCheckbox ? `
            <label class="game-complete-checkbox">
                <input type="checkbox" ${isCompleted ? 'checked' : ''} 
                    onchange="toggleGameCompleted('${historyId}', ${index})" 
                    ${!historyId ? 'disabled' : ''}>
                <span class="checkmark"></span>
            </label>
        ` : '';
        
        html += `
            <div class="game-draw-item ${completedClass}" style="animation-delay: ${index * 0.1}s">
                <div class="game-draw-order">#${index + 1}</div>
                <div class="game-draw-info">
                    <span class="game-draw-name">${game.name}</span>
                    <span class="game-draw-time">⏱️ ${game.playTime} 分钟</span>
                </div>
                ${checkboxHtml}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 切换游戏完成状态
function toggleGameCompleted(historyId, gameIndex) {
    DataManager.toggleGameCompleted(currentGameDrawPhoneId, historyId, gameIndex);
    renderGameHistory();
}

// 渲染历史记录
function renderGameHistory() {
    const history = DataManager.getGameDrawHistory(currentGameDrawPhoneId);
    const container = document.getElementById('game-history-list');
    
    if (history.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无历史记录</div>';
        return;
    }
    
    let html = '';
    history.forEach((item, index) => {
        const date = formatDate(item.date);
        const completedCount = item.games.filter(g => g.completed).length;
        const totalCount = item.games.length;
        const isAllCompleted = completedCount === totalCount;
        
        html += `
            <div class="history-item">
                <div class="history-header">
                    <span class="history-date">${date}</span>
                    <span class="history-progress ${isAllCompleted ? 'all-completed' : ''}">
                        ${completedCount}/${totalCount} 完成
                    </span>
                </div>
                <div class="history-games">
        `;
        
        item.games.forEach((game, gameIndex) => {
            const isCompleted = game.completed || false;
            html += `
                <div class="history-game-item ${isCompleted ? 'completed' : ''}">
                    <label class="game-complete-checkbox">
                        <input type="checkbox" ${isCompleted ? 'checked' : ''} 
                            onchange="toggleGameCompleted('${item.id}', ${gameIndex})">
                        <span class="checkmark"></span>
                    </label>
                    <span class="history-game-name">${game.name}</span>
                    <span class="history-game-time">${game.playTime}分钟</span>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ==================== 抽签结果弹窗功能 ====================

// 打开抽签结果弹窗
function openGameResultPopup(result) {
    const popup = document.getElementById('game-result-popup');
    const dateEl = document.getElementById('popup-draw-date');
    const listEl = document.getElementById('popup-game-result-list');
    
    // 设置日期
    const drawDate = new Date();
    dateEl.textContent = formatDate(drawDate);
    
    // 显示结果
    let html = '';
    result.forEach((game, index) => {
        html += `
            <div class="popup-game-item" style="animation-delay: ${index * 0.15}s">
                <div class="popup-game-order">#${index + 1}</div>
                <div class="popup-game-info">
                    <span class="popup-game-name">${game.name}</span>
                    <span class="popup-game-time">⏱️ ${game.playTime} 分钟</span>
                </div>
            </div>
        `;
    });
    listEl.innerHTML = html;
    
    // 显示弹窗
    popup.style.display = 'flex';
    // 强制重绘以触发动画
    popup.offsetHeight;
    popup.classList.add('show');
}

// 关闭抽签结果弹窗
function closeGameResultPopup() {
    const popup = document.getElementById('game-result-popup');
    popup.classList.remove('show');
    
    // 等待动画结束后隐藏
    setTimeout(() => {
        popup.style.display = 'none';
    }, 300);
}

// 点击弹窗背景关闭
document.getElementById('game-result-popup').addEventListener('click', function(e) {
    if (e.target === this) {
        closeGameResultPopup();
    }
});

// 点击模态框背景关闭
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

// ==================== 下载游戏管理功能 ====================

// 渲染游戏管理页面
function renderGamesPage() {
    // 更新日期
    const now = new Date();
    const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    const gamesDateEl = document.getElementById('games-current-date');
    if (gamesDateEl) {
        gamesDateEl.textContent = dateStr;
    }
    
    // 渲染游戏统计
    renderGameStats();
    
    // 渲染游戏列表
    renderGamesList();
    
    // 渲染抽签历史
    renderGameDrawHistoryList();
}

// 渲染游戏统计
function renderGameStats() {
    const stats = DataManager.getGameStats();
    
    document.getElementById('total-games-count').textContent = stats.totalGames;
    document.getElementById('active-games-count').textContent = stats.activeGames;
    document.getElementById('completed-games-count').textContent = stats.completedGames;
    document.getElementById('can-delete-games-count').textContent = stats.canDeleteGames;
}

// 渲染游戏列表
function renderGamesList() {
    const games = DataManager.getDownloadedGames();
    const container = document.getElementById('games-list');
    
    if (games.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无游戏，请添加新游戏</div>';
        return;
    }
    
    container.innerHTML = games.map(game => {
        const targetDays = game.targetDays || 7;
        const progressPercent = (game.daysPlayed / targetDays) * 100;
        let statusColor = '#3b82f6'; // 蓝色-进行中
        let statusText = `进行中 (${game.daysPlayed}/${targetDays}天)`;
        
        if (game.completed) {
            statusColor = '#22c55e'; // 绿色-已完成
            statusText = '已完成 ✓';
        } else if (game.canDelete) {
            statusColor = '#f59e0b'; // 橙色-可删除
            statusText = '可删除 🗑️';
        }
        
        return `
            <div class="game-item" style="padding: 16px; border-bottom: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div>
                        <div style="font-weight: 600; font-size: 16px;">${game.name}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                            下载日期: ${game.downloadDate}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span style="color: ${statusColor}; font-weight: 600; font-size: 14px;">${statusText}</span>
                    </div>
                </div>
                <div class="progress-item">
                    <div class="progress-header">
                        <span>游玩进度</span>
                        <span class="font-semibold">${Math.round(progressPercent)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%; background: ${statusColor};"></div>
                    </div>
                </div>
                ${game.canDelete ? `
                    <div style="margin-top: 12px; text-align: right;">
                        <button class="btn btn-error btn-sm" onclick="deleteDownloadedGame('${game.id}')">删除游戏</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// 渲染抽签历史
function renderGameDrawHistoryList() {
    const history = DataManager.getGameDrawHistory();
    const container = document.getElementById('game-draw-history');
    
    if (history.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无抽签记录</div>';
        return;
    }
    
    container.innerHTML = history.map(record => `
        <div class="draw-history-item" style="padding: 12px; border-bottom: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 500;">${record.date}</div>
                    <div style="font-size: 14px; color: var(--text-secondary); margin-top: 4px;">
                        🎮 ${record.gameName}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 14px; color: var(--primary-color); font-weight: 600;">
                        ${record.daysPlayed}/7天
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary);">
                        剩余${record.remainingDays}天
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// 添加新游戏
function addNewGame() {
    const nameInput = document.getElementById('new-game-name');
    const gameName = nameInput.value.trim();
    
    if (!gameName) {
        showToast('请输入游戏名称');
        return;
    }
    
    DataManager.addDownloadedGame(gameName);
    nameInput.value = '';
    
    showToast('游戏添加成功！');
    renderGamesPage();
}

// 删除游戏
function deleteDownloadedGame(gameId) {
    if (confirm('确定要删除这个游戏吗？')) {
        DataManager.deleteGame(gameId);
        showToast('游戏已删除');
        renderGamesPage();
    }
}

// 今日游戏抽签
function drawTodayGame() {
    const container = document.getElementById('today-game-result');
    
    // 检查今天是否已经抽签
    const today = new Date().toISOString().split('T')[0];
    const drawHistory = DataManager.getGameDrawHistory();
    const todayDraw = drawHistory.find(h => h.date === today);
    
    if (todayDraw) {
        // 今天已经抽签过了，显示今天的抽签结果
        showTodayDrawResult(todayDraw);
        showToast('今天已经抽签过了，显示今日抽签结果');
        return;
    }
    
    // 今天还没抽签，执行抽签
    const result = DataManager.getTodayGameToPlay();
    
    if (!result) {
        container.innerHTML = `
            <div style="font-size: 18px; margin-bottom: 16px;">暂无进行中的游戏</div>
            <div style="font-size: 14px; opacity: 0.8;">请先添加新游戏</div>
        `;
        return;
    }
    
    const targetDays = result.targetDays || 7;
    const progressPercent = (result.daysPlayed / targetDays) * 100;
    const remainingDays = targetDays - result.daysPlayed;
    
    // 计算建议游玩时长（根据剩余天数动态调整）
    let playTime = 30; // 默认30分钟
    let playTimeText = '30分钟';
    
    if (remainingDays <= 1) {
        // 快完成了，多玩一会
        playTime = 60;
        playTimeText = '1小时';
    } else if (remainingDays >= 3) {
        // 刚开始，少玩一会
        playTime = 20;
        playTimeText = '20分钟';
    }
    
    container.innerHTML = `
        <div style="animation: fadeIn 0.5s ease;">
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">🎲 抽签结果</div>
            <div style="font-size: 32px; font-weight: bold; margin: 16px 0; color: #fff;">${result.name}</div>
            
            <!-- 建议游玩时长 -->
            <div style="background: rgba(255,255,255,0.2); border-radius: 12px; padding: 16px; margin: 16px 0; border: 2px solid rgba(255,255,255,0.5);">
                <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">⏱️ 建议游玩时长</div>
                <div style="font-size: 36px; font-weight: bold; color: #fff;">${playTimeText}</div>
                <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">
                    ${remainingDays <= 2 ? '即将完成，建议多玩一会' : remainingDays >= 5 ? '刚开始，适当体验即可' : '正常游玩'}
                </div>
            </div>
            
            <div style="font-size: 16px; margin-bottom: 16px; opacity: 0.9;">
                今天第 ${result.daysPlayed} 天 / 共 ${targetDays} 天
                ${result.isRedownload ? '<span style="font-size: 12px; background: rgba(255,255,255,0.3); padding: 2px 8px; border-radius: 10px; margin-left: 8px;">重新下载</span>' : ''}
            </div>
            <div class="progress-bar" style="background: rgba(255,255,255,0.3); margin: 16px auto; max-width: 300px;">
                <div class="progress-fill" style="width: ${progressPercent}%; background: #fff;"></div>
            </div>
            <div style="font-size: 14px; opacity: 0.8; margin-top: 8px;">
                ${remainingDays > 0 ? `还需玩 ${remainingDays} 天即可删除` : '已完成，可以删除！'}
            </div>
            <div style="font-size: 12px; opacity: 0.6; margin-top: 12px;">
                ✅ 今天已经抽签，明天再来吧
            </div>
        </div>
    `;
    
    // 刷新游戏列表和统计
    renderGamesList();
    renderGameStats();
    renderGameDrawHistoryList();
    
    showToast(`今天玩：${result.name}`);
}

// 显示今天的抽签结果（不重新抽签）
function showTodayDrawResult(todayDraw) {
    const container = document.getElementById('today-game-result');
    const targetDays = todayDraw.targetDays || 7;
    const progressPercent = (todayDraw.daysPlayed / targetDays) * 100;
    const remainingDays = todayDraw.remainingDays;
    
    // 计算建议游玩时长
    let playTimeText = '30分钟';
    if (remainingDays <= 1) {
        playTimeText = '1小时';
    } else if (remainingDays >= 3) {
        playTimeText = '20分钟';
    }
    
    container.innerHTML = `
        <div style="animation: fadeIn 0.5s ease;">
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">🎲 今日抽签结果</div>
            <div style="font-size: 32px; font-weight: bold; margin: 16px 0; color: #fff;">${todayDraw.gameName}</div>
            
            <!-- 建议游玩时长 -->
            <div style="background: rgba(255,255,255,0.2); border-radius: 12px; padding: 16px; margin: 16px 0; border: 2px solid rgba(255,255,255,0.5);">
                <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">⏱️ 建议游玩时长</div>
                <div style="font-size: 36px; font-weight: bold; color: #fff;">${playTimeText}</div>
                <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">
                    ${remainingDays <= 1 ? '即将完成，建议多玩一会' : remainingDays >= 3 ? '刚开始，适当体验即可' : '正常游玩'}
                </div>
            </div>
            
            <div style="font-size: 16px; margin-bottom: 16px; opacity: 0.9;">
                今天第 ${todayDraw.daysPlayed} 天 / 共 ${targetDays} 天
                ${todayDraw.isRedownload ? '<span style="font-size: 12px; background: rgba(255,255,255,0.3); padding: 2px 8px; border-radius: 10px; margin-left: 8px;">重新下载</span>' : ''}
            </div>
            <div class="progress-bar" style="background: rgba(255,255,255,0.3); margin: 16px auto; max-width: 300px;">
                <div class="progress-fill" style="width: ${progressPercent}%; background: #fff;"></div>
            </div>
            <div style="font-size: 14px; opacity: 0.8; margin-top: 8px;">
                ${remainingDays > 0 ? `还需玩 ${remainingDays} 天即可删除` : '已完成，可以删除！'}
            </div>
            <div style="font-size: 12px; opacity: 0.6; margin-top: 12px;">
                ✅ 今天已经抽签过了，明天再来吧
            </div>
        </div>
    `;
    
    // 刷新游戏列表和统计
    renderGamesList();
    renderGameStats();
    renderGameDrawHistoryList();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    init();
    initCalendars();
});
