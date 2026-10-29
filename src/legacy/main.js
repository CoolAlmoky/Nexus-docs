/* Legacy remainder of the old single script — being split into classes step by step (see README). */
(function(){
'use strict';
var $=Nexus.Util.$, $$=Nexus.Util.$$;
var bus=new Nexus.EventBus();
var ed=$('#editor'), canvas=$('#canvas');
var esc=Nexus.Util.esc;

/* ---------- Icons ---------- */
var ICON={
 undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
 redo:'<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
 alignL:'<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',alignC:'<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>',
 alignR:'<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>',alignJ:'<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>',
 ul:'<circle cx="5" cy="7" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="17" r="1"/><path d="M10 7h10M10 12h10M10 17h10"/>',
 ol:'<path d="M10 7h10M10 12h10M10 17h10"/><path d="M4 6h1.5v4M4 14h3l-3 4h3"/>',
 check:'<rect x="3.5" y="4.5" width="5" height="5" rx="1"/><path d="m4.6 7 1.3 1.3L8 5.9"/><path d="M12 7h8"/><rect x="3.5" y="14.5" width="5" height="5" rx="1"/><path d="M12 17h8"/>',
 indent:'<path d="M4 6h16M11 10h9M11 14h9M4 18h16"/><path d="m4 9 3.5 3L4 15z"/>',outdent:'<path d="M4 6h16M11 10h9M11 14h9M4 18h16"/><path d="M7.5 9 4 12l3.5 3z"/>',
 link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
 image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/>',
 table:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/>',
 hr:'<path d="M3 12h18"/><path d="M8 7h8M8 17h8" opacity=".5"/>',
 pagebreak:'<path d="M7 3h10v7H7zM7 14h10v7H7z"/><path d="M3 12h2m3 0h2m4 0h2m3 0h2"/>',
 clear:'<path d="M6 5h12M12 5l-3 14M9 19h6"/><path d="m16 14 5 5m0-5-5 5"/>',
 search:'<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
 spacing:'<path d="M8 4v16m0-16L5 7m3-3 3 3M8 20l-3-3m3 3 3-3"/><path d="M14 7h7M14 12h7M14 17h7"/>',
 quote:'<path d="M5 8h5v5a4 4 0 0 1-4 4M14 8h5v5a4 4 0 0 1-4 4"/>',
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 download:'<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/>',upload:'<path d="M12 16V5m0 0-4 4m4-4 4 4M5 20h14"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',trash:'<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
 moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
 close:'<path d="M6 6l12 12M18 6 6 18"/>',up:'<path d="m6 15 6-6 6 6"/>',down:'<path d="m6 9 6 6 6-6"/>',
 textcolor:'<path d="m6 16 6-12 6 12M8.2 12h7.6"/><rect x="4" y="19" width="16" height="3" rx="1" fill="var(--bar,currentColor)" stroke="none"/>',
 marker:'<path d="m5 15 8-8 4 4-8 8H5z"/><rect x="4" y="19" width="16" height="3" rx="1" fill="var(--bar,currentColor)" stroke="none"/>',
 doc:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>'
};
function svg(n,sz){sz=sz||18;return '<svg viewBox="0 0 24 24" width="'+sz+'" height="'+sz+'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICON[n]+'</svg>'}
$$('[data-i]').forEach(function(b){b.innerHTML=svg(b.dataset.i, b.classList.contains('mark')||b.classList.contains('mark')?16:18);var t=b.getAttribute('title');if(t)b.setAttribute('aria-label',t)});
$$('.mark').forEach(function(b){b.innerHTML=svg('doc',16)});
$$('[data-ic]').forEach(function(b){b.innerHTML=svg(b.dataset.ic,15)});

/* ---------- Storage ---------- */
var storage=new Nexus.SafeStorage();
function sget(k){ return storage.get(k) }
function sset(k,v){ return storage.set(k,v) }
function sdel(k){ storage.del(k) }
var IDX='vb.index', DK=function(id){return 'vb.doc.'+id};
var index={current:null,list:[]}, cur=null, dirty=false;
function loadIndex(){ try{var r=sget(IDX); if(r) index=JSON.parse(r)}catch(e){} if(!index||!Array.isArray(index.list)) index={current:null,list:[]}; }
function saveIndex(){ return sset(IDX,JSON.stringify(index)); }
function uid(){ return Nexus.Util.uid() }

/* ---------- HTML sanitizing ---------- */
var OK_TAGS={P:1,BR:1,B:1,STRONG:1,I:1,EM:1,U:1,S:1,STRIKE:1,DEL:1,SUB:1,SUP:1,A:1,UL:1,OL:1,LI:1,H1:1,H2:1,H3:1,H4:1,H5:1,H6:1,BLOCKQUOTE:1,PRE:1,CODE:1,TABLE:1,THEAD:1,TBODY:1,TFOOT:1,TR:1,TD:1,TH:1,IMG:1,HR:1,SPAN:1};
var DROP={SCRIPT:1,STYLE:1,META:1,LINK:1,NOSCRIPT:1,IFRAME:1,OBJECT:1,EMBED:1,FORM:1,INPUT:1,BUTTON:1,SELECT:1,TEXTAREA:1,SVG:1,HEAD:1,TITLE:1,CANVAS:1,VIDEO:1,AUDIO:1};
var KEEP=['font-size','color','background-color','font-family','text-align','font-weight','font-style','text-decoration-line','line-height','margin-left','margin-right','text-indent','vertical-align'];
var KEEP_IMG=['width','max-width','display','margin-left','margin-right'];
var BLK=/^(P|H[1-6]|UL|OL|TABLE|BLOCKQUOTE|PRE|DIV|HR)$/;
function safeUrl(u){return /^(https?:|mailto:|tel:|#)/i.test((u||'').trim())}
function copyStyle(n,e,img){
  var st=n.style; if(!st) return;
  KEEP.concat(img?KEEP_IMG:[]).forEach(function(p){
    var v=st.getPropertyValue(p); if(!v) return;
    if(/url\(|expression|javascript/i.test(v)) return;
    if(p==='background-color'&&/^(transparent|rgba\(0,\s*0,\s*0,\s*0\))$/.test(v)) return;
    e.style.setProperty(p,v);
  });
}
function walk(src,dst,inPre){
  Array.prototype.forEach.call(src.childNodes,function(n){
    if(n.nodeType===3){
      var v=n.nodeValue;
      if(!inPre){
        v=v.replace(/[\t\r\n ]+/g,' ');
        if(!v.trim()){
          var pv=n.previousSibling, nx=n.nextSibling;
          if(!pv||!nx||(pv.nodeType===1&&BLK.test(pv.tagName))||(nx.nodeType===1&&BLK.test(nx.tagName))) return;
        }
      }
      if(v) dst.appendChild(document.createTextNode(v));
      return;
    }
    if(n.nodeType!==1) return;
    var t=n.tagName.toUpperCase();
    if(DROP[t]) return;
    if(t==='DIV'){
      var hasBlock=Array.prototype.some.call(n.children,function(c){return BLK.test(c.tagName)});
      if(hasBlock){walk(n,dst,inPre)} else {var p=document.createElement('p'); copyStyle(n,p); walk(n,p,inPre); dst.appendChild(p)}
      return;
    }
    if(t==='FONT'){
      var sp=document.createElement('span');
      if(n.getAttribute('color')) sp.style.color=n.getAttribute('color');
      if(n.getAttribute('face')) sp.style.fontFamily=n.getAttribute('face');
      walk(n,sp,inPre); dst.appendChild(sp); return;
    }
    if(!OK_TAGS[t]){walk(n,dst,inPre);return}
    if(t==='IMG'){
      var s=n.getAttribute('src')||'';
      if(!/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(s)) return;
      var im=document.createElement('img'); im.src=s; im.alt=n.getAttribute('alt')||''; copyStyle(n,im,true);
      if(!im.style.maxWidth) im.style.maxWidth='100%';
      dst.appendChild(im); return;
    }
    if(t==='A'){
      var h=n.getAttribute('href');
      if(!safeUrl(h)){walk(n,dst,inPre);return}
    }
    var tag=(t==='STRIKE'||t==='DEL')?'s':t.toLowerCase();
    var e=document.createElement(tag);
    if(t==='A'){e.setAttribute('href',n.getAttribute('href').trim()); e.setAttribute('target','_blank'); e.setAttribute('rel','noopener noreferrer')}
    if(t==='UL'&&n.classList.contains('check')) e.className='check';
    if(t==='LI'&&n.getAttribute('data-checked')==='1') e.setAttribute('data-checked','1');
    if(t==='HR'&&n.classList.contains('pb')) e.className='pb';
    if(t==='TABLE'&&n.classList.contains('hdr')) e.className='hdr';
    if((t==='TD'||t==='TH')){
      var cs=parseInt(n.getAttribute('colspan'),10); if(cs>1&&cs<30) e.setAttribute('colspan',cs);
      var rs=parseInt(n.getAttribute('rowspan'),10); if(rs>1&&rs<30) e.setAttribute('rowspan',rs);
    }
    copyStyle(n,e,false);
    if(t!=='BR'&&t!=='HR') walk(n,e,inPre||t==='PRE');
    dst.appendChild(e);
  });
}
function sanitize(html){
  var doc=new DOMParser().parseFromString(html,'text/html');
  var frag=document.createDocumentFragment(); walk(doc.body,frag,false); return frag;
}

/* ---------- Undo history ---------- */
var hist=[], hi=-1, savedRange=null, selImg=null, pendingSize=null;
function getHTML(){
  var c=ed.cloneNode(true);
  $$('.img-sel',c).forEach(function(i){i.classList.remove('img-sel'); if(!i.getAttribute('class')) i.removeAttribute('class')});
  $$('.nx-gs',c).forEach(function(i){i.classList.remove('nx-gs'); i.removeAttribute('data-g'); i.style.removeProperty('--gc'); i.style.removeProperty('--gsh')});
  return c.innerHTML;
}
function offOf(node,o){var r=document.createRange(); r.selectNodeContents(ed); try{r.setEnd(node,o)}catch(e){return 0} return r.toString().length}
function selOffsets(){var s=getSelection(); if(!s.rangeCount||!ed.contains(s.anchorNode)) return null; var r=s.getRangeAt(0); return {s:offOf(r.startContainer,r.startOffset),e:offOf(r.endContainer,r.endOffset)}}
function posAt(n){var w=document.createTreeWalker(ed,NodeFilter.SHOW_TEXT),acc=0,node,last=null; while((node=w.nextNode())){var l=node.nodeValue.length; if(n<=acc+l) return [node,n-acc]; acc+=l; last=node} return last?[last,last.nodeValue.length]:[ed,0]}
function restoreOffsets(o){
  ed.focus({preventScroll:true}); if(!o) return;
  var a=posAt(o.s), b=posAt(o.e), r=document.createRange(); r.setStart(a[0],a[1]); r.setEnd(b[0],b[1]);
  var s=getSelection(); s.removeAllRanges(); s.addRange(r);
}
function record(){
  var h=getHTML();
  if(hist[hi]&&hist[hi].h===h){hist[hi].sel=selOffsets()||hist[hi].sel;return}
  hist.length=hi+1; hist.push({h:h,sel:selOffsets()}); if(hist.length>150) hist.shift(); hi=hist.length-1;
}
function applySnap(s){ ed.innerHTML=s.h; selImg=null; savedRange=null; restoreOffsets(s.sel); afterChange(true); }
function undo(){ clearTimeout(tRec); record(); if(hi<=0) return; hi--; applySnap(hist[hi]); }
function redo(){ if(hi>=hist.length-1) return; hi++; applySnap(hist[hi]); }
function resetHistory(){ hist=[{h:getHTML(),sel:null}]; hi=0; }

/* ---------- Selection & commands ---------- */
function inEditor(){var s=getSelection(); return !!(s.rangeCount&&ed.contains(s.anchorNode))}
function restoreSel(){
  if(document.activeElement!==ed) ed.focus({preventScroll:true});
  if(savedRange){var s=getSelection(); s.removeAllRanges(); s.addRange(savedRange)}
}
function selNode(){var s=getSelection(); if(!s.rangeCount) return null; var n=s.anchorNode; if(n&&n.nodeType===3) n=n.parentElement; return n&&ed.contains(n)?n:null}
function closestIn(sel){var n=selNode(); if(!n) return null; var r=n.closest(sel); return r&&ed.contains(r)?r:null}
function caretIn(el){var r=document.createRange(); r.selectNodeContents(el); r.collapse(true); var s=getSelection(); s.removeAllRanges(); s.addRange(r)}
function run(fn){
  if(document.activeElement!==ed) restoreSel();
  record();
  try{document.execCommand('styleWithCSS',false,true)}catch(e){}
  fn(); afterChange();
}
function cmd(name,val){run(function(){document.execCommand(name,false,val)})}
function ensureTrailing(){
  var l=ed.lastElementChild;
  if(!ed.firstChild){ed.innerHTML='<p><br></p>';return}
  if(l&&/^(TABLE|HR|BLOCKQUOTE|PRE|UL|OL)$/.test(l.tagName)&&l.tagName!=='UL'&&l.tagName!=='OL'){var p=document.createElement('p'); p.innerHTML='<br>'; ed.appendChild(p)}
}
function fixSizes(n){
  var changed=false;
  $$('font[size="7"]',ed).forEach(function(f){var s=document.createElement('span'); s.style.fontSize=n+'pt'; while(f.firstChild) s.appendChild(f.firstChild); f.replaceWith(s); changed=true});
  $$('span[style*="xxx-large"]',ed).forEach(function(s){s.style.fontSize=n+'pt'; changed=true});
  return changed;
}
var STEPS=[8,9,10,10.5,11,12,14,16,18,20,24,28,32,36,48,72];
function applySize(n){
  n=parseFloat(String(n).replace(',','.')); if(!(n>=6)) return; n=Math.min(n,200);
  if(document.activeElement!==ed) restoreSel();
  record();
  try{document.execCommand('styleWithCSS',false,true)}catch(e){}
  document.execCommand('fontSize',false,'7');
  if(!fixSizes(n)) pendingSize=n;
  $('#size').value=String(n);
  afterChange();
}
function curSize(){var n=selNode()||ed; return Math.round(parseFloat(getComputedStyle(n).fontSize)*0.75*2)/2}
function stepSize(dir){
  var c=curSize(), i;
  if(dir>0){ for(i=0;i<STEPS.length;i++) if(STEPS[i]>c){applySize(STEPS[i]);return} applySize(c+4) }
  else { for(i=STEPS.length-1;i>=0;i--) if(STEPS[i]<c){applySize(STEPS[i]);return} applySize(Math.max(6,c-1)) }
}
function setBlock(tag){
  run(function(){
    var bq=closestIn('blockquote');
    if(bq&&tag!=='blockquote'){var f=document.createDocumentFragment(); while(bq.firstChild) f.appendChild(bq.firstChild); bq.replaceWith(f)}
    if(tag==='blockquote'&&bq){var f2=document.createDocumentFragment(); while(bq.firstChild) f2.appendChild(bq.firstChild); bq.replaceWith(f2); return}
    document.execCommand('formatBlock',false,'<'+tag+'>');
  });
}
function checklist(){
  run(function(){
    var ul=closestIn('ul');
    if(ul&&ul.classList.contains('check')){document.execCommand('insertUnorderedList');return}
    if(!ul) document.execCommand('insertUnorderedList');
    var u=closestIn('ul'); if(u) u.classList.add('check');
  });
}
function selectedBlocks(){
  var s=getSelection(); if(!s.rangeCount) return [];
  var r=s.getRangeAt(0), all=$$('p,h1,h2,h3,h4,li,blockquote,pre,td,th',ed).filter(function(b){return r.intersectsNode(b)});
  return all.filter(function(b){return !all.some(function(o){return o!==b&&b.contains(o)})});
}
function setSpacing(v){
  run(function(){ var bl=selectedBlocks(); if(!bl.length){var b=closestIn('p,h1,h2,h3,h4,li,blockquote,pre,td,th'); if(b) bl=[b]} bl.forEach(function(b){b.style.lineHeight=v}) });
}
function pageBreak(){ run(function(){document.execCommand('insertHTML',false,'<hr class="pb"><p><br></p>')}) }
function clearFormat(){
  run(function(){
    document.execCommand('removeFormat');
    selectedBlocks().forEach(function(b){b.removeAttribute('style')});
    $$('span',ed).forEach(function(sp){ if(!sp.getAttribute('style')){ var p=sp.parentNode; if(p&&getSelection().containsNode(sp,true)){while(sp.firstChild)p.insertBefore(sp.firstChild,sp); sp.remove()} } });
  });
}

/* ---------- Tables ---------- */
function insertTable(r,c){
  run(function(){
    var h='<table id="__nt"><tbody>'; for(var i=0;i<r;i++){h+='<tr>'; for(var j=0;j<c;j++) h+='<td><br></td>'; h+='</tr>'} h+='</tbody></table><p><br></p>';
    document.execCommand('insertHTML',false,h);
    var t=document.getElementById('__nt'); if(t){t.removeAttribute('id'); var td=t.querySelector('td'); if(td) caretIn(td)}
  });
}
function newCell(tag){var c=document.createElement(tag||'td'); c.innerHTML='<br>'; return c}
var TBL={
  rowAbove:function(){var c=closestIn('td,th'); if(!c)return; run(function(){var r=c.parentElement, n=r.cloneNode(false); Array.prototype.forEach.call(r.cells,function(x){var y=newCell(x.tagName.toLowerCase()); if(x.style.backgroundColor) y.style.backgroundColor=x.style.backgroundColor; n.appendChild(y)}); r.parentNode.insertBefore(n,r)})},
  rowBelow:function(){var c=closestIn('td,th'); if(!c)return; run(function(){var r=c.parentElement, n=r.cloneNode(false); Array.prototype.forEach.call(r.cells,function(x){n.appendChild(newCell(x.tagName.toLowerCase()))}); r.parentNode.insertBefore(n,r.nextSibling)})},
  colLeft:function(){var c=closestIn('td,th'); if(!c)return; run(function(){var i=c.cellIndex; $$('tr',c.closest('table')).forEach(function(r){var ref=r.cells[i]; if(ref) r.insertBefore(newCell(ref.tagName.toLowerCase()),ref)})})},
  colRight:function(){var c=closestIn('td,th'); if(!c)return; run(function(){var i=c.cellIndex; $$('tr',c.closest('table')).forEach(function(r){var ref=r.cells[i]; if(ref) r.insertBefore(newCell(ref.tagName.toLowerCase()),ref.nextSibling)})})},
  rowDel:function(){var c=closestIn('td,th'); if(!c)return; run(function(){var t=c.closest('table'); if(t.rows.length<=1){t.remove()} else {var r=c.parentElement, nx=r.nextElementSibling||r.previousElementSibling; r.remove(); if(nx&&nx.cells[0]) caretIn(nx.cells[0])}})},
  colDel:function(){var c=closestIn('td,th'); if(!c)return; run(function(){var t=c.closest('table'), i=c.cellIndex; if(t.rows[0].cells.length<=1){t.remove();return} $$('tr',t).forEach(function(r){if(r.cells[i]) r.cells[i].remove()}); var f=t.rows[0].cells[Math.max(0,i-1)]; if(f) caretIn(f)})},
  tblDel:function(){var c=closestIn('td,th'); if(!c)return; run(function(){c.closest('table').remove()})},
  tblHdr:function(){var c=closestIn('td,th'); if(!c)return; run(function(){c.closest('table').classList.toggle('hdr')})}
};
function moveCell(cell,dir){
  var t=cell.closest('table'), cells=$$('td,th',t), i=cells.indexOf(cell)+dir;
  if(i>=cells.length){ TBL.rowBelow(); cells=$$('td,th',t); i=cells.indexOf(cell)+1 }
  if(i<0) i=0; if(cells[i]) caretIn(cells[i]);
}

/* ---------- Colors ---------- */
var PAL=['#000000','#434343','#666666','#999999','#b7b7b7','#d9d9d9','#efefef','#ffffff',
 '#b91c1c','#dc2626','#ea580c','#d97706','#ca8a04','#65a30d','#16a34a','#0d9488',
 '#0891b2','#0284c7','#2563eb','#4f46e5','#7c3aed','#a21caf','#db2777','#be123c',
 '#fecaca','#fed7aa','#fde68a','#d9f99d','#bbf7d0','#a5f3fc','#bfdbfe','#e9d5ff',
 '#7f1d1d','#7c2d12','#713f12','#365314','#14532d','#134e4a','#1e3a8a','#4c1d95'];
var palMode='fore';
(function(){
  var g=$('#palGrid');
  PAL.forEach(function(c){var b=document.createElement('button'); b.className='sw'; b.style.background=c; b.dataset.c=c; b.title=c; b.setAttribute('aria-label',c); g.appendChild(b)});
})();
function applyColor(c){
  closePop();
  if(palMode==='fore'){ cmd('foreColor',c); $('#btnFore').style.setProperty('--bar',c) }
  else if(palMode==='back'){ cmd('hiliteColor',c); if(c!=='transparent') $('#btnBack').style.setProperty('--bar',c) }
  else if(palMode==='cell'){ var cell=closestIn('td,th')||palCell; if(cell) run(function(){cell.style.backgroundColor=c==='transparent'?'':c}) }
}
var palCell=null;

/* ---------- Popups ---------- */
var openPopEl=null, openAnchor=null;
function showPop(pop,anchor){
  if(openPopEl===pop){closePop();return}
  closePop(); pop.hidden=false;
  var r=anchor.getBoundingClientRect(), w=pop.offsetWidth, left=Math.min(Math.max(8,r.left),innerWidth-w-8);
  pop.style.left=left+'px'; pop.style.top=Math.min(r.bottom+6,innerHeight-pop.offsetHeight-8)+'px';
  openPopEl=pop; openAnchor=anchor;
}
function closePop(){ if(openPopEl){openPopEl.hidden=true; openPopEl=null; openAnchor=null} }
document.addEventListener('mousedown',function(e){
  if(openPopEl&&!openPopEl.contains(e.target)&&!e.target.closest('[data-pop]')) closePop();
  var t=e.target;
  if(t.closest&&t.closest('button,.tcell,.sw')&&!t.closest('input,select,textarea,label')) e.preventDefault();
});
var toastT;
function toast(m){var t=$('#toast'); t.textContent=m; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(function(){t.classList.remove('show')},2600)}

/* ---------- Links ---------- */
function normUrl(u){
  u=(u||'').trim(); if(!u) return '';
  if(/^(https?:|mailto:|tel:|#)/i.test(u)) return u;
  if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u)) return 'mailto:'+u;
  if(/^[a-z][a-z0-9+.-]*:/i.test(u)) return '';
  return 'https://'+u;
}
function openLink(){
  if(inEditor()) savedRange=getSelection().getRangeAt(0).cloneRange();
  var a=closestIn('a'), collapsed=savedRange?savedRange.collapsed:true;
  $('#lurl').value=a?a.getAttribute('href'):''; $('#ltext').value='';
  $('#ltextWrap').hidden=!(collapsed&&!a);
  showPop($('#popLink'),$('#btnLink'));
  setTimeout(function(){$('#lurl').focus()},0);
}
function applyLink(){
  var url=normUrl($('#lurl').value); if(!url){toast('Invalid link address'); return}
  var txt=$('#ltext').value.trim(); closePop(); restoreSel();
  var a=closestIn('a');
  run(function(){
    if(a){a.setAttribute('href',url); a.setAttribute('target','_blank'); a.setAttribute('rel','noopener noreferrer')}
    else if(savedRange&&savedRange.collapsed){document.execCommand('insertHTML',false,'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(txt||url)+'</a>&nbsp;')}
    else {document.execCommand('createLink',false,url)}
    $$('a[href]',ed).forEach(function(x){x.setAttribute('target','_blank'); x.setAttribute('rel','noopener noreferrer')});
  });
}

/* ---------- Images ---------- */
function insertImageFile(file){
  if(!file||!/^image\//.test(file.type)) return;
  var rd=new FileReader();
  rd.onload=function(){
    var im=new Image();
    im.onload=function(){
      var w=im.naturalWidth,h=im.naturalHeight,sc=Math.min(1,1400/w),url=rd.result;
      w=Math.round(w*sc); h=Math.round(h*sc);
      var keep=file.type==='image/svg+xml'||(file.size<300*1024&&sc===1)||(file.type==='image/gif'&&file.size<600*1024);
      if(!keep){
        var c=document.createElement('canvas'); c.width=w; c.height=h; var x=c.getContext('2d');
        var png=file.type==='image/png'&&file.size<1200*1024;
        if(!png){x.fillStyle='#fff'; x.fillRect(0,0,w,h)}
        x.drawImage(im,0,0,w,h); url=c.toDataURL(png?'image/png':'image/jpeg',.86);
      }
      run(function(){document.execCommand('insertHTML',false,'<img src="'+url+'" alt="" style="max-width:100%">')});
    };
    im.onerror=function(){toast('Could not read this image')};
    im.src=rd.result;
  };
  rd.readAsDataURL(file);
}
function caretFromPoint(x,y){
  var r=null;
  if(document.caretRangeFromPoint) r=document.caretRangeFromPoint(x,y);
  else if(document.caretPositionFromPoint){var p=document.caretPositionFromPoint(x,y); if(p){r=document.createRange(); r.setStart(p.offsetNode,p.offset); r.collapse(true)}}
  return r;
}
var IMG={
  size:function(p){ if(!selImg)return; run(function(){selImg.style.width=p+'%'; selImg.style.maxWidth='100%'}) },
  align:function(a){ if(!selImg)return; run(function(){selImg.style.display='block'; selImg.style.marginLeft=a==='left'?'0':'auto'; selImg.style.marginRight=a==='right'?'0':'auto'}) },
  del:function(){ if(!selImg)return; run(function(){selImg.remove(); selImg=null}) }
};

/* ---------- Context strip ---------- */
var ctxEl=$('#ctx'), ctxBar=$('#ctxbar'), lastCtx='';
function updateCtx(){
  var parts=[], cell=closestIn('td,th'), a=closestIn('a');
  if(selImg&&ed.contains(selImg)){
    parts.push('<span class="lab">Image</span>'+[25,50,75,100].map(function(p){return '<button class="cb" data-c="imgsize" data-v="'+p+'">'+p+'%</button>'}).join('')+
      '<button class="cb" data-c="imgalign" data-v="left">Left</button><button class="cb" data-c="imgalign" data-v="center">Center</button><button class="cb" data-c="imgalign" data-v="right">Right</button><button class="cb danger" data-c="imgdel">Delete image</button>');
  }
  if(cell){
    parts.push('<span class="lab">Table</span><button class="cb" data-c="rowAbove">Row above +</button><button class="cb" data-c="rowBelow">Row below +</button><button class="cb" data-c="colLeft">Column left +</button><button class="cb" data-c="colRight">Column right +</button>'+
      '<button class="cb" data-c="rowDel">Delete row</button><button class="cb" data-c="colDel">Delete column</button><button class="cb" data-c="tblHdr">Header row</button><button class="cb" data-c="cellBg" data-pop>Cell color</button><button class="cb danger" data-c="tblDel">Delete table</button>');
  }
  if(a){
    var href=a.getAttribute('href')||'';
    parts.push('<span class="lab">Link</span><span class="lab" style="color:var(--ink);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(href)+'</span>'+
      (safeUrl(href)?'<a class="cb" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">Open</a>':'')+'<button class="cb" data-c="linkEdit">Edit</button><button class="cb" data-c="linkOff">Remove link</button>');
  }
  var html=parts.join('<span class="sep"></span>');
  if(html===lastCtx) return; lastCtx=html;
  ctxEl.innerHTML=html; ctxBar.hidden=!parts.length;
}
ctxEl.addEventListener('click',function(e){
  var b=e.target.closest('[data-c]'); if(!b) return; var c=b.dataset.c, v=b.dataset.v;
  if(TBL[c]) return TBL[c]();
  if(c==='imgsize') return IMG.size(v);
  if(c==='imgalign') return IMG.align(v);
  if(c==='imgdel') return IMG.del();
  if(c==='linkEdit') return openLinkFrom(b);
  if(c==='linkOff') return cmd('unlink');
  if(c==='cellBg'){ palCell=closestIn('td,th'); palMode='cell'; showPop($('#popColor'),b) }
});
function openLinkFrom(anchorBtn){
  if(inEditor()) savedRange=getSelection().getRangeAt(0).cloneRange();
  var a=closestIn('a'); $('#lurl').value=a?a.getAttribute('href'):''; $('#ltextWrap').hidden=true;
  showPop($('#popLink'),anchorBtn); setTimeout(function(){$('#lurl').focus()},0);
}

/* ---------- Toolbar state ---------- */
var STATE={bold:'bold',italic:'italic',underline:'underline',strike:'strikeThrough',sub:'subscript',sup:'superscript',ul:'insertUnorderedList',ol:'insertOrderedList',left:'justifyLeft',center:'justifyCenter',right:'justifyRight',justify:'justifyFull'};
var rafS=0;
function scheduleState(){ if(rafS) return; rafS=requestAnimationFrame(function(){rafS=0; refreshState()}) }
function refreshState(){
  if(inEditor()){
    var q=function(c){try{return document.queryCommandState(c)}catch(e){return false}};
    var inCheck=!!closestIn('ul.check');
    Object.keys(STATE).forEach(function(k){
      var b=$('[data-act="'+k+'"]'); if(!b) return; var on=q(STATE[k]);
      if(k==='ul') on=on&&!inCheck; b.classList.toggle('on',!!on);
    });
    $('[data-act="check"]').classList.toggle('on',inCheck);
    var blk=closestIn('h1,h2,h3,h4,blockquote,pre,p'), ss=$('#selStyle');
    if(document.activeElement!==ss) ss.value=blk?blk.tagName.toLowerCase():'p';
    var sf=$('#selFont');
    if(document.activeElement!==sf){
      var f=''; try{f=(document.queryCommandValue('fontName')||'').split(',')[0].replace(/["']/g,'').trim()}catch(e){}
      var opt=$$('option',sf).filter(function(o){return o.value&&o.value.toLowerCase()===f.toLowerCase()})[0];
      sf.value=opt?opt.value:'';
    }
    if(document.activeElement!==$('#size')) $('#size').value=String(curSize());
  }
  updateCtx();
}
document.addEventListener('selectionchange',function(){
  var s=getSelection();
  if(s.rangeCount&&ed.contains(s.anchorNode)) savedRange=s.getRangeAt(0).cloneRange();
  scheduleState();
});

/* ---------- Saving, stats, outline ---------- */
var tRec,tSave,tUi;
function setSave(st){
  var el=$('#saveState'), sp=$('span',el); el.className=st===0?'saving':(st===2?'warn':'');
  sp.textContent=st===0?'Saving…':(st===2?'Not saved permanently':'Saved on this device');
}
function saveNow(show){
  clearTimeout(tSave); if(!cur) return;
  var ok=sset(DK(cur.id),JSON.stringify({title:cur.title,html:getHTML(),updated:Date.now()}));
  var it=index.list.filter(function(x){return x.id===cur.id})[0]; if(it){it.title=cur.title; it.updated=Date.now()}
  index.current=cur.id; ok=saveIndex()&&ok; dirty=false;
  setSave(ok?1:2); renderDocs();
  if(!ok&&show) toast('The browser won\'t allow saving. Use Export to keep a copy.');
  else if(show) toast('Saved');
}
function refreshUI(){
  var t=ed.innerText||'', words=(t.trim().match(/\S+/g)||[]).length, chars=t.replace(/[\n\r]/g,'').length;
  $('#stats').textContent=words.toLocaleString('en-US')+' words · '+chars.toLocaleString('en-US')+' characters';
  var z=(parseFloat(getComputedStyle(ed).zoom)||1), h=ed.getBoundingClientRect().height/z;
  $('#pagesStat').textContent='≈ '+Math.max(1,Math.ceil(h/1123))+' A4 pages';
  renderOutline(); if(findOpen) runFind(true); plugStats();
}
function edited(){
  dirty=true; setSave(0);
  clearTimeout(tRec); tRec=setTimeout(record,600);
  clearTimeout(tSave); tSave=setTimeout(function(){saveNow(false)},900);
  clearTimeout(tUi); tUi=setTimeout(refreshUI,300);
}
function afterChange(skipEdit){ ensureTrailing(); if(!skipEdit||true) edited(); scheduleState(); }
function renderOutline(){
  var hs=$$('h1,h2,h3,h4',ed), box=$('#outline'); box.innerHTML='';
  if(!hs.length){var p=document.createElement('p'); p.className='empty'; p.textContent='Add headings to build an outline. Choose the “Heading 1” style in the toolbar.'; box.appendChild(p); return}
  hs.forEach(function(h){
    var b=document.createElement('button'); b.className='ol l'+h.tagName[1]; b.textContent=h.textContent.trim()||'(Empty heading)';
    b.addEventListener('click',function(){h.scrollIntoView({behavior:'smooth',block:'start'}); if($('#app').classList.contains('side-open')&&innerWidth<=860) toggleSide(false)});
    box.appendChild(b);
  });
}

/* ---------- Documents ---------- */
var confirmDel=null;
function fmtDate(t){try{return new Date(t).toLocaleString('en-US',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}catch(e){return ''}}
function renderDocs(){
  var box=$('#doclist'); box.innerHTML='';
  index.list.slice().sort(function(a,b){return b.updated-a.updated}).forEach(function(d){
    if(confirmDel===d.id){
      var c=document.createElement('div'); c.className='confirm';
      c.innerHTML='<span style="flex:1">Delete this document?</span>';
      var y=document.createElement('button'); y.className='cb danger'; y.textContent='Delete'; y.onclick=function(){deleteDoc(d.id)};
      var n=document.createElement('button'); n.className='cb'; n.textContent='Keep'; n.onclick=function(){confirmDel=null; renderDocs()};
      c.appendChild(y); c.appendChild(n); box.appendChild(c); return;
    }
    var b=document.createElement('div'); b.className='docitem'+(cur&&cur.id===d.id?' cur':''); b.setAttribute('role','button'); b.tabIndex=0;
    var t=document.createElement('div'); t.className='t';
    var nm=document.createElement('b'); nm.textContent=d.title||'Untitled document';
    var sm=document.createElement('small'); sm.textContent=fmtDate(d.updated);
    t.appendChild(nm); t.appendChild(sm);
    var x=document.createElement('span'); x.className='x'; x.title='Delete'; x.innerHTML=svg('trash',15);
    x.addEventListener('click',function(e){e.stopPropagation(); confirmDel=d.id; renderDocs()});
    b.appendChild(t); b.appendChild(x);
    b.addEventListener('click',function(){ if(!cur||cur.id!==d.id){openDoc(d.id); if(innerWidth<=860) toggleSide(false)} });
    b.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault(); b.click()}});
    box.appendChild(b);
  });
}
function createDoc(title,html){
  var id=uid(); sset(DK(id),JSON.stringify({title:title,html:html,updated:Date.now()}));
  index.list.push({id:id,title:title,updated:Date.now()}); index.current=id; saveIndex(); return id;
}
function openDoc(id){
  if(cur) saveNow(false);
  var raw=sget(DK(id)), d=null; try{d=raw&&JSON.parse(raw)}catch(e){}
  if(!d){ d={title:'Untitled document',html:'<p><br></p>'}; }
  cur={id:id,title:d.title||''}; index.current=id; saveIndex();
  $('#title').value=cur.title;
  ed.innerHTML=''; ed.appendChild(sanitize(d.html||''));
  if(!ed.firstChild||(!ed.textContent&&!ed.querySelector('img,table,hr'))) ed.innerHTML='<p><br></p>';
  ensureTrailing(); selImg=null; savedRange=null; lastCtx='';
  resetHistory(); refreshUI(); renderDocs(); setSave(storage.ok?1:2); canvas.scrollTop=0; scheduleState();
  bus.emit('doc:opened',cur);
}
function deleteDoc(id){
  sdel(DK(id)); index.list=index.list.filter(function(x){return x.id!==id}); confirmDel=null;
  if(cur&&cur.id===id){
    cur=null;
    if(index.list.length) openDoc(index.list.slice().sort(function(a,b){return b.updated-a.updated})[0].id);
    else openDoc(createDoc('Untitled document','<p><br></p>'));
  } else {saveIndex(); renderDocs()}
}
function toggleSide(force){
  var app=$('#app'), on=typeof force==='boolean'?force:!app.classList.contains('side-open');
  app.classList.toggle('side-open',on);
}
$$('[data-tab]').forEach(function(t){t.addEventListener('click',function(){
  var w=t.dataset.tab;
  $$('[data-tab]').forEach(function(x){x.setAttribute('aria-selected',x.dataset.tab===w)});
  $('#paneDocs').hidden=w!=='docs'; $('#paneOutline').hidden=w!=='outline'; $('#panePlugins').hidden=w!=='plugins';
})});
$('#title').addEventListener('input',function(){ if(!cur) return; cur.title=this.value; var it=index.list.filter(function(x){return x.id===cur.id})[0]; if(it) it.title=this.value; edited(); renderDocs() });
$('#title').addEventListener('keydown',function(e){ if(e.key==='Enter'){e.preventDefault(); ed.focus()} });

/* ---------- Find & replace ---------- */
var findOpen=false, fM=[], fI=-1;
function clearHl(){ if(window.CSS&&CSS.highlights){CSS.highlights.delete('find'); CSS.highlights.delete('find-cur')} }
function runFind(keep){
  clearHl(); fM=[]; var q=$('#fq').value;
  if(q){
    var mc=$('#fcase').checked, nd=mc?q:q.toLowerCase(), w=document.createTreeWalker(ed,NodeFilter.SHOW_TEXT), n;
    while((n=w.nextNode())){
      var t=mc?n.nodeValue:n.nodeValue.toLowerCase(), i=0;
      while((i=t.indexOf(nd,i))>-1){var r=document.createRange(); r.setStart(n,i); r.setEnd(n,i+q.length); fM.push(r); i+=Math.max(1,q.length)}
    }
  }
  if(!keep||fI>=fM.length) fI=fM.length?0:-1;
  if(fI<0&&fM.length) fI=0;
  paintFind(!keep);
}
function paintFind(scroll){
  var c=$('#fcount'); c.textContent=fM.length?(fI+1)+'/'+fM.length:'0/0';
  if(window.CSS&&CSS.highlights&&window.Highlight){
    if(fM.length) CSS.highlights.set('find',new Highlight(...fM));
    if(fI>=0&&fM[fI]) CSS.highlights.set('find-cur',new Highlight(fM[fI]));
  }
  if(scroll&&fI>=0&&fM[fI]){var el=fM[fI].startContainer.parentElement; if(el) el.scrollIntoView({block:'center'})}
}
function stepFind(d){ if(!fM.length) return; fI=(fI+d+fM.length)%fM.length; paintFind(true) }
function openFind(){
  findOpen=true; $('#findbar').hidden=false;
  var s=getSelection(); if(s.rangeCount&&ed.contains(s.anchorNode)&&!s.isCollapsed&&s.toString().length<80) $('#fq').value=s.toString();
  $('#fq').focus(); $('#fq').select(); runFind(false);
}
function closeFind(){ findOpen=false; $('#findbar').hidden=true; clearHl(); fM=[]; fI=-1; ed.focus() }
function replaceCur(){
  if(fI<0||!fM[fI]) return;
  record(); var r=fM[fI]; ed.focus({preventScroll:true}); var s=getSelection(); s.removeAllRanges(); s.addRange(r);
  document.execCommand('insertText',false,$('#fr').value); afterChange(); runFind(true); if(fM.length) paintFind(true);
}
function replaceAll(){
  if(!fM.length) return; record(); var n=fM.length, rep=$('#fr').value; ed.focus({preventScroll:true});
  for(var i=fM.length-1;i>=0;i--){var s=getSelection(); s.removeAllRanges(); s.addRange(fM[i]); document.execCommand('insertText',false,rep)}
  afterChange(); runFind(false); toast('Replaced '+n+' result(s)');
}
$('#fq').addEventListener('input',function(){runFind(false)});
$('#fcase').addEventListener('change',function(){runFind(false)});
$('#fq').addEventListener('keydown',function(e){ if(e.key==='Enter'){e.preventDefault(); stepFind(e.shiftKey?-1:1)} if(e.key==='Escape'){e.preventDefault(); closeFind()} });
$('#fr').addEventListener('keydown',function(e){ if(e.key==='Enter'){e.preventDefault(); replaceCur()} if(e.key==='Escape'){e.preventDefault(); closeFind()} });
$('#findbar').addEventListener('click',function(e){
  var b=e.target.closest('[data-find]'); if(!b) return; var a=b.dataset.find;
  if(a==='prev') stepFind(-1); else if(a==='next') stepFind(1); else if(a==='close') closeFind(); else if(a==='rep') replaceCur(); else if(a==='repall') replaceAll();
});

/* ---------- Export ---------- */
var downloads=null;
function fileBase(){ return ((cur&&cur.title)||'Document').replace(/[\\/:*?"<>|]+/g,'').trim().slice(0,80)||'Document' }
function saveFile(name,data){
  if(!downloads){
    try{
      var blob=data instanceof Blob?data:new Blob([data],{type:'text/plain;charset=utf-8'}), u=URL.createObjectURL(blob), a=document.createElement('a');
      a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){URL.revokeObjectURL(u)},4000); toast('Downloaded: '+name);
    }catch(e){ toast('Could not download the file. Use “Copy” instead.') }
    return Promise.resolve();
  }
  return downloads.save({filename:name,data:data}).then(function(){toast('File sent: '+name)},function(e){ if(e&&e.code==='declined') return; toast('Could not download the file ('+((e&&e.code)||'error')+')') });
}
function toHtmlFile(){
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(fileBase())+'</title><style>'+
   "body{max-width:794px;margin:40px auto;padding:0 24px;font:11pt/1.5 Georgia,'Times New Roman',serif;color:#1d2327}h1{font-size:20pt}h2{font-size:16pt}h3{font-size:13pt}p{margin:0 0 8pt}table{border-collapse:collapse;width:100%}td,th{border:1px solid #b9c3c9;padding:6px 8px;vertical-align:top}table.hdr tr:first-child td{background:#eef2f4;font-weight:600}img{max-width:100%}blockquote{border-left:3px solid #0d6f78;margin:8pt 0;padding-left:12pt;color:#46555e}pre{background:#eef2f4;padding:10px 12px;border-radius:4px;white-space:pre-wrap}ul.check{list-style:none;padding-left:1.4em}ul.check>li::before{content:'\\2610  ';margin-left:-1.4em}ul.check>li[data-checked='1']::before{content:'\\2611  '}hr.pb{border:0;border-top:2px dashed #999;margin:2em 0}"+
   '</style></head><body>'+getHTML()+'</body></html>';
}
function inlMD(node){
  var s='';
  Array.prototype.forEach.call(node.childNodes,function(c){
    if(c.nodeType===3){s+=c.nodeValue.replace(/([\\*_`])/g,'\\$1'); return}
    if(c.nodeType!==1) return;
    var t=c.tagName, inner=function(){return inlMD(c)};
    if(t==='B'||t==='STRONG') s+='**'+inner()+'**';
    else if(t==='I'||t==='EM') s+='*'+inner()+'*';
    else if(t==='S') s+='~~'+inner()+'~~';
    else if(t==='CODE') s+='`'+c.textContent+'`';
    else if(t==='A') s+='['+inner()+']('+(c.getAttribute('href')||'')+')';
    else if(t==='IMG') s+='![image]()';
    else if(t==='BR') s+='  \n';
    else if(t==='SUP') s+='<sup>'+inner()+'</sup>';
    else if(t==='SUB') s+='<sub>'+inner()+'</sub>';
    else if(t==='UL'||t==='OL') s+='';
    else s+=inner();
  });
  return s;
}
function blkMD(parent,lv){
  var out='';
  Array.prototype.forEach.call(parent.childNodes,function(c){
    if(c.nodeType===3){ if(c.nodeValue.trim()) out+=c.nodeValue.trim()+'\n\n'; return }
    if(c.nodeType!==1) return;
    var t=c.tagName;
    if(/^H[1-6]$/.test(t)) out+=new Array(+t[1]+1).join('#')+' '+inlMD(c).trim()+'\n\n';
    else if(t==='P'||t==='DIV') out+=inlMD(c).trim()+'\n\n';
    else if(t==='UL'||t==='OL'){
      var i=0; Array.prototype.forEach.call(c.children,function(li){
        if(li.tagName!=='LI') return; i++;
        var chk=c.classList.contains('check'), mark=chk?(li.getAttribute('data-checked')==='1'?'- [x] ':'- [ ] '):(t==='OL'?i+'. ':'- ');
        var own=document.createElement('div'); Array.prototype.forEach.call(li.childNodes,function(n){ if(!(n.nodeType===1&&/^(UL|OL)$/.test(n.tagName))) own.appendChild(n.cloneNode(true)) });
        out+=new Array(lv*2+1).join(' ')+mark+inlMD(own).trim()+'\n';
        $$(':scope > ul, :scope > ol',li).forEach(function(sub){var w=document.createElement('div'); w.appendChild(sub.cloneNode(true)); out+=blkMD(w,lv+1)});
      });
      if(lv===0) out+='\n';
    }
    else if(t==='BLOCKQUOTE') out+=blkMD(c,0).trim().split('\n').map(function(l){return '> '+l}).join('\n')+'\n\n';
    else if(t==='PRE') out+='```\n'+c.textContent+'\n```\n\n';
    else if(t==='HR') out+='---\n\n';
    else if(t==='TABLE'){
      var rows=Array.prototype.map.call(c.rows,function(r){return '| '+Array.prototype.map.call(r.cells,function(x){return inlMD(x).trim().replace(/\|/g,'\\|').replace(/\n/g,' ')}).join(' | ')+' |'});
      if(rows.length){var n=c.rows[0].cells.length; rows.splice(1,0,'| '+new Array(n+1).join('--- | ').trim()); out+=rows.join('\n')+'\n\n'}
    }
    else out+=blkMD(c,lv);
  });
  return out;
}
function toMarkdown(){ return blkMD(ed,0).replace(/\n{3,}/g,'\n\n').trim()+'\n' }

/* docx */
var colorProbe=null, colorCache={};
function toHex(c){
  if(!c) return null; if(colorCache[c]!==undefined) return colorCache[c];
  if(!colorProbe){colorProbe=document.createElement('span'); colorProbe.style.display='none'; document.body.appendChild(colorProbe)}
  colorProbe.style.color=''; colorProbe.style.color=c; var v=getComputedStyle(colorProbe).color, m=/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/.exec(v), r=null;
  if(m&&!(m[4]!==undefined&&parseFloat(m[4])===0)) r=[m[1],m[2],m[3]].map(function(n){return ('0'+(+n).toString(16)).slice(-2)}).join('').toUpperCase();
  colorCache[c]=r; return r;
}
function pxOf(v){var m=/^([\d.]+)(px|pt)$/.exec(v||''); if(!m) return 0; return m[2]==='pt'?parseFloat(m[1])*4/3:parseFloat(m[1])}
async function buildDocx(){
  if(!window.JSZip) throw new Error('jszip');
  var zip=new JSZip(), rels=[], rid=10, mediaN=0;
  var MG=appCtx.features.ruler?appCtx.features.ruler.margins():{l:96,r:96}, MGL=Math.round(MG.l*15), MGR=Math.round(MG.r*15), TW=11906-MGL-MGR, IMW=794-MG.l-MG.r;
  var R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  function rPr(f){
    var x='';
    if(f.link) x+='<w:rStyle w:val="Hyperlink"/>';
    if(f.font) x+='<w:rFonts w:ascii="'+esc(f.font)+'" w:hAnsi="'+esc(f.font)+'" w:cs="'+esc(f.font)+'"/>';
    if(f.b) x+='<w:b/>'; if(f.i) x+='<w:i/>'; if(f.s) x+='<w:strike/>';
    if(f.color) x+='<w:color w:val="'+f.color+'"/>';
    if(f.sz) x+='<w:sz w:val="'+f.sz+'"/><w:szCs w:val="'+f.sz+'"/>';
    if(f.u) x+='<w:u w:val="single"/>';
    if(f.hl) x+='<w:shd w:val="clear" w:color="auto" w:fill="'+f.hl+'"/>';
    if(f.va) x+='<w:vertAlign w:val="'+f.va+'"/>';
    return x?'<w:rPr>'+x+'</w:rPr>':'';
  }
  function pushText(txt,f,out){
    var parts=txt.split('\n');
    parts.forEach(function(line,li){
      if(li>0) out.push('<w:r>'+rPr(f)+'<w:br/></w:r>');
      line.split('\t').forEach(function(seg,si){
        if(si>0) out.push('<w:r>'+rPr(f)+'<w:tab/></w:r>');
        if(seg) out.push('<w:r>'+rPr(f)+'<w:t xml:space="preserve">'+esc(seg)+'</w:t></w:r>');
      });
    });
  }
  function imgXml(c){
    var src=c.getAttribute('src')||'', m=/^data:image\/(png|jpe?g|gif);base64,(.*)$/i.exec(src); if(!m) return '';
    var ext=m[1].toLowerCase().replace('jpg','jpeg'), bin=atob(m[2]), u8=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i);
    var n=++mediaN, name='image'+n+'.'+ext; zip.file('word/media/'+name,u8);
    var id='rId'+(rid++); rels.push('<Relationship Id="'+id+'" Type="'+R+'/image" Target="media/'+name+'"/>');
    var nw=c.naturalWidth||400, nh=c.naturalHeight||300, w=nw, pc=/^([\d.]+)%$/.exec(c.style.width||''); if(pc) w=IMW*parseFloat(pc[1])/100; w=Math.min(w,IMW);
    var h=w*nh/nw, cx=Math.round(w*9525), cy=Math.round(h*9525);
    return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+n+'" name="Image '+n+'"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="'+n+'" name="'+name+'"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="'+id+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  }
  function inl(nodes,f,out){
    Array.prototype.forEach.call(nodes,function(c){
      if(c.nodeType===3){pushText(c.nodeValue,f,out); return}
      if(c.nodeType!==1) return;
      var t=c.tagName;
      if(t==='BR'){out.push('<w:r><w:br/></w:r>'); return}
      if(t==='IMG'){var x=imgXml(c); if(x) out.push(x); return}
      var g=Object.assign({},f), st=c.style;
      if(t==='B'||t==='STRONG') g.b=1; if(t==='I'||t==='EM') g.i=1; if(t==='U') g.u=1; if(t==='S') g.s=1;
      if(t==='SUB') g.va='subscript'; if(t==='SUP') g.va='superscript'; if(t==='CODE') g.font='Courier New';
      if(st){
        if(st.fontWeight==='bold'||+st.fontWeight>=600) g.b=1; if(st.fontStyle==='italic') g.i=1;
        var td=st.textDecorationLine||st.textDecoration||''; if(/underline/.test(td)) g.u=1; if(/line-through/.test(td)) g.s=1;
        if(st.color){var h=toHex(st.color); if(h) g.color=h}
        if(st.backgroundColor){var h2=toHex(st.backgroundColor); if(h2) g.hl=h2}
        var px=pxOf(st.fontSize); if(px) g.sz=Math.round(px*0.75*2);
        if(st.fontFamily) g.font=st.fontFamily.split(',')[0].replace(/["']/g,'').trim();
      }
      if(t==='A'&&c.getAttribute('href')){
        var id='rId'+(rid++); rels.push('<Relationship Id="'+id+'" Type="'+R+'/hyperlink" Target="'+esc(c.getAttribute('href'))+'" TargetMode="External"/>');
        var inner=[]; inl(c.childNodes,Object.assign(g,{link:1}),inner); out.push('<w:hyperlink r:id="'+id+'">'+inner.join('')+'</w:hyperlink>'); return;
      }
      inl(c.childNodes,g,out);
    });
  }
  var JC={left:'left',center:'center',right:'right',justify:'both'};
  function para(el,o,nodes,prefix){
    var out=[]; if(prefix) out.push('<w:r>'+rPr(o.f||{})+'<w:t xml:space="preserve">'+prefix+'</w:t></w:r>');
    inl(nodes||el.childNodes,o.f||{},out);
    var p='';
    if(o.style) p+='<w:pStyle w:val="'+o.style+'"/>';
    if(o.num) p+='<w:numPr><w:ilvl w:val="'+o.num.l+'"/><w:numId w:val="'+o.num.id+'"/></w:numPr>';
    var lh=el.style&&parseFloat(el.style.lineHeight); if(lh>0&&lh<10) p+='<w:spacing w:line="'+Math.round(lh*240)+'" w:lineRule="auto"/>';
    var ml=(el.style&&pxS(el.style.marginLeft)||0)*15+(o.ind||0), mrr=(el.style&&pxS(el.style.marginRight)||0)*15, ti=(el.style&&pxS(el.style.textIndent)||0)*15, ia='';
    if(ml>0) ia+=' w:left="'+Math.round(ml)+'"'; if(mrr>0) ia+=' w:right="'+Math.round(mrr)+'"';
    if(ti>0) ia+=' w:firstLine="'+Math.round(ti)+'"'; else if(ti<0) ia+=' w:hanging="'+Math.round(-ti)+'"';
    if(ia) p+='<w:ind'+ia+'/>';
    var ta=el.style&&el.style.textAlign; if(ta&&JC[ta]) p+='<w:jc w:val="'+JC[ta]+'"/>';
    return '<w:p>'+(p?'<w:pPr>'+p+'</w:pPr>':'')+out.join('')+'</w:p>';
  }
  function lst(el,lv,ctx){
    var ord=el.tagName==='OL', chk=el.classList.contains('check'), x='';
    Array.prototype.forEach.call(el.children,function(li){
      if(li.tagName!=='LI') return;
      var kids=Array.prototype.slice.call(li.childNodes), nodes=kids.filter(function(n){return !(n.nodeType===1&&/^(UL|OL)$/.test(n.tagName))}), subs=kids.filter(function(n){return n.nodeType===1&&/^(UL|OL)$/.test(n.tagName)});
      var o=Object.assign({},ctx,{num:chk?null:{l:Math.min(lv,8),id:ord?2:1}}); if(chk) o.ind=(ctx.ind||0)+360*(lv+1);
      x+=para(li,o,nodes,chk?(li.getAttribute('data-checked')==='1'?'☑ ':'☐ '):'');
      subs.forEach(function(s){x+=lst(s,lv+1,ctx)});
    });
    return x;
  }
  function tbl(t,ctx){
    var rows=Array.prototype.slice.call(t.rows); if(!rows.length) return '';
    var cols=Math.max.apply(null,rows.map(function(r){return r.cells.length}))||1, wd=Math.floor(TW/cols), hdr=t.classList.contains('hdr');
    var gc='<w:gridCol w:w="'+wd+'"/>';
    var x='<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>'+['top','left','bottom','right','insideH','insideV'].map(function(b){return '<w:'+b+' w:val="single" w:sz="4" w:space="0" w:color="B9C3C9"/>'}).join('')+'</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>'+gc.repeat(cols)+'</w:tblGrid>';
    rows.forEach(function(r,ri){
      x+='<w:tr>';
      Array.prototype.forEach.call(r.cells,function(c){
        var bg=toHex(c.style.backgroundColor)||(hdr&&ri===0?'EEF2F4':null), span=c.colSpan||1;
        x+='<w:tc><w:tcPr><w:tcW w:w="'+(wd*span)+'" w:type="dxa"/>'+(span>1?'<w:gridSpan w:val="'+span+'"/>':'')+(bg?'<w:shd w:val="clear" w:color="auto" w:fill="'+bg+'"/>':'')+'</w:tcPr>';
        var inner=blocks(c,Object.assign({},ctx,{f:Object.assign({},ctx.f,(hdr&&ri===0)?{b:1}:{})}));
        x+=(inner||'<w:p/>')+'</w:tc>';
      });
      x+='</w:tr>';
    });
    return x+'</w:tbl><w:p/>';
  }
  function block(c,ctx){
    var t=c.tagName, m;
    if((m=/^H([1-6])$/.exec(t))) return para(c,Object.assign({},ctx,{style:'Heading'+Math.min(+m[1],4)}));
    if(t==='P') return para(c,ctx);
    if(t==='DIV'){ var hb=Array.prototype.some.call(c.children,function(k){return /^(P|H[1-6]|UL|OL|TABLE|BLOCKQUOTE|PRE|DIV|HR)$/.test(k.tagName)}); return hb?blocks(c,ctx):para(c,ctx) }
    if(t==='BLOCKQUOTE') return blocks(c,Object.assign({},ctx,{ind:(ctx.ind||0)+720,f:Object.assign({},ctx.f,{i:1,color:'46555E'})}));
    if(t==='PRE') return para(c,Object.assign({},ctx,{f:Object.assign({},ctx.f,{font:'Courier New'})}));
    if(t==='UL'||t==='OL') return lst(c,0,ctx);
    if(t==='TABLE') return tbl(c,ctx);
    if(t==='HR') return c.classList.contains('pb')?'<w:p><w:r><w:br w:type="page"/></w:r></w:p>':'<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="999999"/></w:pBdr></w:pPr></w:p>';
    return '';
  }
  function blocks(parent,ctx){
    var res=[], buf=[];
    function flush(){ if(buf.length){res.push(para(parent,ctx,buf)); buf=[]} }
    Array.prototype.forEach.call(parent.childNodes,function(c){
      if(c.nodeType===3){ if(c.nodeValue.trim()||buf.length) buf.push(c); return }
      if(c.nodeType!==1) return;
      if(/^(P|H[1-6]|UL|OL|TABLE|BLOCKQUOTE|PRE|HR|DIV)$/.test(c.tagName)){flush(); res.push(block(c,ctx))}
      else buf.push(c);
    });
    flush(); return res.join('');
  }
  var ctx0={f:{}}, body=blocks(ed,ctx0);
  var NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="'+R+'" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
  var XH='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  zip.file('[Content_Types].xml',XH+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>');
  zip.file('_rels/.rels',XH+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="'+R+'/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/_rels/document.xml.rels',XH+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="'+R+'/styles" Target="styles.xml"/><Relationship Id="rId2" Type="'+R+'/numbering" Target="numbering.xml"/>'+rels.join('')+'</Relationships>');
  zip.file('word/document.xml',XH+'<w:document '+NS+'><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="'+MGR+'" w:bottom="1440" w:left="'+MGL+'" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>');
  var hs=function(n,sz){return '<w:style w:type="paragraph" w:styleId="Heading'+n+'"><w:name w:val="heading '+n+'"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="'+(n===1?0:240)+'" w:after="120" w:line="276" w:lineRule="auto"/></w:pPr><w:rPr><w:b/><w:sz w:val="'+sz+'"/><w:szCs w:val="'+sz+'"/></w:rPr></w:style>'};
  zip.file('word/styles.xml',XH+'<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:cs="Cambria" w:eastAsia="Cambria"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="360" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'+hs(1,40)+hs(2,32)+hs(3,26)+hs(4,22)+'<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style></w:styles>');
  var lvl=function(i,ord){return '<w:lvl w:ilvl="'+i+'"><w:start w:val="1"/><w:numFmt w:val="'+(ord?'decimal':'bullet')+'"/><w:lvlText w:val="'+(ord?'%'+(i+1)+'.':'•')+'"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="'+(720*(i+1))+'" w:hanging="360"/></w:pPr></w:lvl>'};
  var lv9=function(ord){var s='';for(var i=0;i<9;i++)s+=lvl(i,ord);return s};
  zip.file('word/numbering.xml',XH+'<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>'+lv9(false)+'</w:abstractNum><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>'+lv9(true)+'</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num></w:numbering>');
  return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
async function doExport(kind){
  closePop(); var base=fileBase();
  try{
    if(kind==='docx') await saveFile(base+'.docx',await buildDocx());
    else if(kind==='html') await saveFile(base+'.html',toHtmlFile());
    else if(kind==='md') await saveFile(base+'.md',toMarkdown());
    else if(kind==='txt') await saveFile(base+'.txt',(ed.innerText||'').replace(/\n{3,}/g,'\n\n'));
    else if(kind==='copytxt') copyText(ed.innerText||'');
    else if(kind==='copyhtml') copyText(getHTML());
  }catch(e){ toast('Could not export the file: '+(e&&e.message||'error')) }
}
function copyText(t){
  var fallback=function(){var ta=document.createElement('textarea'); ta.value=t; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); var ok=false; try{ok=document.execCommand('copy')}catch(e){} ta.remove(); toast(ok?'Copied':'Could not copy; select the text and copy it manually')};
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function(){toast('Copied')},fallback); else fallback();
}
$('#popExport').addEventListener('click',function(e){var b=e.target.closest('[data-exp]'); if(b) doExport(b.dataset.exp)});

/* ---------- Import ---------- */
function importFile(file){
  var rd=new FileReader();
  rd.onload=function(){
    var name=file.name.replace(/\.[^.]+$/,''), txt=String(rd.result), html;
    if(/\.html?$/i.test(file.name)||file.type==='text/html') html=txt;
    else html=txt.split(/\r?\n/).map(function(l){return '<p>'+(esc(l)||'<br>')+'</p>'}).join('');
    var tmp=document.createElement('div'); tmp.appendChild(sanitize(html)); var h=tmp.innerHTML||'<p><br></p>';
    if(cur) saveNow(false);
    openDoc(createDoc(name,h)); toast('Imported “'+file.name+'”');
  };
  rd.readAsText(file);
}

/* ---------- Table picker ---------- */
(function(){
  var g=$('#tgrid'), lab=$('#tlabel');
  for(var r=1;r<=6;r++) for(var c=1;c<=8;c++){ var d=document.createElement('div'); d.className='tcell'; d.dataset.r=r; d.dataset.c=c; g.appendChild(d) }
  g.addEventListener('mouseover',function(e){
    var t=e.target.closest('.tcell'); if(!t) return; var r=+t.dataset.r, c=+t.dataset.c;
    $$('.tcell',g).forEach(function(x){x.classList.toggle('hot',+x.dataset.r<=r&&+x.dataset.c<=c)}); lab.textContent=r+' rows × '+c+' columns';
  });
  g.addEventListener('click',function(e){ var t=e.target.closest('.tcell'); if(!t) return; closePop(); insertTable(+t.dataset.r,+t.dataset.c) });
})();
(function(){
  var m=$('#spMenu');
  [['1.0','Single'],['1.15','1.15'],['1.5','1.5'],['2','Double'],['2.5','2.5']].forEach(function(o){
    var b=document.createElement('button'); b.className='mi'; b.textContent=o[1]; b.dataset.v=o[0].replace(',','.'); m.appendChild(b);
  });
  m.addEventListener('click',function(e){var b=e.target.closest('.mi'); if(!b) return; closePop(); setSpacing(b.dataset.v)});
})();
$('#popColor').addEventListener('click',function(e){var s=e.target.closest('.sw'); if(s) applyColor(s.dataset.c)});
$('#palReset').addEventListener('click',function(){applyColor(palMode==='fore'?'#1d2327':'transparent')});
$('#palCustom').addEventListener('input',function(){ var c=this.value; if(palMode==='fore'){cmd('foreColor',c); $('#btnFore').style.setProperty('--bar',c)} else if(palMode==='back'){cmd('hiliteColor',c); $('#btnBack').style.setProperty('--bar',c)} else { var cell=closestIn('td,th')||palCell; if(cell) run(function(){cell.style.backgroundColor=c}) } });
$('#lok').addEventListener('click',applyLink);
$('#lcancel').addEventListener('click',function(){closePop(); restoreSel()});
$('#lurl').addEventListener('keydown',function(e){ if(e.key==='Enter'){e.preventDefault(); applyLink()} });
$('#ltext').addEventListener('keydown',function(e){ if(e.key==='Enter'){e.preventDefault(); applyLink()} });

/* ---------- Toolbar ---------- */
var ACT={
  undo:undo, redo:redo,
  bold:function(){cmd('bold')}, italic:function(){cmd('italic')}, underline:function(){cmd('underline')}, strike:function(){cmd('strikeThrough')},
  sub:function(){cmd('subscript')}, sup:function(){cmd('superscript')},
  left:function(){cmd('justifyLeft')}, center:function(){cmd('justifyCenter')}, right:function(){cmd('justifyRight')}, justify:function(){cmd('justifyFull')},
  ul:function(){cmd('insertUnorderedList')}, ol:function(){cmd('insertOrderedList')}, check:checklist,
  indent:function(){cmd('indent')}, outdent:function(){cmd('outdent')},
  clear:clearFormat, hr:function(){cmd('insertHorizontalRule')}, pagebreak:pageBreak,
  quote:function(){setBlock('blockquote')},
  link:function(){openLink()},
  image:function(){ if(inEditor()) savedRange=getSelection().getRangeAt(0).cloneRange(); $('#imgFile').click() },
  table:function(b){ if(inEditor()) savedRange=getSelection().getRangeAt(0).cloneRange(); showPop($('#popTable'),b) },
  spacing:function(b){ showPop($('#popSpacing'),b) },
  colorFore:function(b){ palMode='fore'; showPop($('#popColor'),b) },
  colorBack:function(b){ palMode='back'; showPop($('#popColor'),b) },
  sizeDown:function(){stepSize(-1)}, sizeUp:function(){stepSize(1)},
  find:openFind, side:function(){toggleSide()},
  newdoc:function(){ if(cur) saveNow(false); openDoc(createDoc('Untitled document','<p><br></p>')); ed.focus(); if(innerWidth<=860) toggleSide(false) },
  export:function(b){ showPop($('#popExport'),b) },
  import:function(){ $('#impFile').click() },
  addplug:function(){ $('#plugFile').click() },
  theme:function(){
    var r=document.documentElement, now=r.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'), nx=now==='dark'?'light':'dark';
    r.setAttribute('data-theme',nx); try{localStorage.setItem('vb.theme',nx)}catch(e){}
  }
};
document.addEventListener('click',function(e){
  var b=e.target.closest('[data-act]'); if(!b||!ACT[b.dataset.act]) return;
  ACT[b.dataset.act](b);
});
$('#selStyle').addEventListener('change',function(){setBlock(this.value)});
$('#selFont').addEventListener('change',function(){
  var v=this.value;
  if(v==='__install'){ this.blur(); refreshState(); $('#fontFile').click(); return }
  if(v==='__manage'){ this.blur(); refreshState(); renderFontPop(); showPop($('#popFonts'),this); return }
  if(v) cmd('fontName',v);
});
$('#size').addEventListener('keydown',function(e){ if(e.key==='Enter'){e.preventDefault(); applySize(this.value); ed.focus()} });
$('#size').addEventListener('change',function(){applySize(this.value)});
var zoomPct=100;
function setZoom(pct,cx,cy){
  pct=Math.max(25,Math.min(400,Math.round(pct))); if(!isFinite(pct)) pct=zoomPct;
  var old=zoomPct, zi=$('#zoom'); zoomPct=pct; zi.value=pct;
  if(pct===old){ return }
  var cr=canvas.getBoundingClientRect();
  if(cx==null){ cx=cr.left+cr.width/2; cy=cr.top+cr.height/2 }
  var px=canvas.scrollLeft+cx-cr.left, py=canvas.scrollTop+cy-cr.top, k=pct/old;
  ed.style.setProperty('--z',pct/100);
  canvas.scrollLeft=px*k-(cx-cr.left); canvas.scrollTop=py*k-(cy-cr.top);
  refreshUI();
}
$('#zoom').addEventListener('change',function(){ var v=parseFloat(this.value); setZoom(isFinite(v)?v:zoomPct) });
$('#zoom').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); this.blur() } });
canvas.addEventListener('wheel',function(e){
  if(!e.altKey) return;
  e.preventDefault();
  var d=e.deltaY||e.deltaX; if(!d) return;
  setZoom(zoomPct*Math.exp(-d*(e.deltaMode===1?0.05:0.0015)),e.clientX,e.clientY);
},{passive:false});
$('#imgFile').addEventListener('change',function(){ if(inEditor()||savedRange) restoreSel(); Array.prototype.forEach.call(this.files,insertImageFile); this.value='' });
$('#impFile').addEventListener('change',function(){ if(this.files[0]) importFile(this.files[0]); this.value='' });

/* ---------- Editor ---------- */
ed.addEventListener('input',function(){
  if(pendingSize&&fixSizes(pendingSize)) pendingSize=null;
  if(selImg){selImg.classList.remove('img-sel'); selImg=null}
  if(!ed.firstChild){ed.innerHTML='<p><br></p>'; caretIn(ed.firstChild)}
  edited(); scheduleState();
});
ed.addEventListener('beforeinput',function(e){
  if(e.inputType==='historyUndo'){e.preventDefault(); undo(); return}
  if(e.inputType==='historyRedo'){e.preventDefault(); redo(); return}
  if(e.inputType==='insertParagraph'&&closestIn('ul.check')){ setTimeout(function(){var li=closestIn('li'); if(li&&li.getAttribute('data-checked')) li.removeAttribute('data-checked')},0) }
});
ed.addEventListener('keydown',function(e){
  var mod=e.ctrlKey||e.metaKey, k=(e.key||'').toLowerCase();
  if(mod&&!e.altKey&&!e.shiftKey&&k==='z'){e.preventDefault(); undo(); return}
  if(mod&&!e.altKey&&((e.shiftKey&&k==='z')||(!e.shiftKey&&k==='y'))){e.preventDefault(); redo(); return}
  if(mod&&!e.altKey&&!e.shiftKey&&k==='k'){e.preventDefault(); openLink(); return}
  if(mod&&k==='enter'){e.preventDefault(); pageBreak(); return}
  if(mod&&e.altKey&&/^Digit[1-4]$/.test(e.code)){e.preventDefault(); setBlock('h'+e.code.slice(5)); return}
  if(mod&&e.altKey&&e.code==='Digit0'){e.preventDefault(); setBlock('p'); return}
  if(mod&&e.shiftKey&&e.code==='Digit7'){e.preventDefault(); cmd('insertOrderedList'); return}
  if(mod&&e.shiftKey&&e.code==='Digit8'){e.preventDefault(); cmd('insertUnorderedList'); return}
  if(mod&&e.shiftKey&&e.code==='KeyL'){e.preventDefault(); cmd('justifyLeft'); return}
  if(mod&&e.shiftKey&&e.code==='KeyE'){e.preventDefault(); cmd('justifyCenter'); return}
  if(mod&&e.shiftKey&&e.code==='KeyR'){e.preventDefault(); cmd('justifyRight'); return}
  if(mod&&e.shiftKey&&e.code==='KeyJ'){e.preventDefault(); cmd('justifyFull'); return}
  if(mod&&e.code==='Backslash'){e.preventDefault(); clearFormat(); return}
  if(e.key==='Tab'&&!mod){
    var cell=closestIn('td,th');
    if(cell){e.preventDefault(); moveCell(cell,e.shiftKey?-1:1); return}
    if(closestIn('li')){e.preventDefault(); cmd(e.shiftKey?'outdent':'indent'); return}
    e.preventDefault(); if(!e.shiftKey) document.execCommand('insertText',false,'\t'); return;
  }
});
ed.addEventListener('click',function(e){
  var t=e.target;
  if(t.tagName==='IMG'){
    if(selImg&&selImg!==t) selImg.classList.remove('img-sel');
    selImg=t; t.classList.add('img-sel'); var r=document.createRange(); r.selectNode(t); var s=getSelection(); s.removeAllRanges(); s.addRange(r); updateCtx(); return;
  }
  if(selImg){selImg.classList.remove('img-sel'); selImg=null; updateCtx()}
  var li=t.closest&&t.closest('li');
  if(li&&li.parentElement&&li.parentElement.classList.contains('check')&&ed.contains(li)){
    var z=parseFloat(getComputedStyle(ed).zoom)||1, rc=li.getBoundingClientRect();
    if(e.clientX>=rc.left&&e.clientX<rc.left+26*z&&e.clientY<rc.top+30*z){
      record(); if(li.getAttribute('data-checked')==='1') li.removeAttribute('data-checked'); else li.setAttribute('data-checked','1'); afterChange();
    }
  }
});
ed.addEventListener('paste',function(e){
  var cd=e.clipboardData; if(!cd) return;
  var files=Array.prototype.filter.call(cd.files||[],function(f){return /^image\//.test(f.type)});
  if(files.length){e.preventDefault(); files.forEach(insertImageFile); return}
  var html=cd.getData('text/html');
  if(html){
    e.preventDefault(); record();
    var tmp=document.createElement('div'); tmp.appendChild(sanitize(html));
    try{document.execCommand('styleWithCSS',false,true)}catch(x){}
    document.execCommand('insertHTML',false,tmp.innerHTML); afterChange();
  }
});
ed.addEventListener('dragover',function(e){ if(e.dataTransfer&&Array.prototype.some.call(e.dataTransfer.types||[],function(t){return t==='Files'})) e.preventDefault() });
ed.addEventListener('drop',function(e){
  var fs=e.dataTransfer&&Array.prototype.filter.call(e.dataTransfer.files||[],function(f){return /^image\//.test(f.type)});
  if(fs&&fs.length){
    e.preventDefault(); var r=caretFromPoint(e.clientX,e.clientY);
    if(r&&ed.contains(r.startContainer)){var s=getSelection(); s.removeAllRanges(); s.addRange(r); savedRange=r.cloneRange()}
    fs.forEach(insertImageFile);
  }
});
document.addEventListener('keydown',function(e){
  var mod=e.ctrlKey||e.metaKey, k=(e.key||'').toLowerCase();
  if(mod&&!e.altKey&&k==='f'){e.preventDefault(); openFind(); return}
  if(mod&&!e.altKey&&k==='h'){e.preventDefault(); openFind(); $('#fr').focus(); return}
  if(mod&&!e.altKey&&k==='s'){e.preventDefault(); saveNow(true); return}
  if(e.key==='Escape'){ if(openPopEl){closePop(); restoreSel()} else if(findOpen) closeFind() }
});
window.addEventListener('beforeunload',function(){ if(dirty) saveNow(false) });
window.addEventListener('pagehide',function(){ if(dirty) saveNow(false) });

/* ---------- Installed fonts (built into the font menu) ---------- */
var FDB='nx.fonts', FST='fonts', FMAX=15*1024*1024;
var fonts=[], faces={}, fGroup=null, fOptInstall=null, fOptManage=null, fMemOnly=false, fMsg='', fdbp=null;
var FSEL=$('#selFont'), FPOP=$('#popFonts');
function fOpenDB(){
  return new Promise(function(res,rej){
    if(!window.indexedDB) return rej(new Error('no idb'));
    var r=indexedDB.open(FDB,1);
    r.onupgradeneeded=function(){r.result.createObjectStore(FST,{keyPath:'id'})};
    r.onsuccess=function(){res(r.result)}; r.onerror=function(){rej(r.error)};
  });
}
function fTx(mode,fn){
  fdbp=fdbp||fOpenDB();
  return fdbp.then(function(d){
    return new Promise(function(res,rej){
      var t=d.transaction(FST,mode), r=fn(t.objectStore(FST));
      t.oncomplete=function(){res(r&&r.result)}; t.onerror=t.onabort=function(){rej(t.error)};
    });
  });
}
function fPut(rec){return fTx('readwrite',function(s){return s.put(rec)}).catch(function(){fMemOnly=true})}
function fDel(id){return fTx('readwrite',function(s){return s.delete(id)}).catch(function(){fMemOnly=true})}
var FSTY={thin:100,hairline:100,extralight:200,ultralight:200,light:300,regular:400,normal:400,book:400,medium:500,semibold:600,demibold:600,bold:700,extrabold:800,ultrabold:800,black:900,heavy:900};
var FWN={100:'Thin',200:'ExtraLight',300:'Light',400:'Regular',500:'Medium',600:'SemiBold',700:'Bold',800:'ExtraBold',900:'Black'};
function fParse(file){
  var base=file.replace(/\.[^.]+$/,''), variable=/variable|\[.*\]/i.test(base);
  base=base.replace(/\[.*?\]/g,'').replace(/[-_ ]?VariableFont.*$/i,'');
  var parts=base.split(/[-_]/), weight=400, style='normal';
  if(parts.length>1){
    var t=parts[parts.length-1].toLowerCase(), it=false;
    if(/(italic|oblique)$/.test(t)){it=true; t=t.replace(/(italic|oblique)$/,'')}
    if(t===''||t in FSTY){ if(t) weight=FSTY[t]; style=it?'italic':'normal'; parts.pop() }
  }
  var family=parts.join(' ').replace(/[^\w \-]/g,'').replace(/\s+/g,' ').trim()||'Custom font';
  return {family:family,weight:variable?'100 900':weight,style:style};
}
function fLabel(f){
  var w=typeof f.weight==='string'?'Variable':(FWN[f.weight]||String(f.weight));
  return f.style==='italic'?(w==='Regular'?'Italic':w+' Italic'):w;
}
function fRegister(rec){
  var ff=new FontFace(rec.family,rec.buf.slice(0),{weight:String(rec.weight),style:rec.style});
  return ff.load().then(function(){document.fonts.add(ff); faces[rec.id]=ff});
}
function fUnregister(id){ if(faces[id]){try{document.fonts.delete(faces[id])}catch(e){} delete faces[id]} }
function fFamilies(){
  var map={}, out=[];
  fonts.forEach(function(f){ if(!map[f.family]){map[f.family]={family:f.family,faces:[]}; out.push(map[f.family])} map[f.family].faces.push(f) });
  out.sort(function(a,b){return a.family.localeCompare(b.family)});
  return out;
}
function fSyncOptions(){
  [fGroup,fOptInstall,fOptManage].forEach(function(n){ if(n&&n.parentNode) n.remove() });
  fGroup=null;
  var prev=FSEL.value, ref=FSEL.firstChild;
  var seen={}, g=document.createElement('optgroup'); g.label='Installed fonts';
  fonts.forEach(function(f){
    if(seen[f.family]) return; seen[f.family]=1;
    var taken=Array.prototype.some.call(FSEL.options,function(o){return o.value===f.family});
    if(taken) return;
    var o=document.createElement('option'); o.value=f.family; o.textContent=f.family; o.style.fontFamily='"'+f.family+'"'; g.appendChild(o);
  });
  fOptInstall=document.createElement('option'); fOptInstall.value='__install'; fOptInstall.textContent='＋ Install font files…'; FSEL.insertBefore(fOptInstall,ref);
  if(fonts.length){ fOptManage=document.createElement('option'); fOptManage.value='__manage'; fOptManage.textContent='Manage installed fonts…'; FSEL.insertBefore(fOptManage,ref) }
  if(g.firstChild){FSEL.insertBefore(g,ref); fGroup=g}
  FSEL.value=(prev&&prev.indexOf('__')!==0)?prev:'';
  if(FSEL.value!==((prev&&prev.indexOf('__')!==0)?prev:'')) FSEL.value='';
}
function installFontFiles(list){
  var files=Array.prototype.slice.call(list), ok=0, bad=[];
  return files.reduce(function(p,file){
    return p.then(function(){
      if(!/\.(ttf|otf|woff2?)$/i.test(file.name)){bad.push(file.name+' (unsupported type)'); return}
      if(file.size>FMAX){bad.push(file.name+' (over 15 MB)'); return}
      return file.arrayBuffer().then(function(buf){
        var n=fParse(file.name), id=n.family+'|'+n.weight+'|'+n.style;
        var rec={id:id,family:n.family,weight:n.weight,style:n.style,file:file.name,size:file.size,buf:buf};
        fUnregister(id);
        return fRegister(rec).then(function(){
          fonts=fonts.filter(function(f){return f.id!==id}); fonts.push(rec); ok++; return fPut(rec);
        });
      }).catch(function(){bad.push(file.name+' (not a valid font)')});
    });
  },Promise.resolve()).then(function(){
    fSyncOptions();
    fMsg=(ok?'Installed '+ok+' font file'+(ok>1?'s':'')+'. ':'')+(bad.length?'Could not install: '+bad.join(', ')+'.':'');
    if(ok&&fMemOnly) fMsg+=' Browser storage is unavailable, so these fonts will be lost when you close the tab.';
    toast(fMsg||'No font installed');
    if(openPopEl===FPOP) renderFontPop();
    scheduleState();
  });
}
function removeFontFamily(name){
  fonts.filter(function(f){return f.family===name}).forEach(function(f){fUnregister(f.id); fDel(f.id)});
  fonts=fonts.filter(function(f){return f.family!==name});
  fSyncOptions(); fMsg='Removed '+name+'. Text that used it now shows a fallback font.';
  if(!fonts.length) closePop(); else renderFontPop();
  scheduleState();
}
function fEl(tag,cls,txt){var e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e}
function renderFontPop(){
  FPOP.innerHTML='';
  var w=fEl('div','fnt-wrap'), h=fEl('div','fnt-head'), add=fEl('button','cb pri','Add font files'); add.type='button';
  add.addEventListener('click',function(){$('#fontFile').click()});
  h.appendChild(fEl('b',null,'Installed fonts')); h.appendChild(add); w.appendChild(h);
  if(fMsg) w.appendChild(fEl('p','fnt-msg',fMsg));
  var list=fEl('div','fnt-list'), fam=fFamilies();
  if(!fam.length) list.appendChild(fEl('p','fnt-note','No fonts installed yet. Choose .ttf, .otf, .woff or .woff2 files, or drop them here.'));
  fam.forEach(function(g){
    var row=fEl('div','fnt-row'), n=fEl('div','n'), b=fEl('b',null,g.family), s=fEl('small',null,g.faces.map(fLabel).join(', '));
    b.style.fontFamily='"'+g.family+'"'; n.appendChild(b); n.appendChild(s);
    var rm=fEl('button','cb danger','Remove'); rm.type='button'; rm.setAttribute('aria-label','Remove font '+g.family);
    rm.addEventListener('click',function(){removeFontFamily(g.family)});
    row.appendChild(n); row.appendChild(rm); list.appendChild(row);
  });
  w.appendChild(list);
  w.appendChild(fEl('p','fnt-note','Pick installed fonts from the toolbar font menu. Name files like Family-Bold.ttf or Family-Italic.ttf to group styles into one family.'));
  w.appendChild(fEl('p','fnt-note','Fonts stay in this browser only. Exported .docx and .html files keep the font name but do not embed the font file, so install it on the other computer too.'));
  FPOP.appendChild(w);
}
FPOP.addEventListener('dragover',function(e){ if(e.dataTransfer&&Array.prototype.indexOf.call(e.dataTransfer.types||[],'Files')>=0){e.preventDefault(); FPOP.classList.add('drop')} });
FPOP.addEventListener('dragleave',function(){FPOP.classList.remove('drop')});
FPOP.addEventListener('drop',function(e){ FPOP.classList.remove('drop'); if(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length){e.preventDefault(); installFontFiles(e.dataTransfer.files)} });
$('#fontFile').addEventListener('change',function(){ if(this.files.length) installFontFiles(this.files); this.value='' });
function initFonts(){
  fSyncOptions();
  if(!window.FontFace||!document.fonts) return;
  fTx('readonly',function(s){return s.getAll()}).then(function(r){return r||[]}).catch(function(){fMemOnly=true; return []}).then(function(list){
    fonts=list.filter(function(f){return f&&f.buf&&f.family});
    return Promise.all(fonts.map(function(f){return fRegister(f).catch(function(){})}));
  }).then(function(){ fSyncOptions(); scheduleState() });
}

/* ---------- Sample document ---------- */
var SAMPLE=[
'<h1>Nexus Docs quick guide</h1>',
'<p>This is an A4 sheet for writing, formatting and exporting to a file. Every change is saved automatically on this device. You can delete this sample and start writing right away.</p>',
'<h2>Text formatting</h2>',
'<p>Select some text, then use the toolbar to make it <b>bold</b>, <i>italic</i>, <u>underlined</u>, <s>struck through</s>, change the <span style="color:#c2410c">text color</span> or add a <span style="background-color:#fde68a">highlight</span>. Font size is in pt (11 pt by default) with 1.5 line spacing. Built-in fonts include Be Vietnam Pro, Source Serif 4, Lora and many system fonts.</p>',
'<h2>Checklist</h2>',
'<ul class="check"><li data-checked="1">Create a new document from the Documents panel on the left</li><li data-checked="1">Try making some text bold</li><li>Insert a 3 × 3 table and press Tab to move between cells</li><li>Paste or drag and drop an image onto the page</li><li>Export a .docx file to send to a colleague</li></ul>',
'<h2>Common shortcuts</h2>',
'<table class="hdr"><tbody><tr><td>Shortcut</td><td>Action</td></tr><tr><td>Ctrl + K</td><td>Insert or edit a link</td></tr><tr><td>Ctrl + F, Ctrl + H</td><td>Find, find and replace</td></tr><tr><td>Ctrl + Enter</td><td>Page break</td></tr><tr><td>Ctrl + Alt + 1, 2, 3</td><td>Heading 1, 2, 3</td></tr><tr><td>Ctrl + Shift + 7, 8</td><td>Numbered list, bulleted list</td></tr><tr><td>Ctrl + Shift + L, E, R, J</td><td>Align left, center, right, justify</td></tr><tr><td>Ctrl + Z, Ctrl + Y</td><td>Undo, redo</td></tr><tr><td>Ctrl + S</td><td>Save now</td></tr></tbody></table>',
'<p><br></p>',
'<blockquote>Tip: images are compressed when inserted to keep the document light. Click an image to change its size and alignment in the strip above.</blockquote>',
'<h2>Storage and sharing</h2>',
'<p>Documents live in this device\'s browser storage and do not sync to other machines automatically. Use the <b>Export</b> button to download .docx, .html, .md or .txt when you need a copy or want to share with someone.</p>'
].join('');

/* ---------- Built-in features (own files in src/features) ---------- */
/* Context handed to every Feature. Mutable legacy state is exposed through getters,
   so features always see the current value instead of a stale copy. */
var appCtx={
  bus:bus, ed:ed, canvas:canvas, $:$, $$:$$, features:{},
  get cur(){ return cur },
  get openPopEl(){ return openPopEl },
  get openAnchor(){ return openAnchor },
  get savedRange(){ return savedRange },
  showPop:showPop, closePop:closePop, record:record, afterChange:afterChange,
  register:function(F){
    var f=new F(appCtx); appCtx.features[f.id]=f;
    bus.on('doc:opened',function(d){ f.onDocChange(d) });
    f.init(); return f;
  }
};
function pxS(v){ return Nexus.Util.pxS(v) }
appCtx.register(Nexus.PageFX);
appCtx.register(Nexus.Ruler);
appCtx.register(Nexus.TextFX);

/* ---------- Plugin ---------- */
var PK='vb.plugins', pcfg={on:{},goal:500}, PLUGINS=[];
try{var pr=sget(PK); if(pr) pcfg=Object.assign(pcfg,JSON.parse(pr))}catch(e){}
if(!pcfg.on) pcfg.on={};
function savePcfg(){ sset(PK,JSON.stringify(pcfg)) }
function plugOn(p){ return p.id in pcfg.on?!!pcfg.on[p.id]:!!p.def }
function wordCount(){ return ((ed.innerText||'').trim().match(/\S+/g)||[]).length }
function plugStats(){
  var el=$('#plugStat'); if(!el) return;
  el.textContent=PLUGINS.filter(function(p){return p.stat&&plugOn(p)}).map(function(p){return p.stat()}).filter(Boolean).join(' · ');
}
function renderPlugins(){
  var box=$('#plugList'); if(!box) return; box.innerHTML='';
  if(pendingPlug){
    var pc=document.createElement('div'); pc.className='plug';
    var ph=document.createElement('div'); ph.className='plug-h'; var pn=document.createElement('b'); pn.textContent='Install or update “'+pendingPlug.name+'”?'; ph.appendChild(pn); pc.appendChild(ph);
    var pd=document.createElement('p'); pd.textContent='A plugin is JavaScript that runs right inside this page. Only install files you trust. If a plugin with the same id was installed from a file before, it is replaced and keeps its settings.'; pc.appendChild(pd);
    var pb=document.createElement('div'); pb.className='plug-b';
    plugBtn(pb,'Install / update',installPending).classList.add('pri'); plugBtn(pb,'Cancel',function(){pendingPlug=null; renderPlugins()});
    pc.appendChild(pb); box.appendChild(pc);
  }
  PLUGINS.forEach(function(p){
    var on=plugOn(p), card=document.createElement('div'); card.className='plug'+(on?'':' off');
    var h=document.createElement('div'); h.className='plug-h';
    var nm=document.createElement('b'); nm.textContent=p.name;
    var tg=document.createElement('button'); tg.className='tgl'; tg.setAttribute('role','switch'); tg.setAttribute('aria-checked',on); tg.setAttribute('aria-label',(on?'Turn off ':'Turn on ')+p.name);
    tg.addEventListener('click',function(){ pcfg.on[p.id]=!plugOn(p); savePcfg(); renderPlugins(); plugStats() });
    h.appendChild(nm);
    if(p.fid){ var rm=document.createElement('button'); rm.className='cb danger'; rm.textContent='Remove'; rm.addEventListener('click',function(){removePlugin(p.fid)}); h.appendChild(rm) }
    h.appendChild(tg); card.appendChild(h);
    var d=document.createElement('p'); d.textContent=p.desc; card.appendChild(d);
    if(on&&p.ui){ var b=document.createElement('div'); b.className='plug-b'; p.ui(b); card.appendChild(b) }
    box.appendChild(card);
  });
}
function plugBtn(box,label,fn){ var b=document.createElement('button'); b.className='cb'; b.textContent=label; b.addEventListener('click',fn); box.appendChild(b); return b }
var replacedFids=[], regCount=0;
function registerPlugin(p){
  if(!p||!p.id||!p.name) return;
  var old=PLUGINS.filter(function(x){return x.id===p.id})[0];
  if(old){
    /* only plugins installed from a file can be replaced (that is how updates work) */
    if(!loadingFid||!old.fid) return;
    try{old.destroy&&old.destroy()}catch(e){}
    PLUGINS=PLUGINS.filter(function(x){return x!==old});
    if(replacedFids.indexOf(old.fid)<0) replacedFids.push(old.fid);
  }
  if(loadingFid) p.fid=loadingFid;
  regCount++; PLUGINS.push(p); renderPlugins(); plugStats();
}
var SK='vb.plugsrc', psrc=[], loadingFid=null, pendingPlug=null;
try{var ps=sget(SK); if(ps) psrc=JSON.parse(ps)}catch(e){}
if(!Array.isArray(psrc)) psrc=[];
(function(){var n=psrc.length; psrc=psrc.filter(function(x){return !/nx\.pagefx\.v1|vb\.nxfx/.test((x&&x.src)||'')}); if(psrc.length!==n) sset(SK,JSON.stringify(psrc))})(); /* the old Page style and Text animations plugins are now built in */
function runPlugSrc(entry){
  regCount=0; loadingFid=entry.fid;
  try{ new Function('NexusDocs','TrangViet',entry.src)(window.NexusDocs,window.NexusDocs) }catch(e){ loadingFid=null; return e.message||'error' }
  loadingFid=null;
  return regCount>0?null:'the file registered no plugin, or its id belongs to a built-in plugin';
}
function installPending(){
  if(!pendingPlug) return;
  var entry={fid:uid(),name:pendingPlug.name,src:pendingPlug.src};
  replacedFids=[]; var err=runPlugSrc(entry), replaced=replacedFids.slice(); replacedFids=[];
  pendingPlug=null;
  if(err){
    /* roll back: drop anything the new file registered, then bring the replaced plugins back */
    PLUGINS.filter(function(x){return x.fid===entry.fid}).forEach(function(x){ try{x.destroy&&x.destroy()}catch(e){} });
    PLUGINS=PLUGINS.filter(function(x){return x.fid!==entry.fid});
    replaced.forEach(function(fid){ var o=psrc.filter(function(x){return x.fid===fid})[0]; if(o) runPlugSrc(o); });
    replacedFids=[]; renderPlugins(); plugStats(); toast('Could not install: '+err); return;
  }
  psrc=psrc.filter(function(x){ return replaced.indexOf(x.fid)<0||PLUGINS.some(function(q){return q.fid===x.fid}) });
  psrc.push(entry); sset(SK,JSON.stringify(psrc)); renderPlugins(); plugStats();
  toast(replaced.length?'Plugin updated':'Plugin installed');
}
function removePlugin(fid){
  PLUGINS.filter(function(p){return p.fid===fid}).forEach(function(p){ try{p.destroy&&p.destroy()}catch(e){} delete pcfg.on[p.id] });
  PLUGINS=PLUGINS.filter(function(p){return p.fid!==fid});
  psrc=psrc.filter(function(x){return x.fid!==fid}); sset(SK,JSON.stringify(psrc)); savePcfg();
  renderPlugins(); plugStats(); toast('Plugin removed');
}
function readPlugFile(file){
  if(file.size>200*1024){ toast('Plugin file is too large (max 200 KB)'); return }
  var rd=new FileReader();
  rd.onload=function(){ pendingPlug={name:file.name,src:String(rd.result)}; renderPlugins(); var t=$('#tabPlugins'); if(t&&t.getAttribute('aria-selected')!=='true') t.click() };
  rd.onerror=function(){ toast('Could not read the file') };
  rd.readAsText(file);
}
$('#plugFile').addEventListener('change',function(){ if(this.files[0]) readPlugFile(this.files[0]); this.value='' });
window.NexusDocs=window.TrangViet={registerPlugin:registerPlugin};
psrc.slice().forEach(function(entry){ var err=runPlugSrc(entry); if(err) console.warn('Plugin '+entry.name+': '+err) });

/* ---------- Startup ---------- */
try{ var th=localStorage.getItem('vb.theme'); if(th==='dark'||th==='light') document.documentElement.setAttribute('data-theme',th) }catch(e){}
try{document.execCommand('defaultParagraphSeparator',false,'p')}catch(e){}
(async function(){ try{ downloads=(window.claude&&window.claude.use)?await window.claude.use('downloads'):null }catch(e){downloads=null} })();
initFonts();
loadIndex();
if(!index.list.length){ openDoc(createDoc('Nexus Docs quick guide',SAMPLE)) }
else {
  var start=index.list.filter(function(x){return x.id===index.current})[0]||index.list[0];
  openDoc(start.id);
}
if(innerWidth>=1000) toggleSide(true);
setSave(storage.ok?1:2);
})();
