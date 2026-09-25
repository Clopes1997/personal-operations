import {readFile} from 'node:fs/promises';
import {verifyRehearsal} from './reconciliation.mjs';
try{verifyRehearsal(JSON.parse(await readFile(process.argv[2],'utf8')));console.log('Synthetic retirement evidence passed; real sources and owner acceptance remain unverified');}
catch(e){console.error(e.message);process.exitCode=1;}
