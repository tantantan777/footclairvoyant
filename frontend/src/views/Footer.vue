<template>
  <div class="footer-bar">
    <p class="copyright">&copy; {{ currentYear }} 足球比赛数据系统 | 数据仅供参考</p>
    
    <div class="center-links">
      <a href="https://jc.titan007.com/" target="_blank" class="link">新球体育</a>
      <a href="https://www.okooo.cn/jingcai/" target="_blank" class="link">Okooo澳客</a>
    </div>
    
    <div class="links">
      <a href="/disclaimer" target="_blank" class="link">免责声明</a>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Footer',
  computed: {
    currentYear() {
      return new Date().getFullYear()
    }
  }
}
</script>

<style scoped>
.footer-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: #f5f7fa;
  border-top: 1px solid #e4e7ed;
  color: #606266;
  font-size: 0.9rem;
}

.copyright {
  margin: 0;
}

.center-links {
  display: flex;
  gap: 20px;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.links {
  display: flex;
  gap: 15px;
}

.link {
  color: #409eff;
  text-decoration: none;
  transition: color 0.3s;
}

.link:hover {
  color: #66b1ff;
}
</style> 