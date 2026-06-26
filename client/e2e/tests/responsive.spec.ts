import { test, expect } from '@playwright/test'

test.describe('响应式布局 (Responsive)', () => {
  test.describe('桌面端', () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test('讨论页显示三栏布局', async ({ page }) => {
      await page.goto('/discussions')

      // 等待数据加载
      await page.waitForResponse(
        resp => resp.url().includes('/api/discussions') && resp.status() === 200,
        { timeout: 10000 }
      )

      // 验证讨论列表存在
      await expect(page.locator('text=讨论列表')).toBeVisible()

      // 验证 "新讨论" 按钮存在
      await expect(page.locator('text=新讨论').first()).toBeVisible()

      // 中间区域显示占位内容
      await expect(page.getByText(/选择一个讨论|发起/).first()).toBeVisible({ timeout: 3000 })
    })

    test('选择讨论后三栏布局完整显示', async ({ page }) => {
      await page.goto('/discussions/d-seed-003')

      await page.waitForResponse(
        resp => resp.url().includes('/api/discussions/d-seed-003') && resp.url().indexOf('/stream') === -1 && resp.status() === 200,
        { timeout: 10000 }
      )

      // 左侧讨论列表
      await expect(page.locator('text=讨论列表')).toBeVisible()

      // 中间 transcript - 使用 heading 避免 strict mode
      await expect(page.getByRole('heading', { name: /自动驾驶汽车的电车难题/ })).toBeVisible({ timeout: 5000 })

      // 右侧专家面板
      await expect(page.locator('text=周明辉').first()).toBeVisible()
    })
  })
})
