import {dailies,dailyTitle,dailySummary} from '../lib/content';

const escapeXml=(value='')=>String(value).replace(/[<>&"']/g,ch=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[ch]));

export async function GET({site}){
 const base=(site?.href ?? 'https://windery.github.io/').replace(/\/?$/,'/');
 const items=dailies.map(({frontmatter:d})=>{
  const url=new URL(`daily/${d.date}/`,base).href;
  const pubDate=new Date(`${d.date}T08:00:00+08:00`).toUTCString();
  return `<item><title>${escapeXml(dailyTitle(d))}</title><link>${escapeXml(url)}</link><guid isPermaLink="true">${escapeXml(url)}</guid><pubDate>${pubDate}</pubDate><description>${escapeXml(dailySummary(d))}</description></item>`;
 }).join('');
 const updated=dailies[0]?.frontmatter.date ? new Date(`${dailies[0].frontmatter.date}T08:00:00+08:00`).toUTCString() : new Date().toUTCString();
 const xml=`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Windery AI 日报</title>
<link>${escapeXml(new URL('daily/',base).href)}</link>
<description>每天读一批 AI 工程更新，只留下值得花时间的几件事。</description>
<language>zh-CN</language>
<lastBuildDate>${updated}</lastBuildDate>
${items}
</channel></rss>`;
 return new Response(xml,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
