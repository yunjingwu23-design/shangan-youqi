import type { Resume } from "./model";
function escape(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export type LayoutReport = {
  pages: number;
  splits: number;
  overflow: boolean;
  error?: string;
};
// This script runs only in our isolated preview iframe and our export Chromium.
// All uploaded text is escaped before insertion; no imported HTML is executed.
const pagination = String.raw`
(async()=>{
 try {
  await document.fonts.load('12px ResumeFont','简历教育');
  await document.fonts.ready;
  if(!document.fonts.check('12px ResumeFont','简历教育'))throw new Error('简历字体加载失败，请重新加载后再导出。');
  const source=document.getElementById('source');const output=document.getElementById('pages');
  let pages=[],splits=0,overflow=false;
  function create(){const sheet=document.createElement('section');sheet.className='sheet';const body=document.createElement('div');body.className='page-content';sheet.append(body);output.append(sheet);pages.push({sheet,body});return body}
  let body=create();const nodes=Array.from(source.children);
  const fits=()=>body.scrollHeight<=body.clientHeight+1;
  for(let index=0;index<nodes.length;index++){
   const node=nodes[index].cloneNode(true);
   if(node.tagName==='H2'&&body.children.length&&body.clientHeight-(body.lastElementChild.getBoundingClientRect().bottom-body.getBoundingClientRect().top)<65){body=create()}
   body.append(node);
   if(fits())continue;
   node.remove();
   if(body.children.length){if(pages.length>=20){body.append(node);overflow=true;continue}body=create();body.append(node);if(fits())continue;node.remove()}
   let chars=Array.from(node.textContent||'');
   if(!chars.length){body.append(node);continue}
   while(chars.length){
    const piece=node.cloneNode(false);body.append(piece);let lo=0,hi=chars.length;
    while(lo<hi){const mid=Math.ceil((lo+hi)/2);piece.textContent=chars.slice(0,mid).join('');if(fits())lo=mid;else hi=mid-1}
    if(lo===0){piece.textContent=chars.join('');overflow=true;break}
    piece.textContent=chars.slice(0,lo).join('');chars=chars.slice(lo);
    if(chars.length){splits++;if(pages.length>=20){piece.textContent+=chars.join('');overflow=true;break}body=create()}
   }
  }
  source.remove();pages.forEach(({sheet},i)=>{const foot=document.createElement('footer');foot.textContent=(i+1)+' / '+pages.length;sheet.append(foot)});
  const horizontal=pages.some(({body})=>body.scrollWidth>body.clientWidth+2);overflow=overflow||horizontal;
  const report={pages:pages.length,splits,overflow};window.__RESUME_LAYOUT=report;
  if(window.parent!==window)window.parent.postMessage({type:'sayq-resume-layout',nonce:document.body.dataset.nonce,...report},'*');
 }catch(error){const report={pages:0,splits:0,overflow:true,error:error.message||'排版失败'};window.__RESUME_LAYOUT=report;if(window.parent!==window)window.parent.postMessage({type:'sayq-resume-layout',nonce:document.body.dataset.nonce,...report},'*')}
})();`;
export function resumeHtml(resume: Resume, fontCSS: string, nonce = "export") {
  const s = resume.style;
  const paragraphs = (content: string) =>
    content
      .split("\n")
      .map((line) => `<p>${escape(line) || "&#160;"}</p>`)
      .join("");
  const content = `<h1>${escape(resume.personal.name || "未填写姓名")}</h1>${resume.personal.headline ? `<p class="headline">${escape(resume.personal.headline)}</p>` : ""}${resume.personal.contact ? `<p class="contact">${escape(resume.personal.contact)}</p>` : ""}${resume.sections.map((section) => `<h2>${escape(section.title)}${section.period ? `<span>${escape(section.period)}</span>` : ""}</h2>${paragraphs(section.content)}`).join("")}`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src data:; img-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'"><style>
 ${fontCSS}
 *{box-sizing:border-box}html,body{margin:0;padding:0}body{background:#e9ece6;font-family:ResumeFont,sans-serif;font-size:${s.fontSize}pt;line-height:${s.lineHeight};color:#202420;-webkit-print-color-adjust:exact;print-color-adjust:exact}
 .sheet{background:white;width:210mm;height:297mm;margin:0 0 20px;padding:${s.margin}mm;position:relative;break-after:page;overflow:hidden}.sheet:last-child{break-after:auto}
 .page-content{height:calc(297mm - ${s.margin * 2}mm - 8mm);width:100%;overflow:visible;display:flow-root}
 h1{font-size:${s.fontSize * 2.15}pt;margin:0 0 7px;line-height:1.5;font-weight:700;overflow-wrap:anywhere}p{margin:0;min-height:1em;white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal}h2{font-size:${s.fontSize + 1}pt;border-bottom:1px solid #626e5c;padding:0 0 4px;margin:${s.sectionGap}px 0 7px;line-height:1.5;break-after:avoid;overflow-wrap:anywhere;font-weight:700}h2 span{float:right;font-size:${s.fontSize - 1}pt;font-weight:400;margin-left:12px}.headline{font-size:${s.fontSize + 1}pt;margin:0 0 6px}.contact{font-size:${s.fontSize - 1}pt;color:#535d4a;margin:0 0 10px}.sheet footer{position:absolute;bottom:${Math.max(6, s.margin - 7)}mm;left:${s.margin}mm;right:${s.margin}mm;text-align:right;color:#8b9483;font-size:8pt}#source{position:absolute;visibility:hidden;left:-10000px;width:calc(210mm - ${s.margin * 2}mm)}
 @page{size:A4;margin:0}@media print{html,body{background:white}.sheet{margin:0;box-shadow:none}}
 </style></head><body data-nonce="${escape(nonce)}"><div id="source">${content}</div><main id="pages"></main><script nonce="${nonce}">${pagination}</script></body></html>`;
}
