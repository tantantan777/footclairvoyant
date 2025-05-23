/**
 * 比赛详细信息爬虫
 * 用于爬取比赛的欧赔、亚盘和历史数据
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * 广播比赛详细信息进度更新
 * @param {string} matchId 比赛ID
 * @param {number} progress 进度百分比
 * @param {string} status 状态
 * @param {string} message 消息
 */
function broadcastProgress(matchId, progress, status, message) {
  try {
    // 检查io对象是否存在
    if (global.io) {
      const updateData = {
        matchId,
        progress,
        status,
        message,
        timestamp: new Date().toISOString()
      };
      
      // 检查连接的客户端数量
      const clientCount = global.connectedClients || 0;
      
      if (clientCount > 0) {
        // 只输出百分比和消息，不输出状态
        console.log(`[${progress}%] ${message}`);
        global.io.emit('match-progress', updateData);
      } else {
        // 只输出百分比和消息，不输出状态
        console.log(`[${progress}%] ${message} (无客户端连接)`);
      }
    } else {
      console.warn(`无法广播进度更新 - global.io 对象不存在`);
    }
  } catch (error) {
    console.error('广播进度更新失败:', error);
  }
}

/**
 * 盘口格式化函数
 * @param {string} handicap 盘口字符串
 * @returns {string} 格式化后的盘口字符串
 */
function formatHandicap(handicap) {
  if (!handicap) return '';
  let isLet = handicap.includes('*');
  let h = handicap.replace(/\*/g, '');
  const singleMap = {
    '平': '平手',
    '半': '半球',
    '一': '一球',
    '二': '二球',
    '三': '三球',
    '四': '四球',
    '五': '五球'
  };
  const comboMap = [
    { reg: /^平\/半$/, val: '平手/半球' },
    { reg: /^半\/一$/, val: '半球/一球' },
    { reg: /^一\/球半$/, val: '一球/球半' },
    { reg: /^球半\/两$/, val: '球半/两球' },
    { reg: /^两\/两球半$/, val: '两球/两球半' }
  ];
  for (let item of comboMap) {
    if (item.reg.test(h)) {
      return (isLet ? '受让' : '') + item.val;
    }
  }
  if (singleMap[h]) {
    return (isLet ? '受让' : '') + singleMap[h];
  }
  return (isLet ? '受让' : '') + h;
}


/**
 * 格式化公司名称（欧赔）
 * @param {string} company 原始公司名称
 * @returns {string} 标准化公司名称
 */
function formatCompany(company) {
  if (!company) return '';

  // 竞彩让球玩法匹配
  const letMatch = company.match(/竞彩让.*?([+-]\d+)/);
  if (letMatch) {
    return `中国竞彩官方（让球${letMatch[1]}玩法）`;
  }

  const mapping = {
    '竞彩官': '中国竞彩官方',
    '澳': '澳门',
    'Crow*': '皇冠',
    '香港马*(中国香港)': '香港马会（中国香港）',
    '威*(英国)': '威廉希尔（英国）',
    '立*(英国)': '立博（英国）',
    'Interwet*(塞浦路斯)': 'Interwetten（塞浦路斯）',
    'SNA*(意大利)': 'SNAI（意大利）',
    'Betfai*(英国)': 'Betfair（英国）',
    '10*(英国)': '10BET（英国）',
    'Bwi*(奥地利)': 'Bwin（奥地利）',
    'Cora*(英国)': 'Coral（英国）',
    '易*(安提瓜和巴布达)': '易胜博（安提瓜和巴布达）',
    '金宝': '金宝博',
    '伟*(直布罗陀)': '伟德（直布罗陀）',
    'IBC*(哥斯达黎加)': 'IBCBET（哥斯达黎加）',
    '博天*(瓦努阿图)': '博天堂（瓦努阿图）',
    '明*(菲律宾)': '明升（菲律宾）',
    '盈*(菲律宾)': '盈禾（菲律宾）',
    'bet-at-h*(马尔他)': 'bet-at-home（马尔他）',
    'Exp*(瑞典)': 'Expekt（瑞典）',
    'ST*(波兰)': 'STANLEYBET（波兰）',
    '利*(英国)': '利记（英国）',
    'Bets*(瑞典)': 'Betsafe（瑞典）',
    'Bet9j* (尼日利亚)': 'Bet9j（尼日利亚）',
    'Beta*(巴西)': 'Betano（巴西）',
    'Beta*(德国)': 'Betano（德国）',
    'Betf*(意大利)': 'Betfair（意大利）',
    'Betwa*(直布罗陀)': 'Betway（直布罗陀）',
    'Boylespo*(马恩岛)': 'Boylesports（马恩岛）',
    'Dafa*(菲律宾)': 'Dafabet（菲律宾）',
    'gioco digit*(意大利)': 'Gioco Digitale（意大利）',
    'Hrvatska Lutr*(克罗地亚)': 'Hrvatska Lutrija（克罗地亚）',
    'idda*(土耳其)': 'Iddaa（土耳其）',
    'Meridian*(爱尔兰)': 'Meridian（爱尔兰）',
    'Nor*(挪威)': 'Nordicbet（挪威）',
    'Norsk tipt*(挪威)': 'Norsk Tipping（挪威）',
    'Paddy Po*(爱尔兰)': 'Paddy Power（爱尔兰）',
    'PM*(法国)': 'PMU（法国）',
    'Sazka*(捷克)': 'Sazka（捷克）',
    'Sisa*(意大利)': 'Sisal（意大利）',
    'Stoixima*(塞浦路斯)': 'Stoiximan（塞浦路斯）',
    'Tip*(奥地利)': 'Tipico（奥地利）',
    'Tipsport*(斯洛伐克)': 'Tipsport（斯洛伐克）',
    '36*(英国)': 'Bet365（英国）',
    '12*(菲律宾)': '12BET（菲律宾）',
    '18': '18BET',
    'Pinna*(荷兰)': 'Pinnacle（库拉索）',
    '优胜*(马耳他)': 'Unibet（马耳他）',
    'Betsson Sportsb*(英国)': 'Betsson Sportsbook（英国）',
    'Bov*.lv': 'Bovada.lv',
    'CashPo*(奥地利)': 'Cashpoint（奥地利）',
    'Casinobarcelon*.es(西班牙)': 'Casino Barcelona（西班牙）',
    'Dansk Tipstjene*(丹麦)': 'Dansk Tipstjeneste（丹麦）',
    'Domus*.it(意大利)': 'Domus Bet（意大利）',
    'Efbe*(马耳他)': 'EFBet（马耳他）',
    'Five*.it(意大利)': 'Five Star（意大利）',
    'Fon*(俄罗斯)': 'Fonbet（俄罗斯）',
    'Gbet*(南非)': 'G-Bet（南非）',
    'Gold*(马耳它)': 'GoldBet（马耳他）',
    'Ifort*.eu': 'Ifortuna.eu',
    'Intert*(安提瓜和巴布达)': 'Intertops（安提瓜和巴布达）',
    'Ladbro*.au': 'Ladbrokes Australia（澳大利亚）',
    'LeoVe*.it': 'LeoVegas（意大利）',
    'Net*.it': 'NetBet（意大利）',
    'Pamestih*(希腊)': 'Pamestoixima（希腊）',
    'pris*(俄罗斯)': 'Parimatch（俄罗斯）',
    'Sazk*(捷克)': 'Sazka（捷克）',
    'sky*(英国)': 'Sky Bet（英国）',
    'Sport*.it': 'SportItalia（意大利）',
    'SportP*.it': 'SportPesa（意大利）',
    'Stanley*(马耳他)': 'Stanleybet（马耳他）',
    'Superma*.com.uy': 'Supermatch（乌拉圭）',
    'Swe*(瑞典)': 'Svenska Spel（瑞典）',
    'Ta*.co.nz': 'TAB New Zealand（新西兰）',
    'Titan*(英属维尔京群岛)': 'Titanbet（英属维尔京群岛）',
    'Tony*(马耳他)': 'TonyBet（马耳他）',
    'Uni*.fr(法国)': 'Unibet（法国）',
    'Vbe*(法国)': 'Vbet（法国）',
    'VBe*(库拉索)': 'Vbet（库拉索）',
    'Vbe*(乌克兰)': 'Vbet（乌克兰）',
    'Veikk*(芬兰)': 'Veikkaus（芬兰）',
    'Winlin*.ru': 'WinLine（俄罗斯）',
    'Wina*.com': 'Wina',
    '竞彩让*': '中国竞彩官方（让球玩法）',
  };

  return Object.prototype.hasOwnProperty.call(mapping, company) ? mapping[company] : company;
}

/**
 * 格式化亚让盘公司名称为欧赔风格
 * @param {string} company 原始公司名称
 * @returns {string} 标准化公司名称
 */
function formatAsiaCompany(company) {
  if (!company) return '';

  const letMatch = company.match(/竞彩让.*?([+-]\d+)/);
  if (letMatch) {
    return `竞彩官方（让球${letMatch[1]}玩法）`;
  }

  const mapping = {
    '澳*': '澳门',
    'Crow*': '皇冠',
    '平*': '平博',
    '36*': 'Bet365（英国）',
    '易*': '易胜博（安提瓜和巴布达）',
    '伟*': '伟德（直布罗陀）',
    '伟德*': '伟德（直布罗陀）',
    '金宝*': '金宝博',
    '立*': '立博（英国）',
    '明*': '明升（菲律宾）',
    '盈*': '盈禾（菲律宾）',
    '利*': '利记（英国）',
    'Interwet*': 'Interwetten（塞浦路斯）',
    '12*': '12BET（菲律宾）',
    '18*': '18BET',
    '香港马*': '香港马会（中国香港）',
    '威*': '威廉希尔（英国）',
    '最大值': '最大值',
    '最小值': '最小值',
  };

  return Object.prototype.hasOwnProperty.call(mapping, company) ? mapping[company] : company;
}



/**
 * 爬取比赛欧赔初盘数据
 * @param {string} matchId 比赛ID
 * @returns {Promise<Array>} 欧赔初盘数据
 */
async function scrapeEuropeInitialOdds(matchId) {
  try {
    // 启动浏览器
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 构建目标URL
    const oddsUrl = `https://op1.titan007.com/oddslist/${matchId}.htm`;
    
    // 访问页面
    await page.goto(oddsUrl, { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    
    // 选择"初"盘数据（value=2 表示初盘）
    await page.selectOption('#sel_showType', '2');
    
    // 等待表格加载完成
    await page.waitForSelector('#oddsList_tab', { timeout: 10000 });
    
    // 爬取表格数据
    const oddsData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#oddsList_tab tr[id^="oddstr_"]'));
      return rows.map(row => {
        try {
          // 获取所有单元格
          const cells = row.querySelectorAll('td');
          
          // 如果单元格不足，返回null（无效行）
          if (cells.length < 13) return null;
          
          // 提取文本内容，去除多余空格
          const getCellText = (cell) => {
            // 从单元格中提取纯文本，忽略HTML标签
            return cell ? cell.textContent.trim() : '';
          };
          
          // 安全地解析浮点数，无效或空时返回null
          const parseFloatSafe = (text) => {
            if (!text || text.trim() === '') return null;
            const value = parseFloat(text.replace(/[^\d.-]/g, ''));
            return isNaN(value) ? null : value;
          };
          
          // 获取公司名称（第2个单元格，去除特殊字符和星号）
          let company = getCellText(cells[1]);
          // 处理可能包含的特殊标记
          company = company.replace(/[\*\s]*$/, '').replace(/[\s]*$/, '');
          company = company.split('<')[0].trim(); // 移除可能的HTML标记
          
          // 获取赔率（第3、4、5个单元格）
          const homeOdds = parseFloatSafe(getCellText(cells[2]));
          const drawOdds = parseFloatSafe(getCellText(cells[3]));
          const awayOdds = parseFloatSafe(getCellText(cells[4]));
          
          // 获取胜率（第6、7、8个单元格）
          const homeWinRate = parseFloatSafe(getCellText(cells[5]));
          const drawRate = parseFloatSafe(getCellText(cells[6]));
          const awayWinRate = parseFloatSafe(getCellText(cells[7]));
          
          // 获取返还率（第9个单元格）
          const returnRate = parseFloatSafe(getCellText(cells[8]));
          
          // 获取凯利指数（第10、11、12个单元格）
          const homeKellyIndex = parseFloatSafe(getCellText(cells[9]));
          const drawKellyIndex = parseFloatSafe(getCellText(cells[10]));
          const awayKellyIndex = parseFloatSafe(getCellText(cells[11]));
          
          // 获取更新时间（第13个单元格）
          const updateTime = getCellText(cells[12]);
          
          return {
            company,
            homeOdds,
            drawOdds,
            awayOdds,
            returnRate,
            homeWinRate,
            drawRate,
            awayWinRate,
            homeKellyIndex,
            drawKellyIndex,
            awayKellyIndex,
            updateTime
          };
        } catch (error) {
          console.error('解析行数据出错:', error);
          return null; // 处理错误行
        }
      }).filter(item => item !== null); // 过滤无效行
    });
    
    // 关闭浏览器
    await browser.close();
    
    // 格式化公司名
    oddsData.forEach(item => {
      item.company = formatCompany(item.company);
    });

    // 返回爬取的数据
    return oddsData;
  } catch (error) {
    console.error(`爬取欧赔初盘数据失败 (${matchId}):`, error.message);
    // 返回空数组表示失败
    return [];
  }
}

/**
 * 爬取比赛欧赔即时盘数据
 * @param {string} matchId 比赛ID
 * @returns {Promise<Array>} 欧赔即时盘数据
 */
async function scrapeEuropeLiveOdds(matchId) {
  try {
    // 启动浏览器
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 构建目标URL
    const oddsUrl = `https://op1.titan007.com/oddslist/${matchId}.htm`;
    
    // 访问页面
    await page.goto(oddsUrl, { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    
    // 选择"即"盘数据（value=3 表示即时盘，默认已选中，但为确保，还是显式选择）
    await page.selectOption('#sel_showType', '3');
    
    // 等待表格加载完成
    await page.waitForSelector('#oddsList_tab', { timeout: 10000 });
    
    // 爬取表格数据
    const oddsData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#oddsList_tab tr[id^="oddstr_"]'));
      return rows.map(row => {
        try {
          // 获取所有单元格
          const cells = row.querySelectorAll('td');
          
          // 如果单元格不足，返回null（无效行）
          if (cells.length < 13) return null;
          
          // 提取文本内容，去除多余空格
          const getCellText = (cell) => {
            // 从单元格中提取纯文本，忽略HTML标签
            return cell ? cell.textContent.trim() : '';
          };
          
          // 安全地解析浮点数，无效或空时返回null
          const parseFloatSafe = (text) => {
            if (!text || text.trim() === '') return null;
            const value = parseFloat(text.replace(/[^\d.-]/g, ''));
            return isNaN(value) ? null : value;
          };
          
          // 获取公司名称（第2个单元格，去除特殊字符和星号）
          let company = getCellText(cells[1]);
          // 处理可能包含的特殊标记
          company = company.replace(/[\*\s]*$/, '').replace(/[\s]*$/, '');
          company = company.split('<')[0].trim(); // 移除可能的HTML标记
          
          // 获取赔率（第3、4、5个单元格）
          const homeOdds = parseFloatSafe(getCellText(cells[2]));
          const drawOdds = parseFloatSafe(getCellText(cells[3]));
          const awayOdds = parseFloatSafe(getCellText(cells[4]));
          
          // 获取胜率（第6、7、8个单元格）
          const homeWinRate = parseFloatSafe(getCellText(cells[5]));
          const drawRate = parseFloatSafe(getCellText(cells[6]));
          const awayWinRate = parseFloatSafe(getCellText(cells[7]));
          
          // 获取返还率（第9个单元格）
          const returnRate = parseFloatSafe(getCellText(cells[8]));
          
          // 获取凯利指数（第10、11、12个单元格）
          const homeKellyIndex = parseFloatSafe(getCellText(cells[9]));
          const drawKellyIndex = parseFloatSafe(getCellText(cells[10]));
          const awayKellyIndex = parseFloatSafe(getCellText(cells[11]));
          
          // 获取更新时间（第13个单元格）
          const updateTime = getCellText(cells[12]);
          
          return {
            company,
            homeOdds,
            drawOdds,
            awayOdds,
            returnRate,
            homeWinRate,
            drawRate,
            awayWinRate,
            homeKellyIndex,
            drawKellyIndex,
            awayKellyIndex,
            updateTime
          };
        } catch (error) {
          console.error('解析行数据出错:', error);
          return null; // 处理错误行
        }
      }).filter(item => item !== null); // 过滤无效行
    });
    
    // 关闭浏览器
    await browser.close();
    
    // 格式化公司名
    oddsData.forEach(item => {
      item.company = formatCompany(item.company);
    });

    // 返回爬取的数据
    return oddsData;
  } catch (error) {
    console.error(`爬取欧赔即时盘数据失败 (${matchId}):`, error.message);
    // 返回空数组表示失败
    return [];
  }
}

/**
 * 爬取比赛亚盘数据
 * @param {string} matchId 比赛ID
 * @returns {Promise<Array>} 亚盘数据
 */
async function scrapeAsiaHandicapOdds(matchId) {
  try {
    // 启动浏览器
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 构建亚盘数据的URL
    const asiaOddsUrl = `https://vip.titan007.com/AsianOdds_n.aspx?id=${matchId}&l=0`;
    
    // 访问页面
    await page.goto(asiaOddsUrl, { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    
    // 等待亚盘表格加载完成
    await page.waitForSelector('#odds', { timeout: 10000 });
    
    // 爬取表格数据
    const oddsData = await page.evaluate(() => {
      // 选择表格中的所有数据行
      const allRows = Array.from(document.querySelectorAll('#odds > tbody > tr'));
      
      // 找出最大值和最小值行
      const maxRow = allRows.find(row => row.id === 'maxTr');
      const minRow = allRows.find(row => row.id === 'minTr');
      
      // 选择普通数据行
      const normalRows = allRows.filter(row => {
        // 排除表头（thead2类）和汇总行（maxTr/minTr）以及隐藏行
        return !row.classList.contains('thead2') && 
               row.id !== 'maxTr' && 
               row.id !== 'minTr' &&
               !row.style.display.includes('none') && // 排除隐藏行
               !row.hasAttribute('companyid') && // 排除多盘的隐藏行
               row.querySelector('td') && // 确保有td元素
               row.querySelectorAll('td').length > 7; // 确保有足够的单元格
      });
      
      const result = [];
      
      // 提取文本内容，去除多余空格
      const getCellText = (cell) => {
        return cell ? cell.textContent.trim() : '';
      };
      
      // 安全地解析浮点数，无效或空时返回null
      const parseFloatSafe = (text) => {
        if (!text || text.trim() === '') return null;
        const value = parseFloat(text.replace(/[^\d.-]/g, ''));
        return isNaN(value) ? null : value;
      };
      
      // 处理普通行
      normalRows.forEach(row => {
        try {
          // 获取所有单元格
          const cells = row.querySelectorAll('td');
          
          // 获取公司名称（第1个单元格，去除特殊字符和星号）
          let company = getCellText(cells[0]);
          company = company.trim();
          
          // 获取初盘数据
          const initialHomeOdds = parseFloatSafe(getCellText(cells[2]));
          
          // 获取盘口值 - 优先使用中文描述而非数值
          let initialHandicap = getCellText(cells[3]); // 直接获取单元格文本作为中文描述
          if (!initialHandicap && cells[3].hasAttribute('goals')) {
            // 如果文本内容为空，才使用goals属性值
            initialHandicap = cells[3].getAttribute('goals');
          }
          
          const initialAwayOdds = parseFloatSafe(getCellText(cells[4]));
          
          // 获取即时盘数据
          const liveHomeOdds = parseFloatSafe(getCellText(cells[5]));
          
          // 同样优先使用中文描述
          let liveHandicap = getCellText(cells[6]); // 直接获取单元格文本作为中文描述
          if (!liveHandicap && cells[6].hasAttribute('goals')) {
            // 如果文本内容为空，才使用goals属性值
            liveHandicap = cells[6].getAttribute('goals');
          }
          
          const liveAwayOdds = parseFloatSafe(getCellText(cells[7]));
          
          result.push({
            company,
            initialHomeOdds,
            initialHandicap,
            initialAwayOdds,
            liveHomeOdds,
            liveHandicap,
            liveAwayOdds
          });
        } catch (error) {
          console.error('解析亚盘行数据出错:', error);
          // 处理错误行，继续处理下一行
        }
      });
      
      // 处理最大值行
      if (maxRow) {
        try {
          // 获取所有不带style="display: none"的单元格
          const visibleCells = [];
          for (const cell of maxRow.querySelectorAll('td')) {
            if (!cell.style || !cell.style.display || cell.style.display !== 'none') {
              visibleCells.push(cell);
            }
          }
          
          // 检查单元格数量是否足够
          if (visibleCells.length >= 7) {
            // 公司名是第1个单元格
            const company = "最大值";
            
            // 正确分配字段
            const initialHomeOdds = parseFloatSafe(getCellText(visibleCells[1]));  // 初盘主队赔率
            const initialHandicap = getCellText(visibleCells[2]);  // 初盘盘口
            const initialAwayOdds = parseFloatSafe(getCellText(visibleCells[3]));  // 初盘客队赔率
            const liveHomeOdds = parseFloatSafe(getCellText(visibleCells[4]));  // 即时盘主队赔率
            const liveHandicap = getCellText(visibleCells[5]);  // 即时盘盘口
            const liveAwayOdds = parseFloatSafe(getCellText(visibleCells[6]));  // 即时盘客队赔率
            
            // 将提取的数据添加到结果中，使用与app.py相同的字段名
            result.push({
              company,
              initialHomeOdds,
              initialHandicap,
              initialAwayOdds,
              liveHomeOdds,
              liveHandicap,
              liveAwayOdds,
              isMaxValue: true
            });
          }
        } catch (error) {
          console.error('解析最大值行出错:', error);
        }
      }
      
      // 处理最小值行
      if (minRow) {
        try {
          // 获取所有不带style="display: none"的单元格
          const visibleCells = [];
          for (const cell of minRow.querySelectorAll('td')) {
            if (!cell.style || !cell.style.display || cell.style.display !== 'none') {
              visibleCells.push(cell);
            }
          }
          
          // 检查单元格数量是否足够
          if (visibleCells.length >= 7) {
            // 公司名是第1个单元格
            const company = "最小值";
            
            // 正确分配字段
            const initialHomeOdds = parseFloatSafe(getCellText(visibleCells[1]));  // 初盘主队赔率
            const initialHandicap = getCellText(visibleCells[2]);  // 初盘盘口
            const initialAwayOdds = parseFloatSafe(getCellText(visibleCells[3]));  // 初盘客队赔率
            const liveHomeOdds = parseFloatSafe(getCellText(visibleCells[4]));  // 即时盘主队赔率
            const liveHandicap = getCellText(visibleCells[5]);  // 即时盘盘口
            const liveAwayOdds = parseFloatSafe(getCellText(visibleCells[6]));  // 即时盘客队赔率
            
            // 将提取的数据添加到结果中
            result.push({
              company,
              initialHomeOdds,
              initialHandicap,
              initialAwayOdds,
              liveHomeOdds,
              liveHandicap, 
              liveAwayOdds,
              isMinValue: true
            });
          }
        } catch (error) {
          console.error('解析最小值行出错:', error);
        }
      }
      
      return result;
    });
    
    // 关闭浏览器
    await browser.close();
    
    // 对盘口字段格式化
    oddsData.forEach(item => {
      item.initialHandicap = formatHandicap(item.initialHandicap);
      item.liveHandicap = formatHandicap(item.liveHandicap);
      // 新增：格式化公司名称
      item.company = formatAsiaCompany(item.company);
    });

    return oddsData;
  } catch (error) {
    console.error(`爬取亚盘数据失败 (${matchId}):`, error.message);
    // 返回空数组表示失败
    return [];
  }
}

/**
 * 爬取比赛的所有历史数据（主队历史、客队历史和交锋历史）
 * @param {string} matchId 比赛ID
 * @param {string} homeTeamName 主队名称
 * @param {string} awayTeamName 客队名称
 * @returns {Promise<Object>} 包含所有历史数据的对象
 */
async function scrapeAllHistoryData(matchId, homeTeamName, awayTeamName) {
  try {
    // 启动浏览器
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 访问历史比赛页面
    const url = `https://zq.titan007.com/analysis/${matchId}cn.htm`;
    await page.goto(url, { timeout: 60000 });  // 较长的超时时间确保页面加载
    await page.waitForLoadState('networkidle');  // 等待网络请求完成
    await page.waitForTimeout(5000);  // 等待时间确保JS执行完毕
    
    // ============ 主队历史数据 ============
    let homeHistory = [];
    try {
      // 尝试选择最大值以显示更多历史数据
      const homeSelectExists = await page.locator('#hn_s').count() > 0;
      
      if (homeSelectExists) {
        // 获取所有选项
        const options = await page.locator('#hn_s option').all();
        if (options.length > 0) {
          // 获取最后一个选项的值
          const lastOption = options[options.length - 1];
          const maxValue = await lastOption.getAttribute('value');
          
          // 选择最大值选项
          await page.selectOption('#hn_s', maxValue);
          
          // 等待数据加载
          await page.waitForTimeout(3000);
        }
      }
      
      // 检查表格是否存在
      const homeTableExists = await page.locator('table#table_hn').count() > 0;
      
      if (homeTableExists) {
        // 提取行数据，包括让球、胜负和进球数
        homeHistory = await page.$$eval('table#table_hn tr', rows => {
          // 过滤掉表头和汇总行
          const dataRows = rows.filter(row => {
            return row.hasAttribute('id') && row.id.startsWith('trhn_');
          });
          
          return dataRows.map(row => {
            try {
              const cells = Array.from(row.querySelectorAll('td'));
              if (cells.length < 15) return null; // 确保行有足够的单元格
              
              // 提取基本信息
              const league = cells[0] ? cells[0].textContent.trim().replace(/\s+/g, ' ') : '';
              const date = cells[1] ? cells[1].textContent.trim() : '';
              const homeTeam = cells[2] ? cells[2].textContent.trim().replace(/\s+/g, ' ') : '';
              
              // 提取比分和半场比分
              let score = '';
              let halfTimeScore = '';
              const scoreCell = cells[3] ? cells[3].textContent.trim() : '';
              if (scoreCell) {
                const scoreMatch = scoreCell.match(/(.+?)\((.+?)\)/);
                if (scoreMatch) {
                  score = scoreMatch[1].trim();
                  halfTimeScore = scoreMatch[2].trim();
                } else {
                  score = scoreCell;
                }
              }
              
              const corner = cells[4] ? cells[4].textContent.trim() : '';
              const awayTeam = cells[5] ? cells[5].textContent.trim().replace(/\s+/g, ' ') : '';
              
              // 跳过亚盘和欧赔数据(第7-12列)，直接提取最后三列
              // 胜负列(倒数第3列)
              const resultText = cells[cells.length - 3] ? cells[cells.length - 3].textContent.trim() : '';
              
              // 解析结果文本
              let result = '';
              if (resultText.includes('胜')) {
                result = '胜';
              } else if (resultText.includes('平')) {
                result = '平';
              } else if (resultText.includes('负')) {
                result = '负';
              }
              
              // 让球列(倒数第2列)
              const handicapText = cells[cells.length - 2] ? cells[cells.length - 2].textContent.trim() : '';
              
              // 解析让球文本
              let handicapResult = '';
              if (handicapText.includes('赢')) {
                handicapResult = '赢';
              } else if (handicapText.includes('走')) {
                handicapResult = '走';
              } else if (handicapText.includes('输')) {
                handicapResult = '输';
              }
              
              // 进球数列(倒数第1列)
              const goalText = cells[cells.length - 1] ? cells[cells.length - 1].textContent.trim() : '';
              
              // 解析进球数文本
              let goalResult = '';
              if (goalText.includes('大')) {
                goalResult = '大';
              } else if (goalText.includes('走')) {
                goalResult = '走';
              } else if (goalText.includes('小')) {
                goalResult = '小';
              }
              
              // 尝试从盘口值单元格中提取实际盘口值
              // 根据HTML，盘口值通常在第8列
              let handicap = '';
              if (cells[7]) {
                const handicapCell = cells[7];
                const handicapLinks = handicapCell.querySelectorAll('a');
                if (handicapLinks.length > 0) {
                  handicap = handicapLinks[0].textContent.trim();
                } else {
                  handicap = handicapCell.textContent.trim();
                }
              }
              
              return {
                league,
                date,
                homeTeam,
                score,
                halfTimeScore,
                corner,
                awayTeam,
                result,
                handicap,
                handicapResult,
                goalResult
              };
            } catch (error) {
              console.error('解析主队历史行数据出错:', error);
              return null;
            }
          }).filter(item => item !== null);
        });
      }
    } catch (error) {
      console.error(`爬取主队历史数据失败:`, error.message);
    }
    
    // ============ 客队历史数据 ============
    let awayHistory = [];
    try {
      // 尝试选择最大值以显示更多历史数据
      const awaySelectExists = await page.locator('#an_s').count() > 0;
      
      if (awaySelectExists) {
        // 获取所有选项
        const options = await page.locator('#an_s option').all();
        if (options.length > 0) {
          // 获取最后一个选项的值
          const lastOption = options[options.length - 1];
          const maxValue = await lastOption.getAttribute('value');
          
          // 选择最大值选项
          await page.selectOption('#an_s', maxValue);
          
          // 等待数据加载
          await page.waitForTimeout(3000);
        }
      }
      
      // 检查表格是否存在
      const awayTableExists = await page.locator('table#table_an').count() > 0;
      
      if (awayTableExists) {
        // 提取行数据，包括让球、胜负和进球数
        awayHistory = await page.$$eval('table#table_an tr', rows => {
          // 过滤掉表头和汇总行
          const dataRows = rows.filter(row => {
            return row.hasAttribute('id') && row.id.startsWith('tran_');
          });
          
          return dataRows.map(row => {
            try {
              const cells = Array.from(row.querySelectorAll('td'));
              if (cells.length < 15) return null; // 确保行有足够的单元格
              
              // 提取基本信息
              const league = cells[0] ? cells[0].textContent.trim().replace(/\s+/g, ' ') : '';
              const date = cells[1] ? cells[1].textContent.trim() : '';
              const homeTeam = cells[2] ? cells[2].textContent.trim().replace(/\s+/g, ' ') : '';
              
              // 提取比分和半场比分
              let score = '';
              let halfTimeScore = '';
              const scoreCell = cells[3] ? cells[3].textContent.trim() : '';
              if (scoreCell) {
                const scoreMatch = scoreCell.match(/(.+?)\((.+?)\)/);
                if (scoreMatch) {
                  score = scoreMatch[1].trim();
                  halfTimeScore = scoreMatch[2].trim();
                } else {
                  score = scoreCell;
                }
              }
              
              const corner = cells[4] ? cells[4].textContent.trim() : '';
              const awayTeam = cells[5] ? cells[5].textContent.trim().replace(/\s+/g, ' ') : '';
              
              // 跳过亚盘和欧赔数据(第7-12列)，直接提取最后三列
              // 胜负列(倒数第3列)
              const resultText = cells[cells.length - 3] ? cells[cells.length - 3].textContent.trim() : '';
              
              // 解析结果文本
              let result = '';
              if (resultText.includes('胜')) {
                result = '胜';
              } else if (resultText.includes('平')) {
                result = '平';
              } else if (resultText.includes('负')) {
                result = '负';
              }
              
              // 让球列(倒数第2列)
              const handicapText = cells[cells.length - 2] ? cells[cells.length - 2].textContent.trim() : '';
              
              // 解析让球文本
              let handicapResult = '';
              if (handicapText.includes('赢')) {
                handicapResult = '赢';
              } else if (handicapText.includes('走')) {
                handicapResult = '走';
              } else if (handicapText.includes('输')) {
                handicapResult = '输';
              }
              
              // 进球数列(倒数第1列)
              const goalText = cells[cells.length - 1] ? cells[cells.length - 1].textContent.trim() : '';
              
              // 解析进球数文本
              let goalResult = '';
              if (goalText.includes('大')) {
                goalResult = '大';
              } else if (goalText.includes('走')) {
                goalResult = '走';
              } else if (goalText.includes('小')) {
                goalResult = '小';
              }
              
              // 尝试从盘口值单元格中提取实际盘口值
              // 根据HTML，盘口值通常在第8列
              let handicap = '';
              if (cells[7]) {
                const handicapCell = cells[7];
                const handicapLinks = handicapCell.querySelectorAll('a');
                if (handicapLinks.length > 0) {
                  handicap = handicapLinks[0].textContent.trim();
                } else {
                  handicap = handicapCell.textContent.trim();
                }
              }
              
              return {
                league,
                date,
                homeTeam,
                score,
                halfTimeScore,
                corner,
                awayTeam,
                result,
                handicap,
                handicapResult,
                goalResult
              };
            } catch (error) {
              console.error('解析客队历史行数据出错:', error);
              return null;
            }
          }).filter(item => item !== null);
        });
      }
    } catch (error) {
      console.error(`爬取客队历史数据失败:`, error.message);
    }
    
    // ============ 交锋历史数据 ============
    let h2hHistory = [];
    try {
      // 尝试选择最大值以显示更多历史数据
      const h2hSelectExists = await page.locator('#v_s').count() > 0;
      
      if (h2hSelectExists) {
        // 获取所有选项
        const options = await page.locator('#v_s option').all();
        if (options.length > 0) {
          // 获取最后一个选项的值
          const lastOption = options[options.length - 1];
          const maxValue = await lastOption.getAttribute('value');
          
          // 选择最大值选项
          await page.selectOption('#v_s', maxValue);
          
          // 等待数据加载
          await page.waitForTimeout(3000);
        }
      }
      
      // 检查表格是否存在
      const h2hTableExists = await page.locator('table#table_v').count() > 0;
      
      if (h2hTableExists) {
        // 提取行数据，包括让球、胜负和进球数
        h2hHistory = await page.$$eval('table#table_v tr', rows => {
          // 过滤掉表头和汇总行
          const dataRows = rows.filter(row => {
            return row.hasAttribute('id') && row.id.startsWith('trv_');
          });
          
          return dataRows.map(row => {
            try {
              const cells = Array.from(row.querySelectorAll('td'));
              if (cells.length < 15) return null; // 确保行有足够的单元格
              
              // 提取基本信息
              const league = cells[0] ? cells[0].textContent.trim().replace(/\s+/g, ' ') : '';
              const date = cells[1] ? cells[1].textContent.trim() : '';
              const homeTeam = cells[2] ? cells[2].textContent.trim().replace(/\s+/g, ' ') : '';
              
              // 提取比分和半场比分
              let score = '';
              let halfTimeScore = '';
              const scoreCell = cells[3] ? cells[3].textContent.trim() : '';
              if (scoreCell) {
                const scoreMatch = scoreCell.match(/(.+?)\((.+?)\)/);
                if (scoreMatch) {
                  score = scoreMatch[1].trim();
                  halfTimeScore = scoreMatch[2].trim();
                } else {
                  score = scoreCell;
                }
              }
              
              const corner = cells[4] ? cells[4].textContent.trim() : '';
              const awayTeam = cells[5] ? cells[5].textContent.trim().replace(/\s+/g, ' ') : '';
              
              // 跳过亚盘和欧赔数据(第7-12列)，直接提取最后三列
              // 胜负列(倒数第3列)
              const resultText = cells[cells.length - 3] ? cells[cells.length - 3].textContent.trim() : '';
              
              // 解析结果文本
              let result = '';
              if (resultText.includes('胜')) {
                result = '胜';
              } else if (resultText.includes('平')) {
                result = '平';
              } else if (resultText.includes('负')) {
                result = '负';
              }
              
              // 让球列(倒数第2列)
              const handicapText = cells[cells.length - 2] ? cells[cells.length - 2].textContent.trim() : '';
              
              // 解析让球文本
              let handicapResult = '';
              if (handicapText.includes('赢')) {
                handicapResult = '赢';
              } else if (handicapText.includes('走')) {
                handicapResult = '走';
              } else if (handicapText.includes('输')) {
                handicapResult = '输';
              }
              
              // 进球数列(倒数第1列)
              const goalText = cells[cells.length - 1] ? cells[cells.length - 1].textContent.trim() : '';
              
              // 解析进球数文本
              let goalResult = '';
              if (goalText.includes('大')) {
                goalResult = '大';
              } else if (goalText.includes('走')) {
                goalResult = '走';
              } else if (goalText.includes('小')) {
                goalResult = '小';
              }
              
              // 尝试从盘口值单元格中提取实际盘口值
              // 根据HTML，盘口值通常在第8列
              let handicap = '';
              if (cells[7]) {
                const handicapCell = cells[7];
                const handicapLinks = handicapCell.querySelectorAll('a');
                if (handicapLinks.length > 0) {
                  handicap = handicapLinks[0].textContent.trim();
                } else {
                  handicap = handicapCell.textContent.trim();
                }
              }
              
              return {
                league,
                date,
                homeTeam,
                score,
                halfTimeScore,
                corner,
                awayTeam,
                result,
                handicap,
                handicapResult,
                goalResult
              };
            } catch (error) {
              console.error('解析交锋历史行数据出错:', error);
              return null;
            }
          }).filter(item => item !== null);
        });
      }
    } catch (error) {
      console.error(`爬取交锋历史数据失败:`, error.message);
    }
    
    // 关闭浏览器
    await browser.close();
    
    // 主队历史盘口格式化
    homeHistory.forEach(item => {
      item.handicap = formatHandicap(item.handicap);
    });
    // 客队历史盘口格式化
    awayHistory.forEach(item => {
      item.handicap = formatHandicap(item.handicap);
    });
    // 交锋历史盘口格式化
    if (h2hHistory) {
      h2hHistory.forEach(item => {
        item.handicap = formatHandicap(item.handicap);
      });
    }

    return {
      homeHistory,
      awayHistory,
      headToHead: h2hHistory
    };
  } catch (error) {
    console.error(`爬取历史数据失败 (${matchId}):`, error.message);
    // 返回空数组表示失败
    return {
      homeHistory: [],
      awayHistory: [],
      headToHead: []
    };
  }
}

/**
 * 爬取单场比赛的详细信息（包含所有六种详细数据）
 * @param {string} matchId 比赛ID
 * @returns {Promise<Object>} 比赛详细信息对象
 */
async function scrapeMatchDetails(matchId) {
  try {
    // 读取match_json目录
    const matchJsonDir = path.join(__dirname, 'match_json');
    
    // 获取所有比赛文件
    const matchFiles = fs.readdirSync(matchJsonDir)
      .filter(file => file.endsWith('.json'));
    
    if (matchFiles.length === 0) {
      throw new Error(`未找到任何比赛文件`);
    }
    
    // 查找包含此ID的文件 - 通过读取每个文件内容来匹配
    let matchFilePath = null;
    let matchData = null;
    
    for (const file of matchFiles) {
      const filePath = path.join(matchJsonDir, file);
      try {
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        // 检查文件中的比赛ID是否匹配
        if (fileData && fileData.id && fileData.id === matchId) {
          matchFilePath = filePath;
          matchData = fileData;
          break;
        }
      } catch (err) {
        console.error(`读取文件 ${file} 失败:`, err.message);
        // 继续检查下一个文件
      }
    }
    
    if (!matchFilePath || !matchData) {
      throw new Error(`未找到ID为 ${matchId} 的比赛文件`);
    }
    
    const homeTeamName = matchData.homeTeam?.name || '未知主队';
    const awayTeamName = matchData.awayTeam?.name || '未知客队';
    
    // 初始化详细信息结构
    if (!matchData.details) {
      matchData.details = {
        status: 'inProgress',
        progress: 0,
        lastUpdated: new Date().toISOString(),
        odds: {
          europeInitial: [],
          europeLive: [],
          asiaHandicap: []
        },
        history: {
          homeHistory: [],
          awayHistory: [],
          headToHead: []
        }
      };
      // 写入初始状态
      fs.writeFileSync(matchFilePath, JSON.stringify(matchData, null, 2), 'utf8');
      // 广播初始进度
      broadcastProgress(matchId, 0, 'inProgress', '开始爬取详细信息');
    }
    
    // 依次爬取四种详细数据，并在每一步更新文件和广播进度
    
    // 1. 欧赔初盘
    console.log(`[0%] 开始爬取欧赔初盘数据`);
    matchData.details.status = 'inProgress';
    matchData.details.progress = 25; // 第一项完成将达到25%
    matchData.details.lastUpdated = new Date().toISOString();
    fs.writeFileSync(matchFilePath, JSON.stringify(matchData, null, 2), 'utf8');
    // 广播进度
    broadcastProgress(matchId, 25, 'inProgress', '爬取欧赔初盘');
    
    // 爬取欧赔初盘数据
    const europeInitialData = await scrapeEuropeInitialOdds(matchId);
    
    // 更新欧赔初盘数据到文件，并广播部分完成状态
    matchData.details.odds.europeInitial = europeInitialData;
    matchData.details.lastUpdated = new Date().toISOString();
    fs.writeFileSync(matchFilePath, JSON.stringify(matchData, null, 2), 'utf8');
    // 广播第一部分完成
    broadcastProgress(matchId, 25, 'partialCompleted', '欧赔初盘爬取完成');
    console.log(`[25%] 欧赔初盘爬取到 ${europeInitialData.length} 家博彩公司数据`);
    console.log(`[25%] 欧赔初盘已广播`);
    console.log(`-----------------------------------------`);
    
    // 2. 欧赔即时盘
    console.log(`[25%] 开始爬取欧赔即时盘数据`);
    matchData.details.progress = 50; // 第二项完成将达到50%
    matchData.details.lastUpdated = new Date().toISOString();
    fs.writeFileSync(matchFilePath, JSON.stringify(matchData, null, 2), 'utf8');
    // 广播进度
    broadcastProgress(matchId, 50, 'inProgress', '爬取欧赔即时盘');
    
    // 爬取欧赔即时盘数据
    const europeLiveData = await scrapeEuropeLiveOdds(matchId);
    
    // 更新欧赔即时盘数据到文件，并广播部分完成状态
    matchData.details.odds.europeLive = europeLiveData;
    matchData.details.lastUpdated = new Date().toISOString();
    fs.writeFileSync(matchFilePath, JSON.stringify(matchData, null, 2), 'utf8');
    // 广播第二部分完成
    broadcastProgress(matchId, 50, 'partialCompleted', '欧赔即时盘爬取完成');
    console.log(`[50%] 欧赔即时盘爬取到 ${europeLiveData.length} 家博彩公司数据`);
    console.log(`[50%] 欧赔即时盘已广播`);
    console.log(`-----------------------------------------`);
    
    // 3. 亚盘
    console.log(`[50%] 开始爬取亚盘数据`);
    matchData.details.progress = 75; // 第三项完成将达到75%
    matchData.details.lastUpdated = new Date().toISOString();
    fs.writeFileSync(matchFilePath, JSON.stringify(matchData, null, 2), 'utf8');
    // 广播进度
    broadcastProgress(matchId, 75, 'inProgress', '爬取亚盘');
    
    // 爬取亚盘数据
    const asiaHandicapData = await scrapeAsiaHandicapOdds(matchId);
    
    // 更新亚盘数据到文件，并广播部分完成状态
    matchData.details.odds.asiaHandicap = asiaHandicapData;
    matchData.details.lastUpdated = new Date().toISOString();
    fs.writeFileSync(matchFilePath, JSON.stringify(matchData, null, 2), 'utf8');
    // 广播第三部分完成
    broadcastProgress(matchId, 75, 'partialCompleted', '亚盘爬取完成');
    console.log(`[75%] 亚盘爬取到 ${asiaHandicapData.length} 家博彩公司数据`);
    console.log(`[75%] 亚盘已广播`);
    console.log(`-----------------------------------------`);
    
    // 4. 历史数据（主队、客队、交锋）合并为一项
    console.log(`[75%] 开始爬取历史数据`);
    matchData.details.progress = 75;
    matchData.details.lastUpdated = new Date().toISOString();
    fs.writeFileSync(matchFilePath, JSON.stringify(matchData, null, 2), 'utf8');
    // 广播进度
    broadcastProgress(matchId, 75, 'inProgress', '爬取历史数据');
    
    // 一次性爬取所有历史数据
    const historyData = await scrapeAllHistoryData(matchId, homeTeamName, awayTeamName);
    
    // 记录历史数据爬取结果
    if (historyData.homeHistory && historyData.homeHistory.length > 0) {
      console.log(`[99%] 成功爬取到 ${historyData.homeHistory.length} 条主队历史记录`);
    }
    
    if (historyData.awayHistory && historyData.awayHistory.length > 0) {
      console.log(`[99%] 成功爬取到 ${historyData.awayHistory.length} 条客队历史记录`);
    }
    
    if (historyData.headToHead && historyData.headToHead.length > 0) {
      console.log(`[99%] 成功爬取到 ${historyData.headToHead.length} 条交锋历史记录`);
    }
    
    // 更新所有历史数据到文件
    matchData.details.history = historyData;
    matchData.details.lastUpdated = new Date().toISOString();
    fs.writeFileSync(matchFilePath, JSON.stringify(matchData, null, 2), 'utf8');
    // 广播历史数据完成
    broadcastProgress(matchId, 99, 'partialCompleted', '历史数据爬取完成');
    console.log(`[99%] 历史数据爬取完成。`);
    console.log(`[99%] 历史数据已广播`);
    console.log(`-----------------------------------------`);
    
    // 构建最终的详细信息对象
    console.log(`[100%] 本场数据爬取完成。`);
    const details = {
      status: 'completed',
      progress: 100,
      lastUpdated: new Date().toISOString(),
      odds: {
        europeInitial: europeInitialData,
        europeLive: europeLiveData,
        asiaHandicap: asiaHandicapData
      },
      history: historyData
    };
    
    // 再次写入文件以确保最终状态保存
    matchData.details = details;
    fs.writeFileSync(matchFilePath, JSON.stringify(matchData, null, 2), 'utf8');
    // 广播完成进度
    broadcastProgress(matchId, 100, 'completed', '详细信息爬取完成');
    
    return details;
  } catch (error) {
    console.error(`爬取比赛 ${matchId} 的详细信息失败:`, error.message);
    
    try {
      // 尝试将错误状态写入文件
      const matchJsonDir = path.join(__dirname, 'match_json');
      const matchFiles = fs.readdirSync(matchJsonDir)
        .filter(file => file.includes(`-${matchId}-`) && file.endsWith('.json'));
      
      if (matchFiles.length > 0) {
        const matchFilePath = path.join(matchJsonDir, matchFiles[0]);
        const matchData = JSON.parse(fs.readFileSync(matchFilePath, 'utf8'));
        
        // 获取比赛对象中的实际ID
        const actualMatchId = matchData.id || matchId;
        
        // 更新为失败状态
        matchData.details = {
          status: 'failed',
          progress: 0,
          error: error.message,
          lastUpdated: new Date().toISOString(),
          odds: {
            europeInitial: [],
            europeLive: [],
            asiaHandicap: []
          },
          history: {
            homeHistory: [],
            awayHistory: [],
            headToHead: []
          }
        };
        
        fs.writeFileSync(matchFilePath, JSON.stringify(matchData, null, 2), 'utf8');
        // 广播失败状态
        broadcastProgress(actualMatchId, 0, 'failed', `爬取失败: ${error.message}`);
      }
    } catch (writeError) {
      console.error(`无法写入失败状态到比赛 ${matchId} 的文件:`, writeError.message);
    }
    
    return {
      status: 'failed',
      progress: 0,
      error: error.message,
      lastUpdated: new Date().toISOString(),
      odds: {
        europeInitial: [],
        europeLive: [],
        asiaHandicap: []
      },
      history: {
        homeHistory: [],
        awayHistory: [],
        headToHead: []
      }
    };
  }
}

/**
 * 跟踪正在处理的比赛ID
 */
const processingMatches = new Set();

/**
 * 跟踪预加载状态
 */
let isPreloadingActive = false;

/**
 * 终止预加载的信号
 */
let shouldTerminatePreload = false;

/**
 * 根据ID更新单场比赛的详细信息
 * @param {string} matchId 比赛ID
 * @returns {Promise<boolean>} 是否更新成功
 */
async function updateMatchDetailById(matchId) {
  try {
    // 添加到正在处理的集合
    processingMatches.add(matchId);
    
    console.log(`-----------------------------------------`);
    console.log(`开始更新比赛 ${matchId} 的详细信息...`);
    const result = await updateSingleMatchDetail(matchId);
    
    // 发送成功完成的WebSocket消息
    if (global.io) {
      global.io.emit('match-progress', {
        matchId,
        status: 'completed',
        progress: 100,
        message: '比赛详情更新完成!',
        timestamp: new Date().toISOString()
      });
    }
    
    // 从处理集合中移除
    processingMatches.delete(matchId);
    
    return result;
  } catch (error) {
    console.error(`更新比赛 ${matchId} 详情失败:`, error);
    
    // 发送失败的WebSocket消息
    if (global.io) {
      global.io.emit('match-progress', {
        matchId,
        status: 'failed',
        progress: 0,
        message: `更新失败: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
    
    // 从处理集合中移除
    processingMatches.delete(matchId);
    
    return false;
  }
}

/**
 * 更新单场比赛的详细信息实现
 * @param {string} matchId 比赛ID
 * @returns {Promise<boolean>} 是否更新成功
 */
async function updateSingleMatchDetail(matchId) {
  try {
    // 读取match_json目录
    const matchJsonDir = path.join(__dirname, 'match_json');
    
    // 获取所有比赛文件
    const matchFiles = fs.readdirSync(matchJsonDir)
      .filter(file => file.endsWith('.json'));
    
    if (matchFiles.length === 0) {
      console.error(`未找到任何比赛文件`);
      return false;
    }
    
    // 查找包含此ID的文件 - 通过读取每个文件内容来匹配
    let matchFilePath = null;
    let matchData = null;
    
    for (const file of matchFiles) {
      const filePath = path.join(matchJsonDir, file);
      try {
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        // 检查文件中的比赛ID是否匹配
        if (fileData && fileData.id && fileData.id === matchId) {
          matchFilePath = filePath;
          matchData = fileData;
          break;
        }
      } catch (err) {
        console.error(`读取文件 ${file} 失败:`, err.message);
        // 继续检查下一个文件
      }
    }
    
    if (!matchFilePath || !matchData) {
      console.error(`未找到ID为 ${matchId} 的比赛文件`);
      return false;
    }
    
    const homeTeamName = matchData.homeTeam?.name || '未知主队';
    const awayTeamName = matchData.awayTeam?.name || '未知客队';
    console.log(`已找到 ${homeTeamName} VS ${awayTeamName} 的比赛文件`);
    
    // 更新详细信息状态为"进行中"
    console.log(`[0%] 初始化爬取进度条`);
    matchData.details = {
      status: 'inProgress',
      progress: 0,
      lastUpdated: new Date().toISOString(),
      odds: {
        europeInitial: [],
        europeLive: [],
        asiaHandicap: []
      },
      history: {
        homeHistory: [],
        awayHistory: [],
        headToHead: []
      }
    };
    
    // 保存更新后的文件，表示爬取已开始
    fs.writeFileSync(matchFilePath, JSON.stringify(matchData, null, 2), 'utf8');
    
    // 广播初始状态
    broadcastProgress(matchId, 0, 'inProgress', '开始爬取详细信息');
    
    // 爬取详细信息
    const details = await scrapeMatchDetails(matchId);
    
    // 更新比赛数据
    matchData.details = details;
    
    // 保存更新后的文件
    fs.writeFileSync(matchFilePath, JSON.stringify(matchData, null, 2), 'utf8');
    
    console.log(`[100%] ${homeTeamName} VS ${awayTeamName} 的详细信息已更新完成`);
    return true;
  } catch (error) {
    console.error(`更新比赛 ${matchId} 的详细信息失败:`, error.message);
    // 广播失败状态，此时应该使用传入的原始matchId
    broadcastProgress(matchId, 0, 'failed', `更新失败: ${error.message}`);
    return false;
  }
}

/**
 * 检查比赛是否正在被处理
 * @param {string} matchId 比赛ID
 * @returns {boolean} 是否正在被处理
 */
const isMatchBeingProcessed = (matchId) => {
  return processingMatches.has(matchId);
};

/**
 * 检查预加载是否正在进行
 * @returns {boolean} 是否正在预加载
 */
const isPreloadRunning = () => {
  return isPreloadingActive;
};

/**
 * 终止预加载过程
 * 设置终止信号，下一个循环迭代将会退出
 * @returns {boolean} 是否成功设置终止信号
 */
const terminatePreload = () => {
  if (!isPreloadingActive) {
    console.log('预加载未在进行中，无需终止');
    return false;
  }
  
  console.log('设置预加载终止信号，预加载将在当前任务完成后停止');
  shouldTerminatePreload = true;
  return true;
};

/**
 * 开始预加载所有比赛详细信息
 * 按顺序逐个爬取比赛的详细信息
 */
async function startPreloadMatchDetails() {
  // 如果已经在预加载中，直接返回
  if (isPreloadingActive) {
    console.log('预加载已经在进行中，不重复启动');
    return;
  }
  
  // 重置终止信号
  shouldTerminatePreload = false;
  isPreloadingActive = true;
  
  console.log('开始预加载比赛详细信息...');
  
  try {
    // 读取match_json目录
    const matchJsonDir = path.join(__dirname, 'match_json');
    
    // 获取所有比赛文件，并按文件名排序，确保与比赛列表显示的顺序一致
    const matchFiles = fs.readdirSync(matchJsonDir)
      .filter(file => file.endsWith('.json'))
      .sort(); // 按文件名排序，与matchCrawler生成的顺序一致
    
    console.log(`找到 ${matchFiles.length} 个比赛文件`);
    
    if (matchFiles.length === 0) {
      console.log('没有比赛文件需要处理');
      isPreloadingActive = false;
      return;
    }
    
    // 跟踪已处理的比赛ID，防止重复处理
    const processedMatchIds = new Set();
    
    // 顺序处理每个比赛
    for (let i = 0; i < matchFiles.length; i++) {
      // 检查是否应该终止预加载
      if (shouldTerminatePreload) {
        console.log('检测到终止信号，停止预加载过程');
        break;
      }
      
      const file = matchFiles[i];
      
      // 读取比赛文件以获取实际的match.id
      const filePath = path.join(matchJsonDir, file);
      let matchData;
      
      try {
        matchData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (error) {
        console.error(`无法解析文件 ${file}: ${error.message}`);
        continue;
      }
      
      // 确保比赛数据有效
      if (!matchData || !matchData.id) {
        console.warn(`比赛文件 ${file} 数据无效或没有ID，跳过处理`);
        continue;
      }
      
      // 获取比赛ID
      const matchId = matchData.id;
      
      // 检查该比赛ID是否已经处理过
      if (processedMatchIds.has(matchId)) {
        console.log(`比赛ID ${matchId} 已经处理过，跳过重复处理`);
        processedMatchIds.add(matchId);
        continue;
      }
      
      
      // 检查该比赛是否已有详细信息
      if (matchData.details && matchData.details.status === 'completed' && matchData.details.progress === 100) {
        console.log(`比赛 ${matchId} 已有完整的详细信息，跳过处理`);
        processedMatchIds.add(matchId);
        continue;
      }
      
      // 更新比赛详细信息，使用实际比赛ID
      await updateMatchDetailById(matchId);
      
      // 标记为已处理
      processedMatchIds.add(matchId);
      
      // 在处理下一个比赛前稍作延迟，避免请求过于频繁
      if (i < matchFiles.length - 1 && !shouldTerminatePreload) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(shouldTerminatePreload ? '预加载过程被终止' : '所有比赛详细信息预加载完成');
  } catch (error) {
    console.error('预加载比赛详细信息时出错:', error.message);
  } finally {
    // 无论成功还是失败，都重置状态
    isPreloadingActive = false;
    shouldTerminatePreload = false;
  }
}

module.exports = {
  scrapeEuropeInitialOdds,
  scrapeEuropeLiveOdds,
  scrapeAsiaHandicapOdds,
  scrapeAllHistoryData,
  scrapeMatchDetails,
  updateMatchDetailById,
  startPreloadMatchDetails,
  isMatchBeingProcessed,
  updateSingleMatchDetail,
  isPreloadRunning,
  terminatePreload
}; 