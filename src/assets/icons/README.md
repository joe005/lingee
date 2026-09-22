# 灵基图标清单

源文件来自 `packages/kcode-ui/src/components/icon.tsx`（`ui-` 前缀）和 `packages/kcode-web/src/components/icon.tsx`（`web-` 前缀）。

原型源码使用内联 SVG，此目录为参考库，方便设计师和开发者查阅。

---

## 目录结构

```
icons/
├── sidebar/         # 侧导航 —— 主导航、操作栏、项目区、会话列表、用户菜单（26）
├── chat/            # 会话区 —— 头部、输入框、下拉菜单、模式选择、提示词增强、预览（22）
├── login/           # 登录页（2）
├── cards/           # 卡片页 —— 技能/应用/智能体卡片（4）
│
├── arrows/          # 未引用：方向箭头 / Chevron（16）
├── feedback/        # 未引用：状态反馈（14）
├── layout/          # 未引用：布局面板（9）
├── files/           # 未引用：文件 / 文件夹 / Git（8）
├── spec/            # 未引用：规范需求（4）
├── sessions/        # 未引用：会话面板（5）
├── edit/            # 未引用：编辑操作（7）
├── web-app/         # 未引用：web 应用类型（5）
├── web-process/     # 未引用：web 开发流程（10）
└── misc/            # 未引用：其他（44）
```

说明：前 4 个目录为原型正在使用的图标；后 10 个目录为本次原型未引用的图标，留待后续使用时可取出放入对应前 4 个目录。

---

## 活跃分类

### sidebar/ — 侧导航（28）

| 文件名 | 用途 |
|--------|------|
| `ui-chat.svg` | 对话标签 |
| `ui-work.svg` | 工作标签 |
| `ui-dev.svg` | 开发标签 |
| `ui-play-circle.svg` | 新建任务 |
| `ui-skill-bolt.svg` | 技能开发 |
| `ui-ai-partner.svg` | 智能体开发 |
| `ui-app-grid.svg` | 应用开发 |
| `ui-cube.svg` | 业务组件 |
| `ui-git-branch-network.svg` | 协作开发 |
| `ui-search-16.svg` | 搜索会话 |
| `ui-building.svg` | 新建项目 |
| `ui-grid-16.svg` | 显示设置 |
| `ui-chevron-right-16.svg` | 菜单展开 |
| `ui-check-small.svg` | 选中标记 |
| `ui-folder-plus-24.svg` | 新增项目 |
| `ui-bullet-list.svg` | 切换视图 |
| `ui-dot-grid-16.svg` | 会话操作 |
| `ui-pencil-16.svg` | 重命名 / 编辑 |
| `ui-pin.svg` | 置顶会话 |
| `ui-trash-16.svg` | 删除 |
| `ui-archive.svg` | 归档会话 |
| `ui-empty-box.svg` | 空态占位 |
| `ui-settings-gear.svg` | 设置 |
| `ui-logout.svg` | 退出登录 |
| `ui-git-history.svg` | 历史记录 |
| `ui-global.svg` | 消息通知 |
| `ui-speech-bubble.svg` | 帮助中心 |
| `ui-bubble-5.svg` | 通知铃铛 |

### chat/ — 会话区（22）

| 文件名 | 用途 |
|--------|------|
| `ui-close-small.svg` | 关闭面板 |
| `ui-undo.svg` | 回退版本 |
| `ui-plus-small.svg` | 添加附件 |
| `ui-submit-upload.svg` | 发送 |
| `ui-pencil-line.svg` | 编辑 |
| `ui-circle-x.svg` | 清除 |
| `ui-loading.svg` | 加载中 |
| `ui-attachment.svg` | 添加文件 |
| `ui-folder-16.svg` | 引用文件夹 |
| `ui-link-external.svg` | 知识库 |
| `ui-chevron-right.svg` | 子菜单箭头 / 前进 |
| `ui-chevron-down.svg` | 下拉箭头 |
| `ui-file-tree.svg` | 文件 |
| `ui-app-cosmic.svg` | 苍穹应用模式 |
| `ui-app-general.svg` | 通用应用模式 |
| `ui-app-prototype.svg` | 原型探索模式 |
| `ui-goal.svg` | 目标模式 |
| `web-smart-identifier.svg` | 增强按钮（idle） |
| `web-left-rollback.svg` | 撤销增强（applied） |
| `ui-chevron-left.svg` | 后退 |
| `ui-window-cursor.svg` | 选择元素 |
| `ui-open-file.svg` | 实体 / 插件 |

### login/ — 登录页（2）

| 文件名 | 用途 |
|--------|------|
| `ui-user.svg` | 账号 |
| `ui-circle-ban-sign.svg` | 密码 |

### cards/ — 卡片页（4）

| 文件名 | 用途 |
|--------|------|
| `ui-code-slash.svg` | 代码资料卡片 |
| `ui-recognition-image.svg` | 图片识别卡片 |
| `ui-collapse-message.svg` | 折叠消息 |
| `ui-expand-message.svg` | 展开消息 |

---

## 跨目录复用关系

以下图标在多个功能区域使用，仅存储在主要使用目录：

| 文件 | 主要位置 | 复用位置 |
|------|---------|---------|
| `ui-pencil-16` | sidebar | chat（编辑预览）、cards |
| `ui-chevron-right` | chat | sidebar（项目区） |
| `ui-chevron-down` | chat | sidebar（折叠组） |
| `ui-file-tree` | chat | cards（实体视图） |
| `ui-git-history` | sidebar | chat（历史记录按钮） |
| `ui-ai-partner` | sidebar | cards（智能体卡片）、notifications |
| `ui-app-grid` | sidebar | cards（技能卡片） |
| `ui-settings-gear` | sidebar | notifications（changelog） |
| `ui-logout` | sidebar | notifications（changelog） |
| `ui-plus-small` | chat | notifications（changelog） |
| `ui-global` | sidebar | notifications（changelog） |

---

## README 修正记录

- 原 README 中 `ui-close.svg` 不存在，修正为 `ui-close-small.svg`（见 chat 目录）