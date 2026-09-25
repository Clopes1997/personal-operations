const collections=['tasks','plans','workdays','budgets','templates','rewards','shop','archives'];
export function canonical(snapshot) {
 const state=structuredClone(snapshot);state.revision=0;
 for(const key of collections)state[key].sort((a,b)=>a.id.localeCompare(b.id));
 const order=value=>Array.isArray(value)?value.map(order):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,order(value[k])])):value;
 return JSON.stringify(order(state));
}
export function verifyRehearsal(report){
 for(const gate of ['preflight','source_snapshot','isolated_target','import','reconciliation','acceptance','restart_persistence','backup_restore','rollback'])
  if(report.gates[gate]?.status!=='PASS')throw new Error('Missing mandatory synthetic evidence: '+gate);
 if(report.restore.status!=='PASS'||report.rollback.status!=='PASS'||report.discrepancies.length||report.target.dirty)throw new Error('Incomplete restoration evidence');
 if(report.source.kind!=='synthetic'||report.gates.real_source.status!=='NOT_RUN'||report.readiness!=='NOT_READY'||report.ownerAcceptance!=='NOT_RUN'||report.sourceArchivalAuthorized!==false)throw new Error('Synthetic rehearsal must not approve retirement');
 return true;
}
