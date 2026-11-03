/* 工作区演示数据：给几个开发空间预置示例工作区，下拉里能直接看到「空间 → 工作区」的层级。
   每个空间在每个浏览器里只写入一次（见 data.js 的 applyWorkspaceDemo）：用户已自己建过、或之后删光，都不再覆盖。
   成员都是对应空间的空间成员；任务编号 → 工作区只写在有研发任务的空间里，没有归入的任务留在空间根。纯数据，不依赖其他模块。 */

export var WS_DEMO_KEY = 'lingee-manager-ws-demo-v1';      /* 旧版只给「工单管理系统」写过，沿用为它的已写入标记 */
export var WS_DEMO_DONE_KEY = 'lingee-manager-ws-demo-v2';  /* { 空间 ID: true } */

function ws(id, name, desc, parentId, ownerId, memberIds, order, at) {
  return { id: id, name: name, desc: desc, parentId: parentId, ownerId: ownerId, memberIds: memberIds, order: order, status: 'active', visibility: 'public', createdBy: ownerId, createdAt: at };
}

/* 空间 ID → { workspaces(), tasks: { 任务编号: 工作区 ID } } */
export var WS_DEMO = {
  /* 赵琳（p04）在每个工作区里，保证她名下的演示任务不用额外入组 */
  'ticket-mgmt': {
    workspaces: function (at) {
      return [
        ws('ws-demo-backend', '后端服务', '工单、派单、SLA 等后端能力的开发与联调', '', 'p26', ['p26', 'p01', 'p25', 'p04'], 1, at),
        ws('ws-demo-engine', '工单引擎', '状态流转、自动派单与 SLA 引擎', 'ws-demo-backend', 'p25', ['p25', 'p26', 'p04'], 1, at + 1),
        ws('ws-demo-frontend', '前端体验', '工单提交、列表与详情等界面', '', 'p01', ['p01', 'p24', 'p26', 'p04'], 2, at + 2),
        ws('ws-demo-qa', '测试验收', '回归测试与上线验收', '', 'p27', ['p27', 'p22', 'p04'], 3, at + 3),
      ];
    },
    tasks: {
      T1001600: 'ws-demo-frontend', T1001601: 'ws-demo-backend', T1001602: 'ws-demo-engine', T1001603: 'ws-demo-backend', T1001604: 'ws-demo-backend',
      T1001605: 'ws-demo-frontend', T1001606: 'ws-demo-frontend', T1001607: 'ws-demo-engine', T1001608: 'ws-demo-frontend', T1001609: 'ws-demo-backend',
      T1001610: 'ws-demo-engine', T1001611: 'ws-demo-engine', T1001612: 'ws-demo-engine',
    },
  },
  'crm-portal': {
    workspaces: function (at) {
      return [
        ws('ws-crm-front', '门户前台', '客户自助查询与服务申请的前台页面', '', 'p26', ['p26', 'p24', 'p22'], 1, at),
        ws('ws-crm-self', '客户自助', '账户、订单与发票的自助查询', 'ws-crm-front', 'p24', ['p24', 'p26'], 1, at + 1),
        ws('ws-crm-track', '订单跟踪', '订单状态与物流节点跟踪', 'ws-crm-front', 'p26', ['p26', 'p27'], 2, at + 2),
        ws('ws-crm-service', '服务申请', '服务申请受理、转派与回访', '', 'p21', ['p21', 'p24', 'p22'], 2, at + 3),
        ws('ws-crm-test', '联调测试', '门户一期联调与回归', '', 'p27', ['p27', 'p22'], 3, at + 4),
      ];
    },
    tasks: {},
  },
  'purchase-collab': {
    workspaces: function (at) {
      return [
        ws('ws-pur-quote', '报价协同', '供应商在线报价与询比价', '', 'p26', ['p26', 'p24', 'p22'], 1, at),
        ws('ws-pur-bill', '对账与发票', '对账、发票校验与结算', '', 'p09', ['p09', 'p24', 'p26'], 2, at + 1),
        ws('ws-pur-invoice', '发票识别', '发票 OCR 与验真', 'ws-pur-bill', 'p26', ['p26', 'p27'], 1, at + 2),
        ws('ws-pur-test', '验收测试', '报价与对账上线前验收', '', 'p27', ['p27', 'p22'], 3, at + 3),
      ];
    },
    tasks: {},
  },
  equipment: {
    workspaces: function (at) {
      return [
        ws('ws-eq-inspect', '设备巡检', '巡检计划、点检与异常上报', '', 'p03', ['p03', 'p01', 'p42', 'p22'], 1, at),
        ws('ws-eq-repair', '报修与维修', '故障报修、派工与维修闭环', '', 'p02', ['p02', 'p01', 'p07', 'p22'], 2, at + 1),
        ws('ws-eq-ai', '故障诊断助手', '把排障经验做成诊断助手', '', 'p01', ['p01', 'p05', 'p22'], 3, at + 2),
      ];
    },
    tasks: {},
  },
};
