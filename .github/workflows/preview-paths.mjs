import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Artifacts are data, not trusted filesystem trees. Validate before any reads,
// rewrites, or copies; reject symlinks, hardlinks, devices and oversized output.
export function validateTree(dir) {
  let size = 0, count = 0;
  const files = [];
  function walk(p) {
    const stat = fs.lstatSync(p);
    if (stat.isSymbolicLink()) throw new Error('Symlink in preview output');
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(p)) walk(path.join(p, name));
    } else {
      if (!stat.isFile() || stat.nlink !== 1) throw new Error('Non-regular preview file');
      if (++count > 20000 || (size += stat.size) > 256 * 1024 * 1024 || stat.size > 32 * 1024 * 1024) throw new Error('Preview output exceeds limits');
      files.push(p);
    }
  }
  if (!fs.lstatSync(dir).isDirectory()) throw new Error('Missing preview directory');
  walk(dir);
  if (!files.includes(path.join(dir, 'index.html'))) throw new Error('Missing preview index');
  return files;
}

export function rewriteText(text, ext, prefix) {
  if (!/^\/preview\/pr-[1-9]\d*$/.test(prefix)) throw new Error('Invalid preview prefix');
  const scoped = value => {
    value = value.replace(/^https:\/\/windery\.github\.io(?=\/)/i, '');
    return value.startsWith('/') && !value.startsWith('//') && value !== prefix && !value.startsWith(prefix + '/')
      ? prefix + value : value;
  };
  const css = s => s.replace(/url\(\s*(["']?)([^\s)'"]+)\1\s*\)/gi, (_, q, url) => `url(${q}${scoped(url)}${q})`)
    .replace(/(@import\s+)(["'])([^"']+)\2/gi, (_, start, q, url) => `${start}${q}${scoped(url)}${q}`);
  if (ext === '.css') return css(text);
  if (ext === '.js' || ext === '.mjs') {
    // Astro's emitted dynamic imports / asset references can live in JS chunks.
    return text.replace(/(["'`])(\/(?:_astro|pagefind)\/[^"'`]+)\1/g, (_, q, url) => `${q}${scoped(url)}${q}`);
  }
  if (ext !== '.html') return text;
  return css(text)
    .replace(/<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/gi, '')
    .replace(/(\s(?:href|src|action|poster|data-src)\s*=\s*)(["'])([^"']*)\2/gi,
      (_, start, q, url) => `${start}${q}${scoped(url)}${q}`)
    .replace(/(\ssrcset\s*=\s*)(["'])([^"']*)\2/gi, (_, start, q, value) =>
      `${start}${q}${value.replace(/(^|,\s*)(\/(?!\/)[^\s,]+)/g, (_, sep, url) => sep + scoped(url))}${q}`)
    .replace(/(content\s*=\s*["']\d+;\s*url=)([^"']+)/gi, (_, start, url) => start + scoped(url))
    .replace(/new\s+PagefindUI\s*\(\s*\{/g,
      `new PagefindUI({baseUrl:'${prefix}/',bundlePath:'${prefix}/pagefind/',`)
    .replace(/<meta\b[^>]*name\s*=\s*["']robots["'][^>]*>/gi, '')
    .replace(/<head\b[^>]*>/i, '$&<meta name="robots" content="noindex,nofollow">');
}

export function rewritePreview(dir, prefix) {
  for (const file of validateTree(dir)) {
    const ext = path.extname(file).toLowerCase();
    if (['.css', '.html', '.js', '.mjs'].includes(ext)) {
      fs.writeFileSync(file, rewriteText(fs.readFileSync(file, 'utf8'), ext, prefix));
    }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  rewritePreview(...process.argv.slice(2));
}
