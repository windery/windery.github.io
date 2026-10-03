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

// Reverse insertion order breaks ties for entries first recorded in the same commit.
export const libraryEntries=[
 ...catalog.courses.map(content=>({kind:'course' as const,content})),
 ...catalog.projects.map(content=>({kind:'project' as const,content})),
].reverse().sort((a,b)=>Date.parse(b.content.createdAt)-Date.parse(a.content.createdAt));

// Tracks group courses and projects by subject; entries without a track fall into "extra".
type Track={slug:string;name:string;summary:string};
type Course={slug:string;track?:string;name:string;description:string;detail?:string;href?:string;status?:string;updated:string;createdAt:string};
export const tracks=catalog.tracks as Track[];
const fallbackTrack=tracks[tracks.length-1].slug;
const trackOf=(entry:{track?:string})=>tracks.some(t=>t.slug===entry.track)?entry.track!:fallbackTrack;
export const courses=catalog.courses as Course[];
export const trackCourses=(slug:string)=>courses.filter(c=>trackOf(c)===slug);
export const trackProjects=(slug:string)=>catalog.projects.filter(p=>trackOf(p)===slug);
export const trackName=(entry:{track?:string})=>tracks.find(t=>t.slug===trackOf(entry))!.name;
export const courseStatus:Record<string,string>={planned:'筹备中',writing:'连载中',done:'已完结'};
export const projectHref=(slug:string)=>`/projects/${slug}/${projectArticles(slug)[0].frontmatter.articleSlug}/`;
