import { LD_STATUS_LABELS, ldEsc, ldIsDetecting, ldStatusTone } from './core.js';

/* 本地开发 · 跨界面共用的小片段：状态标签、只读代码仓库、初始化进度、空间操作按钮、图标。
   只返回 HTML 字符串，不读写 DOM、不绑定事件。 */
export var LD_ICONS = {
  refresh: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>',
  plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
  branch: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 7v10"/><path d="M18 10c0 4-6 3-12 7"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z"/></svg>',
  chevron: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>',
  close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
};

export function ldStateTag(key, labels) {
  if (!key) return '<span class="ld-state is-muted">待检测</span>';
  return '<span class="ld-state ' + (key === 'available' ? 'is-ok' : ldStatusTone(key)) + '">' + ((labels || LD_STATUS_LABELS)[key] || LD_STATUS_LABELS[key]) + '</span>';
}

/* 代码仓库与基准分支：参照 Manage 的 Git 地址与分支组合，只读展示 */
export function ldReadonlyRepoHtml(info) {
  return '<div class="ld-repo-readonly">' +
    '<code class="ld-repo-readonly-url" aria-label="Git 地址" title="' + ldEsc(info.repo) + '">' + ldEsc(info.repo) + '</code>' +
    '<span class="ld-repo-readonly-branch" aria-label="基准分支：' + ldEsc(info.baseBranch) + '">' + LD_ICONS.branch + '<code>' + ldEsc(info.baseBranch) + '</code></span></div>';
}

/* 初始化进度：pulling 为 0–100 */
export function ldInitProgressHtml(info, pulling) {
  var stages = ['校验仓库访问权限', '获取基准分支最新代码', '准备本机代码目录', '校验分支与推送权限'];
  var current = pulling === 0 ? -1 : pulling < 24 ? 0 : pulling < 56 ? 1 : pulling < 80 ? 2 : pulling < 100 ? 3 : 4;
  var label = current < 0 ? '等待开始' : current === 4 ? '准备完成' : stages[current];
  return '<section class="ld-init-progress" aria-label="初始化进度"><div class="ld-init-progress-head"><strong role="status">' + (pulling === 100 ? '初始化完成' : pulling ? '正在初始化，请稍候' : '等待初始化') + '</strong><span>' + pulling + '%</span></div>' +
    (pulling && pulling < 100 ? '<p class="ld-hint">正在从 <code>origin/' + ldEsc(info.baseBranch) + '</code> 获取最新代码。大型仓库可能需要较长时间，请保持网络连接。</p>' : '') +
    '<p class="ld-hint">' + label + '</p>' +
    '<div class="ld-progress" role="progressbar" aria-label="初始化基准分支 ' + ldEsc(info.baseBranch) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pulling + '"><span style="width:' + pulling + '%"></span></div>' +
    '<ol class="ld-init-stages">' + stages.map(function (stage, index) {
      var done = current > index;
      return '<li class="' + (done ? 'is-done' : current === index ? 'is-current' : '') + '"><span aria-hidden="true">' + (done ? '✓' : index + 1) + '</span>' + stage + (index === 1 ? ' · ' + ldEsc(info.baseBranch) : '') + '</li>';
    }).join('') + '</ol></section>';
}

/* 每个空间的操作：地址问题要找管理员改，只给文字；连不上可重新检测，找不到仓库可更换账号。
   按钮只带 data-ld-* 动作属性，由 actions.js 统一分发。 */
export function ldProjectAction(project, view, cls) {
  var key = view.key, host = view.st.info?.host || '';
  var btn = function (attr, text, primary, extra) { return '<button type="button" class="' + cls + (primary ? ' ' + cls + '--primary' : '') + '" ' + attr + (extra || '') + '>' + text + '</button>'; };
  if (key === 'invalid') return '<span class="ld-muted">待修改地址</span>';
  if (key === 'norepo') return '<span class="ld-muted">待配置</span>';
  if (key === 'ssh') return '<span class="ld-muted">待改 HTTPS 地址</span>';
  if (key === 'git') return btn('data-ld-git-install="' + ldEsc(project.id) + '"', '安装 Git', true);
  if (key === 'noaccess') return view.st.binding?.pushIssue === 'role' ? '<span class="ld-muted">待管理员授权</span>' : btn('data-ld-auth-open="' + ldEsc(host) + '"', '重新登录', true);
  if (key === 'offline') return btn('data-ld-detect', '重新检测', false, ldIsDetecting() ? ' disabled' : '');
  if (key === 'notfound') return btn('data-ld-auth-open="' + ldEsc(host) + '"', '更换账号', false);
  if (key === 'download' || !view.st.binding) return btn('data-ld-quick="' + ldEsc(project.id) + '"', '初始化', true);
  return btn('data-ld-project-settings="' + ldEsc(project.id) + '"', '设置', false);
}
