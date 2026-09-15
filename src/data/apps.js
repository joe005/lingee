/* 应用开发页卡片数据。从原 index.html 里手工复制的静态卡片原样搬过来
   （内容本身是原型占位数据，不改文案），改成数组 + <AppCard/> 渲染。
   见 docs/react-migration-plan.md §1 / §4 Phase 1。 */
export const APPS_LIBRARY = [
  {
    id: 'app-quote-1',
    title: '报价单管理',
    desc: '深度解析合同文本，捕捉金额、收付款节点、权利义务等核心台账数据，将复杂的法律条文…',
    tags: ['ERP', '供应链云', '采购订单'],
    icon: {
      color: '#3a7bff',
      bg: '#eef3ff',
      paths: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1Z'],
    },
  },
  {
    id: 'app-purchase-order',
    title: '采购订单',
    desc: '深度解析合同文本，捕捉金额、收付款节点、权利义务等核心台账数据，将复杂的法律条文…',
    tags: ['ERP', '供应链云', '采购订单'],
    icon: {
      color: '#8b5cf6',
      bg: '#f3eefe',
      paths: ['M14 3v4a1 1 0 0 0 1 1h4', 'M5 3h9l5 5v6', 'M5 3v18h7', 'm21 22-2.2-2.2'],
      circles: [{ cx: 16.5, cy: 17.5, r: 2.5 }],
    },
  },
  {
    id: 'app-personal-asset',
    title: '个人资产管理',
    desc: '深度解析合同文本，捕捉金额、收付款节点、权利义务等核心台账数据，将复杂的法律条文…',
    tags: ['通用订单'],
    icon: {
      color: '#ff8d42',
      bg: '#fff1e8',
      paths: [
        'M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2',
        'm9 14 2 2 4-4',
      ],
      rects: [{ x: 8, y: 3, width: 8, height: 4, rx: 1 }],
    },
  },
  {
    id: 'app-inventory-issue',
    title: '库存领用',
    desc: '深度解析合同文本，捕捉金额、收付款节点、权利义务等核心台账数据，将复杂的法律条文…',
    tags: ['ERP', '供应链云', '库存领用单'],
    icon: {
      color: '#ff8d42',
      bg: '#fff1e8',
      paths: ['M5 20a7 7 0 0 1 14 0', 'M19 5v4M17 7h4'],
      circles: [{ cx: 12, cy: 8, r: 3.5 }],
    },
  },
  {
    id: 'app-quote-2',
    title: '报价单管理',
    desc: '深度解析合同文本，捕捉金额、收付款节点、权利义务等核心台账数据，将复杂的法律条文…',
    tags: ['ERP', '供应链云', '报价单管理'],
    icon: {
      color: '#08cc50',
      bg: '#e8faef',
      paths: ['M6 16a3 3 0 0 1 6 0', 'M15 10h4M15 14h4'],
      circles: [{ cx: 9, cy: 11, r: 2 }],
      rects: [{ x: 3, y: 5, width: 18, height: 14, rx: 2 }],
    },
  },
  {
    id: 'app-asset-issue',
    title: '资产领用',
    desc: '深度解析合同文本，捕捉金额、收付款节点、权利义务等核心台账数据，将复杂的法律条文…',
    tags: ['ERP', '供应链云', '资产领用单'],
    icon: {
      color: '#4d89ff',
      bg: '#eef3ff',
      paths: ['M12 3v18M7 21h10', 'M12 6 5 8l-2.5 6a3.5 3.5 0 0 0 7 0L7 8m12 0-2.5 6a3.5 3.5 0 0 0 7 0L21 8l-7-2'],
    },
  },
  {
    id: 'app-leave',
    title: '请假管理',
    desc: '深度解析合同文本，捕捉金额、收付款节点、权利义务等核心台账数据，将复杂的法律条文…',
    tags: ['通用领用单'],
    icon: {
      color: '#ff8d42',
      bg: '#fff1e8',
      paths: [
        'M14 3v4a1 1 0 0 0 1 1h4',
        'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z',
        'M8 13h8M8 17h5',
      ],
    },
  },
];
