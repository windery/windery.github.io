import {dailyIssues,formatDailyDate,issueSummary,issueTitle,issueUrl,editionUrl} from '../lib/content';

const escapeXml=(value='')=>String(value).replace(/[<>&"']/g,ch=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[ch]));

export async function GET({site}){
 const base=(site?.href ?? 'https://windery.github.io/').replace(/\/?$/,'/');
 const items=dailyIssues.flatMap(issue=>{
  const pubDate=new Date(`${issue.date}T08:00:00+08:00`).toUTCString();
  if(issue.legacy){
   const url=new URL(issueUrl(issue).slice(1),base).href;
   return `<item><title>${escapeXml(issueTitle(issue))}</title><link>${escapeXml(url)}</link><guid isPermaLink="true">${escapeXml(url)}</guid><pubDate>${pubDate}</pubDate><description>${escapeXml(issueSummary(issue))}</description></item>`;
  }
  return issue.editions.map(edition=>{
   const url=new URL(editionUrl(issue,edition).slice(1),base).href;
   return `<item><title>${escapeXml(`${edition.meta.label}｜${edition.meta.title}`)}</title><link>${escapeXml(url)}</link><guid isPermaLink="true">${escapeXml(url)}</guid><pubDate>${pubDate}</pubDate><category>${escapeXml(edition.meta.label)}</category><description>${escapeXml(edition.meta.summary)}</description></item>`;
  });
 }).join('');
 const updated=dailyIssues[0] ? new Date(`${dailyIssues[0].date}T08:00:00+08:00`).toUTCString() : new Date().toUTCString();
 const xml=`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Windery AI 日报</title>
<link>${escapeXml(new URL('daily/',base).href)}</link>
<description>每天读一批 AI 工程更新，拆成新闻、工具、方法和口播选题四篇。</description>
<language>zh-CN</language>
<lastBuildDate>${updated}</lastBuildDate>
${items}
</channel></rss>`;
 return new Response(xml,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
