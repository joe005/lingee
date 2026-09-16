/* 从 main.js 提取的静态数据 */

export const ENV_DATA_CENTERS = [
    {id:'1561691182942805271',name:'多维联合集团有限公司'},
    {id:'1288162917259',name:'蓝海集团测试数据中心'}
  ];
export const ERP_API_SCOPES = [
    {name:'查询采购订单',path:'/kapi/v2/scm/pm/PurOrder'},
    {name:'保存采购订单',path:'/kapi/v2/scm/pm/PurOrder/save'},
    {name:'提交审核采购订单',path:'/kapi/v2/scm/pm/PurOrder/submitAndAudit'},
    {name:'查询采购入库单',path:'/kapi/v2/scm/im/PurInBill'},
    {name:'查询物料',path:'/kapi/v2/bd/Material'},
    {name:'查询供应商',path:'/kapi/v2/bd/Supplier'}
  ];
