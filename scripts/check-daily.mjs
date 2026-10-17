// 构建前检查日报源文件：兼容旧合刊，校验新格式的 _issue.md 与四篇独立文章。
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dailyDir = join(root, 'src/content/daily');
const errors = [];
const kinds = new Set(['news', 'tools', 'method', 'topics']);
const nonEmpty = value => typeof value === 'string' && value.trim() !== '';

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { error: '没有 --- 包起来的 frontmatter' };
  const data = {};
  for (const line of match[1].split('\n')) {
    if (!line.trim()) continue;
    const pair = line.match(/^(\w+):\s*(.*)$/);
    if (!pair) return { error: `frontmatter 行不是「键: JSON 值」：${line}` };
    try { data[pair[1]] = JSON.parse(pair[2]); }
    catch { return { error: `frontmatter 不是 JSON：${pair[1]}` }; }
  }
  return { data, body: match[2] };
}

function validateIssueMeta(name, data, body) {
  if (!nonEmpty(data.summary)) errors.push(`${name}: 缺少 summary`);
  if (!Array.isArray(data.highlights) || data.highlights.length < 1 || data.highlights.length > 3) errors.push(`${name}: highlights 要 1–3 条`);
  else if (!data.highlights.every(nonEmpty)) errors.push(`${name}: highlights 有空项`);
  if (!Array.isArray(data.tags) || data.tags.length < 2 || data.tags.length > 3 || !data.tags.every(nonEmpty)) errors.push(`${name}: tags 要 2–3 个`);
  if (!['ok', 'pending'].includes(data.x?.status)) errors.push(`${name}: x.status 要 ok 或 pending`);
  if (!Array.isArray(data.coverage) || !data.coverage.length || !data.coverage.every(item => nonEmpty(item?.source) && ['ok', 'failed', 'paused'].includes(item?.status) && nonEmpty(item?.note))) errors.push(`${name}: coverage 要逐源记录 source/status/note`);
  if (/\*\*(变化|影响|建议|限制|证据|发布时间)[：:]\*\*/.test(body)) errors.push(`${name}: 正文使用了字段表`);
  if (/本地审阅稿|\*\*编辑判断：\*\*/.test(body)) errors.push(`${name}: 出现「本地审阅稿」或「编辑判断：」`);
}

function validateEdition(name, data, body, date, slug) {
  if (data.date !== date) errors.push(`${name}: date 与目录不符`);
  if (data.slug !== slug) errors.push(`${name}: slug 与文件名不符`);
  if (!kinds.has(data.kind)) errors.push(`${name}: kind 要是 news/tools/method/topics`);
  if (!nonEmpty(data.label)) errors.push(`${name}: 缺少 label`);
  if (!nonEmpty(data.title)) errors.push(`${name}: 缺少 title`);
  if (!nonEmpty(data.summary)) errors.push(`${name}: 缺少 summary`);
  if (!Number.isInteger(data.order)) errors.push(`${name}: order 要是整数`);
  if (data.tags !== undefined && (!Array.isArray(data.tags) || !data.tags.every(nonEmpty))) errors.push(`${name}: tags 要是一组文字`);
  if (/\*\*(变化|影响|建议|限制|证据|发布时间)[：:]\*\*/.test(body)) errors.push(`${name}: 正文使用了字段表`);
  if (/本地审阅稿|\*\*编辑判断：\*\*/.test(body)) errors.push(`${name}: 出现「本地审阅稿」或「编辑判断：」`);
  if (!/\[[^\]]+\]\(https?:\/\/[^)]+\)/.test(body)) errors.push(`${name}: 正文没有原文链接`);
}

const entries = (await readdir(dailyDir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
let issueCount = 0;
let editionCount = 0;

for (const entry of entries) {
  if (entry.isFile() && entry.name.endsWith('.md')) {
    const name = entry.name;
    const raw = await readFile(join(dailyDir, name), 'utf8');
    const parsed = parseFrontmatter(raw);
    if (parsed.error) { errors.push(`${name}: ${parsed.error}`); continue; }
    const date = name.replace(/\.md$/, '');
    if (parsed.data.date !== date) errors.push(`${name}: date 与文件名不符`);
    if (!nonEmpty(parsed.data.title)) errors.push(`${name}: 缺少 title`);
    issueCount++;
    continue;
  }
  if (!entry.isDirectory()) continue;
  const date = entry.name;
  const dir = join(dailyDir, date);
  const files = (await readdir(dir)).filter(name => name.endsWith('.md') && name !== '_issue.md').sort();
  if (!files.length) { errors.push(`${date}/: 没有文章`); continue; }
  if (files.length > 4) errors.push(`${date}/: 文章不能超过 4 篇`);
  const issueRaw = await readFile(join(dir, '_issue.md'), 'utf8').catch(() => null);
  if (!issueRaw) { errors.push(`${date}/: 缺少 _issue.md`); continue; }
  const issue = parseFrontmatter(issueRaw);
  if (issue.error) { errors.push(`${date}/_issue.md: ${issue.error}`); continue; }
  if (issue.data.date !== date) errors.push(`${date}/_issue.md: date 与目录不符`);
  validateIssueMeta(`${date}/_issue.md`, issue.data, issue.body);

  const seenKinds = new Set();
  const seenOrders = new Set();
  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const raw = await readFile(join(dir, file), 'utf8');
    const parsed = parseFrontmatter(raw);
    if (parsed.error) { errors.push(`${date}/${file}: ${parsed.error}`); continue; }
    validateEdition(`${date}/${file}`, parsed.data, parsed.body, date, slug);
    if (seenKinds.has(parsed.data.kind)) errors.push(`${date}/${file}: kind 重复`);
    seenKinds.add(parsed.data.kind);
    if (seenOrders.has(parsed.data.order)) errors.push(`${date}/${file}: order 重复`);
    seenOrders.add(parsed.data.order);
    editionCount++;
  }
  issueCount++;
}

if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log(`PASS: ${issueCount} daily issues, ${editionCount} editions validated.`);
