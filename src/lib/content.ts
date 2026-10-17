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

// AI 日报：每期一个 src/content/daily/YYYY-MM-DD.md，格式由 scripts/publish-daily.mjs 校验；按日期从新到旧
export type Daily = {
 date:string;
 title:string;
 summary?:string;
 editorialVersion?:2;
 generatedAt?:string;
 windowStart?:string;
 windowEnd?:string;
 highlights:string[];
 tags?:string[];
 topics?:{title:string;angle:string}[];
 deepRead?:{title:string;url:string;reason:string}|null;
 x?:{status:'ok'|'pending';reason?:string};
 coverage?:{source:string;status:'ok'|'failed'|'paused';note:string}[];
};
export const dailies=Object.values(import.meta.glob<MarkdownInstance<Daily>>('../content/daily/*.md',{eager:true})).sort((a,b)=>b.frontmatter.date.localeCompare(a.frontmatter.date));

// 旧刊标题带「AI 日报 YYYY-MM-DD｜」，页面统一只显示后半句，日期放回 eyebrow。
export const dailyTitle=(d:Daily)=>d.title
 .replace(/^AI 日报\s*\d{4}-\d{2}-\d{2}\s*[｜|]\s*/u,'')
 .replace(/^AI 日报\s*\d{4}-\d{2}-\d{2}\s*/u,'')
 .trim();
export const dailySummary=(d:Daily)=>d.summary?.trim() || d.highlights?.[0]?.trim() || '这一期还没有写摘要。';
export const dailyTags=(d:Daily)=>d.tags ?? [];
export const dailyHighlights=(d:Daily)=>d.highlights.slice(0,3);
export const formatDailyDate=(date:string)=>{const [y,m,d]=date.split('-');return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`;};
export const latestDaily=dailies[0];

// Reverse insertion order breaks ties for entries first recorded in the same commit.
export const libraryEntries=[
 ...catalog.courses.map(content=>({kind:'course' as const,content})),
 ...catalog.projects.map(content=>({kind:'project' as const,content})),
].reverse().sort((a,b)=>Date.parse(b.content.createdAt)-Date.parse(a.content.createdAt));
