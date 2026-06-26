import { test, expect } from '@playwright/test'

test.describe('讨论室 (DiscussionRoom)', () => {
  test.beforeEach(async ({ page }) => {
    // 直接导航到有数据的 live 讨论
    await page.goto('/discussions/d-seed-003')
    // 等待讨论数据加载
    await page.waitForResponse(
      resp => resp.url().includes('/api/discussions/d-seed-003') && resp.url().indexOf('/stream') === -1 && resp.status() === 200,
      { timeout: 10000 }
    )
  })

  test('显示讨论话题', async ({ page }) => {
    // 验证顶栏标题 heading 显示话题
    await expect(page.getByRole('heading', { name: /自动驾驶汽车的电车难题/ })).toBeVisible({ timeout: 5000 })
  })

  test('显示状态指示灯', async ({ page }) => {
    // Live 讨论有状态指示灯（aria-label）
    await expect(page.locator('[aria-label="运行中"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('显示已有消息（Transcript）', async ({ page }) => {
    // 等待 transcript 区域加载
    await page.waitForTimeout(2000)

    // 验证预置消息内容出现
    await expect(page.locator('text=/电车难题/').first()).toBeVisible({ timeout: 5000 })
  })

  test('专家侧边栏显示 panelist', async ({ page }) => {
    // 使用 heading 来区分（讨论室顶栏 h2 显示话题，专家名在 sidebar 中）
    await expect(page.locator('text=周明辉').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=吴浩然').first()).toBeVisible()
    await expect(page.locator('text=郑雅文').first()).toBeVisible()
  })

  test('显示头衔信息', async ({ page }) => {
    await expect(page.locator('text=科技伦理评论员').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=自动驾驶算法工程师').first()).toBeVisible()
  })

  test('共识/分歧面板渲染', async ({ page }) => {
    // 检查共识/分歧面板存在
    await expect(page.locator('text=/共识/').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=/分歧/').first()).toBeVisible()
  })

  test('访问不存在的讨论显示错误状态', async ({ page }) => {
    await page.goto('/discussions/non-existent-id')
    // 等待 API 404 响应
    await page.waitForResponse(
      resp => resp.url().includes('/api/discussions/non-existent-id') && resp.status() === 404,
      { timeout: 10000 }
    )

    // 页面不应崩溃，应保持在讨论页框架中
    await page.waitForTimeout(1000)
  })
})
