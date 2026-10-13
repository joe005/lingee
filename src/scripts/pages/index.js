/* 新页面自动接线：在本目录放 <页面名>.js 并导出 init()，就会在所有既有模块之后
   按文件名顺序初始化，不用改 main.js。页面的 HTML / 弹窗 / 样式约定见同目录 README.md。 */
const pages = import.meta.glob(['./*.js', '!./index.js'], { eager: true });

export function initPages() {
  Object.keys(pages).sort().forEach(function (key) {
    var page = pages[key];
    if (typeof page.init === 'function') page.init();
  });
}
