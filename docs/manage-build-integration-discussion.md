# Manage × Build 对接讨论稿

## 1. 对接目标

Manage 负责项目、里程碑和任务管理；Build 负责读取研发任务，基于专家与专家团执行，并将阶段状态、产物和审核结果回写 Manage。

```text
Manage 项目 / 里程碑
        ↓ 创建研发任务
Build 获取当前用户负责的任务
        ↓
Build 基于专家 / 专家团执行
        ↓
阶段状态、产物、审核结果回写 Manage
```

## 2. 已确认的边界

### Manage 负责展示和维护

- 项目
- 里程碑
- 项目任务
- 任务负责人和阶段处理人
- 任务状态、风险和待决策
- 任务产物和审核结果

Build 不提供项目管理页面和里程碑管理页面，但任务接口需要带上必要的项目、里程碑引用，供任务上下文和回跳使用。

### 不引入工作区

本次对接不增加 workspace 概念。接口使用当前登录用户，以及 Manage 已有的组织、租户和权限上下文。

### Build 查询“我的任务”

Build 不拉取全部任务，由 Manage 按当前登录用户返回任务。首期“我的任务”包含当前阶段由我执行或由我审核的任务。任务负责人和当前阶段处理人需要作为两个独立字段返回。

## 3. 专家、数字员工与专家团

### 资产归属

租户数字员工的主数据由 Build 的租户管理模块维护。原厂专家、租户数字员工和专家团均由 Build 侧维护运行配置和发布版本。

资产至少需要区分：

```text
assetId
assetType: expert | digital_employee | team
scope: official | tenant
tenantId: 租户资产必填，原厂资产为空
version
status: draft | published | offline
```

### 两层资产范围

| 资产 | 管理方 | 可使用范围 |
| --- | --- | --- |
| 原厂专家 | 金蝶原厂 | 有权限的租户 |
| 原厂专家团 | 金蝶原厂 | 有权限的租户 |
| 租户数字员工 | 当前租户管理员 | 当前租户 |
| 租户专家团 | 当前租户管理员 | 当前租户 |

租户专家团允许同时引用原厂专家和本租户数字员工，不允许引用其他租户的资产。

### 发布、版本和下架

原厂专家、租户数字员工和专家团共用发布、版本和下架机制，但权限控制不同：原厂资产由原厂管理员维护，租户资产由本租户管理员维护；用户只能看到本租户资产和被授权使用的原厂资产；任务需要固化创建时使用的资产 ID 和版本。

租户数字员工下架后，新任务不能再选择该资产；已绑定该资产的任务继续执行，正在执行的任务不因下架被强制中断，历史任务保留资产名称、ID和版本。

## 4. 任务创建与执行计划

Manage 创建研发任务时，让用户选择可用的专家或专家团，但不保存专家的提示词、知识库和内部配置。Manage 只把任务信息和选择结果传给 Build：

```json
{
  "taskId": "T1001302",
  "projectId": "project-survey",
  "milestoneId": "milestone-development",
  "expertSelection": {
    "type": "team",
    "assetId": "team-tenant-001",
    "version": "1.2.0"
  }
}
```

Build 收到后负责校验资产和租户权限、校验版本、根据专家团生成执行计划，并返回阶段、执行专家、处理人、审核节点和产物要求。任务需要绑定本次使用的资产版本。

执行计划至少包含阶段 ID 和名称、顺序、执行专家、处理人或审核人、产物类型和阶段状态。

## 5. 建议的接口边界

### Manage 提供

```text
POST /tasks
GET  /tasks/my
GET  /tasks/{taskId}
PATCH /tasks/{taskId}
```

任务接口返回项目和里程碑引用、任务基础信息、当前阶段、当前处理人、任务状态和当前用户可执行动作。

### Build 提供或接收

```text
POST /tasks/{taskId}/plan
POST /tasks/{taskId}/runs
POST /tasks/{taskId}/status
POST /tasks/{taskId}/artifacts
```

`/plan` 根据 Manage 传入的专家或专家团版本生成执行计划；`/runs` 创建阶段执行记录；`/status` 回写阶段运行状态、阻塞原因和执行结果；`/artifacts` 登记阶段产物。

## 6. 状态同步

建议状态流转为：

```text
待开始 → 执行中 → 待审核 → 已完成
                    ↓
                  已驳回 → 执行中

执行失败 → 已阻塞 → 重新执行
```

| 数据 | 负责方 |
| --- | --- |
| 项目和里程碑 | Manage |
| 任务基础信息和整体状态 | Manage |
| 阶段执行过程和运行日志 | Build |
| 阶段产物 | Build 生成，Manage 归集展示 |
| 审核结论 | Manage 记录 |
| 专家、数字员工和专家团配置 | Build |

Build 需要能够回写开始执行、阶段执行中、产物提交、阶段失败、阻塞原因和请求重新执行等结果。

## 7. 产物归集

产物按以下关系归集：

```text
项目 → 里程碑 → 任务 → 执行阶段 → 执行记录 → 产物版本
```

建议接口：

```text
POST /tasks/{taskId}/artifacts
GET  /tasks/{taskId}/artifacts
GET  /artifacts/{artifactId}
```

产物至少包含 `artifactId`、`taskId`、`stageId`、`runId`、名称、类型、版本、状态、文件或内容引用、预览地址、下载地址、创建人和创建时间，以及文件大小或校验值。

建议由 Build 将文件上传到统一对象存储，再向 Manage 登记产物元数据。Manage 在任务详情和项目视图中展示产物、审核状态和历史版本。产物只新增版本，不覆盖已审核版本。

审核记录关联具体产物版本：

```text
POST /tasks/{taskId}/reviews
POST /tasks/{taskId}/reviews/{reviewId}/approve
POST /tasks/{taskId}/reviews/{reviewId}/reject
```

## 8. 首期范围

首期优先完成：

1. Manage 项目、里程碑和任务接口；
2. Manage 按当前用户返回本人负责的任务；
3. Build 维护原厂和租户专家资产目录；
4. Manage 创建任务时传递专家或专家团选择结果；
5. Build 校验资产并生成执行计划；
6. Build 回写阶段状态和阻塞信息；
7. Build 登记任务产物；
8. Manage 展示产物和审核历史。

首期暂不纳入 workspace 接口、Build 侧项目和里程碑管理页面、专家草稿与内部配置同步，以及业务系统答卷数据接口。

## 9. 需要 Manage 团队确认的问题

1. Manage 现有项目、里程碑和任务接口能否提供上述字段？
2. 是否支持按当前阶段执行人或审核人查询“我的任务”？
3. 任务负责人和阶段处理人是否已经分开建模？
4. Manage 创建任务后，是否可以把专家选择结果和任务信息一起传给 Build？
5. Manage 侧展示的专家目录采用 Build 查询接口还是双方同步机制？
6. Build 生成执行计划后，Manage 保存完整计划还是只保存引用？
7. Manage 是否已有统一文件存储、预览和下载能力？
8. 审核操作由 Manage 发起，还是 Build 发起后回调 Manage？
9. Manage 是否支持 Webhook、事件总线或回调接口？
10. 状态和产物回写是否需要版本号、幂等键和审计记录？

本次交流优先确认三件事：**Manage 的任务数据结构、Build 专家资产的选择传递方式、产物的存储与归集方式**。
