import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync,execFileSync} from 'node:child_process';
import {newReport,setGate,writeReports,fingerprint} from './report.mjs';
import {canonical} from './reconciliation.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),web=resolve(root,'apps/web');
const options={},args=process.argv.slice(2);
for(let i=0;i<args.length;i+=2){
 if(!['--snapshot','--installation','--kind','--out'].includes(args[i])||!args[i+1]||options[args[i]])throw new Error('Invalid rehearsal options');
 options[args[i]]=args[i+1];
}
let report;
const collections=['tasks','plans','workdays','budgets','templates','rewards','shop','archives'];
const totals=s=>({finance:Object.fromEntries([...new Set(s.budgets.map(b=>b.currency))].sort().map(currency=>{
 const months=s.budgets.filter(b=>b.currency===currency),sum=field=>months.reduce((n,b)=>n+BigInt(b[field]),0n).toString();
 return [currency,{salaryMinor:sum('salary'),benefitsMinor:sum('benefits'),contributionMinor:sum('contribution'),freeMinor:sum('free'),expensesMinor:months.reduce((n,b)=>n+b.expenses.reduce((m,e)=>m+BigInt(e.cents),0n),0n).toString()}];
})),rewardCoins:s.rewards.reduce((n,r)=>n+BigInt(r.coins),0n).toString()});
async function findFile(dir,name){
 for(const item of await readdir(dir,{withFileTypes:true})){
  const path=resolve(dir,item.name);if(item.isFile()&&item.name===name)return path;
  if(item.isDirectory()){const found=await findFile(path,name);if(found)return found;}
 }
}
function run(script,args,env){
 const result=spawnSync(process.execPath,[resolve(web,script),...args],{cwd:web,env,encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024});
 if(result.status!==0)throw new Error('Acceptance command failed; inspect private local test artifacts');
 return result.stdout;
}
try {
 if(Object.keys(options).length!==4)throw new Error('All options required');
 const output=resolve(options['--out']),snapshot=resolve(options['--snapshot']);
 await mkdir(dirname(output),{recursive:true});await mkdir(output,{recursive:false});
 const bytes=await readFile(snapshot),source=JSON.parse(bytes);
 report=newReport({project:'personal-operations',source:{application:'personal-operations',installation:options['--installation'],kind:options['--kind']},snapshot:bytes,
 commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),dirty:!!execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim()});
 await writeFile(resolve(output,'source-snapshot.json'),bytes,{flag:'wx',mode:0o600});
 setGate(report,'source_snapshot','PASS',['Immutable backup copy and SHA-256; original read only']);
 const env={...process.env,PERSONAL_REHEARSAL_SNAPSHOT:resolve(output,'source-snapshot.json')};
 const unit=JSON.parse(run('node_modules/vitest/vitest.mjs',['run','src/operations/retirement.test.ts','--reporter=json'],env));
 if(unit.numPassedTests!==4||unit.numFailedTests!==0)throw new Error('Retirement unit cases missing');
 report.automatedTests.push({name:'Destructive IndexedDB restore, stale revisions, malformed/versioned files, archival isolation',status:'PASS',count:4});
 run('node_modules/typescript/bin/tsc',[],env);
 run('node_modules/vite/bin/vite.js',['build'],env);
 const browser=JSON.parse(run('node_modules/@playwright/test/cli.js',['test','e2e/retirement.spec.ts','--reporter=json','--output',resolve(output,'browser')],env));
 if(browser.stats.expected!==1||browser.stats.unexpected!==0)throw new Error('Browser acceptance missing');
 report.automatedTests.push({name:'Actual browser export, destructive replacement, restore, reload, module pages, Legacy History and stale tab',status:'PASS',count:1});
 const before=JSON.parse(await readFile(await findFile(resolve(output,'browser'),'original.json'),'utf8'));
 const after=JSON.parse(await readFile(await findFile(resolve(output,'browser'),'restored.json'),'utf8'));
 if(canonical(before)!==canonical(after))throw new Error('Reconstructed browser state differs');
 if(canonical(source)!==canonical(before)){
  report.discrepancies.push({code:'SOURCE_FIELDS_CHANGED',reason:'Input differs from validated export beyond revision/order; review optional defaults or unsupported fields'});
  throw new Error('Source fields require reconciliation');
 }
 // Validate source as imported by the schema; optional defaults may be added, never erase raw archives.
 report.counts={source:Object.fromEntries(collections.map(k=>[k,source[k].length])),target:Object.fromEntries(collections.map(k=>[k,after[k].length]))};
 report.totals={source:totals(source),target:totals(after)};
 if(JSON.stringify(report.counts.source)!==JSON.stringify(report.counts.target)||JSON.stringify(report.totals.source)!==JSON.stringify(report.totals.target))throw new Error('Source count or total mismatch');
 for(const gate of ['preflight','isolated_target','import','acceptance','restart_persistence','backup_restore','rollback'])
  setGate(report,gate,'PASS',['Validated backup restored in disposable browser context; exact export comparison and stale-tab protection passed']);
 report.restore={status:'PASS',backupSha256:fingerprint(await readFile(await findFile(resolve(output,'browser'),'original.json'))),revisionBefore:before.revision,revisionAfter:after.revision};
 report.rollback={status:'PASS',boundary:'Browser-local replacement only; export retained outside disposable context. No server rollback applies.'};
 report.integrityChecks=[{status:'PASS',check:'Every exported module reconstructed exactly; revision advanced rather than rewound'}];
 if(report.source.kind==='synthetic')setGate(report,'reconciliation','PASS',['Synthetic backup counts, exact integer totals and all-module reconstruction']);
 else {
  setGate(report,'real_source','PASS',['Operator supplied real consolidated backup; original legacy export provenance still requires review']);
  setGate(report,'reconciliation','REQUIRES_REVIEW',['Backup reconstruction passed; compare each original legacy source and mapping before retirement']);
 }
 report.manualReviews=[
  {id:'local-only-storage-understood',status:'NOT_RUN'},
  {id:'backup-responsibility-understood',status:'NOT_RUN'},
  {id:'legacy-finance-variable-templates-partial-progress-custom-rewards',status:'REQUIRES_REVIEW',evidence:'Synthetic transformation tests and backup reconstruction do not prove unknown real source mappings'},
  {id:'archival-only-history',status:'REQUIRES_REVIEW',evidence:'All raw archives retained and visible; owner must review historical completeness'},
 ];
 report.warnings.push('Private rehearsal directory contains personal/financial backups and possible browser failure artifacts. Publish only reviewed report JSON/Markdown.');
 if(fingerprint(await readFile(snapshot))!==report.snapshot.sha256)throw new Error('Source changed during rehearsal');
}catch {
 if(report){report.blockers.push('Retirement rehearsal incomplete; inspect private local test artifacts');setGate(report,'acceptance','FAIL',['Rehearsal failed; raw values omitted']);}
 else console.error('Could not start: require readable snapshot, installation, real/synthetic kind, and unused output directory.');
}finally {
 if(report){await writeReports(report,resolve(options['--out']));console.log(report.readiness);process.exitCode=Object.values(report.gates).some(g=>g.status==='FAIL')?1:2;}
 else process.exitCode=1;
}
