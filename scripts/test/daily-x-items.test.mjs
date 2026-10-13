import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isXWindowTruncated, selectXItems, unwrapTwitterListResponse } from '../daily-x-items.mjs';

test('X reader accepts the twitter-cli JSON envelope', () => {
  const tweets = [{ id: '1' }];
  assert.deepEqual(unwrapTwitterListResponse({ ok: true, schema_version: 1, data: tweets }), tweets);
  assert.deepEqual(unwrapTwitterListResponse(tweets), tweets);
  assert.equal(unwrapTwitterListResponse({ ok: false, data: tweets }), null);
});

test('X reader checks the tail when its fetch limit is reached', () => {
  const old = Array.from({ length: 10 }, () => ({ createdAtISO: '2026-10-13T23:00:00Z', isRetweet: false }));
  const start = Date.parse('2026-10-14T00:00:00Z');
  assert.equal(isXWindowTruncated(old, start, 10), false);
  assert.equal(isXWindowTruncated(old.slice(0, 9), start, 10), false);
  assert.equal(isXWindowTruncated([...old.slice(0, 9), { createdAtISO: '2026-10-14T01:00:00Z' }], start, 10), true);
  assert.equal(isXWindowTruncated(old.map(tweet => ({ ...tweet, isRetweet: true })), start, 10), true);
});

test('X items use the saved half-open time window', () => {
  const tweets = [
    { id: '1', createdAtISO: '2026-10-13T23:59:59Z', author: { screenName: 'alice' }, text: 'before' },
    { id: '2', createdAtISO: '2026-10-14T00:00:00Z', author: { screenName: 'alice', name: 'Alice' }, text: 'inside' },
    { id: '3', createdAtISO: '2026-10-14T23:59:59Z', author: { screenName: 'bob' }, text: 'inside' },
    { id: '4', createdAtISO: '2026-10-15T00:00:00Z', author: { screenName: 'bob' }, text: 'after' },
  ];
  const items = selectXItems(tweets, Date.parse('2026-10-14T00:00:00Z'), Date.parse('2026-10-15T00:00:00Z'));
  assert.deepEqual(items.map(item => item.url), ['https://x.com/alice/status/2', 'https://x.com/bob/status/3']);
  assert.equal(items[0].author, 'Alice');
});
