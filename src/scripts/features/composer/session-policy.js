/* 首条消息写入会话后，系统提示词已确定；完成、失败和中断均不解除锁定。 */
export function sessionHasConversation(session){
  return !!session && (session.executionLocked===true || (Array.isArray(session.exchanges)&&session.exchanges.length>0));
}
