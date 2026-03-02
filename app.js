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
    // 如果只有一个关闭按钮，则隐藏底部按钮区域（因为右上角已有关闭按钮）
    if (buttons.length === 1 && buttons[0].text === '关闭') {
        buttonsContainer.style.display = 'none';
    } else {
        buttonsContainer.style.display = 'flex';
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = `btn ${btn.class}`;
            button.textContent = btn.text;
            button.addEventListener('click', btn.action);
            buttonsContainer.appendChild(button);
        });
    }
    
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
    
    // 设置更高的z-index，确保在其他弹窗之上
    modal.style.zIndex = '2000';
    
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
    
    // 立即隐藏，不使用动画
    modal.style.display = 'none';
    modal.classList.remove('show');
    modal.style.zIndex = ''; // 恢复默认z-index
    
    // 清空按钮容器，移除事件监听器
    document.getElementById('modal-buttons').innerHTML = '';
    
    // 重置模态框状态
    modalIsShowing = false;
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
    if (!app) {
        showToast('未找到该软件，请刷新页面后重试', 'error');
        return;
    }
    
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

        // 加载每日缺口记录
        const dailyGapRecords = localStorage.getItem('moneyApp_dailyGapRecords');
        if (dailyGapRecords) {
            result.dailyGapRecords = JSON.parse(dailyGapRecords);
        }

        // 数据迁移：为旧数据添加 dailyEarnedHistory 字段
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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
            // 数据迁移：为没有 balance 或 minWithdraw 字段的软件添加默认值
            phone.apps.forEach(app => {
                if (app.balance === undefined) {
                    app.balance = 0;
                    needsMigration = true;
                }
                if (app.minWithdraw === undefined) {
                    app.minWithdraw = 0;
                    needsMigration = true;
                }
                // 为旧数据添加收益追踪字段
                if (app.balanceHistory === undefined) {
                    app.balanceHistory = [];
                    needsMigration = true;
                }
                if (app.dailyEarnings === undefined) {
                    app.dailyEarnings = {};
                    needsMigration = true;
                }
                delete app.initialBalance;
                delete app.earned;
                delete app.remainingWithdrawn;
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
        
        // 保存每日缺口记录
        if (data.dailyGapRecords) {
            localStorage.setItem('moneyApp_dailyGapRecords', JSON.stringify(data.dailyGapRecords));
        }
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

    // ==================== 年度目标功能 ====================

    // 获取年度目标设置
    static getYearlyGoal() {
        const settings = localStorage.getItem(SETTINGS_KEY);
        const parsed = settings ? JSON.parse(settings) : {};
        return {
            amount: parsed.yearlyGoalAmount || 0,
            year: parsed.yearlyGoalYear || new Date().getFullYear(),
            autoDistribute: parsed.yearlyGoalAutoDistribute !== false // 默认开启自动分配
        };
    }

    // 保存年度目标
    static saveYearlyGoal(amount, year, autoDistribute = true) {
        const settings = localStorage.getItem(SETTINGS_KEY);
        const parsed = settings ? JSON.parse(settings) : {};
        parsed.yearlyGoalAmount = parseFloat(amount) || 0;
        parsed.yearlyGoalYear = year || new Date().getFullYear();
        parsed.yearlyGoalAutoDistribute = autoDistribute;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
    }

    // 获取所有软件的年度收益统计
    static getAppsYearlyStats(targetYear = null) {
        const year = targetYear || new Date().getFullYear();
        const data = this.loadData();
        const stats = [];

        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                // 计算该软件今年的收益
                let yearlyEarned = 0;
                let monthlyAvg = 0;
                let daysWithEarnings = 0;

                if (app.dailyEarnings) {
                    Object.entries(app.dailyEarnings).forEach(([date, amount]) => {
                        if (date.startsWith(year.toString())) {
                            yearlyEarned += parseFloat(amount) || 0;
                            daysWithEarnings++;
                        }
                    });
                }

                // 计算历史总收益
                const totalEarned = (app.withdrawn || 0) + (app.historicalWithdrawn || 0) + app.balance;

                // 计算月均收益（基于有收益的天数）
                const currentMonth = new Date().getMonth() + 1;
                monthlyAvg = currentMonth > 1 ? yearlyEarned / currentMonth : yearlyEarned;

                // 预估全年收益
                const projectedYearly = monthlyAvg * 12;

                stats.push({
                    appId: app.id,
                    appName: app.name,
                    phoneId: phone.id,
                    phoneName: phone.name,
                    yearlyEarned: yearlyEarned,
                    totalEarned: totalEarned,
                    monthlyAvg: monthlyAvg,
                    projectedYearly: projectedYearly,
                    daysWithEarnings: daysWithEarnings,
                    balance: app.balance,
                    withdrawn: (app.withdrawn || 0) + (app.historicalWithdrawn || 0)
                });
            });
        });

        return stats;
    }

    // 计算目标分配（基于估算天数）
    static calculateYearlyGoalDistribution() {
        const goal = this.getYearlyGoal();
        const stats = this.getAppsYearlyStats(goal.year);
        const goalProgress = this.calculateGoalProgress();

        if (goal.amount <= 0 || stats.length === 0) {
            return { goal: goal, apps: [], totalEarned: 0, remaining: 0, progress: 0 };
        }

        // 计算总赚取金额
        const totalEarned = stats.reduce((sum, s) => sum + s.totalEarned, 0);
        const remaining = Math.max(0, goal.amount - totalEarned);
        const progress = Math.min(100, (totalEarned / goal.amount * 100)).toFixed(1);

        // 使用估算天数（基于历史平均收益）
        const estimatedDays = goalProgress.estimatedDaysNeeded > 0 ? goalProgress.estimatedDaysNeeded : 365;

        // 按实际收益排序（从低到高）
        const sortedStats = [...stats].sort((a, b) => a.yearlyEarned - b.yearlyEarned);

        // 计算每个软件的目标分配
        const apps = sortedStats.map((stat, index) => {
            // 基础目标 = 总目标 / 软件数量
            const baseTarget = goal.amount / stats.length;

            // 根据实际表现调整目标
            const rankPercent = index / (stats.length - 1 || 1);
            
            // 表现系数
            let performanceFactor;
            if (rankPercent < 0.33) {
                performanceFactor = 0.5 + (rankPercent / 0.33) * 0.3;
            } else if (rankPercent < 0.67) {
                performanceFactor = 0.9 + ((rankPercent - 0.33) / 0.34) * 0.2;
            } else {
                performanceFactor = 1.2 + ((rankPercent - 0.67) / 0.33) * 0.3;
            }
            
            const adjustedTarget = baseTarget * performanceFactor;

            // 计算差额
            const diff = stat.yearlyEarned - adjustedTarget;

            return {
                ...stat,
                baseTarget: baseTarget,
                adjustedTarget: adjustedTarget,
                performanceFactor: performanceFactor,
                rank: index + 1,
                diff: diff,
                status: diff >= 0 ? '超额' : '缺口',
                progress: stat.yearlyEarned / adjustedTarget * 100,
                // 基于估算天数的日目标
                dailyTarget: adjustedTarget / estimatedDays
            };
        });

        return {
            goal: goal,
            apps: apps,
            totalEarned: totalEarned,
            remaining: remaining,
            progress: progress,
            estimatedDays: estimatedDays,
            avgDailyEarnings: goalProgress.avgDailyEarnings
        };
    }

    // 自动分配超额收益（基于实际收益）
    static autoDistributeSurplus() {
        const distribution = this.calculateYearlyGoalDistribution();

        // 计算超额总额（实际收益超过目标的部分）
        const totalSurplus = distribution.apps.reduce((sum, a) => sum + Math.max(0, a.diff), 0);
        
        if (!distribution.goal.autoDistribute || totalSurplus <= 0) {
            return distribution;
        }

        // 找出超额完成的软件
        const surplusApps = distribution.apps.filter(a => a.diff > 0);
        // 找出收益不足的软件
        const deficitApps = distribution.apps.filter(a => a.diff < 0);

        let remainingSurplus = totalSurplus;

        // 按缺口大小排序（缺口大的优先）
        deficitApps.sort((a, b) => a.diff - b.diff);

        // 分配超额收益
        deficitApps.forEach(deficitApp => {
            if (remainingSurplus <= 0) return;

            const needed = Math.abs(deficitApp.diff);
            const allocated = Math.min(needed, remainingSurplus);

            deficitApp.allocatedSurplus = allocated;
            deficitApp.newTarget = deficitApp.adjustedTarget - allocated;
            deficitApp.newDiff = deficitApp.yearlyEarned - deficitApp.newTarget;
            deficitApp.newStatus = deficitApp.newDiff >= 0 ? '达标' : '仍需努力';

            remainingSurplus -= allocated;
        });

        // 标记超额软件
        surplusApps.forEach(surplusApp => {
            surplusApp.allocatedSurplus = 0;
            surplusApp.newTarget = surplusApp.adjustedTarget;
            surplusApp.newDiff = surplusApp.diff;
            surplusApp.newStatus = '超额完成';
        });

        distribution.totalSurplus = totalSurplus;
        distribution.remainingSurplus = remainingSurplus;

        return distribution;
    }

    // ==================== 每日目标功能 ====================

    // 获取软件的每日目标（基于年度目标分配计算）
    static getAppDailyGoal(appId) {
        const data = this.loadData();
        for (const phone of data.phones) {
            const app = phone.apps.find(a => a.id === appId);
            if (app) {
                // 如果用户手动设置了每日目标，优先使用
                if (app.dailyGoalAmount && app.dailyGoalAmount > 0 && !app.dailyGoalAutoCalculate) {
                    return {
                        amount: app.dailyGoalAmount,
                        enabled: app.dailyGoalEnabled !== false,
                        autoCalculate: false,
                        yearlyTarget: 0
                    };
                }
                
                // 自动计算：基于目标分配（使用估算天数）
                const distribution = this.calculateYearlyGoalDistribution();
                const appDistribution = distribution.apps.find(a => a.appId === appId);
                
                if (appDistribution && distribution.goal.amount > 0) {
                    // 每日目标 = 调整目标 / 估算天数
                    const estimatedDays = distribution.estimatedDays || 365;
                    const dailyGoalFromTarget = appDistribution.adjustedTarget / estimatedDays;
                    return {
                        amount: dailyGoalFromTarget,
                        enabled: app.dailyGoalEnabled !== false,
                        autoCalculate: true,
                        yearlyTarget: appDistribution.adjustedTarget,
                        performanceFactor: appDistribution.performanceFactor,
                        estimatedDays: estimatedDays
                    };
                }
                
                // 如果没有年度目标，使用默认计算
                const yearlyGoal = this.getYearlyGoal();
                const defaultDailyGoal = yearlyGoal.amount > 0 ? yearlyGoal.amount / 365 : 0;
                return {
                    amount: defaultDailyGoal,
                    enabled: app.dailyGoalEnabled !== false,
                    autoCalculate: true,
                    yearlyTarget: yearlyGoal.amount
                };
            }
        }
        return { amount: 0, enabled: false, autoCalculate: true, yearlyTarget: 0 };
    }

    // 保存软件的每日目标
    static saveAppDailyGoal(appId, amount, enabled, autoCalculate) {
        const data = this.loadData();
        for (const phone of data.phones) {
            const app = phone.apps.find(a => a.id === appId);
            if (app) {
                app.dailyGoalAmount = parseFloat(amount) || 0;
                app.dailyGoalEnabled = enabled;
                app.dailyGoalAutoCalculate = autoCalculate;
                this.saveData(data);
                return true;
            }
        }
        return false;
    }

    // 获取软件的每日达标记录
    static getAppDailyAchievements(appId, year = null) {
        const targetYear = year || new Date().getFullYear();
        const data = this.loadData();
        
        for (const phone of data.phones) {
            const app = phone.apps.find(a => a.id === appId);
            if (app) {
                if (!app.dailyAchievements) {
                    app.dailyAchievements = {};
                }
                
                // 筛选指定年份的记录
                const achievements = {};
                Object.entries(app.dailyAchievements).forEach(([date, record]) => {
                    if (date.startsWith(targetYear.toString())) {
                        achievements[date] = record;
                    }
                });
                
                return achievements;
            }
        }
        return {};
    }

    // 标记今日达标状态
    static markAppDailyAchievement(appId, date, achieved, earnedAmount = 0) {
        const data = this.loadData();
        
        for (const phone of data.phones) {
            const app = phone.apps.find(a => a.id === appId);
            if (app) {
                if (!app.dailyAchievements) {
                    app.dailyAchievements = {};
                }
                
                const goal = this.getAppDailyGoal(appId);
                
                app.dailyAchievements[date] = {
                    achieved: achieved,
                    earnedAmount: earnedAmount,
                    goalAmount: goal.amount,
                    timestamp: new Date().toISOString()
                };
                
                this.saveData(data);
                return true;
            }
        }
        return false;
    }

    // 计算软件的达标统计（自动根据每日收益判断）
    static calculateAppAchievementStats(appId, year = null) {
        const targetYear = year || new Date().getFullYear();
        const goal = this.getAppDailyGoal(appId);
        
        // 获取每日收益数据
        const data = this.loadData();
        let appDailyEarnings = {};
        
        for (const phone of data.phones) {
            const app = phone.apps.find(a => a.id === appId);
            if (app && app.dailyEarnings) {
                appDailyEarnings = app.dailyEarnings;
                break;
            }
        }
        
        // 获取本地日期（修复时区问题）
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const currentMonth = now.getMonth() + 1;
        
        let totalDays = 0;
        let achievedDays = 0;
        let totalEarned = 0;
        let currentMonthDays = 0;
        let currentMonthAchieved = 0;
        
        // 遍历该年的每日收益数据，自动判断是否达标
        Object.entries(appDailyEarnings).forEach(([date, earning]) => {
            if (date.startsWith(targetYear.toString())) {
                totalDays++;
                const earnedAmount = parseFloat(earning) || 0;
                const isAchieved = earnedAmount >= goal.amount && goal.amount > 0;
                
                if (isAchieved) {
                    achievedDays++;
                }
                totalEarned += earnedAmount;
                
                // 统计本月
                const month = parseInt(date.split('-')[1]);
                if (month === currentMonth) {
                    currentMonthDays++;
                    if (isAchieved) {
                        currentMonthAchieved++;
                    }
                }
            }
        });
        
        // 计算连续达标天数
        let consecutiveDays = 0;
        const sortedDates = Object.keys(appDailyEarnings)
            .filter(d => d.startsWith(targetYear.toString()))
            .sort()
            .reverse();
        
        for (const date of sortedDates) {
            const earnedAmount = parseFloat(appDailyEarnings[date]) || 0;
            if (earnedAmount >= goal.amount && goal.amount > 0) {
                consecutiveDays++;
            } else {
                break;
            }
        }
        
        // 获取今日收益
        const todayEarning = parseFloat(appDailyEarnings[today]) || 0;
        const todayAchieved = goal.amount > 0 && todayEarning >= goal.amount;
        
        return {
            totalDays: totalDays,
            achievedDays: achievedDays,
            achievementRate: totalDays > 0 ? (achievedDays / totalDays * 100).toFixed(1) : 0,
            totalEarned: totalEarned,
            consecutiveDays: consecutiveDays,
            currentMonthDays: currentMonthDays,
            currentMonthAchieved: currentMonthAchieved,
            currentMonthRate: currentMonthDays > 0 ? (currentMonthAchieved / currentMonthDays * 100).toFixed(1) : 0,
            dailyGoal: goal.amount,
            todayAchieved: todayAchieved,
            todayEarning: todayEarning
        };
    }

    // 获取所有软件的每日目标汇总
    static getAllAppsDailyGoalsSummary() {
        const data = this.loadData();
        const summary = [];
        
        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                const goal = this.getAppDailyGoal(app.id);
                const stats = this.calculateAppAchievementStats(app.id);
                
                summary.push({
                    appId: app.id,
                    appName: app.name,
                    phoneId: phone.id,
                    phoneName: phone.name,
                    dailyGoal: goal.amount,
                    enabled: goal.enabled,
                    achievedDays: stats.achievedDays,
                    achievementRate: stats.achievementRate,
                    todayAchieved: stats.todayAchieved
                });
            });
        });
        
        return summary;
    }

    // ==================== 每日目标缺口记录功能 ====================

    // 获取或初始化每日缺口记录
    static getDailyGapRecords() {
        const data = this.loadData();
        if (!data.dailyGapRecords) {
            data.dailyGapRecords = {};
        }
        return data.dailyGapRecords;
    }

    // 记录每日缺口
    static recordDailyGap(date, targetAmount, earnedAmount) {
        const data = this.loadData();
        if (!data.dailyGapRecords) {
            data.dailyGapRecords = {};
        }

        const gap = Math.max(0, targetAmount - earnedAmount);

        data.dailyGapRecords[date] = {
            date: date,
            targetAmount: targetAmount,
            earnedAmount: earnedAmount,
            gap: gap,
            isAchieved: earnedAmount >= targetAmount,
            recordedAt: new Date().toISOString()
        };

        this.saveData(data);
        console.log('recordDailyGap 保存成功:', data.dailyGapRecords[date]);
        return data.dailyGapRecords[date];
    }

    // 获取指定日期的缺口记录
    static getDailyGap(date) {
        const records = this.getDailyGapRecords();
        console.log('getDailyGap:', { date, records, found: records[date] || null });
        return records[date] || null;
    }

    // 获取所有缺口记录统计
    static getDailyGapStats() {
        const records = this.getDailyGapRecords();
        const recordList = Object.values(records);

        if (recordList.length === 0) {
            return {
                totalDays: 0,
                achievedDays: 0,
                missedDays: 0,
                totalGap: 0,
                totalSurplus: 0,
                netGap: 0,
                totalTarget: 0,
                totalEarned: 0,
                achievementRate: 0,
                records: []
            };
        }

        // 按日期排序（从早到晚）
        const sortedRecords = recordList.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // 计算累计超额和缺口（超额可以抵扣后续缺口）
        let cumulativeSurplus = 0;
        let totalGap = 0;
        let totalSurplus = 0;
        
        const processedRecords = sortedRecords.map(r => {
            const gap = r.gap || 0;
            const surplus = r.earnedAmount > r.targetAmount ? r.earnedAmount - r.targetAmount : 0;
            
            if (surplus > 0) {
                // 有超额，累加到累计超额
                cumulativeSurplus += surplus;
                totalSurplus += surplus;
            }
            
            let adjustedGap = 0;
            if (gap > 0) {
                // 有缺口，先用累计超额抵扣
                if (cumulativeSurplus >= gap) {
                    // 超额足够抵扣
                    cumulativeSurplus -= gap;
                    adjustedGap = 0;
                } else {
                    // 超额不够，抵扣部分
                    adjustedGap = gap - cumulativeSurplus;
                    cumulativeSurplus = 0;
                }
                totalGap += adjustedGap;
            }
            
            return {
                ...r,
                adjustedGap: adjustedGap,
                surplus: surplus,
                remainingSurplus: cumulativeSurplus
            };
        });

        const achievedDays = processedRecords.filter(r => r.adjustedGap === 0 && r.earnedAmount >= r.targetAmount).length;
        const missedDays = processedRecords.filter(r => r.adjustedGap > 0).length;
        const totalTarget = processedRecords.reduce((sum, r) => sum + r.targetAmount, 0);
        const totalEarned = processedRecords.reduce((sum, r) => sum + r.earnedAmount, 0);
        const netGap = totalGap - cumulativeSurplus; // 最终缺口（考虑剩余超额）

        return {
            totalDays: processedRecords.length,
            achievedDays: achievedDays,
            missedDays: missedDays,
            totalGap: totalGap,
            totalSurplus: totalSurplus,
            netGap: Math.max(0, netGap),
            remainingSurplus: cumulativeSurplus,
            totalTarget: totalTarget,
            totalEarned: totalEarned,
            achievementRate: ((totalEarned / totalTarget) * 100).toFixed(1),
            records: processedRecords.sort((a, b) => new Date(b.date) - new Date(a.date))
        };
    }

    // 计算历史平均日收益（基于所有有记录的天数）
    static calculateAverageDailyEarnings() {
        const data = this.loadData();
        let totalEarnings = 0;
        let daysWithEarnings = new Set();
        
        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                if (app.dailyEarnings) {
                    Object.entries(app.dailyEarnings).forEach(([date, amount]) => {
                        if (amount > 0) {
                            totalEarnings += amount;
                            daysWithEarnings.add(date);
                        }
                    });
                }
            });
        });
        
        const daysCount = daysWithEarnings.size;
        const avgDailyEarnings = daysCount > 0 ? totalEarnings / daysCount : 0;
        
        return {
            totalEarnings: totalEarnings,
            daysCount: daysCount,
            avgDailyEarnings: avgDailyEarnings
        };
    }

    // 计算最近7天平均收益
    static calculateLast7DaysAverage() {
        const data = this.loadData();
        const now = new Date();
        let totalEarnings = 0;
        let daysCount = 0;
        
        // 计算最近7天
        for (let i = 0; i < 7; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            
            let dayEarnings = 0;
            data.phones.forEach(phone => {
                phone.apps.forEach(app => {
                    if (app.dailyEarnings && app.dailyEarnings[dateStr]) {
                        dayEarnings += app.dailyEarnings[dateStr];
                    }
                });
            });
            
            if (dayEarnings > 0) {
                totalEarnings += dayEarnings;
                daysCount++;
            }
        }
        
        return {
            totalEarnings: totalEarnings,
            daysCount: daysCount,
            avgDailyEarnings: daysCount > 0 ? totalEarnings / daysCount : 0
        };
    }

    // 计算历史最高日收益
    static calculateMaxDailyEarnings() {
        const data = this.loadData();
        let maxEarnings = 0;
        const dailyTotals = {};
        
        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                if (app.dailyEarnings) {
                    Object.entries(app.dailyEarnings).forEach(([date, amount]) => {
                        if (amount > 0) {
                            dailyTotals[date] = (dailyTotals[date] || 0) + amount;
                        }
                    });
                }
            });
        });
        
        Object.values(dailyTotals).forEach(amount => {
            if (amount > maxEarnings) {
                maxEarnings = amount;
            }
        });
        
        return maxEarnings;
    }

    // 计算还款所需日赚金额
    static calculateRepaymentDailyNeeded() {
        const data = this.loadData();
        const installments = data.installments || [];
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        let totalRemaining = 0;
        let lastDueDate = null;  // 最后一期还款日期
        
        installments.forEach(inst => {
            if (!inst.paid && inst.dueDate >= todayStr) {
                // 计算该还款计划的剩余金额
                const remaining = inst.amount - (inst.paidAmount || 0);
                if (remaining > 0) {
                    totalRemaining += remaining;
                    
                    // 找到最后一期的还款日（最晚的日期）
                    if (!lastDueDate || inst.dueDate > lastDueDate) {
                        lastDueDate = inst.dueDate;
                    }
                }
            }
        });
        
        if (totalRemaining <= 0 || !lastDueDate) {
            return {
                dailyNeeded: 0,
                totalRemaining: 0,
                lastDueDate: null,
                daysUntilDue: 0,
                hasRepayment: false
            };
        }
        
        // 计算距离最后一期还款日的天数
        const dueDate = new Date(lastDueDate);
        const today = new Date(todayStr);
        const daysUntilDue = Math.max(1, Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)));
        
        const dailyNeeded = totalRemaining / daysUntilDue;
        
        return {
            dailyNeeded: dailyNeeded,
            totalRemaining: totalRemaining,
            lastDueDate: lastDueDate,
            daysUntilDue: daysUntilDue,
            hasRepayment: true
        };
    }

    // 计算目标完成情况（不限时目标）
    static calculateGoalProgress() {
        const goal = this.getYearlyGoal();
        const data = this.loadData();

        if (goal.amount <= 0) {
            return {
                targetAmount: 0,
                totalEarned: 0,
                remainingAmount: 0,
                avgDailyEarnings: 0,
                estimatedDaysNeeded: 0,
                progressPercent: 0,
                isValid: false
            };
        }

        // 计算已赚取金额
        let totalEarned = 0;
        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                totalEarned += app.withdrawn || 0;
                totalEarned += app.historicalWithdrawn || 0;
                totalEarned += app.balance || 0;
            });
        });

        // 计算剩余金额
        const remainingAmount = Math.max(0, goal.amount - totalEarned);

        // 计算历史平均日收益
        const avgStats = this.calculateAverageDailyEarnings();
        
        // 估算完成所需天数
        let estimatedDaysNeeded = 0;
        if (avgStats.avgDailyEarnings > 0 && remainingAmount > 0) {
            estimatedDaysNeeded = Math.ceil(remainingAmount / avgStats.avgDailyEarnings);
        }

        // 计算进度百分比
        const progressPercent = goal.amount > 0 ? (totalEarned / goal.amount * 100) : 0;

        return {
            targetAmount: goal.amount,
            totalEarned: totalEarned,
            remainingAmount: remainingAmount,
            avgDailyEarnings: avgStats.avgDailyEarnings,
            estimatedDaysNeeded: estimatedDaysNeeded,
            daysWithData: avgStats.daysCount,
            progressPercent: progressPercent,
            isValid: true
        };
    }

    // 计算每日目标（基于能力+还款保底）
    static calculateDailyTarget() {
        const goal = this.getYearlyGoal();
        const avgStats = this.calculateAverageDailyEarnings();
        const last7DaysStats = this.calculateLast7DaysAverage();
        const maxDailyEarnings = this.calculateMaxDailyEarnings();
        const repaymentStats = this.calculateRepaymentDailyNeeded();
        
        if (goal.amount <= 0) {
            return {
                dailyTarget: 0,
                avgDailyEarnings: 0,
                isValid: false
            };
        }
        
        // 1. 计算还款所需日赚（硬性要求）
        const repaymentNeeded = repaymentStats.hasRepayment ? repaymentStats.dailyNeeded : 0;
        
        // 2. 计算历史能力目标（基于赚钱能力）
        let abilityTarget = 0;
        let dynamicFactor = 1.0;
        let performanceLevel = 'normal';
        
        if (avgStats.avgDailyEarnings > 0) {
            const historyAvg = avgStats.avgDailyEarnings;
            const last7Avg = last7DaysStats.avgDailyEarnings;
            
            // 根据最近7天表现确定动态系数
            if (last7Avg >= historyAvg * 1.2) {
                // 表现优秀：保持高水平
                dynamicFactor = 1.0;
                abilityTarget = last7Avg;
                performanceLevel = 'excellent';
            } else if (last7Avg >= historyAvg) {
                // 表现正常：稍微激励
                dynamicFactor = 1.1;
                abilityTarget = historyAvg * 1.1;
                performanceLevel = 'normal';
            } else if (last7Avg >= historyAvg * 0.5) {
                // 表现下滑：鼓励恢复
                dynamicFactor = 0.9;
                abilityTarget = historyAvg * 0.9;
                performanceLevel = 'declining';
            } else if (last7Avg > 0) {
                // 表现很差：降低目标建立信心
                dynamicFactor = 0.7;
                abilityTarget = historyAvg * 0.7;
                performanceLevel = 'poor';
            } else {
                // 最近7天无数据，使用历史平均
                dynamicFactor = 1.0;
                abilityTarget = historyAvg;
                performanceLevel = 'no_recent_data';
            }
        } else {
            // 无历史数据，使用默认值
            abilityTarget = 10;
            performanceLevel = 'new_user';
        }
        
        // 3. 综合计算最终目标
        // 取能力目标和还款所需的较大值
        let finalTarget = Math.max(abilityTarget, repaymentNeeded);
        
        // 4. 设置上限（防止目标过高）
        const maxTarget = Math.max(maxDailyEarnings * 1.2, repaymentNeeded * 1.5, 100);
        finalTarget = Math.min(finalTarget, maxTarget);
        
        return {
            dailyTarget: finalTarget,
            abilityTarget: abilityTarget,        // 能力目标
            repaymentNeeded: repaymentNeeded,    // 还款所需
            avgDailyEarnings: avgStats.avgDailyEarnings,
            last7DaysAvg: last7DaysStats.avgDailyEarnings,
            maxDailyEarnings: maxDailyEarnings,
            daysWithData: avgStats.daysCount,
            dynamicFactor: dynamicFactor,
            performanceLevel: performanceLevel,
            repaymentInfo: repaymentStats,
            isValid: true
        };
    }

    // 计算全年目标的每日需赚金额（保留原函数用于兼容）
    static calculateYearlyDailyTarget() {
        // 使用新的计算方式
        const progress = this.calculateGoalProgress();
        const dailyTarget = this.calculateDailyTarget();
        
        if (!progress.isValid) {
            return {
                yearlyGoal: 0,
                dailyTarget: 0,
                daysRemaining: 365,
                totalEarned: 0,
                remainingAmount: 0,
                isValid: false
            };
        }

        return {
            yearlyGoal: progress.targetAmount,
            dailyTarget: dailyTarget.dailyTarget,
            daysRemaining: progress.estimatedDaysNeeded,
            totalEarned: progress.totalEarned,
            remainingAmount: progress.remainingAmount,
            avgDailyEarnings: progress.avgDailyEarnings,
            estimatedDaysNeeded: progress.estimatedDaysNeeded,
            isValid: true
        };
    }

    // 检查并记录今日缺口（应在每天结束时调用）
    static checkAndRecordTodayGap() {
        const dailyTarget = this.calculateYearlyDailyTarget();
        if (!dailyTarget.isValid) return null;

        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        // 计算今日实际收益
        const data = this.loadData();
        let todayEarned = 0;
        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                if (app.dailyEarnings && app.dailyEarnings[today]) {
                    todayEarned += parseFloat(app.dailyEarnings[today]) || 0;
                    console.log(`软件 ${app.name} 今日收益:`, app.dailyEarnings[today]);
                }
            });
        });
        
        console.log('checkAndRecordTodayGap:', { today, todayEarned, dailyTarget: dailyTarget.dailyTarget });

        // 检查今天是否已经记录过
        const existingRecord = this.getDailyGap(today);
        console.log('existingRecord:', existingRecord);
        if (existingRecord) {
            // 如果收益有变化，更新记录
            if (existingRecord.earnedAmount !== todayEarned) {
                console.log('更新记录');
                return this.recordDailyGap(today, dailyTarget.dailyTarget, todayEarned);
            }
            console.log('记录已存在且未变化');
            return existingRecord;
        }

        // 记录今日缺口
        console.log('创建新记录');
        return this.recordDailyGap(today, dailyTarget.dailyTarget, todayEarned);
    }

    // ==================== 资产管理功能 ====================

    // 预定义资产分类
    static getAssetCategories() {
        return [
            { 
                id: 'electronics', 
                name: '电子产品', 
                icon: '💻', 
                keywords: [
                    // 手机品牌
                    '手机', 'iPhone', '华为', '小米', 'OPPO', 'vivo', '三星', '荣耀', '一加', '魅族', '红米', 'realme', 'IQOO', '努比亚', '黑鲨', 'ROG',
                    // 电脑相关
                    '电脑', '笔记本', 'MacBook', 'ThinkPad', '戴尔', '惠普', '联想', '华硕', '宏碁', '机械革命',
                    // 平板
                    '平板', 'iPad', 'MatePad', '小米平板', 'Galaxy Tab',
                    // 配件
                    '耳机', 'AirPods', '索尼', 'BOSE', 'Beats', '森海塞尔', '键盘', '鼠标', '显示器', '显示器', '投影仪', '打印机', '扫描仪',
                    // 数码
                    '相机', '佳能', '尼康', '索尼', '富士', 'GoPro', '大疆', '无人机', '云台', '稳定器',
                    // 充电
                    '充电器', '数据线', '充电宝', '移动电源', '充电头', '快充', '无线充',
                    // 存储
                    'U盘', '硬盘', '固态', 'SSD', '移动硬盘', '内存卡', 'TF卡', 'SD卡',
                    // 游戏
                    '游戏机', 'Switch', 'PS5', 'PS4', 'Xbox', '游戏手柄', '掌机', 'Steam Deck',
                    // 智能设备
                    '智能手表', 'Apple Watch', '华为手表', '小米手环', '智能手环', '智能音箱', '小爱', '天猫精灵', '小度',
                    // 网络
                    '路由器', 'WiFi', '网线', '交换机', '光猫'
                ] 
            },
            { 
                id: 'furniture', 
                name: '家具家电', 
                icon: '🛋️', 
                keywords: [
                    // 家具
                    '沙发', '床', '床垫', '桌子', '餐桌', '书桌', '办公桌', '椅子', '办公椅', '电竞椅', '衣柜', '橱柜', '鞋柜', '书架', '置物架', '茶几', '电视柜', '床头柜', '梳妆台', '镜子',
                    // 家电
                    '冰箱', '洗衣机', '空调', '电视', '电视机', '热水器', '油烟机', '燃气灶', '微波炉', '烤箱', '电饭煲', '电磁炉', '电水壶', '净水器', '扫地机器人', '吸尘器', '加湿器', '除湿机', '空气净化器', '风扇', '电暖器', '取暖器', '灯具', '台灯', '落地灯', '吊灯', '吸顶灯'
                ] 
            },
            { 
                id: 'clothing', 
                name: '服装鞋包', 
                icon: '👔', 
                keywords: [
                    '衣服', 'T恤', '衬衫', '外套', '夹克', '风衣', '大衣', '羽绒服', '毛衣', '卫衣', '裤子', '牛仔裤', '休闲裤', '西裤', '短裤', '裙子', '连衣裙', '半身裙',
                    '鞋子', '运动鞋', '跑鞋', '篮球鞋', '足球鞋', '休闲鞋', '皮鞋', '靴子', '凉鞋', '拖鞋', '高跟鞋', '帆布鞋',
                    '包包', '背包', '双肩包', '单肩包', '手提包', '斜挎包', '钱包', '旅行箱', '行李箱', '拉杆箱',
                    '帽子', '围巾', '手套', '袜子', '内裤', '内衣', '皮带', '领带', '眼镜', '太阳镜', '墨镜', '手表', '首饰', '项链', '戒指', '耳环'
                ] 
            },
            { 
                id: 'food', 
                name: '食品酒水', 
                icon: '🍔', 
                keywords: [
                    '食品', '零食', '坚果', '巧克力', '糖果', '饼干', '薯片', '肉干', '果干', '蜜饯',
                    '饮料', '果汁', '汽水', '可乐', '雪碧', '奶茶', '咖啡', '咖啡豆', '茶叶', '绿茶', '红茶', '乌龙茶', '普洱',
                    '酒水', '白酒', '红酒', '葡萄酒', '啤酒', '洋酒', '威士忌', '伏特加',
                    '粮油', '大米', '面粉', '油', '调料', '酱油', '醋', '盐', '糖',
                    '生鲜', '水果', '蔬菜', '肉类', '海鲜', '鸡蛋', '牛奶', '酸奶'
                ] 
            },
            { 
                id: 'beauty', 
                name: '美妆护肤', 
                icon: '💄', 
                keywords: [
                    '化妆品', '护肤品', '洗面奶', '洁面乳', '爽肤水', '乳液', '面霜', '精华', '眼霜', '面膜', '防晒霜', '隔离霜', '粉底', '气垫', 'BB霜', 'CC霜', '遮瑕', '散粉', '粉饼', '腮红', '眼影', '眼线', '睫毛膏', '口红', '唇釉', '唇膏', '卸妆', '化妆棉',
                    '香水', '古龙水', '香氛',
                    '洗发', '护发', '洗发水', '护发素', '发膜', '沐浴露', '香皂', '肥皂', '牙膏', '牙刷', '漱口水', '牙线', '剃须刀', '脱毛器',
                    '美甲', '指甲油', '护甲油'
                ] 
            },
            { 
                id: 'sports', 
                name: '运动户外', 
                icon: '⚽', 
                keywords: [
                    '运动', '健身', '瑜伽', '瑜伽垫', '哑铃', '杠铃', '跑步机', '椭圆机', '动感单车', '健身车', '划船机', '综合训练器', '仰卧板', '健腹轮', '弹力带', '阻力带', '跳绳',
                    '球拍', '羽毛球拍', '网球拍', '乒乓球拍', '篮球', '足球', '排球', '羽毛球', '网球', '乒乓球', '高尔夫球杆',
                    '球鞋', '跑鞋', '足球鞋', '篮球鞋', '登山鞋', '徒步鞋',
                    '户外', '帐篷', '睡袋', '背包', '登山包', '户外包', '自行车', '山地车', '公路车', '折叠车', '滑板', '轮滑', '溜冰鞋', '滑雪', '雪板', '冲浪板', '游泳', '泳镜', '泳帽', '救生衣'
                ] 
            },
            { 
                id: 'books', 
                name: '图书文具', 
                icon: '📚', 
                keywords: [
                    '书', '图书', '小说', '文学', '历史', '哲学', '经济', '管理', '金融', '投资', '理财', '编程', '计算机', '技术', '教材', '教辅', '考试', '考研', '雅思', '托福', 'GRE', '四六级',
                    '笔记本', '记事本', '日记本', '手账本',
                    '笔', '钢笔', '圆珠笔', '中性笔', '铅笔', '彩笔', '马克笔', '荧光笔', '毛笔',
                    '文具', '橡皮', '尺子', '圆规', '剪刀', '胶水', '胶带', '订书机', '文件夹', '资料册', '便签', '便利贴', '计算器'
                ] 
            },
            { 
                id: 'pets', 
                name: '宠物用品', 
                icon: '🐱', 
                keywords: [
                    '宠物', '猫粮', '狗粮', '猫砂', '猫砂盆', '猫爬架', '猫窝', '狗窝', '宠物床', '宠物笼', '笼子', '宠物玩具', '逗猫棒', '磨牙棒', '宠物衣服', '宠物牵引绳', '项圈', '宠物碗', '喂食器', '饮水机', '宠物背包', '宠物航空箱', '宠物梳子', '宠物指甲剪', '宠物沐浴露', '宠物香波'
                ] 
            },
            { 
                id: 'tools', 
                name: '工具器材', 
                icon: '🔧', 
                keywords: [
                    '工具', '工具箱', '螺丝刀', '螺丝刀套装', '锤子', '扳手', '钳子', '电钻', '冲击钻', '电锤', '角磨机', '切割机', '电锯', '梯子', '人字梯', '伸缩梯', '五金', '钉子', '螺丝', '螺母', '垫片', '胶带', '电工胶带', '绝缘胶带', '万用表', '测电笔', '水平仪', '卷尺', '钢尺'
                ] 
            },
            { id: 'other', name: '其他', icon: '📦', keywords: [] }
        ];
    }

    // 自动识别分类
    static autoDetectCategory(itemName) {
        const categories = this.getAssetCategories();
        const lowerName = itemName.toLowerCase();
        
        for (const category of categories) {
            if (category.id === 'other') continue;
            for (const keyword of category.keywords) {
                if (lowerName.includes(keyword.toLowerCase())) {
                    return category.id;
                }
            }
        }
        return 'other';
    }

    // 获取资产列表
    static getAssets() {
        const assets = localStorage.getItem('moneyApp_assets');
        return assets ? JSON.parse(assets) : [];
    }

    // 保存资产列表
    static saveAssets(assets) {
        localStorage.setItem('moneyApp_assets', JSON.stringify(assets));
    }

    // 添加资产
    static addAsset(assetData) {
        const assets = this.getAssets();
        const category = assetData.category || this.autoDetectCategory(assetData.name);
        
        const newAsset = {
            id: Date.now().toString(),
            name: assetData.name,
            price: parseFloat(assetData.price) || 0,
            purchaseDate: assetData.purchaseDate,
            category: category,
            note: assetData.note || '',
            createdAt: new Date().toISOString()
        };
        
        assets.push(newAsset);
        this.saveAssets(assets);
        return newAsset;
    }

    // 编辑资产
    static editAsset(assetId, assetData) {
        const assets = this.getAssets();
        const index = assets.findIndex(a => a.id === assetId);
        
        if (index >= 0) {
            const category = assetData.category || this.autoDetectCategory(assetData.name);
            assets[index] = {
                ...assets[index],
                name: assetData.name,
                price: parseFloat(assetData.price) || 0,
                purchaseDate: assetData.purchaseDate,
                category: category,
                note: assetData.note || '',
                updatedAt: new Date().toISOString()
            };
            this.saveAssets(assets);
            return assets[index];
        }
        return null;
    }

    // 删除资产
    static deleteAsset(assetId) {
        const assets = this.getAssets();
        const filtered = assets.filter(a => a.id !== assetId);
        this.saveAssets(filtered);
        return filtered;
    }

    // ==================== 个人财产管理功能 ====================

    // 获取个人财产数据
    static getPersonalFinance() {
        const finance = localStorage.getItem('moneyApp_personalFinance');
        if (finance) {
            return JSON.parse(finance);
        }
        return {
            wallet: 0,           // 个人钱包余额
            totalEarned: 0,      // 累计真实收入
            totalSpent: 0,       // 累计支出
            incomeSources: [],   // 收入来源记录
            transfers: [],       // 资金流转记录
            expenses: []         // 个人支出记录
        };
    }

    // 保存个人财产数据
    static savePersonalFinance(finance) {
        localStorage.setItem('moneyApp_personalFinance', JSON.stringify(finance));
    }

    // 添加收入来源（工资、奖金等）
    static addIncomeSource(sourceData) {
        const finance = this.getPersonalFinance();
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        const newSource = {
            id: Date.now().toString(),
            type: sourceData.type,           // 'salary', 'bonus', 'investment', 'other'
            typeName: this.getIncomeTypeName(sourceData.type),
            amount: parseFloat(sourceData.amount) || 0,
            date: sourceData.date || today,
            description: sourceData.description || '',
            createdAt: new Date().toISOString()
        };
        
        finance.incomeSources.push(newSource);
        finance.wallet += newSource.amount;
        finance.totalEarned += newSource.amount;
        
        this.savePersonalFinance(finance);
        return newSource;
    }

    // 获取收入类型名称
    static getIncomeTypeName(type) {
        const typeMap = {
            'salary': '💰 工资收入',
            'bonus': '🎁 奖金/红包',
            'investment': '📈 投资收益',
            'gift': '🎀 礼物',
            'refund': '💸 退款',
            'other': '📦 其他收入'
        };
        return typeMap[type] || '📦 其他收入';
    }

    // 从软件提现到个人钱包
    static transferFromAppsToWallet(amount, description = '') {
        const finance = this.getPersonalFinance();
        const appEarnings = this.calculateTotalEarnings();
        
        if (amount <= 0) {
            return { success: false, message: '金额必须大于0' };
        }
        
        // 检查软件总收入是否足够
        const totalAppBalance = appEarnings.totalBalance;
        if (amount > totalAppBalance) {
            return { success: false, message: `软件余额不足，当前可提现：¥${totalAppBalance.toFixed(2)}` };
        }
        
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        // 创建转账记录
        const transfer = {
            id: Date.now().toString(),
            type: 'apps_to_wallet',
            amount: amount,
            date: today,
            description: description || '软件收入提现',
            createdAt: new Date().toISOString()
        };
        
        finance.transfers.push(transfer);
        finance.wallet += amount;
        
        this.savePersonalFinance(finance);
        
        return { 
            success: true, 
            message: `成功提现 ¥${amount.toFixed(2)} 到个人钱包`,
            transfer: transfer
        };
    }

    // 记录个人支出
    static addPersonalExpense(expenseData) {
        const finance = this.getPersonalFinance();
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        const amount = parseFloat(expenseData.amount) || 0;
        
        if (amount <= 0) {
            return { success: false, message: '金额必须大于0' };
        }
        
        if (amount > finance.wallet) {
            return { success: false, message: `钱包余额不足，当前余额：¥${finance.wallet.toFixed(2)}` };
        }
        
        const newExpense = {
            id: Date.now().toString(),
            category: expenseData.category,
            categoryName: this.getExpenseCategoryName(expenseData.category),
            amount: amount,
            date: expenseData.date || today,
            description: expenseData.description || '',
            createdAt: new Date().toISOString()
        };
        
        finance.expenses.push(newExpense);
        finance.wallet -= amount;
        finance.totalSpent += amount;
        
        this.savePersonalFinance(finance);
        
        return { 
            success: true, 
            message: '支出记录成功',
            expense: newExpense
        };
    }

    // 获取支出分类名称
    static getExpenseCategoryName(category) {
        const categoryMap = {
            'food': '🍔 餐饮',
            'transport': '🚗 交通',
            'shopping': '🛍️ 购物',
            'entertainment': '🎮 娱乐',
            'housing': '🏠 住房',
            'medical': '🏥 医疗',
            'education': '📚 教育',
            'other': '📦 其他'
        };
        return categoryMap[category] || '📦 其他';
    }

    // 获取支出分类列表
    static getExpenseCategories() {
        return [
            { id: 'food', name: '🍔 餐饮' },
            { id: 'transport', name: '🚗 交通' },
            { id: 'shopping', name: '🛍️ 购物' },
            { id: 'entertainment', name: '🎮 娱乐' },
            { id: 'housing', name: '🏠 住房' },
            { id: 'medical', name: '🏥 医疗' },
            { id: 'education', name: '📚 教育' },
            { id: 'other', name: '📦 其他' }
        ];
    }

    // 计算完整的财务统计
    static calculateCompleteFinancialStats() {
        const finance = this.getPersonalFinance();
        const appEarnings = this.calculateTotalEarnings();
        const assets = this.calculateAssetStats();
        
        // 计算本月收入
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        const monthlyIncome = finance.incomeSources
            .filter(s => s.date.startsWith(currentMonth))
            .reduce((sum, s) => sum + s.amount, 0);
        
        const monthlyExpenses = finance.expenses
            .filter(e => e.date.startsWith(currentMonth))
            .reduce((sum, e) => sum + e.amount, 0);
        
        // 计算软件收入本月统计
        const monthlyAppEarnings = this.calculateMonthlyEarnings(now.getFullYear(), now.getMonth() + 1);
        
        return {
            // 软件资金
            appEarnings: appEarnings,
            
            // 个人资金
            personalWallet: finance.wallet,
            personalTotalEarned: finance.totalEarned,
            personalTotalSpent: finance.totalSpent,
            
            // 资产
            assetsValue: assets.totalValue,
            assetsCount: assets.totalAssets,
            
            // 汇总
            totalWealth: finance.wallet + appEarnings.totalBalance + assets.totalValue,
            liquidAssets: finance.wallet + appEarnings.totalBalance,
            fixedAssets: assets.totalValue,
            
            // 本月统计
            monthlyIncome: monthlyIncome,
            monthlyExpenses: monthlyExpenses,
            monthlyAppEarnings: monthlyAppEarnings,
            monthlyNetSavings: monthlyIncome + monthlyAppEarnings - monthlyExpenses,
            
            // 历史记录
            incomeSources: finance.incomeSources.sort((a, b) => new Date(b.date) - new Date(a.date)),
            expenses: finance.expenses.sort((a, b) => new Date(b.date) - new Date(a.date)),
            transfers: finance.transfers.sort((a, b) => new Date(b.date) - new Date(a.date))
        };
    }

    // 计算资产统计
    static calculateAssetStats() {
        const assets = this.getAssets();
        const categories = this.getAssetCategories();
        const now = new Date();
        
        let totalValue = 0;
        let totalDays = 0;
        const categoryStats = {};
        
        // 初始化分类统计
        categories.forEach(cat => {
            categoryStats[cat.id] = {
                ...cat,
                count: 0,
                totalValue: 0,
                totalDays: 0,
                dailyCost: 0
            };
        });
        
        assets.forEach(asset => {
            const purchaseDate = new Date(asset.purchaseDate);
            const daysOwned = Math.max(1, Math.floor((now - purchaseDate) / (1000 * 60 * 60 * 24)));
            const dailyCost = asset.price / daysOwned;
            
            totalValue += asset.price;
            totalDays += daysOwned;
            
            const catId = asset.category || 'other';
            if (categoryStats[catId]) {
                categoryStats[catId].count++;
                categoryStats[catId].totalValue += asset.price;
                categoryStats[catId].totalDays += daysOwned;
                categoryStats[catId].dailyCost += dailyCost;
            }
        });
        
        const totalDailyCost = totalValue > 0 && totalDays > 0 ? totalValue / (totalDays / assets.length || 1) : 0;
        
        return {
            totalAssets: assets.length,
            totalValue: totalValue,
            totalDailyCost: totalDailyCost,
            categoryStats: Object.values(categoryStats).filter(c => c.count > 0),
            assets: assets.map(asset => {
                const purchaseDate = new Date(asset.purchaseDate);
                const daysOwned = Math.max(1, Math.floor((now - purchaseDate) / (1000 * 60 * 60 * 24)));
                return {
                    ...asset,
                    daysOwned: daysOwned,
                    dailyCost: asset.price / daysOwned
                };
            }).sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate))
        };
    }

    // 清空所有数据
    static clearAllData() {
        localStorage.removeItem(PHONES_KEY);
        localStorage.removeItem(INSTALLMENTS_KEY);
        localStorage.removeItem(EXPENSES_KEY);
        localStorage.removeItem(SETTINGS_KEY);
        localStorage.removeItem(DATA_KEY);
        localStorage.removeItem('moneyApp_assets');
        return { phones: [], installments: [], expenses: [], settings: {} };
    }

    static addPhone(name) {
        const data = this.loadData();
        const today = new Date().toISOString().split('T')[0];
        // 生成唯一ID：时间戳 + 随机数 + 名称哈希
        const nameHash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0).toString(36);
        const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5) + nameHash;
        const phone = {
            id: uniqueId,
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
            // 生成唯一ID：时间戳 + 随机数 + 手机ID的一部分
            const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5) + phoneId.substr(-4);
            const app = {
                id: uniqueId,
                name: appData.name,
                balance: appData.balance || 0,  // 当前余额
                minWithdraw: appData.minWithdraw || 0,  // 最低提现门槛
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
                const oldBalance = app.balance || 0;
                const newBalance = appData.balance || 0;
                
                app.name = appData.name;
                app.balance = newBalance;  // 更新余额
                app.minWithdraw = appData.minWithdraw || 0;  // 更新提现门槛
                app.historicalWithdrawn = appData.historicalWithdrawn || 0;
                app.lastUpdated = new Date().toISOString();
                
                // 记录余额变化（只记录增加的情况，提现不算）
                let todayTotalEarnings = 0;
                if (newBalance > oldBalance) {
                    if (!app.balanceHistory) {
                        app.balanceHistory = [];
                    }
                    
                    const now = new Date();
                    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    const change = newBalance - oldBalance;
                    
                    console.log('记录余额变化:', { oldBalance, newBalance, change, today });
                    
                    // 检查今天是否已有记录
                    const todayRecord = app.balanceHistory.find(h => h.date === today);
                    if (todayRecord) {
                        // 累加今天的收益
                        todayRecord.change += change;
                        todayRecord.balance = newBalance;
                    } else {
                        // 添加新记录
                        app.balanceHistory.push({
                            date: today,
                            balance: newBalance,
                            change: change,
                            note: '手动编辑'
                        });
                    }
                    
                    // 更新每日收益统计
                    if (!app.dailyEarnings) {
                        app.dailyEarnings = {};
                    }
                    app.dailyEarnings[today] = (app.dailyEarnings[today] || 0) + change;
                    todayTotalEarnings = app.dailyEarnings[today];
                    
                    console.log('更新 dailyEarnings:', app.dailyEarnings);
                    
                    // 计算今日所有软件的总收益
                    let allAppsTodayEarnings = 0;
                    data.phones.forEach(p => {
                        p.apps.forEach(a => {
                            if (a.dailyEarnings && a.dailyEarnings[today]) {
                                allAppsTodayEarnings += a.dailyEarnings[today];
                            }
                        });
                    });
                    
                    // 检查是否达到日目标（基于总收益）
                    const dailyTarget = this.calculateDailyTarget();
                    console.log('检查日目标:', { allAppsTodayEarnings, dailyTarget: dailyTarget.dailyTarget, isValid: dailyTarget.isValid });
                    
                    // 总是返回今日收益信息
                    app._todayEarnings = allAppsTodayEarnings;
                    
                    if (dailyTarget.isValid) {
                        app._dailyTarget = dailyTarget.dailyTarget;
                        if (allAppsTodayEarnings >= dailyTarget.dailyTarget) {
                            // 达到日目标
                            app._dailyTargetAchieved = true;
                            console.log('达到日目标！');
                        } else {
                            // 未达到日目标
                            app._dailyTargetAchieved = false;
                            console.log('未达到日目标');
                        }
                    }
                } else {
                    console.log('余额未增加，不记录:', { oldBalance, newBalance });
                }

                this.saveData(data);
            }
        }
        return data;
    }
    
    // 获取软件的收益统计
    static getAppEarningsStats(app) {
        if (!app.dailyEarnings) {
            return {
                today: 0,
                last7Days: 0,
                last30Days: 0,
                avg7Days: 0,
                avg30Days: 0,
                total: 0
            };
        }
        
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const dates = Object.keys(app.dailyEarnings).sort();
        
        // 今日收益
        const todayEarning = app.dailyEarnings[today] || 0;
        
        // 计算7天和30天收益
        let last7Days = 0;
        let last30Days = 0;
        let total = 0;
        
        dates.forEach(date => {
            const amount = app.dailyEarnings[date];
            total += amount;
            
            // 检查是否在7天内
            const dateObj = new Date(date);
            const todayObj = new Date(today);
            const diffDays = Math.floor((todayObj - dateObj) / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 0 && diffDays < 7) {
                last7Days += amount;
            }
            if (diffDays >= 0 && diffDays < 30) {
                last30Days += amount;
            }
        });
        
        // 计算平均值
        const daysWithData7 = dates.filter(d => {
            const dateObj = new Date(d);
            const todayObj = new Date(today);
            const diffDays = Math.floor((todayObj - dateObj) / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays < 7;
        }).length;
        
        const daysWithData30 = dates.filter(d => {
            const dateObj = new Date(d);
            const todayObj = new Date(today);
            const diffDays = Math.floor((todayObj - dateObj) / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays < 30;
        }).length;
        
        return {
            today: todayEarning,
            last7Days: last7Days,
            last30Days: last30Days,
            avg7Days: daysWithData7 > 0 ? last7Days / daysWithData7 : 0,
            avg30Days: daysWithData30 > 0 ? last30Days / daysWithData30 : 0,
            total: total
        };
    }

    // 计算所有软件的总赚取
    static calculateTotalEarnings() {
        const data = this.loadData();
        let totalEarned = 0;
        let totalWithdrawn = 0;
        let totalBalance = 0;
        
        // 遍历所有手机和软件
        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                // 已提现金额
                const withdrawn = (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
                totalWithdrawn += withdrawn;
                
                // 当前余额
                const balance = app.balance || 0;
                totalBalance += balance;
                
                // 总赚取 = 已提现 + 当前余额
                totalEarned += withdrawn + balance;
            });
        });
        
        return {
            totalEarned: totalEarned,
            totalWithdrawn: totalWithdrawn,
            totalBalance: totalBalance,
            appCount: data.phones.reduce((sum, p) => sum + p.apps.length, 0),
            phoneCount: data.phones.length
        };
    }

    // 计算指定月份的软件收益
    static calculateMonthlyEarnings(year, month) {
        const data = this.loadData();
        let monthlyEarned = 0;
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        
        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                // 从 dailyEarnings 中统计
                if (app.dailyEarnings) {
                    Object.entries(app.dailyEarnings).forEach(([date, amount]) => {
                        if (date.startsWith(monthStr)) {
                            monthlyEarned += amount;
                        }
                    });
                }
            });
        });
        
        return monthlyEarned;
    }

    // ==================== 游戏计时功能 ====================
    
    // 保存游戏计时状态
    static saveGameTimer(gameId, timerData) {
        const timers = this.getAllGameTimers();
        timers[gameId] = {
            ...timerData,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('moneyApp_gameTimers', JSON.stringify(timers));
    }
    
    // 获取所有游戏计时
    static getAllGameTimers() {
        const timers = localStorage.getItem('moneyApp_gameTimers');
        return timers ? JSON.parse(timers) : {};
    }
    
    // 获取特定游戏的计时
    static getGameTimer(gameId) {
        const timers = this.getAllGameTimers();
        return timers[gameId] || null;
    }
    
    // 清除游戏计时
    static clearGameTimer(gameId) {
        const timers = this.getAllGameTimers();
        delete timers[gameId];
        localStorage.setItem('moneyApp_gameTimers', JSON.stringify(timers));
    }
    
    // 计算剩余时间（支持跨天、暂停和后台运行）
    static calculateRemainingTime(timerData) {
        if (!timerData || !timerData.startTime) return 0;

        const now = Date.now();
        const start = new Date(timerData.startTime).getTime();
        const duration = timerData.duration || 30; // 默认30分钟
        const totalDurationMs = duration * 60 * 1000;

        // 计算已经过的时间
        let elapsedMs = now - start;

        // 减去累计暂停时长
        if (timerData.pausedDuration) {
            elapsedMs -= timerData.pausedDuration;
        }

        // 如果当前正在暂停，只计算到暂停开始的时间
        if (timerData.isPaused && timerData.pausedTime) {
            const pausedTime = new Date(timerData.pausedTime).getTime();
            // 重新计算：从start到pausedTime的时间，减去之前的暂停时长
            elapsedMs = pausedTime - start;
            if (timerData.pausedDuration) {
                elapsedMs -= timerData.pausedDuration;
            }
        }

        const remaining = totalDurationMs - elapsedMs;
        return Math.max(0, remaining);
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
    
    // 更新下载的游戏名称
    static updateDownloadedGameName(gameId, newName) {
        const games = this.getDownloadedGames();
        const game = games.find(g => g.id === gameId);
        if (game) {
            game.name = newName;
            this.saveDownloadedGames(games);
            return true;
        }
        return false;
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

    // 获取已删除的游戏记录
    static getDeletedGames() {
        const games = this.getDownloadedGames();
        return games.filter(g => g.deleted);
    }

    // 检查游戏是否之前被删除过
    static checkIfGameWasDeleted(gameName, phoneId) {
        const deletedGames = this.getDeletedGames();
        return deletedGames.find(g => 
            g.name === gameName && 
            g.phoneId === phoneId
        );
    }

    // 获取今日要玩的游戏（抽签决定，可按手机ID筛选）
    static getTodayGameToPlay(phoneId = null) {
        const games = this.getDownloadedGames(phoneId);
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        // 过滤出未完成的游戏
        const activeGames = games.filter(g => !g.completed);
        
        if (activeGames.length === 0) {
            return null;
        }
        
        // 获取抽签历史用于计算权重
        const drawHistory = this.getGameDrawHistory();
        
        // 计算每个游戏的权重
        const weightedGames = activeGames.map(game => {
            const targetDays = game.targetDays || 7;
            const remainingDays = targetDays - game.daysPlayed;
            
            // 1. 进度系数：快完成的游戏权重更高
            let progressWeight = 1;
            if (remainingDays <= 1) progressWeight = 3;      // 剩余1天：3倍权重
            else if (remainingDays <= 2) progressWeight = 2; // 剩余2天：2倍权重
            else if (remainingDays >= 5) progressWeight = 0.7; // 刚开始：降低权重
            
            // 2. 冷落系数：长时间未抽到的权重增加
            let coldWeight = 1;
            const lastDrawn = drawHistory.find(h => h.gameId === game.id);
            if (lastDrawn) {
                const lastDate = new Date(lastDrawn.date);
                const todayDate = new Date(today);
                const daysSinceLastDrawn = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
                
                if (daysSinceLastDrawn >= 5) coldWeight = 3;      // 5天未抽到：3倍
                else if (daysSinceLastDrawn >= 3) coldWeight = 2; // 3天未抽到：2倍
                else if (daysSinceLastDrawn >= 2) coldWeight = 1.3; // 2天未抽到：1.3倍
            } else {
                // 从未抽到过，给予较高权重
                coldWeight = 1.5;
            }
            
            // 3. 连续系数：昨天玩过的降低权重
            let consecutiveWeight = 1;
            const yesterdayDraw = drawHistory.find(h => {
                const hDate = new Date(h.date);
                const todayDate = new Date(today);
                const diffDays = Math.floor((todayDate - hDate) / (1000 * 60 * 60 * 24));
                return diffDays === 1 && h.gameId === game.id;
            });
            if (yesterdayDraw) consecutiveWeight = 0.3; // 昨天玩过：大幅降低
            
            // 4. 保底机制：连续3天未抽中，第4天必中
            const notDrawnFor3Days = drawHistory.filter(h => {
                const hDate = new Date(h.date);
                const todayDate = new Date(today);
                const diffDays = Math.floor((todayDate - hDate) / (1000 * 60 * 60 * 24));
                return diffDays <= 3 && h.gameId === game.id;
            }).length === 0;
            
            let guaranteedWeight = 1;
            if (notDrawnFor3Days) guaranteedWeight = 5; // 3天未抽到：5倍权重
            
            // 5. 新游戏优先：daysPlayed为0的游戏给予最高权重
            let newGameWeight = 1;
            if (game.daysPlayed === 0) {
                newGameWeight = 10; // 新游戏10倍权重，确保优先被抽中
            } else if (game.daysPlayed === 1) {
                newGameWeight = 5;  // 第2天5倍权重
            } else if (game.daysPlayed === 2) {
                newGameWeight = 3;  // 第3天3倍权重
            }
            
            // 计算总权重
            const totalWeight = progressWeight * coldWeight * consecutiveWeight * guaranteedWeight * newGameWeight;
            
            return {
                ...game,
                weight: totalWeight,
                weightDetails: {
                    progress: progressWeight,
                    cold: coldWeight,
                    consecutive: consecutiveWeight,
                    guaranteed: guaranteedWeight,
                    newGame: newGameWeight
                }
            };
        });
        
        // 使用加权随机选择
        const selectedGame = this.weightedRandomSelect(weightedGames);
        
        // 不再立即保存到历史记录，只返回结果
        // 历史记录只在标记完成时保存
        const targetDays = selectedGame.targetDays || 7;
        
        console.log('智能抽签结果:', {
            date: today,
            gameName: selectedGame.name,
            weight: selectedGame.weight,
            weightDetails: selectedGame.weightDetails,
            phoneId: phoneId,
            daysPlayed: selectedGame.daysPlayed
        });
        
        // 返回结果，包含临时ID用于后续标记完成
        return {
            ...selectedGame,
            _drawDate: today,
            _phoneId: phoneId,
            _remainingDays: targetDays - selectedGame.daysPlayed
        };
    }
    
    // 加权随机选择算法
    static weightedRandomSelect(weightedItems) {
        const totalWeight = weightedItems.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const item of weightedItems) {
            random -= item.weight;
            if (random <= 0) {
                return item;
            }
        }
        
        // 兜底返回最后一个
        return weightedItems[weightedItems.length - 1];
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
    
    // 添加已完成的抽签记录
    static addCompletedDrawHistory(phoneId, game, drawDate) {
        const history = this.getGameDrawHistory();
        const targetDays = game.targetDays || 7;
        
        history.unshift({
            date: drawDate,
            gameId: game.id,
            gameName: game.name,
            phoneId: phoneId,
            daysPlayed: game.daysPlayed,
            remainingDays: targetDays - game.daysPlayed,
            targetDays: targetDays,
            isRedownload: game.isRedownload || false,
            completed: true,
            completedAt: new Date().toISOString()
        });
        
        this.saveGameDrawHistory(history);
        console.log('已保存完成的抽签记录:', history[0]);
        return history[0];
    }
    
    // 清理抽签历史：删除未完成的旧记录和已完成的7天记录
    static cleanupGameDrawHistory() {
        const history = this.getGameDrawHistory();
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        const filteredHistory = history.filter(record => {
            // 保留已完成的记录
            if (record.completed) {
                // 检查是否7天都完成了（daysPlayed >= targetDays）
                const targetDays = record.targetDays || 7;
                if (record.daysPlayed >= targetDays) {
                    // 7天完成的记录，检查是否已经完成超过1天
                    const completedDate = record.completedAt ? new Date(record.completedAt) : new Date(record.date);
                    const daysSinceCompleted = Math.floor((now - completedDate) / (1000 * 60 * 60 * 24));
                    return daysSinceCompleted < 1; // 只保留1天内完成的记录
                }
                return true; // 未完成7天的记录保留
            }
            
            // 删除未完成的旧记录（不是今天的）
            return record.date === today;
        });
        
        if (filteredHistory.length !== history.length) {
            this.saveGameDrawHistory(filteredHistory);
            console.log('清理后的抽签历史:', filteredHistory);
        }
        
        return filteredHistory;
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
                // 从余额中扣除提现金额
                app.balance = (app.balance || 0) - amount;
                // 确保余额不会变成负数
                if (app.balance < 0) app.balance = 0;

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
    
    static updateGameName(phoneId, gameId, newName) {
        const data = this.loadData();
        const phone = data.phones.find(p => p.id === phoneId);
        if (phone && phone.games) {
            const game = phone.games.find(g => g.id === gameId);
            if (game) {
                game.name = newName;
                this.saveData(data);
                return true;
            }
        }
        return false;
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

    // 计算软件提现总目标（基于分期还款总额）
    static calculateDailyWithdrawalTarget() {
        const data = this.loadData();

        // 统计所有软件数量
        const totalApps = data.phones.reduce((sum, phone) => sum + phone.apps.length, 0);

        if (totalApps === 0) {
            return null;
        }

        // 获取所有活跃分期
        const activeInstallments = data.installments.filter(i => i.status === 'active');

        // 计算总待还金额（所有分期的剩余还款额）
        const totalPendingAmount = activeInstallments.reduce((sum, inst) => {
            return sum + (inst.amount - (inst.paidAmount || 0));
        }, 0);

        // 计算已提现总额
        const totalWithdrawn = data.phones.reduce((sum, phone) => {
            return sum + phone.apps.reduce((appSum, app) => {
                return appSum + (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
            }, 0);
        }, 0);

        // 剩余目标金额
        const remainingTarget = Math.max(0, totalPendingAmount - totalWithdrawn);

        // 每个软件需要提现的目标 = 剩余目标 / 软件数量
        const perAppTarget = totalApps > 0 ? remainingTarget / totalApps : 0;

        return {
            totalApps,
            totalTargetAmount: totalPendingAmount,
            totalWithdrawn,
            remainingTarget,
            perAppTarget
        };
    }

    // 预测还清所有分期所需天数
    static predictRepaymentDays() {
        const data = this.loadData();
        const now = new Date();

        // 获取所有活跃分期
        const activeInstallments = data.installments.filter(i => i.status === 'active');

        if (activeInstallments.length === 0) {
            return null;
        }

        // 计算总待还金额
        const totalPendingAmount = activeInstallments.reduce((sum, inst) => {
            return sum + (inst.amount - (inst.paidAmount || 0));
        }, 0);

        // 找到最远还款日
        activeInstallments.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
        const furthestDueDate = activeInstallments[0].dueDate;
        const plannedDays = Math.max(1, Math.ceil((new Date(furthestDueDate) - now) / (1000 * 60 * 60 * 24)));

        // 获取今日实际提现金额
        const today = now.toISOString().split('T')[0];
        let todayWithdrawal = 0;
        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                if (app.withdrawals) {
                    app.withdrawals.forEach(w => {
                        if (w.date === today) {
                            todayWithdrawal += w.amount;
                        }
                    });
                }
            });
        });

        // 如果没有今日提现数据，使用历史平均
        let dailyWithdrawalRate = todayWithdrawal;
        if (dailyWithdrawalRate === 0) {
            // 计算最近7天的平均提现
            let totalWithdrawal7Days = 0;
            let daysWithWithdrawal = 0;
            for (let i = 0; i < 7; i++) {
                const date = new Date(now);
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
                    totalWithdrawal7Days += dayWithdrawal;
                    daysWithWithdrawal++;
                }
            }

            dailyWithdrawalRate = daysWithWithdrawal > 0 ? totalWithdrawal7Days / daysWithWithdrawal : 0;
        }

        // 预测还清天数
        const predictedDays = dailyWithdrawalRate > 0 ? Math.ceil(totalPendingAmount / dailyWithdrawalRate) : 0;

        // 计算提前天数
        const daysAhead = plannedDays - predictedDays;

        return {
            totalPendingAmount,
            plannedDays,
            predictedDays,
            daysAhead,
            dailyWithdrawalRate,
            furthestDueDate,
            status: daysAhead > 0 ? 'ahead' : daysAhead < 0 ? 'behind' : 'ontrack'
        };
    }

    // 计算追赶建议（当落后时）
    static calculateCatchUpAdvice() {
        const prediction = this.predictRepaymentDays();
        if (!prediction || prediction.status !== 'behind') {
            return null;
        }

        const data = this.loadData();
        const totalApps = data.phones.reduce((sum, phone) => sum + phone.apps.length, 0);

        // 需要在计划天数内还完，计算每天需要提现多少
        const requiredDailyWithdrawal = prediction.totalPendingAmount / prediction.plannedDays;

        // 计算每天需要多提现多少
        const extraNeeded = requiredDailyWithdrawal - prediction.dailyWithdrawalRate;

        // 每个软件需要多提现多少
        const extraPerApp = totalApps > 0 ? extraNeeded / totalApps : 0;

        // 建议增加软件数量
        const currentAvg = prediction.dailyWithdrawalRate;
        const appsNeeded = currentAvg > 0 ? Math.ceil(requiredDailyWithdrawal / currentAvg * totalApps) : 0;
        const suggestedApps = Math.max(0, appsNeeded - totalApps);

        return {
            plannedDays: prediction.plannedDays,
            requiredDailyWithdrawal,
            currentDailyWithdrawal: prediction.dailyWithdrawalRate,
            extraNeeded,
            totalApps,
            extraPerApp,
            suggestedApps,
            message: this.generateCatchUpMessage(extraNeeded, extraPerApp, suggestedApps)
        };
    }

    // 计算动态目标调整
    static calculateDynamicTarget() {
        const data = this.loadData();
        const now = new Date();

        // 获取所有活跃分期
        const activeInstallments = data.installments.filter(i => i.status === 'active');

        if (activeInstallments.length === 0) {
            return null;
        }

        // 找到最早开始的分期（作为起始日期）
        activeInstallments.sort((a, b) => new Date(a.createdAt || a.dueDate) - new Date(b.createdAt || b.dueDate));
        const startDate = new Date(activeInstallments[0].createdAt || activeInstallments[0].dueDate);
        startDate.setDate(startDate.getDate() - 30); // 假设提前30天开始

        // 找到最远还款日
        activeInstallments.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
        const furthestDueDate = activeInstallments[0].dueDate;
        const endDate = new Date(furthestDueDate);

        // 计算总待还金额
        const totalPendingAmount = activeInstallments.reduce((sum, inst) => {
            return sum + (inst.amount - (inst.paidAmount || 0));
        }, 0);

        // 计算已过去的天数
        const daysElapsed = Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));

        // 计算剩余天数
        const daysRemaining = Math.max(1, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));

        // 计算总天数
        const totalDays = daysElapsed + daysRemaining;

        // 计算已提现总额
        const totalWithdrawn = data.phones.reduce((sum, phone) => {
            return sum + phone.apps.reduce((appSum, app) => {
                return appSum + (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
            }, 0);
        }, 0);

        // 原始每日目标
        const originalDailyTarget = totalPendingAmount / totalDays;

        // 实际平均每日提现
        const actualDailyAverage = daysElapsed > 0 ? totalWithdrawn / daysElapsed : 0;

        // 新的动态目标（基于剩余金额和剩余天数）
        const remainingAmount = Math.max(0, totalPendingAmount - totalWithdrawn);
        const newDailyTarget = daysRemaining > 0 ? remainingAmount / daysRemaining : 0;

        // 计算进度差异
        const expectedWithdrawn = originalDailyTarget * daysElapsed;
        const progressDiff = totalWithdrawn - expectedWithdrawn;

        // 计算进度百分比
        const progressPercent = totalPendingAmount > 0 ? (totalWithdrawn / totalPendingAmount * 100) : 0;

        // 计算状态
        let status = 'ontrack';
        if (progressDiff > originalDailyTarget * 3) {
            status = 'ahead'; // 超前3天以上
        } else if (progressDiff < -originalDailyTarget * 3) {
            status = 'behind'; // 落后3天以上
        }

        // 计算可以休息的天数（如果超前）
        let restDays = 0;
        if (status === 'ahead' && actualDailyAverage > 0) {
            restDays = Math.floor(progressDiff / actualDailyAverage);
        }

        // 计算需要追赶的天数（如果落后）
        let catchUpDays = 0;
        if (status === 'behind' && newDailyTarget > actualDailyAverage) {
            catchUpDays = Math.ceil((newDailyTarget - actualDailyAverage) / actualDailyAverage * daysRemaining);
        }

        return {
            totalPendingAmount,
            totalWithdrawn,
            remainingAmount,
            daysElapsed,
            daysRemaining,
            totalDays,
            originalDailyTarget,
            actualDailyAverage,
            newDailyTarget,
            progressDiff,
            progressPercent,
            status,
            restDays,
            catchUpDays,
            perAppTarget: data.phones.reduce((sum, p) => sum + p.apps.length, 0) > 0 
                ? newDailyTarget / data.phones.reduce((sum, p) => sum + p.apps.length, 0) 
                : 0
        };
    }

    // 生成智能提醒
    static generateSmartReminders(dynamicTarget) {
        if (!dynamicTarget) return [];

        const reminders = [];

        // 根据状态生成不同的提醒
        switch (dynamicTarget.status) {
            case 'ahead':
                // 计算休息后的开始日期
                const restStartDate = new Date();
                restStartDate.setDate(restStartDate.getDate() + dynamicTarget.restDays);
                const restStartDateStr = restStartDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });

                reminders.push({
                    type: 'success',
                    icon: '🎉',
                    title: '进度超前！',
                    message: `您已提前完成 ${dynamicTarget.progressDiff.toFixed(2)} 元`,
                    detail: dynamicTarget.restDays > 0 
                        ? `可以休息 ${dynamicTarget.restDays} 天，${restStartDateStr} 再开始。或继续提现提前完成目标！`
                        : '继续保持，可以提前还清分期！'
                });
                break;

            case 'behind':
                reminders.push({
                    type: 'warning',
                    icon: '⚠️',
                    title: '需要加快进度',
                    message: `落后目标 ${Math.abs(dynamicTarget.progressDiff).toFixed(2)} 元`,
                    detail: `新的每日目标：¥${dynamicTarget.newDailyTarget.toFixed(2)}（原目标：¥${dynamicTarget.originalDailyTarget.toFixed(2)}）`
                });

                if (dynamicTarget.catchUpDays > 0) {
                    reminders.push({
                        type: 'info',
                        icon: '💡',
                        title: '追赶建议',
                        message: `建议未来 ${dynamicTarget.catchUpDays} 天加大提现力度`,
                        detail: `每天多提现 ¥${(dynamicTarget.newDailyTarget - dynamicTarget.actualDailyAverage).toFixed(2)} 即可追上进度`
                    });
                }
                break;

            default:
                reminders.push({
                    type: 'info',
                    icon: '✅',
                    title: '进度正常',
                    message: `当前进度 ${dynamicTarget.progressPercent.toFixed(1)}%`,
                    detail: `保持每日提现 ¥${dynamicTarget.newDailyTarget.toFixed(2)} 即可按时完成目标`
                });
        }

        // 添加时间提醒
        if (dynamicTarget.daysRemaining <= 7) {
            reminders.push({
                type: 'urgent',
                icon: '⏰',
                title: '还款日临近',
                message: `还有 ${dynamicTarget.daysRemaining} 天到还款日`,
                detail: `剩余待还：¥${dynamicTarget.remainingAmount.toFixed(2)}`
            });
        }

        return reminders;
    }

    // 生成追赶建议文案
    static generateCatchUpMessage(extraNeeded, extraPerApp, suggestedApps) {
        if (extraNeeded <= 0) return null;

        let messages = [];

        // 建议1：增加每日提现
        messages.push(`每天需要多提现 ¥${extraNeeded.toFixed(2)}`);

        // 建议2：每个软件多提现
        if (extraPerApp > 0) {
            messages.push(`每个软件每天多提现 ¥${extraPerApp.toFixed(2)}`);
        }

        // 建议3：增加软件数量
        if (suggestedApps > 0) {
            messages.push(`建议增加 ${suggestedApps} 个赚钱软件`);
        }

        return messages;
    }

    // 计算每个软件的赚取差额分析（基于固定还款周期）
    static calculateAppEarningGap() {
        const data = this.loadData();
        const now = new Date();

        // 获取所有活跃分期
        const activeInstallments = data.installments.filter(i => i.status === 'active');
        if (activeInstallments.length === 0) return [];

        // 计算总待还金额
        const totalPendingAmount = activeInstallments.reduce((sum, inst) => {
            return sum + (inst.amount - (inst.paidAmount || 0));
        }, 0);

        // 计算可用资金（已提现的金额 + 分期中已还的金额）
        const totalWithdrawn = data.phones.reduce((sum, phone) => {
            return sum + phone.apps.reduce((appSum, app) => {
                return appSum + (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
            }, 0);
        }, 0);
        const totalPaidInstallments = activeInstallments.reduce((sum, inst) => sum + (inst.paidAmount || 0), 0);
        const totalAvailableFunds = totalWithdrawn + totalPaidInstallments;

        // 计算还需赚取的总金额
        const totalNeedToEarn = Math.max(0, totalPendingAmount - totalAvailableFunds);

        // 统计软件数量
        const totalApps = data.phones.reduce((sum, phone) => sum + phone.apps.length, 0);
        if (totalApps === 0) return [];

        // 找到最早的分期创建日期（还款周期开始日）
        activeInstallments.sort((a, b) => new Date(a.createdAt || a.dueDate) - new Date(b.createdAt || b.dueDate));
        const cycleStartDate = new Date(activeInstallments[0].createdAt || activeInstallments[0].dueDate);

        // 找到最远还款日（还款周期结束日）
        activeInstallments.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
        const cycleEndDate = new Date(activeInstallments[0].dueDate);

        // 计算总还款周期天数
        const totalCycleDays = Math.max(1, Math.ceil((cycleEndDate - cycleStartDate) / (1000 * 60 * 60 * 24)));

        // 计算剩余天数
        const daysRemaining = Math.max(1, Math.ceil((cycleEndDate - now) / (1000 * 60 * 60 * 24)));

        // 每个软件需要赚取的目标金额（总需求 ÷ 软件数量）
        const perAppTarget = totalNeedToEarn / totalApps;

        // 分析每个软件
        const appAnalysis = [];
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                // 当前余额
                const currentBalance = app.balance || 0;

                // 该软件需要赚取的目标金额
                const targetAmount = perAppTarget;

                // 差额 = 目标 - 当前余额（还需要赚多少）
                const gap = targetAmount - currentBalance;

                // 每天需要赚取多少才能补齐差额
                const dailyNeed = daysRemaining > 0 && gap > 0 ? gap / daysRemaining : 0;

                // 状态判断
                let status = 'ontrack';
                if (gap <= 0) {
                    status = 'completed'; // 已完成目标
                } else if (dailyNeed > perAppTarget * 0.5) {
                    status = 'critical'; // 缺口很大
                } else if (dailyNeed > perAppTarget * 0.3) {
                    status = 'warning'; // 缺口较大
                }

                // 计算完成百分比（基于目标金额）
                const completionPercent = targetAmount > 0 ? (currentBalance / targetAmount * 100) : 0;

                // 计算今日收益
                const todayEarned = app.dailyEarnings && app.dailyEarnings[today] 
                    ? parseFloat(app.dailyEarnings[today]) || 0 
                    : 0;

                appAnalysis.push({
                    phoneName: phone.name,
                    phoneId: phone.id,
                    appName: app.name,
                    appId: app.id,
                    currentBalance,
                    targetAmount,
                    gap,
                    dailyNeed,
                    daysRemaining,
                    totalCycleDays,
                    status,
                    completionPercent,
                    perAppTarget,
                    totalPendingAmount,
                    totalAvailableFunds,
                    totalNeedToEarn,
                    todayEarned
                });
            });
        });

        // 按缺口大小排序（缺口大的在前）
        return appAnalysis.sort((a, b) => b.gap - a.gap);
    }

    // 生成软件赚取建议
    static generateAppEarningAdvice(appAnalysis) {
        if (!appAnalysis || appAnalysis.length === 0) return [];

        const advice = [];

        // 找出缺口最大的软件
        const criticalApps = appAnalysis.filter(a => a.status === 'critical');
        const warningApps = appAnalysis.filter(a => a.status === 'warning');
        const completedApps = appAnalysis.filter(a => a.status === 'completed');

        // 总体情况
        const firstApp = appAnalysis[0];
        
        // 计算今日达标状态
        const today = new Date().toISOString().split('T')[0];
        let todayEarned = 0;
        let todayTarget = 0;
        let todayAchieved = false;
        
        // 从 appAnalysis 中计算今日收益
        appAnalysis.forEach(app => {
            // 今日收益已经在 appAnalysis 中计算好了
            if (app.todayEarned) {
                todayEarned += app.todayEarned;
            }
            todayTarget += Math.max(0, app.dailyNeed);
        });
        todayAchieved = todayTarget > 0 && todayEarned >= todayTarget;
        
        if (firstApp && firstApp.totalNeedToEarn > 0) {
            const totalDailyNeed = appAnalysis.reduce((sum, a) => sum + Math.max(0, a.dailyNeed), 0);
            advice.push({
                type: 'summary',
                icon: '📊',
                title: '还款周期分析',
                message: `总待还 ¥${firstApp.totalPendingAmount.toFixed(2)} · 可用资金 ¥${firstApp.totalAvailableFunds.toFixed(2)}`,
                detail: `还需赚取 ¥${firstApp.totalNeedToEarn.toFixed(2)} · 周期共${firstApp.totalCycleDays}天 · 剩余${firstApp.daysRemaining}天 · 每天需赚¥${totalDailyNeed.toFixed(2)}`,
                todayEarned: todayEarned,
                todayTarget: todayTarget,
                todayAchieved: todayAchieved
            });
        } else if (firstApp) {
            advice.push({
                type: 'success',
                icon: '✅',
                title: '还款资金充足',
                message: `总待还 ¥${firstApp.totalPendingAmount.toFixed(2)} · 可用资金 ¥${firstApp.totalAvailableFunds.toFixed(2)}`,
                detail: '当前资金已足够覆盖还款需求！',
                todayEarned: todayEarned,
                todayTarget: todayTarget,
                todayAchieved: todayAchieved
            });
        }

        // 紧急软件建议
        if (criticalApps.length > 0) {
            criticalApps.slice(0, 3).forEach(app => {
                advice.push({
                    type: 'critical',
                    icon: '🔴',
                    title: `${app.phoneName} - ${app.appName}`,
                    message: `缺口 ¥${app.gap.toFixed(2)}，完成度 ${app.completionPercent.toFixed(1)}%`,
                    detail: `每天需赚取 ¥${app.dailyNeed.toFixed(2)}（目标 ¥${app.perAppTarget.toFixed(2)}/天）`
                });
            });
        }

        // 警告软件建议
        if (warningApps.length > 0) {
            warningApps.slice(0, 2).forEach(app => {
                advice.push({
                    type: 'warning',
                    icon: '🟡',
                    title: `${app.phoneName} - ${app.appName}`,
                    message: `缺口 ¥${app.gap.toFixed(2)}，完成度 ${app.completionPercent.toFixed(1)}%`,
                    detail: `每天需赚取 ¥${app.dailyNeed.toFixed(2)}`
                });
            });
        }

        // 已完成软件信息将合并到还款周期分析中，不再单独显示

        return advice;
    }

    // 计算还款能力预测
    static calculateRepaymentPrediction() {
        const data = this.loadData();
        const now = new Date();

        // 获取所有活跃分期
        const activeInstallments = data.installments.filter(i => i.status === 'active');
        if (activeInstallments.length === 0) return null;

        // 计算总还款金额
        const totalRepayment = activeInstallments.reduce((sum, inst) => sum + inst.amount, 0);

        // 计算已提现金额
        const totalWithdrawn = data.phones.reduce((sum, phone) => {
            return sum + phone.apps.reduce((appSum, app) => {
                return appSum + (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
            }, 0);
        }, 0);

        // 找到最早的分期创建日期（开始计算日）
        activeInstallments.sort((a, b) => new Date(a.createdAt || a.dueDate) - new Date(b.createdAt || b.dueDate));
        const startDate = new Date(activeInstallments[0].createdAt || activeInstallments[0].dueDate);

        // 找到最远还款日
        activeInstallments.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
        const lastDueDate = new Date(activeInstallments[0].dueDate);

        // 计算已过去天数
        const daysElapsed = Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));

        // 计算剩余天数
        const daysRemaining = Math.max(0, Math.ceil((lastDueDate - now) / (1000 * 60 * 60 * 24)));

        // 计算每天平均提现
        const dailyAverage = daysElapsed > 0 ? totalWithdrawn / daysElapsed : 0;

        // 预测到还款日还能提现多少
        const projectedAdditional = dailyAverage * daysRemaining;

        // 预测总提现
        const projectedTotal = totalWithdrawn + projectedAdditional;

        // 判断是否足够
        const isSufficient = projectedTotal >= totalRepayment;
        const gap = Math.abs(totalRepayment - projectedTotal);

        // 计算每天需要提现多少才能刚好达标
        const requiredDaily = daysRemaining > 0 ? (totalRepayment - totalWithdrawn) / daysRemaining : 0;

        return {
            totalRepayment,
            totalWithdrawn,
            daysElapsed,
            daysRemaining,
            dailyAverage,
            projectedAdditional,
            projectedTotal,
            isSufficient,
            gap,
            requiredDaily: Math.max(0, requiredDaily),
            lastDueDate: activeInstallments[0].dueDate,
            progressPercent: totalRepayment > 0 ? (totalWithdrawn / totalRepayment * 100) : 0
        };
    }

    // 获取智能提现方案
    static getSmartWithdrawalPlan() {
        const data = this.loadData();
        const now = new Date();

        // 获取所有软件
        const allApps = [];
        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                allApps.push({
                    ...app,
                    phoneId: phone.id,
                    phoneName: phone.name
                });
            });
        });

        // 分类软件
        const canWithdraw = []; // 可以提现的（余额 >= 门槛）
        const nearThreshold = []; // 接近门槛的（余额 >= 门槛 * 0.8）
        const farFromThreshold = []; // 远离门槛的
        const noThreshold = []; // 无门槛的

        allApps.forEach(app => {
            const balance = app.balance || 0;
            const threshold = app.minWithdraw || 0;

            if (threshold === 0) {
                noThreshold.push(app);
            } else if (balance >= threshold) {
                canWithdraw.push(app);
            } else if (balance >= threshold * 0.8) {
                nearThreshold.push(app);
            } else {
                farFromThreshold.push(app);
            }
        });

        // 按余额排序（余额多的优先）
        canWithdraw.sort((a, b) => (b.balance || 0) - (a.balance || 0));
        nearThreshold.sort((a, b) => (b.balance || 0) - (a.balance || 0));
        noThreshold.sort((a, b) => (b.balance || 0) - (a.balance || 0));

        return {
            canWithdraw,
            nearThreshold,
            farFromThreshold,
            noThreshold,
            totalApps: allApps.length
        };
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
    modal.style.display = 'none';
    modal.classList.remove('show');
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
    if (pageName === 'assets') renderAssetsPage();
    
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // 显示目标页面
    document.getElementById(`page-${pageName}`).classList.add('active');
    
    // 恢复页面状态
    restorePageState(pageName);
    
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
    
    // 恢复滚动位置
    if (pageElement && state.scrollTop !== undefined) {
        setTimeout(() => {
            pageElement.scrollTop = state.scrollTop;
        }, 100);
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
    // 已还分期总额
    const totalRepaid = data.installments ? data.installments.reduce((sum, inst) => sum + (inst.paidAmount || 0), 0) : 0;
    // 剩余支出 = 总提现 - 总支出 - 已还分期
    const netEarning = totalWithdrawnAmount - totalExpenses - totalRepaid;
    
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

    // 计算并显示软件提现总目标
    const dailyTarget = DataManager.calculateDailyWithdrawalTarget();
    const dailyTargetEl = document.getElementById('daily-withdrawal-target');
    if (dailyTargetEl) {
        if (dailyTarget && dailyTarget.totalTargetAmount > 0) {
            const progressPercent = dailyTarget.totalTargetAmount > 0
                ? (dailyTarget.totalWithdrawn / dailyTarget.totalTargetAmount * 100).toFixed(1)
                : 0;
            dailyTargetEl.innerHTML = `
                <div style="text-align: center; margin-bottom: 16px;">
                    <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 6px;">还款总目标</div>
                    <div style="font-size: 32px; font-weight: 700; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">¥${dailyTarget.totalTargetAmount.toFixed(2)}</div>
                </div>

                <div style="background: rgba(255,255,255,0.2); border-radius: 10px; height: 10px; overflow: hidden; margin-bottom: 16px;">
                    <div style="background: linear-gradient(90deg, #38ef7d, #11998e); height: 100%; width: ${Math.min(100, progressPercent)}%; transition: width 0.5s ease; border-radius: 10px;"></div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; text-align: center;">
                    <div style="background: rgba(255,255,255,0.15); border-radius: 12px; padding: 14px; border: 1px solid rgba(255,255,255,0.2);">
                        <div style="font-size: 20px; font-weight: 700; color: #38ef7d;">¥${dailyTarget.totalWithdrawn.toFixed(2)}</div>
                        <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 4px;">已提现</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.15); border-radius: 12px; padding: 14px; border: 1px solid rgba(255,255,255,0.2);">
                        <div style="font-size: 20px; font-weight: 700; color: #ffffff;">¥${dailyTarget.remainingTarget.toFixed(2)}</div>
                        <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 4px;">剩余</div>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.2);">
                    <span style="font-size: 13px; color: rgba(255,255,255,0.8);">共 ${dailyTarget.totalApps} 个软件</span>
                    <span style="font-size: 13px; color: rgba(255,255,255,0.8);">每个需 ¥${dailyTarget.perAppTarget.toFixed(2)}</span>
                </div>
            `;
        } else {
            dailyTargetEl.innerHTML = '<span style="color: #e0e0e0;">无分期还款目标</span>';
        }
    }

    // 渲染总赚取金额
    renderTotalEarnings();

    // 渲染今日需要关注的软件
    renderTodayApps(data);

    // 渲染收入日历
    renderIncomeCalendar();
    
    // 渲染软件提现排行
    renderAppRanking();
    
    // 渲染软件收益排行（基于余额变化）
    renderAppEarningsRanking();
    
    // 渲染软件赚取分析
    renderAppEarningAnalysis();
    
    // 渲染年度目标
    renderYearlyGoal();
    
}

// 打开记收入弹窗
function openAddIncomeModal() {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    showModal(
        '➕ 记录收入',
        `
            <div class="form-group">
                <label class="form-label">收入类型</label>
                <select id="income-type" class="form-input">
                    <option value="salary">💰 工资收入</option>
                    <option value="bonus">🎁 奖金/红包</option>
                    <option value="investment">📈 投资收益</option>
                    <option value="gift">🎀 礼物</option>
                    <option value="refund">💸 退款</option>
                    <option value="other">📦 其他收入</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">金额 (元)</label>
                <input type="number" id="income-amount" class="form-input" placeholder="输入金额" step="0.01">
            </div>
            <div class="form-group">
                <label class="form-label">日期</label>
                <input type="text" id="income-date" class="form-input" value="${todayStr}" placeholder="例如：2026-02-28" maxlength="10">
                <div class="form-hint">格式：YYYY-MM-DD</div>
            </div>
            <div class="form-group">
                <label class="form-label">备注 (可选)</label>
                <input type="text" id="income-description" class="form-input" placeholder="例如：2月工资">
            </div>
        `,
        [
            {
                text: '取消',
                class: 'btn-secondary',
                action: closeModal
            },
            {
                text: '保存',
                class: 'btn-primary',
                action: () => {
                    const type = document.getElementById('income-type').value;
                    const amount = parseFloat(document.getElementById('income-amount').value);
                    const date = document.getElementById('income-date').value;
                    const description = document.getElementById('income-description').value.trim();
                    
                    if (!amount || amount <= 0) {
                        showToast('请输入有效的金额', 'error');
                        return;
                    }
                    
                    // 验证日期格式
                    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                    if (!dateRegex.test(date)) {
                        showToast('日期格式不正确，请使用 YYYY-MM-DD 格式', 'error');
                        return;
                    }
                    
                    DataManager.addIncomeSource({
                        type,
                        amount,
                        date,
                        description
                    });
                    
                    showToast('收入记录成功！');
                    renderPersonalFinanceOverview();
                    closeModal();
                }
            }
        ]
    );
}

// 打开记支出弹窗
function openAddExpenseModal() {
    const categories = DataManager.getExpenseCategories();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    showModal(
        '➖ 记录支出',
        `
            <div class="form-group">
                <label class="form-label">支出分类</label>
                <select id="expense-category" class="form-input">
                    ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">金额 (元)</label>
                <input type="number" id="expense-amount" class="form-input" placeholder="输入金额" step="0.01">
            </div>
            <div class="form-group">
                <label class="form-label">日期</label>
                <input type="text" id="expense-date" class="form-input" value="${todayStr}" placeholder="例如：2026-02-28" maxlength="10">
                <div class="form-hint">格式：YYYY-MM-DD</div>
            </div>
            <div class="form-group">
                <label class="form-label">备注 (可选)</label>
                <input type="text" id="expense-description" class="form-input" placeholder="例如：午餐">
            </div>
        `,
        [
            {
                text: '取消',
                class: 'btn-secondary',
                action: closeModal
            },
            {
                text: '保存',
                class: 'btn-primary',
                action: () => {
                    const category = document.getElementById('expense-category').value;
                    const amount = parseFloat(document.getElementById('expense-amount').value);
                    const date = document.getElementById('expense-date').value;
                    const description = document.getElementById('expense-description').value.trim();
                    
                    if (!amount || amount <= 0) {
                        showToast('请输入有效的金额', 'error');
                        return;
                    }
                    
                    // 验证日期格式
                    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                    if (!dateRegex.test(date)) {
                        showToast('日期格式不正确，请使用 YYYY-MM-DD 格式', 'error');
                        return;
                    }
                    
                    const result = DataManager.addPersonalExpense({
                        category,
                        amount,
                        date,
                        description
                    });
                    
                    if (result.success) {
                        showToast(result.message);
                        renderPersonalFinanceOverview();
                        closeModal();
                    } else {
                        showToast(result.message, 'error');
                    }
                }
            }
        ]
    );
}

// 打开提现弹窗
function openTransferModal() {
    const stats = DataManager.calculateCompleteFinancialStats();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    showModal(
        '💱 软件收入提现',
        `
            <div class="form-group">
                <label class="form-label">可提现金额</label>
                <div style="font-size: 24px; font-weight: 700; color: var(--primary-color);">¥${stats.appEarnings.totalBalance.toFixed(2)}</div>
                <div class="form-hint">软件账户总余额</div>
            </div>
            <div class="form-group">
                <label class="form-label">提现金额 (元)</label>
                <input type="number" id="transfer-amount" class="form-input" placeholder="输入提现金额" step="0.01" max="${stats.appEarnings.totalBalance}">
            </div>
            <div class="form-group">
                <label class="form-label">日期</label>
                <input type="text" id="transfer-date" class="form-input" value="${todayStr}" placeholder="例如：2026-02-28" maxlength="10">
                <div class="form-hint">格式：YYYY-MM-DD</div>
            </div>
            <div class="form-group">
                <label class="form-label">备注 (可选)</label>
                <input type="text" id="transfer-description" class="form-input" placeholder="例如：提现到银行卡">
            </div>
        `,
        [
            {
                text: '取消',
                class: 'btn-secondary',
                action: closeModal
            },
            {
                text: '确认提现',
                class: 'btn-primary',
                action: () => {
                    const amount = parseFloat(document.getElementById('transfer-amount').value);
                    const date = document.getElementById('transfer-date').value;
                    const description = document.getElementById('transfer-description').value.trim();
                    
                    if (!amount || amount <= 0) {
                        showToast('请输入有效的金额', 'error');
                        return;
                    }
                    
                    // 验证日期格式
                    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                    if (!dateRegex.test(date)) {
                        showToast('日期格式不正确，请使用 YYYY-MM-DD 格式', 'error');
                        return;
                    }
                    
                    const result = DataManager.transferFromAppsToWallet(amount, description);
                    
                    if (result.success) {
                        showToast(result.message);
                        renderPersonalFinanceOverview();
                        closeModal();
                    } else {
                        showToast(result.message, 'error');
                    }
                }
            }
        ]
    );
}

// 渲染总赚取金额
function renderTotalEarnings() {
    const totalEarningsEl = document.getElementById('total-earnings');
    if (!totalEarningsEl) return;

    const earnings = DataManager.calculateTotalEarnings();
    totalEarningsEl.textContent = `¥${earnings.totalEarned.toFixed(2)}`;
}

// 显示总赚取详情
function showTotalEarningsDetail() {
    const earnings = DataManager.calculateTotalEarnings();
    
    const html = `
        <div style="padding: 16px;">
            <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 12px; margin-bottom: 20px; color: white;">
                <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">总赚取金额</div>
                <div style="font-size: 32px; font-weight: 700;">¥${earnings.totalEarned.toFixed(2)}</div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px;">
                <div style="background: var(--bg-cream); border-radius: 8px; padding: 16px; text-align: center;">
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">已提现</div>
                    <div style="font-size: 18px; font-weight: 600; color: var(--success-color);">¥${earnings.totalWithdrawn.toFixed(2)}</div>
                </div>
                <div style="background: var(--bg-cream); border-radius: 8px; padding: 16px; text-align: center;">
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">当前余额</div>
                    <div style="font-size: 18px; font-weight: 600; color: var(--primary-color);">¥${earnings.totalBalance.toFixed(2)}</div>
                </div>
            </div>
            
            <div style="background: var(--bg-cream); border-radius: 8px; padding: 16px;">
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">统计信息</div>
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px;">
                    <span>手机数量</span>
                    <span style="font-weight: 600;">${earnings.phoneCount} 部</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 13px;">
                    <span>软件数量</span>
                    <span style="font-weight: 600;">${earnings.appCount} 个</span>
                </div>
            </div>
        </div>
    `;
    
    showModal('总赚取详情', html, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}

// 全局图表实例
let incomeChart = null;

// ==================== 智能提现方案 ====================

// 渲染总赚取金额
function renderTotalEarnings() {
    const totalEarningsEl = document.getElementById('total-earnings');
    if (!totalEarningsEl) return;
    
    const earnings = DataManager.calculateTotalEarnings();
    totalEarningsEl.textContent = `¥${earnings.totalEarned.toFixed(2)}`;
}

// 显示总赚取详情
function showTotalEarningsDetail() {
    const earnings = DataManager.calculateTotalEarnings();
    
    let html = `
        <div style="padding: 16px;">
            <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 12px; margin-bottom: 20px; color: white;">
                <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">总赚取金额</div>
                <div style="font-size: 32px; font-weight: 700;">¥${earnings.totalEarned.toFixed(2)}</div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px;">
                <div style="background: var(--bg-cream); border-radius: 8px; padding: 16px; text-align: center;">
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">已提现</div>
                    <div style="font-size: 20px; font-weight: 700; color: var(--success-color);">¥${earnings.totalWithdrawn.toFixed(2)}</div>
                </div>
                <div style="background: var(--bg-cream); border-radius: 8px; padding: 16px; text-align: center;">
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">当前余额</div>
                    <div style="font-size: 20px; font-weight: 700; color: var(--primary-color);">¥${earnings.totalBalance.toFixed(2)}</div>
                </div>
            </div>
            
            <div style="background: var(--bg-cream); border-radius: 8px; padding: 16px;">
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">设备统计</div>
                <div style="display: flex; justify-content: space-between; font-size: 14px; color: var(--text-primary);">
                    <span>手机数量: <strong>${earnings.phoneCount}</strong> 部</span>
                    <span>软件数量: <strong>${earnings.appCount}</strong> 个</span>
                </div>
            </div>
        </div>
    `;
    
    showModal('总赚取详情', html, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}

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

// ==================== 软件赚取分析功能 ====================

// 渲染软件赚取分析
function renderAppEarningAnalysis() {
    const card = document.getElementById('app-earning-analysis-card');
    const content = document.getElementById('app-earning-analysis-content');
    if (!card || !content) return;

    const appAnalysis = DataManager.calculateAppEarningGap();
    const advice = DataManager.generateAppEarningAdvice(appAnalysis);
    const completedApps = appAnalysis.filter(a => a.status === 'completed');

    if (appAnalysis.length === 0) {
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';

    let html = '';

    // 显示建议
    if (advice.length > 0) {
        advice.forEach(item => {
            // 还款周期分析使用特殊布局 - 毛玻璃效果
            if (item.title === '还款周期分析' || item.title === '还款资金充足') {
                const isAchieved = item.todayAchieved;
                const todayStatusColor = isAchieved ? '#22c55e' : '#f59e0b';
                const todayStatusBg = isAchieved ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)';
                
                html += `
                    <div style="margin-bottom: 16px; position: relative; background: linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%); border-radius: 16px; padding: 20px; overflow: hidden;">
                        <!-- 背景装饰圆形 -->
                        <div style="position: absolute; top: -30px; right: -30px; width: 80px; height: 80px; background: rgba(255,255,255,0.3); border-radius: 50%; filter: blur(20px);"></div>
                        <div style="position: absolute; bottom: -20px; left: -20px; width: 60px; height: 60px; background: rgba(255,255,255,0.25); border-radius: 50%; filter: blur(15px);"></div>
                        
                        <!-- 毛玻璃卡片内容 -->
                        <div style="position: relative; background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-radius: 12px; border: 1px solid rgba(255,255,255,0.3); padding: 16px;">
                            <!-- 标题 -->
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                                <span style="font-size: 20px;">${item.icon}</span>
                                <span style="font-size: 15px; font-weight: 700; color: #ffffff; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">${item.title}</span>
                            </div>
                            
                            <!-- 今日达标状态 - 毛玻璃效果 -->
                            <div style="background: ${todayStatusBg}; backdrop-filter: blur(5px); border-radius: 10px; padding: 12px; margin-bottom: 12px; border: 1px solid ${isAchieved ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'};">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                    <span style="font-size: 13px; font-weight: 600; color: ${isAchieved ? '#166534' : '#92400e'};">
                                        ${isAchieved ? '✅ 今日已达标' : '⏳ 今日未达标'}
                                    </span>
                                    <span style="font-size: 12px; color: ${isAchieved ? '#166534' : '#92400e'}; font-weight: 600;">
                                        ${isAchieved ? '超额完成' : `还需 ¥${(item.todayTarget - item.todayEarned).toFixed(2)}`}
                                    </span>
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                                    <div style="background: rgba(255,255,255,0.25); backdrop-filter: blur(5px); border-radius: 8px; padding: 10px; text-align: center; border: 1px solid rgba(255,255,255,0.3);">
                                        <div style="font-size: 18px; font-weight: 700; color: ${isAchieved ? '#166534' : '#92400e'};">¥${item.todayEarned.toFixed(2)}</div>
                                        <div style="font-size: 10px; color: #78350f; margin-top: 2px;">今日已赚</div>
                                    </div>
                                    <div style="background: rgba(255,255,255,0.25); backdrop-filter: blur(5px); border-radius: 8px; padding: 10px; text-align: center; border: 1px solid rgba(255,255,255,0.3);">
                                        <div style="font-size: 18px; font-weight: 700; color: #0369a1;">¥${item.todayTarget.toFixed(2)}</div>
                                        <div style="font-size: 10px; color: #78350f; margin-top: 2px;">今日目标</div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 还款信息 - 毛玻璃效果 -->
                            <div style="background: rgba(255,255,255,0.2); backdrop-filter: blur(5px); border-radius: 8px; padding: 12px; border: 1px solid rgba(255,255,255,0.25);">
                                <div style="font-size: 12px; color: #78350f; margin-bottom: 8px; line-height: 1.6; font-weight: 500;">
                                    ${item.message}
                                </div>
                                <div style="font-size: 11px; color: #92400e; padding-top: 8px; border-top: 1px dashed rgba(120, 53, 15, 0.2);">
                                    ${item.detail}
                                </div>
                                
                                <!-- 已完成软件统计 -->
                                ${completedApps.length > 0 ? `
                                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed rgba(120, 53, 15, 0.2);">
                                    <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #166534; font-weight: 600;">
                                        <span>✅</span>
                                        <span><b>${completedApps.length}</b> 个软件已完成目标</span>
                                    </div>
                                    <div style="font-size: 10px; color: #92400e; margin-top: 4px; padding-left: 20px;">
                                        ${completedApps.slice(0, 2).map(a => a.appName).join('、')}${completedApps.length > 2 ? '等' : ''}
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // 其他建议使用原有布局
                const bgColor = item.type === 'success' ? 'rgba(34, 197, 94, 0.1)' :
                               item.type === 'critical' ? 'rgba(239, 68, 68, 0.1)' :
                               item.type === 'warning' ? 'rgba(245, 158, 11, 0.1)' :
                               'rgba(59, 130, 246, 0.1)';
                const borderColor = item.type === 'success' ? '#22c55e' :
                                   item.type === 'critical' ? '#ef4444' :
                                   item.type === 'warning' ? '#f59e0b' :
                                   '#3b82f6';
                const textColor = item.type === 'success' ? '#16a34a' :
                                 item.type === 'critical' ? '#dc2626' :
                                 item.type === 'warning' ? '#d97706' :
                                 '#2563eb';

                html += `
                    <div style="margin-bottom: 12px; padding: 12px; background: ${bgColor}; border-radius: 8px; border-left: 3px solid ${borderColor};">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <span style="font-size: 16px;">${item.icon}</span>
                            <span style="font-size: 13px; font-weight: 600; color: ${textColor};">${item.title}</span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-primary); margin-bottom: 4px;">${item.message}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">${item.detail}</div>
                    </div>
                `;
            }
        });
    }

    // 显示软件列表（显示所有软件，按差额排序）
    if (appAnalysis.length > 0) {
        // 计算统计信息
        const completedCount = appAnalysis.filter(a => a.gap <= 0).length;
        const criticalCount = appAnalysis.filter(a => a.status === 'critical').length;
        const warningCount = appAnalysis.filter(a => a.status === 'warning').length;
        
        html += `<div style="margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 12px;">`;
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div style="font-size: 12px; font-weight: 600; color: var(--text-primary);">
                    📱 软件赚取分析 (${appAnalysis.length}个)
                </div>
                <button class="btn btn-sm btn-secondary" onclick="showAllAppsAnalysis()" style="font-size: 11px; padding: 4px 12px;">
                    查看全部
                </button>
            </div>
        `;
        
        // 显示统计摘要
        html += `
            <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                ${completedCount > 0 ? `<span style="font-size: 11px; background: rgba(34, 197, 94, 0.1); color: #16a34a; padding: 2px 8px; border-radius: 10px;">✅ 已完成 ${completedCount}</span>` : ''}
                ${criticalCount > 0 ? `<span style="font-size: 11px; background: rgba(239, 68, 68, 0.1); color: #dc2626; padding: 2px 8px; border-radius: 10px;">🔴 紧急 ${criticalCount}</span>` : ''}
                ${warningCount > 0 ? `<span style="font-size: 11px; background: rgba(245, 158, 11, 0.1); color: #d97706; padding: 2px 8px; border-radius: 10px;">🟡 警告 ${warningCount}</span>` : ''}
            </div>
        `;

        // 只显示前5个（差额最大的在前）
        const displayApps = appAnalysis.slice(0, 5);
        displayApps.forEach(app => {
            const statusIcon = app.status === 'critical' ? '🔴' : app.status === 'warning' ? '🟡' : app.gap <= 0 ? '✅' : '🟢';
            const statusColor = app.status === 'critical' ? '#ef4444' : app.status === 'warning' ? '#f59e0b' : app.gap <= 0 ? '#22c55e' : '#3b82f6';
            const gapText = app.gap <= 0 ? '已完成' : `差额 ¥${app.gap.toFixed(2)}`;
            
            // 计算今日达标状态
            const isTodayAchieved = app.todayEarned >= app.dailyNeed;
            const todayStatusIcon = isTodayAchieved ? '✅' : '⏳';
            const todayStatusColor = isTodayAchieved ? '#22c55e' : '#f59e0b';
            const todayStatusText = isTodayAchieved ? '今日已达标' : '今日未达标';

            html += `
                <div style="position: relative; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 16px; margin-bottom: 12px; overflow: hidden;">
                    <!-- 背景装饰圆形 -->
                    <div style="position: absolute; top: -20px; right: -20px; width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 50%; filter: blur(15px);"></div>
                    <div style="position: absolute; bottom: -15px; left: -15px; width: 50px; height: 50px; background: rgba(255,255,255,0.15); border-radius: 50%; filter: blur(12px);"></div>
                    
                    <!-- 毛玻璃卡片内容 -->
                    <div style="position: relative; background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-radius: 12px; border: 1px solid rgba(255,255,255,0.25); padding: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 8px;">
                            <div style="display: flex; align-items: center; gap: 8px; cursor: pointer; flex: 1; min-width: 0;" onclick="showAppDetailModal('${app.appId}')">
                                <span style="font-size: 14px; flex-shrink: 0;">${statusIcon}</span>
                                <span style="font-size: 13px; font-weight: 600; color: #ffffff; text-shadow: 0 1px 2px rgba(0,0,0,0.1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${app.phoneName} - ${app.appName}</span>
                            </div>
                            <div style="display: flex; gap: 6px; flex-shrink: 0;">
                                <button class="btn btn-sm" onclick="editAppFromAnalysis('${app.appId}', '${app.phoneId}')" style="font-size: 10px; padding: 4px 8px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; white-space: nowrap;">✏️ 编辑</button>
                                <button class="btn btn-sm" onclick="withdrawAppFromAnalysis('${app.appId}', '${app.phoneId}')" style="font-size: 10px; padding: 4px 8px; background: rgba(56, 239, 125, 0.3); border: 1px solid rgba(56, 239, 125, 0.4); color: white; white-space: nowrap;">💰 提现</button>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 12px; color: rgba(255,255,255,0.85); margin-bottom: 8px;">
                            <span>目标: <strong style="color: #ffffff;">¥${app.targetAmount.toFixed(2)}</strong></span>
                            <span>余额: <strong style="color: #ffffff;">¥${app.currentBalance.toFixed(2)}</strong></span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.2);">
                            <div>
                                <span style="font-size: 11px; color: rgba(255,255,255,0.9);">${gapText}</span>
                            </div>
                            <div style="text-align: right;">
                                ${app.gap > 0 ? `
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <div style="text-align: right;">
                                            <div style="font-size: 10px; color: rgba(255,255,255,0.8);">每天需赚取</div>
                                            <div style="font-size: 16px; font-weight: 700; color: ${statusColor}; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">¥${app.dailyNeed.toFixed(2)}</div>
                                        </div>
                                        <div style="text-align: right; padding-left: 10px; border-left: 1px solid rgba(255,255,255,0.2);">
                                            <div style="font-size: 10px; color: ${todayStatusColor};">${todayStatusText}</div>
                                            <div style="font-size: 13px; font-weight: 600; color: ${todayStatusColor};">${todayStatusIcon} ¥${app.todayEarned.toFixed(2)}</div>
                                        </div>
                                    </div>
                                ` : `
                                    <div style="font-size: 13px; color: #38ef7d; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">✓ 已达标</div>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        // 如果还有更多，显示提示
        if (appAnalysis.length > 5) {
            html += `
                <div style="text-align: center; padding: 8px; font-size: 11px; color: var(--text-secondary);">
                    还有 ${appAnalysis.length - 5} 个软件，点击查看全部
                </div>
            `;
        }

        html += `</div>`;
    }

    content.innerHTML = html;
}

// 显示所有软件分析
function showAllAppsAnalysis() {
    const appAnalysis = DataManager.calculateAppEarningGap();
    
    if (appAnalysis.length === 0) {
        showToast('暂无软件数据');
        return;
    }
    
    let html = `
        <div style="max-height: 70vh; overflow-y: auto;">
            <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color);">
                📱 所有软件赚取分析 (${appAnalysis.length}个)
            </div>
    `;
    
    appAnalysis.forEach(app => {
        const statusIcon = app.status === 'critical' ? '🔴' : app.status === 'warning' ? '🟡' : app.gap <= 0 ? '✅' : '🟢';
        const statusColor = app.status === 'critical' ? '#ef4444' : app.status === 'warning' ? '#f59e0b' : app.gap <= 0 ? '#22c55e' : '#3b82f6';
        const gapText = app.gap <= 0 ? '已完成' : `差额 ¥${app.gap.toFixed(2)}`;
        
        // 计算今日达标状态
        const isTodayAchieved = app.todayEarned >= app.dailyNeed;
        const todayStatusIcon = isTodayAchieved ? '✅' : '⏳';
        const todayStatusColor = isTodayAchieved ? '#22c55e' : '#f59e0b';
        const todayStatusText = isTodayAchieved ? '今日已达标' : '今日未达标';
        
        html += `
            <div style="padding: 12px; background: var(--bg-cream); border-radius: 8px; margin-bottom: 8px; cursor: pointer;" onclick="showAppDetailModal('${app.appId}')">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 12px;">${statusIcon}</span>
                        <span style="font-size: 12px; font-weight: 500; color: var(--text-primary);">${app.phoneName} - ${app.appName}</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-secondary);">${app.daysRemaining}天后</div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-secondary); margin-bottom: 6px;">
                    <span>目标: ¥${app.targetAmount.toFixed(2)}</span>
                    <span>余额: ¥${app.currentBalance.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px dashed var(--border-color);">
                    <div>
                        <span style="font-size: 11px; color: var(--text-secondary);">${gapText}</span>
                    </div>
                    <div style="text-align: right;">
                        ${app.gap > 0 ? `
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div style="text-align: right;">
                                    <div style="font-size: 10px; color: var(--text-secondary);">每天需赚取</div>
                                    <div style="font-size: 14px; font-weight: 700; color: ${statusColor};">¥${app.dailyNeed.toFixed(2)}</div>
                                </div>
                                <div style="text-align: right; padding-left: 8px; border-left: 1px solid var(--border-color);">
                                    <div style="font-size: 10px; color: ${todayStatusColor};">${todayStatusText}</div>
                                    <div style="font-size: 12px; font-weight: 600; color: ${todayStatusColor};">${todayStatusIcon} ¥${app.todayEarned.toFixed(2)}</div>
                                </div>
                            </div>
                        ` : `
                            <div style="font-size: 12px; color: #22c55e; font-weight: 600;">✓ 已达标</div>
                        `}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    
    showModal('所有软件赚取分析', html, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}

// 显示软件详情
function showAppDetailModal(appId) {
    const data = DataManager.loadData();
    let targetApp = null;
    let targetPhone = null;
    
    // 查找对应的软件和手机
    for (const phone of data.phones) {
        const app = phone.apps.find(a => a.id === appId);
        if (app) {
            targetApp = app;
            targetPhone = phone;
            break;
        }
    }
    
    if (!targetApp) {
        showToast('未找到该软件');
        return;
    }
    
    const appAnalysis = DataManager.calculateAppEarningGap();
    const analysis = appAnalysis.find(a => a.appId === appId);
    
    const earned = (targetApp.withdrawn || 0) + (targetApp.historicalWithdrawn || 0);
    const balance = targetApp.balance || 0;
    const totalEarned = balance + earned;
    
    let html = `
        <div style="max-height: 70vh; overflow-y: auto;">
            <div style="text-align: center; padding: 16px; background: var(--bg-cream); border-radius: 12px; margin-bottom: 16px;">
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">${targetPhone.name} - ${targetApp.name}</div>
                <div style="font-size: 24px; font-weight: 700; color: var(--primary-color);">¥${balance.toFixed(2)}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">当前余额</div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
                <div style="background: var(--bg-cream); border-radius: 8px; padding: 12px; text-align: center;">
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">¥${earned.toFixed(2)}</div>
                    <div style="font-size: 11px; color: var(--text-secondary);">累计提现</div>
                </div>
                <div style="background: var(--bg-cream); border-radius: 8px; padding: 12px; text-align: center;">
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">¥${totalEarned.toFixed(2)}</div>
                    <div style="font-size: 11px; color: var(--text-secondary);">总赚取</div>
                </div>
            </div>
            
            ${analysis ? `
                <div style="background: var(--bg-cream); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                    <div style="font-size: 12px; font-weight: 600; margin-bottom: 10px; color: var(--text-primary);">📊 还款分析</div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 12px;">
                        <div><span style="color: var(--text-secondary);">目标:</span> ¥${analysis.targetAmount.toFixed(2)}</div>
                        <div><span style="color: var(--text-secondary);">余额:</span> ¥${analysis.currentBalance.toFixed(2)}</div>
                        <div><span style="color: var(--text-secondary);">差额:</span> ¥${Math.max(0, analysis.gap).toFixed(2)}</div>
                        <div><span style="color: var(--text-secondary);">剩余天数:</span> ${analysis.daysRemaining}天</div>
                    </div>
                    ${analysis.gap > 0 ? `
                        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border-color); text-align: center;">
                            <div style="font-size: 11px; color: var(--text-secondary);">每天需赚取</div>
                            <div style="font-size: 20px; font-weight: 700; color: #ef4444;">¥${analysis.dailyNeed.toFixed(2)}</div>
                        </div>
                    ` : `
                        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border-color); text-align: center;">
                            <div style="font-size: 14px; color: #22c55e; font-weight: 600;">✅ 已达标</div>
                        </div>
                    `}
                </div>
            ` : ''}
            
            <div style="display: flex; gap: 8px;">
                <button class="btn btn-primary flex-1" onclick="closeModal(); setTimeout(() => openWithdrawModal('${targetPhone.id}', '${targetApp.id}'), 200);">记录提现</button>
                <button class="btn btn-secondary flex-1" onclick="closeModal(); setTimeout(() => openEditAppModal('${targetPhone.id}', '${targetApp.id}'), 200);">编辑软件</button>
            </div>
        </div>
    `;
    
    showModal('软件详情', html, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
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

// 渲染软件收益排行（基于余额变化）
function renderAppEarningsRanking() {
    const card = document.getElementById('app-earnings-ranking-card');
    const content = document.getElementById('app-earnings-ranking-content');
    if (!card || !content) return;

    const data = DataManager.loadData();
    
    // 收集所有软件的收益统计
    const appEarnings = [];
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            const stats = DataManager.getAppEarningsStats(app);
            if (stats.total > 0 || app.dailyEarnings) {
                appEarnings.push({
                    phoneName: phone.name,
                    appName: app.name,
                    appId: app.id,
                    phoneId: phone.id,
                    ...stats
                });
            }
        });
    });

    if (appEarnings.length === 0) {
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';

    // 按今日收益排序
    const sortedByToday = [...appEarnings].sort((a, b) => b.today - a.today).slice(0, 5);
    
    // 按7天平均收益排序
    const sortedByAvg7 = [...appEarnings].sort((a, b) => b.avg7Days - a.avg7Days).slice(0, 5);

    let html = '';

    // 今日收益排行 - 毛玻璃效果
    if (sortedByToday.some(a => a.today > 0)) {
        html += `
            <div style="margin-bottom: 20px;">
                <div style="font-size: 14px; font-weight: 700; color: #ffffff; margin-bottom: 12px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                    📅 今日收益排行
                </div>
        `;
        
        sortedByToday.forEach((app, index) => {
            if (app.today > 0) {
                const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                const rankColors = ['#fbbf24', '#94a3b8', '#b45309', '#64748b', '#64748b'];
                const borderColor = rankColors[index] || 'rgba(255,255,255,0.3)';
                html += `
                    <div style="position: relative; background: linear-gradient(135deg, rgba(17, 153, 142, 0.3) 0%, rgba(56, 239, 125, 0.3) 100%); border-radius: 12px; padding: 12px; margin-bottom: 10px; cursor: pointer; border: 1px solid ${borderColor}; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);" onclick="showAppDetailModal('${app.appId}')">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 20px; width: 32px; text-align: center; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));">${medals[index] || '•'}</span>
                            <div style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: 600; color: #ffffff; font-size: 13px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">${app.phoneName} - ${app.appName}</span>
                                    <span style="font-weight: 800; color: #38ef7d; font-size: 15px; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">¥${app.today.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
        
        html += `</div>`;
    }

    // 7天平均收益排行 - 毛玻璃效果
    if (sortedByAvg7.some(a => a.avg7Days > 0)) {
        html += `
            <div>
                <div style="font-size: 14px; font-weight: 700; color: #ffffff; margin-bottom: 12px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                    📊 7天平均收益排行
                </div>
        `;
        
        sortedByAvg7.forEach((app, index) => {
            if (app.avg7Days > 0) {
                const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                const rankColors = ['#fbbf24', '#94a3b8', '#b45309', '#64748b', '#64748b'];
                const borderColor = rankColors[index] || 'rgba(255,255,255,0.3)';
                html += `
                    <div style="position: relative; background: linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%); border-radius: 12px; padding: 12px; margin-bottom: 10px; cursor: pointer; border: 1px solid ${borderColor}; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);" onclick="showAppDetailModal('${app.appId}')">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 20px; width: 32px; text-align: center; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));">${medals[index] || '•'}</span>
                            <div style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: 600; color: #ffffff; font-size: 13px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">${app.phoneName} - ${app.appName}</span>
                                    <span style="font-weight: 800; color: #a78bfa; font-size: 15px; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">¥${app.avg7Days.toFixed(2)}/天</span>
                                </div>
                                <div style="font-size: 11px; color: rgba(255,255,255,0.85); margin-top: 4px;">
                                    7天总计: <strong style="color: #ffffff;">¥${app.last7Days.toFixed(2)}</strong> · 累计: <strong style="color: #ffffff;">¥${app.total.toFixed(2)}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
        
        html += `</div>`;
    }

    content.innerHTML = html || '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">暂无收益数据，请编辑软件余额记录收益</div>';
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

    // 星期标题 - 毛玻璃效果
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    let html = weekDays.map(day => `
        <div style="text-align: center; font-weight: 700; padding: 8px; color: rgba(255,255,255,0.9); font-size: 13px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">${day}</div>
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

        // 构建背景色 - 毛玻璃效果
        let backgroundColor = 'rgba(255,255,255,0.1)';
        let borderColor = 'rgba(255,255,255,0.2)';
        let textColor = 'rgba(255,255,255,0.9)';
        let amountColor = 'rgba(255,255,255,0.8)';

        if (hasWithdrawal && hasExpense) {
            backgroundColor = 'rgba(251, 191, 36, 0.35)'; // 黄色 - 提现和支出都有
            borderColor = 'rgba(251, 191, 36, 0.5)';
            textColor = '#ffffff';
            amountColor = '#ffffff';
        } else if (hasWithdrawal) {
            backgroundColor = 'rgba(52, 211, 153, 0.35)'; // 绿色 - 有提现
            borderColor = 'rgba(52, 211, 153, 0.5)';
            textColor = '#ffffff';
            amountColor = '#ffffff';
        } else if (hasExpense) {
            backgroundColor = 'rgba(248, 113, 113, 0.35)'; // 红色 - 有支出
            borderColor = 'rgba(248, 113, 113, 0.5)';
            textColor = '#ffffff';
            amountColor = '#ffffff';
        } else if (hasInstallment) {
            backgroundColor = 'rgba(251, 191, 36, 0.35)'; // 黄色 - 还款日
            borderColor = 'rgba(251, 191, 36, 0.5)';
            textColor = '#ffffff';
            amountColor = '#ffffff';
        }

        // 判断是否是今天
        const today = new Date().toISOString().split('T')[0];
        const isToday = dateStr === today;
        if (isToday) {
            backgroundColor = 'rgba(255,255,255,0.4)';
            borderColor = '#ffffff';
        }

        // 显示提现金额
        const displayAmount = dayData.withdrawal > 0 ? `¥${dayData.withdrawal.toFixed(0)}` : '';

        html += `
            <div style="
                aspect-ratio: 1;
                background: ${backgroundColor};
                border: 2px solid ${borderColor};
                border-radius: 10px;
                padding: 4px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 12px;
                backdrop-filter: blur(5px);
                -webkit-backdrop-filter: blur(5px);
            " onmouseover="this.style.transform='scale(1.05)'; this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.transform='scale(1)'; this.style.background='${backgroundColor}'"
               onclick="showDayDetail('${dateStr}')">
                <span style="font-weight: ${isToday ? '800' : '700'}; color: ${isToday ? '#8b5cf6' : textColor}; text-shadow: ${isToday ? '0 1px 2px rgba(255,255,255,0.5)' : '0 1px 2px rgba(0,0,0,0.1)'};">${day}</span>
                ${displayAmount ? `<span style="font-size: 10px; color: ${amountColor}; margin-top: 2px; font-weight: 600;">${displayAmount}</span>` : ''}
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
    const dayData = getDayWithdrawalData(dateStr, data);
    
    let content = `<div style="padding: 16px;">`;
    content += `<div style="font-weight: 600; margin-bottom: 12px; font-size: 16px;">${dateStr}</div>`;
    
    if (dayData.withdrawal > 0) {
        content += `<div style="margin-bottom: 8px; color: var(--success-color);">💰 提现: ¥${dayData.withdrawal.toFixed(2)}</div>`;
    }
    if (dayData.expense > 0) {
        content += `<div style="margin-bottom: 8px; color: var(--error-color);">💸 支出: ¥${dayData.expense.toFixed(2)}</div>`;
    }
    if (dayData.installment) {
        content += `<div style="margin-bottom: 8px; color: var(--warning-color);">📅 有分期还款</div>`;
    }
    
    if (dayData.withdrawal === 0 && dayData.expense === 0 && !dayData.installment) {
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

// 渲染今日需要关注的软件 - 显示当天未提现的软件及今日目标
function renderTodayApps(data) {
    const today = getCurrentDate();
    let todayApps = [];

    // 获取每日提现目标
    const dailyTarget = DataManager.calculateDailyWithdrawalTarget();
    const perAppTarget = dailyTarget ? dailyTarget.perAppTarget : 0;

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
        // 找到app所属的手机ID
        let phoneId = '';
        data.phones.forEach(phone => {
            if (phone.apps && phone.apps.find(a => a.id === app.id)) {
                phoneId = phone.id;
            }
        });
        
        // 如果找不到手机ID，尝试使用app.phoneId（如果有的话）
        if (!phoneId && app.phoneId) {
            phoneId = app.phoneId;
        }
        return `
            <div style="position: relative; background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); border-radius: 16px; padding: 16px; margin-bottom: 12px; overflow: hidden;">
                <!-- 背景装饰圆形 -->
                <div style="position: absolute; top: -20px; right: -20px; width: 60px; height: 60px; background: rgba(255,255,255,0.3); border-radius: 50%; filter: blur(15px);"></div>
                <div style="position: absolute; bottom: -15px; left: -15px; width: 50px; height: 50px; background: rgba(255,255,255,0.2); border-radius: 50%; filter: blur(12px);"></div>
                
                <!-- 毛玻璃卡片内容 -->
                <div style="position: relative; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-radius: 12px; border: 1px solid rgba(255,255,255,0.3); padding: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 8px;">
                        <span style="font-size: 14px; font-weight: 600; color: #78350f; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${app.phoneName} - ${app.name}</span>
                        ${dailyTarget && dailyTarget.totalTargetAmount > 0 ? `<span style="font-size: 12px; color: #92400e; font-weight: 600; background: rgba(255,255,255,0.3); padding: 2px 8px; border-radius: 10px; flex-shrink: 0; white-space: nowrap;">需提现: ¥${dailyTarget.perAppTarget.toFixed(2)}</span>` : ''}
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #92400e; margin-bottom: 10px;">
                        <span>余额: <strong style="color: #78350f;">¥${(app.balance || 0).toFixed(2)}</strong></span>
                        <span>累计: <strong style="color: #78350f;">¥${earned.toFixed(2)}</strong></span>
                        <span>次数: <strong style="color: #78350f;">${withdrawalCount}次</strong></span>
                    </div>
                    <div style="display: flex; gap: 8px; justify-content: flex-end; padding-top: 10px; border-top: 1px solid rgba(120, 53, 15, 0.15);">
                        ${phoneId ? `
                        <button class="btn btn-sm" onclick="editAppFromTodayFocus('${app.id}', '${phoneId}')" style="font-size: 11px; padding: 5px 14px; background: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.4); color: #78350f; border-radius: 6px;">✏️ 编辑</button>
                        <button class="btn btn-sm" onclick="withdrawAppFromTodayFocus('${app.id}', '${phoneId}')" style="font-size: 11px; padding: 5px 14px; background: rgba(17, 153, 142, 0.3); border: 1px solid rgba(17, 153, 142, 0.4); color: #78350f; border-radius: 6px;">💰 提现</button>
                        ` : '<span style="font-size: 11px; color: #92400e;">无法编辑</span>'}
                    </div>
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
                    <span class="core-label">当前余额:</span>
                    <span class="core-value">¥${(app.balance || 0).toFixed(2)}</span>
                </div>
                <div class="app-info-row">
                    <span>累计提现: ¥${earned.toFixed(2)} · 提现次数: ${totalWithdrawals}次</span>
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
            <textarea id="new-phone-names" class="form-input" rows="5" placeholder="输入手机名称，支持批量添加：
方式1：每行一个，如：
手机1
手机2
手机3

方式2：逗号分隔，如：
手机1,手机2,手机3"></textarea>
            <div class="form-hint">支持批量添加，每行一个或用逗号分隔</div>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        {
            text: '添加',
            class: 'btn-primary',
            action: () => {
                const input = document.getElementById('new-phone-names').value.trim();
                if (input) {
                    // 解析手机名称（支持换行或逗号分隔）
                    const names = input.split(/[\n,]/).map(n => n.trim()).filter(n => n);
                    let addedCount = 0;
                    names.forEach(name => {
                        DataManager.addPhone(name);
                        addedCount++;
                    });
                    renderPhones();
                    showToast(`成功添加 ${addedCount} 部手机！`);
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
            <textarea id="app-names" class="form-input" rows="5" placeholder="输入软件名称，支持批量添加：
方式1：每行一个，如：
抖音极速版
快手极速版
百度极速版

方式2：逗号分隔，如：
抖音极速版,快手极速版,百度极速版"></textarea>
            <div class="form-hint">支持批量添加，每行一个或用逗号分隔</div>
        </div>
        <div class="form-group">
            <label class="form-label">默认余额 (元)</label>
            <input type="number" id="app-balance" class="form-input" placeholder="0.00" step="0.01" value="0">
            <div class="form-hint">批量添加时所有软件的默认余额</div>
        </div>
        <div class="form-group">
            <label class="form-label">提现门槛 (元)</label>
            <input type="number" id="app-min-withdraw" class="form-input" placeholder="0.00" step="0.01" value="0">
            <div class="form-hint">达到此金额才能提现（0表示无门槛）</div>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        {
            text: '添加',
            class: 'btn-primary',
            action: () => {
                const input = document.getElementById('app-names').value.trim();
                const balance = parseFloat(document.getElementById('app-balance').value) || 0;
                const minWithdraw = parseFloat(document.getElementById('app-min-withdraw').value) || 0;

                if (input) {
                    // 解析软件名称（支持换行或逗号分隔）
                    const names = input.split(/[\n,]/).map(n => n.trim()).filter(n => n);
                    let addedCount = 0;
                    names.forEach(name => {
                        DataManager.addApp(phoneId, { name, balance, minWithdraw });
                        addedCount++;
                    });
                    renderPhones();
                    showToast(`成功添加 ${addedCount} 个软件！`);
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
            <label class="form-label">当前余额 (元)</label>
            <input type="number" id="edit-app-balance" class="form-input" value="${(app.balance || 0).toFixed(2)}" step="0.01">
            <div class="form-hint">软件账户中当前可提现的金额</div>
        </div>
        <div class="form-group">
            <label class="form-label">提现门槛 (元)</label>
            <input type="number" id="edit-app-min-withdraw" class="form-input" value="${(app.minWithdraw || 0).toFixed(2)}" step="0.01">
            <div class="form-hint">达到此金额才能提现（0表示无门槛）</div>
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
                const balance = parseFloat(document.getElementById('edit-app-balance').value) || 0;
                const minWithdraw = parseFloat(document.getElementById('edit-app-min-withdraw').value) || 0;
                const historicalWithdrawn = parseFloat(document.getElementById('edit-app-historical').value) || 0;

                if (name) {
                    const result = DataManager.editApp(phoneId, appId, {
                        name,
                        balance,
                        minWithdraw,
                        historicalWithdrawn
                    });
                    renderPhones();
                    
                    // 检查是否达到日目标
                    const phone = result.phones.find(p => p.id === phoneId);
                    const app = phone ? phone.apps.find(a => a.id === appId) : null;
                    if (app && app._todayEarnings !== undefined) {
                        if (app._dailyTargetAchieved) {
                            showToast(`🎉 恭喜！今日收益¥${app._todayEarnings.toFixed(2)}，已达到日目标¥${app._dailyTarget.toFixed(2)}！`, 'success');
                        } else if (app._dailyTarget) {
                            const remaining = app._dailyTarget - app._todayEarnings;
                            showToast(`今日收益¥${app._todayEarnings.toFixed(2)}，距离日目标¥${app._dailyTarget.toFixed(2)}还差¥${remaining.toFixed(2)}`, 'info');
                        } else {
                            showToast(`今日收益¥${app._todayEarnings.toFixed(2)}`, 'info');
                        }
                        // 清除标记
                        delete app._dailyTargetAchieved;
                        delete app._todayEarnings;
                        delete app._dailyTarget;
                        DataManager.saveData(result);
                    } else {
                        showToast('软件已更新！');
                    }
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

// 从软件赚取分析页面编辑软件
function editAppFromAnalysis(appId, phoneId) {
    event.stopPropagation();
    openEditAppModal(phoneId, appId);
}

// 从今日需要关注页面编辑软件
function editAppFromTodayFocus(appId, phoneId) {
    event.stopPropagation();
    openEditAppModal(phoneId, appId);
}

// 从软件赚取分析页面提现
function withdrawAppFromAnalysis(appId, phoneId) {
    event.stopPropagation();
    openWithdrawModal(phoneId, appId);
}

// 从今日需要关注页面提现
function withdrawAppFromTodayFocus(appId, phoneId) {
    event.stopPropagation();
    openWithdrawModal(phoneId, appId);
}

// 打开批量添加软件到所有手机的模态框
function openBatchAddAppsModal() {
    const data = DataManager.loadData();
    const phoneCount = data.phones.length;

    if (phoneCount === 0) {
        showToast('请先添加手机！');
        return;
    }

    showModal('批量添加软件到所有手机', `
        <div class="form-group">
            <label class="form-label">软件名称</label>
            <textarea id="batch-app-names" class="form-input" rows="5" placeholder="输入软件名称，支持批量添加：
方式1：每行一个，如：
抖音极速版
快手极速版
百度极速版

方式2：逗号分隔，如：
抖音极速版,快手极速版,百度极速版"></textarea>
            <div class="form-hint">支持批量添加，每行一个或用逗号分隔</div>
        </div>
        <div class="form-group">
            <label class="form-label">默认余额 (元)</label>
            <input type="number" id="batch-app-balance" class="form-input" placeholder="0.00" step="0.01" value="0">
            <div class="form-hint">批量添加时所有软件的默认余额</div>
        </div>
        <div class="form-group">
            <label class="form-label">提现门槛 (元)</label>
            <input type="number" id="batch-app-min-withdraw" class="form-input" placeholder="0.00" step="0.01" value="0">
            <div class="form-hint">批量添加时所有软件的默认提现门槛</div>
        </div>
        <div class="form-group">
            <div class="form-hint" style="background: var(--bg-cream); padding: 12px; border-radius: 8px;">
                <strong>提示：</strong>将为 <strong>${phoneCount}</strong> 部手机各添加这些软件
            </div>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        {
            text: '添加',
            class: 'btn-primary',
            action: () => {
                const input = document.getElementById('batch-app-names').value.trim();
                const balance = parseFloat(document.getElementById('batch-app-balance').value) || 0;
                const minWithdraw = parseFloat(document.getElementById('batch-app-min-withdraw').value) || 0;

                if (input) {
                    // 重新获取最新数据
                    const currentData = DataManager.loadData();
                    const currentPhoneCount = currentData.phones.length;
                    
                    // 解析软件名称（支持换行或逗号分隔）
                    const names = input.split(/[\n,]/).map(n => n.trim()).filter(n => n);
                    let totalAddedCount = 0;

                    // 为每部手机添加软件
                    currentData.phones.forEach(phone => {
                        names.forEach(name => {
                            DataManager.addApp(phone.id, { name, balance, minWithdraw });
                            totalAddedCount++;
                        });
                    });

                    renderPhones();
                    showToast(`成功为 ${currentPhoneCount} 部手机各添加 ${names.length} 个软件，共 ${totalAddedCount} 个！`);
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
        const statusColor = withdrawalCount > 0 ? 'rgba(52, 211, 153, 0.4)' : 'rgba(251, 191, 36, 0.4)';
        const statusBorder = withdrawalCount > 0 ? 'rgba(52, 211, 153, 0.6)' : 'rgba(251, 191, 36, 0.6)';
        const statusText = withdrawalCount > 0 ? '#34d399' : '#fbbf24';
        
        return `
            <div style="position: relative; background: rgba(30, 27, 75, 0.6); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border-radius: 12px; padding: 14px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.3);" data-app-id="${app.id}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="font-weight: 700; color: #ffffff; font-size: 14px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${app.phoneName} - ${app.name}</span>
                    <span style="font-size: 11px; padding: 4px 12px; border-radius: 12px; background: ${withdrawalCount > 0 ? 'rgba(34, 197, 94, 0.9)' : 'rgba(251, 191, 36, 0.9)'}; border: 1px solid rgba(255,255,255,0.5); color: #1e1b4b; font-weight: 700;">
                        ${withdrawalCount > 0 ? '有记录' : '新软件'}
                    </span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <div style="background: rgba(59, 130, 246, 0.9); border-radius: 8px; padding: 10px; text-align: center; border: 1px solid rgba(255,255,255,0.5);">
                        <span style="font-size: 10px; color: rgba(255,255,255,0.95); display: block; margin-bottom: 4px; font-weight: 600;">当前余额</span>
                        <span style="font-size: 15px; font-weight: 800; color: #ffffff;">¥${(app.balance || 0).toFixed(2)}</span>
                    </div>
                    <div style="background: rgba(34, 197, 94, 0.9); border-radius: 8px; padding: 10px; text-align: center; border: 1px solid rgba(255,255,255,0.5);">
                        <span style="font-size: 10px; color: rgba(255,255,255,0.95); display: block; margin-bottom: 4px; font-weight: 600;">累计提现</span>
                        <span style="font-size: 15px; font-weight: 800; color: #ffffff;">¥${withdrawn.toFixed(2)}</span>
                    </div>
                    <div style="background: rgba(139, 92, 246, 0.9); border-radius: 8px; padding: 10px; text-align: center; border: 1px solid rgba(255,255,255,0.5);">
                        <span style="font-size: 10px; color: rgba(255,255,255,0.95); display: block; margin-bottom: 4px; font-weight: 600;">提现次数</span>
                        <span style="font-size: 15px; font-weight: 800; color: #ffffff;">${withdrawalCount}次</span>
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

    // 计算待支出余额（总提现金额 - 总支出金额 - 已还分期）
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

    // 已还分期总额
    const totalRepaid = data.installments ? data.installments.reduce((sum, inst) => sum + (inst.paidAmount || 0), 0) : 0;

    // 待支出金额 = 总提现金额 - 总支出金额 - 已还分期
    const pendingExpenseBalance = totalWithdrawnAmount - totalExpenses - totalRepaid;
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

// 显示系统介绍
function showSystemIntroduction() {
    const sections = [
        {
            id: 'overview',
            title: '📋 系统概述',
            icon: '📋',
            content: `
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">系统定位</div>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
                        本系统是一个综合性的个人财务管理工具，专门设计用于管理通过赚钱软件获得的收入，
                        同时整合个人真实财产（工资、支出等），实现资金的统一管理和分析。
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">核心设计理念</div>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
                        <div style="margin-bottom: 4px;">• <b>分离管理</b>：软件收入与个人财产分开记录</div>
                        <div style="margin-bottom: 4px;">• <b>灵活流转</b>：支持软件收入提现到个人钱包</div>
                        <div style="margin-bottom: 4px;">• <b>智能分析</b>：自动计算收益、目标、缺口等</div>
                        <div>• <b>动态目标</b>：根据历史表现和还款计划智能调整每日目标</div>
                    </div>
                </div>
                <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); padding: 12px; border-radius: 8px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">📍 功能位置</div>
                    <div style="font-size: 12px; line-height: 1.8; color: var(--text-secondary);">
                        <div>• <b>仪表盘</b>：底部导航栏第1个图标 📊</div>
                        <div>• <b>手机管理</b>：底部导航栏第2个图标 📱</div>
                        <div>• <b>资产管理</b>：底部导航栏第4个图标 💼</div>
                        <div>• <b>游戏管理</b>：底部导航栏第5个图标 🎮</div>
                        <div>• <b>设置</b>：底部导航栏第6个图标 ⚙️</div>
                    </div>
                </div>
            `
        },
        {
            id: 'phones',
            title: '📱 手机管理逻辑',
            icon: '📱',
            content: `
                <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">📍 功能位置</div>
                    <div style="font-size: 12px; line-height: 1.8; color: var(--text-secondary);">
                        <b>手机管理页面</b>：底部导航栏第2个图标 📱<br>
                        或点击仪表盘中的"管理手机"按钮
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">数据结构</div>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
                        手机 → 软件 → 收益记录<br>
                        每台手机可以安装多个赚钱软件，每个软件独立记录余额和收益历史。
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">收益计算逻辑</div>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
                        <div style="background: var(--bg-cream); padding: 8px; border-radius: 6px; margin-bottom: 8px;">
                            <b>总赚取</b> = 已提现金额 + 历史提现 + 当前余额
                        </div>
                        <div style="background: var(--bg-cream); padding: 8px; border-radius: 6px;">
                            <b>每日收益</b> = 当日余额增加额（自动计算）
                        </div>
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">快速操作</div>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
                        • 点击手机名称展开/收起软件列表<br>
                        • 点击"+"按钮快速添加软件<br>
                        • 点击软件余额可直接编辑<br>
                        • 达标日历显示每日目标完成情况
                    </div>
                </div>
            `
        },
        {
            id: 'daily-target',
            title: '🎯 每日目标逻辑',
            icon: '🎯',
            content: `
                <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">📍 功能位置</div>
                    <div style="font-size: 12px; line-height: 1.8; color: var(--text-secondary);">
                        <b>每日目标追踪</b>：仪表盘页面 - 收益目标卡片下方<br>
                        或点击"查看详情"按钮查看完整记录
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">目标计算公式</div>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
                        <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                            <b>每日目标</b> = max(还款所需, 动态激励目标, 5元保底)
                        </div>
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">动态系数规则</div>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
                        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                            <tr style="background: var(--bg-cream);">
                                <td style="padding: 6px; border: 1px solid var(--border-color);">🌟 优秀</td>
                                <td style="padding: 6px; border: 1px solid var(--border-color);">近7天 ≥ 历史平均×1.2</td>
                                <td style="padding: 6px; border: 1px solid var(--border-color);">保持高水平</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px; border: 1px solid var(--border-color);">💪 正常</td>
                                <td style="padding: 6px; border: 1px solid var(--border-color);">历史平均 ≤ 近7天 < 历史平均×1.2</td>
                                <td style="padding: 6px; border: 1px solid var(--border-color);">激励提升10%</td>
                            </tr>
                            <tr style="background: var(--bg-cream);">
                                <td style="padding: 6px; border: 1px solid var(--border-color);">📈 下滑</td>
                                <td style="padding: 6px; border: 1px solid var(--border-color);">历史平均×0.5 ≤ 近7天 < 历史平均</td>
                                <td style="padding: 6px; border: 1px solid var(--border-color);">鼓励恢复90%</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px; border: 1px solid var(--border-color);">💪 加油</td>
                                <td style="padding: 6px; border: 1px solid var(--border-color);">近7天 < 历史平均×0.5</td>
                                <td style="padding: 6px; border: 1px solid var(--border-color);">建立信心70%</td>
                            </tr>
                        </table>
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">缺口抵扣机制</div>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
                        超额的收益会自动累积，用于抵扣未来的缺口。<br>
                        例如：第1天超额5元，第2天缺口3元，则抵扣后实际缺口为0。
                    </div>
                </div>
            `
        },
        {
            id: 'goal-distribution',
            title: '📊 软件目标分配逻辑',
            icon: '📊',
            content: `
                <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">📍 功能位置</div>
                    <div style="font-size: 12px; line-height: 1.8; color: var(--text-secondary);">
                        <b>收益目标弹窗</b>：仪表盘页面 - 点击"🎯 收益目标"卡片<br>
                        或点击"📊 详情"按钮查看各软件目标分配
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">排名机制</div>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
                        软件按<b>今年实际收益</b>从低到高排名（收益低的排名靠前）
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">表现系数</div>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
                        <div style="background: rgba(34, 197, 94, 0.1); padding: 8px; border-radius: 6px; margin-bottom: 8px;">
                            <b>后33%（收益低）</b>：系数 0.5 ~ 0.8 → 降低目标
                        </div>
                        <div style="background: rgba(59, 130, 246, 0.1); padding: 8px; border-radius: 6px; margin-bottom: 8px;">
                            <b>中间34%</b>：系数 0.9 ~ 1.1 → 接近基础目标
                        </div>
                        <div style="background: rgba(245, 158, 11, 0.1); padding: 8px; border-radius: 6px;">
                            <b>前33%（收益高）</b>：系数 1.2 ~ 1.5 → 提高目标
                        </div>
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">日目标计算</div>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
                        <div style="background: var(--bg-cream); padding: 8px; border-radius: 6px;">
                            软件日目标 = (总目标 × 软件表现系数) / 软件数量 / 估算天数
                        </div>
                    </div>
                </div>
            `
        },
        {
            id: 'personal-finance',
            title: '💎 个人财务逻辑',
            icon: '💎',
            content: `
                <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">📍 功能位置</div>
                    <div style="font-size: 12px; line-height: 1.8; color: var(--text-secondary);">
                        <b>个人财务概览</b>：仪表盘页面 - 第2个卡片 💎<br>
                        包含：记收入、记支出、提现功能按钮
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">资金池设计</div>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
                        <div style="margin-bottom: 8px;"><b>软件资金池</b>：所有赚钱软件的余额总和</div>
                        <div style="margin-bottom: 8px;"><b>个人资金池</b>：工资、奖金等真实收入</div>
                        <div><b>固定资产</b>：已购买的资产价值</div>
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">资金流转</div>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
                        <div style="background: rgba(34, 197, 94, 0.1); padding: 8px; border-radius: 6px; margin-bottom: 8px;">
                            <b>提现</b>：软件余额 → 个人钱包
                        </div>
                        <div style="background: rgba(239, 68, 68, 0.1); padding: 8px; border-radius: 6px; margin-bottom: 8px;">
                            <b>支出</b>：从个人钱包扣除
                        </div>
                        <div style="background: rgba(59, 130, 246, 0.1); padding: 8px; border-radius: 6px;">
                            <b>收入</b>：工资等进入个人钱包
                        </div>
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">总资产计算</div>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
                        <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); padding: 12px; border-radius: 8px;">
                            <b>总资产</b> = 个人钱包 + 软件余额 + 资产价值
                        </div>
                    </div>
                </div>
            `
        },
        {
            id: 'assets',
            title: '💼 资产管理逻辑',
            icon: '💼',
            content: `
                <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">📍 功能位置</div>
                    <div style="font-size: 12px; line-height: 1.8; color: var(--text-secondary);">
                        <b>资产管理页面</b>：底部导航栏第4个图标 💼<br>
                        包含：资产概览、资产清单、分类统计
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">自动分类机制</div>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
                        系统根据物品名称中的关键词自动识别分类：<br>
                        • 输入"iPhone" → 电子产品<br>
                        • 输入"猫粮" → 宠物用品<br>
                        • 输入"跑步机" → 运动户外<br>
                        支持100+个关键词识别
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">每日成本计算</div>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
                        <div style="background: var(--bg-cream); padding: 8px; border-radius: 6px;">
                            <b>每日成本</b> = 购买价格 / 持有天数<br>
                            持有天数 = 今天 - 购买日期
                        </div>
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">分类统计</div>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
                        自动按分类汇总：物品数量、总价值、每日成本
                    </div>
                </div>
            `
        },
        {
            id: 'games',
            title: '🎮 游戏管理逻辑',
            icon: '🎮',
            content: `
                <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">📍 功能位置</div>
                    <div style="font-size: 12px; line-height: 1.8; color: var(--text-secondary);">
                        <b>游戏管理页面</b>：底部导航栏第5个图标 🎮<br>
                        包含：游戏抽签、游戏列表、抽签历史
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">智能抽签算法</div>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
                        综合考虑以下因素计算权重：<br>
                        • <b>进度系数</b>：快完成的游戏权重更高<br>
                        • <b>冷落系数</b>：长时间未抽到的权重增加<br>
                        • <b>连续系数</b>：昨天玩过的降低权重<br>
                        • <b>新游戏优先</b>：daysPlayed=0的游戏10倍权重
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">历史记录规则</div>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
                        • 只有标记完成的记录才保存<br>
                        • 未标记的记录第二天自动清除<br>
                        • 7天完成的记录1天后自动删除
                    </div>
                </div>
            `
        },
        {
            id: 'data-flow',
            title: '🔄 数据流转图',
            icon: '🔄',
            content: `
                <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-color);">📍 功能位置</div>
                    <div style="font-size: 12px; line-height: 1.8; color: var(--text-secondary);">
                        <b>系统介绍</b>：设置页面 - 点击"📚 查看系统介绍"按钮<br>
                        本页面展示了系统各功能的逻辑和位置
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 12px; color: var(--primary-color);">完整数据流程</div>
                    <div style="font-size: 12px; line-height: 2; color: var(--text-secondary);">
                        <div style="background: rgba(102, 126, 234, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                            <b>1. 记录收益</b><br>
                            手机软件 → 编辑余额 → 系统自动计算日收益
                        </div>
                        <div style="background: rgba(245, 158, 11, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                            <b>2. 计算目标</b><br>
                            历史数据 + 还款计划 → 智能每日目标
                        </div>
                        <div style="background: rgba(34, 197, 94, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                            <b>3. 资金流转</b><br>
                            软件提现 → 个人钱包 → 记录支出
                        </div>
                        <div style="background: rgba(139, 92, 246, 0.1); padding: 12px; border-radius: 8px;">
                            <b>4. 统计分析</b><br>
                            所有数据汇总 → 仪表盘展示
                        </div>
                    </div>
                </div>
            `
        }
    ];
    
    let currentSection = 0;
    
    function renderContent() {
        const section = sections[currentSection];
        return `
            <div style="max-height: 70vh; overflow-y: auto; padding-right: 8px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color);">
                    <span style="font-size: 32px;">${section.icon}</span>
                    <div>
                        <div style="font-size: 18px; font-weight: 700; color: var(--primary-color);">${section.title}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">${currentSection + 1} / ${sections.length}</div>
                    </div>
                </div>
                <div style="font-size: 14px; line-height: 1.8;">
                    ${section.content}
                </div>
                <div style="display: flex; gap: 8px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-color);">
                    <button class="btn btn-secondary" style="flex: 1;" onclick="changeSection(-1)" ${currentSection === 0 ? 'disabled' : ''}>← 上一页</button>
                    <button class="btn btn-secondary" style="flex: 1;" onclick="changeSection(1)" ${currentSection === sections.length - 1 ? 'disabled' : ''}>下一页 →</button>
                </div>
                <div style="display: flex; justify-content: center; gap: 6px; margin-top: 12px;">
                    ${sections.map((_, idx) => `
                        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${idx === currentSection ? 'var(--primary-color)' : 'var(--border-color)'}; cursor: pointer;" onclick="goToSection(${idx})"></div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    window.changeSection = function(delta) {
        currentSection += delta;
        if (currentSection < 0) currentSection = 0;
        if (currentSection >= sections.length) currentSection = sections.length - 1;
        updateModalContent();
    };
    
    window.goToSection = function(index) {
        currentSection = index;
        updateModalContent();
    };
    
    function updateModalContent() {
        const modalBody = document.querySelector('#modal .modal-body');
        if (modalBody) {
            modalBody.innerHTML = renderContent();
        }
    }
    
    showModal(
        '📚 系统功能介绍',
        renderContent(),
        [
            {
                text: '关闭',
                class: 'btn-secondary',
                action: () => {
                    delete window.changeSection;
                    delete window.goToSection;
                    closeModal();
                }
            }
        ]
    );
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
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    
    console.log('renderGameList 被调用，游戏数量:', games.length);
    
    if (games.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无游戏，请添加游戏</div>';
        return;
    }
    
    let html = '';
    games.forEach(game => {
        console.log('渲染游戏:', game.name, 'ID:', game.id);
        html += `
            <div class="game-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 8px;">
                <span class="game-name" style="flex: 1; font-weight: 500;">${game.name}</span>
                <div style="display: flex; gap: 6px;">
                    <button class="btn btn-sm" onclick="editGameName('${game.id}', '${game.name}')" style="font-size: 11px; padding: 4px 10px;">修改</button>
                    <button class="btn btn-error btn-sm" onclick="deleteGame('${game.id}')" style="font-size: 11px; padding: 4px 10px;">删除</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    console.log('游戏列表 HTML 已生成');
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

// 修改游戏名称
function editGameName(gameId, currentName) {
    const newName = prompt('请输入新的游戏名称：', currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
        DataManager.updateGameName(currentGameDrawPhoneId, gameId, newName.trim());
        renderGameList();
        showToast('游戏名称修改成功', 'success');
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
                <div class="game-draw-order" style="background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);">${index + 1}</div>
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
                <div class="popup-game-order" style="background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; box-shadow: 0 2px 6px rgba(139, 92, 246, 0.3);">${index + 1}</div>
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
    popup.style.display = 'none';
    popup.classList.remove('show');
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

// 今天的抽签结果（内存中存储，不保存到localStorage）
let todayDrawResult = null;

// ==================== 资产管理页面 ====================

// 渲染资产管理页面
function renderAssetsPage() {
    // 更新日期
    const now = new Date();
    const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    const assetsDateEl = document.getElementById('assets-current-date');
    if (assetsDateEl) {
        assetsDateEl.textContent = dateStr;
    }
    
    // 渲染资产统计
    renderAssetsStats();
    
    // 渲染资产列表
    renderAssetsList();
    
    // 渲染分类统计
    renderAssetsCategory();
}

// 渲染资产统计
function renderAssetsStats() {
    const container = document.getElementById('assets-stats-content');
    if (!container) return;
    
    const stats = DataManager.calculateAssetStats();
    
    if (stats.totalAssets === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 30px;">
                <div style="font-size: 48px; margin-bottom: 16px;">💼</div>
                <div style="font-size: 16px; margin-bottom: 8px;">暂无资产记录</div>
                <div style="font-size: 13px; color: var(--text-secondary);">
                    点击"添加资产"按钮记录您的物品
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 12px; padding: 16px; color: white; text-align: center;">
                <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">总资产价值</div>
                <div style="font-size: 24px; font-weight: 700;">¥${stats.totalValue.toFixed(2)}</div>
            </div>
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 12px; padding: 16px; color: white; text-align: center;">
                <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">资产数量</div>
                <div style="font-size: 24px; font-weight: 700;">${stats.totalAssets}件</div>
            </div>
        </div>
        <div style="background: var(--bg-cream); border-radius: 12px; padding: 16px; margin-top: 12px; text-align: center;">
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">平均每日成本</div>
            <div style="font-size: 20px; font-weight: 700; color: var(--primary-color);">¥${stats.totalDailyCost.toFixed(2)}</div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                （基于持有天数计算）
            </div>
        </div>
    `;
}

// 渲染资产列表
function renderAssetsList() {
    const container = document.getElementById('assets-list-content');
    if (!container) return;
    
    const stats = DataManager.calculateAssetStats();
    const categories = DataManager.getAssetCategories();
    
    if (stats.assets.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = stats.assets.map(asset => {
        const category = categories.find(c => c.id === asset.category) || { name: '其他', icon: '📦' };
        return `
            <div style="background: var(--bg-secondary); border-radius: 10px; padding: 12px; margin-bottom: 10px; border-left: 4px solid var(--primary-color);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 20px;">${category.icon}</span>
                        <div>
                            <div style="font-weight: 600; font-size: 14px;">${asset.name}</div>
                            <div style="font-size: 11px; color: var(--text-secondary);">${category.name}</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 700; font-size: 16px; color: var(--primary-color);">¥${asset.price.toFixed(2)}</div>
                        <div style="font-size: 10px; color: var(--text-secondary);">¥${asset.dailyCost.toFixed(2)}/天</div>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-secondary);">
                    <span>购买于 ${asset.purchaseDate} · 已持有${asset.daysOwned}天</span>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-sm btn-secondary" onclick="editAsset('${asset.id}')">编辑</button>
                        <button class="btn btn-sm" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;" onclick="deleteAsset('${asset.id}')">删除</button>
                    </div>
                </div>
                ${asset.note ? `<div style="font-size: 11px; color: var(--text-secondary); margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border-color);">${asset.note}</div>` : ''}
            </div>
        `;
    }).join('');
}

// 渲染分类统计
function renderAssetsCategory() {
    const container = document.getElementById('assets-category-content');
    if (!container) return;
    
    const stats = DataManager.calculateAssetStats();
    
    if (stats.categoryStats.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无分类数据</div>';
        return;
    }
    
    container.innerHTML = stats.categoryStats.map(cat => `
        <div style="display: flex; align-items: center; padding: 12px; background: var(--bg-secondary); border-radius: 10px; margin-bottom: 8px;">
            <span style="font-size: 24px; margin-right: 12px;">${cat.icon}</span>
            <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                    <span style="font-weight: 600;">${cat.name}</span>
                    <span style="font-weight: 700; color: var(--primary-color);">¥${cat.totalValue.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-secondary);">
                    <span>${cat.count}件物品</span>
                    <span>¥${cat.dailyCost.toFixed(2)}/天</span>
                </div>
            </div>
        </div>
    `).join('');
}

// 打开添加资产弹窗
function openAddAssetModal() {
    const categories = DataManager.getAssetCategories();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    showModal(
        '➕ 添加资产',
        `
            <div class="form-group">
                <label class="form-label">物品名称</label>
                <input type="text" id="asset-name" class="form-input" placeholder="例如：iPhone 15 Pro">
            </div>
            <div class="form-group">
                <label class="form-label">购买价格 (元)</label>
                <input type="number" id="asset-price" class="form-input" placeholder="输入价格" step="0.01">
            </div>
            <div class="form-group">
                <label class="form-label">购买日期</label>
                <input type="text" id="asset-date" class="form-input" value="${todayStr}" placeholder="例如：2026-02-28" maxlength="10">
                <div class="form-hint">格式：YYYY-MM-DD</div>
            </div>
            <div class="form-group">
                <label class="form-label">分类</label>
                <select id="asset-category" class="form-input">
                    <option value="">自动识别</option>
                    ${categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">备注 (可选)</label>
                <input type="text" id="asset-note" class="form-input" placeholder="例如：工作用途、生日礼物等">
            </div>
        `,
        [
            {
                text: '取消',
                class: 'btn-secondary',
                action: closeModal
            },
            {
                text: '添加',
                class: 'btn-primary',
                action: () => {
                    const name = document.getElementById('asset-name').value.trim();
                    const price = parseFloat(document.getElementById('asset-price').value);
                    const date = document.getElementById('asset-date').value;
                    const category = document.getElementById('asset-category').value;
                    const note = document.getElementById('asset-note').value.trim();
                    
                    if (!name) {
                        showToast('请输入物品名称', 'error');
                        return;
                    }
                    if (!price || price <= 0) {
                        showToast('请输入有效的价格', 'error');
                        return;
                    }
                    if (!date) {
                        showToast('请输入购买日期', 'error');
                        return;
                    }
                    // 验证日期格式
                    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                    if (!dateRegex.test(date)) {
                        showToast('日期格式不正确，请使用 YYYY-MM-DD 格式', 'error');
                        return;
                    }
                    
                    DataManager.addAsset({
                        name,
                        price,
                        purchaseDate: date,
                        category,
                        note
                    });
                    
                    showToast('资产添加成功！');
                    renderAssetsPage();
                    closeModal();
                }
            }
        ]
    );
}

// 编辑资产
function editAsset(assetId) {
    const assets = DataManager.getAssets();
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    
    const categories = DataManager.getAssetCategories();
    
    showModal(
        '✏️ 编辑资产',
        `
            <div class="form-group">
                <label class="form-label">物品名称</label>
                <input type="text" id="asset-name" class="form-input" value="${asset.name}">
            </div>
            <div class="form-group">
                <label class="form-label">购买价格 (元)</label>
                <input type="number" id="asset-price" class="form-input" value="${asset.price.toFixed(2)}" step="0.01">
            </div>
            <div class="form-group">
                <label class="form-label">购买日期</label>
                <input type="text" id="asset-date" class="form-input" value="${asset.purchaseDate}" placeholder="例如：2026-02-28" maxlength="10">
                <div class="form-hint">格式：YYYY-MM-DD</div>
            </div>
            <div class="form-group">
                <label class="form-label">分类</label>
                <select id="asset-category" class="form-input">
                    <option value="">自动识别</option>
                    ${categories.map(c => `<option value="${c.id}" ${asset.category === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">备注 (可选)</label>
                <input type="text" id="asset-note" class="form-input" value="${asset.note || ''}">
            </div>
        `,
        [
            {
                text: '取消',
                class: 'btn-secondary',
                action: closeModal
            },
            {
                text: '保存',
                class: 'btn-primary',
                action: () => {
                    const name = document.getElementById('asset-name').value.trim();
                    const price = parseFloat(document.getElementById('asset-price').value);
                    const date = document.getElementById('asset-date').value;
                    const category = document.getElementById('asset-category').value;
                    const note = document.getElementById('asset-note').value.trim();
                    
                    if (!name) {
                        showToast('请输入物品名称', 'error');
                        return;
                    }
                    if (!price || price <= 0) {
                        showToast('请输入有效的价格', 'error');
                        return;
                    }
                    if (!date) {
                        showToast('请输入购买日期', 'error');
                        return;
                    }
                    // 验证日期格式
                    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                    if (!dateRegex.test(date)) {
                        showToast('日期格式不正确，请使用 YYYY-MM-DD 格式', 'error');
                        return;
                    }
                    
                    DataManager.editAsset(assetId, {
                        name,
                        price,
                        purchaseDate: date,
                        category,
                        note
                    });
                    
                    showToast('资产更新成功！');
                    renderAssetsPage();
                    closeModal();
                }
            }
        ]
    );
}

// 删除资产
function deleteAsset(assetId) {
    if (!confirm('确定要删除这个资产吗？')) return;
    
    DataManager.deleteAsset(assetId);
    showToast('资产已删除');
    renderAssetsPage();
}

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
    
    let html = '';
    data.phones.forEach(phone => {
        html += `<option value="${phone.id}">${phone.name}</option>`;
    });
    
    select.innerHTML = html;
    
    // 如果没有选中任何手机，默认选中第一个
    if (!currentGamePhoneId && data.phones.length > 0) {
        currentGamePhoneId = data.phones[0].id;
    }
    
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
    
    // 清理旧的抽签历史
    DataManager.cleanupGameDrawHistory();
    
    // 检查今天是否已经抽签（使用内存变量）
    const today = getCurrentDate();
    
    if (todayDrawResult && todayDrawResult._drawDate === today && todayDrawResult._phoneId === currentGamePhoneId) {
        // 今天已经抽签过了，显示抽签结果
        showTodayDrawResult(todayDrawResult);
    } else {
        // 今天还没抽签，显示抽签按钮
        container.innerHTML = `
            <div style="font-size: 18px; margin-bottom: 16px;">点击下方按钮抽签决定今天玩哪个游戏</div>
            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                <button class="btn" onclick="drawTodayGame()" style="background: white; color: #11998e; font-weight: bold; font-size: 16px;">🎮 本机抽签</button>
                <button class="btn" onclick="showCrossPhoneDrawModal()" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; font-weight: bold; font-size: 16px;">🎲 跨手机抽签</button>
            </div>
        `;
    }
}

// 渲染游戏统计
function renderGameStats() {
    const container = document.getElementById('phone-game-stats');
    if (!container) return;
    
    if (!currentGamePhoneId) {
        container.innerHTML = '<div class="empty-state">请先选择手机</div>';
        return;
    }
    
    // 获取当前手机的游戏统计
    const stat = DataManager.getGameStats(currentGamePhoneId);
    const data = DataManager.loadData();
    const phone = data.phones.find(p => p.id === currentGamePhoneId);
    const phoneName = phone ? phone.name : '未知手机';
    
    container.innerHTML = `
        <div style="margin-bottom: 16px; padding: 12px; background: var(--card-bg); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="font-weight: 600; margin-bottom: 12px; color: var(--text-primary);">${phoneName}</div>
            <div class="stats-row">
                <div class="stat-card" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">
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
    `;
}

// 渲染游戏列表
function renderGamesList() {
    const games = DataManager.getDownloadedGames(currentGamePhoneId);
    const container = document.getElementById('games-list');
    
    if (games.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无游戏，请添加新游戏</div>';
        return;
    }
    
    // 检查是否有可删除的游戏
    const canDeleteGames = games.filter(g => g.canDelete);
    
    let html = '';
    
    // 如果有可删除的游戏，显示批量删除按钮
    if (canDeleteGames.length > 0) {
        html += `
            <div style="margin-bottom: 16px; padding: 12px; background: rgba(245, 158, 11, 0.1); border-radius: 8px; border-left: 3px solid #f59e0b;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 14px; font-weight: 600; color: #d97706;">🗑️ 有 ${canDeleteGames.length} 个游戏可删除</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">已达到目标天数，可以删除了</div>
                    </div>
                    <button class="btn btn-error btn-sm" onclick="deleteAllCanDeleteGames()">一键删除</button>
                </div>
            </div>
        `;
    }
    
    html += games.map(game => {
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
            <div class="game-item" style="padding: 16px; border-bottom: 1px solid var(--border-color); background: var(--bg-secondary); border-radius: 12px; margin-bottom: 12px;">
                <!-- 第一行：游戏名称和状态 -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span class="game-name" style="font-weight: 600; font-size: 16px; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; margin-right: 12px;" onclick="editDownloadedGameName('${game.id}', '${game.name}')" title="点击修改名称">${game.name}</span>
                    <span style="color: ${statusColor}; font-weight: 600; font-size: 13px; white-space: nowrap; background: ${statusColor}15; padding: 4px 10px; border-radius: 20px;">${statusText}</span>
                </div>
                
                <!-- 第二行：进度条 -->
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 11px; color: var(--text-secondary);">下载于 ${game.downloadDate}</span>
                        <span style="font-size: 13px; font-weight: 700; color: ${statusColor};">${Math.round(progressPercent)}%</span>
                    </div>
                    <div style="height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden;">
                        <div style="width: ${progressPercent}%; height: 100%; background: ${statusColor}; border-radius: 3px; transition: width 0.3s ease;"></div>
                    </div>
                </div>
                
                <!-- 第三行：操作按钮 -->
                ${game.canDelete ? `
                    <div style="text-align: right;">
                        <button class="btn btn-error btn-sm" onclick="deleteDownloadedGame('${game.id}')" style="font-size: 11px; padding: 6px 16px;">🗑️ 删除游戏</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// 修改下载的游戏名称
function editDownloadedGameName(gameId, currentName) {
    const newName = prompt('请输入新的游戏名称：', currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
        DataManager.updateDownloadedGameName(gameId, newName.trim());
        renderGamesList();
        showToast('游戏名称修改成功', 'success');
    }
}

// 渲染抽签历史（只显示今天的记录）
function renderGameDrawHistoryList() {
    // 直接读取 localStorage
    const historyStr = localStorage.getItem('moneyApp_gameDrawHistory');
    let history = historyStr ? JSON.parse(historyStr) : [];
    const container = document.getElementById('game-draw-history');
    
    const today = getCurrentDate();
    
    // 只显示当前选中手机且是今天的记录
    if (currentGamePhoneId) {
        history = history.filter(h => h.phoneId === currentGamePhoneId && h.date === today);
    } else {
        history = history.filter(h => h.date === today);
    }
    
    if (history.length === 0) {
        container.innerHTML = '<div class="empty-state">今天还没有抽签记录</div>';
        return;
    }
    
    container.innerHTML = history.map((record) => {
        const isGameCompleted = record.daysPlayed >= (record.targetDays || 7);
        const isTodayCompleted = record.completedToday === record.date;
        
        return `
        <div class="draw-history-item ${isTodayCompleted ? 'completed-today' : ''}" style="padding: 12px; border-bottom: 1px solid var(--border-color); ${isTodayCompleted ? 'background: rgba(52, 211, 153, 0.1);' : ''}">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 500;">${record.date} <span style="font-size: 11px; background: var(--primary-color); color: white; padding: 2px 6px; border-radius: 10px;">今天</span></div>
                    <div style="font-size: 14px; color: var(--text-secondary); margin-top: 4px;">
                        🎮 ${record.gameName}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 14px; color: ${isGameCompleted ? 'var(--success-color)' : 'var(--primary-color)'}; font-weight: 600;">
                        ${isGameCompleted ? '✅ 游戏已完成' : `${record.daysPlayed}/${record.targetDays || 7}天`}
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary);">
                        ${isGameCompleted ? '' : `剩余${record.remainingDays}天`}
                    </div>
                    ${!isGameCompleted ? `
                    <button class="btn btn-sm ${isTodayCompleted ? 'btn-secondary' : 'btn-success'}" 
                            onclick="completeDrawHistoryItem('${record.date}', '${record.gameId}')" 
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
function completeDrawHistoryItem(date, gameId) {
    const historyStr = localStorage.getItem('moneyApp_gameDrawHistory');
    const history = historyStr ? JSON.parse(historyStr) : [];
    
    // 根据日期和游戏ID查找记录
    const recordIndex = history.findIndex(h => h.date === date && h.gameId === gameId);
    
    if (recordIndex >= 0) {
        const record = history[recordIndex];
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
        const games = DataManager.getDownloadedGames(currentGamePhoneId);
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
    
    // 检查是否之前删除过这个游戏
    const deletedGame = DataManager.checkIfGameWasDeleted(gameName, currentGamePhoneId);
    
    if (deletedGame) {
        // 之前删除过，显示提示
        const confirmAdd = confirm(`⚠️ 提示\n\n游戏 "${gameName}" 之前已被删除（删除日期：${deletedGame.deleteDate}）。\n\n重新添加后只需游玩3天即可删除（首次添加需7天）。\n\n是否继续添加？`);
        if (!confirmAdd) {
            return;
        }
    }
    
    // 使用当前选中的手机ID
    const game = DataManager.addDownloadedGame(gameName, currentGamePhoneId);
    nameInput.value = '';
    
    if (game.isRedownload) {
        showToast('游戏重新添加成功！只需游玩3天即可删除', 'success');
    } else {
        showToast('游戏添加成功！需游玩7天才能删除', 'success');
    }
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

// 显示已删除游戏记录弹窗
function showDeletedGamesModal() {
    const deletedGames = DataManager.getDeletedGames();
    
    if (deletedGames.length === 0) {
        showModal('已删除游戏记录', '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">暂无已删除的游戏记录</div>', [{ text: '关闭', class: 'btn-secondary', action: closeModal }]);
        return;
    }
    
    // 按删除日期倒序排列
    const sortedGames = deletedGames.sort((a, b) => new Date(b.deleteDate) - new Date(a.deleteDate));
    
    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    html += '<div style="margin-bottom: 16px; padding: 12px; background: var(--bg-secondary); border-radius: 8px; font-size: 13px; color: var(--text-secondary);">';
    html += `共删除 ${deletedGames.length} 个游戏，重新添加后只需游玩3天即可删除`;
    html += '</div>';
    
    html += sortedGames.map(game => {
        const phone = DataManager.loadData().phones.find(p => p.id === game.phoneId);
        const phoneName = phone ? phone.name : '未知手机';
        
        return `
            <div style="padding: 12px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 500; font-size: 14px;">${game.name}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                        ${phoneName} | 删除日期: ${game.deleteDate}
                    </div>
                </div>
                <button class="btn btn-sm btn-primary" onclick="restoreDeletedGame('${game.id}')" style="font-size: 11px; padding: 4px 12px;">重新添加</button>
            </div>
        `;
    }).join('');
    
    html += '</div>';
    
    showModal('🗑️ 已删除游戏记录', html, [{ text: '关闭', class: 'btn-secondary', action: closeModal }]);
}

// 重新添加已删除的游戏
function restoreDeletedGame(gameId) {
    const deletedGames = DataManager.getDeletedGames();
    const game = deletedGames.find(g => g.id === gameId);
    
    if (!game) {
        showToast('游戏记录不存在', 'error');
        return;
    }
    
    // 检查当前是否已存在同名游戏
    const existingGames = DataManager.getDownloadedGames();
    const exists = existingGames.find(g => g.name === game.name && g.phoneId === game.phoneId);
    
    if (exists) {
        showToast(`游戏 "${game.name}" 已存在，无需重新添加`, 'warning');
        return;
    }
    
    // 重新添加游戏
    const newGame = DataManager.addDownloadedGame(game.name, game.phoneId);
    
    closeModal();
    showToast(`游戏 "${game.name}" 重新添加成功！只需游玩3天即可删除`, 'success');
    renderGamesPage();
}

// 一键删除所有可删除的游戏
function deleteAllCanDeleteGames() {
    const games = DataManager.getDownloadedGames(currentGamePhoneId);
    const canDeleteGames = games.filter(g => g.canDelete);
    
    if (canDeleteGames.length === 0) {
        showToast('没有可删除的游戏');
        return;
    }
    
    if (confirm(`确定要删除 ${canDeleteGames.length} 个已达到目标天数的游戏吗？`)) {
        let deletedCount = 0;
        canDeleteGames.forEach(game => {
            DataManager.deleteGame(game.id);
            deletedCount++;
        });
        
        showToast(`成功删除 ${deletedCount} 个游戏！`);
        renderGamesPage();
    }
}

// 今日游戏抽签
function drawTodayGame() {
    const container = document.getElementById('today-game-result');
    
    // 检查今天是否已经抽签（使用内存变量）
    const today = getCurrentDate();
    
    if (todayDrawResult && todayDrawResult._drawDate === today && todayDrawResult._phoneId === currentGamePhoneId) {
        // 今天已经抽签过了，显示今天的抽签结果
        showTodayDrawResult(todayDrawResult);
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
    
    // 保存到内存变量
    todayDrawResult = result;
    const targetDays = result.targetDays || 7;
    const progressPercent = (result.daysPlayed / targetDays) * 100;
    const remainingDays = targetDays - result.daysPlayed;
    
    // 随机生成游玩时长（15-60分钟，步进5分钟）
    const timeOptions = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
    const playTime = timeOptions[Math.floor(Math.random() * timeOptions.length)];
    const playTimeText = playTime >= 60 ? '1小时' : `${playTime}分钟`;
    
    // 保存计时器数据并开始计时
    const timerData = {
        gameId: result.id,
        gameName: result.name,
        startTime: new Date().toISOString(),
        duration: playTime,
        originalDuration: playTime, // 保存原始时长
        phoneId: currentGamePhoneId,
        isPaused: false,
        isCompleted: false,
        pausedDuration: 0
    };
    DataManager.saveGameTimer(result.id, timerData);
    
    // 启动计时器显示
    startGameTimer(result.id, playTime);
    
    container.innerHTML = `
        <div style="animation: fadeIn 0.5s ease;" id="draw-result-container">
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">🎲 抽签结果</div>
            <div style="font-size: 32px; font-weight: bold; margin: 16px 0; color: #fff;">${result.name}</div>
            
            <!-- 计时器显示 -->
            <div style="background: rgba(255,255,255,0.2); border-radius: 12px; padding: 16px; margin: 16px 0; border: 2px solid rgba(255,255,255,0.5);" id="timer-display-container">
                <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">⏱️ 建议游玩时长</div>
                <div style="font-size: 48px; font-weight: bold; color: #fff; font-family: monospace;" id="game-timer-display">${playTime}:00</div>
                <div style="font-size: 12px; opacity: 0.8; margin-top: 8px;" id="timer-status">
                    计时进行中...
                </div>
                <div style="margin-top: 12px;">
                    <button class="btn" onclick="pauseGameTimer('${result.id}')" id="timer-pause-btn" style="background: rgba(255,255,255,0.3); color: #fff; font-size: 12px; padding: 6px 16px; margin-right: 8px;">暂停</button>
                    <button class="btn" onclick="stopGameTimer('${result.id}')" style="background: rgba(255,255,255,0.3); color: #fff; font-size: 12px; padding: 6px 16px;">结束计时</button>
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
            
            <!-- 权重信息 -->
            ${result.weightDetails ? `
            <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 12px; margin-top: 16px; font-size: 11px;">
                <div style="margin-bottom: 6px; opacity: 0.9;">📊 智能权重分析</div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; text-align: left;">
                    <div>进度系数: ${result.weightDetails.progress}x</div>
                    <div>冷落系数: ${result.weightDetails.cold}x</div>
                    <div>连续系数: ${result.weightDetails.consecutive}x</div>
                    <div>保底系数: ${result.weightDetails.guaranteed}x</div>
                </div>
                <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.2);">
                    总权重: <strong>${result.weight?.toFixed(2) || '1.00'}</strong>
                </div>
            </div>
            ` : ''}
            
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

    // 检查今天是否已完成
    const today = getCurrentDate();
    const isCompletedToday = todayDraw.completedToday === today;

    // 检查是否有正在进行的计时器
    const timerData = DataManager.getGameTimer(todayDraw.gameId);
    const hasActiveTimer = timerData && !timerData.isCompleted && !isCompletedToday;

    if (hasActiveTimer) {
        // 恢复计时器显示
        const remainingSeconds = Math.floor(DataManager.calculateRemainingTime(timerData) / 1000);
        if (remainingSeconds > 0) {
            // 恢复计时器
            startGameTimer(todayDraw.gameId, timerData.originalDuration || timerData.duration);

            container.innerHTML = `
                <div style="animation: fadeIn 0.5s ease;" id="draw-result-container">
                    <div style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">🎲 今日抽签结果</div>
                    <div style="font-size: 32px; font-weight: bold; margin: 16px 0; color: #fff;">${todayDraw.gameName}</div>

                    <!-- 计时器显示 -->
                    <div style="background: rgba(255,255,255,0.2); border-radius: 12px; padding: 16px; margin: 16px 0; border: 2px solid rgba(255,255,255,0.5);" id="timer-display-container">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">⏱️ 游玩计时中</div>
                        <div style="font-size: 48px; font-weight: bold; color: #fff; font-family: monospace;" id="game-timer-display">${formatTime(remainingSeconds)}</div>
                        <div style="font-size: 12px; opacity: 0.8; margin-top: 8px;" id="timer-status">
                            ${timerData.isPaused ? '计时已暂停' : '计时进行中...'}
                        </div>
                        <div style="margin-top: 12px;">
                            <button class="btn" onclick="pauseGameTimer('${todayDraw.gameId}')" id="timer-pause-btn" style="background: rgba(255,255,255,0.3); color: #fff; font-size: 12px; padding: 6px 16px; margin-right: 8px;">${timerData.isPaused ? '继续' : '暂停'}</button>
                            <button class="btn" onclick="stopGameTimer('${todayDraw.gameId}')" style="background: rgba(255,255,255,0.3); color: #fff; font-size: 12px; padding: 6px 16px;">结束计时</button>
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
                        计时器正在后台运行，切换页面不会丢失
                    </div>
                </div>
            `;

            // 刷新游戏列表和统计
            renderGamesList();
            renderGameStats();
            renderGameDrawHistoryList();
            return;
        }
    }

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

            <!-- 完成按钮 -->
            ${!isCompletedToday ? `
            <button class="btn" onclick="completeTodayGame()" style="background: rgba(255,255,255,0.9); color: #11998e; font-weight: bold; font-size: 16px; margin-top: 16px; padding: 12px 32px; border-radius: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
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

// 格式化时间（秒 -> MM:SS）
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// 标记今日游戏已完成
function completeTodayGame() {
    const today = getCurrentDate();
    
    // 检查是否有今天的抽签结果
    if (!todayDrawResult || todayDrawResult._drawDate !== today || todayDrawResult._phoneId !== currentGamePhoneId) {
        showToast('今天还没有抽签');
        return;
    }
    
    // 检查今天是否已经完成过
    if (todayDrawResult._completedToday === today) {
        showToast('今天已经标记完成了');
        return;
    }
    
    // 标记为已完成
    todayDrawResult._completedToday = today;
    
    // 更新游戏的天数
    const games = DataManager.getDownloadedGames(currentGamePhoneId);
    const game = games.find(g => g.id === todayDrawResult.id);
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
        
        // 更新内存变量中的天数
        todayDrawResult.daysPlayed = game.daysPlayed;
        todayDrawResult._remainingDays = targetDays - game.daysPlayed;
        
        // 保存到历史记录（只有标记完成才保存）
        DataManager.addCompletedDrawHistory(currentGamePhoneId, game, today);
    }
    
    // 显示完成动画
    showToast('🎉 恭喜完成今日游戏任务！');
    
    // 重新渲染抽签结果
    showTodayDrawResult(todayDrawResult);
    
    // 刷新游戏列表和统计
    renderGamesList();
    renderGameStats();
    
    // 刷新抽签历史
    renderGameDrawHistoryList();
}

// ==================== 游戏计时器功能 ====================

// 计时器状态管理
let gameTimerState = {
    intervalId: null,
    gameId: null,
    isPaused: false,
    pausedTime: null, // 暂停时的时间戳
    remainingSeconds: 0, // 剩余秒数
    originalDuration: 0 // 原始时长（分钟）
};

// 启动游戏计时器（支持后台运行）
function startGameTimer(gameId, durationMinutes) {
    // 清除之前的计时器
    stopGameTimerInternal();

    const timerData = DataManager.getGameTimer(gameId);
    let startTime;
    let pausedDuration = 0;
    let isPaused = false;
    let pausedTime = null;

    if (timerData && !timerData.isCompleted) {
        // 恢复已有计时器
        startTime = new Date(timerData.startTime);
        pausedDuration = timerData.pausedDuration || 0;
        isPaused = timerData.isPaused || false;
        pausedTime = timerData.pausedTime ? new Date(timerData.pausedTime) : null;
    } else {
        // 新建计时器
        startTime = new Date();
    }

    // 保存计时器状态到 localStorage（用于后台计时）
    const newTimerData = {
        gameId: gameId,
        startTime: startTime.toISOString(),
        duration: durationMinutes,
        originalDuration: durationMinutes,
        isPaused: isPaused,
        isCompleted: false,
        pausedDuration: pausedDuration,
        pausedTime: pausedTime ? pausedTime.toISOString() : null,
        lastUpdateTime: new Date().toISOString() // 最后更新时间
    };
    DataManager.saveGameTimer(gameId, newTimerData);

    // 更新全局状态
    gameTimerState.gameId = gameId;
    gameTimerState.originalDuration = durationMinutes;
    gameTimerState.isPaused = isPaused;
    gameTimerState.pausedTime = pausedTime;

    // 立即更新显示
    updateTimerDisplayFromStorage();

    // 启动定时器（每秒更新显示，但实际计算基于时间戳）
    gameTimerState.intervalId = setInterval(() => {
        if (!gameTimerState.isPaused) {
            updateTimerDisplayFromStorage();

            // 检查是否结束
            const remaining = DataManager.calculateRemainingTime(DataManager.getGameTimer(gameId));
            if (remaining <= 0) {
                onTimerComplete(gameId);
            }
        }
    }, 1000);

    console.log(`游戏计时器已启动: ${gameId}, 时长 ${durationMinutes} 分钟`);
}

// 从存储中计算并更新计时器显示（支持后台运行）
function updateTimerDisplayFromStorage() {
    const timerData = DataManager.getGameTimer(gameTimerState.gameId);
    if (!timerData) return;

    const remainingMs = DataManager.calculateRemainingTime(timerData);
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    updateTimerDisplay(remainingSeconds);

    // 更新最后更新时间
    timerData.lastUpdateTime = new Date().toISOString();
    DataManager.saveGameTimer(gameTimerState.gameId, timerData);
}

// 暂停/恢复游戏计时器
function pauseGameTimer(gameId) {
    if (gameTimerState.gameId !== gameId) return;

    const timerData = DataManager.getGameTimer(gameId);
    if (!timerData) return;

    const pauseBtn = document.getElementById('timer-pause-btn');
    const statusEl = document.getElementById('timer-status');

    if (gameTimerState.isPaused) {
        // 恢复计时
        gameTimerState.isPaused = false;

        // 计算暂停时长
        if (gameTimerState.pausedTime) {
            const now = Date.now();
            const pausedDuration = now - gameTimerState.pausedTime.getTime();
            timerData.pausedDuration = (timerData.pausedDuration || 0) + pausedDuration;
            gameTimerState.pausedTime = null;
        }

        timerData.isPaused = false;
        timerData.pausedTime = null;
        timerData.lastUpdateTime = new Date().toISOString();
        DataManager.saveGameTimer(gameId, timerData);

        if (pauseBtn) pauseBtn.textContent = '暂停';
        if (statusEl) statusEl.textContent = '计时进行中...';

        showToast('计时器已恢复', 'info');
    } else {
        // 暂停计时
        const now = new Date();
        gameTimerState.isPaused = true;
        gameTimerState.pausedTime = now;

        timerData.isPaused = true;
        timerData.pausedTime = now.toISOString();
        timerData.lastUpdateTime = now.toISOString();
        DataManager.saveGameTimer(gameId, timerData);

        if (pauseBtn) pauseBtn.textContent = '继续';
        if (statusEl) statusEl.textContent = '计时已暂停';

        showToast('计时器已暂停', 'info');
    }
}

// 停止游戏计时器（用户手动结束）
function stopGameTimer(gameId) {
    if (gameTimerState.gameId !== gameId) return;
    
    // 清除计时器
    stopGameTimerInternal();
    
    // 标记为已完成
    const timerData = DataManager.getGameTimer(gameId);
    if (timerData) {
        timerData.isCompleted = true;
        timerData.endTime = new Date().toISOString();
        DataManager.saveGameTimer(gameId, timerData);
    }
    
    // 更新显示
    const container = document.getElementById('timer-display-container');
    if (container) {
        container.innerHTML = `
            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">⏱️ 计时已结束</div>
            <div style="font-size: 36px; font-weight: bold; color: #fff;">已完成</div>
            <div style="font-size: 12px; opacity: 0.8; margin-top: 8px;">
                实际游玩: ${formatElapsedTime(gameTimerState.originalDuration * 60 - gameTimerState.remainingSeconds)}
            </div>
        `;
    }
    
    showToast('游戏计时已结束', 'success');
}

// 内部停止计时器（不清除数据）
function stopGameTimerInternal() {
    if (gameTimerState.intervalId) {
        clearInterval(gameTimerState.intervalId);
        gameTimerState.intervalId = null;
    }
}

// 页面可见性变化处理（支持后台计时）
let pageHiddenTime = null;

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // 页面进入后台
        pageHiddenTime = Date.now();
        console.log('页面进入后台，计时器继续运行');
    } else {
        // 页面回到前台
        const pageVisibleTime = Date.now();
        const hiddenDuration = pageHiddenTime ? pageVisibleTime - pageHiddenTime : 0;

        console.log('页面回到前台，后台时长:', hiddenDuration, 'ms');

        // 如果有正在运行的计时器，更新显示
        if (gameTimerState.gameId && !gameTimerState.isPaused) {
            const timerData = DataManager.getGameTimer(gameTimerState.gameId);
            if (timerData && !timerData.isCompleted) {
                // 立即更新显示
                updateTimerDisplayFromStorage();

                // 检查是否已经结束
                const remaining = DataManager.calculateRemainingTime(timerData);
                if (remaining <= 0) {
                    onTimerComplete(gameTimerState.gameId);
                } else {
                    // 只在游戏管理页面显示同步提示
                    if (currentPage === 'games' && document.getElementById('game-timer-display')) {
                        showToast('计时器已同步', 'info');
                    }
                }
            }
        }

        pageHiddenTime = null;
    }
});

// 窗口获得焦点时同步计时器（处理切换手机的情况）
window.addEventListener('focus', () => {
    if (gameTimerState.gameId && !gameTimerState.isPaused) {
        const timerData = DataManager.getGameTimer(gameTimerState.gameId);
        if (timerData && !timerData.isCompleted) {
            updateTimerDisplayFromStorage();

            const remaining = DataManager.calculateRemainingTime(timerData);
            if (remaining <= 0) {
                onTimerComplete(gameTimerState.gameId);
            }
        }
    }
});

// 计时完成回调
function onTimerComplete(gameId) {
    stopGameTimerInternal();
    
    // 标记为已完成
    const timerData = DataManager.getGameTimer(gameId);
    if (timerData) {
        timerData.isCompleted = true;
        timerData.endTime = new Date().toISOString();
        DataManager.saveGameTimer(gameId, timerData);
    }
    
    // 更新显示
    const displayEl = document.getElementById('game-timer-display');
    const statusEl = document.getElementById('timer-status');
    
    if (displayEl) displayEl.textContent = '00:00';
    if (statusEl) statusEl.textContent = '计时结束！';
    
    // 播放提醒
    playTimerAlert();
    
    // 显示提醒弹窗
    showTimerCompleteModal(gameId);
}

// 更新计时器显示
function updateTimerDisplay(remainingSeconds) {
    const displayEl = document.getElementById('game-timer-display');
    if (!displayEl) return;
    
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    displayEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// 格式化已用时间
function formatElapsedTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
        return `${hours}小时${minutes}分${seconds}秒`;
    } else if (minutes > 0) {
        return `${minutes}分${seconds}秒`;
    } else {
        return `${seconds}秒`;
    }
}

// 播放计时结束提醒（使用 Web Audio API）
function playTimerAlert() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 创建振荡器
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // 设置音效
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        // 设置音量包络
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        // 播放
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        
        // 播放三次
        setTimeout(() => {
            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            osc2.frequency.value = 800;
            osc2.type = 'sine';
            gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            osc2.start(audioContext.currentTime);
            osc2.stop(audioContext.currentTime + 0.5);
        }, 600);
        
        setTimeout(() => {
            const osc3 = audioContext.createOscillator();
            const gain3 = audioContext.createGain();
            osc3.connect(gain3);
            gain3.connect(audioContext.destination);
            osc3.frequency.value = 1000;
            osc3.type = 'sine';
            gain3.gain.setValueAtTime(0.3, audioContext.currentTime);
            gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
            osc3.start(audioContext.currentTime);
            osc3.stop(audioContext.currentTime + 0.8);
        }, 1200);
        
    } catch (e) {
        console.log('无法播放提醒音效:', e);
    }
}

// 显示计时完成弹窗
function showTimerCompleteModal(gameId) {
    const timerData = DataManager.getGameTimer(gameId);
    const elapsedSeconds = timerData ? 
        (timerData.originalDuration || timerData.duration) * 60 - gameTimerState.remainingSeconds : 0;
    
    showModal(
        '⏰ 游戏时间到！',
        `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 64px; margin-bottom: 16px;">🎮</div>
                <div style="font-size: 18px; margin-bottom: 12px;">游戏计时已结束</div>
                <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
                    实际游玩时长: <strong>${formatElapsedTime(Math.max(0, elapsedSeconds))}</strong>
                </div>
                <div style="font-size: 13px; color: var(--text-secondary); background: var(--bg-secondary); padding: 12px; border-radius: 8px;">
                    💡 提示: 如果还没玩够，可以点击"继续游玩"延长时间
                </div>
            </div>
        `,
        [
            {
                text: '标记完成',
                class: 'btn-primary',
                action: () => {
                    closeModal();
                    completeTodayGame();
                }
            },
            {
                text: '继续游玩',
                class: 'btn-secondary',
                action: () => {
                    closeModal();
                    // 增加15分钟
                    const extraMinutes = 15;
                    gameTimerState.remainingSeconds += extraMinutes * 60;
                    startGameTimer(gameId, Math.ceil(gameTimerState.remainingSeconds / 60));
                    showToast(`已延长 ${extraMinutes} 分钟`, 'success');
                }
            }
        ]
    );
}

// 恢复计时器状态（页面加载时调用）
function restoreGameTimer() {
    const timers = DataManager.getAllGameTimers();
    
    Object.keys(timers).forEach(gameId => {
        const timer = timers[gameId];
        if (!timer.isCompleted) {
            const remaining = DataManager.calculateRemainingTime(timer);
            
            if (remaining > 0) {
                // 还有剩余时间，恢复计时器
                console.log(`恢复游戏计时器: ${gameId}, 剩余 ${Math.floor(remaining / 1000)} 秒`);
                // 注意：这里不自动启动，等待用户进入游戏页面时再启动
            } else {
                // 时间已到，标记为完成
                timer.isCompleted = true;
                timer.endTime = new Date().toISOString();
                DataManager.saveGameTimer(gameId, timer);
            }
        }
    });
}

// ==================== 年度目标功能 ====================

// 渲染年度目标面板
function renderYearlyGoal() {
    const container = document.getElementById('yearly-goal-content');
    if (!container) return;

    const distribution = DataManager.autoDistributeSurplus();
    const goal = distribution.goal;

    if (goal.amount <= 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 30px;">
                <div style="font-size: 48px; margin-bottom: 16px;">🎯</div>
                <div style="font-size: 16px; margin-bottom: 8px;">尚未设置收益目标</div>
                <div style="font-size: 13px; color: var(--text-secondary);">
                    前往设置页面配置收益目标
                </div>
                <button class="btn btn-primary mt-4" onclick="showPage('settings')">去设置</button>
            </div>
        `;
        return;
    }

    const progressPercent = distribution.progress;
    const isOverTarget = distribution.totalEarned >= goal.amount;

    // 获取目标进度信息
    const goalProgress = DataManager.calculateGoalProgress();

    let html = `
        <div style="padding: 16px;">
            <!-- 总体进度 - 毛玻璃效果 -->
            <div style="position: relative; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 16px; padding: 24px; margin-bottom: 20px; overflow: hidden;">
                <!-- 背景装饰圆形 -->
                <div style="position: absolute; top: -40px; right: -40px; width: 100px; height: 100px; background: rgba(255,255,255,0.3); border-radius: 50%; filter: blur(25px);"></div>
                <div style="position: absolute; bottom: -30px; left: -30px; width: 80px; height: 80px; background: rgba(255,255,255,0.25); border-radius: 50%; filter: blur(20px);"></div>
                
                <!-- 毛玻璃卡片内容 -->
                <div style="position: relative; background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-radius: 12px; border: 1px solid rgba(255,255,255,0.3); padding: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <span style="font-size: 14px; color: rgba(255,255,255,0.9);">收益目标</span>
                        <span style="font-size: 22px; font-weight: bold; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">¥${goal.amount.toFixed(2)}</span>
                    </div>
                    <div style="background: rgba(255,255,255,0.25); border-radius: 10px; height: 10px; overflow: hidden; margin-bottom: 12px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);">
                        <div style="background: ${isOverTarget ? '#38ef7d' : 'linear-gradient(90deg, #ffffff, rgba(255,255,255,0.8))'}; height: 100%; width: ${progressPercent}%; transition: width 0.5s ease; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 13px; color: rgba(255,255,255,0.9);">
                        <span>已赚取: <strong style="color: #ffffff;">¥${distribution.totalEarned.toFixed(2)}</strong></span>
                        <span style="font-weight: 600;">${progressPercent}%</span>
                    </div>
                    ${isOverTarget ? `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.3);">
                        <span style="color: #38ef7d; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">🎉 超额完成! 超出 ¥${(distribution.totalEarned - goal.amount).toFixed(2)}</span>
                    </div>
                    ` : `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.3);">
                        <span style="color: rgba(255,255,255,0.9);">剩余: <strong style="color: #ffffff;">¥${distribution.remaining.toFixed(2)}</strong></span>
                        ${goalProgress.estimatedDaysNeeded > 0 ? `<br><span style="color: rgba(255,255,255,0.85); font-size: 12px;">预计还需 ${goalProgress.estimatedDaysNeeded} 天完成</span>` : ''}
                    </div>
                    `}
                </div>
            </div>

            <!-- 每日目标缺口记录 -->
            ${(() => {
                const goalProgress = DataManager.calculateGoalProgress();
                const dailyTarget = DataManager.calculateDailyTarget();
                
                if (!goalProgress.isValid) return '';
                
                // 自动记录今日缺口
                DataManager.checkAndRecordTodayGap();
                
                const gapStats = DataManager.getDailyGapStats();
                
                const now = new Date();
                const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const todayRecord = DataManager.getDailyGap(today);
                
                // 计算今日实际收益
                const data = DataManager.loadData();
                let todayEarned = 0;
                data.phones.forEach(phone => {
                    phone.apps.forEach(app => {
                        if (app.dailyEarnings && app.dailyEarnings[today]) {
                            todayEarned += parseFloat(app.dailyEarnings[today]) || 0;
                        }
                    });
                });
                
                // 判断今日赚取是否达到还款所需
                const isRepaymentAchieved = dailyTarget.repaymentNeeded > 0 && todayEarned >= dailyTarget.repaymentNeeded;
                
                return `
                    <div style="position: relative; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border-radius: 16px; padding: 20px; margin-bottom: 16px; overflow: hidden;">
                        <!-- 背景装饰圆形 -->
                        <div style="position: absolute; top: -40px; right: -40px; width: 100px; height: 100px; background: rgba(255,255,255,0.3); border-radius: 50%; filter: blur(25px);"></div>
                        <div style="position: absolute; bottom: -30px; left: -30px; width: 80px; height: 80px; background: rgba(255,255,255,0.25); border-radius: 50%; filter: blur(20px);"></div>
                        
                        <!-- 毛玻璃卡片内容 -->
                        <div style="position: relative; background: rgba(255,255,255,0.25); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-radius: 12px; border: 1px solid rgba(255,255,255,0.4); padding: 12px;">
                            <!-- 标题行 -->
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <span style="font-size: 13px; font-weight: 600; color: #78350f;">📅 每日目标追踪</span>
                                <button class="btn btn-sm" onclick="showDailyGapDetailModal()" style="font-size: 10px; padding: 3px 8px; background: rgba(120, 53, 15, 0.1); border: 1px solid rgba(120, 53, 15, 0.2); color: #78350f;">详情</button>
                            </div>
                            
                            <!-- 今日目标金额 -->
                            <div style="background: rgba(255,255,255,0.35); border-radius: 10px; padding: 10px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.4);">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                    <span style="font-size: 11px; color: #92400e;">今日目标</span>
                                    <span style="font-size: 20px; font-weight: 700; color: #78350f;">¥${dailyTarget.dailyTarget.toFixed(2)}</span>
                                </div>
                                <div style="font-size: 10px; color: #92400e;">
                                    ${dailyTarget.performanceLevel === 'excellent' ? '🌟 表现优秀' : 
                                      dailyTarget.performanceLevel === 'normal' ? '💪 正常发挥' :
                                      dailyTarget.performanceLevel === 'declining' ? '📈 鼓励恢复' :
                                      dailyTarget.performanceLevel === 'poor' ? '💪 加油努力' :
                                      dailyTarget.performanceLevel === 'new_user' ? '🎯 新手目标' : '基于历史数据'}
                                </div>
                            </div>
                            
                            <!-- 历史数据小字 -->
                            <!-- 目标构成说明 -->
                            <div style="background: rgba(255,255,255,0.2); border-radius: 8px; padding: 8px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.3);">
                                <div style="font-size: 10px; color: #92400e; margin-bottom: 6px; text-align: center; font-weight: 600;">目标构成</div>
                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px;">
                                    <div style="background: rgba(255,255,255,0.35); border-radius: 6px; padding: 6px; text-align: center; border: 1px solid rgba(255,255,255,0.3);">
                                        <div style="font-size: 9px; color: #92400e; margin-bottom: 2px;">💪 能力目标</div>
                                        <div style="font-size: 13px; font-weight: 700; color: #78350f;">¥${dailyTarget.abilityTarget.toFixed(2)}</div>
                                    </div>
                                    ${dailyTarget.repaymentNeeded > 0 ? `
                                    <div style="background: ${isRepaymentAchieved ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.35)'}; border-radius: 6px; padding: 6px; text-align: center; position: relative; border: 1px solid rgba(255,255,255,0.3);">
                                        <div style="font-size: 9px; color: ${isRepaymentAchieved ? '#166534' : '#92400e'}; margin-bottom: 2px;">
                                            💰 还款所需 ${isRepaymentAchieved ? '✓' : ''}
                                        </div>
                                        <div style="font-size: 13px; font-weight: 700; color: ${isRepaymentAchieved ? '#166534' : '#78350f'};">¥${dailyTarget.repaymentNeeded.toFixed(2)}</div>
                                        ${isRepaymentAchieved ? `
                                        <div style="position: absolute; top: -4px; right: -4px; background: #22c55e; color: white; font-size: 9px; padding: 1px 4px; border-radius: 8px; font-weight: bold;">已达标</div>
                                        ` : ''}
                                    </div>
                                    ` : `
                                    <div style="background: rgba(34, 197, 94, 0.2); border-radius: 6px; padding: 6px; text-align: center; border: 1px solid rgba(255,255,255,0.3);">
                                        <div style="font-size: 9px; color: #92400e; margin-bottom: 2px;">✅ 无还款</div>
                                        <div style="font-size: 13px; font-weight: 700; color: #78350f;">-</div>
                                    </div>
                                    `}
                                </div>
                                ${dailyTarget.repaymentNeeded > dailyTarget.abilityTarget ? `
                                <div style="font-size: 9px; color: #991b1b; text-align: center; margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(120, 53, 15, 0.3);">
                                    ⚠️ 还款压力较大，目标按还款需求计算
                                </div>
                                ` : dailyTarget.repaymentNeeded > 0 ? `
                                <div style="font-size: 9px; color: #166534; text-align: center; margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(120, 53, 15, 0.3);">
                                    ✅ 能力足够覆盖还款需求
                                </div>
                                ` : ''}
                            </div>
                        
                        ${dailyTarget.avgDailyEarnings > 0 ? `
                        <div style="margin-bottom: 10px; font-size: 9px; color: #92400e; text-align: center;">
                            历史平均: ¥${dailyTarget.avgDailyEarnings.toFixed(2)}
                            ${dailyTarget.last7DaysAvg > 0 ? ` | 近7天: ¥${dailyTarget.last7DaysAvg.toFixed(2)}` : ''}
                        </div>
                        ` : ''}
                        
                        <!-- 统计信息（毛玻璃效果） -->
                        ${gapStats.totalDays > 0 ? `
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 10px;">
                            <div style="background: rgba(255,255,255,0.3); backdrop-filter: blur(5px); border-radius: 8px; padding: 8px; text-align: center; border: 1px solid rgba(255,255,255,0.4);">
                                <div style="font-size: 16px; font-weight: 700; color: #166534;">${gapStats.achievedDays}</div>
                                <div style="font-size: 10px; color: #78350f; margin-top: 2px;">达标</div>
                            </div>
                            <div style="background: rgba(255,255,255,0.3); backdrop-filter: blur(5px); border-radius: 8px; padding: 8px; text-align: center; border: 1px solid rgba(255,255,255,0.4);">
                                <div style="font-size: 16px; font-weight: 700; color: #991b1b;">${gapStats.missedDays}</div>
                                <div style="font-size: 10px; color: #78350f; margin-top: 2px;">未达标</div>
                            </div>
                        </div>
                        
                        <!-- 超额/缺口信息（毛玻璃效果） -->
                        ${gapStats.totalSurplus > 0 ? `
                        <div style="background: rgba(255,255,255,0.25); backdrop-filter: blur(5px); border-radius: 8px; padding: 8px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.35); font-size: 11px; color: #78350f; display: flex; justify-content: space-between;">
                            <span>超额: <b style="color: #166534;">¥${gapStats.totalSurplus.toFixed(2)}</b></span>
                            ${gapStats.remainingSurplus > 0 ? `<span>剩余: <b style="color: #166534;">¥${gapStats.remainingSurplus.toFixed(2)}</b></span>` : ''}
                        </div>
                        ` : ''}
                        
                        ${gapStats.netGap > 0 ? `
                        <div style="background: rgba(239, 68, 68, 0.15); backdrop-filter: blur(5px); border-radius: 8px; padding: 8px; margin-bottom: 10px; border: 1px solid rgba(239, 68, 68, 0.3); font-size: 11px; color: #78350f; display: flex; justify-content: space-between;">
                            <span>缺口</span>
                            <b style="color: #991b1b;">¥${gapStats.netGap.toFixed(2)}</b>
                        </div>
                        ` : gapStats.remainingSurplus > 0 && gapStats.totalSurplus === 0 ? `
                        <div style="background: rgba(34, 197, 94, 0.15); backdrop-filter: blur(5px); border-radius: 8px; padding: 8px; margin-bottom: 10px; border: 1px solid rgba(34, 197, 94, 0.3); font-size: 11px; color: #78350f; display: flex; justify-content: space-between;">
                            <span>结余</span>
                            <b style="color: #166534;">¥${gapStats.remainingSurplus.toFixed(2)}</b>
                        </div>
                        ` : ''}
                        ` : ''}
                        
                        <!-- 今日状态（毛玻璃效果） -->
                        ${todayRecord ? `
                        <div style="background: ${todayRecord.isAchieved ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; backdrop-filter: blur(5px); border-radius: 8px; padding: 10px; border: 1px solid ${todayRecord.isAchieved ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'};">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 12px; font-weight: 600; color: ${todayRecord.isAchieved ? '#166534' : '#991b1b'};">
                                    ${todayRecord.isAchieved ? '✅ 已达标' : '❌ 未达标'}
                                </span>
                                <span style="font-size: 11px; color: ${todayRecord.isAchieved ? '#166534' : '#991b1b'}; font-weight: 600;">
                                    ${todayRecord.isAchieved ? `+¥${(todayRecord.earnedAmount - todayRecord.targetAmount).toFixed(2)}` : `-¥${todayRecord.gap.toFixed(2)}`}
                                </span>
                            </div>
                            <div style="font-size: 9px; color: #78350f; margin-top: 2px;">
                                目标¥${todayRecord.targetAmount.toFixed(2)} · 实际¥${todayRecord.earnedAmount.toFixed(2)}
                            </div>
                        </div>
                        ` : `
                        <div style="background: rgba(255,255,255,0.3); border-radius: 6px; padding: 8px; text-align: center;">
                            <span style="font-size: 11px; color: #92400e;">今日尚未记录</span>
                            <div style="font-size: 9px; color: #92400e; margin-top: 2px;">
                                修改软件余额记录收益
                            </div>
                        </div>
                        `}
                    </div>
                `;
            })()}

            <!-- 软件目标分配 -->
            <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--text-primary);">
                📊 各软件目标分配
                ${goal.autoDistribute ? '<span style="font-size: 11px; color: var(--success-color); margin-left: 8px;">(已启用自动分配)</span>' : ''}
            </div>
            <div style="max-height: 300px; overflow-y: auto;">
    `;

    if (distribution.apps.length === 0) {
        html += `<div class="empty-state">暂无软件数据</div>`;
    } else {
        // 按排名排序显示（收益高的排在前面）
        const sortedApps = [...distribution.apps].sort((a, b) => b.totalEarned - a.totalEarned);
        
        sortedApps.forEach((app, index) => {
            const appProgress = Math.min(100, (app.totalEarned / app.adjustedTarget * 100)).toFixed(1);
            const isCompleted = app.totalEarned >= app.adjustedTarget;
            const hasAllocation = app.allocatedSurplus > 0;
            
            // 根据排名确定表现等级
            let rankBadge = '';
            let rankColor = '';
            if (app.rank <= Math.ceil(distribution.apps.length * 0.33)) {
                rankBadge = '🔥 优秀';
                rankColor = '#38ef7d';
            } else if (app.rank <= Math.ceil(distribution.apps.length * 0.67)) {
                rankBadge = '📈 良好';
                rankColor = '#11998e';
            } else {
                rankBadge = '💪 加油';
                rankColor = '#f093fb';
            }

            // 使用基于估算天数的每日目标
            const dailyTarget = app.dailyTarget || (app.adjustedTarget / (distribution.estimatedDays || 365));
            const dailyStats = DataManager.calculateAppAchievementStats(app.appId);
            
            html += `
                <div style="background: rgba(255,255,255,0.2); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border-radius: 12px; padding: 12px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.3); cursor: pointer; position: relative; overflow: hidden;" onclick="openDailyGoalModal('${app.appId}', '${app.phoneId}')">
                    <!-- 左侧彩色条 -->
                    <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: ${isCompleted ? '#38ef7d' : hasAllocation ? '#f093fb' : rankColor}; border-radius: 12px 0 0 12px;"></div>
                    
                    <!-- 第一行：排名 + 软件名 + 手机名 -->
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding-left: 8px;">
                        <span style="font-size: 11px; background: ${rankColor}25; color: ${rankColor}; padding: 2px 8px; border-radius: 10px; font-weight: 600; flex-shrink: 0; border: 1px solid ${rankColor}40;">${index + 1}</span>
                        <span style="font-weight: 600; font-size: 14px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #78350f;">${app.appName}</span>
                        <span style="font-size: 11px; color: #92400e; flex-shrink: 0;">(${app.phoneName})</span>
                    </div>
                    
                    <!-- 第二行：状态标签（换行显示） -->
                    <div style="display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; padding-left: 8px;">
                        <span style="font-size: 10px; padding: 2px 6px; border-radius: 6px; background: ${rankColor}20; color: #78350f; border: 1px solid ${rankColor}50; font-weight: 600;">
                            ${rankBadge}
                        </span>
                        <span style="font-size: 10px; padding: 2px 6px; border-radius: 6px; background: ${isCompleted ? 'rgba(34, 197, 94, 0.15)' : hasAllocation ? 'rgba(240, 147, 251, 0.15)' : 'rgba(239, 68, 68, 0.1)'}; color: ${isCompleted ? '#166534' : hasAllocation ? '#be185d' : '#991b1b'}; border: 1px solid ${isCompleted ? 'rgba(34, 197, 94, 0.25)' : hasAllocation ? 'rgba(240, 147, 251, 0.25)' : 'rgba(239, 68, 68, 0.2)'}; font-weight: 600;">
                            ${hasAllocation ? '受助' : isCompleted ? '达标' : '进行中'}
                        </span>
                    </div>
                    
                    <!-- 第三行：目标金额 -->
                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; color: #92400e; padding-left: 8px;">
                        <span>年目标: <strong style="color: #78350f;">¥${app.adjustedTarget.toFixed(2)}</strong></span>
                        <span>已赚: <strong style="color: #78350f;">¥${app.totalEarned.toFixed(2)}</strong></span>
                    </div>
                    
                    <!-- 进度条 -->
                    <div style="background: rgba(120, 53, 15, 0.1); border-radius: 6px; height: 8px; overflow: hidden; margin-bottom: 8px; margin-left: 8px;">
                        <div style="background: ${isCompleted ? '#38ef7d' : rankColor}; height: 100%; width: ${appProgress}%; transition: width 0.3s ease; border-radius: 6px;"></div>
                    </div>
                    
                    <!-- 第四行：剩余和进度 -->
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #92400e; margin-bottom: 8px; padding-left: 8px;">
                        <span>剩: <strong style="color: #78350f;">¥${Math.max(0, app.adjustedTarget - app.totalEarned).toFixed(2)}</strong></span>
                        <span style="font-weight: 600; color: #78350f;">${appProgress}%</span>
                    </div>
                    
                    <!-- 每日目标信息（毛玻璃效果） -->
                    <div style="background: ${dailyStats.todayAchieved ? 'rgba(34, 197, 94, 0.15)' : 'rgba(251, 191, 36, 0.2)'}; backdrop-filter: blur(5px); border-radius: 8px; padding: 8px; margin-left: 8px; border: 1px solid ${dailyStats.todayAchieved ? 'rgba(34, 197, 94, 0.25)' : 'rgba(251, 191, 36, 0.3)'};">
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                            <span style="color: #92400e;">
                                日目标: <strong style="color: #78350f;">¥${dailyTarget.toFixed(2)}</strong>
                            </span>
                            <span style="color: ${dailyStats.todayAchieved ? '#166534' : '#92400e'}; font-size: 10px; font-weight: 600;">
                                ${dailyStats.todayAchieved ? '✅ 已达标' : '⏳ 未达标'} · ${dailyStats.achievedDays}天
                            </span>
                        </div>
                    </div>
                    
                    ${hasAllocation ? `
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed rgba(120, 53, 15, 0.2); font-size: 12px; color: #be185d; padding-left: 8px;">
                        💝 获得超额分配: <strong>¥${app.allocatedSurplus.toFixed(2)}</strong> · 新目标: <strong>¥${app.newTarget.toFixed(2)}</strong>
                    </div>
                    ` : ''}
                </div>
            `;
        });
    }

    html += `
            </div>
            
            <button class="btn btn-secondary w-full mt-3" onclick="viewYearlyGoalDetail()" style="font-size: 13px;">
                查看详细分析
            </button>
        </div>
    `;

    container.innerHTML = html;
}

// 保存收益目标
function saveYearlyGoal() {
    const amountInput = document.getElementById('yearly-goal-amount');
    const autoDistributeCheckbox = document.getElementById('yearly-goal-auto-distribute');

    const amount = parseFloat(amountInput.value);
    const autoDistribute = autoDistributeCheckbox.checked;

    if (!amount || amount <= 0) {
        showToast('请输入有效的目标金额', 'error');
        return;
    }

    // 不再传入年份，使用0表示不限时目标
    DataManager.saveYearlyGoal(amount, 0, autoDistribute);
    showToast('目标已保存', 'success');
    
    // 刷新仪表盘显示
    renderYearlyGoal();
}

// 加载收益目标到设置页面
function loadYearlyGoalSettings() {
    const goal = DataManager.getYearlyGoal();
    
    const amountInput = document.getElementById('yearly-goal-amount');
    const autoDistributeCheckbox = document.getElementById('yearly-goal-auto-distribute');

    if (amountInput) amountInput.value = goal.amount > 0 ? goal.amount : '';
    if (autoDistributeCheckbox) autoDistributeCheckbox.checked = goal.autoDistribute;
}

// 显示每日目标缺口详情弹窗
function showDailyGapDetailModal() {
    const gapStats = DataManager.getDailyGapStats();
    const dailyTarget = DataManager.calculateYearlyDailyTarget();

    let recordsHtml = '';
    if (gapStats.records.length === 0) {
        recordsHtml = '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">暂无记录</div>';
    } else {
        recordsHtml = gapStats.records.map(record => {
            const isAchieved = record.isAchieved;
            const bgColor = isAchieved ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';
            const borderColor = isAchieved ? '#22c55e' : '#ef4444';
            const textColor = isAchieved ? '#166534' : '#991b1b';
            
            return `
                <div style="background: ${bgColor}; border-left: 3px solid ${borderColor}; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 13px; font-weight: 600; color: ${textColor};">${record.date}</span>
                        <span style="font-size: 12px; color: ${textColor};">${isAchieved ? '✅ 已达标' : '❌ 未达标'}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 11px; color: var(--text-secondary);">
                        <div>目标: ¥${record.targetAmount.toFixed(2)}</div>
                        <div>实际: ¥${record.earnedAmount.toFixed(2)}</div>
                        <div style="color: ${textColor}; font-weight: 600;">${isAchieved ? '超额' : '缺口'}: ¥${record.gap.toFixed(2)}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    const html = `
        <div style="max-height: 60vh; overflow-y: auto;">
            <!-- 统计概览 -->
            <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 12px; padding: 16px; color: white; margin-bottom: 16px;">
                <div style="text-align: center; margin-bottom: 12px;">
                    <div style="font-size: 24px; font-weight: bold;">¥${dailyTarget.dailyTarget.toFixed(2)}</div>
                    <div style="font-size: 12px; opacity: 0.9;">每天需赚</div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; text-align: center; font-size: 12px; margin-bottom: 12px;">
                    <div style="background: rgba(255,255,255,0.2); border-radius: 8px; padding: 8px;">
                        <div style="font-weight: bold; font-size: 14px;">${gapStats.achievedDays}</div>
                        <div style="opacity: 0.8;">达标天数</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.2); border-radius: 8px; padding: 8px;">
                        <div style="font-weight: bold; font-size: 14px;">${gapStats.missedDays}</div>
                        <div style="opacity: 0.8;">未达标天数</div>
                    </div>
                </div>
                
                ${gapStats.totalSurplus > 0 ? `
                <div style="background: rgba(255,255,255,0.2); border-radius: 8px; padding: 10px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                        <span>累计超额</span>
                        <span style="color: #90EE90;">¥${gapStats.totalSurplus.toFixed(2)}</span>
                    </div>
                    ${gapStats.totalGap > 0 ? `
                    <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                        <span>抵扣缺口</span>
                        <span>-¥${(gapStats.totalSurplus - gapStats.remainingSurplus).toFixed(2)}</span>
                    </div>
                    ` : ''}
                    ${gapStats.remainingSurplus > 0 ? `
                    <div style="display: flex; justify-content: space-between; font-size: 11px;">
                        <span>剩余超额</span>
                        <span style="color: #90EE90;">¥${gapStats.remainingSurplus.toFixed(2)}</span>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
                
                ${gapStats.netGap > 0 ? `
                <div style="background: rgba(255,0,0,0.2); border-radius: 8px; padding: 10px; text-align: center;">
                    <div style="font-size: 11px; opacity: 0.9;">抵扣后缺口</div>
                    <div style="font-size: 18px; font-weight: bold; color: #FFD700;">¥${gapStats.netGap.toFixed(2)}</div>
                </div>
                ` : gapStats.remainingSurplus > 0 ? `
                <div style="background: rgba(0,255,0,0.2); border-radius: 8px; padding: 10px; text-align: center;">
                    <div style="font-size: 11px; opacity: 0.9;">超额结余</div>
                    <div style="font-size: 18px; font-weight: bold; color: #90EE90;">¥${gapStats.remainingSurplus.toFixed(2)}</div>
                </div>
                ` : ''}
            </div>

            <!-- 记录列表 -->
            <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--text-primary);">
                📋 历史记录 (${gapStats.totalDays}天)
            </div>
            ${recordsHtml}
        </div>
    `;

    showModal('每日目标缺口详情', html, [{ text: '关闭', class: 'btn-secondary', action: closeModal }]);
}

// 查看年度目标详情
function viewYearlyGoalDetail() {
    const distribution = DataManager.autoDistributeSurplus();
    const goal = distribution.goal;

    if (goal.amount <= 0) {
        showToast('请先设置年度目标', 'warning');
        return;
    }

    const progressPercent = distribution.progress;

    let appsHtml = '';
    
    // 按状态分组显示
    const surplusApps = distribution.apps.filter(a => a.diff > 0);
    const deficitApps = distribution.apps.filter(a => a.diff < 0);
    const balancedApps = distribution.apps.filter(a => a.diff === 0);

    const renderAppGroup = (apps, title, color) => {
        if (apps.length === 0) return '';
        
        let groupHtml = `
            <div style="margin-bottom: 16px;">
                <div style="font-size: 13px; font-weight: 600; color: ${color}; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 2px solid ${color};">
                    ${title} (${apps.length}个)
                </div>
        `;
        
        apps.forEach(app => {
            const hasAllocation = app.allocatedSurplus > 0;
            groupHtml += `
                <div style="background: var(--bg-secondary); border-radius: 8px; padding: 10px; margin-bottom: 8px; font-size: 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="font-weight: 600;">${app.appName}</span>
                        <span style="color: var(--text-secondary);">${app.phoneName}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; color: var(--text-secondary);">
                        <div>目标: ¥${app.adjustedTarget.toFixed(2)}</div>
                        <div>已赚: ¥${app.totalEarned.toFixed(2)}</div>
                        <div>剩余: ¥${Math.max(0, app.adjustedTarget - app.totalEarned).toFixed(2)}</div>
                        <div style="color: ${app.diff >= 0 ? 'var(--success-color)' : 'var(--error-color)'};">
                            ${app.diff >= 0 ? '+' : ''}¥${app.diff.toFixed(2)}
                        </div>
                    </div>
                    ${hasAllocation ? `
                    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--border-color); color: #be185d; font-size: 11px;">
                        获得分配: ¥${app.allocatedSurplus.toFixed(2)} → 调整后差额: ${app.newDiff >= 0 ? '+' : ''}¥${app.newDiff.toFixed(2)}
                    </div>
                    ` : ''}
                </div>
            `;
        });
        
        groupHtml += '</div>';
        return groupHtml;
    };

    appsHtml += renderAppGroup(surplusApps, '🚀 超额完成', '#38ef7d');
    appsHtml += renderAppGroup(deficitApps, '📈 仍需努力', '#f093fb');
    appsHtml += renderAppGroup(balancedApps, '✅ 刚好达标', '#11998e');

    const bodyHtml = `
        <div style="max-height: 60vh; overflow-y: auto;">
            <!-- 总体概况 -->
            <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 12px; padding: 16px; color: white; margin-bottom: 20px;">
                <div style="text-align: center; margin-bottom: 12px;">
                    <div style="font-size: 24px; font-weight: bold;">¥${goal.amount.toFixed(2)}</div>
                    <div style="font-size: 12px; opacity: 0.9;">${goal.year}年目标</div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center; font-size: 12px;">
                    <div style="background: rgba(255,255,255,0.2); border-radius: 8px; padding: 8px;">
                        <div style="font-weight: bold; font-size: 14px;">¥${distribution.totalEarned.toFixed(2)}</div>
                        <div style="opacity: 0.8;">已赚取</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.2); border-radius: 8px; padding: 8px;">
                        <div style="font-weight: bold; font-size: 14px;">¥${distribution.remaining.toFixed(2)}</div>
                        <div style="opacity: 0.8;">剩余</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.2); border-radius: 8px; padding: 8px;">
                        <div style="font-weight: bold; font-size: 14px;">¥${(distribution.avgDailyEarnings ? distribution.avgDailyEarnings * 30 : 0).toFixed(2)}</div>
                        <div style="opacity: 0.8;">月均收益</div>
                    </div>
                </div>
            </div>

            <!-- 软件详情 -->
            <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">
                📱 各软件详细数据
            </div>
            ${appsHtml || '<div class="empty-state">暂无软件数据</div>'}

            <!-- 分配说明 -->
            ${distribution.surplus > 0 && goal.autoDistribute ? `
            <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 12px; margin-top: 16px; font-size: 12px; color: #166534;">
                <div style="font-weight: 600; margin-bottom: 4px;">🎯 自动分配说明</div>
                <div>超额收益 ¥${distribution.surplus.toFixed(2)} 已自动分配给 ${deficitApps.length} 个收益不足的软件</div>
                ${distribution.remainingSurplus > 0 ? `<div style="margin-top: 4px;">剩余未分配: ¥${distribution.remainingSurplus.toFixed(2)}</div>` : ''}
            </div>
            ` : ''}
        </div>
    `;

    showModal(
        '📊 年度目标详细分析',
        bodyHtml,
        [
            {
                text: '关闭',
                class: 'btn-secondary',
                action: closeModal
            },
            {
                text: '修改目标',
                class: 'btn-primary',
                action: () => {
                    closeModal();
                    showPage('settings');
                }
            }
        ],
        true
    );
}

// ==================== 每日目标功能 ====================

// 当前查看每日目标的软件ID和手机ID
let currentDailyGoalAppId = null;
let currentDailyGoalPhoneId = null;
let currentDailyGoalCalendarMonth = new Date().getMonth();
let currentDailyGoalCalendarYear = new Date().getFullYear();

// 打开每日目标弹窗
function openDailyGoalModal(appId, phoneId) {
    currentDailyGoalAppId = appId;
    currentDailyGoalPhoneId = phoneId;
    currentDailyGoalCalendarMonth = new Date().getMonth();
    currentDailyGoalCalendarYear = new Date().getFullYear();
    
    const modal = document.getElementById('daily-goal-modal');
    modal.style.display = 'flex';
    
    // 强制重绘以触发动画
    modal.offsetHeight;
    modal.classList.add('show');
    
    renderDailyGoalContent();
}

// 关闭每日目标弹窗
function closeDailyGoalModal() {
    const modal = document.getElementById('daily-goal-modal');
    modal.style.display = 'none';
    modal.classList.remove('show');
    currentDailyGoalAppId = null;
    currentDailyGoalPhoneId = null;
}

// 渲染每日目标内容（简化版 - 仅日历）
function renderDailyGoalContent() {
    if (!currentDailyGoalAppId) return;
    
    const data = DataManager.loadData();
    let app = null;
    
    for (const p of data.phones) {
        const found = p.apps.find(a => a.id === currentDailyGoalAppId);
        if (found) {
            app = found;
            break;
        }
    }
    
    if (!app) return;
    
    const goal = DataManager.getAppDailyGoal(currentDailyGoalAppId);
    const stats = DataManager.calculateAppAchievementStats(currentDailyGoalAppId);
    // 获取本地日期（修复时区问题）
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const titleEl = document.getElementById('daily-goal-modal-title');
    const bodyEl = document.getElementById('daily-goal-modal-body');
    
    titleEl.textContent = `📅 ${app.name} - 达标日历`;
    
    let html = `
        <!-- 顶部信息栏 -->
        <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 12px; padding: 16px; margin-bottom: 16px; color: white;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div>
                    <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">每日目标</div>
                    <div style="font-size: 24px; font-weight: bold;">¥${goal.amount.toFixed(2)}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">达标天数</div>
                    <div style="font-size: 24px; font-weight: bold;">${stats.achievedDays}天</div>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; opacity: 0.9; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.3);">
                <span>达标率: ${stats.achievementRate}%</span>
                <span>连续: ${stats.consecutiveDays}天</span>
                <span style="color: ${stats.todayAchieved ? '#90EE90' : '#FFD700'};">今日${stats.todayAchieved ? '✅已达标' : '⏳未达标'}</span>
            </div>
        </div>
        
        <!-- 今日收益状态 -->
        <div style="background: ${stats.todayAchieved ? '#f0fdf4' : '#fef2f2'}; border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid ${stats.todayAchieved ? '#86efac' : '#fecaca'};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; color: var(--text-secondary);">今日收益</span>
                <span style="font-size: 11px; padding: 2px 8px; border-radius: 10px; background: ${stats.todayAchieved ? '#dcfce7' : '#fee2e2'}; color: ${stats.todayAchieved ? '#166534' : '#991b1b'};">
                    ${stats.todayAchieved ? '✅ 已达标' : '⏳ 未达标'}
                </span>
            </div>
            <div style="font-size: 24px; font-weight: bold; color: ${stats.todayAchieved ? '#166534' : '#991b1b'};">
                ¥${stats.todayEarning?.toFixed(2) || '0.00'}
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                ${stats.todayAchieved ? `超额完成: +¥${(stats.todayEarning - goal.amount).toFixed(2)}` : `还需: ¥${(goal.amount - stats.todayEarning).toFixed(2)}`}
            </div>
            ${currentDailyGoalPhoneId ? `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid ${stats.todayAchieved ? '#86efac' : '#fecaca'};">
                <button class="btn btn-sm btn-primary" onclick="quickEditBalanceFromGoal()" style="width: 100%;">
                    💰 快速编辑余额
                </button>
            </div>
            ` : ''}
        </div>
        
        <!-- 达标日历 -->
        <div style="background: var(--bg-secondary); border-radius: 12px; padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="font-size: 14px; font-weight: 600;">📅 达标日历</div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="btn btn-sm btn-secondary" onclick="changeDailyGoalMonth(-1)">◀</button>
                    <span id="daily-goal-calendar-month" style="font-size: 13px; font-weight: 500;"></span>
                    <button class="btn btn-sm btn-secondary" onclick="changeDailyGoalMonth(1)">▶</button>
                </div>
            </div>
            <div id="daily-goal-calendar" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center;">
                <!-- 日历将由JS生成 -->
            </div>
            <div style="display: flex; gap: 16px; justify-content: center; margin-top: 12px; font-size: 11px;">
                <div style="display: flex; align-items: center; gap: 4px;">
                    <div style="width: 12px; height: 12px; background: #38ef7d; border-radius: 3px;"></div>
                    <span>达标</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <div style="width: 12px; height: 12px; background: #f5576c; border-radius: 3px;"></div>
                    <span>未达标</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <div style="width: 12px; height: 12px; background: var(--border-color); border-radius: 3px;"></div>
                    <span>无记录</span>
                </div>
            </div>
        </div>
    `;
    
    bodyEl.innerHTML = html;
    
    // 渲染日历
    renderDailyGoalCalendar();
}

// 保存软件每日目标
function saveAppDailyGoal() {
    if (!currentDailyGoalAppId) return;
    
    const input = document.getElementById('daily-goal-input');
    const enabledCheckbox = document.getElementById('daily-goal-enabled');
    const amount = parseFloat(input.value) || 0;
    const enabled = enabledCheckbox.checked;
    
    if (amount <= 0) {
        showToast('请输入有效的目标金额', 'error');
        return;
    }
    
    DataManager.saveAppDailyGoal(currentDailyGoalAppId, amount, enabled, false);
    showToast('每日目标已保存', 'success');
    renderDailyGoalContent();
}

// 切换每日目标启用状态
function toggleDailyGoalEnabled() {
    if (!currentDailyGoalAppId) return;
    
    const enabledCheckbox = document.getElementById('daily-goal-enabled');
    const input = document.getElementById('daily-goal-input');
    const amount = parseFloat(input.value) || 0;
    
    DataManager.saveAppDailyGoal(currentDailyGoalAppId, amount, enabledCheckbox.checked, false);
    showToast(enabledCheckbox.checked ? '每日目标已启用' : '每日目标已禁用', 'info');
}

// 恢复自动计算
function resetDailyGoalToAuto() {
    if (!currentDailyGoalAppId) return;
    
    const data = DataManager.loadData();
    for (const phone of data.phones) {
        const app = phone.apps.find(a => a.id === currentDailyGoalAppId);
        if (app) {
            // 清除手动设置，恢复自动计算
            app.dailyGoalAmount = 0;
            app.dailyGoalAutoCalculate = true;
            DataManager.saveData(data);
            
            showToast('已恢复自动计算', 'success');
            renderDailyGoalContent();
            return;
        }
    }
}

// 快速标记今日达标（简化版）
function quickMarkToday(achieved) {
    if (!currentDailyGoalAppId) return;
    
    const today = new Date().toISOString().split('T')[0];
    const goal = DataManager.getAppDailyGoal(currentDailyGoalAppId);
    
    // 自动记录：达标时记录目标金额作为收益，未达标时记录0
    const earnedAmount = achieved ? goal.amount : 0;
    
    DataManager.markAppDailyAchievement(currentDailyGoalAppId, today, achieved, earnedAmount);
    
    showToast(achieved ? '✅ 今日已达标' : '已取消今日达标', achieved ? 'success' : 'info');
    
    renderDailyGoalContent();
}

// 标记今日达标状态（旧版，保留兼容）
function markTodayAchievement(achieved) {
    if (!currentDailyGoalAppId) return;
    
    const earnedInput = document.getElementById('today-earned-input');
    const earnedAmount = earnedInput ? parseFloat(earnedInput.value) || 0 : 0;
    const today = new Date().toISOString().split('T')[0];
    
    DataManager.markAppDailyAchievement(currentDailyGoalAppId, today, achieved, earnedAmount);
    
    showToast(achieved ? '✅ 今日已标记为达标' : '✗ 今日已标记为未达标', achieved ? 'success' : 'info');
    
    renderDailyGoalContent();
}

// 从达标日历弹窗快速编辑余额
function quickEditBalanceFromGoal() {
    if (!currentDailyGoalAppId || !currentDailyGoalPhoneId) {
        showToast('无法编辑余额：缺少软件或手机信息', 'error');
        return;
    }
    
    // 获取当前余额
    const data = DataManager.loadData();
    const phone = data.phones.find(p => p.id === currentDailyGoalPhoneId);
    const app = phone ? phone.apps.find(a => a.id === currentDailyGoalAppId) : null;
    
    if (!app) {
        showToast('未找到软件信息', 'error');
        return;
    }
    
    const currentBalance = app.balance || 0;
    
    // 显示编辑余额弹窗
    showModal(
        '💰 快速编辑余额',
        `
            <div class="form-group">
                <label class="form-label">当前余额: ¥${currentBalance.toFixed(2)}</label>
                <input type="number" id="quick-edit-balance-input" class="form-input" value="${currentBalance.toFixed(2)}" step="0.01" placeholder="输入新余额">
                <div class="form-hint">修改余额后会自动计算今日收益</div>
            </div>
        `,
        [
            {
                text: '取消',
                class: 'btn-secondary',
                action: closeModal
            },
            {
                text: '保存',
                class: 'btn-primary',
                action: () => {
                    const newBalance = parseFloat(document.getElementById('quick-edit-balance-input').value) || 0;
                    
                    if (newBalance !== currentBalance) {
                        const result = DataManager.editApp(currentDailyGoalPhoneId, currentDailyGoalAppId, {
                            name: app.name,
                            balance: newBalance,
                            minWithdraw: app.minWithdraw || 0,
                            historicalWithdrawn: app.historicalWithdrawn || 0
                        });
                        
                        // 检查是否达到日目标
                        const updatedPhone = result.phones.find(p => p.id === currentDailyGoalPhoneId);
                        const updatedApp = updatedPhone ? updatedPhone.apps.find(a => a.id === currentDailyGoalAppId) : null;
                        
                        if (updatedApp && updatedApp._todayEarnings !== undefined) {
                            if (updatedApp._dailyTargetAchieved) {
                                showToast(`🎉 恭喜！今日收益¥${updatedApp._todayEarnings.toFixed(2)}，已达到日目标¥${updatedApp._dailyTarget.toFixed(2)}！`, 'success');
                            } else if (updatedApp._dailyTarget) {
                                const remaining = updatedApp._dailyTarget - updatedApp._todayEarnings;
                                showToast(`今日收益¥${updatedApp._todayEarnings.toFixed(2)}，距离日目标¥${updatedApp._dailyTarget.toFixed(2)}还差¥${remaining.toFixed(2)}`, 'info');
                            } else {
                                showToast(`今日收益¥${updatedApp._todayEarnings.toFixed(2)}`, 'info');
                            }
                            
                            // 清除标记
                            delete updatedApp._dailyTargetAchieved;
                            delete updatedApp._todayEarnings;
                            delete updatedApp._dailyTarget;
                            DataManager.saveData(result);
                        } else {
                            showToast('余额已更新！');
                        }
                        
                        // 刷新日历显示
                        renderDailyGoalContent();
                    }
                    
                    closeModal();
                }
            }
        ]
    );
}

// 切换月份
function changeDailyGoalMonth(delta) {
    currentDailyGoalCalendarMonth += delta;
    
    if (currentDailyGoalCalendarMonth > 11) {
        currentDailyGoalCalendarMonth = 0;
        currentDailyGoalCalendarYear++;
    } else if (currentDailyGoalCalendarMonth < 0) {
        currentDailyGoalCalendarMonth = 11;
        currentDailyGoalCalendarYear--;
    }
    
    renderDailyGoalCalendar();
}

// 渲染达标日历
function renderDailyGoalCalendar() {
    if (!currentDailyGoalAppId) return;
    
    const container = document.getElementById('daily-goal-calendar');
    const monthLabel = document.getElementById('daily-goal-calendar-month');
    if (!container || !monthLabel) return;
    
    // 获取每日收益数据和目标
    const data = DataManager.loadData();
    const goal = DataManager.getAppDailyGoal(currentDailyGoalAppId);
    let appDailyEarnings = {};
    
    for (const phone of data.phones) {
        const app = phone.apps.find(a => a.id === currentDailyGoalAppId);
        if (app && app.dailyEarnings) {
            appDailyEarnings = app.dailyEarnings;
            break;
        }
    }
    
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    monthLabel.textContent = `${currentDailyGoalCalendarYear}年 ${monthNames[currentDailyGoalCalendarMonth]}`;
    
    // 星期标题
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    let html = weekDays.map(day => `
        <div style="font-size: 11px; color: var(--text-secondary); padding: 4px;">${day}</div>
    `).join('');
    
    // 获取该月第一天和最后一天
    const firstDay = new Date(currentDailyGoalCalendarYear, currentDailyGoalCalendarMonth, 1);
    const lastDay = new Date(currentDailyGoalCalendarYear, currentDailyGoalCalendarMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const today = new Date().toISOString().split('T')[0];
    
    // 空白格子
    for (let i = 0; i < startDayOfWeek; i++) {
        html += `<div></div>`;
    }
    
    // 日期格子
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentDailyGoalCalendarYear}-${String(currentDailyGoalCalendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const earning = appDailyEarnings[dateStr];
        const isToday = dateStr === today;
        
        const earnedAmount = parseFloat(earning) || 0;
        const isAchieved = goal.amount > 0 && earnedAmount >= goal.amount;
        const hasRecord = earning !== undefined;
        
        let bgColor = 'var(--border-color)';
        let textColor = 'var(--text-secondary)';
        let emoji = '';
        
        if (hasRecord) {
            if (isAchieved) {
                bgColor = '#38ef7d';
                textColor = '#fff';
                emoji = '✓';
            } else {
                bgColor = '#f5576c';
                textColor = '#fff';
                emoji = '✗';
            }
        }
        
        html += `
            <div style="
                aspect-ratio: 1;
                background: ${bgColor};
                border-radius: 6px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-size: ${isToday ? '14px' : '12px'};
                font-weight: ${isToday ? 'bold' : 'normal'};
                color: ${textColor};
                border: ${isToday ? '2px solid #11998e' : 'none'};
                position: relative;
            " title="${dateStr}${hasRecord ? ' - 收益: ¥' + earnedAmount.toFixed(2) : ' - 无记录'}">
                <span>${day}</span>
                ${emoji ? `<span style="font-size: 10px; position: absolute; bottom: 1px;">${emoji}</span>` : ''}
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// 切换指定日期的达标状态
function toggleDateAchievement(date) {
    if (!currentDailyGoalAppId) return;
    
    const achievements = DataManager.getAppDailyAchievements(currentDailyGoalAppId, currentDailyGoalCalendarYear);
    const record = achievements[date];
    
    // 循环切换：无记录 -> 达标 -> 未达标 -> 无记录
    let newAchieved = true;
    if (record && record.achieved) {
        newAchieved = false; // 达标 -> 未达标
    } else if (record && !record.achieved) {
        // 未达标 -> 删除记录
        const data = DataManager.loadData();
        for (const phone of data.phones) {
            const app = phone.apps.find(a => a.id === currentDailyGoalAppId);
            if (app && app.dailyAchievements) {
                delete app.dailyAchievements[date];
                DataManager.saveData(data);
                renderDailyGoalCalendar();
                renderDailyGoalContent();
                showToast('记录已删除', 'info');
                return;
            }
        }
    }
    
    DataManager.markAppDailyAchievement(currentDailyGoalAppId, date, newAchieved, 0);
    renderDailyGoalCalendar();
    renderDailyGoalContent();
    showToast(newAchieved ? '✅ 已标记为达标' : '✗ 已标记为未达标', newAchieved ? 'success' : 'info');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    init();
    initCalendars();
    restoreGameTimer(); // 恢复计时器状态
    loadYearlyGoalSettings(); // 加载年度目标设置
});

// 滑动切换页面功能已禁用


