<template>
  <div class="match-detail">
    <div v-if="!match" class="no-match-selected">
      <el-empty description="请选择一场比赛" />
    </div>
    
    <template v-else>
      <!-- 简化的比赛头部信息 -->
      <div class="simplified-match-header">
        <div class="team-container">
          <div class="team home">
            <img class="team-logo" :src="getTeamLogo(match.homeTeam?.logo)" :alt="match.homeTeam?.name">
            <div class="team-name">{{ match.homeTeam?.name }}</div>
          </div>
          
          <div class="score-display">
            <div class="match-score">
              <span class="score-number">{{ match.homeScore !== null && match.homeScore !== undefined ? match.homeScore : '--' }}</span>
              <span class="score-separator">:</span>
              <span class="score-number">{{ match.awayScore !== null && match.awayScore !== undefined ? match.awayScore : '--' }}</span>
            </div>
          </div>
          
          <div class="team away">
            <img class="team-logo" :src="getTeamLogo(match.awayTeam?.logo)" :alt="match.awayTeam?.name">
            <div class="team-name">{{ match.awayTeam?.name }}</div>
          </div>
        </div>
      </div>
      
      <!-- 数据标签栏 -->
      <el-tabs v-model="activeTab" class="match-tabs" type="border-card" @tab-change="handleTabChange">
        <el-tab-pane label="基本信息" name="summary">
          <div class="basic-info-container">
            <div class="basic-info-content">
              <div class="info-section">
                <div class="section-title">比赛基本信息</div>
                <div class="info-item">
                  <span class="info-label">主队名：</span>
                  <span class="info-value home-team">{{ match.homeTeam?.name }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">客队名：</span>
                  <span class="info-value away-team">{{ match.awayTeam?.name }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">球场名称：</span>
                  <span class="info-value">{{ match.venue || '-' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">比赛天气：</span>
                  <span class="info-value">{{ match.weather || '-' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">比赛时间：</span>
                  <span class="info-value">{{ formatDate(match.matchTime) }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">比赛温度：</span>
                  <span class="info-value">{{ match.temperature ? match.temperature : '-' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">主队排名：</span>
                  <span class="info-value">{{ getTeamRank('home') }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">客队排名：</span>
                  <span class="info-value">{{ getTeamRank('away') }}</span>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="欧赔初盘" name="europeInitial">
          <div v-if="!getOddsData('europeInitial').length" class="no-data">
            <el-empty description="暂无欧赔初盘数据" />
          </div>
          <div v-else class="euro-odds-container scrollable-table-container">
            <el-table 
              :data="getOddsData('europeInitial')" 
              stripe 
              border 
              style="width: 100%; height: 100%;" 
              header-align="center" 
              cell-align="center" 
              :table-layout="'fixed'" 
              v-if="tablesReady"
              class="europe-odds-table"
            >
              <el-table-column 
                prop="company" 
                label="博彩公司" 
                rowspan="2" 
                width="120" 
                align="center" 
                fixed
                class-name="company-column"
              />
              
              <el-table-column label="赔率" align="center">
                <el-table-column prop="homeOdds" label="主队" width="auto" align="center">
                  <template #default="scope">
                    {{ formatNumber(scope.row.homeOdds) }}
                  </template>
                </el-table-column>
                <el-table-column prop="drawOdds" label="和" width="auto" align="center">
                  <template #default="scope">
                    {{ formatNumber(scope.row.drawOdds) }}
                  </template>
                </el-table-column>
                <el-table-column prop="awayOdds" label="客队" width="auto" align="center">
                  <template #default="scope">
                    {{ formatNumber(scope.row.awayOdds) }}
                  </template>
                </el-table-column>
              </el-table-column>
              
              <el-table-column label="概率" align="center">
                <el-table-column prop="homeWinRate" label="主队" width="auto" align="center">
                  <template #default="scope">
                    {{ formatNumber(scope.row.homeWinRate) }}
                  </template>
                </el-table-column>
                <el-table-column prop="drawRate" label="和" width="auto" align="center">
                  <template #default="scope">
                    {{ formatNumber(scope.row.drawRate) }}
                  </template>
                </el-table-column>
                <el-table-column prop="awayWinRate" label="客队" width="auto" align="center">
                  <template #default="scope">
                    {{ formatNumber(scope.row.awayWinRate) }}
                  </template>
                </el-table-column>
              </el-table-column>
              
              <el-table-column prop="returnRate" label="返还率" rowspan="2" width="auto" align="center">
                <template #default="scope">
                  {{ formatNumber(scope.row.returnRate) }}
                </template>
              </el-table-column>
              
              <el-table-column label="凯利指数" align="center">
                <el-table-column prop="homeKellyIndex" label="主队" width="auto" align="center">
                  <template #default="scope">
                    {{ formatNumber(scope.row.homeKellyIndex) }}
                  </template>
                </el-table-column>
                <el-table-column prop="drawKellyIndex" label="和" width="auto" align="center">
                  <template #default="scope">
                    {{ formatNumber(scope.row.drawKellyIndex) }}
                  </template>
                </el-table-column>
                <el-table-column prop="awayKellyIndex" label="客队" width="auto" align="center">
                  <template #default="scope">
                    {{ formatNumber(scope.row.awayKellyIndex) }}
                  </template>
                </el-table-column>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="欧赔即时盘" name="europeLive">
          <div v-if="!getOddsData('europeLive').length" class="no-data">
            <el-empty description="暂无欧赔即时盘数据" />
          </div>
          <div v-else class="euro-odds-container scrollable-table-container">
            <el-table 
              :data="getOddsData('europeLive')" 
              stripe 
              border 
              style="width: 100%; height: 100%;" 
              header-align="center" 
              cell-align="center" 
              :table-layout="'fixed'" 
              v-if="tablesReady" 
              class="europe-odds-table"
            >
              <el-table-column 
                prop="company" 
                label="博彩公司" 
                rowspan="2" 
                width="120" 
                align="center" 
                fixed
                class-name="company-column"
              />
              
              <el-table-column label="赔率" align="center">
                <el-table-column prop="homeOdds" label="主队" width="auto" align="center">
                  <template #default="scope">
                    {{ formatNumber(scope.row.homeOdds) }}
                  </template>
                </el-table-column>
                <el-table-column prop="drawOdds" label="和" width="auto" align="center">
                  <template #default="scope">
                    {{ formatNumber(scope.row.drawOdds) }}
                  </template>
                </el-table-column>
                <el-table-column prop="awayOdds" label="客队" width="auto" align="center">
                  <template #default="scope">
                    {{ formatNumber(scope.row.awayOdds) }}
                  </template>
                </el-table-column>
              </el-table-column>
              
              <el-table-column label="概率" align="center">
                <el-table-column prop="homeWinRate" label="主队" width="auto" align="center">
                  <template #default="scope">
                    {{ formatNumber(scope.row.homeWinRate) }}
                  </template>
                </el-table-column>
                <el-table-column prop="drawRate" label="和" width="auto" align="center">
                  <template #default="scope">
                    {{ formatNumber(scope.row.drawRate) }}
                  </template>
                </el-table-column>
                <el-table-column prop="awayWinRate" label="客队" width="auto" align="center">
                  <template #default="scope">
                    {{ formatNumber(scope.row.awayWinRate) }}
                  </template>
                </el-table-column>
              </el-table-column>
              
              <el-table-column prop="returnRate" label="返还率" rowspan="2" width="auto" align="center">
                <template #default="scope">
                  {{ formatNumber(scope.row.returnRate) }}
                </template>
              </el-table-column>
              
              <el-table-column label="凯利指数" align="center">
                <el-table-column prop="homeKellyIndex" label="主队" width="auto" align="center">
                  <template #default="scope">
                    {{ formatNumber(scope.row.homeKellyIndex) }}
                  </template>
                </el-table-column>
                <el-table-column prop="drawKellyIndex" label="和" width="auto" align="center">
                  <template #default="scope">
                    {{ formatNumber(scope.row.drawKellyIndex) }}
                  </template>
                </el-table-column>
                <el-table-column prop="awayKellyIndex" label="客队" width="auto" align="center">
                  <template #default="scope">
                    {{ formatNumber(scope.row.awayKellyIndex) }}
                  </template>
                </el-table-column>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="亚让盘" name="asiaHandicap">
          <div v-if="!getOddsData('asiaHandicap').length" class="no-data">
            <el-empty description="暂无亚让盘数据" />
          </div>
          <div v-else class="asia-odds-container scrollable-table-container">
            <el-table 
              :data="getOddsData('asiaHandicap')" 
              stripe 
              border 
              style="width: 100%; height: 100%;" 
              header-align="center" 
              cell-align="center"
              :table-layout="'fixed'"
              v-if="tablesReady"
              :row-class-name="getAsiaOddsRowClass"
              class="asia-odds-table"
            >
              <el-table-column 
                prop="company" 
                label="博彩公司" 
                width="120" 
                align="center" 
                fixed 
                class-name="company-column"
              />
              <el-table-column prop="initialHomeOdds" label="初盘主队" width="auto" align="center">
                <template #default="scope">
                  {{ formatNumber(scope.row.initialHomeOdds) }}
                </template>
              </el-table-column>
              <el-table-column prop="initialHandicap" label="初盘" width="auto" align="center" />
              <el-table-column prop="initialAwayOdds" label="初盘客队" width="auto" align="center">
                <template #default="scope">
                  {{ formatNumber(scope.row.initialAwayOdds) }}
                </template>
              </el-table-column>
              <el-table-column prop="liveHomeOdds" label="即时盘主队" width="auto" align="center">
                <template #default="scope">
                  {{ formatNumber(scope.row.liveHomeOdds) }}
                </template>
              </el-table-column>
              <el-table-column prop="liveHandicap" label="即时盘" width="auto" align="center" />
              <el-table-column prop="liveAwayOdds" label="即时盘客队" width="auto" align="center">
                <template #default="scope">
                  {{ formatNumber(scope.row.liveAwayOdds) }}
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="主队比赛历史" name="homeHistory">
          <div v-if="!getHistoryData('homeHistory').length" class="no-data">
            <el-empty description="暂无主队历史数据" />
          </div>
          <div v-else class="team-history-container">
            <el-table :data="getHistoryData('homeHistory')" stripe border style="width: 100%" header-align="center" cell-align="center" :table-layout="'fixed'" v-if="tablesReady" class="history-table">
              <el-table-column prop="league" label="联赛类型" width="120" align="center" />
              <el-table-column prop="date" label="日期" width="100" align="center" />
              <el-table-column prop="homeTeam" label="主场" width="150" align="center" />
              <el-table-column prop="score" label="比分" width="80" align="center">
                <template #default="scope">
                  {{ scope.row.score }}
                </template>
              </el-table-column>
              <el-table-column prop="halfTimeScore" label="半场" width="80" align="center">
                <template #default="scope">
                  {{ scope.row.halfTimeScore }}
                </template>
              </el-table-column>
              <el-table-column prop="corner" label="角球" width="80" align="center" />
              <el-table-column prop="awayTeam" label="客场" width="150" align="center" />
              <el-table-column prop="result" label="胜负" width="80" align="center">
                <template #default="scope">
                  <el-tag 
                    :type="scope.row.result === '胜' ? 'success' : (scope.row.result === '负' ? 'danger' : 'warning')" 
                    size="small"
                  >
                    {{ scope.row.result }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="handicap" label="盘口" width="90" align="center" />
              <el-table-column prop="handicapResult" label="让球" width="80" align="center" />
              <el-table-column prop="goalResult" label="进球数" width="80" align="center" />
            </el-table>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="客队比赛历史" name="awayHistory">
          <div v-if="!getHistoryData('awayHistory').length" class="no-data">
            <el-empty description="暂无客队历史数据" />
          </div>
          <div v-else class="team-history-container">
            <el-table :data="getHistoryData('awayHistory')" stripe border style="width: 100%" header-align="center" cell-align="center" :table-layout="'fixed'" v-if="tablesReady" class="history-table">
              <el-table-column prop="league" label="联赛类型" width="120" align="center" />
              <el-table-column prop="date" label="日期" width="100" align="center" />
              <el-table-column prop="homeTeam" label="主场" width="150" align="center" />
              <el-table-column prop="score" label="比分" width="80" align="center">
                <template #default="scope">
                  {{ scope.row.score }}
                </template>
              </el-table-column>
              <el-table-column prop="halfTimeScore" label="半场" width="80" align="center">
                <template #default="scope">
                  {{ scope.row.halfTimeScore }}
                </template>
              </el-table-column>
              <el-table-column prop="corner" label="角球" width="80" align="center" />
              <el-table-column prop="awayTeam" label="客场" width="150" align="center" />
              <el-table-column prop="result" label="胜负" width="80" align="center">
                <template #default="scope">
                  <el-tag 
                    :type="scope.row.result === '胜' ? 'success' : (scope.row.result === '负' ? 'danger' : 'warning')" 
                    size="small"
                  >
                    {{ scope.row.result }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="handicap" label="盘口" width="90" align="center" />
              <el-table-column prop="handicapResult" label="让球" width="80" align="center" />
              <el-table-column prop="goalResult" label="进球数" width="80" align="center" />
            </el-table>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="两队交锋历史" name="headToHead">
          <div v-if="!getHistoryData('headToHead').length" class="no-data">
            <el-empty description="暂无交锋历史数据" />
          </div>
          <div v-else class="head-to-head-container">
            <el-table 
              :data="getHistoryData('headToHead')" 
              stripe 
              border 
              style="width: 100%; height: 100%;" 
              header-align="center" 
              cell-align="center" 
              :table-layout="'fixed'" 
              v-if="tablesReady" 
              class="history-table"
            >
              <el-table-column prop="league" label="联赛类型" width="120" align="center" />
              <el-table-column prop="date" label="日期" width="100" align="center" />
              <el-table-column prop="homeTeam" label="主场" width="150" align="center" />
              <el-table-column prop="score" label="比分" width="80" align="center">
                <template #default="scope">
                  {{ scope.row.score }}
                </template>
              </el-table-column>
              <el-table-column prop="halfTimeScore" label="半场" width="80" align="center">
                <template #default="scope">
                  {{ scope.row.halfTimeScore }}
                </template>
              </el-table-column>
              <el-table-column prop="corner" label="角球" width="80" align="center" />
              <el-table-column prop="awayTeam" label="客场" width="150" align="center" />
              <el-table-column prop="result" label="胜负" width="80" align="center">
                <template #default="scope">
                  <el-tag 
                    :type="scope.row.result === '胜' ? 'success' : (scope.row.result === '负' ? 'danger' : 'warning')" 
                    size="small"
                  >
                    {{ scope.row.result }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="handicap" label="盘口" width="90" align="center" />
              <el-table-column prop="handicapResult" label="让球" width="80" align="center" />
              <el-table-column prop="goalResult" label="进球数" width="80" align="center" />
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </template>
  </div>
</template>

<script>
import { ref, watch, nextTick, onMounted } from 'vue'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// 使用简单的base64占位图像，而不是导入文件
const defaultLogoBase64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDgwIDgwIiBmaWxsPSJub25lIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiNFMUU4RUQiLz48cGF0aCBkPSJNNDAgMzBDMzQuNDc3MSAzMCAzMCAzNC40NzcxIDMwIDQwQzMwIDQ1LjUyMjkgMzQuNDc3MSA1MCA0MCA1MEM0NS41MjI5IDUwIDUwIDQ1LjUyMjkgNTAgNDBDNTAgMzQuNDc3MSA0NS41MjI5IDMwIDQwIDMwWk00MCA0OEM1OS4zMyA0OCA1NCA1Ni41IDU0IDU2LjVIMjZDMjYgNTYuNSAyMC42NyA0OCA0MCA0OFoiIGZpbGw9IiNBM0IxQzYiLz48L3N2Zz4='

export default {
  name: 'MatchDetail',
  props: {
    match: {
      type: Object,
      default: null
    }
  },
  setup(props) {
    const activeTab = ref('summary')
    const tablesReady = ref(false)
    
    // 切换标签页时，确保表格正确渲染
    const handleTabChange = () => {
      tablesReady.value = false
      nextTick(() => {
        tablesReady.value = true
      })
    }
    
    // 初始化表格
    onMounted(() => {
      nextTick(() => {
        tablesReady.value = true
      })
    })
    
    // 监听切换比赛
    watch(() => props.match, (newMatch) => {
      // 确保新比赛对象存在且包含必要字段
      if (newMatch && newMatch.homeTeam && newMatch.homeTeam.name && 
          newMatch.awayTeam && newMatch.awayTeam.name) {
        // 比赛切换后，重新渲染表格
        tablesReady.value = false
        nextTick(() => {
          tablesReady.value = true
        })
      }
    })
    
    // 获取队徽图片路径
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
      
      return defaultLogoBase64
    }
    
    // 格式化日期
    const formatDate = (dateStr) => {
      if (!dateStr) return '-'
      try {
        const date = new Date(dateStr)
        return format(date, 'yyyy-MM-dd HH:mm', { locale: zhCN })
      } catch (e) {
        return dateStr
      }
    }
    
    // 获取球队排名
    const getTeamRank = (team) => {
      if (!props.match) return '-';
      
      // 从rankings对象获取排名信息
      if (props.match.rankings && team === 'home' && props.match.rankings.homeTeam) {
        const rank = props.match.rankings.homeTeam.rank;
        const points = props.match.rankings.homeTeam.points;
        
        if (rank && points) {
          return `${rank}名 (${points}分)`;
        } else if (rank) {
          return `${rank}名`;
        }
      } else if (props.match.rankings && team === 'away' && props.match.rankings.awayTeam) {
        const rank = props.match.rankings.awayTeam.rank;
        const points = props.match.rankings.awayTeam.points;
        
        if (rank && points) {
          return `${rank}名 (${points}分)`;
        } else if (rank) {
          return `${rank}名`;
        }
      }
      
      // 兼容旧版数据格式
      return team === 'home' ? 
        (props.match.homeRank || '-') : 
        (props.match.awayRank || '-');
    }
    
    // 获取赔率数据，确保字段不存在时返回空数组
    const getOddsData = (oddsType) => {
      if (!props.match) return [];
      // 检查嵌套字段是否存在
      if (props.match.details && props.match.details.odds && props.match.details.odds[oddsType]) {
        return props.match.details.odds[oddsType] || [];
      }
      // 兼容旧结构，尝试从根级别读取（备用）
      return props.match[oddsType] || [];
    }
    
    // 获取历史数据，确保字段不存在时返回空数组
    const getHistoryData = (historyType) => {
      if (!props.match) return [];
      // 检查嵌套字段是否存在
      if (props.match.details && props.match.details.history && props.match.details.history[historyType]) {
        return props.match.details.history[historyType] || [];
      }
      // 兼容旧结构，尝试从根级别读取（备用）
      return props.match[historyType] || [];
    }
    
    // 获取比赛结果
    const getMatchResult = (match, teamName) => {
      if (!match || !match.scoreWithHalf) {
        // 检查是否有原始score和halfScore字段
        if (!match || !match.score) return '-';
        
        // 从score字段构建评估
        const [homeScore, awayScore] = match.score.split(':').map(s => parseInt(s));
        
        // 判断该队是主队还是客队
        const isHomeTeam = match.homeTeam === teamName;
        
        if (isHomeTeam) {
          if (homeScore > awayScore) return '胜';
          if (homeScore < awayScore) return '负';
          return '平';
        } else {
          if (homeScore < awayScore) return '胜';
          if (homeScore > awayScore) return '负';
          return '平';
        }
      }
      
      // 原始逻辑保持不变，使用scoreWithHalf
      const [score] = match.scoreWithHalf.split(' ');
      const [homeScore, awayScore] = score.split(':').map(s => parseInt(s));
      
      // 判断该队是主队还是客队
      const isHomeTeam = match.homeTeam === teamName;
      
      if (isHomeTeam) {
        if (homeScore > awayScore) return '胜';
        if (homeScore < awayScore) return '负';
        return '平';
      } else {
        if (homeScore < awayScore) return '胜';
        if (homeScore > awayScore) return '负';
        return '平';
      }
    }
    
    // 获取结果标签类型
    const getMatchResultType = (match, teamName) => {
      const result = getMatchResult(match, teamName)
      if (result === '胜') return 'success'
      if (result === '负') return 'danger'
      return 'warning' // 平局
    }
    
    // 获取两队交锋统计信息
    const getH2HStats = () => {
      if (!props.match || !getHistoryData('headToHead').length ||
          !props.match.homeTeam || !props.match.homeTeam.name) {
        return { homeWins: 0, draws: 0, awayWins: 0 }
      }
      
      const stats = {
        homeWins: 0,
        draws: 0,
        awayWins: 0
      }
      
      getHistoryData('headToHead').forEach(game => {
        // 检查是否有score字段
        if (!game || !game.score) return;
        
        let homeScore, awayScore;
        
        [homeScore, awayScore] = game.score.split('-').map(Number);
        
        if (homeScore === awayScore) {
          stats.draws++
        } else if (
          (game.homeTeam === props.match.homeTeam.name && homeScore > awayScore) ||
          (game.awayTeam === props.match.homeTeam.name && awayScore > homeScore)
        ) {
          stats.homeWins++
        } else {
          stats.awayWins++
        }
      })
      
      return stats
    }

    // 修改格式化数值函数，强制保留两位小数
    const formatNumber = (value) => {
      if (value === null || value === undefined) return '';
      // 对数值类型强制保留两位小数
      if (typeof value === 'number') {
        return value.toFixed(2);
      }
      return value;
    };

    // 获取亚让盘表格行类名
    const getAsiaOddsRowClass = (row) => {
      // 根据isMaxValue或isMinValue属性检查是否是最大值或最小值行
      if (row.row.isMaxValue || row.row.isMinValue) {
        return 'yellow-bg-row';
      }
      return '';
    };

    return {
      activeTab,
      tablesReady,
      formatDate,
      handleTabChange,
      getMatchResult,
      getMatchResultType,
      defaultLogoBase64,
      getH2HStats,
      getTeamRank,
      getOddsData,
      getHistoryData,
      getTeamLogo,
      formatNumber,
      getAsiaOddsRowClass
    }
  }
}
</script>

<style scoped>
.match-detail {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow: hidden;
  max-width: 100%; /* 确保不超出父容器 */
}

.no-match-selected {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.simplified-match-header {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.team-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.team {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 35%;
}

.team-logo {
  width: 60px;
  height: 60px;
  margin-bottom: 10px;
  border-radius: 50%;
  object-fit: contain;
  background-color: #fff;
  padding: 5px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.team-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.team-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #303133;
  text-align: center;
}

.score-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.match-score {
  font-size: 2.5rem;
  font-weight: 700;
  color: #303133;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
}

.score-number {
  min-width: 30px;
  text-align: center;
}

.score-separator {
  margin: 0 10px;
  color: #909399;
}

.match-status {
  font-size: 0.9rem;
  color: #606266;
  text-align: center;
}

.match-tabs {
  flex: 1;
  overflow: hidden;
  margin-top: 20px;
}

/* 设置tab-pane的样式，避免其内容滚动 */
:deep(.el-tabs__content) {
  height: calc(100vh - 250px);
  overflow: hidden;
}

:deep(.el-tab-pane) {
  height: 100%;
  overflow: hidden;
}

.no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30px 0;
  background-color: #fafafa;
}

.basic-info-container, 
.euro-odds-container, 
.asia-odds-container, 
.team-history-container,
.head-to-head-container {
  padding: 15px;
  height: 100%;
  position: relative;
  /* 移除这里的max-height限制 */
  overflow: hidden;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 15px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.h2h-summary {
  margin-bottom: 20px;
}

.h2h-header {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.h2h-stats {
  display: flex;
  justify-content: space-around;
  padding: 15px 0;
}

.h2h-stat {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 5px;
}

.stat-value.home-wins {
  color: #67c23a;
}

.stat-value.draws {
  color: #909399;
}

.stat-value.away-wins {
  color: #f56c6c;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

/* 基本信息文本布局样式 */
.basic-info-content {
  padding: 20px;
  background-color: #f9fafc;
  border-radius: 8px;
}

.info-section {
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  margin-bottom: 10px;
  font-size: 14px;
  line-height: 1.5;
}

.info-label {
  width: 90px;
  color: #606266;
  font-weight: 500;
}

.info-value {
  flex: 1;
  color: #303133;
}

.info-divider {
  height: 1px;
  background-color: #ebeef5;
  margin: 20px 0;
}

.teams-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.team-detail {
  width: 45%;
  background-color: #fff;
  padding: 15px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.team-detail-header {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 10px;
  text-align: center;
  padding-bottom: 5px;
  border-bottom: 1px dashed #ebeef5;
}

.vs-divider {
  align-self: center;
  font-size: 18px;
  font-weight: bold;
  color: #909399;
  margin: 0 10px;
}

.home-team {
  color: #409eff;
  font-weight: 600;
}

.away-team {
  color: #67c23a;
  font-weight: 600;
}

.info-value.score {
  font-weight: bold;
  font-size: 16px;
  color: #f56c6c;
}

.stat-value-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-value {
  font-weight: 600;
}

.stat-value.home {
  color: #409eff;
}

.stat-value.away {
  color: #67c23a;
}

.stat-separator {
  color: #909399;
}

.scrollable-table-container {
  padding: 0;
  margin: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.scrollable-table-container .el-table {
  margin-bottom: 0; /* 移除底部外边距 */
  height: 100%;
}

/* 确保fixed列正常显示 */
:deep(.el-table__fixed) {
  height: 100% !important; /* 确保固定列高度与表格一致 */
  z-index: 2;
  box-shadow: 6px 0 6px -4px rgba(0, 0, 0, 0.15);
}

/* 确保表格主体可以滚动，而不是整个容器 */
:deep(.el-table__body-wrapper) {
  overflow-y: auto;
  height: calc(100% - 40px); /* 减去表头高度 */
  max-height: none; /* 移除最大高度限制 */
}

/* 黄色背景行样式 */
:deep(.yellow-bg-row) {
  background-color: #fffbe5;
}

:deep(.yellow-bg-row td) {
  text-align: center;
  font-weight: bold;
}

/* 亚盘表格样式 */
.asia-odds-table {
  width: 100%;
}

.asia-odds-table :deep(.el-table__header-wrapper) {
  background-color: #f5f7fa;
}

.asia-odds-table :deep(.company-column) {
  min-width: 100px;
  font-weight: bold;
}

/* 新增的欧洲赔率表格样式 */
.europe-odds-table {
  width: 100%;
}

.europe-odds-table :deep(.el-table__header-wrapper) {
  background-color: #f5f7fa;
}

.europe-odds-table :deep(.company-column) {
  min-width: 100px;
  font-weight: bold;
}

/* 为历史数据表格设置样式，使表头固定 */
:deep(.el-table--border) {
  max-height: 500px;
}

:deep(.el-table__header-wrapper) {
  position: sticky;
  top: 0;
  z-index: 2;
}

:deep(.el-table__body) {
  /* 确保表格内容可以滚动 */
  overflow: auto;
}

/* 设置表格行的悬停效果 */
:deep(.el-table .el-table__row:hover > td) {
  background-color: #f5f7fa !important;
}

/* 黄色背景行（用于亚洲赔率最大/最小值） */
:deep(.yellow-bg-row td) {
  background-color: rgba(255, 230, 156, 0.3) !important;
}

.history-table {
  width: 100%;
  table-layout: fixed;
}

.history-table :deep(th.el-table__cell) {
  background-color: #f5f7fa;
  font-weight: 600;
}

.history-table :deep(.el-table__header) {
  width: 100% !important;
}

.history-table :deep(.el-table__body) {
  width: 100% !important;
}

/* 确保表格撑满容器 */
.team-history-container, 
.head-to-head-container,
.euro-odds-container,
.asia-odds-container {
  width: 100%;
  overflow-x: auto;
}

/* 欧赔和亚盘表格样式统一 */
.europe-odds-table,
.asia-odds-table {
  width: 100%;
  table-layout: fixed;
}

.europe-odds-table :deep(.company-column),
.asia-odds-table :deep(.company-column) {
  font-weight: bold;
  background-color: #f5f7fa;
}

/* 新增样式以确保表格占满容器 */
.euro-odds-container :deep(.el-table),
.asia-odds-container :deep(.el-table) {
  width: 100% !important;
}

.euro-odds-container :deep(.el-table__header),
.asia-odds-container :deep(.el-table__header),
.euro-odds-container :deep(.el-table__body),
.asia-odds-container :deep(.el-table__body) {
  display: table;
  width: 100% !important;
  table-layout: fixed !important;
}

/* 调整el-table-column的宽度分配，确保平均分配 */
:deep(.el-table__header) th {
  background-color: #f5f7fa !important;
  font-weight: 600 !important;
  text-align: center !important;
}

/* 确保内容区域填满父容器 */
.match-detail {
  overflow: hidden;
  padding: 15px;
  box-sizing: border-box;
  max-width: 100%;
  width: 100%;
  height: 100vh;
}

.match-tabs {
  width: 100%;
  margin-top: 20px;
  height: calc(100% - 100px);
  overflow: hidden;
}

:deep(.el-tabs__content) {
  height: calc(100% - 40px); /* 减去标签页头部高度 */
  overflow: hidden;
}

/* 确保表格内容不会溢出 */
:deep(.el-table) {
  overflow: visible !important;
  height: 100%;
}

:deep(.el-table__body-wrapper) {
  overflow-x: auto !important;
  overflow-y: auto !important;
}

/* 移除最大高度限制，使用容器高度替代 */
.europe-odds-table,
.asia-odds-table,
.history-table {
  max-height: none !important;
  height: 100%;
}

/* 确保表格容器占满整个tab-pane空间 */
.euro-odds-container, 
.asia-odds-container, 
.team-history-container,
.head-to-head-container {
  height: 100% !important;
  padding: 0;
}
</style> 