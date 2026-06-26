import { test, expect } from '@playwright/test'

test.describe('创建讨论 (CreateDiscussionModal)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/discussions')
    // 等待列表加载
    await page.waitForResponse(
      resp => resp.url().includes('/api/discussions') && resp.status() === 200,
      { timeout: 10000 }
    )
    // 打开创建弹窗
    await page.locator('text=新讨论').first().click()
    await expect(page.locator('h3:has-text("发起新讨论")')).toBeVisible({ timeout: 5000 })
  })

  test('步骤 1：输入界面渲染正确', async ({ page }) => {
    // 验证输入框
    await expect(page.locator('textarea[placeholder="输入你想要讨论的话题..."]')).toBeVisible()

    // 验证专家人数滑块
    const slider = page.locator('input[type="range"]')
    await expect(slider).toBeVisible()
    await expect(slider).toHaveValue('4')

    // 验证按钮存在
    await expect(page.locator('button:has-text("取消")')).toBeVisible()
    await expect(page.locator('button:has-text("生成嘉宾阵容")')).toBeVisible()
  })

  test('步骤 1：空话题时按钮禁用', async ({ page }) => {
    const generateBtn = page.locator('button:has-text("生成嘉宾阵容")')
    await expect(generateBtn).toBeDisabled()
  })

  test('步骤 1：输入话题后按钮可用', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder="输入你想要讨论的话题..."]')
    await textarea.fill('AI 安全与伦理')

    const generateBtn = page.locator('button:has-text("生成嘉宾阵容")')
    await expect(generateBtn).toBeEnabled()
  })

  test('步骤 1：调整专家人数滑块', async ({ page }) => {
    const slider = page.locator('input[type="range"]')
    await slider.fill('6')

    // 验证显示的数字更新
    await expect(page.locator('text=6 人')).toBeVisible()
  })

  test('步骤 1 → 步骤 2：生成嘉宾阵容', async ({ page }) => {
    // 输入话题
    await page.locator('textarea[placeholder="输入你想要讨论的话题..."]').fill('AI 安全与伦理')

    // 点击生成
    await page.locator('button:has-text("生成嘉宾阵容")').click()

    // 等待进入步骤 2
    await expect(page.locator('h3:has-text("确认嘉宾阵容")')).toBeVisible({ timeout: 10000 })

    // 验证嘉宾列表渲染
    // 应该至少有一个主持人和多个专家
    await expect(page.getByText('主持人').first()).toBeVisible()
    await expect(page.getByText('专家').first()).toBeVisible()

    // 验证嘉宾信息存在（名字、头衔、立场）
    await expect(page.getByText('陈思明')).toBeVisible()
  })

  test('步骤 2 → 步骤 1：返回修改', async ({ page }) => {
    // 先进入步骤 2
    await page.locator('textarea[placeholder="输入你想要讨论的话题..."]').fill('AI 安全')
    await page.locator('button:has-text("生成嘉宾阵容")').click()
    await expect(page.locator('h3:has-text("确认嘉宾阵容")')).toBeVisible({ timeout: 10000 })

    // 点击返回修改
    await page.locator('button:has-text("返回修改")').click()

    // 回到步骤 1
    await expect(page.locator('h3:has-text("发起新讨论")')).toBeVisible()

    // 验证话题内容保留
    await expect(page.locator('textarea[placeholder="输入你想要讨论的话题..."]')).toHaveValue('AI 安全')
  })

  test('步骤 2：确认并开始讨论', async ({ page }) => {
    // 进入步骤 2
    await page.locator('textarea[placeholder="输入你想要讨论的话题..."]').fill('AI 安全的未来')
    await page.locator('button:has-text("生成嘉宾阵容")').click()
    await expect(page.locator('h3:has-text("确认嘉宾阵容")')).toBeVisible({ timeout: 10000 })

    // 点击确认
    await page.locator('button:has-text("确认，开始讨论")').click()

    // 验证导航到讨论室
    await expect(page).toHaveURL(/\/discussions\/d-new-/, { timeout: 10000 })
  })

  test('点击取消关闭弹窗', async ({ page }) => {
    await page.locator('button:has-text("取消")').click()
    // 弹窗应消失
    await expect(page.locator('h3:has-text("发起新讨论")')).not.toBeVisible({ timeout: 3000 })
  })

  test('点击 X 按钮关闭弹窗', async ({ page }) => {
    // 弹窗标题栏中的 X 关闭按钮（包含 CloseIcon SVG，紧邻 h3）
    const closeBtn = page.locator('h3:has-text("发起新讨论") + button')
    await closeBtn.click()
    await expect(page.locator('h3:has-text("发起新讨论")')).not.toBeVisible({ timeout: 3000 })
  })
})
