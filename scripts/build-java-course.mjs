// 从 content/courses/java 生成 public/courses/java 下的静态课程页。
// 用法：node scripts/build-java-course.mjs          生成网页、速查与示例下载
//       node scripts/build-java-course.mjs --check  另外编译并运行示例，核对课程里写的输出（需要本机 JDK）
import { mkdir, readFile, writeFile, readdir, rm, copyFile, access, mkdtemp } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { deflateRawSync, crc32 } from 'node:zlib';

const root = resolve(import.meta.dirname, '..');
const src = join(root, 'content/courses/java');
const out = join(root, 'public/courses/java');
const { course, stages, projects } = await import(pathToFileURL(join(src, 'course.mjs')));

const exists = p => access(p).then(() => true, () => false);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
const text = html => html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const arrowRight = '<svg class="icon-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true" focusable="false"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const arrowLeft = '<svg class="icon-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true" focusable="false"><path d="M19 12H5m6-6-6 6 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// 课程大纲展开成一维列表，并载入已经写好的课。
const lessons = [];
for (const [stageIndex, stage] of stages.entries()) {
  for (const [id, slug, title, summary] of stage.lessons) {
    const file = join(src, 'lessons', `${id}.mjs`);
    const body = (await exists(file)) ? (await import(pathToFileURL(file))).default : null;
    lessons.push({ id, slug, title, summary, num: id.slice(1), stage: stage.title, stageIndex, body });
  }
}
const written = lessons.filter(l => l.body);

// Java 语法着色：关键字、类型名（大写开头）、字符串、注释。
const keywords = new Set('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public record return sealed permits short static strictfp super switch synchronized this throw throws transient try var void volatile while yield true false null'.split(' '));
function highlight(code) {
  const pattern = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(@?[A-Za-z_$][\w$]*)/g;
  let html = '', last = 0;
  for (const m of code.matchAll(pattern)) {
    html += esc(code.slice(last, m.index));
    const [token, comment, string, word] = m;
    if (comment) html += `<span class="syntax-comment">${esc(token)}</span>`;
    else if (string) html += `<span class="syntax-string">${esc(token)}</span>`;
    else if (keywords.has(word)) html += `<span class="syntax-keyword">${esc(token)}</span>`;
    else if (/^[A-Z]/.test(word) && /[a-z]/.test(word)) html += `<span class="syntax-type">${esc(token)}</span>`;
    else html += esc(token);
    last = m.index + token.length;
  }
  return html + esc(code.slice(last));
}

const page = ({ title, depth, mainClass = '', mainAttrs = '', body }) => {
  const up = depth ? '../' : '';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(course.description)}"><title>${esc(title)}</title><link rel="stylesheet" href="${up}assets/course.css"><script defer src="${up}assets/course.js"></script><link rel="icon" href="/favicon.svg" type="image/svg+xml"></head><body><a class="skip-link" href="#main">跳到正文</a><header class="top"><a class="brand" href="${up}index.html"><span class="brand-mark" aria-hidden="true">${esc(course.short)}</span><span>${esc(course.name)}</span></a><nav aria-label="全站导航"><a href="/">学习站</a><a href="${up}index.html#curriculum">课程</a><a href="${up}reference/tools.html">速查</a><a href="${up}reference/route.html">路线</a></nav></header><main id="main" class="wrap ${mainClass}"${mainAttrs}>${body}</main></body></html>`;
};

function lessonPage(lesson) {
  const b = lesson.body;
  const i = written.indexOf(lesson);
  const prev = written[i - 1], next = written[i + 1];
  const ex = b.example;
  const code = ex.code;
  const run = ex.deps === 'jol'
    ? `运行：在解压后的 <code>java-depth</code> 目录执行 <code>./run.sh ${lesson.id}</code>。本节依赖 JOL，首次运行前按 <a href="../README.html">下载与运行说明</a> 下载 jol-core。`
    : `运行：在解压后的 <code>java-depth</code> 目录执行 <code>./run.sh ${lesson.id}</code>，课程名之后可以追加 JVM 参数。参见 <a href="../README.html">下载与运行说明</a>。`;
  const q = b.quiz;
  const body = `<aside class="aside" aria-label="本节导航"><a class="back-link" href="../index.html#curriculum">返回课程目录</a><p class="lesson-index">第 ${lesson.num} 节 <span>/ ${lessons.length}</span></p><p class="aside-title">本节内容</p><a href="#understand">理解机制</a><a href="#read">读代码</a><a href="#practice">判断练习</a><a href="#recall">主动回忆</a><a href="#sources">官方来源</a><a class="aside-reference" href="../reference/tools.html">查阅工具速查</a></aside><article class="lesson" data-pagefind-body><header class="intro"><h1>${esc(lesson.title)}</h1><p class="lead">${esc(lesson.summary)}</p><div class="lesson-meta"><span>${esc(lesson.stage)}</span><span>建议 ${esc(b.minutes)}</span></div></header>`
    + `<section id="understand"><h2>${esc(b.understand.title)}</h2>${b.understand.html.trim()}<p class="source-note">依据：${b.sourceNotes.map(([label, url]) => `<a href="${esc(url)}">${esc(label)}</a>`).join(' · ')}</p></section>`
    + `<section id="read"><h2>先预测，再运行</h2><p>${esc(ex.prompt)}</p><div class="code-head"><span>java-depth/src/${esc(ex.file)} <span class="code-edition">/ JDK 21</span></span><button type="button" data-copy="example-code">复制代码</button></div><pre><code id="example-code">${highlight(code)}</code></pre><details><summary>展开实际输出与阅读解析</summary><pre><code>${esc(ex.output)}</code></pre>${ex.outputNote ? `<p class="small">${esc(ex.outputNote)}</p>` : ''}<ol>${ex.explain.map(li => `<li>${li}</li>`).join('')}</ol></details>${ex.after ? ex.after.trim() : ''}<p class="small">${run}</p><div class="callout"><b>常见误读</b>${b.misread}</div></section>`
    + `<section id="practice"><h2>检查你的判断</h2><form class="quiz" data-correct="${q.correct}" data-explanation="${esc(q.explanation)}"><fieldset><legend>${esc(q.question)}</legend>${q.options.map((o, n) => `<label><input type="radio" name="answer" value="${n}">${esc(o)}</label>`).join('')}</fieldset><button type="submit">核对判断</button><p class="feedback" aria-live="polite"></p></form><noscript><p>浏览器未启用 JavaScript，请通过下方答案检查。</p></noscript><details><summary>查看完整判断依据</summary><p>${esc(q.options[q.correct])}。${esc(q.explanation)}</p></details></section>`
    + `<section id="recall"><h2>合上解释，自己说一遍</h2><p>${esc(b.recall.question)}</p><details><summary>完成后查看参考解析</summary><p>${b.recall.answer}</p></details><p class="review-line">建议在次日、一周后、一个月后各回忆一次：不看答案重做本题。答不出时先回看一处关键规则，再动手改一个参数重新运行；“已读”不等于“已掌握”。</p></section>`
    + `<section id="sources"><h2>继续核对</h2>${b.sources.trim()}<p>速查：<a href="../reference/tools.html">JDK 诊断工具</a> · <a href="../reference/route.html">学习路线</a>。</p></section>`
    + `<button type="button" data-mark-read="${lesson.id}" aria-pressed="false">标记本节已读</button><p class="small" id="save-status">此标记仅为自报阅读进度，不代表考核通过，也不会自动记录为已掌握。</p>`
    + `<nav class="lesson-nav" aria-label="课程顺序">${prev ? `<a href="${prev.slug}.html">${arrowLeft} ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a href="${next.slug}.html">${esc(next.title)} ${arrowRight}</a>` : `<a href="../index.html#curriculum">后续课程写作中，回到目录 ${arrowRight}</a>`}</nav>`
    + `<footer class="footer">内容整理于 ${course.updated} · 示例以 ${course.jdk} 实测；JVM 的默认值与实现细节随版本变化，以当前 JDK 文档为准。</footer></article>`;
  return page({ title: `${lesson.title} · ${course.name}`, depth: 1, mainClass: 'course-layout', body });
}

function indexPage() {
  const rows = stages.map((stage, s) => `<section class="course-stage" data-stage="${s + 1}"><div class="section-head"><span class="stage-number">${String(s + 1).padStart(2, '0')}</span><h3>${esc(stage.title)}</h3></div><div class="lesson-list">${lessons.filter(l => l.stageIndex === s).map(l => {
    const search = esc(`${l.title} ${l.summary} ${l.slug} ${l.body ? text(l.body.understand.html) : ''}`);
    const inner = `<span class="num">${l.num}</span><div><h4>${esc(l.title)}</h4><p>${esc(l.summary)}</p></div>`;
    return l.body
      ? `<a class="lesson-row" data-lesson-card="${l.id}" data-search="${search}" href="lessons/${l.slug}.html">${inner}<span class="row-arrow" aria-hidden="true">${arrowRight}</span></a>`
      : `<div class="lesson-row is-planned" data-lesson-card="${l.id}" data-search="${search}">${inner}<span class="planned-tag">待写</span></div>`;
  }).join('')}</div></section>`).join('');
  const projectLinks = projects.map(p => p.slug
    ? `<a class="reference-link" href="/projects/${p.slug}/01/"><h3>${esc(p.name)}</h3><p>${esc(p.usedIn)} · ${esc(p.note)}</p></a>`
    : `<div class="reference-link is-planned"><h3>${esc(p.name)}</h3><p>${esc(p.usedIn)} · ${esc(p.note)} 项目介绍随该阶段一起写。</p></div>`).join('');
  const body = `<section class="hero"><div class="hero-copy"><h1>读懂 Java，<br>从运行时到架构。</h1><p class="lead">写给已经在用 Java 做后端的你。每节课用一段能运行的代码、一个 JDK 工具，把“我记得是这样”换成“我测过是这样”。</p><div class="hero-actions"><a class="button" href="lessons/${written[0].slug}.html">开始第一课 <span aria-hidden="true">${arrowRight}</span></a><a class="text-link" href="reference/route.html">选择学习路线</a></div><p class="hero-meta">${lessons.length} 节课 <span>·</span> 已发布 ${written.length} 节 <span>·</span> 示例以 ${esc(course.jdk)} 实测</p></div><figure class="hero-example"><figcaption><span>从一次比较开始</span><a href="lessons/${lessons[2].slug}.html">第 03 节 · 字节码</a></figcaption><pre><code>${highlight('Integer a = 127, b = 127;\nInteger c = 128, d = 128;\n\na == b   // true\nc == d   // false')}</code></pre><div class="signature-note"><code>Integer.valueOf</code><p>自动装箱是一次方法调用。<br>-128 到 127 返回缓存对象，<br>范围外每次新建。</p></div><p class="example-caption">先问编译器把它变成了什么。</p></figure></section>`
    + `<section class="reading-method" aria-labelledby="method-title"><h2 id="method-title">每节课，<br>做四件事。</h2><ol><li><strong>先预测</strong><span>写下你以为的输出</span></li><li><strong>再运行</strong><span>用真实 JDK 核对</span></li><li><strong>看证据</strong><span>javap、jcmd、JOL</span></li><li><strong>改参数</strong><span>换一个 JVM 开关再验证</span></li></ol></section>`
    + `<section id="curriculum"><div class="curriculum-heading"><h2>课程目录</h2><p>从 JVM 运行时出发，经过并发与框架，走到分布式架构和 AI 应用。</p></div><div class="toolbar"><label for="course-search">查找课程<input id="course-search" type="search" placeholder="搜索类加载、GC、线程池、Kafka…" autocomplete="off"></label><span class="small" id="progress-status" aria-live="polite"></span></div><p hidden id="no-results" role="status">没有匹配课程。试试中文术语或缩短关键词。</p>${rows}</section>`
    + `<details class="course-help"><summary>如何使用这份课程与运行示例</summary><p>每节包含机制说明、完整代码、实测输出与解析、即时判断题和主动回忆题。先写下预测再展开答案；判断正确但说不出原因，就再读一遍机制部分。</p><p>标记“待写”的课程会按阶段陆续发布。示例需要 JDK 21 或更高版本，进入解压后的 <code>java-depth</code> 目录运行 <code>./run.sh l01</code>。详细方法见 <a href="README.html">下载与运行说明</a>。</p></details>`
    + `<section id="projects"><h2>课程用到的开源项目</h2><div class="refs">${projectLinks}</div></section>`
    + `<section id="references"><h2>遇到问题，回来查</h2><div class="refs"><a class="reference-link" href="reference/tools.html"><h3>JDK 诊断工具速查</h3><p>jcmd、javap、JFR 与常用观察参数</p></a><a class="reference-link" href="reference/route.html"><h3>学习路线</h3><p>按目标选择阅读顺序，向 AI 开发过渡</p></a><a class="reference-link" href="README.html"><h3>下载与运行示例</h3><p>每节课的完整 Java 程序</p></a></div></section>`
    + `<footer class="footer">${esc(course.name)} · 简体中文 · ${course.updated} · 阅读进度只保存在当前浏览器。打印时会展开参考答案。</footer>`;
  return page({ title: `课程入口 · ${course.name}`, depth: 0, body });
}

// 速查与说明页的正文是手写 HTML 片段，这里只套上课程外壳。
const referencePage = (file, depth) => readFile(file, 'utf8').then(html => {
  const title = html.match(/<h1>(.*?)<\/h1>/)[1];
  return page({ title: `${text(title)} · ${course.name}`, depth, mainClass: 'reading-list', mainAttrs: ' data-pagefind-body', body: html.trim() });
});

// 无第三方依赖的 zip 写入；固定时间戳，保证重复生成得到相同文件。
function zip(entries) {
  const locals = [], centrals = [];
  let offset = 0;
  for (const { name, data, mode } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const packed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10); local.writeUInt16LE(0x5d43, 12); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBuf.length, 26); local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(0x0314, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12); central.writeUInt16LE(0x5d43, 14); central.writeUInt32LE(crc, 16); central.writeUInt32LE(packed.length, 20); central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28); central.writeUInt32LE(((mode ?? 0o644) | 0o100000) << 16 >>> 0, 38); central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, packed);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + packed.length;
  }
  const dir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(dir.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, end]);
}

// 读入示例源码，课程页与下载包使用同一份文件。
const exampleDir = join(src, 'examples');
const sources = (await readdir(join(exampleDir, 'src'))).filter(f => f.endsWith('.java')).sort();
for (const lesson of written) lesson.body.example.code = await readFile(join(exampleDir, 'src', lesson.body.example.file), 'utf8');

if (process.argv.includes('--check')) {
  const work = await mkdtemp(join(tmpdir(), 'java-course-'));
  let failed = 0;
  for (const lesson of written) {
    const ex = lesson.body.example;
    if (ex.check === false) { console.log(`skip  ${lesson.id}（输出随机器变化）`); continue; }
    const cls = ex.file.replace(/\.java$/, '');
    execFileSync('javac', ['-encoding', 'UTF-8', '-d', work, join(exampleDir, 'src', ex.file)], { stdio: 'pipe' });
    const actual = execFileSync('java', ['-Dstdout.encoding=UTF-8', '-cp', work, cls], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const norm = s => s.split('\n').map(l => l.trimEnd()).filter(Boolean).join('\n');
    if (norm(actual) === norm(ex.output)) console.log(`ok    ${lesson.id}`);
    else { failed++; console.error(`FAIL  ${lesson.id}\n--- 课程中\n${ex.output}\n--- 实际\n${actual}`); }
  }
  await rm(work, { recursive: true, force: true });
  if (failed) process.exit(1);
}

await rm(out, { recursive: true, force: true });
for (const dir of ['', 'lessons', 'reference', 'assets']) await mkdir(join(out, dir), { recursive: true });
for (const asset of ['course.css', 'course.js']) await copyFile(join(src, 'assets', asset), join(out, 'assets', asset));
await writeFile(join(out, 'index.html'), indexPage());
for (const lesson of written) await writeFile(join(out, 'lessons', `${lesson.slug}.html`), lessonPage(lesson));
for (const file of await readdir(join(src, 'reference'))) await writeFile(join(out, 'reference', file), await referencePage(join(src, 'reference', file), 1));
await writeFile(join(out, 'README.html'), await referencePage(join(src, 'readme.html'), 0));
await writeFile(join(out, 'examples.zip'), zip([
  { name: 'java-depth/README.md', data: await readFile(join(exampleDir, 'README.md')) },
  { name: 'java-depth/run.sh', data: await readFile(join(exampleDir, 'run.sh')), mode: 0o755 },
  ...await Promise.all(sources.map(async f => ({ name: `java-depth/src/${f}`, data: await readFile(join(exampleDir, 'src', f)) }))),
]));
console.log(`Java 课程：${written.length} / ${lessons.length} 节已生成到 public/courses/java/`);
