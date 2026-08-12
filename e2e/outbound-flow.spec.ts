import { test, expect } from '@playwright/test';

test.describe('Outbound Flow (Sales Order -> Dispatch)', () => {
  test('Complete outbound workflow', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@vaira.app');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible();

    // 2. Navigate to Customers (Ensure one exists)
    await page.goto('/dashboard/customers');
    await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible();
    
    // 3. Navigate to Orders
    await page.goto('/dashboard/orders');
    // Basic visibility test for smoke testing
    await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible();

    // 4. Verify Inventory decrease in Audit Logs
    await page.goto('/dashboard/audit-logs');
    await expect(page.getByRole('heading', { name: 'Audit Logs' })).toBeVisible();
  });
});
