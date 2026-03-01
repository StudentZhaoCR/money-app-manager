// 从软件分析页面编辑应用
function editAppFromAnalysis(appId, phoneId) {
    // 找到对应的应用
    const data = DataManager.loadData();
    const phone = data.phones.find(p => p.id === phoneId);
    if (!phone) {
        showToast('未找到手机', 'error');
        return;
    }
    
    const app = phone.apps.find(a => a.id === appId);
    if (!app) {
        showToast('未找到应用', 'error');
        return;
    }
    
    // 打开编辑弹窗
    openEditAppModal(phoneId, appId);
}

// 从软件分析页面提现
function withdrawAppFromAnalysis(appId, phoneId) {
    // 找到对应的应用
    const data = DataManager.loadData();
    const phone = data.phones.find(p => p.id === phoneId);
    if (!phone) {
        showToast('未找到手机', 'error');
        return;
    }
    
    const app = phone.apps.find(a => a.id === appId);
    if (!app) {
        showToast('未找到应用', 'error');
        return;
    }
    
    // 打开提现弹窗
    openWithdrawModal(phoneId, appId);
}
