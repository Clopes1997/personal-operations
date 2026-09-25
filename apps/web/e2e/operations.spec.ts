import { test, expect } from "@playwright/test";
test("tasks persist, rewards remain optional, and a clean profile restores a backup", async ({
  page,
  browser,
}, info) => {
  await page.goto("/");
  await page.getByLabel("Task title").fill("Persistent task");
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await page.getByLabel("Persistent task (30 min)").click();
  await expect(page.getByLabel("Persistent task (30 min)")).toBeChecked();
  await page.reload();
  await expect(page.getByLabel("Persistent task (30 min)")).toBeChecked();
  await page.getByRole("button", { name: "Rewards", exact: true }).click();
  await expect(page.getByText(/Wallet: 0 coins/)).toBeVisible();
  await page.getByRole("button", { name: "Backups", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export all data" }).click();
  const file = info.outputPath("backup.json");
  await (await download).saveAs(file);
  const clean = await browser.newContext();
  const restored = await clean.newPage();
  await restored.goto("http://127.0.0.1:4174/");
  await restored.getByRole("button", { name: "Backups", exact: true }).click();
  await restored.getByLabel("Restore backup file").setInputFiles(file);
  await restored
    .getByLabel("I exported current data and intend to replace it.")
    .check();
  await restored
    .getByRole("button", { name: "Restore reviewed backup" })
    .click();
  await restored.getByRole("button", { name: "Tasks", exact: true }).click();
  await expect(restored.getByLabel("Persistent task (30 min)")).toBeChecked();
  await clean.close();
});
test("time balance, timeline and budget operate independently", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Time balance", exact: true }).click();
  for (const [label, value] of [
    ["First arrival", "08:00"],
    ["First exit", "12:00"],
    ["Second arrival", "13:00"],
    ["Second exit", "17:00"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel("Opening balance (signed minutes)").fill("-30");
  await page
    .getByRole("button", { name: "Calculate / save completed day" })
    .click();
  await expect(page.getByRole("status")).toContainText("balance -30 min");
  await page.getByRole("button", { name: "Timeline", exact: true }).click();
  await page.getByLabel("Plan title").fill("Delivery plan");
  await page.getByLabel("Start", { exact: true }).fill("2026-03-08");
  await page.getByLabel("End", { exact: true }).fill("2026-03-09");
  await page.getByRole("button", { name: "Add plan" }).click();
  await page
    .getByRole("button", { name: "Move Delivery plan forward one day" })
    .click();
  await expect(
    page.getByText("Delivery plan: 2026-03-09 — 2026-03-10"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Budget", exact: true }).click();
  await page.getByLabel("Expense template").fill("Transport");
  await page.getByLabel("Default amount").fill("10.00");
  await page.getByRole("button", { name: "Add template" }).click();
  await page.getByLabel("Currency code").fill("BRL");
  await page.getByLabel("Salary", { exact: true }).fill("100.00");
  await page.getByRole("button", { name: "Preview month" }).click();
  await expect(page.getByRole("status")).toContainText("free 40.00 BRL");
  await page.getByRole("button", { name: "Save reviewed month" }).click();
  await expect(
    page.getByRole("button", { name: "Save reviewed month" }),
  ).toBeHidden();
  await page.reload();
  await page.getByRole("button", { name: "Budget", exact: true }).click();
  await expect(page.getByText(/free 40.00 BRL/)).toBeVisible();
  await page.getByRole("button", { name: /^\d{4}-\d{2}$/ }).click();
  await page.getByText("Edit saved month", { exact: true }).click();
  await page.getByLabel("Revised salary", { exact: true }).fill("200.00");
  await page
    .getByLabel("Replace this month's saved values with these inputs")
    .check();
  await page.getByRole("button", { name: "Save revised month" }).click();
  await expect(page.getByText(/Income 200.00/)).toBeVisible();
  await expect(page.getByText(/free 90.00 BRL/).first()).toBeVisible();
});
