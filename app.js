// 赚钱软件管理系统 - 主应用逻辑
const DATA_KEY = 'moneyAppData';
const PHONES_KEY = 'moneyApp_phones';
const INSTALLMENTS_KEY = 'moneyApp_installments';
const EXPENSES_KEY = 'moneyApp_expenses';
const SETTINGS_KEY = 'moneyApp_settings';

// 游戏管理存储键
const DOWNLOADED_GAMES_KEY = 'moneyApp_downloadedGames';
const GAME_DRAW_HISTORY_KEY = 'moneyApp_gameDrawHistory';

// 语音输入功能
function chineseToNumber(chineseNum) {
    const digitMap = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
    const unitMap = { '十': 10, '百': 100, '千': 1000, '万': 10000 };
    let result = 0;
    let temp = 0;
    let decimalPart = 0;
    let decimalScale = 0;
    
    const parts = chineseNum.split('点');
    const integerPart = parts[0];
    const hasDecimal = parts.length > 1;
    
    for (let char of integerPart) {
        if (char === '两') char = '二';
        if (digitMap[char] !== undefined) {
            temp = temp * 10 + digitMap[char];
        } else if (unitMap[char] !== undefined) {
            if (temp === 0) temp = 1;
            result += temp * unitMap[char];
            temp = 0;
        }
    }
    result += temp;
    
    if (hasDecimal) {
        for (let char of parts[1]) {
            if (char === '两') char = '二';
            if (digitMap[char] !== undefined) {
                decimalPart = decimalPart * 10 + digitMap[char];
                decimalScale++;
            }
        }
        if (decimalScale > 0) {
            result += decimalPart / Math.pow(10, decimalScale);
        }
    }
    
    return result;
}

function parseVoiceInput(text) {
    text = text.trim().replace(/[，,]/g, ',').replace(/[。.!！？?]/g, '');
    
    const parts = text.split(',').map(p => p.trim()).filter(p => p.length > 0);
    
    if (parts.length !== 3) {
        const altParts = text.split(/[,，、\s]+/).filter(p => p.length > 0);
        if (altParts.length === 3) {
            return { phoneName: altParts[0], appName: altParts[1], balance: altParts[2] };
        }
        return null;
    }
    
    return { phoneName: parts[0], appName: parts[1], balance: parts[2] };
}

function parseBalance(balanceStr) {
    balanceStr = balanceStr.replace(/[元块圆]/g, '').replace(/\s+/g, '');
    
    if (!isNaN(parseFloat(balanceStr))) {
        return parseFloat(balanceStr);
    }
    
    const chineseNum = balanceStr.replace(/[^零一二三四五六七八九十百千万两.点]/g, '');
    if (chineseNum.length > 0) {
        return chineseToNumber(chineseNum);
    }
    
    return null;
}

function findMatchingApp(phoneName, appName) {
    const data = DataManager.loadData();
    let bestMatch = null;
    let bestScore = 0;
    
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            let score = 0;
            
            if (phone.name === phoneName) score += 30;
            else if (phone.name.includes(phoneName) || phoneName.includes(phone.name)) score += 20;
            else if (phone.name.indexOf(phoneName.substring(0, 2)) >= 0) score += 10;
            
            if (app.name === appName) score += 30;
            else if (app.name.includes(appName) || appName.includes(app.name)) score += 20;
            else if (app.name.indexOf(appName.substring(0, 2)) >= 0) score += 10;
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = { phone, app };
            }
        });
    });
    
    return bestScore >= 20 ? bestMatch : null;
}

function startVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showToast('您的浏览器不支持语音识别，请使用Chrome或Safari浏览器', 'error');
        return;
    }
    
    if (window.location.protocol === 'file:') {
        showToast('语音识别需要在服务器环境下运行（如localhost或HTTPS），请使用本地服务器打开', 'error');
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    
    let timeoutId = null;
    let isCompleted = false;
    
    closeModal();
    
    showModal('🎤 语音输入', `
        <div style="text-align: center; padding: 40px 20px;">
            <div style="font-size: 60px; margin-bottom: 20px;">🎤</div>
            <div style="font-size: 16px; color: var(--text-primary); margin-bottom: 8px;">请说出：手机名称，软件名称，余额</div>
            <div style="font-size: 12px; color: var(--text-secondary);">例如：小米手机，抖音，三十五点五</div>
            <div id="voice-listening-indicator" style="margin-top: 20px;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: #ef4444; animation: pulse 1s infinite;"></div>
                <div style="font-size: 12px; color: #ef4444; margin-top: 8px;">正在听...</div>
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 16px;">请说完后稍等片刻，系统会自动识别</div>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: function() { 
            isCompleted = true;
            clearTimeout(timeoutId);
            recognition.stop(); 
            closeModal(); 
        } }
    ]);
    
    const cleanup = function() {
        isCompleted = true;
        clearTimeout(timeoutId);
        recognition.stop();
    };
    
    recognition.onresult = function(event) {
        cleanup();
        closeModal();
        
        const text = event.results[0][0].transcript;
        console.log('语音识别结果:', text);
        
        const parsed = parseVoiceInput(text);
        if (!parsed) {
            showToast('无法识别语音格式，请按照"手机名称，软件名称，余额"的格式重新说', 'error');
            return;
        }
        
        const balance = parseBalance(parsed.balance);
        if (balance === null || isNaN(balance) || balance < 0) {
            showToast('无法识别余额，请重新输入', 'error');
            return;
        }
        
        const match = findMatchingApp(parsed.phoneName, parsed.appName);
        if (!match) {
            showToast(`未找到匹配的手机"${parsed.phoneName}"和软件"${parsed.appName}"`, 'error');
            return;
        }
        
        showVoiceEditConfirm(match, parsed, balance);
    };
    
    recognition.onerror = function(event) {
        cleanup();
        closeModal();
        
        let errorMsg = '语音识别失败';
        switch (event.error) {
            case 'not-allowed':
                errorMsg = '请允许麦克风权限后重试';
                break;
            case 'no-speech':
                errorMsg = '未检测到语音，请重试';
                break;
            case 'audio-capture':
                errorMsg = '未找到麦克风设备';
                break;
            case 'network':
                errorMsg = '网络错误，请检查网络连接';
                break;
            default:
                errorMsg = '语音识别失败：' + event.error;
        }
        showToast(errorMsg, 'error');
    };
    
    recognition.onend = function() {
        if (!isCompleted) {
            const indicator = document.getElementById('voice-listening-indicator');
            if (indicator) {
                indicator.innerHTML = '<div style="font-size: 12px; color: var(--text-secondary);">已停止监听</div>';
            }
        }
    };
    
    timeoutId = setTimeout(function() {
        if (!isCompleted) {
            cleanup();
            closeModal();
            showToast('语音识别超时，请重试', 'error');
        }
    }, 15000);
    
    try {
        recognition.start();
    } catch (error) {
        cleanup();
        closeModal();
        showToast('无法启动语音识别：' + error.message, 'error');
    }
}

function parseTextInput() {
    const inputEl = document.getElementById('quick-text-input');
    if (!inputEl) return;
    
    const text = inputEl.value.trim();
    if (!text) {
        showToast('请输入内容', 'error');
        return;
    }
    
    const parsed = parseVoiceInput(text);
    if (!parsed) {
        showToast('格式错误，请按照"手机名称，软件名称，余额"的格式输入', 'error');
        return;
    }
    
    const balance = parseBalance(parsed.balance);
    if (balance === null || isNaN(balance) || balance < 0) {
        showToast('无法识别余额，请重新输入', 'error');
        return;
    }
    
    const match = findMatchingApp(parsed.phoneName, parsed.appName);
    if (!match) {
        showToast(`未找到匹配的手机"${parsed.phoneName}"和软件"${parsed.appName}"`, 'error');
        return;
    }
    
    closeModal();
    showVoiceEditConfirm(match, parsed, balance);
}

function showVoiceEditConfirm(match, parsed, balance) {
    const { phone, app } = match;
    const currentBalance = app.balance || 0;
    const change = balance - currentBalance;
    
    showModal('确认修改余额', `
        <div style="padding: 10px 0;">
            <div class="form-group">
                <label class="form-label">手机名称</label>
                <input type="text" class="form-input" value="${phone.name}" disabled>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">语音识别：${parsed.phoneName}</div>
            </div>
            <div class="form-group">
                <label class="form-label">软件名称</label>
                <input type="text" class="form-input" value="${app.name}" disabled>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">语音识别：${parsed.appName}</div>
            </div>
            <div class="form-group">
                <label class="form-label">当前余额</label>
                <input type="text" class="form-input" value="¥${currentBalance.toFixed(2)}" disabled>
            </div>
            <div class="form-group">
                <label class="form-label">新余额</label>
                <input type="text" class="form-input" value="¥${balance.toFixed(2)}" disabled>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">语音识别：${parsed.balance}</div>
            </div>
            <div style="padding: 12px; background: ${change >= 0 ? '#f0fdf4' : '#fef2f2'}; border-radius: 8px; margin-top: 8px;">
                <div style="font-size: 14px; font-weight: 600; color: ${change >= 0 ? '#166534' : '#991b1b'};">
                    ${change >= 0 ? '+' : ''}¥${change.toFixed(2)}
                </div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                    ${change >= 0 ? '余额增加' : '余额减少'}
                </div>
            </div>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        {
            text: '确认保存',
            class: 'btn-primary',
            action: function() {
                try {
                    DataManager.editApp(phone.id, app.id, {
                        name: app.name,
                        balance: balance,
                        minWithdraw: app.minWithdraw || 0,
                        highWithdraw: app.highWithdraw || 0,
                        clearPeriod: app.clearPeriod || 0,
                        historicalWithdrawn: app.historicalWithdrawn || 0
                    });
                    
                    closeModal();
                    showToast('余额修改成功', 'success');
                    renderPhones();
                    renderTotalEarnings();
                    renderYearlyGoal();
                } catch (error) {
                    showToast('保存失败：' + error.message, 'error');
                }
            }
        }
    ]);
}

// ==================== 通用计算函数 ====================

// 计算软件的已赚金额（累计）= 当前余额 + 已提现金额 + 历史提现金额
function calculateAppEarned(app) {
    const balance = app.balance || 0;
    const withdrawn = (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
    return balance + withdrawn;
}

// 计算手机的总已赚金额
function calculatePhoneTotalEarned(phone) {
    return phone.apps.reduce((sum, app) => sum + calculateAppEarned(app), 0);
}

// 计算手机的总提现金额（仅已提现部分，不含余额）
function calculatePhoneTotalWithdrawn(phone) {
    return phone.apps.reduce((sum, app) => {
        return sum + (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
    }, 0);
}

// 全局变量和辅助函数定义
let modalIsShowing = false;

// 显示模态框
function showModal(title, body, buttons, enableScroll = false) {
    console.log('showModal called with:', title, buttons.length);
    // 防止重复触发
    if (modalIsShowing) {
        console.log('modalIsShowing is true, returning');
        return;
    }
    
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
        buttons.forEach((btn, index) => {
            const button = document.createElement('button');
            button.className = `btn ${btn.class}`;
            button.textContent = btn.text;
            // 为每个按钮添加唯一标识，用于防重复
            button.dataset.btnIndex = index;
            button.dataset.btnText = btn.text;
            
            // 包装action函数，添加防重复点击机制
            let isProcessing = false;
            const wrappedAction = function(e) {
                // 防重复策略6: 按钮级别的防重复点击
                if (isProcessing) {
                    console.log(`按钮 "${btn.text}" 正在处理中，跳过重复点击`);
                    return;
                }
                
                // 对于保存/确认类按钮，添加额外防护
                if (btn.text.includes('保存') || btn.text.includes('确认') || btn.text.includes('添加')) {
                    isProcessing = true;
                    button.disabled = true;
                    button.style.opacity = '0.7';
                    
                    // 执行原始action
                    try {
                        btn.action.call(this, e);
                    } catch (error) {
                        console.error('按钮操作执行失败:', error);
                    }
                    
                    // 3秒后恢复按钮状态（如果模态框还开着）
                    setTimeout(() => {
                        isProcessing = false;
                        if (document.getElementById('modal').style.display !== 'none') {
                            button.disabled = false;
                            button.style.opacity = '1';
                        }
                    }, 3000);
                } else {
                    // 普通按钮直接执行
                    btn.action.call(this, e);
                }
            };
            
            button.addEventListener('click', wrappedAction);
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
    console.log('modalIsShowing set to true');
    
    // 设置更高的z-index，确保在其他弹窗之上
    modal.style.zIndex = '2000';
    console.log('modal z-index set to 2000');
    
    // 先设置为flex，然后添加show类触发动画
    modal.style.display = 'flex';
    console.log('modal display set to flex');
    // 使用setTimeout确保DOM更新后再添加类
    setTimeout(() => {
        console.log('Adding show class to modal');
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
// 防重复提示机制
let lastToastTime = 0;
const TOAST_DELAY = 3000; // 3秒内不显示任何提示
let toastTimeout = null;
let isToastVisible = false;
let currentToastMessage = '';
let currentToastType = '';
let currentGamePhoneId = null;

// 全局操作锁 - 防止同一操作重复执行
const operationLocks = new Map();
const LOCK_DURATION = 3000; // 3秒锁定时间

// 获取操作锁
function acquireLock(operationKey) {
    const now = Date.now();
    const lastOperation = operationLocks.get(operationKey);
    
    if (lastOperation && (now - lastOperation) < LOCK_DURATION) {
        console.log(`操作被锁定: ${operationKey}`);
        return false;
    }
    
    operationLocks.set(operationKey, now);
    return true;
}

// 释放操作锁
function releaseLock(operationKey) {
    operationLocks.delete(operationKey);
}

// 带锁的操作包装器
function withLock(operationKey, fn) {
    if (!acquireLock(operationKey)) {
        console.log(`操作 ${operationKey} 正在执行中，跳过`);
        return;
    }
    
    try {
        return fn();
    } finally {
        // 延迟释放锁，确保操作完全完成
        setTimeout(() => releaseLock(operationKey), LOCK_DURATION);
    }
}

function showToast(message, type = 'info') {
    // 打印调用信息
    console.log('showToast 被调用:', { message, type, timestamp: new Date().toISOString() });
    
    const now = Date.now();
    
    // 防重复策略1: 3秒内不显示完全相同的提示（消息+类型都相同）
    if ((now - lastToastTime) < TOAST_DELAY && message === currentToastMessage && type === currentToastType) {
        console.log('短时间内重复相同提示被阻止:', message);
        return;
    }
    
    // 防重复策略2: 800毫秒内不显示任何提示（无论消息是否相同）
    if ((now - lastToastTime) < 800) {
        console.log('短时间内不显示新提示:', message);
        return;
    }
    
    // 立即更新时间和状态，防止并发调用
    lastToastTime = now;
    currentToastMessage = message;
    currentToastType = type;
    
    // 防重复策略3: 如果已有提示正在显示，替换内容但不重复动画
    if (isToastVisible) {
        console.log('提示已在显示中，更新内容:', message);
        // 更新现有提示的内容而不是创建新的
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.className = `toast ${type}`;
            // 重置自动隐藏计时器
            if (toastTimeout) {
                clearTimeout(toastTimeout);
            }
            toastTimeout = setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(-50%) translateY(-20px)';
                setTimeout(() => {
                    toast.style.display = 'none';
                    isToastVisible = false;
                    currentToastMessage = '';
                    currentToastType = '';
                    toastTimeout = null;
                }, 300);
            }, 3000);
            return;
        }
    }
    
    // 清除之前的超时
    if (toastTimeout) {
        clearTimeout(toastTimeout);
        toastTimeout = null;
    }
    
    isToastVisible = true;
    
    // 确保 toast 元素存在
    let toast = document.getElementById('toast');
    if (!toast) {
        // 如果 toast 元素不存在，创建一个
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.padding = '12px 24px';
        toast.style.borderRadius = '8px';
        toast.style.color = 'white';
        toast.style.fontSize = '14px';
        toast.style.fontWeight = '600';
        toast.style.zIndex = '9999';
        toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        toast.style.display = 'none';
        document.body.appendChild(toast);
    }
    
    // 设置提示内容和样式
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';
    
    // 触发动画
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);
    
    // 设置自动隐藏
    toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        
        setTimeout(() => {
            toast.style.display = 'none';
            isToastVisible = false;
            currentToastMessage = '';
            toastTimeout = null;
        }, 300);
    }, 3000);
}

function showSuccess(message) {
    showToast(message, 'success');
}

function showError(message) {
    showToast(message, 'error');
}

function showWarning(message) {
    showToast(message, 'warning');
}

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
    const today = getCurrentDate();
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
                        <div class="phase-goal-item" style="padding: 16px; margin-bottom: 12px; background: white; border-radius: var(--radius-md); border: 3px solid var(--border-color); box-shadow: var(--shadow-card); border-left: 4px solid ${index === 0 ? '#22c55e' : '#3b82f6'};">
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
    
    // 计算该手机的总提现金额（仅已提现部分）
    const totalWithdrawn = calculatePhoneTotalWithdrawn(phone);
    
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
    
    // 计算累计提现金额（仅已提现部分，不含余额）
    const totalWithdrawn = (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
    const totalWithdrawals = app.withdrawals ? app.withdrawals.length : 0;
    
    const today = getCurrentDate();
    const todayActivity = app.activityLog && app.activityLog[today];
    const isActiveToday = todayActivity && todayActivity.active;
    const activityDuration = todayActivity && todayActivity.duration ? todayActivity.duration : 0;
    const todayEarning = parseFloat(app.dailyEarnings && app.dailyEarnings[today]) || 0;
    
    const totalEarned = app.balance + (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
    const minWithdraw = app.minWithdraw || 0.3;
    const daysCanWait = Math.floor(totalEarned / minWithdraw);
    const startDate = app.earningStartDate ? new Date(app.earningStartDate) : new Date();
    const nextPlayDate = new Date(startDate);
    nextPlayDate.setDate(startDate.getDate() + daysCanWait);
    const daysUntilNextPlay = Math.max(0, Math.round((nextPlayDate - new Date(today)) / (1000 * 60 * 60 * 24)));
    
    let activityStatus = '';
    if (isActiveToday) {
        const durationText = activityDuration > 0 ? `(${activityDuration}分钟)` : '';
        activityStatus = `<span style="background: rgba(16,185,129,0.15); color: #10b981; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">✅ 已活跃${durationText}</span>`;
    } else if (daysUntilNextPlay === 0) {
        activityStatus = '<span style="background: rgba(239,68,68,0.15); color: #ef4444; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">⚠️ 需立即玩</span>';
    } else if (daysUntilNextPlay <= 3) {
        activityStatus = '<span style="background: rgba(245,158,11,0.15); color: #f59e0b; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">⏳ ' + daysUntilNextPlay + '天后</span>';
    }
    
    // 更新卡片内容
    targetCard.innerHTML = `
        <div class="app-header">
            <span class="app-name">${app.name}</span>
            <span class="status-tag ${totalWithdrawals > 0 ? 'ready' : 'pending'}">
                ${totalWithdrawals > 0 ? '有记录' : '新软件'}
            </span>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div class="app-core-info">
                <span class="core-label">当前余额:</span>
                <span class="core-value">¥${(app.balance || 0).toFixed(2)}</span>
            </div>
            ${activityStatus}
        </div>
        <div class="app-info-row">
            <span>累计提现: ¥${totalWithdrawn.toFixed(2)} · 今日赚取: ¥${todayEarning.toFixed(2)} · 提现次数: ${totalWithdrawals}次</span>
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
                if (app.highWithdraw === undefined) {
                    app.highWithdraw = 0;
                    needsMigration = true;
                }
                if (app.clearPeriod === undefined) {
                    app.clearPeriod = 0;
                    needsMigration = true;
                }
                if (app.lastLoginDate === undefined) {
                    app.lastLoginDate = getCurrentDate();
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
                if (app.activityLog === undefined) {
                    app.activityLog = {};
                    needsMigration = true;
                }
                if (app.activityLog && typeof app.activityLog === 'object') {
                    const keys = Object.keys(app.activityLog);
                    for (const key of keys) {
                        if (typeof app.activityLog[key] === 'boolean') {
                            app.activityLog[key] = {
                                active: app.activityLog[key],
                                duration: 0
                            };
                            needsMigration = true;
                        }
                    }
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

    // ==================== 活跃记录功能 ====================

    static getTodayActiveApps(phoneId = null, limit = 5) {
        const data = this.loadData();
        const today = getCurrentDate();
        
        const appList = [];
        let totalTodayEarning = 0;
        let earningAppCount = 0;
        
        const phones = phoneId ? data.phones.filter(p => p.id === phoneId) : data.phones;
        
        phones.forEach(phone => {
            (phone.apps || []).forEach(app => {
                const totalEarned = app.balance + (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
                const minWithdraw = app.minWithdraw || 0.3;
                
                const daysCanWait = Math.floor(totalEarned / minWithdraw);
                const startDate = app.earningStartDate ? new Date(app.earningStartDate) : new Date();
                const nextPlayDate = new Date(startDate);
                nextPlayDate.setDate(startDate.getDate() + daysCanWait);
                
                const daysUntilNextPlay = Math.max(0, Math.round((nextPlayDate - new Date(today)) / (1000 * 60 * 60 * 24)));
                
                let priority = 0;
                if (daysUntilNextPlay === 0) priority = 4;
                else if (daysUntilNextPlay <= 3) priority = 3;
                else if (daysUntilNextPlay <= 7) priority = 2;
                else priority = 1;
                
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
                const wasActiveYesterday = app.activityLog && app.activityLog[yesterdayStr] && app.activityLog[yesterdayStr].active;
                
                const todayEarning = parseFloat(app.dailyEarnings && app.dailyEarnings[today]) || 0;
                
                if (todayEarning > 0) {
                    totalTodayEarning += todayEarning;
                    earningAppCount++;
                }
                
                const todayActivity = app.activityLog && app.activityLog[today];
                const isActiveToday = todayActivity && todayActivity.active;
                const activityDuration = todayActivity && todayActivity.duration ? todayActivity.duration : 0;
                
                appList.push({
                    id: app.id,
                    name: app.name,
                    phoneId: phone.id,
                    phoneName: phone.name,
                    balance: app.balance || 0,
                    minWithdraw: minWithdraw,
                    totalEarned: totalEarned,
                    daysUntilNextPlay: daysUntilNextPlay,
                    nextPlayDate: nextPlayDate,
                    priority: priority,
                    wasActiveYesterday: wasActiveYesterday,
                    isActiveToday: isActiveToday,
                    activityDuration: activityDuration,
                    todayEarning: todayEarning,
                    clearPeriod: app.clearPeriod || 0
                });
            });
        });
        
        const averageEarning = earningAppCount > 0 ? totalTodayEarning / earningAppCount : 0;
        
        appList.forEach(app => {
            app.belowAverageEarning = app.todayEarning > 0 && app.todayEarning < averageEarning;
            app.averageEarning = averageEarning;
            
            const baseDuration = 10;
            
            const urgencyBonus = Math.max(0, 10 - app.daysUntilNextPlay);
            
            const earningBonus = app.belowAverageEarning ? 3 : 0;
            
            const targetWithdraw = app.highWithdraw > 0 ? app.highWithdraw : app.minWithdraw;
            const remainingToTarget = Math.max(0, targetWithdraw - app.balance);
            const avgDailyEarning = app.totalEarned > 0 && app.totalEarned / (app.daysUntilNextPlay + 1) > 0 
                ? app.totalEarned / (app.daysUntilNextPlay + 1) 
                : 0.01;
            const withdrawBonus = Math.min(5, Math.floor(remainingToTarget / avgDailyEarning));
            
            const clearPeriod = app.clearPeriod || 0;
            const clearPeriodAdjust = Math.max(-5, -Math.floor(clearPeriod / 7));
            
            let recommendedDuration = baseDuration + urgencyBonus + earningBonus + withdrawBonus + clearPeriodAdjust;
            recommendedDuration = Math.max(5, Math.min(30, recommendedDuration));
            recommendedDuration = Math.round(recommendedDuration / 5) * 5;
            
            app.recommendedDuration = recommendedDuration;
            app.durationBreakdown = {
                base: baseDuration,
                urgency: urgencyBonus,
                earning: earningBonus,
                withdraw: withdrawBonus,
                clearPeriod: clearPeriodAdjust
            };
        });
        
        appList.sort((a, b) => {
            if (a.priority !== b.priority) return b.priority - a.priority;
            const aScore = (a.belowAverageEarning ? 1 : 0) + (a.wasActiveYesterday ? 0 : 0.5);
            const bScore = (b.belowAverageEarning ? 1 : 0) + (b.wasActiveYesterday ? 0 : 0.5);
            if (aScore !== bScore) return bScore - aScore;
            return a.daysUntilNextPlay - b.daysUntilNextPlay;
        });
        
        return appList.slice(0, limit);
    }

    static recordAppActivity(phoneId, appId, date = null, active = true, duration = 0) {
        const data = this.loadData();
        const today = date || getCurrentDate();
        
        const phone = data.phones.find(p => p.id === phoneId);
        if (!phone) return false;
        
        const app = phone.apps.find(a => a.id === appId);
        if (!app) return false;
        
        if (!app.activityLog) {
            app.activityLog = {};
        }
        
        const existingRecord = app.activityLog[today];
        app.activityLog[today] = {
            active: active,
            duration: active ? (duration > 0 ? duration : (existingRecord && existingRecord.duration ? existingRecord.duration : 0)) : 0
        };
        app.lastUpdated = new Date().toISOString();
        
        if (active) {
            app.lastLoginDate = today;
        }
        
        this.saveData(data);
        return true;
    }

    static getActivityHistory(phoneId = null, days = 7) {
        const data = this.loadData();
        const history = {};
        
        const phones = phoneId ? data.phones.filter(p => p.id === phoneId) : data.phones;
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            
            history[dateStr] = {
                date: dateStr,
                activeApps: [],
                totalApps: 0
            };
            
            phones.forEach(phone => {
                (phone.apps || []).forEach(app => {
                    history[dateStr].totalApps++;
                    if (app.activityLog && app.activityLog[dateStr]) {
                        history[dateStr].activeApps.push({
                            appId: app.id,
                            appName: app.name,
                            phoneId: phone.id,
                            phoneName: phone.name,
                            balance: app.balance || 0
                        });
                    }
                });
            });
        }
        
        return history;
    }

    static getActivityStats(phoneId = null, days = 30) {
        const history = this.getActivityHistory(phoneId, days);
        const recordList = Object.values(history);
        
        const activeDays = recordList.filter(r => r.activeApps.length > 0).length;
        const totalApps = recordList.length > 0 ? recordList[0].totalApps : 0;
        
        let totalActiveCount = 0;
        recordList.forEach(r => {
            totalActiveCount += r.activeApps.length;
        });
        
        const avgDailyActive = recordList.length > 0 ? (totalActiveCount / recordList.length).toFixed(1) : 0;
        const activeRate = recordList.length > 0 ? ((activeDays / recordList.length) * 100).toFixed(1) : 0;
        
        return {
            activeDays: activeDays,
            totalDays: recordList.length,
            avgDailyActive: parseFloat(avgDailyActive),
            activeRate: parseFloat(activeRate),
            totalApps: totalApps,
            history: history
        };
    }

    // ==================== 年度目标功能 ====================

    // 获取年度目标设置
    static getYearlyGoal() {
        const settings = localStorage.getItem(SETTINGS_KEY);
        const parsed = settings ? JSON.parse(settings) : {};
        const currentYear = new Date().getFullYear();
        
        const mode = parsed.yearlyGoalMode || 'custom';
        let amount = parsed.yearlyGoalAmount || 0;
        
        // 如果是最小提现模式，动态计算目标金额
        if (mode === 'minWithdraw') {
            const minWithdrawGoal = this.calculateYearlyGoalFromMinWithdraw(false); // false 表示不保存
            amount = minWithdrawGoal.totalYearlyGoal;
        }
        
        return {
            amount: amount,
            year: parsed.yearlyGoalYear || currentYear,
            autoDistribute: parsed.yearlyGoalAutoDistribute !== false,
            mode: mode,
            customAmount: parsed.yearlyGoalAmount || 0
        };
    }
    
    // 保存年度目标
    static saveYearlyGoal(amount, year, autoDistribute = true, mode = 'custom') {
        const settings = localStorage.getItem(SETTINGS_KEY);
        const parsed = settings ? JSON.parse(settings) : {};
        parsed.yearlyGoalAmount = parseFloat(amount) || 0;
        parsed.yearlyGoalYear = parseInt(year) || new Date().getFullYear();
        parsed.yearlyGoalAutoDistribute = autoDistribute;
        parsed.yearlyGoalMode = mode;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
    }
    
    // 保存年度目标历史
    static saveYearlyGoalHistory(year, goalAmount, actualAmount) {
        const settings = localStorage.getItem(SETTINGS_KEY);
        const parsed = settings ? JSON.parse(settings) : {};
        
        if (!parsed.yearlyGoalHistory) {
            parsed.yearlyGoalHistory = [];
        }
        
        // 检查是否已有该年份的记录
        const existingIndex = parsed.yearlyGoalHistory.findIndex(item => item.year === year);
        
        if (existingIndex >= 0) {
            // 更新现有记录
            parsed.yearlyGoalHistory[existingIndex] = {
                year: year,
                goalAmount: goalAmount,
                actualAmount: actualAmount,
                completed: actualAmount >= goalAmount,
                completionRate: goalAmount > 0 ? (actualAmount / goalAmount) * 100 : 0,
                updatedAt: new Date().toISOString()
            };
        } else {
            // 添加新记录
            parsed.yearlyGoalHistory.push({
                year: year,
                goalAmount: goalAmount,
                actualAmount: actualAmount,
                completed: actualAmount >= goalAmount,
                completionRate: goalAmount > 0 ? (actualAmount / goalAmount) * 100 : 0,
                updatedAt: new Date().toISOString()
            });
        }
        
        // 按年份排序
        parsed.yearlyGoalHistory.sort((a, b) => b.year - a.year);
        
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
    }
    
    // 获取年度目标历史
    static getYearlyGoalHistory() {
        const settings = localStorage.getItem(SETTINGS_KEY);
        const parsed = settings ? JSON.parse(settings) : {};
        return parsed.yearlyGoalHistory || [];
    }
    
    // 获取指定年份的总收益
    static getYearlyEarnings(year) {
        const data = this.loadData();
        const startDate = new Date(`${year}-01-01`);
        const endDate = new Date(`${year}-12-31`);
        
        let totalEarnings = 0;
        
        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                if (app.withdrawals) {
                    app.withdrawals.forEach(withdrawal => {
                        const withdrawDate = new Date(withdrawal.date);
                        if (withdrawDate >= startDate && withdrawDate <= endDate) {
                            totalEarnings += withdrawal.amount;
                        }
                    });
                }
                // 加上历史提现金额
                if (app.historicalWithdrawn) {
                    totalEarnings += app.historicalWithdrawn;
                }
            });
        });
        
        return totalEarnings;
    }
    
    // 基于软件最小提现金额计算年度目标
    static calculateYearlyGoalFromMinWithdraw(save = true) {
        const data = this.loadData();
        const allApps = data.phones.flatMap(phone => phone.apps);
        
        // 计算每个软件的年度目标（最小提现金额 * 365天）
        const appYearlyGoals = allApps.map(app => {
            // 处理异常值：最小提现金额不能为负数或过大
            let minWithdraw = app.minWithdraw || 0.3; // 默认最小提现0.3元
            // 限制最小提现金额范围：0.1-10元
            minWithdraw = Math.max(0.1, Math.min(10, minWithdraw));
            const yearlyGoal = minWithdraw * 365;
            return {
                appId: app.id,
                appName: app.name,
                minWithdraw: minWithdraw,
                yearlyGoal: yearlyGoal
            };
        });
        
        // 计算总年度目标
        const totalYearlyGoal = appYearlyGoals.reduce((sum, app) => sum + app.yearlyGoal, 0);
        
        // 保存总年度目标（如果需要）
        if (save) {
            this.saveYearlyGoal(totalYearlyGoal, new Date().getFullYear(), undefined, 'minWithdraw');
        }
        
        return {
            totalYearlyGoal: totalYearlyGoal,
            appYearlyGoals: appYearlyGoals
        };
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

    // 计算目标分配（平均分配）
    static calculateYearlyGoalDistribution() {
        const goal = this.getYearlyGoal();
        const stats = this.getAppsYearlyStats(goal.year);
        const data = this.loadData();

        if (goal.amount <= 0 || stats.length === 0) {
            return { goal: goal, apps: [], totalEarned: 0, remaining: 0, progress: 0 };
        }

        // 计算总赚取金额
        const totalEarned = stats.reduce((sum, s) => sum + s.totalEarned, 0);
        const remaining = Math.max(0, goal.amount - totalEarned);
        const progress = Math.min(100, (totalEarned / goal.amount * 100)).toFixed(1);

        // 计算每个软件的年目标（基于最小提现金额）
        const apps = stats.map((stat, index) => {
            // 找到对应的app对象以获取最小提现金额
            const app = data.phones.flatMap(phone => phone.apps).find(a => a.id === stat.appId);
            let minWithdraw = app ? app.minWithdraw || 0.3 : 0.3;
            // 限制最小提现金额范围：0.1-10元
            minWithdraw = Math.max(0.1, Math.min(10, minWithdraw));
            const yearlyTargetPerApp = minWithdraw * 365;
            const dailyTargetPerApp = yearlyTargetPerApp / 365;
            
            // 计算差额
            const diff = stat.totalEarned - yearlyTargetPerApp;

            return {
                ...stat,
                minWithdraw: minWithdraw,
                baseTarget: yearlyTargetPerApp,
                adjustedTarget: yearlyTargetPerApp,
                performanceFactor: 1.0,
                rank: index + 1,
                diff: diff,
                status: diff >= 0 ? '超额' : '缺口',
                progress: stat.totalEarned / yearlyTargetPerApp * 100,
                // 日目标 = 年目标 / 365
                dailyTarget: dailyTargetPerApp,
                // 预测完成时间
                predictedCompletion: this.calculateAppPredictedCompletion(app)
            };
        });

        // 计算总目标（基于所有软件的最小提现金额）
        const totalYearlyGoal = apps.reduce((sum, app) => sum + app.baseTarget, 0);

        // 根据模式确定最终目标金额
        const finalGoalAmount = goal.mode === 'minWithdraw' ? totalYearlyGoal : goal.amount;

        return {
            goal: {
                ...goal,
                amount: finalGoalAmount
            },
            apps: apps,
            totalEarned: totalEarned,
            remaining: Math.max(0, finalGoalAmount - totalEarned),
            progress: Math.min(100, (totalEarned / finalGoalAmount * 100)).toFixed(1),
            estimatedDays: 365,
            avgDailyEarnings: totalEarned / 365
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

    // 获取软件的每日目标（新的计算逻辑）
    // 软件日目标 = 日目标 ÷ 软件数量
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
                
                // 使用新的计算方式
                const dailyTargetInfo = this.calculateYearlyDailyTarget();
                
                if (dailyTargetInfo.isValid && dailyTargetInfo.perAppDailyTarget > 0) {
                    // 基础每日目标 = 日目标 ÷ 软件数量
                    const baseDailyGoal = dailyTargetInfo.perAppDailyTarget;
                    
                    // 动态调整：根据昨日完成情况调整今日目标
                    const adjustedDailyGoal = this.calculateAdjustedDailyGoal(appId, baseDailyGoal);
                    
                    return {
                        amount: adjustedDailyGoal,
                        enabled: app.dailyGoalEnabled !== false,
                        autoCalculate: true,
                        yearlyTarget: dailyTargetInfo.yearlyGoal / dailyTargetInfo.totalApps,
                        baseDailyGoal: baseDailyGoal,
                        isAdjusted: adjustedDailyGoal !== baseDailyGoal
                    };
                }
                
                // 如果没有有效目标，返回0
                return {
                    amount: 0,
                    enabled: app.dailyGoalEnabled !== false,
                    autoCalculate: true,
                    yearlyTarget: 0
                };
            }
        }
        return { amount: 0, enabled: false, autoCalculate: true, yearlyYear: 0 };
    }
    
    // 计算调整后的每日目标（根据昨日完成情况）
    static calculateAdjustedDailyGoal(appId, baseDailyGoal) {
        const data = this.loadData();
        
        // 查找应用
        let app = null;
        for (const phone of data.phones) {
            app = phone.apps.find(a => a.id === appId);
            if (app) break;
        }
        if (!app) return baseDailyGoal;
        
        // 获取昨天日期
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        
        // 获取昨日收益
        const yesterdayEarning = app.dailyEarnings && app.dailyEarnings[yesterdayStr] 
            ? parseFloat(app.dailyEarnings[yesterdayStr]) || 0 
            : 0;
        
        // 获取昨日目标
        const yesterdayGoal = baseDailyGoal; // 使用基础目标作为昨日目标
        
        // 计算超额/缺口
        const diff = yesterdayEarning - yesterdayGoal;
        
        // 如果昨日超额完成，今日目标降低
        if (diff > 0) {
            // 超额比例（最多降低50%）
            const surplusRatio = Math.min(diff / yesterdayGoal, 1);
            const reductionFactor = 0.3 * surplusRatio; // 最多降低30%
            const adjustedGoal = baseDailyGoal * (1 - reductionFactor);
            return Math.max(adjustedGoal, baseDailyGoal * 0.5); // 最低不低于基础目标的50%
        }
        
        // 如果昨日未完成，今日目标保持不变（不增加压力）
        return baseDailyGoal;
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

    // 获取今日总赚取金额
    static getTodayTotalEarnings() {
        const data = this.loadData();
        const today = getCurrentDate();
        let totalEarned = 0;
        
        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                if (app.balanceHistory && app.balanceHistory.length > 0) {
                    const todayRecord = app.balanceHistory.find(record => record.date === today);
                    if (todayRecord && todayRecord.change > 0) {
                        totalEarned += parseFloat(todayRecord.change) || 0;
                    }
                }
            });
        });
        
        return totalEarned;
    }
    
    // 获取最近N天的每日赚取记录
    static getRecentDailyEarnings(days) {
        const data = this.loadData();
        const result = [];
        
        // 获取最近N天的日期
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            
            let dayEarned = 0;
            data.phones.forEach(phone => {
                phone.apps.forEach(app => {
                    if (app.balanceHistory && app.balanceHistory.length > 0) {
                        const dateRecord = app.balanceHistory.find(record => record.date === dateStr);
                        if (dateRecord && dateRecord.change > 0) {
                            dayEarned += parseFloat(dateRecord.change) || 0;
                        }
                    }
                });
            });
            
            result.push({
                date: dateStr,
                amount: dayEarned
            });
        }
        
        return result;
    }
    
    // 获取所有有记录的每日赚取记录（返回今天及以前的记录）
    static getAllDailyEarnings() {
        const data = this.loadData();
        const dailyTotals = {};
        const today = getCurrentDate();
        
        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                if (app.balanceHistory && app.balanceHistory.length > 0) {
                    app.balanceHistory.forEach(record => {
                        if (record.date <= today && record.change > 0) {
                            if (!dailyTotals[record.date]) {
                                dailyTotals[record.date] = 0;
                            }
                            dailyTotals[record.date] += parseFloat(record.change) || 0;
                        }
                    });
                }
            });
        });
        
        if (!dailyTotals[today]) {
            dailyTotals[today] = 0;
        }
        
        const result = Object.entries(dailyTotals)
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => {
                if (a.date === today) return -1;
                if (b.date === today) return 1;
                return new Date(b.date) - new Date(a.date);
            });
        
        return result;
    }

    // 获取每台手机每天的赚取记录
    static getPhoneDailyEarnings() {
        const data = this.loadData();
        const today = getCurrentDate();
        const phoneDailyEarnings = {};
        
        data.phones.forEach(phone => {
            phoneDailyEarnings[phone.id] = {
                phoneName: phone.name,
                dailyEarnings: {}
            };
            
            phone.apps.forEach(app => {
                if (app.balanceHistory && app.balanceHistory.length > 0) {
                    app.balanceHistory.forEach(record => {
                        if (record.date <= today && record.change > 0) {
                            if (!phoneDailyEarnings[phone.id].dailyEarnings[record.date]) {
                                phoneDailyEarnings[phone.id].dailyEarnings[record.date] = 0;
                            }
                            phoneDailyEarnings[phone.id].dailyEarnings[record.date] += parseFloat(record.change) || 0;
                        }
                    });
                } else if (app.dailyEarnings) {
                    Object.entries(app.dailyEarnings).forEach(([date, amount]) => {
                        if (date <= today) {
                            if (!phoneDailyEarnings[phone.id].dailyEarnings[date]) {
                                phoneDailyEarnings[phone.id].dailyEarnings[date] = 0;
                            }
                            phoneDailyEarnings[phone.id].dailyEarnings[date] += parseFloat(amount) || 0;
                        }
                    });
                }
            });
        });
        
        return phoneDailyEarnings;
    }

    // 计算历史平均日收益（只基于今天及以前的记录）
    static calculateAverageDailyEarnings() {
        const data = this.loadData();
        let totalEarnings = 0;
        let daysWithEarnings = new Set();
        const today = getCurrentDate();
        
        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                if (app.balanceHistory && app.balanceHistory.length > 0) {
                    app.balanceHistory.forEach(record => {
                        if (record.date <= today && record.change > 0) {
                            totalEarnings += parseFloat(record.change) || 0;
                            daysWithEarnings.add(record.date);
                        }
                    });
                } else if (app.dailyEarnings) {
                    Object.entries(app.dailyEarnings).forEach(([date, amount]) => {
                        if (date <= today && amount > 0) {
                            totalEarnings += parseFloat(amount) || 0;
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
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            
            let dayEarnings = 0;
            data.phones.forEach(phone => {
                phone.apps.forEach(app => {
                    if (app.balanceHistory && app.balanceHistory.length > 0) {
                        const record = app.balanceHistory.find(r => r.date === dateStr);
                        if (record && record.change > 0) {
                            dayEarnings += parseFloat(record.change) || 0;
                        }
                    } else if (app.dailyEarnings && app.dailyEarnings[dateStr]) {
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

    // 计算历史最高日赚
    static calculateMaxDailyEarnings() {
        const data = this.loadData();
        let maxEarnings = 0;
        const today = getCurrentDate();
        
        const dailyEarningsMap = new Map();
        
        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                if (app.balanceHistory && app.balanceHistory.length > 0) {
                    app.balanceHistory.forEach(record => {
                        if (record.date <= today && record.change > 0) {
                            const earnings = parseFloat(record.change) || 0;
                            if (!dailyEarningsMap.has(record.date)) {
                                dailyEarningsMap.set(record.date, 0);
                            }
                            dailyEarningsMap.set(record.date, dailyEarningsMap.get(record.date) + earnings);
                        }
                    });
                } else if (app.dailyEarnings) {
                    Object.entries(app.dailyEarnings).forEach(([date, amount]) => {
                        if (date <= today && amount > 0) {
                            const earnings = parseFloat(amount) || 0;
                            if (!dailyEarningsMap.has(date)) {
                                dailyEarningsMap.set(date, 0);
                            }
                            dailyEarningsMap.set(date, dailyEarningsMap.get(date) + earnings);
                        }
                    });
                }
            });
        });
        
        // 找出最大值
        for (const [date, earnings] of dailyEarningsMap.entries()) {
            if (earnings > maxEarnings) {
                maxEarnings = earnings;
            }
        }
        
        return {
            maxDailyEarnings: maxEarnings
        };
    }

    // 计算还款所需日赚
    static calculateRepaymentDailyNeeded() {
        const data = this.loadData();
        const today = new Date();
        let totalRepayment = 0;
        let daysUntilDue = 0;
        
        // 计算所有未还款的分期
        data.installments.forEach(installment => {
            const dueDate = new Date(installment.dueDate);
            const amount = parseFloat(installment.amount) || 0;
            
            // 只计算未来的还款
            if (dueDate > today && amount > 0) {
                totalRepayment += amount;
                const days = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                if (days > 0 && (daysUntilDue === 0 || days < daysUntilDue)) {
                    daysUntilDue = days;
                }
            }
        });
        
        // 计算每日所需还款额
        const dailyNeeded = daysUntilDue > 0 ? totalRepayment / daysUntilDue : 0;
        
        return {
            hasRepayment: totalRepayment > 0,
            totalRepayment: totalRepayment,
            daysUntilDue: daysUntilDue,
            dailyNeeded: dailyNeeded
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
        const maxTarget = Math.max(maxDailyEarnings.maxDailyEarnings * 1.2, repaymentNeeded * 1.5, 100);
        finalTarget = Math.min(finalTarget, maxTarget);
        
        return {
            dailyTarget: finalTarget,
            abilityTarget: abilityTarget,        // 能力目标
            repaymentNeeded: repaymentNeeded,    // 还款所需
            avgDailyEarnings: avgStats.avgDailyEarnings,
            last7DaysAvg: last7DaysStats.avgDailyEarnings,
            maxDailyEarnings: maxDailyEarnings.maxDailyEarnings,
            daysWithData: avgStats.daysCount,
            dynamicFactor: dynamicFactor,
            performanceLevel: performanceLevel,
            repaymentInfo: repaymentStats,
            isValid: true
        };
    }

    // 计算全年目标的每日需赚金额（新的计算逻辑）
    // 年目标 = 加权平均 × 365 → 取整到百位
    // 日目标 = (年目标 - 已赚取) ÷ 剩余天数
    // 软件日目标 = 日目标 ÷ 软件数量
    static calculateYearlyDailyTarget() {
        const goal = this.getYearlyGoal();
        
        if (goal.amount <= 0) {
            return {
                yearlyGoal: 0,
                dailyTarget: 0,
                daysRemaining: 365,
                totalEarned: 0,
                remainingAmount: 0,
                isValid: false
            };
        }
        
        // 计算已赚取金额（当前余额 + 已提现）
        const data = this.loadData();
        let totalEarned = 0;
        let totalApps = 0;
        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                totalEarned += (app.withdrawn || 0) + (app.historicalWithdrawn || 0) + (app.balance || 0);
                totalApps++;
            });
        });
        
        // 计算剩余天数（从今天到年底）
        const now = new Date();
        const endOfYear = new Date(now.getFullYear(), 11, 31);
        const daysRemaining = Math.max(1, Math.ceil((endOfYear - now) / (1000 * 60 * 60 * 24)));
        
        // 计算剩余金额
        const remainingAmount = Math.max(0, goal.amount - totalEarned);
        
        // 计算日目标 = 剩余金额 ÷ 剩余天数
        const dailyTarget = remainingAmount > 0 ? remainingAmount / daysRemaining : 0;
        
        // 计算每个软件的日目标
        const perAppDailyTarget = totalApps > 0 ? dailyTarget / totalApps : 0;
        
        return {
            yearlyGoal: goal.amount,
            dailyTarget: dailyTarget,
            perAppDailyTarget: perAppDailyTarget,
            daysRemaining: daysRemaining,
            totalEarned: totalEarned,
            remainingAmount: remainingAmount,
            totalApps: totalApps,
            isValid: true
        };
    }

    // 计算全年目标预测完成日期（基于平均收益）
    static calculatePredictedCompletionDate() {
        const goal = this.getYearlyGoal();
        if (goal.amount <= 0) {
            return null;
        }
        
        // 计算已赚取金额
        const data = this.loadData();
        let totalEarned = 0;
        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                totalEarned += (app.withdrawn || 0) + (app.historicalWithdrawn || 0) + (app.balance || 0);
            });
        });
        
        // 如果已经完成目标
        if (totalEarned >= goal.amount) {
            return {
                date: new Date(),
                daysNeeded: 0
            };
        }
        
        // 计算剩余金额
        const remainingAmount = goal.amount - totalEarned;
        
        // 获取所有有收益的每日数据
        const allDailyEarnings = this.getAllDailyEarnings();
        
        // 筛选出有收益的日期（金额大于0）
        const profitableDays = allDailyEarnings.filter(day => day.amount > 0);
        
        // 计算预测每日收益（使用平均收益）
        let predictedDailyEarnings = 0;
        
        if (profitableDays.length > 0) {
            // 使用平均收益预测
            const totalProfit = profitableDays.reduce((sum, day) => sum + day.amount, 0);
            predictedDailyEarnings = totalProfit / profitableDays.length;
        } else {
            // 没有数据，使用默认值
            predictedDailyEarnings = 10; // 默认每天10元
        }
        
        // 确保预测收益为正数
        predictedDailyEarnings = Math.max(0.1, predictedDailyEarnings);
        
        // 计算还需要多少天
        const daysNeeded = Math.ceil(remainingAmount / predictedDailyEarnings);
        
        // 计算预测完成日期
        const predictedDate = new Date();
        predictedDate.setDate(predictedDate.getDate() + daysNeeded);
        
        return {
            date: predictedDate,
            daysNeeded: daysNeeded,
            predictedDailyEarnings: predictedDailyEarnings
        };
    }
    
    // 计算单个软件的预测完成时间
    static calculateAppPredictedCompletion(app) {
        if (!app) return null;
        
        const minWithdraw = app.minWithdraw || 0.3;
        const yearlyTarget = minWithdraw * 365;
        
        const totalEarned = (app.withdrawn || 0) + (app.historicalWithdrawn || 0) + (app.balance || 0);
        
        if (totalEarned >= yearlyTarget) {
            return {
                date: new Date(),
                daysNeeded: 0,
                progress: 100
            };
        }
        
        const remainingAmount = yearlyTarget - totalEarned;
        
        let predictedDailyEarnings = 0;
        
        if (app.balanceHistory && app.balanceHistory.length >= 2) {
            const sortedHistory = [...app.balanceHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
            const recentHistory = sortedHistory.slice(-30);
            
            if (recentHistory.length >= 2) {
                let totalEarnings = 0;
                let totalDays = 0;
                
                for (let i = 1; i < recentHistory.length; i++) {
                    const prev = recentHistory[i - 1];
                    const curr = recentHistory[i];
                    
                    if (curr.change > 0) {
                        const prevDate = new Date(prev.date);
                        const currDate = new Date(curr.date);
                        const daysBetween = Math.max(1, Math.ceil((currDate - prevDate) / (1000 * 60 * 60 * 24)));
                        
                        totalEarnings += curr.change;
                        totalDays += daysBetween;
                    }
                }
                
                if (totalDays > 0) {
                    predictedDailyEarnings = totalEarnings / totalDays;
                }
            }
        }
        
        if (predictedDailyEarnings <= 0 && app.dailyEarnings) {
            const appDailyEarnings = app.dailyEarnings;
            const allDailyEarnings = Object.entries(appDailyEarnings)
                .map(([date, amount]) => ({ date, amount: parseFloat(amount) || 0 }))
                .sort((a, b) => new Date(a.date) - new Date(b.date));
            
            const recentEarnings = allDailyEarnings.slice(-30);
            
            let weightedSum = 0;
            let weightSum = 0;
            
            recentEarnings.forEach((day, index) => {
                const daysAgo = recentEarnings.length - index - 1;
                let weight = 1;
                
                if (daysAgo <= 6) {
                    weight = 3;
                } else if (daysAgo <= 13) {
                    weight = 2;
                } else {
                    weight = 1;
                }
                
                weightedSum += day.amount * weight;
                weightSum += weight;
            });
            
            if (weightSum > 0) {
                predictedDailyEarnings = weightedSum / weightSum;
            }
        }
        
        if (predictedDailyEarnings <= 0) {
            predictedDailyEarnings = minWithdraw;
        }
        
        predictedDailyEarnings = Math.max(0.1, predictedDailyEarnings);
        
        // 计算还需要多少天
        const daysNeeded = Math.ceil(remainingAmount / predictedDailyEarnings);
        
        // 计算预测完成日期
        const predictedDate = new Date();
        predictedDate.setDate(predictedDate.getDate() + daysNeeded);
        
        // 计算进度
        const progress = (totalEarned / yearlyTarget) * 100;
        
        return {
            date: predictedDate,
            daysNeeded: daysNeeded,
            progress: progress
        };
    }
    
    // 计算软件的预测每日收益（用于编辑余额时自动填入）
    static calculatePredictedDailyEarnings(app, conservative = false) {
        if (!app) return 0;
        
        let predictedDailyEarnings = 0;
        let allDailyValues = [];
        
        if (app.balanceHistory && app.balanceHistory.length >= 2) {
            const sortedHistory = [...app.balanceHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
            const recentHistory = sortedHistory.slice(-30);
            
            if (recentHistory.length >= 2) {
                for (let i = 1; i < recentHistory.length; i++) {
                    const prev = recentHistory[i - 1];
                    const curr = recentHistory[i];
                    
                    if (curr.change > 0) {
                        const prevDate = new Date(prev.date);
                        const currDate = new Date(curr.date);
                        const daysBetween = Math.max(1, Math.ceil((currDate - prevDate) / (1000 * 60 * 60 * 24)));
                        
                        const dailyValue = curr.change / daysBetween;
                        allDailyValues.push(dailyValue);
                    }
                }
            }
        }
        
        if (allDailyValues.length === 0 && app.dailyEarnings) {
            const allDailyEarnings = Object.entries(app.dailyEarnings)
                .map(([date, amount]) => parseFloat(amount) || 0)
                .filter(amount => amount > 0);
            
            allDailyValues = allDailyValues.concat(allDailyEarnings);
        }
        
        if (allDailyValues.length > 0) {
            if (conservative) {
                const sorted = [...allDailyValues].sort((a, b) => a - b);
                
                if (sorted.length >= 7) {
                    const last7 = sorted.slice(-7);
                    predictedDailyEarnings = Math.min(...last7);
                } else if (sorted.length >= 3) {
                    predictedDailyEarnings = sorted[Math.floor(sorted.length * 0.25)];
                } else {
                    predictedDailyEarnings = Math.min(...sorted);
                }
            } else {
                const recentValues = allDailyValues.slice(-30);
                
                let weightedSum = 0;
                let weightSum = 0;
                
                recentValues.forEach((value, index) => {
                    const daysAgo = recentValues.length - index - 1;
                    let weight = 1;
                    
                    if (daysAgo <= 6) {
                        weight = 3;
                    } else if (daysAgo <= 13) {
                        weight = 2;
                    } else {
                        weight = 1;
                    }
                    
                    weightedSum += value * weight;
                    weightSum += weight;
                });
                
                if (weightSum > 0) {
                    predictedDailyEarnings = weightedSum / weightSum;
                }
            }
        }
        
        if (predictedDailyEarnings <= 0) {
            predictedDailyEarnings = app.minWithdraw || 0.3;
        }
        
        return Math.max(0.01, Math.round(predictedDailyEarnings * 100) / 100);
    }

    // 获取收益趋势数据（用于可视化）
    static getEarningsTrendData() {
        console.log('获取收益趋势数据');
        const allDailyEarnings = this.getAllDailyEarnings();
        console.log('所有每日收益:', allDailyEarnings);
        
        const recentEarnings = allDailyEarnings.slice(-30); // 最近30天
        console.log('最近30天收益:', recentEarnings);
        
        // 转换为图表需要的数据格式
        const labels = recentEarnings.map(day => day.date.slice(5)); // 只显示月-日
        const data = recentEarnings.map(day => day.amount);
        console.log('labels:', labels);
        console.log('data:', data);
        
        // 计算移动平均线（7天）
        const movingAverage = [];
        for (let i = 0; i < data.length; i++) {
            const start = Math.max(0, i - 6);
            const slice = data.slice(start, i + 1);
            const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length;
            movingAverage.push(avg);
        }
        console.log('movingAverage:', movingAverage);
        
        return {
            labels,
            data,
            movingAverage
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

    // 计算完整的财务统计
    static calculateCompleteFinancialStats() {
        const finance = this.getPersonalFinance();
        const appEarnings = this.calculateTotalEarnings();
        
        // 计算本月收入
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        const monthlyIncome = finance.incomeSources
            .filter(s => s.date.startsWith(currentMonth))
            .reduce((sum, s) => sum + s.amount, 0);
        
        // 计算软件收入本月统计
        const monthlyAppEarnings = this.calculateMonthlyEarnings(now.getFullYear(), now.getMonth() + 1);
        
        return {
            // 软件资金
            appEarnings: appEarnings,
            
            // 个人资金
            personalWallet: finance.wallet,
            personalTotalEarned: finance.totalEarned,
            
            totalWealth: finance.wallet + appEarnings.totalBalance,
            
            // 本月统计
            monthlyIncome: monthlyIncome,
            monthlyAppEarnings: monthlyAppEarnings,
            
            // 历史记录
            incomeSources: finance.incomeSources.sort((a, b) => new Date(b.date) - new Date(a.date)),
            transfers: finance.transfers.sort((a, b) => new Date(b.date) - new Date(a.date))
        };
    }



    // 清空所有数据
    static clearAllData() {
        localStorage.removeItem(PHONES_KEY);
        localStorage.removeItem(INSTALLMENTS_KEY);
        localStorage.removeItem(EXPENSES_KEY);
        localStorage.removeItem(SETTINGS_KEY);
        localStorage.removeItem(DATA_KEY);
        
        localStorage.removeItem('moneyApp_gameDrawHistory');
        localStorage.removeItem('moneyApp_gameTimers');
        localStorage.removeItem('moneyApp_dailyGaps');
        return { phones: [], installments: [], expenses: [], settings: {} };
    }

    static addPhone(name) {
        const data = this.loadData();
        const today = getCurrentDate();
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
            // 检查最小提现金额是否大于0
            if (!appData.minWithdraw || parseFloat(appData.minWithdraw) <= 0) {
                throw new Error('最小提现金额必须大于0');
            }
            
            // 生成唯一ID：时间戳 + 随机数 + 手机ID的一部分
            const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5) + phoneId.substr(-4);
            const today = getCurrentDate();
            const app = {
                id: uniqueId,
                name: appData.name,
                balance: appData.balance || 0,
                minWithdraw: parseFloat(appData.minWithdraw),
                highWithdraw: parseFloat(appData.highWithdraw) || 0,
                clearPeriod: parseInt(appData.clearPeriod) || 0,
                lastLoginDate: today,
                withdrawn: 0,
                historicalWithdrawn: 0,
                withdrawals: [],
                lastUpdated: new Date().toISOString(),
                earningStartDate: (appData.balance || 0) > 0 ? today : null,
                activityLog: {}
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
                // 检查最小提现金额是否大于0
                if (!appData.minWithdraw || parseFloat(appData.minWithdraw) <= 0) {
                    throw new Error('最小提现金额必须大于0');
                }
                
                const oldBalance = app.balance || 0;
                const newBalance = appData.balance || 0;
                const lastUpdatedStr = app.lastUpdated || null;
                
                app.name = appData.name;
                app.balance = newBalance;
                app.minWithdraw = parseFloat(appData.minWithdraw);
                app.highWithdraw = parseFloat(appData.highWithdraw) || 0;
                app.clearPeriod = parseInt(appData.clearPeriod) || 0;
                app.historicalWithdrawn = appData.historicalWithdrawn || 0;
                app.lastUpdated = new Date().toISOString();
                
                if (newBalance !== oldBalance) {
                    app.lastLoginDate = getCurrentDate();
                }
                
                // 记录余额变化（只记录增加的情况，提现不算）
                let todayTotalEarnings = 0;
                if (newBalance > oldBalance) {
                    const isFirstAddWithBalance = (!app.balanceHistory || app.balanceHistory.length === 0) && oldBalance === 0 && newBalance > 0;
                    const today = getCurrentDate();
                    if (!app.earningStartDate) {
                        app.earningStartDate = today;
                    }
                    
                    if (!app.balanceHistory) {
                        app.balanceHistory = [];
                    }
                    
                    const now = new Date();
                    const change = newBalance - oldBalance;
                    
                    console.log('记录余额变化:', { oldBalance, newBalance, change, today, isFirstAddWithBalance });
                    
                    if (!app.dailyEarnings) {
                        app.dailyEarnings = {};
                    }
                    
                    if (isFirstAddWithBalance) {
                        app.balanceHistory.push({
                            date: today,
                            balance: newBalance,
                            change: change,
                            note: '初始余额'
                        });
                        app.dailyEarnings[today] = (app.dailyEarnings[today] || 0) + change;
                    } else {
                        app.dailyEarnings[today] = (app.dailyEarnings[today] || 0) + change;
                        
                        const existingRecord = app.balanceHistory.find(h => h.date === today);
                        if (existingRecord) {
                            existingRecord.change += change;
                            existingRecord.balance = newBalance;
                        } else {
                            app.balanceHistory.push({
                                date: today,
                                balance: newBalance,
                                change: change,
                                note: '收益记录'
                            });
                        }
                        
                        app.balanceHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
                    }
                    
                    if (!isFirstAddWithBalance) {
                        todayTotalEarnings = app.dailyEarnings[today] || 0;
                        
                        console.log('更新 dailyEarnings:', app.dailyEarnings);
                        
                        let allAppsTodayEarnings = 0;
                        data.phones.forEach(p => {
                            p.apps.forEach(a => {
                                if (a.dailyEarnings && a.dailyEarnings[today]) {
                                    allAppsTodayEarnings += a.dailyEarnings[today];
                                }
                            });
                        });
                        
                        const yearlyDailyTarget = this.calculateYearlyDailyTarget();
                        const dailyTargetAmount = yearlyDailyTarget.isValid ? yearlyDailyTarget.dailyTarget : 0;
                        
                        console.log('检查日目标:', { allAppsTodayEarnings, dailyTarget: dailyTargetAmount });
                        
                        console.log('今日总收益:', allAppsTodayEarnings);
                        if (dailyTargetAmount > 0) {
                            console.log('日目标:', dailyTargetAmount);
                            if (allAppsTodayEarnings >= dailyTargetAmount) {
                                console.log('达到日目标！');
                            } else {
                                console.log('未达到日目标');
                            }
                        }
                    } else {
                        console.log('首次添加软件且有余额，不计入当日收益');
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
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        if (app.balanceHistory && app.balanceHistory.length >= 2) {
            const sortedHistory = [...app.balanceHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
            
            let todayEarning = 0;
            let last7Days = 0;
            let last30Days = 0;
            let total = 0;
            let daysWithData7 = 0;
            let daysWithData30 = 0;
            
            sortedHistory.forEach(record => {
                if (record.change > 0) {
                    total += record.change;
                    
                    const dateObj = new Date(record.date);
                    const todayObj = new Date(today);
                    const diffDays = Math.floor((todayObj - dateObj) / (1000 * 60 * 60 * 24));
                    
                    if (record.date === today) {
                        todayEarning = record.change;
                    }
                    
                    if (diffDays >= 0 && diffDays < 7) {
                        last7Days += record.change;
                        daysWithData7++;
                    }
                    if (diffDays >= 0 && diffDays < 30) {
                        last30Days += record.change;
                        daysWithData30++;
                    }
                }
            });
            
            return {
                today: todayEarning,
                last7Days: last7Days,
                last30Days: last30Days,
                avg7Days: daysWithData7 > 0 ? last7Days / daysWithData7 : 0,
                avg30Days: daysWithData30 > 0 ? last30Days / daysWithData30 : 0,
                total: total
            };
        }
        
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
        
        const dates = Object.keys(app.dailyEarnings).sort();
        
        const todayEarning = parseFloat(app.dailyEarnings[today]) || 0;
        
        let last7Days = 0;
        let last30Days = 0;
        let total = 0;
        
        dates.forEach(date => {
            const amount = parseFloat(app.dailyEarnings[date]) || 0;
            total += amount;
            
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

    // 计算可高档提现总额（达到highWithdraw金额的软件的余额总和）
    static calculateHighWithdrawTotal() {
        const data = this.loadData();
        let highWithdrawTotal = 0;
        let appCount = 0;
        const appsList = [];
        
        data.phones.forEach(phone => {
            phone.apps.forEach(app => {
                const highWithdraw = app.highWithdraw || 0;
                const balance = app.balance || 0;
                
                // 如果余额达到高档提现金额
                if (highWithdraw > 0 && balance >= highWithdraw) {
                    highWithdrawTotal += balance;
                    appCount++;
                    appsList.push({
                        name: app.name,
                        phoneName: phone.name,
                        balance: balance,
                        highWithdraw: highWithdraw
                    });
                }
            });
        });
        
        return {
            total: highWithdrawTotal,
            appCount: appCount,
            apps: appsList
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
        const today = getCurrentDate();
        
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
            game.deleteDate = getCurrentDate();
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
        
        // 检查是否已存在相同日期和手机的记录
        const existingIndex = history.findIndex(h => h.phoneId === phoneId && h.date === drawDate);
        
        if (existingIndex >= 0) {
            // 更新现有记录
            history[existingIndex] = {
                date: drawDate,
                gameId: game.id,
                gameName: game.name,
                phoneId: phoneId,
                daysPlayed: game.daysPlayed || 0,
                remainingDays: targetDays - (game.daysPlayed || 0),
                targetDays: targetDays,
                isRedownload: game.isRedownload || false,
                completed: true,
                completedAt: new Date().toISOString()
            };
            this.saveGameDrawHistory(history);
            console.log('已更新抽签记录:', history[existingIndex]);
            return history[existingIndex];
        }
        
        // 添加新记录
        history.unshift({
            date: drawDate,
            gameId: game.id,
            gameName: game.name,
            phoneId: phoneId,
            daysPlayed: game.daysPlayed || 0,
            remainingDays: targetDays - (game.daysPlayed || 0),
            targetDays: targetDays,
            isRedownload: game.isRedownload || false,
            completed: true,
            completedAt: new Date().toISOString()
        });
        
        this.saveGameDrawHistory(history);
        console.log('已保存完成的抽签记录:', history[0]);
        return history[0];
    }
    
    // 更新抽签历史的天数
    static updateDrawHistoryDays(phoneId, date, daysPlayed) {
        const history = this.getGameDrawHistory();
        const record = history.find(h => h.phoneId === phoneId && h.date === date);
        
        if (record) {
            record.daysPlayed = daysPlayed;
            record.remainingDays = Math.max(0, record.targetDays - daysPlayed);
            this.saveGameDrawHistory(history);
            console.log('已更新抽签天数:', record);
            return record;
        }
        return null;
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
        const today = getCurrentDate();
        
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

                const dateStr = date || getCurrentDate();
                
                app.withdrawn = (app.withdrawn || 0) + amount;
                app.lastUpdated = new Date().toISOString();
                app.earningStartDate = dateStr;

                if (!app.withdrawals) {
                    app.withdrawals = [];
                }

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

    static deleteApp(phoneId, appId) {
        const data = this.loadData();
        const phone = data.phones.find(p => p.id === phoneId);
        if (phone) {
            phone.apps = phone.apps.filter(a => a.id !== appId);
            this.saveData(data);
        }
        return data;
    }
    
    // 软删除：标记软件为已删除（用于清零周期提醒）
    static markAppDeleted(phoneId, appId) {
        const data = this.loadData();
        const phone = data.phones.find(p => p.id === phoneId);
        if (phone) {
            const app = phone.apps.find(a => a.id === appId);
            if (app) {
                app.isDeleted = true;
                app.deleteDate = getCurrentDate();
                this.saveData(data);
            }
        }
        return data;
    }
    
    // 恢复已删除的软件
    static restoreApp(phoneId, appId) {
        const data = this.loadData();
        const phone = data.phones.find(p => p.id === phoneId);
        if (phone) {
            const app = phone.apps.find(a => a.id === appId);
            if (app) {
                app.isDeleted = false;
                delete app.deleteDate;
                this.saveData(data);
            }
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

    // 获取主题色
    static getThemeColors() {
        const theme = this.getTheme();
        const colors = {
            default: {
                primary: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
                secondary: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
                accent: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                success: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                warning: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                info: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)'
            },
            'dark': {
                primary: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                secondary: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
                accent: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                success: 'linear-gradient(135deg, #34d399 0%, #6ee7b7 100%)',
                warning: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                info: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)'
            }
        };
        return colors[theme] || colors.default;
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
            date: getCurrentDate(),
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

    // 计算每日提现目标（基于年度收益目标）
    static calculateDailyWithdrawalTarget() {
        const data = this.loadData();
        const goal = this.getYearlyGoal();

        // 统计所有软件数量
        const totalApps = data.phones.reduce((sum, phone) => sum + phone.apps.length, 0);

        if (totalApps === 0 || goal.amount <= 0) {
            return null;
        }

        // 计算年度剩余天数
        const today = new Date();
        const yearEnd = new Date(goal.year, 11, 31);
        const daysRemaining = Math.max(1, Math.ceil((yearEnd - today) / (1000 * 60 * 60 * 24)));

        // 计算已提现总额（今年内的提现）
        const yearStart = new Date(goal.year, 0, 1);
        const totalWithdrawn = data.phones.reduce((sum, phone) => {
            return sum + phone.apps.reduce((appSum, app) => {
                // 只计算今年的提现
                const thisYearWithdrawn = app.withdrawals ? app.withdrawals
                    .filter(w => new Date(w.date) >= yearStart)
                    .reduce((wSum, w) => wSum + (w.amount || 0), 0) : 0;
                return appSum + thisYearWithdrawn;
            }, 0);
        }, 0);

        // 剩余目标金额
        const remainingTarget = Math.max(0, goal.amount - totalWithdrawn);

        // 每日需要赚取的金额
        const dailyTarget = remainingTarget / daysRemaining;

        // 每个软件需要赚取的目标（平均分配）
        const perAppTarget = totalApps > 0 ? dailyTarget / totalApps : 0;

        return {
            totalApps,
            year: goal.year,
            yearGoal: goal.amount,
            totalWithdrawn,
            remainingTarget,
            daysRemaining,
            dailyTarget,
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
        const today = formatLocalDate(now);
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
                const dateStr = formatLocalDate(date);

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
        const today = getCurrentDate();
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

            // 为旧数据初始化 earningStartDate
            if (!app.earningStartDate) {
                // 优先使用 balanceHistory 中第一条记录的日期
                if (app.balanceHistory && app.balanceHistory.length > 0) {
                    app.earningStartDate = app.balanceHistory[0].date;
                } else if (app.lastLoginDate) {
                    app.earningStartDate = app.lastLoginDate;
                } else {
                    app.earningStartDate = today;
                }
                hasChanges = true;
                console.log(`迁移数据：软件 ${app.name} 初始化 earningStartDate = ${app.earningStartDate}`);
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
    const validThemes = ['default', 'dark'];
    const finalTheme = validThemes.includes(theme) ? theme : 'default';
    
    if (finalTheme === 'default') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', finalTheme);
    }
    updateThemeSelector(finalTheme);
}

// 设置主题
function setTheme(theme) {
    const validThemes = ['default', 'dark'];
    const finalTheme = validThemes.includes(theme) ? theme : 'default';
    
    DataManager.setTheme(finalTheme);
    applyTheme(finalTheme);
    showSuccess(`主题已切换为${getThemeName(finalTheme)}`);
}

// 获取主题名称
function getThemeName(theme) {
    const themeNames = {
        'default': '简约',
        'dark': '暗黑模式'
    };
    return themeNames[theme] || '简约';
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
            const todayStr = formatLocalDate(now);
            
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
    const todayStr = formatLocalDate(now);
    
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
    
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // 获取目标页面
    const targetPage = document.getElementById(`page-${pageName}`);
    
    // 显示目标页面
    targetPage.classList.add('active');
    
    // 先恢复页面状态（包括滚动位置、表单值等）
    restorePageState(pageName);
    
    // 再刷新页面数据（避免覆盖已恢复的状态）
    if (pageName === 'dashboard') renderDashboard();
    if (pageName === 'phones') renderPhones();
    if (pageName === 'next-play') renderNextPlay();
    if (pageName === 'stats') renderStats();
    if (pageName === 'settings') renderSettings();
    if (pageName === 'withdraw-records') renderWithdrawRecords();
    if (pageName === 'installments') renderInstallments();
    if (pageName === 'withdraw-plan') renderWithdrawPlan();
    if (pageName === 'clear-warning') renderClearWarning();
    
    if (pageName === 'daily-earnings') renderDailyEarningsPage();
    if (pageName === 'app-details') renderAppDetailsPage();
    if (pageName === 'phone-earnings') renderPhoneEarningsPage();
    if (pageName === 'activity') renderActivityPage();
    
    
    // 控制快速编辑浮动按钮的显示/隐藏 - 在所有页面都显示
    const quickEditFab = document.getElementById('quick-edit-fab');
    if (quickEditFab) {
        quickEditFab.style.display = 'block';
    }
    
    // 再次恢复表单值（确保不被 render 函数覆盖）
    const state = pageStates[pageName];
    if (state && state.formValues) {
        Object.entries(state.formValues).forEach(([id, value]) => {
            const input = document.getElementById(id);
            if (input && input.value !== value) {
                input.value = value;
            }
        });
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
        // 保存滚动位置（但不自动恢复）
        const scrollTop = currentPage === 'settings' ? window.scrollY : pageElement.scrollTop;
        
        // 保存更完整的状态
        pageStates[currentPage] = {
            scrollTop: scrollTop,
            expandedSections: getExpandedSections(currentPage),
            currentGamePhoneId: currentGamePhoneId, // 保存游戏页面选中的手机
            // 保存表单输入值
            formValues: getFormValues(currentPage),
            // 保存选中状态
            selectedItems: getSelectedItems(currentPage),
            // 保存过滤/排序状态
            filterState: getFilterState(currentPage),
            // 保存时间戳
            timestamp: Date.now()
        };
        
        console.log(`保存页面状态: ${currentPage}`, pageStates[currentPage]);
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

// 获取表单输入值
function getFormValues(pageName) {
    const values = {};
    const pageElement = document.getElementById(`page-${pageName}`);
    if (!pageElement) return values;
    
    // 保存所有输入框的值
    pageElement.querySelectorAll('input[type="text"], input[type="number"], textarea, select').forEach(input => {
        if (input.id) {
            values[input.id] = input.value;
        }
    });
    
    return values;
}

// 获取选中状态
function getSelectedItems(pageName) {
    const selected = [];
    const pageElement = document.getElementById(`page-${pageName}`);
    if (!pageElement) return selected;
    
    // 保存选中的复选框
    pageElement.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
        if (checkbox.id || checkbox.name) {
            selected.push(checkbox.id || checkbox.name);
        }
    });
    
    return selected;
}

// 获取过滤/排序状态
function getFilterState(pageName) {
    const state = {};
    const pageElement = document.getElementById(`page-${pageName}`);
    if (!pageElement) return state;
    
    // 保存下拉选择器的值
    pageElement.querySelectorAll('select').forEach(select => {
        if (select.id) {
            state[select.id] = select.value;
        }
    });
    
    return state;
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
    
    // 恢复表单输入值
    if (state.formValues) {
        Object.entries(state.formValues).forEach(([id, value]) => {
            const input = document.getElementById(id);
            if (input) {
                input.value = value;
            }
        });
    }
    
    // 恢复选中状态
    if (state.selectedItems) {
        state.selectedItems.forEach(id => {
            const checkbox = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }
    
    // 恢复过滤/排序状态
    if (state.filterState) {
        Object.entries(state.filterState).forEach(([id, value]) => {
            const select = document.getElementById(id);
            if (select) {
                select.value = value;
            }
        });
    }
    
    // 恢复滚动位置（使用 requestAnimationFrame 确保在渲染前执行）
    if (state.scrollTop !== undefined) {
        requestAnimationFrame(() => {
            if (pageName === 'settings') {
                window.scrollTo(0, state.scrollTop);
            } else {
                const pageElement = document.getElementById(`page-${pageName}`);
                if (pageElement) {
                    pageElement.scrollTop = state.scrollTop;
                }
            }
        });
    }
    
    console.log(`恢复页面状态: ${pageName}`, state);
}

// 渲染仪表盘
function renderDashboard() {
    const data = DataManager.loadData();

    // 统计数据
    const totalPhones = data.phones.length;
    const totalApps = data.phones.reduce((sum, phone) => sum + phone.apps.length, 0);

    // 计算总提现金额（仅已提现部分，不含余额）
    const totalWithdrawn = data.phones.reduce((sum, phone) => {
        return sum + phone.apps.reduce((appSum, app) => {
            return appSum + (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
        }, 0);
    }, 0);
    // 计算总余额（未提现的金额）
    const totalBalance = data.phones.reduce((sum, phone) => {
        return sum + phone.apps.reduce((appSum, app) => {
            return appSum + (app.balance || 0);
        }, 0);
    }, 0);

    // 统计有提现记录的软件数量
    const appsWithWithdrawals = data.phones.reduce((sum, phone) => {
        return sum + phone.apps.filter(app => {
            const withdrawals = app.withdrawals || [];
            return withdrawals.length > 0;
        }).length;
    }, 0);

    // 计算今日与昨日收益（用于趋势）
    const today = getCurrentDate();
    const yesterday = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    let todayEarning = 0;
    let yesterdayEarning = 0;
    const last7 = []; // [{date, total}, ...] 共 7 天
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        let sum = 0;
        data.phones.forEach(phone => {
            (phone.apps || []).forEach(app => {
                sum += parseFloat((app.dailyEarnings && app.dailyEarnings[ds]) || 0);
            });
        });
        last7.push({ date: ds, total: sum });
        if (ds === today) todayEarning = sum;
        if (ds === yesterday) yesterdayEarning = sum;
    }
    const trendDelta = todayEarning - yesterdayEarning;
    const trendClass = trendDelta > 0 ? 'up' : (trendDelta < 0 ? 'down' : 'flat');
    const trendIcon = trendDelta > 0 ? '↗' : (trendDelta < 0 ? '↘' : '→');
    const trendText = yesterdayEarning > 0
        ? `${trendIcon} ${Math.abs(trendDelta).toFixed(2)}`
        : (todayEarning > 0 ? `↗ 今日 ${todayEarning.toFixed(2)}` : '— 暂无数据');

    // 计算可高档提现总额
    const highWithdrawData = DataManager.calculateHighWithdrawTotal();

    // 渲染 v2 看板
    const root = document.getElementById('dashboard-v2-root');
    if (root) {
        root.innerHTML = `
            <div class="hero-card" onclick="showTotalEarningsDetail()">
                <div class="hero-card__label">💰 总赚取金额</div>
                <div class="hero-card__value" id="v2-total-earnings">¥0.00</div>
                <div class="hero-card__sub">
                    <div>
                        <span class="hero-card__trend ${trendClass}" id="v2-total-trend">${trendText}</span>
                        <div class="hero-card__hint">较昨日</div>
                    </div>
                    <svg class="hero-card__sparkline" viewBox="0 0 96 36" preserveAspectRatio="none" id="v2-sparkline">
                        ${buildSparklineSvg(last7.map(p => p.total), 96, 36)}
                    </svg>
                </div>
            </div>

            <div class="kpi-grid">
                <div class="kpi-tile kpi-tile--purple" onclick="showPage('phones')">
                    <div class="kpi-tile__label">📱 总手机数</div>
                    <div class="kpi-tile__value">${totalPhones}</div>
                    <span class="kpi-tile__delta">${totalApps} 个软件</span>
                </div>
                <div class="kpi-tile kpi-tile--pink" onclick="showPage('phones')">
                    <div class="kpi-tile__label">📦 总软件数</div>
                    <div class="kpi-tile__value">${totalApps}</div>
                    <span class="kpi-tile__delta">${appsWithWithdrawals} 有提现</span>
                </div>
                <div class="kpi-tile kpi-tile--violet" onclick="showPage('stats')">
                    <div class="kpi-tile__label">💸 累计提现</div>
                    <div class="kpi-tile__value">¥${totalWithdrawn.toFixed(2)}</div>
                    <span class="kpi-tile__delta">已提现金额</span>
                </div>
                <div class="kpi-tile kpi-tile--amber" onclick="showPage('stats')">
                    <div class="kpi-tile__label">💵 当前余额</div>
                    <div class="kpi-tile__value">¥${totalBalance.toFixed(2)}</div>
                    <span class="kpi-tile__delta">未提现金额</span>
                </div>
            </div>

            ${highWithdrawData.appCount > 0 ? `
            <div class="card" style="margin-top: 16px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%); border: 1px solid rgba(59, 130, 246, 0.3);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <div>
                        <div style="font-size: 14px; font-weight: 600; color: #3b82f6;">💎 可高档提现</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">达到高档提现金额的软件</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 22px; font-weight: 700; color: #3b82f6;">¥${highWithdrawData.total.toFixed(2)}</div>
                        <div style="font-size: 11px; color: var(--text-muted);">${highWithdrawData.appCount} 个软件可提现</div>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    ${highWithdrawData.apps.slice(0, 5).map(app => `
                        <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-secondary); padding: 8px 12px; border-radius: 8px;">
                            <div>
                                <span style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${app.name}</span>
                                <span style="font-size: 11px; color: var(--text-muted); margin-left: 8px;">${app.phoneName}</span>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 13px; font-weight: 600; color: #3b82f6;">¥${app.balance.toFixed(2)}</div>
                                <div style="font-size: 10px; color: var(--text-muted);">高档¥${app.highWithdraw.toFixed(2)}</div>
                            </div>
                        </div>
                    `).join('')}
                    ${highWithdrawData.appCount > 5 ? `<div style="font-size: 11px; color: var(--text-muted); text-align: center;">还有 ${highWithdrawData.appCount - 5} 个软件...</div>` : ''}
                </div>
            </div>
            ` : ''}

        `;
    }

    // 渲染总赚取金额（写入 v2 元素）
    renderTotalEarnings();

    // 渲染收入日历
    renderIncomeCalendar();

    // 渲染软件赚取分析
    renderAppEarningAnalysis();

    // 渲染年度目标
    renderYearlyGoal();

    // 渲染软件到期提醒
    renderExpiringApps();

    // 渲染收益趋势图表
    renderEarningsChart();

    // 更新今日收益显示
    updateTodayEarnings();
}

function renderActivityPlanCard() {
    const activeApps = DataManager.getTodayActiveApps(null, 10);
    const activityStats = DataManager.getActivityStats(null, 7);
    
    if (activeApps.length === 0) {
        return `
            <div class="card mt-4" id="activity-plan-card">
                <div class="section-header">
                    <div class="section-title">📺 今日活跃计划</div>
                    <div class="section-divider"></div>
                </div>
                <div class="empty-state">
                    <div class="empty-state__icon">📺</div>
                    <div class="empty-state__title">暂无软件数据</div>
                    <div class="empty-state__hint">添加手机和软件后即可查看今日活跃计划</div>
                </div>
            </div>
        `;
    }
    
    const urgentCount = activeApps.filter(a => a.priority === 4).length;
    const warningCount = activeApps.filter(a => a.priority === 3).length;
    const recommendedApps = activeApps.slice(0, 5);
    
    let html = `
        <div class="card mt-4" id="activity-plan-card">
            <div class="section-header">
                <div class="section-title">📺 今日活跃计划</div>
                <div class="section-divider"></div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">标记已观看短剧/内容，给平台贡献活跃度</div>
            </div>
            <div style="display: flex; gap: 16px; margin-bottom: 16px; padding: 0 8px;">
                <div style="flex: 1; text-align: center; padding: 12px; background: rgba(239,68,68,0.1); border-radius: 10px;">
                    <div style="font-size: 20px; font-weight: 700; color: #ef4444;">${urgentCount}</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">立即玩</div>
                </div>
                <div style="flex: 1; text-align: center; padding: 12px; background: rgba(245,158,11,0.1); border-radius: 10px;">
                    <div style="font-size: 20px; font-weight: 700; color: #f59e0b;">${warningCount}</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">3天内</div>
                </div>
                <div style="flex: 1; text-align: center; padding: 12px; background: rgba(59,130,246,0.1); border-radius: 10px;">
                    <div style="font-size: 20px; font-weight: 700; color: #3b82f6;">${activityStats.avgDailyActive}</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">日均活跃</div>
                </div>
                <div style="flex: 1; text-align: center; padding: 12px; background: rgba(16,185,129,0.1); border-radius: 10px;">
                    <div style="font-size: 20px; font-weight: 700; color: #10b981;">${activityStats.activeRate}%</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">活跃率</div>
                </div>
            </div>
            <div style="max-height: 350px; overflow-y: auto;">
    `;
    
    recommendedApps.forEach((app, index) => {
        let priorityIcon = '';
        let priorityColor = '';
        let statusText = '';
        
        if (app.priority === 4) {
            priorityIcon = '⚠️';
            priorityColor = '#ef4444';
            statusText = '立即游玩';
        } else if (app.priority === 3) {
            priorityIcon = '⏳';
            priorityColor = '#f59e0b';
            statusText = `${app.daysUntilNextPlay}天后`;
        } else if (app.priority === 2) {
            priorityIcon = '📅';
            priorityColor = '#3b82f6';
            statusText = `${app.daysUntilNextPlay}天后`;
        } else {
            priorityIcon = '✓';
            priorityColor = '#10b981';
            statusText = `${app.daysUntilNextPlay}天后`;
        }
        
        let activityBadge = '';
        if (app.isActiveToday) {
            const durationText = app.activityDuration > 0 ? `(${app.activityDuration}分钟)` : '';
            activityBadge = `<span style="background: rgba(16,185,129,0.15); color: #10b981; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">✅ 已活跃${durationText}</span>`;
        }
        
        let belowAvgBadge = '';
        if (app.belowAverageEarning) {
            belowAvgBadge = '<span style="background: rgba(239,68,68,0.15); color: #ef4444; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">⚡ 需多活跃</span>';
        }
        
        let durationBreakdownText = '';
        if (app.durationBreakdown) {
            const parts = [];
            if (app.durationBreakdown.urgency > 0) parts.push(`紧迫+${app.durationBreakdown.urgency}`);
            if (app.durationBreakdown.earning > 0) parts.push(`收益偏低+${app.durationBreakdown.earning}`);
            if (app.durationBreakdown.withdraw > 0) parts.push(`接近提现+${app.durationBreakdown.withdraw}`);
            if (app.durationBreakdown.clearPeriod < 0) parts.push(`周期长${app.durationBreakdown.clearPeriod}`);
            if (parts.length > 0) {
                durationBreakdownText = `<span style="font-size: 11px; color: var(--text-muted);">(${parts.join(', ')})</span>`;
            }
        }
        
        const isChecked = app.isActiveToday ? 'checked' : '';
        
        html += `
            <div style="display: flex; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-color); gap: 12px;">
                <label style="flex-shrink: 0; cursor: pointer;">
                    <input type="checkbox" ${isChecked} onchange="toggleActivityStatus('${app.phoneId}', '${app.id}', this.checked)" 
                        style="width: 20px; height: 20px; cursor: pointer;">
                </label>
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span style="font-weight: 600; font-size: 14px;">${app.name}</span>
                        <span style="font-size: 12px; color: var(--text-secondary);">${app.phoneName}</span>
                        <span style="font-size: 12px; color: ${priorityColor};">${priorityIcon} ${statusText}</span>
                        ${belowAvgBadge}
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                        余额: ¥${app.balance.toFixed(2)} | 今日赚取: ¥${app.todayEarning.toFixed(2)}
                        ${app.averageEarning > 0 ? `| 平均: ¥${app.averageEarning.toFixed(2)}` : ''}
                    </div>
                    <div style="font-size: 11px; color: #3b82f6; margin-top: 2px;">
                        ⏱️ 推荐活跃: ${app.recommendedDuration}分钟 ${durationBreakdownText}
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${activityBadge}
                    ${app.isActiveToday ? `
                        <div style="display: flex; gap: 4px;">
                            <button class="btn btn-xs" onclick="setActivityDuration('${app.phoneId}', '${app.id}', ${app.recommendedDuration})" style="font-size: 10px; background: rgba(59,130,246,0.2); color: #3b82f6;">推荐</button>
                            <button class="btn btn-xs" onclick="setActivityDuration('${app.phoneId}', '${app.id}', 5)" style="font-size: 10px;">5分钟</button>
                            <button class="btn btn-xs" onclick="setActivityDuration('${app.phoneId}', '${app.id}', 10)" style="font-size: 10px;">10分钟</button>
                            <button class="btn btn-xs" onclick="setActivityDuration('${app.phoneId}', '${app.id}', 15)" style="font-size: 10px;">15分钟</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
            <div style="padding: 12px; display: flex; gap: 8px; border-top: 1px solid var(--border-color);">
                <button class="btn btn-secondary flex-1" onclick="refreshActivityPlan()" style="font-size: 13px;">🔄 刷新推荐</button>
                <button class="btn btn-primary flex-1" onclick="markAllActive()" style="font-size: 13px;">✅ 全部标记活跃</button>
            </div>
        </div>
    `;
    
    return html;
}

function toggleActivityStatus(phoneId, appId, isActive) {
    const result = DataManager.recordAppActivity(phoneId, appId, null, isActive);
    if (result) {
        showToast(isActive ? '标记为已活跃' : '取消活跃记录', 'success');
        renderDashboard();
    }
}

function setActivityDuration(phoneId, appId, duration) {
    const result = DataManager.recordAppActivity(phoneId, appId, null, true, duration);
    if (result) {
        showToast(`活跃时长已设置为 ${duration} 分钟`, 'success');
        renderDashboard();
    }
}

function refreshActivityPlan() {
    renderDashboard();
    showToast('推荐列表已更新', 'info');
}

function markAllActive() {
    const activeApps = DataManager.getTodayActiveApps(null, 10);
    let count = 0;
    activeApps.forEach(app => {
        if (!app.isActiveToday) {
            DataManager.recordAppActivity(app.phoneId, app.id, null, true, app.recommendedDuration);
            count++;
        }
    });
    renderDashboard();
    showToast(`${count} 个软件已标记为活跃（使用推荐时长）`, 'success');
}

let activityTimers = {};
let timerStates = {};

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateTimerDisplay(phoneId, appId, elapsedSeconds) {
    const selector = `[data-timer="${phoneId}-${appId}"]`;
    const timerEl = document.querySelector(selector);
    if (timerEl) {
        timerEl.textContent = formatDuration(elapsedSeconds);
    } else {
        console.log('Timer element not found:', selector);
        const allTimerEls = document.querySelectorAll('[data-timer]');
        console.log('All timer elements found:', allTimerEls.length);
        allTimerEls.forEach(el => {
            console.log('Found element:', el.getAttribute('data-timer'));
        });
    }
}

function startTimer(phoneId, appId) {
    console.log('startTimer called:', phoneId, appId);
    const key = `${phoneId}_${appId}`;
    const state = timerStates[key];
    const startTime = state && state.startTime ? state.startTime : Date.now();
    console.log('startTime:', startTime);
    
    timerStates[key] = { startTime, isRunning: true };
    
    if (activityTimers[key]) {
        clearInterval(activityTimers[key]);
    }
    
    const update = () => {
        const currentState = timerStates[key];
        if (!currentState || !currentState.isRunning) {
            clearInterval(activityTimers[key]);
            return;
        }
        const elapsedSeconds = Math.floor((Date.now() - currentState.startTime) / 1000);
        console.log('elapsedSeconds:', elapsedSeconds);
        updateTimerDisplay(phoneId, appId, elapsedSeconds);
    };
    
    update();
    activityTimers[key] = setInterval(update, 1000);
    console.log('Timer started, interval ID:', activityTimers[key]);
    
    const container = document.getElementById('activity-page-content');
    if (container) {
        const buttons = container.querySelectorAll(`[data-phone="${phoneId}"][data-app="${appId}"]`);
        buttons.forEach(btn => {
            if (btn.dataset.action === 'start') btn.style.display = 'none';
            if (btn.dataset.action === 'pause') btn.style.display = 'inline-flex';
            if (btn.dataset.action === 'stop') btn.style.display = 'inline-flex';
        });
    }
}

function pauseTimer(phoneId, appId) {
    const key = `${phoneId}_${appId}`;
    const state = timerStates[key];
    if (state) {
        timerStates[key] = { ...state, isRunning: false };
    }
    if (activityTimers[key]) {
        clearInterval(activityTimers[key]);
        delete activityTimers[key];
    }
    
    const container = document.getElementById('activity-page-content');
    if (container) {
        const buttons = container.querySelectorAll(`[data-phone="${phoneId}"][data-app="${appId}"]`);
        buttons.forEach(btn => {
            if (btn.dataset.action === 'start') btn.style.display = 'inline-flex';
            if (btn.dataset.action === 'pause') btn.style.display = 'none';
        });
    }
}

function stopTimer(phoneId, appId) {
    const key = `${phoneId}_${appId}`;
    const state = timerStates[key];
    if (state) {
        const elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
        const durationMinutes = Math.ceil(elapsedSeconds / 60);
        if (durationMinutes > 0) {
            const result = DataManager.recordAppActivity(phoneId, appId, null, true, durationMinutes);
            if (result) {
                showToast(`已记录 ${durationMinutes} 分钟活跃时长`, 'success');
            }
        }
    }
    
    delete timerStates[key];
    if (activityTimers[key]) {
        clearInterval(activityTimers[key]);
        delete activityTimers[key];
    }
    
    updateTimerDisplay(phoneId, appId, 0);
    
    const container = document.getElementById('activity-page-content');
    if (container) {
        const buttons = container.querySelectorAll(`[data-phone="${phoneId}"][data-app="${appId}"]`);
        buttons.forEach(btn => {
            if (btn.dataset.action === 'start') btn.style.display = 'inline-flex';
            if (btn.dataset.action === 'pause') btn.style.display = 'none';
            if (btn.dataset.action === 'stop') btn.style.display = 'none';
        });
    }
}

function renderActivityPage() {
    const activeApps = DataManager.getTodayActiveApps(null, Infinity);
    const activityStats = DataManager.getActivityStats(null, 7);
    const container = document.getElementById('activity-page-content');
    
    if (!container) return;
    
    const todayDisplay = new Date();
    const currentDateEl = document.getElementById('activity-current-date');
    if (currentDateEl) {
        currentDateEl.textContent = todayDisplay.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
    }
    
    if (activeApps.length === 0) {
        container.innerHTML = `
            <div class="card mt-4">
                <div class="section-header">
                    <div class="section-title">📺 今日活跃计划</div>
                    <div class="section-divider"></div>
                </div>
                <div class="empty-state">
                    <div class="empty-state__icon">📺</div>
                    <div class="empty-state__title">暂无软件数据</div>
                    <div class="empty-state__hint">添加手机和软件后即可查看今日活跃计划</div>
                </div>
            </div>
        `;
        return;
    }
    
    const urgentCount = activeApps.filter(a => a.priority === 4).length;
    const warningCount = activeApps.filter(a => a.priority === 3).length;
    
    let html = `
        <div class="card mt-4">
            <div class="section-header">
                <div class="section-title">📺 今日活跃计划</div>
                <div class="section-divider"></div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">标记已观看短剧/内容，给平台贡献活跃度</div>
            </div>
            <div style="display: flex; gap: 16px; margin-bottom: 16px; padding: 0 8px;">
                <div style="flex: 1; text-align: center; padding: 12px; background: rgba(239,68,68,0.1); border-radius: 10px;">
                    <div style="font-size: 20px; font-weight: 700; color: #ef4444;">${urgentCount}</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">立即玩</div>
                </div>
                <div style="flex: 1; text-align: center; padding: 12px; background: rgba(245,158,11,0.1); border-radius: 10px;">
                    <div style="font-size: 20px; font-weight: 700; color: #f59e0b;">${warningCount}</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">3天内</div>
                </div>
                <div style="flex: 1; text-align: center; padding: 12px; background: rgba(59,130,246,0.1); border-radius: 10px;">
                    <div style="font-size: 20px; font-weight: 700; color: #3b82f6;">${activityStats.avgDailyActive}</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">日均活跃</div>
                </div>
                <div style="flex: 1; text-align: center; padding: 12px; background: rgba(16,185,129,0.1); border-radius: 10px;">
                    <div style="font-size: 20px; font-weight: 700; color: #10b981;">${activityStats.activeRate}%</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">活跃率</div>
                </div>
            </div>
            <div style="max-height: calc(100vh - 400px); overflow-y: auto;">
    `;
    
    activeApps.forEach(app => {
        let priorityIcon = '';
        let priorityColor = '';
        let statusText = '';
        
        if (app.priority === 4) {
            priorityIcon = '⚠️';
            priorityColor = '#ef4444';
            statusText = '立即游玩';
        } else if (app.priority === 3) {
            priorityIcon = '⏳';
            priorityColor = '#f59e0b';
            statusText = `${app.daysUntilNextPlay}天后`;
        } else if (app.priority === 2) {
            priorityIcon = '📅';
            priorityColor = '#3b82f6';
            statusText = `${app.daysUntilNextPlay}天后`;
        } else {
            priorityIcon = '✓';
            priorityColor = '#10b981';
            statusText = `${app.daysUntilNextPlay}天后`;
        }
        
        let activityBadge = '';
        if (app.isActiveToday) {
            const durationText = app.activityDuration > 0 ? '(' + app.activityDuration + '分钟)' : '';
            activityBadge = '<span style="background: rgba(16,185,129,0.15); color: #10b981; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">✅ 已活跃' + durationText + '</span>';
        }
        
        let belowAvgBadge = '';
        if (app.belowAverageEarning) {
            belowAvgBadge = '<span style="background: rgba(239,68,68,0.15); color: #ef4444; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">⚡ 需多活跃</span>';
        }
        
        const key = `${app.phoneId}_${app.id}`;
        const timerState = timerStates[key];
        let elapsedSeconds = 0;
        let isRunning = false;
        if (timerState) {
            isRunning = timerState.isRunning;
            elapsedSeconds = Math.floor((Date.now() - timerState.startTime) / 1000);
        }
        
        const startBtnStyle = isRunning ? 'display: none;' : 'display: inline-flex;';
        const pauseBtnStyle = isRunning ? 'display: inline-flex;' : 'display: none;';
        const stopBtnStyle = timerState ? 'display: inline-flex;' : 'display: none;';
        
        html += `
            <div data-card-phone="${app.phoneId}" data-card-app="${app.id}" style="display: flex; flex-direction: column; padding: 12px; border-bottom: 1px solid var(--border-color); gap: 10px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="flex-shrink: 0; width: 48px; height: 48px; background: rgba(139,92,246,0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px;">📱</div>
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span style="font-weight: 600; font-size: 14px;">${app.name}</span>
                            <span style="font-size: 12px; color: var(--text-secondary);">${app.phoneName}</span>
                            <span style="font-size: 12px; color: ${priorityColor};">${priorityIcon} ${statusText}</span>
                            ${belowAvgBadge}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                            余额: ¥${app.balance.toFixed(2)} | 今日赚取: ¥${app.todayEarning.toFixed(2)}
                            ${app.averageEarning > 0 ? '| 平均: ¥' + app.averageEarning.toFixed(2) : ''}
                        </div>
                    </div>
                    ${activityBadge}
                </div>
                
                <div style="display: flex; align-items: center; gap: 12px; margin-top: 4px;">
                    <div style="flex: 1; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 12px; color: var(--text-secondary);">⏱️ 推荐: ${app.recommendedDuration}分钟</span>
                        <div data-timer="${app.phoneId}-${app.id}" data-phone-id="${app.phoneId}" data-app-id="${app.id}" style="font-size: 18px; font-weight: 700; color: #8b5cf6; font-family: monospace;">
                            ${formatDuration(elapsedSeconds)}
                        </div>
                        ${isRunning ? '<span style="font-size: 10px; color: #10b981; background: rgba(16,185,129,0.1); padding: 2px 6px; border-radius: 4px;">运行中</span>' : ''}
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <button class="timer-btn" data-action="start" data-phone="${app.phoneId}" data-app="${app.id}" data-recommended="${app.recommendedDuration}"
                            style="${startBtnStyle} align-items: center; justify-content: center; padding: 6px 12px; font-size: 12px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            ▶️ 开始
                        </button>
                        <button class="timer-btn" data-action="pause" data-phone="${app.phoneId}" data-app="${app.id}" data-recommended="${app.recommendedDuration}"
                            style="${pauseBtnStyle} align-items: center; justify-content: center; padding: 6px 12px; font-size: 12px; background: #f59e0b; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            ⏸️ 暂停
                        </button>
                        <button class="timer-btn" data-action="stop" data-phone="${app.phoneId}" data-app="${app.id}" data-recommended="${app.recommendedDuration}"
                            style="${stopBtnStyle} align-items: center; justify-content: center; padding: 6px 12px; font-size: 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            ⏹️ 停止
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
            <div style="padding: 12px; display: flex; gap: 8px; border-top: 1px solid var(--border-color);">
                <button class="btn btn-secondary flex-1" onclick="renderActivityPage()" style="font-size: 13px;">🔄 刷新推荐</button>
                <button class="btn btn-primary flex-1" onclick="markAllActive(); renderActivityPage()" style="font-size: 13px;">✅ 全部标记活跃</button>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    activeApps.forEach(app => {
        const key = `${app.phoneId}_${app.id}`;
        const timerState = timerStates[key];
        if (timerState && timerState.isRunning) {
            if (!activityTimers[key]) {
                startTimer(app.phoneId, app.id);
            }
        }
    });
}

function renderNextPlay() {
    const data = DataManager.loadData();
    const container = document.getElementById('next-play-container');
    
    if (!container) return;

    const today = getTodayLocal();
    const todayDisplay = new Date();
    const currentDateEl = document.getElementById('next-play-current-date');
    if (currentDateEl) {
        currentDateEl.textContent = todayDisplay.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
    }

    const appList = [];
    
    data.phones.forEach(phone => {
        (phone.apps || []).forEach(app => {
            const totalEarned = calculateAppEarned(app);
            const minWithdraw = app.minWithdraw || 0.3;
            
            const daysCanWait = Math.floor(totalEarned / minWithdraw);
            const remainingAmount = totalEarned % minWithdraw;
            
            const startDate = parseLocalDate(app.earningStartDate);
            const nextPlayDate = new Date(startDate);
            nextPlayDate.setDate(startDate.getDate() + daysCanWait);
            
            const daysUntilNextPlay = Math.max(0, Math.round((nextPlayDate - today) / (1000 * 60 * 60 * 24)));
            
            let statusLevel = 0;
            if (daysUntilNextPlay === 0) statusLevel = 1;
            else if (daysUntilNextPlay <= 3) statusLevel = 2;
            else if (daysUntilNextPlay <= 7) statusLevel = 3;
            else statusLevel = 4;
            
            const yearDays = 365;
            const yearTarget = minWithdraw * yearDays;
        
        appList.push({
                id: app.id,
                name: app.name,
                phoneName: phone.name,
                phoneId: phone.id,
                totalEarned: totalEarned,
                minWithdraw: minWithdraw,
                yearTarget: yearTarget,
                daysCanWait: daysCanWait,
                remainingAmount: remainingAmount,
                nextPlayDate: nextPlayDate,
                daysUntilNextPlay: daysUntilNextPlay,
                balance: app.balance || 0,
                statusLevel: statusLevel
            });
        });
    });

    appList.sort((a, b) => {
        if (a.daysUntilNextPlay === 0 && b.daysUntilNextPlay > 0) return -1;
        if (a.daysUntilNextPlay > 0 && b.daysUntilNextPlay === 0) return 1;
        return a.daysUntilNextPlay - b.daysUntilNextPlay;
    });

    if (appList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon">🎮</div>
                <div class="empty-state__title">暂无软件数据</div>
                <div class="empty-state__hint">添加手机和软件后即可查看</div>
            </div>
        `;
        return;
    }

    const urgentApps = appList.filter(a => a.daysUntilNextPlay === 0);
    const todayTodo = urgentApps.length;
    const todayTodoAmount = urgentApps.reduce((sum, a) => sum + a.balance, 0);

    let html = `
        <div class="next-play-stats">
            <div class="next-play-stat">
                <span class="next-play-stat__value">${appList.filter(a => a.daysUntilNextPlay === 0).length}</span>
                <span class="next-play-stat__label">需要立即玩</span>
            </div>
            <div class="next-play-stat">
                <span class="next-play-stat__value">${appList.filter(a => a.daysUntilNextPlay > 0 && a.daysUntilNextPlay <= 7).length}</span>
                <span class="next-play-stat__label">7天内需要玩</span>
            </div>
            <div class="next-play-stat">
                <span class="next-play-stat__value">${appList.filter(a => a.daysUntilNextPlay > 7).length}</span>
                <span class="next-play-stat__label">7天后需要玩</span>
            </div>
        </div>
    `;

    if (todayTodo > 0) {
        html += `
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 16px; padding: 16px; margin-bottom: 16px; color: white;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 13px; opacity: 0.9;">🔥 今日待办</div>
                        <div style="font-size: 24px; font-weight: 700; margin-top: 4px;">${todayTodo} 个软件需要玩</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 12px; opacity: 0.8;">待赚取金额</div>
                        <div style="font-size: 18px; font-weight: 600;">¥${todayTodoAmount.toFixed(2)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    html += `
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
            <div style="flex: 1; position: relative;">
                <input type="text" id="next-play-search" placeholder="搜索软件或手机..." 
                    style="width: 100%; padding: 10px 32px 10px 12px; border: 1px solid var(--border-color); border-radius: 10px; font-size: 13px; background: var(--bg-secondary); color: var(--text-primary);"
                    oninput="filterNextPlayList()">
                <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 14px;">🔍</span>
            </div>
        </div>
        <div style="display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap;">
            <button class="btn btn-sm btn-secondary active" onclick="filterNextPlayByStatus(0)" id="filter-all">全部</button>
            <button class="btn btn-sm" onclick="filterNextPlayByStatus(1)" id="filter-urgent" style="background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.2);">⚠️ 立即玩</button>
            <button class="btn btn-sm" onclick="filterNextPlayByStatus(2)" id="filter-warning" style="background: rgba(245,158,11,0.1); color: #f59e0b; border-color: rgba(245,158,11,0.2);">⏳ 3天内</button>
            <button class="btn btn-sm" onclick="filterNextPlayByStatus(3)" id="filter-soon" style="background: rgba(59,130,246,0.1); color: #3b82f6; border-color: rgba(59,130,246,0.2);">📅 7天内</button>
            <button class="btn btn-sm" onclick="filterNextPlayByStatus(4)" id="filter-relax" style="background: rgba(16,185,129,0.1); color: #10b981; border-color: rgba(16,185,129,0.2);">✓ 7天后</button>
        </div>
    `;

    html += '<div class="next-play-list" id="next-play-list">';

    appList.forEach((app, index) => {
        let statusClass = '';
        let statusText = '';
        let statusColor = '';
        
        if (app.daysUntilNextPlay === 0) {
            statusClass = 'next-play-item--urgent';
            statusText = '⚠️ 立即游玩';
            statusColor = '#ef4444';
        } else if (app.daysUntilNextPlay <= 3) {
            statusClass = 'next-play-item--warning';
            statusText = `⏳ ${app.daysUntilNextPlay}天后`;
            statusColor = '#f59e0b';
        } else if (app.daysUntilNextPlay <= 7) {
            statusClass = 'next-play-item--soon';
            statusText = `📅 ${app.daysUntilNextPlay}天后`;
            statusColor = '#3b82f6';
        } else {
            statusClass = 'next-play-item--relax';
            statusText = `✓ ${app.daysUntilNextPlay}天后`;
            statusColor = '#10b981';
        }

        const yearProgressPercent = Math.min(100, (app.totalEarned / app.yearTarget) * 100);
        
        html += `
            <div class="next-play-item ${statusClass}" data-status="${app.statusLevel}" data-name="${app.name}" data-phone="${app.phoneName}">
                <div class="next-play-item__rank">${index + 1}</div>
                <div class="next-play-item__content" onclick="showAppDetailModal('${app.id}')">
                    <div class="next-play-item__header">
                        <span class="next-play-item__name">${app.name}</span>
                        <span class="next-play-item__phone">${app.phoneName}</span>
                    </div>
                    <div class="next-play-item__info">
                        <div class="next-play-item__stat">
                            <span class="next-play-item__stat-label">总赚取</span>
                            <span class="next-play-item__stat-value">¥${app.totalEarned.toFixed(2)}</span>
                        </div>
                        <div class="next-play-item__stat">
                            <span class="next-play-item__stat-label">年目标</span>
                            <span class="next-play-item__stat-value">¥${app.yearTarget.toFixed(2)}</span>
                        </div>
                        <div class="next-play-item__stat">
                            <span class="next-play-item__stat-label">当前余额</span>
                            <span class="next-play-item__stat-value">¥${app.balance.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="next-play-item__progress">
                        <div class="next-play-item__progress-bar">
                            <div class="next-play-item__progress-fill" style="width: ${yearProgressPercent}%; background: ${statusColor};"></div>
                        </div>
                        <span class="next-play-item__progress-text">
                            年进度: ¥${app.totalEarned.toFixed(2)} / ¥${app.yearTarget.toFixed(2)} (${yearProgressPercent.toFixed(1)}%)
                        </span>
                    </div>
                </div>
                <div class="next-play-item__actions">
                    <button class="btn btn-sm" onclick="event.stopPropagation(); showAppDetailModal('${app.id}')" style="font-size: 10px; padding: 4px 8px;">👁️</button>
                    <button class="btn btn-sm" onclick="event.stopPropagation(); openQuickEditModal('${app.phoneId}', '${app.id}')" style="font-size: 10px; padding: 4px 8px;">✏️</button>
                </div>
                <div class="next-play-item__status" style="color: ${statusColor};">
                    <span class="next-play-item__status-text">${statusText}</span>
                    <span class="next-play-item__status-date">${app.nextPlayDate.toLocaleDateString('zh-CN')}</span>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function filterNextPlayList() {
    const searchText = document.getElementById('next-play-search').value.toLowerCase();
    const items = document.querySelectorAll('.next-play-item');
    
    items.forEach(item => {
        const name = item.getAttribute('data-name').toLowerCase();
        const phone = item.getAttribute('data-phone').toLowerCase();
        
        if (name.includes(searchText) || phone.includes(searchText)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

function filterNextPlayByStatus(status) {
    document.querySelectorAll('#filter-all, #filter-urgent, #filter-warning, #filter-soon, #filter-relax').forEach(btn => {
        btn.classList.remove('active');
        btn.style.opacity = '0.7';
    });
    
    const activeBtn = document.getElementById(status === 0 ? 'filter-all' : `filter-${['', 'urgent', 'warning', 'soon', 'relax'][status]}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.opacity = '1';
    }
    
    const items = document.querySelectorAll('.next-play-item');
    
    items.forEach(item => {
        const itemStatus = parseInt(item.getAttribute('data-status'));
        
        if (status === 0 || itemStatus === status) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// 生成 SVG 迷你曲线（输入数组为数值序列）
function buildSparklineSvg(values, width, height) {
    if (!values || values.length < 2) {
        return `<path d="M0 ${height - 2} L ${width} ${height - 2}" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-linecap="round"/>`;
    }
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = (max - min) || 1;
    const stepX = width / (values.length - 1);
    const pad = 3;
    const points = values.map((v, i) => {
        const x = i * stepX;
        const y = height - pad - ((v - min) / range) * (height - pad * 2);
        return [x, y];
    });
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    const areaPath = linePath + ` L ${width} ${height} L 0 ${height} Z`;
    const last = points[points.length - 1];
    return `
        <path d="${areaPath}" fill="rgba(255,255,255,0.18)"/>
        <path d="${linePath}" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.5" fill="#fff"/>
    `;
}

function renderExpiringApps() {
    const container = document.getElementById('expiring-apps-content');
    const card = document.getElementById('expiring-apps-card');
    if (!container || !card) return;

    const data = DataManager.loadData();
    const today = getTodayLocal();
    
    const expiringApps = [];
    const withdrawReadyApps = [];
    const clearPeriodApps = [];
    
    data.phones.forEach(phone => {
        (phone.apps || []).forEach(app => {
            const totalEarned = calculateAppEarned(app);
            const minWithdraw = app.minWithdraw || 0.3;
            const balance = app.balance || 0;
            const isDeleted = app.isDeleted === true;
            
            // 1. 余额不够最小提现金额，建议删除（只检查未删除的软件）
            if (!isDeleted && balance < minWithdraw && balance > 0) {
                withdrawReadyApps.push({
                    name: app.name,
                    phoneName: phone.name,
                    phoneId: phone.id,
                    appId: app.id,
                    balance: balance,
                    minWithdraw: minWithdraw
                });
            }
            
            // 2. 清零周期即将到达前一天（只提醒已删除的软件，下载回来）
            if (isDeleted && app.clearPeriod && app.earningStartDate) {
                const startDate = parseLocalDate(app.earningStartDate);
                const clearDate = new Date(startDate);
                clearDate.setDate(startDate.getDate() + app.clearPeriod);
                
                const daysUntilClear = Math.round((clearDate - today) / (1000 * 60 * 60 * 24));
                
                if (daysUntilClear === 1 || daysUntilClear === 0) {
                    clearPeriodApps.push({
                        name: app.name,
                        phoneName: phone.name,
                        phoneId: phone.id,
                        appId: app.id,
                        daysUntilClear: daysUntilClear,
                        clearDate: clearDate
                    });
                }
            }
            
            // 3. 到期提醒（只检查未删除的软件）
            if (!isDeleted) {
                const daysCanWait = Math.floor(totalEarned / minWithdraw);
                
                const startDate = parseLocalDate(app.earningStartDate);
                const nextPlayDate = new Date(startDate);
                nextPlayDate.setDate(startDate.getDate() + daysCanWait);
                
                const daysUntilNextPlay = Math.max(0, Math.round((nextPlayDate - today) / (1000 * 60 * 60 * 24)));
                
                if (daysUntilNextPlay <= 3 && daysUntilNextPlay >= 0) {
                    
                    expiringApps.push({
                        name: app.name,
                        phoneName: phone.name,
                        phoneId: phone.id,
                        appId: app.id,
                        daysUntilNextPlay: daysUntilNextPlay,
                        balance: balance,
                        nextPlayDate: nextPlayDate
                    });
                }
            }
        });
    });
    
    expiringApps.sort((a, b) => a.daysUntilNextPlay - b.daysUntilNextPlay);
    clearPeriodApps.sort((a, b) => a.daysUntilClear - b.daysUntilClear);
    
    const hasAlerts = expiringApps.length > 0 || withdrawReadyApps.length > 0 || clearPeriodApps.length > 0;
    
    if (!hasAlerts) {
        card.style.display = 'none';
        return;
    }
    
    card.style.display = 'block';
    
    const urgentCount = expiringApps.filter(a => a.daysUntilNextPlay === 0).length;
    const warningCount = expiringApps.filter(a => a.daysUntilNextPlay > 0 && a.daysUntilNextPlay <= 3).length;
    const withdrawCount = withdrawReadyApps.length;
    const clearCount = clearPeriodApps.length;
    
    let html = `
        <div style="padding: 12px;">
            ${urgentCount > 0 ? `
                <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%); border-left: 4px solid #ef4444; border-radius: 0 12px 12px 0; padding: 12px; margin-bottom: 12px;">
                    <div style="font-size: 13px; font-weight: 600; color: #ef4444; margin-bottom: 8px;">🔥 需要立即玩 (${urgentCount}个)</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${expiringApps.filter(a => a.daysUntilNextPlay === 0).map(app => `
                            <div class="expiring-app-item" onclick="showAppDetailModal('${app.appId}')" style="background: var(--bg-secondary); padding: 8px 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid var(--border-color);">
                                <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${app.name}</div>
                                <div style="font-size: 11px; color: var(--text-secondary);">${app.phoneName}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${clearCount > 0 ? `
                <div style="background: linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(251, 146, 60, 0.05) 100%); border-left: 4px solid #fb923c; border-radius: 0 12px 12px 0; padding: 12px; margin-bottom: 12px;">
                    <div style="font-size: 13px; font-weight: 600; color: #fb923c; margin-bottom: 8px;">⏳ 清零周期提醒 (${clearCount}个)</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;">以下已删除软件的清零周期即将到达，请及时下载回来保存</div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${clearPeriodApps.map(app => `
                            <div style="background: var(--bg-secondary); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                                <div style="flex: 1; min-width: 0;">
                                    <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${app.name}</div>
                                    <div style="font-size: 11px; color: ${app.daysUntilClear <= 0 ? '#ef4444' : '#f59e0b'};">${app.phoneName} · ${app.daysUntilClear <= 0 ? '今天到期' : app.daysUntilClear + '天后到期'}</div>
                                </div>
                                <button class="btn btn-secondary" style="font-size: 11px; padding: 4px 10px; white-space: nowrap;" onclick="restoreApp('${app.phoneId}', '${app.appId}')">已下载</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${withdrawCount > 0 ? `
                <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%); border-left: 4px solid #ef4444; border-radius: 0 12px 12px 0; padding: 12px; margin-bottom: 12px;">
                    <div style="font-size: 13px; font-weight: 600; color: #ef4444; margin-bottom: 8px;">🗑️ 建议删除 (${withdrawCount}个)</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;">以下软件余额太少，不值得继续，可以考虑删除</div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${withdrawReadyApps.map(app => `
                            <div style="background: var(--bg-secondary); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                                <div style="flex: 1; min-width: 0; cursor: pointer;" onclick="showAppDetailModal('${app.appId}')">
                                    <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${app.name}</div>
                                    <div style="font-size: 11px; color: #ef4444;">${app.phoneName} · 余额¥${app.balance.toFixed(2)}/${app.minWithdraw.toFixed(2)}</div>
                                </div>
                                <button class="btn btn-error" style="font-size: 11px; padding: 4px 10px; white-space: nowrap;" onclick="markAppDeleted('${app.phoneId}', '${app.appId}')">标记删除</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${warningCount > 0 ? `
                <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%); border-left: 4px solid #f59e0b; border-radius: 0 12px 12px 0; padding: 12px;">
                    <div style="font-size: 13px; font-weight: 600; color: #f59e0b; margin-bottom: 8px;">⏰ 3天内到期 (${warningCount}个)</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${expiringApps.filter(a => a.daysUntilNextPlay > 0 && a.daysUntilNextPlay <= 3).map(app => `
                            <div class="expiring-app-item" onclick="showAppDetailModal('${app.appId}')" style="background: var(--bg-secondary); padding: 8px 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid var(--border-color);">
                                <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${app.name}</div>
                                <div style="font-size: 11px; color: var(--text-secondary);">${app.phoneName} · ${app.daysUntilNextPlay}天后</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <button class="btn btn-secondary mt-4" onclick="showPage('next-play')" style="width: 100%;">查看全部软件状态</button>
        </div>
    `;
    
    container.innerHTML = html;
}

function renderEarningsChart() {
    const container = document.getElementById('earnings-chart-content');
    if (!container) return;

    const data = DataManager.loadData();
    const allDailyEarnings = DataManager.getAllDailyEarnings();
    
    if (allDailyEarnings.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 30px;">
                <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
                <div style="font-size: 14px; color: var(--text-secondary);">暂无收益数据</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">添加收益记录后即可查看趋势</div>
            </div>
        `;
        return;
    }
    
    const sortedEarnings = allDailyEarnings.sort((a, b) => new Date(a.date) - new Date(b.date));
    const recentEarnings = sortedEarnings.slice(-14);
    
    const labels = recentEarnings.map(e => e.date.slice(5));
    const values = recentEarnings.map(e => e.amount);
    
    const maxValue = Math.max(...values, 1);
    
    let html = `
        <div style="padding: 16px;">
            <div class="earnings-chart-container">
                <canvas id="earnings-chart-canvas"></canvas>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 12px; padding: 0 4px;">
                ${labels.map((label, index) => `
                    <div style="text-align: center; flex: 1;">
                        <div style="font-size: 10px; color: var(--text-muted);">${label}</div>
                        <div style="font-size: 11px; font-weight: 600; color: var(--text-primary); margin-top: 2px;">¥${values[index].toFixed(1)}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    setTimeout(() => {
        initEarningsChart();
    }, 100);
}

function initEarningsChart() {
    const canvas = document.getElementById('earnings-chart-canvas');
    if (!canvas) return;
    
    loadChartJs().then(Chart => {
        const data = DataManager.loadData();
        const allDailyEarnings = DataManager.getAllDailyEarnings();
        const sortedEarnings = allDailyEarnings.sort((a, b) => new Date(a.date) - new Date(b.date));
        const recentEarnings = sortedEarnings.slice(-14);
        
        const labels = recentEarnings.map(e => e.date.slice(5));
        const values = recentEarnings.map(e => e.amount);
        
        const ctx = canvas.getContext('2d');
        
        if (window.earningsChartInstance) {
            window.earningsChartInstance.destroy();
        }
        
        window.earningsChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '每日收益',
                    data: values,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#3b82f6',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6
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
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return '¥' + context.parsed.y.toFixed(2);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            color: 'var(--text-muted)',
                            font: {
                                size: 10
                            },
                            callback: function(value) {
                                return '¥' + value.toFixed(1);
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }).catch(err => {
        console.error('Failed to load Chart.js:', err);
    });
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
    const totalEarningsEl = document.getElementById('v2-total-earnings');
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
                    const yesterdayStr = formatLocalDate(yesterday);
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

// 渲染软件收益排行榜
function renderAppEarningAnalysis() {
    const card = document.getElementById('app-earning-analysis-card');
    const content = document.getElementById('app-earning-analysis-content');
    if (!card || !content) return;

    const data = DataManager.loadData();
    
    let allApps = [];
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            const totalEarned = calculateAppEarned(app);
            const totalWithdrawn = (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
            const balance = app.balance || 0;
            
            let averageDailyEarnings = 0;
            if (app.dailyEarnings) {
                const days = Object.keys(app.dailyEarnings).length;
                const total = Object.values(app.dailyEarnings).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
                averageDailyEarnings = days > 0 ? total / days : 0;
            }
            
            const minWithdraw = parseFloat(app.minWithdraw || '0') || 0;
            const canWithdraw = balance >= minWithdraw && minWithdraw > 0;
            
            let daysUntilNextPlay = 0;
            if (minWithdraw > 0) {
                const daysCanWait = Math.floor(totalEarned / minWithdraw);
                const startDate = parseLocalDate(app.earningStartDate);
                const nextPlayDate = new Date(startDate);
                nextPlayDate.setDate(startDate.getDate() + daysCanWait);
                daysUntilNextPlay = Math.max(0, Math.round((nextPlayDate - getTodayLocal()) / (1000 * 60 * 60 * 24)));
            }

            allApps.push({
                phoneName: phone.name,
                phoneId: phone.id,
                appName: app.name,
                appId: app.id,
                totalEarned,
                totalWithdrawn,
                balance,
                averageDailyEarnings,
                minWithdraw,
                canWithdraw,
                daysUntilNextPlay,
                withdrawalCount: app.withdrawals ? app.withdrawals.length : 0
            });
        });
    });

    if (allApps.length === 0) {
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';

    allApps.sort((a, b) => b.totalEarned - a.totalEarned);

    const topEarner = allApps[0];
    const totalEarnings = allApps.reduce((sum, app) => sum + app.totalEarned, 0);
    const totalBalance = allApps.reduce((sum, app) => sum + app.balance, 0);
    const canWithdrawCount = allApps.filter(a => a.canWithdraw).length;

    let html = `
        <div style="margin-bottom: 16px; position: relative; background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); border-radius: 16px; padding: 20px; overflow: hidden;">
            <div style="position: absolute; top: -30px; right: -30px; width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%; filter: blur(20px);"></div>
            <div style="position: absolute; bottom: -20px; left: -20px; width: 60px; height: 60px; background: rgba(255,255,255,0.15); border-radius: 50%; filter: blur(15px);"></div>
            
            <div style="position: relative; background: rgba(255,255,255,0.15); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); border-radius: 12px; border: 1px solid rgba(255,255,255,0.3); padding: 16px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <span style="font-size: 20px;">🏆</span>
                    <span style="font-size: 15px; font-weight: 700; color: #ffffff; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">收益排行榜总览</span>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                    <div style="background: rgba(255,255,255,0.2); border-radius: 8px; padding: 12px; text-align: center;">
                        <div style="font-size: 18px; font-weight: 700; color: #ffffff;">¥${totalEarnings.toFixed(2)}</div>
                        <div style="font-size: 10px; color: rgba(255,255,255,0.8); margin-top: 2px;">总赚取</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.2); border-radius: 8px; padding: 12px; text-align: center;">
                        <div style="font-size: 18px; font-weight: 700; color: #ffffff;">¥${totalBalance.toFixed(2)}</div>
                        <div style="font-size: 10px; color: rgba(255,255,255,0.8); margin-top: 2px;">当前余额</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.2); border-radius: 8px; padding: 12px; text-align: center;">
                        <div style="font-size: 18px; font-weight: 700; color: #ffffff;">${canWithdrawCount}</div>
                        <div style="font-size: 10px; color: rgba(255,255,255,0.8); margin-top: 2px;">可提现</div>
                    </div>
                </div>
                
                ${topEarner ? `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(255,255,255,0.2);">
                        <div style="font-size: 11px; color: rgba(255,255,255,0.9);">
                            🥇 最强赚钱软件: <strong>${topEarner.phoneName} - ${topEarner.appName}</strong>
                            <span style="margin-left: 8px;">累计赚 ¥${topEarner.totalEarned.toFixed(2)}</span>
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    const displayApps = allApps.slice(0, 6);
    displayApps.forEach((app, index) => {
        const rankIcons = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣'];
        const rankIcon = rankIcons[index] || `${index + 1}`;
        const rankColors = [
            'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
            'linear-gradient(135deg, #cd7f32 0%, #b87333 100%)',
            'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
        ];
        const cardGradient = rankColors[index] || 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)';

        html += `
            <div style="position: relative; background: ${cardGradient}; border-radius: 14px; padding: 14px; margin-bottom: 10px; overflow: hidden;">
                <div style="position: absolute; top: -15px; right: -15px; width: 50px; height: 50px; background: rgba(255,255,255,0.15); border-radius: 50%; filter: blur(12px);"></div>
                
                <div style="position: relative; background: rgba(255,255,255,0.12); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); padding: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; overflow: hidden;" onclick="showAppDetailModal('${app.appId}')">
                            <span style="font-size: 16px; flex-shrink: 0;">${rankIcon}</span>
                            <div style="min-width: 0;">
                                <div style="font-size: 13px; font-weight: 600; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${app.appName}</div>
                                <div style="font-size: 10px; color: rgba(255,255,255,0.7);">${app.phoneName}</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 4px; flex-shrink: 0;">
                            <button class="btn btn-sm" onclick="editAppFromAnalysis('${app.appId}', '${app.phoneId}')" style="font-size: 9px; padding: 3px 6px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white;">✏️</button>
                            <button class="btn btn-sm" onclick="withdrawAppFromAnalysis('${app.appId}', '${app.phoneId}')" style="font-size: 9px; padding: 3px 6px; background: rgba(56, 239, 125, 0.3); border: 1px solid rgba(56, 239, 125, 0.4); color: white;">💰</button>
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                        <div style="display: flex; gap: 12px;">
                            <div>
                                <span style="color: rgba(255,255,255,0.7); font-size: 10px;">总赚</span>
                                <span style="color: #ffffff; font-weight: 600; margin-left: 4px;">¥${app.totalEarned.toFixed(2)}</span>
                            </div>
                            <div>
                                <span style="color: rgba(255,255,255,0.7); font-size: 10px;">余额</span>
                                <span style="color: #ffffff; font-weight: 600; margin-left: 4px;">¥${app.balance.toFixed(2)}</span>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            ${app.canWithdraw ? `
                                <span style="font-size: 11px; font-weight: 600; color: #22c55e;">✅ 可提现</span>
                            ` : app.minWithdraw > 0 ? `
                                <span style="font-size: 11px; color: rgba(255,255,255,0.8);">还差 ¥${(app.minWithdraw - app.balance).toFixed(2)}</span>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${app.averageDailyEarnings > 0 ? `
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.15);">
                            <div style="display: flex; justify-content: space-between; font-size: 10px;">
                                <span style="color: rgba(255,255,255,0.7);">日均收益</span>
                                <span style="color: #ffffff; font-weight: 600;">¥${app.averageDailyEarnings.toFixed(2)}</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });

    if (allApps.length > 6) {
        html += `
            <div style="text-align: center; margin-top: 8px;">
                <button class="btn btn-sm btn-secondary" onclick="showAllAppsAnalysis()" style="font-size: 11px;">
                    查看全部 ${allApps.length} 个软件
                </button>
            </div>
        `;
    }
    content.innerHTML = html;
}

// 显示所有软件分析
function showAllAppsAnalysis() {
    const data = DataManager.loadData();
    
    let allApps = [];
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            const totalEarned = calculateAppEarned(app);
            const balance = app.balance || 0;
            
            let averageDailyEarnings = 0;
            if (app.dailyEarnings) {
                const days = Object.keys(app.dailyEarnings).length;
                const total = Object.values(app.dailyEarnings).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
                averageDailyEarnings = days > 0 ? total / days : 0;
            }
            
            const minWithdraw = parseFloat(app.minWithdraw || '0') || 0;
            const canWithdraw = balance >= minWithdraw && minWithdraw > 0;

            allApps.push({
                phoneName: phone.name,
                phoneId: phone.id,
                appName: app.name,
                appId: app.id,
                totalEarned,
                balance,
                averageDailyEarnings,
                minWithdraw,
                canWithdraw
            });
        });
    });
    
    if (allApps.length === 0) {
        showToast('暂无软件数据');
        return;
    }
    
    allApps.sort((a, b) => b.totalEarned - a.totalEarned);
    
    let html = `
        <div style="max-height: 70vh; overflow-y: auto;">
            <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color);">
                🏆 所有软件收益排行 (${allApps.length}个)
            </div>
    `;
    
    allApps.forEach((app, index) => {
        const rankIcons = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        const rankIcon = rankIcons[index] || `${index + 1}`;
        
        html += `
            <div style="padding: 12px; background: var(--bg-secondary); border-radius: 10px; margin-bottom: 10px; cursor: pointer; border: 1px solid var(--border-color);" onclick="showAppDetailModal('${app.appId}')">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 16px;">${rankIcon}</span>
                        <div>
                            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${app.appName}</div>
                            <div style="font-size: 10px; color: var(--text-secondary);">${app.phoneName}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 4px;">
                        <button class="btn btn-sm" onclick="event.stopPropagation(); editAppFromAnalysis('${app.appId}', '${app.phoneId}')" style="font-size: 9px; padding: 3px 6px;">✏️</button>
                        <button class="btn btn-sm" onclick="event.stopPropagation(); withdrawAppFromAnalysis('${app.appId}', '${app.phoneId}')" style="font-size: 9px; padding: 3px 6px;">💰</button>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                    <div style="display: flex; gap: 16px;">
                        <div>
                            <span style="color: var(--text-secondary); font-size: 10px;">总赚</span>
                            <span style="color: var(--text-primary); font-weight: 600; margin-left: 4px;">¥${app.totalEarned.toFixed(2)}</span>
                        </div>
                        <div>
                            <span style="color: var(--text-secondary); font-size: 10px;">余额</span>
                            <span style="color: var(--text-primary); font-weight: 600; margin-left: 4px;">¥${app.balance.toFixed(2)}</span>
                        </div>
                        ${app.averageDailyEarnings > 0 ? `
                        <div>
                            <span style="color: var(--text-secondary); font-size: 10px;">日均</span>
                            <span style="color: var(--text-primary); font-weight: 600; margin-left: 4px;">¥${app.averageDailyEarnings.toFixed(2)}</span>
                        </div>
                        ` : ''}
                    </div>
                    <div>
                        ${app.canWithdraw ? `
                            <span style="font-size: 11px; font-weight: 600; color: #22c55e;">✅ 可提现</span>
                        ` : app.minWithdraw > 0 ? `
                            <span style="font-size: 11px; color: var(--text-secondary);">还差 ¥${(app.minWithdraw - app.balance).toFixed(2)}</span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    
    showModal('所有软件收益排行', html, [
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
            
            <!-- 收益统计 -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;">
                <div style="background: var(--bg-cream); border-radius: 8px; padding: 10px; text-align: center;">
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-primary);">
                        ${calculateAverageDailyEarnings(targetApp).toFixed(2)}
                    </div>
                    <div style="font-size: 10px; color: var(--text-secondary);">平均日收益</div>
                </div>
                <div style="background: var(--bg-cream); border-radius: 8px; padding: 10px; text-align: center;">
                    <div style="font-size: 12px; font-weight: 600; color: var(--success-color);">
                        ${calculateMaxDailyEarnings(targetApp).toFixed(2)}
                    </div>
                    <div style="font-size: 10px; color: var(--text-secondary);">最高日收益</div>
                </div>
                <div style="background: var(--bg-cream); border-radius: 8px; padding: 10px; text-align: center;">
                    <div style="font-size: 12px; font-weight: 600; color: var(--primary-color);">
                        ${targetApp.balanceHistory ? targetApp.balanceHistory.length : 0}
                    </div>
                    <div style="font-size: 10px; color: var(--text-secondary);">记录天数</div>
                </div>
            </div>
            
            <!-- 每日赚取记录 -->
            ${targetApp.balanceHistory && targetApp.balanceHistory.length > 0 ? `
                <div style="background: var(--bg-cream); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                    <div style="font-size: 12px; font-weight: 600; margin-bottom: 10px; color: var(--text-primary);">📋 每日收益明细</div>
                    <div style="max-height: 200px; overflow-y: auto;" id="daily-earnings-scroll-${targetApp.id}">
                        ${targetApp.balanceHistory
                            .slice()
                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                            .map(record => {
                                const isToday = record.date === getCurrentDate();
                                const isPositive = record.change > 0;
                                return `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid var(--border-color); ${isToday ? 'background: rgba(56, 239, 125, 0.1);' : ''}">
                                        <div>
                                            <span style="font-size: 12px; color: var(--text-secondary);">${record.date} ${isToday ? '(今天)' : ''}</span>
                                            ${record.note ? `<span style="font-size: 10px; color: var(--text-muted); margin-left: 6px;">${record.note}</span>` : ''}
                                        </div>
                                        <div style="text-align: right;">
                                            <span style="font-size: 12px; font-weight: 600; color: ${isPositive ? '#10b981' : '#ef4444'};">
                                                ${isPositive ? '+' : ''}¥${record.change.toFixed(2)}
                                            </span>
                                            <span style="font-size: 10px; color: var(--text-muted); display: block;">余额 ¥${record.balance.toFixed(2)}</span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                    </div>
                    <script>
                        setTimeout(() => {
                            const scrollElement = document.getElementById('daily-earnings-scroll-${targetApp.id}');
                            if (scrollElement) {
                                scrollElement.scrollTop = scrollElement.scrollHeight;
                            }
                        }, 100);
                    </script>
                </div>
            ` : '<div style="background: var(--bg-cream); border-radius: 8px; padding: 12px; margin-bottom: 16px; text-align: center; color: var(--text-secondary); font-size: 12px;">暂无每日赚取记录</div>'}
            
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

function calculateAverageDailyEarnings(app) {
    if (!app || !app.balanceHistory || app.balanceHistory.length === 0) return 0;
    
    const positiveChanges = app.balanceHistory
        .filter(record => record.change > 0)
        .map(record => record.change);
    
    if (positiveChanges.length === 0) return 0;
    
    const sum = positiveChanges.reduce((a, b) => a + b, 0);
    return sum / positiveChanges.length;
}

function calculateMaxDailyEarnings(app) {
    if (!app || !app.balanceHistory || app.balanceHistory.length === 0) return 0;
    
    const max = app.balanceHistory.reduce((max, record) => {
        return record.change > 0 && record.change > max ? record.change : max;
    }, 0);
    
    return max;
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
        }

        // 判断是否是今天
        const today = getCurrentDate();
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

// 切换"更多"菜单（手机页）
function togglePhonesMoreMenu(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('phones-more-menu');
    if (!menu) return;
    menu.classList.toggle('is-open');
}

// 关闭"更多"菜单（手机页）
function closePhonesMoreMenu() {
    const menu = document.getElementById('phones-more-menu');
    if (menu) menu.classList.remove('is-open');
}

// 点击页面其它位置时自动收起"更多"菜单
document.addEventListener('click', function(e) {
    const menu = document.getElementById('phones-more-menu');
    if (!menu || !menu.classList.contains('is-open')) return;
    if (e.target.closest('.page-actions__more')) return;
    menu.classList.remove('is-open');
});

document.addEventListener('click', function(e) {
    const timerBtn = e.target.closest('.timer-btn');
    if (timerBtn) {
        const action = timerBtn.dataset.action;
        const phoneId = timerBtn.dataset.phone;
        const appId = timerBtn.dataset.app;
        const parentCard = timerBtn.closest('[data-card-phone]');
        const recommendedDuration = parseInt(timerBtn.dataset.recommended) || 0;
        
        if (action === 'start') {
            const key = `${phoneId}_${appId}`;
            const state = timerStates[key];
            const startTime = state && state.startTime ? state.startTime : Date.now();
            timerStates[key] = { startTime, isRunning: true, recommendedDuration };
            
            if (activityTimers[key]) {
                clearInterval(activityTimers[key]);
            }
            
            const update = () => {
                const currentState = timerStates[key];
                if (!currentState || !currentState.isRunning) {
                    clearInterval(activityTimers[key]);
                    return;
                }
                const elapsedSeconds = Math.floor((Date.now() - currentState.startTime) / 1000);
                
                const allTimerEls = document.querySelectorAll('[data-timer]');
                allTimerEls.forEach(el => {
                    if (el.getAttribute('data-phone-id') === phoneId && el.getAttribute('data-app-id') === appId) {
                        el.textContent = formatDuration(elapsedSeconds);
                    }
                });
                
                if (currentState.recommendedDuration > 0 && elapsedSeconds >= currentState.recommendedDuration * 60) {
                    clearInterval(activityTimers[key]);
                    
                    const durationMinutes = Math.ceil(elapsedSeconds / 60);
                    const result = DataManager.recordAppActivity(phoneId, appId, null, true, durationMinutes);
                    if (result) {
                        showToast(`已自动完成 ${durationMinutes} 分钟活跃时长`, 'success');
                    }
                    
                    delete timerStates[key];
                    
                    const allTimerEls2 = document.querySelectorAll('[data-timer]');
                    allTimerEls2.forEach(el => {
                        if (el.getAttribute('data-phone-id') === phoneId && el.getAttribute('data-app-id') === appId) {
                            el.textContent = '00:00';
                        }
                    });
                    
                    const buttons = parentCard.querySelectorAll('.timer-btn');
                    buttons.forEach(btn => {
                        if (btn.dataset.action === 'start') btn.style.display = 'inline-flex';
                        if (btn.dataset.action === 'pause') btn.style.display = 'none';
                        if (btn.dataset.action === 'stop') btn.style.display = 'none';
                    });
                }
            };
            
            update();
            activityTimers[key] = setInterval(update, 1000);
            
            console.log('parentCard:', parentCard);
            console.log('parentCard exists:', !!parentCard);
            if (parentCard) {
                const buttons = parentCard.querySelectorAll('.timer-btn');
                console.log('buttons found:', buttons.length);
                buttons.forEach(btn => {
                    console.log('button action:', btn.dataset.action, 'current display:', btn.style.display);
                    if (btn.dataset.action === 'start') btn.style.display = 'none';
                    if (btn.dataset.action === 'pause') btn.style.display = 'inline-flex';
                    if (btn.dataset.action === 'stop') btn.style.display = 'inline-flex';
                });
            }
        } else if (action === 'pause') {
            const key = `${phoneId}_${appId}`;
            const state = timerStates[key];
            if (state) {
                timerStates[key] = { ...state, isRunning: false };
            }
            if (activityTimers[key]) {
                clearInterval(activityTimers[key]);
                delete activityTimers[key];
            }
            
            const buttons = parentCard.querySelectorAll('.timer-btn');
            buttons.forEach(btn => {
                if (btn.dataset.action === 'start') btn.style.display = 'inline-flex';
                if (btn.dataset.action === 'pause') btn.style.display = 'none';
            });
        } else if (action === 'stop') {
            const key = `${phoneId}_${appId}`;
            const state = timerStates[key];
            if (state) {
                const elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
                const durationMinutes = Math.ceil(elapsedSeconds / 60);
                if (durationMinutes > 0) {
                    const result = DataManager.recordAppActivity(phoneId, appId, null, true, durationMinutes);
                    if (result) {
                        showToast(`已记录 ${durationMinutes} 分钟活跃时长`, 'success');
                    }
                }
            }
            
            delete timerStates[key];
            if (activityTimers[key]) {
                clearInterval(activityTimers[key]);
                delete activityTimers[key];
            }
            
            const allTimerEls = document.querySelectorAll('[data-timer]');
            allTimerEls.forEach(el => {
                if (el.getAttribute('data-phone-id') === phoneId && el.getAttribute('data-app-id') === appId) {
                    el.textContent = '00:00';
                }
            });
            
            const buttons = parentCard.querySelectorAll('.timer-btn');
            buttons.forEach(btn => {
                if (btn.dataset.action === 'start') btn.style.display = 'inline-flex';
                if (btn.dataset.action === 'pause') btn.style.display = 'none';
                if (btn.dataset.action === 'stop') btn.style.display = 'none';
            });
        }
    }
});

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
        
        // 计算该手机的总提现金额（仅已提现部分）
        const totalWithdrawn = calculatePhoneTotalWithdrawn(phone);
        
        // 计算该手机的当前总余额
        const totalBalance = phone.apps.reduce((sum, app) => sum + (app.balance || 0), 0);
        
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
                            <span class="stat-icon">💳</span>
                            <div class="stat-content">
                                <span class="stat-label">当前余额</span>
                                <span class="stat-value" style="color: #3b82f6;">¥${totalBalance.toFixed(2)}</span>
                            </div>
                        </div>
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

    const today = getCurrentDate();

    return phone.apps.map(app => {
        // 计算累计提现金额（仅已提现部分，不含余额）
        const totalWithdrawn = (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
        const totalWithdrawals = app.withdrawals ? app.withdrawals.length : 0;
        
        const todayActivity = app.activityLog && app.activityLog[today];
        const isActiveToday = todayActivity && todayActivity.active;
        const activityDuration = todayActivity && todayActivity.duration ? todayActivity.duration : 0;
        const todayEarning = parseFloat(app.dailyEarnings && app.dailyEarnings[today]) || 0;
        
        const totalEarned = app.balance + (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
        const minWithdraw = app.minWithdraw || 0.3;
        const daysCanWait = Math.floor(totalEarned / minWithdraw);
        const startDate = app.earningStartDate ? new Date(app.earningStartDate) : new Date();
        const nextPlayDate = new Date(startDate);
        nextPlayDate.setDate(startDate.getDate() + daysCanWait);
        const daysUntilNextPlay = Math.max(0, Math.round((nextPlayDate - new Date(today)) / (1000 * 60 * 60 * 24)));
        
        const isDeleted = app.isDeleted === true;
        
        let activityStatus = '';
        if (isDeleted) {
            activityStatus = '<span style="background: rgba(107,114,128,0.15); color: #6b7280; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">🗑️ 已删除</span>';
        } else if (isActiveToday) {
            const durationText = activityDuration > 0 ? `(${activityDuration}分钟)` : '';
            activityStatus = `<span style="background: rgba(16,185,129,0.15); color: #10b981; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">✅ 已活跃${durationText}</span>`;
        } else if (daysUntilNextPlay === 0) {
            activityStatus = '<span style="background: rgba(239,68,68,0.15); color: #ef4444; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">⚠️ 需立即玩</span>';
        } else if (daysUntilNextPlay <= 3) {
            activityStatus = '<span style="background: rgba(245,158,11,0.15); color: #f59e0b; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">⏳ ' + daysUntilNextPlay + '天后</span>';
        }

        return `
            <div class="app-card" data-app-id="${app.id}" style="${isDeleted ? 'opacity: 0.6; border-style: dashed;' : ''}">
                <div class="app-header">
                    <span class="app-name" style="${isDeleted ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${app.name}</span>
                    <span class="status-tag ${totalWithdrawals > 0 ? 'ready' : 'pending'}">
                        ${totalWithdrawals > 0 ? '有记录' : '新软件'}
                    </span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <div class="app-core-info">
                        <span class="core-label">当前余额:</span>
                        <span class="core-value">¥${(app.balance || 0).toFixed(2)}</span>
                    </div>
                    ${activityStatus}
                </div>
                <div class="app-info-row">
                    <span>累计提现: ¥${totalWithdrawn.toFixed(2)} · 今日赚取: ¥${todayEarning.toFixed(2)} · 提现次数: ${totalWithdrawals}次</span>
                </div>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="openWithdrawModal('${phone.id}', '${app.id}')">记录提现</button>
                    <button class="btn btn-secondary" onclick="openEditAppModal('${phone.id}', '${app.id}')">编辑</button>
                    ${isDeleted 
                        ? `<button class="btn btn-secondary" onclick="restoreApp('${phone.id}', '${app.id}')" style="color: #10b981;">恢复</button>` 
                        : `<button class="btn btn-error" onclick="deleteApp('${phone.id}', '${app.id}')">删除</button>`}
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

// 渲染手机每日赚取页面（独立页面）- 卡片式布局
function renderPhoneEarningsPage() {
    const card = document.getElementById('phone-daily-earnings-card-page');
    const content = document.getElementById('phone-daily-earnings-content-page');
    if (!card || !content) return;

    const phoneDailyEarnings = DataManager.getPhoneDailyEarnings();
    const phones = Object.values(phoneDailyEarnings);

    // 检查是否有任何记录
    const hasRecords = phones.some(phone => Object.keys(phone.dailyEarnings).length > 0);

    if (!hasRecords) {
        card.style.display = 'block';
        content.innerHTML = '<div class="empty-state" style="padding: 20px;">暂无每日赚取记录<br><span style="font-size: 12px; color: var(--text-secondary);">编辑软件余额后会自动记录</span></div>';
        return;
    }

    card.style.display = 'block';

    // 获取原始手机数据
    const data = DataManager.loadData();
    const phoneBalanceMap = {};
    data.phones.forEach(phone => {
        const totalBalance = phone.apps.reduce((sum, app) => sum + (app.balance || 0), 0);
        phoneBalanceMap[phone.id] = totalBalance;
    });

    // 计算总体统计
    let totalEarnings = 0;
    let totalDays = 0;
    phones.forEach(phone => {
        const dailyEarnings = phone.dailyEarnings || {};
        Object.values(dailyEarnings).forEach(amount => {
            totalEarnings += parseFloat(amount) || 0;
        });
        totalDays += Object.keys(dailyEarnings).length;
    });

    let html = '';

    // 顶部统计栏
    html += `
        <div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 120px; background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); border-radius: 12px; padding: 16px; color: white;">
                <div style="font-size: 12px; opacity: 0.9;">总手机数</div>
                <div style="font-size: 24px; font-weight: 700;">${phones.length}</div>
            </div>
            <div style="flex: 1; min-width: 120px; background: linear-gradient(135deg, #10b981 0%, #34d399 100%); border-radius: 12px; padding: 16px; color: white;">
                <div style="font-size: 12px; opacity: 0.9;">总收益天数</div>
                <div style="font-size: 24px; font-weight: 700;">${totalDays}</div>
            </div>
            <div style="flex: 1; min-width: 120px; background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); border-radius: 12px; padding: 16px; color: white;">
                <div style="font-size: 12px; opacity: 0.9;">总收益金额</div>
                <div style="font-size: 24px; font-weight: 700;">¥${totalEarnings.toFixed(2)}</div>
            </div>
        </div>
    `;

    // 手机卡片列表
    html += '<div style="display: flex; flex-direction: column; gap: 16px;">';

    phones.forEach((phone, index) => {
        const dailyEarnings = phone.dailyEarnings || {};
        const totalBalance = phoneBalanceMap[phone.phoneId] || 0;

        // 获取最近7天的日期
        const sortedDates = Object.keys(dailyEarnings).sort((a, b) => new Date(b) - new Date(a));
        const recentDates = sortedDates.slice(0, 7);

        // 计算7天总收益
        const weekTotal = recentDates.reduce((sum, date) => sum + (parseFloat(dailyEarnings[date]) || 0), 0);

        // 计算月均收益（最近30天）
        const monthDates = sortedDates.slice(0, 30);
        const monthTotal = monthDates.reduce((sum, date) => sum + (parseFloat(dailyEarnings[date]) || 0), 0);
        const monthAvg = monthDates.length > 0 ? monthTotal / monthDates.length : 0;

        // 胶囊颜色
        const capsuleColors = ['purple', 'green', 'blue', 'orange', 'pink', 'cyan'];
        const capsuleColor = capsuleColors[index % capsuleColors.length];

        html += `
            <div style="background: var(--card-bg); border-radius: 16px; padding: 16px; border: 1px solid var(--border-color); box-shadow: var(--shadow-soft);">
                <!-- 手机头部 -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%); color: white; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                            📱 ${phone.phoneName}
                        </span>
                    </div>
                    <span style="color: #3b82f6; font-weight: 600; font-size: 16px;">💳 ¥${totalBalance.toFixed(2)}</span>
                </div>

                <!-- 最近7天收益 -->
                <div style="margin-bottom: 12px;">
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">最近7天收益：</div>
                    <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px;">
                        ${recentDates.length > 0 ? recentDates.map(date => {
                            const amount = parseFloat(dailyEarnings[date]) || 0;
                            const dateObj = new Date(date);
                            const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
                            return `
                                <div style="flex-shrink: 0; background: ${amount > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.02)'}; border-radius: 8px; padding: 8px 12px; text-align: center; min-width: 60px;">
                                    <div style="font-size: 11px; color: var(--text-secondary);">${dateStr}</div>
                                    <div style="font-size: 14px; font-weight: 600; color: ${amount > 0 ? '#10b981' : 'var(--text-secondary)'};">${amount > 0 ? '¥' + amount.toFixed(1) : '-'}</div>
                                </div>
                            `;
                        }).join('') : '<div style="color: var(--text-secondary); font-size: 12px;">暂无近期记录</div>'}
                    </div>
                </div>

                <!-- 统计信息 -->
                <div style="display: flex; gap: 16px; padding-top: 12px; border-top: 1px solid var(--border-color);">
                    <div style="flex: 1;">
                        <div style="font-size: 11px; color: var(--text-secondary);">7天总计</div>
                        <div style="font-size: 16px; font-weight: 600; color: #10b981;">¥${weekTotal.toFixed(2)}</div>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 11px; color: var(--text-secondary);">月均收益</div>
                        <div style="font-size: 16px; font-weight: 600; color: var(--primary-color);">¥${monthAvg.toFixed(2)}</div>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 11px; color: var(--text-secondary);">记录天数</div>
                        <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">${sortedDates.length}天</div>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';

    content.innerHTML = html;
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

// 渲染软件明细页面
function renderAppDetailsPage() {
    const container = document.getElementById('app-details-content');
    if (!container) return;
    
    const data = DataManager.loadData();
    
    if (data.phones.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无手机数据</div>';
        return;
    }
    
    let html = '';
    
    data.phones.forEach(phone => {
        html += `<div class="card mt-4">`;
        html += `<div class="section-header">`;
        html += `<div class="section-title">📱 ${phone.name}</div>`;
        html += `<div class="section-divider"></div>`;
        html += `</div>`;
        
        if (phone.apps.length === 0) {
            html += `<div class="empty-state" style="padding: 16px;">暂无软件</div>`;
        } else {
            phone.apps.forEach(app => {
                const balance = app.balance || 0;
                const withdrawn = app.withdrawn || 0;
                const historicalWithdrawn = app.historicalWithdrawn || 0;
                const totalEarned = balance + withdrawn + historicalWithdrawn;
                const totalWithdrawn = withdrawn + historicalWithdrawn;
                
                html += `<div style="padding: 16px; border-bottom: 1px solid var(--border-color);">`;
                html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">`;
                html += `<div style="font-weight: 600; font-size: 16px;">${app.name}</div>`;
                html += `<div style="font-size: 14px; color: var(--text-secondary);">总收益: ¥${totalEarned.toFixed(2)}</div>`;
                html += `</div>`;
                
                // 左右布局的明细切换
                const hasEarnings = app.dailyEarnings && Object.keys(app.dailyEarnings).length > 0;
                const hasWithdrawals = app.withdrawals && app.withdrawals.length > 0;
                const appIdSafe = `${phone.id}_${app.id}`.replace(/[^a-zA-Z0-9]/g, '_');
                
                html += `<div style="display: flex; gap: 12px; margin-top: 12px;">`;
                
                // 收入明细卡片（左侧）
                html += `<div style="flex: 1; cursor: pointer; border: 2px solid ${hasEarnings ? '#10b981' : 'rgba(16, 185, 129, 0.3)'}; border-radius: 12px; padding: 12px; background: ${hasEarnings ? 'rgba(16, 185, 129, 0.05)' : 'rgba(0,0,0,0.02)'}; transition: all 0.2s ease;" onclick="toggleAppDetail('${appIdSafe}', 'earnings')">`;
                html += `<div style="display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 14px; font-weight: 600; color: #10b981;">`;
                html += `<span>📈</span>`;
                html += `<span>收入明细</span>`;
                html += `</div>`;
                html += `<div style="text-align: center; margin-top: 6px; font-size: 13px; color: ${hasEarnings ? '#10b981' : 'var(--text-secondary)'}; font-weight: 500;">¥${totalEarned.toFixed(2)}</div>`;
                html += `<div style="text-align: center; font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${hasEarnings ? Object.keys(app.dailyEarnings).length + '条记录' : '暂无记录'}</div>`;
                html += `</div>`;
                
                // 提现明细卡片（右侧）
                html += `<div style="flex: 1; cursor: pointer; border: 2px solid ${hasWithdrawals ? '#3b82f6' : 'rgba(59, 130, 246, 0.3)'}; border-radius: 12px; padding: 12px; background: ${hasWithdrawals ? 'rgba(59, 130, 246, 0.05)' : 'rgba(0,0,0,0.02)'}; transition: all 0.2s ease;" onclick="toggleAppDetail('${appIdSafe}', 'withdrawals')">`;
                html += `<div style="display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 14px; font-weight: 600; color: #3b82f6;">`;
                html += `<span>💰</span>`;
                html += `<span>提现明细</span>`;
                html += `</div>`;
                html += `<div style="text-align: center; margin-top: 6px; font-size: 13px; color: ${hasWithdrawals ? '#3b82f6' : 'var(--text-secondary)'}; font-weight: 500;">¥${totalWithdrawn.toFixed(2)}</div>`;
                html += `<div style="text-align: center; font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${hasWithdrawals ? app.withdrawals.length + '条记录' : '暂无记录'}</div>`;
                html += `</div>`;
                
                html += `</div>`;
                
                // 收入明细详情（默认隐藏）
                html += `<div id="earnings_${appIdSafe}" style="display: none; margin-top: 12px; animation: slideDown 0.3s ease;">`;
                html += `<div style="font-size: 13px; font-weight: 600; color: #10b981; margin-bottom: 8px;">📈 收入明细</div>`;
                if (hasEarnings) {
                    html += `<div style="display: flex; flex-direction: column; gap: 6px;">`;
                    Object.entries(app.dailyEarnings)
                        .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                        .forEach(([date, amount]) => {
                            html += `<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(16, 185, 129, 0.05); border-radius: 8px; border-left: 3px solid #10b981;">`;
                            html += `<span style="font-size: 13px; color: var(--text-primary);">${date}</span>`;
                            html += `<span style="font-size: 14px; font-weight: 600; color: #10b981;">+¥${parseFloat(amount).toFixed(2)}</span>`;
                            html += `</div>`;
                        });
                    html += `</div>`;
                } else {
                    html += `<div style="font-size: 13px; color: var(--text-secondary); padding: 16px; text-align: center; background: rgba(0,0,0,0.02); border-radius: 8px;">暂无收入记录</div>`;
                }
                html += `</div>`;
                
                // 提现明细详情（默认隐藏）
                html += `<div id="withdrawals_${appIdSafe}" style="display: none; margin-top: 12px; animation: slideDown 0.3s ease;">`;
                html += `<div style="font-size: 13px; font-weight: 600; color: #3b82f6; margin-bottom: 8px;">💰 提现明细</div>`;
                if (hasWithdrawals) {
                    html += `<div style="display: flex; flex-direction: column; gap: 6px;">`;
                    app.withdrawals
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .forEach(wd => {
                            html += `<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(59, 130, 246, 0.05); border-radius: 8px; border-left: 3px solid #3b82f6;">`;
                            html += `<span style="font-size: 13px; color: var(--text-primary);">${wd.date}</span>`;
                            html += `<span style="font-size: 14px; font-weight: 600; color: #3b82f6;">-¥${parseFloat(wd.amount).toFixed(2)}</span>`;
                            html += `</div>`;
                        });
                    html += `</div>`;
                } else {
                    html += `<div style="font-size: 13px; color: var(--text-secondary); padding: 16px; text-align: center; background: rgba(0,0,0,0.02); border-radius: 8px;">暂无提现记录</div>`;
                }
                html += `</div>`;
                
                html += `</div>`;
            });
        }
        
        html += `</div>`;
    });
    
    container.innerHTML = html;
}

// 切换软件明细显示
function toggleAppDetail(appIdSafe, type) {
    const earningsDiv = document.getElementById(`earnings_${appIdSafe}`);
    const withdrawalsDiv = document.getElementById(`withdrawals_${appIdSafe}`);
    
    if (!earningsDiv || !withdrawalsDiv) return;
    
    if (type === 'earnings') {
        // 切换收入明细
        if (earningsDiv.style.display === 'none') {
            earningsDiv.style.display = 'block';
            withdrawalsDiv.style.display = 'none';
        } else {
            earningsDiv.style.display = 'none';
        }
    } else {
        // 切换提现明细
        if (withdrawalsDiv.style.display === 'none') {
            withdrawalsDiv.style.display = 'block';
            earningsDiv.style.display = 'none';
        } else {
            withdrawalsDiv.style.display = 'none';
        }
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
            <label class="form-label">提现门槛 (元) <span style="color: #ef4444;">*</span></label>
            <input type="number" id="app-min-withdraw" class="form-input" placeholder="0.00" step="0.01" value="0.3" min="0.01" required>
            <div class="form-hint">达到此金额才能提现，必须大于0</div>
        </div>
        <div class="form-group">
            <label class="form-label">高档提现额度 (元)</label>
            <input type="number" id="app-high-withdraw" class="form-input" placeholder="0.00" step="0.01" value="3.00" min="0">
            <div class="form-hint">推荐的高档提现金额，不设置则使用最小提现金额</div>
        </div>
        <div class="form-group">
            <label class="form-label">清零周期 (天)</label>
            <input type="number" id="app-clear-period" class="form-input" placeholder="0" step="1" value="0" min="0">
            <div class="form-hint">超过此天数未登录将清空余额，0表示无清零规则</div>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        {
            text: '添加',
            class: 'btn-primary',
            action: () => {
                const input = document.getElementById('app-names').value.trim();
                const balance = parseFloat(document.getElementById('app-balance').value) || 0;
                const minWithdraw = parseFloat(document.getElementById('app-min-withdraw').value);
                const highWithdraw = parseFloat(document.getElementById('app-high-withdraw').value) || 0;
                const clearPeriod = parseInt(document.getElementById('app-clear-period').value) || 0;

                if (!input) {
                    showToast('请输入软件名称');
                    return;
                }
                
                if (!minWithdraw || minWithdraw <= 0) {
                    showToast('最小提现金额必须大于0');
                    return;
                }

                // 解析软件名称（支持换行或逗号分隔）
                const names = input.split(/[\n,]/).map(n => n.trim()).filter(n => n);
                let addedCount = 0;
                names.forEach(name => {
                    try {
                        DataManager.addApp(phoneId, { name, balance, minWithdraw, highWithdraw, clearPeriod });
                        addedCount++;
                    } catch (error) {
                        showToast(error.message);
                    }
                });
                renderPhones();

                closeModal();
            }
        }
    ]);
}

// 打开编辑软件模态框
function openEditAppModal(phoneId, appId, fromQuickEdit = false) {
    console.log('openEditAppModal called with:', phoneId, appId, 'fromQuickEdit:', fromQuickEdit);
    // 先关闭当前模态框
    closeModal();
    currentPhoneId = phoneId;
    currentAppId = appId;
    
    // 保存当前软件名称，用于快速编辑后返回
    let currentAppName = '';
    if (fromQuickEdit) {
        const data = DataManager.loadData();
        const phone = data.phones.find(p => p.id === phoneId);
        const app = phone ? phone.apps.find(a => a.id === appId) : null;
        currentAppName = app ? app.name : '';
    }
    
    const data = DataManager.loadData();
    console.log('Loaded data:', data);
    const phone = data.phones.find(p => p.id === phoneId);
    console.log('Found phone:', phone);
    const app = phone ? phone.apps.find(a => a.id === appId) : null;
    console.log('Found app:', app);
    
    if (!app) {
        console.log('App not found');
        return;
    }
    
    // 计算预测每日收益
    const predictedDailyEarnings = DataManager.calculatePredictedDailyEarnings(app);
    const currentBalance = app.balance || 0;
    const predictedBalance = currentBalance + predictedDailyEarnings;
    
    // 获取历史收益数据用于显示
    const dailyEarnings = app.dailyEarnings || {};
    const earningsCount = Object.keys(dailyEarnings).length;
    const avgEarnings = earningsCount > 0 
        ? (Object.values(dailyEarnings).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) / earningsCount).toFixed(2)
        : '0.00';
    
    showModal('编辑软件', `
        <div class="form-group">
            <label class="form-label">软件名称</label>
            <input type="text" id="edit-app-name" class="form-input" value="${app.name}">
        </div>
        <div class="form-group">
            <label class="form-label">当前余额 (元) <span style="color: var(--text-secondary); font-size: 12px;">(预测今日: ¥${predictedBalance.toFixed(2)})</span></label>
            <div style="position: relative;">
                <input type="number" id="edit-app-balance" class="form-input" value="${currentBalance.toFixed(2)}" step="0.01" style="padding-right: 40px;" onclick="this.select();" onfocus="this.select();">
                <button type="button" onclick="document.getElementById('edit-app-balance').value=''; document.getElementById('edit-app-balance').focus();" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 16px; padding: 4px;">✕</button>
            </div>
            <div class="form-hint">
                软件账户中当前可提现的金额
                ${earningsCount > 0 ? `<br><span style="color: #10b981;">📊 基于${earningsCount}天历史数据，平均日收益¥${avgEarnings}，预测今日¥${predictedDailyEarnings.toFixed(2)}</span>` : '<br><span style="color: var(--text-secondary);">暂无历史数据，使用最小提现金额作为预测</span>'}
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">提现门槛 (元)</label>
            <input type="number" id="edit-app-min-withdraw" class="form-input" value="${(app.minWithdraw || 0).toFixed(2)}" step="0.01">
            <div class="form-hint">达到此金额才能提现（0表示无门槛）</div>
        </div>
        <div class="form-group">
            <label class="form-label">高档提现额度 (元)</label>
            <input type="number" id="edit-app-high-withdraw" class="form-input" value="${(app.highWithdraw || 0).toFixed(2)}" step="0.01">
            <div class="form-hint">推荐的高档提现金额，不设置则使用最小提现金额</div>
        </div>
        <div class="form-group">
            <label class="form-label">清零周期 (天)</label>
            <input type="number" id="edit-app-clear-period" class="form-input" value="${(app.clearPeriod || 0)}" step="1" min="0">
            <div class="form-hint">超过此天数未登录将清空余额，0表示无清零规则</div>
        </div>
        <div class="form-group">
            <label class="form-label">累计已提现 (元)</label>
            <div style="position: relative;">
                <input type="number" id="edit-app-historical" class="form-input" value="${(app.historicalWithdrawn || 0).toFixed(2)}" step="0.01" style="padding-right: 40px;">
                <button type="button" onclick="document.getElementById('edit-app-historical').value=''; document.getElementById('edit-app-historical').focus();" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 16px; padding: 4px;">✕</button>
            </div>
            <div class="form-hint">修改历史提现金额（如需补录之前的提现记录）</div>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        {
            text: '保存',
            class: 'btn-primary',
            action: function() {
                // 防重复策略4: 使用操作锁
                const lockKey = `editApp_${phoneId}_${appId}`;
                if (!acquireLock(lockKey)) {
                    console.log('保存操作正在执行中，跳过重复点击');
                    return;
                }
                
                // 防重复策略5: 禁用按钮防止重复点击
                const saveBtn = document.querySelector('#modal-buttons .btn-primary');
                if (saveBtn) {
                    saveBtn.disabled = true;
                    saveBtn.textContent = '保存中...';
                }
                
                const name = document.getElementById('edit-app-name').value.trim();
                const newBalance = parseFloat(document.getElementById('edit-app-balance').value) || 0;
                const minWithdraw = parseFloat(document.getElementById('edit-app-min-withdraw').value) || 0;
                const highWithdraw = parseFloat(document.getElementById('edit-app-high-withdraw').value) || 0;
                const clearPeriod = parseInt(document.getElementById('edit-app-clear-period').value) || 0;
                const historicalWithdrawn = parseFloat(document.getElementById('edit-app-historical').value) || 0;

                if (name) {
                    try {
                        // 确保最小提现金额大于0
                        if (minWithdraw <= 0) {
                            showToast('最小提现金额必须大于0', 'error');
                            // 恢复按钮状态
                            if (saveBtn) {
                                saveBtn.disabled = false;
                                saveBtn.textContent = '保存';
                            }
                            releaseLock(lockKey);
                            return;
                        }
                        
                        // 获取原余额
                        const oldBalance = app.balance || 0;
                        // 计算本次赚取金额（余额增量）
                        const earnedAmount = newBalance - oldBalance;
                        
                        // 验证：如果本次赚取金额大于0且小于最小提现金额，先保存余额再跳转到提现模态框
                        if (earnedAmount > 0 && earnedAmount < minWithdraw) {
                            console.log('本次赚取金额', earnedAmount, '小于最小提现金额', minWithdraw, '先保存余额再跳转');
                            
                            // 先保存余额
                            const result = DataManager.editApp(phoneId, appId, {
                            name,
                            balance: newBalance,
                            minWithdraw,
                            highWithdraw,
                            clearPeriod,
                            historicalWithdrawn
                        });
                            if (saveBtn) {
                                saveBtn.disabled = false;
                                saveBtn.textContent = '保存';
                            }
                            releaseLock(lockKey);
                            
                            // 关闭当前模态框
                            closeModal();
                            
                            // 刷新页面数据
                            renderPhones();
                            renderTotalEarnings();
                            renderYearlyGoal();
                            renderAppEarningsRanking();
                            
                            // 跳转到提现模态框（增加延迟确保模态框完全关闭）
                            setTimeout(() => {
                                console.log('验证通过，打开提现模态框', phoneId, appId);
                                openWithdrawModal(phoneId, appId);
                            }, 200);
                            
                            return;
                        }
                        
                        const result = DataManager.editApp(phoneId, appId, {
                            name,
                            balance: newBalance,
                            minWithdraw,
                            highWithdraw,
                            clearPeriod,
                            historicalWithdrawn
                        });
                        
                        // 先关闭模态框
                        closeModal();
                        renderPhones();
                        
                        // 立即更新首页总赚取金额
                        renderTotalEarnings();
                        
                        // 立即更新年度目标
                        renderYearlyGoal();
                        
                        // 如果是从快速编辑进入的，返回到软件选择页面（第一级）
                        if (fromQuickEdit) {
                            setTimeout(() => {
                                openQuickEditModal();
                            }, 100);
                        }
    
                    } catch (error) {
                        console.error('编辑软件失败:', error);

                        // 恢复按钮状态
                        if (saveBtn) {
                            saveBtn.disabled = false;
                            saveBtn.textContent = '保存';
                        }
                    } finally {
                        // 延迟释放锁
                        setTimeout(() => releaseLock(lockKey), LOCK_DURATION);
                    }
                } else {
                    // 恢复按钮状态
                    if (saveBtn) {
                        saveBtn.disabled = false;
                        saveBtn.textContent = '保存';
                    }
                    releaseLock(lockKey);
                }
            }
        }
    ]);
}

// 打开提现模态框
function openWithdrawModal(phoneId, appId) {
    console.log('openWithdrawModal called:', phoneId, appId);
    
    // 确保模态框状态重置
    modalIsShowing = false;
    
    currentPhoneId = phoneId;
    currentAppId = appId;
    
    const data = DataManager.loadData();
    const phone = data.phones.find(p => p.id === phoneId);
    const app = phone ? phone.apps.find(a => a.id === appId) : null;
    
    if (!app) {
        console.log('App not found');
        return;
    }
    
    const totalWithdrawn = (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
    const minWithdrawAmount = app.minWithdraw || 0;
    const currentBalance = app.balance || 0;
    
    showModal('记录提现', `
        <div class="form-group">
            <label class="form-label">软件名称</label>
            <input type="text" class="form-input" value="${app.name}" disabled>
        </div>
        <div class="form-group">
            <label class="form-label">当前余额 (元)</label>
            <input type="text" class="form-input" value="${currentBalance.toFixed(2)}" disabled>
        </div>
        <div class="form-group">
            <label class="form-label">累计已提现 (元)</label>
            <input type="text" class="form-input" value="${totalWithdrawn.toFixed(2)}" disabled>
        </div>
        <div class="form-group">
            <label class="form-label">本次提现金额 (元)</label>
            <input type="number" id="withdraw-amount" class="form-input" value="${minWithdrawAmount.toFixed(2)}" placeholder="输入提现金额" step="0.01">
        </div>
        <div class="form-group">
            <label class="form-label">提现日期</label>
            <input type="date" id="withdraw-date" class="form-input" value="${getCurrentDate()}">
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

// 从软件赚取分析页面提现
function withdrawAppFromAnalysis(appId, phoneId) {
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
            <label class="form-label">提现门槛 (元) <span style="color: #ef4444;">*</span></label>
            <input type="number" id="batch-app-min-withdraw" class="form-input" placeholder="0.00" step="0.01" value="0.3" min="0.01" required>
            <div class="form-hint">批量添加时所有软件的默认提现门槛，必须大于0</div>
        </div>
        <div class="form-group">
            <label class="form-label">高档提现额度 (元)</label>
            <input type="number" id="batch-app-high-withdraw" class="form-input" placeholder="0.00" step="0.01" value="3.00" min="0">
            <div class="form-hint">批量添加时所有软件的默认高档提现额度</div>
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
                const minWithdraw = parseFloat(document.getElementById('batch-app-min-withdraw').value);
                const highWithdraw = parseFloat(document.getElementById('batch-app-high-withdraw').value) || 0;

                if (!input) {
                    showToast('请输入软件名称');
                    return;
                }
                
                if (!minWithdraw || minWithdraw <= 0) {
                    showToast('最小提现金额必须大于0');
                    return;
                }

                // 重新获取最新数据
                const currentData = DataManager.loadData();
                const currentPhoneCount = currentData.phones.length;
                
                // 解析软件名称（支持换行或逗号分隔）
                const names = input.split(/[\n,]/).map(n => n.trim()).filter(n => n);
                let totalAddedCount = 0;

                // 为每部手机添加软件
                currentData.phones.forEach(phone => {
                    names.forEach(name => {
                        try {
                            DataManager.addApp(phone.id, { name, balance, minWithdraw, highWithdraw });
                            totalAddedCount++;
                        } catch (error) {
                            showToast(error.message);
                        }
                    });
                });

                renderPhones();

                closeModal();
            }
        }
    ]);
}

function openBatchEditHighWithdrawModal() {
    const data = DataManager.loadData();
    
    if (data.phones.length === 0 || data.phones.every(phone => phone.apps.length === 0)) {
        showToast('暂无软件可编辑');
        return;
    }
    
    const appNameMap = new Map();
    
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            if (!appNameMap.has(app.name)) {
                appNameMap.set(app.name, []);
            }
            appNameMap.get(app.name).push({ phoneId: phone.id, appId: app.id, phoneName: phone.name, ...app });
        });
    });
    
    let appsHtml = '';
    let appIndex = 0;
    
    appNameMap.forEach((apps, name) => {
        const firstApp = apps[0];
        appsHtml += `
            <div class="batch-edit-row" data-app-name="${name}">
                <div class="batch-edit-info">
                    <div class="batch-edit-name">${name}</div>
                    <div class="batch-edit-phone">📱 ${apps.length}部手机</div>
                </div>
                <div class="batch-edit-input">
                    <input type="number" 
                           id="batch-high-withdraw-${appIndex}" 
                           class="form-input batch-high-withdraw-input"
                           value="${(firstApp.highWithdraw || firstApp.minWithdraw).toFixed(2)}" 
                           step="0.01" 
                           min="0">
                </div>
                <div class="batch-edit-input">
                    <input type="number" 
                           id="batch-clear-period-${appIndex}" 
                           class="form-input batch-clear-period-input"
                           value="${(firstApp.clearPeriod || 0)}" 
                           step="1" 
                           min="0"
                           placeholder="0">
                </div>
            </div>
        `;
        appIndex++;
    });
    
    showModal('批量编辑软件设置', `
        <div class="batch-edit-header">
            <div class="batch-edit-quick">
                <label class="form-label">全部设置高档额度为 (元)</label>
                <input type="number" id="batch-set-all-high-withdraw" class="form-input" placeholder="0.00" step="0.01" min="0">
                <button class="btn btn-secondary btn-sm" onclick="batchSetAllHighWithdraw()">应用到全部</button>
            </div>
            <div class="batch-edit-quick mt-2">
                <label class="form-label">全部设置清零周期为 (天)</label>
                <input type="number" id="batch-set-all-clear-period" class="form-input" placeholder="0" step="1" min="0">
                <button class="btn btn-secondary btn-sm" onclick="batchSetAllClearPeriod()">应用到全部</button>
            </div>
        </div>
        <div class="batch-edit-list">
            <div class="batch-edit-row batch-edit-header-row">
                <div class="batch-edit-info">
                    <div class="batch-edit-name">软件名称</div>
                </div>
                <div class="batch-edit-input">
                    <div style="font-size: 12px; color: var(--text-secondary);">高档额度</div>
                </div>
                <div class="batch-edit-input">
                    <div style="font-size: 12px; color: var(--text-secondary);">清零周期</div>
                </div>
            </div>
            ${appsHtml}
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        {
            text: '保存',
            class: 'btn-primary',
            action: () => {
                let appIndex = 0;
                let changedCount = 0;
                
                appNameMap.forEach((apps, name) => {
                    const highWithdrawInput = document.getElementById(`batch-high-withdraw-${appIndex}`);
                    const clearPeriodInput = document.getElementById(`batch-clear-period-${appIndex}`);
                    
                    const newHighWithdraw = parseFloat(highWithdrawInput.value) || 0;
                    const newClearPeriod = parseInt(clearPeriodInput.value) || 0;
                    
                    apps.forEach(app => {
                        const oldHighWithdraw = app.highWithdraw || 0;
                        const oldClearPeriod = app.clearPeriod || 0;
                        
                        if (newHighWithdraw !== oldHighWithdraw || newClearPeriod !== oldClearPeriod) {
                            try {
                                DataManager.editApp(app.phoneId, app.appId, {
                                    name: app.name,
                                    balance: app.balance,
                                    minWithdraw: app.minWithdraw,
                                    highWithdraw: newHighWithdraw,
                                    clearPeriod: newClearPeriod,
                                    historicalWithdrawn: app.historicalWithdrawn || 0
                                });
                                changedCount++;
                            } catch (error) {
                                showToast(error.message);
                            }
                        }
                    });
                    
                    appIndex++;
                });
                
                showToast(`成功修改 ${changedCount} 个软件的设置！`);
                renderPhones();
                closeModal();
            }
        }
    ]);
}

function batchSetAllHighWithdraw() {
    const value = document.getElementById('batch-set-all-high-withdraw').value;
    if (!value) return;
    
    document.querySelectorAll('.batch-high-withdraw-input').forEach(input => {
        input.value = value;
    });
}

function batchSetAllClearPeriod() {
    const value = document.getElementById('batch-set-all-clear-period').value;
    if (!value) return;
    
    document.querySelectorAll('.batch-clear-period-input').forEach(input => {
        input.value = value;
    });
}

// 删除软件
function deleteApp(phoneId, appId) {
    if (confirm('确定要删除这个软件吗？')) {
        DataManager.deleteApp(phoneId, appId);
        renderPhones();
        
    }
}

function markAppDeleted(phoneId, appId) {
    if (confirm('确定要标记这个软件为已删除吗？\n\n标记后该软件将不再显示在正常列表中，但会在清零周期快到时提醒您下载回来。')) {
        DataManager.markAppDeleted(phoneId, appId);
        renderDashboard();
        showToast('已标记为删除');
    }
}

function restoreApp(phoneId, appId) {
    if (confirm('确定要恢复这个软件吗？')) {
        DataManager.restoreApp(phoneId, appId);
        renderDashboard();
        showToast('已恢复软件');
    }
}

// 快速编辑功能 - 第一步：选择软件（去重显示）
function openQuickEditModal() {
    const data = DataManager.loadData();
    
    // 获取所有软件并去重（按软件名称）
    const appNameMap = new Map();
    
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            if (!appNameMap.has(app.name)) {
                appNameMap.set(app.name, []);
            }
            appNameMap.get(app.name).push({
                phoneId: phone.id,
                phoneName: phone.name,
                appId: app.id,
                app: app
            });
        });
    });
    
    // 如果没有软件，提示用户
    if (appNameMap.size === 0) {
        showToast('暂无软件可编辑');
        return;
    }
    
    // 生成软件列表HTML - 使用data属性存储appName，避免引号问题
    const appListHtml = Array.from(appNameMap.keys()).map((appName, index) => {
        const appInstances = appNameMap.get(appName);
        // 对appName进行HTML转义，避免显示问题
        const htmlEscapedAppName = appName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `
            <div class="app-select-item" data-app-name="${htmlEscapedAppName}" data-app-index="${index}" style="padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s;" 
                 onmouseover="this.style.borderColor='var(--primary-color)'; this.style.background='var(--bg-cream)'" 
                 onmouseout="this.style.borderColor='var(--border-color)'; this.style.background='transparent'">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600;">${htmlEscapedAppName}</span>
                    <span style="font-size: 12px; color: var(--text-secondary);">${appInstances.length}台手机</span>
                </div>
            </div>
        `;
    }).join('');
    
    // 保存appNameMap到全局变量，供后续使用
    window.quickEditAppMap = appNameMap;
    window.quickEditAppNames = Array.from(appNameMap.keys());
    
    showModal('快速编辑 - 选择软件', `
        <div style="margin-bottom: 12px; color: var(--text-secondary); font-size: 13px;">
            选择要编辑的软件（同名软件合并显示）
        </div>
        <button onclick="startVoiceInput()" style="width: 100%; padding: 12px; margin-bottom: 8px; background: linear-gradient(135deg, #f59e0b, #fbbf24); border: none; border-radius: 8px; color: white; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;" 
                onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
            🎤 语音输入余额
        </button>
        <div style="margin-bottom: 16px;">
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">⌨️ 或直接输入：手机名称，软件名称，余额</div>
            <div style="display: flex; gap: 8px;">
                <input type="text" id="quick-text-input" class="form-input" placeholder="例如：小米手机，抖音，35.5" style="flex: 1;">
                <button onclick="parseTextInput()" class="btn btn-secondary" style="white-space: nowrap;">解析</button>
            </div>
        </div>
        <div id="quick-edit-app-list" style="max-height: 50vh; overflow-y: auto;">
            ${appListHtml}
        </div>
    `, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ], true);
    
    // 绑定点击事件（使用事件委托，避免内联onclick的引号问题）
    setTimeout(() => {
        const appList = document.getElementById('quick-edit-app-list');
        if (appList) {
            appList.querySelectorAll('.app-select-item').forEach(item => {
                item.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-app-index'));
                    const appName = window.quickEditAppNames[index];
                    selectAppForEdit(appName);
                });
            });
        }
    }, 100);
}

// 快速编辑功能 - 第二步：选择手机
function selectAppForEdit(appName) {
    // 先关闭当前模态框
    closeModal();
    
    // 延迟执行，确保closeModal完成
    setTimeout(() => {
        const appInstances = window.quickEditAppMap.get(appName);
        
        if (!appInstances) {
            showToast('未找到该软件信息', 'error');
            return;
        }
        
        // 保存当前选择的软件实例列表
        window.quickEditCurrentAppInstances = appInstances;
        
        // 生成手机列表HTML - 使用data属性存储ID，避免引号问题
        const phoneListHtml = appInstances.map((instance, index) => {
            const balance = instance.app.balance || 0;
            const totalWithdrawn = (instance.app.withdrawn || 0) + (instance.app.historicalWithdrawn || 0);
            // 对phoneName进行HTML转义
            const htmlEscapedPhoneName = instance.phoneName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            // 检查是否可以提现（余额大于0即可提现，不限制最小金额）
            const canWithdraw = balance > 0;
            return `
                <div class="phone-select-item" data-phone-index="${index}" style="padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s;" 
                     onmouseover="this.style.borderColor='var(--primary-color)'; this.style.background='var(--bg-cream)'" 
                     onmouseout="this.style.borderColor='var(--border-color)'; this.style.background='transparent'">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 600;">${htmlEscapedPhoneName}</div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                                余额: ¥${balance.toFixed(2)} | 累计提现: ¥${totalWithdrawn.toFixed(2)}
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            ${canWithdraw ? `<button class="btn-withdraw-quick" data-phone-index="${index}" style="padding: 6px 12px; background: linear-gradient(135deg, #10b981, #34d399); color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">提现</button>` : ''}
                            <span style="font-size: 20px;">→</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // 对appName进行HTML转义用于显示
        const htmlEscapedAppName = appName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        showModal(`编辑 ${htmlEscapedAppName} - 选择手机`, `
            <div style="margin-bottom: 12px; color: var(--text-secondary); font-size: 13px;">
                选择要编辑的手机
            </div>
            <div id="quick-edit-phone-list" style="max-height: 50vh; overflow-y: auto;">
                ${phoneListHtml}
            </div>
        `, [
            { text: '返回', class: 'btn-secondary', action: function() { closeModal(); setTimeout(openQuickEditModal, 100); } },
            { text: '关闭', class: 'btn-secondary', action: closeModal }
        ], true);
        
        // 绑定点击事件（使用事件委托，避免内联onclick的引号问题）
        setTimeout(() => {
            const phoneList = document.getElementById('quick-edit-phone-list');
            if (phoneList) {
                // 绑定手机项点击事件（编辑）
                phoneList.querySelectorAll('.phone-select-item').forEach(item => {
                    item.addEventListener('click', function(e) {
                        // 如果点击的是提现按钮，不触发编辑
                        if (e.target.classList.contains('btn-withdraw-quick')) {
                            return;
                        }
                        const index = parseInt(this.getAttribute('data-phone-index'));
                        const instance = window.quickEditCurrentAppInstances[index];
                        if (instance) {
                            selectPhoneForEdit(instance.phoneId, instance.appId);
                        }
                    });
                });
                
                // 绑定提现按钮点击事件
                phoneList.querySelectorAll('.btn-withdraw-quick').forEach(btn => {
                    btn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const index = parseInt(this.getAttribute('data-phone-index'));
                        openQuickWithdrawModal(index);
                    });
                });
            }
        }, 100);
    }, 100);
}

// 快速提现功能
function openQuickWithdrawModal(index) {
    // 先关闭当前模态框
    closeModal();
    
    const instance = window.quickEditCurrentAppInstances[index];
    if (!instance) return;
    
    const data = DataManager.loadData();
    const phone = data.phones.find(p => p.id === instance.phoneId);
    const app = phone ? phone.apps.find(a => a.id === instance.appId) : null;
    
    if (!app) return;
    
    const balance = app.balance || 0;
    const totalWithdrawn = (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
    
    // 延迟显示提现模态框，确保closeModal完成
    setTimeout(() => {
        showModal('快速提现', `
        <div class="form-group">
            <label class="form-label">软件名称</label>
            <input type="text" class="form-input" value="${app.name}" disabled>
        </div>
        <div class="form-group">
            <label class="form-label">手机</label>
            <input type="text" class="form-input" value="${phone.name}" disabled>
        </div>
        <div class="form-group">
            <label class="form-label">当前余额 (元)</label>
            <input type="text" class="form-input" value="${balance.toFixed(2)}" disabled>
        </div>
        <div class="form-group">
            <label class="form-label">累计已提现 (元)</label>
            <input type="text" class="form-input" value="${totalWithdrawn.toFixed(2)}" disabled>
        </div>
        <div class="form-group">
            <label class="form-label">本次提现金额 (元)</label>
            <input type="number" id="quick-withdraw-amount" class="form-input" value="" step="0.01" max="${balance}" placeholder="请输入提现金额">
            <div class="form-hint">可提现金额: ¥${balance.toFixed(2)}</div>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        {
            text: '确认提现',
            class: 'btn-primary',
            action: function() {
                const amount = parseFloat(document.getElementById('quick-withdraw-amount').value) || 0;
                
                if (amount <= 0) {
                    showToast('提现金额必须大于0', 'error');
                    return;
                }
                
                if (amount > balance) {
                    showToast('提现金额不能超过当前余额', 'error');
                    return;
                }
                
                try {
                    // 更新软件数据
                    app.balance = (app.balance || 0) - amount;
                    app.withdrawn = (app.withdrawn || 0) + amount;
                    
                    // 添加提现记录
                    if (!app.withdrawals) {
                        app.withdrawals = [];
                    }
                    app.withdrawals.push({
                        date: getCurrentDate(),
                        amount: amount
                    });
                    
                    // 保存数据
                    DataManager.saveData(data);
                    
                    // 关闭模态框
                    closeModal();
                    
                    // 更新首页总赚取金额
                    renderTotalEarnings();
                    
                    // 立即更新年度目标
                    renderYearlyGoal();
                    
                    // 返回到软件选择页面
                    setTimeout(() => {
                        openQuickEditModal();
                    }, 100);
                    
                } catch (error) {
                    console.error('提现失败:', error);
                    showToast('提现失败，请重试', 'error');
                }
            }
        }
    ]);
    }, 100);
}

// 快速编辑功能 - 第三步：打开编辑框
function selectPhoneForEdit(phoneId, appId) {
    closeModal();
    setTimeout(() => {
        openEditAppModal(phoneId, appId, true);
    }, 100);
}

// 保存后返回到快速编辑的手机选择页面
function returnToQuickEditPhoneSelection(appName) {
    // 延迟执行，确保closeModal完成
    setTimeout(() => {
        const appInstances = window.quickEditAppMap.get(appName);
        
        if (!appInstances) {
            // 如果找不到软件信息，返回到软件选择页面
            openQuickEditModal();
            return;
        }
        
        // 重新获取最新的数据
        const data = DataManager.loadData();
        const updatedAppInstances = appInstances.map(instance => {
            const phone = data.phones.find(p => p.id === instance.phoneId);
            const app = phone ? phone.apps.find(a => a.id === instance.appId) : null;
            return {
                ...instance,
                phoneName: phone ? phone.name : instance.phoneName,
                app: app || instance.app
            };
        });
        
        // 保存当前选择的软件实例列表
        window.quickEditCurrentAppInstances = updatedAppInstances;
        
        // 生成手机列表HTML - 使用data属性存储ID，避免引号问题
        const phoneListHtml = updatedAppInstances.map((instance, index) => {
            const balance = instance.app.balance || 0;
            const totalWithdrawn = (instance.app.withdrawn || 0) + (instance.app.historicalWithdrawn || 0);
            // 对phoneName进行HTML转义
            const htmlEscapedPhoneName = instance.phoneName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `
                <div class="phone-select-item" data-phone-index="${index}" style="padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s;" 
                     onmouseover="this.style.borderColor='var(--primary-color)'; this.style.background='var(--bg-cream)'" 
                     onmouseout="this.style.borderColor='var(--border-color)'; this.style.background='transparent'">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 600;">${htmlEscapedPhoneName}</div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                                余额: ¥${balance.toFixed(2)} | 累计提现: ¥${totalWithdrawn.toFixed(2)}
                            </div>
                        </div>
                        <span style="font-size: 20px;">→</span>
                    </div>
                </div>
            `;
        }).join('');
        
        // 对appName进行HTML转义用于显示
        const htmlEscapedAppName = appName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        showModal(`编辑 ${htmlEscapedAppName} - 选择手机`, `
            <div style="margin-bottom: 12px; color: var(--text-secondary); font-size: 13px;">
                选择要编辑的手机
            </div>
            <div id="quick-edit-phone-list" style="max-height: 50vh; overflow-y: auto;">
                ${phoneListHtml}
            </div>
        `, [
            { text: '返回', class: 'btn-secondary', action: openQuickEditModal },
            { text: '关闭', class: 'btn-secondary', action: closeModal }
        ], true);
        
        // 绑定点击事件（使用事件委托，避免内联onclick的引号问题）
        setTimeout(() => {
            const phoneList = document.getElementById('quick-edit-phone-list');
            if (phoneList) {
                phoneList.querySelectorAll('.phone-select-item').forEach(item => {
                    item.addEventListener('click', function() {
                        const index = parseInt(this.getAttribute('data-phone-index'));
                        const instance = window.quickEditCurrentAppInstances[index];
                        if (instance) {
                            selectPhoneForEdit(instance.phoneId, instance.appId);
                        }
                    });
                });
            }
        }, 100);
    }, 100);
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
    
    // 统计基于提现记录（仅已提现部分，不含余额）
    const totalWithdrawn = allAppsWithPhone.reduce((sum, app) => {
        return sum + (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
    }, 0);
    // 计算总余额（未提现的金额）
    const totalBalance = allAppsWithPhone.reduce((sum, app) => {
        return sum + (app.balance || 0);
    }, 0);
    
    const statsTotalEarnedEl = document.getElementById('stats-total-earned');
    if (statsTotalEarnedEl) statsTotalEarnedEl.textContent = `¥${totalWithdrawn.toFixed(2)}`;
    const statsTotalBalanceEl = document.getElementById('stats-total-balance');
    if (statsTotalBalanceEl) statsTotalBalanceEl.textContent = `¥${totalBalance.toFixed(2)}`;
    
    // 渲染月收益记录
    renderMonthlyEarnings();
    
    // 渲染收益周报
    renderWeeklyReport();
    
    // 渲染手机收益对比
    renderPhoneComparison();
    
    // 渲染软件收益排行榜
    renderAppEarningsRanking();
    
    // 渲染活跃历史记录
    renderActivityHistory(7);
}

function renderActivityHistory(days = 7) {
    const container = document.getElementById('activity-history-content');
    if (!container) return;
    
    const data = DataManager.loadData();
    const today = getCurrentDate();
    
    const activityRecords = {};
    
    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        activityRecords[dateStr] = {
            date: dateStr,
            activeApps: [],
            totalDuration: 0
        };
    }
    
    data.phones.forEach(phone => {
        (phone.apps || []).forEach(app => {
            if (app.activityLog && typeof app.activityLog === 'object') {
                Object.keys(app.activityLog).forEach(dateStr => {
                    if (activityRecords[dateStr]) {
                        const record = app.activityLog[dateStr];
                        if (record.active || (typeof record === 'boolean' && record)) {
                            const duration = typeof record === 'object' && record.duration ? record.duration : 0;
                            activityRecords[dateStr].activeApps.push({
                                name: app.name,
                                phoneName: phone.name,
                                duration: duration
                            });
                            activityRecords[dateStr].totalDuration += duration;
                        }
                    }
                });
            }
        });
    });
    
    const sortedDates = Object.values(activityRecords).sort((a, b) => b.date.localeCompare(a.date));
    
    let html = '';
    
    sortedDates.forEach(record => {
        const [year, month, day] = record.date.split('-');
        const dateLabel = `${parseInt(month)}月${parseInt(day)}日`;
        const isToday = record.date === today;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = record.date === `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        
        let dayLabel = dateLabel;
        if (isToday) dayLabel = '今天';
        else if (isYesterday) dayLabel = '昨天';
        
        const activeCount = record.activeApps.length;
        const durationLabel = record.totalDuration > 0 ? `${record.totalDuration}分钟` : '无记录';
        
        html += `
            <div style="padding: 12px; border-bottom: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 600;">${dayLabel}</span>
                        ${isToday ? '<span style="background: rgba(59,130,246,0.15); color: #3b82f6; padding: 2px 6px; border-radius: 4px; font-size: 10px;">今日</span>' : ''}
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary);">
                        ${activeCount}个软件活跃 · ${durationLabel}
                    </div>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                    ${record.activeApps.length > 0 ? record.activeApps.map(app => {
                        const durationText = app.duration > 0 ? ' ' + app.duration + '分钟' : '';
                        return '<span style="background: rgba(16,185,129,0.1); color: #10b981; padding: 3px 8px; border-radius: 6px; font-size: 11px;">' + app.name + '(' + app.phoneName + ')' + durationText + '</span>';
                    }).join('') : '<span style="font-size: 12px; color: var(--text-muted);">当天无活跃记录</span>'}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 渲染月收益记录
function renderMonthlyEarnings() {
    const container = document.getElementById('monthly-earnings-list');
    if (!container) return;

    const allDailyEarnings = DataManager.getAllDailyEarnings();
    
    if (allDailyEarnings.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 30px;">
                <div style="font-size: 40px; margin-bottom: 12px;">📅</div>
                <div style="font-size: 14px; color: var(--text-secondary);">暂无收益记录</div>
            </div>
        `;
        return;
    }
    
    // 按月分组
    const monthlyData = {};
    allDailyEarnings.forEach(({ date, amount }) => {
        const monthKey = date.substring(0, 7); // YYYY-MM
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                total: 0,
                days: 0,
                dailyRecords: []
            };
        }
        monthlyData[monthKey].total += amount;
        if (amount > 0) {
            monthlyData[monthKey].days++;
        }
        monthlyData[monthKey].dailyRecords.push({ date, amount });
    });
    
    // 按月份倒序排列
    const sortedMonths = Object.entries(monthlyData).sort((a, b) => b[0].localeCompare(a[0]));
    
    // 找到最大月收益用于柱状图比例
    const maxMonthlyTotal = Math.max(...sortedMonths.map(([, data]) => data.total), 1);
    
    container.innerHTML = sortedMonths.map(([monthKey, data]) => {
        const [year, month] = monthKey.split('-');
        const monthLabel = `${year}年${parseInt(month)}月`;
        const avgDaily = data.days > 0 ? (data.total / data.days).toFixed(2) : '0.00';
        const barWidth = (data.total / maxMonthlyTotal * 100).toFixed(1);
        const isCurrentMonth = monthKey === getCurrentDate().substring(0, 7);
        
        return `
            <div class="monthly-earnings-item" data-month="${monthKey}">
                <div class="monthly-earnings-header" onclick="toggleMonthlyDetail('${monthKey}')">
                    <div class="monthly-earnings-info">
                        <div class="monthly-earnings-month">
                            ${monthLabel}
                            ${isCurrentMonth ? '<span class="monthly-badge">本月</span>' : ''}
                        </div>
                        <div class="monthly-earnings-meta">
                            <span>📝 ${data.days}天有收益</span>
                            <span>📊 日均 ¥${avgDaily}</span>
                        </div>
                    </div>
                    <div class="monthly-earnings-amount">
                        <div class="monthly-earnings-total">¥${data.total.toFixed(2)}</div>
                        <div class="monthly-earnings-arrow" id="arrow-${monthKey}">▼</div>
                    </div>
                </div>
                <div class="monthly-earnings-bar">
                    <div class="monthly-earnings-bar-fill" style="width: ${barWidth}%"></div>
                </div>
                <div class="monthly-earnings-detail" id="detail-${monthKey}" style="display: none;">
                    <div class="monthly-earnings-detail-list">
                        ${data.dailyRecords.slice().reverse().map(record => `
                            <div class="monthly-earnings-detail-item">
                                <span class="monthly-earnings-detail-date">${record.date.substring(5)}</span>
                                <span class="monthly-earnings-detail-amount ${record.amount > 0 ? 'positive' : ''}">¥${record.amount.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleMonthlyDetail(monthKey) {
    const detail = document.getElementById(`detail-${monthKey}`);
    const arrow = document.getElementById(`arrow-${monthKey}`);
    if (!detail) return;
    
    if (detail.style.display === 'none') {
        detail.style.display = 'block';
        arrow.textContent = '▲';
    } else {
        detail.style.display = 'none';
        arrow.textContent = '▼';
    }
}

// 渲染收益周报
function renderWeeklyReport() {
    const container = document.getElementById('weekly-report-content');
    if (!container) return;

    const allDailyEarnings = DataManager.getAllDailyEarnings();
    
    if (allDailyEarnings.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 30px;">
                <div style="font-size: 40px; margin-bottom: 12px;">📋</div>
                <div style="font-size: 14px; color: var(--text-secondary);">暂无收益数据</div>
            </div>
        `;
        return;
    }
    
    const earningsMap = {};
    allDailyEarnings.forEach(({ date, amount }) => {
        earningsMap[date] = amount;
    });
    
    // 计算本周（周一到周日）
    const now = new Date();
    const dayOfWeek = now.getDay() || 7; // 周日=7
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    // 上周
    const lastMonday = new Date(monday);
    lastMonday.setDate(monday.getDate() - 7);
    const lastSunday = new Date(monday);
    lastSunday.setDate(monday.getDate() - 1);
    
    const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    // 本周收益
    let thisWeekTotal = 0;
    let thisWeekDays = 0;
    const thisWeekDaily = [];
    for (let d = new Date(monday); d <= sunday; d.setDate(d.getDate() + 1)) {
        const ds = formatDate(d);
        const amt = earningsMap[ds] || 0;
        thisWeekTotal += amt;
        if (amt > 0) thisWeekDays++;
        thisWeekDaily.push({ date: ds, amount: amt, isToday: ds === formatDate(now) });
    }
    
    // 上周收益
    let lastWeekTotal = 0;
    for (let d = new Date(lastMonday); d <= lastSunday; d.setDate(d.getDate() + 1)) {
        const ds = formatDate(d);
        lastWeekTotal += earningsMap[ds] || 0;
    }
    
    // 环比增长率
    let growthRate = 0;
    let growthText = '—';
    let growthClass = 'neutral';
    if (lastWeekTotal > 0) {
        growthRate = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal * 100);
        growthText = (growthRate >= 0 ? '+' : '') + growthRate.toFixed(1) + '%';
        growthClass = growthRate >= 0 ? 'up' : 'down';
    } else if (thisWeekTotal > 0) {
        growthText = '新增';
        growthClass = 'up';
    }
    
    const avgDaily = thisWeekDays > 0 ? (thisWeekTotal / thisWeekDays).toFixed(2) : '0.00';
    const maxDaily = Math.max(...thisWeekDaily.map(d => d.amount), 1);
    const weekRange = `${formatDate(monday).substring(5)} ~ ${formatDate(sunday).substring(5)}`;
    
    let html = `
        <div style="padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div>
                    <div style="font-size: 13px; color: var(--text-secondary);">${weekRange}</div>
                    <div style="font-size: 24px; font-weight: 700; color: var(--primary-color); margin-top: 4px;">¥${thisWeekTotal.toFixed(2)}</div>
                </div>
                <div class="weekly-growth ${growthClass}">
                    ${growthClass === 'up' ? '📈' : growthClass === 'down' ? '📉' : '➖'} ${growthText}
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                <div style="background: var(--bg-primary); border-radius: 10px; padding: 12px;">
                    <div style="font-size: 11px; color: var(--text-secondary);">日均收益</div>
                    <div style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin-top: 4px;">¥${avgDaily}</div>
                </div>
                <div style="background: var(--bg-primary); border-radius: 10px; padding: 12px;">
                    <div style="font-size: 11px; color: var(--text-secondary);">收益天数</div>
                    <div style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin-top: 4px;">${thisWeekDays} / 7天</div>
                </div>
            </div>
            
            <!-- 每日柱状图 -->
            <div class="weekly-chart">
                ${thisWeekDaily.map(d => {
                    const dayLabel = ['一', '二', '三', '四', '五', '六', '日'][new Date(d.date).getDay() ? new Date(d.date).getDay() - 1 : 6];
                    const barHeight = d.amount > 0 ? (d.amount / maxDaily * 100).toFixed(0) : 0;
                    return `
                        <div class="weekly-chart__item">
                            <div class="weekly-chart__bar-wrapper">
                                <div class="weekly-chart__bar ${d.isToday ? 'today' : ''}" style="height: ${barHeight}%">
                                    ${d.amount > 0 ? `<span class="weekly-chart__value">¥${d.amount.toFixed(1)}</span>` : ''}
                                </div>
                            </div>
                            <div class="weekly-chart__label ${d.isToday ? 'today' : ''}">${dayLabel}</div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary);">
                <span>上周收益: ¥${lastWeekTotal.toFixed(2)}</span>
                <span>本周 vs 上周: ${growthText}</span>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// 渲染手机收益对比
function renderPhoneComparison() {
    const container = document.getElementById('phone-comparison-content');
    if (!container) return;

    const data = DataManager.loadData();
    
    if (!data.phones || data.phones.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 30px;">
                <div style="font-size: 40px; margin-bottom: 12px;">📲</div>
                <div style="font-size: 14px; color: var(--text-secondary);">暂无手机数据</div>
            </div>
        `;
        return;
    }
    
    const phoneStats = data.phones.map(phone => {
        const apps = phone.apps || [];
        const totalBalance = apps.reduce((sum, app) => sum + (app.balance || 0), 0);
        const totalWithdrawn = apps.reduce((sum, app) => sum + (app.withdrawn || 0) + (app.historicalWithdrawn || 0), 0);
        const totalEarned = totalBalance + totalWithdrawn;
        const appCount = apps.length;
        
        return {
            id: phone.id,
            name: phone.name,
            appCount,
            totalBalance,
            totalWithdrawn,
            totalEarned
        };
    });
    
    phoneStats.sort((a, b) => b.totalEarned - a.totalEarned);
    
    const maxEarned = Math.max(...phoneStats.map(p => p.totalEarned), 1);
    
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
    
    let html = `
        <div style="padding: 16px;">
            ${phoneStats.map((phone, index) => {
                const color = colors[index % colors.length];
                const barWidth = (phone.totalEarned / maxEarned * 100).toFixed(1);
                const isTop = index === 0 && phone.totalEarned > 0;
                
                return `
                    <div class="phone-comparison-item">
                        <div class="phone-comparison-header">
                            <div class="phone-comparison-name">
                                <span class="phone-comparison-rank" style="background: ${color};">${index + 1}</span>
                                ${phone.name}
                                ${isTop ? '<span class="phone-comparison-crown">👑</span>' : ''}
                            </div>
                            <div class="phone-comparison-earned">¥${phone.totalEarned.toFixed(2)}</div>
                        </div>
                        
                        <div class="phone-comparison-bar">
                            <div class="phone-comparison-bar-fill" style="width: ${barWidth}%; background: linear-gradient(90deg, ${color}, ${color}aa);"></div>
                        </div>
                        
                        <div class="phone-comparison-stats">
                            <div class="phone-comparison-stat">
                                <span class="phone-comparison-stat-label">软件数</span>
                                <span class="phone-comparison-stat-value">${phone.appCount}</span>
                            </div>
                            <div class="phone-comparison-stat">
                                <span class="phone-comparison-stat-label">当前余额</span>
                                <span class="phone-comparison-stat-value" style="color: var(--primary-color);">¥${phone.totalBalance.toFixed(2)}</span>
                            </div>
                            <div class="phone-comparison-stat">
                                <span class="phone-comparison-stat-label">累计提现</span>
                                <span class="phone-comparison-stat-value" style="color: var(--success-color);">¥${phone.totalWithdrawn.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

function renderAppEarningsRanking() {
    const container = document.getElementById('app-earnings-ranking');
    if (!container) return;

    const data = DataManager.loadData();
    const appEarnings = [];

    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            const totalEarned = (app.withdrawn || 0) + (app.historicalWithdrawn || 0) + (app.balance || 0);
            const avgDaily = app.dailyEarnings ? calculateAppAverageEarnings(app) : 0;
            
            appEarnings.push({
                name: app.name,
                phoneName: phone.name,
                totalEarned,
                balance: app.balance || 0,
                withdrawn: (app.withdrawn || 0) + (app.historicalWithdrawn || 0),
                avgDaily,
                appId: app.id,
                phoneId: phone.id
            });
        });
    });

    appEarnings.sort((a, b) => b.totalEarned - a.totalEarned);
    const topApps = appEarnings.slice(0, 10);

    if (topApps.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 30px;">
                <div style="font-size: 40px; margin-bottom: 12px;">🏆</div>
                <div style="font-size: 14px; color: var(--text-secondary);">暂无软件收益数据</div>
            </div>
        `;
        return;
    }

    const maxEarnings = Math.max(...topApps.map(a => a.totalEarned), 1);

    let html = `
        <div style="padding: 12px;">
            ${topApps.map((app, index) => {
                const barWidth = (app.totalEarned / maxEarnings * 100).toFixed(1);
                const isTop3 = index < 3;
                const rankColors = ['#fbbf24', '#9ca3af', '#f59e0b'];
                const rankColor = isTop3 ? rankColors[index] : '#6b7280';
                
                return `
                    <div class="app-ranking-item" onclick="showAppDetailModal('${app.appId}')">
                        <div class="app-ranking-rank" style="background: ${rankColor};">${index + 1}</div>
                        <div class="app-ranking-info">
                            <div class="app-ranking-name">${app.name}</div>
                            <div class="app-ranking-meta">
                                <span>📱 ${app.phoneName}</span>
                                ${app.avgDaily > 0 ? `<span>📊 日均 ¥${app.avgDaily.toFixed(2)}</span>` : ''}
                            </div>
                        </div>
                        <div class="app-ranking-amount">
                            <div style="font-size: 14px; font-weight: 700; color: var(--primary-color);">¥${app.totalEarned.toFixed(2)}</div>
                            <div style="font-size: 10px; color: var(--text-secondary);">余额 ¥${app.balance.toFixed(2)}</div>
                        </div>
                        <div class="app-ranking-bar">
                            <div class="app-ranking-bar-fill" style="width: ${barWidth}%; background: linear-gradient(90deg, ${rankColor}, ${rankColor}88);"></div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    container.innerHTML = html;
}

function calculateAppAverageEarnings(app) {
    if (!app.dailyEarnings) return 0;
    
    const earnings = Object.values(app.dailyEarnings)
        .map(v => parseFloat(v) || 0)
        .filter(v => v > 0);
    
    if (earnings.length === 0) return 0;
    
    return earnings.reduce((a, b) => a + b, 0) / earnings.length;
}

// 渲染提现规划页面
function renderWithdrawPlan() {
    const data = DataManager.loadData();
    const allApps = [];
    
    data.phones.forEach(phone => {
        (phone.apps || []).forEach(app => {
            const minWithdraw = app.minWithdraw || 0;
            const highWithdraw = app.highWithdraw || minWithdraw;
            const targetWithdraw = highWithdraw > 0 ? highWithdraw : minWithdraw;
            const balance = app.balance || 0;
            const canWithdraw = balance >= targetWithdraw;
            const progress = targetWithdraw > 0 ? (balance / targetWithdraw) * 100 : 0;
            const remaining = Math.max(0, targetWithdraw - balance);
            
            const avgDailyEarnings = DataManager.calculatePredictedDailyEarnings(app);
            
            allApps.push({
                ...app,
                phoneName: phone.name,
                phoneId: phone.id,
                targetWithdraw,
                canWithdraw,
                progress,
                remaining,
                avgDailyEarnings
            });
        });
    });
    
    const futurePlan = calculateFuturePlan(allApps);
    const todayRecommendations = calculateDailyRecommendations(allApps);
    
    renderDailyRecommendations(todayRecommendations);
    renderFuturePlan(futurePlan);
}

function renderWithdrawReadyList(apps) {
    const container = document.getElementById('withdraw-ready-list');
    if (!container) return;
    
    if (apps.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 30px;">
                <div style="font-size: 40px; margin-bottom: 12px;">⏳</div>
                <div style="font-size: 14px; color: var(--text-secondary);">暂无可高档提现的软件</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">继续努力，很快就能提现了！</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = apps.map(app => {
        const minWithdraw = app.minWithdraw || 0;
        const highWithdraw = app.highWithdraw || 0;
        
        return `
            <div class="withdraw-ready-item">
                <div class="withdraw-ready-header">
                    <div class="withdraw-ready-info">
                        <div class="withdraw-ready-name">${app.name}</div>
                        <div class="withdraw-ready-phone">📱 ${app.phoneName}</div>
                    </div>
                    <div class="withdraw-ready-balance">
                        <div>¥${app.balance.toFixed(2)}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">目标: ¥${app.targetWithdraw.toFixed(2)}</div>
                    </div>
                </div>
                <div class="withdraw-ready-bar">
                    <div class="withdraw-ready-bar-fill" style="width: 100%; background: linear-gradient(90deg, #10b981, #34d399);"></div>
                </div>
                <div class="withdraw-ready-actions">
                    <span class="withdraw-ready-threshold">
                        ${highWithdraw > 0 ? '高档¥' + highWithdraw.toFixed(2) : '标准¥' + minWithdraw.toFixed(2)}
                    </span>
                    <button class="btn btn-success" onclick="openWithdrawModal('${app.phoneId}', '${app.id}')">提现</button>
                </div>
            </div>
        `;
    }).join('');
}

function calculateDailyRecommendations(allApps) {
    const futurePlan = calculateFuturePlan(allApps);
    
    // 找出所有缺口天（没有可提现软件的天）
    const gapDays = [];
    for (let day = 0; day < futurePlan.length; day++) {
        if (futurePlan[day].withdrawApps.length === 0) {
            gapDays.push({
                dayIndex: day,
                date: futurePlan[day].date,
                weekday: futurePlan[day].weekday
            });
        }
    }
    
    const recommendations = [];
    const usedAppIds = new Set();
    
    // 第一优先级：今天需要玩的软件（来自未来规划第0天的playPlanApps）
    // 这些软件是为了填补未来的缺口天
    futurePlan[0].playPlanApps.forEach(app => {
        // 找出这个软件被安排在哪个缺口天提现
        let targetGapDay = null;
        for (let day = 1; day < futurePlan.length; day++) {
            const withdrawApp = futurePlan[day].withdrawApps.find(a => a.id === app.id);
            if (withdrawApp) {
                targetGapDay = {
                    dayIndex: day,
                    date: futurePlan[day].date,
                    weekday: futurePlan[day].weekday
                };
                break;
            }
        }
        
        const conservativeEarnings = DataManager.calculatePredictedDailyEarnings(app, true);
        const daysToTarget = app.targetWithdraw > 0 && conservativeEarnings > 0 
            ? Math.ceil(app.remaining / conservativeEarnings) : 0;
        const progress = app.targetWithdraw > 0 ? (app.balance / app.targetWithdraw) * 100 : 0;
        
        // 优先级：缺口天越近优先级越高
        let priority = progress;
        if (targetGapDay) {
            priority += (14 - targetGapDay.dayIndex) * 30;
        }
        
        if (daysToTarget === 0) priority += 200;
        else if (daysToTarget === 1) priority += 150;
        else if (daysToTarget === 2) priority += 100;
        else if (daysToTarget === 3) priority += 60;
        else if (daysToTarget === 4) priority += 30;
        else if (daysToTarget === 5) priority += 10;
        
        priority += conservativeEarnings * 20;
        
        recommendations.push({
            ...app,
            daysToTarget,
            progress,
            priority,
            conservativeEarnings,
            targetGapDay,
            isPlanned: true
        });
        usedAppIds.add(app.id);
    });
    
    // 第二优先级：其他需要玩的软件（未在规划中但接近达标）
    allApps.filter(app => !app.canWithdraw && app.avgDailyEarnings > 0 && !usedAppIds.has(app.id))
        .forEach(app => {
            const conservativeEarnings = DataManager.calculatePredictedDailyEarnings(app, true);
            const daysToTarget = app.targetWithdraw > 0 && conservativeEarnings > 0 
                ? Math.ceil(app.remaining / conservativeEarnings) : 0;
            const progress = app.targetWithdraw > 0 ? (app.balance / app.targetWithdraw) * 100 : 0;
            
            let priority = progress;
            
            if (daysToTarget === 0) priority += 200;
            else if (daysToTarget === 1) priority += 150;
            else if (daysToTarget === 2) priority += 100;
            else if (daysToTarget === 3) priority += 60;
            else if (daysToTarget === 4) priority += 30;
            else if (daysToTarget === 5) priority += 10;
            
            priority += conservativeEarnings * 20;
            
            recommendations.push({
                ...app,
                daysToTarget,
                progress,
                priority,
                conservativeEarnings,
                targetGapDay: null,
                isPlanned: false
            });
        });
    
    recommendations.sort((a, b) => b.priority - a.priority);
    
    return recommendations.slice(0, 10);
}

function renderDailyRecommendations(apps) {
    const container = document.getElementById('daily-recommend-list');
    if (!container) return;
    
    if (apps.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 30px;">
                <div style="font-size: 40px; margin-bottom: 12px;">🎉</div>
                <div style="font-size: 14px; color: var(--text-secondary);">今日无推荐软件</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">所有软件都已达到高档提现额度</div>
            </div>
        `;
        return;
    }
    
    const plannedApps = apps.filter(app => app.isPlanned);
    const unplannedApps = apps.filter(app => !app.isPlanned);
    
    let headerHtml = '';
    
    if (plannedApps.length > 0) {
        const gapDayList = plannedApps
            .filter(app => app.targetGapDay)
            .map(app => `${app.targetGapDay.date}(${app.targetGapDay.weekday})`)
            .join('、');
        
        headerHtml = `
            <div style="margin-bottom: 12px; padding: 12px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(251, 191, 36, 0.1)); border-radius: 12px; border: 1px solid rgba(245, 158, 11, 0.2);">
                <div style="font-size: 13px; color: #f59e0b; font-weight: 700;">🎯 连续提现保障计划</div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; line-height: 1.6;">
                    当前已达标软件提现后，<b style="color: #ef4444;">${gapDayList}</b> 将没有软件可提现，需要今天开始培养以下软件来填补缺口：
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">
                    💡 意思是：如果今天不玩这些软件，那几天就提不了高档额度了
                </div>
            </div>
        `;
    }
    
    container.innerHTML = headerHtml;
    
    const maxPriority = Math.max(...apps.map(a => a.priority));
    
    const gapApps = apps.filter(app => app.targetGapDay).sort((a, b) => b.priority - a.priority);
    const otherApps = apps.filter(app => !app.targetGapDay).sort((a, b) => b.priority - a.priority);
    
    const sortedApps = [...gapApps, ...otherApps];
    
    container.innerHTML += sortedApps.map((app, index) => {
        const daysToTarget = app.daysToTarget;
        const progress = app.targetWithdraw > 0 ? (app.balance / app.targetWithdraw) * 100 : 0;
        
        let urgencyLevel = '';
        let urgencyColor = '';
        if (daysToTarget <= 1) {
            urgencyLevel = '🔥 紧急';
            urgencyColor = '#ef4444';
        } else if (daysToTarget <= 3) {
            urgencyLevel = '⚡ 优先';
            urgencyColor = '#f97316';
        } else if (daysToTarget <= 5) {
            urgencyLevel = '📈 推进';
            urgencyColor = '#3b82f6';
        } else {
            urgencyLevel = '🌱 培养';
            urgencyColor = '#10b981';
        }
        
        const gapTag = app.targetGapDay ? `
            <div class="daily-recommend-gap-tag">
                🎯 计划${app.targetGapDay.date}(${app.targetGapDay.weekday})达标
            </div>
        ` : '';
        
        const recultivatedTag = app.isRecultivated ? `
            <span style="font-size: 10px; color: #8b5cf6; background: rgba(139, 92, 246, 0.1); padding: 2px 6px; border-radius: 4px; margin-left: 4px;">♻️ 重新培养</span>
        ` : '';
        
        return `
            <div class="daily-recommend-item ${app.targetGapDay ? 'has-gap-target' : ''}">
                <div style="display: flex; justify-content: space-between;">
                    <div>
                        <div class="daily-recommend-name">${app.name}${recultivatedTag}</div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                            <div class="daily-recommend-rank">${index + 1}</div>
                            ${gapTag}
                            <span>📱 ${app.phoneName}</span>
                            <span style="color: ${urgencyColor}; font-weight: 600;">${urgencyLevel}</span>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 18px; font-weight: 700; color: var(--primary-color);">¥${app.balance.toFixed(2)}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">还差 ¥${app.remaining.toFixed(2)}</div>
                    </div>
                </div>
                <div class="daily-recommend-bar">
                    <div class="daily-recommend-bar-fill" style="width: ${progress.toFixed(1)}%;"></div>
                </div>
                <div style="margin-top: 8px; padding: 8px 12px; background: rgba(59, 130, 246, 0.08); border-radius: 8px; border-left: 3px solid #3b82f6;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 2px;">⏰ 预计达标时间</div>
                            <div style="font-size: 13px; font-weight: 600; color: #3b82f6;">${daysToTarget}天后达到高档额度</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 2px;">📈 保守日收益</div>
                            <div style="font-size: 13px; font-weight: 600; color: #10b981;">¥${app.avgDailyEarnings.toFixed(2)}</div>
                        </div>
                    </div>
                    <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px; line-height: 1.4;">
                        💡 按当前收益速度，预计${daysToTarget}天后余额达到高档提现额度 ¥${app.targetWithdraw.toFixed(2)}
                    </div>
                </div>
                <div style="display: flex; justify-content: flex-end; margin-top: 6px;">
                    <div class="daily-recommend-action">
                        <button class="btn btn-primary btn-sm" onclick="openEditAppModal('${app.phoneId}', '${app.id}')">编辑</button>
                        <button class="btn btn-secondary btn-sm" onclick="showAppDetailModal('${app.id}')">详情</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function calculateFuturePlan(allApps) {
    const plan = [];
    const today = new Date();
    const planDays = 14;
    
    for (let day = 0; day < planDays; day++) {
        const date = new Date(today);
        date.setDate(today.getDate() + day);
        plan[day] = {
            date: `${date.getMonth() + 1}/${date.getDate()}`,
            weekday: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()],
            withdrawApps: [],
            playPlanApps: [],
            confidence: 'low',
            dayIndex: day
        };
    }
    
    // 步骤1：已达标软件按余额从小到大分配到前N天（每天提现一个）
    const withdrawReadyApps = allApps.filter(app => app.canWithdraw)
        .sort((a, b) => a.balance - b.balance);
    
    const withdrawnDayMap = new Map();
    const scheduledAppDays = new Map();
    
    for (let day = 0; day < Math.min(withdrawReadyApps.length, planDays); day++) {
        const app = withdrawReadyApps[day];
        plan[day].withdrawApps.push(app);
        withdrawnDayMap.set(app.id, day);
        scheduledAppDays.set(app.id, day);
    }
    
    // 步骤2：构建可培养软件列表（包括已提现的软件，可重新培养）
    const cultivatableApps = allApps
        .filter(app => app.avgDailyEarnings > 0)
        .map(app => {
            const conservativeEarnings = DataManager.calculatePredictedDailyEarnings(app, true);
            const daysToTarget = app.targetWithdraw > 0 && conservativeEarnings > 0 
                ? Math.ceil(app.remaining / conservativeEarnings) : 999;
            const progress = app.targetWithdraw > 0 ? (app.balance / app.targetWithdraw) * 100 : 0;
            return {
                ...app,
                conservativeEarnings,
                daysToTarget,
                progress
            };
        });
    
    // 步骤3：为每个缺口天分配软件
    // 关键：已提现的软件可以从提现后第二天开始重新培养
    const usedAppIds = new Set();
    
    for (let day = 0; day < planDays; day++) {
        if (plan[day].withdrawApps.length > 0) continue;
        
        let bestApp = null;
        let bestScore = -1;
        
        cultivatableApps.forEach(app => {
            if (usedAppIds.has(app.id)) return;
            if (scheduledAppDays.has(app.id)) return;
            
            // 计算软件可以开始玩的时间和需要的剩余金额
            let startDay = 0;
            let effectiveRemaining = app.remaining;
            
            if (withdrawnDayMap.has(app.id)) {
                // 已提现的软件，从提现后第二天开始重新培养，余额归零
                startDay = withdrawnDayMap.get(app.id) + 1;
                effectiveRemaining = app.targetWithdraw;
            }
            
            if (startDay > day) return;
            if (app.conservativeEarnings <= 0) return;
            
            const availableDays = day - startDay;
            const effectiveDaysToTarget = Math.ceil(effectiveRemaining / app.conservativeEarnings);
            
            if (effectiveDaysToTarget <= availableDays) {
                const score = 100 - effectiveDaysToTarget * 5 + (app.conservativeEarnings * 10);
                if (score > bestScore) {
                    bestScore = score;
                    bestApp = {
                        ...app,
                        effectiveRemaining,
                        effectiveStartDay: startDay,
                        effectiveDaysToTarget,
                        isRecultivated: withdrawnDayMap.has(app.id)
                    };
                }
            }
        });
        
        if (bestApp) {
            plan[day].withdrawApps.push(bestApp);
            usedAppIds.add(bestApp.id);
            scheduledAppDays.set(bestApp.id, day);
            
            // 安排提现前的培养计划
            for (let d = bestApp.effectiveStartDay; d < day; d++) {
                if (!plan[d].playPlanApps.find(a => a.id === bestApp.id)) {
                    plan[d].playPlanApps.push(bestApp);
                }
            }
        }
    }
    
    // 步骤4：对仍未填补的缺口天，安排最近的可用软件
    for (let day = 0; day < planDays; day++) {
        if (plan[day].withdrawApps.length > 0) continue;
        
        let bestApp = null;
        let bestDaysToTarget = 999;
        
        cultivatableApps.forEach(app => {
            if (usedAppIds.has(app.id)) return;
            if (scheduledAppDays.has(app.id)) return;
            
            let startDay = 0;
            let effectiveRemaining = app.remaining;
            
            if (withdrawnDayMap.has(app.id)) {
                startDay = withdrawnDayMap.get(app.id) + 1;
                effectiveRemaining = app.targetWithdraw;
            }
            
            if (startDay > day) return;
            if (app.conservativeEarnings <= 0) return;
            
            const effectiveDaysToTarget = Math.ceil(effectiveRemaining / app.conservativeEarnings);
            
            if (effectiveDaysToTarget < bestDaysToTarget) {
                bestDaysToTarget = effectiveDaysToTarget;
                bestApp = {
                    ...app,
                    effectiveRemaining,
                    effectiveStartDay: startDay,
                    effectiveDaysToTarget,
                    isRecultivated: withdrawnDayMap.has(app.id)
                };
            }
        });
        
        if (bestApp) {
            const targetDay = Math.min(day + bestApp.effectiveDaysToTarget, planDays - 1);
            if (targetDay < planDays && plan[targetDay].withdrawApps.length === 0) {
                plan[targetDay].withdrawApps.push(bestApp);
                usedAppIds.add(bestApp.id);
                scheduledAppDays.set(bestApp.id, targetDay);
                
                for (let d = bestApp.effectiveStartDay; d < targetDay; d++) {
                    if (!plan[d].playPlanApps.find(a => a.id === bestApp.id)) {
                        plan[d].playPlanApps.push(bestApp);
                    }
                }
            }
        }
    }
    
    // 步骤5：为每天补充推荐玩的软件
    for (let day = 0; day < planDays; day++) {
        const currentUsedPhones = new Set([...plan[day].withdrawApps, ...plan[day].playPlanApps].map(a => a.phoneId));
        
        const availablePlayApps = cultivatableApps.filter(app => 
            !usedAppIds.has(app.id) && 
            !scheduledAppDays.has(app.id) &&
            !currentUsedPhones.has(app.phoneId) &&
            plan[day].playPlanApps.length < 5
        );
        
        availablePlayApps.slice(0, 5 - plan[day].playPlanApps.length).forEach(app => {
            plan[day].playPlanApps.push(app);
        });
        
        if (plan[day].withdrawApps.length > 0) {
            plan[day].confidence = plan[day].withdrawApps[0].canWithdraw ? 'high' : 'medium';
        } else {
            plan[day].confidence = 'low';
        }
    }
    
    return plan;
}

function renderFuturePlan(plan) {
    const container = document.getElementById('future-plan-list');
    if (!container) return;
    
    const getConfidenceBadge = (confidence) => {
        const badges = {
            high: '<span class="confidence-badge high">🟢 高</span>',
            medium: '<span class="confidence-badge medium">🟡 中</span>',
            low: '<span class="confidence-badge low">🔴 低</span>'
        };
        return badges[confidence] || badges.low;
    };
    
    container.innerHTML = plan.map(dayPlan => {
        const hasWithdraw = dayPlan.withdrawApps.length > 0;
        const hasPlayPlan = dayPlan.playPlanApps.length > 0;
        
        return `
            <div class="future-plan-item ${hasWithdraw ? 'has-withdraw' : ''} ${dayPlan.confidence}">
                <div class="future-plan-header">
                    <div class="future-plan-date">
                        <div class="future-plan-date-main">${dayPlan.date}</div>
                        <div class="future-plan-date-weekday">${dayPlan.weekday}</div>
                    </div>
                    <div class="future-plan-status">
                        ${hasWithdraw ? `
                            <span class="future-plan-badge">💰 可提现</span>
                        ` : ''}
                        ${getConfidenceBadge(dayPlan.confidence)}
                    </div>
                </div>
                ${hasWithdraw ? `
                    <div class="future-plan-withdraw">
                        ${dayPlan.withdrawApps.map(app => `
                            <div class="future-plan-withdraw-item">
                                <div>
                                    <span>${app.name}</span>
                                    <span style="font-size: 10px; color: var(--text-muted); margin-left: 6px;">📱 ${app.phoneName}</span>
                                </div>
                                <span style="color: var(--success-color);">¥${app.targetWithdraw.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                ${hasPlayPlan ? `
                    <div class="future-plan-play">
                        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 6px;">🎮 推荐玩:</div>
                        ${dayPlan.playPlanApps.map(app => `
                            <div class="future-plan-play-item">
                                <div>
                                    <span>${app.name}</span>
                                    <span style="font-size: 10px; color: var(--text-muted); margin-left: 4px;">📱 ${app.phoneName}</span>
                                </div>
                                <span>还差 ¥${app.remaining.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function renderClearWarning() {
    const data = DataManager.loadData();
    const today = new Date();
    
    const currentDateEl = document.getElementById('clear-warning-current-date');
    if (currentDateEl) {
        currentDateEl.textContent = today.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
    }
    
    const apps = [];
    
    data.phones.forEach(phone => {
        (phone.apps || []).forEach(app => {
            const clearPeriod = app.clearPeriod || 0;
            
            if (clearPeriod > 0 && app.lastLoginDate) {
                const lastLogin = new Date(app.lastLoginDate);
                const diffTime = Math.abs(today - lastLogin);
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                const daysUntilClear = clearPeriod - diffDays;
                const progress = Math.min(100, (diffDays / clearPeriod) * 100);
                
                let status = 'safe';
                let statusText = '';
                let statusColor = '';
                
                if (daysUntilClear <= 0) {
                    status = 'overdue';
                    statusText = '⚠️ 已过期';
                    statusColor = '#ef4444';
                } else if (daysUntilClear === 1) {
                    status = 'urgent';
                    statusText = '🔥 明天清零';
                    statusColor = '#ef4444';
                } else if (daysUntilClear === 2) {
                    status = 'warning';
                    statusText = '⚠️ 后天清零';
                    statusColor = '#f59e0b';
                } else if (daysUntilClear <= 3) {
                    status = 'soon';
                    statusText = `⏳ ${daysUntilClear}天后清零`;
                    statusColor = '#f59e0b';
                } else {
                    status = 'safe';
                    statusText = `✅ ${daysUntilClear}天后清零`;
                    statusColor = '#10b981';
                }
                
                apps.push({
                    ...app,
                    phoneName: phone.name,
                    phoneId: phone.id,
                    clearPeriod,
                    lastLoginDate: app.lastLoginDate,
                    diffDays,
                    daysUntilClear,
                    progress,
                    status,
                    statusText,
                    statusColor
                });
            } else {
                apps.push({
                    ...app,
                    phoneName: phone.name,
                    phoneId: phone.id,
                    clearPeriod: 0,
                    lastLoginDate: app.lastLoginDate || '',
                    diffDays: 0,
                    daysUntilClear: null,
                    progress: 0,
                    status: 'no-period',
                    statusText: '🔒 未设置清零周期',
                    statusColor: '#6b7280'
                });
            }
        });
    });
    
    apps.sort((a, b) => {
        if (a.daysUntilClear === null && b.daysUntilClear === null) return 0;
        if (a.daysUntilClear === null) return 1;
        if (b.daysUntilClear === null) return -1;
        return a.daysUntilClear - b.daysUntilClear;
    });
    
    const statsContainer = document.getElementById('clear-warning-stats');
    const appListContainer = document.getElementById('clear-warning-app-list');
    
    const urgentCount = apps.filter(a => a.status === 'urgent').length;
    const warningCount = apps.filter(a => a.status === 'warning').length;
    const soonCount = apps.filter(a => a.status === 'soon').length;
    const safeCount = apps.filter(a => a.status === 'safe' && a.daysUntilClear !== null).length;
    const noPeriodCount = apps.filter(a => a.status === 'no-period').length;
    const overdueCount = apps.filter(a => a.status === 'overdue').length;
    
    statsContainer.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            <div style="background: rgba(239,68,68,0.1); border-radius: 12px; padding: 12px; text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: #ef4444;">${urgentCount}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">明天清零</div>
            </div>
            <div style="background: rgba(245,158,11,0.1); border-radius: 12px; padding: 12px; text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: #f59e0b;">${warningCount + soonCount}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">3天内清零</div>
            </div>
            <div style="background: rgba(16,185,129,0.1); border-radius: 12px; padding: 12px; text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: #10b981;">${safeCount}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">状态正常</div>
            </div>
            <div style="background: rgba(107,114,128,0.1); border-radius: 12px; padding: 12px; text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: #6b7280;">${noPeriodCount}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">未设置周期</div>
            </div>
            <div style="background: rgba(239,68,68,0.1); border-radius: 12px; padding: 12px; text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: #dc2626;">${overdueCount}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">已过期</div>
            </div>
            <div style="background: rgba(99,102,241,0.1); border-radius: 12px; padding: 12px; text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: #6366f1;">${apps.length}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">总软件数</div>
            </div>
        </div>
    `;
    
    if (apps.length === 0) {
        appListContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon">📱</div>
                <div class="empty-state__title">暂无软件数据</div>
                <div class="empty-state__hint">添加手机和软件后即可查看清零预警</div>
            </div>
        `;
        return;
    }
    
    appListContainer.innerHTML = apps.map((app, index) => {
        const isUrgent = app.status === 'urgent' || app.status === 'overdue';
        const bgColor = isUrgent ? 'rgba(239,68,68,0.08)' : 
                       (app.status === 'warning' || app.status === 'soon') ? 'rgba(245,158,11,0.08)' :
                       (app.status === 'no-period') ? 'rgba(107,114,128,0.08)' : 'rgba(16,185,129,0.08)';
        
        return `
            <div class="clear-warning-app-item" style="background: ${bgColor};">
                <div class="clear-warning-app-rank">${index + 1}</div>
                <div class="clear-warning-app-content">
                    <div class="clear-warning-app-header">
                        <span class="clear-warning-app-name">${app.name}</span>
                        <span class="clear-warning-app-phone">📱 ${app.phoneName}</span>
                    </div>
                    <div class="clear-warning-app-status" style="color: ${app.statusColor};">
                        ${app.statusText}
                    </div>
                    ${app.clearPeriod > 0 && app.daysUntilClear !== null ? `
                        <div class="clear-warning-app-info">
                            <div style="font-size: 12px; color: var(--text-secondary);">
                                清零周期: ${app.clearPeriod}天 | 已${app.diffDays}天未登录
                            </div>
                            <div style="margin-top: 8px;">
                                <div style="height: 6px; background: var(--bg-secondary); border-radius: 3px; overflow: hidden;">
                                    <div style="height: 100%; width: ${app.progress}%; background: ${app.statusColor}; border-radius: 3px;"></div>
                                </div>
                                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                                    清零进度: ${app.progress.toFixed(0)}%
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                            建议: 在编辑软件时设置清零周期
                        </div>
                    `}
                </div>
                <div class="clear-warning-app-actions">
                    <button class="btn btn-secondary btn-sm" onclick="openEditAppModal('${app.phoneId}', '${app.id}')">编辑</button>
                </div>
            </div>
        `;
    }).join('');
}

// 渲染设置页面
function renderSettings() {
    const data = DataManager.loadData();

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
    
                }
                closeModal();
            }
        }
    ], true);
}

// 计算每日需要赚取的金额（按期数顺序还款，每期单独计算）
function calculateDailyEarnNeeded() {
    const data = DataManager.loadData();
    const today = getCurrentDate();

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
    const today = getCurrentDate();
    
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
            dueDate: formatLocalDate(currentDate),
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

// 生成中文备份码
function generateBackupCode() {
    const data = DataManager.loadData();
    
    // 简化数据结构
    const simplifiedData = {
        v: 3,
        p: data.phones.map(phone => ({
            n: phone.name,
            a: phone.apps.map(app => ({
                n: app.name,
                w: app.withdrawn || 0,
                h: app.historicalWithdrawn || 0,
                m: app.minWithdraw || 0,
                b: app.balance || 0
            }))
        })),
        s: {
            ga: data.settings.yearlyGoalAmount || 0,
            gy: data.settings.yearlyGoalYear || new Date().getFullYear()
        }
    };
    
    // 压缩数据
    const jsonStr = JSON.stringify(simplifiedData);
    
    // 生成易读的备份码
    const backupCode = generateReadableBackupCode(jsonStr);
    
    showModal('备份码（请复制保存）', `
        <div class="form-group">
            <textarea class="form-input" rows="3" readonly>${backupCode}</textarea>
        </div>
        <div class="form-hint">请将此备份码复制保存，用于数据恢复</div>
        <div class="form-hint" style="font-size: 12px; color: var(--text-secondary);">
            💡 提示：备份码由拼音首字母和数字组成，更易手动输入
        </div>
    `, [
        { 
            text: '复制', 
            class: 'btn-primary', 
            action: () => {
                navigator.clipboard.writeText(backupCode).then(() => {
                    showToast('已复制到剪贴板');
                });
            }
        },
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}









// 清空所有数据
function clearAllData() {
    if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
        DataManager.clearAllData();
        expandedPhones = {};
        todayDrawResult = null;
        currentGamePhoneId = null;
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

// 格式化任意 Date 对象为本地日期字符串（YYYY-MM-DD），避免 toISOString 的时区偏差
function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 解析日期字符串（YYYY-MM-DD）为本地时间的 Date 对象，避免时区偏差
function parseLocalDate(dateStr) {
    if (!dateStr) return new Date();
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date(dateStr);
}

// 获取今天的本地午夜 Date 对象
function getTodayLocal() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// 获取当前主题色
function getThemeColor(colorType = 'primary') {
    const colors = DataManager.getThemeColors();
    return colors[colorType] || colors.primary;
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

// 点击模态框背景关闭
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});



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
    
    // 如果切换了手机，清除当前计时器和抽签结果
    if (todayDrawResult && todayDrawResult._phoneId !== currentGamePhoneId) {
        todayDrawResult = null;
    }
    // 停止当前计时器（如果正在运行）
    if (typeof gameTimerState !== 'undefined' && gameTimerState.intervalId) {
        clearInterval(gameTimerState.intervalId);
        gameTimerState.intervalId = null;
    }
    
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

    // 检查今天是否已经抽签（优先使用内存变量，如果没有则从localStorage恢复）
    const today = getCurrentDate();

    // 首先检查内存变量（必须匹配当前手机ID）
    if (todayDrawResult && todayDrawResult._drawDate === today && todayDrawResult._phoneId === currentGamePhoneId) {
        // 今天已经抽签过了，显示抽签结果
        showTodayDrawResult(todayDrawResult);
        return;
    }

    // 如果内存变量不存在，从抽签历史记录中恢复
    const history = DataManager.getGameDrawHistory();
    
    // 只查找当前手机的记录
    const todayRecord = history.find(h => h.date === today && h.phoneId === currentGamePhoneId);

    if (todayRecord) {
        // 恢复 todayDrawResult（优先使用历史记录中的游戏名称）
        todayDrawResult = {
            id: todayRecord.gameId,
            gameId: todayRecord.gameId,
            gameName: todayRecord.gameName || '未知游戏',
            name: todayRecord.gameName || '未知游戏',
            daysPlayed: todayRecord.daysPlayed || 0,
            remainingDays: todayRecord.remainingDays || (todayRecord.targetDays - todayRecord.daysPlayed),
            targetDays: todayRecord.targetDays || 7,
            isRedownload: todayRecord.isRedownload || false,
            _drawDate: today,
            _phoneId: todayRecord.phoneId,
            _remainingDays: todayRecord.remainingDays || (todayRecord.targetDays - todayRecord.daysPlayed)
        };
        showTodayDrawResult(todayDrawResult);
        return;
    }

    // 今天还没抽签，显示抽签按钮
    container.innerHTML = `
        <div style="font-size: 18px; margin-bottom: 16px;">点击下方按钮抽签决定今天玩哪个游戏</div>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button class="btn" onclick="drawTodayGame()" style="background: white; color: #11998e; font-weight: bold; font-size: 16px;">🎮 本机抽签</button>
            <button class="btn" onclick="showCrossPhoneDrawModal()" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; font-weight: bold; font-size: 16px;">🎲 跨手机抽签</button>
        </div>
    `;
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

// 渲染抽签历史（显示所有历史记录）
function renderGameDrawHistoryList() {
    // 直接读取 localStorage
    const historyStr = localStorage.getItem('moneyApp_gameDrawHistory');
    let history = historyStr ? JSON.parse(historyStr) : [];
    const container = document.getElementById('game-draw-history');
    
    const today = getCurrentDate();
    
    // 只显示当前选中手机的记录（不过滤日期，显示所有历史）
    if (currentGamePhoneId) {
        history = history.filter(h => h.phoneId === currentGamePhoneId);
    }
    
    // 按日期倒序排列（最新的在前）
    history.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (history.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无抽签记录</div>';
        return;
    }
    
    container.innerHTML = history.map((record) => {
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
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 14px; color: ${isGameCompleted ? 'var(--success-color)' : 'var(--primary-color)'}; font-weight: 600;">
                        ${isGameCompleted ? '✅ 游戏已完成' : `${record.daysPlayed}/${record.targetDays || 7}天`}
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary);">
                        ${isGameCompleted ? '' : `剩余${record.remainingDays}天`}
                    </div>
                    ${isToday && !isGameCompleted ? `
                    <div style="margin-top: 8px; font-size: 12px; color: ${isTodayCompleted ? 'var(--success-color)' : 'var(--text-secondary)'};">
                        ${isTodayCompleted ? '✅ 今日已完成' : '⏳ 等待计时结束'}
                    </div>
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
    
    // 保存抽签历史记录
    DataManager.addCompletedDrawHistory(currentGamePhoneId, result, today);
    
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

            <!-- 完成状态显示 -->
            ${isCompletedToday ? `
            <div style="font-size: 16px; color: #fff; font-weight: bold; margin-top: 16px; padding: 12px 24px; background: rgba(255,255,255,0.3); border-radius: 25px; display: inline-block;">
                ✅ 今日已完成
            </div>
            <div style="font-size: 12px; opacity: 0.6; margin-top: 12px;">
                明天再来抽签吧
            </div>
            ` : ''}
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

    console.log('=== 开始游戏计时器 ===');
    console.log('gameId:', gameId);
    console.log('durationMinutes:', durationMinutes);
    console.log('todayDrawResult:', todayDrawResult);
    
    // 获取游戏对象
    let playTime = durationMinutes;
    console.log('初始playTime:', playTime);
    
    // 确保playTime是有效的数字
    if (!playTime || isNaN(playTime)) {
        console.log('需要获取playTime');
        // 尝试从todayDrawResult获取
        if (todayDrawResult && Array.isArray(todayDrawResult) && todayDrawResult[gameId]) {
            console.log('找到游戏对象:', todayDrawResult[gameId]);
            playTime = todayDrawResult[gameId].playTime;
            console.log('从游戏对象获取的playTime:', playTime);
        }
        
        // 如果还是无效，生成随机时间
        if (!playTime || isNaN(playTime)) {
            playTime = getRandomPlayTime();
            console.log('生成随机游玩时间:', playTime);
            // 如果有游戏对象，保存生成的时间
            if (todayDrawResult && Array.isArray(todayDrawResult) && todayDrawResult[gameId]) {
                todayDrawResult[gameId].playTime = playTime;
            }
        }
    }
    
    console.log('最终playTime:', playTime);

    // 再次确保playTime是有效的数字
    if (!playTime || isNaN(playTime)) {
        playTime = 30; // 默认30分钟
        console.log('使用默认游玩时间:', playTime);
    }

    const timerData = DataManager.getGameTimer(gameId);
    let startTime;
    let pausedDuration = 0;
    let isPaused = false;
    let pausedTime = null;

    // 每次点击开始按钮都创建一个新的计时器
    // 这样可以确保计时器从完整的时长开始倒计时
    let finalDuration = playTime;
    startTime = new Date();
    pausedDuration = 0;
    isPaused = false;
    pausedTime = null;

    // 保存计时器状态到 localStorage（用于后台计时）
    const newTimerData = {
        gameId: gameId,
        startTime: startTime.toISOString(),
        duration: finalDuration,
        originalDuration: finalDuration,
        isPaused: isPaused,
        isCompleted: false,
        pausedDuration: pausedDuration,
        pausedTime: pausedTime ? pausedTime.toISOString() : null,
        lastUpdateTime: new Date().toISOString() // 最后更新时间
    };
    DataManager.saveGameTimer(gameId, newTimerData);

    // 更新全局状态
    gameTimerState.gameId = gameId;
    gameTimerState.originalDuration = finalDuration;
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

    console.log(`游戏计时器已启动: ${gameId}, 时长 ${playTime} 分钟`);
}

// 启动游戏计时器（兼容旧接口，使用游戏索引）
function startGameTimerByIndex(gameIndex) {
    console.log('=== 开始游戏计时器（按索引）===', gameIndex);
    
    // 检查游戏结果是否存在
    if (!todayDrawResult || !todayDrawResult[gameIndex]) {
        console.error('错误: 没有找到游戏结果或游戏索引无效');
        return;
    }
    
    const game = todayDrawResult[gameIndex];
    console.log('完整游戏对象:', game);
    
    // 确保playTime有值
    let playTime = game.playTime;
    console.log('原始playTime:', playTime);
    
    if (!playTime || isNaN(playTime)) {
        playTime = getRandomPlayTime();
        console.log('生成随机游玩时间:', playTime);
        // 同时更新游戏对象的playTime
        game.playTime = playTime;
    }
    
    console.log('游戏信息:', { gameIndex, gameName: game.name, playTime });
    
    // 调用新的计时器函数
    startGameTimer(gameIndex, playTime);
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

    // 更新 todayDrawResult 的天数（与自动结束保持一致）
    if (todayDrawResult) {
        todayDrawResult.daysPlayed = (todayDrawResult.daysPlayed || 0) + 1;
        todayDrawResult.remainingDays = Math.max(0, (todayDrawResult._remainingDays || todayDrawResult.remainingDays || 7) - todayDrawResult.daysPlayed);

        // 保存到抽签历史
        const today = getCurrentDate();
        DataManager.updateDrawHistoryDays(todayDrawResult._phoneId || currentGamePhoneId, today, todayDrawResult.daysPlayed);
    }

    // 自动标记今日完成
    completeTodayGame();

    // 更新显示
    const container = document.getElementById('timer-display-container');
    if (container) {
        container.innerHTML = `
            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">⏱️ 计时已结束</div>
            <div style="font-size: 36px; font-weight: bold; color: #fff;">已完成</div>
            <div style="font-size: 12px; opacity: 0.8; margin-top: 8px;">
                实际游玩: ${formatElapsedTime(gameTimerState.originalDuration * 60 - gameTimerState.remainingSeconds)}
            </div>
            <div style="font-size: 12px; color: #38ef7d; margin-top: 8px;">✅ 已自动标记今日完成</div>
        `;
    }

    showToast('游戏计时已结束，已标记今日完成', 'success');
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

    // 自动标记今日完成
    completeTodayGame();

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
    // 更新主计时器显示
    const displayEl = document.getElementById('game-timer-display');
    if (displayEl) {
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        displayEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    // 更新弹窗中的计时器显示
    const gameId = gameTimerState.gameId;
    if (gameId !== null) {
        const countdownTimer = document.querySelector(`.countdown-timer[data-game-index="${gameId}"]`);
        if (countdownTimer) {
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            countdownTimer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        
        // 更新进度条
        const progressBar = document.querySelector(`.countdown-progress[data-game-index="${gameId}"]`);
        if (progressBar && gameTimerState.originalDuration) {
            const totalSeconds = gameTimerState.originalDuration * 60;
            const progress = (remainingSeconds / totalSeconds) * 100;
            progressBar.style.width = `${Math.max(0, progress)}%`;
        }
    }
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
    
    // 自动标记完成
    completeTodayGame();
    
    showModal(
        '⏰ 游戏时间到！',
        `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 64px; margin-bottom: 16px;">🎮</div>
                <div style="font-size: 18px; margin-bottom: 12px;">游戏计时已结束</div>
                <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
                    实际游玩时长: <strong>${formatElapsedTime(Math.max(0, elapsedSeconds))}</strong>
                </div>
                <div style="font-size: 13px; color: var(--success-color); background: var(--bg-secondary); padding: 12px; border-radius: 8px;">
                    ✅ 已自动标记今日完成
                </div>
            </div>
        `,
        [
            {
                text: '确定',
                class: 'btn-primary',
                action: () => {
                    closeModal();
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

    // 计算年度剩余天数
    const today = new Date();
    const currentYear = today.getFullYear();
    const yearEnd = new Date(goal.year, 11, 31); // 当年12月31日
    const daysRemaining = Math.ceil((yearEnd - today) / (1000 * 60 * 60 * 24));
    
    // 计算每日目标（考虑已赚取金额）
    const yearlyDailyTarget = DataManager.calculateYearlyDailyTarget();
    const dailyTargetAmount = yearlyDailyTarget.isValid ? yearlyDailyTarget.dailyTarget : 0;
    
    // 计算今日赚取金额
    const todayStr = getCurrentDate();
    const todayEarned = DataManager.getTodayTotalEarnings();
    const isTodayAchieved = todayEarned >= dailyTargetAmount && dailyTargetAmount > 0;
    
    // 获取所有有记录的每日赚取
    const allDailyEarnings = DataManager.getAllDailyEarnings();

    let html = `
        <div style="padding: 16px;">
            <!-- 总体进度卡片 -->
            <div style="background: var(--card-bg); border-radius: 20px; padding: 20px; margin-bottom: 20px; box-shadow: var(--shadow-card); border: 1px solid var(--border-color);">
                <!-- 头部：年份和剩余天数 -->
                <div class="yearly-goal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="yearly-goal-icon" style="width: 36px; height: 36px; background: linear-gradient(135deg, #8b5cf6, #a78bfa); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px;">🎯</div>
                        <div>
                            <div class="yearly-goal-title" style="font-size: 15px; font-weight: 700; color: var(--text-primary);">${goal.year}年度目标</div>
                            <div class="yearly-goal-mode" style="font-size: 11px; color: var(--text-secondary);">${goal.mode === 'minWithdraw' ? '📱 最小提现模式' : '✏️ 自定义模式'}</div>
                        </div>
                    </div>
                    ${daysRemaining > 0 ? `
                    <div class="yearly-goal-days" style="background: linear-gradient(135deg, #f59e0b, #fbbf24); padding: 5px 12px; border-radius: 20px; white-space: nowrap;">
                        <span style="font-size: 11px; font-weight: 600; color: white;">⏰ 剩余${daysRemaining}天</span>
                    </div>
                    ` : ''}
                </div>

                <!-- 核心数据区 -->
                <div class="yearly-goal-stats">
                    <!-- 目标金额 -->
                    <div class="yearly-goal-stat yearly-goal-stat--purple">
                        <div class="yearly-goal-stat__label">目标金额</div>
                        <div class="yearly-goal-stat__value">¥${goal.amount.toFixed(2)}</div>
                    </div>
                    
                    <!-- 已赚取 -->
                    <div class="yearly-goal-stat yearly-goal-stat--green">
                        <div class="yearly-goal-stat__label">已赚取</div>
                        <div class="yearly-goal-stat__value">¥${distribution.totalEarned.toFixed(2)}</div>
                    </div>
                    
                    <!-- 剩余金额 -->
                    <div class="yearly-goal-stat yearly-goal-stat--red">
                        <div class="yearly-goal-stat__label">剩余</div>
                        <div class="yearly-goal-stat__value">¥${Math.max(0, distribution.remaining).toFixed(2)}</div>
                    </div>
                </div>

                <!-- 进度条区域 -->
                <div style="margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 13px; color: var(--text-secondary);">总体进度</span>
                        <span style="font-size: 14px; font-weight: 700; color: ${isOverTarget ? '#f59e0b' : '#8b5cf6'};">${progressPercent}%</span>
                    </div>
                    <div style="background: var(--bg-secondary); border-radius: 12px; height: 12px; overflow: hidden;">
                        <div style="background: ${isOverTarget ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #8b5cf6, #a78bfa)'}; height: 100%; width: ${progressPercent}%; transition: width 0.6s ease; border-radius: 12px; box-shadow: 0 2px 8px ${isOverTarget ? 'rgba(245, 158, 11, 0.3)' : 'rgba(139, 92, 246, 0.3)'};"></div>
                    </div>
                </div>

                <!-- 今日赚取和每日目标 -->
                <div style="display: flex; gap: 12px;">
                    <!-- 每日目标 -->
                    <div style="flex: 1; background: rgba(59, 130, 246, 0.08); border-radius: 12px; padding: 14px; border: 1px solid rgba(59, 130, 246, 0.15);">
                        <div style="font-size: 11px; color: #3b82f6; margin-bottom: 4px;">每日需赚取</div>
                        <div style="font-size: 18px; font-weight: 700; color: var(--text-primary);">¥${dailyTargetAmount.toFixed(2)}</div>
                    </div>
                    
                    <!-- 今日赚取 -->
                    <div style="flex: 1; background: ${isTodayAchieved ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; border-radius: 12px; padding: 14px; border: 2px solid ${isTodayAchieved ? '#10b981' : '#f59e0b'};">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                            <span style="font-size: 11px; color: ${isTodayAchieved ? '#10b981' : '#f59e0b'};">今日赚取</span>
                            ${isTodayAchieved ? '<span style="font-size: 14px;">✅</span>' : '<span style="font-size: 14px;">⏳</span>'}
                        </div>
                        <div style="font-size: 18px; font-weight: 700; color: var(--text-primary);">¥${todayEarned.toFixed(2)}</div>
                        ${!isTodayAchieved && dailyTargetAmount > 0 ? `<div style="font-size: 10px; color: var(--text-secondary); margin-top: 2px;">还差 ¥${(dailyTargetAmount - todayEarned).toFixed(2)}</div>` : ''}
                    </div>
                </div>

                <!-- 预测信息 -->
                ${!isOverTarget ? `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
                    ${(() => {
                        const prediction = DataManager.calculatePredictedCompletionDate();
                        if (prediction) {
                            const formattedDate = `${prediction.date.getFullYear()}-${String(prediction.date.getMonth() + 1).padStart(2, '0')}-${String(prediction.date.getDate()).padStart(2, '0')}`;
                            return `
                            <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span style="font-size: 12px; color: #6b7280;">📅 预计完成:</span>
                                    <span style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${formattedDate}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span style="font-size: 12px; color: #6b7280;">⏱️ 还需:</span>
                                    <span style="font-size: 13px; font-weight: 600; color: #8b5cf6;">${prediction.daysNeeded}天</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span style="font-size: 12px; color: #6b7280;">📈 日均:</span>
                                    <span style="font-size: 13px; font-weight: 600; color: #10b981;">¥${prediction.predictedDailyEarnings.toFixed(2)}</span>
                                </div>
                            </div>
                            `;
                        }
                        return '';
                    })()}
                </div>
                ` : `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
                    <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(52, 211, 153, 0.1) 100%); border-radius: 10px; border: 1px solid rgba(16, 185, 129, 0.2);">
                        <span style="font-size: 24px;">🎉</span>
                        <div>
                            <div style="font-size: 14px; font-weight: 700; color: #10b981;">超额完成!</div>
                            <div style="font-size: 12px; color: var(--text-secondary);">超出 ¥${(distribution.totalEarned - goal.amount).toFixed(2)} · 继续加油!</div>
                        </div>
                    </div>
                </div>
                `}
            </div>




            <!-- 每日赚取记录 -->
            ${allDailyEarnings.length > 0 ? `
            <div style="margin-bottom: 20px;">
                <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--text-primary);">
                    📈 每日赚取记录 (${allDailyEarnings.length}天)
                </div>
                <div id="daily-earnings-container" style="display: flex; gap: 8px; overflow-x: auto; padding: 4px;">
                    ${allDailyEarnings.map(day => {
                        const isDayAchieved = day.amount >= dailyTargetAmount && dailyTargetAmount > 0;
                        const isToday = day.date === todayStr;
                        return `
                        <div id="daily-earning-item-${day.date}" onclick="showDailyEarningDetail('${day.date}')" style="flex: 0 0 auto; min-width: 70px; background: ${isToday ? 'rgba(56, 239, 125, 0.3)' : isDayAchieved ? 'rgba(56, 239, 125, 0.15)' : 'var(--bg-secondary)'}; border-radius: 8px; padding: 8px; text-align: center; border: 2px solid ${isToday ? 'rgba(56, 239, 125, 0.8)' : isDayAchieved ? 'rgba(56, 239, 125, 0.4)' : 'var(--border-color)'}; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                            <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 4px;">${day.date.slice(5)}</div>
                            <div style="font-size: 13px; font-weight: 600; color: ${isDayAchieved ? 'var(--success-color)' : 'var(--text-primary)'}">¥${day.amount.toFixed(0)}</div>
                            ${isDayAchieved ? '<div style="font-size: 9px; color: var(--success-color);">✓</div>' : ''}
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
            ` : ''}

        </div>
    `;

    container.innerHTML = html;
}

// 显示每日赚取详情
function showDailyEarningDetail(date) {
    const data = DataManager.loadData();
    const goal = DataManager.getYearlyGoal();
    
    // 计算每日目标（与首页保持一致：考虑已赚取金额）
    const yearlyDailyTarget = DataManager.calculateYearlyDailyTarget();
    const dailyTargetAmount = yearlyDailyTarget.isValid ? yearlyDailyTarget.dailyTarget : 0;
    
    // 获取该日期所有软件的赚取详情
    let appEarnings = [];
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            if (app.dailyEarnings && app.dailyEarnings[date]) {
                appEarnings.push({
                    phoneName: phone.name,
                    appName: app.name,
                    amount: parseFloat(app.dailyEarnings[date]) || 0
                });
            }
        });
    });
    
    // 按金额排序
    appEarnings.sort((a, b) => b.amount - a.amount);
    
    const totalAmount = appEarnings.reduce((sum, item) => sum + item.amount, 0);
    const isAchieved = totalAmount >= dailyTargetAmount && dailyTargetAmount > 0;
    const isToday = date === getCurrentDate();
    
    let html = `
        <div style="max-height: 60vh; overflow-y: auto;">
            <div style="text-align: center; margin-bottom: 16px; padding: 16px; background: ${isAchieved ? '#fef9c3' : '#fffbeb'}; border-radius: 12px; border: 1px solid ${isAchieved ? '#fde047' : '#fcd34d'};">
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">${isToday ? '今天' : date}</div>
                <div style="font-size: 28px; font-weight: bold; color: ${isAchieved ? '#854d0e' : '#92400e'};">¥${totalAmount.toFixed(2)}</div>
                <div style="font-size: 12px; color: ${isAchieved ? '#92400e' : '#a16207'}; margin-top: 4px;">
                    ${isAchieved ? '✅ 已达标' : '⏳ 未达标'}
                    ${dailyTargetAmount > 0 ? `· 目标: ¥${dailyTargetAmount.toFixed(2)}` : ''}
                </div>
            </div>
            
            ${appEarnings.length > 0 ? `
            <div style="font-size: 13px; font-weight: 600; margin-bottom: 10px; color: var(--text-primary);">
                📱 各软件详情 (${appEarnings.length}个)
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${appEarnings.map((item, index) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 11px; color: var(--text-secondary); width: 20px;">${index + 1}</span>
                            <div>
                                <div style="font-size: 13px; font-weight: 500; color: var(--text-primary);">${item.appName}</div>
                                <div style="font-size: 10px; color: var(--text-secondary);">${item.phoneName}</div>
                            </div>
                        </div>
                        <div style="font-size: 14px; font-weight: 600; color: var(--success-color);">+¥${item.amount.toFixed(2)}</div>
                    </div>
                `).join('')}
            </div>
            ` : '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">暂无详细记录</div>'}
        </div>
    `;
    
    showModal(`${isToday ? '今天' : date} 赚取详情`, html, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}

// 保存收益目标
// 生成年份选项
function generateYearOptions() {
    const yearSelect = document.getElementById('yearly-goal-year');
    if (!yearSelect) return;
    
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 2;
    const endYear = currentYear + 5;
    
    let html = '';
    for (let year = startYear; year <= endYear; year++) {
        html += `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}年</option>`;
    }
    yearSelect.innerHTML = html;
}

// 设置目标模式
function setGoalMode(mode) {
    const customRadio = document.getElementById('goal-mode-custom');
    const minRadio = document.getElementById('goal-mode-minWithdraw');
    if (customRadio) customRadio.checked = mode === 'custom';
    if (minRadio) minRadio.checked = mode === 'minWithdraw';
    onGoalModeChange();
}

// 目标模式切换处理
function onGoalModeChange() {
    const mode = document.querySelector('input[name="goal-mode"]:checked')?.value || 'custom';
    const amountGroup = document.getElementById('yearly-goal-amount-group');
    const minInfo = document.getElementById('yearly-goal-min-info');
    const customLabel = document.getElementById('goal-mode-custom-label');
    const minLabel = document.getElementById('goal-mode-min-label');
    const hint = document.getElementById('goal-mode-hint');
    
    // 更新选中样式
    if (customLabel) {
        customLabel.style.borderColor = mode === 'custom' ? 'var(--primary-color)' : 'var(--border-color)';
        customLabel.style.background = mode === 'custom' ? 'var(--bg-cream)' : 'transparent';
    }
    if (minLabel) {
        minLabel.style.borderColor = mode === 'minWithdraw' ? 'var(--primary-color)' : 'var(--border-color)';
        minLabel.style.background = mode === 'minWithdraw' ? 'var(--bg-cream)' : 'transparent';
    }
    
    // 显示/隐藏对应内容
    if (mode === 'custom') {
        if (amountGroup) amountGroup.style.display = '';
        if (minInfo) minInfo.style.display = 'none';
        if (hint) hint.textContent = '手动输入年度目标金额';
    } else {
        if (amountGroup) amountGroup.style.display = 'none';
        if (minInfo) minInfo.style.display = '';
        if (hint) hint.textContent = '根据所有软件的最小提现金额自动计算目标';
        
        // 更新最小提现计算结果显示
        const result = DataManager.calculateYearlyGoalFromMinWithdraw(false);
        const displayEl = document.getElementById('min-withdraw-goal-display');
        if (displayEl) {
            displayEl.textContent = `¥${result.totalYearlyGoal.toFixed(2)}`;
        }
    }
}

function saveYearlyGoal() {
    // 防重复点击
    if (!acquireLock('saveYearlyGoal')) {
        console.log('保存年度目标操作被锁定，跳过重复点击');
        return;
    }
    
    const yearSelect = document.getElementById('yearly-goal-year');
    const amountInput = document.getElementById('yearly-goal-amount');
    const autoDistributeCheckbox = document.getElementById('yearly-goal-auto-distribute');
    const modeRadio = document.querySelector('input[name="goal-mode"]:checked');

    const year = parseInt(yearSelect.value);
    const autoDistribute = autoDistributeCheckbox.checked;
    const mode = modeRadio?.value || 'custom';
    let amount;

    if (!year || year < 2000 || year > 2100) {
        showToast('请选择有效的年份', 'error');
        releaseLock('saveYearlyGoal');
        return;
    }

    if (mode === 'custom') {
        amount = parseFloat(amountInput.value);
        if (!amount || amount <= 0) {
            showToast('请输入有效的目标金额', 'error');
            releaseLock('saveYearlyGoal');
            return;
        }
    } else {
        // 最小提现模式，动态计算
        const result = DataManager.calculateYearlyGoalFromMinWithdraw(false);
        amount = result.totalYearlyGoal;
    }

    // 保存年度目标
    DataManager.saveYearlyGoal(amount, year, autoDistribute, mode);

    
    // 刷新仪表盘显示
    renderYearlyGoal();
    showToast('目标已保存', 'success');
    
    // 延迟释放操作锁，防止快速重复点击
    setTimeout(() => releaseLock('saveYearlyGoal'), LOCK_DURATION);
}

// 加载收益目标到设置页面
function loadYearlyGoalSettings() {
    const goal = DataManager.getYearlyGoal();
    
    // 生成年份选项
    generateYearOptions();
    
    // 加载手动设置的值
    const yearSelect = document.getElementById('yearly-goal-year');
    const amountInput = document.getElementById('yearly-goal-amount');
    if (yearSelect && goal.year) yearSelect.value = goal.year;
    if (amountInput) amountInput.value = goal.customAmount > 0 ? goal.customAmount : '';
    
    // 加载自动分配设置
    const autoDistributeCheckbox = document.getElementById('yearly-goal-auto-distribute');
    if (autoDistributeCheckbox) autoDistributeCheckbox.checked = goal.autoDistribute;
    
    // 加载模式
    setGoalMode(goal.mode || 'custom');
    
}



// 显示年度目标历史
function viewYearlyGoalHistory() {
    const history = DataManager.getYearlyGoalHistory();
    const currentYear = new Date().getFullYear();
    
    // 为当前年份创建记录（如果不存在）
    const currentYearRecord = history.find(item => item.year === currentYear);
    if (!currentYearRecord) {
        const goal = DataManager.getYearlyGoal();
        const actualAmount = DataManager.getYearlyEarnings(currentYear);
        DataManager.saveYearlyGoalHistory(currentYear, goal.amount, actualAmount);
    }
    
    // 重新获取更新后的历史
    const updatedHistory = DataManager.getYearlyGoalHistory();
    
    let html = `
        <div style="max-height: 60vh; overflow-y: auto;">
            <div style="font-size: 14px; font-weight: 600; margin-bottom: 16px; color: var(--text-primary); text-align: center;">
                📈 年度目标完成历史
            </div>
            
            ${updatedHistory.length === 0 ? `
                <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    暂无历史记录
                </div>
            ` : `
                <div style="space-y: 12px;">
                    ${updatedHistory.map(item => {
                        const isCurrentYear = item.year === currentYear;
                        const isCompleted = item.completed;
                        const progressBarWidth = Math.min(item.completionRate, 100);
                        const progressColor = isCompleted ? '#22c55e' : '#f59e0b';
                        
                        return `
                            <div style="background: var(--bg-secondary); border-radius: 12px; padding: 16px; border: 1px solid var(--border-color); ${isCurrentYear ? 'border-left: 4px solid #3b82f6;' : ''}">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                    <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">
                                        ${item.year}年 ${isCurrentYear ? '(当前年份)' : ''}
                                    </div>
                                    <div style="font-size: 14px; font-weight: 600; color: ${isCompleted ? '#22c55e' : '#f59e0b'};">
                                        ${isCompleted ? '✅ 已完成' : '⏳ 进行中'}
                                    </div>
                                </div>
                                
                                <div style="margin-bottom: 8px; font-size: 13px;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                        <span style="color: var(--text-secondary);">目标金额:</span>
                                        <span style="font-weight: 600;">¥${item.goalAmount.toFixed(2)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                        <span style="color: var(--text-secondary);">实际金额:</span>
                                        <span style="font-weight: 600;">¥${item.actualAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                                
                                <div style="margin-bottom: 4px; font-size: 12px; display: flex; justify-content: space-between;">
                                    <span style="color: var(--text-secondary);">完成率:</span>
                                    <span style="font-weight: 600;">${item.completionRate.toFixed(1)}%</span>
                                </div>
                                
                                <div style="width: 100%; height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                                    <div style="width: ${progressBarWidth}%; height: 100%; background: ${progressColor}; border-radius: 4px; transition: width 0.5s ease;"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
        </div>
    `;
    
    showModal('年度目标历史', html, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
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
            <div id="daily-goal-calendar" style="display: grid; grid-template-columns: repeat(7, minmax(36px, 1fr)); gap: 3px; text-align: center; overflow-x: auto; -webkit-overflow-scrolling: touch;">
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
    
    DataManager.saveAppDailyGoal(currentDailyGoalAppId, amount, enabled, false);    showToast('每日目标已保存', 'success');
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
    
    const today = getCurrentDate();
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
    const today = getCurrentDate();
    
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
    
    // 计算预测每日收益
    const predictedDailyEarnings = DataManager.calculatePredictedDailyEarnings(app);
    const predictedBalance = currentBalance + predictedDailyEarnings;
    
    // 获取历史收益数据用于显示
    const dailyEarnings = app.dailyEarnings || {};
    const earningsCount = Object.keys(dailyEarnings).length;
    const avgEarnings = earningsCount > 0 
        ? (Object.values(dailyEarnings).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) / earningsCount).toFixed(2)
        : '0.00';
    
    // 显示编辑余额弹窗
    showModal(
        '💰 快速编辑余额',
        `
            <div class="form-group">
                <label class="form-label">当前余额: ¥${currentBalance.toFixed(2)} <span style="color: var(--text-secondary); font-size: 12px;">(预测今日: ¥${predictedBalance.toFixed(2)})</span></label>
                <input type="number" id="quick-edit-balance-input" class="form-input" value="${currentBalance.toFixed(2)}" step="0.01" placeholder="输入新余额">
                <div class="form-hint">
                    修改余额后会自动计算今日收益
                    ${earningsCount > 0 ? `<br><span style="color: #10b981;">📊 基于${earningsCount}天历史数据，平均日收益¥${avgEarnings}，预测今日¥${predictedDailyEarnings.toFixed(2)}</span>` : '<br><span style="color: var(--text-secondary);">暂无历史数据，使用最小提现金额作为预测</span>'}
                </div>
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
                    const minWithdraw = app.minWithdraw || 0;
                    
                    // 计算本次赚取金额（余额增量）
                    const earnedAmount = newBalance - currentBalance;
                    
                    // 验证：如果本次赚取金额大于0且小于最小提现金额，先保存余额再跳转到提现模态框
                    if (earnedAmount > 0 && earnedAmount < minWithdraw) {
                        console.log('本次赚取金额', earnedAmount, '小于最小提现金额', minWithdraw, '先保存余额再跳转');
                        
                        // 先保存余额
                        DataManager.editApp(currentDailyGoalPhoneId, currentDailyGoalAppId, {
                            name: app.name,
                            balance: newBalance,
                            minWithdraw: app.minWithdraw || 0,
                            historicalWithdrawn: app.historicalWithdrawn || 0
                        });
                        
                        // 关闭快速编辑余额的模态框
                        closeModal();
                        // 同时关闭每日目标弹窗
                        closeDailyGoalModal();
                        
                        // 刷新页面数据
                        renderPhones();
                        renderDailyGoalContent();
                        
                        // 增加延迟确保模态框完全关闭
                        setTimeout(() => {
                            console.log('打开提现模态框', currentDailyGoalPhoneId, currentDailyGoalAppId);
                            openWithdrawModal(currentDailyGoalPhoneId, currentDailyGoalAppId);
                        }, 250);
                        return;
                    }
                    
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
    
    const today = getCurrentDate();
    
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
        
        // 显示金额（处理浮点数精度问题，最多保留2位小数）
        const displayAmount = hasRecord ? parseFloat(earnedAmount.toFixed(2)) : '';
        
        // 根据背景色调整文字颜色，确保在绿色背景下清晰可见
        const dayTextColor = isAchieved ? '#000' : textColor;
        const amountTextColor = isAchieved ? '#000' : textColor;
        
        html += `
            <div style="
                aspect-ratio: 1;
                background: ${bgColor};
                border-radius: 6px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-size: ${isToday ? '12px' : '10px'};
                font-weight: ${isToday ? 'bold' : 'normal'};
                color: ${textColor};
                border: ${isToday ? '2px solid #11998e' : 'none'};
                position: relative;
                padding: 1px;
                min-height: 40px;
            " title="${dateStr}${hasRecord ? ' - 收益: ¥' + earnedAmount : ' - 无记录'}">
                <span style="font-size: ${isToday ? '11px' : '9px'}; color: ${dayTextColor}; line-height: 1.2;">${day}</span>
                ${hasRecord ? `<span style="font-size: 8px; margin-top: 1px; color: ${amountTextColor}; line-height: 1.2; word-break: break-all;">¥${displayAmount}</span>` : ''}
                ${emoji ? `<span style="font-size: 7px; position: absolute; bottom: 1px; right: 1px;">${emoji}</span>` : ''}
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







function exportToExcel() {
    const data = DataManager.loadData();
    const phones = data.phones || [];
    
    if (phones.length === 0) {
        showToast('暂无数据可导出', 'info');
        return;
    }
    
    const wb = XLSX.utils.book_new();
    
    phones.forEach((phone, index) => {
        let sheetData = [];
        
        sheetData.push(['📱 手机名称:', phone.name]);
        sheetData.push(['📅 创建时间:', phone.id ? new Date(parseInt(phone.id.slice(0, 8), 36) * 1000).toLocaleString('zh-CN') : '未知']);
        sheetData.push(['📊 软件数量:', phone.apps.length]);
        sheetData.push([]);
        
        const totalBalance = phone.apps.reduce((sum, app) => sum + (app.balance || 0), 0);
        const totalWithdrawn = phone.apps.reduce((sum, app) => sum + (app.withdrawn || 0) + (app.historicalWithdrawn || 0), 0);
        
        sheetData.push(['💰 手机总余额:', `¥${totalBalance.toFixed(2)}`]);
        sheetData.push(['💸 手机总提现:', `¥${totalWithdrawn.toFixed(2)}`]);
        sheetData.push(['📈 手机总收入:', `¥${(totalBalance + totalWithdrawn).toFixed(2)}`]);
        sheetData.push([]);
        
        sheetData.push(['📋 软件列表']);
        sheetData.push([]);
        
        sheetData.push([
            '序号',
            '软件名称',
            '当前余额 (元)',
            '最低提现 (元)',
            '累计提现 (元)',
            '历史提现 (元)',
            '总收益 (元)',
            '最后更新'
        ]);
        
        phone.apps.forEach((app, appIndex) => {
            const totalWithdrawnApp = (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
            const totalEarned = app.balance + totalWithdrawnApp;
            
            sheetData.push([
                appIndex + 1,
                app.name || '-',
                `¥${(app.balance || 0).toFixed(2)}`,
                `¥${(app.minWithdraw || 0).toFixed(2)}`,
                `¥${(app.withdrawn || 0).toFixed(2)}`,
                `¥${(app.historicalWithdrawn || 0).toFixed(2)}`,
                `¥${totalEarned.toFixed(2)}`,
                app.lastUpdated ? new Date(app.lastUpdated).toLocaleString('zh-CN') : '-'
            ]);
        });
        
        if (phone.apps.length === 0) {
            sheetData.push(['', '暂无软件', '', '', '', '', '', '']);
        }
        
        if (phone.dailyTotalEarnedHistory && Object.keys(phone.dailyTotalEarnedHistory).length > 0) {
            sheetData.push([]);
            sheetData.push(['📅 每日收益记录']);
            sheetData.push([]);
            sheetData.push(['日期', '收益 (元)']);
            
            const sortedDates = Object.keys(phone.dailyTotalEarnedHistory).sort();
            sortedDates.forEach(date => {
                const amount = phone.dailyTotalEarnedHistory[date];
                sheetData.push([date, `¥${(amount || 0).toFixed(2)}`]);
            });
        }
        
        let sheetName = phone.name || `手机${index + 1}`;
        sheetName = sheetName.replace(/[\\/:*?"<>|]/g, '_');
        if (sheetName.length > 31) {
            sheetName = sheetName.substring(0, 31);
        }
        
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        
        const headerStyle = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '8B5CF6' } },
            alignment: { horizontal: 'center', vertical: 'center' }
        };
        
        Object.keys(ws).forEach(key => {
            if (key !== '!ref' && key !== '!cols') {
                if (ws[key].v === '序号' || ws[key].v === '软件名称' || ws[key].v === '当前余额 (元)' || 
                    ws[key].v === '最低提现 (元)' || ws[key].v === '累计提现 (元)' || 
                    ws[key].v === '历史提现 (元)' || ws[key].v === '总收益 (元)' || ws[key].v === '最后更新') {
                    ws[key].s = headerStyle;
                }
            }
        });
        
        ws['!cols'] = [
            { wch: 8 },
            { wch: 20 },
            { wch: 16 },
            { wch: 16 },
            { wch: 16 },
            { wch: 16 },
            { wch: 14 },
            { wch: 22 }
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    
    if (phones.length > 1) {
        const summaryData = [];
        
        summaryData.push(['📊 汇总报表']);
        summaryData.push([]);
        summaryData.push(['手机名称', '软件数量', '总余额 (元)', '总提现 (元)', '总收入 (元)']);
        
        let grandTotalBalance = 0;
        let grandTotalWithdrawn = 0;
        
        phones.forEach(phone => {
            const totalBalance = phone.apps.reduce((sum, app) => sum + (app.balance || 0), 0);
            const totalWithdrawn = phone.apps.reduce((sum, app) => sum + (app.withdrawn || 0) + (app.historicalWithdrawn || 0), 0);
            
            grandTotalBalance += totalBalance;
            grandTotalWithdrawn += totalWithdrawn;
            
            summaryData.push([
                phone.name || '-',
                phone.apps.length,
                `¥${totalBalance.toFixed(2)}`,
                `¥${totalWithdrawn.toFixed(2)}`,
                `¥${(totalBalance + totalWithdrawn).toFixed(2)}`
            ]);
        });
        
        summaryData.push([]);
        summaryData.push(['合计', phones.length, `¥${grandTotalBalance.toFixed(2)}`, `¥${grandTotalWithdrawn.toFixed(2)}`, `¥${(grandTotalBalance + grandTotalWithdrawn).toFixed(2)}`]);
        
        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        summaryWs['!cols'] = [
            { wch: 16 },
            { wch: 12 },
            { wch: 14 },
            { wch: 14 },
            { wch: 14 }
        ];
        
        XLSX.utils.book_append_sheet(wb, summaryWs, '汇总');
    }
    
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const fileName = `赚钱软件数据_${dateStr}_${timeStr}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    
    showToast('✅ 导出成功！', 'success');
}


// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    init();
    initCalendars();
    restoreGameTimer(); // 恢复计时器状态
    loadYearlyGoalSettings(); // 加载年度目标设置
    
    // 显示快速编辑浮动按钮（在所有页面都显示）
    const quickEditFab = document.getElementById('quick-edit-fab');
    if (quickEditFab) {
        quickEditFab.style.display = 'block';
    }
    
    // 添加导航栏点击事件监听器
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(item => {
        item.addEventListener('click', function() {
            const pageName = this.dataset.page;
            showPage(pageName);
        });
    });
    
    // 滚动性能优化
    initScrollOptimization();
});

// 滚动性能优化
function initScrollOptimization() {
    let scrollTimeout;
    let isScrolling = false;
    const pages = document.querySelectorAll('.page');
    
    pages.forEach(page => {
        page.addEventListener('scroll', function() {
            if (!isScrolling) {
                isScrolling = true;
                page.classList.add('scrolling');
                // 滚动时减少模糊效果
                page.style.setProperty('--blur-amount', '2px');
            }
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
                page.classList.remove('scrolling');
                page.style.setProperty('--blur-amount', '5px');
            }, 150);
        }, { passive: true });
    });
}

// 滑动切换页面功能已禁用

// ==================== 每日赚取记录页面功能 ====================

// 渲染每日赚取记录页面
function renderDailyEarningsPage() {
    const allDailyEarnings = DataManager.getAllDailyEarnings();
    const profitableDays = allDailyEarnings.filter(day => day.amount > 0);
    
    // 获取每日目标
    const dailyTarget = DataManager.calculateYearlyDailyTarget();
    const targetAmount = dailyTarget.isValid ? dailyTarget.dailyTarget : 0;
    
    // 更新统计信息
    const statsContainer = document.getElementById('daily-earnings-stats');
    if (statsContainer) {
        const totalEarnings = profitableDays.reduce((sum, day) => sum + day.amount, 0);
        const averageEarnings = profitableDays.length > 0 ? totalEarnings / profitableDays.length : 0;
        const maxEarnings = profitableDays.length > 0 ? Math.max(...profitableDays.map(d => d.amount)) : 0;
        const today = getCurrentDate();
        const todayEarnings = allDailyEarnings.find(d => d.date === today)?.amount || 0;
        
        // 计算达标天数
        const achievedDays = profitableDays.filter(day => day.amount >= targetAmount).length;
        const missedDays = profitableDays.filter(day => day.amount < targetAmount).length;
        
        statsContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                <div style="background: linear-gradient(135deg, #10b981, #34d399); border-radius: 12px; padding: 16px; text-align: center; color: white;">
                    <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">今日收益</div>
                    <div style="font-size: 24px; font-weight: 700;">¥${todayEarnings.toFixed(2)}</div>
                </div>
                <div style="background: linear-gradient(135deg, #8b5cf6, #a78bfa); border-radius: 12px; padding: 16px; text-align: center; color: white;">
                    <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">累计收益</div>
                    <div style="font-size: 24px; font-weight: 700;">¥${totalEarnings.toFixed(2)}</div>
                </div>
                <div style="background: linear-gradient(135deg, #3b82f6, #60a5fa); border-radius: 12px; padding: 16px; text-align: center; color: white;">
                    <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">平均每日</div>
                    <div style="font-size: 24px; font-weight: 700;">¥${averageEarnings.toFixed(2)}</div>
                </div>
                <div style="background: linear-gradient(135deg, #f59e0b, #fbbf24); border-radius: 12px; padding: 16px; text-align: center; color: white;">
                    <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">最高单日</div>
                    <div style="font-size: 24px; font-weight: 700;">¥${maxEarnings.toFixed(2)}</div>
                </div>
            </div>
            <div style="margin-top: 12px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center; font-size: 13px;">
                <div style="background: rgba(16, 185, 129, 0.1); border-radius: 8px; padding: 8px;">
                    <span style="color: #10b981; font-weight: 600;">✓ 达标</span>
                    <span style="color: var(--text-secondary);"> ${achievedDays}天</span>
                </div>
                <div style="background: rgba(239, 68, 68, 0.1); border-radius: 8px; padding: 8px;">
                    <span style="color: #ef4444; font-weight: 600;">✗ 未达标</span>
                    <span style="color: var(--text-secondary);"> ${missedDays}天</span>
                </div>
                <div style="background: rgba(107, 114, 128, 0.1); border-radius: 8px; padding: 8px;">
                    <span style="color: #6b7280; font-weight: 600;">目标</span>
                    <span style="color: var(--text-secondary);"> ¥${targetAmount.toFixed(2)}</span>
                </div>
            </div>
        `;
    }
    
    // 渲染每日明细列表
    const listContainer = document.getElementById('daily-earnings-list');
    if (listContainer) {
        if (profitableDays.length === 0) {
            listContainer.innerHTML = '<div class="empty-state">暂无赚取记录</div>';
            return;
        }
        
        // 按日期倒序排列（最新的在前面）
        const sortedDays = [...profitableDays].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        listContainer.innerHTML = sortedDays.map(day => {
            const date = new Date(day.date);
            const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
            const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
            const isToday = day.date === getCurrentDate();
            
            // 判断是否达标
            const isAchieved = targetAmount > 0 && day.amount >= targetAmount;
            const statusBadge = isAchieved 
                ? '<span style="font-size: 11px; background: #10b981; color: white; padding: 2px 8px; border-radius: 10px; margin-left: 8px;">✓ 达标</span>'
                : (targetAmount > 0 ? '<span style="font-size: 11px; background: #ef4444; color: white; padding: 2px 8px; border-radius: 10px; margin-left: 8px;">✗ 未达标</span>' : '');
            
            // 根据达标状态设置颜色
            const amountColor = isAchieved ? '#10b981' : (targetAmount > 0 ? '#ef4444' : '#10b981');
            const bgColor = isToday ? 'background: rgba(16, 185, 129, 0.1);' : '';
            
            return `
                <div style="padding: 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; ${bgColor}">
                    <div>
                        <div style="font-weight: 600; font-size: 15px;">${dateStr} <span style="font-size: 12px; color: var(--text-secondary);">${weekDay}</span> ${isToday ? '<span style="font-size: 11px; background: #3b82f6; color: white; padding: 2px 8px; border-radius: 10px; margin-left: 8px;">今天</span>' : ''}${statusBadge}</div>
                    </div>
                    <div style="font-size: 20px; font-weight: 700; color: ${amountColor};">+¥${day.amount.toFixed(2)}</div>
                </div>
            `;
        }).join('');
    }
}

// 更新首页今日收益显示
function updateTodayEarnings() {
    const todayEarningsEl = document.getElementById('today-earnings');
    if (todayEarningsEl) {
        const allDailyEarnings = DataManager.getAllDailyEarnings();
        const today = getCurrentDate();
        const todayEarnings = allDailyEarnings.find(d => d.date === today)?.amount || 0;
        todayEarningsEl.textContent = `¥${todayEarnings.toFixed(2)}`;
    }
}


