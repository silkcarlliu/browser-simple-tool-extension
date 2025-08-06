(function () {
  "use strict";

  // 防止重复注入
  if (window.pageToolsInjected) return;
  window.pageToolsInjected = true;

  // 配置常量
  const CONFIG = {
    SELECTORS: {
      FLOAT_BTN: "#maybe-page-tools-float-btn",
      POPUP: "#maybe-page-tools-popup",
      PROGRESS: "#maybe-page-tools-progress",
    },
    AD_CLASSES: [
      "ad",
      "ads",
      "advertisement",
      // "banner",
      "sponsor",
      // "popup",
      "ad-container",
    ],
    MAIN_CONTENT_SELECTORS: [
      "main",
      "article",
      "section",
      "[role=main]",
      ".content",
      ".post-content",
    ],
    EXTERNAL_LIBS: {
      JSZIP: "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.0/jszip.min.js",
    },
  };

  // 工具类
  class Utils {
    static async loadScript(src) {
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    static async fetchWithRetry(url, retries = 3) {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return await response.blob();
        } catch (error) {
          if (attempt === retries - 1) throw error;
          await new Promise((resolve) =>
            setTimeout(resolve, 500 * (attempt + 1))
          );
        }
      }
    }

    static getFileExtension(url) {
      const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
      return match ? match[1].toLowerCase() : "jpg";
    }

    static showNotification(message, type = "info") {
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
        setTimeout(() => document.body.removeChild(notification), 300);
      }, 3000);
    }

    static debounce(func, wait) {
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
  }

  // UI管理器
  class UIManager {
    constructor() {
      this.floatBtn = null;
      this.popup = null;
      this.progress = null;
      this.isPopupVisible = false;
      this.init();
    }

    init() {
      this.createFloatButton();
      this.createPopup();
      this.bindEvents();
    }

    createFloatButton() {
      this.floatBtn = document.createElement("div");
      this.floatBtn.id = "maybe-page-tools-float-btn";
      this.floatBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
        </svg>
      `;
      document.body.appendChild(this.floatBtn);
    }

    createPopup() {
      this.popup = document.createElement("div");
      this.popup.id = "maybe-page-tools-popup";
      this.popup.style.display = "none";

      this.progress = document.createElement("div");
      this.progress.id = "maybe-page-tools-progress";

      this.popup.appendChild(this.progress);
      document.body.appendChild(this.popup);
    }

    bindEvents() {
      this.floatBtn.addEventListener("click", () => this.togglePopup());

      // 点击外部关闭弹窗
      document.addEventListener("click", (e) => {
        if (
          !this.popup.contains(e.target) &&
          !this.floatBtn.contains(e.target)
        ) {
          this.hidePopup();
        }
      });

      // ESC键关闭弹窗
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.hidePopup();
        }
      });
    }

    togglePopup() {
      if (this.isPopupVisible) {
        this.hidePopup();
      } else {
        this.showPopup();
      }
    }

    showPopup() {
      this.popup.style.display = "flex";
      this.popup.style.flexDirection = "column";
      this.isPopupVisible = true;
    }

    hidePopup() {
      this.popup.style.display = "none";
      this.progress.textContent = "";
      this.isPopupVisible = false;
    }

    updateProgress(message) {
      this.progress.textContent = message;
    }

    addButton(text, onClick) {
      const button = document.createElement("button");
      button.textContent = text;
      button.addEventListener("click", onClick);
      this.popup.appendChild(button);
    }

    clearButtons() {
      const buttons = this.popup.querySelectorAll("button");
      buttons.forEach((btn) => btn.remove());
    }
  }

  // 功能管理器
  class FeatureManager {
    constructor(uiManager) {
      this.ui = uiManager;
      this.hoverTip = null;
      this.initFeatures();
    }

    initFeatures() {
      const features = [
        { name: "🔗 高亮链接", fn: () => this.highlightLinks() },
        { name: "📸 页面截图", fn: () => this.takeScreenshot() },
        { name: "🖼️ 图片链接", fn: () => this.showImageLinks() },
        { name: "🚫 移除广告", fn: () => this.removeAds() },
        { name: "🗑️ 删除元素", fn: () => this.enableElementDeletion() },
        { name: "🔍 元素检查", fn: () => this.toggleElementInspector() },
        { name: "📄 提取正文", fn: () => this.extractMainContent() },
        { name: "💾 下载图片", fn: () => this.batchDownloadImages() },
        { name: "📦 打包下载", fn: () => this.downloadContainerImages() },
        { name: "🎨 样式调整", fn: () => this.adjustPageStyles() },
        { name: "📊 页面统计", fn: () => this.showPageStats() },
        { name: "🔧 开发者工具", fn: () => this.showDeveloperTools() },
      ];

      features.forEach(({ name, fn }) => {
        this.ui.addButton(name, fn);
      });
    }

    async highlightLinks() {
      try {
        const links = Array.from(document.getElementsByTagName("a"));
        links.forEach((link) => {
          link.style.backgroundColor = "#ffff00";
          link.style.border = "2px dashed #0066cc";
          link.style.padding = "2px";
        });
        Utils.showNotification(`已高亮 ${links.length} 个链接`, "success");
      } catch (error) {
        Utils.showNotification("高亮链接时出错: " + error.message, "error");
      }
    }

    async takeScreenshot() {
      try {
        // 截图前隐藏悬浮窗
        const floatBtn = document.getElementById("maybe-page-tools-float-btn");
        const popup = document.getElementById("maybe-page-tools-popup");
        const floatBtnDisplay = floatBtn ? floatBtn.style.display : null;
        const popupDisplay = popup ? popup.style.display : null;
        if (floatBtn) floatBtn.style.display = "none";
        if (popup) popup.style.display = "none";

        this.ui.updateProgress("正在生成截图...");
        
        // 使用Chrome的原生截图API
        chrome.runtime.sendMessage({
          action: 'takeScreenshot'
        }, (response) => {
          // 截图后恢复悬浮窗
          if (floatBtn) floatBtn.style.display = floatBtnDisplay;
          if (popup) popup.style.display = popupDisplay;

          if (response && response.success) {
            // 创建下载链接
            const link = document.createElement("a");
            link.download = `screenshot_${new Date()
              .toISOString()
              .slice(0, 19)
              .replace(/:/g, "-")}.png`;
            link.href = response.dataUrl;
            link.click();
            
            this.ui.updateProgress("截图完成！");
            Utils.showNotification("截图已保存", "success");
            
            setTimeout(() => this.ui.updateProgress(""), 2000);
          } else {
            this.ui.updateProgress("截图失败");
            Utils.showNotification("截图失败: " + (response?.error || "未知错误"), "error");
          }
        });
      } catch (error) {
        // 截图异常时也恢复悬浮窗
        const floatBtn = document.getElementById("maybe-page-tools-float-btn");
        const popup = document.getElementById("maybe-page-tools-popup");
        if (floatBtn) floatBtn.style.display = "";
        if (popup) popup.style.display = "";
        this.ui.updateProgress("截图失败");
        Utils.showNotification("截图失败: " + error.message, "error");
      }
    }

    showImageLinks() {
      try {
        const images = Array.from(document.images).filter((img) => img.src);
        const imageUrls = images.map((img) => img.src).join("\n");

        if (imageUrls) {
          const textarea = document.createElement("textarea");
          textarea.value = imageUrls;
          textarea.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80%;
            height: 60%;
            z-index: 1000002;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
          `;
          document.body.appendChild(textarea);
          textarea.select();

          const closeBtn = document.createElement("button");
          closeBtn.textContent = "关闭";
          closeBtn.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000003;
            padding: 8px 16px;
            background: #f44336;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          `;
          closeBtn.onclick = () => {
            document.body.removeChild(textarea);
            document.body.removeChild(closeBtn);
          };
          document.body.appendChild(closeBtn);
        } else {
          Utils.showNotification("未找到图片", "warning");
        }
      } catch (error) {
        Utils.showNotification("获取图片链接失败: " + error.message, "error");
      }
    }

    removeAds() {
      try {
        let removedCount = 0;

        CONFIG.AD_CLASSES.forEach((className) => {
          const elements = document.querySelectorAll(`[class*="${className}"]`);
          elements.forEach((el) => {
            el.remove();
            removedCount++;
          });
        });

        // 移除常见的广告iframe
        const adIframes = document.querySelectorAll(
          'iframe[src*="ad"], iframe[src*="ads"]'
        );
        adIframes.forEach((iframe) => {
          iframe.remove();
          removedCount++;
        });

        Utils.showNotification(`已移除 ${removedCount} 个广告元素`, "success");
      } catch (error) {
        Utils.showNotification("移除广告时出错: " + error.message, "error");
      }
    }

    enableElementDeletion() {
      try {
        Utils.showNotification("点击要删除的元素，按ESC取消", "info");

        const handleClick = (e) => {
          e.preventDefault();
          e.stopPropagation();

          if (
            e.target === document.body ||
            e.target === document.documentElement
          )
            return;

          e.target.style.outline = "2px solid red";
          e.target.style.backgroundColor = "rgba(255, 0, 0, 0.1)";

          if (confirm("确定要删除这个元素吗？")) {
            e.target.remove();
            Utils.showNotification("元素已删除", "success");
          } else {
            e.target.style.outline = "";
            e.target.style.backgroundColor = "";
          }

          document.removeEventListener("click", handleClick, true);
        };

        const handleKeydown = (e) => {
          if (e.key === "Escape") {
            document.removeEventListener("click", handleClick, true);
            document.removeEventListener("keydown", handleKeydown);
            Utils.showNotification("已取消删除模式", "info");
          }
        };

        document.addEventListener("click", handleClick, true);
        document.addEventListener("keydown", handleKeydown);
      } catch (error) {
        Utils.showNotification("启用删除模式失败: " + error.message, "error");
      }
    }

    toggleElementInspector() {
      try {
        if (this.hoverTip) {
          this.disableElementInspector();
          return;
        }

        const tip = document.createElement("div");
        tip.style.cssText = `
          position: fixed;
          z-index: 1000000;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          font: 12px monospace;
          border-radius: 4px;
          pointer-events: none;
          max-width: 300px;
          word-wrap: break-word;
        `;
        document.body.appendChild(tip);

        const onMouseMove = Utils.debounce((e) => {
          const element = document.elementFromPoint(e.clientX, e.clientY);
          if (element && element !== tip) {
            const tagName = element.tagName.toLowerCase();
            const className = element.className
              ? "." + element.className.replace(/\s+/g, ".")
              : "";
            const id = element.id ? "#" + element.id : "";
            const text = `${tagName}${id}${className}`;

            tip.textContent = text;
            tip.style.left = e.pageX + 10 + "px";
            tip.style.top = e.pageY + 10 + "px";
            tip.style.display = "block";
          }
        }, 50);

        document.addEventListener("mousemove", onMouseMove);
        this.hoverTip = { tip, onMouseMove };

        Utils.showNotification(
          "元素检查器已启用，鼠标悬停查看元素信息",
          "success"
        );
      } catch (error) {
        Utils.showNotification("启用元素检查器失败: " + error.message, "error");
      }
    }

    disableElementInspector() {
      if (this.hoverTip) {
        document.removeEventListener("mousemove", this.hoverTip.onMouseMove);
        document.body.removeChild(this.hoverTip.tip);
        this.hoverTip = null;
        Utils.showNotification("元素检查器已禁用", "info");
      }
    }

    extractMainContent() {
      try {
        let mainContent = null;

        for (const selector of CONFIG.MAIN_CONTENT_SELECTORS) {
          mainContent = document.querySelector(selector);
          if (mainContent) break;
        }

        if (mainContent) {
          // 保存原始页面
          if (!window.originalPageContent) {
            window.originalPageContent = document.body.innerHTML;
          }

          document.body.innerHTML = mainContent.outerHTML;
          Utils.showNotification("已提取页面正文", "success");
        } else {
          Utils.showNotification("未找到主要内容区域", "warning");
        }
      } catch (error) {
        Utils.showNotification("提取正文失败: " + error.message, "error");
      }
    }

    async batchDownloadImages() {
      try {
        const images = Array.from(document.images).filter((img) => img.src);

        if (images.length === 0) {
          Utils.showNotification("未找到图片", "warning");
          return;
        }

        this.ui.updateProgress(`准备下载 ${images.length} 张图片...`);

        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          this.ui.updateProgress(`下载第 ${i + 1}/${images.length} 张图片...`);

          try {
            const link = document.createElement("a");
            link.href = img.src;
            const ext = Utils.getFileExtension(img.src);
            link.download = `image_${i + 1}.${ext}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // 避免浏览器阻止多个下载
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`下载图片失败: ${img.src}`, error);
          }
        }

        this.ui.updateProgress("下载完成！");
        Utils.showNotification(`已触发 ${images.length} 张图片下载`, "success");

        setTimeout(() => this.ui.updateProgress(""), 3000);
      } catch (error) {
        this.ui.updateProgress("批量下载失败");
        Utils.showNotification("批量下载失败: " + error.message, "error");
      }
    }

    async downloadContainerImages() {
      try {
        this.ui.updateProgress("正在加载打包工具...");

        if (!window.JSZip) {
          await Utils.loadScript(CONFIG.EXTERNAL_LIBS.JSZIP);
        }

        const input = prompt(
          "请输入选择器和文件夹名称，格式：.class1=图一,#id2=图二，多个用英文逗号分隔"
        );

        if (!input) return;

        const pairs = input
          .split(",")
          .map((s) => s.trim())
          .map((str) => {
            const [selector, name] = str.split("=").map((s) => s.trim());
            return {
              selector,
              name: name || selector.replace(/[#\.]/g, "_"),
            };
          });

        const zip = new JSZip();
        const folder = zip.folder("downloaded_media");
        let totalImages = 0;

        for (const { selector, name } of pairs) {
          const container = document.querySelector(selector);
          if (!container) continue;

          const images = Array.from(container.querySelectorAll("img")).filter(
            (img) => img.src
          );
          const subFolder = folder.folder(name);

          for (let i = 0; i < images.length; i++) {
            const img = images[i];
            this.ui.updateProgress(
              `下载 ${name} 第 ${i + 1}/${images.length} 张...`
            );

            try {
              const blob = await Utils.fetchWithRetry(img.src);
              const ext = Utils.getFileExtension(img.src);
              const arrayBuffer = await blob.arrayBuffer();
              subFolder.file(`img_${i + 1}.${ext}`, arrayBuffer);
              totalImages++;
            } catch (error) {
              console.error(`下载失败：${img.src}`, error);
            }
          }
        }

        this.ui.updateProgress("正在打包ZIP...");
        const content = await zip.generateAsync({ type: "blob" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = `media_${new Date().toISOString().slice(0, 10)}.zip`;
        link.click();

        this.ui.updateProgress(`打包完成！共 ${totalImages} 张图片`);
        Utils.showNotification(
          `ZIP打包完成，包含 ${totalImages} 张图片`,
          "success"
        );

        setTimeout(() => this.ui.updateProgress(""), 3000);
      } catch (error) {
        this.ui.updateProgress("打包下载失败");
        Utils.showNotification("打包下载失败: " + error.message, "error");
      }
    }

    adjustPageStyles() {
      try {
        const style = document.createElement("style");
        style.id = "page-tools-style-adjustments";
        style.textContent = `
          body { font-size: 16px !important; line-height: 1.6 !important; }
          p, div { max-width: 800px !important; margin: 0 auto !important; }
          img { max-width: 100% !important; height: auto !important; }
          * { font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif !important; }
        `;

        if (document.getElementById("page-tools-style-adjustments")) {
          document.getElementById("page-tools-style-adjustments").remove();
          Utils.showNotification("已恢复原始样式", "info");
        } else {
          document.head.appendChild(style);
          Utils.showNotification("已应用阅读优化样式", "success");
        }
      } catch (error) {
        Utils.showNotification("样式调整失败: " + error.message, "error");
      }
    }

    showPageStats() {
      try {
        const stats = {
          links: document.getElementsByTagName("a").length,
          images: document.images.length,
          forms: document.forms.length,
          scripts: document.scripts.length,
          stylesheets: document.styleSheets.length,
          wordCount: document.body.innerText.trim().split(/\s+/).length,
        };

        const message = `
页面统计信息：
• 链接数量: ${stats.links}
• 图片数量: ${stats.images}
• 表单数量: ${stats.forms}
• 脚本数量: ${stats.scripts}
• 样式表数量: ${stats.stylesheets}
• 文字数量: ${stats.wordCount}
        `.trim();

        alert(message);
      } catch (error) {
        Utils.showNotification("获取页面统计失败: " + error.message, "error");
      }
    }

    showDeveloperTools() {
      try {
        const tools = [
          { name: "查看页面源码", fn: () => this.viewPageSource() },
          { name: "查看元素样式", fn: () => this.inspectElementStyles() },
          { name: "性能分析", fn: () => this.analyzePerformance() },
          { name: "网络请求", fn: () => this.showNetworkRequests() },
        ];

        const dialog = document.createElement("div");
        dialog.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border: 1px solid #ccc;
          border-radius: 8px;
          padding: 20px;
          z-index: 1000004;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          max-width: 400px;
          width: 90%;
        `;

        dialog.innerHTML = `
          <h3 style="margin: 0 0 15px 0; color: #333;">开发者工具</h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${tools
              .map(
                (tool) => `
              <button style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; background: #f8f9fa; cursor: pointer;">
                ${tool.name}
              </button>
            `
              )
              .join("")}
          </div>
          <button id="close-dev-tools" style="margin-top: 15px; padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
            关闭
          </button>
        `;

        document.body.appendChild(dialog);

        // 绑定事件
        tools.forEach((tool, index) => {
          dialog
            .querySelectorAll("button")
            [index].addEventListener("click", tool.fn);
        });

        dialog
          .querySelector("#close-dev-tools")
          .addEventListener("click", () => {
            document.body.removeChild(dialog);
          });
      } catch (error) {
        Utils.showNotification("打开开发者工具失败: " + error.message, "error");
      }
    }

    viewPageSource() {
      const source = document.documentElement.outerHTML;
      const textarea = document.createElement("textarea");
      textarea.value = source;
      textarea.style.cssText = `
        position: fixed;
        top: 10%;
        left: 10%;
        width: 80%;
        height: 80%;
        z-index: 1000005;
        font-family: monospace;
        font-size: 12px;
        padding: 10px;
        border: 1px solid #ccc;
      `;

      const closeBtn = document.createElement("button");
      closeBtn.textContent = "关闭";
      closeBtn.style.cssText = `
        position: fixed;
        top: 5%;
        right: 5%;
        z-index: 1000006;
        padding: 8px 16px;
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      `;

      closeBtn.onclick = () => {
        document.body.removeChild(textarea);
        document.body.removeChild(closeBtn);
      };

      document.body.appendChild(textarea);
      document.body.appendChild(closeBtn);
    }

    inspectElementStyles() {
      Utils.showNotification("点击元素查看样式信息", "info");

      const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const styles = window.getComputedStyle(e.target);
        const cssText = e.target.style.cssText;
        const className = e.target.className;
        const id = e.target.id;

        const info = `
元素信息：
标签: ${e.target.tagName}
ID: ${id || "无"}
类名: ${className || "无"}
内联样式: ${cssText || "无"}
计算样式: ${styles.cssText}
        `.trim();

        alert(info);
        document.removeEventListener("click", handleClick, true);
      };

      document.addEventListener("click", handleClick, true);
    }

    analyzePerformance() {
      const perfData = performance.getEntriesByType("navigation")[0];
      const timing = perfData
        ? {
            DNS查询: perfData.domainLookupEnd - perfData.domainLookupStart,
            TCP连接: perfData.connectEnd - perfData.connectStart,
            请求响应: perfData.responseEnd - perfData.requestStart,
            DOM解析:
              perfData.domContentLoadedEventEnd -
              perfData.domContentLoadedEventStart,
            页面加载: perfData.loadEventEnd - perfData.loadEventStart,
          }
        : {};

      const message = perfData
        ? `性能分析：
• DNS查询: ${timing["DNS查询"]}ms
• TCP连接: ${timing["TCP连接"]}ms
• 请求响应: ${timing["请求响应"]}ms
• DOM解析: ${timing["DOM解析"]}ms
• 页面加载: ${timing["页面加载"]}ms`
        : "无法获取性能数据";

      alert(message);
    }

    showNetworkRequests() {
      const resources = performance.getEntriesByType("resource");
      const stats = resources.reduce((acc, resource) => {
        const type = resource.initiatorType || "other";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      const message = `网络请求统计：
${Object.entries(stats)
  .map(([type, count]) => `• ${type}: ${count}个`)
  .join("\n")}
总计: ${resources.length}个请求`;

      alert(message);
    }
  }

  // 初始化应用
  const ui = new UIManager();
  const features = new FeatureManager(ui);

  // 清理函数
  window.pageToolsCleanup = () => {
    if (features.hoverTip) {
      features.disableElementInspector();
    }
    if (window.originalPageContent) {
      document.body.innerHTML = window.originalPageContent;
    }
    if (document.getElementById("page-tools-style-adjustments")) {
      document.getElementById("page-tools-style-adjustments").remove();
    }
  };

  console.log("页面工具扩展已加载");
})();
