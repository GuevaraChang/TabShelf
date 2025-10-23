// 全局变量，用于跟踪侧边栏状态
let isSidePanelOpen = false;

// 处理扩展图标点击事件，切换侧边栏显示/隐藏状态
chrome.action.onClicked.addListener(async (tab) => {
  try {
    console.log('扩展图标被点击，当前状态:', isSidePanelOpen);
    
    // 获取当前活动窗口ID
    const windowId = tab.windowId;
    
    // 切换侧边栏状态
    if (isSidePanelOpen) {
      // 当前是打开状态，需要关闭
      try {
        await chrome.sidePanel.close({ windowId: windowId });
        isSidePanelOpen = false;
        console.log('侧边栏已关闭');
      } catch (error) {
        console.error('关闭侧边栏失败:', error);
      }
    } else {
      // 当前是关闭状态，需要打开
      try {
        await chrome.sidePanel.open({ windowId: windowId });
        isSidePanelOpen = true;
        console.log('侧边栏已打开');
        hideDefaultTabBar();
      } catch (error) {
        console.error('打开侧边栏失败:', error);
      }
    }
  } catch (error) {
    console.error('处理扩展图标点击事件失败:', error);
  }
});

// 监听消息事件，处理侧边栏相关操作
chrome.runtime.onMessage.addListener(async (message, sender) => {
  try {
    switch (message.type) {
      case 'OPEN_SIDEPANEL':
        // 如果有任何打开侧边栏的请求，确保设置
        await chrome.sidePanel.setOptions({
          tabId: sender.tab?.id,
          openPanel: true,
          position: 'left'
        });
        isSidePanelOpen = true; // 更新状态
        hideDefaultTabBar();
        break;
        
      case 'SIDEPANEL_OPENED':
        // 侧边栏已打开，记录状态
        isSidePanelOpen = true; // 更新状态
        await chrome.storage.sync.set({ sidePanelOpen: true });
        hideDefaultTabBar();
        break;
        
      case 'SIDEPANEL_CLOSED':
        // 侧边栏已关闭，记录状态
        isSidePanelOpen = false; // 更新状态
        await chrome.storage.sync.set({ sidePanelOpen: false });
        break;
    }
  } catch (error) {
    console.error('处理消息失败:', error);
  }
});

// 隐藏默认浏览器标签栏
function hideDefaultTabBar() {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs && tabs[0]) {
      chrome.scripting.insertCSS({
        target: {tabId: tabs[0].id},
        css: '#TabsToolbar, #tabbrowser-tabs, #tab-view-container { display: none !important; }'
      }).catch(error => {
        console.warn('无法隐藏标签栏:', error);
      });
    }
  });
}

// 扩展安装时的初始化设置
chrome.runtime.onInstalled.addListener(() => {
  try {
    // 设置侧边栏默认路径和位置
    chrome.sidePanel.setOptions({ 
      defaultPath: 'sidepanel.html',
      defaultPosition: 'right'
    });
    
    // 清除任何可能的缓存设置
    chrome.storage.sync.remove(['sidePanelPosition'], () => {
      console.log('已清除侧边栏位置缓存设置');
    });
    
    // 初始化存储默认设置
    chrome.storage.sync.set({
      panelWidth: 300,
      isCollapsed: false,
      customTitles: {},
      language: 'auto'
    }, () => {
      console.log('默认设置已初始化');
    });
  } catch (error) {
    console.error('初始化设置失败:', error);
  }
});

// 监听标签页事件，更新侧边栏并隐藏标签栏
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  try {
    if (changeInfo.status === 'complete') {
      // 发送消息通知侧边栏更新标签信息
      chrome.runtime.sendMessage({
        type: 'TAB_UPDATED',
        tabId: tabId
      });
      
      // 确保侧边栏设置正确
      chrome.sidePanel.setOptions({
        tabId: tabId,
        position: 'left',
        openPanel: undefined
      });
      
      // 隐藏标签栏
      hideDefaultTabBar();
    }
  } catch (error) {
    console.error('标签更新事件处理失败:', error);
  }
});

// 监听标签页创建事件
chrome.tabs.onCreated.addListener(() => {
  try {
    chrome.runtime.sendMessage({ type: 'TABS_CHANGED' });
    hideDefaultTabBar();
  } catch (error) {
    console.error('标签创建事件处理失败:', error);
  }
});

// 监听标签页移除事件
chrome.tabs.onRemoved.addListener(() => {
  try {
    chrome.runtime.sendMessage({ type: 'TABS_CHANGED' });
  } catch (error) {
    console.error('标签移除事件处理失败:', error);
  }
});

// 监听标签页移动事件
chrome.tabs.onMoved.addListener(() => {
  try {
    chrome.runtime.sendMessage({ type: 'TABS_CHANGED' });
  } catch (error) {
    console.error('标签移动事件处理失败:', error);
  }
});