# Personal operations

A local-first personal workspace for tasks and schedules, timeline plans, time balance,
monthly budgets and optional task rewards. It consolidates useful behavior from Life RPG,
Timebank, Timeline, Finance Tracker and the neutral task concept from Dev Task Tracker.

## Layout and architecture

- `apps/web`: React 19, TypeScript, Vite, Zod and IndexedDB.
- `apps/web/src/operations`: neutral domains, transactional persistence, import adapters and screens.
- Existing schedule wizard and daily generation logic are reused from Life RPG.
- `tools/export_finance.py`: read-only SQLite exporter; Python is not an application backend.
- `SOURCE_PROVENANCE.md`: original source revision and history policy.

Modules share a versioned persistence boundary, not a universal game store. Money is integer
minor units; contribution rates are basis points; durations are integer minutes. Calendar
dates are local labels. Game coins are unrelated to financial amounts. Gamification starts
disabled and completion rewards are idempotent.

## Prerequisites and development

Use Node 22.13+ and npm. Python 3.11+ is needed only for the finance exporter and its tests.
Run these commands from this monorepo root:

```powershell
npm run web:install
npm run web:dev
```

Open the local URL printed by Vite. No environment variables, server account or database
credentials are required. Data belongs to this browser profile and origin.

```powershell
npm run web:test
npm run web:check
npm run web:build
python -m unittest discover -s tools -p "test_*.py"
npm run web:preview
```

The preview command serves the production files. Browser acceptance tests use an installed
Chrome locally and manage their own production preview server:

```powershell
npm --prefix apps/web run build
npm --prefix apps/web run test:browser
```

CI installs Playwright Chromium. Tests use isolated profiles, never your normal browser data.

## Workflows

- Tasks: create dated tasks, complete/reopen/delete, and generate a date's scheduled tasks.
  Generating again preserves the occurrence IDs and completion.
- Timeline: create/edit inclusive spans, move with dragging or keyboard-accessible buttons.
  Lane allocation retains the source's first-fit approach with calendar-safe arithmetic.
- Time balance: one or two ordered same-day intervals, a daily target and an explicit
  opening balance. Leaving the second exit empty calculates an exit without saving.
- Budget: expense templates, monthly preview and exactly the same saved snapshot. Historical
  months are not recalculated when templates change. Contributions retain the desktop
  33.33% minimum, and benefits count as income. Currency must be explicitly selected.
- Rewards: optional task awards, coin wallet, day-based cooldowns and imported hourly cooldowns.
- Backups: validated export/restore, explicit replacement acknowledgement, import previews
  and preserved raw source archives.

Writes commit all affected records atomically and reject stale tabs. Errors remain visible;
the UI does not announce success before commit. Export current data before any restore.

## Legacy migration

Keep original databases and browser exports. Use Backups → Import an old application.
Choose a stable installation ID, inspect counts and warnings, then explicitly apply.
The same identical snapshot is skipped; a changed snapshot under the same installation
is rejected for reconciliation. This is a one-time migration, not synchronization.

Supported JSON shapes:

- Life RPG: the full existing `life-rpg-save` object/export. Import into empty task/reward
  modules. Wallet and completed occurrences migrate; the full source remains archived.
- Timeline: an array of `{id,name,start,end}`, or an object containing `items`.
- Timebank: `{entrada1,saida1,entrada2,saida2,saldoInicial}`; saldoInicial is the source's
  signed integer-minute string. The operator assigns a date because the source had none.
  An incomplete draft is retained in the archive for manual completion.
- Finance Tracker: JSON from the read-only exporter below. Confirm currency before import.

After closing the desktop finance app, first make a backup of its SQLite file. Export
the backup rather than your only live copy:

```powershell
python tools/export_finance.py "D:\\Backups\\finance_tracker.db" "D:\\Backups\\finance-export.json"
```

The exporter opens SQLite read-only, reads a consistent transaction and refuses to overwrite
an existing output file. It preserves REAL values as decimal strings. The importer rejects
fractional cents, orphan expenses and ambiguous identifiers instead of silently rounding.
Stored month totals are preserved even when inconsistent; warnings require reconciliation.

## Deployment

This app is static. `vercel.json` configures installation, build and output from the repository
root. No hosted personal database is created. GitHub Pages verification is configured in
`.github/workflows/deploy.yml`; choose Pages → GitHub Actions and run the workflow manually
to publish. Relative asset paths support a repository subpath. Screens currently use tabs
at the entry URL, so no server-side route fallback is needed.

Changing the deployment origin changes the browser storage area. Export and restore to
move data. There is no offline app-shell cache or cloud synchronization.

## Known limitations and retirement gates

This is an integrated target, not an assertion that all legacy installations have migrated.
Browser-local finance requires the owner's acceptance of backup/durability responsibilities.
Browser storage is not encrypted and may be removed by the user or browser.

Life RPG's streak summaries and truncated history remain
in complete source archives rather than fabricated new history. Imported hourly shop cooldowns
retain their purchase timestamps. New rewards use day-based cooldowns; zero permits repeat purchases. The old game UI
remains as reference source but is not the application entry point.

Partial task progress is imported and can be advanced independently of rewards. Variable
finance templates require an explicit amount each month; templates and saved months can be edited.
Saved-month edits recalculate totals only after explicit confirmation. Historical
finance discrepancies, source origins and actual SQLite installations require reconciliation.
Overnight Timebank work must be split explicitly. No original project has been retired.
