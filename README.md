# 基金实时估值工作台

一个基于 Next.js 的纯前端基金追踪应用，支持基金估值、自选管理、重仓股查看、收益计算和历史净值图表。

## 功能

- 基金搜索（东方财富 JSONP）
- 基金估值获取（天天基金，失败自动回退腾讯）
- 自选基金管理
- 自动刷新（5-300 秒）
- 持仓金额 / 已有持有收益 / 收益计算（自动反推成本净值）
- 重仓股展示与行情补全
- 历史净值图表
- 本地持久化（localStorage）
- 全局错误边界与 Toast 通知

## 快速开始

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`

如果 `next dev` 因锁文件或残留进程无法启动，可用：

```bash
npm run dev:clean
```

## 构建导出

```bash
npm run build
```

当前 `next.config.js` 使用 `output: 'export'`，会输出静态站点到 `out/`。

## 使用说明

1. 顶部输入基金名称或代码搜索。
2. 点击搜索结果可加入列表；如果输入的是 6 位代码，按回车可直接添加。
3. 在控制栏切换「全部 / 自选」、排序方式和刷新间隔。
4. 基金卡片中可编辑持仓金额和已有持有收益，系统会自动反推成本净值，并查看当日/累计收益。
5. 展开卡片可查看重仓股和历史走势。

## 技术实现说明

- 数据接口均通过前端 JSONP 拉取。
- `fundgz` 使用固定全局回调 `jsonpgz`，代码内已做串行队列，避免并发冲突。
- `fundf10` 的 `window.apidata` 解析已做串行锁，避免不同请求互相覆盖。

## 项目结构

```text
pages/
  index.js
  _app.js
  _document.js
components/
  ControlBar.js
  FundCard.js
  FundChart.js
  FundSearch.js
  Toast.js
  ErrorBoundary.js
services/
  fundService.js
styles/
  globals.css
  toast.css
  error-boundary.css
constants/
  config.js
utils/
  requestLimiter.js
```

## 免责声明

本项目仅用于信息展示与个人记录，不构成投资建议。
