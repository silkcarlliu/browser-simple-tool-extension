// 后台脚本
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    // 首次安装时的初始化
    initializeExtension();
  } else if (details.reason === 'update') {
    // 更新时的处理
    handleUpdate(details.previousVersion);
  }
});

// 初始化扩展
function initializeExtension() {
  // 设置默认配置
  const defaultSettings = {
    'auto-hide-toggle': false,
    'dark-mode-toggle': false,
    'dev-mode-toggle': false,
    'version': '2.0.0',
    'first-install': new Date().toISOString()
  };
  
  // 检查storage权限是否可用
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.set(defaultSettings, function() {
      console.log('页面工具合集扩展已初始化');
    });
  } else {
    console.log('Storage权限不可用，使用默认设置');
  }
  
  // 显示欢迎页面
  chrome.tabs.create({
    url: chrome.runtime.getURL('welcome.html')
  });
}

// 处理更新
function handleUpdate(previousVersion) {
  console.log(`页面工具合集从 ${previousVersion} 更新到 2.0.0`);
  
  // 检查storage权限是否可用
  if (chrome.storage && chrome.storage.sync) {
    // 更新设置
    chrome.storage.sync.get(null, function(items) {
      const updatedSettings = {
        ...items,
        'version': '2.0.0',
        'last-update': new Date().toISOString()
      };
      
      chrome.storage.sync.set(updatedSettings);
    });
  } else {
    console.log('Storage权限不可用，跳过设置更新');
  }
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch (request.action) {
    case 'takeScreenshot':
      handleScreenshot(request, sender, sendResponse);
      break;
    case 'downloadFile':
      handleDownload(request, sender, sendResponse);
      break;
    case 'getSettings':
      handleGetSettings(request, sender, sendResponse);
      break;
    case 'updateSettings':
      handleUpdateSettings(request, sender, sendResponse);
      break;
    case 'showNotification':
      handleShowNotification(request, sender, sendResponse);
      break;
    default:
      sendResponse({success: false, error: 'Unknown action'});
  }
  
  // 返回true表示异步响应
  return true;
});

// 处理截图请求
async function handleScreenshot(request, sender, sendResponse) {
  try {
    const tab = await chrome.tabs.get(sender.tab.id);
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
      quality: 100
    });
    
    sendResponse({success: true, dataUrl: dataUrl});
  } catch (error) {
    sendResponse({success: false, error: error.message});
  }
}

// 处理下载请求
function handleDownload(request, sender, sendResponse) {
  try {
    const {url, filename} = request;
    
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: false
    }, function(downloadId) {
      if (chrome.runtime.lastError) {
        sendResponse({success: false, error: chrome.runtime.lastError.message});
      } else {
        sendResponse({success: true, downloadId: downloadId});
      }
    });
  } catch (error) {
    sendResponse({success: false, error: error.message});
  }
}

// 处理获取设置请求
function handleGetSettings(request, sender, sendResponse) {
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(request.keys || null, function(items) {
      sendResponse({success: true, settings: items});
    });
  } else {
    sendResponse({success: false, error: 'Storage权限不可用'});
  }
}

// 处理更新设置请求
function handleUpdateSettings(request, sender, sendResponse) {
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.set(request.settings, function() {
      if (chrome.runtime.lastError) {
        sendResponse({success: false, error: chrome.runtime.lastError.message});
      } else {
        sendResponse({success: true});
      }
    });
  } else {
    sendResponse({success: false, error: 'Storage权限不可用'});
  }
}

// 处理显示通知请求
function handleShowNotification(request, sender, sendResponse) {
  const {title, message, type} = request;
  
  chrome.notifications.create(`notification-${Date.now()}`, {
    type: 'basic',
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOSIgZmlsbD0idXJsKCNncmFkaWVudDApIi8+CjxwYXRoIGQ9Ik0yNCA2TDM2IDE4TDI0IDMwTDEyIDE4TDI0IDZaIiBmaWxsPSJ3aGl0ZSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJncmFkaWVudDAiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgo8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojNjY3ZWVhO3N0b3Atb3BhY2l0eToxIiAvPgo8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM3NjRiYTI7c3RvcC1vcGFjaXR5OjEiIC8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+',
    title: title || '页面工具合集',
    message: message || '操作完成'
  });
  
  sendResponse({success: true});
}

// 监听标签页更新
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    // 页面加载完成后，检查是否需要注入脚本
    checkAndInjectScript(tab);
  }
});

// 检查并注入脚本
function checkAndInjectScript(tab) {
  // 检查是否已经在页面中注入了脚本
  chrome.scripting.executeScript({
    target: {tabId: tab.id},
    function: () => window.pageToolsInjected
  }, function(results) {
    if (chrome.runtime.lastError) {
      // 忽略错误（例如在特殊页面上的错误）
      return;
    }
    
    const isInjected = results && results[0] && results[0].result;
    if (!isInjected) {
      // 注入content script
      chrome.scripting.executeScript({
        target: {tabId: tab.id},
        files: ['content-script.js']
      });
      
      chrome.scripting.insertCSS({
        target: {tabId: tab.id},
        files: ['styles.css']
      });
    }
  });
}

// 监听扩展图标点击
chrome.action.onClicked.addListener(function(tab) {
  // 如果当前标签页支持，则切换悬浮按钮
  if (tab.url && tab.url.startsWith('http')) {
    chrome.scripting.executeScript({
      target: {tabId: tab.id},
      function: toggleFloatButtonFromAction
    });
  }
});

// 从action按钮切换悬浮按钮
function toggleFloatButtonFromAction() {
  const floatBtn = document.getElementById('maybe-page-tools-float-btn');
  if (floatBtn) {
    floatBtn.style.display = floatBtn.style.display === 'none' ? 'flex' : 'none';
    
    // 显示通知
    const message = floatBtn.style.display === 'none' ? '悬浮按钮已隐藏' : '悬浮按钮已显示';
    showNotification(message, 'info');
  } else {
    showNotification('页面工具未加载，请刷新页面', 'warning');
  }
}



// 监听键盘快捷键
chrome.commands.onCommand.addListener(function(command) {
  switch (command) {
    case 'toggle-float-button':
      toggleFloatButtonOnActiveTab();
      break;
    case 'take-screenshot':
      takeScreenshotOnActiveTab();
      break;
    case 'remove-ads':
      removeAdsOnActiveTab();
      break;
  }
});

// 在活动标签页切换悬浮按钮
async function toggleFloatButtonOnActiveTab() {
  const tabs = await chrome.tabs.query({active: true, currentWindow: true});
  if (tabs[0] && tabs[0].url && tabs[0].url.startsWith('http')) {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      function: toggleFloatButtonFromAction
    });
  }
}

// 在活动标签页截图
async function takeScreenshotOnActiveTab() {
  const tabs = await chrome.tabs.query({active: true, currentWindow: true});
  if (tabs[0] && tabs[0].url && tabs[0].url.startsWith('http')) {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      function: takeQuickScreenshot
    });
  }
}

// 在活动标签页移除广告
async function removeAdsOnActiveTab() {
  const tabs = await chrome.tabs.query({active: true, currentWindow: true});
  if (tabs[0] && tabs[0].url && tabs[0].url.startsWith('http')) {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      function: removeAdsQuick
    });
  }
}

// 快速截图函数（注入到页面）
async function takeQuickScreenshot() {
  try {
    // 使用Chrome的原生截图API
    chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
      if (chrome.runtime.lastError) {
        chrome.notifications.create(`screenshot-error-${Date.now()}`, {
          type: 'basic',
          iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOSIgZmlsbD0idXJsKCNncmFkaWVudDApIi8+CjxwYXRoIGQ9Ik0yNCA2TDM2IDE4TDI0IDMwTDEyIDE4TDI0IDZaIiBmaWxsPSJ3aGl0ZSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJncmFkaWVudDAiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgo8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojNjY3ZWVhO3N0b3Atb3BhY2l0eToxIiAvPgo8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM3NjRiYTI7c3RvcC1vcGFjaXR5OjEiIC8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+',
          title: '页面工具合集',
          message: '截图失败: ' + chrome.runtime.lastError.message
        });
        return;
      }
      
      // 创建下载链接
      const link = document.createElement('a');
      link.download = `screenshot_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
      
      chrome.notifications.create(`screenshot-success-${Date.now()}`, {
        type: 'basic',
        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOSIgZmlsbD0idXJsKCNncmFkaWVudDApIi8+CjxwYXRoIGQ9Ik0yNCA2TDM2IDE4TDI0IDMwTDEyIDE4TDI0IDZaIiBmaWxsPSJ3aGl0ZSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJncmFkaWVudDAiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgo8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojNjY3ZWVhO3N0b3Atb3BhY2l0eToxIiAvPgo8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM3NjRiYTI7c3RvcC1vcGFjaXR5OjEiIC8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+',
        title: '页面工具合集',
        message: '截图已保存'
      });
    });
  } catch (error) {
    chrome.notifications.create(`screenshot-error-${Date.now()}`, {
      type: 'basic',
      iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOSIgZmlsbD0idXJsKCNncmFkaWVudDApIi8+CjxwYXRoIGQ9Ik0yNCA2TDM2IDE4TDI0IDMwTDEyIDE4TDI0IDZaIiBmaWxsPSJ3aGl0ZSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJncmFkaWVudDAiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgo8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojNjY3ZWVhO3N0b3Atb3BhY2l0eToxIiAvPgo8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM3NjRiYTI7c3RvcC1vcGFjaXR5OjEiIC8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+',
      title: '页面工具合集',
      message: '截图失败: ' + error.message
    });
  }
}

// 快速移除广告函数（注入到页面）
function removeAdsQuick() {
  const adClasses = ['ad', 'ads', 'advertisement', 'banner', 'sponsor', 'popup', 'ad-container'];
  let removedCount = 0;
  
  adClasses.forEach(className => {
    const elements = document.querySelectorAll(`[class*="${className}"]`);
    elements.forEach(el => {
      el.remove();
      removedCount++;
    });
  });
  
  const adIframes = document.querySelectorAll('iframe[src*="ad"], iframe[src*="ads"]');
  adIframes.forEach(iframe => {
    iframe.remove();
    removedCount++;
  });
  
  chrome.notifications.create(`ads-removed-${Date.now()}`, {
    type: 'basic',
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOSIgZmlsbD0idXJsKCNncmFkaWVudDApIi8+CjxwYXRoIGQ9Ik0yNCA2TDM2IDE4TDI0IDMwTDEyIDE4TDI0IDZaIiBmaWxsPSJ3aGl0ZSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJncmFkaWVudDAiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgo8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojNjY3ZWVhO3N0b3Atb3BhY2l0eToxIiAvPgo8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM3NjRiYTI7c3RvcC1vcGFjaXR5OjEiIC8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+',
    title: '页面工具合集',
    message: `已移除 ${removedCount} 个广告元素`
  });
}

// 定期清理过期数据
setInterval(function() {
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(null, function(items) {
      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // 清理一个月前的数据
      Object.keys(items).forEach(key => {
        if (key.includes('timestamp') && new Date(items[key]) < oneMonthAgo) {
          chrome.storage.sync.remove(key);
        }
      });
    });
  }
}, 24 * 60 * 60 * 1000); // 每天执行一次 