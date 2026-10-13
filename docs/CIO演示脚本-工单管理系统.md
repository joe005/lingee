# CIO 演示脚本：工单管理系统（v2，不超过 90 秒）

参考旧版 `outputs/lingee-ticket-demo-edited.mp4`（约 176 秒）重写。旧版的问题：从立项、建任务一路讲到 Build 里逐阶段执行，是「功能流程」，CIO 看完记不住亮点；而且 CIO 并不立项、不执行。

## 定位

| 项 | 说明 |
| --- | --- |
| 观众 | CIO。关心效率、安全、进度、风险、是否有价值，不关心「怎么操作」 |
| 视角 | 全程是 CIO 在「管理」里看和决策；项目由项目管理员提前建好，镜头里不出现新建项目、新建任务、执行任务、切换账号、等待智能体生成 |
| 账号 | 吴宏超（一个账号到底，不换号） |
| 主线 | CIO 关心的三件事：**组织提效、过程可控、价值可见**。每一幕一个「亮点镜头」，用一句结论字幕收住（开发更轻松 / 管理更省心 / 决策更高效）。「组织提效」强调不是某个开发者用 AI 变快，而是整个组织的交付能力提升 |
| 时长 | 89.8 秒（上限 90 秒）；配音正常语速 |

## 分镜与逐字稿（成片 v11，89.8 秒）

成片：`outputs/lingee-cio-ticket-demo-v11.mp4`（4K，中英字幕：`outputs/cio-ticket-demo-v11.srt`）。配音微软 Edge `zh-CN-YunyangNeural`，正常语速；背景音乐 Wellspring。

| # | 时间 | 画面 | 逐字稿 | English |
| --- | --- | --- | --- | --- |
| 1 | 00:00–00:06 | 项目首页（赵琳登录） | AI 时代，作为 CIO，关心的是组织提效、过程可控和价值可见。 | In the AI era, a CIO cares about org-wide efficiency, process control, and visible value. |
| 2 | 00:06–00:20 | 新建项目：开发项目模板、名称、邀请需求 / 架构 / 开发 / 测试、Git 地址、智能体团队，创建 | 以工单管理系统为例，项目管理员快速立项。 | Take the ticketing system: a project admin sets up the project in moments. |
| 3 | 00:20–00:29 | 新建任务：智能体团队提示、各阶段审核人；删掉「智能体开发」，打开「需求分析」自动审核，保存 | 新建任务时，自动加载智能体团队，每个阶段分配好专家和审核人，还可以删减阶段、设置自动审核。 | New tasks load the agent team automatically, with an expert and reviewer for every stage. Remove stages or turn on auto-review as needed. |
| 4 | 00:30–00:35 | 开发 → 协作开发：任务在「待开始」，点「开始」进入智能体执行会话 | 任务自动进入协作开发工作台，由智能体团队按阶段执行。 | Tasks land in the Build workbench, where the agent team works through each stage. |
| 5 | 00:36–00:42 | 切到吴宏超（CIO）：项目首页、待你处理、三个开发项目 | CIO 随时打开 Manage，进度、风险和待决策一屏可见。 | Anytime, the CIO can open Manage to see progress, risks, and pending decisions on one screen. |
| 6 | 00:42–00:47 | 工单管理系统 → 甘特图，右栏智能体团队 | 4 周上线，以往要 12 周，靠的是同一支智能体团队。 | Live in 4 weeks instead of 12, powered by one shared agent team. |
| 7 | 00:47–00:54 | 议题 → 查看任务「工单自动派单算法」（已阻塞） | 风险不用等周会，直接定位到任务：派单算法卡在集群扩容审批。 | Risks surface right away, pinned to the task: dispatch is waiting on a cluster expansion approval. |
| 8 | 00:54–01:00 | 议题里点「批准」，任务恢复 | CIO 只做决策：批准后任务自动恢复，决策同时留痕。 | The CIO just decides. Once approved, the task resumes and the decision is logged. |
| 9 | 01:00–01:07 | 已完成任务详情：各阶段由智能体执行、审核通过，代码已合并到 main | 每个阶段由智能体执行、人工审核放行，代码审核通过才合并。 | Agents run every stage and people approve each one. Code merges only after review. |
| 10 | 01:07–01:13 | 成员与权限 → 智能体功能权限 | 智能体能读什么、写什么，由项目授权，安全靠机制。 | Projects decide what each agent can read and write. |
| 11 | 01:13–01:19 | 动态：按「智能体」筛选 | 动态里，哪些事智能体做、哪些事人来把关，一清二楚。 | The activity feed shows what agents did and where people stepped in. |
| 12 | 01:19–01:25 | 右栏 AI 贡献：78% AI 代码生成、85% AI 提交占比、97% 一次审核通过 | AI 生成了 78% 的代码，85% 的提交由智能体完成。 | AI wrote 78% of the code, and agents made 85% of the commits. |
| 13 | 01:25–01:30 | 回到项目首页 | 一屏可见，让 AI 可控地产生价值。 | All on one screen: AI delivering value, under control. |

### 纯文本逐字稿

AI 时代，作为 CIO，关心的是组织提效、过程可控和价值可见。以工单管理系统为例，项目管理员快速立项。新建任务时，自动加载智能体团队，每个阶段分配好专家和审核人，还可以删减阶段、设置自动审核。任务自动进入协作开发工作台，由智能体团队按阶段执行。CIO 随时打开 Manage，进度、风险和待决策一屏可见。4 周上线，以往要 12 周，靠的是同一支智能体团队。风险不用等周会，直接定位到任务：派单算法卡在集群扩容审批。CIO 只做决策：批准后任务自动恢复，决策同时留痕。每个阶段由智能体执行、人工审核放行，代码审核通过才合并。智能体能读什么、写什么，由项目授权，安全靠机制。动态里，哪些事智能体做、哪些事人来把关，一清二楚。AI 生成了 78% 的代码，85% 的提交由智能体完成。一屏可见，让 AI 可控地产生价值。

## 原型就绪情况

以下镜头所需的原型改动已补齐（详见 `docs/07-manager.md`），已缓存旧数据的浏览器会自动补种工单管理系统的任务，无需清缓存。

| 镜头 | 状态 | 说明 |
| --- | --- | --- |
| 项目首页：多个开发项目、风险 / 待决策、待你处理 | 已就绪 | 「工单管理系统」排最前（1 处风险、1 件待决策），另有「客户门户改造」「采购协同应用」同用通用应用开发智能体团队；首页「待你处理」出现调度集群扩容议题 |
| 甘特图、里程碑 | 已就绪 | 三个里程碑，周期 4 周 |
| 议题 → 定位任务、批准 / 驳回 | 已就绪 | 议题弹窗里「查看任务」打开「工单自动派单算法」抽屉（已阻塞与原因）；「批准」后任务恢复，动态留痕 |
| 任务详情：阶段、代码分支、进展记录 | 已就绪 | 18 个已完成任务有完整 5 阶段、审核人和「已合并到 main」 |
| 成员与权限、智能体权限 | 已就绪 | 沿用现有功能 |
| 动态来源胶囊 | 已就绪 | 智能体 / 人工 / 风险条数有层次（智能体按阶段记录，人工为开始与审核） |
| AI 贡献 | 已就绪 | 项目概览下方的卡片：82%（18/22）、约 130 人天、4 周对比 12 周 |
| 知识库归档 | 已就绪 | 需求文档、架构设计、网站预览、测试报告 4 份 |

## 待确认

1. 「12 周 → 4 周」「82%」「130 人天」是演示口径，请确认数字来源（旧汇报页沿用 12 → 4 周）。
2. 原型改动已补齐，录制前需要在浏览器里走一遍确认画面与时长。
3. 录制沿用旧方式（原型无头录制 + 配音）还是重新出一版配音稿，视频文件不在仓库里（`deck/` 不在版本库）。
