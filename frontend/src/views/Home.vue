<template>
  <div class="home-container">
    <Header :matches-count="matches.length" />
    
    <div class="main-content">
      <div class="left-panel">
        <Matches :matches="matches" :selectedMatch="selectedMatch" @match-selected="handleMatchSelected" @match-updated="handleMatchUpdated" @crawl-matches="handleMatchesCrawled" />
      </div>
      
      <div class="center-panel">
        <Match :match="selectedMatch" />
      </div>
      
      <div class="right-panel">
        <AIChat :selectedMatch="selectedMatch" />
      </div>
    </div>
    
    <Footer />
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import Header from '@/views/Header.vue'
import Footer from '@/views/Footer.vue'
import Matches from '@/views/Matches.vue'
import Match from '@/views/Match.vue'
import AIChat from '@/views/AIChat.vue'

export default {
  name: 'HomeView',
  components: {
    Header,
    Footer,
    Matches,
    Match,
    AIChat
  },
  setup() {
    const matches = ref([])
    const selectedMatch = ref(null)
    let resizeTimer = null

    // 防抖处理窗口大小变化，减少ResizeObserver错误
    const handleResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        // 重新计算布局
        const event = new Event('resize')
        window.dispatchEvent(event)
      }, 200)
    }

    // 处理比赛选择
    const handleMatchSelected = (match) => {
      // 如果match为null，清空选中状态
      if (!match) {
        selectedMatch.value = null;
        return;
      }
      
      // 检查是否真的改变了选中的比赛
      const isChangingMatch = !selectedMatch.value || selectedMatch.value.id !== match.id;
      
      // 更新选中的比赛
      selectedMatch.value = match;
      
      // 只有在真正切换比赛时才显示消息
      if (isChangingMatch) {
        // 关闭当前所有消息提示
        ElMessage.closeAll();
        // 移除选择比赛提示
        // ElMessage({
        //   message: '已选择比赛：' + match.homeTeam.name + ' vs ' + match.awayTeam.name,
        //   type: 'info',
        //   duration: 1500
        // });
      }
    }
    
    // 处理比赛更新
    const handleMatchUpdated = (updatedMatch) => {
      if (!updatedMatch) return;
      
      // 如果更新的是当前选中的比赛，则更新选中状态
      if (selectedMatch.value && selectedMatch.value.id === updatedMatch.id) {
        console.log('更新当前选中的比赛数据:', updatedMatch.id);
        selectedMatch.value = updatedMatch;
      }
      
      // 更新matches数组中的对应比赛
      const index = matches.value.findIndex(m => m.id === updatedMatch.id);
      if (index !== -1) {
        matches.value[index] = updatedMatch;
      }
    }
    
    // 处理比赛爬取
    const handleMatchesCrawled = (crawledMatches) => {
      // 更新比赛列表
      matches.value = crawledMatches || [];
      
      // 如果没有爬取到比赛或爬取结果为空，清空选中状态
      if (!crawledMatches || crawledMatches.length === 0) {
        selectedMatch.value = null;
        console.log('清空了选中的比赛状态，显示默认"请选择比赛"');
        return;
      }
      
      console.log('Home组件接收到爬取的比赛数据:', crawledMatches.length, '场比赛');
      
      // 如果比赛列表不为空且尚未选中比赛，默认选中第一个比赛
      if (matches.value.length > 0 && !selectedMatch.value) {
        // 确保选中的比赛对象包含必要的字段
        let validMatch = null;
        
        // 先尝试找一个已完成的比赛作为默认选择
        const completedMatch = matches.value.find(match => 
          match && match.status === 'completed' && 
          match.homeTeam && match.homeTeam.name && 
          match.awayTeam && match.awayTeam.name
        );
        
        if (completedMatch) {
          validMatch = completedMatch;
          console.log('默认选择已完成的比赛:', completedMatch.id, completedMatch.homeTeam.name, 'vs', completedMatch.awayTeam.name);
        } else {
          // 找第一个有效的比赛对象
          validMatch = matches.value.find(match => 
            match && match.homeTeam && match.homeTeam.name && 
            match.awayTeam && match.awayTeam.name
          );
          
          if (validMatch) {
            console.log('默认选择第一个有效比赛:', validMatch.id, validMatch.homeTeam.name, 'vs', validMatch.awayTeam.name);
          }
        }
        
        // 只有找到有效的比赛才设置选中
        if (validMatch) {
          // 关闭当前所有消息提示
          ElMessage.closeAll();
          selectedMatch.value = validMatch;
          // 移除自动选择比赛提示
          // ElMessage({
          //   message: '已选择比赛：' + validMatch.homeTeam.name + ' vs ' + validMatch.awayTeam.name,
          //   type: 'info',
          //   duration: 1500
          // });
        } else {
          // 如果没有有效比赛，给出提示
          console.warn('未找到有效的比赛对象');
          // 移除爬取数据不完整提示
          // ElMessage({
          //   message: '爬取的比赛数据不完整，请重新爬取',
          //   type: 'warning',
          //   duration: 2000
          // });
        }
      } else if (selectedMatch.value) {
        console.log('已经有选中的比赛，不再自动选择:', selectedMatch.value.id);
      }
    }

    // 在组件挂载时初始化
    onMounted(() => {
      // 不需要主动调用 fetchMatches，因为 Matches 组件会自动从后端获取数据
      // 只处理窗口大小变化
      window.addEventListener('resize', handleResize)
    })

    // 组件卸载前清理事件监听
    onBeforeUnmount(() => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimer)
    })

    return {
      matches,
      selectedMatch,
      handleMatchSelected,
      handleMatchUpdated,
      handleMatchesCrawled
    }
  }
}
</script>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  display: grid;
  grid-template-columns: 400px 1fr 500px;
  gap: 20px;
  padding: 20px;
  flex: 1;
}

@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 400px 1fr 500px;
  }
}

@media (max-width: 768px) {
  .main-content {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }
  
  .left-panel,
  .center-panel,
  .right-panel {
    grid-column: span 1;
  }
}

.left-panel,
.center-panel,
.right-panel {
  height: calc(100vh - 200px);
  overflow: hidden;
}
</style> 