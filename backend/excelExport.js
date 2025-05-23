const ExcelJS = require('exceljs');

/**
 * 生成比赛Excel并写入到HTTP响应
 * @param {Object} matchData - 比赛数据
 * @param {Object} res - Express响应对象
 * @param {String|Number} matchId - 比赛ID
 */
async function exportMatchExcel(matchData, res, matchId) {
  const workbook = new ExcelJS.Workbook();

  // 1. 基本数据
  const basicSheet = workbook.addWorksheet('基本数据');
  const basicInfo = [
    ['主队', matchData.homeTeam?.name || ''],
    ['客队', matchData.awayTeam?.name || ''],
    ['联赛', matchData.league || ''],
    ['比赛时间', matchData.matchTime || ''],
    ['场地', matchData.venue || ''],
    ['天气', matchData.weather || ''],
    ['温度', matchData.temperature || ''],
    ['主队排名', matchData.rankings?.homeTeam?.rank || ''],
    ['主队积分', matchData.rankings?.homeTeam?.points || ''],
    ['客队排名', matchData.rankings?.awayTeam?.rank || ''],
    ['客队积分', matchData.rankings?.awayTeam?.points || '']
  ];
  basicInfo.forEach(row => basicSheet.addRow(row));

  // 2. 欧赔初盘
  const europeInitialSheet = workbook.addWorksheet('欧赔初盘');
  europeInitialSheet.addRow([
    '公司', '主队赔率', '和赔率', '客队赔率',
    '主队概率', '和率', '客队概率',
    '返还率', '主队凯利指数', '和凯利指数', '客队凯利指数', '更新时间'
  ]);
  (matchData.details?.odds?.europeInitial || []).forEach(odds => {
    europeInitialSheet.addRow([
      odds.company || '',
      odds.homeWin || odds.homeOdds || '',
      odds.draw || odds.drawOdds || '',
      odds.awayWin || odds.awayOdds || '',
      odds.probabilityHome || odds.homeWinRate || '',
      odds.probabilityDraw || odds.drawRate || '',
      odds.probabilityAway || odds.awayWinRate || '',
      odds.returnRate || '',
      odds.kellyHome || odds.homeKellyIndex || '',
      odds.kellyDraw || odds.drawKellyIndex || '',
      odds.kellyAway || odds.awayKellyIndex || '',
      odds.time || odds.updateTime || ''
    ]);
  });

  // 3. 欧赔即时盘
  const europeLiveSheet = workbook.addWorksheet('欧赔即时盘');
  europeLiveSheet.addRow([
    '公司', '主队赔率', '和赔率', '客队赔率',
    '主队概率', '和率', '客队概率',
    '返还率', '主队凯利指数', '和凯利指数', '客队凯利指数', '更新时间'
  ]);
  (matchData.details?.odds?.europeLive || []).forEach(odds => {
    europeLiveSheet.addRow([
      odds.company || '',
      odds.homeWin || odds.homeOdds || '',
      odds.draw || odds.drawOdds || '',
      odds.awayWin || odds.awayOdds || '',
      odds.probabilityHome || odds.homeWinRate || '',
      odds.probabilityDraw || odds.drawRate || '',
      odds.probabilityAway || odds.awayWinRate || '',
      odds.returnRate || '',
      odds.kellyHome || odds.homeKellyIndex || '',
      odds.kellyDraw || odds.drawKellyIndex || '',
      odds.kellyAway || odds.awayKellyIndex || '',
      odds.time || odds.updateTime || ''
    ]);
  });

  // 4. 亚让盘
  const asiaHandicapSheet = workbook.addWorksheet('亚让盘');
  asiaHandicapSheet.addRow(['公司', '初盘主队', '初盘盘口', '初盘客队', '即时盘主队', '即时盘盘口', '即时盘客队']);
  (matchData.details?.odds?.asiaHandicap || []).forEach(odds => {
    asiaHandicapSheet.addRow([
      odds.company || '',
      odds.initialHome || odds.initialHomeOdds || '',
      odds.initialHandicap || '',
      odds.initialAway || odds.initialAwayOdds || '',
      odds.liveHomeOdds || '',
      odds.liveHandicap || '',
      odds.liveAwayOdds || ''
    ]);
  });

  // 5. 主队历史
  const homeHistorySheet = workbook.addWorksheet('主队历史');
  homeHistorySheet.addRow(['联赛', '日期', '主队', '比分', '半场比分', '角球', '盘口', '客队', '胜负', '让球', '进球数']);
  (matchData.details?.history?.homeHistory || []).forEach(match => {
    homeHistorySheet.addRow([
      match.league || '',
      match.date || '',
      match.homeTeam || '',
      match.score || '',
      match.halfTimeScore || '',
      match.corner || '',
      match.handicap || '',
      match.awayTeam || '',
      match.result || '',
      match.handicapResult || '',
      match.goalResult || ''
    ]);
  });

  // 6. 客队历史
  const awayHistorySheet = workbook.addWorksheet('客队历史');
  awayHistorySheet.addRow(['联赛', '日期', '主队', '比分', '半场比分', '角球', '盘口', '客队', '胜负', '让球', '进球数']);
  (matchData.details?.history?.awayHistory || []).forEach(match => {
    awayHistorySheet.addRow([
      match.league || '',
      match.date || '',
      match.homeTeam || '',
      match.score || '',
      match.halfTimeScore || '',
      match.corner || '',
      match.handicap || '',
      match.awayTeam || '',
      match.result || '',
      match.handicapResult || '',
      match.goalResult || ''
    ]);
  });

  // 7. 交锋历史
  const headToHeadSheet = workbook.addWorksheet('交锋历史');
  headToHeadSheet.addRow(['联赛', '日期', '主队', '比分', '半场比分', '角球', '盘口', '客队', '胜负', '让球', '进球数']);
  (matchData.details?.history?.headToHead || []).forEach(match => {
    headToHeadSheet.addRow([
      match.league || '',
      match.date || '',
      match.homeTeam || '',
      match.score || '',
      match.halfTimeScore || '',
      match.corner || '',
      match.handicap || '',
      match.awayTeam || '',
      match.result || '',
      match.handicapResult || '',
      match.goalResult || ''
    ]);
  });

  // ===== 样式设置函数 =====
  function setSheetStyle(sheet, freezeHeader = false) {
    sheet.eachRow((row, rowNumber) => {
      row.eachCell(cell => {
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });
    });
    if (freezeHeader) {
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
    }
  }
  // 基本数据sheet只居中
  setSheetStyle(basicSheet, false);
  // 其余6个sheet居中+冻结表头
  setSheetStyle(europeInitialSheet, true);
  setSheetStyle(europeLiveSheet, true);
  setSheetStyle(asiaHandicapSheet, true);
  setSheetStyle(homeHistorySheet, true);
  setSheetStyle(awayHistorySheet, true);
  setSheetStyle(headToHeadSheet, true);

  // ===== 优化基本数据sheet格式 =====
  basicSheet.getColumn(1).width = 10;
  basicSheet.getColumn(2).width = 20;
  for (let i = 1; i <= 11; i++) {
    basicSheet.getRow(i).height = 30;
  }
  for (let row = 1; row <= 11; row++) {
    for (let col = 1; col <= 2; col++) {
      const cell = basicSheet.getCell(row, col);
      cell.font = {
        name: 'SimHei',
        size: 12,
        bold: col === 1
      };
      cell.border = {
        top:    { style: 'thin' },
        left:   { style: 'thin' },
        bottom: { style: 'thin' },
        right:  { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    }
  }

  // ===== 欧赔初盘、欧赔即时盘表格格式优化 =====
  function formatEuropeSheet(sheet) {
    // 1. 插入序号表头
    const oldHeader = sheet.getRow(1).values;
    sheet.spliceRows(1, 1, ['序号', ...oldHeader.slice(1)]);
    // 2. 为每一行数据添加序号
    for (let i = 2; i <= sheet.rowCount; i++) {
      sheet.getRow(i).splice(1, 0, i - 1);
    }
    // 3. 设置列宽
    sheet.getColumn(1).width = 10; // 序号
    sheet.getColumn(2).width = 30; // 公司
    for (let col = 3; col <= sheet.columnCount; col++) {
      sheet.getColumn(col).width = 15;
    }
    // 4. 设置所有行高为30
    for (let i = 1; i <= sheet.rowCount; i++) {
      sheet.getRow(i).height = 30;
    }
    // 5. 设置字体为黑体、加框线、居中
    for (let row = 1; row <= sheet.rowCount; row++) {
      for (let col = 1; col <= sheet.columnCount; col++) {
        const cell = sheet.getCell(row, col);
        cell.font = { name: 'SimHei', size: 12 };
        cell.border = {
          top:    { style: 'thin' },
          left:   { style: 'thin' },
          bottom: { style: 'thin' },
          right:  { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      }
    }
  }
  // 应用格式优化
  formatEuropeSheet(europeInitialSheet);
  formatEuropeSheet(europeLiveSheet);

  // ===== 亚让盘表格格式优化 =====
  function formatAsiaHandicapSheet(sheet) {
    // 1. 插入序号表头
    const oldHeader = sheet.getRow(1).values;
    sheet.spliceRows(1, 1, ['序号', ...oldHeader.slice(1)]);
    // 2. 为每一行数据添加序号
    for (let i = 2; i <= sheet.rowCount; i++) {
      sheet.getRow(i).splice(1, 0, i - 1);
    }
    // 3. 设置列宽
    sheet.getColumn(1).width = 10; // 序号
    for (let col = 2; col <= sheet.columnCount; col++) {
      sheet.getColumn(col).width = 15;
    }
    // 4. 设置所有行高为30
    for (let i = 1; i <= sheet.rowCount; i++) {
      sheet.getRow(i).height = 30;
    }
    // 5. 设置字体为黑体、加框线、居中
    for (let row = 1; row <= sheet.rowCount; row++) {
      for (let col = 1; col <= sheet.columnCount; col++) {
        const cell = sheet.getCell(row, col);
        cell.font = { name: 'SimHei', size: 12 };
        cell.border = {
          top:    { style: 'thin' },
          left:   { style: 'thin' },
          bottom: { style: 'thin' },
          right:  { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      }
    }
  }
  // 应用格式优化
  formatAsiaHandicapSheet(asiaHandicapSheet);

  // ===== 历史比赛sheet格式优化 =====
  function formatHistorySheet(sheet) {
    // 1. 插入序号表头
    const oldHeader = sheet.getRow(1).values;
    sheet.spliceRows(1, 1, ['序号', ...oldHeader.slice(1)]);
    // 2. 为每一行数据添加序号
    for (let i = 2; i <= sheet.rowCount; i++) {
      sheet.getRow(i).splice(1, 0, i - 1);
    }
    // 3. 设置列宽
    sheet.getColumn(1).width = 10; // 序号
    for (let col = 2; col <= sheet.columnCount; col++) {
      sheet.getColumn(col).width = 15;
    }
    // 4. 设置所有行高为30
    for (let i = 1; i <= sheet.rowCount; i++) {
      sheet.getRow(i).height = 30;
    }
    // 5. 设置字体为黑体、加框线、居中
    for (let row = 1; row <= sheet.rowCount; row++) {
      for (let col = 1; col <= sheet.columnCount; col++) {
        const cell = sheet.getCell(row, col);
        cell.font = { name: 'SimHei', size: 12 };
        cell.border = {
          top:    { style: 'thin' },
          left:   { style: 'thin' },
          bottom: { style: 'thin' },
          right:  { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      }
    }
  }
  // 应用格式优化
  formatHistorySheet(homeHistorySheet);
  formatHistorySheet(awayHistorySheet);
  formatHistorySheet(headToHeadSheet);

  // ===== 生成自定义Excel文件名 =====
  function formatDateTime(dt) {
    let dateObj = typeof dt === 'string' ? new Date(dt) : dt;
    if (isNaN(dateObj.getTime())) return '未知时间';
    const y = dateObj.getFullYear();
    const m = dateObj.getMonth() + 1;
    const d = dateObj.getDate();
    const hh = dateObj.getHours();
    const mm = dateObj.getMinutes();
    const pad = n => n < 10 ? '0' + n : n;
    return `${y}年${m}月${d}日${pad(hh)}：${pad(mm)}`;
  }
  const matchDate = matchData.matchTime || '';
  const home = matchData.homeTeam?.name || '主队';
  const away = matchData.awayTeam?.name || '客队';
  const dateStr = formatDateTime(matchDate);
  const fileName = `${dateStr}-${home}VS${away}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(fileName)}`);
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { exportMatchExcel }; 