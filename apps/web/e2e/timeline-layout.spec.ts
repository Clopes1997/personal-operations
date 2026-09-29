import { test, expect } from '@playwright/test';

test('short plans remain usable across a long calendar and movement persists', async ({ page }, info) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Timeline', exact: true }).click();
  for (const [title, start, end] of [['Long project', '2026/01/01', '2026/12/31'], ['One day', '2026/01/02', '2026/01/02']]) {
    await page.getByLabel('Plan title').fill(title);
    await page.getByLabel('Start', { exact: true }).fill(start);
    await page.getByLabel('End', { exact: true }).fill(end);
    await page.getByRole('button', { name: 'Add plan', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Delete ' + title })).toBeVisible();
  }
  const bar = page.locator('.ops-bar').filter({ has: page.getByRole('button', { name: 'One day', exact: true }) });
  await expect(bar).toHaveCSS('width', '152px');
  await page.getByRole('button', { name: 'Move One day forward one day' }).click();
  await expect(page.getByText('One day: 2026/01/03 — 2026/01/03')).toBeVisible();
  await expect(page.locator('[draggable="true"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Move One day forward one day' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('One day: 2026/01/04 — 2026/01/04')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Timeline', exact: true }).click();
  await expect(page.getByText('One day: 2026/01/04 — 2026/01/04')).toBeVisible();
  await page.screenshot({ path: info.outputPath('timeline-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Timeline', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('timeline-mobile.png'), fullPage: true });
});
