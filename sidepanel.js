// TabShelf扩展主脚本

// 全局变量
let tabsList;
let searchInput;
let newTabBtn;
let loadingIndicator;
let settingsBtn;
let settingsPanel;
let closeSettingsBtn;
let kimiApiKeyInput;
let saveApiKeyBtn;
let isRendering = false; // 防止重复渲染的标志
let tabData = {}; // 存储标签的自定义数据
let summarizedTitles = new Map(); // 缓存已经总结过的标题


// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 获取DOM元素
  tabsList = document.getElementById('tabs-list');
  searchInput = document.getElementById('search-input');
  newTabBtn = document.getElementById('new-tab-btn');
  loadingIndicator = document.getElementById('loading-indicator');
  settingsBtn = document.getElementById('settings-btn');
  settingsPanel = document.getElementById('settings-panel');
  closeSettingsBtn = document.getElementById('close-settings-btn');
  kimiApiKeyInput = document.getElementById('kimi-api-key');
  saveApiKeyBtn = document.getElementById('save-api-key-btn');
  
  // 加载保存的API密钥
  try {
    const savedApiKey = await getApiKey();
    if (savedApiKey) {
      kimiApiKeyInput.value = savedApiKey;
    }
  } catch (e) {
    console.error('加载API密钥出错:', e);
  }
  
  // 显示/隐藏设置面板
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
  });
  
  closeSettingsBtn.addEventListener('click', () => {
    settingsPanel.classList.add('hidden');
  });
  
  // 保存API密钥
  saveApiKeyBtn.addEventListener('click', async () => {
    try {
      const apiKey = kimiApiKeyInput.value.trim();
      await saveApiKey(apiKey);
      // 清空缓存，使新API密钥立即生效
      summarizedTitles.clear();
      alert('API密钥已保存并生效');
      settingsPanel.classList.add('hidden');
      // 重新渲染标签，应用新的API密钥
      await renderTabs();
    } catch (e) {
      console.error('保存API密钥出错:', e);
      alert('保存API密钥失败，请重试');
    }
  });
  
  // 显示加载中
  showLoading();
  
  // 加载存储的数据
  await loadData();
  
  // 初始渲染
  await renderTabs();
  
  // 搜索功能 - 添加防抖和回车操作
  searchInput.addEventListener('input', debounce((e) => {
    applySearchFilter(e.target.value.trim());
  }, 300));
  
  // 回车键操作
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchInput.value = '';
      applySearchFilter('');
    }
  });
  
  // 新增标签页 - 打开默认的新标签页
  newTabBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://newtab' });
  });
  
  // 防抖渲染函数
  const debouncedRenderTabs = debounce(async () => {
    await renderTabs();
  }, 100);
  
  // 监听标签变化，但避免过度渲染
  chrome.tabs.onCreated.addListener(debouncedRenderTabs);
  chrome.tabs.onRemoved.addListener(debouncedRenderTabs);
  chrome.tabs.onMoved.addListener(debouncedRenderTabs);
  
  // 监听标签更新，但过滤掉仅活动状态变化的事件
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // 只有当标签的标题、URL、图标或固定状态变化时才更新
    if (changeInfo.title || changeInfo.url || changeInfo.favIconUrl || changeInfo.pinned !== undefined) {
      debouncedRenderTabs();
    }
  });
  
  // 标签激活状态变化时，使用更高效的方法只更新类名
  chrome.tabs.onActivated.addListener((activeInfo) => {
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(item => {
      const tabId = parseInt(item.dataset.tabId);
      if (tabId === activeInfo.tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  });
  
  // 设置拖动相关事件
  setupDragAndDrop();
});

// 辅助函数：获取主机名
function getHostname(url) {
  try {
    if (!url) return '';
    return new URL(url).hostname;
  } catch (e) {
    return url;
  }
}

// 辅助函数：获取默认图标
function getDefaultIcon(url) {
  try {
    if (!url) return getFallbackIcon();
    const hostname = new URL(url).hostname;
    return 'https://www.google.com/s2/favicons?domain=' + hostname;
  } catch (e) {
    return getFallbackIcon();
  }
}

// 辅助函数：获取备选图标（SVG）
function getFallbackIcon() {
  return 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23f0f0f0" rx="2"/><path d="M3 4h10v8H3z" fill="%234285F4" opacity="0.8"/><path d="M6 6h4v4H6z" fill="white"/></svg>';
}

// 保存数据到Chrome存储
function saveData() {
  chrome.storage.local.set({ 'tabData': tabData });
}

// 从Chrome存储加载数据
function loadData() {
  return new Promise((resolve) => {
    chrome.storage.local.get('tabData', (result) => {
      if (result.tabData) {
        tabData = result.tabData;
      }
      resolve();
    });
  });
}

// 编辑标签标题
function editTabTitle(element, tabId) {
  const originalText = element.textContent;
  
  // 创建输入框
  const input = document.createElement('input');
  input.type = 'text';
  input.value = originalText;
  input.className = 'tab-title-edit';
  input.style.width = `${Math.max(element.offsetWidth, 100)}px`;
  
  // 替换元素
  element.parentNode.replaceChild(input, element);
  
  // 聚焦输入框并选择全部文本
  input.focus();
  input.select();
  
  function finishEditing(save = true) {
    if (save && input.value.trim()) {
      // 保存自定义标题
      if (!tabData[tabId]) {
        tabData[tabId] = {};
      }
      tabData[tabId].customTitle = input.value.trim();
      saveData();
      
      // 更新显示
      element.textContent = input.value.trim();
    } else {
      element.textContent = originalText;
    }
    
    input.parentNode.replaceChild(element, input);
  }
  
  // 监听事件
  input.addEventListener('blur', () => finishEditing());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishEditing();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finishEditing(false);
    }
  });
}

// 创建标签元素
async function createTabElement(tab, index, isPinned = false) {
  const tabItem = document.createElement('div');
  tabItem.className = `tab-item ${isPinned ? 'pinned-tab' : ''} ${tab.active ? 'active' : ''}`;
  tabItem.dataset.tabId = tab.id;
  tabItem.draggable = true;
  
  // 标签序号
  const tabIndex = document.createElement('span');
  tabIndex.className = 'tab-index';
  tabIndex.textContent = index;
  tabItem.appendChild(tabIndex);
  
  // 标签图标设置
  const tabIcon = document.createElement('img');
  tabIcon.className = 'tab-icon';
  
  try {
    if (tab.favIconUrl) {
      tabIcon.src = tab.favIconUrl;
      tabIcon.onerror = function() {
        this.src = getDefaultIcon(tab.url);
        this.onerror = null;
      };
    } else {
      tabIcon.src = getDefaultIcon(tab.url);
      tabIcon.onerror = function() {
        this.src = getFallbackIcon();
        this.onerror = null;
      };
    }
  } catch (e) {
    tabIcon.src = getFallbackIcon();
  }
  
  tabItem.appendChild(tabIcon);
  
  // 标签内容容器
  const tabContent = document.createElement('div');
  tabContent.className = 'tab-content';
  tabItem.appendChild(tabContent);
  
  // 标题容器
  const tabTitleContainer = document.createElement('div');
  tabTitleContainer.className = 'tab-title-container';
  tabContent.appendChild(tabTitleContainer);
  
  // 标签标题
  const tabTitle = document.createElement('span');
  tabTitle.className = 'tab-title';
  const displayTitle = tabData[tab.id]?.customTitle || tab.title || '新标签页';
  
  // 处理标题总结
  let finalTitle = displayTitle;
  if (!tabData[tab.id]?.customTitle) {
    finalTitle = await summarizeTitleWithKimi(displayTitle);
    if (finalTitle !== displayTitle) {
      tabTitle.title = displayTitle;
    }
  }
  
  tabTitle.textContent = finalTitle;
  tabTitleContainer.appendChild(tabTitle);
  
  // 双击编辑标题
  tabTitle.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    editTabTitle(tabTitle, tab.id);
  });
  
  // 编辑按钮
  const editBtn = document.createElement('button');
  editBtn.className = 'edit-btn';
  editBtn.title = '编辑标题';
  editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>`;
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    editTabTitle(tabTitle, tab.id);
  });
  tabTitleContainer.appendChild(editBtn);
  
  // 固定按钮
  const pinBtn = document.createElement('button');
  pinBtn.className = 'pin-btn';
  pinBtn.title = isPinned ? '取消固定' : '固定';
  
  // 设置固定图标
  const lockIcon = isPinned ?
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>` :
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>`;
  
  pinBtn.innerHTML = lockIcon;
  pinBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    chrome.tabs.get(tab.id, (currentTab) => {
      if (currentTab) {
        chrome.tabs.update(tab.id, { pinned: !currentTab.pinned });
      }
    });
  });
  tabTitleContainer.appendChild(pinBtn);
  
  // 关闭按钮
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.title = '关闭标签页';
  closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="9" y1="9" x2="15" y2="15"></line>
    <line x1="15" y1="9" x2="9" y2="15"></line>
  </svg>`;
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    chrome.tabs.remove(tab.id);
    // 清理存储的数据
    if (tabData[tab.id]) {
      delete tabData[tab.id];
      saveData();
    }
  });
  tabTitleContainer.appendChild(closeBtn);
  
  // 标签URL
  const tabUrl = document.createElement('span');
  tabUrl.className = 'tab-url';
  tabUrl.textContent = getHostname(tab.url) || '新标签页';
  tabContent.appendChild(tabUrl);
  
  // 标签点击事件
  tabItem.addEventListener('click', (e) => {
    if (!e.target.closest('button')) {
      chrome.tabs.update(tab.id, { active: true });
    }
  });
  
  // 拖动相关属性
  tabItem.dataset.index = index;
  tabItem.dataset.isPinned = isPinned;
  
  return tabItem;
}

// 更新标签元素
async function updateTabElement(element, tab, index, isPinned) {
  // 更新类名
  if (isPinned) {
    element.classList.add('pinned-tab');
  } else {
    element.classList.remove('pinned-tab');
  }
  
  if (tab.active) {
    element.classList.add('active');
  } else {
    element.classList.remove('active');
  }
  
  // 更新序号
  const tabIndex = element.querySelector('.tab-index');
  if (tabIndex) {
    tabIndex.textContent = index;
  }
  
  // 更新标题
  const tabTitle = element.querySelector('.tab-title');
  if (tabTitle) {
    const displayTitle = tabData[tab.id]?.customTitle || tab.title || '新标签页';
    
    // 处理标题总结
    let finalTitle = displayTitle;
    if (!tabData[tab.id]?.customTitle) {
      finalTitle = await summarizeTitleWithKimi(displayTitle);
      tabTitle.title = finalTitle !== displayTitle ? displayTitle : '';
    }
    
    tabTitle.textContent = finalTitle;
  }
  
  // 更新URL
  const tabUrl = element.querySelector('.tab-url');
  if (tabUrl) {
    tabUrl.textContent = getHostname(tab.url) || '新标签页';
  }
  
  // 更新图标
  const tabIcon = element.querySelector('.tab-icon');
  if (tabIcon && tab.favIconUrl && tabIcon.src !== tab.favIconUrl) {
    tabIcon.src = tab.favIconUrl;
    tabIcon.onerror = function() {
      this.src = getDefaultIcon(tab.url);
      this.onerror = null;
    };
  }
  
  // 更新固定按钮状态
  const pinBtn = element.querySelector('.pin-btn');
  if (pinBtn) {
    pinBtn.title = isPinned ? '取消固定' : '固定';
    
    // 更新固定图标
    const lockIcon = isPinned ?
      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>` :
      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>`;
    
    pinBtn.innerHTML = lockIcon;
  }
  
  // 更新拖动相关属性
  element.dataset.index = index;
  element.dataset.isPinned = isPinned;
}

// 增量渲染标签列表 - 避免闪烁
async function renderTabs() {
  if (!tabsList) {
    console.error('tabsList元素不存在');
    return;
  }
  
  if (isRendering) {
    return;
  }
  
  isRendering = true;
  
  try {
    // 获取所有标签页
    const tabs = await new Promise((resolve) => {
      chrome.tabs.query({}, resolve);
    });
    
    // 分离固定标签和普通标签
    const pinnedTabs = tabs.filter(tab => tab.pinned);
    const normalTabs = tabs.filter(tab => !tab.pinned);
    
    // 创建映射，便于查找现有元素
    const existingTabsMap = new Map();
    tabsList.querySelectorAll('.tab-item').forEach(item => {
      const tabId = parseInt(item.dataset.tabId);
      if (!isNaN(tabId)) {
        existingTabsMap.set(tabId, item);
      }
    });
    
    // 移除已删除的标签
    existingTabsMap.forEach((item, tabId) => {
      const exists = tabs.some(tab => tab.id === tabId);
      if (!exists && item.parentNode) {
        item.parentNode.removeChild(item);
      }
    });
    
    // 创建容器（如果不存在）
    let pinnedContainer = tabsList.querySelector('.custom-pinned-tabs');
    let normalContainer = tabsList.querySelector('.normal-tabs-container');
    
    if (!pinnedContainer) {
      pinnedContainer = document.createElement('div');
      pinnedContainer.className = 'custom-pinned-tabs';
      tabsList.appendChild(pinnedContainer);
    }
    
    if (!normalContainer) {
      normalContainer = document.createElement('div');
      normalContainer.className = 'normal-tabs-container';
      tabsList.appendChild(normalContainer);
    }
    
    // 更新或创建固定标签
    if (pinnedTabs.length > 0) {
      let pinnedHeader = pinnedContainer.querySelector('.pinned-header');
      if (!pinnedHeader) {
        pinnedHeader = document.createElement('div');
        pinnedHeader.className = 'pinned-header';
        pinnedHeader.textContent = '固定标签';
        pinnedContainer.appendChild(pinnedHeader);
      }
      
      for (let i = 0; i < pinnedTabs.length; i++) {
        const tab = pinnedTabs[i];
        const existingItem = existingTabsMap.get(tab.id);
        if (existingItem) {
          // 更新现有标签
          await updateTabElement(existingItem, tab, i + 1, true);
          // 确保在正确的容器中
          if (existingItem.parentNode !== pinnedContainer) {
            pinnedContainer.appendChild(existingItem);
          }
        } else {
          // 创建新标签
          const newItem = await createTabElement(tab, i + 1, true);
          pinnedContainer.appendChild(newItem);
        }
      }
    } else {
      // 清空固定标签容器
      pinnedContainer.innerHTML = '';
    }
    
    // 更新或创建普通标签
    for (let i = 0; i < normalTabs.length; i++) {
      const tab = normalTabs[i];
      const existingItem = existingTabsMap.get(tab.id);
      if (existingItem) {
        // 更新现有标签
        await updateTabElement(existingItem, tab, i + 1, false);
        // 确保在正确的容器中
        if (existingItem.parentNode !== normalContainer) {
          normalContainer.appendChild(existingItem);
        }
      } else {
        // 创建新标签
        const newItem = await createTabElement(tab, i + 1, false);
        normalContainer.appendChild(newItem);
      }
    }
    
    // 隐藏加载状态
    hideLoading();
    
  } catch (error) {
    console.error('渲染标签时出错:', error);
    showError('加载标签失败，请刷新侧边栏');
    hideLoading();
  } finally {
    isRendering = false;
  }
}

// 显示加载状态
function showLoading() {
  if (loadingIndicator) {
    loadingIndicator.style.display = 'block';
  }
}

// 隐藏加载状态
function hideLoading() {
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
}

// 显示错误消息
function showError(message) {
  const errorElement = document.createElement('div');
  errorElement.className = 'error-message';
  errorElement.textContent = message;
  
  // 清空容器并显示错误
  tabsList.innerHTML = '';
  tabsList.appendChild(errorElement);
}

// 应用搜索过滤
function applySearchFilter(query) {
  const tabItems = document.querySelectorAll('.tab-item');
  const lowercaseQuery = query.toLowerCase();
  let visibleCount = 0;
  
  tabItems.forEach(item => {
    // 简化判断逻辑
    const tabTitle = item.querySelector('.tab-title').textContent.toLowerCase();
    const tabUrl = item.querySelector('.tab-url').textContent.toLowerCase();
    const isMatch = !query.trim() || tabTitle.includes(lowercaseQuery) || tabUrl.includes(lowercaseQuery);
    
    item.style.display = isMatch ? 'flex' : 'none';
    if (isMatch) visibleCount++;
  });
  
  // 更新空结果提示
  updateEmptyResultsMessage(visibleCount === 0 && query.trim() !== '');
}

// 更新空结果提示
function updateEmptyResultsMessage(isEmpty) {
  let emptyMessage = tabsList.querySelector('.empty-results');
  
  if (isEmpty) {
    if (!emptyMessage) {
      emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-results';
      emptyMessage.textContent = '没有找到匹配的标签';
      tabsList.appendChild(emptyMessage);
    }
    emptyMessage.style.display = 'block';
  } else if (emptyMessage) {
    emptyMessage.style.display = 'none';
  }
}

// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 设置拖动相关事件
function setupDragAndDrop() {
  let draggedItem = null;
  let currentDropTarget = null;
  
  tabsList.addEventListener('dragstart', (e) => {
    const tabItem = e.target.closest('.tab-item');
    if (tabItem) {
      draggedItem = tabItem;
      tabItem.classList.add('dragging');
      e.dataTransfer.setData('text/plain', tabItem.dataset.tabId);
      e.dataTransfer.effectAllowed = 'move';
    }
  });
  
  tabsList.addEventListener('dragend', () => {
    if (draggedItem) {
      draggedItem.classList.remove('dragging');
    }
    draggedItem = null;
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    currentDropTarget = null;
  });
  
  tabsList.addEventListener('dragover', (e) => {
    e.preventDefault();
    const tabItem = e.target.closest('.tab-item');
    
    if (tabItem && tabItem !== draggedItem && tabItem !== currentDropTarget) {
      if (currentDropTarget) {
        currentDropTarget.classList.remove('drag-over');
      }
      
      currentDropTarget = tabItem;
      tabItem.classList.add('drag-over');
      
      const bounding = tabItem.getBoundingClientRect();
      const offset = bounding.y + (bounding.height / 2);
      
      if (e.clientY < offset) {
        tabItem.parentNode.insertBefore(draggedItem, tabItem);
      } else {
        tabItem.parentNode.insertBefore(draggedItem, tabItem.nextSibling);
      }
    }
  });
  
  tabsList.addEventListener('dragleave', (e) => {
    const tabItem = e.target.closest('.tab-item');
    if (tabItem && tabItem === currentDropTarget) {
      tabItem.classList.remove('drag-over');
      currentDropTarget = null;
    }
  });
  
  tabsList.addEventListener('drop', (e) => {
    e.preventDefault();
    const tabItem = e.target.closest('.tab-item');
    
    if (tabItem && draggedItem) {
      tabItem.classList.remove('drag-over');
      updateTabIndices();
      reorderTabs();
    }
    
    currentDropTarget = null;
  });
}

// 更新标签序号
function updateTabIndices() {
  // 更新固定标签的序号
  const pinnedTabs = document.querySelectorAll('.custom-pinned-tabs .tab-item');
  pinnedTabs.forEach((tab, index) => {
    const indexElement = tab.querySelector('.tab-index');
    if (indexElement) {
      indexElement.textContent = index + 1;
    }
    tab.dataset.index = index + 1;
  });
  
  // 更新普通标签的序号
  const normalTabs = document.querySelectorAll('.normal-tabs-container .tab-item');
  normalTabs.forEach((tab, index) => {
    const indexElement = tab.querySelector('.tab-index');
    if (indexElement) {
      indexElement.textContent = index + 1;
    }
    tab.dataset.index = index + 1;
  });
}

// 获取保存的API密钥
async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['kimiApiKey'], (result) => {
      resolve(result.kimiApiKey);
    });
  });
}

// 保存API密钥
async function saveApiKey(key) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ kimiApiKey: key }, () => {
      resolve();
    });
  });
}

// 使用Kimi API总结标题
async function summarizeTitleWithKimi(title) {
  // 检查缓存
  if (summarizedTitles.has(title)) {
    return summarizedTitles.get(title);
  }
  
  // 如果标题已经很短，直接返回
  if (title.length <= 20) {
    summarizedTitles.set(title, title);
    return title;
  }
  
  try {
    // 获取保存的API密钥
    const apiKey = await getApiKey();
    
    if (!apiKey) {
      // 如果没有API密钥，返回原标题
      return title;
    }
    
    // 调用Kimi API
    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [
          {
            role: 'system',
            content: '你是一个标题总结助手。请将输入的标题精简为20字以内，保留核心信息，不要添加任何额外说明。'
          },
          {
            role: 'user',
            content: `请将以下标题精简为20字以内:\n${title}`
          }
        ],
        max_tokens: 50
      })
    });
    
    if (!response.ok) {
      return title;
    }
    
    const data = await response.json();
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      const summarized = data.choices[0].message.content.trim();
      summarizedTitles.set(title, summarized);
      return summarized;
    } else {
      return title;
    }
  } catch (error) {
    console.error('Kimi API调用异常:', error);
    return title; // 错误时返回原标题
  }
}

// 重新排列浏览器标签
function reorderTabs() {
  // 获取当前固定和普通标签的顺序
  const pinnedTabElements = Array.from(document.querySelectorAll('.custom-pinned-tabs .tab-item'));
  const normalTabElements = Array.from(document.querySelectorAll('.normal-tabs-container .tab-item'));
  
  // 创建新的标签顺序数组
  const newOrder = [...pinnedTabElements, ...normalTabElements].map(el => parseInt(el.dataset.tabId));
  
  // 使用Chrome API重新排列标签
  chrome.tabs.query({}, (tabs) => {
    // 为每个标签找到新的位置
    newOrder.forEach((tabId, newIndex) => {
      // 查找标签的当前位置
      const currentTab = tabs.find(tab => tab.id === tabId);
      if (currentTab && currentTab.index !== newIndex) {
        chrome.tabs.move(tabId, { index: newIndex });
      }
    });
  });
}
