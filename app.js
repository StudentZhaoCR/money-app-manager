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

// 自动备份存储键
const AUTO_BACKUP_SETTINGS_KEY = 'moneyApp_autoBackupSettings';
const BACKUP_HISTORY_KEY = 'moneyApp_backupHistory';

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
                    ${(() => {
                        // 计算待支出金额可以覆盖的软件
                        const pendingExpense = installment.pendingExpense || 0;
                        // 按目标金额从小到大排序
                        const sortedGoals = [...installment.appGoals].sort((a, b) => a.totalTarget - b.totalTarget);
                        let remainingAmount = pendingExpense;
                        let coveredCount = 0;
                        const coveredAppIds = [];
                        let partialCoveredApp = null;
                        let partialCoverPercent = 0;
                        
                        for (const goal of sortedGoals) {
                            if (remainingAmount >= goal.totalTarget) {
                                remainingAmount -= goal.totalTarget;
                                coveredCount++;
                                coveredAppIds.push(goal.appId);
                            } else if (remainingAmount > 0) {
                                // 部分覆盖
                                partialCoveredApp = goal.appId;
                                partialCoverPercent = (remainingAmount / goal.totalTarget) * 100;
                                remainingAmount = 0;
                            } else {
                                break;
                            }
                        }
                        
                        return `
                    <div class="section-title" style="font-size: 14px; margin-bottom: 12px;">各软件目标 <span style="font-size: 12px; color: var(--success-color);">(${coveredCount}/${installment.appGoals.length}个可覆盖)</span></div>
                    ${installment.appGoals.map(goal => {
                        const isCovered = coveredAppIds.includes(goal.appId);
                        const isPartial = partialCoveredApp === goal.appId;
                        
                        let backgroundStyle = '';
                        if (isCovered) {
                            backgroundStyle = 'background: rgba(52, 211, 153, 0.1); border-left: 4px solid var(--success-color);';
                        } else if (isPartial) {
                            backgroundStyle = `background: linear-gradient(to right, rgba(52, 211, 153, 0.1) ${partialCoverPercent}%, transparent ${partialCoverPercent}%); border-left: 4px solid var(--success-color);`;
                        }
                        
                        return `
                        <div class="installment-app-goal-item ${isCovered ? 'app-goal-completed' : ''}" style="${backgroundStyle}">
                            <div class="installment-app-goal-header">
                                <span class="installment-app-name">${goal.phoneName} - ${goal.appName} ${isCovered ? '✅' : ''}</span>
                                <span class="installment-app-target">目标: ¥${goal.totalTarget.toFixed(2)}</span>
                            </div>
                            <div class="installment-app-goal-details">
                                <span>每日目标: ¥${goal.dailyTarget.toFixed(2)}</span>
                            </div>
                            <div class="installment-app-goal-actions">
                                <button class="btn btn-secondary btn-sm" onclick="editAppGoalAmount('${installment.id}')">修改目标</button>
                            </div>
                        </div>
                    `}).join('')}`;
                    })()}
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
    const today = getCurrentDate();
    const history = phone.dailyTotalEarnedHistory || {};
    // 使用新的计算函数获取当前总已赚金额
    const currentTotalEarned = calculatePhoneTotalEarned(phone);

    // 找到昨天结束时的总赚取作为今天开始的基准
    const yesterdayDate = new Date(today);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];
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

    console.log(`手机 ${phone.name} 计算今日赚取:`, {
        today: today,
        yesterday: yesterday,
        currentTotalEarned: currentTotalEarned,
        yesterdayTotal: yesterdayTotal,
        todayEarned: todayEarned,
        history: history
    });

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

    // 获取所有成就列表
    static getAllAchievements() {
        const achievements = this.getAchievements();
        const allAchievements = [
            { id: 'first_withdrawal', name: '🎉 首次提现', desc: '完成第一次提现', unlocked: achievements.includes('🎉 首次提现') },
            { id: 'earn_100', name: '💰 累计赚取100元', desc: '累计赚取达到100元', unlocked: achievements.includes('💰 累计赚取100元') },
            { id: 'earn_500', name: '💎 累计赚取500元', desc: '累计赚取达到500元', unlocked: achievements.includes('💎 累计赚取500元') },
            { id: 'earn_1000', name: '🏆 累计赚取1000元', desc: '累计赚取达到1000元', unlocked: achievements.includes('🏆 累计赚取1000元') },
            { id: 'add_10_apps', name: '📱 添加10个软件', desc: '添加10个赚钱软件', unlocked: achievements.includes('📱 添加10个软件') },
            { id: 'add_5_phones', name: '📲 添加5部手机', desc: '添加5部手机', unlocked: achievements.includes('📲 添加5部手机') }
        ];
        return allAchievements;
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

                const today = getCurrentDate();
                if (!app.dailyEarnedHistory) {
                    app.dailyEarnedHistory = {};
                }
                
                // 检查是否是第一次设置余额（初始状态：balance为0，earned为0，且没有编辑过）
                // 使用 lastEditDate 来判断是否编辑过
                const hasEditedBefore = app.lastEditDate !== undefined;
                const isFirstTimeSetup = (oldBalance === 0 && oldEarned === 0 && !hasEditedBefore);
                
                // 先更新余额（必须在计算已赚金额之前）
                app.balance = formattedBalance;

                // 更新已赚金额：如果余额增加，earned也增加；如果余额减少，earned不变（因为可能是提现）
                // 第一次设置余额时也记录收益（从0到X的变化）
                if (balanceChange > 0) {
                    // 余额增加，说明有新收入
                    app.earned = oldEarned + balanceChange;
                }
                // 如果余额减少，可能是提现，earned保持不变

                // 保存今天最终的已赚金额（使用新的计算方式）
                // 注意：calculateAppEarned 会使用更新后的 app.balance
                app.dailyEarnedHistory[today] = calculateAppEarned(app);
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

    // 获取下载的游戏列表（过滤掉已删除的，可按手机ID筛选）
    static getDownloadedGames(phoneId = null) {
        const games = localStorage.getItem(DOWNLOADED_GAMES_KEY);
        if (!games) return [];
        const allGames = JSON.parse(games);
        // 只返回未删除的游戏
        let filteredGames = allGames.filter(g => !g.deleted);
        // 如果指定了手机ID（包括空字符串），只返回该手机的游戏
        // 将空字符串也视为 null（全部手机）
        const effectivePhoneId = phoneId || null;
        if (effectivePhoneId !== null) {
            filteredGames = filteredGames.filter(g => g.phoneId === effectivePhoneId);
        }
        return filteredGames;
    }
    
    // 获取所有游戏（包括已删除的，用于判断是否是重新下载）
    static getAllGames() {
        const games = localStorage.getItem(DOWNLOADED_GAMES_KEY);
        return games ? JSON.parse(games) : [];
    }
    
    // 获取有游戏的所有手机ID列表
    static getPhonesWithGames() {
        const games = this.getDownloadedGames();
        const phoneIds = [...new Set(games.map(g => g.phoneId).filter(id => id !== null))];
        return phoneIds;
    }

    // 保存下载的游戏列表
    static saveDownloadedGames(games) {
        localStorage.setItem(DOWNLOADED_GAMES_KEY, JSON.stringify(games));
    }

    // 添加新下载的游戏
    static addDownloadedGame(gameName, phoneId = null) {
        const games = this.getDownloadedGames();
        const allGames = this.getAllGames();
        const today = new Date().toISOString().split('T')[0];
        
        // 检查是否之前下载过这个游戏（已删除的）- 需要匹配同一手机
        const deletedGame = allGames.find(g => 
            g.name === gameName && 
            g.deleted === true &&
            g.phoneId === phoneId
        );
        
        // 如果是重新下载，只需要玩3天
        const isRedownload = !!deletedGame;
        const targetDays = isRedownload ? 3 : 7;
        
        const game = {
            id: Date.now().toString(),
            name: gameName,
            phoneId: phoneId,  // 关联手机ID
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
            const today = getCurrentDate();
            
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

    // 获取今日要玩的游戏（抽签决定，可按手机ID筛选）
    static getTodayGameToPlay(phoneId = null) {
        const games = this.getDownloadedGames(phoneId);
        const today = new Date().toISOString().split('T')[0];
        
        // 过滤出未完成的游戏
        const activeGames = games.filter(g => !g.completed);
        
        if (activeGames.length === 0) {
            return null;
        }
        
        // 如果有多个游戏，随机选择一个
        const randomIndex = Math.floor(Math.random() * activeGames.length);
        const selectedGame = activeGames[randomIndex];
        
        // 不再自动更新天数，天数在点击完成时更新
        // 使用当前天数（未增加）
        const daysPlayed = selectedGame.daysPlayed;
        
        // 保存抽签历史
        const targetDays = selectedGame.targetDays || 7;
        const drawHistory = this.getGameDrawHistory();
        // 使用传入的 phoneId 参数，确保保存的是当前选中的手机ID
        const savedPhoneId = phoneId || null;
        
        console.log('保存抽签历史:', {
            date: today,
            gameName: selectedGame.name,
            phoneId: savedPhoneId,
            daysPlayed: daysPlayed
        });
        
        drawHistory.unshift({
            date: today,
            gameId: selectedGame.id,
            gameName: selectedGame.name,
            phoneId: savedPhoneId,
            daysPlayed: daysPlayed,
            remainingDays: targetDays - daysPlayed,
            targetDays: targetDays,
            isRedownload: selectedGame.isRedownload || false
        });
        
        // 只保留最近30天的记录
        if (drawHistory.length > 30) {
            drawHistory.pop();
        }
        
        this.saveGameDrawHistory(drawHistory);
        console.log('保存后的历史记录:', drawHistory);
        
        return selectedGame;
    }

    // 获取抽签历史
    static getGameDrawHistory() {
        const history = localStorage.getItem(GAME_DRAW_HISTORY_KEY);
        console.log('从localStorage读取抽签历史:', history);
        return history ? JSON.parse(history) : [];
    }

    // 保存抽签历史
    static saveGameDrawHistory(history) {
        const jsonString = JSON.stringify(history);
        console.log('保存到localStorage的抽签历史:', jsonString);
        localStorage.setItem(GAME_DRAW_HISTORY_KEY, jsonString);
        console.log('保存完成，key:', GAME_DRAW_HISTORY_KEY);
    }

    // 获取游戏统计（可按手机ID筛选）
    static getGameStats(phoneId = null) {
        const games = this.getDownloadedGames(phoneId);
        const today = new Date().toISOString().split('T')[0];
        
        return {
            totalGames: games.length,
            activeGames: games.filter(g => !g.completed).length,
            completedGames: games.filter(g => g.completed).length,
            canDeleteGames: games.filter(g => g.canDelete).length,
            todayGames: games.filter(g => g.lastPlayedDate === today).length
        };
    }
    
    // 获取所有手机的游戏统计
    static getAllPhonesGameStats() {
        const data = this.loadData();
        const phoneIds = this.getPhonesWithGames();
        
        const stats = [];
        
        // 为每个有游戏的手机生成统计
        phoneIds.forEach(phoneId => {
            const phone = data.phones.find(p => p.id === phoneId);
            if (phone) {
                stats.push({
                    phoneId: phoneId,
                    phoneName: phone.name,
                    ...this.getGameStats(phoneId)
                });
            }
        });
        
        // 添加未关联手机的游戏统计
        const unlinkedStats = this.getGameStats(null);
        if (unlinkedStats.totalGames > 0) {
            stats.push({
                phoneId: null,
                phoneName: '未指定手机',
                ...unlinkedStats
            });
        }
        
        return stats;
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
    
    static getPhoneGameDrawHistory(phoneId) {
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
        
        // 清除游戏管理相关的存储键
        localStorage.removeItem(DOWNLOADED_GAMES_KEY);
        localStorage.removeItem(GAME_DRAW_HISTORY_KEY);
        
        // 清除成就系统和游戏化相关的存储键
        localStorage.removeItem(ACHIEVEMENTS_KEY);
        localStorage.removeItem(DAILY_TASKS_KEY);
        localStorage.removeItem(USER_LEVEL_KEY);
        localStorage.removeItem(CHECKIN_KEY);
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
    // 注册Service Worker（PWA支持）
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(function(registration) {
                console.log('Service Worker registered:', registration);
            })
            .catch(function(error) {
                console.log('Service Worker registration failed:', error);
            });
    }

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

    // 自动保存昨天的最终状态（如果昨天没有记录）
    autoSaveYesterdayHistory();

    // 修复旧版本数据：为没有历史记录的手机初始化历史记录
    migrateOldData();

    // 初始化所有页面
    updateAllDates();
    renderDashboard();
    renderPhones();
    renderStats();
    renderSettings();

    // 初始化提醒系统
    initNotificationSystem();
    checkReminders();
    
    // 检查自动备份
    checkAutoBackup();
    
    // 加载自动备份设置
    loadAutoBackupSettings();
}

// 修复旧版本数据：为没有历史记录的手机初始化历史记录
function migrateOldData() {
    const data = DataManager.loadData();
    const today = getCurrentDate();
    let hasChanges = false;

    data.phones.forEach(phone => {
        // 如果没有历史记录，初始化
        if (!phone.dailyTotalEarnedHistory) {
            phone.dailyTotalEarnedHistory = {};
        }

        // 为每个软件迁移和修复历史记录
        phone.apps.forEach(app => {
            // 初始化 dailyEarnedHistory
            if (!app.dailyEarnedHistory) {
                app.dailyEarnedHistory = {};
                hasChanges = true;
            }

            // 如果软件有已赚金额但没有历史记录，需要重建历史记录
            const currentEarned = calculateAppEarned(app);
            const historyDates = Object.keys(app.dailyEarnedHistory);

            if (currentEarned > 0 && historyDates.length === 0) {
                // 旧版本数据：有已赚金额但没有历史记录
                // 策略：将累计已赚金额作为今天的记录
                // 这样明天就能正确计算今日新增
                app.dailyEarnedHistory[today] = currentEarned;
                hasChanges = true;
                console.log(`迁移数据：软件 ${app.name} 初始化今日历史记录 = ${currentEarned}`);
            }
        });

        // 如果今天没有记录，且手机有实际赚取，才保存当前总赚取
        if (phone.dailyTotalEarnedHistory[today] === undefined) {
            const currentTotalEarned = calculatePhoneTotalEarned(phone);
            // 只有有实际赚取的手机才初始化今天的记录
            if (currentTotalEarned > 0) {
                phone.dailyTotalEarnedHistory[today] = currentTotalEarned;
                hasChanges = true;
                console.log(`修复数据：手机 ${phone.name} 初始化今日历史记录 = ${currentTotalEarned}`);
            }
        }
    });

    if (hasChanges) {
        DataManager.saveData(data);
        console.log('数据修复完成：已为旧数据初始化历史记录');
    }
}

// 自动保存昨天的最终状态
function autoSaveYesterdayHistory() {
    const data = DataManager.loadData();
    const today = getCurrentDate();
    const yesterdayDate = new Date(today);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    let hasChanges = false;

    data.phones.forEach(phone => {
        // 保存手机昨天的最终状态
        if (!phone.dailyTotalEarnedHistory) {
            phone.dailyTotalEarnedHistory = {};
        }

        if (phone.dailyTotalEarnedHistory[yesterday] === undefined) {
            const datesBeforeYesterday = Object.keys(phone.dailyTotalEarnedHistory)
                .filter(d => d < yesterday)
                .sort();

            let yesterdayTotal = 0;
            if (datesBeforeYesterday.length > 0) {
                const lastRecordedDate = datesBeforeYesterday[datesBeforeYesterday.length - 1];
                yesterdayTotal = phone.dailyTotalEarnedHistory[lastRecordedDate];
            }

            phone.dailyTotalEarnedHistory[yesterday] = yesterdayTotal;
            hasChanges = true;
            console.log(`自动保存手机 ${phone.name} 昨天的最终状态: ${yesterdayTotal}`);
        }

        // 保存每个软件昨天的最终状态
        phone.apps.forEach(app => {
            if (!app.dailyEarnedHistory) {
                app.dailyEarnedHistory = {};
            }

            if (app.dailyEarnedHistory[yesterday] === undefined) {
                const datesBeforeYesterday = Object.keys(app.dailyEarnedHistory)
                    .filter(d => d < yesterday)
                    .sort();

                let yesterdayEarned = 0;
                if (datesBeforeYesterday.length > 0) {
                    const lastRecordedDate = datesBeforeYesterday[datesBeforeYesterday.length - 1];
                    yesterdayEarned = app.dailyEarnedHistory[lastRecordedDate];
                }

                app.dailyEarnedHistory[yesterday] = yesterdayEarned;
                hasChanges = true;
                console.log(`自动保存软件 ${app.name} 昨天的最终状态: ${yesterdayEarned}`);
            }
        });
    });

    if (hasChanges) {
        DataManager.saveData(data);
        console.log('已自动保存昨天的最终状态');
    }
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
        'warm-sunset': '温暖夕阳',
        'minimal-dark': '极简黑白',
        'morandi': '莫兰迪色',
        'forest': '森林自然',
        'business': '极简商务风',
        'dark': '暗黑模式'
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
// 页面状态存储
let pageStates = {};
let currentPage = 'dashboard';

function showPage(pageName) {
    // 保存当前页面状态
    saveCurrentPageState();
    
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
    
    // 恢复页面状态（仪表盘页面特殊处理）
    if (pageName === 'dashboard') {
        // 仪表盘页面始终从顶部开始，强制整个页面滚动到顶部
        window.scrollTo(0, 0);
        // 清除仪表盘页面的保存状态
        delete pageStates['dashboard'];
    } else {
        restorePageState(pageName);
    }
    
    // 更新底部导航
    document.querySelectorAll('.tab-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });
    
    currentPage = pageName;
}

// 保存当前页面状态
function saveCurrentPageState() {
    const pageElement = document.getElementById(`page-${currentPage}`);
    if (pageElement) {
        pageStates[currentPage] = {
            scrollTop: pageElement.scrollTop,
            expandedSections: getExpandedSections(currentPage),
            currentGamePhoneId: currentGamePhoneId // 保存游戏页面选中的手机
        };
    }
}

// 获取展开的区域
function getExpandedSections(pageName) {
    const expanded = [];
    if (pageName === 'phones') {
        // 保存展开的手机ID
        document.querySelectorAll('.phone-item.expanded').forEach(item => {
            expanded.push(item.dataset.phoneId);
        });
    }
    return expanded;
}

// 恢复页面状态
function restorePageState(pageName) {
    const state = pageStates[pageName];
    if (!state) return;
    
    const pageElement = document.getElementById(`page-${pageName}`);
    
    // 恢复展开的区域
    if (state.expandedSections) {
        state.expandedSections.forEach(id => {
            const element = document.querySelector(`[data-phone-id="${id}"]`);
            if (element) {
                element.classList.add('expanded');
            }
        });
    }
    
    // 恢复游戏页面选中的手机
    if (pageName === 'games' && state.currentGamePhoneId !== undefined) {
        currentGamePhoneId = state.currentGamePhoneId;
    }
    
    // 恢复滚动位置（仪表盘页面始终从顶部开始）
    if (pageElement) {
        if (pageName === 'dashboard') {
            // 仪表盘页面始终滚动到顶部，并清除保存的状态
            pageElement.scrollTop = 0;
            delete pageStates['dashboard'];
        } else if (state.scrollTop) {
            // 其他页面恢复之前的滚动位置
            setTimeout(() => {
                pageElement.scrollTop = state.scrollTop;
            }, 100);
        }
    }
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
    const today = getCurrentDate(); // 使用模拟日期（如果设置了）
    
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
                // 对于今天，只显示今天有编辑记录的软件
                const history = app.dailyEarnedHistory || {};
                const hasEditToday = history[today] !== undefined;
                
                // 调试信息
                console.log(`软件 ${app.name}: hasEditToday=${hasEditToday}`);
                console.log(`  history keys: ${Object.keys(history).join(', ')}`);
                console.log(`  history[${today}]=${history[today]}, history[${prevDate}]=${history[prevDate]}`);
                
                if (hasEditToday) {
                    // 今天有编辑，计算今日新增
                    // 方法：比较今天和昨天的累计已赚金额
                    const todayEarned = getAppEarnedOnDate(app, today);
                    const yesterdayEarned = getAppEarnedOnDate(app, prevDate);
                    displayEarned = Math.max(0, todayEarned - yesterdayEarned);
                    console.log(`  -> 今日新增: ${displayEarned} (todayEarned=${todayEarned}, yesterdayEarned=${yesterdayEarned})`);
                } else {
                    // 今天没有编辑，不显示
                    displayEarned = 0;
                }
            } else {
                // 对于历史日期，显示当日有新增的软件
                displayEarned = Math.max(0, dateEarned - prevEarned);
            }
            
            // 只显示当日有实际赚取的软件
            if (displayEarned > 0) {
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
            // 显示成就分享弹窗
            setTimeout(() => showAchievementShare(achievement), 1000);
        });
    }
    
    // 渲染收入趋势图表
    renderIncomeChart('week');
    
    // 渲染收入日历
    renderIncomeCalendar();
    
    // 渲染智能建议
    renderSmartSuggestions();
    
    // 渲染收入预测
    renderIncomePrediction();
    
    // 渲染软件收益排行
    renderAppRanking();
}

// 全局图表实例
let incomeChart = null;

// ==================== 智能建议助手 ====================

// 渲染智能建议
function renderSmartSuggestions() {
    const card = document.getElementById('smart-suggestions-card');
    const content = document.getElementById('smart-suggestions-content');
    if (!card || !content) return;
    
    const data = DataManager.loadData();
    const suggestions = generateSmartSuggestions(data);
    
    if (suggestions.length === 0) {
        card.style.display = 'none';
        return;
    }
    
    card.style.display = 'block';
    content.innerHTML = suggestions.map((suggestion, index) => `
        <div class="suggestion-item ${suggestion.type === 'urgent' ? 'warning' : suggestion.type === 'tip' ? 'info' : 'success'}" style="
            padding: 12px 16px;
            margin-bottom: 8px;
            border-left: 4px solid ${suggestion.type === 'urgent' ? '#ef4444' : suggestion.type === 'tip' ? '#3b82f6' : '#22c55e'};
            border-radius: var(--radius-md);
            display: flex;
            align-items: flex-start;
            gap: 12px;
            animation: slideIn 0.3s ease ${index * 0.1}s both;
        ">
            <span style="font-size: 24px;">${suggestion.icon}</span>
            <div style="flex: 1;">
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">${suggestion.title}</div>
                <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">${suggestion.description}</div>
            </div>
        </div>
    `).join('');
}

// 生成智能建议
function generateSmartSuggestions(data) {
    const suggestions = [];
    const today = new Date().toISOString().split('T')[0];
    
    // 1. 检查是否有即将到期的分期还款
    if (data.installments && data.installments.length > 0) {
        const upcomingInstallments = data.installments.filter(inst => {
            if (inst.status === 'completed') return false;
            const daysRemaining = Math.ceil((new Date(inst.dueDate) - new Date(today)) / (1000 * 60 * 60 * 24));
            return daysRemaining <= 3 && daysRemaining >= 0;
        });
        
        if (upcomingInstallments.length > 0) {
            suggestions.push({
                type: 'urgent',
                icon: '⚠️',
                title: '即将到期的还款',
                description: `你有 ${upcomingInstallments.length} 笔分期还款将在3天内到期，请确保资金充足。`
            });
        }
    }
    
    // 2. 检查是否有可提现的软件
    const readyToWithdraw = [];
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            if ((app.balance || 0) >= (app.minWithdraw || 0.3)) {
                readyToWithdraw.push({
                    phone: phone.name,
                    app: app.name,
                    balance: app.balance
                });
            }
        });
    });
    
    if (readyToWithdraw.length > 0) {
        const topApp = readyToWithdraw.sort((a, b) => b.balance - a.balance)[0];
        suggestions.push({
            type: 'tip',
            icon: '💰',
            title: '可以提现了！',
            description: `${topApp.phone} 的 ${topApp.app} 已达到提现门槛（¥${topApp.balance.toFixed(2)}），建议尽快提现。`
        });
    }
    
    // 3. 分析收入趋势
    let todayEarning = 0;
    let yesterdayEarning = 0;
    
    data.phones.forEach(phone => {
        if (phone.dailyTotalEarnedHistory) {
            const todayTotal = phone.dailyTotalEarnedHistory[today] || 0;
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            const yesterdayTotal = phone.dailyTotalEarnedHistory[yesterdayStr] || 0;
            
            todayEarning += todayTotal;
            yesterdayEarning += yesterdayTotal;
        }
    });
    
    if (todayEarning < yesterdayEarning && yesterdayEarning > 0) {
        suggestions.push({
            type: 'tip',
            icon: '📉',
            title: '今日收入下降',
            description: '今日收入比昨日有所下降，建议检查软件运行状态或增加玩机时间。'
        });
    }
    
    // 4. 检查长时间未更新的软件
    const inactiveApps = [];
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            if (app.dailyEarnedHistory) {
                const dates = Object.keys(app.dailyEarnedHistory);
                if (dates.length > 0) {
                    const lastDate = dates.sort().pop();
                    const daysSinceLastUpdate = Math.ceil((new Date(today) - new Date(lastDate)) / (1000 * 60 * 60 * 24));
                    if (daysSinceLastUpdate > 3) {
                        inactiveApps.push({
                            phone: phone.name,
                            app: app.name,
                            days: daysSinceLastUpdate
                        });
                    }
                }
            }
        });
    });
    
    if (inactiveApps.length > 0) {
        const inactiveApp = inactiveApps[0];
        suggestions.push({
            type: 'tip',
            icon: '⏰',
            title: '有软件需要关注',
            description: `${inactiveApp.phone} 的 ${inactiveApp.app} 已经 ${inactiveApp.days} 天没有更新余额了，建议检查一下。`
        });
    }
    
    // 5. 目标完成度提醒
    const yearlyGoal = DataManager.getYearlyGoal();
    if (yearlyGoal > 0) {
        const totalEarned = data.phones.reduce((sum, phone) => sum + calculatePhoneTotalEarned(phone), 0);
        const progress = (totalEarned / yearlyGoal) * 100;
        
        if (progress >= 50 && progress < 55) {
            suggestions.push({
                type: 'success',
                icon: '🎉',
                title: '目标达成50%！',
                description: '恭喜你已完成年度目标的50%，继续保持这个势头！'
            });
        } else if (progress >= 80 && progress < 85) {
            suggestions.push({
                type: 'success',
                icon: '🏆',
                title: '目标即将完成！',
                description: '你已经完成了年度目标的80%，最后冲刺阶段加油！'
            });
        }
    }
    
    // 6. 最佳软件推荐
    if (data.phones.length > 0) {
        let bestApp = null;
        let bestEarning = 0;
        
        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                const earned = calculateAppEarned(app);
                if (earned > bestEarning) {
                    bestEarning = earned;
                    bestApp = { phone: phone.name, app: app.name, earned };
                }
            });
        });
        
        if (bestApp && bestEarning > 0) {
            suggestions.push({
                type: 'success',
                icon: '⭐',
                title: '最赚钱的软件',
                description: `${bestApp.phone} 的 ${bestApp.app} 是你的最佳收入来源（累计 ¥${bestEarning.toFixed(2)}），建议优先使用。`
            });
        }
    }
    
    // 最多显示3条建议
    return suggestions.slice(0, 3);
}

// ==================== 收入预测功能 ====================

// 渲染收入预测
function renderIncomePrediction() {
    const card = document.getElementById('income-prediction-card');
    const content = document.getElementById('income-prediction-content');
    if (!card || !content) return;
    
    const data = DataManager.loadData();
    const prediction = calculateIncomePrediction(data);
    
    if (!prediction || prediction.dailyAverage <= 0) {
        card.style.display = 'none';
        return;
    }
    
    card.style.display = 'block';
    content.innerHTML = `
        <div class="prediction-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; text-align: center;">
            <div style="padding: 16px; background: var(--bg-cream); border-radius: var(--radius-md);">
                <div style="font-size: 24px; margin-bottom: 8px;">📈</div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">日均收入</div>
                <div style="font-size: 18px; font-weight: 700; color: var(--success-color);">¥${prediction.dailyAverage.toFixed(2)}</div>
            </div>
            <div style="padding: 16px; background: var(--bg-cream); border-radius: var(--radius-md);">
                <div style="font-size: 24px; margin-bottom: 8px;">🎯</div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">预计本月</div>
                <div style="font-size: 18px; font-weight: 700; color: var(--primary-color);">¥${prediction.monthlyEstimate.toFixed(2)}</div>
            </div>
            <div style="padding: 16px; background: var(--bg-cream); border-radius: var(--radius-md);">
                <div style="font-size: 24px; margin-bottom: 8px;">🏆</div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">预计全年</div>
                <div style="font-size: 18px; font-weight: 700; color: var(--accent-color);">¥${prediction.yearlyEstimate.toFixed(2)}</div>
            </div>
        </div>
        <div style="margin-top: 16px; padding: 12px; background: var(--bg-cream); border-radius: var(--radius-md); font-size: 13px; color: var(--text-secondary); text-align: center;">
            💡 基于最近7天的平均收入计算，仅供参考
        </div>
    `;
}

// 计算收入预测
function calculateIncomePrediction(data) {
    const today = new Date();
    let totalEarning = 0;
    let daysWithData = 0;
    
    // 计算最近7天的平均收入
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        let dayEarning = 0;
        data.phones.forEach(phone => {
            if (phone.dailyTotalEarnedHistory && phone.dailyTotalEarnedHistory[dateStr]) {
                const currentTotal = phone.dailyTotalEarnedHistory[dateStr];
                const prevDate = new Date(date);
                prevDate.setDate(prevDate.getDate() - 1);
                const prevDateStr = prevDate.toISOString().split('T')[0];
                let prevTotal = 0;
                
                if (phone.dailyTotalEarnedHistory[prevDateStr]) {
                    prevTotal = phone.dailyTotalEarnedHistory[prevDateStr];
                } else {
                    const dates = Object.keys(phone.dailyTotalEarnedHistory).sort();
                    const earlierDates = dates.filter(d => d < dateStr);
                    if (earlierDates.length > 0) {
                        prevTotal = phone.dailyTotalEarnedHistory[earlierDates[earlierDates.length - 1]];
                    }
                }
                
                dayEarning += Math.max(0, currentTotal - prevTotal);
            }
        });
        
        if (dayEarning > 0) {
            totalEarning += dayEarning;
            daysWithData++;
        }
    }
    
    if (daysWithData === 0) return null;
    
    const dailyAverage = totalEarning / daysWithData;
    const monthlyEstimate = dailyAverage * 30;
    const yearlyEstimate = dailyAverage * 365;
    
    return { dailyAverage, monthlyEstimate, yearlyEstimate };
}

// ==================== 软件收益排行功能 ====================

// 渲染软件收益排行
function renderAppRanking() {
    const card = document.getElementById('app-ranking-card');
    const content = document.getElementById('app-ranking-content');
    if (!card || !content) return;
    
    const data = DataManager.loadData();
    const rankings = calculateAppRankings(data);
    
    if (rankings.length === 0) {
        card.style.display = 'none';
        return;
    }
    
    card.style.display = 'block';
    
    // 只显示前5名
    const top5 = rankings.slice(0, 5);
    const maxEarning = top5[0].earned;
    
    content.innerHTML = top5.map((app, index) => {
        const percentage = (app.earned / maxEarning) * 100;
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        return `
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
                <span style="font-size: 24px; width: 32px; text-align: center;">${medals[index]}</span>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-weight: 600; color: var(--text-primary);">${app.appName}</span>
                        <span style="font-weight: 700; color: var(--success-color);">¥${app.earned.toFixed(2)}</span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">${app.phoneName}</div>
                    <div style="height: 6px; background: var(--bg-cream); border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; width: ${percentage}%; background: linear-gradient(90deg, var(--primary-color), var(--primary-light)); border-radius: 3px; transition: width 0.5s ease;"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 计算软件收益排行
function calculateAppRankings(data) {
    const rankings = [];
    
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            const earned = calculateAppEarned(app);
            if (earned > 0) {
                rankings.push({
                    phoneName: phone.name,
                    appName: app.name,
                    earned: earned,
                    balance: app.balance || 0,
                    withdrawn: app.withdrawalHistory ? app.withdrawalHistory.reduce((sum, w) => sum + w.amount, 0) : 0
                });
            }
        });
    });
    
    // 按收益排序
    return rankings.sort((a, b) => b.earned - a.earned);
}

// ==================== 成就分享功能 ====================

// 显示成就分享弹窗
function showAchievementShare(achievementName) {
    const data = DataManager.loadData();
    const totalEarned = data.phones.reduce((sum, phone) => sum + calculatePhoneTotalEarned(phone), 0);
    const totalPhones = data.phones.length;
    const totalApps = data.phones.reduce((sum, phone) => sum + phone.apps.length, 0);

    const content = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 64px; margin-bottom: 16px;">🎉</div>
            <div style="font-size: 24px; font-weight: 700; color: var(--primary-color); margin-bottom: 8px;">解锁新成就</div>
            <div style="font-size: 20px; font-weight: 600; color: var(--text-primary); margin-bottom: 20px; padding: 12px 24px; background: linear-gradient(135deg, var(--primary-light), var(--primary-color)); color: white; border-radius: var(--radius-lg); display: inline-block;">${achievementName}</div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 24px 0;">
                <div style="padding: 16px; background: var(--bg-cream); border-radius: var(--radius-md);">
                    <div style="font-size: 20px; font-weight: 700; color: var(--success-color);">¥${totalEarned.toFixed(2)}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">累计赚取</div>
                </div>
                <div style="padding: 16px; background: var(--bg-cream); border-radius: var(--radius-md);">
                    <div style="font-size: 20px; font-weight: 700; color: var(--primary-color);">${totalPhones}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">手机数量</div>
                </div>
                <div style="padding: 16px; background: var(--bg-cream); border-radius: var(--radius-md);">
                    <div style="font-size: 20px; font-weight: 700; color: var(--accent-color);">${totalApps}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">软件数量</div>
                </div>
            </div>

            <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 20px;">
                📅 ${new Date().toLocaleDateString('zh-CN')} | 赚钱软件管理系统
            </div>
        </div>
    `;

    showModal('🎉 成就解锁', content, [
        { text: '分享', class: 'btn-primary', action: () => shareAchievement(achievementName, totalEarned, totalPhones, totalApps) },
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}

// 分享成就
function shareAchievement(achievementName, totalEarned, totalPhones, totalApps) {
    const shareText = `🎉 我在【赚钱软件管理系统】解锁了成就：${achievementName}\n\n💰 累计赚取：¥${totalEarned.toFixed(2)}\n📱 管理手机：${totalPhones} 部\n📲 安装软件：${totalApps} 个\n\n一起来赚钱吧！`;

    if (navigator.share) {
        navigator.share({
            title: '解锁新成就！',
            text: shareText
        }).catch(() => {
            // 用户取消分享
        });
    } else {
        // 复制到剪贴板
        navigator.clipboard.writeText(shareText).then(() => {
            showToast('✅ 分享内容已复制到剪贴板');
        }).catch(() => {
            showToast('❌ 复制失败，请手动复制');
        });
    }

    closeModal();
}

// 渲染收入趋势图表
function renderIncomeChart(period = 'week') {
    const ctx = document.getElementById('incomeChart');
    if (!ctx) return;
    
    const data = DataManager.loadData();
    const dates = [];
    const earnings = [];
    
    // 计算日期范围
    const today = new Date();
    let days = 7;
    if (period === 'month') days = 30;
    if (period === 'year') days = 365;
    
    // 收集每日收入数据
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // 计算这一天的总收入
        let dayEarning = 0;
        data.phones.forEach(phone => {
            if (phone.dailyTotalEarnedHistory && phone.dailyTotalEarnedHistory[dateStr]) {
                const currentTotal = phone.dailyTotalEarnedHistory[dateStr];
                // 获取前一天的总额
                const prevDate = new Date(date);
                prevDate.setDate(prevDate.getDate() - 1);
                const prevDateStr = prevDate.toISOString().split('T')[0];
                let prevTotal = 0;
                
                if (phone.dailyTotalEarnedHistory[prevDateStr]) {
                    prevTotal = phone.dailyTotalEarnedHistory[prevDateStr];
                } else {
                    // 找更早的记录
                    const dates = Object.keys(phone.dailyTotalEarnedHistory).sort();
                    const earlierDates = dates.filter(d => d < dateStr);
                    if (earlierDates.length > 0) {
                        prevTotal = phone.dailyTotalEarnedHistory[earlierDates[earlierDates.length - 1]];
                    }
                }
                
                dayEarning += Math.max(0, currentTotal - prevTotal);
            }
        });
        
        dates.push(dateStr.slice(5)); // 只显示 MM-DD
        earnings.push(dayEarning);
    }
    
    // 销毁旧图表
    if (incomeChart) {
        incomeChart.destroy();
    }
    
    // 创建新图表
    incomeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: '每日收入 (元)',
                data: earnings,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#8b5cf6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return `收入: ¥${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        callback: function(value) {
                            return '¥' + value.toFixed(1);
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// 更新图表周期
function updateChartPeriod(period) {
    renderIncomeChart(period);
}

// ==================== 收入日历功能 ====================

// 当前日历显示的月份
let currentCalendarDate = new Date();

// 渲染收入日历
function renderIncomeCalendar() {
    const calendarGrid = document.getElementById('income-calendar');
    const monthYearLabel = document.getElementById('calendar-month-year');
    if (!calendarGrid || !monthYearLabel) return;
    
    const data = DataManager.loadData();
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // 更新月份标签
    monthYearLabel.textContent = `${year}年${month + 1}月`;
    
    // 获取当月第一天和最后一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = 周日
    
    // 星期标题
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    let html = weekDays.map(day => `
        <div style="text-align: center; font-weight: 600; padding: 8px; color: var(--text-secondary); font-size: 12px;">${day}</div>
    `).join('');
    
    // 空白格子（上月）
    for (let i = 0; i < startDayOfWeek; i++) {
        html += `<div style="padding: 8px;"></div>`;
    }
    
    // 日期格子
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = getDayData(dateStr, data);
        
        // 判断是否有数据
        const hasIncome = dayData.income > 0;
        const hasExpense = dayData.expense > 0;
        const hasWithdrawal = dayData.withdrawal > 0;
        const hasInstallment = dayData.installment;
        
        // 构建背景色（使用CSS变量支持暗黑模式）
        let backgroundColor = 'var(--bg-secondary)';
        let borderColor = 'var(--border-color)';
        let textColor = 'var(--text-primary)';
        if (hasIncome && hasExpense) {
            backgroundColor = 'rgba(251, 191, 36, 0.2)'; // 黄色 - 收入和支出都有
            textColor = 'var(--warning-color)';
        } else if (hasIncome) {
            backgroundColor = 'rgba(52, 211, 153, 0.2)'; // 绿色 - 有收入
            textColor = 'var(--success-color)';
        } else if (hasExpense) {
            backgroundColor = 'rgba(248, 113, 113, 0.2)'; // 红色 - 有支出
            textColor = 'var(--error-color)';
        } else if (hasWithdrawal) {
            backgroundColor = 'rgba(96, 165, 250, 0.2)'; // 蓝色 - 有提现
            textColor = 'var(--info-color)';
        } else if (hasInstallment) {
            backgroundColor = 'rgba(251, 191, 36, 0.2)'; // 黄色 - 还款日
            textColor = 'var(--warning-color)';
        }
        
        // 判断是否是今天
        const today = new Date().toISOString().split('T')[0];
        const isToday = dateStr === today;
        if (isToday) {
            borderColor = 'var(--primary-color)';
        }
        
        // 显示金额（只显示收入）
        const displayAmount = dayData.income > 0 ? `¥${dayData.income.toFixed(0)}` : '';
        
        html += `
            <div style="
                aspect-ratio: 1;
                background: ${backgroundColor};
                border: 2px solid ${borderColor};
                border-radius: var(--radius-md);
                padding: 4px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 11px;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"
               onclick="showDayDetail('${dateStr}')">
                <span style="font-weight: ${isToday ? '700' : '600'}; color: ${isToday ? 'var(--primary-color)' : textColor};">${day}</span>
                ${displayAmount ? `<span style="font-size: 9px; color: ${textColor}; margin-top: 2px;">${displayAmount}</span>` : ''}
            </div>
        `;
    }
    
    calendarGrid.innerHTML = html;
}

// 获取某一天的数据
function getDayData(dateStr, data) {
    let income = 0;
    let expense = 0;
    let withdrawal = 0;
    let installment = false;
    
    // 计算收入
    data.phones.forEach(phone => {
        if (phone.dailyTotalEarnedHistory && phone.dailyTotalEarnedHistory[dateStr]) {
            const currentTotal = phone.dailyTotalEarnedHistory[dateStr];
            const prevDate = new Date(dateStr);
            prevDate.setDate(prevDate.getDate() - 1);
            const prevDateStr = prevDate.toISOString().split('T')[0];
            let prevTotal = 0;
            
            if (phone.dailyTotalEarnedHistory[prevDateStr]) {
                prevTotal = phone.dailyTotalEarnedHistory[prevDateStr];
            } else {
                const dates = Object.keys(phone.dailyTotalEarnedHistory).sort();
                const earlierDates = dates.filter(d => d < dateStr);
                if (earlierDates.length > 0) {
                    prevTotal = phone.dailyTotalEarnedHistory[earlierDates[earlierDates.length - 1]];
                }
            }
            
            income += Math.max(0, currentTotal - prevTotal);
        }
    });
    
    // 计算支出
    if (data.expenses) {
        data.expenses.forEach(e => {
            if (e.date === dateStr) {
                expense += e.amount;
            }
        });
    }
    
    // 检查是否有提现
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            if (app.withdrawalHistory) {
                app.withdrawalHistory.forEach(w => {
                    if (w.date === dateStr) {
                        withdrawal += w.amount;
                    }
                });
            }
        });
    });
    
    // 检查是否是还款日
    if (data.installments) {
        installment = data.installments.some(inst => inst.dueDate === dateStr);
    }
    
    return { income, expense, withdrawal, installment };
}

// 切换日历月份
function changeCalendarMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    renderIncomeCalendar();
}

// 显示某天详情
function showDayDetail(dateStr) {
    const data = DataManager.loadData();
    const dayData = getDayData(dateStr, data);
    
    let content = `<div style="padding: 16px;">`;
    content += `<div style="font-weight: 600; margin-bottom: 12px; font-size: 16px;">${dateStr}</div>`;
    
    if (dayData.income > 0) {
        content += `<div style="margin-bottom: 8px; color: var(--success-color);">💰 收入: ¥${dayData.income.toFixed(2)}</div>`;
    }
    if (dayData.expense > 0) {
        content += `<div style="margin-bottom: 8px; color: var(--error-color);">💸 支出: ¥${dayData.expense.toFixed(2)}</div>`;
    }
    if (dayData.withdrawal > 0) {
        content += `<div style="margin-bottom: 8px; color: var(--info-color);">🏧 提现: ¥${dayData.withdrawal.toFixed(2)}</div>`;
    }
    if (dayData.installment) {
        content += `<div style="margin-bottom: 8px; color: var(--warning-color);">📅 有分期还款</div>`;
    }
    
    if (dayData.income === 0 && dayData.expense === 0 && dayData.withdrawal === 0 && !dayData.installment) {
        content += `<div style="color: var(--text-muted);">暂无记录</div>`;
    }
    
    content += `</div>`;
    
    showModal('日期详情', content, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}

// 全局搜索功能
function performSearch(query) {
    const resultsContainer = document.getElementById('search-results');
    
    if (!query || query.trim() === '') {
        resultsContainer.style.display = 'none';
        return;
    }
    
    query = query.toLowerCase().trim();
    const data = DataManager.loadData();
    const results = [];
    
    // 搜索手机
    data.phones.forEach(phone => {
        if (phone.name.toLowerCase().includes(query)) {
            results.push({
                type: 'phone',
                name: phone.name,
                id: phone.id,
                subtitle: `${phone.apps.length} 个软件`
            });
        }
        
        // 搜索软件
        phone.apps.forEach(app => {
            if (app.name.toLowerCase().includes(query)) {
                results.push({
                    type: 'app',
                    name: app.name,
                    phoneName: phone.name,
                    phoneId: phone.id,
                    appId: app.id,
                    subtitle: `余额: ¥${(app.balance || 0).toFixed(2)}`
                });
            }
        });
    });
    
    // 渲染搜索结果
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted);">未找到匹配结果</div>';
    } else {
        resultsContainer.innerHTML = results.map(result => `
            <div class="search-result-item" onclick="handleSearchResult('${result.type}', '${result.phoneId || result.id}', '${result.appId || ''}')" 
                 style="padding: 12px 16px; cursor: pointer; border-bottom: 1px solid var(--border-color); transition: background 0.2s;"
                 onmouseover="this.style.background='var(--bg-cream)'" 
                 onmouseout="this.style.background='transparent'">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 20px;">${result.type === 'phone' ? '📱' : '📲'}</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: var(--text-primary);">${result.name}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">${result.phoneName ? result.phoneName + ' · ' : ''}${result.subtitle}</div>
                    </div>
                    <span style="font-size: 12px; color: var(--primary-color); padding: 4px 8px; background: var(--bg-cream); border-radius: var(--radius-sm);">${result.type === 'phone' ? '手机' : '软件'}</span>
                </div>
            </div>
        `).join('');
    }
    
    resultsContainer.style.display = 'block';
}

// 处理搜索结果点击
function handleSearchResult(type, phoneId, appId) {
    if (type === 'phone') {
        // 先设置展开状态
        expandedPhones[phoneId] = true;
        localStorage.setItem('expandedPhones', JSON.stringify(expandedPhones));
        
        // 跳转到手机管理页面
        showPage('phones');
        
        // 滚动到该手机（只在手机管理页面中查找）
        setTimeout(() => {
            const phonesPage = document.getElementById('page-phones');
            if (!phonesPage) return;
            
            const phoneElement = phonesPage.querySelector(`[data-phone-id="${phoneId}"]`);
            if (phoneElement) {
                phoneElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                
                phoneElement.style.animation = 'highlight 1s ease';
                // 添加高亮边框
                phoneElement.style.border = '3px solid var(--primary-color)';
                setTimeout(() => {
                    phoneElement.style.border = '';
                }, 3000);
            }
        }, 500);
    } else if (type === 'app') {
        // 先设置展开状态
        expandedPhones[phoneId] = true;
        localStorage.setItem('expandedPhones', JSON.stringify(expandedPhones));
        
        // 跳转到手机管理页面
        showPage('phones');
        
        // 滚动并高亮（增加延迟确保手机展开和软件渲染完成）
        setTimeout(() => {
            // 只在手机管理页面中查找元素
            const phonesPage = document.getElementById('page-phones');
            if (!phonesPage) return;
            
            const phoneElement = phonesPage.querySelector(`[data-phone-id="${phoneId}"]`);
            const appElement = phonesPage.querySelector(`[data-app-id="${appId}"]`);
            
            console.log('搜索软件 - phoneId:', phoneId, 'appId:', appId);
            console.log('搜索软件 - phoneElement:', phoneElement);
            console.log('搜索软件 - appElement:', appElement);
            
            if (appElement) {
                // 滚动到软件元素（只在当前活动页面内）
                appElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                
                // 添加明显的高亮效果
                appElement.style.background = 'linear-gradient(135deg, var(--accent-light), var(--accent-color))';
                appElement.style.borderRadius = 'var(--radius-md)';
                appElement.style.boxShadow = '0 0 20px rgba(34, 211, 238, 0.5)';
                appElement.style.transform = 'scale(1.02)';
                appElement.style.transition = 'all 0.3s ease';
                appElement.style.zIndex = '10';
                
                // 3秒后移除高亮
                setTimeout(() => {
                    appElement.style.background = '';
                    appElement.style.boxShadow = '';
                    appElement.style.transform = '';
                    appElement.style.zIndex = '';
                }, 3000);
            } else if (phoneElement) {
                // 如果找不到软件，至少滚动到手机
                console.log('未找到软件元素，滚动到手机');
                phoneElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            } else {
                console.log('未找到手机和软件元素');
            }
        }, 800); // 增加延迟确保渲染完成
    }
    
    // 清除搜索
    clearSearch();
}

// 清除搜索
function clearSearch() {
    const searchInput = document.getElementById('global-search');
    const resultsContainer = document.getElementById('search-results');
    if (searchInput) searchInput.value = '';
    if (resultsContainer) resultsContainer.style.display = 'none';
}

// 点击外部关闭搜索结果
document.addEventListener('click', function(e) {
    const searchContainer = document.querySelector('.search-container');
    const resultsContainer = document.getElementById('search-results');
    if (searchContainer && resultsContainer && !searchContainer.contains(e.target)) {
        resultsContainer.style.display = 'none';
    }
});

// ==================== 自动备份功能 ====================

// 获取自动备份设置
function getAutoBackupSettings() {
    const settings = localStorage.getItem(AUTO_BACKUP_SETTINGS_KEY);
    return settings ? JSON.parse(settings) : {
        frequency: 'never',
        keepCount: 5,
        lastBackup: null
    };
}

// 保存自动备份设置
function saveAutoBackupSettings() {
    const frequency = document.getElementById('auto-backup-frequency')?.value || 'never';
    const keepCount = parseInt(document.getElementById('auto-backup-keep')?.value || '5');
    
    const settings = getAutoBackupSettings();
    settings.frequency = frequency;
    settings.keepCount = keepCount;
    
    localStorage.setItem(AUTO_BACKUP_SETTINGS_KEY, JSON.stringify(settings));
    showToast('备份设置已保存');
}

// 加载自动备份设置到UI
function loadAutoBackupSettings() {
    const settings = getAutoBackupSettings();
    
    const frequencySelect = document.getElementById('auto-backup-frequency');
    const keepSelect = document.getElementById('auto-backup-keep');
    const lastBackupDiv = document.getElementById('last-backup-time');
    
    if (frequencySelect) frequencySelect.value = settings.frequency;
    if (keepSelect) keepSelect.value = settings.keepCount.toString();
    if (lastBackupDiv) {
        if (settings.lastBackup) {
            const date = new Date(settings.lastBackup);
            lastBackupDiv.textContent = date.toLocaleString('zh-CN');
        } else {
            lastBackupDiv.textContent = '从未备份';
        }
    }
}

// 执行备份
function performBackup() {
    const data = DataManager.loadData();
    const backupData = {
        data: data,
        timestamp: new Date().toISOString(),
        version: '1.0'
    };
    
    // 保存到备份历史
    let backupHistory = JSON.parse(localStorage.getItem(BACKUP_HISTORY_KEY) || '[]');
    backupHistory.unshift({
        id: Date.now().toString(),
        timestamp: backupData.timestamp,
        size: JSON.stringify(backupData).length
    });
    
    // 限制备份数量
    const settings = getAutoBackupSettings();
    if (backupHistory.length > settings.keepCount) {
        backupHistory = backupHistory.slice(0, settings.keepCount);
    }
    
    localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(backupHistory));
    localStorage.setItem(`moneyApp_backup_${backupHistory[0].id}`, JSON.stringify(backupData));
    
    // 更新上次备份时间
    settings.lastBackup = backupData.timestamp;
    localStorage.setItem(AUTO_BACKUP_SETTINGS_KEY, JSON.stringify(settings));
    
    return backupHistory[0];
}

// 手动备份
function manualBackup() {
    try {
        const backup = performBackup();
        loadAutoBackupSettings();
        showToast(`✅ 备份成功！备份ID: ${backup.id.slice(-6)}`);
    } catch (error) {
        showToast('❌ 备份失败: ' + error.message);
    }
}

// ==================== 空状态组件 ====================

// 生成空状态HTML
function generateEmptyState(type, options = {}) {
    const emptyStates = {
        phones: {
            icon: '📱',
            title: '还没有添加手机',
            description: '添加你的第一台手机，开始记录赚钱之旅',
            action: '添加手机',
            actionFn: 'openAddPhoneModal()'
        },
        apps: {
            icon: '📲',
            title: '还没有添加软件',
            description: '为手机添加赚钱软件，追踪每个软件的收入',
            action: '添加软件',
            actionFn: 'openAddAppModal()'
        },
        installments: {
            icon: '💳',
            title: '还没有分期还款',
            description: '添加分期还款计划，合理安排还款资金',
            action: '添加分期',
            actionFn: 'openAddInstallmentModal()'
        },
        expenses: {
            icon: '💸',
            title: '还没有支出记录',
            description: '记录你的支出，更好地管理资金',
            action: '添加支出',
            actionFn: 'addExpense()'
        },
        games: {
            icon: '🎮',
            title: '还没有添加游戏',
            description: '添加下载的游戏，追踪游戏进度',
            action: '添加游戏',
            actionFn: 'openAddGameModal()'
        },
        todayApps: {
            icon: '📋',
            title: '今天没有需要关注的软件',
            description: '所有软件都运行良好，继续保持！',
            action: '',
            actionFn: ''
        },
        search: {
            icon: '🔍',
            title: '未找到匹配结果',
            description: '尝试使用其他关键词搜索',
            action: '',
            actionFn: ''
        },
        data: {
            icon: '📊',
            title: '暂无数据',
            description: '开始记录你的第一笔收入吧',
            action: '去记录',
            actionFn: 'showPage("phones")'
        }
    };
    
    const config = emptyStates[type] || emptyStates.data;
    
    // 合并自定义选项
    if (options.title) config.title = options.title;
    if (options.description) config.description = options.description;
    if (options.action) config.action = options.action;
    if (options.actionFn) config.actionFn = options.actionFn;
    
    let html = `
        <div class="empty-state">
            <div class="empty-state-illustration">${config.icon}</div>
            <div class="empty-state-title">${config.title}</div>
            <div class="empty-state-description">${config.description}</div>
    `;
    
    if (config.action && config.actionFn) {
        html += `<div class="empty-state-action" onclick="${config.actionFn}">${config.action}</div>`;
    }
    
    html += `</div>`;
    
    return html;
}

// 检查是否需要自动备份
function checkAutoBackup() {
    const settings = getAutoBackupSettings();
    if (settings.frequency === 'never') return;
    
    if (!settings.lastBackup) {
        performBackup();
        return;
    }
    
    const lastBackup = new Date(settings.lastBackup);
    const now = new Date();
    const diffDays = (now - lastBackup) / (1000 * 60 * 60 * 24);
    
    let shouldBackup = false;
    switch (settings.frequency) {
        case 'daily':
            shouldBackup = diffDays >= 1;
            break;
        case 'weekly':
            shouldBackup = diffDays >= 7;
            break;
        case 'monthly':
            shouldBackup = diffDays >= 30;
            break;
    }
    
    if (shouldBackup) {
        performBackup();
        console.log('自动备份已完成');
    }
}

// 显示备份历史
function showBackupHistory() {
    const backupHistory = JSON.parse(localStorage.getItem(BACKUP_HISTORY_KEY) || '[]');
    
    if (backupHistory.length === 0) {
        showModal('备份历史', '<div style="text-align: center; padding: 20px;">暂无备份记录</div>', [
            { text: '关闭', class: 'btn-secondary', action: closeModal }
        ]);
        return;
    }
    
    const content = `
        <div style="max-height: 400px; overflow-y: auto;">
            ${backupHistory.map((backup, index) => {
                const date = new Date(backup.timestamp);
                const size = (backup.size / 1024).toFixed(2);
                return `
                    <div style="padding: 12px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 600;">备份 #${index + 1}</div>
                            <div style="font-size: 12px; color: var(--text-secondary);">${date.toLocaleString('zh-CN')}</div>
                            <div style="font-size: 12px; color: var(--text-muted);">${size} KB</div>
                        </div>
                        <div class="flex gap-2">
                            <button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px;" onclick="restoreBackup('${backup.id}')">恢复</button>
                            <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="downloadBackup('${backup.id}')">下载</button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    showModal('备份历史', content, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}

// 恢复备份
function restoreBackup(backupId) {
    if (!confirm('确定要恢复此备份吗？当前数据将被覆盖！')) return;
    
    try {
        const backupData = JSON.parse(localStorage.getItem(`moneyApp_backup_${backupId}`));
        if (!backupData || !backupData.data) {
            showToast('❌ 备份数据损坏');
            return;
        }
        
        DataManager.saveData(backupData.data);
        showToast('✅ 备份恢复成功！页面将刷新...');
        setTimeout(() => location.reload(), 1500);
    } catch (error) {
        showToast('❌ 恢复失败: ' + error.message);
    }
}

// 下载备份
function downloadBackup(backupId) {
    try {
        const backupData = localStorage.getItem(`moneyApp_backup_${backupId}`);
        if (!backupData) {
            showToast('❌ 备份不存在');
            return;
        }
        
        const blob = new Blob([backupData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `moneyApp_backup_${backupId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('✅ 备份下载成功');
    } catch (error) {
        showToast('❌ 下载失败: ' + error.message);
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
        container.innerHTML = generateEmptyState('todayApps');
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

// 获取软件今日赚取金额
function getAppTodayEarned(appId) {
    const data = DataManager.loadData();
    const today = getCurrentDate();
    
    // 查找该软件所属的手机
    for (const phone of data.phones) {
        const app = phone.apps.find(a => a.id === appId);
        if (app) {
            // 获取软件历史记录
            const history = app.dailyEarnedHistory || {};
            
            // 找到昨天结束时的总赚取作为今天开始的基准
            const yesterdayDate = new Date(today);
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const yesterday = yesterdayDate.toISOString().split('T')[0];
            let yesterdayTotal = history[yesterday];
            
            if (yesterdayTotal === undefined) {
                // 昨天没有记录，找昨天之前最后一次记录
                const datesBeforeYesterday = Object.keys(history)
                    .filter(d => d <= yesterday)
                    .sort();
                
                if (datesBeforeYesterday.length > 0) {
                    yesterdayTotal = history[datesBeforeYesterday[datesBeforeYesterday.length - 1]];
                } else {
                    yesterdayTotal = 0;
                }
            }
            
            // 今日赚取 = 当前总赚取 - 昨天结束时的总赚取
            const currentTotalEarned = app.earned || 0;
            const todayEarned = Math.max(0, currentTotalEarned - yesterdayTotal);
            
            return todayEarned;
        }
    }
    
    return 0;
}

// 渲染手机管理页面
function renderPhones() {
    const data = DataManager.loadData();
    const container = document.getElementById('phone-grid');
    
    if (data.phones.length === 0) {
        container.innerHTML = generateEmptyState('phones');
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
        const today = getCurrentDate();
        const history = phone.dailyTotalEarnedHistory || {};
        // 使用新的计算函数获取当前总已赚金额
        const currentTotalEarned = calculatePhoneTotalEarned(phone);

        // 找到昨天结束时的总赚取作为今天开始的基准
        const yesterdayDate = new Date(today);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = yesterdayDate.toISOString().split('T')[0];
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
            <div class="app-card" data-app-id="${app.id}">
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
            <div class="app-item" data-app-id="${app.id}">
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
    const { installments: installmentGoals } = DataManager.calculateInstallmentGoals();
    
    // 更新总览数据
    document.getElementById('total-installment-amount').textContent = `¥${summary.totalInstallmentAmount.toFixed(2)}`;
    document.getElementById('installment-earned').textContent = `¥${summary.pendingExpense.toFixed(2)}`;  // 待支出金额
    document.getElementById('installment-needed').textContent = `¥${summary.pendingWithdrawal.toFixed(2)}`;  // 待提现金额
    document.getElementById('installment-overall-progress').textContent = `${summary.overallProgress.toFixed(0)}%`;
    document.getElementById('installment-progress-bar').style.width = `${summary.overallProgress}%`;
    
    // 计算每日需要赚取的金额
    calculateDailyEarnNeeded();
    
    // 更新最近还款日期
    if (installmentGoals.length > 0) {
        const nearestInstallment = installmentGoals[0];
        document.getElementById('nearest-due-date').textContent = `${nearestInstallment.dueDate} (${nearestInstallment.daysRemaining}天)`;
    } else {
        document.getElementById('nearest-due-date').textContent = '暂无';
    }

    // 渲染分期列表
    const container = document.getElementById('installment-list');
    if (installmentGoals.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无分期记录</div>';
        return;
    }
    
    // 为每个分期添加期数（如果没有的话）
    installmentGoals.forEach((inst, index) => {
        if (!inst.periodNumber) {
            inst.periodNumber = index + 1;
        }
    });

    // 找到当前期（期数最小且未完成的）
    const currentPeriod = installmentGoals
        .filter(inst => inst.status !== 'completed')
        .sort((a, b) => a.periodNumber - b.periodNumber)[0];
    const currentPeriodNumber = currentPeriod ? currentPeriod.periodNumber : null;

    // 计算每期的实际天数（第1期：今天到还款日，第2期：第1期还款日到第2期还款日，以此类推）
    const today = new Date().toISOString().split('T')[0];
    const periodDaysMap = {};

    // 按期数排序
    const sortedInstallments = [...installmentGoals].sort((a, b) => a.periodNumber - b.periodNumber);

    sortedInstallments.forEach((inst, index) => {
        const periodNum = inst.periodNumber;
        const dueDate = new Date(inst.dueDate);

        if (index === 0) {
            // 第1期：从今天到第1期还款日
            const todayDate = new Date(today);
            const days = Math.max(1, Math.ceil((dueDate - todayDate) / (1000 * 60 * 60 * 24)) + 1);
            periodDaysMap[periodNum] = days;
        } else {
            // 其他期：从上一期还款日到本期还款日
            const prevInst = sortedInstallments[index - 1];
            const prevDueDate = new Date(prevInst.dueDate);
            const days = Math.max(1, Math.ceil((dueDate - prevDueDate) / (1000 * 60 * 60 * 24)));
            periodDaysMap[periodNum] = days;
        }
    });

    container.innerHTML = installmentGoals.map((installment, index) => {
        // 确定紧急程度
        let urgencyClass = 'normal';
        if (installment.daysRemaining <= 3) {
            urgencyClass = 'urgent';
        } else if (installment.daysRemaining <= 7) {
            urgencyClass = 'warning';
        }

        const periodInfo = `第${installment.periodNumber}/${installmentGoals.length}期`;
        // 判断是否是当前期（期数最小的未完成期数）
        const isCurrentPeriod = installment.periodNumber === currentPeriodNumber;
        // 获取该期的实际天数
        const actualDays = periodDaysMap[installment.periodNumber] || installment.daysRemaining;
        // 计算该期的每日需要
        const dailyNeed = ((installment.amount - installment.pendingExpense) / (actualDays || 1)).toFixed(2);

        return `
            <div class="installment-item ${urgencyClass}">
                <div class="installment-header">
                    <div>
                        <h3 class="installment-platform">${installment.platform} ${periodInfo ? `<span style="font-size: 14px; color: var(--text-secondary);">(${periodInfo})</span>` : ''}</h3>
                        <p class="installment-date">还款日期: ${installment.dueDate}</p>
                    </div>
                    <span class="status-tag ${installment.status === 'active' ? 'ready' : 'pending'}">
                        ${installment.status === 'active' ? '进行中' : '已完成'}
                    </span>
                </div>
                <div class="installment-amount">¥${installment.amount.toFixed(2)}</div>
                <div class="installment-details">
                    <span>还款周期: ${actualDays}天</span>
                    <span>每日需要: ¥${dailyNeed}</span>
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
                    ${(() => {
                        // 计算待支出金额可以覆盖的软件
                        const pendingExpense = installment.pendingExpense || 0;
                        // 按目标金额从小到大排序
                        const sortedGoals = [...installment.appGoals].sort((a, b) => a.totalTarget - b.totalTarget);
                        let remainingAmount = pendingExpense;
                        let coveredCount = 0;
                        const coveredAppIds = [];
                        
                        for (const goal of sortedGoals) {
                            if (remainingAmount >= goal.totalTarget) {
                                remainingAmount -= goal.totalTarget;
                                coveredCount++;
                                coveredAppIds.push(goal.appId);
                            } else {
                                break;
                            }
                        }
                        
                        return `
                    <div class="section-title" style="font-size: 14px; margin-bottom: 12px;">各软件目标 <span style="font-size: 12px; color: var(--success-color);">(${coveredCount}/${installment.appGoals.length}个可覆盖)</span></div>
                    ${installment.appGoals.map(goal => {
                        const isCovered = coveredAppIds.includes(goal.appId);
                        return `
                        <div class="installment-app-goal-item ${isCovered ? 'app-goal-completed' : ''}" style="${isCovered ? 'background: rgba(52, 211, 153, 0.1); border-left: 4px solid var(--success-color);' : ''}">
                            <div class="installment-app-goal-header">
                                <span class="installment-app-name">${goal.phoneName} - ${goal.appName} ${isCovered ? '✅' : ''}</span>
                                <span class="installment-app-target">目标: ¥${goal.totalTarget.toFixed(2)}</span>
                            </div>
                            <div class="installment-app-goal-details">
                                <span>每日目标: ¥${goal.dailyTarget.toFixed(2)}</span>
                            </div>
                            <div class="installment-app-goal-actions">
                                <button class="btn btn-secondary btn-sm" onclick="editAppGoalAmount('${installment.id}')">修改目标</button>
                            </div>
                        </div>
                    `}).join('')}`;
                    })()}
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

// 计算每日需要赚取的金额（按期数顺序还款，每期单独计算）
function calculateDailyEarnNeeded() {
    const data = DataManager.loadData();
    const today = new Date().toISOString().split('T')[0];

    // 获取所有未完成的分期
    const activeInstallments = data.installments.filter(inst => {
        return inst.status !== 'completed' && inst.dueDate >= today;
    });

    if (activeInstallments.length === 0) {
        document.getElementById('daily-earn-needed').textContent = '¥0.00';
        document.getElementById('installment-days-left').textContent = '0天';
        return;
    }

    // 按期数排序（先还期数小的）
    activeInstallments.sort((a, b) => (a.periodNumber || 1) - (b.periodNumber || 1));

    // 找到当前需要还的第一期（期数最小的）
    const currentPeriod = activeInstallments[0];
    const currentPeriodNumber = currentPeriod.periodNumber || 1;

    // 计算当前期还需要还的金额
    const remainingAmount = Math.max(0, currentPeriod.amount - (currentPeriod.pendingExpense || 0));

    // 计算当前期剩余天数
    const dueDate = new Date(currentPeriod.dueDate);
    const todayDate = new Date(today);
    const daysRemaining = Math.ceil((dueDate - todayDate) / (1000 * 60 * 60 * 24)) + 1; // +1 包含今天

    // 计算每日需要赚取的金额 = 当前期剩余金额 / 当前期剩余天数
    const dailyEarnNeeded = daysRemaining > 0 ? remainingAmount / daysRemaining : 0;

    document.getElementById('daily-earn-needed').textContent = `¥${dailyEarnNeeded.toFixed(2)}`;
    document.getElementById('installment-days-left').textContent = `第${currentPeriodNumber}期/${daysRemaining}天`;
}

// 打开批量添加分期模态框
function openBatchAddInstallmentModal() {
    const today = new Date().toISOString().split('T')[0];
    
    showModal('批量添加分期还款', `
        <div class="form-group">
            <label class="form-label">平台名称</label>
            <input type="text" id="batch-installment-platform" class="form-input" placeholder="输入平台名称（如：花呗、京东白条）">
        </div>
        <div class="form-group">
            <label class="form-label">总期数</label>
            <input type="number" id="batch-installment-periods" class="form-input" placeholder="输入总期数（如：12）" min="1" max="36">
        </div>
        <div class="form-group">
            <label class="form-label">每期还款金额 (元)</label>
            <input type="number" id="batch-installment-amount" class="form-input" placeholder="输入每期还款金额" step="0.01">
        </div>
        <div class="form-group">
            <label class="form-label">首次还款日期</label>
            <input type="date" id="batch-installment-first-date" class="form-input" value="${today}">
        </div>
        <div class="form-group">
            <label class="form-label">还款周期</label>
            <select id="batch-installment-cycle" class="form-input">
                <option value="monthly">每月</option>
                <option value="weekly">每周</option>
                <option value="biweekly">每两周</option>
            </select>
        </div>
        <div id="batch-installment-preview" style="margin-top: 16px; padding: 12px; background: var(--card-bg); border-radius: var(--radius-md); display: none;">
            <div style="font-weight: 600; margin-bottom: 8px;">预览</div>
            <div id="batch-preview-content"></div>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { 
            text: '预览', 
            class: 'btn-secondary', 
            action: () => previewBatchInstallments()
        },
        { 
            text: '添加', 
            class: 'btn-primary', 
            action: () => addBatchInstallments()
        }
    ], true);
}

// 预览批量分期
function previewBatchInstallments() {
    const platform = document.getElementById('batch-installment-platform').value.trim();
    const periods = parseInt(document.getElementById('batch-installment-periods').value);
    const amount = parseFloat(document.getElementById('batch-installment-amount').value);
    const firstDate = document.getElementById('batch-installment-first-date').value;
    const cycle = document.getElementById('batch-installment-cycle').value;
    
    if (!platform || !periods || !amount || !firstDate) {
        showToast('请填写完整信息');
        return;
    }
    
    const installments = calculateBatchInstallments(platform, periods, amount, firstDate, cycle);
    const totalAmount = amount * periods;
    
    const previewDiv = document.getElementById('batch-installment-preview');
    const contentDiv = document.getElementById('batch-preview-content');
    
    contentDiv.innerHTML = `
        <div style="margin-bottom: 12px;">
            <span style="color: var(--text-secondary);">总期数：</span>
            <span style="font-weight: 600;">${periods}期</span>
            <span style="color: var(--text-secondary); margin-left: 16px;">总金额：</span>
            <span style="font-weight: 600; color: var(--primary-color);">¥${totalAmount.toFixed(2)}</span>
        </div>
        <div style="max-height: 200px; overflow-y: auto;">
            ${installments.map((inst, index) => `
                <div style="padding: 8px; border-bottom: 1px solid var(--border-color); font-size: 14px;">
                    <span style="color: var(--text-secondary);">第${index + 1}期：</span>
                    <span style="font-weight: 500;">${inst.dueDate}</span>
                    <span style="float: right; color: var(--primary-color);">¥${inst.amount.toFixed(2)}</span>
                </div>
            `).join('')}
        </div>
    `;
    
    previewDiv.style.display = 'block';
}

// 计算批量分期
function calculateBatchInstallments(platform, periods, amount, firstDate, cycle) {
    const installments = [];
    let currentDate = new Date(firstDate);

    for (let i = 0; i < periods; i++) {
        installments.push({
            platform: platform,
            dueDate: currentDate.toISOString().split('T')[0],
            amount: amount,
            periodNumber: i + 1,  // 期数标记
            totalPeriods: periods,  // 总期数
            cycle: cycle  // 保存周期信息
        });

        // 根据周期计算下一期日期
        switch (cycle) {
            case 'weekly':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
            case 'biweekly':
                currentDate.setDate(currentDate.getDate() + 14);
                break;
            case 'monthly':
            default:
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
        }
    }

    return installments;
}

// 添加批量分期
function addBatchInstallments() {
    const platform = document.getElementById('batch-installment-platform').value.trim();
    const periods = parseInt(document.getElementById('batch-installment-periods').value);
    const amount = parseFloat(document.getElementById('batch-installment-amount').value);
    const firstDate = document.getElementById('batch-installment-first-date').value;
    const cycle = document.getElementById('batch-installment-cycle').value;
    
    if (!platform || !periods || !amount || !firstDate) {
        showToast('请填写完整信息');
        return;
    }
    
    const installments = calculateBatchInstallments(platform, periods, amount, firstDate, cycle);
    
    // 添加所有分期
    installments.forEach(inst => {
        DataManager.addInstallment(inst);
    });
    
    renderInstallments();
    showToast(`成功添加 ${periods} 期分期还款！`);
    closeModal();
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
        renderGamesPage();
        showToast('数据已清空！');
    }
}

// ==================== 日期模拟功能 ====================

// 全局模拟日期变量
let simulatedDate = null;

// 获取当前使用的日期（模拟日期或真实日期）
function getCurrentDate() {
    return simulatedDate || new Date().toISOString().split('T')[0];
}

// 应用日期模拟
function applyDateSimulation() {
    const dateInput = document.getElementById('simulated-date');
    const selectedDate = dateInput.value;

    if (!selectedDate) {
        showToast('请选择模拟日期');
        return;
    }

    simulatedDate = selectedDate;

    // 更新状态显示
    document.getElementById('simulation-status').innerHTML = `
        <span style="color: var(--primary-color); font-weight: 600;">模拟日期: ${selectedDate}</span>
    `;

    // 显示预览
    showSimulationPreview();

    // 自动保存昨天的最终状态（基于模拟日期）
    autoSaveYesterdayHistory();

    // 刷新所有页面
    renderDashboard();
    renderPhones();
    renderStats();

    showToast(`已切换到模拟日期: ${selectedDate}`);
}

// 重置日期模拟
function resetDateSimulation() {
    simulatedDate = null;

    // 更新状态显示
    document.getElementById('simulation-status').innerHTML = `
        <span style="color: var(--text-secondary);">使用真实日期</span>
    `;

    // 隐藏预览
    document.getElementById('simulation-preview').style.display = 'none';

    // 清空输入
    document.getElementById('simulated-date').value = '';

    // 刷新所有页面
    renderDashboard();
    renderPhones();
    renderStats();

    showToast('已重置为真实日期');
}

// 显示模拟效果预览
function showSimulationPreview() {
    const previewDiv = document.getElementById('simulation-preview');
    const contentDiv = document.getElementById('simulation-preview-content');

    const data = DataManager.loadData();
    const currentDate = getCurrentDate();

    // 计算每个手机的每日赚取
    let previewHtml = `<div style="margin-bottom: 8px;"><strong>模拟日期:</strong> ${currentDate}</div>`;

    data.phones.forEach(phone => {
        const todayEarned = calculatePhoneDailyEarned(phone, currentDate);
        previewHtml += `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color);">
                <strong>${phone.name}</strong>: 今日赚取 ¥${todayEarned.toFixed(2)}
            </div>
        `;

        // 显示每个软件的今日赚取
        phone.apps.forEach(app => {
            const appDailyEarned = calculateAppDailyEarned(app, currentDate);
            if (appDailyEarned > 0) {
                previewHtml += `
                    <div style="margin-left: 16px; font-size: 12px; color: var(--text-secondary);">
                        - ${app.name}: ¥${appDailyEarned.toFixed(2)}
                    </div>
                `;
            }
        });
    });

    contentDiv.innerHTML = previewHtml;
    previewDiv.style.display = 'block';
}

// 计算手机在指定日期的每日赚取
function calculatePhoneDailyEarned(phone, date) {
    if (!phone.dailyTotalEarnedHistory) {
        return 0;
    }

    // 获取指定日期的总赚取
    const dateTotal = phone.dailyTotalEarnedHistory[date];
    if (dateTotal === undefined) {
        return 0;
    }

    // 获取前一天的日期
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];

    // 获取前一天的总赚取
    const prevDateTotal = phone.dailyTotalEarnedHistory[prevDateStr];

    if (prevDateTotal === undefined) {
        // 如果前一天没有记录，查找更早的记录
        const dates = Object.keys(phone.dailyTotalEarnedHistory).sort();
        const earlierDates = dates.filter(d => d < date);
        if (earlierDates.length > 0) {
            const lastRecordedDate = earlierDates[earlierDates.length - 1];
            return dateTotal - phone.dailyTotalEarnedHistory[lastRecordedDate];
        }
        return dateTotal;
    }

    return dateTotal - prevDateTotal;
}

// 计算软件在指定日期的每日赚取
function calculateAppDailyEarned(app, date) {
    if (!app.dailyEarnedHistory) {
        return 0;
    }

    // 获取指定日期的赚取
    return app.dailyEarnedHistory[date] || 0;
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
    const input = document.getElementById('draw-game-name');
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
    const history = DataManager.getPhoneGameDrawHistory(currentGameDrawPhoneId);
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

// 当前选中的手机ID
let currentGamePhoneId = null;

// 渲染游戏管理页面
function renderGamesPage() {
    // 更新日期
    const now = new Date();
    const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    const gamesDateEl = document.getElementById('games-current-date');
    if (gamesDateEl) {
        gamesDateEl.textContent = dateStr;
    }
    
    // 渲染手机选择器（保持当前选中的手机）
    renderGamePhoneSelect();
    
    // 确保 currentGamePhoneId 与选择器同步
    const select = document.getElementById('game-phone-select');
    if (select && select.value !== (currentGamePhoneId || '')) {
        select.value = currentGamePhoneId || '';
    }
    
    // 重置抽签区域
    resetDrawArea();
    
    // 渲染游戏统计
    renderGameStats();
    
    // 渲染游戏列表
    renderGamesList();
    
    // 渲染抽签历史
    renderGameDrawHistoryList();
}

// 渲染手机选择器
function renderGamePhoneSelect() {
    const select = document.getElementById('game-phone-select');
    if (!select) return;
    
    const data = DataManager.loadData();
    
    let html = '<option value="">全部手机</option>';
    data.phones.forEach(phone => {
        html += `<option value="${phone.id}">${phone.name}</option>`;
    });
    
    select.innerHTML = html;
    
    // 使用 currentGamePhoneId 作为选中值
    select.value = currentGamePhoneId || '';
}

// 手机选择变化
function onGamePhoneChange() {
    const select = document.getElementById('game-phone-select');
    currentGamePhoneId = select.value || null;
    
    // 重置抽签区域
    resetDrawArea();
    
    // 重新渲染统计和列表
    renderGameStats();
    renderGameDrawHistoryList();
    renderGamesList();
}

// 重置抽签区域
function resetDrawArea() {
    const container = document.getElementById('today-game-result');
    if (!container) return;
    
    // 检查今天是否已经抽签（使用模拟日期）
    const today = getCurrentDate();
    const drawHistory = DataManager.getGameDrawHistory();
    const currentPhoneId = currentGamePhoneId || null;
    
    console.log('resetDrawArea - today:', today);
    console.log('resetDrawArea - currentPhoneId:', currentPhoneId);
    console.log('resetDrawArea - drawHistory:', drawHistory);
    
    const todayDraw = drawHistory.find(h => {
        const historyPhoneId = h.phoneId || null;
        const match = h.date === today && historyPhoneId === currentPhoneId;
        console.log(`检查记录: date=${h.date}, phoneId=${h.phoneId}, match=${match}`);
        return match;
    });
    
    console.log('resetDrawArea - todayDraw:', todayDraw);
    
    if (todayDraw) {
        // 今天已经抽签过了，显示抽签结果
        showTodayDrawResult(todayDraw);
    } else {
        // 今天还没抽签，显示抽签按钮
        container.innerHTML = `
            <div style="font-size: 18px; margin-bottom: 16px;">点击下方按钮抽签决定今天玩哪个游戏</div>
            <button class="btn" onclick="drawTodayGame()" style="background: white; color: #667eea; font-weight: bold; font-size: 16px;">🎮 开始抽签</button>
        `;
    }
}

// 渲染游戏统计
function renderGameStats() {
    const container = document.getElementById('phone-game-stats');
    if (!container) return;
    
    // 获取所有手机的游戏统计
    const allStats = DataManager.getAllPhonesGameStats();
    
    if (allStats.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无游戏数据</div>';
        return;
    }
    
    // 如果选中了特定手机，只显示该手机的统计
    const statsToShow = currentGamePhoneId 
        ? allStats.filter(s => s.phoneId === currentGamePhoneId)
        : allStats;
    
    container.innerHTML = statsToShow.map(stat => `
        <div style="margin-bottom: 16px; padding: 12px; background: var(--card-bg); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="font-weight: 600; margin-bottom: 12px; color: var(--text-primary);">${stat.phoneName}</div>
            <div class="stats-row">
                <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <span class="stat-label" style="color: white;">总游戏数</span>
                    <span class="stat-value" style="color: white;">${stat.totalGames}</span>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);">
                    <span class="stat-label" style="color: white;">进行中</span>
                    <span class="stat-value" style="color: white;">${stat.activeGames}</span>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
                    <span class="stat-label" style="color: white;">已完成</span>
                    <span class="stat-value" style="color: white;">${stat.completedGames}</span>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                    <span class="stat-label" style="color: white;">可删除</span>
                    <span class="stat-value" style="color: white;">${stat.canDeleteGames}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// 渲染游戏列表
function renderGamesList() {
    const games = DataManager.getDownloadedGames(currentGamePhoneId);
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
                <div class="game-info" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div class="game-details">
                        <div class="game-name" style="font-weight: 600; font-size: 16px;">${game.name}</div>
                        <div class="game-date" style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                            下载日期: ${game.downloadDate}
                        </div>
                    </div>
                    <div class="game-status" style="text-align: right;">
                        <span style="color: ${statusColor}; font-weight: 600; font-size: 14px;">${statusText}</span>
                    </div>
                </div>
                <div class="progress-item">
                    <div class="progress-header" style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span>游玩进度</span>
                        <span class="font-semibold">${Math.round(progressPercent)}%</span>
                    </div>
                    <div class="progress-bar" style="height: 8px; background: var(--bg-cream); border-radius: 4px; overflow: hidden;">
                        <div class="progress-fill" style="width: ${progressPercent}%; height: 100%; background: ${statusColor}; border-radius: 4px; transition: width 0.3s ease;"></div>
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
    // 直接读取 localStorage
    const historyStr = localStorage.getItem('moneyApp_gameDrawHistory');
    const history = historyStr ? JSON.parse(historyStr) : [];
    const container = document.getElementById('game-draw-history');
    
    console.log('渲染抽签历史，localStorage key:', 'moneyApp_gameDrawHistory');
    console.log('渲染抽签历史，localStorage 原始数据:', historyStr);
    console.log('渲染抽签历史，记录数:', history.length);
    console.log('历史记录:', history);
    
    if (history.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无抽签记录</div>';
        return;
    }
    
    // 获取手机名称映射
    const data = DataManager.loadData();
    const phoneMap = {};
    data.phones.forEach(phone => {
        phoneMap[phone.id] = phone.name;
    });
    
    const today = getCurrentDate();
    
    container.innerHTML = history.map((record, index) => {
        const phoneName = record.phoneId ? (phoneMap[record.phoneId] || '未知手机') : '未指定手机';
        const isGameCompleted = record.daysPlayed >= (record.targetDays || 7);
        const isTodayCompleted = record.completedToday === record.date;
        const isToday = record.date === today;
        
        return `
        <div class="draw-history-item ${isTodayCompleted ? 'completed-today' : ''}" style="padding: 12px; border-bottom: 1px solid var(--border-color); ${isTodayCompleted ? 'background: rgba(52, 211, 153, 0.1);' : ''}">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 500;">${record.date} ${isToday ? '<span style="font-size: 11px; background: var(--primary-color); color: white; padding: 2px 6px; border-radius: 10px;">今天</span>' : ''}</div>
                    <div style="font-size: 14px; color: var(--text-secondary); margin-top: 4px;">
                        🎮 ${record.gameName}
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                        📱 ${phoneName}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 14px; color: ${isGameCompleted ? 'var(--success-color)' : 'var(--primary-color)'}; font-weight: 600;">
                        ${isGameCompleted ? '✅ 游戏已完成' : `${record.daysPlayed}/${record.targetDays || 7}天`}
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary);">
                        ${isGameCompleted ? '' : `剩余${record.remainingDays}天`}
                    </div>
                    ${isToday ? `
                    <button class="btn btn-sm ${isTodayCompleted ? 'btn-secondary' : 'btn-success'}" 
                            onclick="completeDrawHistoryItem(${index})" 
                            style="margin-top: 8px; padding: 4px 12px; font-size: 12px;">
                        ${isTodayCompleted ? '✅ 今日已完成' : '标记今日完成'}
                    </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `}).join('');
}

// 标记抽签历史今日完成
function completeDrawHistoryItem(index) {
    const historyStr = localStorage.getItem('moneyApp_gameDrawHistory');
    const history = historyStr ? JSON.parse(historyStr) : [];
    
    if (index >= 0 && index < history.length) {
        const record = history[index];
        const today = getCurrentDate();
        
        // 只能标记今天的记录
        if (record.date !== today) {
            showToast('只能标记今天的记录', 'warning');
            return;
        }
        
        // 检查今天是否已经完成过
        if (record.completedToday === today) {
            showToast('今天已经标记完成了');
            return;
        }
        
        // 标记为已完成
        record.completedToday = today;
        
        // 更新游戏的天数
        const games = DataManager.getDownloadedGames();
        const game = games.find(g => g.id === record.gameId);
        if (game && !game.completed) {
            game.daysPlayed++;
            game.lastPlayedDate = today;
            
            // 检查是否完成全部天数
            const targetDays = game.targetDays || 7;
            if (game.daysPlayed >= targetDays) {
                game.completed = true;
                game.canDelete = true;
            }
            
            DataManager.saveDownloadedGames(games);
            
            // 更新抽签记录中的天数
            record.daysPlayed = game.daysPlayed;
            record.remainingDays = targetDays - game.daysPlayed;
        }
        
        showToast('🎉 恭喜完成今日游戏任务！');
        
        localStorage.setItem('moneyApp_gameDrawHistory', JSON.stringify(history));
        renderGameDrawHistoryList();
        
        // 同时更新今日抽签区域的显示
        resetDrawArea();
        
        // 刷新游戏列表和统计
        renderGamesList();
        renderGameStats();
    }
}

// 添加新游戏
function addNewGame() {
    const nameInput = document.getElementById('new-game-name');
    const gameName = nameInput.value.trim();
    
    if (!gameName) {
        showToast('请输入游戏名称');
        return;
    }
    
    // 使用当前选中的手机ID
    DataManager.addDownloadedGame(gameName, currentGamePhoneId);
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
    
    // 检查今天是否已经抽签（针对当前手机，使用模拟日期）
    const today = getCurrentDate();
    const drawHistory = DataManager.getGameDrawHistory();
    
    // 调试信息
    console.log('当前手机ID:', currentGamePhoneId);
    console.log('抽签历史:', drawHistory);
    
    // 将空字符串转换为null进行统一比较
    const currentPhoneId = currentGamePhoneId || null;
    const todayDraw = drawHistory.find(h => {
        const historyPhoneId = h.phoneId || null;
        const match = h.date === today && historyPhoneId === currentPhoneId;
        console.log(`检查历史记录: date=${h.date}, phoneId=${h.phoneId}, match=${match}`);
        return match;
    });
    
    if (todayDraw) {
        // 今天已经抽签过了，显示今天的抽签结果
        showTodayDrawResult(todayDraw);
        showToast('今天已经抽签过了，显示今日抽签结果');
        return;
    }
    
    // 今天还没抽签，执行抽签（针对当前手机）
    console.log('执行抽签，当前手机ID:', currentGamePhoneId);
    const result = DataManager.getTodayGameToPlay(currentGamePhoneId);
    
    if (!result) {
        container.innerHTML = `
            <div style="font-size: 18px; margin-bottom: 16px;">暂无进行中的游戏</div>
            <div style="font-size: 14px; opacity: 0.8;">请先添加新游戏</div>
        `;
        return;
    }
    
    // 抽签历史已经在 DataManager.getTodayGameToPlay 中保存了
    // 这里不需要重复保存
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
                    ${remainingDays <= 1 ? '即将完成，建议多玩一会' : remainingDays >= 3 ? '刚开始，适当体验即可' : '正常游玩'}
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
    
    // 检查今天是否已完成
    const today = getCurrentDate();
    const isCompletedToday = todayDraw.completedToday === today;
    
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
            
            <!-- 完成按钮 -->
            ${!isCompletedToday ? `
            <button class="btn" onclick="completeTodayGame()" style="background: rgba(255,255,255,0.9); color: #667eea; font-weight: bold; font-size: 16px; margin-top: 16px; padding: 12px 32px; border-radius: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                ✅ 标记今日已完成
            </button>
            ` : `
            <div style="font-size: 16px; color: #fff; font-weight: bold; margin-top: 16px; padding: 12px 24px; background: rgba(255,255,255,0.3); border-radius: 25px; display: inline-block;">
                ✅ 今日已完成
            </div>
            `}
            
            <div style="font-size: 12px; opacity: 0.6; margin-top: 12px;">
                ${isCompletedToday ? '明天再来抽签吧' : '玩够了就点击完成按钮'}
            </div>
        </div>
    `;
    
    // 刷新游戏列表和统计
    renderGamesList();
    renderGameStats();
    renderGameDrawHistoryList();
}

// 标记今日游戏已完成
function completeTodayGame() {
    const today = getCurrentDate();
    const drawHistory = DataManager.getGameDrawHistory();
    const currentPhoneId = currentGamePhoneId || null;
    
    // 找到今天的抽签记录
    const todayDrawIndex = drawHistory.findIndex(h => {
        const historyPhoneId = h.phoneId || null;
        return h.date === today && historyPhoneId === currentPhoneId;
    });
    
    if (todayDrawIndex >= 0) {
        const record = drawHistory[todayDrawIndex];
        
        // 检查今天是否已经完成过
        if (record.completedToday === today) {
            showToast('今天已经标记完成了');
            return;
        }
        
        // 标记为已完成
        record.completedToday = today;
        
        // 更新游戏的天数
        const games = DataManager.getDownloadedGames();
        const game = games.find(g => g.id === record.gameId);
        if (game && !game.completed) {
            game.daysPlayed++;
            game.lastPlayedDate = today;
            
            // 检查是否完成全部天数
            const targetDays = game.targetDays || 7;
            if (game.daysPlayed >= targetDays) {
                game.completed = true;
                game.canDelete = true;
            }
            
            DataManager.saveDownloadedGames(games);
            
            // 更新抽签记录中的天数
            record.daysPlayed = game.daysPlayed;
            record.remainingDays = targetDays - game.daysPlayed;
        }
        
        DataManager.saveGameDrawHistory(drawHistory);
        
        // 显示完成动画
        showToast('🎉 恭喜完成今日游戏任务！');
        
        // 重新渲染抽签结果
        showTodayDrawResult(record);
        
        // 刷新游戏列表和统计
        renderGamesList();
        renderGameStats();
        
        // 刷新抽签历史
        renderGameDrawHistoryList();
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    init();
    initCalendars();
});
