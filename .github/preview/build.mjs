// This file is run ONLY from the trusted checkout. PR code runs in disposable
// containers, never on the runner, and never receives credentials or caches.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { rewritePreview, validateTree } from '../workflows/preview-paths.mjs';

const temp = process.env.RUNNER_TEMP;
const repo = process.env.GITHUB_REPOSITORY;
if (!temp || !/^[\w.-]+\/[\w.-]+$/.test(repo ?? '')) throw new Error('Invalid runner context');
const plan = JSON.parse(fs.readFileSync(path.join(temp, 'preview-plan.json'), 'utf8'));
for (const p of plan) {
  if (!Number.isSafeInteger(p.number) || p.number <= 0 || !/^[a-f0-9]{40}$/.test(p.sha)) throw new Error('Invalid PR identity');
}
// Full replacement is intentional: closed/failed previews must disappear.
fs.rmSync('dist/preview', { recursive: true, force: true });
fs.mkdirSync('dist/preview', { recursive: true });
const results = [];
for (const p of plan) {
  const root = fs.mkdtempSync(path.join(temp, `preview-${p.number}-`));
  const source = path.join(root, 'source');
  const output = path.join(root, 'output');
  const logPath = path.join(root, 'build.log');
  fs.writeFileSync(logPath, '');
  let mounted = false;
  const name = `preview-${process.env.GITHUB_RUN_ID}-${p.number}`;
  let status = 'failed';
  try {
    fs.mkdirSync(source);
    fs.mkdirSync(output);
    const run = (cmd, args, timeout = 120000) => {
      try {
        const output = execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], timeout, maxBuffer: 8 * 1024 * 1024 });
        fs.appendFileSync(logPath, output);
      } catch (error) {
        fs.appendFileSync(logPath, error.stderr ?? '');
        throw error;
      }
    };
    run('git', ['init', '-q', source]);
    run('git', ['-C', source, 'fetch', '-q', '--depth', '1', `https://github.com/${repo}.git`, p.sha]);
    run('git', ['-C', source, 'checkout', '-q', '--detach', 'FETCH_HEAD']);
    fs.rmSync(path.join(source, '.git'), { recursive: true, force: true });
    run('sudo', ['mount', '-t', 'tmpfs', '-o', `size=300m,nosuid,nodev,noexec,uid=${os.userInfo().uid},gid=${os.userInfo().gid},mode=0700`, 'tmpfs', output]);
    mounted = true;
    // No host workspace, Docker socket, Actions command files, token, shared npm
    // cache, or environment variables enter this container. All writes except
    // the bounded output directory are ephemeral. Logs are NOT workflow commands.
    run('docker', ['run', '--rm', '--name', name,
      '--user', `${os.userInfo().uid}:${os.userInfo().gid}`,
      '--cap-drop=ALL', '--security-opt=no-new-privileges', '--read-only',
      '--pids-limit=256', '--memory=3g', '--cpus=2',
      '--tmpfs', '/tmp:rw,nosuid,nodev,size=512m,mode=1777',
      '--tmpfs', '/work:rw,exec,nosuid,nodev,size=2g,mode=1777',
      '--mount', `type=bind,src=${source},dst=/source,readonly`,
      '--mount', `type=bind,src=${output},dst=/output`,
      '--env', 'HOME=/tmp', '--env', 'npm_config_cache=/tmp/npm-cache',
      '--workdir', '/work', 'node:24-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20', 'sh', '-ec',
      'cp -R /source/. /work/; npm ci; npm run build; cp -R dist/. /output/'], 600000);
    // The container is stopped. Restore owner read permissions without following links.
    const readable = p => {
      const s = fs.lstatSync(p);
      if (s.isDirectory()) { fs.chmodSync(p, 0o700); for (const n of fs.readdirSync(p)) readable(path.join(p, n)); }
      else if (s.isFile() && s.nlink === 1) fs.chmodSync(p, 0o600);
    };
    readable(output);
    validateTree(output);
    rewritePreview(output, `/preview/pr-${p.number}`);
    fs.cpSync(output, path.resolve(`dist/preview/pr-${p.number}`), { recursive: true });
    status = 'ok';
  } catch (error) {
    console.log(`::warning::PR #${p.number} preview failed (${error.code ?? error.name}); production build is retained.`);
    // Never print untrusted logs as Actions commands. Keep an escaped tail.
    const tail = fs.readFileSync(path.join(root, 'build.log'), 'utf8').slice(-6000);
    console.log(JSON.stringify(tail));
  } finally {
    try { execFileSync('docker', ['rm', '-f', name], { stdio: 'ignore' }); } catch {}
    if (mounted) execFileSync('sudo', ['umount', output]);
    fs.rmSync(root, { recursive: true, force: true });
  }
  results.push({ ...p, status });
}
fs.writeFileSync('dist/preview/manifest.json', JSON.stringify(results));
fs.appendFileSync(process.env.GITHUB_OUTPUT, `previews=${JSON.stringify(results)}\n`);
