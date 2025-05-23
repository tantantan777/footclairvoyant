<template>
  <div class="chat-box">
    <div class="chat-header">
      <div class="football-icon">{{ settings.agent.emoji }}</div>
      <h3>{{ settings.agent.name }}</h3>
    </div>
    
    <div class="chat-messages" ref="messagesContainer">
      <div 
        v-for="(message, index) in messages" 
        :key="index"
        class="message"
        :class="{ 'user-message': message.type === 'user', 'ai-message': message.type === 'ai' }"
      >
        <div class="message-avatar">
          <el-avatar 
            :icon="message.type === 'user' ? User : undefined" 
            :size="32" 
            :class="message.type === 'user' ? 'user-avatar' : 'ai-avatar'"
          >
            <template v-if="message.type === 'ai' && loading && !message.text">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
            </template>
            <template v-else>
              <span v-html="formatMessageText(message.text)"></span>
            </template>
          </el-avatar>
        </div>
        <div class="message-content">
          <div class="message-text">
            <template v-if="message.type === 'ai' && loading && !message.text">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
            </template>
            <template v-else>
              <span v-html="formatMessageText(message.text)"></span>
            </template>
          </div>
          <div class="message-time">{{ formatMessageTime(message.timestamp) }}</div>
        </div>
      </div>
    </div>
    
    <div class="chat-input">
      <el-input
        v-model="userInput"
        type="textarea"
        placeholder="输入您的问题..."
        :autosize="{ minRows: 1, maxRows: 4 }"
        @keydown.enter="onInputEnter"
        :disabled="loading"
        class="input-with-button"
      >
      </el-input>
      <el-button 
        :icon="Setting" 
        circle 
        type="info" 
        text
        @click="showSettings = true"
        class="settings-button settings-in-input"
      ></el-button>
    </div>
    
    <!-- 设置更改提示 -->
    <div v-if="settingsChanged" class="settings-changed-alert">
      <el-alert
        title="设置已更改，将在下一条消息中生效"
        type="info"
        :closable="false"
        show-icon
      />
  </div>
    
    <!-- 设置模态框 -->
    <el-dialog
      v-model="showSettings"
      title="AI 设置"
      width="50%"
      :close-on-click-modal="false"
      class="ai-settings-dialog"
      @open="originalSettings = JSON.stringify(settings)"
      @closed="originalSettings = JSON.stringify(settings)"
    >
      <div class="settings-info-banner">
        所有设置将在保存后的<strong>下一条消息</strong>中生效。API Key和模型选择需要后端支持才能完全生效。
      </div>
      
      <div v-if="hasUnsavedChanges" class="settings-warning-banner">
        您有未保存的更改。点击"保存设置"按钮使更改生效。
      </div>
      
      <el-tabs type="border-card">
        <!-- API Key 设置 -->
        <el-tab-pane label="API Key">
          <el-form label-position="top">
            <el-form-item label="API Key">
              <el-input 
                v-model="settings.apiKey" 
                placeholder="请输入 API Key"
                :show-password="true"
              ></el-input>
              <div class="form-tip">用于访问 DeepSeek API 的密钥</div>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <!-- AI 智能体设置 -->
        <el-tab-pane label="AI 智能体">
          <el-form label-position="top">
            <el-form-item label="Emoji 图标">
              <el-input 
                v-model="settings.agent.emoji" 
                placeholder="输入 Emoji 表情"
                maxlength="2"
              ></el-input>
            </el-form-item>
            
            <el-form-item label="智能体名称">
              <el-input 
                v-model="settings.agent.name" 
                placeholder="输入智能体名称"
              ></el-input>
            </el-form-item>
            
            <el-form-item label="提示词">
              <el-input 
                v-model="settings.agent.prompt" 
                type="textarea" 
                :rows="6"
                placeholder="输入系统提示词，定义智能体的行为和知识"
              ></el-input>
              <div class="form-tip">系统提示词是定义 AI 行为和专业能力的关键</div>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <!-- AI 权重设置 -->
        <el-tab-pane label="AI 权重">
          <el-form label-position="top">
            <el-form-item label="模型选择">
              <el-select v-model="settings.model.name" placeholder="请选择模型">
                <el-option label="DeepSeek Reasoner (推荐)" value="deepseek-reasoner"></el-option>
                <el-option label="DeepSeek Chat" value="deepseek-chat"></el-option>
              </el-select>
              <div class="form-tip">Reasoner 更擅长专业分析和推理</div>
            </el-form-item>
            
            <el-form-item label="最大回答长度">
              <el-slider
                v-model="settings.model.maxLength"
                :min="1024"
                :max="8192"
                :step="1024"
                :format-tooltip="formatTokens"
                show-stops
              ></el-slider>
              <div class="form-tip">控制单次回答的最大长度，较长的回答可能需要更多时间生成</div>
            </el-form-item>
            
            <el-form-item label="上下文窗口大小">
              <el-slider
                v-model="settings.model.contextLength"
                :min="16384"
                :max="65536"
                :step="16384"
                :format-tooltip="formatTokens"
                show-stops
              ></el-slider>
              <div class="form-tip">控制 AI 记忆的对话历史长度，较大的上下文可能导致更慢的响应速度</div>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="resetSettings">恢复默认设置</el-button>
          <el-button @click="cancelChanges" v-if="hasUnsavedChanges">取消更改</el-button>
          <el-button type="primary" @click="saveSettings" :disabled="!hasUnsavedChanges">保存设置</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 新增模态框 -->
    <el-dialog v-model="showAttachDialog" title="选择附加数据" width="60%" :close-on-click-modal="false">
      <div class="attach-dialog-actions">
        <el-button size="small" @click="savePreset" type="primary" plain>保存预设</el-button>
        <el-button size="small" @click="applyPreset" type="success" plain>使用预设</el-button>
      </div>
      <el-tabs>
        <!-- 基本数据标签页 -->
        <el-tab-pane label="基本数据">
          <div class="basic-info-quick-actions">
            <el-button size="small" @click="selectAllBasicInfo" type="primary" plain>全选</el-button>
          </div>
          <el-checkbox-group v-model="selectedAttachData.basicInfo">
            <el-checkbox
              v-for="item in basicInfoFields"
              :key="item.key"
              :label="item.key"
              :title="`${item.label}: ${item.value()}`"
            >
              {{ item.label }}: {{ item.value() }}
            </el-checkbox>
          </el-checkbox-group>
        </el-tab-pane>
        <el-tab-pane label="欧赔初盘">
          <el-checkbox-group v-model="selectedAttachData.europeInitial">
            <el-checkbox
              v-for="odds in (selectedMatch?.details?.odds?.europeInitial || [])"
              :key="odds.company"
              :label="odds.company"
              :value="odds"
            >
              {{ formatOdds(odds, 'europe') }}
            </el-checkbox>
          </el-checkbox-group>
        </el-tab-pane>
        <el-tab-pane label="欧赔即时盘">
          <el-checkbox-group v-model="selectedAttachData.europeLive">
            <el-checkbox
              v-for="odds in (selectedMatch?.details?.odds?.europeLive || [])"
              :key="odds.company"
              :label="odds.company"
              :value="odds"
            >
              {{ formatOdds(odds, 'europe') }}
            </el-checkbox>
          </el-checkbox-group>
        </el-tab-pane>
        <el-tab-pane label="亚盘数据">
          <el-checkbox-group v-model="selectedAttachData.asiaHandicap">
            <el-checkbox
              v-for="odds in (selectedMatch?.details?.odds?.asiaHandicap || [])"
              :key="odds.company"
              :label="odds.company"
              :value="odds"
            >
              {{ formatOdds(odds, 'asia') }}
            </el-checkbox>
          </el-checkbox-group>
        </el-tab-pane>
        <el-tab-pane label="主队历史">
          <div class="history-quick-actions">
            <el-button size="small" @click="selectAllHistory('homeHistory')" type="primary" plain>全选</el-button>
            <el-button size="small" @click="selectTopHistory('homeHistory', 10)" type="success" plain>选择前10个</el-button>
            <el-button size="small" @click="selectTopHistory('homeHistory', 20)" type="info" plain>选择前20个</el-button>
          </div>
          <el-checkbox-group v-model="selectedAttachData.homeHistory">
            <el-checkbox
              v-for="(match, idx) in (selectedMatch?.details?.history?.homeHistory || [])"
              :key="idx"
              :label="formatHistory(match)"
              :value="match"
            >
              {{ formatHistory(match) }}
            </el-checkbox>
          </el-checkbox-group>
        </el-tab-pane>
        <el-tab-pane label="客队历史">
          <div class="history-quick-actions">
            <el-button size="small" @click="selectAllHistory('awayHistory')" type="primary" plain>全选</el-button>
            <el-button size="small" @click="selectTopHistory('awayHistory', 10)" type="success" plain>选择前10个</el-button>
            <el-button size="small" @click="selectTopHistory('awayHistory', 20)" type="info" plain>选择前20个</el-button>
          </div>
          <el-checkbox-group v-model="selectedAttachData.awayHistory">
            <el-checkbox
              v-for="(match, idx) in (selectedMatch?.details?.history?.awayHistory || [])"
              :key="idx"
              :label="formatHistory(match)"
              :value="match"
            >
              {{ formatHistory(match) }}
            </el-checkbox>
          </el-checkbox-group>
        </el-tab-pane>
        <el-tab-pane label="交锋历史">
          <div class="history-quick-actions">
            <el-button size="small" @click="selectAllHistory('headToHead')" type="primary" plain>全选</el-button>
            <el-button size="small" @click="selectTopHistory('headToHead', 10)" type="success" plain>选择前10个</el-button>
            <el-button size="small" @click="selectTopHistory('headToHead', 20)" type="info" plain>选择前20个</el-button>
          </div>
          <el-checkbox-group v-model="selectedAttachData.headToHead">
            <el-checkbox
              v-for="(match, idx) in (selectedMatch?.details?.history?.headToHead || [])"
              :key="idx"
              :label="formatHistory(match)"
              :value="match"
            >
              {{ formatHistory(match) }}
            </el-checkbox>
          </el-checkbox-group>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAttachDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmSend">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted, watch, nextTick, defineComponent, computed, onBeforeUnmount, toRefs } from 'vue'
import { User, ChatDotRound, Promotion, Setting } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { io as socketIO } from 'socket.io-client'
import { marked } from 'marked'

export default defineComponent({
  name: 'AIChat',
  props: {
    selectedMatch: {
      type: Object,
      default: null
    }
  },
  setup(props) {
    // 定义API配置
    const API_BASE_URL = 'http://localhost:8000'

    const messagesContainer = ref(null)
    const userInput = ref('')
    const loading = ref(false)
    const showSettings = ref(false)
    const showAttachDialog = ref(false)

    // 设置项
    const settings = reactive({
      apiKey: '',
      agent: { emoji: '', name: '', prompt: '' },
      model: { name: '', maxLength: 4096, contextLength: 65536 }
    })

    // 保存原始设置用于对比是否有未保存的更改
    const originalSettings = ref('')

    // 聊天消息列表，初始为空
    const messages = reactive([])

    // 1. 定义basicInfoFields
    const basicInfoFields = [
      { key: 'homeTeam', label: '主队', value: () => props.selectedMatch?.homeTeam?.name || '-' },
      { key: 'awayTeam', label: '客队', value: () => props.selectedMatch?.awayTeam?.name || '-' },
      { key: 'league', label: '联赛', value: () => props.selectedMatch?.league || '-' },
      { key: 'matchTime', label: '比赛时间', value: () => props.selectedMatch?.matchTime || '-' },
      { key: 'venue', label: '场地', value: () => props.selectedMatch?.venue || '-' },
      { key: 'weather', label: '天气', value: () => props.selectedMatch?.weather || '-' },
      { key: 'temperature', label: '温度', value: () => props.selectedMatch?.temperature || '-' },
      { key: 'homeRank', label: '主队排名', value: () => props.selectedMatch?.rankings?.homeTeam?.rank || '-' },
      { key: 'homePoints', label: '主队积分', value: () => props.selectedMatch?.rankings?.homeTeam?.points || '-' },
      { key: 'awayRank', label: '客队排名', value: () => props.selectedMatch?.rankings?.awayTeam?.rank || '-' },
      { key: 'awayPoints', label: '客队积分', value: () => props.selectedMatch?.rankings?.awayTeam?.points || '-' }
    ];

    // 2. selectedAttachData增加basicInfo
    const selectedAttachData = reactive({
      basicInfo: [],
      europeInitial: [],
      europeLive: [],
      asiaHandicap: [],
      homeHistory: [],
      awayHistory: [],
      headToHead: []
    })

    // 正确解构props
    const { selectedMatch } = toRefs(props);

    // 加载AI配置（从后端）
    const loadSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/ai-config`)
        if (!res.ok) throw new Error('获取AI配置失败')
        const data = await res.json()
        Object.assign(settings, data)
        originalSettings.value = JSON.stringify(settings)
      } catch (e) {
        ElMessage.error('AI配置加载失败: ' + e.message)
      }
    }

    // 保存AI配置（到后端）
    const saveSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/ai-config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings)
        })
        if (!res.ok) throw new Error('保存AI配置失败')
        showSettings.value = false
        originalSettings.value = JSON.stringify(settings)
        settingsChanged.value = true
        ElMessage({
          message: '设置已保存，将在下一次对话中生效',
          type: 'success',
          duration: 3000
        })
        messages.push({
        type: 'ai',
          text: `系统设置已更新。我现在是"${settings.agent.name}"，您的下一条消息将使用新的提示词和设置。`,
        timestamp: new Date()
        })
        nextTick(() => { scrollToBottom() })
      } catch (e) {
        ElMessage.error('AI配置保存失败: ' + e.message)
      }
    }

    // 取消未保存的更改
    const cancelChanges = async () => {
      await loadSettings()
      ElMessage({ message: '已还原为上次保存的设置', type: 'info' })
    }

    // 重置设置为默认（可选：可从后端拉取默认配置）
    const resetSettings = async () => {
      await loadSettings()
    }

    // 已保存但尚未在对话中应用的设置标记
    const settingsChanged = ref(false)
    
    // 检查是否有未保存的更改
    const hasUnsavedChanges = computed(() => {
      return JSON.stringify(settings) !== originalSettings.value
    })

    // 格式化 token 数量显示
    const formatTokens = (val) => {
      return `${val / 1024}K tokens`
    }
    
    // 监听选中的比赛变化
    watch(() => selectedMatch.value, (newMatch) => {
      if (newMatch) {
        // 切换比赛时清空附加数据选择
        selectedAttachData.basicInfo = [];
        selectedAttachData.europeInitial = [];
        selectedAttachData.europeLive = [];
        selectedAttachData.asiaHandicap = [];
        selectedAttachData.homeHistory = [];
        selectedAttachData.awayHistory = [];
        selectedAttachData.headToHead = [];
      }
    })

    // 构建获取AI回复的函数
    const getAIResponse = async (userMessage, matchInfo, attachData = null, tempAiMessage) => {
      try {
        // 多轮对话：拼接历史消息
        let context = [];
        // 1. system prompt（如有）
        if (settings.agent.prompt) {
          context.push({ role: 'system', content: settings.agent.prompt });
        }
        // 2. 拼接历史消息（user/ai），过滤空内容，且不重复推送本轮user
        let history = [];
        messages.forEach(msg => {
          if (msg.type === 'user' && msg.text && msg.text.trim()) {
            if (msg.text !== userMessage) {
              history.push({ role: 'user', content: msg.text });
            }
          } else if (msg.type === 'ai' && msg.text && msg.text.trim()) {
            history.push({ role: 'assistant', content: msg.text });
          }
        });
        // 跳过开头的assistant，保证第一条为system或user
        while (history.length && history[0].role === 'assistant') {
          history.shift();
        }
        // 严格交替排列user/assistant
        let lastRole = context.length > 0 ? context[context.length - 1].role : null;
        history.forEach(item => {
          if (lastRole === item.role) return; // 跳过连续同role
          context.push(item);
          lastRole = item.role;
        });
        // 3. 拼接本轮新问题和附加信息
        let extraData = '';
        if (matchInfo && attachData) {
          // 基本数据
          if (attachData.basicInfo && attachData.basicInfo.length > 0) {
            extraData += '【基本数据】\n';
            basicInfoFields.forEach(item => {
              if (attachData.basicInfo.includes(item.key)) {
                extraData += `${item.label}: ${item.value()}\n`;
              }
            });
            extraData += '\n';
          }
          // 欧赔初盘
          if (attachData.europeInitial.length > 0) {
            extraData += `【欧赔初盘】\n`;
            attachData.europeInitial.forEach(odds => {
              extraData += formatOdds(odds, 'europe') + '\n';
            });
            extraData += '\n';
          }
          // 欧赔即时盘
          if (attachData.europeLive.length > 0) {
            extraData += `【欧赔即时盘】\n`;
            attachData.europeLive.forEach(odds => {
              extraData += formatOdds(odds, 'europe') + '\n';
            });
            extraData += '\n';
          }
          // 亚让盘
          if (attachData.asiaHandicap.length > 0) {
            extraData += `【亚让盘】\n`;
            attachData.asiaHandicap.forEach(odds => {
              extraData += formatOdds(odds, 'asia') + '\n';
            });
            extraData += '\n';
          }
          // 主队历史
          if (attachData.homeHistory.length > 0) {
            extraData += `【主队历史】\n`;
            attachData.homeHistory.forEach(match => {
              extraData += formatHistory(match) + '\n';
            });
            extraData += '\n';
          }
          // 客队历史
          if (attachData.awayHistory.length > 0) {
            extraData += `【客队历史】\n`;
            attachData.awayHistory.forEach(match => {
              extraData += formatHistory(match) + '\n';
            });
            extraData += '\n';
          }
          // 交锋历史
          if (attachData.headToHead.length > 0) {
            extraData += `【交锋历史】\n`;
            attachData.headToHead.forEach(match => {
              extraData += formatHistory(match) + '\n';
            });
            extraData += '\n';
          }
        }
        let userContent = userMessage;
        if (extraData.trim()) {
          userContent += '\n\n' + extraData;
        }
        // 最后一条一定是user
        if (context.length === 0 || context[context.length - 1].role !== 'user') {
          context.push({ role: 'user', content: userContent });
        }
        
        // 初始化EventSource连接以处理流式响应
        const eventSourceOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: userMessage,
            context: context,
            settings: {
              apiKey: settings.apiKey,
              model: {
                name: settings.model.name,
                maxLength: settings.model.maxLength,
                contextLength: settings.model.contextLength
              },
              agent: {
                name: settings.agent.name,
                emoji: settings.agent.emoji
              }
            }
          })
        }
        
        // 调用后端API，接收流式响应
        const response = await fetch(`${API_BASE_URL}/api/ai-chat`, eventSourceOptions)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('AI API错误:', response.status, errorData)
          throw new Error(errorData.error || '获取AI回复失败')
        }
        
        // 处理流式响应
        const reader = response.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let buffer = ''
        
        let streamActive = true
        while (streamActive) {
          const { done, value } = await reader.read()
          
          if (done) {
            streamActive = false
            break
          }
          
          // 解码收到的数据
          buffer += decoder.decode(value, { stream: true })
          
          // 处理数据行
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // 保留可能不完整的最后一行
          
          // 处理接收到的每一行
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6)) // 去掉 'data: ' 前缀
                
                if (data.error) {
                  console.error('流式传输错误:', data.error)
                  if (tempAiMessage) tempAiMessage.text = '抱歉，获取回复时出现问题，请稍后再试。'
                  continue
                }
                
                if (data.content) {
                  // 累加内容到临时AI消息
                  if (tempAiMessage) {
                    tempAiMessage.text += data.content
                    await nextTick()
                    scrollToBottom()
                  }
                }
                
                if (data.done && data.reply) {
                  // 如果收到最终回复，用完整内容替换临时AI消息内容
                  if (tempAiMessage) tempAiMessage.text = data.reply
                }
              } catch (e) {
                console.error('解析流数据失败:', e, line)
              }
            }
          }
          
          // 滚动到底部以跟随新内容
          await nextTick()
          scrollToBottom()
        }
        
        // 返回最终收集的回复文本
        return tempAiMessage ? tempAiMessage.text : ''
      } catch (error) {
        console.error('调用AI API失败:', error)
        throw error
      }
    }
    
    // 格式化消息时间
    const formatMessageTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    // 格式化消息文本，高亮球队名称并支持Markdown表格
    const formatMessageText = (text) => {
      if (!text) return '';
      if (!selectedMatch.value) return marked.parse(text);
      // 高亮主队和客队名称
      let formattedText = text;
      const homeTeam = selectedMatch.value.homeTeam?.name;
      const awayTeam = selectedMatch.value.awayTeam?.name;
      if (homeTeam && formattedText.includes(homeTeam)) {
        formattedText = formattedText.replace(
          new RegExp(homeTeam, 'g'), 
          `<span class="highlight home-team">${homeTeam}</span>`
        );
      }
      if (awayTeam && formattedText.includes(awayTeam)) {
        formattedText = formattedText.replace(
          new RegExp(awayTeam, 'g'), 
          `<span class="highlight away-team">${awayTeam}</span>`
        );
      }
      return marked.parse(formattedText);
    };
    
    // 发送消息
    const sendMessage = async () => {
      if (!userInput.value.trim()) return
      showAttachDialog.value = true
    }

    // 确认发送（在模态框点击确定时调用）
    const confirmSend = async () => {
      showAttachDialog.value = false

      if (!userInput.value.trim()) return
      
      // 添加用户消息
      const userMessage = {
        type: 'user',
        text: userInput.value,
        timestamp: new Date()
      }
      messages.push(userMessage)
      
      // 添加临时AI消息
      const tempAiMessage = {
        type: 'ai',
        text: '',
        timestamp: new Date()
      }
      messages.push(tempAiMessage)

      // 清空输入框
      const inputText = userInput.value
      userInput.value = ''
      loading.value = true
      
      scrollToBottom()
      
      try {
        // getAIResponse 里实时更新 tempAiMessage.text
        await getAIResponse(inputText, selectedMatch.value, selectedAttachData, tempAiMessage)
          await nextTick()
          scrollToBottom()
        } catch (error) {
          console.error('获取AI回复失败:', error)
        tempAiMessage.text = '抱歉，获取回复时出现问题，请稍后再试。'
        } finally {
          loading.value = false
        }
    }
    
    // 滚动到聊天底部
    const scrollToBottom = async () => {
      await nextTick()
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    }
    
    // 监听提示词变化
    watch(() => settings.agent.prompt, () => {
      console.log('提示词已更新:', settings.agent.prompt.substring(0, 50) + '...');
    });

    // WebSocket集成
    const socket = socketIO('http://localhost:8000')
    onMounted(() => {
      loadSettings()
      scrollToBottom();
      // 监听AI配置变更推送
      socket.on('ai-config-updated', (newConfig) => {
        Object.assign(settings, newConfig)
        originalSettings.value = JSON.stringify(settings)
        ElMessage.info('AI配置已被其他端更新，已自动同步')
      })
    })
    onBeforeUnmount(() => {
      socket.off('ai-config-updated')
    })

    // 处理输入框回车事件
    const onInputEnter = (e) => {
      if (e.ctrlKey || e.metaKey) {
        // Ctrl+Enter 或 Cmd+Enter 换行
        return;
      }
      // 普通回车直接发送
      e.preventDefault();
      sendMessage();
    };

    // 字段兼容辅助函数
    const getVal = (obj, ...keys) => {
      for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
      }
      return '-';
    };

    // 欧赔/亚赔/历史格式化函数
    const formatOdds = (odds, type = 'europe') => {
      if (type === 'europe' || type === 'live') {
        return `公司: ${getVal(odds, 'company')}, 主队赔率: ${getVal(odds, 'homeOdds')}, 和赔率: ${getVal(odds, 'drawOdds')}, 客队赔率: ${getVal(odds, 'awayOdds')}, 主队概率: ${getVal(odds, 'homeWinRate')}, 和率: ${getVal(odds, 'drawRate')}, 客队概率: ${getVal(odds, 'awayWinRate')}, 返还率: ${getVal(odds, 'returnRate')}, 主队凯利指数: ${getVal(odds, 'homeKellyIndex')}, 和凯利指数: ${getVal(odds, 'drawKellyIndex')}, 客队凯利指数: ${getVal(odds, 'awayKellyIndex')}, 更新时间: ${getVal(odds, 'updateTime')}`;
      } else if (type === 'asia') {
        return `公司: ${getVal(odds, 'company')}, 初盘主队: ${getVal(odds, 'initialHomeOdds')}, 初盘盘口: ${getVal(odds, 'initialHandicap')}, 初盘客队: ${getVal(odds, 'initialAwayOdds')}, 即时盘主队: ${getVal(odds, 'liveHomeOdds')}, 即时盘盘口: ${getVal(odds, 'liveHandicap')}, 即时盘客队: ${getVal(odds, 'liveAwayOdds')}`;
      }
      return '';
    };

    const formatHistory = (match) => {
      return `联赛: ${getVal(match, 'league')}, 日期: ${getVal(match, 'date')}, 主队: ${getVal(match, 'homeTeam')}, 比分: ${getVal(match, 'score')}, 半场比分: ${getVal(match, 'halfTimeScore')}, 角球: ${getVal(match, 'corner')}, 盘口: ${getVal(match, 'handicap')}, 客队: ${getVal(match, 'awayTeam')}, 胜负: ${getVal(match, 'result')}, 让球: ${getVal(match, 'handicapResult')}, 进球数: ${getVal(match, 'goalResult')}`;
    };
    
    // 1. 附加数据模态框右上角添加按钮
    const savePreset = async () => {
      const preset = {
        basicInfo: [...selectedAttachData.basicInfo],
        // 只保存公司名字符串数组
        europeInitial: selectedAttachData.europeInitial.map(item => item.company),
        europeLive: selectedAttachData.europeLive.map(item => item.company),
        asiaHandicap: selectedAttachData.asiaHandicap.map(item => item.company)
      };
      try {
        const res = await fetch('http://localhost:8000/api/attach-preset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(preset)
        });
        const data = await res.json();
        if (data.success) {
          ElMessage.success('已保存当前预设！');
        } else {
          ElMessage.error('保存预设失败');
        }
      } catch (e) {
        ElMessage.error('保存预设失败: ' + e.message);
      }
    };

    // 定义所有公司对象列表，便于恢复勾选
    const allEuropeInitialList = computed(() => selectedMatch.value?.details?.odds?.europeInitial || []);
    const allEuropeLiveList = computed(() => selectedMatch.value?.details?.odds?.europeLive || []);
    const allAsiaHandicapList = computed(() => selectedMatch.value?.details?.odds?.asiaHandicap || []);

    // 应用附加信息预设，根据公司名恢复勾选
    const applyPreset = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/attach-preset');
        const data = await res.json();
        selectedAttachData.basicInfo = Array.isArray(data.basicInfo) ? [...data.basicInfo] : [];
        // 只根据公司名恢复勾选
        selectedAttachData.europeInitial = allEuropeInitialList.value.filter(item =>
          Array.isArray(data.europeInitial) && data.europeInitial.includes(item.company)
        );
        selectedAttachData.europeLive = allEuropeLiveList.value.filter(item =>
          Array.isArray(data.europeLive) && data.europeLive.includes(item.company)
        );
        selectedAttachData.asiaHandicap = allAsiaHandicapList.value.filter(item =>
          Array.isArray(data.asiaHandicap) && data.asiaHandicap.includes(item.company)
        );
        ElMessage.success('已应用预设！');
      } catch (e) {
        ElMessage.error('读取预设失败: ' + e.message);
      }
    };

    // 监听模态框显示状态，当打开时清空之前的选择
    watch(() => showAttachDialog.value, (newVal) => {
      if (newVal === true) {
        // 打开模态框时清空之前的选择
        clearSelectedData();
      }
    });

    // 添加清空附加数据选择的函数
    const clearSelectedData = () => {
      selectedAttachData.basicInfo = [];
      selectedAttachData.europeInitial = [];
      selectedAttachData.europeLive = [];
      selectedAttachData.asiaHandicap = [];
      selectedAttachData.homeHistory = [];
      selectedAttachData.awayHistory = [];
      selectedAttachData.headToHead = [];
    };

    // 修复全选/前10/前20按钮逻辑，直接推入对象数组
    const selectAllHistory = (type) => {
      if (!selectedMatch.value?.details?.history?.[type]) return;
      selectedAttachData[type] = selectedMatch.value.details.history[type].map(item => item);
    };
    const selectTopHistory = (type, count) => {
      if (!selectedMatch.value?.details?.history?.[type]) return;
      const arr = selectedMatch.value.details.history[type];
      selectedAttachData[type] = arr.slice(0, count).map(item => item);
    };

    // 添加全选基本数据的函数
    const selectAllBasicInfo = () => {
      selectedAttachData.basicInfo = basicInfoFields.map(item => item.key);
    };
    
    return {
      messagesContainer,
      userInput,
      loading,
      messages,
      formatMessageTime,
      formatMessageText,
      sendMessage,
      User,
      ChatDotRound,
      Promotion,
      Setting,
      showSettings,
      settings,
      saveSettings,
      resetSettings,
      formatTokens,
      settingsChanged,
      hasUnsavedChanges,
      originalSettings,
      cancelChanges,
      onInputEnter,
      showAttachDialog,
      selectedAttachData,
      confirmSend,
      formatOdds,
      formatHistory,
      getVal,
      basicInfoFields,
      savePreset,
      applyPreset,
      clearSelectedData,
      selectAllHistory,
      selectTopHistory,
      selectAllBasicInfo,
    }
  }
})
</script>

<style scoped>
.chat-box {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  padding: 16px 20px;
  background: linear-gradient(135deg, #409eff, #2e88e5);
  color: white;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.football-icon {
  font-size: 1.8rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: spin 10s infinite linear;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.chat-header h3 {
  margin: 0;
  font-weight: 600;
  font-size: 1.2rem;
}

.chat-messages {
  flex: 1 1 0%;
  overflow-y: auto;
  padding: 20px;
  background-color: #f8f9fc;
  background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjUiPgo8cmVjdCB3aWR0aD0iNSIgaGVpZ2h0PSI1IiBmaWxsPSIjZmZmIj48L3JlY3Q+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmMGYyZjUiPjwvcmVjdD4KPC9zdmc+');
}

.message {
  display: flex;
  margin-bottom: 18px;
  max-width: 85%;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.user-message {
  margin-left: auto;
  flex-direction: row-reverse;
}

.ai-message {
  margin-right: auto;
}

.message-avatar {
  margin: 0 10px;
  align-self: flex-start;
}

.user-avatar {
  background: linear-gradient(135deg, #409eff, #2e88e5);
  color: white;
  box-shadow: 0 2px 4px rgba(46, 136, 229, 0.2);
}

.ai-avatar {
  background: linear-gradient(135deg, #67c23a, #4caf50);
  color: white;
  box-shadow: 0 2px 4px rgba(76, 175, 80, 0.2);
}

.message-content {
  background-color: #fff;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  position: relative;
}

.user-message .message-content {
  background: linear-gradient(135deg, #ecf5ff, #e6f1fc);
  border-top-right-radius: 0;
}

.user-message .message-content::after {
  content: '';
  position: absolute;
  top: 0;
  right: -10px;
  width: 0;
  height: 0;
  border-left: 10px solid #e6f1fc;
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
}

.ai-message .message-content {
  background-color: #fff;
  border-top-left-radius: 0;
}

.ai-message .message-content::after {
  content: '';
  position: absolute;
  top: 0;
  left: -10px;
  width: 0;
  height: 0;
  border-right: 10px solid #fff;
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
}

.message-text {
  word-break: break-word;
  color: #303133;
  line-height: 1.6;
  font-size: 0.95rem;
}

.highlight {
  font-weight: bold;
  padding: 0 3px;
  border-radius: 3px;
}

.home-team {
  background-color: rgba(64, 158, 255, 0.1);
  color: #409eff;
}

.away-team {
  background-color: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
}

.message-time {
  font-size: 0.7rem;
  color: #909399;
  text-align: right;
  margin-top: 4px;
}

.typing {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #c0c4cc;
  margin: 0 3px;
  animation: typing 1.4s infinite both;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-6px);
  }
}

.chat-input {
  padding: 16px 20px;
  border-top: 1px solid #ebeef5;
  background-color: #fff;
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.input-with-button {
  flex: 1;
}

.send-button {
  height: 40px;
  padding: 0 20px;
  font-weight: 600;
  transition: all 0.3s;
  background: linear-gradient(135deg, #409eff, #2e88e5);
  border: none;
  box-shadow: 0 2px 6px rgba(46, 136, 229, 0.3);
}

.send-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(46, 136, 229, 0.4);
}

.send-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.settings-in-input {
  margin-left: 8px;
  font-size: 1.2rem;
  color: #909399;
  transition: all 0.3s;
}
.settings-in-input:hover {
  color: #409eff;
  transform: rotate(30deg);
}

.settings-changed-alert {
  padding: 0 20px 10px;
}

.form-tip {
  font-size: 0.8rem;
  color: #909399;
  margin-top: 4px;
}

.settings-info-banner {
  background-color: #f0f9eb;
  border-left: 4px solid #67c23a;
  padding: 10px 15px;
  margin-bottom: 15px;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #67c23a;
  line-height: 1.5;
}

.settings-warning-banner {
  background-color: #fffbe6;
  border-left: 4px solid #e6a23c;
  padding: 10px 15px;
  margin-bottom: 15px;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #e6a23c;
  line-height: 1.5;
}

:deep(.ai-settings-dialog .el-tabs__content) {
  padding: 20px;
}

:deep(.ai-settings-dialog .el-form-item__label) {
  font-weight: 500;
}

:deep(.ai-settings-dialog .el-select) {
  width: 100%;
}

:deep(.el-dialog__title) {
  font-weight: 600;
  font-size: 1.2rem;
  color: #303133;
}

:deep(.el-checkbox) {
  display: block !important;
  width: 100%;
  margin-right: 0 !important;
}

:deep(.el-dialog__body .el-tabs__content) {
  max-height: 600px;
  overflow-y: auto;
}

.basic-info-list {
  padding: 10px 20px;
  font-size: 1rem;
  line-height: 2;
  color: #333;
}
.basic-info-list div {
  margin-bottom: 2px;
}

.attach-dialog-actions {
  position: absolute;
  right: 100px;
  top: 18px;
  z-index: 10;
  display: flex;
  gap: 16px;
}
.attach-dialog-actions .el-button {
  border-radius: 18px !important;
  font-size: 13px !important;
  padding: 4px 18px !important;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.08);
  transition: background 0.2s, color 0.2s;
}
.attach-dialog-actions .el-button:hover {
  background: #ecf5ff !important;
  color: #409eff !important;
  border-color: #b3d8ff !important;
}

.history-quick-actions {
  margin-bottom: 10px;
  display: flex;
  gap: 8px;
  padding: 0 0 10px 0;
  border-bottom: 1px dashed #ebeef5;
}

.history-quick-actions .el-button {
  border-radius: 16px;
  font-size: 12px;
  padding: 6px 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.basic-info-quick-actions {
  margin-bottom: 10px;
  display: flex;
  gap: 8px;
  padding: 0 0 10px 0;
  border-bottom: 1px dashed #ebeef5;
}
.basic-info-quick-actions .el-button {
  border-radius: 16px;
  font-size: 12px;
  padding: 6px 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}
</style>

<style>
/* 覆盖默认样式，但不能使用scoped */
.el-textarea__inner {
  border-radius: 8px;
  transition: all 0.3s;
  resize: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.el-textarea__inner:focus {
  box-shadow: 0 2px 10px rgba(64, 158, 255, 0.2);
}

.el-dialog {
  border-radius: 12px;
  overflow: hidden;
}

.el-dialog__body {
  padding: 0;
}

.el-tabs--border-card {
  border: none;
  box-shadow: none;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style> 