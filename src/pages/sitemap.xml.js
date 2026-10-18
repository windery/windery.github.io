import {catalog,articles,dailyIssues,issueUrl,editionUrl} from '../lib/content';

const escapeXml=(value='')=>String(value).replace(/[<>&"']/g,ch=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[ch]));

export async function GET({site}){
 const base=(site?.href ?? 'https://windery.github.io/').replace(/\/?$/,'/');
 const urls=new Map();
 const add=(path,lastmod)=>{const url=new URL(path.replace(/^\//,''),base).href;urls.set(url,{lastmod});};
 add('',undefined);
 add('courses/',undefined);
 add('projects/',undefined);
 add('daily/',dailyIssues[0]?.date);
 add('search/',undefined);
 for(const course of catalog.courses) if(course.href) add(course.href,course.updated);
 for(const project of catalog.projects) add(`projects/${project.slug}/`,project.updated);
 for(const article of articles){
  const {project,articleSlug,updated}=article.frontmatter;
  add(`projects/${project}/${articleSlug}/`,updated);
 }
 for(const issue of dailyIssues){
  if(issue.legacy) add(issueUrl(issue),issue.date);
  for(const edition of issue.editions) add(editionUrl(issue,edition),issue.date);
 }
 const body=[...urls.entries()].map(([url,{lastmod}])=>`<url><loc>${escapeXml(url)}</loc>${lastmod?`<lastmod>${lastmod}</lastmod>`:''}</url>`).join('\n');
 const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
 return new Response(xml,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
