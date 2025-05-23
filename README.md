# 足球先知（Football Clairvoyant）

> ⚽ 智能化的足球比赛数据分析与预测平台，集成 DeepSeek AI，支持实时数据爬取、历史分析、AI智能问答与专业预测。

---

## 项目简介

**足球先知** 是一个面向足球爱好者、数据分析师和竞彩玩家的智能平台。系统自动爬取全球主流足球赛事数据，结合深度学习大模型（DeepSeek Reasoner/Chat），为用户提供专业的赛果预测、数据分析和交互式AI问答体验。

- **前端**：Vue 3 + Element Plus，响应式美观界面
- **后端**：Node.js + Express，Socket.io 实时通信
- **AI服务**：DeepSeek API，支持自定义模型与参数
- **数据爬虫**：Playwright 自动化采集，Excel 导出

---

## 主要功能

- ⚡ **实时比赛数据爬取**：自动采集最新赛程、赔率、历史交锋等数据
- 📊 **历史数据与赔率分析**：支持欧赔、亚盘、球队历史、交锋等多维度分析
- 🤖 **AI智能预测与问答**：基于 DeepSeek Reasoner/Chat，支持自定义提示词、模型参数
- 💬 **交互式AI聊天**：可针对具体比赛或泛足球话题进行智能问答
- 📁 **数据导出**：一键导出比赛数据为 Excel 文件
- 🖼️ **球队Logo展示**：内置丰富球队Logo，提升用户体验

---

## 技术架构

- **前端**：Vue 3, Element Plus, Vue Router, Socket.io-client
- **后端**：Node.js, Express, Playwright, Socket.io, ExcelJS
- **AI服务**：DeepSeek Reasoner/Chat（API Key可自定义）
- **数据存储**：JSON文件（比赛数据）、LOGO图片、环境变量配置

---

## 快速开始

### 环境要求

- Node.js 18 及以上
- npm 或 yarn

### 安装步骤

#### 1. 克隆项目

```bash
git clone <your-repo-url>
cd footclairvoyant
```

#### 2. 安装后端依赖

```bash
cd backend
npm install
# 如需爬虫，建议安装 Playwright 浏览器
npm run install-browsers
# 配置环境变量
cp .env.example .env
# 编辑 .env，填写 DeepSeek API Key
```

#### 3. 安装前端依赖

```bash
cd ../frontend
npm install
```

### 启动服务

#### 启动后端

```bash
cd backend
npm start
# 默认端口 8000
```

#### 启动前端

```bash
cd frontend
npm run serve
# 默认端口 8080
```

> 启动后，访问 [http://localhost:8080](http://localhost:8080) 即可体验完整功能。

---

## AI功能与配置

- **AI模型**：支持 DeepSeek Reasoner（专业分析）与 DeepSeek Chat（通用对话）
- **自定义提示词**：可在前端界面自定义AI角色、行为、专业领域
- **API Key**：支持前端输入或后端配置，保障数据安全
- **参数可调**：最大回答长度、上下文窗口等均可自定义

详细配置说明见 `backend/ai-config.json` 或前端"AI设置"界面。

---

## 主要目录结构

```text
footclairvoyant/
├── backend/         # Node.js后端，数据爬虫、API、AI服务
│   ├── index.js
│   ├── aiService.js
│   ├── ai-config.json
│   ├── matchCrawler.js
│   ├── detailCrawler.js
│   ├── match_json/      # 比赛数据JSON
│   ├── LOGOS/           # 球队Logo图片
│   └── ...
├── frontend/        # Vue3前端，用户界面
│   ├── src/
│   │   ├── views/
│   │   │   ├── Home.vue
│   │   │   ├── Match.vue
│   │   │   ├── AIChat.vue
│   │   │   └── ...
│   └── ...
├── README.md
└── 运行足彩.bat      # 一键启动脚本（可选）
```

---

## 常见问题 FAQ

- **Q: 启动后无比赛数据？**  
  A: 首次启动需等待数据爬取，几分钟后刷新页面，或手动点击"爬取比赛"按钮。

- **Q: AI回复慢或无响应？**  
  A: 受限于 DeepSeek API 速度和网络状况，通常几秒内响应。若长时间无响应，请检查API Key和网络。

- **Q: 如何清空比赛数据？**  
  A: 前端界面右上角有"清空比赛"按钮，点击即可。

- **Q: 如何自定义AI行为？**  
  A: 前端"AI设置"可自定义提示词、模型、API Key等，支持即时生效。

---

## 贡献与许可

- 欢迎提交PR、Issue，完善功能与数据源
- 本项目遵循 MIT 许可证

---

## 联系方式

- 作者/维护者：`<你的名字或团队>`
- 邮箱：`<your-email@example.com>`
- 项目主页：`<your-repo-url>`

---

> 专业、智能、开放 —— 足球先知，助你洞察每一场比赛！ 