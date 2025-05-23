<template>
  <div class="match-list">
    <div class="list-header">
      <h3 class="list-title">
        <el-icon><Trophy /></el-icon>
        比赛列表
      </h3>
      <div class="list-actions">
        <el-button type="primary" :loading="scraping" @click="scrapeMatches" style="margin-right: 10px;">
          <el-icon><Download /></el-icon>爬取比赛
        </el-button>
        <el-button type="danger" @click="clearMatches" style="margin-right: 10px;">
          <el-icon><Delete /></el-icon>清空比赛
        </el-button>
      </div>
    </div>
    
    <!-- 使用单一滚动容器 -->
    <div class="match-content">
      <div v-if="displayedMatches.length === 0" class="no-data">
        <el-empty description="请爬取比赛列表" />
      </div>
      
      <div v-else class="match-items">
        <!-- 按日期分组显示比赛 -->
        <div v-for="(group, date) in matchesByDate" :key="date" class="match-date-group">
          <div class="date-header">
            <span class="date-text">{{ formatDateHeader(date) }}</span>
          </div>
          
          <div 
            v-for="match in group" 
            :key="match.id"
            class="match-item"
            :class="{ 'active': selectedMatchId === match.id }"
            @click="selectMatch(match)"
          >
            <!-- 联赛和时间信息 -->
            <div class="match-header">
              <div class="match-league">
                <span class="league-name">{{ match.league }}</span>
              </div>
              
              <div class="match-time-status">
                <span class="match-time">{{ formatTime(match.matchTime) }}</span>
              </div>
            </div>
            
            <!-- 球队信息 -->
            <div class="match-teams-container">
              <!-- 主队名称 -->
              <div class="team-name home-name">{{ match.homeTeam.name }}</div>
              
              <!-- 主队队徽 -->
              <el-avatar 
                :size="30" 
                :src="getTeamLogo(match.homeTeam.logo)" 
                :alt="match.homeTeam.name"
                class="team-logo home-logo"
              />
              
              <!-- 比分/VS -->
              <div class="match-score">
                <template v-if="match.status === 'upcoming'">
                  <span class="score-display no-score">
                    <span class="score-number">--</span>
                    <span class="score-separator">：</span>
                    <span class="score-number">--</span>
                  </span>
                </template>
                <template v-else>
                  <span class="score-display">
                    <span class="score-number">{{ match.homeScore || 0 }}</span>
                    <span class="score-separator">:</span>
                    <span class="score-number">{{ match.awayScore || 0 }}</span>
                  </span>
                </template>
              </div>
              
              <!-- 客队队徽 -->
              <el-avatar 
                :size="30" 
                :src="getTeamLogo(match.awayTeam.logo)" 
                :alt="match.awayTeam.name"
                class="team-logo away-logo"
              />
              
              <!-- 客队名称 -->
              <div class="team-name away-name">{{ match.awayTeam.name }}</div>
            </div>
            
            <!-- 场地和天气信息 -->
            <div class="match-venue-info">
              <div class="venue-details" v-if="match.venue">
                <el-icon><Location /></el-icon>
                <span class="venue-name">{{ match.venue }}</span>
              </div>
              
              <div class="weather-details" v-if="match.weather || match.temperature">
                <span class="weather-icon" v-if="match.weather">
                  <el-icon v-if="match.weather.includes('晴')"><Sunny /></el-icon>
                  <el-icon v-else-if="match.weather.includes('雨')"><Lightning /></el-icon>
                  <el-icon v-else-if="match.weather.includes('云') || match.weather.includes('阴')"><Cloudy /></el-icon>
                  <el-icon v-else><Cloudy /></el-icon>
                </span>
                <span class="weather-text" v-if="match.weather">{{ match.weather }}</span>
                <span class="temperature" v-if="match.temperature">{{ match.temperature }}</span>
              </div>
            </div>
            
            <!-- 添加详细信息爬取进度条 -->
            <div class="details-progress-container">
              <el-progress 
                :percentage="calculateProgressPercentage(match)" 
                :stroke-width="8" 
                :text-inside="false"
                :show-text="false"
                :status="getProgressStatus(match)"
                class="details-progress-bar"
              ></el-progress>
              <div class="progress-row">
                <div class="progress-btn-group">
                  <el-button
                    class="excel-download-btn"
                    type="success"
                    circle
                    size="small"
                    @click.stop="downloadExcel(match)"
                    title="下载Excel"
                    :disabled="!isMatchCompleted(match)"
                  >
                    <el-icon><Download /></el-icon>
                  </el-button>
                  <el-button
                    class="refresh-btn"
                    type="primary"
                    circle
                    size="small"
                    :loading="refreshingId === match.id"
                    @click.stop="refreshMatch(match)"
                    title="刷新比赛数据"
                    style="margin-left: 4px; margin-right: 0;"
                    :disabled="!isMatchCompleted(match)"
                  >
                    <el-icon><Refresh /></el-icon>
                  </el-button>
                </div>
                <div class="progress-id-label">ID: {{ match.id }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 底部空间 -->
        <div class="bottom-spacer"></div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Trophy, Location, Sunny, Lightning, Cloudy, Download, Delete, Refresh } from '@element-plus/icons-vue'
import { format, isToday, isTomorrow, isYesterday } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ElMessage } from 'element-plus'
import { initSocket, onEvent, offEvent, closeSocket, isSocketConnected, reconnect } from '../services/socket'

const API_BASE_URL = 'http://localhost:8000' // 根据实际后端地址调整

const defaultLogoBase64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDgwIDgwIiBmaWxsPSJub25lIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiNFMUU4RUQiLz48cGF0aCBkPSJNNDAgMzBDMzQuNDc3MSAzMCAzMCAzNC40NzcxIDMwIDQwQzMwIDQ1LjUyMjkgMzQuNDc3MSA1MCA0MCA1MEM0NS41MjI5IDUwIDUwIDQ1LjUyMjkgNTAgNDBDNTAgMzQuNDc3MSA0NS41MjI5IDMwIDQwIDMwWk00MCA0OEM1OS4zMyA0OCA1NCA1Ni41IDU0IDU2LjVIMjZDMjYgNTYuNSAyMC42NyA0OCA0MCA0OFoiIGZpbGw9IiNBM0IxQzYiLz48L3N2Zz4='

// 兼容后端中文日期格式转标准格式
function parseChineseDateTime(chineseDateTime) {
  if (!chineseDateTime) return '';
  
  // 处理带有时间范围的格式: "2025年5月15日 星期四 （11:00 - 次日11:00）"
  const timeRangeMatch = chineseDateTime.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s+星期[一二三四五六日]\s+（(\d{1,2}:\d{2})\s+-\s+(次日)?(\d{1,2}:\d{2})）/);
  if (timeRangeMatch) {
    const year = timeRangeMatch[1];
    const month = timeRangeMatch[2];
    const day = timeRangeMatch[3];
    const startTime = timeRangeMatch[4];
    // 检查具体比赛时间是否在凌晨
    // 如果有具体比赛时间，且小于11点，应该归属到次日
    let adjustedDay = parseInt(day);
    const mm = month.padStart(2, '0');
    const dd = adjustedDay.toString().padStart(2, '0');
    return `${year}-${mm}-${dd} ${startTime}`;
  }
  
  // 处理常规格式: "2023年12月10日 20:00"
  const regularMatch = chineseDateTime.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}:\d{2})/);
  if (regularMatch) {
    const year = regularMatch[1];
    const month = regularMatch[2];
    const day = regularMatch[3];
    const time = regularMatch[4];
    
    // 注意：这里不需要自动调整日期，因为后端已经处理了这种情况
    // 凌晨比赛的日期在后端已经被调整为次日
    let adjustedDay = parseInt(day);
    
    const mm = month.padStart(2, '0');
    const dd = adjustedDay.toString().padStart(2, '0');
    return `${year}-${mm}-${dd} ${time}`;
  }
  
  return chineseDateTime;
}

export default {
  name: 'Matches',
  components: {
    Trophy,
    Location,
    Sunny,
    Lightning,
    Cloudy,
    Download,
    Delete,
    Refresh
  },
  props: {
    matches: {
      type: Array,
      default: () => []
    },
    selectedMatch: {
      type: Object,
      default: null
    }
  },
  emits: ['match-selected', 'crawl-matches', 'match-updated'],
  setup(props, { emit }) {
    const selectedMatchId = ref(null)
    const scraping = ref(false)
    const localMatches = ref([])
    const autoLoad = ref(true)
    const refreshingId = ref(null)

    // 存储所有比赛
    const allMatches = ref([])
    // 使用watch监听props.matches变化，而不是直接在根作用域赋值
    watch(() => props.matches, (newMatches) => {
      if (newMatches && newMatches.length > 0) {
        allMatches.value = newMatches
      }
    }, { immediate: true })
    
    // WebSocket相关状态
    const batchProcessing = ref({
      active: false,
      current: 0,
      total: 0,
      matchesLoaded: 0,
      matchesCount: 0
    })
    
    // 监听selectedMatch属性变化，同步更新selectedMatchId
    watch(() => props.selectedMatch, (newMatch) => {
      if (newMatch && newMatch.id) {
        console.log('Matches组件接收到选中的比赛:', newMatch.id, newMatch.homeTeam?.name, 'vs', newMatch.awayTeam?.name);
        selectedMatchId.value = newMatch.id;
      }
    }, { immediate: true });

    // 加载比赛数据
    const loadMatches = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/match-files`);
        if (!response.ok) {
          throw new Error('获取比赛列表失败');
        }
        
        const data = await response.json();
        // 注意：/api/match-files接口调用了cleanupAllJsonFiles，所以后端可能返回空数组
        if (data && Array.isArray(data)) {
          localMatches.value = data;
          if (data.length > 0) {
            // 将比赛数据发送给父组件，但不自动选择
          emit('crawl-matches', localMatches.value);
            
            // 只有当父组件尚未选择比赛且selectedMatchId未设置时，才在本地更新selectedMatchId
            if (props.selectedMatch && props.selectedMatch.id && !selectedMatchId.value) {
              console.log('根据props更新选中状态:', props.selectedMatch.id);
              selectedMatchId.value = props.selectedMatch.id;
            }
          } else {
            // 清空选中状态
            selectedMatchId.value = null;
            emit('match-selected', null);
          }
        }
      } catch (error) {
        console.error('加载比赛数据失败:', error);
        // 清空比赛列表
        localMatches.value = [];
        // 清空选中状态
        selectedMatchId.value = null;
        emit('match-selected', null);
      }
    };

    // 爬取比赛
    const scrapeMatches = async () => {
      try {
        scraping.value = true
        batchProcessing.value = {
          active: true,
          current: 0,
          total: 0,
          matchesLoaded: 0,
          matchesCount: 0
        }
        
        // 清空本地比赛列表，确保展示的是最新爬取的数据
        localMatches.value = []
        allMatches.value = []
        
        // 清空选中状态并通知父组件更新Match.vue区域
        selectedMatchId.value = null
        emit('match-selected', null)
        
        // 通知父组件比赛数量变为0，更新Header的比赛场次数
        emit('crawl-matches', [])
        
        // 调用API获取比赛列表
        const response = await fetch(`${API_BASE_URL}/api/scrape-matches`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok) {
          throw new Error('爬取比赛失败')
        }
        
        const result = await response.json()
        
        if (result.success) {
          // 如果WebSocket连接有问题，则使用HTTP响应更新比赛
          if (!batchProcessing.value.active || batchProcessing.value.matchesLoaded === 0) {
            allMatches.value = result.matches || []
            
            if (result.matches && result.matches.length > 0) {
              // 移除成功爬取的提示
              // ElMessage.success(`成功爬取 ${result.matches.length} 场比赛`)
          } else {
              // 移除未找到比赛的提示
              // ElMessage.warning('未找到比赛')
          }
          }
        } else {
          throw new Error(result.error || '爬取比赛失败')
        }
      } catch (error) {
        console.error('爬取比赛失败:', error)
        // 保留爬取失败的错误提示
        ElMessage.error(`爬取比赛失败: ${error.message}`)
      } finally {
        // 如果WebSocket未能完成，则在这里结束加载状态
        if (scraping.value) {
          scraping.value = false
        }
      }
    }

    // 清空比赛列表
    const clearMatches = async () => {
      try {
        // 清空本地比赛列表
        localMatches.value = []
        allMatches.value = []
        
        // 清空选中状态并通知父组件更新Match.vue区域
        selectedMatchId.value = null
        emit('match-selected', null)
        
        // 通知父组件比赛数量变为0，更新Header的比赛场次数
        emit('crawl-matches', [])
        
        // 调用后端API清空比赛文件
        const response = await fetch(`${API_BASE_URL}/api/clear-matches`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok) {
          throw new Error('清空比赛失败')
        }
        
        const result = await response.json()
        
        if (result.success) {
          ElMessage.success('已成功清空所有比赛')
        } else {
          throw new Error(result.error || '清空比赛失败')
        }
      } catch (error) {
        console.error('清空比赛失败:', error)
        ElMessage.error(`清空比赛失败: ${error.message}`)
      }
    }

    // 获取队徽
    const getTeamLogo = (logoPath) => {
      if (!logoPath) {
        return defaultLogoBase64
      }
      
      // 处理本地路径
      if (logoPath.startsWith('/logos/')) {
        // 清理可能的额外文本（如"已存在"标记）
        const cleanPath = logoPath.split(' ')[0];
        return `http://localhost:8000${cleanPath}`;
      }
      
      // 处理远程URL
      if (logoPath.startsWith('http')) {
        return logoPath
      }
      
      // 处理//开头的URL
      if (logoPath.startsWith('//')) {
        return `https:${logoPath}`
      }
      
      // 默认返回默认队徽
      return defaultLogoBase64
    };

    // 计算详细信息进度百分比
    const calculateProgressPercentage = (match) => {
      if (!match.details) return 0;
      
      // 初始化进度数据对象
      if (!window.matchProgressData) {
        window.matchProgressData = {};
      }
      
      if (!window.matchProgressData[match.id]) {
        window.matchProgressData[match.id] = {
          lastProgress: 0,
          targetProgress: 0,
          lastUpdated: new Date().getTime()
        };
      }
      
      // 直接返回后端提供的进度值，不使用平滑过渡
      if (match.details.progress !== undefined) {
        return match.details.progress;
      }
      
      // 如果没有progress字段，通过内容计算进度
      let completedCount = 0;
      
      // 欧赔初盘
      if (match.details.odds?.europeInitial?.length > 0) completedCount++;
      // 欧赔即时盘
      if (match.details.odds?.europeLive?.length > 0) completedCount++;
      // 亚盘
      if (match.details.odds?.asiaHandicap?.length > 0) completedCount++;
      
      // 历史数据（主队历史、客队历史和交锋历史合并为一个单位）
      if (match.details.history?.homeHistory?.length > 0 || 
          match.details.history?.awayHistory?.length > 0 || 
          match.details.history?.headToHead?.length > 0) {
        completedCount++;
      }
      
      // 计算百分比并返回 (4个单位对应100%)
      return Math.round((completedCount / 4) * 100);
    };
    
    // 获取进度状态文本
    const getDetailProgress = (match) => {
      if (!match.details) return '未开始';
      
      // 优先使用后端提供的progress字段
      if (match.details.progress !== undefined) {
        return `${match.details.progress}%`;
      }
      
      // 计算已完成的数据类型数量
      let completedCount = 0;
      // 欧赔初盘
      if (match.details.odds?.europeInitial?.length > 0) completedCount++;
      // 欧赔即时盘
      if (match.details.odds?.europeLive?.length > 0) completedCount++;
      // 亚盘
      if (match.details.odds?.asiaHandicap?.length > 0) completedCount++;
      
      // 历史数据（合并为一个单位）
      if (match.details.history?.homeHistory?.length > 0 || 
          match.details.history?.awayHistory?.length > 0 || 
          match.details.history?.headToHead?.length > 0) {
        completedCount++;
      }
      
      return `${completedCount}/4`;
    };
    
    // 获取进度条状态
    const getProgressStatus = (match) => {
      if (!match.details) return ''; // 默认状态
      
      // 如果有状态字段，直接使用
      if (match.details.status) {
        if (match.details.status === 'failed') return 'exception';
        if (match.details.status === 'completed') return 'success';
        if (match.details.status === 'inProgress') return '';
      }
      
      // 根据完成程度判断
      const progress = calculateProgressPercentage(match);
      if (progress === 100) return 'success';
      if (progress > 0) return ''; // 进行中
      return ''; // 未开始
    };

    // 选择比赛
    const selectMatch = (match) => {
      // 避免重复选择同一个比赛
      if (selectedMatchId.value === match.id) {
        console.log('已经选中了这个比赛，无需重复选择:', match.id);
        return;
      }
      
      console.log('选中比赛:', match.id, match.homeTeam?.name, 'vs', match.awayTeam?.name);
      selectedMatchId.value = match.id
      emit('match-selected', match)
    }

    // 初始化WebSocket连接和事件监听
    onMounted(() => {
      // 初始化WebSocket连接
      initSocket()
      
      // 监听比赛详情进度更新
      onEvent('match-progress', handleMatchProgressUpdate)
      
      // 监听比赛批次更新事件
      onEvent('matches-batch-update', handleMatchesBatchUpdate)
      
      // 保存在组件实例上以便可以在组件卸载时清除
      const intervalId = setInterval(() => {
        if (!isSocketConnected()) {
          console.log('检测到Socket连接已断开，尝试重新连接...');
          reconnect();
        }
      }, 5000); // 每5秒检查一次
      
      if (autoLoad.value) {
        loadMatches();
      }
      
      // 在组件销毁前清除定时器
      onBeforeUnmount(() => {
        if (intervalId) {
          clearInterval(intervalId);
        }
        offEvent('match-progress')
        offEvent('matches-batch-update')
        closeSocket()
      });
    });

    // 处理比赛详情进度更新
    const handleMatchProgressUpdate = (data) => {
      console.log('接收到比赛进度更新:', data);
      
      if (!data || !data.matchId) return;
      
      // 更新对应比赛的进度
      const matchIndex = localMatches.value.findIndex(m => m.id === data.matchId);
      if (matchIndex !== -1) {
        const match = localMatches.value[matchIndex];
        
        // 确保详细信息对象存在
        if (!match.details) {
          match.details = {
            status: 'inProgress',
            progress: 0,
            lastUpdated: new Date().toISOString()
          };
        }
        
        // 直接更新进度和状态，确保与后端同步
        match.details.progress = data.progress || 0;
        match.details.status = data.status || 'inProgress';
        match.details.lastUpdated = data.timestamp || new Date().toISOString();
        
        // 如果有消息，显示在控制台
        if (data.message) {
          console.log(`比赛ID ${data.matchId}: ${data.message}`);
          
          // 处理部分完成的状态，获取最新的部分数据
          if (data.status === 'partialCompleted') {
            // 仅获取最新的部分数据，不是完整的比赛详情
            fetchMatchDetail(data.matchId).then(updatedMatch => {
              if (updatedMatch) {
                // 更新本地数据
                const index = localMatches.value.findIndex(m => m.id === data.matchId);
                if (index !== -1) {
                  // 合并更新的部分数据，而不是完全替换
                  localMatches.value[index] = updatedMatch;
                  
                  // 如果这是当前选中的比赛，也更新选中的比赛
                  if (selectedMatchId.value === data.matchId) {
                    emit('match-updated', updatedMatch);
                  }
                  
                  console.log(`自动更新了比赛 ${data.matchId} 的部分数据: ${data.message}`);
                }
              }
            }).catch(error => {
              console.error('自动更新部分数据失败:', error);
            });
          }
          
          // 在界面上显示重要状态变化
          if (data.status === 'completed') {
            // 移除比赛完成的提示
            // ElMessage.success(`比赛 ${data.matchId}: ${data.message}`);
            
            // 如果爬取完成的比赛是当前选中的比赛，则刷新该比赛的详细数据
            if (selectedMatchId.value === data.matchId) {
              // 从后端获取最新的比赛详情
              fetchMatchDetail(data.matchId).then(updatedMatch => {
                if (updatedMatch) {
                  // 更新本地数据
                  const index = localMatches.value.findIndex(m => m.id === data.matchId);
                  if (index !== -1) {
                    localMatches.value[index] = updatedMatch;
                    // 更新选中的比赛
                    emit('match-selected', updatedMatch);
                    // 发出比赛更新事件
                    emit('match-updated', updatedMatch);
                    console.log('自动更新了当前选中比赛的详细数据:', data.matchId);
                  }
                }
              }).catch(error => {
                console.error('自动刷新比赛详情失败:', error);
              });
            } else {
              // 即使不是当前选中的比赛，也更新其详情数据
              fetchMatchDetail(data.matchId).then(updatedMatch => {
                if (updatedMatch) {
                  // 更新本地数据
                  const index = localMatches.value.findIndex(m => m.id === data.matchId);
                  if (index !== -1) {
                    localMatches.value[index] = updatedMatch;
                    // 发出比赛更新事件，但不切换选中的比赛
                    emit('match-updated', updatedMatch);
                    console.log('更新了比赛的详细数据:', data.matchId);
                  }
                }
              }).catch(error => {
                console.error('更新比赛详情失败:', error);
              });
            }
          } else if (data.status === 'failed') {
            // 移除比赛失败的提示
            // ElMessage.error(`比赛 ${data.matchId}: ${data.message}`);
          }
        }
        
        // 如果状态为completed，设置hasDetails为true
        if (data.status === 'completed') {
          match.hasDetails = true;
        }
        
        // 确保全局进度对象存在
        if (!window.matchProgressData) {
          window.matchProgressData = {};
        }
        if (!window.matchProgressData[data.matchId]) {
          window.matchProgressData[data.matchId] = {
            lastProgress: data.progress || 0,
            targetProgress: data.progress || 0,
            lastUpdated: new Date().getTime()
          };
        }
        
        // 直接使用后端的进度值，不使用平滑过渡
        window.matchProgressData[data.matchId].lastProgress = data.progress || 0;
        window.matchProgressData[data.matchId].targetProgress = data.progress || 0;
        window.matchProgressData[data.matchId].lastUpdated = new Date().getTime();
        
        // 强制更新视图
        console.log(`更新比赛 ${data.matchId} 的进度为 ${data.progress}%`);
        localMatches.value = [...localMatches.value];
      } else {
        console.warn(`未找到ID为 ${data.matchId} 的比赛，无法更新进度`);
      }
    };
    
    // 获取单场比赛的详细数据
    const fetchMatchDetail = async (matchId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/match-detail/${matchId}`);
        if (!response.ok) {
          throw new Error(`获取比赛详情失败: ${response.status} ${response.statusText}`);
        }
        const matchData = await response.json();
        
        console.log(`成功获取比赛 ${matchId} 的最新详情数据`);
        
        // 确保返回的数据包含必要的字段
        if (!matchData.id || !matchData.homeTeam || !matchData.awayTeam) {
          console.error('获取的比赛详情数据不完整:', matchData);
          throw new Error('比赛详情数据不完整');
        }
        
        return matchData;
      } catch (error) {
        console.error(`获取比赛 ${matchId} 详情失败:`, error);
        throw error;
      }
    };
    
    // 处理比赛批次更新
    const handleMatchesBatchUpdate = (data) => {
      console.log('接收到比赛更新:', data)
      
      if (!data || !data.matches) {
        console.error('无效的比赛数据')
        return
      }
      
      // 更新进度显示
      batchProcessing.value = {
        active: true,
        current: data.batchIndex,
        total: data.totalBatches,
        matchesLoaded: batchProcessing.value.matchesLoaded + data.matches.length,
        matchesCount: data.totalBatches
      }
      
      // 更新现有比赛或添加新比赛
      data.matches.forEach(newMatch => {
        const existingIndex = localMatches.value.findIndex(m => m.id === newMatch.id)
        if (existingIndex !== -1) {
          // 更新现有比赛
          localMatches.value[existingIndex] = { ...localMatches.value[existingIndex], ...newMatch }
        } else {
          // 添加新比赛
          localMatches.value.push(newMatch)
        }
      })
      
      // 每次接收到新的批次都实时更新父组件的比赛数量
      emit('crawl-matches', localMatches.value)
      
      // 如果这是最后一场比赛，设置爬取完成状态
      if (data.complete) {
        scraping.value = false
        batchProcessing.value.active = false
        // 移除爬取完成的提示
        // ElMessage.success(`爬取完成，共 ${batchProcessing.value.matchesLoaded} 场比赛`)
      }
      
      // 在所有比赛加载完成后将数据传递给父组件
      if (data.complete) {
        // 将比赛数据发送给父组件
        emit('crawl-matches', localMatches.value)
        
        // 如果没有爬取到比赛，确保清空选中状态
        if (localMatches.value.length === 0) {
          selectedMatchId.value = null
          emit('match-selected', null)
          console.log('爬取完成但没有比赛，清空选中状态')
        }
      }
    }

    const downloadExcel = (match) => {
      window.open(`http://localhost:8000/api/download-excel/${match.id}`, '_blank');
    };

    function refreshMatch(match) {
      refreshingId.value = match.id
      fetch(`${API_BASE_URL}/api/match-detail/${match.id}`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          refreshingId.value = null
          if (data.success) {
            ElMessage.success('刷新成功！')
            // 可选：刷新比赛数据
            loadMatches()
          } else {
            ElMessage.error(data.message || '刷新失败')
          }
        })
        .catch(() => {
          refreshingId.value = null
          ElMessage.error('网络错误，刷新失败')
        })
    }

    return {
      selectedMatchId,
      displayedMatches: computed(() => localMatches.value.length > 0 ? localMatches.value : props.matches),
      matchesByDate: computed(() => {
        const groupedMatches = {}
        
        // 删除按时间排序，改为使用原始顺序（即后端提供的文件顺序）
        const sortedMatches = [...localMatches.value]
        
        // 按日期分组
        sortedMatches.forEach(match => {
          try {
            // 跳过无效的比赛对象
            if (!match || !match.matchTime) return;
          
          let matchDate;
          let dateStr;
          
          // 使用后端提供的实际日期进行分组（如果存在）
          if (match.realMatchDate) {
            dateStr = match.realMatchDate;
              try {
            matchDate = new Date(dateStr);
                if (isNaN(matchDate.getTime())) {
                  // 如果日期无效，使用当前日期
                  matchDate = new Date();
                  dateStr = format(matchDate, 'yyyy-MM-dd');
                }
              } catch (e) {
                matchDate = new Date();
                dateStr = format(matchDate, 'yyyy-MM-dd');
              }
          } else {
            // 否则使用常规解析
              try {
            matchDate = new Date(parseChineseDateTime(match.matchTime));
                if (isNaN(matchDate.getTime())) {
                  matchDate = new Date();
                }
                dateStr = format(matchDate, 'yyyy-MM-dd');
              } catch (e) {
                matchDate = new Date();
            dateStr = format(matchDate, 'yyyy-MM-dd');
              }
          }
          
          if (!groupedMatches[dateStr]) {
            groupedMatches[dateStr] = [];
          }
          
          groupedMatches[dateStr].push(match);
          } catch (error) {
            console.error('比赛分组错误:', error);
          }
        })
        
        return groupedMatches;
      }),
      defaultLogoBase64,
      selectMatch,
      formatDate: (dateString) => {
        if (!dateString) return ''
        const date = new Date(parseChineseDateTime(dateString))
        return date.toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      },
      formatDateHeader: (dateStr) => {
        try {
          const date = new Date(parseChineseDateTime(dateStr))
          
          // 判断是今天、明天或昨天
          if (isToday(date)) {
            return '今天 ' + format(date, 'M月d日 EEEE', { locale: zhCN })
          } else if (isTomorrow(date)) {
            return '明天 ' + format(date, 'M月d日 EEEE', { locale: zhCN })
          } else if (isYesterday(date)) {
            return '昨天 ' + format(date, 'M月d日 EEEE', { locale: zhCN })
          }
          
          // 一般格式
          return format(date, 'yyyy年M月d日 EEEE', { locale: zhCN })
        } catch (error) {
          console.error('日期格式化错误:', error)
          return dateStr
        }
      },
      formatTime: (dateString) => {
        if (!dateString) return '';
        
        // 检查是否包含时间范围
        const timeRangeMatch = dateString.match(/（(\d{1,2}:\d{2})\s+-\s+(次日)?(\d{1,2}:\d{2})）/);
        if (timeRangeMatch) {
          const startTime = timeRangeMatch[1];
          const isNextDay = timeRangeMatch[2];
          const endTime = timeRangeMatch[3];
          return `${startTime} - ${isNextDay || ''}${endTime}`;
        }
        
        // 常规时间格式
        const date = new Date(parseChineseDateTime(dateString));
        if (isNaN(date.getTime())) {
          // 如果日期无效，尝试直接提取时间部分
          const timeMatch = dateString.match(/\d{1,2}:\d{2}/);
          return timeMatch ? timeMatch[0] : dateString;
        }
        
        return date.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit'
        });
      },
      isSelected: (match) => selectedMatchId.value === match.id,
      getTeamLogo,
      calculateProgressPercentage,
      getDetailProgress,
      getProgressStatus,
      scraping,
      scrapeMatches,
      clearMatches,
      loadMatches,
      downloadExcel,
      refreshingId,
      refreshMatch,
      isMatchCompleted: (match) => {
        // 进度为100或状态为completed才可用
        return match.details && (match.details.progress === 100 || match.details.status === 'completed');
      }
    }
  }
}
</script>

<style scoped>
.match-list {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #ebeef5;
  background-color: #f5f7fa;
  flex-shrink: 0;
}

.list-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: #303133;
  font-size: 1.1rem;
}

.list-actions {
  margin-left: auto;
}

/* 内容区域 - 单一滚动容器 */
.match-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  height: calc(100% - 80px); /* 减去header高度 */
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
}

.match-items {
  padding: 12px;
}

/* 日期分组样式 */
.match-date-group {
  margin-bottom: 20px;
}

.date-header {
  padding: 6px 10px;
  margin-bottom: 8px;
  background-color: #f0f2f5;
  border-radius: 4px;
  font-weight: 600;
  color: #606266;
  font-size: 0.9rem;
}

.match-item {
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 8px;
  background-color: #f5f7fa;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  border-left: 4px solid #d0d7de;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.match-item:hover {
  background-color: #ecf5ff;
  border-left-color: #409eff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.match-item.active {
  background-color: #ecf5ff;
  border-left-color: #409eff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.match-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.match-league {
  font-size: 0.85rem;
  font-weight: 600;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 5px;
}

.match-time-status {
  font-size: 0.85rem;
  color: #909399;
}

.match-teams-container {
  display: grid;
  grid-template-columns: 1fr auto auto auto 1fr;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.team-name {
  text-align: center;
  font-size: 0.9rem;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.home-name {
  text-align: right;
}

.away-name {
  text-align: left;
}

.team-logo {
  border: 1px solid #ebeef5;
  background-color: white;
}

.match-score {
  font-weight: 600;
  font-size: 1rem;
  color: #303133;
  padding: 0 5px;
}

.no-score {
  color: #909399;
}

.match-venue-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #909399;
  margin-top: 10px;
}

.venue-details, .weather-details {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 添加详细信息爬取进度条 */
.details-progress-container {
  margin-top: 10px;
  margin-bottom: 10px;
  position: relative;
}

.details-progress-bar {
  width: 100%;
  height: 10px;
}

.progress-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}

.progress-btn-group {
  display: flex;
  align-items: center;
}

.excel-download-btn {
  margin-right: 4px;
  background: #21c55d !important;
  border-color: #21c55d !important;
  color: #fff !important;
}

.excel-download-btn:hover {
  background: #13ae46 !important;
  border-color: #13ae46 !important;
  color: #fff !important;
}

.refresh-btn {
  margin-right: 0;
  margin-left: 4px;
  background: #409eff !important;
  border-color: #409eff !important;
  color: #fff !important;
}

.refresh-btn:hover {
  background: #337ecc !important;
  border-color: #337ecc !important;
  color: #fff !important;
}

.progress-id-label {
  font-size: 0.75rem;
  color: #909399;
  margin-top: 4px;
  text-align: right;
}

/* 底部间距，确保最后内容可见 */
.bottom-spacer {
  height: 40px;
  width: 100%;
}
</style> 