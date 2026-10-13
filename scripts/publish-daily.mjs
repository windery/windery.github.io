// AI 日报发布命令。真实模式只在显式传入 --publish 时启用。
import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const SITE = 'https://windery.github.io';
const root = resolve(import.meta.dirname, '..');
const fail = (message) => { console.error(message); process.exit(1); };

const { values } = parseArgs({ options: {
  date: { type: 'string' },
  config: { type: 'string' },
  'dry-run': { type: 'boolean', default: false },
  publish: { type: 'boolean', default: false },
  mode: { type: 'string', default: 'daily' },
  step: { type: 'string' },
  reason: { type: 'string' },
  force: { type: 'boolean', default: false },
} });
if (values['dry-run'] === values.publish) fail('请选择 --dry-run 或 --publish，且只能选一个。');
if (!['daily', 'backfill', 'failure'].includes(values.mode)) fail('--mode 要是 daily、backfill 或 failure。');
const date = values.date ?? '';
// 解析后格式化回来还是原样，才是真实日期（2026-02-30 会被进位成 03-02）
const day = Date.parse(`${date}T00:00:00Z`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(day) || !new Date(day).toISOString().startsWith(date)) fail(`--date 要是真实的 YYYY-MM-DD 日期，现在是 ${JSON.stringify(values.date)}。`);
const file = `src/content/daily/${date}.md`;

const configPath = values.config ? resolve(values.config) : join(root, 'ai-daily.local.json');
const config = await readFile(configPath, 'utf8').then(JSON.parse).catch(e => fail(`读不到私有配置 ${configPath}：${e.message}`));
const receiver = config.feishu.receiveOpenId;
if (!/^ou_[A-Za-z0-9_]+$/.test(receiver ?? '')) fail('私有配置的飞书接收人 ID 无效。');

const run = (command, args, options = {}) => execFileSync(command, args, {
  cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options,
});
const send = (kind, message) => run('lark-cli', [
  'im', '+messages-send', '--as', 'bot', '--user-id', receiver,
  '--idempotency-key', `ai-daily-${date}-${kind}-${createHash('sha256').update(message).digest('hex').slice(0, 10)}`, '--text', message,
]);
if (values.mode === 'failure') {
  if (!values.step || !values.reason) fail('--mode failure 需要 --step 和 --reason。');
  const message = `AI 日报 ${date} 失败\n步骤：${values.step}\n原因：${values.reason}\n请查看 Codex 定时任务记录并处理后重试。`;
  if (values['dry-run']) console.log(`演练模式：飞书失败通知\n${message}`);
  else try { send('failure', message); console.log('失败通知已发出。'); }
    catch { fail('飞书失败通知发送失败，请检查 lark-cli 机器人登录和接收人。'); }
  process.exit(0);
}
const abort = (step, reason) => {
  if (values.publish) {
    try { send('failure', `AI 日报 ${date} 失败\n步骤：${step}\n原因：${reason}\n请查看 Codex 定时任务记录并处理后重试。`); }
    catch { console.error('飞书失败通知也未能发出，请检查 lark-cli 机器人登录。'); }
  }
  fail(reason);
};

const FIELDS = ['date', 'title', 'windowStart', 'windowEnd', 'generatedAt', 'highlights', 'topics', 'deepRead', 'x'];
const SECTIONS = ['GitHub 热门 AI 项目', '模型与产品发布', '大 V 经验与技术博客', '深读推荐', '口播选题'];
const X_PENDING_MARK = 'X 内容待补充';
const X_REASONS = {
  'login-expired': 'X 登录已失效（login-expired）：抓取时未认证，或 cookie 被拒绝',
  'fetch-failed': 'X 抓取失败（fetch-failed）：不是登录问题，可以先直接补抓，仍然失败再按下面的步骤重新登录',
};

const raw = await readFile(join(root, file), 'utf8').catch(() => fail(`找不到日报文件 ${file}。`));
const head = raw.match(/^---\n([\s\S]*?)\n---\n/);
if (!head) fail(`日报格式不合格（${file}），没有构建：\n- 开头没有用 --- 包起来的 frontmatter`);
const body = raw.slice(head[0].length);
const problems = [];

// frontmatter 每行一个字段「键: JSON 值」，和项目导入脚本写出的格式一样
const front = {}, broken = new Set();
head[1].split('\n').forEach((line, i) => {
  if (!line.trim()) return;
  const m = line.match(/^(\w+):\s*(.*)$/);
  try { front[m[1]] = JSON.parse(m[2]); }
  catch { if (m) broken.add(m[1]); problems.push(`frontmatter 第 ${i + 2} 行不是「键: JSON 值」：${line}`); }
});
const absent = FIELDS.filter(k => !(k in front) && !broken.has(k));
if (absent.length) problems.push(`缺少字段：${absent.join('、')}`);

const nonEmpty = v => typeof v === 'string' && v.trim() !== '';
const has = k => k in front;
if (has('date') && front.date !== date) problems.push(`日期 ${front.date} 和文件名 ${date} 不符`);
if (has('title') && !nonEmpty(front.title)) problems.push('标题不能为空');
for (const k of ['windowStart', 'windowEnd', 'generatedAt']) if (has(k) && !(nonEmpty(front[k]) && !Number.isNaN(Date.parse(front[k])))) problems.push(`${k} 要是 ISO 时间，现在是 ${JSON.stringify(front[k])}`);
if (has('highlights')) {
  const h = front.highlights;
  if (!Array.isArray(h) || !h.every(nonEmpty)) problems.push('要点要是一组文字');
  else if (h.length < 3 || h.length > 5) problems.push(`要点要 3–5 条，现在是 ${h.length} 条`);
}
if (has('topics')) {
  const t = front.topics;
  if (!Array.isArray(t) || !t.every(x => nonEmpty(x?.title) && nonEmpty(x?.angle))) problems.push('口播选题每个都要有 title 和 angle');
  else if (t.length < 1 || t.length > 2) problems.push(`口播选题要 1–2 个，现在是 ${t.length} 个`);
}
if (has('deepRead')) {
  const d = front.deepRead;
  if (!(nonEmpty(d?.title) && /^https?:\/\//.test(d?.url ?? '') && nonEmpty(d?.reason))) problems.push('深读推荐要有标题、链接（http 或 https）和理由');
}

const sections = [...body.matchAll(/^## (.+)$/gm)].map(m => m[1].trim());
const missing = SECTIONS.filter(s => !sections.includes(s));
if (missing.length) problems.push(`缺少板块：${missing.join('、')}`);
else if (sections.join('、') !== SECTIONS.join('、')) problems.push(`板块顺序要是：${SECTIONS.join('、')}；现在是：${sections.join('、')}`);

// 「大 V 经验与技术博客」下面固定两个小节，「X 动态」只认这一节里的
const SUBSECTIONS = ['X 动态', '博客与长文'];
const voices = body.match(/^## 大 V 经验与技术博客[ \t]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1];
const subsections = [...(voices ?? '').matchAll(/^### (.+)$/gm)].map(m => m[1].trim());
if (voices !== undefined && subsections.join('、') !== SUBSECTIONS.join('、')) problems.push(`「大 V 经验与技术博客」下要依次是「X 动态」「博客与长文」两个小节；现在是：${subsections.join('、') || '没有小节'}`);
const xFeed = (voices ?? '').match(/^### X 动态[ \t]*\n([\s\S]*?)(?=^### |(?![\s\S]))/m)?.[1].trim() ?? '';
if (has('x')) {
  const { status, reason } = front.x ?? {};
  if (status === 'ok') { if (!xFeed) problems.push('「X 动态」小节没有内容。抓取失败时要把 X 状态写成 pending 并注明原因'); }
  else if (status === 'pending') {
    if (!(reason in X_REASONS)) problems.push(`X 状态是 pending 时，原因要是 login-expired 或 fetch-failed，现在是 ${JSON.stringify(reason)}`);
    if (!xFeed.includes(X_PENDING_MARK)) problems.push(`X 状态是 pending，「X 动态」小节里要写明「${X_PENDING_MARK}」`);
  }
  else problems.push(`X 状态要是 ok 或 pending，现在是 ${JSON.stringify(status)}`);
}
if (problems.length) abort('校验格式', `日报格式不合格（${file}），没有构建：\n${problems.map(p => `- ${p}`).join('\n')}`);

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
if (values.publish) {
  try { git('fetch', 'origin'); }
  catch { abort('更新远端状态', 'git fetch origin 失败。'); }
  if (git('rev-parse', 'HEAD').trim() !== git('rev-parse', 'origin/main').trim()) {
    abort('检查分支', '专用 clone 的 HEAD 与 origin/main 不一致，请先同步再发布。');
  }
}
// origin/main 里已经有这一期，就算发布过
const published = spawnSync('git', ['cat-file', '-e', `origin/main:${file}`], { cwd: root }).status === 0;
if (values.mode === 'daily' && published && !values.force) fail(`${date} 这一期已经发布过（origin/main 里已有 ${file}），拒绝重复发布。确实要重新发布，加 --force。`);
if (values.mode === 'backfill' && !published) abort('检查补抓目标', `${date} 这一期尚未发布，不能补抓。`);
if (values.mode === 'backfill' && front.x.status !== 'ok') abort('检查补抓内容', '补抓后的 X 状态必须是 ok。');
if (values.mode === 'backfill') {
  const previous = git('show', `origin/main:${file}`);
  if (!/^x: .*"status"\s*:\s*"pending"/m.test(previous)) abort('检查补抓目标', '线上这一期的 X 状态不是 pending，无需补抓。');
  const withoutX = text => text.replace(/^x: .*$/m, '').replace(/(### X 动态\n)[\s\S]*?(?=### 博客与长文)/m, '$1');
  if (withoutX(previous) !== withoutX(raw)) abort('检查补抓内容', '补抓只能改 x 状态和「X 动态」小节。');
}
const others = git('status', '--porcelain=v1', '-z', '--untracked-files=all', '--no-renames').split('\0').filter(Boolean).map(e => e.slice(3)).filter(p => p !== file);
if (others.length) abort('检查工作区', `工作区里除了 ${file} 还有别的改动，拒绝发布：\n${others.map(p => `- ${p}`).join('\n')}`);

// 构建输出走 stderr，stdout 只留发布计划
try { execFileSync('npm', ['run', 'build'], { cwd: root, stdio: ['ignore', 2, 2] }); }
catch { abort('构建', '构建失败（npm run build），没有发布。原因见上面的构建输出。'); }

const url = `${SITE}/daily/${date}/`;
const dailyMessage = [
  `AI 日报 ${date}`,
  '',
  '今日要点',
  ...front.highlights.map((h, i) => `${i + 1}. ${h}`),
  '',
  '口播选题',
  ...front.topics.map(t => `· ${t.title}\n  切入角度：${t.angle}`),
  '',
  `阅读全文：${url}`,
].join('\n');
const messages = values.mode === 'backfill'
  ? [{ kind: 'X 已补上', text: `AI 日报 ${date} 的 X 内容已补上：${url}` }]
  : [{ kind: '日报', text: dailyMessage }];

if (values.mode === 'daily' && front.x.status === 'pending') {
  const { service, authTokenAccount, ct0Account } = config.x.keychain;
  messages.push({ kind: 'X 失效提醒', text: [
    `AI 日报 ${date}：X 内容待补充`,
    '',
    `原因：${X_REASONS[front.x.reason]}。本期其他板块已照常发布：${url}`,
    '',
    '重新登录步骤：',
    '1. 在浏览器里重新登录 x.com。',
    '2. 用 Cookie-Editor 复制 auth_token 的值，在终端运行：',
    `security add-generic-password -U -s ${service} -a ${authTokenAccount} -w "$(pbpaste)"`,
    '3. 用同样的方式复制 ct0 的值，运行：',
    `security add-generic-password -U -s ${service} -a ${ct0Account} -w "$(pbpaste)"`,
    '4. 清空剪贴板：pbcopy < /dev/null',
    '不要用终端的隐藏输入（-w 后面不跟值），它最多只收 128 个字符，而 ct0 有 160 个字符。',
    '',
    '补抓方法（任选一种）：',
    '· 在 Codex 桌面 app 里运行「补抓 X」任务',
    `· 在这个项目的 Codex 会话里说：补抓 ${date} 的 X 内容`,
  ].join('\n') });
}

if (values['dry-run']) {
  console.log(`演练模式：校验和构建已真实执行，下面的步骤只打印，不执行。

1. 提交，只提交这一期的日报文件：
   git add -- ${file}
   git commit -m "${values.mode === 'backfill' ? 'Backfill X in AI daily' : 'Publish AI daily'} ${date}" -- ${file}
2. 推送：git push origin main
3. 等部署：找到这次提交触发的 Pages 部署（Publish learning site），等它成功
4. 发飞书私聊，机器人身份，接收人 ${receiver}，共 ${messages.length} 条，每条：
   lark-cli im +messages-send --as bot --user-id ${receiver} --text <消息全文>
`);
  messages.forEach((m, i) => console.log(`----- 飞书消息 ${i + 1}/${messages.length}：${m.kind} -----\n${m.text}\n`));
  process.exit(0);
}

const changed = git('status', '--porcelain=v1', '--', file).trim() !== '';
if (!changed) abort('提交', `${file} 没有待发布的改动。`);
try {
  git('add', '--', file);
  git('commit', '-m', `${values.mode === 'backfill' ? 'Backfill X in AI daily' : 'Publish AI daily'} ${date}`, '--', file);
} catch { abort('提交', `只提交 ${file} 失败。`); }
const sha = git('rev-parse', 'HEAD').trim();
try { git('push', 'origin', 'main'); }
catch { abort('推送', `提交 ${sha} 未能推送到 origin/main。`); }

let runId;
for (let attempt = 0; attempt < 20 && !runId; attempt++) {
  try {
    const runs = JSON.parse(run('gh', ['run', 'list', '--repo', 'windery/windery.github.io', '--workflow', 'deploy.yml', '--commit', sha, '--json', 'databaseId,headSha,status,conclusion', '--limit', '5']));
    runId = runs.find(item => item.headSha === sha)?.databaseId;
  } catch { /* GitHub may not have indexed the new run yet. */ }
  if (!runId) await new Promise(resolve => setTimeout(resolve, 3000));
}
if (!runId) abort('等待部署', `找不到提交 ${sha} 对应的 Pages 部署。`);
const watched = spawnSync('gh', ['run', 'watch', String(runId), '--repo', 'windery/windery.github.io', '--exit-status', '--interval', '5'], { cwd: root, encoding: 'utf8', timeout: 15 * 60 * 1000 });
if (watched.status !== 0) abort('等待部署', `Pages 部署 ${runId} 未成功，请查看该 GitHub Actions 运行。`);

let reachable = false;
for (let attempt = 0; attempt < 20 && !reachable; attempt++) {
  try { reachable = (await fetch(url, { signal: AbortSignal.timeout(10000) })).status === 200; }
  catch { /* Wait for Pages propagation. */ }
  if (!reachable) await new Promise(resolve => setTimeout(resolve, 3000));
}
if (!reachable) abort('检查页面', `部署 ${runId} 成功，但 ${url} 尚未返回 200。`);
for (const [index, message] of messages.entries()) {
  try { send(values.mode === 'backfill' ? 'backfill' : `message-${index + 1}`, message.text); }
  catch { abort('发送飞书', `第 ${index + 1} 条飞书私聊发送失败。`); }
}
console.log(`已发布：${url}\n提交：${sha}\nPages 部署：${runId}\n飞书消息：${messages.length} 条`);
