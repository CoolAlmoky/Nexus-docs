/* Ruler — built-in feature. Logic moved verbatim from the old monolith; see Feature.js for the lifecycle. */
(function () {
'use strict';
class Ruler extends Nexus.Feature {
  get id() { return 'ruler'; }
  init() {
    var app = this.app;
    var ed=app.ed, canvas=app.canvas, $=app.$, $$=app.$$, record=app.record, afterChange=app.afterChange;

    var pxS = Nexus.Util.pxS;
    var CM=96/2.54, PW=794, STEP=CM/8, KEY='nx.ruler.v1', MINW=120;
    var wrap=$('.canvaswrap'), st={docs:{},on:true}, ml=96, mr=96, raf=0, drag=null;
    try{var q=JSON.parse(localStorage.getItem(KEY)||'{}'); if(q&&q.docs&&typeof q.docs==='object') st.docs=q.docs; if(q&&typeof q.on==='boolean') st.on=q.on}catch(e){}
    function persist(){
      try{
        var id=app.cur&&app.cur.id; if(id){ if(ml===96&&mr===96) delete st.docs[id]; else st.docs[id]={l:Math.round(ml*100)/100,r:Math.round(mr*100)/100}; }
        localStorage.setItem(KEY,JSON.stringify(st));
      }catch(e){}
    }
    function applyMargins(){ ed.style.setProperty('--ml',ml+'px'); ed.style.setProperty('--mr',mr+'px'); }
    function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
    function r2(v){return Math.round(v*100)/100}

    var css=document.createElement('style'); css.textContent=[
    '#ruler{display:none;position:absolute;left:0;top:0;right:0;height:40px;overflow:hidden;background:var(--chrome);border:1px solid var(--line);border-bottom:0;border-radius:10px 10px 0 0;z-index:7;user-select:none;-webkit-user-select:none;--rtxt:#fff;--rmar:var(--bg2)}',
    '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) #ruler{--rtxt:#25343c}}',
    ':root[data-theme="dark"] #ruler{--rtxt:#25343c}',
    '#rkPage{position:absolute;top:0;left:0;height:40px}',
    '#rkPage svg{position:absolute;left:0;top:0;pointer-events:none}',
    '.rk{position:absolute;touch-action:none;cursor:pointer;z-index:2;margin-left:-7px;width:14px}',
    '.rk i{position:absolute;inset:0;background:var(--ink);opacity:.72}',
    '.rk:hover i,.rk.act i{background:var(--accent);opacity:1}',
    '.rk-f{top:1px;height:12px}.rk-f i{inset:0 1px 0 1px;clip-path:polygon(0 0,100% 0,100% 45%,50% 100%,0 45%)}',
    '.rk-h{top:26px;height:9px}.rk-h i{inset:0 1px 0 1px;clip-path:polygon(50% 0,100% 45%,100% 100%,0 100%,0 45%)}',
    '.rk-l{top:35px;height:5px}.rk-l i{inset:0 1px 0 1px}',
    '.rk-r{top:26px;height:9px}.rk-r i{inset:0 1px 0 1px;clip-path:polygon(50% 0,100% 45%,100% 100%,0 100%,0 45%)}',
    '.rk.dis{opacity:.35;pointer-events:none}',
    '.rk-m{position:absolute;top:12px;height:14px;width:8px;margin-left:-4px;cursor:ew-resize;z-index:1;touch-action:none}',
    '.rk-m:hover,.rk-m.act{background:var(--accent);opacity:.4}',
    '#rkGuide{display:none;position:absolute;top:0;bottom:0;width:0;border-left:1px dashed var(--accent);z-index:8;pointer-events:none}',
    '#rkTip{display:none;position:absolute;top:44px;z-index:9;background:var(--ink);color:var(--bg);font-size:11.5px;padding:2px 7px;border-radius:5px;pointer-events:none;white-space:nowrap;transform:translateX(-50%)}',
    '#rulerWrap{display:flex;align-items:center;gap:6px;cursor:pointer}',
    '@media (min-width:861px){.rulerOn #ruler{display:block}.rulerOn #canvas{top:40px}.rulerOn .findbar{top:50px}}',
    '@media (max-width:860px){#rulerWrap{display:none}}'
    ].join('\n'); document.head.appendChild(css);

    var R=document.createElement('div'); R.id='ruler'; R.setAttribute('role','group'); R.setAttribute('aria-label','Ruler');
    var page=document.createElement('div'); page.id='rkPage'; R.appendChild(page);
    var NS='http://www.w3.org/2000/svg', svgEl=document.createElementNS(NS,'svg'); svgEl.setAttribute('height','40'); svgEl.setAttribute('aria-hidden','true'); page.appendChild(svgEl);
    function mk(cls,k,title){var d=document.createElement('div'); d.className=cls; d.dataset.k=k; d.title=title; d.setAttribute('aria-label',title); if(cls.indexOf('rk-m')<0) d.appendChild(document.createElement('i')); page.appendChild(d); return d}
    var mML=mk('rk-m','ml','Left margin'), mMR=mk('rk-m','mr','Right margin');
    var kF=mk('rk rk-f','first','First line indent'), kH=mk('rk rk-h','hang','Hanging indent'), kL=mk('rk rk-l','left','Left indent'), kR=mk('rk rk-r','right','Right indent');
    var guide=document.createElement('div'); guide.id='rkGuide';
    var tip=document.createElement('div'); tip.id='rkTip';
    wrap.insertBefore(R,wrap.firstChild); wrap.appendChild(guide); wrap.appendChild(tip);

    var lab=document.createElement('label'); lab.id='rulerWrap'; lab.innerHTML='<input type="checkbox" id="rulerOn"> Ruler';
    var zw=$('#zoomWrap'); zw.parentNode.insertBefore(lab,zw);
    var chk=$('#rulerOn'); chk.checked=st.on; wrap.classList.toggle('rulerOn',st.on);
    chk.addEventListener('change',function(){ st.on=chk.checked; wrap.classList.toggle('rulerOn',st.on); persist(); schedule(); });

    function rangeNow(){
      var sl=getSelection();
      if(sl.rangeCount&&ed.contains(sl.anchorNode)) return sl.getRangeAt(0);
      return app.savedRange&&ed.contains(app.savedRange.startContainer)?app.savedRange:null;
    }
    function getBlocks(){
      var r=rangeNow(); if(!r) return [];
      var all=$$('p,h1,h2,h3,h4,li,blockquote,pre',ed).filter(function(b){return r.intersectsNode(b)});
      return all.filter(function(b){return !all.some(function(o){return o!==b&&b.contains(o)})});
    }
    function read(b,s,er){
      var br=b.getBoundingClientRect();
      return {b:b,L:(br.left-er.left)/s,R:(br.right-er.left)/s,ML:pxS(b.style.marginLeft),TI:pxS(b.style.textIndent),MR:pxS(b.style.marginRight)};
    }
    function setPx(b,prop,v){
      v=r2(v);
      if(Math.abs(v)<0.01) b.style.removeProperty(prop); else b.style.setProperty(prop,v+'px');
      if(!b.getAttribute('style')) b.removeAttribute('style');
    }

    function ticks(s){
      var W=PW*s, x0=ml*s, x1=(PW-mr)*s, pxcm=CM*s, o='';
      o+='<rect x="0" y="12" width="'+W+'" height="14" style="fill:var(--rmar)"/>';
      o+='<rect x="'+x0+'" y="12" width="'+Math.max(0,x1-x0)+'" height="14" style="fill:var(--rtxt)"/>';
      o+='<rect x=".5" y="12.5" width="'+(W-1)+'" height="13" style="fill:none;stroke:var(--line)"/>';
      var nLo=Math.ceil(x0/pxcm*4), nHi=Math.ceil((W-x0)/pxcm*4), numStep=Math.max(1,Math.ceil(24/pxcm));
      for(var i=-nLo;i<=nHi;i++){
        var x=x0+i/4*pxcm; if(x<2||x>W-2) continue;
        if(i%4===0){
          if(i===0) continue; var k=Math.abs(i/4); if(k%numStep) continue;
          o+='<text x="'+x.toFixed(1)+'" y="22.6" text-anchor="middle" style="font-size:9px;fill:var(--muted);font-family:var(--f-ui)">'+k+'</text>';
        } else if(i%2===0){ if(pxcm>=16) o+='<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="16" y2="22" style="stroke:var(--muted)"/>'; }
        else if(pxcm>=36) o+='<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="17.5" y2="20.5" style="stroke:var(--muted)"/>';
      }
      return o;
    }
    var lastSig='';
    function update(){
      raf=0;
      if(!st.on||innerWidth<=860) return;
      var cr=wrap.getBoundingClientRect(), er=ed.getBoundingClientRect(), s=er.width/PW;
      if(!(s>0)) return;
      page.style.left=(er.left-cr.left)+'px'; page.style.width=er.width+'px';
      var bl=drag?drag.bl:getBlocks(), p0=bl.length?read(bl[0],s,er):null;
      var L=p0?p0.L:ml, F=p0?p0.L+p0.TI:ml, Rt=p0?p0.R:PW-mr;
      var sig=[s.toFixed(4),ml,mr].join('|');
      if(sig!==lastSig){ lastSig=sig; svgEl.setAttribute('width',er.width); svgEl.setAttribute('viewBox','0 0 '+er.width+' 40'); svgEl.innerHTML=ticks(s); }
      mML.style.left=(ml*s)+'px'; mMR.style.left=((PW-mr)*s)+'px';
      kF.style.left=(F*s)+'px'; kH.style.left=(L*s)+'px'; kL.style.left=(L*s)+'px'; kR.style.left=(Rt*s)+'px';
      [kF,kH,kL,kR].forEach(function(k){k.classList.toggle('dis',!p0)});
    }
    function schedule(){ if(!raf) raf=requestAnimationFrame(update); }

    /* dragging */
    function showGuide(p,s,er,txt){
      var cr=wrap.getBoundingClientRect(), x=er.left-cr.left+p*s;
      guide.style.display='block'; guide.style.left=x+'px'; tip.style.display='block'; tip.style.left=x+'px'; tip.textContent=txt;
    }
    function hideGuide(){ guide.style.display='none'; tip.style.display='none'; }
    page.addEventListener('mousedown',function(e){ e.preventDefault(); });
    page.addEventListener('pointerdown',function(e){
      var t=e.target.closest&&e.target.closest('[data-k]'); if(!t||e.button>0) return;
      var k=t.dataset.k, er=ed.getBoundingClientRect(), s=er.width/PW, bl=[];
      if(k!=='ml'&&k!=='mr'){ bl=getBlocks(); if(!bl.length) return; }
      e.preventDefault(); record();
      drag={k:k,el:t,bl:bl,s:s,items:bl.map(function(b){return read(b,s,er)}),dirty:false,id:e.pointerId};
      t.classList.add('act'); try{t.setPointerCapture(e.pointerId)}catch(x){}
    });
    page.addEventListener('pointermove',function(e){
      if(!drag||e.pointerId!==drag.id) return;
      var er=ed.getBoundingClientRect(), s=er.width/PW, p=(e.clientX-er.left)/s, k=drag.k, P=drag.items[0], txt='';
      if(k==='ml'||k==='mr'){
        if(!e.altKey) p=Math.round(p/STEP)*STEP;
        if(k==='ml'){ ml=clamp(p,0,PW-mr-MINW); txt='Left margin '+(ml/CM).toFixed(2)+' cm'; p=ml; }
        else { mr=clamp(PW-p,0,PW-ml-MINW); txt='Right margin '+(mr/CM).toFixed(2)+' cm'; p=PW-mr; }
        applyMargins(); drag.dirty=true; drag.margin=true;
      } else {
        if(!e.altKey) p=ml+Math.round((p-ml)/STEP)*STEP;
        var it,i;
        if(k==='first'){
          p=Math.max(p,0); var dTI=(p-P.L)-P.TI;
          for(i=0;i<drag.items.length;i++){ it=drag.items[i]; setPx(it.b,'text-indent',it.TI+dTI); }
          txt='First line '+((p-ml)/CM).toFixed(2)+' cm';
        } else if(k==='left'||k==='hang'){
          p=clamp(p,0,P.R-10); var dML=p-P.L;
          for(i=0;i<drag.items.length;i++){
            it=drag.items[i]; var base=it.L-it.ML, nm=Math.max(it.ML+dML,-base);
            setPx(it.b,'margin-left',nm);
            if(k==='hang') setPx(it.b,'text-indent',it.TI-(nm-it.ML));
          }
          txt=(k==='hang'?'Hanging ':'Left indent ')+((p-ml)/CM).toFixed(2)+' cm';
        } else {
          p=clamp(p,P.L+10,PW); var dMR=P.R-p;
          for(i=0;i<drag.items.length;i++){ it=drag.items[i]; setPx(it.b,'margin-right',Math.max(it.MR+dMR,-mr)); }
          txt='Right indent '+((PW-mr-p)/CM).toFixed(2)+' cm';
        }
        drag.dirty=true;
      }
      var er2=ed.getBoundingClientRect(); showGuide(p,s,er2,txt); lastSig=''; schedule();
    });
    function endDrag(e){
      if(!drag||(e&&e.pointerId!==drag.id)) return;
      var d=drag; drag=null; d.el.classList.remove('act'); hideGuide();
      if(d.dirty){ if(d.margin) persist(); afterChange(); }
      lastSig=''; schedule();
    }
    page.addEventListener('pointerup',endDrag); page.addEventListener('pointercancel',endDrag);

    /* keep in sync */
    document.addEventListener('selectionchange',schedule);
    ed.addEventListener('input',schedule); ed.addEventListener('keyup',schedule); ed.addEventListener('click',schedule);
    canvas.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',function(){lastSig='';schedule()});
    if(window.ResizeObserver){ var ro=new ResizeObserver(function(){lastSig='';schedule()}); ro.observe(ed); ro.observe(wrap); }

    function onDoc(){
      var m=app.cur&&st.docs[app.cur.id]; ml=m&&isFinite(m.l)?clamp(+m.l,0,PW-MINW-96):96; mr=m&&isFinite(m.r)?clamp(+m.r,0,PW-MINW-ml):96;
      applyMargins(); lastSig=''; schedule();
    }
    applyMargins(); schedule();
    this._api = { onDoc: onDoc, margins: function(){return {l:ml,r:mr}} };
  }
  onDocChange() { if (this._api) this._api.onDoc(); }
  margins() { return this._api.margins(); }
}
Nexus.Ruler = Ruler;
})();
