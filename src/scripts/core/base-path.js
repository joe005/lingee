/* 站点部署在子路径下时的地址前缀。
 *
 * 线上（GitHub Pages）地址是 https://joe005.github.io/lingee/，而应用内部一直
 * 按「站点在域名根目录」写地址：setUrlState('/collab') 写出来是 /collab，解析时
 * 又把路径第一段当视图名——线上取到的是 'lingee'，showView('lingee') 匹配不上
 * 任何视图，于是九个视图全被藏起来，登录后右侧一片空白。
 *
 * 这里统一处理：写地址时补前缀，读地址时剥前缀，应用内部的路径写法保持不变。
 *
 * 前缀从「首屏文档所在目录」推导，不用 import.meta.env.BASE_URL——
 * vite-plugin-singlefile 会把 base 改写成 './'，那个值拿不到真实部署路径。
 * 本应用的视图路径都只有一段（/collab、/apps…），所以「最后一段是视图名、
 * 前面是站点根」这个假设成立。
 *
 * 必须在任何 replaceState 之前求值：本模块只被 import，副作用都在各模块的
 * init* 里，而 init* 一律晚于模块求值，所以这里拿到的是进入页面时的原始地址。
 */
export const BASE = location.pathname.replace(/[^/]*$/, '').replace(/\/+$/, '');

/** 应用内路径 → 浏览器地址：'/collab' → '/lingee/collab' */
export function withBase(path) {
  if (!BASE) return path;
  return BASE + (path.charAt(0) === '/' ? path : '/' + path);
}

/** 浏览器地址 → 应用内路径：'/lingee/collab' → '/collab' */
export function stripBase(pathname) {
  if (!BASE) return pathname;
  if (pathname === BASE) return '/';
  if (pathname.indexOf(BASE + '/') === 0) return pathname.slice(BASE.length) || '/';
  return pathname;
}
