// AI 日报发布命令。真实模式只在显式传入 --publish 时启用。
import { parseArgs } from 'node:util';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
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
const receiver = config.feishu.receiveUnionId ?? config.feishu.receiveOpenId;
const receiverType = config.feishu.receiveUnionId ? 'union_id' : 'open_id';
if (!(receiverType === 'union_id' ? /^on_[A-Za-z0-9_]+$/ : /^ou_[A-Za-z0-9_]+$/).test(receiver ?? '')) fail('私有配置的飞书接收人 ID 无效。');
const profileArgs = config.feishu.profile ? ['--profile', config.feishu.profile] : [];

const run = (command, args, options = {}) => execFileSync(command, args, {
  cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options,
});
const send = (kind, message) => {
  const key = `ai-daily-${date}-${kind}-${createHash('sha256').update(message).digest('hex').slice(0, 10)}`;
  const args = receiverType === 'union_id'
    ? ['api', 'POST', '/open-apis/im/v1/messages', '--as', 'bot', '--params', JSON.stringify({ receive_id_type: receiverType }),
      '--data', JSON.stringify({ receive_id: receiver, msg_type: 'text', content: JSON.stringify({ text: message }), uuid: key })]
    : ['im', '+messages-send', '--as', 'bot', '--user-id', receiver, '--idempotency-key', key, '--text', message];
  return run('lark-cli', [...profileArgs, ...args], {
    env: { ...process.env, GODEBUG: [process.env.GODEBUG, 'http2client=0'].filter(Boolean).join(',') },
  });
};
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

// 四篇拆分：日期目录下 _issue.md + 若干篇独立文章。
const issueDir = join(root, 'src/content/daily', date);
if (existsSync(issueDir)) {
  const names = ['_issue.md', ...(await readdir(issueDir)).filter(name => name.endsWith('.md') && name !== '_issue.md').sort()];
  const targets = names.map(name => `src/content/daily/${date}/${name}`);
  const issuePath = targets[0];
  const parse = raw => {
    const head = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!head) fail(`日报格式不合格（${issuePath}），没有构建：\n- 开头没有用 --- 包起来的 frontmatter`);
    const data = {};
    for (const line of head[1].split('\n')) {
      if (!line.trim()) continue;
      const pair = line.match(/^(\w+):\s*(.*)$/);
      try { data[pair[1]] = JSON.parse(pair[2]); }
      catch { fail(`frontmatter 不是「键: JSON 值」：${line}`); }
    }
    return { data, body: head[2] };
  };
  const issueRaw = await readFile(join(root, issuePath), 'utf8');
  const issue = parse(issueRaw);
  const editions = [];
  for (const name of names.slice(1)) {
    const raw = await readFile(join(root, `src/content/daily/${date}/${name}`), 'utf8');
    editions.push({ name, slug: name.replace(/\.md$/, ''), ...parse(raw) });
  }
  try { run(process.execPath, ['scripts/check-daily.mjs']); }
  catch (error) { abort('校验格式', `日报格式不合格（${date}/）：\n${error.stderr?.toString() || error.message}`); }

  const published = spawnSync('git', ['cat-file', '-e', `origin/main:${issuePath}`], { cwd: root }).status === 0;
  if (values.mode === 'daily' && published && !values.force) fail(`${date} 这一期已经发布过（origin/main 里已有 ${issuePath}），拒绝重复发布。确实要重新发布，加 --force。`);
  if (values.mode === 'backfill' && !published) abort('检查补抓目标', `${date} 这一期尚未发布，不能补抓。`);
  if (values.mode === 'backfill') {
    const previous = run('git', ['show', `origin/main:${issuePath}`]);
    if (!/^x: .*"status"\s*:\s*"pending"/m.test(previous)) abort('检查补抓目标', '线上这一期的 X 状态不是 pending，无需补抓。');
    if (issue.data.x?.status !== 'ok') abort('检查补抓内容', '补抓后的 X 状态必须是 ok。');
    const withoutX = text => text.replace(/^x: .*$/m, '').replace(/^coverage: .*$/m, '');
    if (withoutX(previous) !== withoutX(issueRaw)) abort('检查补抓内容', '补抓只能改 x 状态和 coverage 的 X 记录。');
  }

  if (values.publish) {
    try { run('git', ['fetch', 'origin']); }
    catch { abort('更新远端状态', 'git fetch origin 失败。'); }
    if (run('git', ['rev-parse', 'HEAD']).trim() !== run('git', ['rev-parse', 'origin/main']).trim()) abort('检查分支', '专用 clone 的 HEAD 与 origin/main 不一致，请先同步再发布。');
  }
  const others = run('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--no-renames']).split('\0').filter(Boolean).map(item => item.slice(3)).filter(path => !targets.includes(path));
  if (others.length) abort('检查工作区', `工作区里除了这一期还有别的改动，拒绝发布：\n${others.map(path => `- ${path}`).join('\n')}`);

  try { execFileSync('npm', ['run', 'build'], { cwd: root, stdio: ['ignore', 2, 2] }); }
  catch { abort('构建', '构建失败（npm run build），没有发布。原因见上面的构建输出。'); }

  const url = `${SITE}/daily/${date}/`;
  const links = editions.map(edition => `· ${edition.data.label}：${edition.data.title}\n  ${SITE}/daily/${date}/${edition.slug}/`).join('\n');
  const dailyMessage = [`AI 日报 ${date}`, '', '今日要点', ...issue.data.highlights.map((item, index) => `${index + 1}. ${item}`), '', '本期文章', links, '', `当日入口：${url}`].join('\n');
  const messages = values.mode === 'backfill' ? [{ kind: 'X 已补上', text: `AI 日报 ${date} 的 X 内容已补上：${url}` }] : [{ kind: '日报', text: dailyMessage }];

  if (values['dry-run']) {
    console.log(`演练模式：校验和构建已真实执行，下面的步骤只打印，不执行。\n\n1. 提交，只提交这一期的文件：\n   git add -- ${targets.join(' ')}\n   git commit -m "${values.mode === 'backfill' ? 'Backfill X in AI daily' : 'Publish AI daily'} ${date}"\n2. 推送：git push origin main\n3. 等部署：找到这次提交触发的 Pages 部署（Publish learning site），等它成功\n4. 发飞书私聊，机器人身份，接收人 ${receiver}，共 ${messages.length} 条，每条：\n   lark-cli ${profileArgs.join(' ')} ${receiverType === 'union_id' ? 'api POST /open-apis/im/v1/messages (receive_id_type=union_id)' : 'im +messages-send'} --as bot <接收人及消息全文>\n`);
    messages.forEach((message, index) => console.log(`----- 飞书消息 ${index + 1}/${messages.length}：${message.kind} -----\n${message.text}\n`));
    process.exit(0);
  }

  const changed = run('git', ['status', '--porcelain=v1', '--', ...targets]).trim() !== '';
  if (!changed) abort('提交', `${date} 这一期没有待发布的改动。`);
  try {
    run('git', ['add', '--', ...targets]);
    run('git', ['commit', '-m', `${values.mode === 'backfill' ? 'Backfill X in AI daily' : 'Publish AI daily'} ${date}`, '--', ...targets]);
  } catch { abort('提交', `只提交 ${date} 这一期失败。`); }
  const sha = run('git', ['rev-parse', 'HEAD']).trim();
  try { run('git', ['push', 'origin', 'main']); }
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
    try { reachable = (await fetch(`${url}?v=${sha}`, { signal: AbortSignal.timeout(10000) })).status === 200; }
    catch { /* Wait for Pages propagation. */ }
    if (!reachable) await new Promise(resolve => setTimeout(resolve, 3000));
  }
  if (!reachable) abort('检查页面', `部署 ${runId} 成功，但 ${url} 尚未返回 200。`);
  for (const [index, message] of messages.entries()) {
    try { send(values.mode === 'backfill' ? 'backfill' : `message-${index + 1}`, message.text); }
    catch { abort('发送飞书', `第 ${index + 1} 条飞书私聊发送失败。`); }
  }
  console.log(`已发布：${url}\n提交：${sha}\nPages 部署：${runId}\n飞书消息：${messages.length} 条`);
  process.exit(0);
}


const FIELDS = ['date', 'title', 'windowStart', 'windowEnd', 'generatedAt', 'highlights', 'topics', 'deepRead', 'x'];
const LEGACY_SECTIONS = ['GitHub 热门 AI 项目', '模型与产品发布', '大 V 经验与技术博客', '深读推荐', '口播选题'];
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
const editorial = front.editorialVersion === 2;
if (has('editorialVersion') && !editorial) problems.push('editorialVersion 只支持 2，旧版请省略');
if (editorial && !nonEmpty(front.summary)) problems.push('精选版需要 summary');
const start = Date.parse(front.windowStart), end = Date.parse(front.windowEnd);
if (Number.isFinite(start) && Number.isFinite(end) && (start >= end || end-start > 72*3600000)) problems.push('采集窗口要正向且不超过 72 小时');
if (has('date') && front.date !== date) problems.push(`日期 ${front.date} 和文件名 ${date} 不符`);
if (has('title') && !nonEmpty(front.title)) problems.push('标题不能为空');
for (const k of ['windowStart', 'windowEnd', 'generatedAt']) if (has(k) && !(nonEmpty(front[k]) && !Number.isNaN(Date.parse(front[k])))) problems.push(`${k} 要是 ISO 时间，现在是 ${JSON.stringify(front[k])}`);
if (has('highlights')) {
  const h = front.highlights;
  if (!Array.isArray(h) || !h.every(nonEmpty)) problems.push('要点要是一组文字');
  else if (editorial ? (h.length < 1 || h.length > 3) : (h.length < 3 || h.length > 5)) problems.push(`要点要 ${editorial ? '1–3' : '3–5'} 条，现在是 ${h.length} 条`);
}
if (has('topics')) {
  const t = front.topics;
  if (!Array.isArray(t) || !t.every(x => nonEmpty(x?.title) && nonEmpty(x?.angle))) problems.push('口播选题每个都要有 title 和 angle');
  else if (t.length < (editorial ? 0 : 1) || t.length > 2) problems.push(`口播选题要 1–2 个，现在是 ${t.length} 个`);
}
if (has('deepRead')) {
  const d = front.deepRead;
  if (!(editorial && d === null) && !(nonEmpty(d?.title) && /^https?:\/\//.test(d?.url ?? '') && nonEmpty(d?.reason))) problems.push('深读推荐要有标题、链接（http 或 https）和理由');
}

const sections = [...body.matchAll(/^## (.+)$/gm)].map(m => m[1].trim());
const EDITORIAL_SECTIONS = ['重点解读', '工具与实践', '简讯', '深读推荐', '采集说明'];
const SECTIONS = editorial ? EDITORIAL_SECTIONS : LEGACY_SECTIONS;
const required = editorial ? ['重点解读'] : SECTIONS;
const missing = required.filter(s => !sections.includes(s));
if (missing.length) problems.push(`缺少板块：${missing.join('、')}`);
if (sections.join('、') !== SECTIONS.filter(s => sections.includes(s)).join('、')) problems.push(`板块顺序要是：${SECTIONS.join('、')}；现在是：${sections.join('、')}`);
if (editorial) {
  if (front.deepRead && !sections.includes('深读推荐')) problems.push('deepRead 与深读推荐正文不一致');
  if (/\*\*(变化|影响|建议|限制|证据|发布时间)[：:]\*\*/.test(body)) problems.push('新版正文不要使用「变化/影响/建议/限制/证据/发布时间」字段表');
  if (/本地审阅稿|\*\*编辑判断：\*\*/.test(body)) problems.push('读者正文不要出现「本地审阅稿」或「编辑判断：」');
  const coverage = front.coverage;
  if (!Array.isArray(coverage) || !coverage.length || !coverage.every(c => nonEmpty(c?.source) && ['ok','failed','paused'].includes(c?.status) && nonEmpty(c?.note))) problems.push('coverage 要逐源记录 source、status（ok/failed/paused）和 note');
  const seen = new Set();
  let items = 0;
  for (const section of ['重点解读','工具与实践','简讯']) {
    const content = body.match(new RegExp(`^## ${section}[ \\t]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'))?.[1] ?? '';
    const stories = [...content.matchAll(/^### (.+)\n([\s\S]*?)(?=^### |(?![\s\S]))/gm)];
    if (section === '重点解读' && (!stories.length || stories.length > 3)) problems.push('重点解读要有 1–3 条 H3 条目');
    for (const story of stories) {
      items++;
      const text = story[2];
      const paragraphs = text.split(/\n\s*\n/).filter(par => par.trim() && !par.trim().startsWith('<!--'));
      if (!paragraphs.length) problems.push(`「${story[1]}」没有正文段落`);
      const evidence = text.match(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/)?.[1];
      const event = text.match(/<!-- event: ([a-z0-9][a-z0-9-]+) -->/)?.[1];
      if (!event) problems.push(`「${story[1]}」缺少稳定事件 ID（<!-- event: slug -->）`);
      if (!evidence) problems.push(`「${story[1]}」缺少原始证据链接`);
      for (const key of [event && `event:${event}`, evidence && `url:${canonicalUrl(evidence)}`].filter(Boolean)) {
        if (seen.has(key)) problems.push(`重复事件或 URL：${key}`);
        seen.add(key);
      }
    }
  }
  if (!items) problems.push('精选版至少需要一个有证据的条目');
}
function canonicalUrl(value) {
  const url = new URL(value); url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (/^utm_|^(source|ref)$/i.test(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  return url.href.replace(/\/$/, '');
}

// 「大 V 经验与技术博客」下面固定两个小节，「X 动态」只认这一节里的
const SUBSECTIONS = ['X 动态', '博客与长文'];
const voices = editorial ? body.match(/^## 采集说明[ \t]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1] : body.match(/^## 大 V 经验与技术博客[ \t]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1];
const subsections = [...(voices ?? '').matchAll(/^### (.+)$/gm)].map(m => m[1].trim());
if (!editorial && voices !== undefined && subsections.join('、') !== SUBSECTIONS.join('、')) problems.push(`「大 V 经验与技术博客」下要依次是「X 动态」「博客与长文」两个小节；现在是：${subsections.join('、') || '没有小节'}`);
const xFeed = (voices ?? '').match(/^### X 动态[ \t]*\n([\s\S]*?)(?=^### |(?![\s\S]))/m)?.[1].trim() ?? '';
if (has('x')) {
  const { status, reason } = front.x ?? {};
  if (!['ok','pending'].includes(status)) problems.push(`X 状态要是 ok 或 pending，现在是 ${JSON.stringify(status)}`);
  if (status === 'pending' && !(reason in X_REASONS)) problems.push(`X 状态是 pending 时，原因要是 login-expired 或 fetch-failed，现在是 ${JSON.stringify(reason)}`);
  if (!editorial && status === 'ok' && !xFeed) problems.push('「X 动态」小节没有内容。抓取失败时要把 X 状态写成 pending 并注明原因');
  if (!editorial && status === 'pending' && !xFeed.includes(X_PENDING_MARK)) problems.push(`X 状态是 pending，「X 动态」小节里要写明「${X_PENDING_MARK}」`);
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
  const withoutX = text => text.replace(/^x: .*$/m, '').replace(/(### X 动态[ \t]*\n)[\s\S]*?(?=^### |^## |(?![\s\S]))/m, '$1');
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
  ...(front.topics.length ? ['口播选题', ...front.topics.map(t => `· ${t.title}\n  切入角度：${t.angle}`)] : []),
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
    '补抓方法：',
    '· 在 Codex 桌面 app 的学习站项目会话里说：补抓最近一期的 X 内容',
    `· 或指定日期说：补抓 ${date} 的 X 内容`,
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
   lark-cli ${profileArgs.join(' ')} ${receiverType === 'union_id' ? 'api POST /open-apis/im/v1/messages (receive_id_type=union_id)' : 'im +messages-send'} --as bot <接收人及消息全文>
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
