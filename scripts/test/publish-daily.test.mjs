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

  test('提醒写明补抓的两种触发方式', () => {
    const text = messages(run.stdout)[1].text;
    assert.match(text, /「补抓 X」/);
    assert.match(text, /任意.*会话.*补抓 2026-10-11/);
  });
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
