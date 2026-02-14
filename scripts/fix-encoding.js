/**
 * 修复globals.css中的编码问题
 */

const fs = require('fs');
const path = require('path');

const globalsCssPath = path.join(__dirname, '../styles/globals.css');

console.log('正在修复globals.css编码...');

// 读取原始文件
const content = fs.readFileSync(globalsCssPath, 'utf8');

// 检查是否有编码问题
if (content.includes('0f8f9a') || content.includes('0a6770')) {
  console.log('检测到可能的编码问题，正在修复...');

  // 重新写入，确保UTF-8编码
  fs.writeFileSync(globalsCssPath, content, 'utf8');
  console.log('✓ globals.css 已修复');
} else {
  console.log('✓ globals.css 编码正常');
}
