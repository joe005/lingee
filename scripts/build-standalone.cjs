/**
 * build-standalone.cjs
 * 生成可直接双击打开的 standalone HTML 文件（兼容 file:// 协议）
 * 用法：node scripts/build-standalone.cjs  或  npm run standalone
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(p) { return fs.readFileSync(p, 'utf8'); }

// 读取源文件
const indexHtml = read(path.join(root, 'index.html'));
const mainJs = read(path.join(root, 'src', 'scripts', 'main.js'));
const tokensCss = read(path.join(root, 'src', 'styles', 'tokens.css'));
const appCss = read(path.join(root, 'src', 'styles', 'app.css'));
const billTemplate = read(path.join(root, 'src', 'artifacts', 'purchase-order.html'));

// 1) 从 main.js 中移除 import 语句，替换为内联读取
const mainJsInlined = mainJs
  .replace(/^import billTemplate from .*$/m, "var billTemplate = document.getElementById('billTemplateRaw').textContent;")
  .replace(/^import tokensCss from .*$/m, "var tokensCss = document.getElementById('tokensCssRaw').textContent;");

// 2) 转义 </script> 防止提前闭合
const billEscaped = billTemplate.replace(/<\/script>/g, '<\\/script>');
const tokensEscaped = tokensCss; // CSS 不含 </script>，无需转义

// 3) 模板数据块（放在 body 开头，确保在内联 script 之前被解析）
const dataBlocks = '  <script type="text/plain" id="billTemplateRaw">' + billEscaped + '<\/script>\n' +
                   '  <script type="text/plain" id="tokensCssRaw">' + tokensEscaped + '<\/script>\n';

// 4) 生成 standalone HTML
let out = indexHtml
  // CSS link → inline style
  .replace(/<link rel="stylesheet" href="[^"]*tokens\.css">/g, '<style>' + tokensEscaped + '</style>')
  .replace(/<link rel="stylesheet" href="[^"]*app\.css">/g, '<style>' + appCss + '</style>')
  // 在 <body> 后立即注入模板数据（确保在内联 script 之前）
  .replace('<body>', '<body>\n' + dataBlocks)
  // module script → inline regular script（defer 对内联脚本无效，靠位置保证顺序）
  .replace(/<script\s+type="module"\s+src="[^"]*main\.js"><\/script>/g, '<script>\n' + mainJsInlined + '\n<\/script>');

// 5) 写入 dist/index.html
const distDir = path.join(root, 'dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, 'index.html'), out, 'utf8');

console.log('✓ standalone HTML 已生成');
console.log('  输出: dist/index.html');
console.log('  大小:', (out.length / 1024).toFixed(1), 'KB');
