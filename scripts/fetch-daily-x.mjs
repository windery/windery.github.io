// Read one X List. Credentials stay in the keychain and the twitter child process.
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: {
  start: { type: 'string' },
  end: { type: 'string' },
  config: { type: 'string' },
} });

const start = Date.parse(values.start ?? '');
const end = Date.parse(values.end ?? '');
if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
  console.log(JSON.stringify({ status: 'fetch-failed', reason: 'invalid-time-window' }));
  process.exit(1);
}

const configPath = resolve(values.config ?? resolve(import.meta.dirname, '../ai-daily.local.json'));
let config;
try { config = JSON.parse(await readFile(configPath, 'utf8')); }
catch {
  console.log(JSON.stringify({ status: 'fetch-failed', reason: 'private-config-unavailable' }));
  process.exit(1);
}

const listId = config?.x?.listId;
const keychain = config?.x?.keychain;
if (!/^\d+$/.test(listId ?? '') || !keychain?.service || !keychain?.authTokenAccount || !keychain?.ct0Account) {
  console.log(JSON.stringify({ status: 'fetch-failed', reason: 'x-list-or-keychain-not-configured' }));
  process.exit(1);
}

const secret = (account) => {
  const result = spawnSync('/usr/bin/security', [
    'find-generic-password', '-w', '-s', keychain.service, '-a', account,
  ], { encoding: 'utf8', timeout: 10000 });
  return result.status === 0 ? result.stdout.trim() : '';
};
const authToken = secret(keychain.authTokenAccount);
const ct0 = secret(keychain.ct0Account);
if (!authToken || !ct0) {
  console.log(JSON.stringify({ status: 'login-expired', reason: 'keychain-credentials-unavailable' }));
  process.exit(1);
}

const result = spawnSync('twitter', ['list', listId, '-n', '100', '--json'], {
  encoding: 'utf8',
  timeout: 90000,
  maxBuffer: 16 * 1024 * 1024,
  env: { ...process.env, TWITTER_AUTH_TOKEN: authToken, TWITTER_CT0: ct0 },
});

if (result.status !== 0) {
  const diagnostic = `${result.stderr ?? ''} ${result.stdout ?? ''}`;
  const expired = /not_authenticated|unauthorized|csrf|cookie|code.?353|http.?403/i.test(diagnostic);
  console.log(JSON.stringify({ status: expired ? 'login-expired' : 'fetch-failed', reason: expired ? 'authentication-rejected' : 'twitter-cli-error' }));
  process.exit(1);
}

let tweets;
try { tweets = JSON.parse(result.stdout); }
catch {
  console.log(JSON.stringify({ status: 'fetch-failed', reason: 'invalid-twitter-response' }));
  process.exit(1);
}
if (!Array.isArray(tweets)) {
  console.log(JSON.stringify({ status: 'fetch-failed', reason: 'invalid-twitter-response' }));
  process.exit(1);
}

const items = tweets.flatMap(tweet => {
  const time = Date.parse(tweet.createdAtISO || tweet.createdAt || '');
  if (!Number.isFinite(time) || time < start || time >= end) return [];
  const id = String(tweet.id ?? '');
  const handle = String(tweet.author?.screenName ?? '');
  if (!/^\d+$/.test(id) || !/^[\w]{1,15}$/.test(handle)) return [];
  return [{
    author: tweet.author?.name || handle,
    handle,
    createdAt: new Date(time).toISOString(),
    text: tweet.text || '',
    url: `https://x.com/${handle}/status/${id}`,
  }];
});
console.log(JSON.stringify({ status: 'ok', windowStart: new Date(start).toISOString(), windowEnd: new Date(end).toISOString(), items }));
