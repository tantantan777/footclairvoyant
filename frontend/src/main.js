import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'highlight.js/styles/github.css'
import { initSocket } from './services/socket'

// 处理ResizeObserver循环错误
// 方法1: 替换原生的ResizeObserver实现
const originalResizeObserver = window.ResizeObserver;
window.ResizeObserver = class ResizeObserver extends originalResizeObserver {
  constructor(callback) {
    super((entries, observer) => {
      // 防止出现'ResizeObserver loop limit exceeded'错误
      window.requestAnimationFrame(() => {
        if (!Array.isArray(entries)) {
          return;
        }
        callback(entries, observer);
      });
    });
  }
};

// 方法2: 过滤控制台错误
const originalConsoleError = console.error;
console.error = function(msg, ...args) {
  if (typeof msg === 'string' && (
      msg.includes('ResizeObserver loop') || 
      msg.includes('ResizeObserver loop completed with undelivered notifications'))) {
    return;
  }
  originalConsoleError.apply(console, [msg, ...args]);
};

// 方法3: 阻止全局错误事件
window.addEventListener('error', (event) => {
  if (event && event.message && (
      event.message.includes('ResizeObserver loop') || 
      event.message.includes('ResizeObserver loop completed with undelivered notifications'))) {
    event.stopImmediatePropagation();
    event.preventDefault();
    return true;
  }
}, true);

// 方法4: 监听未处理的promise拒绝
window.addEventListener('unhandledrejection', (event) => {
  if (event && event.reason && event.reason.message && (
      event.reason.message.includes('ResizeObserver loop') || 
      event.reason.message.includes('ResizeObserver loop completed with undelivered notifications'))) {
    event.preventDefault();
    return true;
  }
});

const app = createApp(App)

// 使用插件
app.use(router)
app.use(ElementPlus, {
  // 设置全局配置
  config: {
    // 设置消息提示持续时间为1.5秒（默认是3秒）
    messageDuration: 1500
  }
})

// API 配置
const apiConfig = {
  // API基础URL，根据环境变量或默认值
  baseUrl: 'http://localhost:8000'
};

// 将配置提供给应用的所有组件
app.provide('apiConfig', apiConfig);

// 初始化WebSocket连接
initSocket();

// 挂载应用
app.mount('#app') 