import { readdir,readFile,stat } from 'node:fs/promises';
import { resolve,join,extname } from 'node:path';
const root=resolve(import.meta.dirname,'../dist');
const walk=async(dir)=>{const list=await readdir(dir,{withFileTypes:true});const files=[];for(const entry of list){const p=join(dir,entry.name);files.push(...(entry.isDirectory()?await walk(p):[p]));}return files;};
const files=await walk(root);const errors=[];
for(const file of files.filter(p=>p.endsWith('.html'))){
 const html=await readFile(file,'utf8');
 if(/\/Users\/|\/home\/[\w.-]+|(?:ghp_|github_pat_)[A-Za-z0-9_]{15,}|-----BEGIN .*PRIVATE KEY-----/.test(html))errors.push(`${file}: private data pattern`);
 const base=new URL('https://site.test/'+file.slice(root.length+1));
 for(const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)){
  const value=match[1];if(/^(?:https?:|mailto:|data:|javascript:|#)/.test(value))continue;
  const u=new URL(value,base);let p=join(root,decodeURIComponent(u.pathname));
  try{if((await stat(p)).isDirectory())p=join(p,'index.html');await stat(p);}catch{errors.push(`${file.slice(root.length+1)}: missing ${value}`);}
 }
}
const htmlCount=files.filter(p=>extname(p)==='.html').length;
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`PASS: ${htmlCount} public HTML pages, local asset/link targets, and private-path scan.`);
