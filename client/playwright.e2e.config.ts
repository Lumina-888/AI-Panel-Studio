import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'e2e/playwright-report' }], ['list']],
  timeout: 30000,
  expect: { timeout: 10000 },

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],

  webServer: [
    {
      // Mock API Server (替代真实后端，端口 3001)
      command: 'npx tsx e2e/mock-server/server.ts',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 15000,
    },
    {
      // Vite Dev Server (前端，端口 5173)
      command: process.env.CI ? 'pnpm preview --port 5173' : 'pnpm dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
})
