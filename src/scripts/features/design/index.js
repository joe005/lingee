import { $, $$ } from '../../core/dom.js';
/* Design System 页面交互
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- Design System 交互 ---------- */
var dsPaletteBtn=$('#userMenuDesignSystem');
var dsNavEl=$('#dsNav');
var dsOverviewGrid=$('#dsOverviewGrid');
var dsCompDetail=$('#dsCompDetail');
var dsDetailBody=$('#dsDetailBody');
var dsHeroTitle=$('#dsHeroTitle');
var dsHeroDesc=$('#dsHeroDesc');

/* 组件描述（参考 Ant Design） */
var dsCompDesc={
  Button:'按钮用于触发一个即时操作',
  FloatButton:'悬浮在页面边缘的按钮，用于快速操作',
  Icon:'语义化的矢量图形，可通过配置展示不同图标',
  Typography:'文本的基本格式化，包括标题、段落、文本等',
  Divider:'分割内容的分割线',
  Flex:'弹性布局容器，提供 flex 布局的快捷方式',
  Grid:'24 栅格化系统，用于区域间隔布局',
  Layout:'页面整体布局容器，支持侧边栏、内容区等结构',
  Masonry:'瀑布流布局，按列排列不等高内容',
  Space:'设置组件之间的间距',
  Splitter:'可拆分的面板布局，支持拖拽调整面板大小',
  Anchor:'锚点链接，用于快速跳转到页面内指定位置',
  Breadcrumb:'显示当前页面在层级结构中的位置',
  Dropdown:'向下弹出的菜单列表',
  Menu:'为页面和功能提供导航的菜单列表',
  Pagination:'采用分页的形式分隔长列表，按页加载内容',
  Steps:'引导用户按照流程完成任务的导航条',
  Tabs:'用于将大量内容进行分类，按标签页分隔展示',
  AutoComplete:'输入框自动完成功能，根据输入内容提供建议',
  Cascader:'指在选择框中选择层级结构的数据',
  Checkbox:'用户通过勾选进行多项选择',
  ColorPicker:'通过拖拽颜色选择器来选择颜色',
  DatePicker:'输入或选择日期的控件',
  Form:'高性能表单控件，支持数据校验和数据管理',
  Input:'通过鼠标或键盘输入内容，是最基础的表单类控件',
  InputNumber:'通过鼠标或键盘输入内容，范围为数字',
  Mentions:'在输入中提及团队成员',
  Radio:'在多个互斥的选项中选择的单选框',
  Rate:'对事物进行评级操作',
  Select:'用于收集用户提供的选项',
  Slider:'通过拖动滑块选择数值',
  Switch:'用于在两个状态之间切换',
  TimePicker:'输入或选择时间的控件',
  Transfer:'双栏列表选择组件，用于将数据在两栏之间选择',
  TreeSelect:'树型选择控件，支持多选和搜索',
  Upload:'将文件上传到服务器',
  Avatar:'代表用户或事物，支持图片、图标或字符展示',
  Badge:'出现在按钮、图标旁的数字或状态标记',
  Calendar:'按照日历形式展示数据的容器',
  Card:'通用卡片容器，用于展示信息聚合',
  Carousel:'轮播展示一组内容',
  Collapse:'可以折叠/展开的内容区域',
  Descriptions:'展示多个字段信息列表',
  Empty:'暂无数据时的展示状态',
  Image:'相比原生的 img 标签提供了更多的功能和样式控制',
  List:'最基础的列表展示，可以承载文字、图片等信息',
  Popover:'点击或悬浮时弹出的气泡卡片内容',
  QRCode:'生成并展示二维码',
  Segmented:'分段控制器，用于在多个选项间切换',
  Statistic:'展示统计数值',
  Table:'展示行列数据',
  Tag:'进行标记和分类的小标签',
  Timeline:'按时间顺序展示的信息列表',
  Tooltip:'简单的文字提示气泡框',
  Tour:'用于引导用户了解产品功能',
  Tree:'用于展示有层级关系的数据结构',
  Alert:'用于页面中展示重要的提示信息',
  Drawer:'从屏幕边缘滑出的面板，用于承载相关内容',
  Message:'全局展示操作反馈信息',
  Modal:'模态对话框，用于重要的交互确认',
  Notification:'向用户展示通知提醒信息',
  Popconfirm:'点击元素时弹出确认气泡框',
  Progress:'展示操作的当前进度',
  Result:'用于反馈处理结果',
  Skeleton:'在内容加载时展示占位图形',
  Spin:'用于页面或区块的加载中状态',
  Watermark:'在页面上添加水印信息',
  Affix:'将页面元素固定在可视范围内',
  App:'提供全局化配置的包裹组件',
  BorderBeam:'为元素添加边框流光动画效果',
  ConfigProvider:'为组件提供全局统一的配置',
  Util:'提供工具类方法',
  GlobalStyles:'设计令牌，定义色彩、圆角、间距、阴影等基础视觉规范'
};

/* 分类数据 */
var dsCategories=[
  {name:'基础',en:'General',count:5,color:'#495dff',bg:'#eef3ff',icon:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z"/>'},
  {name:'布局',en:'Layout',count:7,color:'#ff8d42',bg:'#fff1e8',icon:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'},
  {name:'导航',en:'Navigation',count:7,color:'#8b5cf6',bg:'#f3eefe',icon:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>'},
  {name:'数据录入',en:'Data Entry',count:18,color:'#08cc50',bg:'#e8faef',icon:'<path d="M17 3a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'},
  {name:'数据展示',en:'Data Display',count:19,color:'#3a7bff',bg:'#eef3ff',icon:'<path d="M3 3v18h18"/><path d="M7 16l4-4 3 3 5-6"/>'},
  {name:'反馈',en:'Feedback',count:12,color:'#e04a3a',bg:'#fee',icon:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'},
  ];

/* 渲染分类总览网格 */
function renderOverview(){
  if(dsCompDetail) dsCompDetail.style.display='none';
  if(dsHeroTitle) dsHeroTitle.textContent='Lingee 组件总览';
  if(dsHeroDesc) dsHeroDesc.textContent='按组件职责与抽象层级划分为 6 大类，覆盖基础、布局、导航、数据录入、数据展示、反馈。';
  if(dsOverviewGrid){
    var html='';
    dsCategories.forEach(function(cat){
      html+='<div class="ds-color-card" style="cursor:pointer" data-cat="'+cat.en+'">'
        +'<div class="ds-color-swatch" style="background:'+cat.bg+';display:flex;align-items:center;justify-content:center">'
        +'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="'+cat.color+'" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:28px;height:28px">'+cat.icon+'</svg>'
        +'</div>'
        +'<div class="ds-color-meta">'
        +'<div class="ds-color-name">'+cat.name+'</div>'
        +'<div class="ds-color-val">'+cat.en+' · '+cat.count+' 组件</div>'
        +'</div></div>';
    });
    dsOverviewGrid.innerHTML=html;
  }
  /* 高亮"组件总览" */
  $$('.ds-nav-link',dsNavEl).forEach(function(l){l.classList.toggle('active',l.getAttribute('data-target')==='overview')});
}

export function initDesignSystem() {

}

export { dsCompDesc, dsCompDetail, dsDetailBody, dsHeroDesc, dsHeroTitle, dsNavEl, dsOverviewGrid, dsPaletteBtn, renderOverview };
