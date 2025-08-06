// 弹出窗口脚本
document.addEventListener("DOMContentLoaded", function () {
  // 获取当前标签页
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0];

    // 绑定快速操作按钮事件
    bindQuickActions(currentTab);

    // 绑定设置开关事件
    bindSettings(currentTab);

    // 绑定链接事件
    bindLinks();

    // 加载设置状态
    loadSettings();
  });
});

// 通知工具类
class NotificationUtil {
  static show(message, type = "info") {
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-family: 'Microsoft YaHei', sans-serif;
      font-size: 14px;
      z-index: 1000001;
      max-width: 300px;
      word-wrap: break-word;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
    `;
    const colors = {
      success: "#4caf50",
      error: "#f44336",
      warning: "#ff9800",
      info: "#2196f3",
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

// 绑定快速操作按钮
function bindQuickActions(tab) {
  // 切换悬浮按钮
  document
    .getElementById("toggle-float-btn")
    .addEventListener("click", function () {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: toggleFloatButton,
      });
    });

  // 快速截图
  document
    .getElementById("take-screenshot")
    .addEventListener("click", function () {
      // 截图
      chrome.tabs.captureVisibleTab(
        null,
        { format: "png" },
        function (dataUrl) {
          if (chrome.runtime.lastError) {
            // NotificationUtil.show('截图失败: ' + chrome.runtime.lastError.message, 'error');
            return;
          }

          // 创建下载链接
          const link = document.createElement("a");
          link.download = `screenshot_${new Date()
            .toISOString()
            .slice(0, 19)
            .replace(/:/g, "-")}.png`;
          link.href = dataUrl;
          link.click();

          // NotificationUtil.show('截图已保存', 'success');
        }
      );
    });

  // 移除广告
  document.getElementById("remove-ads").addEventListener("click", function () {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: removeAdsQuick,
    });
  });

  // 提取正文
  document
    .getElementById("extract-content")
    .addEventListener("click", function () {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractContentQuick,
      });
    });
}

// 绑定设置开关
function bindSettings(tab) {
  // const toggles = ['auto-hide-toggle', 'dark-mode-toggle', 'dev-mode-toggle'];
  const toggles = ["auto-hide-toggle", "dark-mode-toggle"];

  toggles.forEach((toggleId) => {
    const toggle = document.getElementById(toggleId);
    toggle.addEventListener("click", function () {
      toggle.classList.toggle("active");
      saveSetting(toggleId, toggle.classList.contains("active"));

      // 应用设置到当前页面
      applySetting(tab, toggleId, toggle.classList.contains("active"));
    });
  });
}

// 绑定链接事件
function bindLinks() {
  document.getElementById("help-link").addEventListener("click", function (e) {
    e.preventDefault();
    chrome.tabs.create({
      url: "https://github.com/silkcarlliu/browser-simple-tool-extension",
    });
  });

  document
    .getElementById("feedback-link")
    .addEventListener("click", function (e) {
      e.preventDefault();
      chrome.tabs.create({
        url: "https://github.com/silkcarlliu/browser-simple-tool-extension/issues",
      });
    });

  document.getElementById("about-link").addEventListener("click", function (e) {
    e.preventDefault();
    showAboutDialog();
  });
}

// 加载设置
function loadSettings() {
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(
      ["auto-hide-toggle", "dark-mode-toggle", "dev-mode-toggle"],
      function (result) {
        if (result["auto-hide-toggle"]) {
          document.getElementById("auto-hide-toggle").classList.add("active");
        }
        if (result["dark-mode-toggle"]) {
          document.getElementById("dark-mode-toggle").classList.add("active");
        }
        if (result["dev-mode-toggle"]) {
          document.getElementById("dev-mode-toggle").classList.add("active");
        }
      }
    );
  }
}

// 保存设置
function saveSetting(key, value) {
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.set({ [key]: value });
  }
}

// 应用设置到页面
function applySetting(tab, settingKey, value) {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: applyPageSetting,
    args: [settingKey, value],
  });
}

// 显示关于对话框
function showAboutDialog() {
  const dialog = document.createElement("div");
  dialog.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;

  dialog.innerHTML = `
    <div style="
      background: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 400px;
      text-align: center;
      color: #333;
    ">
      <h2 style="margin-bottom: 15px; color: #667eea;">页面工具合集</h2>
      <p style="margin-bottom: 10px;">版本: 2.0.0</p>
      <p style="margin-bottom: 15px; font-size: 14px; line-height: 1.5;">
        一个功能强大的浏览器扩展，提供多种页面操作工具，包括截图、下载、样式调整、开发者工具等功能。
      </p>
      <button id="close-about" style="
        background: #667eea;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
      ">关闭</button>
    </div>
  `;

  document.body.appendChild(dialog);

  document.getElementById("close-about").addEventListener("click", function () {
    document.body.removeChild(dialog);
  });

  dialog.addEventListener("click", function (e) {
    if (e.target === dialog) {
      document.body.removeChild(dialog);
    }
  });
}

// 注入到页面的函数

// 切换悬浮按钮
function toggleFloatButton() {
  const floatBtn = document.getElementById("maybe-page-tools-float-btn");
  if (floatBtn) {
    floatBtn.style.display =
      floatBtn.style.display === "none" ? "flex" : "none";
  }
}

// 快速移除广告
function removeAdsQuick() {
  const adClasses = [
    "ad",
    "ads",
    "advertisement",
    "banner",
    "sponsor",
    "popup",
    "ad-container",
  ];
  let removedCount = 0;

  adClasses.forEach((className) => {
    const elements = document.querySelectorAll(`[class*="${className}"]`);
    elements.forEach((el) => {
      el.remove();
      removedCount++;
    });
  });

  const adIframes = document.querySelectorAll(
    'iframe[src*="ad"], iframe[src*="ads"]'
  );
  adIframes.forEach((iframe) => {
    iframe.remove();
    removedCount++;
  });

  // NotificationUtil.show(`已移除 ${removedCount} 个广告元素`, 'success');
}

// 快速提取正文
function extractContentQuick() {
  const mainSelectors = [
    "main",
    "article",
    "section",
    "[role=main]",
    ".content",
    ".post-content",
  ];
  let mainContent = null;

  for (const selector of mainSelectors) {
    mainContent = document.querySelector(selector);
    if (mainContent) break;
  }

  if (mainContent) {
    if (!window.originalPageContent) {
      window.originalPageContent = document.body.innerHTML;
    }
    document.body.innerHTML = mainContent.outerHTML;
    // NotificationUtil.show('已提取页面正文', 'success');
  } else {
    // NotificationUtil.show('未找到主要内容区域', 'warning');
  }
}

// 应用页面设置
function applyPageSetting(settingKey, value) {
  switch (settingKey) {
    case "auto-hide-toggle":
      if (value) {
        document.getElementById("maybe-page-tools-float-btn").style.display =
          "none";
      } else {
        document.getElementById("maybe-page-tools-float-btn").style.display =
          "flex";
      }
      break;

    case "dark-mode-toggle":
      if (value) {
        document.documentElement.style.filter = "invert(1) hue-rotate(180deg)";
      } else {
        document.documentElement.style.filter = "";
      }
      break;
  }
}
