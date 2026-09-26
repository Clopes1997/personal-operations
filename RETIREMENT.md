# Retirement Readiness

## Browser-local retirement acceptance

### Direct legacy Finance Tracker rehearsal

For an offline Finance Tracker SQLite backup, the root wrapper performs the complete
source-to-import-to-restore check. The original file is only read as bytes; SQLite opens
the copy. Source sidecars cause refusal so an active/WAL database is never mistaken for
a standalone consistent backup. Close the legacy app and obtain an offline backup first.

```powershell
npm run migration:finance -- --database "D:\Backups\finance_tracker.db" --currency BRL --installation home-desktop --kind real --out migration-runs/finance-01
```

Replace BRL with the explicitly confirmed source currency and use a stable installation
identity. Python must be on PATH (or set PYTHON to its executable). The wrapper checks copied
SQLite integrity, uses the read-only exporter, imports through the actual browser UI, compares
every template/month/expense and exact totals, preserves Config/Eventos as raw evidence, and
then executes destructive replacement/restore in a fresh disposable browser context.
Original bytes are fingerprinted again afterward. Both report formats retain the SQLite
fingerprint and export fingerprint. Real financial files never enter CI; CI creates synthetic
SQLite with a variable template, decimal edge case, monthly values and archival evidence.

The discovered workspace finance database was rehearsed with owner-confirmed BRL. Its scope
is two templates, one archived Config row, and zero saved months/expenses/events. It does not
establish that other Finance Tracker installations are empty. Specific owner acceptance of
backup responsibility and archival-only Config/Eventos remains explicit in the report.

Install and verify from the repository root:

```bash
npm run web:install
npm run migration:test
npm run web:test
npm run web:check
npm run web:build
npm --prefix apps/web run test:browser
npm run migration:rehearse -- --snapshot tools/migration/fixtures/personal-source.json --installation synthetic --kind synthetic --out migration-runs/rehearsal-01
```

The final command returns 2 for a completed but unapproved/synthetic run, 1 for failure.
Check mandatory evidence separately; exit 2 alone is not a pass:

```bash
node tools/migration/verify-rehearsal.mjs migration-runs/rehearsal-01/migration-report.json
```

The browser suite uses installed Chrome locally and Playwright Chromium in CI. On Linux CI,
install it with `cd apps/web && npx playwright install --with-deps chromium` first.
Each output directory must be new. It contains private source/export copies and browser
artifacts as well as migration-report.json and migration-report.md. Do not publish the
whole directory. No credentials are required. Do not place real backups in Git.

The rehearsal creates an isolated browser profile, restores all modules, downloads a backup,
verifies the saved file, replaces data with empty state, restores, reloads, and compares actual
exported records. It tests concurrent stale tabs, corrupted JSON and unsupported versions.
The unit acceptance suite additionally tests atomic IndexedDB restore and legacy-history
isolation. Snapshot revisions advance during restoration; they are never rewound.

For an existing consolidated backup, substitute its path, explicit installation ID and
`--kind real`. The file is copied and fingerprinted read-only. This proves backup reconstruction,
not reconciliation against unknown original installations. Real-source reconciliation therefore
remains REQUIRES_REVIEW. Preserve each original JSON/SQLite backup and its mapping decisions;
review finance totals, variable templates, partial progress, custom rewards and archival-only
history before approving retirement. Unsupported fields or changed source values block the run.

Back up the entire exported version-1 JSON, including raw source archives. Verify it against
current data in Backups and keep it outside browser storage. Restore into a separate browser
profile first. Cutover rollback means restoring that JSON to browser-local storage; there is no
server/database rollback. Writes made after the backup must be exported before replacement or
they will be lost. Changing the deployment origin requires export/restore. App-shell offline
reload is not guaranteed; an already loaded app and its backup functions need no network.

The owner acceptance checklist in each report includes understanding local-only storage and
backup responsibility, real finance/template/progress/reward reconciliation, and preserved
archival history. These choices are never inferred from automated test success.

Source → Backup → Isolated restore → Preflight → Migration → Reconciliation → Acceptance tests → Restore/rollback test → Human review → Cutover approval → Source archival

**Passing automated checks does not authorize deletion or archival of the source.**

## Report contract

All projects use version 1 of tools/migration/report.mjs with migration-report.json and migration-report.md outputs. Copies live in each independent monorepo without a cross-repository runtime dependency.

PASS requires evidence. FAIL means a proven failure. REQUIRES_REVIEW means an unresolved semantic decision. NOT_RUN means absent execution evidence. Every mandatory gate must pass against a real source before READY_FOR_OWNER_ACCEPTANCE. Synthetic fixtures never satisfy real_source. Owner acceptance and archival authorization are never inferred. Dirty code blocks readiness.

The snapshot command only fingerprints/parses JSON and records unexecuted gates. It is not an import or restore test:

~~~powershell
npm run migration:inspect -- --snapshot C:\Backups\export.json --application legacy-app --installation local-copy --kind real --out migration-runs\run-001
npm run migration:test
~~~

Use --kind synthetic for generated samples. Choose a new output directory for each run. Reports are never overwritten. Exit 1 indicates command/snapshot failure; 2 means inspection finished but readiness is incomplete.

Reports record source identity/hash, target commit/dirty state, timestamp, counts/totals, integrity, discrepancies, mapping policy, manual reviews, automated tests and restore/rollback evidence. Use safe identifiers and evidence labels, never credentials or raw record contents. Retain immutable raw exports separately in operator-controlled storage; do not commit real data or private reports.

## Operator boundaries

Read source copies only. Use a separate disposable target and unique database name/credentials. Never run a new lineage against a legacy database. Hash snapshots before/after. Reconcile exclusions explicitly. Backup creation is not proof: restore into a second empty target and compare counts, exact totals, references and acceptance behavior.

Rollback freezes writes and restores the compatible database and application version before reopening access. Do not run old code against a new schema. Post-cutover writes require explicit reconciliation; rollback may require downtime and must not silently discard them. Personal rollback uses browser backup restore and revision/stale-tab checks.

Adapters must record currency, units, timestamp interpretation and identity decisions. Never guess timezones, round silently or fuzzy-merge. Missing real snapshots remain NOT_RUN. Generated fixtures are labeled synthetic and cannot establish legacy retirement readiness.
