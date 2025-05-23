const express = require('express');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'ai-config.json');

module.exports = (io) => {
  const router = express.Router();

  // 获取AI配置
  router.get('/ai-config', (req, res) => {
    fs.readFile(CONFIG_PATH, 'utf-8', (err, data) => {
      if (err) return res.status(500).json({ error: '读取配置失败' });
      res.json(JSON.parse(data));
    });
  });

  // 修改AI配置并推送
  router.post('/ai-config', (req, res) => {
    const newConfig = req.body;
    fs.writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2), err => {
      if (err) return res.status(500).json({ error: '保存配置失败' });
      // 推送配置变更事件
      if (io) io.emit('ai-config-updated', newConfig);
      res.json({ success: true });
    });
  });

  return router;
}; 