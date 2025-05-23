import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/Home.vue'
import Matches from '../views/Matches.vue'
import Match from '../views/Match.vue'
import AIChat from '../views/AIChat.vue'
import Disclaimer from '../views/Disclaimer.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: {
      title: '足球比赛数据爬取与分析'
    }
  },
  {
    path: '/matches',
    name: 'matches',
    component: Matches,
    meta: {
      title: '比赛列表'
    }
  },
  {
    path: '/match/:id',
    name: 'match',
    component: Match,
    meta: {
      title: '比赛详情'
    }
  },
  {
    path: '/aichat',
    name: 'aichat',
    component: AIChat,
    meta: {
      title: '中国竞彩足球专业预测模型V8.1终极版'
    }
  },
  {
    path: '/disclaimer',
    name: 'disclaimer',
    component: Disclaimer,
    meta: {
      title: '免责声明'
    }
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

// 全局前置守卫，设置文档标题
router.beforeEach((to, from, next) => {
  // 设置标题
  document.title = to.meta.title || '足球比赛数据爬取与分析'
  next()
})

export default router 