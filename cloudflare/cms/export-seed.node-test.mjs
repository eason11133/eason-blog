import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

test('Astro data export preserves the real homepage and legacy Markdown filenames',()=>{
 const result=spawnSync(process.execPath,[path.join(import.meta.dirname,'export-seed.mjs')],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const out=result.stdout;
 assert.match(out,/INSERT OR IGNORE INTO documents/);
 assert.match(out,/116 特選心得/);
 assert.match(out,/公共廁所 LINE Bot/);
 assert.match(out,/剛建個網，請多多指教/);
 assert.match(out,/INSERT OR IGNORE INTO settings\(key,value_json,updated\)/);
 assert.doesNotMatch(out,/^BEGIN(?:\s+TRANSACTION)?\s*;/m);
 assert.doesNotMatch(out,/^COMMIT\s*;/m);
});
