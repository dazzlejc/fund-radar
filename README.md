# 基金实时估值工作台

<div align="center">

一款现代化的纯前端基金追踪与管理工具，实时监控基金估值、持仓收益与重仓股走势。

![效果展示](https://img.031027.xyz/img/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE%202026-02-14%20215328.webp)
![效果展示](https://img.031027.xyz/img/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE%202026-02-14%20220751.webp)

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-orange?style=for-the-badge)](https://creativecommons.org/licenses/by-nc/4.0/)

</div>

## ✨ 核心特性

- 📊 **实时估值监控** - 自动获取基金实时估值，支持自定义刷新间隔（5-300秒）
- 🔍 **智能基金搜索** - 基于东方财富数据源的快速搜索，支持代码和名称查询
- ⭐ **自选基金管理** - 灵活的自选列表管理，支持持仓金额与收益追踪
- 💰 **精准收益计算** - 基于持仓金额和已有收益自动反推成本净值，实时计算当日/累计收益
- 📈 **重仓股追踪** - 查看基金重仓股及实时股价走势，行业分布可视化
- 📊 **历史净值图表** - 交互式历史净值曲线，支持多基金收益对比
- 🌓 **主题切换** - 支持亮色/暗色主题，自动适应系统偏好
- 💾 **本地持久化** - 所有设置与数据本地存储，隐私安全
- 🛡️ **错误边界** - 全局错误处理与友好的Toast通知

## 🛠️ 技术栈

### 前端框架
- **Next.js 16** - React框架，支持静态导出
- **React 19** - UI组件库
- **Framer Motion** - 流畅的动画效果
- **Recharts** - 数据可视化图表

### 工具库
- **decimal.js-light** - 精确的数值计算，避免浮点误差
- **浏览器原生API** - JSONP数据请求、localStorage本地存储

### 数据源
- **东方财富** - 基金搜索
- **天天基金** - 基金实时估值（自动回退腾讯）
- **腾讯证券** - 重仓股实时行情

## 🚀 快速开始

### 环境要求
- Node.js >= 18.0.0
- npm 或 yarn

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/dazzlejc/fund-radar.git
cd fund-radar

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 `http://localhost:3000` 开始使用。

### 生产构建

```bash
# 构建静态站点
npm run build

# 输出目录: out/
```

### 清理开发环境

如果开发服务器因锁文件或残留进程无法启动：

```bash
npm run dev:clean
```

## 📖 使用指南

### 添加基金
1. 在顶部搜索框输入基金代码（6位数字）或名称
2. 点击搜索结果或直接按回车（仅6位代码）
3. 新添加的基金会自动滚动到页面底部

### 自选管理
1. 点击基金卡片的星标图标加入/退出自选
2. 首次加入自选需设置持仓金额和已有收益
3. 编辑持仓金额后，系统自动反推成本净值
4. 切换"全部/自选"标签快速筛选

### 查看详情
1. 点击基金卡片展开查看重仓股和历史走势
2. 重仓股显示实时股价和涨跌幅
3. 历史图表支持缩放和查看具体日期净值
4. 数据缓存7天，过期自动更新

### 排序与刷新
1. 支持按代码、名称、涨跌幅排序（升序/降序）
2. 控制栏显示距离下次刷新的倒计时
3. 点击刷新按钮立即更新所有数据
4. 在设置中调整刷新间隔（5-300秒）

### 主题切换
点击右上角太阳/月亮图标切换亮色/暗色主题，设置会自动保存。

## 📂 项目结构

```text
fund-radar/
├── pages/                  # Next.js页面
│   ├── index.js           # 主页面
│   ├── _app.js            # 应用入口
│   └── _document.js       # 文档结构
├── components/             # React组件
│   ├── FundCard.js        # 基金卡片
│   ├── FundSearch.js      # 基金搜索
│   ├── ControlBar.js      # 控制栏
│   ├── FundChart.js       # 历史净值图表
│   ├── Toast.js           # Toast通知
│   ├── ErrorBoundary.js   # 错误边界
│   ├── SkeletonCard.js    # 骨架屏
│   └── ...                # 其他组件
├── services/              # 数据服务
│   └── fundService.js     # 基金数据API
├── utils/                 # 工具函数
│   ├── decimalUtils.js    # 数值计算工具
│   ├── requestLimiter.js  # 请求限流
│   └── dataManager.js     # 数据管理
├── constants/             # 常量配置
│   └── config.js          # 应用配置
├── styles/                # 样式文件
│   └── globals.css        # 全局样式
├── scripts/               # 脚本工具
│   └── dev-clean.js       # 开发环境清理
├── public/                # 静态资源
│   ├── favicon.svg
│   ├── manifest.json
│   └── sw.js             # Service Worker
├── next.config.js        # Next.js配置
└── package.json          # 项目配置
```

## 🔧 技术实现亮点

### 精确数值计算
使用 `decimal.js-light` 库处理所有金额和收益计算，避免JavaScript浮点数精度问题：

```javascript
// 安全的除法运算
const profitRatio = safeDivide(profit, amount);

// 安全的乘法运算
const dailyProfit = safeMultiply(amount, safeDivide(changePercent, 100));
```

### 数据请求优化
- **串行队列** - `fundgz` 接口使用固定全局回调 `jsonpgz`，通过串行队列避免并发冲突
- **请求限流** - 控制最大并发请求数，防止浏览器节流
- **数据缓存** - 重仓股数据缓存7天，减少不必要请求
- **自动回退** - 天天基金接口失败自动切换腾讯接口

### 状态管理
- **本地持久化** - 使用 `localStorage` 保存用户数据和设置
- **版本迁移** - 支持数据版本升级，向后兼容旧数据
- **主题记忆** - 主题设置持久化，支持自动跟随系统

### 性能优化
- **动态导入** - 图表组件动态加载，减少首屏体积
- **骨架屏** - 初始加载时显示骨架屏，提升体验
- **防抖节流** - 输入框和定时器优化，减少不必要的渲染

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 开发计划

- [ ] 支持基金分组管理
- [ ] 添加基金定投计算器
- [ ] 支持导出数据到Excel
- [ ] 添加基金对比功能
- [ ] 支持更多数据可视化图表
- [ ] 移动端PWA支持优化

## 📄 免责声明

本项目仅用于信息展示与个人记录，不构成投资建议。基金投资有风险，入市需谨慎。所有数据均来自公开数据源，仅供参考。

## 📜 许可证

本项目采用 **CC BY-NC 4.0**（知识共享署名-非商业性使用 4.0 国际）许可证。

**这意味着：**
- ✅ 您可以自由复制、分发和修改本项目
- ✅ 您可以基于本项目创作衍生作品
- ✅ 必须保留原作者署名并注明修改内容
- ❌ **不得用于任何商业目的**

如需商业授权，请联系项目作者。

详见：[LICENSE](LICENSE) | [Creative Commons](https://creativecommons.org/licenses/by-nc/4.0/)

---

<div align="center">

Made with ❤️ by [dazzlejc](https://github.com/dazzlejc)

如果觉得有帮助，请给个 ⭐️ 支持一下！

</div>
