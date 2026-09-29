import { describe, expect, it } from "vitest";
import {
  assignLanes,
  budgetCalculation,
  completeTask,
  dayNumber,
  emptySnapshot,
  generateOccurrences,
  money,
  shiftDate,
  suggestedExit,
  workBalance,
} from "./domain";
import { buildScheduleFromWizardAnswers } from "../utils/scheduleWizard";
describe("calendar, budget and time rules", () => {
  it("uses inclusive calendar dates across DST and rejects impossible dates", () => {
    expect(dayNumber("2026-03-09") - dayNumber("2026-03-07")).toBe(2);
    expect(shiftDate("2024-02-28", 1)).toBe("2024-02-29");
    expect(() => dayNumber("2025-02-29")).toThrow();
    expect(
      assignLanes([
        { id: "a", title: "A", start: "2026-03-08", end: "2026-03-09" },
        { id: "b", title: "B", start: "2026-03-09", end: "2026-03-10" },
      ]),
    ).toHaveLength(2);
  });
  it("uses exact minor units and one rounded contribution calculation", () => {
    expect(money("12.34")).toBe(1234);
    expect(() => money("1.001")).toThrow();
    expect(() => money("NaN")).toThrow();
    expect(budgetCalculation(10000, 0, 3333, [1000])).toEqual({
      contribution: 3333,
      free: 5667,
    });
    expect(budgetCalculation(1, 0, 5000, [])).toEqual({
      contribution: 1,
      free: 0,
    });
    expect(() => budgetCalculation(100, 0, 10001, [])).toThrow();
    expect(() => budgetCalculation(100, 0, 5000, [51])).toThrow();
  });
  it("retains two-period balances and rejects reversal, overlap and overnight", () => {
    expect(
      workBalance(
        [
          ["08:00", "12:00"],
          ["13:00", "17:00"],
        ],
        480,
        -30,
      ),
    ).toEqual({ worked: 480, daily: 0, balance: -30 });
    expect(suggestedExit(["08:00", "12:00"], "13:00", 480, 30)).toBe("16:30");
    expect(() => workBalance([["22:00", "06:00"]])).toThrow();
    expect(() =>
      workBalance([
        ["08:00", "12:00"],
        ["11:30", "17:00"],
      ]),
    ).toThrow();
    expect(() => workBalance([["8:00", "12:00"]])).toThrow();
  });
});
describe("task occurrences", () => {
  it("works with rewards disabled and never retroactively awards a completed task", () => {
    let state = emptySnapshot();
    state.tasks.push({
      id: "1",
      title: "Work",
      date: "2026-09-24",
      completed: false,
      reward: 10,
      estimatedMinutes: 30,
    });
    state = completeTask(state, "1");
    expect(state.rewards).toHaveLength(0);
    state.settings.gamification = true;
    expect(completeTask(state, "1").rewards).toHaveLength(0);
  });
  it("generates stable IDs without resetting completion", () => {
    const state = emptySnapshot();
    state.settings.schedule = buildScheduleFromWizardAnswers({
      wakeTime: "08:00",
      sleepTarget: "23:00",
      blocks: [
        {
          title: "Read",
          duration: "30",
          timeOfDay: "flexible",
          repeatable: true,
          category: "Skills",
        },
      ],
      priorityIds: [],
      weeklyEvents: [],
    });
    const generated = generateOccurrences(state, "2026-09-24");
    expect(generated.tasks[0].estimatedMinutes).toBe(30);
    generated.tasks[0].completed = true;
    expect(generateOccurrences(generated, "2026-09-24").tasks).toEqual(
      generated.tasks,
    );
    expect(generateOccurrences(generated, "2026-09-25").tasks).toHaveLength(2);
  });
});
