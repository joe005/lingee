/* ERP 环境运行时状态。替代 main.js 中的 var ENV_ITEMS + bridge.env。 */
import { ENV_DATA_CENTERS, ERP_API_SCOPES } from '../data/environments';

let envItems = [
  { name: 'scm-dev', url: 'https://scmdev.kingdee.com:8443/ierp', product: 'XK', source: 'local', dataCenter: '1561691182942805271', clientId: 'lingee-build-scm-dev', clientSecret: '', gateway: 'acgw-scm-dev', normalAccessToken: true, proxyUser: '', envConn: 'auth', grantedBy: '吴**超', grantedAt: '09-01', lastUsed: '今天 14:32', isDefault: true },
  { name: 'fi-uat', url: 'https://fiuat.kingdee.com/ierp', product: 'XH', source: 'local', dataCenter: '1288162917259', clientId: 'lingee-build-fi-uat', clientSecret: '', gateway: '', normalAccessToken: true, proxyUser: '', envConn: 'auth', grantedBy: '吴**超', grantedAt: '08-27', lastUsed: '08-28 16:40', grantState: 'expired', isDefault: false },
  { name: 'hr-sit', url: 'http://172.20.31.86:8081/ierp', product: 'XK', source: 'cloud', dataCenter: '1561691182942805271', clientId: 'lingee-build-hr-sit', clientSecret: '', gateway: 'acgw-hr-sit', normalAccessToken: true, proxyUser: '', envConn: 'cred', isDefault: false },
  { name: 'legacy-v79', url: 'http://172.20.28.204:8080/ierp', product: 'XK', source: 'local', dataCenter: '1288162917259', clientId: 'lingee-build-legacy-v79', clientSecret: '', gateway: 'acgw-legacy-v79', normalAccessToken: false, proxyUser: 'erp-openapi-agent', envConn: 'cred', isDefault: false },
];

export function getList() { return envItems.map(function (e, i) { return Object.assign({ index: i }, e); }); }
export function getDataCenters() { return ENV_DATA_CENTERS; }
export function getApiScopes() { return ERP_API_SCOPES; }

export function deleteItem(i) {
  if (i < 0 || i >= envItems.length) return;
  var name = envItems[i].name;
  envItems.splice(i, 1);
  notify();
  return name;
}

export function setDefault(i) {
  envItems.forEach(function (e, j) { e.isDefault = (j === i); });
  notify();
}

export function testConnection(i) {
  var item = envItems[i]; if (!item) return;
  item._testing = true; notify();
  setTimeout(function () {
    item._testing = false;
    item._testResult = '连通正常 ' + (60 + Math.floor(Math.random() * 180)) + 'ms';
    notify();
  }, 700 + Math.random() * 600);
}

export function copyUrl(i) {
  var item = envItems[i]; if (!item) return item.url;
  return item.url;
}

export function getItem(i) { return i >= 0 ? envItems[i] : null; }
export function addItem(item) { envItems.push(item); notify(); }
export function updateItem(i, data) { if (envItems[i]) Object.assign(envItems[i], data); notify(); }

export function probeAuthSupport(url) {
  var u = (url || '').toLowerCase();
  if (!u) return false;
  if (/legacy|192\.168\.|172\.\d+\.|10\.\d+\.|:8080|:8081/.test(u)) return false;
  return true;
}

export function normalizeEnvUrl(raw) {
  var t = String(raw || '').trim().replace(/\/+$/, '');
  if (!t) return '';
  var out;
  if (/^https?:\/\//i.test(t)) out = t;
  else { var m = t.match(/^(https?):\/*(.*)$/i); out = m ? (m[1].toLowerCase() + '://' + m[2]) : ('http://' + t); }
  try { var u = new URL(out); return (u.origin + u.pathname).replace(/\/+$/, ''); } catch { return out; }
}

let version = 0;
let listeners = [];
export function subscribe(fn) { listeners.push(fn); return function () { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; }
export function getVersion() { return version; }
function notify() { version++; listeners.slice().forEach(function (fn) { try { fn(); } catch { /* ignore */ } }); }
