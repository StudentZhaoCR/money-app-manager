// Web Worker - 处理大数据计算，避免阻塞主线程

self.onmessage = function(e) {
    const { type, data } = e.data;
    
    switch (type) {
        case 'calculateStats':
            const stats = calculateStats(data);
            self.postMessage({ type: 'statsResult', result: stats });
            break;
        case 'calculatePhoneData':
            const phoneData = calculatePhoneData(data);
            self.postMessage({ type: 'phoneResult', result: phoneData });
            break;
        case 'generateChartData':
            const chartData = generateChartData(data);
            self.postMessage({ type: 'chartResult', result: chartData });
            break;
    }
};

// 计算统计数据
function calculateStats(data) {
    const totalPhones = data.phones.length;
    const totalApps = data.phones.reduce((sum, phone) => sum + phone.apps.length, 0);
    
    let totalBalance = 0;
    let totalEarned = 0;
    let totalWithdrawn = 0;
    let readyApps = 0;
    
    data.phones.forEach(phone => {
        phone.apps.forEach(app => {
            totalBalance += app.balance || 0;
            totalEarned += app.earned || 0;
            totalWithdrawn += (app.withdrawn || 0) + (app.historicalWithdrawn || 0);
            if ((app.balance || 0) >= (app.minWithdraw || 0)) {
                readyApps++;
            }
        });
    });
    
    return {
        totalPhones,
        totalApps,
        totalBalance,
        totalEarned,
        totalWithdrawn,
        readyApps
    };
}

// 计算手机数据
function calculatePhoneData(phones) {
    return phones.map(phone => {
        const totalEarned = phone.apps.reduce((sum, app) => sum + (app.earned || 0), 0);
        const totalBalance = phone.apps.reduce((sum, app) => sum + (app.balance || 0), 0);
        const totalWithdrawn = phone.apps.reduce((sum, app) => 
            sum + (app.withdrawn || 0) + (app.historicalWithdrawn || 0), 0);
        
        return {
            phoneId: phone.id,
            totalEarned,
            totalBalance,
            totalWithdrawn,
            appCount: phone.apps.length
        };
    });
}

// 生成图表数据
function generateChartData(data) {
    // 简化版图表数据生成
    const dates = [];
    const values = [];
    
    // 生成最近7天的数据
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
        values.push(Math.random() * 100); // 占位数据
    }
    
    return { dates, values };
}
