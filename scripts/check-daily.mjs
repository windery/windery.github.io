// 构建前检查日报源文件：格式、v2 必需字段、板块顺序、字段表与证据链接。
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dailyDir = join(root, 'src/content/daily');
const errors = [];
const nonEmpty = value => typeof value === 'string' && value.trim() !== '';
const sections = ['重点解读', '工具与实践', '简讯', '深读推荐', '采集说明'];
const storySections = ['重点解读', '工具与实践', '简讯'];

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

const files = (await readdir(dailyDir)).filter(name => name.endsWith('.md')).sort();
for (const name of files) {
  const raw = await readFile(join(dailyDir, name), 'utf8');
  const parsed = parseFrontmatter(raw);
  if (parsed.error) { errors.push(`${name}: ${parsed.error}`); continue; }
  const { data, body } = parsed;
  const date = name.replace(/\.md$/, '');
  if (data.date !== date) errors.push(`${name}: date 与文件名不符`);
  if (!nonEmpty(data.title)) errors.push(`${name}: 缺少 title`);
  if (data.editorialVersion !== 2) continue;

  if (!nonEmpty(data.summary)) errors.push(`${name}: v2 缺少 summary`);
  if (!Array.isArray(data.highlights) || data.highlights.length < 1 || data.highlights.length > 3) errors.push(`${name}: highlights 要 1–3 条`);
  else if (!data.highlights.every(nonEmpty)) errors.push(`${name}: highlights 有空项`);
  if (!Array.isArray(data.topics) || data.topics.length > 2 || !data.topics.every(item => nonEmpty(item?.title) && nonEmpty(item?.angle))) errors.push(`${name}: topics 要 0–2 条，每条含 title/angle`);
  if (!(data.deepRead === null || (nonEmpty(data.deepRead?.title) && /^https?:\/\//.test(data.deepRead?.url ?? '') && nonEmpty(data.deepRead?.reason)))) errors.push(`${name}: deepRead 要是 null 或含 title/url/reason`);
  if (!['ok', 'pending'].includes(data.x?.status)) errors.push(`${name}: x.status 要 ok 或 pending`);
  if (!Array.isArray(data.coverage) || !data.coverage.length || !data.coverage.every(item => nonEmpty(item?.source) && ['ok', 'failed', 'paused'].includes(item?.status) && nonEmpty(item?.note))) errors.push(`${name}: coverage 要逐源记录 source/status/note`);
  if (/\*\*(变化|影响|建议|限制|证据|发布时间)[：:]\*\*/.test(body)) errors.push(`${name}: 正文使用了字段表（变化/影响/建议/限制/证据/发布时间）`);
  if (/本地审阅稿|\*\*编辑判断：\*\*/.test(body)) errors.push(`${name}: 读者正文出现「本地审阅稿」或「编辑判断：」`);
  if (/^本期覆盖/m.test(body.trimStart())) errors.push(`${name}: 正文不应以采集日志开头`);

  const h2 = [...body.matchAll(/^## (.+)$/gm)].map(match => match[1].trim());
  if (!h2.includes('重点解读')) errors.push(`${name}: 缺少「重点解读」`);
  if (h2.join('、') !== sections.filter(item => h2.includes(item)).join('、')) errors.push(`${name}: 板块顺序要是 ${sections.join('、')}；现在是 ${h2.join('、')}`);

  const seen = new Set();
  for (const section of storySections) {
    const content = body.match(new RegExp(`^## ${section}[ \\t]*\\n([\\s\\S]*?)(?=^## |(?![\s\S]))`, 'm'))?.[1] ?? '';
    for (const story of content.matchAll(/^### (.+)\n([\s\S]*?)(?=^### |(?![\s\S]))/gm)) {
      const text = story[2];
      const event = text.match(/<!-- event: ([a-z0-9][a-z0-9-]+) -->/)?.[1];
      const link = text.match(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/)?.[1];
      if (!event) errors.push(`${name}: 「${story[1]}」缺少稳定事件 ID`);
      if (!link) errors.push(`${name}: 「${story[1]}」缺少原文链接`);
      if (event && seen.has(`event:${event}`)) errors.push(`${name}: 重复事件 ${event}`);
      if (link && seen.has(`url:${link}`)) errors.push(`${name}: 重复链接 ${link}`);
      if (event) seen.add(`event:${event}`);
      if (link) seen.add(`url:${link}`);
    }
  }
}

if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log(`PASS: ${files.length} daily source files validated.`);
