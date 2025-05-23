/**
 * 足球比赛列表爬虫
 * 用于爬取比赛ID列表和详细信息
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * 格式化比赛时间为文件名格式
 * @param {string} dateTime 比赛时间，如 "2025-05-15 01:00"
 * @returns {string} 格式化后的时间字符串，如 "20250515-0100"
 */
function formatDateTimeForFilename(dateTime) {
  if (!dateTime) return 'unknown-time';
  
  // 移除所有非数字字符
  const digitsOnly = dateTime.replace(/\D/g, '');
  
  // 确保至少有8个字符（日期部分）
  if (digitsOnly.length >= 8) {
    const date = digitsOnly.substring(0, 8);
    const time = digitsOnly.length >= 12 ? `-${digitsOnly.substring(8, 12)}` : '';
    return `${date}${time}`;
  }
  
  return 'unknown-time';
}

/**
 * 生成文件名安全的字符串
 * @param {string} str 输入字符串
 * @returns {string} 文件名安全的字符串
 */
function safeFilename(str) {
  if (!str) return 'unknown';
  // 移除不安全的文件名字符
  return str.replace(/[\\/:*?"<>|]/g, '-').trim();
}

/**
 * 获取球队排名信息
 * @param {BrowserContext} context 浏览器上下文
 * @param {string} matchId 比赛ID
 * @param {string} homeTeamName 主队名称 
 * @param {string} awayTeamName 客队名称
 * @returns {Promise<Object>} 排名信息，包含主客队排名和积分
 */
async function fetchTeamRankings(context, matchId, homeTeamName, awayTeamName) {
  // 默认排名信息
  const rankings = {
    homeTeam: { rank: null, points: null },
    awayTeam: { rank: null, points: null }
  };
  
  try {
    // 构建排名页面URL
    const rankingsUrl = `https://info.titan007.com/analysis/${matchId}cn.htm`;
    
    // 打开新页面爬取数据
    const rankPage = await context.newPage();
    await rankPage.goto(rankingsUrl, { timeout: 30000 });
    
    // 等待页面加载
    await rankPage.waitForLoadState('domcontentloaded');
    
    // 尝试等待排名表格加载
    try {
      // 等待标准选择器
      await rankPage.waitForSelector('.standings-box', { timeout: 20000 });
    } catch (timeoutError) {
      // 如果等待超时，直接返回默认排名
      await rankPage.close();
      return rankings;
    }
    
    // 提取排名信息
    const rankingData = await rankPage.evaluate(() => {
      const result = {
        firstTeam: { rank: null, points: null, name: '' },
        secondTeam: { rank: null, points: null, name: '' }
      };
      
      try {
        // 查找带有"on"类的列表项，这些是参与当前比赛的队伍
        const teamElements = document.querySelectorAll('.standings-box .st-list.on');
        
        if (teamElements && teamElements.length > 0) {
          // 遍历找到的队伍（通常应该有两支，分别是主队和客队）
          teamElements.forEach((element, index) => {
            // 提取排名（i标签内容）
            const rankElement = element.querySelector('i');
            const rank = rankElement ? rankElement.textContent.trim() : null;
            
            // 提取队伍名称（a标签内容）
            const nameElement = element.querySelector('a');
            const name = nameElement ? nameElement.textContent.trim() : '';
            
            // 提取积分（span标签内容）
            const pointsElement = element.querySelector('span');
            const points = pointsElement ? pointsElement.textContent.trim() : null;
            
            // 将数据放入对应的队伍
            if (index === 0) {
              result.firstTeam = { rank, points, name };
            } else if (index === 1) {
              result.secondTeam = { rank, points, name };
            }
          });
        }
      } catch (innerError) {
        // 内部错误处理
      }
      
      return result;
    });
    
    // 关闭排名页面
    await rankPage.close();
    
    // 尝试根据队伍名称匹配排名信息
    if (homeTeamName && awayTeamName && (rankingData.firstTeam || rankingData.secondTeam)) {
      // 转换为小写以便不区分大小写比较
      const homeLower = homeTeamName.toLowerCase();
      const awayLower = awayTeamName.toLowerCase();
      
      let homeTeamMatched = false;
      let awayTeamMatched = false;
      
      // 尝试匹配主队
      if (rankingData.firstTeam && rankingData.firstTeam.name) {
        const firstTeamName = rankingData.firstTeam.name.toLowerCase();
        
        if (firstTeamName === homeLower || 
            homeLower.includes(firstTeamName) || 
            firstTeamName.includes(homeLower)) {
          // 第一个是主队
          rankings.homeTeam = { 
            rank: rankingData.firstTeam.rank, 
            points: rankingData.firstTeam.points 
          };
          homeTeamMatched = true;
        } else if (firstTeamName === awayLower || 
                  awayLower.includes(firstTeamName) || 
                  firstTeamName.includes(awayLower)) {
          // 第一个是客队
          rankings.awayTeam = { 
            rank: rankingData.firstTeam.rank, 
            points: rankingData.firstTeam.points 
          };
          awayTeamMatched = true;
        }
      }
      
      // 尝试匹配客队
      if (rankingData.secondTeam && rankingData.secondTeam.name) {
        const secondTeamName = rankingData.secondTeam.name.toLowerCase();
        
        if (!homeTeamMatched && (secondTeamName === homeLower || 
            homeLower.includes(secondTeamName) || 
            secondTeamName.includes(homeLower))) {
          // 第二个是主队
          rankings.homeTeam = { 
            rank: rankingData.secondTeam.rank, 
            points: rankingData.secondTeam.points 
          };
          homeTeamMatched = true;
        } else if (!awayTeamMatched && (secondTeamName === awayLower || 
                   awayLower.includes(secondTeamName) || 
                   secondTeamName.includes(awayLower))) {
          // 第二个是客队
          rankings.awayTeam = { 
            rank: rankingData.secondTeam.rank, 
            points: rankingData.secondTeam.points 
          };
          awayTeamMatched = true;
        }
      }
    }
    
    return rankings;
  } catch (error) {
    console.error(`获取排名信息失败:`, error.message);
    // 出现错误时返回默认排名
    return rankings;
  }
}

/**
 * 清理所有JSON文件
 * 删除match_json目录下的所有JSON文件，确保每次爬取都是最新数据
 */
function cleanupAllJsonFiles() {
  try {
    const matchJsonDir = path.join(__dirname, 'match_json');
    if (!fs.existsSync(matchJsonDir)) {
      fs.mkdirSync(matchJsonDir, { recursive: true });
      return; // 目录不存在，无需清理
    }
    
    // 读取目录中的所有文件
    const files = fs.readdirSync(matchJsonDir);
    
    // 统计要清理的文件数量
    let cleanedCount = 0;
    
    // 遍历文件并删除所有JSON文件
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const filePath = path.join(matchJsonDir, file);
        fs.unlinkSync(filePath);
        cleanedCount++;
      }
    });
  } catch (error) {
    console.error('清理JSON文件时出错:', error.message);
  }
}

/**
 * 清理无效的JSON文件
 * 删除以"unknown-time"开头的文件，这些通常是爬取失败产生的
 * @deprecated 已被cleanupAllJsonFiles替代
 */
function cleanupInvalidJsonFiles() {
  console.log('注意: cleanupInvalidJsonFiles已弃用，请使用cleanupAllJsonFiles');
  cleanupAllJsonFiles();
}

/**
 * 爬取比赛列表数据
 * @returns {Promise<Array>} 比赛列表数据
 */
async function scrapeMatchesList() {
  // 首先清理所有的JSON文件
  cleanupAllJsonFiles();
  
  console.log('\x1b[32m%s\x1b[0m', '开始爬取中.......');
  const browser = await chromium.launch({
    headless: true,
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 访问目标网站
    await page.goto('https://jc.titan007.com/', { timeout: 30000 });
    
    // 等待表格加载完成
    await page.waitForSelector('#table_live', { timeout: 30000 });
    
    // 获取所有比赛ID
    const matchesData = await page.evaluate(() => {
      const matches = [];
      // 获取所有tr1开头的行
      const allTr1 = document.querySelectorAll('tr[id^="tr1_"]');
      
      allTr1.forEach(tr1 => {
        try {
          // 提取比赛ID
          const matchId = tr1.id.replace('tr1_', '');
          
          if (matchId) {
            // 简化：只存储比赛ID，不再提取时间
            matches.push({ id: matchId });
          }
        } catch (error) {
          // 忽略错误
        }
      });
      
      return matches;
    });
    
    // 使用绿色日志输出爬取到的比赛数量
    console.log('\x1b[32m%s\x1b[0m', `已从https://jc.titan007.com/index.aspx爬取${matchesData.length}场比赛`);
    
    // 保存比赛数据到JSON文件
    const matchJsonDir = path.join(__dirname, 'match_json');
    if (!fs.existsSync(matchJsonDir)) {
      fs.mkdirSync(matchJsonDir, { recursive: true });
    }
    
    // 所有比赛的结果数组
    const allMatches = [];
    
    // 使用黄色输出开始处理信息
    console.log('\x1b[33m%s\x1b[0m', `接下来处理${matchesData.length}场比赛，直接获取完整信息`);

    // 检查是否有WebSocket客户端连接并广播消息
    function broadcastMatchesUpdate(matches, current, total, isComplete = false) {
      try {
        if (global.io && global.connectedClients && global.connectedClients > 0) {
          console.log(`广播比赛列表已更新`);
          global.io.emit('matches-batch-update', {
            matches,
            batchIndex: current,
            totalBatches: total,
            timestamp: new Date().toISOString(),
            complete: isComplete
          });
          
          // 在广播完成后添加灰色分隔线
          if (current < total) {
            console.log('\x1b[90m%s\x1b[0m', '------------------------------------');
          }
        }
      } catch (error) {
        console.error('广播比赛列表更新失败:', error);
      }
    }
    
    // 单场比赛爬取函数 - 直接获取完整信息
    async function scrapeMatchDetail(matchId, index, totalCount) {
      try {
        // 构建比赛详情URL
        const oddsUrl = `https://op1.titan007.com/oddslist/${matchId}.htm`;
        
        // 打开新页面爬取数据
        const detailPage = await context.newPage();
        await detailPage.goto(oddsUrl, { timeout: 30000 });
        
        // 等待页面加载
        await detailPage.waitForLoadState('domcontentloaded');
        
        // 提取比赛详情数据
        const matchDetails = await detailPage.evaluate(() => {
          const details = {
            id: window.location.pathname.split('/').pop().replace('.htm', ''),
            homeTeam: { name: '', logo: '' },
            awayTeam: { name: '', logo: '' },
            league: '',
            matchTime: '',
            venue: '',
            weather: '',
            temperature: '',
            status: 'upcoming',
            homeScore: null,
            awayScore: null,
            matchStatus: '' // 比赛阶段状态，如"上半场"、"下半场"等
          };
          
          try {
            // 获取analyhead区域
            const analyHead = document.querySelector('.analyhead');
            if (!analyHead) return details;
            
            // 提取主队信息
            const homeTeamElement = analyHead.querySelector('.home a');
            if (homeTeamElement) {
              details.homeTeam.name = homeTeamElement.textContent.replace('(主)', '').trim();
            }
            
            const homeLogoElement = analyHead.querySelector('.home img');
            if (homeLogoElement && homeLogoElement.src) {
              details.homeTeam.logo = homeLogoElement.src.startsWith('//') 
                ? 'https:' + homeLogoElement.src 
                : homeLogoElement.src;
            }
            
            // 提取客队信息
            const awayTeamElement = analyHead.querySelector('.guest a');
            if (awayTeamElement) {
              details.awayTeam.name = awayTeamElement.textContent.trim();
            }
            
            const awayLogoElement = analyHead.querySelector('.guest img');
            if (awayLogoElement && awayLogoElement.src) {
              details.awayTeam.logo = awayLogoElement.src.startsWith('//') 
                ? 'https:' + awayLogoElement.src 
                : awayLogoElement.src;
            }
            
            // 提取联赛信息
            const leagueElement = analyHead.querySelector('.vs .row .LName');
            if (leagueElement) {
              details.league = leagueElement.textContent.trim();
            }
            
            // 提取比赛时间
            const timeRow = analyHead.querySelector('.vs .row');
            if (timeRow) {
              const timeText = timeRow.textContent.trim();
              const timeMatch = timeText.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/);
              if (timeMatch) {
                details.matchTime = timeMatch[1];
              }
            }
            
            // 提取场地、天气、温度
            const infoRow = analyHead.querySelectorAll('.vs .row')[2];
            if (infoRow) {
              const venueElement = infoRow.querySelector('.place');
              if (venueElement) {
                details.venue = venueElement.textContent.replace('场地：', '').trim();
              }
              
              const labels = infoRow.querySelectorAll('label');
              if (labels.length > 0) {
                details.weather = labels[0].textContent.replace('天气：', '').trim();
              }
              
              if (labels.length > 1) {
                details.temperature = labels[1].textContent.replace('温度：', '').trim();
              }
            }
            
            // 提取比分和比赛状态
            const halfElement = document.querySelector('.half');
            const vsRowElement = document.querySelector('.row.vs#headVs');
            
            if (halfElement) {
              details.matchStatus = halfElement.textContent.trim();
              
              // 如果能找到比分，且不是"-"，则认为比赛已开始
              const scoreElements = halfElement.querySelectorAll('span.rate');
              if (scoreElements.length === 2) {
                const homeScoreText = scoreElements[0].textContent.trim();
                const awayScoreText = scoreElements[1].textContent.trim();
                
                if (homeScoreText !== '-' && awayScoreText !== '-') {
                  details.status = 'playing';
                  details.homeScore = parseInt(homeScoreText, 10);
                  details.awayScore = parseInt(awayScoreText, 10);
                }
              }
            } else if (vsRowElement) {
              // 尝试从vsRow获取比分
              const scoreSpan = vsRowElement.querySelector('span.score');
              if (scoreSpan) {
                const scoreText = scoreSpan.textContent.trim();
                if (scoreText && scoreText !== '-') {
                  const scoreMatch = scoreText.match(/(\d+)-(\d+)/);
                  if (scoreMatch) {
                    details.status = 'playing';
                    details.homeScore = parseInt(scoreMatch[1], 10);
                    details.awayScore = parseInt(scoreMatch[2], 10);
                  }
                }
              }
            }
          } catch (error) {
            // 处理内部错误
          }
          
          return details;
        });
        
        // 补充数据处理与爬取
        
        // 处理队徽下载
        let homeLogoStatus = '未处理';
        let awayLogoStatus = '未处理';
        
        // 下载主队队徽
        if (matchDetails.homeTeam.logo && matchDetails.homeTeam.name) {
          const homeLogoResult = await downloadTeamLogo(context, matchDetails.homeTeam.logo, matchDetails.homeTeam.name);
          if (homeLogoResult) {
            matchDetails.homeTeam.logo = homeLogoResult.path;
            homeLogoStatus = homeLogoResult.status;
          }
        }
        
        // 下载客队队徽
        if (matchDetails.awayTeam.logo && matchDetails.awayTeam.name) {
          const awayLogoResult = await downloadTeamLogo(context, matchDetails.awayTeam.logo, matchDetails.awayTeam.name);
          if (awayLogoResult) {
            matchDetails.awayTeam.logo = awayLogoResult.path;
            awayLogoStatus = awayLogoResult.status;
          }
        }
        
        // 爬取球队排名信息 - 传入队伍名称以便正确匹配
        try {
          const rankings = await fetchTeamRankings(
            context, 
            matchId, 
            matchDetails.homeTeam.name, 
            matchDetails.awayTeam.name
          );
          matchDetails.rankings = rankings;
        } catch (rankingError) {
          console.error(`获取比赛 ${matchId} 排名数据失败:`, rankingError.message);
          matchDetails.rankings = {
            homeTeam: { rank: null, points: null },
            awayTeam: { rank: null, points: null }
          };
        }
        
        // 爬取欧赔，亚盘等详细信息 - 实现于detailCrawler.js
        
        // 记录当前爬取进度
        const progressPercentage = Math.round(((index + 1) / totalCount) * 100);
        
        // 通过WebSocket发送进度更新
        if (global.io) {
          global.io.emit('match-progress', {
            matchId,
            status: 'inProgress',
            progress: progressPercentage,
            message: `正在爬取比赛 ${matchId} 详情，进度 ${progressPercentage}%`,
            timestamp: new Date().toISOString()
          });
        }
        
        // 关闭页面
        await detailPage.close();
        
        // 生成文件名
        const timeStr = matchDetails.matchTime ? formatDateTimeForFilename(matchDetails.matchTime) : 'unknown-time';
        const homeTeamName = matchDetails.homeTeam && matchDetails.homeTeam.name ? safeFilename(matchDetails.homeTeam.name) : 'unknown';
        const awayTeamName = matchDetails.awayTeam && matchDetails.awayTeam.name ? safeFilename(matchDetails.awayTeam.name) : 'unknown';
        const fileName = `${timeStr}-${matchId}-${homeTeamName}VS${awayTeamName}`;
        
        // 保存到JSON文件
        let fileStatus = '文件已生成';
        try {
          const filePath = path.join(matchJsonDir, `${fileName}.json`);
          fs.writeFileSync(filePath, JSON.stringify(matchDetails, null, 2), 'utf8');
        } catch (fileError) {
          console.error(`保存比赛 ${matchId} 数据失败:`, fileError.message);
          fileStatus = '文件生成失败';
        }
        
        // 格式化输出详细信息
        console.log(`比赛ID：${matchId}`);
        console.log(`赛事类别：${matchDetails.league || '\x1b[31m原网站无此数据\x1b[0m'}`);
        console.log(`主队名称：${matchDetails.homeTeam.name || '\x1b[31m原网站无此数据\x1b[0m'}`);
        console.log(`客队名称：${matchDetails.awayTeam.name || '\x1b[31m原网站无此数据\x1b[0m'}`);
        console.log(`主队队徽：${homeLogoStatus}`);
        console.log(`客队队徽：${awayLogoStatus}`);
        console.log(`主队排名：${matchDetails.rankings.homeTeam.rank ? `第${matchDetails.rankings.homeTeam.rank}名` : '\x1b[31m原网站无此数据\x1b[0m'}`);
        console.log(`客队排名：${matchDetails.rankings.awayTeam.rank ? `第${matchDetails.rankings.awayTeam.rank}名` : '\x1b[31m原网站无此数据\x1b[0m'}`);
        console.log(`比赛场地：${matchDetails.venue || '\x1b[31m原网站无此数据\x1b[0m'}`);
        console.log(`比赛天气：${matchDetails.weather || '\x1b[31m原网站无此数据\x1b[0m'}`);
        console.log(`比赛温度：${matchDetails.temperature || '\x1b[31m原网站无此数据\x1b[0m'}`);
        console.log(`${fileStatus}`);
        
        // 发送完成通知
        if (global.io) {
          global.io.emit('match-progress', {
            matchId,
            status: 'partialCompleted',
            progress: 100,
            message: `比赛 ${matchId} 基本信息爬取完成，等待详细数据...`,
            timestamp: new Date().toISOString()
          });
        }
        
        // 返回完整的比赛信息
        return {
          ...matchDetails,
          fileName: fileName
        };
      } catch (error) {
        console.error(`爬取比赛 ${matchId} 详情失败:`, error.message);
        
        // 通知爬取失败
        if (global.io) {
          global.io.emit('match-progress', {
            matchId,
            status: 'failed',
            progress: 0,
            message: `爬取失败: ${error.message}`,
            timestamp: new Date().toISOString()
          });
        }
        
        // 格式化输出错误信息
        console.log(`比赛ID：${matchId}`);
        console.log(`赛事类别：\x1b[31m原网站无此数据\x1b[0m`);
        console.log(`主队名称：\x1b[31m原网站无此数据\x1b[0m`);
        console.log(`客队名称：\x1b[31m原网站无此数据\x1b[0m`);
        console.log(`主队队徽：未处理`);
        console.log(`客队队徽：未处理`);
        console.log(`主队排名：\x1b[31m原网站无此数据\x1b[0m`);
        console.log(`客队排名：\x1b[31m原网站无此数据\x1b[0m`);
        console.log(`比赛场地：\x1b[31m原网站无此数据\x1b[0m`);
        console.log(`比赛天气：\x1b[31m原网站无此数据\x1b[0m`);
        console.log(`比赛温度：\x1b[31m原网站无此数据\x1b[0m`);
        console.log(`文件生成失败`);
        
        // 返回一个基本的对象
        return {
          id: matchId,
          homeTeam: { name: 'unknown' },
          awayTeam: { name: 'unknown' },
          fileName: `unknown-time-${matchId}-unknownVSunknown`
        };
      }
    }
    
    // 直接按照ID顺序爬取每个比赛的完整信息
    for (let i = 0; i < matchesData.length; i++) {
      const { id: matchId } = matchesData[i];
      
      // 添加灰色分隔线
      console.log('\x1b[90m%s\x1b[0m', '------------------------------------');
      console.log(`正在爬取第${i+1}场比赛，总场数${matchesData.length}场`);
      
      // 爬取单场比赛的完整信息
      const matchDetail = await scrapeMatchDetail(matchId, i, matchesData.length);
      
      // 添加到结果数组
      allMatches.push(matchDetail);
      
      // 每爬取一场比赛，就实时广播一次更新
      broadcastMatchesUpdate([matchDetail], i+1, matchesData.length, i+1 === matchesData.length);
      
      // 在爬取之间添加短暂延迟，降低服务器压力
      if (i < matchesData.length - 1) {
        await new Promise(r => setTimeout(r, 500)); // 500ms延迟
      }
    }
    
    // 简化爬取完成的日志输出
    console.log(`爬取完成，总共处理了 ${allMatches.length} 场比赛`);
    
    return allMatches;
  } catch (error) {
    console.error('爬取比赛ID失败:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * 下载球队队徽到本地
 * @param {BrowserContext} context 浏览器上下文
 * @param {string} logoUrl 队徽URL
 * @param {string} teamName 队名
 * @returns {Promise<Object|null>} 包含路径和状态的对象，或null表示失败
 */
async function downloadTeamLogo(context, logoUrl, teamName) {
  if (!logoUrl) return null;
  
  try {
    // 创建存储目录
    const logoDir = path.join(__dirname, 'LOGOS');
    if (!fs.existsSync(logoDir)) {
      fs.mkdirSync(logoDir, { recursive: true });
    }
    
    // 生成文件名
    const logoFileName = `${safeFilename(teamName)}.png`;
    const logoPath = path.join(logoDir, logoFileName);
    
    // 检查文件是否已存在
    if (fs.existsSync(logoPath)) {
      // 返回对象包含路径和状态
      return {
        path: `/logos/${logoFileName}`,
        status: '已存在'
      };
    }
    
    // 下载图片
    const page = await context.newPage();
    const response = await page.goto(logoUrl);
    if (response && response.ok()) {
      const imageBuffer = await response.body();
      fs.writeFileSync(logoPath, imageBuffer);
      await page.close();
      return {
        path: `/logos/${logoFileName}`,
        status: '已下载'
      };
    }
    
    await page.close();
    return null;
  } catch (error) {
    console.error(`下载队徽失败 ${teamName}:`, error.message);
    return null;
  }
}

/**
 * 保存比赛数据到本地JSON文件
 * @param {string} matchId 比赛ID
 * @param {object} matchData 比赛数据
 */
function saveMatchData(matchId, matchData = null) {
  if (!matchData) return;
  
  try {
    // 创建保存目录
    const matchJsonDir = path.join(__dirname, 'match_json');
    if (!fs.existsSync(matchJsonDir)) {
      fs.mkdirSync(matchJsonDir, { recursive: true });
    }
    
    // 生成文件名
    const timeStr = matchData.matchTime ? formatDateTimeForFilename(matchData.matchTime) : 'unknown-time';
    const homeTeamName = matchData.homeTeam && matchData.homeTeam.name ? safeFilename(matchData.homeTeam.name) : 'unknown';
    const awayTeamName = matchData.awayTeam && matchData.awayTeam.name ? safeFilename(matchData.awayTeam.name) : 'unknown';
    const fileName = `${timeStr}-${matchId}-${homeTeamName}VS${awayTeamName}`;
    
    // 保存到JSON文件
    const filePath = path.join(matchJsonDir, `${fileName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(matchData, null, 2), 'utf8');
    
    console.log(`\x1b[32m%s\x1b[0m`, `成功保存比赛 ${matchId} 数据到 ${fileName}.json`);
  } catch (error) {
    console.error(`保存比赛 ${matchId} 数据失败:`, error.message);
  }
}

module.exports = {
  scrapeMatchesList,
  cleanupAllJsonFiles,
  cleanupInvalidJsonFiles,
  saveMatchData
}; 