# AI Panel Studio 前端 UI 重写计划

## Context

基于 ui-ux-pro-max 2.7.0 设计系统，对 AI Panel Studio 前端进行全面视觉重写。保留所有现有功能（API 调用、SSE 协议、状态管理、路由），仅重写视觉层（CSS 主题、组件 JSX 结构、动画、布局细化）。

**设计方向：** AI-Native UI + Dark Mode (OLED) + 播客/音乐流媒体暗色主题
**核心风格：** 暗色演播厅，玻璃态面板，霓虹青/金色点缀，流式文本动画

## 不可修改的约束

- `types/index.ts` — 所有 TS 接口
- `stores/appStore.ts` — Zustand app store
- `stores/discussionStore.ts` — Zustand discussion store（SSE 连接逻辑）
- `App.tsx` — 路由定义
- `main.tsx` — 入口点
- 所有组件的 Props 接口
- LLM 分配的专家颜色（原始 hex 值直接渲染）
- 所有 API fetch 调用和 SSE EventSource 逻辑

## 设计 Token 映射

| 旧 Token | 新 Token | 新值 |
|----------|---------|------|
| `bg-deep` | `studio-void` + `studio-base` | `#020203` / `#0F0F23` |
| `bg-panel` | `surface-glass` | `rgba(27,27,48,0.6)` |
| `border-glow` | `border-glow` | `rgba(6,182,212,0.25)` |
| — | `border-subtle` | `rgba(255,255,255,0.08)` |
| `accent-cyan` | `accent-cyan` | `#06B6D4` |
| `accent-magenta` | `accent-warm` | `#F97316` |
| `text-primary` | `text-primary` | `#F8FAFC` |
| `text-dim` | `text-secondary` | `#94A3B8` |
| — | `text-muted` | `#64748B` |
| `status-green` | `accent-live` | `#22C55E` |
| `status-amber` | `accent-warm` | `#F97316` |
| `status-gray` | `status-standby` | `#6B7280` |
| — | `brand-indigo` | `#1E1B4B` |
| — | `brand-purple` | `#4338CA` |
| — | `accent-gold` | `#FBBF24` |

新增 `studio-elevated: #1B1B30`（卡片/面板底色）

## 实施顺序

### Phase 1: 基础（3 文件）
1. **`client/index.html`** — Inter 字体增加 weight 300 预加载
2. **`client/src/style.css`** — 完整重写：
   - `@theme` 块替换为新 token
   - 全局 reset 更新颜色、添加 font-smoothing
   - 滚动条样式精化
   - 动画重定义：`fadeInUp`(300ms bezier)、`pulseLive`(1.5s ring pulse)、`shimmer`(2.5s)、新增 `streamReveal`、`staggerItem`、`glowPulse`
   - 工具类：更新 `.glass-panel`(blur-16px)、新增 `.glass-panel-accent`(带 glow)、`.text-gradient-cyan`、`.text-gradient-gold`、`.focus-ring`、`.skeleton`、更新 `.dot-grid`
   - 末尾追加 `prefers-reduced-motion` 媒体查询
3. **`client/src/components/layout/Icons.tsx`** — SVG 图标精化，新增 `SparkleIcon`、`LiveIcon`，所有图标加 `aria-hidden="true"`

### Phase 2: 共享组件（2 文件）
4. **`client/src/components/layout/Skeleton.tsx`** — 新文件：`SkeletonLine`、`SkeletonCard`、`SkeletonAvatar`
5. **`client/src/components/layout/Drawer.tsx`** — 遮罩/面板颜色更新，Escape 关闭，`role="dialog"`/`aria-modal`/`aria-label`

### Phase 3: 讨论组件（2 文件）
6. **`client/src/components/discussion/DiscussionList.tsx`** — 卡片颜色/状态更新，状态点用纯色 div 替代 Unicode `●○◎`，骨架屏加载态，交错入场动画，`focus-ring`+`tabIndex`
7. **`client/src/components/discussion/CreateDiscussionModal.tsx`** — 遮罩/面板颜色更新，Escape 关闭，`role="dialog"`/`aria-modal`/焦点陷阱，textarea/range 样式更新，步骤 2 卡片样式更新，错误态颜色切换为 warm

### Phase 4: 房间核心（2 文件）
8. **`client/src/components/discussion/DiscussionRoom.tsx`** — 头部栏用 `glass-panel-accent`，LiveIcon 替换裸 span，骨架屏加载态，`aria-live="polite"`
9. **`client/src/components/transcript/TranscriptView.tsx`** — MessageBubble 类型专属徽章颜色(opening=live绿/rebuttal=warm橙/supplement=cyan青/closing=gold金)、每条新消息 `fadeInUp` 入场、系统总结消息特殊金色左边框、`aria-label` 头像、空态优化

### Phase 5: 侧边面板（2 文件）
10. **`client/src/components/consensus/ConsensusDivergencePanel.tsx`** — Tab 栏 pill 指示器(consensus=live绿/divergence=warm橙)、`role="tablist"`+键盘导航、卡片颜色更新、SVG 图标替代 emoji/unicode、进度条微光动画、交错入场
11. **`client/src/components/panelist/PanelistSidebar.tsx`** — 状态环颜色映射(speaking=live绿/preparing=warm橙/standby=灰)、活动卡片边框/背景更新、主持人"主持"徽章用 brand-purple、`tabIndex`+`aria-label`、交错入场

### Phase 6: 布局外壳（2 文件）
12. **`client/src/components/layout/StudioBackground.tsx`** — 新文件：装饰性径向渐变动画背景（纯装饰，无 props/state）
13. **`client/src/components/layout/AppLayout.tsx`** — 根容器颜色更新、侧边栏边框+glass 更新、首页 hero：`SparkleIcon` 替换 emoji `🎙️`、`text-gradient-cyan` 标题、三个浮动装饰点、CTA 按钮 glow、移动端底栏颜色更新

### Phase 7: 验证
14. TypeScript 编译：`tsc --noEmit`
15. 构建：`pnpm run build`
16. 视觉冒烟测试：首页、讨论室、创建模态框、移动端
17. 响应式检查：1920/1280/768/375px
18. Lighthouse 无障碍审计

## 动画规格

| 元素 | 触发时机 | 时长 | 缓动 |
|------|---------|------|------|
| 新消息气泡 | SSE transcript_message | 300ms | cubic-bezier(0.16,1,0.3,1) |
| 专家状态变化 | SSE panelist_status | 200ms | ease-out |
| 共识/分歧卡片 | SSE consensus/divergence | 300ms + 40ms 交错 | cubic-bezier(0.16,1,0.3,1) |
| Live 指示灯 | 持续(live 状态) | 1500ms infinite | ease-in-out |
| 讨论列表卡片 | 页面加载 | 300ms + 50ms 交错 | cubic-bezier(0.16,1,0.3,1) |
| Drawer 开/关 | 移动端切换 | 250ms/200ms | bezier in/out |
| Modal 开/关 | 创建讨论 | 300ms/200ms | bezier/ease-in |
| Skeleton shimmer | 加载中 | 2500ms infinite | ease-in-out |
| Hover 状态 | 鼠标进入 | 150ms | ease-out |

## 可访问性

- `.focus-ring` 工具类用于所有交互元素
- 可选卡片添加 `tabIndex={0}` + Enter/Space 键盘处理
- Tab 面板：`role="tablist"` + 键盘方向键
- Drawer/Modal：`role="dialog"` + `aria-modal` + Escape 关闭 + 焦点陷阱
- 直播区域：`aria-live="polite"`
- 图标按钮：`aria-label`
- `prefers-reduced-motion` 禁用所有动画
- 对比度：主文本 15.5:1 (AAA)、次要文本 5.8:1 (AA)

## 验证方法

1. `pnpm run build` 零错误通过
2. 启动 dev server，手动验证：首页 → 创建讨论 → 讨论室 → SSE 实时消息流 → 共识/分歧更新 → 移动端 drawer
3. 各断点截图对比（1920/1280/768/375）
4. Lighthouse accessibility score ≥ 95
5. 键盘 Tab 遍历所有交互元素
6. 开启系统 reduced-motion 验证动画停用
