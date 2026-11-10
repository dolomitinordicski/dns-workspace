import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const runner='scripts/check-digital-pass-pilot-build.mjs';
const base={DNS_PILOT_REQUESTED:'true',DNS_PASS_PILOT_APPROVED:'true',DNS_PASS_API_BASE:'https://europe-west8-dns-core.cloudfunctions.net/digitalPassApi',DNS_PASS_PRIVACY_URL:'https://www.dolomitinordicski.com/de/privacy'};
const run=(values={})=>spawnSync(process.execPath,[runner],{
  env:{...process.env,...base,...values},encoding:'utf8',
});
test('normal deployments never require nor enable pilot settings',()=>{
 const r=run({DNS_PILOT_REQUESTED:'false',DNS_PASS_PILOT_APPROVED:'',DNS_PASS_API_BASE:'',DNS_PASS_PRIVACY_URL:''});
 assert.equal(r.status,0,r.stderr);
 assert.match(r.stdout,/disabled/);
});
test('a manual pilot build requires explicit approval and approved cloud endpoint',()=>{
 assert.equal(run().status,0);
 assert.notEqual(run({DNS_PASS_PILOT_APPROVED:''}).status,0);
 assert.notEqual(run({DNS_PASS_API_BASE:'https://evil.example.test/digitalPassApi'}).status,0);
 assert.notEqual(run({DNS_PASS_API_BASE:'https://europe-west8-dns-pass-staging-c1.cloudfunctions.net/digitalPassApi'}).status,0);
 assert.notEqual(run({DNS_PASS_PRIVACY_URL:'http://www.dolomitinordicski.com/privacy'}).status,0);
 assert.notEqual(run({DNS_PASS_API_BASE:'https://europe-west8-dns-core.cloudfunctions.net/digitalPassApi?token=abc'}).status,0);
});
