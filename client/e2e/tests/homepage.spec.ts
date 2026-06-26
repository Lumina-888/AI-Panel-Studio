import { test, expect } from '@playwright/test'

test.describe('首页 (HomePage)', () => {
  test('加载首页并显示核心元素', async ({ page }) => {
    await page.goto('/')

    // 验证页面标题
    await expect(page.locator('text=AI Panel Studio')).toBeVisible({ timeout: 10000 })

    // 验证 "发起新讨论" CTA 存在
    await expect(page.locator('text=发起新讨论').first()).toBeVisible()
  })

  test('"发起新讨论" 按钮导航到 /discussions', async ({ page }) => {
    await page.goto('/')

    // 点击 CyberCard 中的按钮
    await page.locator('text=发起新讨论').first().click()

    // 验证导航到讨论页
    await expect(page).toHaveURL(/\/discussions$/, { timeout: 10000 })

    // 验证讨论列表已渲染
    await expect(page.locator('text=讨论列表')).toBeVisible()
  })

  test('首页加载讨论预览数据', async ({ page }) => {
    await page.goto('/')

    // 等待 API 响应
    await page.waitForResponse(
      resp => resp.url().includes('/api/discussions') && resp.status() === 200,
      { timeout: 10000 }
    )

    // 验证讨论预览区域显示了讨论话题（来自 mock 数据）
    await expect(page.getByText(/AI.*创造力|远程办公|自动驾驶|教育|碳中和/).first()).toBeVisible({ timeout: 5000 })
  })
})
