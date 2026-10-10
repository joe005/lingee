/* 任务页跨模块共享、会被重新赋值的状态（ES import 绑定只读，统一挂在这个对象上）。
   初始值在各自模块顶部赋值，例如 pageState.drawerPreferredWidth = null。 */
export var pageState = {};
