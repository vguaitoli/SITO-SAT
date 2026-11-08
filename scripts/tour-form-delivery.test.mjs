import test from 'node:test';
import assert from 'node:assert/strict';
import { deliverRequest, formServiceAvailable, notificationFields } from '../public/modulo-tour/delivery.js';
const config = { primaryKey: '11111111-1111-4111-8111-111111111111', copyKey: '22222222-2222-4222-8222-222222222222', recipientsVerified: true };
const input = { requestId: 'abc12345-test', firstName: 'Partecipante', lastName: 'Prova', email: 'prova@example.com', phone: '0000000000', vehicle: 'Moto prova', vehicleType: 'Dual', people: 1, participants: [], singleRoom: true, luggage: true, insurance: false, notes: '', privacy: true, website: '' };
const accepted = () => ({ ok: true, status: 200, json: async () => ({ success: true }) });
test('activation requires two distinct verified keys', () => {
  assert.equal(formServiceAvailable(config), true);
  assert.equal(formServiceAvailable({ ...config, recipientsVerified: false }), false);
  assert.equal(formServiceAvailable({ ...config, copyKey: config.primaryKey }), false);
});
test('two independent notifications contain the same booking and no CC fields', async () => {
  const calls = [];
  const state = await deliverRequest(config, input, {}, async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return accepted(); });
  assert.deepEqual(state, { primary: 'accepted', copy: 'accepted' });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.riferimento, calls[1].body.riferimento);
  assert.equal(calls[0].body.camera_singola, 'Sì · +30 € a notte');
  assert.equal(calls[0].body.privacy, calls[1].body.privacy);
  assert.equal(calls[0].body.ccemail, undefined);
  assert.notEqual(calls[0].body.access_key, calls[1].body.access_key);
});
test('retry after rejected copy does not send primary again', async () => {
  let calls = 0;
  const first = await deliverRequest(config, input, {}, async () => {
    calls++;
    return calls === 1 ? accepted() : { ok: false, status: 400, json: async () => ({ success: false }) };
  });
  assert.deepEqual(first, { primary: 'accepted', copy: 'failed' });
  calls = 0;
  const second = await deliverRequest(config, input, first, async (url, options) => {
    calls++;
    assert.equal(JSON.parse(options.body).access_key, config.copyKey);
    return accepted();
  });
  assert.equal(calls, 1);
  assert.equal(second.copy, 'accepted');
});
test('network ambiguity stops automatic retry', async () => {
  const first = await deliverRequest(config, input, {}, async () => { throw new Error('connection lost'); });
  assert.equal(first.primary, 'unknown');
  let calls = 0;
  await deliverRequest(config, input, first, async () => { calls++; return accepted(); });
  assert.equal(calls, 0);
});
test('personal preferences and other participants are retained', () => {
  const body = notificationFields({ ...input, participants: [{ name: 'Altro Test', vehicle: 'Altra moto' }], people: 2 });
  assert.match(body.altri_partecipanti, /Altro Test/);
  assert.match(body.trasporto_bagagli, /adesioni/);
  assert.equal(body.partecipanti_totali, 2);
});
