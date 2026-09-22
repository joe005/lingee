/**
 * 开发服务器的 SPA 回退。
 *
 * 原型用 history.replaceState 把地址改成 /collab、/apps 这类干净路径（见
 * src/scripts/core/view.js 的 setUrlState）。地址栏好看了，但服务器上并没有
 * 这些文件——**在这个页面上按刷新，浏览器会真的去请求 /collab，于是 404**。
 *
 * 这里把「看起来像应用路由」的请求重写回 /，交给 index.html；浏览器地址栏
 * 不变，前端的 boot/route.js 仍然从 location.pathname 里读出要打开哪个视图。
 *
 * 只作用于 npm run dev。线上走 GitHub Pages，刷新靠 404.html 回退。
 */
export default function spaFallback() {
  // 这些前缀是 Vite 自己的，必须原样放行
  const PASS = [/^\/@/, /^\/node_modules\//, /^\/src\//, /^\/build\//, /^\/__/];

  return {
    name: 'spa-fallback',
    enforce: 'pre',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();

        const [path] = (req.url || '/').split('?');
        if (path === '/' || PASS.some((re) => re.test(path))) return next();
        // 带扩展名的当成真实文件（.js / .css / .png / .html …）
        if (/\.[a-zA-Z0-9]+$/.test(path)) return next();
        if (!String(req.headers.accept || '').includes('text/html')) return next();

        // 只改服务端拿到的 url，地址栏保持不变
        const qs = (req.url || '').slice(path.length);
        req.url = '/' + qs;
        if (req.originalUrl) req.originalUrl = req.url;
        next();
      });
    },
  };
}
