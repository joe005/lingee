# Project management design QA

final result: passed

## Scope

- 项目列表标题区、搜索框与新建项目入口
- 新建/编辑项目的成员多选与负责人联动
- 项目详情左侧项目概述
- 右侧成员、产物、模块页签与模块数量快捷切换

## Visual and interaction checks

- Desktop viewport: 1440 × 900
- 搜索框初始值为空，未出现登录账号 `dev`；点击后可正常输入和筛选，清空后恢复全部 3 个项目。
- 搜索框和“新建项目”位于标题区右侧，项目卡片保持三列布局，无重叠和截断。
- 新建项目弹窗可多选成员；默认负责人已勾选，负责人改为“李工”后李工自动加入成员。
- 项目详情左侧显示项目概述、目标及关键数据。
- 右侧页签为“成员 / 产物 / 模块”；点击左侧“模块 4 个”后正确切换到右侧模块页签。
- 模块页签保留智能拆解、手动新增、编辑、删除及可执行任务展开能力，文案统一为模块/任务。
- 浏览器控制台无错误。

## Build checks

- `npm run check`: passed
- `npm run build`: passed
- `node --check`: passed
- `git diff --check`: passed
