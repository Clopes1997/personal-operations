# Personal operations

A browser-local workspace for tasks and schedules, timeline plans, Timebank, a time calculator and monthly budgets.

## Development

Requires Node.js 22.13+ and npm. From the project root:

```powershell
npm run web:install
npm run web:dev
```

Open the URL printed by Vite. No server account or database credentials are required.

## Workflows

- Tasks: create, edit, complete and generate dated tasks using the schedule wizard.
- Timeline: view dated tasks directly alongside inclusive date-range plans; move either with arrow buttons. Undated tasks remain in Tasks. Task edits, completion and deletion appear immediately without duplicate records.
- Timebank: calculate remaining work today from one or two intervals, a signed opening balance, daily target and as-of time; save completed workdays.
- Time Calculator: calculate elapsed duration across midnight, minus a break, independently of Timebank.
- Budget: manage expense templates, preview and save months, edit saved values and export monthly reports.
- Calendar entry uses YYYY/MM/DD; month entry uses YYYY/MM. Storage retains ISO dates.

React, TypeScript and Zod share a transactional IndexedDB persistence boundary. Writes reject stale tabs and commit atomically. Money uses integer minor units and durations use minutes.

Data stays in the current browser profile and origin. There is no cloud synchronization; clearing browser data removes saved records. Existing stored records remain compatible after removal of the legacy import and backup tools. Version-1 snapshot parsing still accepts historical reward, shop and gamification fields as inert data. Completing tasks never grants rewards; no active rewards UI or purchase action remains. This compatibility does not reintroduce backup/import screens.

## Verification

```powershell
npm run web:test
npm run web:check
npm run web:build
npm --prefix apps/web run test:browser
npm run web:preview
```

Browser tests use isolated profiles and an installed Chrome locally. CI installs Playwright Chromium.

## Deployment

The app is static. `vercel.json` configures the repository build. The GitHub Pages workflow verifies changes and publishes when manually dispatched. Relative asset paths support a repository subpath. Tabs use the entry URL; no route fallback is required. Changing origins uses a different browser storage area.
