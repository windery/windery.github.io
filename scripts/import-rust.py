#!/usr/bin/env python3
"""Export only the public course files; never copy the source workspace wholesale."""
from pathlib import Path
from html import escape
import sys,re,shutil,zipfile
source=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else None
if source is None or not (source/'index.html').exists():
 raise SystemExit('Usage: python3 scripts/import-rust.py /path/to/rust-course')
root=Path(__file__).resolve().parents[1]
dest=root/'public/courses/rust'
dest.mkdir(parents=True,exist_ok=True)
for folder,pattern in [('assets','course.*'),('lessons','*.html'),('reference','*.html')]:
 (dest/folder).mkdir(exist_ok=True)
 for file in (source/folder).glob(pattern):shutil.copy2(file,dest/folder/file.name)
shutil.copy2(source/'index.html',dest/'index.html')
for file in dest.rglob('*.html'):
 s=file.read_text()
 s=s.replace('</head>','<link rel="icon" href="/favicon.svg" type="image/svg+xml"></head>')
 s=s.replace('<nav aria-label="全站导航">','<nav aria-label="全站导航"><a href="/">学习站</a>')
 s=s.replace('README.md','README.html')
 s=s.replace('RESOURCES.md','RESOURCES.html')
 s=s.replace('<article class="lesson">','<article class="lesson" data-pagefind-body>')
 s=s.replace('<main id="main" class="wrap reading-list">','<main id="main" class="wrap reading-list" data-pagefind-body>')
 s=s.replace('所有主示例均为完整程序；练习里的失败片段会明确说明。若本机遇到 xcrun 架构错误，参见 <a href="../README.html">运行说明</a>中的本地启动脚本。','所有主示例均为完整程序；练习里的失败片段会明确说明。参见 <a href="../README.html">下载与运行说明</a>。')
 s=re.sub(r'<p>不清楚时随时问我：.*?</p>','<p>复习时记下自己的预测和理由，再对照本节解析与官方文档核对。</p>',s)
 s=re.sub(r'<section><h2>学习记录如何积累</h2>.*?</section>','',s)
 s=s.replace('对任何条目不确定，随时把代码贴给我一起读。','遇到不确定的条目，结合实际代码核对官方资料。')
 s=s.replace('把答案贴回聊天，我会基于你的解释判断下一课难度。只有得到理解证据后才更新 learning-records。','记录答案与理由，依据解释是否准确选择下一阶段；阅读标记不等于已经掌握。')
 s=s.replace('本机 Rust','Rust')
 file.write_text(s)
# The public download contains only the runnable example crate, not machine state.
crate=source/'examples/rust-reading'
with zipfile.ZipFile(dest/'examples.zip','w',zipfile.ZIP_DEFLATED) as archive:
 for name in ['Cargo.toml','Cargo.lock']:
  if (crate/name).exists():archive.write(crate/name,'examples/rust-reading/'+name)
 for folder in ['src','examples']:
  for file in (crate/folder).rglob('*.rs'):archive.write(file,'examples/rust-reading/'+str(file.relative_to(crate)))
# Use the existing course shell for the two supporting reading pages.
template=(dest/'reference/route.html').read_text()
def supporting(name,title,body):
 s=re.sub(r'<title>.*?</title>',f'<title>{title} · Rust 阅读课</title>',template)
 s=s.replace('../assets/','assets/').replace('../index.html','index.html').replace('href="../reference/','href="reference/')
 s=re.sub(r'(<main[^>]*>).*?(</main>)',lambda m:m[1]+f'<h1>{title}</h1>'+body+m[2],s,flags=re.S)
 (dest/name).write_text(s)
supporting('README.html','下载与运行示例','''<p class="lead">网页里的 35 个示例也可以在自己的电脑上运行。</p><p><a class="button" href="examples.zip" download>下载 Rust 示例</a></p><h2>开始运行</h2><ol><li>参考 <a href="https://doc.rust-lang.org/book/ch01-01-installation.html">官方说明</a>安装支持 Rust 2024 edition 的工具链。</li><li>解压下载文件，进入示例目录。</li><li>运行与课程编号对应的示例。</li></ol><pre><code>cd examples/rust-reading\ncargo run --offline --example l01\ncargo test --offline</code></pre><p>示例从 l01 到 l35，没有第三方 crate 依赖。课程示例以 Rust 1.95.0 验证。</p><p><a href="index.html">返回课程目录</a></p>''')
resources=(source/'RESOURCES.md').read_text()
links=re.findall(r'\[([^\]]+)\]\((https://[^)]+)\)',resources)
supporting('RESOURCES.html','课程参考资料','<p class="lead">按问题查阅原始资料，各课也有对应章节链接。</p><ul>'+''.join(f'<li><a href="{escape(url,quote=True)}">{escape(label)}</a></li>' for label,url in links)+'</ul><p><a href="index.html">返回课程目录</a></p>')
print('Exported Rust course with public-only supporting pages and examples.zip.')
