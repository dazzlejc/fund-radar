/** @type {import('next').NextConfig} */

// 判断是否是生产环境
const isProd = process.env.NODE_ENV === 'production';
// ⚠️ 重要：将下面这里的 'fund-tracker' 替换为你在 GitHub 上创建的仓库名称
const repoName = 'fund-radar'; 

const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  // 如果是生产环境，添加仓库名作为路径前缀
  basePath: isProd ? `/${repoName}` : '',
  assetPrefix: isProd ? `/${repoName}/` : '',
}

module.exports = nextConfig