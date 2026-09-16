import { $, $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { navItems, setNavActive, setUrlState, showView, viewDesign } from '../../core/view.js';
import { bindDsSelect, renderIcons, renderSelect } from './icons.js';
import { dsCompDesc, dsCompDetail, dsDetailBody, dsHeroDesc, dsHeroTitle, dsNavEl, dsOverviewGrid, dsPaletteBtn, renderOverview } from './index.js';
import { renderGlobalStyles } from './tokens.js';
import { closeUserMenu } from '../sidebar.js';
/* Design System：组件预览
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 组件预览统一渲染 ---------- */
function renderComp(comp,cn){
  var h='<div class="ds-comp"><div class="ds-comp-body">';
  var row='display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:16px';
  var lbl='font-size:14px;color:var(--text-soft);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;display:block';
  var box='border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:16px';
  switch(comp){
    case 'Button':
      h+='<div style="'+row+'">'
        +'<button style="background:#495dff;color:#fff;border:none;border-radius:8px;padding:8px 20px;font-size:14px;font-weight:500;cursor:pointer">主按钮</button>'
        +'<button style="background:#f5f5f6;color:var(--text);border:none;border-radius:8px;padding:8px 20px;font-size:14px;font-weight:500;cursor:pointer">默认按钮</button>'
        +'<button style="background:none;border:none;color:#495dff;font-size:14px;cursor:pointer;padding:8px 4px;font-weight:500">文字按钮</button>'
        +'<button style="background:#fff;border:1px solid var(--border);border-radius:8px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M12 5v14M5 12h14"/></svg></button>'
        +'<button style="background:#495dff;color:#fff;border:none;border-radius:8px;padding:8px 20px;font-size:14px;font-weight:500;opacity:.5;cursor:not-allowed">禁用</button>'
        +'</div>'
        +'<div style="margin-top:16px"><span style="'+lbl+'">下拉按钮</span>'
        +'<div class="dd-wrap" style="display:inline-block">'
        +'<button class="dd-btn">新建<svg class="ic dd-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></button>'
        +'<div class="dd-panel" style="position:relative;margin-top:4px">'
        +'<div class="dd-item">通用应用</div>'
        +'<div class="dd-item">苍穹应用</div>'
        +'</div></div></div>';
      break;
    case 'Typography':
      h+='<div style="'+box+'">'
        +'<div style="font-size:32px;font-weight:700;letter-spacing:-.3px;color:#0f0f0f;margin-bottom:8px">Display 标题</div>'
        +'<div style="font-size:23px;font-weight:600;margin-bottom:8px">H1 一级标题</div>'
        +'<div style="font-size:19px;font-weight:600;margin-bottom:8px">H2 二级标题</div>'
        +'<div style="font-size:16px;font-weight:600;margin-bottom:8px">H3 三级标题</div>'
        +'<div style="font-size:14px;color:var(--text);margin-bottom:8px">正文 Regular — 这是正文内容，用于段落、描述等文本展示。</div>'
        +'<div style="font-size:14px;color:var(--text-muted);margin-bottom:8px">辅助文字 — 用于标签、描述、占位符等辅助信息。</div>'
        +'<code style="font-family:Monaco,Menlo,monospace;font-size:14px;background:#f0f0f0;padding:2px 6px;border-radius:4px">code snippet</code>'
        +'</div>';
      break;
    case 'Divider':
      h+='<div style="margin-bottom:16px"><span style="'+lbl+'">水平分割线</span><hr style="border:none;border-top:1px solid var(--border);margin:0"></div>'
        +'<div style="margin-bottom:16px"><span style="'+lbl+'">带文字分割线</span><div style="display:flex;align-items:center;gap:12px"><span style="flex:1;height:1px;background:var(--border)"></span><span style="font-size:14px;color:var(--text-muted)">或</span><span style="flex:1;height:1px;background:var(--border)"></span></div></div>';
      break;
    case 'Flex':
      h+='<div style="'+box+'"><span style="'+lbl+'">水平排列</span><div style="display:flex;gap:8px"><div style="flex:1;height:40px;background:#eef3ff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#495dff">A</div><div style="flex:1;height:40px;background:#eef3ff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#495dff">B</div><div style="flex:1;height:40px;background:#eef3ff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#495dff">C</div></div></div>'
        +'<div style="'+box+'"><span style="'+lbl+'">垂直排列</span><div style="display:flex;flex-direction:column;gap:8px"><div style="height:32px;background:#eef3ff;border-radius:6px;display:flex;align-items:center;padding:0 12px;font-size:14px;color:#495dff">Item 1</div><div style="height:32px;background:#eef3ff;border-radius:6px;display:flex;align-items:center;padding:0 12px;font-size:14px;color:#495dff">Item 2</div></div></div>';
      break;
    case 'Grid':
      h+='<div style="'+box+'"><span style="'+lbl+'">24 栅格</span><div style="display:grid;grid-template-columns:repeat(24,1fr);gap:4px">';
      for(var i=0;i<24;i++) h+='<div style="height:24px;background:#eef3ff;border-radius:3px"></div>';
      h+='</div></div><div style="'+box+'"><span style="'+lbl+'">3 列等分</span><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px"><div style="height:48px;background:#eef3ff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#495dff">1/3</div><div style="height:48px;background:#eef3ff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#495dff">1/3</div><div style="height:48px;background:#eef3ff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#495dff">1/3</div></div></div>';
      break;
    case 'Layout':
      h+='<div style="'+box+'"><div style="display:flex;min-height:200px;border:1px solid var(--border);border-radius:8px;overflow:hidden">'
        +'<div style="width:60px;background:#fbfbfb;border-right:1px solid var(--border);display:flex;align-items:center;justify-content:center"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#b8b8b8" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div>'
        +'<div style="flex:1;display:flex;flex-direction:column">'
        +'<div style="height:40px;border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 12px;font-size:14px;color:var(--text-muted)">Header</div>'
        +'<div style="flex:1;padding:12px;font-size:14px;color:var(--text-muted)">Content</div>'
        +'</div></div></div>';
      break;
    case 'Space':
      h+='<div style="'+box+'">';
      var sizes=[{n:'小',v:'4px'},{n:'中',v:'8px'},{n:'大',v:'16px'}];
      sizes.forEach(function(s){h+='<span style="'+lbl+'">'+s.n+'间距 ('+s.v+')</span><div style="display:flex;gap:'+s.v+';margin-bottom:12px"><div style="width:40px;height:40px;background:#eef3ff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#495dff">A</div><div style="width:40px;height:40px;background:#eef3ff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#495dff">B</div><div style="width:40px;height:40px;background:#eef3ff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#495dff">C</div></div>'});
      h+='</div>';
      break;
    case 'Dropdown':
      h+='<div style="'+box+'"><span style="'+lbl+'">下拉菜单</span><div style="position:relative;display:inline-block">'
        +'<button style="background:#fff;border:1px solid var(--border);border-radius:8px;padding:8px 16px;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:6px">下拉菜单 <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="m6 9 6 6 6-6"/></svg></button>'
        +'<div style="position:absolute;top:calc(100% + 10px);left:0;min-width:120px;background:#fff;border:1px solid var(--border);border-radius:14px;box-shadow:var(--menu-shadow);padding:6px;z-index:10">'
        +'<div style="padding:8px 10px;font-size:14px;cursor:pointer;border-radius:9px">菜单项 1</div>'
        +'<div style="padding:8px 10px;font-size:14px;cursor:pointer;border-radius:9px;background:var(--hover)">菜单项 2</div>'
        +'<div style="padding:8px 10px;font-size:14px;cursor:pointer;border-radius:9px">菜单项 3</div>'
        +'</div></div></div>';
      break;
    case 'Menu':
      h+='<div style="'+box+'"><span style="'+lbl+'">导航菜单</span><div style="width:140px;border-right:1px solid var(--border);padding:4px">'
        +'<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;font-size:14px;cursor:pointer;border-radius:6px;background:#eef3ff;color:#495dff;font-weight:500"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>首页</div>'
        +'<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;font-size:14px;cursor:pointer;border-radius:6px;color:var(--text)"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>应用</div>'
        +'<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;font-size:14px;cursor:pointer;border-radius:6px;color:var(--text)"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/></svg>通知</div>'
        +'</div></div>';
      break;
    case 'Tabs':
      h+='<div style="'+box+'"><span style="'+lbl+'">标签页</span><div style="display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:12px">'
        +'<div style="padding:8px 16px;font-size:14px;cursor:pointer;border-bottom:2px solid #495dff;color:#495dff;font-weight:500">标签一</div>'
        +'<div style="padding:8px 16px;font-size:14px;cursor:pointer;color:var(--text-muted)">标签二</div>'
        +'<div style="padding:8px 16px;font-size:14px;cursor:pointer;color:var(--text-muted)">标签三</div>'
        +'</div><div style="font-size:14px;color:var(--text-muted);padding:8px 0">标签页内容区域</div></div>';
      break;
    case 'Checkbox':
      h+='<div style="'+box+'"><span style="'+lbl+'">多选框</span><div style="display:flex;flex-direction:column;gap:10px">'
        +'<label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer"><span style="width:16px;height:16px;border-radius:4px;border:1px solid #d4d4d8;display:flex;align-items:center;justify-content:center"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#495dff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px"><path d="m9 11 3 3L22 4"/></svg></span>选项 A（选中）</label>'
        +'<label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer"><span style="width:16px;height:16px;border-radius:4px;border:1px solid #d4d4d8"></span>选项 B</label>'
        +'<label style="display:flex;align-items:center;gap:8px;font-size:14px;opacity:.4;cursor:not-allowed"><span style="width:16px;height:16px;border-radius:4px;border:1px solid #d4d4d8"></span>选项 C（禁用）</label>'
        +'</div></div>';
      break;
    case 'Form':
      h+='<div style="'+box+';max-width:360px"><span style="'+lbl+'">表单</span><div style="display:flex;flex-direction:column;gap:12px">'
        +'<div><label style="font-size:14px;color:var(--text);display:block;margin-bottom:4px">名称</label><input type="text" placeholder="请输入名称" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;outline:none;box-sizing:border-box"></div>'
        +'<div><label style="font-size:14px;color:var(--text);display:block;margin-bottom:4px">类型</label><div style="display:flex;gap:8px"><label style="display:flex;align-items:center;gap:4px;font-size:14px;cursor:pointer"><span style="width:14px;height:14px;border-radius:50%;border:1px solid #495dff;display:flex;align-items:center;justify-content:center"><span style="width:8px;height:8px;border-radius:50%;background:#495dff"></span></span>类型 A</label><label style="display:flex;align-items:center;gap:4px;font-size:14px;cursor:pointer"><span style="width:14px;height:14px;border-radius:50%;border:1px solid #d4d4d8"></span>类型 B</label></div></div>'
        +'<div style="display:flex;gap:8px;margin-top:4px"><button style="background:#495dff;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:14px;cursor:pointer">提交</button><button style="background:#fff;color:var(--text);border:1px solid var(--border);border-radius:8px;padding:8px 16px;font-size:14px;cursor:pointer">取消</button></div>'
        +'</div></div>';
      break;
    case 'Input':
      h+='<div style="'+box+';max-width:360px"><span style="'+lbl+'">输入框</span><div style="display:flex;flex-direction:column;gap:12px">'
        +'<input type="text" placeholder="基础输入框" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;outline:none;box-sizing:border-box">'
        +'<div style="position:relative"><input type="text" placeholder="搜索" style="width:100%;padding:8px 12px 8px 36px;border:1px solid var(--border);border-radius:8px;font-size:14px;outline:none;box-sizing:border-box"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#b8b8b8" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;position:absolute;left:10px;top:50%;transform:translateY(-50%)"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></div>'
        +'<textarea placeholder="多行文本" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;resize:vertical;min-height:60px"></textarea>'
        +'</div></div>';
      break;
    case 'Radio':
      h+='<div style="'+box+'"><span style="'+lbl+'">单选框</span><div style="display:flex;flex-direction:column;gap:10px">'
        +'<label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer"><span style="width:16px;height:16px;border-radius:50%;border:1px solid #495dff;display:flex;align-items:center;justify-content:center"><span style="width:8px;height:8px;border-radius:50%;background:#495dff"></span></span>选项 A（选中）</label>'
        +'<label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer"><span style="width:16px;height:16px;border-radius:50%;border:1px solid #d4d4d8"></span>选项 B</label>'
        +'<label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer"><span style="width:16px;height:16px;border-radius:50%;border:1px solid #d4d4d8"></span>选项 C</label>'
        +'</div></div>';
      break;
    case 'Switch':
      h+='<div style="'+box+'"><span style="'+lbl+'">开关</span><div style="display:flex;gap:24px;align-items:center">'
        +'<div style="display:flex;align-items:center;gap:8px"><div data-ds-act="switch" data-on="1" style="width:36px;height:20px;background:#495dff;border-radius:10px;padding:2px;display:flex;justify-content:flex-end;cursor:pointer;transition:all .2s"><span style="width:16px;height:16px;background:#fff;border-radius:50%;transition:all .2s"></span></div><span style="font-size:14px">开启</span></div>'
        +'<div style="display:flex;align-items:center;gap:8px"><div data-ds-act="switch" data-on="0" style="width:36px;height:20px;background:#d4d4d8;border-radius:10px;padding:2px;display:flex;justify-content:flex-start;cursor:pointer;transition:all .2s"><span style="width:16px;height:16px;background:#fff;border-radius:50%;transition:all .2s"></span></div><span style="font-size:14px;color:var(--text-muted)">关闭</span></div>'
        +'</div></div>';
      break;
    case 'Upload':
      h+='<div style="'+box+'"><span style="'+lbl+'">上传</span><div style="display:flex;gap:12px;align-items:center">'
        +'<button style="background:#fff;color:var(--text);border:1px dashed var(--border);border-radius:8px;padding:16px 24px;font-size:14px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--text-muted)"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/></svg>点击上传</button>'
        +'<div style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:#f0f0f0;border-radius:6px;font-size:14px"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#495dff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>文件已上传.txt<div style="cursor:pointer;color:var(--text-muted)">×</div></div>'
        +'</div></div>';
      break;
    case 'Avatar':
      h+='<div style="'+box+'"><span style="'+lbl+'">头像</span><div style="display:flex;gap:16px;align-items:center">'
        +'<div style="width:40px;height:40px;border-radius:50%;background:#495dff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px">L</div>'
        +'<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#495dff,#7b8cff);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px">A</div>'
        +'<div style="width:48px;height:48px;border-radius:50%;background:#eef3ff;display:flex;align-items:center;justify-content:center;color:#495dff"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg></div>'
        +'<div style="width:24px;height:24px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:14px">S</div>'
        +'</div></div>';
      break;
    case 'Badge':
      h+='<div style="'+box+'"><span style="'+lbl+'">徽标数</span><div style="display:flex;gap:24px;align-items:center">'
        +'<div style="position:relative"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span style="position:absolute;top:-4px;right:-4px;background:#e33;color:#fff;font-size:14px;min-width:16px;height:16px;border-radius:8px;padding:0 4px;display:flex;align-items:center;justify-content:center;font-weight:600">3</span></div>'
        +'<div style="position:relative"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/></svg><span style="position:absolute;top:0;right:0;width:8px;height:8px;background:#08cc50;border-radius:50%;border:1px solid #fff"></span></div>'
        +'</div></div>';
      break;
    case 'Card':
      h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">'
        +'<div style="border:1px solid var(--border);border-radius:12px;padding:16px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div style="width:36px;height:36px;border-radius:8px;background:#eef3ff;display:flex;align-items:center;justify-content:center"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#495dff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg></div><div><div style="font-size:14px;font-weight:600">标题</div><div style="font-size:14px;color:var(--text-muted)">描述文字</div></div></div><div style="font-size:14px;color:var(--text-muted)">卡片内容区域，可放置文本、图片等。</div></div>'
        +'<div style="border:1px solid var(--border);border-radius:12px;padding:16px"><div style="font-size:14px;font-weight:600;margin-bottom:8px">无图标卡片</div><div style="font-size:14px;color:var(--text-muted)">精简卡片样式，仅标题和正文。</div></div>'
        +'</div>';
      break;
    case 'Empty':
      h+='<div style="'+box+';display:flex;align-items:center;justify-content:center;min-height:120px"><div style="display:flex;flex-direction:column;align-items:center;gap:8px"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:40px;height:40px"><path d="M3 3v18h18"/><path d="M7 16l4-4 3 3 5-6"/></svg><span style="font-size:14px;color:var(--text-muted)">暂无数据</span></div></div>';
      break;
    case 'Image':
      h+='<div style="'+box+'"><span style="'+lbl+'">图片</span><div style="display:flex;gap:12px;align-items:center">'
        +'<div style="width:80px;height:80px;border-radius:8px;background:linear-gradient(135deg,#eef3ff,#f3eefe);display:flex;align-items:center;justify-content:center"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#495dff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16a3 3 0 0 1 6 0"/></svg></div>'
        +'<div style="width:80px;height:80px;border-radius:8px;background:#f0f0f0;display:flex;align-items:center;justify-content:center"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#b8b8b8" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px"><path d="M3 3v18h18"/><path d="M7 16l4-4 3 3 5-6"/></svg></div>'
        +'</div></div>';
      break;
    case 'List':
      h+='<div style="'+box+'"><span style="'+lbl+'">列表</span><div style="display:flex;flex-direction:column">'
        +'<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)"><div style="width:8px;height:8px;border-radius:50%;background:#08cc50;flex:none"></div><div style="flex:1"><div style="font-size:14px">列表项标题一</div><div style="font-size:14px;color:var(--text-muted)">描述文字</div></div></div>'
        +'<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)"><div style="width:8px;height:8px;border-radius:50%;background:#ff8d42;flex:none"></div><div style="flex:1"><div style="font-size:14px">列表项标题二</div><div style="font-size:14px;color:var(--text-muted)">描述文字</div></div></div>'
        +'<div style="display:flex;align-items:center;gap:10px;padding:10px 0"><div style="width:8px;height:8px;border-radius:50%;background:#4d89ff;flex:none"></div><div style="flex:1"><div style="font-size:14px">列表项标题三</div><div style="font-size:14px;color:var(--text-muted)">描述文字</div></div></div>'
        +'</div></div>';
      break;
    case 'Segmented':
      h+='<div style="'+box+'"><span style="'+lbl+'">分段控制器</span><div style="display:inline-flex;background:#f0f0f0;border-radius:8px;padding:2px">'
        +'<div style="padding:6px 16px;font-size:14px;cursor:pointer;border-radius:6px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.06);color:var(--text);font-weight:500">选项 A</div>'
        +'<div style="padding:6px 16px;font-size:14px;cursor:pointer;border-radius:6px;color:var(--text-muted)">选项 B</div>'
        +'<div style="padding:6px 16px;font-size:14px;cursor:pointer;border-radius:6px;color:var(--text-muted)">选项 C</div>'
        +'</div></div>';
      break;
    case 'Tag':
      h+='<div style="'+box+'"><span style="'+lbl+'">标签</span><div style="display:flex;gap:8px;flex-wrap:wrap">'
        +'<span style="padding:2px 10px;border-radius:4px;background:#eef3ff;color:#495dff;font-size:14px">蓝色</span>'
        +'<span style="padding:2px 10px;border-radius:4px;background:#e8faef;color:#08a040;font-size:14px">绿色</span>'
        +'<span style="padding:2px 10px;border-radius:4px;background:#fff1e8;color:#c06010;font-size:14px">橙色</span>'
        +'<span style="padding:2px 10px;border-radius:4px;background:#fee;color:#e04a3a;font-size:14px">红色</span>'
        +'<span style="padding:2px 10px;border-radius:4px;background:#f0f0f0;color:var(--text-muted);font-size:14px">默认</span>'
        +'<span style="padding:2px 10px;border-radius:4px;background:#eef3ff;color:#495dff;font-size:14px;display:inline-flex;align-items:center;gap:4px">可关闭<div style="cursor:pointer">×</div></span>'
        +'</div></div>';
      break;
    case 'Timeline':
      h+='<div style="'+box+'"><span style="'+lbl+'">时间轴</span><div style="display:flex;flex-direction:column">'
        +'<div style="display:flex;gap:12px;padding-bottom:20px"><div style="display:flex;flex-direction:column;align-items:center"><div style="width:10px;height:10px;border-radius:50%;background:#495dff;flex:none"></div><div style="width:2px;flex:1;background:var(--border);margin-top:2px"></div></div><div><div style="font-size:14px;font-weight:500">创建项目</div><div style="font-size:14px;color:var(--text-muted)">2026-07-30</div></div></div>'
        +'<div style="display:flex;gap:12px;padding-bottom:20px"><div style="display:flex;flex-direction:column;align-items:center"><div style="width:10px;height:10px;border-radius:50%;background:#08cc50;flex:none"></div><div style="width:2px;flex:1;background:var(--border);margin-top:2px"></div></div><div><div style="font-size:14px;font-weight:500">开发完成</div><div style="font-size:14px;color:var(--text-muted)">2026-07-28</div></div></div>'
        +'<div style="display:flex;gap:12px"><div style="display:flex;flex-direction:column;align-items:center"><div style="width:10px;height:10px;border-radius:50%;background:#d4d4d8;flex:none"></div></div><div><div style="font-size:14px;color:var(--text-muted)">等待上线</div><div style="font-size:14px;color:var(--text-soft)">待定</div></div></div>'
        +'</div></div>';
      break;
    case 'Tooltip':
      h+='<div style="'+box+'"><span style="'+lbl+'">文字提示 — 悬浮 300ms 后显示，深色圆角浮层</span><div style="display:flex;gap:16px;align-items:center">'
        +'<button data-tooltip="提示文字" style="background:#fff;border:1px solid var(--border);border-radius:6px;padding:6px 12px;font-size:14px;cursor:pointer">悬浮我</button>'
        +'<button data-tooltip="帮助中心" style="background:none;border:none;border-radius:8px;padding:6px;color:var(--text-muted);display:flex;align-items:center;justify-content:center;cursor:pointer"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5"/><line x1="12" y1="17" x2="12" y2="17"/></svg></button>'
        +'<button data-tooltip="消息通知" style="background:none;border:none;border-radius:8px;padding:6px;color:var(--text-muted);display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span style="position:absolute;top:2px;right:2px;width:8px;height:8px;background:#e04a3a;border-radius:50%"></span></button>'
        +'</div></div>'
        +'<div style="'+box+'"><span style="'+lbl+'">规范参数</span><table style="width:100%;border-collapse:collapse;font-size:14px"><tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 0;color:var(--text-muted)">背景色</td><td style="padding:8px 0">#2d2d2d</td></tr><tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 0;color:var(--text-muted)">文字颜色</td><td style="padding:8px 0">#fff</td></tr><tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 0;color:var(--text-muted)">字号</td><td style="padding:8px 0">12px / line-height 1.4</td></tr><tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 0;color:var(--text-muted)">内边距</td><td style="padding:8px 0">4px 8px</td></tr><tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 0;color:var(--text-muted)">圆角</td><td style="padding:8px 0">6px</td></tr><tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 0;color:var(--text-muted)">阴影</td><td style="padding:8px 0">0 2px 8px rgba(0,0,0,.15)</td></tr><tr><td style="padding:8px 0;color:var(--text-muted)">触发方式</td><td style="padding:8px 0">data-tooltip 属性，hover 延迟 300ms</td></tr></table></div>';
      break;
    case 'Alert':
      h+='<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">'
        +'<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;border-radius:8px;background:#e8faef;border:1px solid #b8e6c8;font-size:14px;color:#08a040"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex:none"><path d="m9 11 3 3L22 4"/></svg>成功提示：操作已完成</div>'
        +'<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;border-radius:8px;background:#fff1e8;border:1px solid #ffd6a8;font-size:14px;color:#c06010"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex:none"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>警告提示：请注意风险</div>'
        +'<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;border-radius:8px;background:#fee;border:1px solid #fca5a5;font-size:14px;color:#e04a3a"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex:none"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>错误提示：操作失败</div>'
        +'</div>';
      break;
    case 'Drawer':
      h+='<div style="'+box+'"><span style="'+lbl+'">抽屉</span><div style="position:relative;height:220px;overflow:hidden;border:1px solid var(--border);border-radius:8px;background:#f9f9f9">'
        +'<div style="position:absolute;top:0;right:0;bottom:0;width:240px;background:#fff;box-shadow:-4px 0 24px rgba(0,0,0,.08);padding:16px;border-left:1px solid var(--border)">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><span style="font-size:15px;font-weight:600">标题</span><span style="cursor:pointer;color:var(--text-muted);font-size:20px">×</span></div>'
        +'<div style="font-size:14px;color:var(--text-muted)">抽屉内容区域，从屏幕边缘滑出。</div>'
        +'</div></div></div>';
      break;
    case 'Message':
      h+='<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">'
        +'<div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:#fff;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.08);font-size:14px;max-width:360px"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#495dff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>这是一条普通消息提示</div>'
        +'<div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:#fff;border:1px solid #b8e6c8;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.08);font-size:14px;color:#08a040;max-width:360px"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="m9 11 3 3L22 4"/></svg>操作成功</div>'
        +'<div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:#fff;border:1px solid #fca5a5;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.08);font-size:14px;color:#e04a3a;max-width:360px"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>操作失败，请重试</div>'
        +'</div>';
      break;
    case 'Modal':
      h+='<div style="'+box+'"><span style="'+lbl+'">对话框</span><div style="position:relative;height:240px;overflow:hidden;border:1px solid var(--border);border-radius:8px;background:#f0f0f0">'
        +'<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:300px;background:#fff;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.15);padding:20px">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><span style="font-size:15px;font-weight:600">标题</span><span style="cursor:pointer;color:var(--text-muted);font-size:20px">×</span></div>'
        +'<div style="font-size:14px;color:var(--text-muted);margin-bottom:16px">对话框内容区域，用于重要的交互确认。</div>'
        +'<div style="display:flex;justify-content:flex-end;gap:8px"><button style="background:#fff;border:1px solid var(--border);border-radius:8px;padding:6px 16px;font-size:14px;cursor:pointer">取消</button><button style="background:#495dff;color:#fff;border:none;border-radius:8px;padding:6px 16px;font-size:14px;cursor:pointer">确定</button></div>'
        +'</div></div></div>';
      break;
    case 'Notification':
      h+='<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">'
        +'<div style="display:flex;gap:10px;padding:12px 16px;background:#fff;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.08);max-width:360px">'
        +'<div style="width:32px;height:32px;border-radius:8px;background:#eef3ff;display:flex;align-items:center;justify-content:center;flex:none"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#495dff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/></svg></div>'
        +'<div style="flex:1"><div style="font-size:14px;font-weight:600;margin-bottom:2px">通知标题</div><div style="font-size:14px;color:var(--text-muted)">这是一条通知提醒的描述内容。</div><div style="font-size:14px;color:var(--text-soft);margin-top:4px">2026-07-30</div></div>'
        +'</div></div>';
      break;
    case 'Progress':
      h+='<div style="'+box+'"><span style="'+lbl+'">进度条</span><div style="display:flex;flex-direction:column;gap:16px">'
        +'<div><div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:14px"><span>线性进度</span><span style="color:var(--text-muted)">60%</span></div><div style="height:6px;background:#f0f0f0;border-radius:3px;overflow:hidden"><div style="width:60%;height:100%;background:#495dff;border-radius:3px"></div></div></div>'
        +'<div><div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:14px"><span>分段进度</span><span style="color:var(--text-muted)">3/5</span></div><div style="display:flex;gap:4px">'+Array(5).fill(0).map(function(_,i){return '<div style="flex:1;height:6px;border-radius:3px;background:'+(i<3?'#495dff':'#f0f0f0')+'"></div>'}).join('')+'</div></div>'
        +'<div style="display:flex;align-items:center;gap:12px"><span style="font-size:14px">圆形进度</span><div style="position:relative;width:40px;height:40px"><svg viewBox="0 0 40 40" style="width:40px;height:40px;transform:rotate(-90deg)"><circle cx="20" cy="20" r="16" fill="none" stroke="#f0f0f0" stroke-width="4"/><circle cx="20" cy="20" r="16" fill="none" stroke="#495dff" stroke-width="4" stroke-dasharray="100" stroke-dashoffset="25" stroke-linecap="round"/></svg><span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:14px;font-weight:600">75%</span></div></div>'
        +'</div></div>';
      break;
    case 'Skeleton':
      h+='<div style="'+box+'"><span style="'+lbl+'">骨架屏</span><div style="display:flex;flex-direction:column;gap:8px">'
        +'<div style="height:20px;width:40%;background:#f0f0f0;border-radius:4px"></div>'
        +'<div style="height:14px;width:100%;background:#f0f0f0;border-radius:4px"></div>'
        +'<div style="height:14px;width:80%;background:#f0f0f0;border-radius:4px"></div>'
        +'<div style="display:flex;gap:12px;margin-top:8px"><div style="width:60px;height:60px;background:#f0f0f0;border-radius:8px;flex:none"></div><div style="flex:1;display:flex;flex-direction:column;gap:6px"><div style="height:14px;width:50%;background:#f0f0f0;border-radius:4px"></div><div style="height:14px;width:70%;background:#f0f0f0;border-radius:4px"></div><div style="height:14px;width:60%;background:#f0f0f0;border-radius:4px"></div></div></div>'
        +'</div></div>';
      break;
    case 'Spin':
      h+='<div style="'+box+';display:flex;align-items:center;justify-content:center;min-height:120px"><div style="display:flex;flex-direction:column;align-items:center;gap:8px">'
        +'<svg viewBox="0 0 24 24" style="width:32px;height:32px"><circle cx="12" cy="12" r="9" fill="none" stroke="#f0f0f0" stroke-width="2.5"/><path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="#495dff" stroke-width="2.5" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/></path></svg>'
        +'<span style="font-size:14px;color:var(--text-muted)">加载中...</span></div></div>';
      break;
    case 'ConfigProvider':
      h+='<div style="'+box+'"><div style="font-size:14px;color:var(--text);margin-bottom:12px">ConfigProvider 为组件提供全局统一的配置能力。</div>'
        +'<div style="display:flex;flex-direction:column;gap:10px">'
        +'<div style="display:flex;align-items:center;gap:8px;font-size:14px"><span style="padding:2px 8px;background:#f0f0f0;border-radius:4px;font-family:Monaco,Menlo,monospace;font-size:14px">theme</span><span style="color:var(--text-muted)">主题定制 — 修改组件 Token 与样式</span></div>'
        +'<div style="display:flex;align-items:center;gap:8px;font-size:14px"><span style="padding:2px 8px;background:#f0f0f0;border-radius:4px;font-family:Monaco,Menlo,monospace;font-size:14px">locale</span><span style="color:var(--text-muted)">国际化 — 多语言切换</span></div>'
        +'<div style="display:flex;align-items:center;gap:8px;font-size:14px"><span style="padding:2px 8px;background:#f0f0f0;border-radius:4px;font-family:Monaco,Menlo,monospace;font-size:14px">componentDisabled</span><span style="color:var(--text-muted)">组件禁用 — 全局禁用指定组件</span></div>'
        +'<div style="display:flex;align-items:center;gap:8px;font-size:14px"><span style="padding:2px 8px;background:#f0f0f0;border-radius:4px;font-family:Monaco,Menlo,monospace;font-size:14px">size</span><span style="color:var(--text-muted)">组件尺寸 — small / middle / large</span></div>'
        +'</div></div>';
      break;
    default:
      h+='<div style="min-height:120px;display:flex;align-items:center;justify-content:center;color:var(--text-soft);font-size:14px">组件预览待填充</div>';
  }
  h+='</div></div>';
  return h;
}

/* 组件交互绑定 */
function bindDsInteractions(comp){
  var body=dsDetailBody.querySelector('.ds-comp-body');
  if(!body) return;
  var chk='<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#495dff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px"><path d="m9 11 3 3L22 4"/></svg>';
  if(comp==='Switch'){
    body.querySelectorAll('[data-ds-act="switch"]').forEach(function(sw){
      sw.addEventListener('click',function(){
        var isOn=sw.getAttribute('data-on')==='1';
        if(isOn){sw.setAttribute('data-on','0');sw.style.background='#d4d4d8';sw.style.justifyContent='flex-start';var l=sw.nextElementSibling;if(l){l.textContent='关闭';l.style.color='var(--text-muted)';}}
        else{sw.setAttribute('data-on','1');sw.style.background='#495dff';sw.style.justifyContent='flex-end';var l=sw.nextElementSibling;if(l){l.textContent='开启';l.style.color='';}}
      });
    });
  }
  if(comp==='Checkbox'){
    body.querySelectorAll('label').forEach(function(lbl){
      if(lbl.style.opacity==='.4')return;
      lbl.addEventListener('click',function(e){e.preventDefault();var box=lbl.querySelector('span');if(!box)return;if(box.querySelector('svg')){box.innerHTML='';box.style.borderColor='#d4d4d8';}else{box.innerHTML=chk;box.style.borderColor='#495dff';}});
    });
  }
  if(comp==='Radio'){
    var radios=body.querySelectorAll('label');
    radios.forEach(function(r){
      r.addEventListener('click',function(e){e.preventDefault();radios.forEach(function(o){var d=o.querySelector('span>span');var s=o.querySelector('span');if(d)d.style.display='none';if(s)s.style.borderColor='#d4d4d8';});var d=r.querySelector('span>span');var s=r.querySelector('span');if(d)d.style.display='block';if(s)s.style.borderColor='#495dff';});
    });
  }
  if(comp==='Tabs'){
    var tc=body.querySelector('div[style*="border-bottom"]');
    if(tc)for(var i=0;i<tc.children.length;i++)tc.children[i].addEventListener('click',function(){for(var j=0;j<tc.children.length;j++){tc.children[j].style.borderBottom='none';tc.children[j].style.color='var(--text-muted)';tc.children[j].style.fontWeight='400';}this.style.borderBottom='2px solid #495dff';this.style.color='#495dff';this.style.fontWeight='500';});
  }
  if(comp==='Segmented'){
    var sc=body.querySelector('div[style*="inline-flex"]');
    if(sc)for(var i=0;i<sc.children.length;i++)sc.children[i].addEventListener('click',function(){for(var j=0;j<sc.children.length;j++){sc.children[j].style.background='transparent';sc.children[j].style.color='var(--text-muted)';sc.children[j].style.fontWeight='400';sc.children[j].style.boxShadow='none';}this.style.background='#fff';this.style.color='var(--text)';this.style.fontWeight='500';this.style.boxShadow='0 1px 2px rgba(0,0,0,.06)';});
  }
  if(comp==='Dropdown'){
    var ddBtn=body.querySelector('button');var ddMenu=body.querySelector('div[style*="position:absolute"]');
    if(ddBtn&&ddMenu){ddMenu.style.display='none';ddBtn.addEventListener('click',function(e){e.stopPropagation();ddMenu.style.display=ddMenu.style.display==='none'?'block':'none';});}
  }
  if(comp==='Menu'){
    var mi=body.querySelectorAll('div[style*="padding:8px 12px"]');
    mi.forEach(function(item){item.addEventListener('click',function(){mi.forEach(function(o){o.style.background='transparent';o.style.color='var(--text)';o.style.fontWeight='400';});item.style.background='#eef3ff';item.style.color='#495dff';item.style.fontWeight='500';});});
  }
  if(comp==='Tag'){
    var cb=body.querySelector('div[style*="cursor:pointer"]');
    if(cb)cb.addEventListener('click',function(){var t=cb.parentElement;if(t)t.style.display='none';});
  }
  if(comp==='Upload'){
    var ub=body.querySelector('button');
    if(ub)ub.addEventListener('click',function(){var fi=document.createElement('input');fi.type='file';fi.addEventListener('change',function(){if(fi.files.length>0)toast('已选择文件：'+fi.files[0].name);});fi.click();});
  }
  if(comp==='Tooltip'){
    var tb=body.querySelector('button');var tp=body.querySelector('div[style*="position:absolute"]');
    if(tb&&tp){tp.style.display='none';tb.addEventListener('mouseenter',function(){tp.style.display='block';});tb.addEventListener('mouseleave',function(){tp.style.display='none';});}
  }
  if(comp==='Button'){
    body.querySelectorAll('button:not([disabled])').forEach(function(btn){
      if(btn.style.opacity==='.5')return;
      btn.addEventListener('click',function(){var o=btn.textContent;btn.textContent='加载中...';btn.style.opacity='.6';btn.style.pointerEvents='none';setTimeout(function(){btn.textContent=o;btn.style.opacity='';btn.style.pointerEvents='';},800);});
    });
  }
  if(comp==='Form'){
    var submitBtn=body.querySelector('button');
    if(submitBtn)submitBtn.addEventListener('click',function(e){e.preventDefault();var o=submitBtn.textContent;submitBtn.textContent='提交中...';submitBtn.style.opacity='.6';submitBtn.style.pointerEvents='none';setTimeout(function(){submitBtn.textContent=o;submitBtn.style.opacity='';submitBtn.style.pointerEvents='';toast('提交成功');},800);});
  }
}

/* Design System 后退按钮 → 回到首页 */
var dsBackBtn=$('#dsBackBtn');

export function initDesignComponents() {
  /* 调色盘按钮 → 切换到设计系统视图 */
  if(dsPaletteBtn){
    dsPaletteBtn.addEventListener('click',function(){
      closeUserMenu();
      showView('design');
      setUrlState('/design');
      if(navItems) navItems.forEach(function(n){n.classList.remove('active')});
      renderOverview();
    });
  }
  if(dsBackBtn){
    dsBackBtn.addEventListener('click',function(){
      showView('newtask');
      setNavActive('新会话');
    });
  }

  /* Design System 组件导航点击 */
  if(dsNavEl){
    $$('.ds-nav-link',dsNavEl).forEach(function(link){
      link.addEventListener('click',function(){
        var comp=link.getAttribute('data-comp');
        if(!comp){
          setUrlState('/design');
          renderOverview();
        }else{
          setUrlState('/design?token='+encodeURIComponent(comp));
          var cn=link.querySelector('em')?link.querySelector('em').textContent:'';
          var en=link.firstChild&&link.firstChild.nodeType===3?link.firstChild.textContent.trim():comp;
          if(dsHeroTitle) dsHeroTitle.textContent=en+' '+cn;
          if(dsHeroDesc) dsHeroDesc.textContent=dsCompDesc[comp]||'';
          if(dsCompDetail) dsCompDetail.style.display='';
          if(dsOverviewGrid) dsOverviewGrid.innerHTML='';
          if(dsDetailBody){
            if(comp==='GlobalStyles') dsDetailBody.innerHTML=renderGlobalStyles();
            else if(comp==='Icon') dsDetailBody.innerHTML=renderIcons();
            else if(comp==='Select'){dsDetailBody.innerHTML=renderSelect();bindDsSelect();}
            else {dsDetailBody.innerHTML=renderComp(comp,cn);bindDsInteractions(comp);}
          }
        }
      });
    });
  }

  /* ESC 从设计系统返回新会话 */
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape' && !viewDesign.classList.contains('hidden')){
      showView('newtask');
      setNavActive('新会话');
    }
  });
}
