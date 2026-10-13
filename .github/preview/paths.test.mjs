import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { rewriteText, rewritePreview, validateTree } from '../workflows/preview-paths.mjs';
const prefix = '/preview/pr-3';
test('HTML navigation, redirect, responsive images and Pagefind stay in the preview', () => {
  const text = `<head><meta name="robots" content="index"><link rel="canonical" href="https://windery.github.io/404/"></head><a HREF = '/courses/'>x</a><img src="/a.png" srcset="/a.png 1x, /b.png 2x"><video poster='/p.png'></video><meta content="0; url=/new/"><a href="https://windery.github.io/search/">x</a><script>new PagefindUI ( {element:'#search'})</script>`;
  const result = rewriteText(text, '.html', prefix);
  for (const url of ['courses/', 'a.png', 'b.png', 'p.png', 'new/', 'search/']) assert.ok(result.includes(prefix + '/' + url), url);
  assert.ok(result.includes(`baseUrl:'${prefix}/',bundlePath:'${prefix}/pagefind/'`));
  assert.ok(result.includes('noindex,nofollow'));
  assert.ok(!result.includes('content="index"'));
  assert.ok(!result.includes('canonical')); 
});
test('CSS handles spaces, imports, protocol-relative and data URLs', () => {
  const result = rewriteText(`a{src:url( '/fonts/a.woff2' );background:url(//cdn.test/a)}@import "/style.css";b{background:url(data:image/png;base64,AA)}`, '.css', prefix);
  assert.ok(result.includes(`url('${prefix}/fonts/a.woff2')`));
  assert.ok(result.includes(`"${prefix}/style.css"`));
  assert.ok(result.includes('url(//cdn.test/a)'));
  assert.ok(result.includes('url(data:image/png;base64,AA)'));
});
test('external, fragment, relative and already scoped URLs remain intact', () => {
  const text = `<head></head><a href="//example.org/a">a</a><a href="#x">b</a><a href="../a">c</a><a href="${prefix}/x">d</a>`;
  const result = rewriteText(text, '.html', prefix);
  for (const url of ['//example.org/a', '#x', '../a', prefix + '/x']) assert.ok(result.includes(`href="${url}"`));
  assert.throws(() => rewriteText(text, '.html', '/../../main'));
});
test('Astro JS chunk references are scoped', () => {
  assert.equal(rewriteText(`import('/_astro/a.js')`, '.js', prefix), `import('${prefix}/_astro/a.js')`);
});
test('reject symlink and hardlink output without touching external files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-test-'));
  try {
    const dir = path.join(root, 'out'); fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'index.html'), '<head></head>');
    const outside = path.join(root, 'outside.html'); fs.writeFileSync(outside, 'unchanged');
    fs.symlinkSync(outside, path.join(dir, 'link.html'));
    assert.throws(() => rewritePreview(dir, prefix), /Symlink/);
    assert.equal(fs.readFileSync(outside, 'utf8'), 'unchanged');
    fs.unlinkSync(path.join(dir, 'link.html'));
    fs.linkSync(outside, path.join(dir, 'hard.html'));
    assert.throws(() => validateTree(dir), /Non-regular/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
