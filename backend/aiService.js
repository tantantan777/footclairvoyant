/**
 * AI服务模块
 * 处理AI聊天请求并支持自定义配置
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { check, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

// 配置文件路径
const CONFIG_PATH = path.join(__dirname, 'ai-config.json');
// 读取配置文件的函数
const readConfig = () => {
  try {
    const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('读取AI配置文件失败:', err);
    return {};
  }
};

/**
 * 处理AI聊天请求
 * 支持自定义API密钥、模型选择和参数配置
 */
router.post('/ai-chat', [
  check('message').notEmpty().withMessage('消息不能为空'),
  check('context').isArray().withMessage('上下文必须是数组'),
  check('settings').optional()
], async (req, res) => {
  try {
    // 只打印用户最终发送内容（含附加信息），黄色
    if (Array.isArray(req.body.context) && req.body.context.length > 0) {
      const lastUserMsg = req.body.context
        .slice().reverse()
        .find(msg => msg.role === 'user' && msg.content && msg.content.trim());
      if (lastUserMsg) {
        const now = new Date().toLocaleString('zh-CN', { hour12: false });
        // 黄色字体：\x1b[33m
        console.log(`\x1b[33m[${now}] 用户：${lastUserMsg.content}\x1b[0m`);
      }
    }
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { message, context, settings = {} } = req.body;

    // 读取配置文件
    const configFromFile = readConfig();
    // 合并设置，优先使用请求中的设置，其次用配置文件内容，不再兜底硬编码
    const config = {
      apiKey: settings.apiKey || configFromFile.apiKey,
      model: {
        name: settings.model?.name || configFromFile.model?.name,
        maxLength: settings.model?.maxLength || configFromFile.model?.maxLength,
        contextLength: settings.model?.contextLength || configFromFile.model?.contextLength
      }
    };

    // 根据模型名称确定API端点
    let apiEndpoint = 'https://api.deepseek.com/v1/chat/completions';
    
    // 构建请求数据
    const requestData = {
      model: config.model.name,
      messages: context,
      max_tokens: config.model.maxLength,
      temperature: 1,//数据抽取/分析官方建议设置为1
      stream: true  // 启用流式输出
    };

    // 设置响应的头部为事件流
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 调用DeepSeek API
    try {
      const response = await axios({
        method: 'post',
        url: apiEndpoint,
        data: requestData,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        responseType: 'stream'
      });

      // 处理流式响应
      let buffer = '';
      let aiReply = '';
      response.data.on('data', (chunk) => {
        buffer += chunk.toString();
        let lines = buffer.split('\n');
        buffer = lines.pop(); // 最后一行可能是不完整的，留到下次
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.choices[0].finish_reason === 'stop') {
                res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
                continue;
              }
              const content = data.choices[0].delta.content || '';
              aiReply += content;
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            } catch (e) {
              console.error('解析响应数据失败:', e, dataStr);
            }
          }
        }
      });
      response.data.on('end', () => {
        if (buffer && buffer.startsWith('data: ')) {
          const dataStr = buffer.slice(6).trim();
          if (dataStr && dataStr !== '[DONE]') {
            try {
              const data = JSON.parse(dataStr);
              if (data.choices[0].finish_reason === 'stop') {
                res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
              } else {
                const content = data.choices[0].delta.content || '';
                aiReply += content;
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
              }
            } catch (e) {
              console.error('解析响应数据失败:', e, dataStr);
            }
          }
        }
        // 输出AI回复内容及时间戳，蓝色
        const now = new Date().toLocaleString('zh-CN', { hour12: false });
        if (aiReply.trim()) {
          // 蓝色字体：\x1b[34m
          console.log(`\x1b[34m[${now}] AI：${aiReply.trim()}\x1b[0m`);
        }
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      });

    } catch (apiError) {
      console.error('API请求失败:', apiError.message);
      
      // 尝试从错误响应中提取详细信息
      const errorMessage = apiError.response?.data?.error?.message || apiError.message;
      res.write(`data: ${JSON.stringify({ error: `AI服务请求失败: ${errorMessage}` })}\n\n`);
      res.end();
    }
  } catch (error) {
    console.error('处理AI聊天请求失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 获取支持的模型列表
 */
router.get('/ai-models', (req, res) => {
  const models = [
    { 
      id: 'deepseek-chat', 
      name: 'DeepSeek Chat', 
      description: '通用对话模型，适合日常交流' 
    },
    { 
      id: 'deepseek-reasoner', 
      name: 'DeepSeek Reasoner', 
      description: '增强推理能力，适合专业分析和复杂问题' 
    }
  ];
  
  res.json({ models });
});

module.exports = router; 