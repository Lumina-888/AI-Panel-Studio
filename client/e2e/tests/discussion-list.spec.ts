import { test, expect } from '@playwright/test'

test.describe('讨论列表 (DiscussionList)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/discussions')
    // 等待讨论列表加载
    await page.waitForResponse(
      resp => resp.url().includes('/api/discussions') && resp.status() === 200,
      { timeout: 10000 }
    )
  })

  test('页面标题为讨论列表', async ({ page }) => {
    await expect(page.locator('text=讨论列表')).toBeVisible()
  })

  test('显示所有种子讨论', async ({ page }) => {
    // 验证 5 个预置讨论话题存在
    await expect(page.getByText('AI 是否会取代人类创造力？')).toBeVisible()
    await expect(page.getByText('远程办公是否会成为未来主流工作方式？')).toBeVisible()
    await expect(page.getByText('自动驾驶汽车的电车难题')).toBeVisible()
    await expect(page.getByText('AI 教育工具会缩小还是扩大教育不公平？')).toBeVisible()
    await expect(page.getByText('碳中和目标下')).toBeVisible()
  })

  test('显示状态标记', async ({ page }) => {
    // 运行中的讨论有 "运行中" 标记（PulseDot aria-label）
    await expect(page.locator('[aria-label="运行中"]').first()).toBeVisible()

    // 等待中的讨论有 "等待中" 标记
    await expect(page.locator('[aria-label="等待中"]').first()).toBeVisible()
  })

  test('"新讨论" 按钮打开创建弹窗', async ({ page }) => {
    await page.locator('text=新讨论').first().click()

    // 验证创建弹窗出现
    await expect(page.locator('text=发起新讨论').first()).toBeVisible({ timeout: 5000 })
  })

  test('点击讨论导航到讨论室', async ({ page }) => {
    // 点击第一个讨论
    await page.getByText('AI 是否会取代人类创造力？').first().click()

    // 验证导航到讨论详情页
    await expect(page).toHaveURL(/\/discussions\/d-seed-001/, { timeout: 10000 })
  })

  test('删除讨论 - 确认流程', async ({ page }) => {
    // 先找一个讨论条目悬停以显示删除按钮
    const firstItem = page.getByText('AI 是否会取代人类创造力？').first()
    await firstItem.hover()

    // 查找 close/delete 图标按钮（在讨论条目右上角）
    // DeleteIcon 是一个 SVG close 图标
    const deleteButtons = page.locator('button:has(svg)').filter({ hasText: '' })
    // 更可靠的方法：查找讨论条目区域内的关闭图标按钮
    const discussionEntry = page.locator('div').filter({ hasText: 'AI 是否会取代人类创造力？' }).first()
    const deleteBtn = discussionEntry.locator('button').last()

    if (await deleteBtn.isVisible()) {
      await deleteBtn.click()

      // 验证确认对话框出现
      await expect(page.getByText(/删除|确认/)).toBeVisible({ timeout: 3000 })

      // 点击确认删除
      const confirmBtn = page.locator('button').filter({ hasText: /删除|确认/ }).first()
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click()
        // 等待列表刷新
        await page.waitForTimeout(1000)
      }
    }
  })
})
