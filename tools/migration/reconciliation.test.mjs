import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canonical,verifyRehearsal} from './reconciliation.mjs';
test('reconstruction ignores database row order but detects lost values and raw evidence',async()=>{
 const source=JSON.parse(await readFile(new URL('./fixtures/personal-source.json',import.meta.url)));
 source.tasks.push({...source.tasks[0],id:'another'});
 const target=structuredClone(source);target.revision=99;target.tasks.reverse();
 assert.equal(canonical(source),canonical(target));
 target.archives[0].raw='{}';assert.notEqual(canonical(source),canonical(target));
});
test('incomplete report cannot satisfy synthetic CI',()=>{
 assert.throws(()=>verifyRehearsal({gates:{}}),/Missing mandatory/);
});
