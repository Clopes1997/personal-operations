import { describe, it, expect } from "vitest";
import { formatDate, parseDate } from "./calendar";
import { calculateTimebank, calculateDuration, durationMinutes } from "./time";
import { emptySnapshot, completeTask, SnapshotSchema, generateOccurrences } from "./domain";
import { timelineEntries, moveTimelineEntry } from "./timeline";
import { buildScheduleFromWizardAnswers } from "../utils/scheduleWizard";
describe("calendar boundary", () => {
  it("parses only YYYY/MM/DD and keeps storage ISO", () => {
    expect(parseDate("2026/09/28")).toBe("2026-09-28");
    expect(formatDate("2026-09-28")).toBe("2026/09/28");
    expect(parseDate("2024/02/29")).toBe("2024-02-29");
    for (const value of ["2025/02/29", "2026/13/01", "2026/04/31", "28/09/2026", "2026-09-28", "1899/01/01", "2101/01/01"]) expect(() => parseDate(value)).toThrow();
  });
});
describe("Timebank", () => {
  it("accounts for surplus, debt and elapsed current work", () => {
    expect(calculateTimebank(["08:00","12:00","13:00",""],480,30,"15:00")).toMatchObject({ worked:360, remaining:90, exit:"16:30", complete:false });
    expect(calculateTimebank(["08:00","12:00","13:00",""],480,-30,"15:00")).toMatchObject({ remaining:150, exit:"17:30" });
    expect(calculateTimebank(["08:00","","",""],480,0,"09:00")).toMatchObject({ worked:60, remaining:420, exit:"16:00" });
  });
  it("reports completed work and clamps excess balance at zero remaining", () => {
    expect(calculateTimebank(["08:00","12:00","13:00","17:00"],480,-30,"18:00")).toMatchObject({ worked:480, remaining:30, balance:-30, complete:true });
    expect(calculateTimebank(["08:00","","",""],480,600,"09:00")).toMatchObject({ remaining:0, exit:"09:00" });
  });
  it("rejects reversed, overlapping, malformed and incomplete periods", () => {
    for (const times of [["12:00","08:00","",""],["08:00","12:00","11:00",""],["08:00","","13:00",""],["25:00","","",""],["08:00","12:00","","17:00"]]) expect(() => calculateTimebank(times,480,0,"14:00")).toThrow();
    expect(() => calculateTimebank(["08:00","","",""],480,0,"07:00")).toThrow();
    expect(() => calculateTimebank(["08:00","","",""],-1,0,"09:00")).toThrow();
  });
  it("makes next-day exits explicit", () => {
    expect(calculateTimebank(["20:00","","",""],480,0,"21:00").exit).toBe("04:00 (+1 day)");
  });
});
it("Time Calculator handles overnight work without Timebank state", () => {
  expect(calculateDuration("22:00","06:00",30)).toEqual({gross:480,pause:30,net:450});
  expect(calculateDuration("08:00","08:00",0).net).toBe(0);
  expect(() => calculateDuration("08:00","09:00",61)).toThrow();
  expect(() => calculateDuration("08:00","09:00",-1)).toThrow();
  expect(durationMinutes("-01:30")).toBe(-90);
  expect(durationMinutes("30")).toBe(30);
  expect(() => durationMinutes("1:99")).toThrow();
});
it("derives task timelines from existing records, without duplicates or drift", () => {
  let s = emptySnapshot();
  s.tasks.push({id:"same",title:"Task",date:"2026-09-28",completed:false,estimatedMinutes:30});
  s.plans.push({id:"same",title:"Plan",start:"2026-09-28",end:"2026-09-29"});
  expect(new Set(timelineEntries(s).map(e => e.id)).size).toBe(2);
  s.tasks[0].title="Renamed";
  let entry=timelineEntries(s).find(e=>e.kind==="task")!;
  expect(entry.title).toBe("Renamed");
  s=moveTimelineEntry(s,entry,1);
  expect(s.tasks[0].date).toBe("2026-09-29");
  expect(s.plans).toHaveLength(1);
  s=completeTask(s,"same");
  expect(timelineEntries(s).find(e=>e.kind==="task")?.completed).toBe(true);
  s.tasks[0].date="";
  expect(timelineEntries(s)).toHaveLength(1);
  s.tasks=[]; expect(timelineEntries(s)).toHaveLength(1);
});
it("scheduled occurrences appear once, including after regeneration", () => {
  let s=emptySnapshot();
  s.settings.schedule=buildScheduleFromWizardAnswers({wakeTime:"08:00",sleepTarget:"23:00",blocks:[{title:"Read",duration:"30",timeOfDay:"morning"}],priorityIds:[],weeklyEvents:[]});
  s=generateOccurrences(s,"2026-09-28"); s=generateOccurrences(s,"2026-09-28");
  expect(timelineEntries(s)).toHaveLength(1);
  s=moveTimelineEntry(s,timelineEntries(s)[0],1); s=generateOccurrences(s,"2026-09-28");
  expect(timelineEntries(s)).toHaveLength(1);
});
it("accepts old backup JSON with rewards but never executes reward actions", () => {
  const old=emptySnapshot(); old.settings.gamification=true;
  old.tasks.push({id:"t",title:"Task",date:"2026-09-28",completed:false,estimatedMinutes:10,reward:50});
  old.rewards.push({id:"r",coins:20,label:"Historical",date:"2026-09-27"});
  old.shop.push({id:"s",title:"Historical",cost:5,cooldownDays:0,lastDate:null});
  const restored=SnapshotSchema.parse(JSON.parse(JSON.stringify(old)));
  const completed=completeTask(restored,"t");
  expect(completed.rewards).toEqual(old.rewards); expect(completed.shop).toEqual(old.shop);
  expect(completed.tasks[0].completed).toBe(true);
});
