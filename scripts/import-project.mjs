import { parseArgs } from 'node:util';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
const { values } = parseArgs({ options: {
  dir: { type:'string' }, slug: { type:'string' }, name: { type:'string' },
  repo: { type:'string' }, commit: { type:'string' }, date: { type:'string' }, description: { type:'string' }, version: { type:'string' },
  'allow-private-source': { type:'boolean', default:false }
}});
for (const key of ['dir','slug','name','repo','commit','date','description']) {
  if (!values[key]) throw new Error(`Missing --${key}. See README.md for usage.`);
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug)) throw new Error('Project slug must use lowercase ASCII words.');
if (!/^[\w.-]+\/[\w.-]+$/.test(values.repo)) throw new Error('Use owner/repo for --repo.');
if (!/^[a-f0-9]{40}$/.test(values.commit)) throw new Error('Use the full source commit SHA.');
if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date)) throw new Error('Use YYYY-MM-DD for --date.');
const visibility=execFileSync('gh',['api',`repos/${values.repo}`,'--jq','.private'],{encoding:'utf8'}).trim();
if (!['true','false'].includes(visibility)) throw new Error('Unable to verify source visibility.');
if (visibility==='true' && !values['allow-private-source']) throw new Error('Private source: explicit document-publication authorization and --allow-private-source required.');
execFileSync('gh',['api',`repos/${values.repo}/commits/${values.commit}`,'--jq','.sha'],{encoding:'utf8'});
const source=`https://github.com/${values.repo}`;
const sourceVisibility=visibility==='true'?'private':'public';
const root=resolve(import.meta.dirname,'..');
const input=resolve(values.dir);
const files=(await readdir(input)).filter(x=>/^\d+.*\.md$/.test(x)).sort();
if (!files.length) throw new Error('No numbered Markdown articles found in the selected folder.');
const staged=[];
const slugs=new Set();
for(const file of files) {
  const raw=await readFile(join(input,file),'utf8');
  if (/\/Users\/|\/home\/[\w.-]+|(?:ghp_|github_pat_)[A-Za-z0-9_]{15,}|-----BEGIN .*PRIVATE KEY-----|\b(?:app_secret|access_token|refresh_token)\s*[:=]\s*["']?[A-Za-z0-9_-]{15,}/i.test(raw)) {
    throw new Error(`${file}: possible private data; create a reviewed public copy first.`);
  }
  const title=raw.match(/^#\s+(.+)\r?$/m)?.[1];
  if (!title) throw new Error(`${file}: first-level title missing.`);
  const articleSlug=basename(file).match(/^\d+/)[0];
  if(slugs.has(articleSlug)) throw new Error('Duplicate article number.');
  slugs.add(articleSlug);
  const body=raw.replace(/^#\s+.+\r?\n+/,'');
  const description=body.split('\n').find(x=>x.startsWith('TL;DR'))?.replace(/^TL;DR[：:]\s*/,'') || values.description;
  const fields={title,description,project:values.slug,articleSlug,order:Number(articleSlug),source,sourceVisibility,commit:values.commit,updated:values.date,published:true};
  const frontmatter=Object.entries(fields).map(([k,v])=>`${k}: ${JSON.stringify(v)}`).join('\n');
  staged.push({name:`${articleSlug}.md`,content:`---\n${frontmatter}\n---\n\n${body}`});
}
const catalogPath=join(root,'content/catalog.json');
const catalog=JSON.parse(await readFile(catalogPath,'utf8'));
const existing=catalog.projects.find(p=>p.slug===values.slug);
if(existing && existing.source!==source) throw new Error('Project slug belongs to a different source; choose another slug.');
const dest=join(root,'src/content/projects',values.slug);
await mkdir(dest,{recursive:true});
for(const file of staged) await writeFile(join(dest,file.name),file.content);
// A release version only carries over while the commit is unchanged.
const version=values.version || (existing?.commit===values.commit ? existing?.version : undefined);
const project={slug:values.slug,name:values.name,description:values.description,source,sourceVisibility,commit:values.commit,...(version?{version}:{}),updated:values.date,createdAt:existing?.createdAt || new Date().toISOString(),articles:staged.map(x=>basename(x.name,'.md'))};
const index=catalog.projects.findIndex(p=>p.slug===values.slug);
if(index<0) catalog.projects.push(project); else catalog.projects[index]=project;
await writeFile(catalogPath,JSON.stringify(catalog,null,2)+'\n');
console.log(`Prepared ${staged.length} articles for ${values.name}. Review locally before committing; nothing was published.`);
