import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectXItems } from '../daily-x-items.mjs';

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
