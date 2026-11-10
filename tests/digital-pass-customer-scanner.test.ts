import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOperatorHandoffQr } from '../src/services/digitalPassHandoff.ts';

const origin = 'https://dolomitinordicski.github.io';
const valid = origin+'/dns-workspace/pass.html#activation?number=000123&code=ABC234';
test('customer reader accepts only the operator QR from the same origin', () => {
 assert.deepEqual(parseOperatorHandoffQr(valid,origin),{number:'000123',code:'ABC234'});
 assert.equal(parseOperatorHandoffQr(valid.replace(origin,'https://attacker.example'),origin),null);
 assert.equal(parseOperatorHandoffQr(origin+'/other.html#activation?number=000123&code=ABC234',origin),null);
 assert.equal(parseOperatorHandoffQr(origin+'/dns-workspace/pass.html?redirect=x#activation?number=000123&code=ABC234',origin),null);
 assert.equal(parseOperatorHandoffQr(origin+'/dns-workspace/pass.html#activation?number=000123&code=ABC234&code=ABC235',origin),null);
 assert.equal(parseOperatorHandoffQr(origin+'/dns-workspace/pass.html#activation?number=000123&code=ABC234&mode=admin',origin),null);
 assert.equal(parseOperatorHandoffQr(origin+'/dns-workspace/pass.html#activation?number=000123&code=IIIIII',origin),null);
 assert.equal(parseOperatorHandoffQr('dns-pass:v1:some-wallet-token',origin),null);
 assert.equal(parseOperatorHandoffQr('https://other.example/qr',origin),null);
});
test('localhost customer QR supported for isolated browser tests', () => {
 assert.deepEqual(parseOperatorHandoffQr('http://localhost:5173/pass.html#activation?number=01&code=ABC234','http://localhost:5173'),{number:'01',code:'ABC234'});
});
