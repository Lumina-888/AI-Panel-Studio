# AI Panel Studio — 全站视觉重设计规范

> 2026-06-26 | 版本 v1.0

## 1. 设计概览 (Design Read)

**Reading this as:** Web 应用（AI 圆桌讨论工具），双主题设计——主页极简黑白，演播厅黑蓝科技感。受众为内容创作者/使用者，追求高级感与科技感的平衡。

### 设计参数

| 参数 | 主页 | 演播厅 |
|------|------|--------|
| DESIGN_VARIANCE | 5 | 6 |
| MOTION_INTENSITY | 5 | 6 |
| VISUAL_DENSITY | 3 | 4 |

### 硬性约束

- 所有功能、API、状态管理逻辑**不变**
- 组件全部基于现有 `client/src/components/` 手写组件体系扩展
- 遵守 Tailwind v4 + React 19 + TypeScript 严格模式
- 中文 UI
- 响应式适配所有宽度，充足留白

---

## 2. 路由架构

```
/                → HomePage         一级页面（黑白调独立主页）
/discussions     → StudioLayout     二级页面（三栏演播厅）
/discussion/:id  → DiscussionRoom   二级页面（讨论室内容）
```

原路由 `/` → AppLayout 方案废弃。新建独立路由页面，`AppLayout` 精简为纯布局壳（不含主页逻辑）。

---

## 3. 色板系统

### 主页 (`/`)
| Token | 值 | 用途 |
|-------|-----|------|
| bg-primary | `#0a0a0a` | 纯黑背景 |
| text-primary | `#f5f5f5` | 主文字 |
| text-dim | `rgba(255,255,255,0.45)` | 次要文字 |
| panel-bg | `rgba(255,255,255,0.03)` | 预览面板底色 |
| border-glow | `rgba(255,255,255,0.10)` | 边框/分隔线 |
| status-green | `#00e676` | 运行中 |
| status-amber | `#ffab00` | 等待中 |
| status-gray | `#555555` | 已结束 |

### 演播厅 (`/discussions`, `/discussion/:id`)
| Token | 值 | 用途 |
|-------|-----|------|
| bg-deep | `#08081a` | 深蓝黑背景 |
| bg-panel | `rgba(10,10,30,0.6)` | 玻璃面板底 |
| accent-cyan | `#00e5ff` | 强调色 |
| accent-magenta | `#ff4081` | 分歧强调色 |
| border-glow | `rgba(0,229,255,0.25)` | 边框发光 |
| text-primary | `#e0e0f0` | 主文字 |
| text-dim | `#6a6a8a` | 次要文字 |
| status-green | `#00e676` | 运行中 |
| status-amber | `#ffab00` | 准备中 |
| status-gray | `#555555` | 离线/结束 |

---

## 4. 一级页面 — 主页 (`/`)

### 4.1 布局
```
┌─────────────────────────────────────────────────────┐
│  StarfieldBackground (黑灰渐变 #1a1a1a→#050505)     │
│  ┌───────────────────────────────────────────────┐  │
│  │                              ┌───────────┐    │  │
│  │                              │HamsterLoader│   │  │
│  │                              │  右上角    │    │  │
│  │                              └───────────┘    │  │
│  │  ┌──────────────────┐  ┌──────────────────┐   │  │
│  │  │  讨论预览列表     │  │  ExpandCard      │   │  │
│  │  │  rounded-2xl     │  │  项目介绍         │   │  │
│  │  │  白色呼吸辉光边框 │  │  悬浮扩散卡片     │   │  │
│  │  │  max-h-[70vh]    │  │                  │   │  │
│  │  │  10条预览, 只读  │  └──────────────────┘   │  │
│  │  └──────────────────┘                         │  │
│  │                        ┌──────────────────┐   │  │
│  │                        │  CyberCard        │   │  │
│  │                        │  3D 倾斜卡片       │   │  │
│  │                        │  发起新讨论        │   │  │
│  │                        └──────────────────┘   │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

- 全屏 `min-h-[100dvh]`，容器 `max-w-[1400px] mx-auto`
- 左右两栏：`grid grid-cols-1 lg:grid-cols-2 gap-8`，移动端堆叠
- 四边留白：`px-6 md:px-12 lg:px-16 py-12`

### 4.2 讨论预览列表 (HomeDiscussionPreview)
- 面板：`rounded-2xl`，`bg-white/[0.03]` + `backdrop-blur-sm`
- **白色呼吸辉光边框**：`box-shadow: 0 0 20px rgba(255,255,255,0.06)` + `animate-pulse` 缓慢呼吸
- 顶部提示：「可以点击你感兴趣的话题直接进入哦」
- 列表项：话题标题 + PulseDot 状态指示器 + 消息数/专家数
- 每项 `py-4`，项间 `border-b border-white/[0.06]`
- 最大高度 `max-h-[70vh] overflow-y-auto`
- 只读（无置顶/删除操作），点击跳转 `/discussion/:id`
- 最多显示 10 条

### 4.3 右侧区域
- ExpandCard 悬浮扩散卡片：项目介绍文案
- CyberCard 3D 倾斜卡片：「发起新讨论」，点击跳转 `/discussions`
- HamsterLoader：右上角固定

### 4.4 StarfieldBackground 适配
- 主页专用色：渐变 `radial-gradient(ellipse at bottom, #1a1a1a 0%, #050505 100%)`
- 通过 `theme` prop 切换色板（主页 `"mono"` / 其他 `"blue"`）

---

## 5. 二级页面 — 演播厅 (`/discussions`)

### 5.1 三栏布局 (StudioLayout)

```
┌──────────────────────────────────────────────────────────┐
│  bg-bg-deep (#08081a)                                    │
│  ┌──────────┬──────────────────────┬──────────────────┐  │
│  │ 讨论列表  │     主舞台            │  专家状态         │  │
│  │ w:280-340│    flex-1            │  w:280-380       │  │
│  │ 无极调整  │    max-w:1300        │  无极调整         │  │
│  │          │                      │                  │  │
│  └──────────┴──────────────────────┴──────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

- 桌面端：三栏 Flex 布局，左右边栏无极调整宽度
- 移动端 (`< md`)：单栏 + Drawer 侧滑面板

### 5.2 讨论列表 (StudioDiscussionList)

**顶部模块：**
- 标题行加大
- StarButton 替换 `+` 按钮：星星飞散动效按钮

**列表项：**
- 脉冲圆点 PulseDot + 话题标题 + 状态标签 + 专家数/消息数
- **PulseDot 三态**（单一组件，`status` prop 控制）：
  - `"active"`：🟢 绿色 `#00e676` + 脉冲呼吸动效 `animate-pulse`
  - `"waiting"`：⚪ 白色 `#ffffff` + 脉冲呼吸动效
  - `"ended"`：⚫ 灰色 `#555555` + 静止无动效
- 间距 `py-5`，项间 `border-b border-border-glow/15`
- 悬停 `hover:bg-white/[0.02]`
- 最大宽度 `max-w-[340px]`
- 保留置顶/删除操作按钮

### 5.3 主舞台 (DiscussionRoom / MainStage)

**最大宽度** `max-w-[1300px] mx-auto`

**顶部状态指示器：**
- 复用 PulseDot 组件（与讨论列表同一组件、同一三态规范）

**讨论消息 (TranscriptView)：**
- 标题左对齐 `pl-4`
- 消息**不使用圆角卡片**，仅用 `border-t border-accent-cyan/10` 横线分隔
- 消息内部留白 `px-6 py-5`
- 消息间 `gap-0`（仅靠分隔线）

**共识面板 (ConsensusDivergencePanel)：**
- **支持用户拖拽调整高度**（拖拽手柄 or CSS `resize`）
- 进度条长度统一 `w-full`
- 每条共识间距 `py-3 gap-4`
- 共识标题 `text-base`，内容 `text-sm`
- 分歧标题 `text-base`（与共识相同），内容 `text-xs`（小 2 号）
- Tab 切换：共识青色 / 分歧品红

### 5.4 专家状态 (PanelistSidebar)

- 最大宽度 `max-w-[380px]`
- 状态指示灯保留
- 头像左侧添加 **BarLoader 音波条加载器**：
  - 发言中 `status === "speaking"`：音波条运行动效
  - 待机/准备 `status !== "speaking"`：静止
- 待机/发言中状态文字右对齐
- 专家卡片间距 `gap-5`，每项 `py-3`
- 内部留白充足，不过度紧凑

---

## 6. 三级页面 — 弹窗

### 6.1 统一视觉框架

三个弹窗（创建讨论、确认嘉宾、确认删除）共用：

| 元素 | 规格 |
|------|------|
| 遮罩 | `fixed inset-0 bg-black/70 backdrop-blur-sm` |
| 面板 | `glass-panel rounded-2xl w-[480px] max-w-[92vw]` |
| 入场 | `animate-fade-in-up` |
| 按钮 | **SlideButton 滑动渐变按钮**，左确认/右取消 |
| 加载 | OrbitLoader 小组件 |

### 6.2 创建讨论弹窗 (CreateDiscussionModal)

- 步骤 1「输入」：话题 textarea + 专家数量滑块 (2-8)
- 按钮：左「生成嘉宾阵容」(SlideButton 滑动渐变) / 右「取消」
- 加载中：OrbitLoader

### 6.3 确认嘉宾弹窗（步骤 2）

- 展示生成的嘉宾卡片（头像 + 姓名 + 角色 + 立场）
- 按钮：左「确认并开始」(SlideButton) / 右「返回修改」
- 主题色与创建弹窗一致，不突兀

### 6.4 确认删除弹窗

- 警告文案 + 讨论标题
- 按钮：左「确认删除」(SlideButton，红色调) / 右「取消」
- 与其他弹窗相同位置、相同视觉框架

---

## 7. 组件复用与变更清单

### 复用增强（不改功能，只增强视觉效果）
| 组件 | 文件 | 增强内容 |
|------|------|----------|
| StarfieldBackground | `components/background/main.tsx` | 增加 `theme` prop（mono/blue） |
| StarButton | `components/common/StarButton.tsx` | 确保星星飞散动效符合设计 |
| SlideButton | `components/common/SlideButton.tsx` | 增强渐变滑动效果，适配弹窗 |
| CyberCard | `components/common/CyberCard.tsx` | 适配主页黑白调 |
| ExpandCard | `components/common/ExpandCard.tsx` | 适配主页黑白调 |
| HamsterLoader | `components/common/HamsterLoader.tsx` | 无修改 |
| BarLoader | `components/common/BarLoader.tsx` | 确保 speak/standby 控制 |
| LoadingIndicator | `components/common/LoadingIndicator.tsx` | 无修改 |
| OrbitLoader | `components/common/OrbitLoader.tsx` | 无修改 |

### 新建组件
| 组件 | 文件 | 说明 |
|------|------|------|
| HomePage | `pages/HomePage.tsx` | 一级页面 |
| StudioLayout | `pages/StudioLayout.tsx` | 三栏演播厅布局页 |
| HomeDiscussionPreview | `components/discussion/HomeDiscussionPreview.tsx` | 主页讨论预览 |
| StudioDiscussionList | `components/discussion/StudioDiscussionList.tsx` | 演播厅完整讨论列表 |
| PulseDot | `components/common/PulseDot.tsx` | 脉冲圆点三态指示器 |

### 原地重新设计（不改功能逻辑）
| 组件 | 文件 | 变更 |
|------|------|------|
| AppLayout | `components/layout/AppLayout.tsx` | 精简，移除主页空状态逻辑 |
| App | `App.tsx` | 新增 3 条路由 |
| DiscussionRoom | `components/discussion/DiscussionRoom.tsx` | 重新设计主舞台 UI |
| TranscriptView | `components/transcript/TranscriptView.tsx` | 消息横线分隔，去卡片 |
| ConsensusDivergencePanel | `components/consensus/ConsensusDivergencePanel.tsx` | 拖拽调整高度，统一字号 |
| PanelistSidebar | `components/panelist/PanelistSidebar.tsx` | BarLoader 音波条，布局调整 |
| CreateDiscussionModal | `components/discussion/CreateDiscussionModal.tsx` | SlideButton，全新 UI |
| DiscussionList | `components/discussion/DiscussionList.tsx` | PulseDot，间距，StarButton |
| style.css | `style.css` | 扩展主题变量，新增动画 |

---

## 8. 功能不变承诺

- 所有 API 端点不修改
- Zustand store（`appStore` / `discussionStore`）不修改逻辑
- SSE 连接处理不修改
- TypeScript 类型定义不改
- 服务端代码零变动

---

## 9. 验证计划

1. **路由验证**：`/` → 主页，`/discussions` → 演播厅，`/discussion/:id` → 讨论室，直接访问 3 个 URL 均正常渲染
2. **功能回归**：创建讨论 → 生成嘉宾 → 确认 → 进入讨论室 → SSE 实时 Transcript → 共识/分歧更新，全流程可用
3. **响应式**：320px / 768px / 1024px / 1440px / 1920px 五档宽度下布局正确，无溢出、无挤压
4. **视觉检查**：主页黑白调、演播厅黑蓝调、脉冲圆点三态动效、音波条发言/静止、滑动渐变按钮、呼吸辉光边框
5. **三级弹窗**：创建/确认/删除弹窗统一框架，SlideButton 一致
6. **共识/分歧拖拽**：高度可拖动调整
