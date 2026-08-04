// ==========================================
// 金币自动结算测试脚本
// 在浏览器控制台粘贴运行即可
// ==========================================

function runSettleTest() {
    console.log('===== 开始金币自动结算测试 =====');

    // 备份原始数据
    const originalData = DataManager.loadData();
    const backupKey = '__test_backup_' + Date.now();
    localStorage.setItem(backupKey, JSON.stringify(originalData));
    console.log('✅ 原始数据已备份到 localStorage key:', backupKey);

    // 构造模拟数据：3天未打开，包含多日未结算金币
    const today = new Date();
    const formatDate = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    };

    // 计算3天前、2天前、1天前的日期
    const d3 = new Date(today); d3.setDate(d3.getDate() - 3);
    const d2 = new Date(today); d2.setDate(d2.getDate() - 2);
    const d1 = new Date(today); d1.setDate(d1.getDate() - 1);
    const todayStr = formatDate(today);

    console.log('今天:', todayStr, '| 1天前:', formatDate(d1), '| 2天前:', formatDate(d2), '| 3天前:', formatDate(d3));

    // 构造测试数据
    const testData = {
        phones: [
            {
                id: 'test_phone_1',
                name: '测试手机A',
                apps: [
                    {
                        id: 'test_app_1',
                        name: '抖音极速版',
                        balance: 5.00,          // 当前余额
                        minWithdraw: 0.3,
                        highWithdraw: 3,
                        exchangeRate: 10000,     // 10000金币=1元
                        dailyCoins: [
                            // 3天前: 50000金币 = 5元 (未结算)
                            { date: formatDate(d3), coins: 50000, settled: false },
                            // 2天前: 33000金币 = 3.3元 (未结算)
                            { date: formatDate(d2), coins: 33000, settled: false },
                            // 1天前: 15000金币 = 1.5元 (未结算)
                            { date: formatDate(d1), coins: 15000, settled: false },
                            // 今天: 8000金币 = 0.8元 (不应该被结算)
                            { date: todayStr, coins: 8000, settled: false }
                        ],
                        dailyEarnings: {},
                        balanceHistory: [],
                        lastLoginDate: todayStr,
                        earningStartDate: formatDate(d3)
                    },
                    {
                        id: 'test_app_2',
                        name: '快手极速版',
                        balance: 2.00,
                        minWithdraw: 0.5,
                        highWithdraw: 5,
                        exchangeRate: 33000,     // 33000金币=1元
                        dailyCoins: [
                            // 2天前: 99000金币 = 3元 (未结算)
                            { date: formatDate(d2), coins: 99000, settled: false },
                            // 1天前: 66000金币 = 2元 (未结算)
                            { date: formatDate(d1), coins: 66000, settled: false }
                        ],
                        dailyEarnings: {},
                        balanceHistory: [],
                        lastLoginDate: formatDate(d1),
                        earningStartDate: formatDate(d2)
                    },
                    {
                        id: 'test_app_3',
                        name: '未设兑换比例的软件',
                        balance: 1.00,
                        minWithdraw: 0.3,
                        exchangeRate: 0,         // 未设置兑换比例
                        dailyCoins: [
                            { date: formatDate(d1), coins: 100000, settled: false }
                        ],
                        dailyEarnings: {},
                        balanceHistory: [],
                        lastLoginDate: formatDate(d1),
                        earningStartDate: formatDate(d1)
                    }
                ]
            },
            {
                id: 'test_phone_2',
                name: '测试手机B',
                apps: [
                    {
                        id: 'test_app_4',
                        name: '百度极速版',
                        balance: 0.50,
                        minWithdraw: 0.3,
                        highWithdraw: 2,
                        exchangeRate: 10000,
                        dailyCoins: [
                            // 3天前已结算的记录 (不应重复结算)
                            { date: formatDate(d3), coins: 20000, settled: true },
                            // 1天前未结算
                            { date: formatDate(d1), coins: 25000, settled: false }
                        ],
                        dailyEarnings: {},
                        balanceHistory: [],
                        lastLoginDate: formatDate(d1),
                        earningStartDate: formatDate(d3)
                    }
                ]
            }
        ],
        installments: [],
        expenses: [],
        settings: {}
    };

    // 保存测试数据
    localStorage.setItem(getSystemKey(PHONES_KEY), JSON.stringify(testData.phones));
    localStorage.setItem(getSystemKey(INSTALLMENTS_KEY), JSON.stringify(testData.installments));
    localStorage.setItem(getSystemKey(EXPENSES_KEY), JSON.stringify(testData.expenses));
    localStorage.setItem(getSystemKey(SETTINGS_KEY), JSON.stringify(testData.settings));
    console.log('✅ 测试数据已注入');

    // 打印结算前状态
    console.log('\n--- 结算前状态 ---');
    testData.phones.forEach(phone => {
        phone.apps.forEach(app => {
            const unsettled = (app.dailyCoins || []).filter(c => !c.settled);
            console.log(`[${phone.name}] ${app.name}: 余额=¥${app.balance.toFixed(2)}, 兑换比例=${app.exchangeRate}:1, 未结算记录=${unsettled.length}条`);
            unsettled.forEach(c => console.log(`  -> ${c.date}: ${c.coins}金币 (预计¥${app.exchangeRate > 0 ? (c.coins / app.exchangeRate).toFixed(2) : 'N/A'})`));
        });
    });

    // 执行自动结算
    console.log('\n--- 执行自动结算 ---');
    const result = DataManager.settlePendingCoins();
    console.log(`结算记录数: ${result.settledCount}`);

    // 打印结算后状态
    console.log('\n--- 结算后状态 ---');
    const settledData = DataManager.loadData();
    settledData.phones.forEach(phone => {
        phone.apps.forEach(app => {
            const unsettled = (app.dailyCoins || []).filter(c => !c.settled);
            const settled = (app.dailyCoins || []).filter(c => c.settled);
            console.log(`[${phone.name}] ${app.name}: 余额=¥${app.balance.toFixed(2)}, 已结算=${settled.length}条, 未结算=${unsettled.length}条`);
            
            if (app.dailyEarnings) {
                const earnings = Object.entries(app.dailyEarnings).sort();
                earnings.forEach(([date, amount]) => {
                    console.log(`  收益记录: ${date} = ¥${amount.toFixed(2)}`);
                });
            }
        });
    });

    // 验证结果
    console.log('\n--- 验证结果 ---');
    let allPass = true;

    // 验证1: 抖音极速版 - 应结算3条(3天前+2天前+1天前)，今天不结算
    const app1 = settledData.phones[0].apps[0];
    const app1Settled = app1.dailyCoins.filter(c => c.settled).length;
    const app1Unsettled = app1.dailyCoins.filter(c => !c.settled);
    // 预期: 5 + 5 + 3.3 + 1.5 = 14.8
    const app1ExpectedBalance = 5.00 + 5.00 + 3.30 + 1.50;
    console.log(`抖音极速版: 结算${app1Settled}条(预期3), 余额¥${app1.balance.toFixed(2)}(预期¥${app1ExpectedBalance.toFixed(2)}), 未结算${app1Unsettled.length}条(预期1=今天)`);
    if (app1Settled !== 3) { console.log('❌ 结算条数不符'); allPass = false; }
    if (Math.abs(app1.balance - app1ExpectedBalance) > 0.01) { console.log('❌ 余额不符'); allPass = false; }
    if (app1Unsettled.length !== 1 || app1Unsettled[0].date !== todayStr) { console.log('❌ 未结算记录不符'); allPass = false; }

    // 验证2: 快手极速版 - 应结算2条
    const app2 = settledData.phones[0].apps[1];
    const app2Settled = app2.dailyCoins.filter(c => c.settled).length;
    // 预期: 2 + 3 + 2 = 7
    const app2ExpectedBalance = 2.00 + 3.00 + 2.00;
    console.log(`快手极速版: 结算${app2Settled}条(预期2), 余额¥${app2.balance.toFixed(2)}(预期¥${app2ExpectedBalance.toFixed(2)})`);
    if (app2Settled !== 2) { console.log('❌ 结算条数不符'); allPass = false; }
    if (Math.abs(app2.balance - app2ExpectedBalance) > 0.01) { console.log('❌ 余额不符'); allPass = false; }

    // 验证3: 未设兑换比例 - 不应结算
    const app3 = settledData.phones[0].apps[2];
    const app3Settled = app3.dailyCoins.filter(c => c.settled).length;
    console.log(`未设兑换比例: 结算${app3Settled}条(预期0), 余额¥${app3.balance.toFixed(2)}(预期¥1.00)`);
    if (app3Settled !== 0) { console.log('❌ 不应结算'); allPass = false; }
    if (Math.abs(app3.balance - 1.00) > 0.01) { console.log('❌ 余额不应改变'); allPass = false; }

    // 验证4: 百度极速版 - 已结算的不重复，只结算1条
    const app4 = settledData.phones[1].apps[0];
    const app4Settled = app4.dailyCoins.filter(c => c.settled).length;
    // 预期: 0.5 + 2.5 = 3.0
    const app4ExpectedBalance = 0.50 + 2.50;
    console.log(`百度极速版: 结算${app4Settled}条(预期2=1已结算+1新结算), 余额¥${app4.balance.toFixed(2)}(预期¥${app4ExpectedBalance.toFixed(2)})`);
    if (app4Settled !== 2) { console.log('❌ 结算条数不符'); allPass = false; }
    if (Math.abs(app4.balance - app4ExpectedBalance) > 0.01) { console.log('❌ 余额不符'); allPass = false; }

    // 验证5: 总结算数
    console.log(`总结算数: ${result.settledCount}(预期6)`);
    if (result.settledCount !== 6) { console.log('❌ 总结算数不符'); allPass = false; }

    if (allPass) {
        console.log('\n🎉 所有验证通过！自动补算逻辑正确。');
    } else {
        console.log('\n⚠️ 部分验证失败，请检查上方日志。');
    }

    // 提供恢复方法
    console.log('\n--- 恢复原始数据 ---');
    console.log('运行以下命令恢复原始数据:');
    console.log(`localStorage.setItem(getSystemKey(PHONES_KEY), '${JSON.stringify(JSON.stringify(originalData.phones)).slice(1, -1)}');`);
    console.log('或刷新页面后运行: restoreTestData("' + backupKey + '")');

    // 注册恢复函数
    window.restoreTestData = function(key) {
        const backup = localStorage.getItem(key);
        if (backup) {
            const data = JSON.parse(backup);
            localStorage.setItem(getSystemKey(PHONES_KEY), JSON.stringify(data.phones));
            localStorage.setItem(getSystemKey(INSTALLMENTS_KEY), JSON.stringify(data.installments));
            localStorage.setItem(getSystemKey(EXPENSES_KEY), JSON.stringify(data.expenses));
            localStorage.setItem(getSystemKey(SETTINGS_KEY), JSON.stringify(data.settings));
            localStorage.removeItem(key);
            console.log('✅ 原始数据已恢复');
            location.reload();
        } else {
            console.log('❌ 未找到备份数据');
        }
    };

    console.log('\n===== 测试完成 =====');
    console.log('恢复命令: restoreTestData("' + backupKey + '")');
}

// 运行测试
runSettleTest();
