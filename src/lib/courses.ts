import type { MarkdownInstance } from 'astro';
import catalog from '../../content/catalog.json';

// Markdown courses live in src/content/courses/<course>/<lesson>.md and are published
// only when the catalog entry has format "markdown" and lists the lesson slug.
type Lesson = {title:string;description:string;course:string;lesson:string;order:number;module?:string;updated:string;published:boolean};
type Syllabus = {modules:{title:string;summary?:string;lessons:{slug:string;title:string;summary:string}[]}[]};
type CourseEntry = (typeof catalog.courses)[number] & {format?:string;lessons?:string[]};

export const markdownCourses=(catalog.courses as CourseEntry[]).filter(c=>c.format==='markdown');
const modules=Object.values(import.meta.glob<MarkdownInstance<Lesson>>('../content/courses/**/*.md',{eager:true}));
const syllabi=import.meta.glob<{default:Syllabus}>('../content/courses/*/syllabus.json',{eager:true});

export const lessons=modules.filter(m=>m.frontmatter.published && markdownCourses.some(c=>c.slug===m.frontmatter.course && c.lessons?.includes(m.frontmatter.lesson))).sort((a,b)=>a.frontmatter.order-b.frontmatter.order);
export const courseLessons=(slug:string)=>lessons.filter(l=>l.frontmatter.course===slug);
export const courseSyllabus=(slug:string)=>syllabi[`../content/courses/${slug}/syllabus.json`]?.default;
export const lessonHref=(course:string,lesson:string)=>`/courses/${course}/${lesson}/`;

// Groups the course into modules: the syllabus when present (including lessons not yet written),
// otherwise the published lessons grouped by their `module` frontmatter.
export function courseOutline(slug:string){
 const published=new Map(courseLessons(slug).map(l=>[l.frontmatter.lesson,l]));
 const syllabus=courseSyllabus(slug);
 if(syllabus)return syllabus.modules.map(m=>({title:m.title,summary:m.summary,lessons:m.lessons.map(l=>({...l,published:published.has(l.slug)}))}));
 const groups=new Map<string,{slug:string;title:string;summary:string;published:boolean}[]>();
 for(const l of published.values()){const key=l.frontmatter.module||'';if(!groups.has(key))groups.set(key,[]);groups.get(key)!.push({slug:l.frontmatter.lesson,title:l.frontmatter.title,summary:l.frontmatter.description,published:true});}
 return [...groups].map(([title,lessons])=>({title,summary:undefined,lessons}));
}
