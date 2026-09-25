import {test, expect} from "@playwright/test";
import {readFile} from "node:fs/promises";
const collections = ["tasks","plans","workdays","budgets","templates","rewards","shop","archives"];
test("retirement acceptance: saved export, destructive change, restore and Legacy History", async ({page, context}, info) => {
  const fixture = JSON.parse(await readFile(process.env.PERSONAL_REHEARSAL_SNAPSHOT ?? "../../tools/migration/fixtures/personal-source.json","utf8"));
  const restore = async (data: string) => {
    await page.getByRole("button",{name:"Backups",exact:true}).click();
    await page.getByLabel("Restore backup file").setInputFiles({name:"snapshot.json",mimeType:"application/json",buffer:Buffer.from(data)});
    await page.getByLabel("I exported current data and intend to replace it.").check();
    await page.getByRole("button",{name:"Restore reviewed backup"}).click();
    await expect(page.getByRole("button",{name:"Restore reviewed backup"})).toBeHidden();
  };
  const exportFile = async (name: string) => {
    const waiting = page.waitForEvent("download");
    await page.getByRole("button",{name:"Export all data",exact:true}).click();
    const path=info.outputPath(name); await (await waiting).saveAs(path); return path;
  };
  await page.goto("/");
  await restore(JSON.stringify(fixture));
  const originalFile=await exportFile("original.json");
  const original=JSON.parse(await readFile(originalFile,"utf8"));
  await page.getByLabel("Verify saved backup file").setInputFiles(originalFile);
  await expect(page.getByRole("complementary",{name:"Backup health",exact:true})).toContainText("Backed up — saved file verified");
  await page.getByLabel("Enable optional backup reminders").check();
  const empty={...fixture,...Object.fromEntries(collections.map(name=>[name,[]]))};
  await restore(JSON.stringify(empty));
  await expect(page.getByRole("complementary",{name:"Backup health",exact:true})).toContainText("Changed since backup");
  await page.getByRole("button",{name:"Dismiss reminder for one day"}).click();
  await restore(JSON.stringify(original));
  await page.reload();
  await page.getByRole("button",{name:"Backups",exact:true}).click();
  const reconstructed=JSON.parse(await readFile(await exportFile("restored.json"),"utf8"));
  const ordered = (data: typeof fixture) => ({...data,revision:0,...Object.fromEntries(collections.map(name=>[name,[...data[name]].sort((a,b)=>a.id.localeCompare(b.id))]))});
  expect(ordered(reconstructed)).toEqual(ordered(original));
  expect(reconstructed.revision).toBe(original.revision+2);
  await page.getByRole("button",{name:"Legacy History",exact:true}).click();
  for (const archive of fixture.archives)
    await expect(page.getByRole("heading",{name:archive.id,exact:true})).toBeVisible();
  if (!process.env.PERSONAL_REHEARSAL_SNAPSHOT) {
    await page.getByText("rewardHistory",{exact:true}).click();
    await expect(page.getByText(/Incomplete historical reward/).first()).toBeVisible();
  }
  await expect(page.getByText(/do not change current tasks/)).toBeVisible();
  for (const module of ["Tasks","Timeline","Time balance","Budget","Rewards"]) {
    await page.getByRole("button",{name:module,exact:true}).click();
    await expect(page.getByRole("alert")).toHaveCount(0);
  }
  // Two real pages share IndexedDB; the stale page cannot overwrite the winner.
  const stale=await context.newPage(); await stale.goto("/");
  await expect(stale.locator("footer")).toContainText("Saved revision "+reconstructed.revision);
  await page.getByRole("button",{name:"Tasks",exact:true}).click();
  await page.getByLabel("Task title",{exact:true}).fill("Winning tab task");
  await page.getByRole("button",{name:"Add task",exact:true}).click();
  await expect(page.locator("footer")).toContainText("Saved revision "+(reconstructed.revision+1));
  await stale.getByLabel("Task title",{exact:true}).fill("Stale task");
  await stale.getByRole("button",{name:"Add task",exact:true}).click();
  await expect(stale.getByRole("alert")).toContainText("Another tab");
  await stale.close();
  await page.getByRole("button",{name:"Backups",exact:true}).click();
  for (const data of ["{",JSON.stringify({...fixture,version:99})]) {
    await page.getByLabel("Restore backup file").setInputFiles({name:"invalid.json",mimeType:"application/json",buffer:Buffer.from(data)});
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("button",{name:"Restore reviewed backup"})).toBeHidden();
  }
});
