const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const { scrapeMatchesList, cleanupAllJsonFiles } = require('./matchCrawler');
const detailCrawler = require('./detailCrawler');
const aiService = require('./aiService'); // 导入AI服务模块
const ExcelJS = require('exceljs');
const { exportMatchExcel } = require('./excelExport');

// 加载环境变量
require('dotenv').config();

// Node.js v18以上版本原生支持fetch，低版本需要使用node-fetch
let fetch;
if (!globalThis.fetch) {
  console.log('使用node-fetch作为后备选项');
  try {
    // 尝试动态导入node-fetch（需要先安装：npm install node-fetch）
    fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  } catch (error) {
    console.error('无法导入node-fetch，请确保已安装: npm install node-fetch');
    console.error('或者升级到 Node.js v18+ 以使用内置fetch');
    // 提供一个有意义的错误，避免运行时崩溃
    fetch = () => Promise.reject(new Error('Fetch API不可用，请安装node-fetch或升级Node.js'));
  }
} else {
  console.log('使用原生fetch API');
  fetch = globalThis.fetch;
}

const app = express();
app.use(cors());
app.use(express.json());

// 创建HTTP服务器
const server = http.createServer(app);

// 创建Socket.io服务
const io = socketIo(server, {
  cors: {
    origin: "*", // 允许所有来源访问，生产环境中应该限制
    methods: ["GET", "POST"]
  }
});

// 全局对象存储所有连接的客户端数
let connectedClients = 0;
// 使connectedClients成为全局变量
global.connectedClients = connectedClients;

// Socket.io连接事件
io.on('connection', (socket) => {
  connectedClients++;
  global.connectedClients = connectedClients; // 更新全局变量
  // 使用绿色文字输出连接成功信息
  console.log('\x1b[32m%s\x1b[0m', `WebSocket客户端连接成功！当前连接数：${connectedClients}`);
  
  // 发送欢迎消息
  socket.emit('welcome', { message: 'WebSocket连接成功!' });
  
  // 客户端断开连接
  socket.on('disconnect', () => {
    connectedClients--;
    global.connectedClients = connectedClients; // 更新全局变量
    console.log(`WebSocket客户端断开连接！当前连接数：${connectedClients}`);
  });
});

// 导出io对象以便其他模块使用
global.io = io;

// 静态文件服务
app.use('/logos', express.static(path.join(__dirname, 'LOGOS')));

// 创建必要的目录
const matchJsonDir = path.join(__dirname, 'match_json');
if (!fs.existsSync(matchJsonDir)) {
  fs.mkdirSync(matchJsonDir);
}

// 添加新的爬取比赛接口（实际实现）
app.post('/api/scrape-matches', async (req, res) => {
  try {
    // 检查并终止正在进行的预加载
    if (detailCrawler.isPreloadRunning()) {
      console.log('\x1b[31m%s\x1b[0m', '检测到正在进行的预加载，终止预加载过程');
      detailCrawler.terminatePreload();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    // 调用爬虫函数获取比赛ID
    const matches = await scrapeMatchesList();
    
    // 从目录中读取所有match_*.json文件以验证，按文件名排序
    const matchFiles = fs.readdirSync(matchJsonDir)
      .filter(file => file.endsWith('.json'))
      .sort(); // 按文件名排序，确保与预加载顺序一致
    
    // 自动开始预加载详细数据（非阻塞）
    setTimeout(() => {
      detailCrawler.startPreloadMatchDetails().catch(error => {
        console.error('自动预加载详细信息失败:', error);
      });
    }, 2000); // 延迟2秒开始预加载，确保比赛列表爬取完全完成
    
    // 返回成功响应
    res.json({ 
      success: true, 
      matchCount: matches.length,
      jsonCount: matchFiles.length,
      jsonFiles: matchFiles,
      matches,
      message: `成功爬取 ${matches.length} 场比赛数据，已开始自动预加载详细信息`
    });
  } catch (error) {
    console.error('爬取比赛ID失败:', error.message);
    
    // 如果爬虫失败，尝试从已有文件中加载数据作为备用
    try {
      // 不再清理文件，保留现有数据用于备份
      // cleanupAllJsonFiles();
      
      const matchFiles = fs.readdirSync(matchJsonDir)
        .filter(file => file.endsWith('.json'))
        .sort(); // 按文件名排序，确保与预加载顺序一致
      
      if (matchFiles.length > 0) {
        // 读取所有比赛数据
        const matches = matchFiles.map(file => {
          const filePath = path.join(matchJsonDir, file);
          return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        });
        
        // 返回成功响应但带有警告信息
        return res.json({ 
          success: true, 
          matchCount: matches.length,
          jsonCount: matchFiles.length,
          jsonFiles: matchFiles,
          matches,
          message: '爬取失败，已返回现有数据'
        });
      }
    } catch (backupError) {
      // 忽略错误
    }
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取比赛列表 - 从单独的JSON文件构建
app.get('/api/match-files', (req, res) => {
  try {
    // 不再清理文件，刷新网站时保留现有数据
    // cleanupAllJsonFiles();
    
    // 从目录中读取所有JSON文件
    const matchFiles = fs.readdirSync(matchJsonDir)
      .filter(file => file.endsWith('.json'))
      .sort(); // 按文件名排序，确保与预加载顺序一致
    
    // 读取每个文件的内容并合并
    const matches = matchFiles.map(file => {
      const filePath = path.join(matchJsonDir, file);
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    });
    
    // 返回合并的比赛数据
    res.json(matches);
  } catch (error) {
    console.error('获取比赛列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 比赛详情API：根据比赛ID查找json文件
const MATCH_JSON_DIR = path.join(__dirname, 'match_json');

app.get('/api/match-detail/:matchId', (req, res) => {
  const matchId = req.params.matchId;
  fs.readdir(MATCH_JSON_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: '读取目录失败' });
    // 匹配包含比赛ID的文件
    const fileName = files.find(name => name.includes(matchId) && name.endsWith('.json'));
    if (!fileName) return res.status(404).json({ error: '未找到对应比赛详情' });
    const filePath = path.join(MATCH_JSON_DIR, fileName);
    fs.readFile(filePath, 'utf-8', (err, data) => {
      if (err) return res.status(500).json({ error: '读取文件失败' });
      try {
        res.json(JSON.parse(data));
      } catch (e) {
        res.status(500).json({ error: 'JSON解析失败' });
      }
    });
  });
});

// 获取JSON文件列表
app.get('/api/match-json-files', async (req, res) => {
  try {
    const files = fs.readdirSync(matchJsonDir)
      .filter(file => file.endsWith('.json'))
      .sort() // 按文件名排序，确保与预加载顺序一致
      .map(file => {
        const filePath = path.join(matchJsonDir, file);
        const stats = fs.statSync(filePath);
        
        // 从文件名提取比赛ID
        const idMatch = file.match(/-(\d+)-/);
        const matchId = idMatch ? idMatch[1] : 'unknown';
        
        return {
          name: file,
          path: `/json/${file}`,
          size: stats.size,
          modified: stats.mtime,
          matchId
        };
      });
    
    // 返回文件列表
    res.json(files);
  } catch (error) {
    console.error('获取JSON文件列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 静态文件服务 - JSON文件
app.use('/json', express.static(path.join(__dirname, 'match_json')));

// 获取跳转到比赛网站的URL
app.get('/api/open-jc', (req, res) => {
  res.json({ url: 'https://jc.titan007.com' });
});

// 添加清空比赛的API端点
app.post('/api/clear-matches', (req, res) => {
  try {
    // 使用蓝色文字输出开始清空的信息
    console.log('\x1b[34m%s\x1b[0m', '开始清空所有比赛数据...');
    
    // 先获取当前文件数量
    const currentFiles = fs.readdirSync(matchJsonDir)
      .filter(file => file.endsWith('.json'));
    const fileCount = currentFiles.length;
    
    // 调用清理函数清空所有JSON文件
    cleanupAllJsonFiles();
    
    // 获取清理后的文件列表（应该为空）
    const remainingFiles = fs.readdirSync(matchJsonDir)
      .filter(file => file.endsWith('.json'));
    
    if (remainingFiles.length === 0) {
      // 使用青色（Cyan）字体输出日志
      console.log('\x1b[36m%s\x1b[0m', `已删除${fileCount}场比赛数据，现在可以点击"爬取比赛"重新开始爬取数据。`);
      
      res.json({
        success: true,
        message: '已成功清空所有比赛数据'
      });
    } else {
      throw new Error(`清空比赛失败，仍有 ${remainingFiles.length} 个文件未删除`);
    }
  } catch (error) {
    console.error('清空比赛数据失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 开始预加载所有比赛详细信息
app.post('/api/preload-match-details', async (req, res) => {
  try {
    // 以非阻塞方式启动预加载
    detailCrawler.startPreloadMatchDetails().catch(error => {
      console.error('预加载详细信息时出错:', error);
    });
    
    // 立即返回成功响应，预加载会在后台继续进行
    res.json({ 
      success: true, 
      message: '已开始预加载所有比赛的详细信息，请查看进度条获取实时状态'
    });
  } catch (error) {
    console.error('启动预加载时出错:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 加载单场比赛的详细信息
app.post('/api/match-detail/:matchId', async (req, res) => {
  try {
    const matchId = req.params.matchId;
    
    // 通过WebSocket通知开始更新
    io.emit('match-progress', {
      matchId,
      status: 'inProgress',
      progress: 10,
      message: '开始更新比赛详情...',
      timestamp: new Date().toISOString()
    });
    
    // 更新该比赛的详细信息
    const success = await detailCrawler.updateMatchDetailById(matchId);
    
    if (success) {
      // 读取最新的比赛数据
      const matchFiles = fs.readdirSync(matchJsonDir)
        .filter(file => file.includes(`-${matchId}-`) && file.endsWith('.json'))
        .sort();
      
      let matchDetails = null;
      if (matchFiles.length > 0) {
        const matchJsonPath = path.join(matchJsonDir, matchFiles[0]);
        matchDetails = JSON.parse(fs.readFileSync(matchJsonPath, 'utf8'));
      }
      
      // 通过WebSocket通知完成更新
      io.emit('match-progress', {
        matchId,
        status: 'completed',
        progress: 100,
        message: '比赛详情更新完成',
        timestamp: new Date().toISOString()
      });
      
      res.json({ 
        success: true, 
        message: `比赛 ${matchId} 的详细信息已更新`,
        match: matchDetails
      });
    } else {
      // 通知更新失败
      io.emit('match-progress', {
        matchId,
        status: 'failed',
        progress: 0,
        message: '比赛详情更新失败',
        timestamp: new Date().toISOString()
      });
      
      res.status(404).json({ 
        success: false, 
        message: `无法更新比赛 ${matchId} 的详细信息`
      });
    }
  } catch (error) {
    // 通知更新出错
    io.emit('match-progress', {
      matchId: req.params.matchId,
      status: 'failed',
      progress: 0,
      message: `更新出错: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    
    console.error('更新比赛详情时出错:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 现在再引入aiConfig，并传递io
const aiConfig = require('./aiConfig')(io);
app.use('/api', aiConfig);

// 使用AI服务路由
app.use('/api', aiService);

const ATTACH_PRESET_PATH = path.join(__dirname, 'attach-preset.json');

// 获取附加信息预设
app.get('/api/attach-preset', (req, res) => {
  fs.readFile(ATTACH_PRESET_PATH, 'utf-8', (err, data) => {
    if (err) return res.json({ basicInfo: [], europeInitial: [], europeLive: [], asiaHandicap: [] });
    try {
      res.json(JSON.parse(data));
    } catch (e) {
      res.json({ basicInfo: [], europeInitial: [], europeLive: [], asiaHandicap: [] });
    }
  });
});

// 保存附加信息预设
app.post('/api/attach-preset', (req, res) => {
  const { basicInfo, europeInitial, europeLive, asiaHandicap } = req.body;
  const preset = { basicInfo, europeInitial, europeLive, asiaHandicap };
  fs.writeFile(ATTACH_PRESET_PATH, JSON.stringify(preset, null, 2), err => {
    if (err) return res.status(500).json({ success: false, error: '保存失败' });
    res.json({ success: true });
  });
});

// Excel下载接口
app.get('/api/download-excel/:matchId', async (req, res) => {
  const matchId = req.params.matchId;
  const matchJsonDir = path.join(__dirname, 'match_json');
  try {
    // 查找对应比赛文件
    const files = fs.readdirSync(matchJsonDir)
      .filter(file => file.includes(`-${matchId}-`) && file.endsWith('.json'));
    if (files.length === 0) {
      return res.status(404).json({ error: '未找到该比赛数据' });
    }
    const matchData = JSON.parse(fs.readFileSync(path.join(matchJsonDir, files[0]), 'utf-8'));
    // 检查进度
    if (!matchData.details || matchData.details.progress !== 100) {
      return res.status(400).json({ error: '该比赛数据尚未全部爬取完成，无法下载Excel' });
    }
    // 调用导出函数
    await exportMatchExcel(matchData, res, matchId);
  } catch (error) {
    console.error('导出Excel失败:', error);
    res.status(500).json({ error: '导出Excel失败' });
  }
});

// 在最后启动HTTP服务器
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  // 使用绿色文字输出启动信息
  console.log('\x1b[32m%s\x1b[0m', `后端已启动，端口号：${PORT}`);
}); 