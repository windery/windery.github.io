import type { MarkdownInstance } from 'astro';
import catalog from '../../content/catalog.json';
export { catalog };
type Article = {title:string;description:string;project:string;articleSlug:string;order:number;source:string;sourceVisibility?:string;commit:string;updated:string;published:boolean};
const modules=Object.values(import.meta.glob<MarkdownInstance<Article>>('../content/projects/**/*.md',{eager:true}));
export const articles=modules.filter(m=>m.frontmatter.published && catalog.projects.some(p=>p.slug===m.frontmatter.project && p.articles.includes(m.frontmatter.articleSlug))).sort((a,b)=>a.frontmatter.order-b.frontmatter.order);
export const projectArticles=(slug:string)=>articles.filter(a=>a.frontmatter.project===slug);

import reading from '../../content/reading.json';
const presentation=reading as Record<string,Record<string,{summary:string;headings:Record<string,string>}>>;
export const articleTitle=(a:MarkdownInstance<Article>,name:string)=>a.frontmatter.title.replace(name+' ','');
export const readingSummary=(a:MarkdownInstance<Article>)=>presentation[a.frontmatter.project]?.[a.frontmatter.articleSlug]?.summary || a.frontmatter.description;
export const articleHeadings=(a:MarkdownInstance<Article>)=>a.getHeadings().filter(h=>h.depth===2).map(h=>({...h,label:presentation[a.frontmatter.project]?.[a.frontmatter.articleSlug]?.headings[h.text] || h.text}));

// AI 日报：每天一个目录，目录下 _issue.md 是当天元信息，其余 .md 是独立篇目。
// 旧格式 src/content/daily/YYYY-MM-DD.md 继续作为合刊读取。
export type EditionKind='news'|'tools'|'method'|'topics';
export type EditionMeta={date:string;slug:string;kind:EditionKind;label:string;title:string;summary:string;order:number;tags?:string[]};
export type IssueMeta={date:string;summary?:string;highlights?:string[];tags?:string[];windowStart?:string;windowEnd?:string;generatedAt?:string;x?:{status:'ok'|'pending';reason?:string};coverage?:{source:string;status:'ok'|'failed'|'paused';note:string}[]};
export type Edition={meta:EditionMeta;Content:MarkdownInstance<EditionMeta>['Content'];getHeadings:MarkdownInstance<EditionMeta>['getHeadings'];file:string};
export type LegacyDaily={date:string;title:string;summary?:string;highlights?:string[];tags?:string[];generatedAt?:string;x?:{status:string};coverage?:unknown[]};
export type DailyIssue={date:string;meta:IssueMeta;editions:Edition[];legacy?:MarkdownInstance<LegacyDaily>;legacyTitle?:string};

function stripLegacyTitle(title:string){
 return title
  .replace(/^AI 日报\s*\d{4}-\d{2}-\d{2}\s*[｜|]\s*/u,'')
  .replace(/^AI 日报\s*\d{4}-\d{2}-\d{2}\s*/u,'')
  .trim();
}

type PendingIssue={date:string;meta?:IssueMeta;editions:Edition[];legacy?:MarkdownInstance<LegacyDaily>;legacyTitle?:string};
const files=import.meta.glob<MarkdownInstance<any>>('../content/daily/**/*.md',{eager:true});
const map=new Map<string,PendingIssue>();
for(const [path,mod] of Object.entries(files)){
 const rel=path.replace('../content/daily/','');
 const parts=rel.split('/');
 if(parts.length===1){
  const date=rel.replace(/\.md$/,'');
  const fm=mod.frontmatter;
  map.set(date,{date,meta:{date,summary:fm.summary,highlights:fm.highlights??[],tags:fm.tags??[],windowStart:fm.windowStart,windowEnd:fm.windowEnd,generatedAt:fm.generatedAt,x:fm.x,coverage:fm.coverage},editions:[],legacy:mod as MarkdownInstance<LegacyDaily>,legacyTitle:stripLegacyTitle(fm.title)});
 }else{
  const [date,filename]=parts;
  const current=map.get(date)??{date,editions:[]};
  if(filename==='_issue.md'){
   current.meta={...mod.frontmatter,date};
  }else{
   const slug=filename.replace(/\.md$/,'');
   const meta={...mod.frontmatter,date,slug} as EditionMeta;
   current.editions.push({meta,Content:mod.Content,getHeadings:mod.getHeadings,file:path});
  }
  map.set(date,current);
 }
}
export const dailyIssues:DailyIssue[]=[...map.values()].map(issue=>{
 const editions=issue.editions.sort((a,b)=>(a.meta.order??99)-(b.meta.order??99));
 const meta=issue.meta ?? {date:issue.date,summary:editions[0]?.meta.summary,highlights:editions.slice(0,3).map(edition=>edition.meta.summary),tags:editions.flatMap(edition=>edition.meta.tags??[]).slice(0,3)};
 return {...issue,meta,editions};
}).sort((a,b)=>b.date.localeCompare(a.date));
export const latestIssue=dailyIssues[0];

export const formatDailyDate=(date:string)=>{const [y,m,d]=date.split('-');return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`;};
export const issueSummary=(issue:DailyIssue)=>issue.meta.summary?.trim() || issue.editions[0]?.meta.summary || issue.legacy?.frontmatter.summary || issue.legacy?.frontmatter.highlights?.[0] || '这一天还没有写摘要。';
export const issueHighlights=(issue:DailyIssue)=>issue.meta.highlights ?? issue.legacy?.frontmatter.highlights ?? [];
export const issueTags=(issue:DailyIssue)=>issue.meta.tags ?? issue.legacy?.frontmatter.tags ?? [];
export const issueUrl=(issue:DailyIssue)=>`/daily/${issue.date}/`;
export const editionUrl=(issue:DailyIssue,edition:Edition)=>`/daily/${issue.date}/${edition.meta.slug}/`;
export const issueTitle=(issue:DailyIssue)=>issue.legacy ? (issue.legacyTitle || stripLegacyTitle(issue.legacy.frontmatter.title)) : `${formatDailyDate(issue.date)} · ${issue.editions.length} 篇`;
export const issueCount=(issue:DailyIssue)=>issue.legacy ? 1 : issue.editions.length;

// Reverse insertion order breaks ties for entries first recorded in the same commit.
export const libraryEntries=[
 ...catalog.courses.map(content=>({kind:'course' as const,content})),
 ...catalog.projects.map(content=>({kind:'project' as const,content})),
].reverse().sort((a,b)=>Date.parse(b.content.createdAt)-Date.parse(a.content.createdAt));
