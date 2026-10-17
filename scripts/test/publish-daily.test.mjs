// 发布命令演练模式的测试：每个场景在一份临时仓库里跑，只看退出状态、错误信息、构建产物和打印出来的计划
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, cp, rm, readFile, writeFile, readdir, symlink, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '../..');
const fixtures = join(import.meta.dirname, 'fixtures');
const sampleConfig = join(fixtures, 'ai-daily.sample.json');
const DATE = '2026-10-11';
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.com', ...args], { cwd, encoding: 'utf8' });

let tmp, base, count = 0;
before(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'publish-daily-'));
  base = join(tmp, 'base');
  // 把当前工作区（含未提交的改动）快照成一个干净的仓库，作为各场景的远端
  const files = git(repo, 'ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0').filter(f => f && existsSync(join(repo, f)));
  for (const f of files) { await mkdir(dirname(join(base, f)), { recursive: true }); await cp(join(repo, f), join(base, f)); }
  git(base, 'init', '-q', '-b', 'main');
  git(base, 'add', '-A');
  git(base, 'commit', '-q', '-m', 'snapshot');
});
after(() => rm(tmp, { recursive: true, force: true }));

// 每个场景一份独立的远端和工作副本，origin/main 就是快照
async function checkout() {
  const id = ++count;
  const origin = join(tmp, `origin-${id}.git`), work = join(tmp, `work-${id}`);
  git(tmp, 'clone', '-q', '--bare', base, origin);
  git(tmp, 'clone', '-q', origin, work);
  await symlink(join(repo, 'node_modules'), join(work, 'node_modules'));
  await appendFile(join(work, '.git/info/exclude'), 'node_modules\n');
  return work;
}

const sample = () => readFile(join(fixtures, 'daily-sample.md'), 'utf8');
async function writeDaily(work, content, date = DATE) {
  await mkdir(join(work, 'src/content/daily'), { recursive: true });
  await writeFile(join(work, `src/content/daily/${date}.md`), content);
}
const run = (work, ...args) => spawnSync(process.execPath, ['scripts/publish-daily.mjs', ...args], { cwd: work, encoding: 'utf8' });
const publish = (work, ...args) => run(work, '--date', DATE, '--dry-run', '--config', sampleConfig, ...args);

// 计划里的飞书消息按分隔行切开：[{kind, text}]
function messages(stdout) {
  const parts = stdout.split(/^----- 飞书消息 \d+\/\d+：(.+) -----$/m).slice(1);
  const out = [];
  for (let i = 0; i < parts.length; i += 2) out.push({ kind: parts[i], text: parts[i + 1].trim() });
  return out;
}

// Pagefind 索引里收录的页面地址
async function indexedUrls(work) {
  const dir = join(work, 'dist/pagefind/fragment');
  const urls = [];
  for (const name of await readdir(dir)) {
    const raw = gunzipSync(await readFile(join(dir, name))).toString('utf8');
    urls.push(JSON.parse(raw.slice(raw.indexOf('{'))).url);
  }
  return urls;
}

describe('合格的日报', () => {
  let work, run;
  before(async () => { work = await checkout(); await writeDaily(work, await sample()); run = publish(work); });

  test('演练成功退出', () => assert.equal(run.status, 0, run.stderr));

  test('/daily/ 列出这一期和它的要点', async () => {
    const html = await readFile(join(work, 'dist/daily/index.html'), 'utf8');
    assert.match(html, /href="\/daily\/2026-10-11\/"/);
    assert.match(html, /样例要点一：某 agent 框架发布 1.0，内置 MCP 客户端/);
  });

  test('这一期有固定网址的页面', async () => {
    const html = await readFile(join(work, 'dist/daily/2026-10-11/index.html'), 'utf8');
    assert.match(html, /GitHub 热门 AI 项目/);
    assert.match(html, /example\/agent-kit/);
  });

  test('全站导航在项目解读后面有 AI 日报入口', async () => {
    const html = await readFile(join(work, 'dist/index.html'), 'utf8');
    assert.match(html, /项目解读<\/a><a href="\/daily\/"[^>]*>AI 日报<\/a>/);
  });

  test('这一期纳入站内搜索', async () => {
    assert.ok((await indexedUrls(work)).includes('/daily/2026-10-11/'));
  });

  test('计划只有一条飞书日报消息，包含要点、口播选题和线上链接', () => {
    const list = messages(run.stdout);
    assert.deepEqual(list.map(m => m.kind), ['日报']);
    const text = list[0].text;
    assert.match(text, /AI 日报 2026-10-11/);
    assert.match(text, /样例要点一：某 agent 框架发布 1.0，内置 MCP 客户端/);
    assert.match(text, /样例要点二：某模型 API 输入价格降低一半/);
    assert.match(text, /样例要点三：一篇讲 RAG 评估的长文值得细读/);
    assert.match(text, /样例选题：MCP 到底解决了什么问题/);
    assert.match(text, /从一次真实接入的踩坑讲起，对比直接写 function calling/);
    assert.match(text, /https:\/\/windery\.github\.io\/daily\/2026-10-11\//);
  });

  test('计划列出提交、推送、等部署、发飞书，并且发给配置里的接收人', () => {
    assert.match(run.stdout, /src\/content\/daily\/2026-10-11\.md/);
    assert.match(run.stdout, /git push origin main/);
    assert.match(run.stdout, /部署/);
    assert.match(run.stdout, /ou_sample_receiver/);
  });
});

describe('X 登录过期（pending / login-expired）的日报', () => {
  let work, run;
  before(async () => {
    work = await checkout();
    const content = (await sample())
      .replace('x: {"status": "ok"}', 'x: {"status": "pending", "reason": "login-expired"}')
      .replace(/(### X 动态\n)[\s\S]*?(?=### 博客与长文)/, '$1\nX 内容待补充：抓取时 X 登录已失效，重新登录后会补上。\n\n');
    await writeDaily(work, content);
    run = publish(work);
  });

  test('照常构建，页面上标注 X 内容待补充', async () => {
    assert.equal(run.status, 0, run.stderr);
    const html = await readFile(join(work, 'dist/daily/2026-10-11/index.html'), 'utf8');
    assert.match(html, /X 内容待补充/);
  });

  test('计划里有日报消息和一条单独的 X 失效提醒', () => {
    assert.deepEqual(messages(run.stdout).map(m => m.kind), ['日报', 'X 失效提醒']);
  });

  test('提醒写明原因，并给出用剪贴板写入钥匙串的重新登录步骤', () => {
    const text = messages(run.stdout)[1].text;
    assert.match(text, /2026-10-11/);
    assert.match(text, /login-expired/);
    assert.match(text, /重新登录 x\.com/);
    assert.match(text, /Cookie-Editor/);
    assert.match(text, /security add-generic-password -U -s sample-x-service -a sample_auth_token -w "\$\(pbpaste\)"/);
    assert.match(text, /security add-generic-password -U -s sample-x-service -a sample_ct0 -w "\$\(pbpaste\)"/);
    assert.match(text, /清空剪贴板/);
    assert.match(text, /不要用终端的隐藏输入.*128/);
  });

  test('提醒写明手动补抓指令', () => {
    const text = messages(run.stdout)[1].text;
    assert.match(text, /补抓最近一期的 X 内容/);
    assert.match(text, /或指定日期说：补抓 2026-10-11/);
  });
});

test('补抓演练只计划发送 X 已补上消息', async () => {
  const work = await checkout();
  const original = await sample();
  const pending = original
    .replace('x: {"status": "ok"}', 'x: {"status": "pending", "reason": "login-expired"}')
    .replace(/(### X 动态\n)[\s\S]*?(?=### 博客与长文)/, '$1\nX 内容待补充。\n\n');
  await writeDaily(work, pending);
  git(work, 'add', '-A');
  git(work, 'commit', '-q', '-m', 'initial issue');
  git(work, 'push', '-q', 'origin', 'main');
  await writeDaily(work, original);
  const result = publish(work, '--mode', 'backfill');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(messages(result.stdout).map(m => m.kind), ['X 已补上']);
});

test('失败通知演练包含步骤和原因', async () => {
  const work = await checkout();
  const result = run(work, '--date', DATE, '--dry-run', '--mode', 'failure', '--step', '抓取', '--reason', '所有信息源都不可用', '--config', sampleConfig);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /步骤：抓取/);
  assert.match(result.stdout, /原因：所有信息源都不可用/);
});

test('独立机器人按指定 profile 和 union_id 发消息，并保留幂等键', async () => {
  const work = await checkout();
  const bin = join(tmp, `mock-bin-${++count}`);
  const log = join(tmp, `sender-${count}.json`);
  const configFile = join(tmp, `config-${count}.json`);
  await mkdir(bin);
  await writeFile(configFile, JSON.stringify({ feishu: { profile: 'daily-only', receiveUnionId: 'on_sample_receiver' } }));
  await writeFile(join(bin, 'lark-cli'), `#!/usr/bin/env node
require('node:fs').writeFileSync(process.env.AI_DAILY_TEST_LOG, JSON.stringify({ args: process.argv.slice(2), godebug: process.env.GODEBUG }));
`, { mode: 0o755 });
  const args = ['scripts/publish-daily.mjs', '--date', DATE, '--publish', '--mode', 'failure', '--step', '抓取', '--reason', '测试失败', '--config', configFile];
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, AI_DAILY_TEST_LOG: log, GODEBUG: 'existing=1' };
  const result = spawnSync(process.execPath, args, { cwd: work, encoding: 'utf8', env });
  assert.equal(result.status, 0, result.stderr);
  const sent = JSON.parse(await readFile(log, 'utf8'));
  assert.deepEqual(sent.args.slice(0, 5), ['--profile', 'daily-only', 'api', 'POST', '/open-apis/im/v1/messages']);
  assert.equal(sent.args[sent.args.indexOf('--as') + 1], 'bot');
  assert.deepEqual(JSON.parse(sent.args[sent.args.indexOf('--params') + 1]), { receive_id_type: 'union_id' });
  const data = JSON.parse(sent.args[sent.args.indexOf('--data') + 1]);
  assert.equal(data.receive_id, 'on_sample_receiver');
  assert.equal(JSON.parse(data.content).text, `AI 日报 ${DATE} 失败\n步骤：抓取\n原因：测试失败\n请查看 Codex 定时任务记录并处理后重试。`);
  assert.ok(data.uuid.length <= 50);
  assert.equal(sent.godebug, 'existing=1,http2client=0');
  const again = spawnSync(process.execPath, args, { cwd: work, encoding: 'utf8', env });
  assert.equal(again.status, 0, again.stderr);
  assert.equal(JSON.parse(JSON.parse(await readFile(log, 'utf8')).args.at(-1)).uuid, data.uuid);
});

test('真实发布在部署完成后才发私聊，且只推送当期文件', async () => {
  const work = await checkout();
  await writeDaily(work, await sample());
  const bin = join(tmp, `mock-bin-${++count}`);
  const log = join(tmp, `publish-${count}.log`);
  const preload = join(tmp, `fetch-${count}.mjs`);
  await mkdir(bin);
  await writeFile(join(bin, 'gh'), '#!/bin/sh\nif [ "$1" = run ] && [ "$2" = list ]; then sha=$(git rev-parse HEAD); printf "[{\\"databaseId\\":123,\\"headSha\\":\\"%s\\"}]\\n" "$sha"; else printf "deployed\\n" >> "$AI_DAILY_TEST_LOG"; fi\n', { mode: 0o755 });
  await writeFile(join(bin, 'lark-cli'), '#!/bin/sh\nprintf "message\\n" >> "$AI_DAILY_TEST_LOG"\n', { mode: 0o755 });
  await writeFile(preload, 'globalThis.fetch = async () => ({ status: 200 });\n');
  const result = spawnSync(process.execPath, ['scripts/publish-daily.mjs', '--date', DATE, '--publish', '--config', sampleConfig], {
    cwd: work, encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, NODE_OPTIONS: `--import=${preload}`, AI_DAILY_TEST_LOG: log,
      GIT_AUTHOR_NAME: 'test', GIT_AUTHOR_EMAIL: 'test@example.com', GIT_COMMITTER_NAME: 'test', GIT_COMMITTER_EMAIL: 'test@example.com' },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await readFile(log, 'utf8'), 'deployed\nmessage\n');
  assert.match(git(work, 'show', `origin/main:src/content/daily/${DATE}.md`), /样例要点一/);
  assert.equal(git(work, 'show', '--pretty=', '--name-only', 'HEAD').trim(), `src/content/daily/${DATE}.md`);
});

test('真实构建失败只发失败通知，不推送', async () => {
  const work = await checkout();
  await writeDaily(work, (await sample()).replace('## 深读推荐\n', '## 深读推荐\n\n[坏链接](/daily/missing/)\n'));
  const bin = join(tmp, `mock-bin-${++count}`);
  const log = join(tmp, `failure-${count}.log`);
  await mkdir(bin);
  await writeFile(join(bin, 'lark-cli'), '#!/bin/sh\nprintf "failure-message\\n" >> "$AI_DAILY_TEST_LOG"\n', { mode: 0o755 });
  const before = git(work, 'rev-parse', 'origin/main').trim();
  const result = spawnSync(process.execPath, ['scripts/publish-daily.mjs', '--date', DATE, '--publish', '--config', sampleConfig], {
    cwd: work, encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, AI_DAILY_TEST_LOG: log },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /构建失败/);
  assert.equal(await readFile(log, 'utf8'), 'failure-message\n');
  assert.equal(git(work, 'rev-parse', 'origin/main').trim(), before);
});

describe('拒绝发布', () => {
  test('工作区里有这一期以外的改动', async () => {
    const work = await checkout();
    await writeDaily(work, await sample());
    await appendFile(join(work, 'README.md'), '\n意外的改动\n');
    await writeFile(join(work, 'stray.txt'), '没被忽略的新文件\n');
    const run = publish(work);
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /工作区/);
    assert.match(run.stderr, /README\.md/);
    assert.match(run.stderr, /stray\.txt/);
    assert.equal(existsSync(join(work, 'dist')), false);
  });

  test('构建不通过（站点检查发现坏链接）时不给出发布计划', async () => {
    const work = await checkout();
    await writeDaily(work, (await sample()).replace('## 深读推荐\n', '## 深读推荐\n\n[站内坏链接](/daily/not-exist/)\n'));
    const run = publish(work);
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /构建失败/);
    assert.match(run.stderr, /missing \/daily\/not-exist\//);
    assert.doesNotMatch(run.stdout, /git push|飞书消息/);
  });

  test('私有配置读不到', async () => {
    const work = await checkout();
    await writeDaily(work, await sample());
    const result = run(work, '--date', DATE, '--dry-run', '--config', join(work, 'no-such.json'));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /私有配置.*no-such\.json/);
  });

  test('--date 不是真实的 YYYY-MM-DD 日期', async () => {
    const work = await checkout();
    for (const date of ['foo', '2026-02-30', '../../README']) {
      const result = run(work, '--date', date, '--dry-run', '--config', sampleConfig);
      assert.notEqual(result.status, 0, date);
      assert.match(result.stderr, /--date.*YYYY-MM-DD/, date);
    }
  });

  describe('这一期已经推上 origin/main', () => {
    let work;
    before(async () => {
      work = await checkout();
      await writeDaily(work, await sample());
      git(work, 'add', '-A');
      git(work, 'commit', '-q', '-m', 'Publish AI daily 2026-10-11');
      git(work, 'push', '-q', 'origin', 'main');
    });

    test('没有强制时拒绝重复发布', () => {
      const run = publish(work);
      assert.notEqual(run.status, 0);
      assert.match(run.stderr, /2026-10-11.*已经发布过/);
      assert.match(run.stderr, /--force/);
      assert.equal(existsSync(join(work, 'dist')), false);
    });

    test('加 --force 时照常演练', () => {
      const run = publish(work, '--force');
      assert.equal(run.status, 0, run.stderr);
      assert.deepEqual(messages(run.stdout).map(m => m.kind), ['日报']);
    });
  });
});

// 格式不合格：拒绝并说明原因，而且不进入构建
async function rejectsFormat(content, reason) {
  const work = await checkout();
  await writeDaily(work, content);
  const run = publish(work);
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, reason);
  assert.equal(existsSync(join(work, 'dist')), false, '格式不合格时不应该构建');
}

describe('格式不合格的日报', () => {
  test('要点只有 2 条', async () => {
    const content = (await sample()).replace(/^highlights: .*$/m, 'highlights: ["要点一", "要点二"]');
    await rejectsFormat(content, /要点.*3–5 条.*2 条/);
  });

  test('要点有 6 条', async () => {
    const content = (await sample()).replace(/^highlights: .*$/m, 'highlights: ["一", "二", "三", "四", "五", "六"]');
    await rejectsFormat(content, /要点.*3–5 条.*6 条/);
  });

  test('缺「模型与产品发布」板块', async () => {
    const content = (await sample()).replace(/## 模型与产品发布\n[\s\S]*?(?=## 大 V 经验与技术博客)/, '');
    await rejectsFormat(content, /缺少板块.*模型与产品发布/);
  });

  test('「深读推荐」和「口播选题」顺序颠倒', async () => {
    const text = await sample();
    const deep = text.match(/## 深读推荐\n[\s\S]*?(?=## 口播选题)/)[0];
    const content = text.replace(deep, '') + '\n' + deep;
    await rejectsFormat(content, /板块顺序.*GitHub 热门 AI 项目、模型与产品发布、大 V 经验与技术博客、深读推荐、口播选题/);
  });

  test('frontmatter 里的日期和文件名不符', async () => {
    const content = (await sample()).replace('date: "2026-10-11"', 'date: "2026-10-10"');
    await rejectsFormat(content, /日期.*2026-10-10.*2026-10-11/);
  });

  test('缺「博客与长文」小节', async () => {
    const content = (await sample()).replace('### 博客与长文\n', '');
    await rejectsFormat(content, /大 V 经验与技术博客.*X 动态.*博客与长文/);
  });

  test('「X 动态」放到了别的板块下面', async () => {
    const text = await sample();
    const feed = text.match(/### X 动态\n[\s\S]*?(?=### 博客与长文)/)[0];
    const content = text.replace(feed, '').replace('## 模型与产品发布\n', `${feed}## 模型与产品发布\n`);
    await rejectsFormat(content, /大 V 经验与技术博客.*X 动态.*博客与长文/);
  });

  test('frontmatter 有一行不是「键: JSON 值」', async () => {
    const content = (await sample()).replace('title: "AI 日报 2026-10-11"', 'title: AI 日报 2026-10-11');
    await rejectsFormat(content, /frontmatter 第 3 行/);
  });

  test('缺少 x 字段', async () => {
    const content = (await sample()).replace(/^x: .*\n/m, '');
    await rejectsFormat(content, /缺少字段.*x/);
  });

  test('口播选题有 3 个', async () => {
    const t = '{"title": "题", "angle": "角度"}';
    const content = (await sample()).replace(/^topics: .*$/m, `topics: [${t}, ${t}, ${t}]`);
    await rejectsFormat(content, /口播选题.*1–2 个.*3 个/);
  });

  test('深读推荐没有链接', async () => {
    const content = (await sample()).replace('"url": "https://example.com/blog/evaluating-rag", ', '');
    await rejectsFormat(content, /深读推荐.*链接/);
  });

  test('X 状态是 pending，原因却不是 login-expired 或 fetch-failed', async () => {
    const content = (await sample()).replace('x: {"status": "ok"}', 'x: {"status": "pending", "reason": "timeout"}');
    await rejectsFormat(content, /X 状态.*login-expired.*fetch-failed/);
  });

  test('X 状态是 pending，「X 动态」却没有标注待补充', async () => {
    const content = (await sample()).replace('x: {"status": "ok"}', 'x: {"status": "pending", "reason": "login-expired"}');
    await rejectsFormat(content, /X 内容待补充/);
  });

  test('日报文件不存在', async () => {
    const work = await checkout();
    const run = publish(work);
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /找不到.*src\/content\/daily\/2026-10-11\.md/);
  });

  test('「X 动态」没有内容，X 状态又不是 pending', async () => {
    const content = (await sample()).replace(/(### X 动态\n)[\s\S]*?(?=### 博客与长文)/, '$1\n');
    await rejectsFormat(content, /X 动态.*没有内容.*pending/);
  });
});

// v2 仍通过真实 CLI 验证；所有发送与推送都在临时仓库中模拟。
const editorialSample = () => readFile(join(fixtures, 'daily-editorial.md'), 'utf8');
test('精选版少讯日可只刊一条，页面首屏呈现结论和摘要', async () => {
  const work = await checkout();
  await writeDaily(work, await editorialSample());
  const result = publish(work);
  assert.equal(result.status, 0, result.stderr);
  const html = await readFile(join(work, `dist/daily/${DATE}/index.html`), 'utf8');
  assert.ok(html.indexOf('daily-summary') < html.indexOf('id="重点解读"'));
  assert.doesNotMatch(html, /先看这几件事|daily-brief/);
  assert.match(html, /已有调用链应先验证幂等性/);
  assert.doesNotMatch(html, /docs-sidebar/);
  assert.doesNotMatch(messages(result.stdout)[0].text, /口播选题/);
  const archive = await readFile(join(work, 'dist/daily/index.html'), 'utf8');
  assert.match(archive, /先验证工具调用，再考虑迁移 agent/);
  assert.match(archive, /一次接口更新，如何转成有证据/);
});

test('精选版拒绝没有原始证据、重复事件和缺覆盖记录的日报', async () => {
  const source = await editorialSample();
  await rejectsFormat(source.replace('[虚构的官方 release，仅作格式演示](https://example.com/agent/releases/v1)', '虚构的官方 release'), /缺少.*证据|缺少原始证据/);
  const story = source.match(/### 工具重试[\s\S]*?(?=## 工具与实践)/)[0];
  await rejectsFormat(source.replace('## 工具与实践', `## 工具与实践\n\n${story}\n`), /重复事件或 URL/);
  await rejectsFormat(source.replace(/^coverage: .*$/m, 'coverage: []'), /coverage/);
  await rejectsFormat(source.replace('2026-10-10T08:00:00+08:00', '2026-10-12T08:00:00+08:00'), /采集窗口/);
});

test('精选版 X 补抓仍只能更改 X 状态和文末 X 小节', async () => {
  const work = await checkout();
  const original = await editorialSample();
  const pending = original.replace('x: {"status":"ok"}', 'x: {"status":"pending","reason":"fetch-failed"}');
  await writeDaily(work, pending);
  git(work, 'add', '-A'); git(work, 'commit', '-q', '-m', 'pending editorial'); git(work, 'push', '-q', 'origin', 'main');
  await writeDaily(work, original);
  assert.equal(publish(work, '--mode', 'backfill').status, 0);
  await writeDaily(work, original.replace('虚构的样例框架增加按工具配置重试的接口', '虚构的样例框架增加按工具配置重试的开关'));
  const rejected = publish(work, '--mode', 'backfill');
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /补抓只能改/);
});
