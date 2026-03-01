// ==================== 跨手机游戏抽签功能 ====================

// 获取所有普通抽签历史记录
function getAllGameDrawHistory() {
    const data = DataManager.loadData();
    let allHistory = [];
    
    // 收集所有手机的抽签历史
    data.phones.forEach(phone => {
        if (phone.gameDrawHistory && phone.gameDrawHistory.length > 0) {
            allHistory = allHistory.concat(phone.gameDrawHistory);
        }
    });
    
    // 也检查旧的存储方式（兼容旧数据）
    const oldHistory = localStorage.getItem('moneyApp_gameDrawHistory');
    if (oldHistory) {
        try {
            const parsed = JSON.parse(oldHistory);
            if (Array.isArray(parsed)) {
                allHistory = allHistory.concat(parsed);
            }
        } catch (e) {
            console.log('解析旧历史记录失败');
        }
    }
    
    return allHistory;
}

// 计算用户平均每天完成游戏的数量（基于普通抽签历史）
function calculateAverageDailyCompletedGames(allHistory) {
    if (allHistory.length === 0) {
        // 没有历史记录，返回默认值3
        return 3;
    }
    
    // 按日期排序，取最近10次
    allHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentHistory = allHistory.slice(0, 10);
    
    // 计算每次抽签完成的游戏数量
    const totalCompleted = recentHistory.reduce((sum, record) => {
        // 检查记录格式
        if (record.games && Array.isArray(record.games)) {
            // 新格式：games数组，每个游戏有completed字段
            return sum + record.games.filter(g => g.completed).length;
        } else if (record.drawResult && record.drawResult.games) {
            // 旧格式：drawResult.games数组
            return sum + record.drawResult.games.length;
        }
        return sum;
    }, 0);
    
    const average = totalCompleted / recentHistory.length;
    
    console.log('普通抽签历史记录数:', allHistory.length);
    console.log('最近10次完成游戏总数:', totalCompleted);
    console.log('平均每次完成:', average.toFixed(1));
    
    // 限制在2-5个之间
    return Math.max(2, Math.min(5, Math.round(average)));
}

// 显示跨手机抽签弹窗
function showCrossPhoneDrawModal() {
    const modal = document.getElementById('cross-phone-draw-modal');
    const body = document.getElementById('cross-phone-draw-body');
    
    // 获取所有游戏（使用正确的 API）
    const allDownloadedGames = DataManager.getDownloadedGames();
    const data = DataManager.loadData();
    
    // 调试：检查数据结构
    console.log('=== 跨手机抽签调试 ===');
    console.log('所有下载的游戏:', allDownloadedGames.length);
    console.log('游戏列表:', allDownloadedGames);
    
    // 过滤未完成的游戏，并添加手机信息
    const allGames = [];
    allDownloadedGames.forEach(game => {
        // 只收集未完成的游戏（completed 为 false 或不存在）
        if (game.completed !== true) {
            // 查找对应手机名称
            const phone = data.phones.find(p => p.id === game.phoneId);
            allGames.push({
                ...game,
                phoneName: phone ? phone.name : '未知手机'
            });
        }
    });
    
    console.log('符合条件的游戏数:', allGames.length);
    
    if (allGames.length === 0) {
        showToast('没有可玩的游戏', 'warning');
        return;
    }
    
    // 获取历史记录并计算应该抽取的游戏数量
    const allHistory = getAllGameDrawHistory();
    const recommendedCount = calculateAverageDailyCompletedGames(allHistory);
    // 确保不超过可用游戏数
    const drawCount = Math.min(recommendedCount, allGames.length);
    
    // 显示抽签界面
    const hasHistory = allHistory.length > 0;
    const tipText = hasHistory 
        ? `根据您平时每次抽签平均完成 ${recommendedCount} 个游戏推荐`
        : '默认推荐抽取 3 个游戏';
    
    body.innerHTML = `
        <div style="text-align: center; padding: 20px 0;">
            <div style="font-size: 16px; margin-bottom: 12px; color: var(--text-primary);">
                将从 <b>${allGames.length}</b> 个游戏中抽取 <b>${drawCount}</b> 个
            </div>
            <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px;">
                ${tipText}
            </div>
            <button class="btn btn-primary" onclick="startCrossPhoneDraw()" style="font-size: 16px; padding: 12px 40px;">
                🎲 开始抽签
            </button>
        </div>
    `;
    
    // 设置抽取数量
    window.selectedGameCount = drawCount;
    
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

// 关闭跨手机抽签弹窗
function closeCrossPhoneDrawModal() {
    const modal = document.getElementById('cross-phone-draw-modal');
    modal.style.display = 'none';
    modal.classList.remove('show');
}

// 开始跨手机抽签
function startCrossPhoneDraw() {
    const count = window.selectedGameCount || 3;
    const allDownloadedGames = DataManager.getDownloadedGames();
    const data = DataManager.loadData();
    
    // 收集所有未完成的游戏
    let allGames = [];
    allDownloadedGames.forEach(game => {
        // 只收集未完成的游戏（completed 为 false 或不存在）
        if (game.completed !== true) {
            // 计算权重
            const targetDays = game.targetDays || 7;
            const progressPercent = game.daysPlayed / targetDays;
            const daysSinceLastPlayed = game.lastPlayedDate ? 
                Math.floor((new Date() - new Date(game.lastPlayedDate)) / (1000 * 60 * 60 * 24)) : 30;
            
            // 进度权重：快完成的优先
            const progressWeight = progressPercent >= 0.7 ? 3 : progressPercent >= 0.4 ? 2 : 1;
            // 冷落权重：长时间没玩的优先
            const neglectWeight = Math.min(daysSinceLastPlayed / 7, 3);
            // 新游戏权重
            const newGameWeight = game.daysPlayed === 0 ? 2 : 1;
            
            const totalWeight = progressWeight + neglectWeight + newGameWeight;
            
            // 查找对应手机名称
            const phone = data.phones.find(p => p.id === game.phoneId);
            
            allGames.push({
                ...game,
                phoneName: phone ? phone.name : '未知手机',
                weight: totalWeight,
                progressPercent: progressPercent
            });
        }
    });
    
    if (allGames.length === 0) {
        showToast('没有可玩的游戏', 'warning');
        return;
    }
    
    // 如果游戏数量少于选择数量，就全部选中
    const drawCount = Math.min(count, allGames.length);
    
    // 加权随机抽取
    const selectedGames = [];
    const tempGames = [...allGames];
    
    for (let i = 0; i < drawCount; i++) {
        const totalWeight = tempGames.reduce((sum, g) => sum + g.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let j = 0; j < tempGames.length; j++) {
            random -= tempGames[j].weight;
            if (random <= 0) {
                selectedGames.push(tempGames[j]);
                tempGames.splice(j, 1);
                break;
            }
        }
    }
    
    // 保存抽签结果
    window.crossPhoneDrawResult = selectedGames;
    
    // 显示抽签结果
    showCrossPhoneDrawResult(selectedGames);
}

// 显示跨手机抽签结果
function showCrossPhoneDrawResult(games) {
    const body = document.getElementById('cross-phone-draw-body');
    const today = new Date().toLocaleDateString('zh-CN');
    
    let html = `
        <div style="padding: 10px 0;">
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">${today}</div>
                <div style="font-size: 18px; font-weight: bold; color: var(--primary-color);">
                    🎯 今日精选 ${games.length} 个游戏
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
    `;
    
    games.forEach((game, index) => {
        const targetDays = game.targetDays || 7;
        const progressPercent = Math.round((game.daysPlayed / targetDays) * 100);
        
        html += `
            <div style="background: var(--bg-secondary); border-radius: 12px; padding: 16px; margin-bottom: 12px; border-left: 4px solid var(--primary-color);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 20px;">${['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index] || '⚪'}</span>
                        <div>
                            <div style="font-weight: 600; font-size: 15px;">${game.name}</div>
                            <div style="font-size: 12px; color: var(--text-secondary);">${game.phoneName}</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 12px; color: var(--text-secondary);">进度</div>
                        <div style="font-weight: 600; color: var(--primary-color);">${progressPercent}%</div>
                    </div>
                </div>
                <div style="background: var(--border-color); border-radius: 4px; height: 6px; overflow: hidden;">
                    <div style="background: var(--primary-color); height: 100%; width: ${progressPercent}%; border-radius: 4px;"></div>
                </div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 6px;">
                    ${game.daysPlayed}/${targetDays}天
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
            
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button class="btn btn-secondary" onclick="showCrossPhoneDrawModal()" style="flex: 1;">重新抽签</button>
                <button class="btn btn-primary" onclick="startMultiGameTimer()" style="flex: 1;">⏱️ 开始计时</button>
            </div>
        </div>
    `;
    
    body.innerHTML = html;
}

// 开始多游戏计时
function startMultiGameTimer() {
    const games = window.crossPhoneDrawResult;
    if (!games || games.length === 0) return;
    
    // 初始化多游戏计时状态
    window.multiGameTimer = {
        isActive: true,
        startTime: Date.now(),
        games: games.map(game => ({
            gameId: game.id,
            gameName: game.name,
            phoneId: game.phoneId,
            phoneName: game.phoneName,
            startTime: Date.now(),
            elapsedTime: 0,
            isRunning: true,
            isCompleted: false
        }))
    };
    
    // 关闭弹窗
    closeCrossPhoneDrawModal();
    
    // 显示计时面板
    showMultiGameTimerPanel();
    
    // 启动计时器
    startMultiGameTimerLoop();
    
    showToast('计时开始！', 'success');
}

// 显示多游戏计时面板
function showMultiGameTimerPanel() {
    // 移除已有的面板
    const existingPanel = document.getElementById('multi-game-timer-panel');
    if (existingPanel) existingPanel.remove();
    
    const panel = document.createElement('div');
    panel.id = 'multi-game-timer-panel';
    panel.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        width: calc(100% - 32px);
        max-width: 500px;
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(20px);
        border-radius: 16px;
        padding: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(0, 0, 0, 0.1);
        z-index: 99;
        max-height: 60vh;
        overflow-y: auto;
    `;
    
    updateMultiGameTimerPanel();
    document.body.appendChild(panel);
}

// 更新计时面板
function updateMultiGameTimerPanel() {
    const panel = document.getElementById('multi-game-timer-panel');
    if (!panel || !window.multiGameTimer) return;
    
    const timer = window.multiGameTimer;
    const now = Date.now();
    
    // 计算总时长
    const totalElapsed = Math.floor((now - timer.startTime) / 1000);
    const totalMinutes = Math.floor(totalElapsed / 60);
    const totalSeconds = totalElapsed % 60;
    
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color);">
            <div style="font-weight: 600; font-size: 16px;">⏱️ 多游戏计时中</div>
            <div style="font-size: 20px; font-weight: bold; color: var(--primary-color);">
                ${String(totalMinutes).padStart(2, '0')}:${String(totalSeconds).padStart(2, '0')}
            </div>
        </div>
        <div style="margin-bottom: 12px;">
    `;
    
    timer.games.forEach((game, index) => {
        if (game.isCompleted) return;
        
        const elapsed = Math.floor((now - game.startTime) / 1000) + game.elapsedTime;
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        html += `
            <div style="background: var(--bg-secondary); border-radius: 10px; padding: 12px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div>
                        <div style="font-weight: 500; font-size: 14px;">${game.gameName}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">${game.phoneName}</div>
                    </div>
                    <div style="font-size: 18px; font-weight: bold; color: var(--primary-color); font-family: monospace;">
                        ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-secondary" onclick="pauseMultiGameTimer(${index})" style="flex: 1; font-size: 11px; padding: 6px;">
                        ${game.isRunning ? '⏸️ 暂停' : '▶️ 继续'}
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="completeMultiGameTimer(${index})" style="flex: 1; font-size: 11px; padding: 6px;">
                        ✅ 完成
                    </button>
                </div>
            </div>
        `;
    });
    
    const completedCount = timer.games.filter(g => g.isCompleted).length;
    
    html += `
        </div>
        <div style="display: flex; gap: 12px; justify-content: center;">
            <button class="btn btn-sm btn-secondary" onclick="minimizeMultiGameTimerPanel()" style="font-size: 11px;">
                最小化
            </button>
            ${completedCount === timer.games.length ? `
            <button class="btn btn-sm btn-primary" onclick="finishAllMultiGames()" style="font-size: 11px;">
                全部完成
            </button>
            ` : ''}
        </div>
    `;
    
    panel.innerHTML = html;
}

// 多游戏计时循环
function startMultiGameTimerLoop() {
    if (!window.multiGameTimer || !window.multiGameTimer.isActive) return;
    
    updateMultiGameTimerPanel();
    
    requestAnimationFrame(() => {
        setTimeout(startMultiGameTimerLoop, 1000);
    });
}

// 暂停/继续单个游戏计时
function pauseMultiGameTimer(index) {
    const game = window.multiGameTimer.games[index];
    if (game.isRunning) {
        game.isRunning = false;
        game.elapsedTime += Math.floor((Date.now() - game.startTime) / 1000);
    } else {
        game.isRunning = true;
        game.startTime = Date.now();
    }
    updateMultiGameTimerPanel();
}

// 完成单个游戏
function completeMultiGameTimer(index) {
    const game = window.multiGameTimer.games[index];
    game.isRunning = false;
    game.isCompleted = true;
    game.elapsedTime += Math.floor((Date.now() - game.startTime) / 1000);
    
    // 标记游戏已玩
    DataManager.recordGamePlayed(game.gameId, game.phoneId);
    
    showToast(`${game.gameName} 已完成！`, 'success');
    updateMultiGameTimerPanel();
}

// 最小化计时面板
function minimizeMultiGameTimerPanel() {
    const panel = document.getElementById('multi-game-timer-panel');
    if (!panel) return;
    
    const timer = window.multiGameTimer;
    const now = Date.now();
    const totalElapsed = Math.floor((now - timer.startTime) / 1000);
    const minutes = Math.floor(totalElapsed / 60);
    const seconds = totalElapsed % 60;
    const completedCount = timer.games.filter(g => g.isCompleted).length;
    
    panel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="restoreMultiGameTimerPanel()">
            <div style="font-weight: 600;">🎮 ${timer.games.length - completedCount} 个游戏中</div>
            <div style="font-size: 18px; font-weight: bold; color: var(--primary-color); font-family: monospace;">
                ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}
            </div>
        </div>
    `;
    panel.style.maxHeight = '60px';
    panel.style.overflow = 'hidden';
}

// 恢复计时面板
function restoreMultiGameTimerPanel() {
    const panel = document.getElementById('multi-game-timer-panel');
    if (panel) {
        panel.style.maxHeight = '60vh';
        panel.style.overflowY = 'auto';
        updateMultiGameTimerPanel();
    }
}

// 完成所有游戏
function finishAllMultiGames() {
    const timer = window.multiGameTimer;
    
    // 保存记录
    const record = {
        date: new Date().toISOString(),
        games: timer.games.map(g => ({
            gameName: g.gameName,
            phoneName: g.phoneName,
            duration: g.elapsedTime,
            completed: g.isCompleted
        })),
        totalDuration: Math.floor((Date.now() - timer.startTime) / 1000)
    };
    
    // 保存到历史记录
    let history = JSON.parse(localStorage.getItem('crossPhoneDrawHistory') || '[]');
    history.unshift(record);
    if (history.length > 30) history = history.slice(0, 30);
    localStorage.setItem('crossPhoneDrawHistory', JSON.stringify(history));
    
    // 清理
    window.multiGameTimer = null;
    const panel = document.getElementById('multi-game-timer-panel');
    if (panel) panel.remove();
    
    showToast('全部完成！记录已保存', 'success');
    renderGamesPage();
}
