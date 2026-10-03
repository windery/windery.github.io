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

type Course={slug:string;track?:string;name:string;description:string;detail?:string;href?:string;status?:string;updated:string;createdAt:string};
export const courses=catalog.courses as Course[];
export const courseStatus:Record<string,string>={planned:'筹备中',writing:'连载中',done:'已完结'};
export const projectHref=(slug:string)=>`/projects/${slug}/${projectArticles(slug)[0].frontmatter.articleSlug}/`;
