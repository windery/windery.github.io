// Moves a built site under a sub-path, e.g. /preview/pr-3, for PR previews.
// The site links with root-absolute paths ("/search/"), so those get prefixed.
import fs from 'node:fs';
import path from 'node:path';

const [dir, prefix] = process.argv.slice(2);
const walk = d => fs.readdirSync(d, { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const cssUrls = s => s.replace(/url\((['"]?)\/(?!\/)/g, `url($1${prefix}/`);

for (const file of walk(dir)) {
  const ext = path.extname(file);
  if (ext === '.css') {
    fs.writeFileSync(file, cssUrls(fs.readFileSync(file, 'utf8')));
  } else if (ext === '.html') {
    const html = cssUrls(fs.readFileSync(file, 'utf8'))
      .replace(/(\s(?:href|src|action)=["'])\/(?!\/)/g, `$1${prefix}/`)
      .replace(/(content=["']\d+;\s*url=)\/(?!\/)/gi, `$1${prefix}/`)
      .replace(/new PagefindUI\(\{/g, `new PagefindUI({baseUrl:'${prefix}/',bundlePath:'${prefix}/pagefind/',`)
      .replace(/<head>/i, '<head><meta name="robots" content="noindex">');
    fs.writeFileSync(file, html);
  }
}
