import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync,execFileSync} from 'node:child_process';
import {newReport,setGate,writeReports,fingerprint} from './report.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),web=resolve(root,'apps/web'),args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2){
 if(!['--database','--currency','--installation','--kind','--out'].includes(args[i])||!args[i+1]||options[args[i]])throw new Error('Invalid finance rehearsal options');
 options[args[i]]=args[i+1];
}
let report,output,stage='source_snapshot';
function run(executable,args,env=process.env,cwd=root){
 const result=spawnSync(executable,args,{cwd,env,encoding:'utf8',timeout:240000,maxBuffer:16*1024*1024});
 if(result.status!==0)throw new Error('Finance rehearsal command failed; source values omitted');
 return result.stdout;
}
try{
 if(Object.keys(options).length!==5||! /^[A-Z]{3}$/.test(options['--currency']))throw new Error('All options and explicit currency required');
 output=resolve(options['--out']);await mkdir(dirname(output),{recursive:true});await mkdir(output,{recursive:false});
 const sourcePath=resolve(options['--database']),bytes=await readFile(sourcePath);
 report=newReport({project:'personal-operations',source:{application:'finance-tacker',installation:options['--installation'],kind:options['--kind']},snapshot:bytes,
 commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),dirty:!!execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim()});
 for(const suffix of ['-wal','-shm','-journal']){
  try{await stat(sourcePath+suffix);throw new Error('Source has journal sidecars; obtain consistent offline backup');}
  catch(error){if(error.code!=='ENOENT')throw error;}
 }
 const copied=resolve(output,'source.db');await writeFile(copied,bytes,{flag:'wx',mode:0o600});
 if(fingerprint(await readFile(sourcePath))!==report.snapshot.sha256)throw new Error('Source changed while copying');
 const python=process.env.PYTHON??(process.platform==='win32'?'python':'python3');
 const integrity=run(python,['-c','import sqlite3,sys,pathlib; c=sqlite3.connect(pathlib.Path(sys.argv[1]).resolve().as_uri()+"?mode=ro",uri=True); print(c.execute("PRAGMA integrity_check").fetchone()[0]); c.close()',copied]).trim();
 if(integrity!=='ok')throw new Error('Copied SQLite failed integrity check');
 const exported=resolve(output,'source-export.json');
 run(python,['tools/export_finance.py',copied,exported]);
 const raw=await readFile(exported),source=JSON.parse(raw);
 report.mappingPolicy={currency:options['--currency'],currencyDecision:'Explicit operator argument',sqliteSha256:report.snapshot.sha256,exportSha256:fingerprint(raw),history:'Config intentionally omitted (owner 2026-09-26); Eventos and all other source fields retained; original external evidence unchanged'};
 setGate(report,'source_snapshot','PASS',['Original never opened by SQLite; stable byte copy, copied SQLite integrity_check and read-only export passed']);
 const normalized=resolve(output,'imported-backup.json');
 const env={...process.env,FINANCE_SOURCE_EXPORT:exported,FINANCE_SOURCE_CURRENCY:options['--currency'],FINANCE_SOURCE_INSTALLATION:options['--installation'],FINANCE_IMPORT_RESULT:normalized};
 stage='preflight';
 run(process.execPath,[resolve(web,'node_modules/typescript/bin/tsc')],env,web);
 run(process.execPath,[resolve(web,'node_modules/vite/bin/vite.js'),'build'],env,web);
 const result=JSON.parse(run(process.execPath,[resolve(web,'node_modules/@playwright/test/cli.js'),'test','e2e/finance-retirement.spec.ts','--reporter=json','--output',resolve(output,'finance-browser')],env,web));
 if(result.stats.expected!==1||result.stats.unexpected!==0)throw new Error('Real importer acceptance not executed');
 const imported=JSON.parse(await readFile(normalized,'utf8'));
 for(const gate of ['preflight','isolated_target','import','reconciliation'])setGate(report,gate,'PASS',['Real browser legacy importer; every template/month/expense independently compared; all retained source fields compared exactly; Config omission explicitly verified']);
 report.counts={source:{templates:source.tables.ExpenseTemplates.length,months:source.tables.Meses.length,expenses:source.tables.MonthExpenses.length},
 target:{templates:imported.templates.length,months:imported.budgets.length,expenses:imported.budgets.reduce((n,b)=>n+b.expenses.length,0)}};
 report.automatedTests.push({name:'Finance legacy import, exact template/month/expense values, totals, retained archive visibility and intentional Config omission',status:'PASS'});
 stage='backup_restore';
 const child=spawnSync(process.execPath,['tools/migration/rehearse.mjs','--snapshot',normalized,'--installation',options['--installation'],'--kind',options['--kind'],'--out',resolve(output,'backup-rehearsal')],{cwd:root,env,encoding:'utf8',timeout:300000,maxBuffer:16*1024*1024});
 if(child.status!==2)throw new Error('Backup rehearsal failed');
 const nested=JSON.parse(await readFile(resolve(output,'backup-rehearsal/migration-report.json'),'utf8'));
 for(const gate of ['acceptance','restart_persistence','backup_restore','rollback']){
  if(nested.gates[gate].status!=='PASS')throw new Error('Required restoration evidence absent');
  setGate(report,gate,'PASS',nested.gates[gate].evidence);
 }
 report.restore=nested.restore;report.rollback=nested.rollback;report.totals=nested.totals;
 const minor=value=>{const [whole,fraction='']=String(value).split('.');return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));};
 report.totals.source.templateDefaultsMinor=source.tables.ExpenseTemplates.reduce((n,t)=>n+(t.valor_padrao===null?0n:minor(t.valor_padrao)),0n).toString();
 report.totals.target.templateDefaultsMinor=imported.templates.reduce((n,t)=>n+BigInt(t.cents),0n).toString();
 report.counts.source.variableTemplates=source.tables.ExpenseTemplates.filter(t=>t.valor_padrao===null).length;
 report.counts.target.variableTemplates=imported.templates.filter(t=>t.variable).length;
 report.intentionalOmissions=[{entity:'Config',sourceCount:source.tables.Config?.length??0,targetCount:0,decision:'owner-2026-09-26',reason:'Unused desktop default contribution percentage; no active target dependency'}];
 report.mappingPolicy.intentionalOmissions=report.intentionalOmissions;
 report.automatedTests.push(...nested.automatedTests);
 report.integrityChecks=[{status:'PASS',check:'Copied SQLite integrity and source-to-imported-backup-to-restored-state reconciliation'}];
 report.identities=imported.templates.map(t=>({targetId:t.id,source:'finance-tacker',installation:options['--installation']}));
 report.manualReviews=[{id:'currency',status:'PASS',evidence:'Operator explicitly selected '+options['--currency']},
 {id:'local-only-and-backup-responsibility',status:'PASS',evidence:'Owner explicitly accepted browser-local finance storage with backups; final cutover/archive acceptance remains NOT_RUN'},
 {id:'config-omission',status:'PASS',evidence:'Owner decision 2026-09-26; Config supplies only obsolete desktop default, no template/month/currency dependency; retained fields and restored state verified'}];
 report.blockers.push(...report.manualReviews.filter(r=>r.status!=='PASS').map(r=>'Owner review: '+r.id));
 report.warnings.push('This report covers only the fingerprinted workspace database; other installations are not inferred. Private output contains financial data. No production state was changed.');
 if(options['--kind']==='real')setGate(report,'real_source','PASS',['Actual legacy SQLite copy exercised through importer, exact reconciliation and browser backup/restore']);
 if(fingerprint(await readFile(sourcePath))!==report.snapshot.sha256)throw new Error('Original source changed during rehearsal');
}catch{
 if(report){setGate(report,stage,'FAIL',['Finance rehearsal incomplete; inspect private artifacts, source values omitted']);report.blockers.push('Finance source rehearsal incomplete at '+stage);}
 else console.error('Require a readable offline SQLite source, explicit currency/installation/kind and new output directory');
}finally{
 if(report){await writeReports(report,output);console.log(report.readiness);process.exitCode=Object.values(report.gates).some(g=>g.status==='FAIL')?1:2;}
 else process.exitCode=1;
}
