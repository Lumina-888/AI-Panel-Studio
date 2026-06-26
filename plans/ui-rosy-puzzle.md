# 集成 LoadingIndicator 动效组件

## Context

用户提供一个圆点脉冲动效组件（原版用 styled-components），用于主舞台"讨论进行中"状态指示。项目使用 Tailwind v4 + 全局 CSS keyframes，需要改写适配。

## 实施步骤

### 1. 新增全局动画 keyframes → `client/src/style.css`

在现有 `@keyframes` 区域末尾添加三个动画：

- `dotPulse` — 圆点缩放（1 → 0 → 1）
- `circlePulse` — 圆环呼吸（scale 1 → 1.5, opacity 1 → 0.5 → 1）
- `outlineRipple` — 外圈扩散（scale 0 → 1, outline 收缩至消失）

### 2. 新建组件 → `client/src/components/common/LoadingIndicator.tsx`

- **命名导出**：`export function LoadingIndicator`
- **Props**：`visible?: boolean`（默认 true）、`className?: string`
- **颜色**：使用设计 token `accent-cyan`（#00e5ff），匹配演播厅科技主题
- **结构**：4 个 `.circle` div，每个内含 `.dot` 和 `.outline`，交错 `animation-delay`
- **样式**：Tailwind 工具类负责布局/尺寸，CSS 动画类负责动效
- 不显示时返回 `null`

### 3. 可选：创建桶导出 `client/src/components/common/index.ts`

方便后续引用：`import { LoadingIndicator } from '../common'`

## 涉及文件

| 文件 | 操作 |
|---|---|
| `client/src/style.css` | 新增 3 个 @keyframes + 3 个工具类 |
| `client/src/components/common/LoadingIndicator.tsx` | 新建 |

## 验证

1. 在 `DiscussionRoom.tsx` 中临时引入，设 `visible={true}` 确认动画播放正常
2. 颜色与演播厅主题协调（青色圆点，不刺眼）
3. 组件在页面卸载时无残留动画
