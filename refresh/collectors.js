/* Talk Library — incremental collectors.
 * Paste ONE block into the browser console (or run via the browser tool) while on the
 * site named in its header. Set SINCE to the "built" date in talks.json.
 * Each block fills window.NEW = {done, prog, talks:[...]}; poll NEW.done / NEW.prog.
 * Record shape: {s, t, sp, d:'YYYY-MM-DD', u, a?, k, ds?, r?, tp?}
 * Be polite: BYU-Idaho / BYU-Hawaii / Pathway ask for 10 s between requests (robots.txt).
 */

/* ===== General Conference — https://www.churchofjesuschrist.org/study ===== */
const SINCE = '2026-10-04';
window.NEW={done:false,talks:[],errs:[],prog:''};
(async()=>{
 const API='/study/api/v3/language-pages/type/content?lang=eng&uri=';
 const skip=/sustaining of|auditing|statistical report|audit report|solemn assembly|church officers|general authorities and general officers/i;
 const list=[]; const y0=+SINCE.slice(0,4), y1=new Date().getFullYear();
 for(let y=y0;y<=y1;y++) for(const m of ['04','10']){
   if (`${y}-${m}-31` < SINCE) continue;
   try{ const r=await fetch(API+'/general-conference/'+y+'/'+m); if(!r.ok) continue; const j=await r.json();
     const d=new DOMParser().parseFromString(j.content.body,'text/html');
     for(const a of d.querySelectorAll('a')){ const sp=a.querySelector('.primaryMeta')?.textContent.trim(); const t=a.querySelector('.title')?.textContent.trim();
       if(!sp||!t||skip.test(t)) continue; list.push({t,sp,uri:a.getAttribute('href').split('?')[0].replace('/study',''),y,m}); }
   }catch(e){NEW.errs.push(y+m+' '+e)}
 }
 for(const [n,it] of list.entries()){ NEW.prog=(n+1)+'/'+list.length;
   const rec={s:'gc',t:it.t,sp:it.sp,d:it.y+'-'+it.m+'-01',u:'https://www.churchofjesuschrist.org/study'+it.uri+'?lang=eng',k:'General Conference'};
   try{ const j=await fetch(API+it.uri).then(r=>r.json()); rec.a=j.meta?.audio?.[0]?.mediaUrl;
     try{const sd=JSON.parse(j.meta.structuredData); if(sd.datePublished) rec.d=sd.datePublished.slice(0,10);}catch(e){}
     const d=new DOMParser().parseFromString(j.content.body,'text/html');
     rec.ds=d.querySelector('.kicker')?.textContent.trim(); rec.r=d.querySelector('.author-role')?.textContent.trim();
   }catch(e){NEW.errs.push(it.uri+' '+e)}
   NEW.talks.push(rec); await new Promise(r=>setTimeout(r,250)); }
 NEW.done=true;
})();

/* ===== BYU (Provo) — https://speeches.byu.edu ===== */
const SINCE = '2026-10-04';
window.NEW={done:false,talks:[],errs:[],prog:''};
(async()=>{
 const list=[];
 for(let p=1;p<=10;p++){ const r=await fetch('/wp-json/wp/v2/speech?per_page=100&page='+p+'&after='+SINCE+'T00:00:00&_fields=date,link,title,class_list'); if(!r.ok) break; const j=await r.json(); if(!j.length) break; list.push(...j); }
 const txt=s=>{const e=document.createElement('textarea'); e.innerHTML=s; return e.value;};
 const tc=s=>s.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ');
 const M={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
 for(const [n,x] of list.entries()){ NEW.prog=(n+1)+'/'+list.length;
   const cl=x.class_list; const rec={s:'byu',t:txt(x.title.rendered),d:x.date.slice(0,10),u:x.link,
     k:tc((cl.find(c=>c.startsWith('event_type-'))||'event_type-speech').slice(11)),
     tp:cl.filter(c=>c.startsWith('topic-')).map(c=>tc(c.slice(6))),
     sp:cl.filter(c=>c.startsWith('speaker-')).map(c=>tc(c.slice(8))).join(' & ')};
   try{ const h=await fetch(x.link).then(r=>r.text()); const d=new DOMParser().parseFromString(h,'text/html');
     const names=[...d.querySelectorAll('.individual-speech__speaker-name')].map(e=>e.textContent.trim()); if(names.length) rec.sp=names.join(' & ');
     rec.r=d.querySelector('.individual-speech__speaker-position')?.textContent.trim().replace(/\s+/g,' ');
     const m=h.match(/https:\/\/speeches\.byu\.edu\/wp-content\/uploads\/[^"'\s<>]+\.mp3/); if(m) rec.a=m[0];
     rec.ds=d.querySelector('meta[name=description]')?.content;
     const dm=h.match(/individual-speech__date[^>]*>\s*(\d{1,2}) (\w{3}) (\d{4})/); if(dm) rec.d=dm[3]+'-'+M[dm[2]]+'-'+dm[1].padStart(2,'0');
   }catch(e){NEW.errs.push(x.link+' '+e)}
   NEW.talks.push(rec); await new Promise(r=>setTimeout(r,250)); }
 NEW.done=true;
})();

/* ===== BYU–Idaho — https://www.byui.edu/speeches/search (10 s delay) ===== */
const SINCE = '2026-10-04';
window.NEW={done:false,talks:[],errs:[],prog:''};
(async()=>{
 const wait=()=>new Promise(r=>setTimeout(r,10000));
 for(let p=1;p<=20;p++){ NEW.prog='list page '+p; let older=0, cards=[];
  try{ const h=await fetch('/speeches/search?p='+p).then(r=>r.text()); const d=new DOMParser().parseFromString(h,'text/html');
   cards=[...d.querySelectorAll('.PromoSpeechCard')];
   for(const c of cards){ const cat=c.querySelector('.PromoSpeechCard-category')?.textContent.trim()||''; const a=c.querySelector('.PromoSpeechCard-title a');
     const dt=new Date(c.querySelector('.PromoSpeechCard-date')?.textContent.trim()); if(isNaN(dt)) continue;
     const iso=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
     if(/upcoming/i.test(cat) || dt > new Date()) continue; if(iso < SINCE){older++; continue;}
     const t=a?.textContent.trim(); if(!t) continue;
     NEW.talks.push({s:'byui',t,sp:c.querySelector('.PromoSpeechCard-authorName')?.textContent.trim(),d:iso,u:a.href,k:cat.replace(/s$/,'')});
   }
  }catch(e){NEW.errs.push(p+' '+e)}
  await wait(); if(!cards.length || older===cards.length) break;
 }
 for(const [n,t] of NEW.talks.entries()){ NEW.prog='audio '+(n+1)+'/'+NEW.talks.length;
  try{ const h=await fetch(t.u).then(r=>r.text()); const m=h.match(/https?:\/\/[^"'\s<>]+\.(mp3|m4a)/i); if(m) t.a=m[0]; }catch(e){NEW.errs.push(t.u+' '+e)}
  await wait(); }
 NEW.done=true;
})();

/* ===== BYU–Hawaii — https://speeches.byuh.edu/search (10 s delay; no mp3s, video only) ===== */
const SINCE = '2026-10-04';
window.NEW={done:false,talks:[],errs:[],prog:''};
(async()=>{
 for(let p=1;p<=20;p++){ NEW.prog='page '+p; let older=0, cards=[];
  try{ const h=await fetch('/search?p='+p).then(r=>r.text()); const d=new DOMParser().parseFromString(h,'text/html');
   cards=[...d.querySelectorAll('.SearchSnippet-GridItem')];
   for(const c of cards){ const a=c.querySelector('.promo-title a'); const by=c.querySelector('.promo-author'); if(!a||!by) continue;
     const spans=by.querySelectorAll('span'); const sp=(by.querySelector('a')?.textContent||spans[0]?.textContent||'').replace(/^\s*BY\s*/i,'').replace(/,\s*$/,'').trim();
     const dt=new Date((spans[spans.length-1]?.textContent||'').trim()); if(isNaN(dt)) continue;
     const iso=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
     if(iso < SINCE){older++; continue;}
     const desc=c.querySelector('.promo-description')?.innerHTML.split(/<br\s*\/?>/i).slice(1).join(' ').replace(/<[^>]+>/g,'').trim();
     NEW.talks.push({s:'byuh',t:a.textContent.trim(),sp,d:iso,u:a.href,k:(c.querySelector('.promo-category')?.textContent.trim()||'').replace(/s$/,''),ds:desc||undefined});
   }
  }catch(e){NEW.errs.push(p+' '+e)}
  await new Promise(r=>setTimeout(r,10000)); if(!cards.length || older===cards.length) break;
 }
 NEW.done=true;
})();

/* ===== BYU–Pathway — https://www.byupathway.org/speeches (scroll to load recent talks first; 10 s delay) ===== */
const SINCE = '2026-10-04';
window.NEW={done:false,talks:[],errs:[],prog:''};
(async()=>{
 const seen=new Set();
 for(const a of document.querySelectorAll('a[href*="/speech/"]')){ const u=a.href.split(/[?#]/)[0]; if(seen.has(u)) continue;
  let el=a, lines=[]; for(let i=0;i<6&&el;i++){ el=el.parentElement; lines=el.innerText.split('\n').map(s=>s.trim()).filter(Boolean); if(lines.some(l=>/^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test(l))&&lines.length>=3) break; }
  const di=lines.findIndex(l=>/^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test(l)); if(di<2) continue;
  seen.add(u); const iso=new Date(lines[di]+' 12:00').toISOString().slice(0,10); if(iso < SINCE) continue;
  NEW.talks.push({s:'path',sp:lines[di-2],t:lines[di-1].replace(/^["“”]+|["“”]+$/g,''),d:iso,u,k:'Devotional'}); }
 for(const [n,t] of NEW.talks.entries()){ NEW.prog='audio '+(n+1)+'/'+NEW.talks.length;
  try{ const h=await fetch(t.u).then(r=>r.text()); const m=h.match(/https?:\/\/[^"'\s<>]+\.(mp3|m4a)/i); if(m) t.a=m[0]; }catch(e){NEW.errs.push(t.u+' '+e)}
  await new Promise(r=>setTimeout(r,10000)); }
 NEW.done=true;
})();
