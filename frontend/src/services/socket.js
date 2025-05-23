import { io } from 'socket.io-client';

// 创建Socket.io客户端实例
const SOCKET_URL = 'http://localhost:8000';

let socket = null;
let isConnected = false;
let listeners = {};
const MAX_RECONNECT_ATTEMPTS = 5;

// 初始化Socket连接
export const initSocket = () => {
  if (socket && isConnected) {
    console.log('Socket已连接，无需重复初始化');
    return socket;
  }
  
  console.log('初始化Socket连接...');
  
  socket = io(SOCKET_URL, {
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    timeout: 10000,
    transports: ['websocket', 'polling'],
    forceNew: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
  });
  
  // 连接成功
  socket.on('connect', () => {
    console.log('WebSocket连接成功! ID:', socket.id);
    isConnected = true;
  });
  
  // 接收欢迎消息
  socket.on('welcome', (data) => {
    console.log('收到服务器欢迎消息:', data.message);
  });
  
  // 添加match-progress监听
  socket.on('match-progress', (data) => {
    console.log('收到match-progress事件:', data);
  });
  
  // 添加matches-batch-update监听
  socket.on('matches-batch-update', (data) => {
    console.log('收到比赛批次更新事件:', data);
    console.log(`批次 ${data.batchIndex}/${data.totalBatches}，包含 ${data.matches?.length || 0} 场比赛`);
  });
  
  // 断开连接
  socket.on('disconnect', (reason) => {
    console.log('WebSocket断开连接:', reason);
    isConnected = false;
  });
  
  // 重新连接尝试
  socket.on('reconnect_attempt', (attempt) => {
    console.log(`WebSocket尝试重新连接 (${attempt}/${MAX_RECONNECT_ATTEMPTS})...`);
  });
  
  // 重新连接成功
  socket.on('reconnect', (attemptNumber) => {
    console.log(`WebSocket重新连接成功，尝试次数: ${attemptNumber}`);
    isConnected = true;
  });
  
  // 重新连接失败
  socket.on('reconnect_failed', () => {
    console.error('WebSocket重新连接失败，达到最大尝试次数');
  });
  
  // 连接错误
  socket.on('connect_error', (error) => {
    console.error('WebSocket连接错误:', error);
  });
  
  return socket;
};

// 关闭Socket连接
export const closeSocket = () => {
  if (socket) {
    console.log('关闭Socket连接...');
    socket.disconnect();
    socket = null;
    isConnected = false;
  }
};

// 添加事件监听
export const onEvent = (event, callback) => {
  if (!socket) {
    console.error('Socket未初始化，无法添加事件监听');
    return;
  }
  
  // 先移除现有的相同事件监听器，防止重复添加
  offEvent(event);
  
  // 保存回调函数，以便后续可以移除
  if (!listeners[event]) {
    listeners[event] = [];
  }
  listeners[event].push(callback);
  
  // 添加事件监听
  socket.on(event, callback);
  console.log(`已添加Socket事件监听: ${event}`);
};

// 移除事件监听
export const offEvent = (event, callback) => {
  if (!socket) {
    return;
  }
  
  if (callback && listeners[event]) {
    // 移除特定回调
    socket.off(event, callback);
    listeners[event] = listeners[event].filter(cb => cb !== callback);
    console.log(`已移除Socket事件监听: ${event}`);
  } else if (!callback && listeners[event]) {
    // 移除所有回调
    listeners[event].forEach(cb => {
      socket.off(event, cb);
    });
    listeners[event] = [];
    console.log(`已移除Socket事件 ${event} 的所有监听`);
  }
};

// 发送事件
export const emitEvent = (event, data) => {
  if (!socket || !isConnected) {
    console.error('Socket未连接，无法发送事件');
    return false;
  }
  
  socket.emit(event, data);
  console.log(`已发送Socket事件: ${event}`, data);
  return true;
};

// 检查连接状态
export const isSocketConnected = () => {
  return isConnected && socket && socket.connected;
};

// 重新连接
export const reconnect = () => {
  if (socket) {
    socket.connect();
    return true;
  }
  return false;
};

// 默认导出
export default {
  initSocket,
  closeSocket,
  onEvent,
  offEvent,
  emitEvent,
  isSocketConnected,
  reconnect
}; 