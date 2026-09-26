import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const windows=process.platform==='win32'
if (process.argv[2] === 'migration:rehearse' || process.argv[2] === 'migration:finance') {
 const script=process.argv[2] === 'migration:finance'?'tools/migration/finance-rehearse.mjs':'tools/migration/rehearse.mjs'
 const result=spawnSync(process.execPath,[script,...process.argv.slice(3)],{cwd:fileURLToPath(new URL('../',import.meta.url)),stdio:'inherit',shell:false})
 process.exit(result.status??1)
}
if (process.argv[2] === 'migration:inspect' || process.argv[2] === 'migration:test') {
 const test = process.argv[2] === 'migration:test'
 const result = spawnSync(process.execPath, test ? ['--test', 'tools/migration/report.test.mjs','tools/migration/reconciliation.test.mjs'] : ['tools/migration/report.mjs', ...process.argv.slice(3)], {cwd:fileURLToPath(new URL('../',import.meta.url)),stdio:'inherit',shell:false})
 process.exit(result.status ?? 1)
}
const tasks={
 'web:install':['apps/web','npm',['ci']],
 'web:dev':['apps/web','npm',['run','dev']],
 'web:build':['apps/web','npm',['run','build']],
 'web:check':['apps/web','npm',['run','typecheck']],
 'web:preview':['apps/web','npm',['run','preview']],
 'web:test':['apps/web','npm',['run','test']],
 
 
}
const task=tasks[process.argv[2]]
if(!task){console.error('Unknown task');process.exit(2)}
const [directory,command,args]=task
const result=spawnSync(command,args,{cwd:fileURLToPath(new URL('../'+directory+'/',import.meta.url)),stdio:'inherit',shell:windows})
if(result.error)console.error(result.error.message)
process.exit(result.status??1)
