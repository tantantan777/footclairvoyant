<template>
  <div class="header-status-bar">
    <!-- 左侧 - 预留空间 -->
    <div class="header-left">
      <!-- 预留给其他可能的元素 -->
    </div>
    
    <!-- 中间 - 比赛场次和最后更新时间 -->
    <div class="header-center">
      <div class="status-items">
        <div class="status-item match-count">
          <span class="label">比赛场次数:</span>
          <span class="value">{{ matchesCount }}</span>
        </div>
        <div class="status-item last-update">
          <span class="label">最后更新时间:</span>
          <span class="value">{{ lastUpdateTime || '请更新比赛' }}</span>
        </div>
      </div>
    </div>
    
    <!-- 右侧 - 预留空间 -->
    <div class="header-right">
      <!-- 预留给其他可能的元素 -->
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue'

export default {
  name: 'Header',
  components: {
  },
  props: {
    matchesCount: {
      type: Number,
      default: 0
    }
  },
  setup(props) {
    const lastUpdateTime = ref('')
    const isDev = ref(process.env.NODE_ENV === 'development')
    
    // 获取状态信息
    const fetchStatus = () => {
      // 设置最后更新时间
      lastUpdateTime.value = new Date().toLocaleTimeString()
    }
    
    // 更新最后更新时间的方法
    const updateLastUpdateTime = () => {
      lastUpdateTime.value = new Date().toLocaleTimeString()
    }
    
    // 监听比赛数量变化，更新最后更新时间
    watch(() => props.matchesCount, (newCount, oldCount) => {
      if (newCount !== oldCount) {
        updateLastUpdateTime()
        console.log(`比赛场次数更新: ${oldCount} -> ${newCount}，更新时间：${lastUpdateTime.value}`)
      }
    })
    
    onMounted(() => {
      fetchStatus()
    })
    
    return {
      lastUpdateTime,
      isDev,
      updateLastUpdateTime
    }
  }
}
</script>

<style scoped>
.header-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.header-left,
.header-center,
.header-right {
  display: flex;
  align-items: center;
}

.header-left {
  width: 20%;
  justify-content: flex-start;
}

.header-center {
  width: 60%;
  justify-content: center;
}

.header-right {
  width: 20%;
  justify-content: flex-end;
}

.status-items {
  display: flex;
  align-items: center;
  gap: 15px;
}

.status-item {
  display: flex;
  align-items: center;
  background-color: #f5f7fa;
  padding: 6px 12px;
  border-radius: 4px;
}

.match-count {
  background-color: #ecf5ff;
  border-left: 3px solid #409eff;
}

.last-update {
  background-color: #f0f9eb;
  border-right: 3px solid #67c23a;
}

.label {
  font-weight: bold;
  margin-right: 5px;
  color: #606266;
}

.value {
  color: #303133;
  font-weight: 500;
}

.action-buttons {
  display: flex;
  gap: 16px;
}

@media (max-width: 768px) {
  .header-status-bar {
    flex-direction: column;
    gap: 10px;
    padding: 10px;
  }
  
  .header-left,
  .header-center,
  .header-right {
    width: 100%;
    justify-content: center;
  }
  
  .status-items {
    flex-direction: column;
    gap: 8px;
  }
}
</style> 