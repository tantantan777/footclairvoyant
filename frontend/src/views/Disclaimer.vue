<template>
  <div class="disclaimer-wrapper">
    <div class="disclaimer-container">
      <h1>免责声明</h1>
      <div class="notice-bar">
        <div class="notice-icon">⚠</div>
        <div class="notice-text">本声明具有法律效力，访问或使用本网站即表示您已完全接受本声明所有条款</div>
      </div>
      
      <div class="disclaimer-content">
        <p class="important">本项目为个人开发的足球比赛数据采集与分析工具，旨在探索网络爬虫、数据分析与人工智能在体育数据领域的结合应用，<strong>仅供技术研究与学习参考之用</strong>。使用本项目即表示您完全理解并接受以下所有条款。</p>

        <h2>数据来源说明</h2>
        <p>本项目所涉及的数据来源于公开可访问的网站 https://jc.titan007.com/，通过解析其HTML结构提取页面中展示的比赛信息。该数据仅作分析训练用途，并不存储或传播其完整页面或版权性内容。</p>
        <p>我们不拥有该网站的任何数据、商标或内容版权，也与该网站无任何形式的合作、授权或关联关系。本项目不对所展示数据的准确性、完整性、可靠性或适用性做任何形式的保证。</p>
        <p class="important">若 https://jc.titan007.com/ 网站运营方认为本项目的相关行为不当或侵犯了其合法权益，请通过邮件或Issues等方式联系我们，我们将在核实后第一时间删除相关内容或下架整个开源库。</p>

        <h2>AI预测结果说明</h2>
        <p>本项目使用人工智能模型对爬取的数据进行比赛结果和比分的预测，该预测<strong>仅基于公开信息的技术分析</strong>，不代表真实结果或任何承诺、建议。所有AI生成的预测结果仅供娱乐或技术研究参考，<strong>不构成任何形式的投注、投资或决策依据</strong>。</p>
        <p class="important">使用者应明确知晓AI预测的本质局限性，任何因依赖预测结果而产生的后果，无论直接或间接，均由使用者自行承担，项目开发者和维护者对此不承担任何责任。</p>

        <h2>使用风险与责任免除声明</h2>
        <p>本项目不保证数据的准确性、完整性与时效性，亦不对使用者因使用本项目而可能产生的任何形式的损失承担责任。</p>
        <p>所有使用者应自行判断并承担使用本项目所带来的一切风险，包括但不限于：</p>
        <ul class="risk-list">
          <li>因数据不准确或不完整导致的决策错误</li>
          <li>因系统故障、网络中断或其他技术问题导致的使用困难</li>
          <li>因依赖AI预测结果导致的任何财产或非财产损失</li>
          <li>因违反目标网站使用条款而可能引发的法律责任</li>
        </ul>
        <p class="important">在法律允许的最大范围内，项目作者明确排除所有明示或暗示的保证和条件，包括但不限于关于适销性、特定用途适用性和非侵权性的保证。项目作者不承担因用户使用本项目进行任何行为（包括但不限于数据抓取、预测分析、结果决策等）所引发的直接或间接损失、特殊或惩罚性损害赔偿，即使作者已被告知此类损害的可能性。</p>
        <p>用户在使用本项目时，应确保遵守目标网站的使用协议、robots协议及相关法律法规。因违反相关规定而产生的一切后果，由用户自行承担。</p>

        <h2>权利与反馈</h2>
        <p>本项目为开源性质，遵循 MIT 开源协议。项目中的所有代码、模型与文档仅作教学用途，<strong>严禁用于任何商业行为或非法活动</strong>。</p>
        <p class="important">如任何第三方对本项目提出合理的权利主张，项目维护者将积极配合核查处理，并可应请求移除相关内容或终止项目发布。但这并不构成项目维护者对任何侵权行为的承认，也不影响本免责声明对使用者的约束力。</p>

        <h2>适用法律</h2>
        <p>本免责声明的解释、效力及争议解决均适用中华人民共和国法律。若因使用本项目而产生任何争议，应友好协商解决；协商不成的，任何法律行动或程序必须在项目维护者所在地法院提起。</p>
        
        <div class="final-notice">
          <p>继续使用本项目即表示您已完全理解并接受上述全部条款。</p>
          <p>最后更新日期：{{ getCurrentDate() }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Disclaimer',
  methods: {
    getCurrentDate() {
      const now = new Date();
      return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    }
  },
  created() {
    document.title = '免责声明';
  }
}
</script>

<style scoped>
.disclaimer-wrapper {
  background-color: #f8f9fa;
  min-height: 100vh;
  padding: 30px 15px;
}

.disclaimer-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 30px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

h1 {
  font-size: 28px;
  color: #303133;
  margin-bottom: 20px;
  text-align: center;
  font-weight: 600;
  border-bottom: 2px solid #ebeef5;
  padding-bottom: 15px;
}

h2 {
  font-size: 20px;
  color: #409eff;
  margin: 25px 0 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
  position: relative;
}

h2::before {
  content: "§";
  margin-right: 8px;
  color: #909399;
}

.disclaimer-content {
  font-size: 15px;
  line-height: 1.7;
  color: #606266;
}

p {
  margin: 12px 0;
  text-align: justify;
}

strong {
  color: #303133;
  font-weight: 600;
}

.important {
  background-color: #f8f8f8;
  border-left: 4px solid #409eff;
  padding: 10px 15px;
  margin: 15px 0;
}

.notice-bar {
  display: flex;
  align-items: center;
  background-color: #fff7e6;
  border: 1px solid #ffe7ba;
  border-radius: 6px;
  padding: 12px 20px;
  margin-bottom: 25px;
}

.notice-icon {
  font-size: 24px;
  color: #fa8c16;
  margin-right: 15px;
}

.notice-text {
  color: #d46b08;
  font-weight: 500;
}

.risk-list {
  margin: 15px 0;
  padding-left: 20px;
}

.risk-list li {
  margin-bottom: 8px;
  position: relative;
  padding-left: 5px;
}

.final-notice {
  margin-top: 30px;
  padding: 15px;
  background-color: #f0f9ff;
  border: 1px solid #b3e0ff;
  border-radius: 6px;
  text-align: center;
}

.final-notice p:last-child {
  color: #909399;
  font-size: 14px;
  margin-top: 10px;
  text-align: center;
}

@media (max-width: 768px) {
  .disclaimer-container {
    padding: 20px;
  }
  
  h1 {
    font-size: 24px;
  }
  
  h2 {
    font-size: 18px;
  }
  
  .disclaimer-content {
    font-size: 14px;
  }
}
</style> 