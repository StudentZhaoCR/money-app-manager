// 赚钱软件管理系统 - 主应用逻辑
const DATA_KEY = 'moneyAppData';
const PHONES_KEY = 'moneyApp_phones';
const INSTALLMENTS_KEY = 'moneyApp_installments';
const EXPENSES_KEY = 'moneyApp_expenses';
const SETTINGS_KEY = 'moneyApp_settings';

// 游戏管理存储键
const DOWNLOADED_GAMES_KEY = 'moneyApp_downloadedGames';
const GAME_DRAW_HISTORY_KEY = 'moneyApp_gameDrawHistory';

// ==================== 通用计算函数 ====================

// 计算软件的已赚金额（累计）
// 简化后：只计算已提现金额
function calculateAppEarned(app) {
    const withdrawn = (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
    return withdrawn;
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
    const today = new Date().toISOString().split('T')[0];
    showModal('添加分期还款', `
        <div class="form-group">
            <label class="form-label">平台名称</label>
            <input type="text" id="installment-platform" class="form-input" placeholder="如：花呗、京东白条">
        </div>
        <div class="form-group">
            <label class="form-label">还款日期</label>
            <input type="date" id="installment-due-date" class="form-input" value="${today}">
        </div>
        <div class="form-group">
            <label class="form-label">还款金额 (元)</label>
            <input type="number" id="installment-amount" class="form-input" placeholder="输入需还款总额" step="0.01">
        </div>
        <div class="form-hint" style="font-size: 12px; color: var(--text-secondary);">
            💡 添加后可用资金将自动计算，可随时手动还款
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

                if (!platform || !dueDate || !amount) {
                    showToast('请填写完整信息');
                    return;
                }

                if (parseFloat(amount) <= 0) {
                    showToast('还款金额必须大于0');
                    return;
                }

                DataManager.addInstallment({ platform, dueDate, amount });
                renderInstallments();
                showToast('分期添加成功！');
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

// 打开还款模态框
function openRepayModal(installmentId) {
    const data = DataManager.loadData();
    const installment = data.installments.find(i => i.id === installmentId);

    if (!installment) return;

    const remainingAmount = installment.amount - (installment.paidAmount || 0);
    const availableFunds = DataManager.calculateAvailableFunds();

    if (availableFunds <= 0) {
        showToast('可用资金不足，请先提现');
        return;
    }

    const maxRepayAmount = Math.min(remainingAmount, availableFunds);

    showModal('还款', `
        <div style="margin-bottom: 16px;">
            <div style="font-weight: 600; margin-bottom: 8px;">${installment.platform}</div>
            <div style="font-size: 13px; color: var(--text-secondary);">
                待还金额: ¥${remainingAmount.toFixed(2)}<br>
                可用资金: ¥${availableFunds.toFixed(2)}
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">还款金额 (元)</label>
            <input type="number" id="repay-amount" class="form-input" value="${maxRepayAmount.toFixed(2)}" step="0.01" max="${maxRepayAmount}">
        </div>
        <div class="flex gap-2" style="margin-top: 12px;">
            <button class="btn btn-secondary" style="flex: 1; padding: 8px;" onclick="document.getElementById('repay-amount').value = ${Math.min(remainingAmount * 0.1, availableFunds).toFixed(2)}">最低10%</button>
            <button class="btn btn-secondary" style="flex: 1; padding: 8px;" onclick="document.getElementById('repay-amount').value = ${(remainingAmount * 0.5).toFixed(2)}">还一半</button>
            <button class="btn btn-secondary" style="flex: 1; padding: 8px;" onclick="document.getElementById('repay-amount').value = ${maxRepayAmount.toFixed(2)}">全部还清</button>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        {
            text: '确认还款',
            class: 'btn-primary',
            action: () => {
                const amount = parseFloat(document.getElementById('repay-amount').value);

                if (!amount || amount <= 0) {
                    showToast('请输入有效的还款金额');
                    return;
                }

                const result = DataManager.repayInstallment(installmentId, amount);

                if (result.success) {
                    renderInstallments();
                    showToast(result.remainingAmount > 0 ?
                        `还款成功！还剩 ¥${result.remainingAmount.toFixed(2)} 待还` :
                        '🎉 恭喜！该分期已还清！'
                    );
                    closeModal();
                } else {
                    showToast(result.message);
                }
            }
        }
    ]);
}

// 查看还款历史
function viewRepaymentHistory(installmentId) {
    const data = DataManager.loadData();
    const installment = data.installments.find(i => i.id === installmentId);

    if (!installment || !installment.repaymentHistory || installment.repaymentHistory.length === 0) {
        showModal('还款历史', '<div style="text-align: center; padding: 20px;">暂无还款记录</div>', [
            { text: '关闭', class: 'btn-secondary', action: closeModal }
        ]);
        return;
    }

    const historyHtml = `
        <div style="max-height: 300px; overflow-y: auto;">
            ${installment.repaymentHistory.map((record, index) => `
                <div style="padding: 12px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600;">第 ${index + 1} 次还款</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">${record.date}</div>
                    </div>
                    <div style="font-weight: 700; color: var(--success-color);">¥${record.amount.toFixed(2)}</div>
                </div>
            `).join('')}
            <div style="padding: 12px; background: var(--bg-cream); margin-top: 12px; border-radius: var(--radius-md);">
                <div style="display: flex; justify-content: space-between;">
                    <span>已还总额:</span>
                    <span style="font-weight: 700;">¥${installment.paidAmount.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                    <span>分期总额:</span>
                    <span>¥${installment.amount.toFixed(2)}</span>
                </div>
            </div>
        </div>
    `;

    showModal('还款历史', historyHtml, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
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
                    <div class="section-title" style="font-size: 14px; margin-bottom: 12px;">各软件目标 ${(() => {
                        const completedCount = installment.appGoals.filter(goal => {
                            const todayEarned = getAppTodayEarned(goal.appId);
                            return todayEarned >= goal.dailyTarget;
                        }).length;
                        return `<span style="font-size: 12px; color: var(--success-color);">(${completedCount}/${installment.appGoals.length}个已完成)</span>`;
                    })()}</div>
                    ${installment.appGoals.map(goal => {
                        const todayEarned = getAppTodayEarned(goal.appId);
                        const isCompleted = todayEarned >= goal.dailyTarget;
                        return `
                        <div class="installment-app-goal-item ${isCompleted ? 'app-goal-completed' : ''}" style="${isCompleted ? 'background: rgba(52, 211, 153, 0.1); border-left: 4px solid var(--success-color);' : ''}">
                            <div class="installment-app-goal-header">
                                <span class="installment-app-name">${goal.phoneName} - ${goal.appName} ${isCompleted ? '✅' : ''}</span>
                                <span class="installment-app-target">目标: ¥${goal.totalTarget.toFixed(2)}</span>
                            </div>
                            <div class="installment-app-goal-details">
                                <span>每日目标: ¥${goal.dailyTarget.toFixed(2)}</span>
                                <span style="color: ${isCompleted ? 'var(--success-color)' : 'var(--text-secondary)'}; font-weight: ${isCompleted ? '600' : 'normal'};">今日: ¥${todayEarned.toFixed(2)}</span>
                            </div>
                            <div class="installment-app-goal-actions">
                                <button class="btn btn-secondary btn-sm" onclick="editAppGoalAmount('${installment.id}')">修改目标</button>
                            </div>
                        </div>
                    `}).join('')}
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
    
    // 计算该手机的总提现金额
    const totalWithdrawn = calculatePhoneTotalEarned(phone);
    
    // 计算该手机的提现次数
    const totalWithdrawals = phone.apps.reduce((sum, app) => {
        return sum + (app.withdrawals ? app.withdrawals.length : 0);
    }, 0);
    
    // 根据索引选择胶囊颜色（使用已有的index变量）
    const capsuleColors = ['purple', 'green', 'blue', 'orange', 'pink', 'cyan'];
    const capsuleColor = capsuleColors[index % capsuleColors.length];
    
    // 更新卡片内容
    cardElement.innerHTML = `
        <div class="phone-header">
            <div class="phone-header-top">
                <span class="phone-name-capsule capsule-${capsuleColor}" onclick="editPhoneName('${phone.id}')">${phone.name}</span>
                <div class="phone-header-actions">
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
                        <span class="stat-label">总提现</span>
                        <span class="stat-value">¥${totalWithdrawn.toFixed(2)}</span>
                    </div>
                </div>
                <div class="phone-stat-item">
                    <span class="stat-icon">📝</span>
                    <div class="stat-content">
                        <span class="stat-label">提现次数</span>
                        <span class="stat-value">${totalWithdrawals}次</span>
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
    
    // 使用统一函数计算已赚金额（现在只计算已提现金额）
    const earned = calculateAppEarned(app);
    const totalWithdrawals = app.withdrawals ? app.withdrawals.length : 0;
    
    // 更新卡片内容
    targetCard.innerHTML = `
        <div class="app-header">
            <span class="app-name">${app.name}</span>
            <span class="status-tag ${totalWithdrawals > 0 ? 'ready' : 'pending'}">
                ${totalWithdrawals > 0 ? '有记录' : '新软件'}
            </span>
        </div>
        <div class="app-core-info">
            <span class="core-label">累计提现:</span>
            <span class="core-value">¥${earned.toFixed(2)}</span>
        </div>
        <div class="app-info-row">
            <span>提现次数: ${totalWithdrawals}次</span>
        </div>
        <div class="action-buttons">
            <button class="btn btn-primary" onclick="openWithdrawModal('${phoneId}', '${appId}')">记录提现</button>
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
                settings: settings ? JSON.parse(settings) : {}
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
                    settings: parsedData.settings || {}
                };
            } else {
                result = {
                    phones: [],
                    installments: [],
                    expenses: [],
                    settings: {}
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
            // 清理已删除的字段
            phone.apps.forEach(app => {
                delete app.balance;
                delete app.initialBalance;
                delete app.earned;
                delete app.minWithdraw;
                delete app.remainingWithdrawn;
                delete app.dailyEarnedHistory;
                delete app.lastEditBalance;
                delete app.lastEditDate;
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
            const app = {
                id: Date.now().toString(),
                name: appData.name,
                withdrawn: 0,
                historicalWithdrawn: 0,
                withdrawals: [],
                lastUpdated: new Date().toISOString()
            };
            phone.apps.push(app);

            this.saveData(data);
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
                app.historicalWithdrawn = appData.historicalWithdrawn || 0;
                app.lastUpdated = new Date().toISOString();

                this.saveData(data);
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

    static withdraw(phoneId, appId, amount, date) {
        const data = this.loadData();
        const phone = data.phones.find(p => p.id === phoneId);
        if (phone) {
            const app = phone.apps.find(a => a.id === appId);
            if (app) {
                app.withdrawn = (app.withdrawn || 0) + amount;
                app.lastUpdated = new Date().toISOString();
                
                if (!app.withdrawals) {
                    app.withdrawals = [];
                }
                
                const dateStr = date || new Date().toISOString().split('T')[0];
                
                app.withdrawals.push({
                    id: Date.now().toString(),
                    amount: amount,
                    date: dateStr,
                    created: new Date().toISOString()
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
        }
        return data;
    }

    static deletePhone(phoneId) {
        const data = this.loadData();
        data.phones = data.phones.filter(p => p.id !== phoneId);
        this.saveData(data);
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
            paidAmount: 0,
            status: 'active',
            createdAt: new Date().toISOString(),
            repaymentHistory: []
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

    // 还款操作
    static repayInstallment(installmentId, amount) {
        const data = this.loadData();
        const installment = data.installments.find(i => i.id === installmentId);
        
        if (!installment) {
            return { success: false, message: '分期不存在' };
        }
        
        const repayAmount = parseFloat(amount);
        if (repayAmount <= 0) {
            return { success: false, message: '还款金额必须大于0' };
        }
        
        // 计算可用资金
        const availableFunds = this.calculateAvailableFunds();
        if (repayAmount > availableFunds) {
            return { success: false, message: '可用资金不足' };
        }
        
        // 更新分期数据
        installment.paidAmount = (installment.paidAmount || 0) + repayAmount;
        
        // 添加还款记录
        if (!installment.repaymentHistory) {
            installment.repaymentHistory = [];
        }
        installment.repaymentHistory.push({
            date: new Date().toISOString().split('T')[0],
            amount: repayAmount,
            timestamp: new Date().toISOString()
        });
        
        // 检查是否已还清
        if (installment.paidAmount >= installment.amount) {
            installment.status = 'completed';
        }
        
        this.saveData(data);
        return { 
            success: true, 
            message: '还款成功',
            remainingAmount: installment.amount - installment.paidAmount
        };
    }

    // 计算可用资金（总提现 - 总支出 - 已还分期）
    static calculateAvailableFunds() {
        const data = this.loadData();
        
        // 总提现金额
        const totalWithdrawn = data.phones.reduce((sum, phone) => {
            return sum + phone.apps.reduce((appSum, app) => {
                return appSum + (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
            }, 0);
        }, 0);
        
        // 总支出
        const totalExpenses = data.expenses ? data.expenses.reduce((sum, e) => sum + e.amount, 0) : 0;
        
        // 已还分期总额
        const totalRepaid = data.installments ? data.installments.reduce((sum, inst) => {
            return sum + (inst.paidAmount || 0);
        }, 0) : 0;
        
        return Math.max(0, totalWithdrawn - totalExpenses - totalRepaid);
    }

    // 获取分期统计
    static getInstallmentSummary() {
        const data = this.loadData();
        const now = new Date();
        
        const activeInstallments = data.installments.filter(i => i.status === 'active');
        const completedInstallments = data.installments.filter(i => i.status === 'completed');
        
        // 总待还金额
        const totalPendingAmount = activeInstallments.reduce((sum, inst) => {
            return sum + (inst.amount - (inst.paidAmount || 0));
        }, 0);
        
        // 总已还金额
        const totalRepaidAmount = data.installments.reduce((sum, inst) => {
            return sum + (inst.paidAmount || 0);
        }, 0);
        
        // 总分期金额
        const totalInstallmentAmount = data.installments.reduce((sum, inst) => sum + inst.amount, 0);
        
        // 可用资金
        const availableFunds = this.calculateAvailableFunds();
        
        // 最近还款日
        let nearestDueDate = null;
        let nearestDaysRemaining = 0;
        let nearestAmount = 0;
        
        if (activeInstallments.length > 0) {
            activeInstallments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
            nearestDueDate = activeInstallments[0].dueDate;
            nearestDaysRemaining = Math.max(0, Math.ceil((new Date(nearestDueDate) - now) / (1000 * 60 * 60 * 24)));
            nearestAmount = activeInstallments[0].amount - (activeInstallments[0].paidAmount || 0);
        }
        
        return {
            totalInstallmentAmount,
            totalPendingAmount,
            totalRepaidAmount,
            availableFunds,
            activeCount: activeInstallments.length,
            completedCount: completedInstallments.length,
            nearestDueDate,
            nearestDaysRemaining,
            nearestAmount
        };
    }

    // 获取分期列表（带详细信息）
    static getInstallmentsWithDetails() {
        const data = this.loadData();
        const now = new Date();
        const availableFunds = this.calculateAvailableFunds();
        
        return data.installments.map(installment => {
            const dueDate = new Date(installment.dueDate);
            const daysRemaining = Math.max(0, Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24)));
            const remainingAmount = installment.amount - (installment.paidAmount || 0);
            const progress = installment.amount > 0 ? ((installment.paidAmount || 0) / installment.amount) * 100 : 0;
            
            // 判断状态
            let statusText = '正常';
            let urgencyClass = '';
            if (installment.status === 'completed') {
                statusText = '已还清';
            } else if (daysRemaining < 0) {
                statusText = '已逾期';
                urgencyClass = 'urgent';
            } else if (daysRemaining <= 3) {
                statusText = '即将到期';
                urgencyClass = 'warning';
            }
            
            return {
                ...installment,
                daysRemaining,
                remainingAmount,
                progress,
                statusText,
                urgencyClass,
                canRepay: availableFunds > 0 && remainingAmount > 0
            };
        });
    }
}

// 全局状态
let currentPhoneId = null;
let currentAppId = null;
let expandedPhones = {};


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
                appName: app.name
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
    const targetDateInput = document.getElementById('target-date');
    if (targetDateInput) targetDateInput.value = dateStr;
    const expenseDateInput = document.getElementById('expense-date');
    if (expenseDateInput) expenseDateInput.value = dateStr;

    // 修复旧版本数据
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

// 提现提醒 - 已简化，不再基于余额检查
function checkWithdrawReminders() {
    // 简化后不再提醒提现门槛，因为不再追踪余额
}

// 每日目标提醒 - 已简化
function checkDailyGoalReminders() {
    const data = DataManager.loadData();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // 计算今日总提现
    let totalWithdrawnToday = 0;
    
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            if (app.withdrawals) {
                app.withdrawals.forEach(w => {
                    if (w.date === todayStr) {
                        totalWithdrawnToday += w.amount;
                    }
                });
            }
        });
    });
    
    // 每日目标提醒功能已简化
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
    
    const currentDateEl = document.getElementById('current-date');
    if (currentDateEl) currentDateEl.textContent = dateStr;
    const phonesCurrentDateEl = document.getElementById('phones-current-date');
    if (phonesCurrentDateEl) phonesCurrentDateEl.textContent = dateStr;
    const statsCurrentDateEl = document.getElementById('stats-current-date');
    if (statsCurrentDateEl) statsCurrentDateEl.textContent = dateStr;
    const settingsCurrentDateEl = document.getElementById('settings-current-date');
    if (settingsCurrentDateEl) settingsCurrentDateEl.textContent = dateStr;
    const installmentsCurrentDateEl = document.getElementById('installments-current-date');
    if (installmentsCurrentDateEl) installmentsCurrentDateEl.textContent = dateStr;
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

// 渲染仪表盘
function renderDashboard() {
    const data = DataManager.loadData();
    
    // 统计数据
    const totalPhones = data.phones.length;
    const totalApps = data.phones.reduce((sum, phone) => sum + phone.apps.length, 0);
    
    // 计算总提现金额
    const totalWithdrawnAmount = data.phones.reduce((sum, phone) => {
        return sum + phone.apps.reduce((appSum, app) => {
            return appSum + calculateAppEarned(app);
        }, 0);
    }, 0);
    const totalExpenses = data.expenses ? data.expenses.reduce((sum, e) => sum + e.amount, 0) : 0;
    const netEarning = totalWithdrawnAmount - totalExpenses;
    
    // 统计有提现记录的软件数量
    const appsWithWithdrawals = data.phones.reduce((sum, phone) => {
        return sum + phone.apps.filter(app => {
            const withdrawals = app.withdrawals || [];
            return withdrawals.length > 0;
        }).length;
    }, 0);
    
    // 更新DOM
    document.getElementById('total-phones').textContent = totalPhones;
    document.getElementById('total-apps').textContent = totalApps;
    document.getElementById('total-balance').textContent = `¥${netEarning.toFixed(2)}`;
    document.getElementById('ready-apps').textContent = appsWithWithdrawals;
    
    // 渲染今日需要关注的软件
    renderTodayApps(data);
    
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
    const today = getCurrentDate();

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

    // 2. 检查今日是否有提现记录
    let todayWithdrawals = 0;
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            if (app.withdrawals) {
                app.withdrawals.forEach(w => {
                    if (w.date === today) {
                        todayWithdrawals += w.amount;
                    }
                });
            }
        });
    });

    if (todayWithdrawals > 0) {
        suggestions.push({
            type: 'success',
            icon: '💰',
            title: '今日有提现记录！',
            description: `今天共提现 ¥${todayWithdrawals.toFixed(2)}，继续保持！`
        });
    } else {
        suggestions.push({
            type: 'tip',
            icon: '💡',
            title: '今日尚未提现',
            description: '今天还没有提现记录，记得从软件中提现哦！'
        });
    }

    // 3. 分析提现趋势
    let todayWithdrawal = 0;
    let yesterdayWithdrawal = 0;

    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            if (app.withdrawals) {
                app.withdrawals.forEach(w => {
                    if (w.date === today) {
                        todayWithdrawal += w.amount;
                    }
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];
                    if (w.date === yesterdayStr) {
                        yesterdayWithdrawal += w.amount;
                    }
                });
            }
        });
    });

    if (todayWithdrawal < yesterdayWithdrawal && yesterdayWithdrawal > 0) {
        suggestions.push({
            type: 'tip',
            icon: '📉',
            title: '今日提现下降',
            description: '今日提现金额比昨日有所下降，建议检查软件运行状态。'
        });
    }

    // 4. 检查长时间未提现的软件
    const inactiveApps = [];
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            if (app.withdrawals && app.withdrawals.length > 0) {
                const lastWithdrawal = app.withdrawals.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                if (lastWithdrawal) {
                    const daysSinceLastWithdrawal = Math.ceil((new Date(today) - new Date(lastWithdrawal.date)) / (1000 * 60 * 60 * 24));
                    if (daysSinceLastWithdrawal > 1) {
                        inactiveApps.push({
                            phone: phone.name,
                            app: app.name,
                            days: daysSinceLastWithdrawal
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
            title: '有软件需要提现',
            description: `${inactiveApp.phone} 的 ${inactiveApp.app} 已经 ${inactiveApp.days} 天没有提现了，建议检查一下。`
        });
    }

    // 5. 最佳提现软件推荐
    if (data.phones.length > 0) {
        let bestApp = null;
        let bestWithdrawal = 0;

        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                let totalWithdrawal = 0;
                if (app.withdrawals) {
                    totalWithdrawal = app.withdrawals.reduce((sum, w) => sum + w.amount, 0);
                }
                if (app.historicalWithdrawn) {
                    totalWithdrawal += app.historicalWithdrawn;
                }
                if (totalWithdrawal > bestWithdrawal) {
                    bestWithdrawal = totalWithdrawal;
                    bestApp = { phone: phone.name, app: app.name, withdrawal: totalWithdrawal };
                }
            });
        });

        if (bestApp && bestWithdrawal > 0) {
            suggestions.push({
                type: 'success',
                icon: '⭐',
                title: '最佳提现软件',
                description: `${bestApp.phone} 的 ${bestApp.app} 是你的最佳提现来源（累计 ¥${bestWithdrawal.toFixed(2)}），建议优先使用。`
            });
        }
    }

    // 最多显示3条建议
    return suggestions.slice(0, 3);
}

// ==================== 提现预测功能 ====================

// 渲染提现预测
function renderIncomePrediction() {
    const card = document.getElementById('income-prediction-card');
    const content = document.getElementById('income-prediction-content');
    if (!card || !content) return;

    const data = DataManager.loadData();
    const prediction = calculateWithdrawalPrediction(data);

    if (!prediction || prediction.dailyAverage <= 0) {
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';
    content.innerHTML = `
        <div class="prediction-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; text-align: center;">
            <div style="padding: 16px; background: var(--bg-cream); border-radius: var(--radius-md);">
                <div style="font-size: 24px; margin-bottom: 8px;">📈</div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">日均提现</div>
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
            💡 基于最近7天的平均提现计算，仅供参考
        </div>
    `;
}

// 计算提现预测
function calculateWithdrawalPrediction(data) {
    const today = new Date();
    let totalWithdrawal = 0;
    let daysWithData = 0;

    // 计算最近7天的平均提现
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        let dayWithdrawal = 0;
        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                if (app.withdrawals) {
                    app.withdrawals.forEach(w => {
                        if (w.date === dateStr) {
                            dayWithdrawal += w.amount;
                        }
                    });
                }
            });
        });

        if (dayWithdrawal > 0) {
            totalWithdrawal += dayWithdrawal;
            daysWithData++;
        }
    }
    
    if (daysWithData === 0) return null;

    const dailyAverage = totalWithdrawal / daysWithData;
    const monthlyEstimate = dailyAverage * 30;
    const yearlyEstimate = dailyAverage * 365;

    return { dailyAverage, monthlyEstimate, yearlyEstimate };
}

// ==================== 软件提现排行功能 ====================

// 渲染软件提现排行
function renderAppRanking() {
    const card = document.getElementById('app-ranking-card');
    const content = document.getElementById('app-ranking-content');
    if (!card || !content) return;

    const data = DataManager.loadData();
    const rankings = calculateAppWithdrawalRankings(data);

    if (rankings.length === 0) {
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';

    // 只显示前5名
    const top5 = rankings.slice(0, 5);
    const maxWithdrawal = top5[0].withdrawal;

    content.innerHTML = top5.map((app, index) => {
        const percentage = (app.withdrawal / maxWithdrawal) * 100;
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        return `
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
                <span style="font-size: 24px; width: 32px; text-align: center;">${medals[index]}</span>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-weight: 600; color: var(--text-primary);">${app.appName}</span>
                        <span style="font-weight: 700; color: var(--success-color);">¥${app.withdrawal.toFixed(2)}</span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">${app.phoneName} · 提现${app.withdrawalCount}次</div>
                    <div style="height: 6px; background: var(--bg-cream); border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; width: ${percentage}%; background: linear-gradient(90deg, var(--primary-color), var(--primary-light)); border-radius: 3px; transition: width 0.5s ease;"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 计算软件提现排行
function calculateAppWithdrawalRankings(data) {
    const rankings = [];

    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            // 计算总提现金额
            let totalWithdrawal = 0;
            let withdrawalCount = 0;

            if (app.withdrawals && app.withdrawals.length > 0) {
                withdrawalCount = app.withdrawals.length;
                totalWithdrawal = app.withdrawals.reduce((sum, w) => sum + w.amount, 0);
            }

            // 加上历史提现金额
            if (app.historicalWithdrawn && app.historicalWithdrawn > 0) {
                totalWithdrawal += app.historicalWithdrawn;
            }

            if (totalWithdrawal > 0) {
                rankings.push({
                    phoneName: phone.name,
                    appName: app.name,
                    withdrawal: totalWithdrawal,
                    withdrawalCount: withdrawalCount
                });
            }
        });
    });

    // 按提现金额排序
    return rankings.sort((a, b) => b.withdrawal - a.withdrawal);
}

// 渲染提现趋势图表
function renderIncomeChart(period = 'week') {
    const ctx = document.getElementById('incomeChart');
    if (!ctx) return;

    const data = DataManager.loadData();
    const dates = [];
    const withdrawals = [];

    // 计算日期范围
    const today = new Date();
    let days = 7;
    if (period === 'month') days = 30;
    if (period === 'year') days = 365;

    // 收集每日提现数据
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // 计算这一天的总提现金额
        let dayWithdrawal = 0;
        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                if (app.withdrawals) {
                    app.withdrawals.forEach(w => {
                        if (w.date === dateStr) {
                            dayWithdrawal += w.amount;
                        }
                    });
                }
            });
        });

        dates.push(dateStr.slice(5)); // 只显示 MM-DD
        withdrawals.push(dayWithdrawal);
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
                label: '每日提现 (元)',
                data: withdrawals,
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#22c55e',
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
                            return `提现: ¥${context.parsed.y.toFixed(2)}`;
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

    // 生成并显示趋势总结
    generateWithdrawalSummary(withdrawals, dates, period);
}

// 更新图表周期
function updateChartPeriod(period) {
    renderIncomeChart(period);
}

// 生成提现趋势总结
function generateWithdrawalSummary(withdrawals, dates, period) {
    // 计算统计数据
    const totalWithdrawal = withdrawals.reduce((sum, w) => sum + w, 0);
    const avgWithdrawal = totalWithdrawal / withdrawals.length;
    const maxWithdrawal = Math.max(...withdrawals);
    const minWithdrawal = Math.min(...withdrawals.filter(w => w > 0)) || 0;
    const withdrawalDays = withdrawals.filter(w => w > 0).length;

    // 计算趋势（最近3天 vs 前3天）
    let trend = '平稳';
    let trendIcon = '➡️';
    let trendColor = 'var(--text-secondary)';

    if (withdrawals.length >= 6) {
        const recent3 = withdrawals.slice(-3).reduce((sum, w) => sum + w, 0) / 3;
        const previous3 = withdrawals.slice(-6, -3).reduce((sum, w) => sum + w, 0) / 3;

        if (previous3 > 0) {
            const changePercent = ((recent3 - previous3) / previous3) * 100;
            if (changePercent > 20) {
                trend = '上升';
                trendIcon = '📈';
                trendColor = '#22c55e';
            } else if (changePercent < -20) {
                trend = '下降';
                trendIcon = '📉';
                trendColor = '#ef4444';
            }
        } else if (recent3 > 0) {
            trend = '上升';
            trendIcon = '📈';
            trendColor = '#22c55e';
        }
    }

    // 生成总结文本
    let summaryHTML = `
        <div style="margin-top: 16px; padding: 16px; background: var(--bg-cream); border-radius: var(--radius-md);">
            <div style="font-weight: 600; margin-bottom: 12px; color: var(--text-primary);">
                ${trendIcon} 趋势总结
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 12px;">
                <div style="text-align: center; padding: 12px; background: white; border-radius: var(--radius-sm);">
                    <div style="font-size: 18px; font-weight: 700; color: var(--success-color);">¥${totalWithdrawal.toFixed(2)}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">总提现</div>
                </div>
                <div style="text-align: center; padding: 12px; background: white; border-radius: var(--radius-sm);">
                    <div style="font-size: 18px; font-weight: 700; color: var(--primary-color);">¥${avgWithdrawal.toFixed(2)}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">日均提现</div>
                </div>
                <div style="text-align: center; padding: 12px; background: white; border-radius: var(--radius-sm);">
                    <div style="font-size: 18px; font-weight: 700; color: var(--accent-color);">${withdrawalDays}天</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">提现天数</div>
                </div>
                <div style="text-align: center; padding: 12px; background: white; border-radius: var(--radius-sm);">
                    <div style="font-size: 18px; font-weight: 700; color: ${trendColor};">${trend}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">近期趋势</div>
                </div>
            </div>
    `;

    // 添加建议
    let suggestion = '';
    if (withdrawalDays === 0) {
        suggestion = '💡 建议：近期没有提现记录，记得每天从软件中提现哦！';
    } else if (avgWithdrawal < 1) {
        suggestion = '💡 建议：日均提现金额较低，可以尝试添加更多赚钱软件。';
    } else if (trend === '下降') {
        suggestion = '💡 建议：提现趋势有所下降，检查一下软件是否正常运行。';
    } else if (trend === '上升') {
        suggestion = '💡 不错！提现金额在增长，继续保持！';
    } else {
        suggestion = '💡 建议：提现金额比较稳定，可以尝试优化软件组合提高收益。';
    }

    summaryHTML += `
            <div style="font-size: 13px; color: var(--text-secondary); padding: 12px; background: white; border-radius: var(--radius-sm);">
                ${suggestion}
            </div>
        </div>
    `;

    // 插入到图表容器后面
    const chartContainer = document.getElementById('incomeChart').parentElement.parentElement;
    let summaryDiv = document.getElementById('withdrawal-summary');
    if (!summaryDiv) {
        summaryDiv = document.createElement('div');
        summaryDiv.id = 'withdrawal-summary';
        chartContainer.appendChild(summaryDiv);
    }
    summaryDiv.innerHTML = summaryHTML;
}

// ==================== 提现日历功能 ====================

// 当前日历显示的月份
let currentCalendarDate = new Date();

// 渲染提现日历
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
        const dayData = getDayWithdrawalData(dateStr, data);

        // 判断是否有数据
        const hasWithdrawal = dayData.withdrawal > 0;
        const hasExpense = dayData.expense > 0;
        const hasInstallment = dayData.installment;

        // 构建背景色（使用CSS变量支持暗黑模式）
        let backgroundColor = 'var(--bg-secondary)';
        let borderColor = 'var(--border-color)';
        let textColor = 'var(--text-primary)';

        if (hasWithdrawal && hasExpense) {
            backgroundColor = 'rgba(251, 191, 36, 0.2)'; // 黄色 - 提现和支出都有
            textColor = 'var(--warning-color)';
        } else if (hasWithdrawal) {
            backgroundColor = 'rgba(52, 211, 153, 0.2)'; // 绿色 - 有提现
            textColor = 'var(--success-color)';
        } else if (hasExpense) {
            backgroundColor = 'rgba(248, 113, 113, 0.2)'; // 红色 - 有支出
            textColor = 'var(--error-color)';
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

        // 显示提现金额
        const displayAmount = dayData.withdrawal > 0 ? `¥${dayData.withdrawal.toFixed(0)}` : '';

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

// 获取某一天的提现数据
function getDayWithdrawalData(dateStr, data) {
    let expense = 0;
    let withdrawal = 0;
    let installment = false;

    // 计算支出
    if (data.expenses) {
        data.expenses.forEach(e => {
            if (e.date === dateStr) {
                expense += e.amount;
            }
        });
    }

    // 计算提现金额（从withdrawals数组中统计）
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            if (app.withdrawals) {
                app.withdrawals.forEach(w => {
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

    return { expense, withdrawal, installment };
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
                const earned = calculateAppEarned(app);
                results.push({
                    type: 'app',
                    name: app.name,
                    phoneName: phone.name,
                    phoneId: phone.id,
                    appId: app.id,
                    subtitle: `累计提现: ¥${earned.toFixed(2)}`
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

// 渲染今日需要关注的软件 - 显示当天未提现的软件
function renderTodayApps(data) {
    const today = getCurrentDate();
    let todayApps = [];

    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            // 检查今天是否有提现记录
            const hasWithdrawalToday = app.withdrawals && app.withdrawals.some(w => w.date === today);
            // 只显示今天未提现的软件
            if (!hasWithdrawalToday) {
                todayApps.push({
                    ...app,
                    phoneName: phone.name
                });
            }
        });
    });

    const container = document.getElementById('today-apps-list');
    if (todayApps.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-illustration">🎉</div><div class="empty-state-title">今日所有软件已提现</div><div class="empty-state-description">所有软件今天都有提现记录</div></div>';
        return;
    }

    container.innerHTML = todayApps.map(app => {
        const earned = calculateAppEarned(app);
        const withdrawalCount = app.withdrawals ? app.withdrawals.length : 0;
        return `
            <div class="app-item">
                <div class="app-header">
                    <span class="app-name">${app.phoneName} - ${app.name}</span>
                </div>
                <div class="app-info">
                    <span>累计提现: ¥${earned.toFixed(2)}</span>
                    <span>提现次数: ${withdrawalCount}次</span>
                </div>
            </div>
        `;
    }).join('');
}

// 获取软件今日赚取金额 - 已简化，基于今日提现记录
function getAppTodayEarned(appId) {
    const data = DataManager.loadData();
    const today = getCurrentDate();
    
    // 查找该软件所属的手机
    for (const phone of data.phones) {
        const app = phone.apps.find(a => a.id === appId);
        if (app && app.withdrawals) {
            // 计算今日提现金额
            return app.withdrawals
                .filter(w => w.date === today)
                .reduce((sum, w) => sum + w.amount, 0);
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
        
        // 计算该手机的总提现金额
        const totalWithdrawn = calculatePhoneTotalEarned(phone);
        
        // 计算该手机的提现次数
        const totalWithdrawals = phone.apps.reduce((sum, app) => {
            return sum + (app.withdrawals ? app.withdrawals.length : 0);
        }, 0);
        
        // 根据索引选择胶囊颜色
        const capsuleColors = ['purple', 'green', 'blue', 'orange', 'pink', 'cyan'];
        const capsuleColor = capsuleColors[index % capsuleColors.length];
        
        return `
            <div class="phone-card" data-phone-id="${phone.id}" data-index="${index}">
                <div class="phone-header">
                    <div class="phone-header-top">
                        <span class="phone-name-capsule capsule-${capsuleColor}" onclick="editPhoneName('${phone.id}')">${phone.name}</span>
                        <div class="phone-header-actions">
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
                                <span class="stat-label">总提现</span>
                                <span class="stat-value">¥${totalWithdrawn.toFixed(2)}</span>
                            </div>
                        </div>
                        <div class="phone-stat-item">
                            <span class="stat-icon">📝</span>
                            <div class="stat-content">
                                <span class="stat-label">提现次数</span>
                                <span class="stat-value">${totalWithdrawals}次</span>
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

    return phone.apps.map(app => {
        // 使用统一函数计算已赚金额（现在只计算已提现金额）
        const earned = calculateAppEarned(app);
        const totalWithdrawals = app.withdrawals ? app.withdrawals.length : 0;

        return `
            <div class="app-card" data-app-id="${app.id}">
                <div class="app-header">
                    <span class="app-name">${app.name}</span>
                    <span class="status-tag ${totalWithdrawals > 0 ? 'ready' : 'pending'}">
                        ${totalWithdrawals > 0 ? '有记录' : '新软件'}
                    </span>
                </div>
                <div class="app-core-info">
                    <span class="core-label">累计提现:</span>
                    <span class="core-value">¥${earned.toFixed(2)}</span>
                </div>
                <div class="app-info-row">
                    <span>提现次数: ${totalWithdrawals}次</span>
                </div>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="openWithdrawModal('${phone.id}', '${app.id}')">记录提现</button>
                    <button class="btn btn-secondary" onclick="openEditAppModal('${phone.id}', '${app.id}')">编辑</button>
                    <button class="btn btn-error" onclick="deleteApp('${phone.id}', '${app.id}')">删除</button>
                </div>
            </div>
        `;
    }).join('');
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
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { 
            text: '添加', 
            class: 'btn-primary', 
            action: () => {
                const name = document.getElementById('app-name').value.trim();
                
                if (name) {
                    DataManager.addApp(phoneId, { name });
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
            <label class="form-label">累计已提现 (元)</label>
            <input type="number" id="edit-app-historical" class="form-input" value="${(app.historicalWithdrawn || 0).toFixed(2)}" step="0.01">
            <div class="form-hint">修改历史提现金额（如需补录之前的提现记录）</div>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { 
            text: '保存', 
            class: 'btn-primary', 
            action: () => {
                const name = document.getElementById('edit-app-name').value.trim();
                const historicalWithdrawn = parseFloat(document.getElementById('edit-app-historical').value) || 0;
                
                if (name) {
                    DataManager.editApp(phoneId, appId, { 
                        name, 
                        historicalWithdrawn
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
    
    const totalWithdrawn = (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
    
    showModal('记录提现', `
        <div class="form-group">
            <label class="form-label">软件名称</label>
            <input type="text" class="form-input" value="${app.name}" disabled>
        </div>
        <div class="form-group">
            <label class="form-label">累计已提现 (元)</label>
            <input type="text" class="form-input" value="${totalWithdrawn.toFixed(2)}" disabled>
        </div>
        <div class="form-group">
            <label class="form-label">本次提现金额 (元)</label>
            <input type="number" id="withdraw-amount" class="form-input" placeholder="输入提现金额" step="0.01">
        </div>
        <div class="form-group">
            <label class="form-label">提现日期</label>
            <input type="date" id="withdraw-date" class="form-input" value="${new Date().toISOString().split('T')[0]}">
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { 
            text: '确认记录', 
            class: 'btn-primary', 
            action: () => {
                const amount = parseFloat(document.getElementById('withdraw-amount').value);
                const date = document.getElementById('withdraw-date').value;
                if (amount > 0) {
                    DataManager.withdraw(phoneId, appId, amount, date);
                    renderPhones();
                    showToast('提现记录成功！');
                } else {
                    showToast('请输入有效的提现金额！');
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
    
    // 统计基于提现记录
    const totalWithdrawn = allAppsWithPhone.reduce((sum, app) => {
        return sum + calculateAppEarned(app);
    }, 0);
    const totalExpenses = data.expenses ? data.expenses.reduce((sum, e) => sum + e.amount, 0) : 0;
    const netEarning = totalWithdrawn - totalExpenses;
    
    const statsTotalEarnedEl = document.getElementById('stats-total-earned');
    if (statsTotalEarnedEl) statsTotalEarnedEl.textContent = `¥${totalWithdrawn.toFixed(2)}`;
    const statsTotalExpensesEl = document.getElementById('stats-total-expenses');
    if (statsTotalExpensesEl) statsTotalExpensesEl.textContent = `¥${totalExpenses.toFixed(2)}`;
    const statsTotalBalanceEl = document.getElementById('stats-total-balance');
    if (statsTotalBalanceEl) statsTotalBalanceEl.textContent = `¥${netEarning.toFixed(2)}`;
    
    // 渲染各软件提现情况
    const container = document.getElementById('app-withdraw-list');
    if (allAppsWithPhone.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无软件数据</div>';
        return;
    }
    
    container.innerHTML = allAppsWithPhone.map(app => {
        const withdrawn = calculateAppEarned(app);
        const withdrawalCount = app.withdrawals ? app.withdrawals.length : 0;
        
        return `
            <div class="app-item" data-app-id="${app.id}">
                <div class="app-header">
                    <span class="app-name">${app.phoneName} - ${app.name}</span>
                    <div class="app-status">
                        <span class="status-tag ${withdrawalCount > 0 ? 'ready' : 'pending'}">
                            ${withdrawalCount > 0 ? '有记录' : '新软件'}
                        </span>
                    </div>
                </div>
                <div class="app-stats">
                    <div class="stat-item stat-earned">
                        <span class="stat-label">累计提现</span>
                        <span class="stat-value">¥${withdrawn.toFixed(2)}</span>
                    </div>
                    <div class="stat-item stat-withdrawn">
                        <span class="stat-label">提现次数</span>
                        <span class="stat-value">${withdrawalCount}次</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 提前预测功能已移除

// 渲染设置页面
function renderSettings() {
    const data = DataManager.loadData();
    
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
    const installments = DataManager.getInstallmentsWithDetails();

    // 更新总览数据
    const totalAmountEl = document.getElementById('total-installment-amount');
    if (totalAmountEl) totalAmountEl.textContent = `¥${summary.totalInstallmentAmount.toFixed(2)}`;

    const pendingAmountEl = document.getElementById('installment-pending-amount');
    if (pendingAmountEl) pendingAmountEl.textContent = `¥${summary.totalPendingAmount.toFixed(2)}`;

    const repaidAmountEl = document.getElementById('installment-repaid-amount');
    if (repaidAmountEl) repaidAmountEl.textContent = `¥${summary.totalRepaidAmount.toFixed(2)}`;

    const availableFundsEl = document.getElementById('installment-available-funds');
    if (availableFundsEl) availableFundsEl.textContent = `¥${summary.availableFunds.toFixed(2)}`;

    // 更新最近还款日期
    const nearestDueDateEl = document.getElementById('nearest-due-date');
    if (nearestDueDateEl) {
        if (summary.nearestDueDate) {
            nearestDueDateEl.textContent = `${summary.nearestDueDate} (${summary.nearestDaysRemaining}天)`;
        } else {
            nearestDueDateEl.textContent = '暂无';
        }
    }

    // 更新剩余天数
    const daysLeftEl = document.getElementById('installment-days-left');
    if (daysLeftEl) {
        if (summary.nearestDaysRemaining > 0) {
            daysLeftEl.textContent = `${summary.nearestDaysRemaining}天`;
        } else if (summary.nearestDaysRemaining === 0 && summary.activeCount > 0) {
            daysLeftEl.textContent = '今天到期';
        } else {
            daysLeftEl.textContent = '0天';
        }
    }

    // 渲染分期列表
    const container = document.getElementById('installment-list');
    if (!container) return;

    if (installments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-illustration">💳</div>
                <div class="empty-state-title">暂无分期记录</div>
                <div class="empty-state-description">添加分期还款，更好地管理你的资金</div>
            </div>
        `;
        return;
    }

    // 按状态排序：进行中 > 已还清 > 其他
    const sortedInstallments = [...installments].sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return new Date(a.dueDate) - new Date(b.dueDate);
    });

    container.innerHTML = sortedInstallments.map((installment, index) => {
        const isCompleted = installment.status === 'completed';
        const isOverdue = installment.daysRemaining < 0 && !isCompleted;

        return `
            <div class="installment-item ${installment.urgencyClass}" style="${isCompleted ? 'opacity: 0.7;' : ''}">
                <div class="installment-header">
                    <div>
                        <h3 class="installment-platform">${installment.platform}</h3>
                        <p class="installment-date">
                            还款日期: ${installment.dueDate}
                            ${isOverdue ? `<span style="color: var(--error-color); font-weight: 600;">(已逾期${Math.abs(installment.daysRemaining)}天)</span>` :
                              installment.daysRemaining > 0 ? `<span style="color: var(--text-secondary);">(${installment.daysRemaining}天后)</span>` :
                              isCompleted ? '<span style="color: var(--success-color);">(已还清)</span>' : ''}
                        </p>
                    </div>
                    <span class="status-tag ${isCompleted ? 'completed' : installment.urgencyClass === 'urgent' ? 'urgent' : 'active'}" style="
                        background: ${isCompleted ? '#dcfce7' : installment.urgencyClass === 'urgent' ? '#fee2e2' : installment.urgencyClass === 'warning' ? '#fef3c7' : '#e0e7ff'};
                        color: ${isCompleted ? '#16a34a' : installment.urgencyClass === 'urgent' ? '#dc2626' : installment.urgencyClass === 'warning' ? '#d97706' : '#4338ca'};
                    ">
                        ${installment.statusText}
                    </span>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin: 16px 0;">
                    <div>
                        <div style="font-size: 24px; font-weight: 700; color: ${isCompleted ? 'var(--success-color)' : 'var(--text-primary)'};">
                            ¥${installment.remainingAmount.toFixed(2)}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary);">待还金额</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 16px; font-weight: 600;">¥${installment.amount.toFixed(2)}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">总额</div>
                    </div>
                </div>

                ${!isCompleted ? `
                <div class="installment-progress" style="margin-bottom: 16px;">
                    <div class="progress-header" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-size: 13px;">还款进度</span>
                        <span class="font-semibold" style="font-size: 13px;">${installment.progress.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar" style="height: 8px; background: var(--bg-cream); border-radius: 4px; overflow: hidden;">
                        <div class="progress-fill" style="width: ${installment.progress}%; height: 100%; background: linear-gradient(90deg, var(--primary-color), var(--primary-light)); border-radius: 4px; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 12px; color: var(--text-secondary);">
                        <span>已还: ¥${(installment.paidAmount || 0).toFixed(2)}</span>
                        <span>剩余: ¥${installment.remainingAmount.toFixed(2)}</span>
                    </div>
                </div>
                ` : `
                <div style="padding: 12px; background: #dcfce7; border-radius: var(--radius-md); margin-bottom: 16px; text-align: center;">
                    <span style="color: #16a34a; font-weight: 600;">🎉 已还清！共还款 ¥${installment.amount.toFixed(2)}</span>
                </div>
                `}

                <div class="installment-action-buttons" style="display: flex; gap: 8px;">
                    ${!isCompleted && installment.canRepay ? `
                        <button class="btn btn-primary" style="flex: 1;" onclick="openRepayModal('${installment.id}')">💰 还款</button>
                    ` : !isCompleted ? `
                        <button class="btn btn-secondary" style="flex: 1;" disabled>💰 可用资金不足</button>
                    ` : ''}
                    ${installment.repaymentHistory && installment.repaymentHistory.length > 0 ? `
                        <button class="btn btn-secondary" onclick="viewRepaymentHistory('${installment.id}')">📋 历史</button>
                    ` : ''}
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
        v: 2,
        p: data.phones.map(phone => ({
            n: phone.name,
            a: phone.apps.map(app => ({
                n: app.name,
                w: app.withdrawn || 0,
                h: app.historicalWithdrawn || 0,
                ws: app.withdrawals || []
            }))
        })),
        s: {}
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
                                withdrawn: app.w || 0,
                                historicalWithdrawn: app.h || 0,
                                withdrawals: app.ws || [],
                                lastUpdated: new Date().toISOString()
                            }))
                        })),
                        settings: {}
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

// 获取当前日期
function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
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
