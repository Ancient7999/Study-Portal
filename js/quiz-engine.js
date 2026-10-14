/* Study Portal — quiz engine ported from Med Physics PT1 (quiz/index.html 2157–3995).
 *
 * Copied PT1 functions keep their names, texts, timings and behaviour. Portal
 * adaptations are marked "ADAPT:" and portal-only extras "PORTAL:". New
 * stepped ("bone") questions are marked "STEPPED:".
 *
 * Globals used from the portal's inline script: showToast, spawnFireworkBurst,
 * W, H, unlockAudio, customCursorOn, openMoodTray, moodWrap, __activeMaterial.
 */

/* —— PT1 2158–2204 helpers —— */
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
function escapeHtml(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function shuffle(arr){
  const a=arr.slice();
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; }
  return a;
}
function isMatching(q){ return !!(q && (q.type==='matching' || q.correct_pairs || (Array.isArray(q&&q.left) && Array.isArray(q&&q.correct)))); }
function matchRightId(i){
  const L='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if(i<26) return L[i];
  i-=26; return L[Math.floor(i/26)]+L[i%26];
}
/** Normalize legacy matching {left,options,correct:idx[]} → working {leftItems,rightItems,correct_pairs}. Idempotent. */
function normalizeMatching(q){
  if(!q || !isMatching(q)) return q;
  if(Array.isArray(q.leftItems) && Array.isArray(q.rightItems) && q.correct_pairs && typeof q.correct_pairs==='object'){
    return mergeDuplicateRights(q);
  }
  const left=Array.isArray(q.left)?q.left:(Array.isArray(q.prompts)?q.prompts:[]);
  const options=Array.isArray(q.options)?q.options:(Array.isArray(q.right)?q.right:(Array.isArray(q.responses)?q.responses:[]));
  const correct=Array.isArray(q.correct)?q.correct:[];
  if(!left.length || !options.length || correct.length!==left.length) return q;
  q.leftItems=left.map((t,i)=>({id:String(i+1), text:String(t)}));
  q.rightItems=options.map((t,i)=>({id:matchRightId(i), text:String(t)}));
  const pairs={};
  correct.forEach((optIdx,i)=>{ pairs[String(i+1)]=matchRightId(optIdx); });
  q.correct_pairs=pairs;
  q.type=q.type||'matching';
  return mergeDuplicateRights(q);
}
/** Two right-hand items with the same text (e.g. "Pain" for -algia and -dynia) are one answer:
 *  show it once and let every matching term link to it (many-to-one). The bank file is untouched;
 *  without this, linking to the "other" identical box would be marked wrong. Idempotent. */
function mergeDuplicateRights(q){
  if(!q || !Array.isArray(q.rightItems) || !q.correct_pairs) return q;
  const key=t=>String(t==null?'':t).replace(/\s+/g,' ').trim().toLowerCase();
  const keep={}, remap={}, items=[];
  q.rightItems.forEach(it=>{ const k=key(it.text); if(k && keep[k]){ remap[it.id]=keep[k]; } else { if(k) keep[k]=it.id; items.push(it); } });
  if(!Object.keys(remap).length) return q;
  q.rightItems=items;
  Object.keys(q.correct_pairs).forEach(l=>{ const r=q.correct_pairs[l]; if(remap[r]) q.correct_pairs[l]=remap[r]; });
  return q;
}
function normalizeBankMatching(data){
  if(!data || !data.bank) return data;
  Object.keys(data.bank).forEach(form=>{
    const qs=data.bank[form];
    if(!Array.isArray(qs)) return;
    qs.forEach(normalizeMatching);
  });
  return data;
}
function qid(q,i){ return String(q && (q.id!=null?q.id:('q_'+(q.q||'').slice(0,48)+'_'+i))); }
/* STEPPED: question-type layer */
function isStepped(q){ return !!(q && !isMatching(q) && (q.type==='stepped' || Array.isArray(q.steps))); }
function isStep(q){ return !!(q && q.__step); }
/* a typed (short-answer) step inside a stepped question */
function isTypedStepDef(st){ return !!(st && (st.type==='saq' || (st.answer!=null && !Array.isArray(st.options)))); }
function isTypedStep(q){ return isStep(q) && isSaq(q); }
/* SAQ (short answer): {q, answer, explain} — typed answer, lenient match. */
function isOrder(q){ return !!(q && q.type==='order' && Array.isArray(q.stages)); }
function isLabel(q){ return !!(q && q.type==='label' && Array.isArray(q.labels)); }
function isSaq(q){ return !!(q && !isMatching(q) && !isStepped(q) && !isLabel(q) && !isOrder(q) && (q.type==='saq' || (q.answer!=null && !Array.isArray(q.options)))); }
/* saq grading is STRICT: case, punctuation and slashes all count. Only leading/trailing
   whitespace is trimmed and runs of internal whitespace collapse to one space. */
function saqNorm(s){ return String(s==null?'':s).trim().replace(/\s+/g,' '); }
function saqAccepts(q){ const a=q&&q.answer; return (Array.isArray(a)?a:[a]).concat(Array.isArray(q&&q.accept)?q.accept:[]).filter(x=>x!=null&&String(x).trim()!==''); }
function saqMatches(q, typed){ const t=saqNorm(typed); return !!t && saqAccepts(q).some(a=>saqNorm(a)===t); }
/* Hint for a wrong short answer (the answer itself is never shown). Lower case, PT1 style. */
function saqHint(q, typed){
  const t=saqNorm(typed), lc=x=>x.toLowerCase();
  const acc=saqAccepts(q).map(saqNorm);
  if(acc.some(a=>lc(a)===lc(t))) return 'wrong capitalization · try again';
  const noSlash=acc.filter(a=>a.includes('/')).map(a=>a.replace(/\//g,''));
  if(noSlash.some(a=>a===t)) return 'missing slash · try again';
  if(noSlash.some(a=>lc(a)===lc(t))) return 'missing slash and wrong capitalization · try again';
  return 'not that one · try again';
}
function isSingleStep(q){ return isStep(q) && q.__stepCount===1; }
function qType(q){ return isMatching(q)?'matching':(isStepped(q)?'stepped':(isSaq(q)?'saq':(isLabel(q)?'label':(isOrder(q)?'order':'mcq')))); }
function isAnswered(val,q){
  if(val==null) return false;
  if(isMatching(q)) return !!(val && val.correct);
  if(isSaq(q)) return !!(val && val.correct);
  if(isLabel(q)) return !!(val && val.correct);
  if(isOrder(q)) return !!(val && val.correct);
  return val!==null && val!==undefined;
}
/* ADAPT: PT1 showToast defaults to 2200ms; the portal's showToast defaults to 2800ms. */
function pt1Toast(msg,ms){ if(typeof showToast==='function') showToast(msg, ms||2200); }

/* —— colorizer-theme.js 592–655 · pointer-input detection (touch vs fine) —— */
(function wirePointerInputDetection(){
  var root=document.documentElement;
  if(root.dataset.pointerInputWired==='1') return;
  root.dataset.pointerInputWired='1';
  if(!root.getAttribute('data-pointer-input')){
    var noFine=false; try{ noFine=!!(window.matchMedia && !matchMedia('(any-pointer: fine)').matches && matchMedia('(any-pointer: coarse)').matches); }catch(e){}
    root.setAttribute('data-pointer-input',noFine?'touch':'fine');
  }
  var lastTouchAt=0, TOUCH_HOLD_MS=1200;
  function setPointerInputKind(kind){
    var next=kind==='touch'?'touch':'fine';
    if(root.getAttribute('data-pointer-input')===next) return;
    root.setAttribute('data-pointer-input',next);
    try{ root.dispatchEvent(new CustomEvent('pt1-pointer-input',{detail:{kind:next}})); }catch(e){}
  }
  function eventFromTouch(ev){
    if(!ev) return false;
    if(ev.type==='touchstart' || ev.pointerType==='touch') return true;
    var caps=ev.sourceCapabilities; return !!(caps && caps.firesTouchEvents);
  }
  function note(ev){
    if(!ev) return;
    if(eventFromTouch(ev)){ lastTouchAt=Date.now(); setPointerInputKind('touch'); return; }
    var t=ev.pointerType;
    if(t==='mouse'||t==='pen'){ if(Date.now()-lastTouchAt<TOUCH_HOLD_MS) return; setPointerInputKind('fine'); }
  }
  document.addEventListener('pointerdown',note,true);
  document.addEventListener('pointermove',note,true);
  document.addEventListener('touchstart',note,{capture:true,passive:true});
})();
/* PT1 2291 customCursorOn: custom cursor pref AND not touch */
function pt1CursorOn(){ var root=document.documentElement; return (typeof customCursorOn==='function'?customCursorOn():root.getAttribute('data-custom-cursor')!=='off') && root.getAttribute('data-pointer-input')!=='touch'; }

/* —— PT1 2352–2394 · ring cursor idle auto-hide, 4.5s (touch never idles) —— */
(function quizRingCursorIdle(){
  var IDLE_MS=4500;
  var idleTimer;
  function cursors(){ return document.querySelectorAll('#cursor'); }
  function touchMode(){ return document.documentElement.getAttribute('data-pointer-input')==='touch'; }
  function compatMouse(e){ return !!(e && e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents); }
  function releaseIdle(){ clearTimeout(idleTimer); idleTimer=null; document.body.classList.remove('cursor-idle'); }
  function hideCursor(){
    if(touchMode()){ releaseIdle(); return; }
    clearTimeout(idleTimer);
    cursors().forEach(function(el){ el.classList.add('hidden'); });
    document.body.classList.add('cursor-idle');
  }
  function showCursor(){
    if(!pt1CursorOn() || touchMode()) return;
    cursors().forEach(function(el){ el.classList.remove('hidden'); });
    document.body.classList.remove('cursor-idle');
    clearTimeout(idleTimer);
    idleTimer=setTimeout(hideCursor, IDLE_MS);
  }
  document.addEventListener('mousemove', function(e){ if(!compatMouse(e)) showCursor(); });
  document.addEventListener('mousedown', function(e){ if(!compatMouse(e)) showCursor(); }, true);
  document.addEventListener('keydown', function(e){
    if(touchMode()) return;
    if(document.documentElement.getAttribute('data-custom-cursor')==='off') return;
    // ADAPT: typing in chat/inputs must not hide the cursor ring
    var t=e.target, tag=(t&&t.tagName||'').toLowerCase();
    if(tag==='input'||tag==='textarea'||tag==='select'||(t&&t.isContentEditable)) return;
    hideCursor();
  });
  document.addEventListener('touchstart', releaseIdle, {capture:true, passive:true});
  document.documentElement.addEventListener('pt1-pointer-input', function(){ if(touchMode()) releaseIdle(); });
})();

/* PT1 2258 — correct-answer reward is a canvas firework burst */
function pt1Confetti(){ spawnFireworkBurst(W*.5,H*.28,26); }

/* —— bank + sets (PT1 2405, 2582–2949) —— */
let BANK=null, BANK_PATH='', BANK_KEY='';
let ALLQ=[], CARDS=[], ID_REPORT={duplicates:[],missing:0};
let questions=[], answers=[], current=0, locked=false, quizActive=false, startTime=0, elapsedTimer=null, drawState=null, runLabel='', unansweredMarkersVisible=false;
let runCard=null, runMastery=0;
let currentForm=null; // PORTAL: kept for older callers (chat/party); = active card id

function bankId(){ return BANK_KEY || (BANK && (BANK.id||BANK.title)) || 'anon'; }
/* LECTURE SETS: one material made of several banks, one card per bank.
   Each card carries its own bank; the store / Mastery / runs follow the card
   that is being shown or played (cardCtx). Plain banks never set bankKey. */
let LECTURE_SET=null;
function cardCtx(card){ if(card && card.bankKey){ BANK_KEY=card.bankKey; BANK=card.bankData; BANK_PATH=card.bankPath; } }
function lectureSolvedTotal(){ return CARDS.reduce((n,c)=>n+(c.bankKey&&window.StudyStore?StudyStore.solvedSet(c.bankKey).size:0),0); }
/* ADAPT: PT1 kept skel_solved:<bank> as a JSON array; the portal keeps the same
   solved set inside the per-bank store (sp_bank_v1:<bankKey>) so it can sync. */
function loadSolved(){ return window.StudyStore ? StudyStore.solvedSet(bankId()) : new Set(); }
function saveSolved(set){
  if(!window.StudyStore) return;
  const st=StudyStore.load(bankId()); const next={};
  set.forEach(id=>{ next[id]=st.solved[id]||Date.now(); });
  st.solved=next; StudyStore.save(bankId(), st);
}
function syncResetSolvedBtn(){
  const btn=document.getElementById('resetSolvedBtn');
  if(!btn) return;
  btn.hidden = true; /* permanently hidden — use per-card reset */
}
function updateCounters(){
  if(BANK) document.getElementById('bankMeta').textContent=(allQuestions().length)+' questions · '+(LECTURE_SET?lectureSolvedTotal():loadSolved().size)+' solved';
  syncResetSolvedBtn();
  if(quizActive){
    const answeredCount=answers.filter((a,i)=>isAnswered(a,questions[i])).length;
    document.getElementById('quizSub').textContent=(BANK.title||'')+' · '+(questions.length-answeredCount)+' remaining this run';
  }
}
function markSolved(q){
  const id=(q&&q.__id)||qid(q,0);
  if(window.StudyStore) StudyStore.markSolved(bankId(), id);
  updateCounters();
}

function allQuestions(){ return ALLQ; }
/* ADAPT: build the flat list once per bank load. Ids are validated: missing ids
   use PT1's qid() fallback, duplicates get a "~n" suffix and are reported. */
function buildAllQuestions(data){
  const out=[]; const seen={}; const dups=[]; let missing=0;
  const forms = data.forms || Object.keys(data.bank||{});
  forms.forEach(letter=>{
    (data.bank[letter]||[]).forEach((q,i)=>{
      const copy=JSON.parse(JSON.stringify(q));
      copy.__form=letter;
      copy.__pos=i;
      if(q.id==null) missing++;
      let id=qid(q,i);
      if(seen[id]){ seen[id]++; dups.push(id); id=id+'~'+seen[id]; } else seen[id]=1;
      copy.__id=id;
      out.push(copy);
    });
  });
  ID_REPORT={duplicates:dups, missing};
  if(dups.length) console.warn('[quiz] duplicate question ids in '+bankId()+':', dups);
  if(missing) console.info('[quiz] '+missing+' question(s) without id in '+bankId()+' — using PT1 qid() fallback');
  window.__bankIdReport=ID_REPORT;
  return out;
}
function remainingOf(pool){
  const solved=loadSolved();
  return pool.filter(q=>!solved.has(q.__id));
}

/* ADAPT (decision 2): set cards from bank data.
   - several categories (cat) → one card per category, in first-seen order;
   - ONE category with more than 100 questions → balanced parts of ~40
     (a stepped question counts as one question);
   - one category with ≤100 questions → one card. */
const CARD_SPLIT_OVER=100, CARD_CHUNK_TARGET=40;
function catLabelOf(c){ return String(c).replace(/_/g,' '); }
/* Optional card grouping (PT1 QUIZ_FORMS "category mode"):
   catalog material `cards` or bank `cards` = [{id?, title, cats:[...]}].
   Each entry is one card holding every question whose cat is listed (PT1
   poolForForm). Categories not named by any entry still get their own card,
   so no question can disappear. Catalog wins over bank. */
function cardGroupsFor(data){
  const m=window.__activeMaterial;
  const g=(m && Array.isArray(m.cards) && m.cards.length)?m.cards:(data && Array.isArray(data.cards) && data.cards.length?data.cards:null);
  return g;
}
function buildGroupedCards(all, groups){
  const norm=c=>catLabelOf(c==null||c===''?'general':c);
  const cards=[], taken=new Set();
  groups.forEach((g,i)=>{
    const set=new Set((g.cats||[]).map(norm));
    // a group may also name whole bank forms (forms:["A"]) — used when one category spans several cards
    const fset=new Set((g.forms||[]).map(String));
    const pool=all.filter(q=>!taken.has(q.__id) && (set.has(norm(q.cat)) || fset.has(String(q.__form))));
    pool.forEach(q=>taken.add(q.__id));
    cards.push({id:'grp:'+(g.id||g.title||('card'+(i+1))), label:String(g.title||g.id||('Set '+(i+1))), pool, cats:[...set], badges:Array.isArray(g.badges)?g.badges:null});
  });
  const rest=all.filter(q=>!taken.has(q.__id));
  if(rest.length) buildCards(rest, true).forEach(c=>cards.push(c));
  return cards;
}
function buildCards(all, noGroups){
  if(!noGroups){ const g=cardGroupsFor(BANK); if(g) return buildGroupedCards(all, g); }
  const cats=[], byCat={};
  all.forEach(q=>{
    const c=(q.cat==null||q.cat==='')?'general':String(q.cat);
    if(!byCat[c]){ byCat[c]=[]; cats.push(c); }
    byCat[c].push(q);
  });
  const cards=[];
  if(cats.length===1 && byCat[cats[0]].length>CARD_SPLIT_OVER){
    const c=cats[0], list=byCat[c], n=list.length;
    const parts=Math.ceil(n/CARD_CHUNK_TARGET);
    const base=Math.floor(n/parts), extra=n%parts;
    let at=0;
    for(let k=0;k<parts;k++){
      const size=base+(k<extra?1:0);
      const pool=list.slice(at,at+size);
      cards.push({id:'cat:'+c+'#'+(k+1), label:catLabelOf(c)+' · Part '+(k+1)+' ('+(at+1)+'–'+(at+size)+')', pool});
      at+=size;
    }
  } else {
    cats.forEach(c=>cards.push({id:'cat:'+c, label:catLabelOf(c), pool:byCat[c]}));
  }
  return cards;
}
function cardById(id){ return CARDS.find(c=>c.id===id)||null; }

/* PT1 2628–2660 prepareDeck — linking-first insertion, shuffles, choice remap.
   STEPPED: bones shuffle like any other question; each step's choices are
   shuffled with `correct` remapped. ADAPT: every permutation is recorded
   (__perm) so a run can be resumed by id. */
function prepareDeck(pool, opts){
  opts=opts||{};
  let deck=(opts.noSolvedFilter?pool:remainingOf(pool)).map(q=>JSON.parse(JSON.stringify(q)));
  const linkFirst=document.getElementById('prefLinkFirst').checked;
  const shQ=document.getElementById('prefShuffleQ').checked;
  const shC=document.getElementById('prefShuffleC').checked;
  if(linkFirst){
    const link=deck.filter(isMatching);
    const rest=deck.filter(q=>!isMatching(q));
    const base=shQ?shuffle(rest):rest.slice();
    const links=shQ?shuffle(link):link.slice();
    links.forEach(q=>{
      const i=Math.floor(Math.random()*(base.length+1));
      base.splice(i,0,q);
    });
    deck=base;
  } else if(shQ){
    deck=shuffle(deck);
  }
  deck=deck.map(q=>{
    if(isMatching(q)){
      if(shC) shuffleMatchingSides(q);
    } else if(isStepped(q)){
      (q.steps||[]).forEach(st=>{ if(!isTypedStepDef(st)) permuteChoices(st, shC); });
    } else if(isLabel(q)){
      q.__chips=shuffle((q.labels||[]).map(l=>l.id)); // the word bank is always shuffled
    } else if(isOrder(q)){
      q.__order=orderShuffle(q); // never starts already in the right order
    } else if(q.options){
      permuteChoices(q, shC);
    }
    return q;
  });
  return deck;
}
function permuteChoices(q, doShuffle){
  const paired=(q.options||[]).map((opt,i)=>({opt,ok:i===q.correct,i}));
  const mixed=doShuffle?shuffle(paired):paired;
  q.options=mixed.map(x=>x.opt);
  q.correct=mixed.findIndex(x=>x.ok);
  q.__perm=mixed.map(x=>x.i);
  return q;
}
function applyPerm(q, perm){
  const n=(q.options||[]).length;
  if(!Array.isArray(perm) || perm.length!==n || perm.some(x=>!(x>=0&&x<n)) || new Set(perm).size!==n) return permuteChoices(q,false);
  const orig=q.options.slice(), origCorrect=q.correct;
  q.options=perm.map(i=>orig[i]);
  q.correct=perm.indexOf(origCorrect);
  q.__perm=perm.slice();
  return q;
}
/* STEPPED: expand a bone into one deck entry per step (each step is its own numbered question). */
function expandDeck(deck){
  const out=[];
  deck.forEach(q=>{
    if(!isStepped(q)){ out.push(q); return; }
    // display order: steps marked showFirst lead (they can be appended to the file with a new
    // id, so the saved step keys and the per-index choice orders of older steps stay valid)
    const raw=q.steps||[];
    const steps=raw.filter(st=>st&&st.showFirst).concat(raw.filter(st=>!(st&&st.showFirst)));
    steps.forEach((st,k)=>{
      const e={
        __step:true, __id:q.__id, __boneId:q.__id, __stepIdx:k, __stepCount:steps.length,
        __stepId:String(st.id!=null?st.id:('s'+(raw.indexOf(st)+1))), __bone:q, __form:q.__form,
        q:q.q, prompt:st.prompt||'', options:st.options||[], correct:st.correct, __perm:st.__perm,
        cat:q.cat, explain:q.explain
      };
      if(isTypedStepDef(st)){ e.type='saq'; e.answer=st.answer; e.accept=Array.isArray(st.accept)?st.accept.slice():[]; delete e.options; delete e.correct; delete e.__perm; }
      if(q.image){ e.image=q.image; e.alt=q.alt||''; e.credit=q.credit||''; e.creditUrl=q.creditUrl||''; }
      out.push(e);
    });
  });
  return out;
}
function entryKey(q){ return isStep(q)? (q.__id+'#'+q.__stepId) : q.__id; }

/* STEPPED: locking + ranges */
function boneStart(i){ const q=questions[i]; return isStep(q)? i-q.__stepIdx : i; }
function boneEnd(i){ const q=questions[i]; return isStep(q)? boneStart(i)+q.__stepCount-1 : i; }
function isUnlocked(i){
  const q=questions[i];
  if(!isStep(q)) return true;
  for(let j=boneStart(i);j<i;j++){ if(!isAnswered(answers[j],questions[j])) return false; }
  return true;
}
function boneDone(i){
  for(let j=boneStart(i);j<=boneEnd(i);j++){ if(!isAnswered(answers[j],questions[j])) return false; }
  return true;
}
function firstOpenStep(i){
  for(let j=boneStart(i);j<=boneEnd(i);j++){ if(!isAnswered(answers[j],questions[j])) return j; }
  return boneStart(i);
}
function nextUnlockedFrom(i,dir){
  while(i>=0 && i<questions.length && !isUnlocked(i)) i+=dir;
  return (i>=0 && i<questions.length)?i:-1;
}

/* PT1 2662–2667 */
function showView(id){
  document.querySelectorAll('.app.view').forEach(v=>v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
  placeSettingsGear();
}

/* —— PT1 2668–2742 gear auto-placement, applied to the portal's corner buttons ——
   ADAPT (decision 23): the portal has no gear. The same overlap test runs for
   the fixed corner/top buttons (online status, profile chip). A right-side
   button that would cover a title line is parked in the title flow exactly
   like PT1's gear (.title-has-gear, second line, right side). A left-side
   button instead pushes the title down so the button sits above it. */
const CORNER_BUTTONS=[{id:'netStatus',side:'right'},{id:'profileChip',side:'left'}];
const cornerHome=new Map();
function setTitleText(id, text){
  var el=document.getElementById(id);
  if(!el) return;
  el.querySelectorAll('.corner-parked').forEach(unparkCorner);
  el.textContent=text;
}
function unparkCorner(btn){
  const home=cornerHome.get(btn);
  btn.classList.remove('corner-parked');
  if(home && home.parent && btn.parentNode!==home.parent){
    home.parent.insertBefore(btn, (home.next && home.next.parentNode===home.parent) ? home.next : null);
  }
}
function placeSettingsGear(){
  document.querySelectorAll('h1.title-has-gear').forEach(function(h){
    h.classList.remove('title-has-gear');
    h.style.removeProperty('--gear-line-push');
    h.style.removeProperty('--gear-right-inset');
    h.style.removeProperty('--gear-line-nudge');
  });
  document.querySelectorAll('.corner-parked').forEach(unparkCorner);
  document.querySelectorAll('.app.view.corner-pushed').forEach(v=>{ v.classList.remove('corner-pushed'); v.style.removeProperty('--corner-top-push'); });
  var view=document.querySelector('.app.view.active');
  var title=view?view.querySelector('h1'):null;
  if(!title) return;
  CORNER_BUTTONS.forEach(function(def){
    var gear=document.getElementById(def.id);
    if(!gear || gear.hidden || getComputedStyle(gear).display==='none') return;
    if(!cornerHome.has(gear)) cornerHome.set(gear,{parent:gear.parentNode,next:gear.nextSibling});
    var lines=titleLineRects(title);
    if(!lines.length) return;
    var gr=gear.getBoundingClientRect();
    if(def.side==='left'){
      // ADAPT: left-side buttons go above the title. Besides the title lines,
      // the sets's "← Study Portal" button above the title is checked too.
      var targets=lines.slice();
      view.querySelectorAll('.sets-back button').forEach(function(btn){ var r=btn.getBoundingClientRect(); if(r.width&&r.height) targets.push(r); });
      var hitTop=Infinity;
      targets.forEach(function(r){ if(rectsHit(gr,r)) hitTop=Math.min(hitTop,r.top); });
      if(hitTop===Infinity) return;
      var down=Math.ceil(gr.bottom-hitTop+10);
      var pad=parseFloat(getComputedStyle(view).paddingTop)||0;
      view.style.setProperty('--corner-top-push', (pad+down)+'px');
      view.classList.add('corner-pushed');
      return;
    }
    var hit=false;
    for(var i=0;i<lines.length;i++){
      if(rectsHit(gr, lines[i])){ hit=true; break; }
    }
    if(!hit) return;
    var lineH=lines[0].height;
    var naturalRight=lines[0].right;
    var naturalBottom=lines[0].bottom;
    var nudge=Math.max(0, (lineH-gr.height)/2);
    var inset=Math.max(0, Math.round(title.getBoundingClientRect().right-(window.innerWidth-30)));
    var push=lineH;
    title.style.setProperty('--gear-line-push', Math.round(push)+'px');
    title.style.setProperty('--gear-line-nudge', Math.round(nudge)+'px');
    title.style.setProperty('--gear-right-inset', inset+'px');
    title.classList.add('title-has-gear');
    gear.classList.add('corner-parked');
    title.insertBefore(gear, title.firstChild);
    /* Clear the first line completely so it keeps its natural width, and leave
       the button on the following line rather than over the glyphs. */
    for(var pass=0; pass<8; pass++){
      var now=titleLineRects(title);
      var gr2=gear.getBoundingClientRect();
      if(!now.length) break;
      var short=now[0].right<naturalRight-3;
      var high=gr2.top<naturalBottom+1;
      if(!short && !high) break;
      push+=high?Math.max(4, naturalBottom+2-gr2.top):4;
      title.style.setProperty('--gear-line-push', Math.round(push)+'px');
    }
  });
}
function titleLineRects(title){
  var out=[];
  var walker=document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
  var node;
  while((node=walker.nextNode())){
    if(!node.textContent||!node.textContent.trim()) continue;
    if(node.parentElement && node.parentElement.closest('.corner-parked')) continue;
    var range=document.createRange();
    range.selectNodeContents(node);
    var list=range.getClientRects();
    for(var i=0;i<list.length;i++) out.push(list[i]);
  }
  return out;
}
function rectsHit(a,b){
  return !(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom);
}

/* —— PT1 2744–2791 locked card: double-click within 900ms → confirm reset ——
   ADAPT: openResetConfirm/closeResetConfirm are renamed openCardResetConfirm/
   closeCardResetConfirm because the pomodoro timer already owns those names.
   ADAPT: the portal already uses #resetModal for the pomodoro timer, so the
   PT1 dialog lives in #cardResetModal (same texts/buttons). */
let lockedClickState={label:'',time:0};
let pendingResetPool=null;
let pendingResetLabel='';
let pendingResetCard=null;
function handleLockedCardClick(label,pool,card){
  const now=Date.now();
  if(lockedClickState.label===label && now-lockedClickState.time<900){
    lockedClickState={label:'',time:0};
    openCardResetConfirm(label,pool,card);
    return;
  }
  lockedClickState={label,time:now};
  pt1Toast('Click again to reset this set');
}
function openCardResetConfirm(label,pool,card){
  pendingResetPool=pool;
  pendingResetLabel=label;
  pendingResetCard=card||null;
  document.getElementById('resetModalTitle').textContent='Reset '+label+'?';
  document.getElementById('resetModalText').textContent='This clears solved progress for this card.';
  document.getElementById('cardResetModal').classList.add('show');
}
function closeCardResetConfirm(){
  pendingResetPool=null;
  pendingResetLabel='';
  pendingResetCard=null;
  document.getElementById('cardResetModal').classList.remove('show');
}
function resetPoolProgress(pool,label,card){
  cardCtx(card);
  const st=StudyStore.load(bankId());
  const ids=pool.map(q=>q.__id);
  ids.forEach(id=>{ delete st.solved[id]; });
  if(card){
    st.resets[card.id]={at:Date.now(), ids};
    delete st.runs[card.id];
    st.cards[card.id]=Object.assign({}, st.cards[card.id]||{}, {done:false, at:Date.now()});
  }
  StudyStore.save(bankId(), st);
  updateCounters();
  renderSets();
}
document.getElementById('resetModalCancel').addEventListener('click', closeCardResetConfirm);
document.getElementById('resetModalConfirm').addEventListener('click',()=>{
  if(pendingResetPool){
    const pool=pendingResetPool;
    const label=pendingResetLabel;
    resetPoolProgress(pool,label,pendingResetCard);
    pt1Toast(label?'Reset '+label:'Reset');
  }
  closeCardResetConfirm();
});
document.getElementById('cardResetModal').addEventListener('click',e=>{
  if(e.target===document.getElementById('cardResetModal')) closeCardResetConfirm();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&document.getElementById('cardResetModal').classList.contains('show')) closeCardResetConfirm();
});

/* —— PORTAL: per-card run state (resume half-done runs) ——
   Saved in StudyStore runs[cardId] by question id, never by position:
   { v:2, card, deck:[{id, perm} | {id, L, R} | {id, steps:[perm…]}],
     ans:{ entryKey: originalOptionIndex | {pairs, correct, wires} },
     cur, el, mp, uv, finished, updated } */
function serializeDeck(deck){
  return deck.map(q=>{
    if(isMatching(q)) return {id:q.__id, L:(q.leftItems||[]).map(x=>x.id), R:(q.rightItems||[]).map(x=>x.id)};
    if(isStepped(q)) return {id:q.__id, steps:(q.steps||[]).map(st=>st.__perm||null)};
    if(isLabel(q)) return {id:q.__id, chips:Array.isArray(q.__chips)?q.__chips.slice():null};
    if(isOrder(q)) return {id:q.__id, order:Array.isArray(q.__order)?q.__order.slice():null};
    return {id:q.__id, perm:q.__perm||null};
  });
}
function serializeAnswers(){
  const out={};
  questions.forEach((q,i)=>{
    // a step answer saved before a new first step existed waits (hidden) until that step is solved
    if(answers[i]==null && q.__pending!=null){ out[entryKey(q)]=q.__pending; return; }
    const a=answers[i];
    if(!isAnswered(a,q) && !(isMatching(q) && a && ((a.wires&&a.wires.length)||Object.keys(a.pairs||{}).length))
       && !(isLabel(q) && a && a.slots && Object.keys(a.slots).length)
       && !(isOrder(q) && a && Array.isArray(a.order))) return;
    if(isMatching(q)) out[entryKey(q)]={pairs:Object.assign({},a.pairs||{}), correct:!!a.correct, wires:(a.wires||[]).map(w=>Object.assign({},w,{points:(w.points||[]).map(p=>({x:+p.x.toFixed(1),y:+p.y.toFixed(1)}))}))};
    else if(isSaq(q)) out[entryKey(q)]={text:String(a.text||''), correct:true};
    else if(isLabel(q)) out[entryKey(q)]={slots:Object.assign({},a.slots), correct:!!a.correct}; // partial progress too, per label id
    else if(isOrder(q)) out[entryKey(q)]={order:a.order.slice(), locked:Object.keys(a.locked||{}).filter(k=>a.locked[k]), correct:!!a.correct};
    else out[entryKey(q)]=(q.__perm&&q.__perm[a]!=null)?q.__perm[a]:a;
  });
  return out;
}
let runDeck=null; // un-expanded deck of the active run (for saving)
function saveRunState(extra){
  if(!runCard || !questions.length || !window.StudyStore) return;
  const st=StudyStore.load(bankId());
  const el=runElapsedSec();
  st.runs[runCard.id]=Object.assign({
    v:2, card:runCard.id, deck:serializeDeck(runDeck||[]), ans:serializeAnswers(),
    cur:current, el, mp:runMastery|0, uv:!!unansweredMarkersVisible, finished:false, updated:Date.now()
  }, extra||{});
  StudyStore.save(bankId(), st);
}
function clearRunState(cardId){
  const st=StudyStore.load(bankId());
  if(st.runs[cardId]){ delete st.runs[cardId]; StudyStore.save(bankId(), st); }
}
function loadRunState(cardId){
  const st=StudyStore.load(bankId());
  const r=st.runs[cardId];
  return (r && r.v===2 && Array.isArray(r.deck)) ? r : null;
}
/* Rebuild a saved run by question id. Unknown ids are skipped; a step is only
   restored when every earlier step of its question is restored too. */
function restoreRun(run){
  const byId={}; ALLQ.forEach(q=>{ byId[q.__id]=q; });
  const deck=[];
  run.deck.forEach(d=>{
    const base=byId[d.id];
    if(!base) return;
    const q=JSON.parse(JSON.stringify(base));
    if(isMatching(q)){
      const order=(arr,ids)=>{ if(!Array.isArray(ids)) return arr; const m={}; arr.forEach(x=>{ m[x.id]=x; }); const out=ids.map(id=>m[id]).filter(Boolean); arr.forEach(x=>{ if(!out.includes(x)) out.push(x); }); return out; };
      q.leftItems=order(q.leftItems||[], d.L); q.rightItems=order(q.rightItems||[], d.R);
    } else if(isStepped(q)){
      (q.steps||[]).forEach((st,k)=>{ if(!isTypedStepDef(st)) applyPerm(st, d.steps&&d.steps[k]); });
    } else if(isLabel(q)){
      q.__chips=Array.isArray(d.chips)?d.chips.slice():shuffle((q.labels||[]).map(l=>l.id));
    } else if(isOrder(q)){
      q.__order=(orderValid(q,d.order) && !d.order.every((id,k)=>id===orderIds(q)[k]))?d.order.slice():orderShuffle(q);
    } else if(q.options){
      applyPerm(q, d.perm);
    }
    deck.push(q);
  });
  if(!deck.length) return false;
  runDeck=deck;
  questions=expandDeck(deck);
  answers=new Array(questions.length).fill(null);
  const ans=run.ans||{};
  questions.forEach((q,i)=>{
    const a=ans[entryKey(q)];
    if(a==null) return;
    if(isMatching(q)){
      if(typeof a==='object') answers[i]={pairs:Object.assign({},a.pairs||{}), wires:Array.isArray(a.wires)?a.wires:[], checked:!!a.correct, correct:!!a.correct, __needWires:!Array.isArray(a.wires)};
      return;
    }
    if(isSaq(q)){
      if(a && typeof a==='object' && a.correct && saqMatches(q, a.text)) answers[i]={text:String(a.text), correct:true};
      return;
    }
    if(isOrder(q)){
      // keep the saved arrangement; a lock only counts if that card really sits in its right place
      if(a && typeof a==='object' && orderValid(q,a.order)){
        const ids=orderIds(q), lk={};
        (Array.isArray(a.locked)?a.locked:[]).forEach(id=>{ const k=a.order.indexOf(id); if(k>=0 && ids[k]===id) lk[id]=true; });
        answers[i]={order:a.order.slice(), locked:lk, correct:Object.keys(lk).length===ids.length};
      }
      return;
    }
    if(isLabel(q)){
      // keep only slots that still exist and still hold a right answer
      if(a && typeof a==='object' && a.slots && typeof a.slots==='object'){
        const slots={}; (q.labels||[]).forEach(l=>{ const t=a.slots[l.id]; if(t!=null && labelMatches(l, t)) slots[l.id]=String(t); });
        if(Object.keys(slots).length) answers[i]={slots, correct:Object.keys(slots).length===(q.labels||[]).length};
      }
      return;
    }
    // Choice / step answers are saved as one original option index. Anything else
    // (an object saved for another type, or an id whose question changed type)
    // is ignored, so the question simply shows as unanswered.
    if(!Number.isInteger(a) || !q.options || a<0 || a>=q.options.length) return;
    const idx=(q.__perm||[]).indexOf(a);
    if(idx>=0 && idx===q.correct) answers[i]=idx;
  });
  // enforce sequential steps
  // A step behind an unsolved earlier step stays locked. Its restored answer is kept aside
  // (q.__pending, raw saved form) and comes back once the steps before it are solved —
  // e.g. the bone questions' new first "Name this bone." step.
  questions.forEach((q,i)=>{ if(isStep(q) && answers[i]!=null && !isUnlocked(i)){ q.__pending=ans[entryKey(q)]; q.__pendingVal=answers[i]; answers[i]=null; } });
  current=Math.max(0, Math.min(questions.length-1, run.cur|0));
  if(!isUnlocked(current)) current=firstOpenStep(current);
  unansweredMarkersVisible=!!run.uv;
  return {elapsed:Math.max(0, run.el|0)};
}

/* —— sets (PT1 2832–2949 + portal extras) —— */
function cardCounts(pool){
  const linking=pool.filter(isMatching).length;
  const stepped=pool.filter(isStepped).length;
  const saq=pool.filter(isSaq).length;
  const label=pool.filter(isLabel).length;
  const order=pool.filter(isOrder).length;
  return {linking, stepped, saq, label, order, choice:pool.length-linking-stepped-saq-label-order};
}
/* Badges are data-driven: card.draft / card.soon, material flags (examDiffers) and
   badge lists [{text, tip, tone:'amber'|'grey'}] on the catalog material (every card)
   and on a bank card group (that card only). Labels are Title Case; tips are sentences. */
const EXAM_DIFFERS_BADGE={text:'Real Exam Is Trickier', tip:"Good for practice. Some definitions overlap, so learn each term's function exactly as the slides word it.", tone:'amber', cls:'exam-differs-badge'};
function noteBadgeHTML(b, extraCls){
  if(!b || !b.text) return '';
  const tone=(b.tone==='grey'||b.tone==='gray')?'grey':(b.tone==='green'?'green':'amber');
  return '<span class="card-badge note-badge '+tone+(b.cls?' '+b.cls:'')+(extraCls?' '+extraCls:'')+(b.tip?'':' no-tip')+'"'+(b.tip?' title="'+escapeHtml(b.tip)+'" data-tip="'+escapeHtml(b.tip)+'" aria-label="'+escapeHtml(b.text+': '+b.tip)+'"':'')+'>'+escapeHtml(b.text)+'</span>';
}
/* where a material badge shows: 'card' (portal card), 'forms' (every set card), 'sets' (next to ⚙ Quiz settings).
   examDiffers → card + sets (not on each form); badges[] → card + forms unless they list `where`. */
function materialBadges(m, where){
  if(!m) return [];
  const out=[];
  if(m.examDiffers===true) out.push(Object.assign({where:['card','sets']},EXAM_DIFFERS_BADGE));
  if(Array.isArray(m.badges)) m.badges.forEach(b=>b&&b.text&&out.push(Object.assign({where:['card','forms']},b)));
  return where?out.filter(b=>b.where.includes(where)):out;
}
function renderSetsBadges(){
  const el=document.getElementById('setsBadges'); if(!el) return;
  const list=materialBadges(window.__activeMaterial,'sets');
  el.innerHTML=list.map(b=>noteBadgeHTML(b,'sets-badge')).join('');
  el.hidden=!list.length;
}
window.StudyBadges={html:noteBadgeHTML, forMaterial:materialBadges, EXAM_DIFFERS:EXAM_DIFFERS_BADGE};
function cardBadgesHTML(card){
  let h='';
  if(card && card.draft) h+='<span class="card-badge draft" title="Unfinished · still being written">Draft</span>';
  if(card && card.soon) h+='<span class="card-badge soon">Coming Soon</span>';
  // material badges (every card inside it), then this card's own badges
  materialBadges(window.__activeMaterial,'forms').forEach(b=>{ h+=noteBadgeHTML(b); });
  if(card && Array.isArray(card.badges)) card.badges.forEach(b=>{ h+=noteBadgeHTML(b); });
  return h?'<div class="card-badges">'+h+'</div>':'';
}
function appendSoonCard(grid, card){
  const el=document.createElement('div'); el.className='card card-soon'; el.setAttribute('aria-disabled','true');
  el.dataset.card=card.id;
  el.innerHTML=`<div class="card-top"><span class="form-letter">${escapeHtml(card.label)}</span></div>${cardBadgesHTML(card)}`; // nothing beyond the lecture numbers + badges
  grid.appendChild(el);
}
function bankMasteryKey(){ return BANK_KEY; }
function appendPoolCard(grid, label, pool, card){
  cardCtx(card);
  const left=remainingOf(pool).length;
  const c=cardCounts(pool);
  const st=window.StudyStore?StudyStore.load(bankId()):{cards:{},runs:{}};
  const meta=st.cards[card.id]||{};
  const run=st.runs[card.id];
  const inProgress=!!(run && run.v===2 && !run.finished && left>0);
  const btn=document.createElement('button'); btn.type='button'; btn.className='card';
  btn.dataset.card=card.id;
  // PT1 line "N linking · M choice" + STEPPED count when the card has any
  const sub=(BANK && BANK.showCardCounts?pool.length+' questions · ':'')+c.linking+' linking · '+c.choice+' choice'+(c.stepped?(' · '+c.stepped+' stepped'):'')+(c.saq?(' · '+c.saq+' short answer'):'')+(c.label?(' · '+c.label+' labeling'):'')+(c.order?(' · '+c.order+' ordering'):'');
  btn.innerHTML=`<div class="card-top"><span class="form-letter">${escapeHtml(label)}</span><span class="mood-stamp">${escapeHtml(meta.mood||'')}</span></div>${cardBadgesHTML(card)}
    <div class="card-sub">${sub}</div>
    <div class="card-stats"><div class="card-pct">${left} left</div><div class="card-meta">${pool.length-left} solved / ${pool.length}${inProgress?' · in progress':''}</div></div>`;
  // PORTAL: Mastery badge
  if(window.StudyMastery){
    const html=StudyMastery.badgeHTML(bankMasteryKey(), card.id);
    if(html) btn.querySelector('.card-sub').insertAdjacentHTML('afterend', html);
  }
  if(left===0) btn.style.opacity='.55';
  btn.addEventListener('click',()=>{
    if(typeof unlockAudio==='function') unlockAudio();
    cardCtx(card);
    if(left===0){ handleLockedCardClick(label,pool,card); return; }
    if(inProgress && resumeRun(card)) return;
    startRun(pool, label, {card});
  });
  // PICTURE STUDY: each lecture card gets its own 📖 Study button (opens that lecture's chapter)
  const mat=window.__activeMaterial;
  if(LECTURE_SET && String(card.id).startsWith('lec:') && mat && mat.study && mat.study.images && window.StudyNotes){
    const wrap=document.createElement('div'); wrap.className='card-study-wrap';
    wrap.appendChild(btn);
    const sb=document.createElement('button'); sb.type='button'; sb.className='card-study-chip'; sb.dataset.lecture=card.id.slice(4);
    sb.textContent='📖 Study'; sb.title='Picture study · '+label;
    sb.addEventListener('click',e=>{ e.stopPropagation(); StudyNotes.open(mat, { from:'setsView', openQuiz:()=>showView('setsView'), focus:card.id.slice(4) }); });
    wrap.appendChild(sb);
    grid.appendChild(wrap);
    return;
  }
  grid.appendChild(btn);
}
function renderSets(){
  const host=document.getElementById('setsSections');
  host.innerHTML='';
  renderSetsBadges();
  if(!BANK){
    host.innerHTML='<div class="empty-note">Bank not loaded yet.</div>';
    return;
  }
  // ADAPT: PT1 had hardcoded QUIZ_FORMS; cards now come from the bank (decision 2).
  const h=document.createElement('div'); h.className='section-h'; h.textContent=LECTURE_SET?'Lectures':(CARDS.length>1?'Sets':'Set'); host.appendChild(h);
  const grid=document.createElement('div'); grid.className='grid';
  CARDS.forEach(card=>{
    if(card.soon){ appendSoonCard(grid, card); return; }
    if(!card.pool.length) return;
    appendPoolCard(grid, card.label, card.pool, card);
  });
  host.appendChild(grid);
  // Formula practice card (material opts in with "formulas" in the catalog; js/formula-practice.js)
  if(window.FormulaPractice) FormulaPractice.appendSetsSection(host);
  if(runCard) cardCtx(runCard); // keep the open run's bank active
}
/* PORTAL name kept: other modules call refreshSetsCards() */
function refreshSetsCards(){ if(BANK){ updateCounters(); renderSets(); placeSettingsGear(); } }

function ingestBank(data, path){
  if(!data || !data.bank){ pt1Toast('JSON needs a bank object'); return; }
  normalizeBankMatching(data);
  LECTURE_SET=null;
  BANK=data;
  BANK_PATH=path||BANK_PATH;
  BANK_KEY=window.StudyMastery?StudyMastery.bankKeyFromPath(BANK_PATH):String(BANK_PATH||data.id||data.title||'anon');
  ALLQ=buildAllQuestions(data);
  CARDS=buildCards(ALLQ);
  // Bank replaced by a newer one: move saved progress from old ids to new ids.
  if(data.legacy && data.legacy.idMap){
    const valid={ids:new Set(ALLQ.map(q=>q.__id)), cards:new Set(CARDS.map(c=>c.id))};
    try{
      if(window.StudyStore && StudyStore.remapIds) StudyStore.remapIds(BANK_KEY, data.legacy.idMap, valid);
      if(window.StudyMastery && StudyMastery.remapIds) StudyMastery.remapIds(BANK_KEY, data.legacy.idMap, valid.ids);
    }catch(e){ console.warn('[quiz] id remap skipped', e); }
  }
  if(window.StudyMastery) CARDS.forEach(c=>StudyMastery.registerCard(BANK_KEY, c.id, c.pool.map(q=>q.__id)));
  // PORTAL: legacy globals other scripts read
  window.FORM_BANK=data.bank; window.FORMS=data.forms||Object.keys(data.bank||{}); window.__bankMeta=data;
  const subj=data.subject || (window.__activeMaterial && __activeMaterial.subjectName) || '';
  const title=data.title || (window.__activeMaterial && __activeMaterial.title) || 'Practice';
  setTitleText('setsTitle', (subj?subj+' · ':'')+title);
  const kick=document.getElementById('setsKicker');
  if(kick) kick.textContent='Practice · '+CARDS.length+' set'+(CARDS.length===1?'':'s');
  document.getElementById('setsSub').textContent='practice simulation (not official)';
  document.getElementById('bankMeta').textContent=(allQuestions().length)+' questions · '+loadSolved().size+' solved';
  renderSets();
  placeSettingsGear();
}
/* LECTURE SET loader: material.lectures = [{id, title, bank|null, status, draft, migrateFrom?}] */
function bankKeyOfPath(p){ return window.StudyMastery?StudyMastery.bankKeyFromPath(p):String(p); }
function importOldBankProgress(entry, card){
  const mf=entry && entry.migrateFrom;
  if(!mf || !mf.bankKey || !window.StudyStore) return;
  const pre=Array.isArray(mf.idPrefix)?mf.idPrefix:null;
  const map=id=>{ id=String(id); if(mf.idMap && mf.idMap[id]) return mf.idMap[id]; if(pre && id.indexOf(pre[0])===0) return pre[1]+id.slice(pre[0].length); return id; };
  const valid=new Set(card.pool.map(q=>q.__id));
  try{
    const r=StudyStore.importFrom(mf.bankKey, card.bankKey, map, valid, mf.cardId?{[mf.cardId]:card.id}:{});
    if(window.StudyMastery && StudyMastery.importFrom) StudyMastery.importFrom(mf.bankKey, card.bankKey, map, valid, mf.cardId?{[mf.cardId]:card.id}:{});
    if(r && !r.skipped) console.info('[quiz] progress copied from '+mf.bankKey+' to '+card.bankKey, r);
  }catch(e){ console.warn('[quiz] import from '+mf.bankKey+' skipped', e); }
}
function ingestLectureSet(material, entries, datas){
  const cards=[], all=[], seen={}, dups=[]; let missing=0;
  entries.forEach((e,i)=>{
    const base={id:'lec:'+(e.id||('l'+(i+1))), label:String(e.title||('Lecture set '+(i+1))), draft:!!e.draft, status:e.status||(e.bank?'ready':'soon')};
    const data=datas[i];
    if(!data || base.status!=='ready'){ cards.push(Object.assign(base,{soon:true, pool:[]})); return; }
    normalizeBankMatching(data);
    const bk=bankKeyOfPath(e.bank);
    BANK=data; BANK_KEY=bk; BANK_PATH=e.bank;
    const qs=buildAllQuestions(data);
    missing+=ID_REPORT.missing; ID_REPORT.duplicates.forEach(d=>dups.push(d+' (inside '+bk+')'));
    qs.forEach(q=>{ if(seen[q.__id]) dups.push(q.__id+' ('+seen[q.__id]+' and '+bk+')'); else seen[q.__id]=bk; q.__bankKey=bk; });
    all.push(...qs);
    const card=Object.assign(base,{pool:qs, bankKey:bk, bankPath:e.bank, bankData:data});
    cards.push(card);
    if(data.legacy && data.legacy.idMap){
      const valid={ids:new Set(qs.map(q=>q.__id)), cards:new Set([card.id])};
      try{ if(window.StudyStore && StudyStore.remapIds) StudyStore.remapIds(bk, data.legacy.idMap, valid);
           if(window.StudyMastery && StudyMastery.remapIds) StudyMastery.remapIds(bk, data.legacy.idMap, valid.ids); }catch(err){ console.warn(err); }
    }
    importOldBankProgress(e, card);
    if(window.StudyMastery) StudyMastery.registerCard(bk, card.id, qs.map(q=>q.__id));
  });
  LECTURE_SET={material, entries};
  ALLQ=all; CARDS=cards;
  ID_REPORT={duplicates:dups, missing, banks:cards.filter(c=>c.bankKey).length};
  window.__bankIdReport=ID_REPORT;
  if(dups.length) console.warn('[quiz] duplicate question ids across '+(material.title||'lecture set')+':', dups);
  const first=cards.find(c=>c.bankKey);
  if(first) cardCtx(first);
  const subj=(material && material.subjectName) || (BANK && BANK.subject) || '';
  window.FORM_BANK=BANK?BANK.bank:{}; window.FORMS=BANK?(BANK.forms||Object.keys(BANK.bank||{})):[];
  window.__bankMeta={title:material.title, subject:subj, lectureSet:true};
  setTitleText('setsTitle', (subj?subj+' · ':'')+(material.title||'Practice'));
  const soon=cards.filter(c=>c.soon).length;
  const kick=document.getElementById('setsKicker');
  const ready=cards.length-soon; if(kick) kick.textContent='Lectures · '+ready+' lecture set'+(ready===1?'':'s')+(soon?(' · '+soon+' coming soon'):'');
  document.getElementById('setsSub').textContent='practice simulation (not official)';
  updateCounters();
  renderSets();
  placeSettingsGear();
}
async function loadLectureSet(material){
  if(window.StudyMigrate && typeof StudyMigrate.runAll==='function'){
    try{ await StudyMigrate.runAll(); }catch(e){ console.warn('[quiz] migration skipped', e); }
  }
  const entries=material.lectures||[];
  const datas=await Promise.all(entries.map(e=>(e.bank && (e.status||'ready')==='ready')
    ? fetch(e.bank,{cache:'no-cache'}).then(r=>{ if(!r.ok) throw new Error(e.bank+' HTTP '+r.status); return r.json(); })
    : Promise.resolve(null)));
  ingestLectureSet(material, entries, datas);
  return datas;
}
async function loadBank(path){
  if(window.StudyMigrate && typeof StudyMigrate.runAll==='function'){
    try{ await StudyMigrate.runAll(); }catch(e){ console.warn('[quiz] migration skipped', e); }
  }
  const res=await fetch(path,{cache:'no-cache'});
  if(!res.ok) throw new Error('bank HTTP '+res.status);
  const data=await res.json();
  ingestBank(data, path);
  return data;
}
/* PORTAL: Mastery v1 compatibility (form letter + position → id) */
if(window.StudyMastery) StudyMastery._idForPosition=function(bk, form, i){
  if(!BANK || bk!==BANK_KEY) return null;
  const q=ALLQ.find(x=>x.__form===form && x.__pos===i);
  return q?q.__id:null;
};

(function wireQuizPrefs(){
  ['prefShuffleQ','prefShuffleC','prefLinkFirst'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    const key='skel_'+id;
    const saved=lsGet(key);
    if(saved==='0') el.checked=false;
    if(saved==='1') el.checked=true;
    el.addEventListener('change',()=> lsSet(key, el.checked?'1':'0'));
  });
  // ADAPT: PT1 keeps these in its (hidden) theme modal; the portal shows them
  // behind a small "Quiz settings" pill on the sets, using PT1's own CSS.
  const wrap=document.getElementById('quizSettingsWrap');
  const btn=document.getElementById('quizSettingsBtn');
  if(wrap && btn){
    btn.addEventListener('click',e=>{ e.stopPropagation(); wrap.classList.toggle('open'); btn.setAttribute('aria-expanded', String(wrap.classList.contains('open'))); });
    document.addEventListener('click',e=>{ if(!wrap.contains(e.target)) wrap.classList.remove('open'); });
    document.addEventListener('keydown',e=>{ if(e.key==='Escape') wrap.classList.remove('open'); });
  }
})();

document.getElementById('resetSolvedBtn').addEventListener('click',()=>{
  saveSolved(new Set());
  pt1Toast('Solved list cleared · everything can appear again');
  updateCounters();
  renderSets();
});

/* —— quiz engine (PT1 3000–3949) —— */
/* The run clock pauses while the page is hidden or unfocused (tab switch,
   minimised window, phone screen off, pagehide). Away time is shifted out of
   startTime on return, so the timestamp-based clock never jumps. */
let clockPausedAt=0;
function runElapsedSec(){
  if(!startTime) return 0;
  const now=clockPausedAt||Date.now();
  return Math.max(0, Math.floor((now-startTime)/1000));
}
function paintElapsed(){
  const e=runElapsedSec(), el=document.getElementById('elapsed');
  if(el) el.textContent=String(Math.floor(e/60)).padStart(2,'0')+':'+String(e%60).padStart(2,'0');
}
function pageIsAway(){ return document.hidden; }
function pauseElapsedClock(){
  if(!elapsedTimer || clockPausedAt) return;
  clockPausedAt=Date.now();
  paintElapsed();
}
function resumeElapsedClock(){
  if(!clockPausedAt) return;
  if(pageIsAway()) return;
  startTime+=Date.now()-clockPausedAt;
  clockPausedAt=0;
  paintElapsed();
}
document.addEventListener('visibilitychange',()=>{ document.hidden?pauseElapsedClock():resumeElapsedClock(); });
window.addEventListener('blur',pauseElapsedClock);
window.addEventListener('focus',resumeElapsedClock);
window.addEventListener('pagehide',pauseElapsedClock);
window.addEventListener('pageshow',resumeElapsedClock);
function startElapsedClock(offsetSec){
  startTime=Date.now()-(offsetSec||0)*1000;
  clockPausedAt=0;
  if(elapsedTimer) clearInterval(elapsedTimer);
  paintElapsed();
  elapsedTimer=setInterval(paintElapsed,1000);
  if(document.hidden) pauseElapsedClock();
}
/* FIX (PT1 quirk): the clock now stops when the run ends or is left. */
function stopElapsedClock(){
  if(clockPausedAt&&startTime){ startTime+=Date.now()-clockPausedAt; }
  clockPausedAt=0;
  if(elapsedTimer){ clearInterval(elapsedTimer); elapsedTimer=null; }
}
function enterRunChrome(label){
  setTitleText('quizTitle', label);
  document.getElementById('quizSub').textContent=(BANK.title||'')+' · '+questions.length+' remaining this run';
  document.getElementById('statusText').textContent=label;
  { const esc=document.getElementById('quizEscLabel'); if(esc) esc.textContent=LECTURE_SET?'back to lectures':'back to sets'; }
  document.getElementById('qTotal').textContent=questions.length;
  document.getElementById('quizScreen').style.display='block';
  document.getElementById('finalScreen').style.display='none';
  document.getElementById('reviewScreen').style.display='none';
  if(window.StudyChat && StudyChat.setLocalRoom) StudyChat.setLocalRoom('card_'+String(runCard?runCard.id:'run').replace(/[^a-z0-9_-]+/gi,'_'));
  showView('quizView');
}
function beginMasterySession(){
  if(!window.StudyMastery || !runCard) return;
  StudyMastery.beginSession(BANK_KEY, runCard.id, runCard.pool.map(q=>q.__id));
  StudyMastery.updateDNSAUI();
}
function startRun(pool, label, opts){
  opts=opts||{};
  cardCtx(opts.card);
  const deck=prepareDeck(pool, opts);
  if(!deck.length){ pt1Toast('Nothing left in this set · reset solved to replay'); return; }
  runCard=opts.card||{id:'adhoc', label, pool};
  currentForm=runCard.id;
  runMastery=opts.masteryPlus|0;
  runDeck=deck;
  questions=expandDeck(deck); answers=new Array(questions.length).fill(null); current=0; locked=false; quizActive=true; runLabel=label; unansweredMarkersVisible=false;
  beginMasterySession();
  startElapsedClock(0);
  enterRunChrome(label);
  renderQuestion();
  saveRunState();
}
/* Re-sync a resumed run with the current bank: unsolved questions of this card
   that are not in the saved deck (for example added to the bank later) are
   appended to the queue. Saved answers and positions stay untouched. */
function syncRunWithBank(card){
  if(!card || !Array.isArray(card.pool) || !runDeck) return 0;
  const have=new Set(runDeck.map(q=>q.__id));
  const missing=remainingOf(card.pool).filter(q=>!have.has(q.__id));
  if(!missing.length) return 0;
  const extra=prepareDeck(missing, {card});
  if(!extra.length) return 0;
  runDeck=runDeck.concat(extra);
  const more=expandDeck(extra);
  questions=questions.concat(more);
  answers=answers.concat(new Array(more.length).fill(null));
  return extra.length;
}
/* PORTAL: resume a half-done run (by question id). */
function resumeRun(card){
  cardCtx(card);
  const run=loadRunState(card.id);
  if(!run) return false;
  runCard=card; currentForm=card.id; runMastery=run.mp|0; runLabel=card.label;
  const r=restoreRun(run);
  if(!r){ clearRunState(card.id); return false; }
  const added=runMastery?0:syncRunWithBank(card);
  quizActive=true; locked=isAnswered(answers[current],questions[current]);
  beginMasterySession();
  startElapsedClock(r.elapsed);
  if(added) saveRunState();
  enterRunChrome(card.label);
  if(allQuestionsAnswered()){ finishQuiz(); return true; }
  renderQuestion();
  pt1Toast('Resumed · '+questions.filter((q,i)=>!isAnswered(answers[i],q)).length+' left in this run');
  return true;
}
/* PORTAL: Mastery+ "Unlock" on the results screen starts a progressive run. */
function startMasteryPlusRun(bk, cardId, queue){
  const card=cardById(cardId);
  if(!card || bk!==(card.bankKey||BANK_KEY)){ pt1Toast('Open this bank first'); return; }
  cardCtx(card);
  if(!queue || !queue.length){ pt1Toast('Mastery+ complete for this set'); return; }
  const set=new Set(queue.map(String));
  const pool=card.pool.filter(q=>set.has(q.__id));
  const level=window.StudyMastery?((StudyMastery.getSession().masteryPlusLevel)|0):1;
  startRun(pool, card.label+' · Mastery+ L'+level, {card, noSolvedFilter:true, masteryPlus:level||1});
}

/* —— PT1 3021–3134 progression + navigator ——
   STEPPED: a locked step is never "unanswered/open" for navigation; the
   whole bone counts as skipped once the cursor has moved past its last step. */
function firstUnansweredIndex(){
  for(let i=0;i<questions.length;i++){
    if(!isAnswered(answers[i], questions[i])) return isStep(questions[i])?firstOpenStep(i):i;
  }
  return -1;
}
function nextUnansweredIndex(after){
  const start=typeof after==='number'?after:-1;
  for(let i=start+1;i<questions.length;i++){
    if(!isAnswered(answers[i], questions[i]) && isUnlocked(i)) return i;
  }
  for(let i=0;i<=start && i<questions.length;i++){
    if(!isAnswered(answers[i], questions[i]) && isUnlocked(i)) return i;
  }
  return -1;
}
function allQuestionsAnswered(){
  return questions.length>0 && firstUnansweredIndex()===-1;
}
function hideNextBtn(){
  const btn=document.getElementById('nextBtn');
  if(!btn) return;
  // Never show Finish — reset label so a stale caption cannot flash.
  btn.hidden=true;
  btn.disabled=true;
  btn.textContent='Next →';
  btn.dataset.action='next';
  delete btn.dataset.target;
}
function afterAnswerProgress(){
  renderNav();
  updateCounters();
  saveRunState();
  if(allQuestionsAnswered()){
    unansweredMarkersVisible=false;
    hideNextBtn();
    clearTimeout(afterAnswerProgress._finishT);
    afterAnswerProgress._finishT=setTimeout(function(){ if(quizActive && allQuestionsAnswered()) finishQuiz(); }, 700);
    return;
  }
  updateNextActionButton();
}
function updateNextActionButton(){
  const btn=document.getElementById('nextBtn');
  if(!btn) return;
  const atLast=questions.length>0 && current===questions.length-1;
  const answeredHere=isAnswered(answers[current], questions[current]);
  const firstOpen=firstUnansweredIndex();
  // Full solve → keep nextBtn hidden; Run complete opens via afterAnswerProgress.
  if(allQuestionsAnswered() || (atLast && answeredHere && firstOpen<0)){
    hideNextBtn();
    return;
  }
  btn.dataset.action='next';
  delete btn.dataset.target;
  if(!atLast){
    btn.hidden=false;
    btn.textContent='Next →';
    btn.disabled=!answeredHere;
    return;
  }
  // No Next action while the final question is still unanswered.
  if(!answeredHere){
    hideNextBtn();
    return;
  }
  // Last Q solved with earlier gaps: jump back to the first unanswered item.
  btn.hidden=false;
  btn.textContent='Return to first unanswered';
  btn.dataset.action='return-unanswered';
  btn.dataset.target=String(firstOpen);
  btn.disabled=false;
}
function isSkippedIndex(i){
  if(i<0 || i>=questions.length) return false;
  if(isAnswered(answers[i], questions[i])) return false;
  // STEPPED: a half-done bone counts as skipped once you have left all its steps
  if(isStep(questions[i])) return current>boneEnd(i);
  // Skip = unanswered already passed past the cursor; going back clears marks ahead
  return current>i;
}
function hasSkipsBehind(){
  for(let i=0;i<current;i++){
    if(isSkippedIndex(i)) return true;
  }
  return false;
}
function updateBackSkipGlow(){
  const back=document.getElementById('backBtn');
  if(!back) return;
  back.classList.toggle('has-skips-behind', hasSkipsBehind());
}
function renderNav(){
  const nav=document.getElementById('qNav'); nav.innerHTML='';
  const markUnanswered=unansweredMarkersVisible && !allQuestionsAnswered();
  for(let i=0;i<questions.length;i++){
    const q=questions[i];
    if(isStep(q) && !isSingleStep(q)){ nav.appendChild(renderBonePill(i, markUnanswered)); i=boneEnd(i); continue; }
    const done=isAnswered(answers[i],q);
    const skipped=!done && isSkippedIndex(i);
    const markedUnanswered=markUnanswered && !done && i!==questions.length-1;
    const b=document.createElement('button');
    b.type='button';
    b.className='q-nav-btn'
      +(i===current?' current':'')
      +(done?' done':'')
      +(markedUnanswered?' unanswered':'')
      +((skipped && !markedUnanswered)?' skipped':'');
    b.classList.toggle('linking', isMatching(q));
    b.classList.toggle('saq', isSaq(q));
    b.classList.toggle('label', isLabel(q));
    b.classList.toggle('order', isOrder(q));
    b.innerHTML=isMatching(q)
      ? '<span class=\"q-nav-icon\" aria-hidden=\"true\">🔗</span><span class=\"q-nav-number\">'+(i+1)+'</span>'
      : (isSaq(q) ? '<span class=\"q-nav-icon\" aria-hidden=\"true\">✎</span><span class=\"q-nav-number\">'+(i+1)+'</span>'
      : isLabel(q) ? '<span class=\"q-nav-icon\" aria-hidden=\"true\">🏷</span><span class=\"q-nav-number\">'+(i+1)+'</span>'
      : isOrder(q) ? '<span class=\"q-nav-icon\" aria-hidden=\"true\">⇅</span><span class=\"q-nav-number\">'+(i+1)+'</span>'
      : '<span class=\"q-nav-number\">'+(i+1)+'</span>');
    b.title=isMatching(q)?'Linking question'+(skipped?' — skipped — unanswered':(done?' — answered':''))
      :((isSaq(q)?'Short answer':'')+(skipped?((isSaq(q)?' — ':'')+'Skipped — unanswered'):(done?((isSaq(q)?' — ':'')+'Answered'):'')));
    const idx=i;
    b.addEventListener('click',()=>{ current=idx; locked=isAnswered(answers[idx],q); renderQuestion(); });
    nav.appendChild(b);
  }
  updateBackSkipGlow();
}
/* STEPPED: one pill "🦴 21–23" for the whole question; hovering (or focusing)
   expands it into one sub-pill per step. Later steps stay locked (disabled)
   until the earlier ones are answered. */
function renderBonePill(start, markUnanswered){
  const end=boneEnd(start);
  const wrap=document.createElement('div');
  wrap.className='q-nav-bone';
  const allDone=boneDone(start);
  const here=current>=start && current<=end;
  const skipped=!allDone && current>end;
  const lastIsFinal=end===questions.length-1;
  const markedUnanswered=markUnanswered && !allDone && !lastIsFinal;
  const lab=document.createElement('button');
  lab.type='button';
  lab.className='q-nav-btn bone'
    +(here?' current':'')
    +(allDone?' done':'')
    +(markedUnanswered?' unanswered':'')
    +((skipped && !markedUnanswered)?' skipped':'');
  lab.innerHTML='<span class="q-nav-icon" aria-hidden="true">🦴</span><span class="q-nav-number">'+(start+1)+'–'+(end+1)+'</span>';
  lab.title='Stepped question · '+(end-start+1)+' steps'+(skipped?' — skipped — unanswered':(allDone?' — answered':''));
  lab.addEventListener('click',()=>{ jumpToQuestion(here?current:firstOpenStep(start)); });
  wrap.appendChild(lab);
  const steps=document.createElement('div'); steps.className='q-nav-steps';
  for(let j=start;j<=end;j++){
    const done=isAnswered(answers[j],questions[j]);
    const open=isUnlocked(j);
    const b=document.createElement('button');
    b.type='button';
    b.className='q-nav-btn q-nav-step'+(j===current?' current':'')+(done?' done':'')+(!open?' locked':'')+((skipped && !done && open)?' skipped':'');
    b.innerHTML='<span class="q-nav-number">'+(j+1)+'</span>';
    b.disabled=!open;
    b.title=!open?'Locked — answer the previous step first':(done?'Step answered':'Step '+(j-start+1));
    const idx=j;
    b.addEventListener('click',e=>{ e.stopPropagation(); jumpToQuestion(idx); });
    steps.appendChild(b);
  }
  wrap.appendChild(steps);
  return wrap;
}

/* —— PT1 3136–3160, 3223–3848 · linking engine, copied verbatim except ADAPT/FIX lines —— */
function shuffleMatchingSides(q){
  const leftKeys=['leftItems','left_items','terms','left','prompts'];
  const rightKeys=['rightItems','right_items','meanings','right','responses'];
  leftKeys.forEach(k=>{ if(Array.isArray(q[k]) && q[k].length>1) q[k]=shuffle(q[k]); });
  rightKeys.forEach(k=>{ if(Array.isArray(q[k]) && q[k].length>1) q[k]=shuffle(q[k]); });
  return q;
}
function clearWireLayer(){
  drawState=null;
  const layer=document.getElementById('matchWireLayer');
  if(!layer) return;
  const wctx=layer.getContext('2d');
  if(wctx) wctx.clearRect(0,0,layer.width,layer.height);
  layer.style.display='none';
}
/* Same slender, angled pencil geometry as the link-drawing cursor above. */
const LINK_PENCIL_SVG='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 38" aria-hidden="true" focusable="false">'+
  '<defs><linearGradient id="link-pencil-gradient" x1="0" y1="0" x2="0" y2="38">'+
  '<stop offset="0%" stop-color="var(--accent-1)"/><stop offset="9%" stop-color="var(--accent-1)"/>'+
  '<stop offset="9%" stop-color="var(--accent-0)"/><stop offset="20%" stop-color="var(--accent-0)"/>'+
  '<stop offset="20%" stop-color="var(--accent-2)"/><stop offset="66%" stop-color="var(--accent-2)"/>'+
  '<stop offset="66%" stop-color="var(--accent-3)"/><stop offset="72%" stop-color="var(--accent-3)"/>'+
  '<stop offset="72%" stop-color="var(--accent-1)"/><stop offset="86%" stop-color="var(--accent-1)"/>'+
  '<stop offset="86%" stop-color="var(--text)"/><stop offset="100%" stop-color="var(--text)"/></linearGradient></defs>'+
  '<path d="M3.6 0H8.4V3.8H9.36V7.22H8.4V25.08L6 38L3.6 25.08V7.22H2.64V3.8H3.6Z" fill="url(#link-pencil-gradient)"/></svg>';

/* SAQ: text box + Check. Enter in the box checks (the global Enter → Next
   handler ignores keys typed in inputs, so one press never does both). */
/* picture on a stepped question (shown on every step), with its license caption */
function stepFigureHTML(q, review){
  if(!q || !q.image) return '';
  const cr=q.credit?('<figcaption class="label-credit step-credit">'+(q.creditUrl?'<a href="'+escapeHtml(q.creditUrl)+'" target="_blank" rel="noopener">'+escapeHtml(q.credit)+'</a>':escapeHtml(q.credit))+'</figcaption>'):'';
  return '<figure class="step-figure'+(review?' in-review':'')+'"><img class="step-img" src="'+escapeHtml(q.image)+'" alt="'+escapeHtml(q.alt||'')+'" draggable="false">'+cr+'</figure>';
}
function renderSaq(q, ans){
  const opts=document.getElementById('options');
  const done=!!(ans && ans.correct);
  const wrap=document.createElement('div'); wrap.className='saq-wrap';
  const input=document.createElement('input');
  input.type='text'; input.className='saq-input'+(done?' correct':''); input.id='saqInput';
  input.autocomplete='off'; input.spellcheck=false; input.setAttribute('autocapitalize','sentences'); input.setAttribute('autocorrect','off');
  input.placeholder='Type your answer'; input.setAttribute('aria-label','Your answer');
  input.value=done?ans.text:'';
  input.disabled=done;
  const btn=document.createElement('button');
  btn.type='button'; btn.className='nav-btn primary saq-check'; btn.id='saqCheck'; btn.textContent='Check';
  btn.disabled=done;
  btn.addEventListener('click',()=>submitSaq());
  input.addEventListener('keydown',e=>{
    if(e.key==='Enter'){ e.preventDefault(); e.stopPropagation(); submitSaq(); }
  });
  wrap.append(input,btn);
  opts.appendChild(wrap);
  // typed step in a stepped question: the labeling highlighter under the box
  // (each wrong letter or wrong capital is marked in the accent colour as you type)
  if(isTypedStep(q) && !done){
    const echo=document.createElement('div'); echo.className='label-echo saq-echo'; echo.id='saqEcho'; echo.setAttribute('aria-live','polite');
    wrap.appendChild(echo);
    const cand={answer:q.answer, accept:q.accept};
    input.addEventListener('input',()=>{ echo.innerHTML=labelEchoHTML(cand, input.value); });
  }
  if(!done && quizActive) setTimeout(()=>{ if(document.activeElement!==input && document.getElementById('quizView').classList.contains('active')) try{ input.focus({preventScroll:true}); }catch(e){} },0);
}
function submitSaq(){
  if(!quizActive||locked) return;
  const q=questions[current]; if(!isSaq(q)) return;
  const input=document.getElementById('saqInput'); if(!input) return;
  const typed=input.value;
  const fb=document.getElementById('feedback');
  if(!saqNorm(typed)){ input.focus(); return; }
  if(!saqMatches(q, typed)){
    if(window.StudyAchievements && typeof StudyAchievements.recordWrong==='function') StudyAchievements.recordWrong();
    input.classList.remove('soft-wrong'); void input.offsetWidth;
    input.classList.add('soft-wrong');
    setTimeout(()=>input.classList.remove('soft-wrong'), 480);
    fb.className='feedback soft'; fb.textContent=saqHint(q, typed);
    clearTimeout(selectAnswer._t); selectAnswer._t=setTimeout(()=>{ if(!locked){ fb.className='feedback idle'; fb.textContent=''; } },1400);
    input.select();
    return;
  }
  locked=true; answers[current]={text:saqNorm(typed), correct:true}; onQuestionSolved(q);
  input.disabled=true; input.classList.add('correct');
  const cb=document.getElementById('saqCheck'); if(cb) cb.disabled=true;
  fb.className='feedback good'; fb.textContent=correctFeedbackText(q);
  document.getElementById('mainPanel').classList.add('correct-pulse');
  setTimeout(()=>document.getElementById('mainPanel').classList.remove('correct-pulse'),650);
  pt1Confetti();
  rewardCorrect();
  afterAnswerProgress();
}
/* —— LABEL (image labeling) questions ——
   q: {id, type:'label', cat, q, image, alt, credit?, creditUrl?, labels:[{id, answer, accept?, x, y, w, h}], explain}
   x / y / w / h are percents of the image, so the slots scale with it.
   Answer state: {slots:{<label id>: <text placed>}, correct:<every slot placed>}.
   A slot locks the moment it is right (drag or typing) and never unlocks. */
let labelTyping=(function(){ try{ return localStorage.getItem('sp_label_mode_v1')==='type'; }catch(e){ return false; } })();
let labelSelectedChip=null;
function labelCands(l){ return [l.answer].concat(Array.isArray(l.accept)?l.accept:[]).filter(x=>x!=null&&String(x).trim()!==''); }
function labelMatches(l, text){ const t=saqNorm(text); return !!t && labelCands(l).some(c=>saqNorm(c)===t); }
function labelState(i){
  const a=answers[i];
  if(a && typeof a==='object' && a.slots) return a;
  const st={slots:{}, correct:false}; answers[i]=st; return st;
}
function labelDoneCount(q, a){ return (q.labels||[]).filter(l=>a && a.slots && a.slots[l.id]!=null).length; }
/* Typing echo: compare with the answer (or accepted form) that shares the longest exact
   prefix; every character that differs there (wrong letter or wrong case) is marked. */
function labelEchoHTML(l, typed){
  const t=String(typed||'').replace(/^\s+/,'').replace(/\s+/g,' ');
  if(!t) return '';
  let best='', bestN=-1;
  labelCands(l).forEach(c=>{ c=saqNorm(c); let n=0; while(n<c.length && n<t.length && c[n]===t[n]) n++; if(n>bestN){ bestN=n; best=c; } });
  let h='';
  for(let k=0;k<t.length;k++){
    const ch=escapeHtml(t[k]===' '?'\u00a0':t[k]);
    h+= (best[k]===t[k]) ? ch : '<mark class="label-mark">'+ch+'</mark>';
  }
  return h;
}
function labelFigureHTML(q, a, review){
  const slots=(a&&a.slots)||{};
  let h='<div class="label-figure'+(review?' in-review':'')+'"><img class="label-img" src="'+escapeHtml(q.image||'')+'" alt="'+escapeHtml(q.alt||'')+'" draggable="false">';
  (q.labels||[]).forEach(l=>{
    const done=slots[l.id]!=null;
    const style='left:'+l.x+'%;top:'+l.y+'%;width:'+l.w+'%;height:'+l.h+'%';
    if(review){
      h+='<div class="label-slot locked'+(done?'':' missed')+'" style="'+style+'"><span class="label-slot-text">'+escapeHtml(done?slots[l.id]:l.answer)+'</span></div>';
    } else if(done){
      h+='<div class="label-slot locked" data-id="'+escapeHtml(l.id)+'" style="'+style+'"><span class="label-slot-text">'+escapeHtml(slots[l.id])+'</span></div>';
    } else if(labelTyping){
      h+='<div class="label-slot typing" data-id="'+escapeHtml(l.id)+'" style="'+style+'"><input class="label-input" type="text" autocomplete="off" spellcheck="false" autocapitalize="sentences" autocorrect="off" aria-label="Label '+escapeHtml(l.id)+'"><div class="label-echo" aria-live="polite"></div></div>';
    } else {
      h+='<div class="label-slot open" data-id="'+escapeHtml(l.id)+'" style="'+style+'" role="button" tabindex="0" aria-label="Empty label"></div>';
    }
  });
  return h+'</div>';
}
function labelChipOrder(q){
  const ids=(q.labels||[]).map(l=>l.id);
  const o=Array.isArray(q.__chips)?q.__chips.filter(id=>ids.includes(id)):[];
  ids.forEach(id=>{ if(!o.includes(id)) o.push(id); });
  return o;
}
function renderLabel(q, ans){
  const opts=document.getElementById('options');
  const a=(ans && ans.slots)?ans:{slots:{},correct:false};
  const n=(q.labels||[]).length, k=labelDoneCount(q,a);
  labelSelectedChip=null;
  const wrap=document.createElement('div'); wrap.className='label-wrap'+(labelTyping?' is-typing':'');
  let h='<div class="label-tools"><span class="label-progress" id="labelProgress">'+k+' / '+n+' labels</span>';
  if(!a.correct) h+='<button type="button" class="nav-btn label-mode" id="labelModeBtn" aria-pressed="'+(labelTyping?'true':'false')+'">'+(labelTyping?'✋ drag labels':'⌨ type labels')+'</button>';
  h+='</div><div class="label-stage">'+labelFigureHTML(q,a,false)+'</div>';
  if(q.credit) h+='<div class="label-credit">Image: '+escapeHtml(q.credit)+(q.creditUrl?' <a href="'+escapeHtml(q.creditUrl)+'" target="_blank" rel="noopener">source</a>':'')+'</div>';
  if(!labelTyping && !a.correct){
    // one chip per label that is still open (two "Pulmonary Veins" slots → two chips)
    h+='<div class="label-bank" id="labelBank" aria-label="Word bank">';
    labelChipOrder(q).forEach(id=>{ const l=q.labels.find(x=>x.id===id); if(!l || a.slots[l.id]!=null) return; h+='<button type="button" class="label-chip" data-for="'+escapeHtml(l.id)+'" data-text="'+escapeHtml(l.answer)+'">'+escapeHtml(l.answer)+'</button>'; });
    h+='</div>';
  }
  wrap.innerHTML=h;
  opts.appendChild(wrap);
  const mb=wrap.querySelector('#labelModeBtn');
  if(mb) mb.addEventListener('click',()=>{ labelTyping=!labelTyping; try{ localStorage.setItem('sp_label_mode_v1', labelTyping?'type':'drag'); }catch(e){} renderQuestion(); });
  wrap.querySelectorAll('.label-chip').forEach(chip=>{
    chip.addEventListener('pointerdown',e=>labelPointerDown(e,chip));
    chip.addEventListener('click',()=>{ if(chip.__suppressClick) return; labelSelect(labelSelectedChip===chip?null:chip); });
  });
  wrap.querySelectorAll('.label-slot.open').forEach(slot=>{
    const go=()=>{ if(labelSelectedChip) labelTryPlace(labelSelectedChip, slot, null); };
    slot.addEventListener('click',go);
    slot.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); e.stopPropagation(); go(); } });
  });
  wrap.querySelectorAll('.label-slot.typing').forEach(slot=>{
    const input=slot.querySelector('input'), echo=slot.querySelector('.label-echo');
    const l=q.labels.find(x=>x.id===slot.dataset.id);
    input.addEventListener('input',()=>{
      echo.innerHTML=labelEchoHTML(l, input.value);
      slot.classList.toggle('has-echo', !!echo.innerHTML);
      if(labelMatches(l, input.value)) labelLock(l, saqNorm(input.value), slot);
    });
    input.addEventListener('keydown',e=>{
      if(e.key!=='Enter') return;
      e.preventDefault(); e.stopPropagation();
      if(!saqNorm(input.value)) return;
      if(!labelMatches(l, input.value)) labelWrong(input, null, saqHint({answer:l.answer, accept:l.accept}, input.value));
    });
  });
}
function labelSelect(chip){
  document.querySelectorAll('.label-chip.selected').forEach(c=>c.classList.remove('selected'));
  labelSelectedChip=chip||null;
  if(chip) chip.classList.add('selected');
  const fig=document.querySelector('.label-figure'); if(fig) fig.classList.toggle('picking', !!chip);
}
function labelPointerDown(e, chip){
  if(!quizActive || locked) return;
  if(e.pointerType==='mouse' && e.button!==0) return;
  const sx=e.clientX, sy=e.clientY; let ghost=null, over=null;
  const move=ev=>{
    if(!ghost){
      if(Math.hypot(ev.clientX-sx, ev.clientY-sy)<6) return;
      ghost=chip.cloneNode(true); ghost.classList.add('label-ghost'); ghost.classList.remove('selected');
      document.body.appendChild(ghost); chip.classList.add('dragging'); labelSelect(null);
    }
    ev.preventDefault();
    ghost.style.left=ev.clientX+'px'; ghost.style.top=ev.clientY+'px';
    // drag near the top/bottom edge scrolls the page so far-away slots can be reached
    if(ev.clientY<48) window.scrollBy(0,-14); else if(ev.clientY>window.innerHeight-48) window.scrollBy(0,14);
    const el=document.elementFromPoint(ev.clientX, ev.clientY);
    const s=el && el.closest ? el.closest('.label-slot.open') : null;
    if(s!==over){ if(over) over.classList.remove('drop-over'); over=s; if(over) over.classList.add('drop-over'); }
  };
  const end=ev=>{
    window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',end); window.removeEventListener('pointercancel',end);
    if(over) over.classList.remove('drop-over');
    if(!ghost) return; // a tap: the click handler selects the chip
    chip.__suppressClick=true; setTimeout(()=>{ chip.__suppressClick=false; },60);
    chip.classList.remove('dragging');
    if(ev.type==='pointerup' && over) labelTryPlace(chip, over, ghost);
    else labelBounce(chip, ghost);
  };
  window.addEventListener('pointermove',move,{passive:false});
  window.addEventListener('pointerup',end); window.addEventListener('pointercancel',end);
}
function labelBounce(chip, ghost){
  if(!ghost) return;
  const r=chip.getBoundingClientRect();
  ghost.classList.add('returning');
  ghost.style.left=(r.left+r.width/2)+'px'; ghost.style.top=(r.top+r.height/2)+'px';
  setTimeout(()=>ghost.remove(), 320);
}
function labelWrong(el, ghost, msg){
  if(window.StudyAchievements && typeof StudyAchievements.recordWrong==='function') StudyAchievements.recordWrong();
  if(el){ el.classList.remove('soft-wrong'); void el.offsetWidth; el.classList.add('soft-wrong'); setTimeout(()=>el.classList.remove('soft-wrong'),480); }
  const fb=document.getElementById('feedback');
  fb.className='feedback soft'; fb.textContent=msg||'not that one · try again';
  clearTimeout(selectAnswer._t); selectAnswer._t=setTimeout(()=>{ if(!locked){ fb.className='feedback idle'; fb.textContent=''; } },1400);
}
function labelTryPlace(chip, slot, ghost){
  if(!quizActive || locked || !chip || !slot || !slot.classList.contains('open')) return;
  const q=questions[current]; if(!isLabel(q)) return;
  const l=q.labels.find(x=>x.id===slot.dataset.id); if(!l) return;
  const text=chip.dataset.text;
  if(!labelMatches(l, text)){
    labelBounce(chip, ghost);
    labelWrong(chip, null); slot.classList.remove('soft-wrong'); void slot.offsetWidth; slot.classList.add('soft-wrong'); setTimeout(()=>slot.classList.remove('soft-wrong'),480);
    labelSelect(null);
    return;
  }
  if(ghost) ghost.remove();
  chip.remove(); labelSelect(null);
  labelLock(l, text, slot);
}
function labelLock(l, text, slot){
  const q=questions[current]; const a=labelState(current);
  if(a.slots[l.id]!=null) return;
  a.slots[l.id]=String(text);
  // the slot is now permanent: swap it for a locked label
  const done=document.createElement('div');
  done.className='label-slot locked just-locked'; done.dataset.id=l.id; done.setAttribute('style', slot.getAttribute('style'));
  done.innerHTML='<span class="label-slot-text">'+escapeHtml(String(text))+'</span>';
  const hadFocus=slot.contains(document.activeElement);
  slot.replaceWith(done);
  const r=done.getBoundingClientRect();
  if(typeof spawnFireworkBurst==='function') spawnFireworkBurst(r.left+r.width/2, r.top+r.height/2, 14);
  rewardCorrect();
  const n=q.labels.length, k=labelDoneCount(q,a);
  const pr=document.getElementById('labelProgress'); if(pr) pr.textContent=k+' / '+n+' labels';
  const fb=document.getElementById('feedback');
  if(k>=n){
    a.correct=true; locked=true; onQuestionSolved(q);
    fb.className='feedback good'; fb.textContent=correctFeedbackText(q);
    const mb=document.getElementById('labelModeBtn'); if(mb) mb.remove();
    const bank=document.getElementById('labelBank'); if(bank) bank.remove();
    document.getElementById('mainPanel').classList.add('correct-pulse');
    setTimeout(()=>document.getElementById('mainPanel').classList.remove('correct-pulse'),650);
    pt1Confetti();
    afterAnswerProgress();
    return;
  }
  fb.className='feedback good'; fb.textContent='✓ '+k+' of '+n+' labels';
  renderNav(); updateCounters(); saveRunState();
  if(hadFocus){ const nx=document.querySelector('.label-slot.typing input'); if(nx) try{ nx.focus({preventScroll:true}); }catch(e){} }
}
/* —— ORDER (put the stages in order) questions + original blood-flow animation ——
   q: {id, type:'order', cat, title?, q, stages:[{id, text, part?}], explain}
   The stages are listed in the right order in the bank; the run shows them shuffled
   (never already solved). Answer state: {order:[stage ids as shown], locked:{id:true}, correct}. */
function orderIds(q){ return (q.stages||[]).map(s=>s.id); }
function orderShuffle(q){
  const ids=orderIds(q); if(ids.length<2) return ids;
  let o; do{ o=shuffle(ids); } while(o.every((id,k)=>id===ids[k]));
  return o;
}
function orderValid(q, o){ const ids=orderIds(q); return Array.isArray(o) && o.length===ids.length && ids.every(id=>o.includes(id)); }
function orderState(i){
  const q=questions[i]; let a=answers[i];
  if(!(a && typeof a==='object' && Array.isArray(a.order))){
    a={order:orderValid(q,q.__order)?q.__order.slice():orderShuffle(q), locked:{}, correct:false};
    answers[i]=a;
  }
  return a;
}
function orderStage(q,id){ return (q.stages||[]).find(s=>s.id===id); }
const REDUCED_MOTION=()=>!!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

/* Schematic heart: our own drawing. Each part has waypoints the pulse travels through. */
const FLOW_PARTS={
  body:{pts:[[360,272],[300,272],[230,272],[170,272],[140,272]], oxyIn:true, oxyOut:false},
  vc:{pts:[[140,272],[40,272],[40,120],[100,120]], oxy:false},
  ra:{pts:[[100,120],[145,120]], oxy:false},
  tv:{pts:[[145,145],[145,160]], oxy:false},
  rv:{pts:[[145,170],[145,192]], oxy:false},
  psv:{pts:[[120,192],[100,192]], oxy:false},
  pa:{pts:[[100,192],[70,192],[70,30],[140,30]], oxy:false},
  lungs:{pts:[[140,30],[175,30],[225,30],[260,30]], oxyIn:false, oxyOut:true},
  pvn:{pts:[[260,30],[330,30],[330,120],[300,120]], oxy:true},
  la:{pts:[[300,120],[255,120]], oxy:true},
  mv:{pts:[[255,145],[255,160]], oxy:true},
  lv:{pts:[[255,170],[255,192]], oxy:true},
  av:{pts:[[280,192],[300,192]], oxy:true},
  aorta:{pts:[[300,192],[340,192],[360,192],[360,272]], oxy:true},
  cor:{pts:[[340,192],[340,246],[300,246],[250,246]], oxy:true},
  myo:{pts:[[250,246],[200,240],[150,240]], oxyIn:true, oxyOut:false}
};
function flowSVG(){
  const L=(x,y,t,cls)=>'<text x="'+x+'" y="'+y+'" class="flow-label'+(cls?' '+cls:'')+'">'+t+'</text>';
  return '<svg class="flow-svg" viewBox="0 0 400 300" role="img" aria-label="Schematic heart showing the path of blood">'
   +'<rect data-part="myo" class="flow-part flow-wall" x="88" y="86" width="224" height="160" rx="26"/>'
   +'<rect data-part="lungs" class="flow-part flow-box" x="140" y="10" width="120" height="40" rx="10"/>'+L(200,25,'Lungs')
   +'<rect data-part="body" class="flow-part flow-box" x="140" y="255" width="120" height="36" rx="10"/>'+L(200,287,'Body Tissues')
   +'<rect data-part="ra" class="flow-part flow-chamber" x="100" y="95" width="90" height="50" rx="10"/>'+L(145,124,'RA')
   +'<rect data-part="rv" class="flow-part flow-chamber" x="100" y="160" width="90" height="66" rx="12"/>'+L(145,200,'RV')
   +'<rect data-part="la" class="flow-part flow-chamber" x="210" y="95" width="90" height="50" rx="10"/>'+L(255,124,'LA')
   +'<rect data-part="lv" class="flow-part flow-chamber" x="210" y="160" width="90" height="66" rx="12"/>'+L(255,200,'LV')
   +'<rect data-part="tv" class="flow-part flow-valve" x="125" y="147" width="40" height="10" rx="5"/>'
   +'<rect data-part="mv" class="flow-part flow-valve" x="235" y="147" width="40" height="10" rx="5"/>'
   +'<rect data-part="psv" class="flow-part flow-valve" x="93" y="182" width="10" height="20" rx="5"/>'
   +'<rect data-part="av" class="flow-part flow-valve" x="297" y="182" width="10" height="20" rx="5"/>'
   +'<path data-part="vc" class="flow-part flow-vessel deoxy" d="M140 272 H40 V120 H100"/>'+L(28,200,'Vena Cava','vert')
   +'<path data-part="pa" class="flow-part flow-vessel deoxy" d="M100 192 H70 V30 H140"/>'+L(102,22,'Pulmonary Arteries','small')
   +'<path data-part="pvn" class="flow-part flow-vessel oxy" d="M260 30 H330 V120 H300"/>'+L(298,22,'Pulmonary Veins','small')
   +'<path data-part="aorta" class="flow-part flow-vessel oxy" d="M307 192 H360 V272"/>'+L(373,235,'Aorta','vert')
   +'<path data-part="cor" class="flow-part flow-vessel oxy thin" d="M340 192 V246 H250"/>'
   +L(295,262,'Coronary','small')+L(200,238,'Myocardium','small')
   +L(145,141,'Tricuspid','tiny')+L(255,141,'Bicuspid (mitral)','tiny')
   +'<path class="flow-trail deoxy-trail" d=""/><path class="flow-trail oxy-trail" d=""/>'
   +'<circle class="flow-dot" r="7" cx="-20" cy="-20"/>'
   +'</svg>';
}
/* waypoint list for a question's stages, each point tagged with stage + oxygenation */
function flowRoute(q){
  const out=[];
  (q.stages||[]).forEach(st=>{
    const P=FLOW_PARTS[st.part]; if(!P) return;
    P.pts.forEach((pt,k)=>{
      const oxy=('oxy' in P)?P.oxy:(k<P.pts.length-1?P.oxyIn:P.oxyOut);
      out.push({x:pt[0],y:pt[1],stage:st.id,part:st.part,oxy});
    });
  });
  return out;
}
let flowAnim=null;
function flowHighlight(box, q, stageId){
  box.querySelectorAll('.flow-part.flow-on').forEach(e=>e.classList.remove('flow-on'));
  document.querySelectorAll('.order-card.flow-on').forEach(e=>e.classList.remove('flow-on'));
  if(!stageId) return;
  const st=orderStage(q,stageId); if(!st) return;
  box.querySelectorAll('.flow-part[data-part="'+st.part+'"]').forEach(e=>e.classList.add('flow-on'));
  const card=document.querySelector('.order-card[data-id="'+stageId+'"]'); if(card) card.classList.add('flow-on');
}
function flowStatic(box, q){
  // reduced motion: the whole route at once, blue then red, with every part highlighted
  const route=flowRoute(q);
  const deoxy=[], oxy=[];
  for(let k=1;k<route.length;k++){ const a=route[k-1], b=route[k]; (b.oxy?oxy:deoxy).push('M'+a.x+' '+a.y+'L'+b.x+' '+b.y); }
  box.querySelector('.deoxy-trail').setAttribute('d',deoxy.join(''));
  box.querySelector('.oxy-trail').setAttribute('d',oxy.join(''));
  box.classList.add('is-static');
  (q.stages||[]).forEach(st=>box.querySelectorAll('.flow-part[data-part="'+st.part+'"]').forEach(e=>e.classList.add('flow-path')));
  const dot=box.querySelector('.flow-dot'); dot.setAttribute('cx',-20); dot.setAttribute('cy',-20);
}
function flowPlay(box, q){
  if(flowAnim){ cancelAnimationFrame(flowAnim.raf); flowAnim=null; }
  box.classList.remove('is-static','is-done');
  box.querySelectorAll('.flow-part.flow-path').forEach(e=>e.classList.remove('flow-path'));
  box.querySelector('.deoxy-trail').setAttribute('d',''); box.querySelector('.oxy-trail').setAttribute('d','');
  if(REDUCED_MOTION()){ flowStatic(box,q); return; }
  const route=flowRoute(q); if(route.length<2){ flowStatic(box,q); return; }
  const segs=[]; let total=0;
  for(let k=1;k<route.length;k++){ const a=route[k-1], b=route[k]; const len=Math.hypot(b.x-a.x,b.y-a.y); segs.push({a,b,len,start:total}); total+=len; }
  const speed=110; // svg units per second
  const dur=Math.max(2.5, total/speed)*1000;
  const dot=box.querySelector('.flow-dot');
  const trails={deoxy:[],oxy:[]};
  let t0=null, lastStage=null;
  box.classList.add('is-playing');
  const frame=ts=>{
    if(!box.isConnected){ flowAnim=null; return; }
    if(t0==null) t0=ts;
    const d=Math.min(1,(ts-t0)/dur)*total;
    let s=segs.find(x=>d<=x.start+x.len) || segs[segs.length-1];
    const f=s.len? Math.min(1,(d-s.start)/s.len) : 1;
    const x=s.a.x+(s.b.x-s.a.x)*f, y=s.a.y+(s.b.y-s.a.y)*f;
    // a segment takes the colour of where it ends: blue until the blood leaves the lungs, then red
    const oxy=s.b.oxy;
    dot.setAttribute('cx',x.toFixed(1)); dot.setAttribute('cy',y.toFixed(1));
    dot.classList.toggle('oxy',oxy); dot.classList.toggle('deoxy',!oxy);
    const stage=(f<1||s===segs[segs.length-1])?s.b.stage:s.b.stage;
    if(stage!==lastStage){ lastStage=stage; flowHighlight(box,q,stage); box.dataset.stage=stage; }
    const pts=[]; segs.forEach(g=>{ if(g.start<=d) pts.push(g); });
    const dpts=[], opts=[];
    pts.forEach(g=>{ const arr=g.b.oxy?opts:dpts; const end=(g===s)?{x,y}:g.b; arr.push('M'+g.a.x+' '+g.a.y+'L'+end.x.toFixed(1)+' '+end.y.toFixed(1)); });
    box.querySelector('.deoxy-trail').setAttribute('d',dpts.join(''));
    box.querySelector('.oxy-trail').setAttribute('d',opts.join(''));
    if(d<total){ flowAnim={raf:requestAnimationFrame(frame)}; }
    else { flowAnim=null; box.classList.remove('is-playing'); box.classList.add('is-done'); setTimeout(()=>{ if(box.isConnected){ flowHighlight(box,q,null); } },700); }
  };
  flowAnim={raf:requestAnimationFrame(frame)};
}
function flowPanelHTML(q){
  return '<div class="flow-panel" id="flowPanel"><div class="flow-head"><span class="flow-title">Blood flow'+(q.title?' · '+escapeHtml(q.title):'')+'</span>'
    +'<span class="flow-legend"><i class="lg deoxy"></i>deoxygenated <i class="lg oxy"></i>oxygenated</span>'
    +'<button type="button" class="nav-btn flow-replay" id="flowReplay">↻ replay</button></div>'+flowSVG()+'</div>';
}
function mountFlowPanel(q, play){
  const old=document.getElementById('flowPanel'); if(old) old.remove();
  const wrap=document.querySelector('.order-wrap'); if(!wrap) return;
  wrap.insertAdjacentHTML('beforeend', flowPanelHTML(q));
  const box=document.getElementById('flowPanel');
  box.querySelector('#flowReplay').addEventListener('click',()=>flowPlay(box,q));
  if(play) flowPlay(box,q); else flowStatic(box,q);
}
function renderOrder(q, ans){
  const opts=document.getElementById('options');
  const a=(ans && Array.isArray(ans.order))?ans:{order:orderValid(q,q.__order)?q.__order.slice():orderIds(q), locked:{}, correct:false};
  const wrap=document.createElement('div'); wrap.className='order-wrap';
  let h='<ol class="order-list" id="orderList">';
  a.order.forEach((id,k)=>{
    const st=orderStage(q,id); if(!st) return;
    const lk=!!a.locked[id];
    h+='<li class="order-card'+(lk?' locked':'')+'" data-id="'+escapeHtml(id)+'"><span class="order-pos">'+(k+1)+'</span>'
      +'<span class="order-grip" aria-hidden="true">'+(lk?'🔒':'⠿')+'</span><span class="order-text">'+escapeHtml(st.text)+'</span>'
      +'<span class="order-btns"><button type="button" class="order-up" aria-label="Move '+escapeHtml(st.text)+' up"'+(lk?' disabled':'')+'>▲</button>'
      +'<button type="button" class="order-down" aria-label="Move '+escapeHtml(st.text)+' down"'+(lk?' disabled':'')+'>▼</button></span></li>';
  });
  h+='</ol>';
  if(!a.correct) h+='<div class="order-actions"><span class="order-progress" id="orderProgress">'+Object.keys(a.locked).length+' / '+a.order.length+' locked</span><button type="button" class="nav-btn primary order-check" id="orderCheck">Check</button></div>';
  wrap.innerHTML=h;
  opts.appendChild(wrap);
  if(!a.correct){
    wrap.querySelector('#orderCheck').addEventListener('click',()=>checkOrder());
    wrap.querySelectorAll('.order-card:not(.locked)').forEach(li=>{
      li.querySelector('.order-up').addEventListener('click',e=>{ e.stopPropagation(); orderMoveBy(li.dataset.id,-1); });
      li.querySelector('.order-down').addEventListener('click',e=>{ e.stopPropagation(); orderMoveBy(li.dataset.id,1); });
      li.addEventListener('pointerdown',e=>orderPointerDown(e,li));
    });
    orderUpdateButtons();
  } else {
    mountFlowPanel(q,false);
  }
}
/* move inside the unlocked cards only: locked cards keep their place, the rest flow around them */
function orderMoveTo(id, targetU){
  const a=orderState(current);
  const P=[], U=[]; a.order.forEach((x,k)=>{ if(!a.locked[x]){ P.push(k); U.push(x); } });
  const from=U.indexOf(id); if(from<0) return false;
  targetU=Math.max(0,Math.min(U.length-1,targetU));
  if(targetU===from) return false;
  U.splice(from,1); U.splice(targetU,0,id);
  P.forEach((pos,k)=>{ a.order[pos]=U[k]; });
  return true;
}
function orderMoveBy(id, dir){
  if(!quizActive || locked) return;
  const a=orderState(current);
  const U=a.order.filter(x=>!a.locked[x]);
  if(orderMoveTo(id, U.indexOf(id)+dir)){ orderRelayout(); saveRunState(); const b=document.querySelector('.order-card[data-id="'+id+'"] .order-'+(dir<0?'up':'down')); if(b && !b.disabled) b.focus({preventScroll:true}); else { const c=document.querySelector('.order-card[data-id="'+id+'"] .order-'+(dir<0?'down':'up')); if(c) c.focus({preventScroll:true}); } }
}
function orderRelayout(){
  const a=answers[current]; const list=document.getElementById('orderList'); if(!a||!list) return;
  a.order.forEach((id,k)=>{ const li=list.querySelector('.order-card[data-id="'+id+'"]'); if(li){ list.appendChild(li); li.querySelector('.order-pos').textContent=k+1; } });
  orderUpdateButtons();
}
function orderUpdateButtons(){
  const a=answers[current]; const q=questions[current];
  const order=(a&&a.order)||q.__order||orderIds(q); const lk=(a&&a.locked)||{};
  const U=order.filter(x=>!lk[x]);
  document.querySelectorAll('.order-card:not(.locked)').forEach(li=>{
    const u=U.indexOf(li.dataset.id);
    li.querySelector('.order-up').disabled=(u<=0); li.querySelector('.order-down').disabled=(u>=U.length-1);
  });
}
function orderPointerDown(e, li){
  if(!quizActive || locked) return;
  if(e.target.closest('button')) return;
  if(e.pointerType==='mouse' && e.button!==0) return;
  if(e.pointerType!=='mouse' && !e.target.closest('.order-grip')) return; // touch: drag by the grip, the rest scrolls
  const list=document.getElementById('orderList');
  const id=li.dataset.id; const sy=e.clientY; const grab=e.clientY-li.getBoundingClientRect().top;
  let dragging=false;
  const move=ev=>{
    if(!dragging){ if(Math.abs(ev.clientY-sy)<6) return; dragging=true; li.classList.add('dragging'); orderState(current); }
    ev.preventDefault();
    if(ev.clientY<48) window.scrollBy(0,-14); else if(ev.clientY>window.innerHeight-48) window.scrollBy(0,14);
    const a=answers[current];
    const others=[...list.querySelectorAll('.order-card:not(.locked)')].filter(x=>x!==li);
    let target=0; others.forEach(o=>{ const r=o.getBoundingClientRect(); if(ev.clientY>r.top+r.height/2) target++; });
    if(orderMoveTo(id,target)) orderRelayout();
    li.style.transform='translateY(0)';
    const nat=li.getBoundingClientRect().top;
    li.style.transform='translateY('+((ev.clientY-grab)-nat).toFixed(1)+'px)';
  };
  const end=()=>{
    window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',end); window.removeEventListener('pointercancel',end);
    if(!dragging) return;
    li.classList.remove('dragging'); li.style.transform='';
    saveRunState();
  };
  window.addEventListener('pointermove',move,{passive:false});
  window.addEventListener('pointerup',end); window.addEventListener('pointercancel',end);
}
function checkOrder(){
  if(!quizActive || locked) return;
  const q=questions[current]; if(!isOrder(q)) return;
  const a=orderState(current); const ids=orderIds(q);
  const fb=document.getElementById('feedback');
  let newly=0, wrong=0;
  a.order.forEach((id,k)=>{
    if(a.locked[id]) return;
    const li=document.querySelector('.order-card[data-id="'+id+'"]');
    if(id===ids[k]){
      a.locked[id]=true; newly++;
      if(li){ li.classList.add('locked','just-locked'); li.querySelector('.order-grip').textContent='🔒'; li.querySelectorAll('button').forEach(b=>b.disabled=true);
        const r=li.getBoundingClientRect(); if(typeof spawnFireworkBurst==='function') spawnFireworkBurst(r.left+r.width/2, r.top+r.height/2, 12); }
      rewardCorrect();
    } else {
      wrong++;
      if(li){ li.classList.remove('soft-wrong'); void li.offsetWidth; li.classList.add('soft-wrong'); setTimeout(()=>li.classList.remove('soft-wrong'),480); }
    }
  });
  const n=ids.length, k=Object.keys(a.locked).length;
  const pr=document.getElementById('orderProgress'); if(pr) pr.textContent=k+' / '+n+' locked';
  if(k>=n){
    a.correct=true; locked=true; onQuestionSolved(q);
    fb.className='feedback good'; fb.textContent=correctFeedbackText(q);
    const act=document.querySelector('.order-actions'); if(act) act.remove();
    document.getElementById('mainPanel').classList.add('correct-pulse');
    setTimeout(()=>document.getElementById('mainPanel').classList.remove('correct-pulse'),650);
    pt1Confetti();
    mountFlowPanel(q,true);
    afterAnswerProgress();
    return;
  }
  if(wrong){
    if(window.StudyAchievements && typeof StudyAchievements.recordWrong==='function') StudyAchievements.recordWrong();
    fb.className='feedback soft'; fb.textContent='not that one · try again';
    clearTimeout(selectAnswer._t); selectAnswer._t=setTimeout(()=>{ if(!locked){ fb.className='feedback idle'; fb.textContent=''; } },1400);
  }
  orderUpdateButtons();
  renderNav(); updateCounters(); saveRunState();
}
function renderMcq(q, answered){
  const opts=document.getElementById('options');
  (q.options||[]).forEach((opt,i)=>{
    const btn=document.createElement('button');
    btn.className='opt'; btn.type='button'; btn.dataset.key=String.fromCharCode(65+i);
    btn.textContent=opt; btn.onclick=()=>selectAnswer(i);
    if(answered){ btn.disabled=true; if(i===q.correct) btn.classList.add('correct'); }
    opts.appendChild(btn);
  });
}

function ensureMatchAns(){
  const cur=answers[current] && typeof answers[current]==='object' ? answers[current] : {pairs:{},wires:[],checked:false,correct:false};
  cur.pairs=cur.pairs||{}; cur.wires=Array.isArray(cur.wires)?cur.wires:[]; answers[current]=cur; return cur;
}
function wirePoints(w){ if(w&&Array.isArray(w.points)&&w.points.length) return w.points; if(w&&w.x1!=null) return [{x:w.x1,y:w.y1},{x:w.x2,y:w.y2}]; return []; }
function wireColorHex(value){
  const raw=(value||'').toString().trim();
  if(/^#[0-9a-f]{6}$/i.test(raw)) return raw;
  if(/^#[0-9a-f]{3}$/i.test(raw)) return '#'+raw.slice(1).split('').map(ch=>ch+ch).join('');
  const rgb=raw.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if(rgb){
    const nums=rgb.slice(1,4).map(n=>Math.max(0,Math.min(255,Math.round(Number(n)))));
    if(nums.every(Number.isFinite)) return '#'+nums.map(n=>n.toString(16).padStart(2,'0')).join('');
  }
  return '';
}
function currentWireColor(){
  // ADAPT: accent vars live on .pt1q containers in the portal (see quiz-accent-bridge.js)
  const cs=getComputedStyle(document.querySelector('.pt1q')||document.documentElement);
  const accent=wireColorHex(cs.getPropertyValue('--accent-1'));
  if(accent) return accent;
  const rgb=wireColorHex('rgb('+cs.getPropertyValue('--accent-1-rgb')+')');
  if(rgb) return rgb;
  return wireColorHex(cs.getPropertyValue('--accent-0')) || '#ffb968';
}
const MARK_GAP=11;
const MARK_R=2.2;
let committedMarks=null;
function invalidateWireCache(){ committedMarks=null; }
function quantKey(x,y){ return (Math.round(x/MARK_GAP)*MARK_GAP)+'|'+(Math.round(y/MARK_GAP)*MARK_GAP); }
function collectMarks(points, into){
  const pts=points||[];
  if(!pts.length) return into;
  let acc=0;
  let px=pts[0].x, py=pts[0].y;
  into.add(quantKey(px,py));
  for(let i=1;i<pts.length;i++){
    const x=pts[i].x, y=pts[i].y;
    let dx=x-px, dy=y-py, dist=Math.hypot(dx,dy);
    if(dist<0.01) continue;
    const ux=dx/dist, uy=dy/dist;
    while(acc+dist>=MARK_GAP){
      const step=MARK_GAP-acc;
      px+=ux*step; py+=uy*step;
      into.add(quantKey(px,py));
      dist-=step; acc=0;
    }
    acc+=dist; px=x; py=y;
  }
  const last=pts[pts.length-1];
  into.add(quantKey(last.x,last.y));
  return into;
}
function rebuildCommittedMarks(wires){
  committedMarks=new Set();
  (wires||[]).forEach(w=>collectMarks(wirePoints(w), committedMarks));
}
function wireStageRect(){
  const stage=document.querySelector('.match-stage');
  if(stage) return stage.getBoundingClientRect();
  return {left:0,top:0,width:0,height:0,right:0,bottom:0};
}
function getWireLayer(){
  let layer=document.getElementById('matchWireLayer');
  if(!layer){
    layer=document.createElement('canvas');
    layer.id='matchWireLayer';
    layer.className='match-wires';
    layer.setAttribute('aria-hidden','true');
    document.body.appendChild(layer);
  }
  if(layer.parentElement!==document.body) document.body.appendChild(layer);
  return layer;
}
function boardPoint(layer,ev){
  const stage=document.querySelector('.match-stage');
  const box=(stage||layer);
  const r=box&&box.getBoundingClientRect?box.getBoundingClientRect():wireStageRect();
  return {x:ev.clientX-r.left,y:ev.clientY-r.top};
}
function strokePoly(wctx,pts){
  if(!wctx||!pts||pts.length<2) return;
  wctx.beginPath();
  wctx.moveTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length;i++) wctx.lineTo(pts[i].x,pts[i].y);
  wctx.stroke();
}
function setLinkDrawing(on){
  document.documentElement.classList.toggle('link-drawing',!!on);
}
function pinCustomCursor(ev){
  if(!pt1CursorOn()||!ev) return;
  document.querySelectorAll('#cursor').forEach(el=>{ el.style.left=ev.clientX+'px'; el.style.top=ev.clientY+'px'; });
}
function paintWires(_ignored,wires,live){
  const stage=document.querySelector('.match-stage');
  const layer=getWireLayer();
  if(!stage){ layer.style.display='none'; return; }
  const r=wireStageRect();
  if(r.width<2||r.height<2){ layer.style.display='none'; return; }
  const boxW=window.innerWidth;
  const boxH=window.innerHeight;
  layer.style.display='block';
  layer.style.position='fixed';
  layer.style.left='0';
  layer.style.top='0';
  layer.style.right='auto';
  layer.style.bottom='auto';
  layer.style.width=boxW+'px';
  layer.style.height=boxH+'px';
  layer.style.zIndex='70';
  layer.style.pointerEvents='none';
  layer.style.opacity='1';
  layer.style.overflow='visible';
  const dpr=Math.min(2,window.devicePixelRatio||1);
  const pw=Math.max(1,Math.round(boxW*dpr));
  const ph=Math.max(1,Math.round(boxH*dpr));
  if(layer.width!==pw||layer.height!==ph){ layer.width=pw; layer.height=ph; }
  const wctx=layer.getContext('2d');
  wctx.setTransform(dpr,0,0,dpr,0,0);
  wctx.clearRect(0,0,boxW,boxH);
  wctx.translate(r.left,r.top);
  const ink=currentWireColor();
  wctx.globalCompositeOperation='source-over';
  wctx.globalAlpha=1;
  wctx.lineWidth=WIRE_STROKE;
  wctx.lineCap='round';
  wctx.lineJoin='round';
  wctx.setLineDash([]);
  // Each committed wire owns an absolute color. Only legacy wires without a
  // color are migrated here; existing colors are never replaced on redraw.
  (wires||[]).forEach(w=>{
    const color=wireColorHex(w&&w.color) || ink;
    if(w && w.color!==color) w.color=color;
    wctx.strokeStyle=color;
    wctx.fillStyle=color;
    strokePoly(wctx, wirePoints(w));
  });
  if(live&&live.points){
    wctx.strokeStyle=ink;
    wctx.fillStyle=ink;
    strokePoly(wctx, live.points);
    const last=live.points[live.points.length-1];
    if(last){ wctx.beginPath(); wctx.arc(last.x,last.y,2.2,0,Math.PI*2); wctx.fill(); }
  }
}
function relayoutWires(){
  const stage=document.querySelector('.match-stage');
  if(!stage||!quizActive) return;
  const live=drawState&&drawState.points?drawState:null;
  const wires=(answers[current]&&answers[current].wires)||[];
  // FIX (PT1 quirk): pills move on resize/reflow — refit stored lines to them
  if(!live) wires.forEach(refitWire);
  paintWires(null,wires,live);
}
addEventListener('scroll',relayoutWires,true);
addEventListener('resize',relayoutWires);
function celebrateLink(x,y){
  const bits=['😊','😄','🤩','🥳','🌸','🌺','🌼','🌷','💮','✨','🌻','💐'];
  // Basic quality plays the burst at one-third speed (see index.html CSS).
  const slow=document.documentElement.getAttribute('data-quality')==='basic'?3:1;
  for(let i=0;i<16;i++){
    const el=document.createElement('span'); el.className='float-bit'; el.textContent=bits[i%bits.length];
    el.style.left=(x+(Math.random()*24-12))+'px'; el.style.top=y+'px';
    el.style.setProperty('--dx',(Math.random()*120-60)+'px');
    el.style.setProperty('--dur',(900+Math.random()*800)+'ms');
    el.style.setProperty('--scale',(0.75+Math.random()*0.9).toFixed(2));
    el.style.setProperty('--spin',((Math.random()*50)-20)+'deg');
    document.body.appendChild(el); setTimeout(()=>el.remove(),1900*slow);
  }
  spawnFireworkBurst(x, Math.max(40,y-40), 18);
}

function isLockedMatchWire(q, ans, wire){
  if(!wire || wire.leftId==null || wire.rightId==null) return false;
  return !!(q && q.correct_pairs && ans && ans.pairs &&
    ans.pairs[wire.leftId]===wire.rightId &&
    q.correct_pairs[wire.leftId]===wire.rightId);
}
function isCompleteMatchRight(q, ans, rightId){
  const leftIds=Object.keys((q&&q.correct_pairs)||{})
    .filter(leftId=>q.correct_pairs[leftId]===rightId);
  return leftIds.length>0 && leftIds.every(leftId=>ans && ans.pairs && ans.pairs[leftId]===rightId);
}
function clearableMatchWireEntries(q, ans){
  return (ans && Array.isArray(ans.wires)?ans.wires:[])
    .map((wire,index)=>({wire,index}))
    .filter(entry=>!isLockedMatchWire(q,ans,entry.wire));
}
function isFullySolvedMatch(q, ans){
  const leftIds=(q&&q.leftItems||[]).map(item=>item.id);
  return leftIds.length>0 && !!(q&&q.correct_pairs&&ans&&ans.pairs) &&
    leftIds.every(leftId=>ans.pairs[leftId]===q.correct_pairs[leftId]);
}
function updateClearDrawingsButton(q, ans){
  const btn=document.getElementById('clearDrawingsBtn');
  if(!btn) return;
  const fullySolved=isFullySolvedMatch(q,ans);
  btn.hidden=fullySolved;
  btn.setAttribute('aria-hidden',String(fullySolved));
  btn.disabled=!fullySolved && clearableMatchWireEntries(q,ans).length===0;
}
function clearRandomMatchDrawings(q){
  const ans=ensureMatchAns();
  if(isFullySolvedMatch(q,ans)) return;
  const candidates=clearableMatchWireEntries(q,ans);
  if(!candidates.length) return;
  // Clear a random non-empty subset, but leave at least one drawing when
  // there is more than one candidate. Correct locked wires are never candidates.
  const maxRemove=candidates.length>1?candidates.length-1:1;
  const removeCount=1+Math.floor(Math.random()*maxRemove);
  const removed=shuffle(candidates).slice(0,removeCount);
  const removedIndexes=new Set(removed.map(entry=>entry.index));
  ans.wires=ans.wires.filter((wire,index)=>!removedIndexes.has(index));
  removed.forEach(({wire})=>{
    if(wire.leftId!=null && ans.pairs[wire.leftId]===wire.rightId){
      delete ans.pairs[wire.leftId];
    }
  });
  ans.checked=false;
  ans.correct=false;
  answers[current]=ans;
  renderQuestion();
  saveRunState();
}
function renderMatching(q, ans){
  const opts=document.getElementById('options');
  const hint=document.createElement('p'); hint.className='match-hint';
  hint.textContent='Hold on a term or a meaning, drag the thread, release on the other side.';
  opts.appendChild(hint);
  const stage=document.createElement('div'); stage.className='match-stage';
  const board=document.createElement('div'); board.className='match-board';
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.classList.add('match-wires');
  const defs=document.createElementNS('http://www.w3.org/2000/svg','defs');
  defs.innerHTML='<linearGradient id="wireGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="var(--cyan-bright)"/><stop offset="100%" stop-color="var(--gold)"/></linearGradient>';
  svg.appendChild(defs);
  const leftCol=document.createElement('div'); leftCol.className='match-col match-col-left'; leftCol.innerHTML='<h4>Terms</h4>';
  const rightCol=document.createElement('div'); rightCol.className='match-col match-col-right'; rightCol.innerHTML='<h4>Meanings</h4>';
  const leftList=document.createElement('div'); leftList.className='match-list';
  const rightList=document.createElement('div'); rightList.className='match-list';
  function makeItem(item,side){
    const btn=document.createElement('button'); btn.type='button'; btn.className='match-item';
    btn.dataset.side=side; btn.dataset.id=item.id; btn.textContent=item.text;
    const leftLocked=side==='L' && ans.pairs && ans.pairs[item.id] && q.correct_pairs && q.correct_pairs[item.id]===ans.pairs[item.id];
    const rightPaired=side==='R' && ans.pairs && Object.keys(ans.pairs).some(lid=>ans.pairs[lid]===item.id && q.correct_pairs && q.correct_pairs[lid]===item.id);
    const rightLocked=side==='R' && isCompleteMatchRight(q,ans,item.id);
    if(leftLocked){ btn.classList.add('paired','is-solved-link'); btn.disabled=true; }
    else if(rightLocked){ btn.classList.add('paired'); btn.disabled=true; }
    else if(rightPaired){ btn.classList.add('paired'); }
    else if(ans.correct){ btn.disabled=true; }
    if(!btn.disabled) btn.addEventListener('pointerdown', ev=>beginDraw(ev,q,btn));
    return btn;
  }
  (q.leftItems||[]).forEach(it=>leftList.appendChild(makeItem(it,'L')));
  (q.rightItems||[]).forEach(it=>rightList.appendChild(makeItem(it,'R')));
  leftCol.appendChild(leftList); rightCol.appendChild(rightList);
  board.appendChild(leftCol); board.appendChild(rightCol);
  stage.appendChild(board); stage.appendChild(svg); opts.appendChild(stage);
  requestAnimationFrame(()=>{ rebuildMissingWires(q, ans); (ans.wires||[]).forEach(refitWire); paintWires(svg, ans.wires||[]); });
  const actions=document.createElement('div'); actions.className='match-actions';
  const clear=document.createElement('button');
  clear.type='button'; clear.id='clearDrawingsBtn'; clear.className='nav-btn';
  clear.textContent='Clear drawings';
  clear.title='Remove random incorrect or incomplete drawings; correct links stay locked';
  clear.addEventListener('click',()=>clearRandomMatchDrawings(q));
  actions.appendChild(clear); opts.appendChild(actions);
  updateClearDrawingsButton(q,ans);
}
let dragScrollRAF=null;
let dragScrollEl=null;
const dragPointer={x:0,y:0};
function stopDragAutoScroll(){ if(dragScrollRAF){ cancelAnimationFrame(dragScrollRAF); dragScrollRAF=null; } dragScrollEl=null; }
function getMatchScrollParent(el){
  let node=el?el.parentElement:null;
  while(node&&node!==document.documentElement&&node!==document.body){
    const st=getComputedStyle(node);
    const oy=st.overflowY, ox=st.overflow;
    if((oy==='auto'||oy==='scroll'||ox==='auto'||ox==='scroll')&&node.scrollHeight>node.clientHeight) return node;
    node=node.parentElement;
  }
  return null;
}
function dragAutoScrollStep(){
  const svg=document.querySelector('.match-wires');
  if(!drawState||!svg||!svg.isConnected){ stopDragAutoScroll(); return; }
  const edge=Math.max(56, Math.round(window.innerHeight*0.12));
  const y=dragPointer.y;
  let dy=0;
  if(y<edge){
    const t=Math.min(1,(edge-y)/edge);
    dy=-(2+Math.pow(t,1.35)*10);
  }else if(y>window.innerHeight-edge){
    const t=Math.min(1,(y-(window.innerHeight-edge))/edge);
    dy=2+Math.pow(t,1.35)*10;
  }
  if(dy){
    if(dragScrollEl&&!dragScrollEl.isConnected) dragScrollEl=getMatchScrollParent(svg);
    if(dragScrollEl){ dragScrollEl.scrollTop+=dy; }
    else{ window.scrollTo({top:window.scrollY+dy,left:window.scrollX,behavior:'auto'}); }
    putWireTip(drawState.points, boardPoint(svg,{clientX:dragPointer.x,clientY:dragPointer.y}));
    paintWires(svg, ensureMatchAns().wires||[], drawState);
  }
  dragScrollRAF=requestAnimationFrame(dragAutoScrollStep);
}
function startDragAutoScroll(svg){
  stopDragAutoScroll();
  dragScrollEl=getMatchScrollParent(svg);
  dragScrollRAF=requestAnimationFrame(dragAutoScrollStep);
}
function beginDraw(ev,q,btn){
  if(locked||btn.disabled||ev.button) return; ev.preventDefault();
  // Arm suppress CSS before capture/hover recalc so other choices never flash glow
  setLinkDrawing(true);
  const layer=document.querySelector('.match-wires'); if(!layer){ setLinkDrawing(false); return; }
  const start=boardPoint(layer,ev);
  drawState={q,side:btn.dataset.side,id:btn.dataset.id,points:[{x:start.x,y:start.y}],btn};
  dragPointer.x=ev.clientX; dragPointer.y=ev.clientY;
  btn.classList.add('drawing'); try{btn.setPointerCapture(ev.pointerId);}catch(e){}
  pinCustomCursor(ev);
  paintWires(layer, ensureMatchAns().wires||[], drawState);
  btn.addEventListener('pointermove', onDrawMove);
  btn.addEventListener('pointerup', onDrawUp);
  btn.addEventListener('pointercancel', onDrawUp);
  startDragAutoScroll(layer);
}
/* Keep the live tip on the pointer. A few px of polyline spacing is only so
   the stored path stays small; the last point is always rewritten to the
   current event, so the stroke does not trail the finger. */
function putWireTip(points, p){
  if(!points||!p) return;
  if(!points.length){ points.push({x:p.x,y:p.y}); return; }
  const last=points[points.length-1];
  const dx=p.x-last.x, dy=p.y-last.y;
  if(points.length===1 || dx*dx+dy*dy>=2.25) points.push({x:p.x,y:p.y});
  else { last.x=p.x; last.y=p.y; }
}
function followDrawPointer(ev, layer){
  if(!drawState||!ev) return;
  let samples=null;
  try{ samples=ev.getCoalescedEvents?ev.getCoalescedEvents():null; }catch(e){ samples=null; }
  if(samples&&samples.length){
    for(let i=0;i<samples.length;i++) putWireTip(drawState.points, boardPoint(layer, samples[i]));
  }
  putWireTip(drawState.points, boardPoint(layer, ev));
}
/* Stroke width shared by paint and snap spacing. Round caps touch when
   endpoint centers are closer than this. */
const WIRE_STROKE=2.2;
const WIRE_END_GAP=WIRE_STROKE+1.5;
function matchEdgeFrame(el){
  if(!el||!el.getBoundingClientRect) return null;
  const r=el.getBoundingClientRect();
  if(r.width<1||r.height<1) return null;
  const stage=document.querySelector('.match-stage');
  const sr=stage&&stage.getBoundingClientRect?stage.getBoundingClientRect():{left:0,top:0};
  const side=el.dataset?el.dataset.side:'';
  const edge=side==='L'?r.right:side==='R'?r.left:(r.left+r.right)/2;
  let radius=0;
  try{ radius=parseFloat(getComputedStyle(el).borderTopLeftRadius)||0; }catch(e){ radius=0; }
  return {
    x:edge-sr.left,
    top:r.top-sr.top,
    bottom:r.bottom-sr.top,
    side,
    id:el.dataset?String(el.dataset.id):'',
    radius
  };
}
function matchTargetAnchor(el){
  const frame=matchEdgeFrame(el);
  if(!frame) return null;
  return {x:frame.x,y:(frame.top+frame.bottom)/2,side:frame.side};
}
/* A snapped wire ends on this pill when its tip sits on the inward edge.
   The same id on the source side of a wire drawn the other way does not. */
function wireEndsOnFrame(w, frame){
  if(!w||w.loose||w.leftId==null||w.rightId==null||!frame) return false;
  if(frame.side==='R' && String(w.rightId)!==frame.id) return false;
  if(frame.side==='L' && String(w.leftId)!==frame.id) return false;
  if(frame.side!=='L' && frame.side!=='R') return false;
  const pts=wirePoints(w);
  if(!pts.length) return false;
  const tip=pts[pts.length-1];
  return Math.abs(tip.x-frame.x)<=2.5 && tip.y>=frame.top-2 && tip.y<=frame.bottom+2;
}
function approachYOf(pts){
  if(!pts||!pts.length) return 0;
  return pts.length>=2 ? pts[pts.length-2].y : pts[0].y;
}
function spreadSlotYs(frame, n){
  const half=WIRE_STROKE/2+0.6;
  function insetRange(inset){
    const span=frame.bottom-frame.top;
    const cap=Math.max(0, span/2-0.5);
    inset=Math.min(Math.max(inset,0), cap);
    return [frame.top+inset, frame.bottom-inset];
  }
  let range=insetRange(Math.max(half, frame.radius||0));
  if(n>1 && (range[1]-range[0])/(n-1) < WIRE_END_GAP) range=insetRange(half);
  if(n<=1 || range[1]<=range[0]) return [(frame.top+frame.bottom)/2];
  const ys=[];
  for(let i=0;i<n;i++) ys.push(range[0]+(range[1]-range[0])*i/(n-1));
  return ys;
}
/* Meet the destination pill's inward edge and stop. Drop any trailing points
   that already crossed into the choice box so the stroke never paints inside.
   Finish with a short outside stub so the last segment does not slide along
   the edge into a neighbor. */
function snapWireEnd(points, anchor){
  if(!points||!anchor) return;
  const side=anchor.side||'';
  const edgeX=anchor.x;
  const past=side==='R'
    ?(p)=>p.x>edgeX
    :side==='L'
    ?(p)=>p.x<edgeX
    :()=>false;
  let keep=points.length;
  while(keep>0 && past(points[keep-1])) keep--;
  points.length=keep;
  const lead=Math.max(8, WIRE_STROKE*3);
  const inMargin=side==='R'
    ?(p)=>p.x>edgeX-lead
    :side==='L'
    ?(p)=>p.x<edgeX+lead
    :()=>false;
  while(points.length && inMargin(points[points.length-1])) points.pop();
  const stubX=side==='R'?edgeX-lead:side==='L'?edgeX+lead:anchor.x;
  if(!points.length) points.push({x:stubX,y:anchor.y});
  const prev=points[points.length-1];
  if(Math.abs(prev.x-stubX)>0.4 || Math.abs(prev.y-anchor.y)>0.4){
    points.push({x:stubX,y:anchor.y});
  }
  points.push({x:anchor.x,y:anchor.y});
}
/* Spread every snapped end on this pill along the facing edge. One shared
   midpoint makes several strokes merge and touch; distinct slots, farther
   apart than the stroke, keep the caps from touching. X stays on the edge. */
function spreadSnapAnchors(el, points, wires, replaceLeftId){
  const frame=matchEdgeFrame(el);
  if(!frame){
    snapWireEnd(points, matchTargetAnchor(el));
    return;
  }
  const peers=[];
  (wires||[]).forEach(w=>{
    if(replaceLeftId!=null && !w.loose && String(w.leftId)===String(replaceLeftId)) return;
    if(wireEndsOnFrame(w, frame)) peers.push(w);
  });
  const items=peers.map(w=>({w, y:approachYOf(wirePoints(w))}));
  items.push({w:null, y:approachYOf(points)});
  items.sort((a,b)=>(a.y-b.y) || (a.w?1:-1));
  const ys=spreadSlotYs(frame, items.length);
  items.forEach((item,i)=>{
    const anchor={x:frame.x,y:ys[i],side:frame.side};
    if(!item.w){ snapWireEnd(points, anchor); return; }
    const pts=wirePoints(item.w);
    if(!pts.length) return;
    const tip=pts[pts.length-1];
    const lead=Math.max(8, WIRE_STROKE*3);
    if(pts.length>=2){
      const prev=pts[pts.length-2];
      const near=frame.side==='R'
        ? prev.x>=anchor.x-lead-0.5 && prev.x<=anchor.x+0.5
        : frame.side==='L'
        ? prev.x<=anchor.x+lead+0.5 && prev.x>=anchor.x-0.5
        : false;
      if(near) prev.y=anchor.y;
    }
    tip.x=anchor.x;
    tip.y=anchor.y;
  });
}
function onDrawMove(ev){
  if(!drawState) return;
  dragPointer.x=ev.clientX; dragPointer.y=ev.clientY;
  pinCustomCursor(ev);
  const layer=document.querySelector('.match-wires'); if(!layer) return;
  followDrawPointer(ev, layer);
  paintWires(layer, ensureMatchAns().wires||[], drawState);
}
/* Expanded hit pad for linking release (~28–40px). Distance-to-rect is the
 * source of truth so near-misses register consistently; elementFromPoint alone
 * is flaky at edges. Modest pad avoids stealing a neighboring choice. */
const MATCH_HIT_PAD=34;
function distPointToRect(x,y,r){
  const dx=x<r.left?r.left-x:x>r.right?x-r.right:0;
  const dy=y<r.top?r.top-y:y>r.bottom?y-r.bottom:0;
  return Math.hypot(dx,dy);
}
function nearestOppositeMatchItem(clientX,clientY,fromSide){
  const wantSide=fromSide==='L'?'R':'L';
  const nodes=document.querySelectorAll('.match-item');
  let best=null, bestDist=Infinity, bestCenter=Infinity;
  for(let i=0;i<nodes.length;i++){
    const el=nodes[i];
    if(el.disabled || el.dataset.side!==wantSide) continue;
    const r=el.getBoundingClientRect();
    if(r.width<1||r.height<1) continue;
    const d=distPointToRect(clientX,clientY,r);
    if(d>MATCH_HIT_PAD) continue;
    const cx=(r.left+r.right)/2, cy=(r.top+r.bottom)/2;
    const dc=Math.hypot(clientX-cx, clientY-cy);
    if(d<bestDist-0.01 || (Math.abs(d-bestDist)<0.01 && dc<bestCenter)){
      best=el; bestDist=d; bestCenter=dc;
    }
  }
  return best;
}
function onDrawUp(ev){
  if(!drawState) return;
  stopDragAutoScroll();
  setLinkDrawing(false);
  pinCustomCursor(ev);
  const src=drawState.btn, q=drawState.q;
  src.releasePointerCapture?.(ev.pointerId);
  src.removeEventListener('pointermove', onDrawMove);
  src.removeEventListener('pointerup', onDrawUp);
  src.removeEventListener('pointercancel', onDrawUp);
  src.classList.remove('drawing');
  // Pointer interaction should not leave a term focused/activated after the
  // draw ends; solved terms are re-applied below as the only left glow.
  src.classList.remove('active');
  src.blur();
  // Prefer distance-to-nearest opposite choice (expanded hit) over elementFromPoint.
  const svg=document.querySelector('.match-wires');
  putWireTip(drawState.points, boardPoint(svg, ev));
  const hit=nearestOppositeMatchItem(ev.clientX, ev.clientY, drawState.side);
  const cur=ensureMatchAns();
  if(hit && hit.dataset.side && hit.dataset.side!==drawState.side && !hit.disabled){
    const leftId=drawState.side==='L'?drawState.id:hit.dataset.id;
    const rightId=drawState.side==='R'?drawState.id:hit.dataset.id;
    const leftEl=drawState.side==='L'?src:hit;
    const rightEl=drawState.side==='R'?src:hit;
    const isCorrect=!!(q.correct_pairs && q.correct_pairs[leftId]===rightId);
    if(isCorrect){
      // Persist only correct pairs; replace this left's prior committed wire.
      // Unfinished/loose strokes stay on the canvas. A right may intentionally
      // serve multiple lefts (e.g. shared base units).
      // Keep the exact hand-drawn path: no end snapping, trimming or straightening.
      const pts=drawState.points.map(pt=>({x:pt.x,y:pt.y}));
      cur.wires=cur.wires.filter(w=>w.loose || w.leftId!==leftId);
      cur.pairs[leftId]=rightId;
      const wire={leftId,rightId,points:pts,color:currentWireColor()};
      tagWireAnchors(wire, src, hit);
      cur.wires.push(wire);
      cur.checked=false;
      if(svg) paintWires(svg, cur.wires);
      celebrateLink(ev.clientX, ev.clientY);
      // Glow + lock left in place (no full redraw)
      leftEl.classList.add('paired','is-solved-link');
      leftEl.disabled=true;
      rightEl.classList.add('paired');
      rightEl.disabled=isCompleteMatchRight(q,cur,rightId);
      const leftIds=(q.leftItems||[]).map(x=>x.id);
      const allGood=leftIds.every(id=>cur.pairs[id]===q.correct_pairs[id]);
      if(allGood){
        cur.correct=true; cur.checked=true; answers[current]=cur; locked=true; onQuestionSolved(q);
        updateClearDrawingsButton(q,cur);
        const fb=document.getElementById('feedback');
        fb.className='feedback good'; fb.textContent='✓ '+(q.explain||'');
        document.getElementById('mainPanel').classList.add('correct-pulse');
        setTimeout(()=>document.getElementById('mainPanel').classList.remove('correct-pulse'),650);
        pt1Confetti(); rewardCorrect(); afterAnswerProgress();
      }
    } else {
      // Wrong target: keep the unfinished stroke, but do not store a pair or glow.
      if(drawState.points.length){
        const pts=drawState.points.map(pt=>({x:pt.x,y:pt.y}));
        const loose={points:pts,loose:true,color:currentWireColor()};
        if(drawState.side==='L') loose.leftId=drawState.id;
        else loose.rightId=drawState.id;
        tagWireAnchors(loose, src, null);
        cur.wires.push(loose);
      }
      cur.checked=false; cur.correct=false;
      const fb=document.getElementById('feedback');
      fb.className='feedback idle'; fb.textContent='';
    }
  } else if(drawState.points.length){
    const pts=drawState.points.map(pt=>({x:pt.x,y:pt.y}));
    const loose={points:pts,loose:true,color:currentWireColor()};
    if(drawState.side==='L') loose.leftId=drawState.id;
    else loose.rightId=drawState.id;
    tagWireAnchors(loose, src, null);
    cur.wires.push(loose);
    cur.checked=false; cur.correct=false;
  }
  drawState=null;
  if(svg) paintWires(svg, (answers[current]&&answers[current].wires)||[]);
  if(!locked){
    const ans=ensureMatchAns();
    // Drop any leftover incorrect pairs/wires from older sessions
    if(ans.pairs && q.correct_pairs){
      Object.keys(ans.pairs).forEach(lid=>{
        if(ans.pairs[lid]!==q.correct_pairs[lid]){
          delete ans.pairs[lid];
          // Only this left's bad committed drawing is stale; preserve unfinished
          // strokes and other correct links that may share the same right.
          ans.wires=(ans.wires||[]).filter(w=>w.loose || w.leftId!==lid);
        }
      });
    }
    // Reconcile each side independently. Left terms only ever receive the
    // solved-link state for their own correct pair; never mark the whole left
    // column as active/paired during a draw.
    document.querySelectorAll('.match-col-left .match-item').forEach(n=>{
      const isLeftSolved=!!(ans.pairs[n.dataset.id] && q.correct_pairs &&
        q.correct_pairs[n.dataset.id]===ans.pairs[n.dataset.id]);
      n.classList.toggle('paired',isLeftSolved);
      n.classList.toggle('is-solved-link',isLeftSolved);
      n.classList.remove('drawing','active');
      n.disabled=!!(isLeftSolved || ans.correct);
    });
    document.querySelectorAll('.match-col-right .match-item').forEach(n=>{
      const isRightPaired=Object.keys(ans.pairs).some(lid=>
        ans.pairs[lid]===n.dataset.id && q.correct_pairs &&
        q.correct_pairs[lid]===n.dataset.id);
      const isRightComplete=isCompleteMatchRight(q,ans,n.dataset.id);
      n.classList.toggle('paired',isRightPaired);
      n.classList.remove('drawing','active');
      n.disabled=!!(isRightComplete || ans.correct);
    });
    updateClearDrawingsButton(q,ans);
  }
  saveRunState(); // PORTAL: resume keeps drawings
}

/* —— FIX (PT1 quirk): linking lines drifting after resize ——
   Each committed line remembers where its two ends sit INSIDE their pills
   (fractions of the pill box). When the layout changes, the line is moved,
   scaled and turned so both ends land on the same spots again. */
function matchPill(side,id){
  const list=document.querySelectorAll('.match-item');
  for(let i=0;i<list.length;i++){ if(list[i].dataset.side===side && String(list[i].dataset.id)===String(id)) return list[i]; }
  return null;
}
function pillBox(el){
  const stage=document.querySelector('.match-stage');
  if(!el||!stage) return null;
  const r=el.getBoundingClientRect(), sr=stage.getBoundingClientRect();
  if(r.width<1||r.height<1) return null;
  return {x:r.left-sr.left, y:r.top-sr.top, w:r.width, h:r.height};
}
function anchorOf(el, p){
  const b=pillBox(el); if(!b||!p) return null;
  return {side:el.dataset.side, id:String(el.dataset.id), fx:(p.x-b.x)/b.w, fy:(p.y-b.y)/b.h};
}
function anchorPoint(a){
  if(!a) return null;
  const b=pillBox(matchPill(a.side,a.id)); if(!b) return null;
  return {x:b.x+a.fx*b.w, y:b.y+a.fy*b.h};
}
function stageSize(){
  const stage=document.querySelector('.match-stage');
  if(!stage) return null;
  const r=stage.getBoundingClientRect();
  return (r.width>=2&&r.height>=2)?{w:r.width,h:r.height}:null;
}
function tagWireAnchors(w, srcEl, dstEl){
  const pts=wirePoints(w); if(!pts.length) return w;
  const sz=stageSize(); if(sz && w){ w.sw=sz.w; w.sh=sz.h; }
  if(srcEl) w.a0=anchorOf(srcEl, pts[0]);
  if(dstEl) w.a1=anchorOf(dstEl, pts[pts.length-1]);
  return w;
}
/* Hand-drawn lines keep their exact shape. Points are stored relative to the
   match container, so scrolling needs no change; on a resize the whole path is
   scaled by the container's size change instead of being redrawn. */
function refitWire(w){
  const pts=wirePoints(w); if(!pts.length || !w) return;
  const sz=stageSize(); if(!sz) return;
  if(!(w.sw>0&&w.sh>0)){
    if(w.a0) legacyRefitWire(w);
    w.sw=sz.w; w.sh=sz.h; return;
  }
  const kx=sz.w/w.sw, ky=sz.h/w.sh;
  if(Math.abs(kx-1)<0.001 && Math.abs(ky-1)<0.001) return;
  pts.forEach(p=>{ p.x*=kx; p.y*=ky; });
  w.sw=sz.w; w.sh=sz.h;
}
function legacyRefitWire(w){
  const pts=wirePoints(w); if(!pts.length || !w || !w.a0) return;
  const p0=pts[0], p1=pts[pts.length-1];
  const n0=anchorPoint(w.a0); if(!n0) return;
  const n1=w.a1?anchorPoint(w.a1):null;
  if(!n1){
    const dx=n0.x-p0.x, dy=n0.y-p0.y;
    if(Math.abs(dx)<0.3 && Math.abs(dy)<0.3) return;
    pts.forEach(p=>{ p.x+=dx; p.y+=dy; });
    return;
  }
  if(Math.hypot(n0.x-p0.x,n0.y-p0.y)<0.3 && Math.hypot(n1.x-p1.x,n1.y-p1.y)<0.3) return;
  const vx=p1.x-p0.x, vy=p1.y-p0.y, len2=vx*vx+vy*vy;
  if(len2<1){ const dx=n0.x-p0.x, dy=n0.y-p0.y; pts.forEach(p=>{ p.x+=dx; p.y+=dy; }); return; }
  const ux=n1.x-n0.x, uy=n1.y-n0.y;
  // complex ratio s = u / v  → rotation + scale
  const sr=(ux*vx+uy*vy)/len2, si=(uy*vx-ux*vy)/len2;
  const ox=p0.x, oy=p0.y;
  pts.forEach(p=>{
    const rx=p.x-ox, ry=p.y-oy;
    p.x=n0.x+(sr*rx-si*ry);
    p.y=n0.y+(si*rx+sr*ry);
  });
}
/* Cloud copies drop the drawn paths (too big for the profile document). A
   restored correct pair without a path gets a clean straight line. */
function rebuildMissingWires(q, ans){
  if(!ans || !ans.__needWires) return;
  delete ans.__needWires;
  ans.wires=Array.isArray(ans.wires)?ans.wires:[];
  Object.keys(ans.pairs||{}).forEach(lid=>{
    const rid=ans.pairs[lid];
    if(!(q.correct_pairs && q.correct_pairs[lid]===rid)) return;
    if(ans.wires.some(w=>!w.loose && String(w.leftId)===String(lid))) return;
    const L=matchPill('L',lid), R=matchPill('R',rid);
    const a=matchTargetAnchor(L), b=matchTargetAnchor(R);
    if(!a||!b) return;
    const pts=[{x:a.x,y:a.y}];
    spreadSnapAnchors(R, pts, ans.wires, lid);
    const w={leftId:lid,rightId:rid,points:pts,color:currentWireColor()};
    tagWireAnchors(w, L, R);
    ans.wires.push(w);
  });
}
(function watchOptionsLayout(){
  const el=document.getElementById('options');
  if(!el || typeof ResizeObserver!=='function') return;
  let raf=0;
  new ResizeObserver(()=>{ cancelAnimationFrame(raf); raf=requestAnimationFrame(relayoutWires); }).observe(el);
})();

/* Solved-pair tooltip: tapping or left-clicking a solved item on either side
   shows the item it is linked to on the other side. Solved pills are often
   disabled buttons (no click events), so the hit test runs at document level. */
function hideMatchPairTip(){
  const tip=document.getElementById('matchPairTip');
  if(tip){ tip.hidden=true; tip.dataset.for=''; }
}
function matchPairPartners(q, ans, side, id){
  if(!q||!ans||!ans.pairs||!q.correct_pairs) return [];
  const solved=Object.keys(ans.pairs).filter(lid=>ans.pairs[lid]===q.correct_pairs[lid]);
  const textOf=(list,x)=>{ const it=(list||[]).find(i=>String(i.id)===String(x)); return it?it.text:''; };
  if(side==='L'){
    return solved.filter(lid=>String(lid)===String(id)).map(lid=>textOf(q.rightItems,ans.pairs[lid])).filter(Boolean);
  }
  return solved.filter(lid=>String(ans.pairs[lid])===String(id)).map(lid=>textOf(q.leftItems,lid)).filter(Boolean);
}
function showMatchPairTip(pill, partners){
  let tip=document.getElementById('matchPairTip');
  if(!tip){
    tip=document.createElement('div');
    tip.id='matchPairTip'; tip.className='match-pair-tip'; tip.setAttribute('role','tooltip');
    document.body.appendChild(tip);
  }
  const host=pill.closest('.pt1q')||document.documentElement;
  const cs=getComputedStyle(host);
  ['--accent-0','--accent-1','--accent-0-rgb','--text','--border','--mono'].forEach(v=>{
    const val=cs.getPropertyValue(v); if(val) tip.style.setProperty(v,val.trim());
  });
  const side=pill.dataset.side;
  tip.innerHTML='';
  const head=document.createElement('div'); head.className='match-pair-tip-head';
  head.textContent=side==='L'?'Linked meaning':'Linked term'+(partners.length>1?'s':'');
  tip.appendChild(head);
  partners.forEach(t=>{ const row=document.createElement('div'); row.className='match-pair-tip-row'; row.textContent=t; tip.appendChild(row); });
  tip.hidden=false; tip.dataset.for=side+':'+pill.dataset.id;
  const r=pill.getBoundingClientRect();
  tip.style.maxWidth=Math.min(320, window.innerWidth-16)+'px';
  tip.style.left='0px'; tip.style.top='0px';
  const tr=tip.getBoundingClientRect();
  let x=r.left+r.width/2-tr.width/2;
  x=Math.max(8, Math.min(x, window.innerWidth-tr.width-8));
  let y=r.top-tr.height-10, below=false;
  if(y<8){ y=r.bottom+10; below=true; }
  tip.classList.toggle('below', below);
  tip.style.left=Math.round(x)+'px'; tip.style.top=Math.round(y)+'px';
}
function solvedPillAt(x,y){
  const list=document.querySelectorAll('.match-stage .match-item.paired');
  for(let i=0;i<list.length;i++){
    const r=list[i].getBoundingClientRect();
    if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom) return list[i];
  }
  return null;
}
function onMatchPairTap(ev){
  if(ev.button!=null && ev.button!==0) return;
  const tipEl=document.getElementById('matchPairTip');
  if(tipEl && !tipEl.hidden && tipEl.contains(ev.target)) return;
  const pill=quizActive?solvedPillAt(ev.clientX, ev.clientY):null;
  const q=questions[current];
  if(!pill || !q || !isMatching(q)){ hideMatchPairTip(); return; }
  const partners=matchPairPartners(q, answers[current], pill.dataset.side, pill.dataset.id);
  if(!partners.length){ hideMatchPairTip(); return; }
  const key=pill.dataset.side+':'+pill.dataset.id;
  if(tipEl && !tipEl.hidden && tipEl.dataset.for===key){ hideMatchPairTip(); return; }
  showMatchPairTip(pill, partners);
}
/* Tap/click on a disabled button produces no click, so listen for pointerup
   too; a short press without movement counts as a tap. */
(function wireMatchPairTip(){
  let down=null;
  document.addEventListener('pointerdown',ev=>{ down={x:ev.clientX,y:ev.clientY,b:ev.button}; },true);
  document.addEventListener('pointerup',ev=>{
    if(!down) return;
    const moved=Math.hypot(ev.clientX-down.x, ev.clientY-down.y)>8;
    const b=down.b; down=null;
    if(moved || b!==0) return;
    onMatchPairTap({clientX:ev.clientX, clientY:ev.clientY, button:0, target:ev.target});
  },true);
  document.addEventListener('keydown',ev=>{ if(ev.key==='Escape') hideMatchPairTip(); });
  addEventListener('resize',hideMatchPairTip);
  addEventListener('scroll',hideMatchPairTip,true);
})();

/* —— PT1 3161–3221 renderQuestion (+ STEPPED stem / step prompt) —— */
function correctFeedbackText(q){
  if(isStep(q) && q.__stepIdx<q.__stepCount-1){
    return '✓ step '+(q.__stepIdx+1)+' of '+q.__stepCount+' · next step unlocked';
  }
  return '✓ '+(q.explain||'');
}
/* STEPPED series recap: once every step of a stepped question is answered, show the
   whole series as a small vertical flowchart (step prompt → its correct answer → ↓ next step).
   Never shown while a step is still open; one-step questions read as normal questions. */
function stepRecapHTML(i, inReview){
  const q=questions[i];
  if(!isStep(q) || isSingleStep(q) || !boneDone(i)) return '';
  const a=boneStart(i), b=boneEnd(i);
  let h='<div class="step-recap'+(inReview?' in-review':'')+'"'+(inReview?'':' id="stepRecap"')+' role="group" aria-label="Series recap"><div class="step-recap-title">Series recap</div><ol class="step-recap-list">';
  for(let j=a;j<=b;j++){
    const s=questions[j], ans=isTypedStep(s)?saqAccepts(s)[0]:(s.options||[])[s.correct];
    h+='<li class="step-recap-item'+(j===i?' is-current':'')+'"><div class="step-recap-label"><span class="step-recap-num">Step '+(s.__stepIdx+1)+'</span><span class="step-recap-prompt">'+escapeHtml(s.prompt||'')+'</span></div>'
      +'<div class="step-recap-answer"><span class="step-recap-check" aria-hidden="true">✓</span><span class="step-recap-text">'+escapeHtml(ans==null?'':String(ans))+'</span></div></li>';
    if(j<b) h+='<li class="step-recap-arrow" aria-hidden="true"><svg viewBox="0 0 16 22" width="16" height="22"><path d="M8 1v17M3 13l5 6 5-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></li>';
  }
  return h+'</ol></div>';
}
function renderStepRecap(){
  const old=document.getElementById('stepRecap'); if(old) old.remove();
  const html=quizActive && questions[current] ? stepRecapHTML(current) : '';
  if(!html) return;
  const fb=document.getElementById('feedback'); if(!fb) return;
  fb.insertAdjacentHTML('afterend', html);
}
function renderQuestion(){
  hideMatchPairTip();
  const q=questions[current];
  drawState=null;
  clearWireLayer();
  const qText=document.getElementById('qText');
  qText.classList.toggle('is-linking-question',isMatching(q));
  qText.classList.toggle('is-step-question',isStep(q));
  qText.replaceChildren();
  if(isMatching(q)){
    const icon=document.createElement('span');
    icon.className='question-link-icon';
    icon.setAttribute('aria-hidden','true');
    icon.innerHTML=LINK_PENCIL_SVG;
    const copy=document.createElement('span');
    copy.className='question-link-copy';
    copy.textContent=q.q;
    qText.append(icon,copy);
  }else if(isStep(q)){
    if(q.image) qText.insertAdjacentHTML('beforeend', stepFigureHTML(q,false));
    const stem=document.createElement('div'); stem.className='step-stem'; stem.textContent=q.q||'';
    const pr=document.createElement('div'); pr.className='step-prompt';
    const txt=document.createElement('span'); txt.textContent=q.prompt||'';
    // a one-step question reads like a normal question: no "Step 1 / 1" badge
    if(!isSingleStep(q)){ const badge=document.createElement('span'); badge.className='step-badge'; badge.textContent='Step '+(q.__stepIdx+1)+' / '+q.__stepCount; pr.append(badge); }
    pr.append(txt);
    qText.append(stem,pr);
  }else{
    qText.textContent=q.q;
  }
  // per-question badges (bank field q.badges = [{text, tone?, tip?}]), same component as the card badges
  if(Array.isArray(q.badges) && q.badges.length){
    const qb=document.createElement('div'); qb.className='q-badges card-badges';
    qb.innerHTML=q.badges.map(b=>noteBadgeHTML(b)).join('');
    if(qb.innerHTML) qText.prepend(qb);
  }
  document.getElementById('qNum').textContent=current+1;
  if(runMastery>=1 && window.StudyMastery){
    StudyMastery.updateProgressBar(); // PORTAL: Mastery+ layer bar
  } else {
    document.getElementById('progressBar').style.width=Math.round((answers.filter((a,i)=>isAnswered(a,questions[i])).length/questions.length)*100)+'%';
  }
  // Reveal red marks for earlier unanswered questions when the user lands on the final question
  if(questions.length>0 && current===questions.length-1 && !allQuestionsAnswered()){
    unansweredMarkersVisible=true;
  }
  renderNav();
  updateCounters();
  document.getElementById('catTag').textContent=(isMatching(q)?'linking · ':((isStep(q)&&!isSingleStep(q))?'stepped · ':(isSaq(q)?'short answer · ':(isLabel(q)?'labeling · ':(isOrder(q)?'ordering · ':'')))))+((q.cat||q.__form||'').toString().replace(/_/g,' '));
  const opts=document.getElementById('options'); opts.innerHTML='';
  const answered=isAnswered(answers[current], q);
  locked=answered;
  if(isMatching(q)) renderMatching(q, answers[current]||{pairs:{},wires:[],checked:false,correct:false});
  else if(isSaq(q)) renderSaq(q, answers[current]);
  else if(isLabel(q)) renderLabel(q, answers[current]);
  else if(isOrder(q)) renderOrder(q, answers[current]);
  else renderMcq(q, answered);
  const fb=document.getElementById('feedback');
  if(answered){ fb.className='feedback good'; fb.textContent=correctFeedbackText(q); }
  else { fb.className='feedback idle'; fb.textContent=''; }
  renderStepRecap();
  document.getElementById('backBtn').disabled=(prevTarget()<0);
  updateBackSkipGlow();
  updateNextActionButton();
  if(window.StudyMastery) StudyMastery.updateDNSAUI();
}

/* PORTAL rewards: every correct lock-in (each step too) counts as one answer. */
function rewardCorrect(){
  if(window.StudyProfiles && typeof StudyProfiles.bumpQuestionsAnswered==='function') StudyProfiles.bumpQuestionsAnswered(1);
  if(window.StudyAchievements && typeof StudyAchievements.recordCorrect==='function') StudyAchievements.recordCorrect();
}
/* Whole question solved (a stepped question only after its last step). */
function releasePendingSteps(i){
  const q=questions[i]; if(!isStep(q)) return;
  for(let j=i+1;j<=boneEnd(i);j++){
    const s=questions[j];
    if(answers[j]!=null) continue;
    if(s.__pendingVal==null || !isUnlocked(j)) break;
    answers[j]=s.__pendingVal; delete s.__pending; delete s.__pendingVal;
  }
}
function onQuestionSolved(q){
  const id=(q&&q.__id);
  if(isStep(q)) releasePendingSteps(current);
  if(isStep(q) && !boneDone(current)) return;
  markSolved(isStep(q)?q.__bone:q);
  if(window.StudyMastery && id!=null){
    StudyMastery.recordClearId(BANK_KEY, id);
    StudyMastery.updateProgressBar();
    StudyMastery.updateDNSAUI();
    if(runCard && window.StudyAchievements && typeof StudyAchievements.recordFormMastery==='function'){
      if(StudyMastery.getPct(BANK_KEY, runCard.id)>=100) StudyAchievements.recordFormMastery(BANK_KEY+' · '+runCard.id, BANK_KEY);
    }
  }
}

/* PT1 3850–3890 (formula branches removed) */
function selectAnswer(idx){
  if(!quizActive||locked) return;
  const q=questions[current]; if(isMatching(q) || isSaq(q) || isLabel(q) || isOrder(q)) return;
  if(isStep(q) && !isUnlocked(current)) return;
  const fb=document.getElementById('feedback');
  if(idx!==q.correct){
    if(window.StudyAchievements && typeof StudyAchievements.recordWrong==='function') StudyAchievements.recordWrong(); // PORTAL
    const btn=document.querySelectorAll('#options .opt')[idx];
    if(btn){
      btn.classList.remove('soft-wrong'); void btn.offsetWidth;
      btn.classList.add('soft-wrong');
      setTimeout(()=>btn.classList.remove('soft-wrong'), 480);
    }
    fb.className='feedback soft'; fb.textContent='not that one · try again';
    clearTimeout(selectAnswer._t); selectAnswer._t=setTimeout(()=>{ if(!locked){ fb.className='feedback idle'; fb.textContent=''; } },900);
    return;
  }
  locked=true; answers[current]=idx; onQuestionSolved(q);
  document.querySelectorAll('.opt').forEach((o,i)=>{ o.disabled=true; if(i===idx) o.classList.add('correct'); });
  fb.className='feedback good'; fb.textContent=correctFeedbackText(q);
  renderStepRecap();
  document.getElementById('mainPanel').classList.add('correct-pulse');
  setTimeout(()=>document.getElementById('mainPanel').classList.remove('correct-pulse'),650);
  pt1Confetti();
  rewardCorrect();
  afterAnswerProgress();
}

/* PT1 3892–3926 + STEPPED: moves never land on a locked step. */
function stepTo(i){
  current=i;
  locked=isAnswered(answers[current], questions[current]);
  renderQuestion();
  saveRunState();
}
function prevTarget(){
  if(current<=0) return -1;
  return nextUnlockedFrom(current-1,-1);
}
function goNext(){
  if(!quizActive) return;
  const btn=document.getElementById('nextBtn');
  const action=btn && btn.dataset.action;
  if(action==='return-unanswered'){
    unansweredMarkersVisible=true;
    const target=parseInt(btn.dataset.target,10);
    if(!Number.isFinite(target) || target<0 || target>=questions.length) return;
    stepTo(target);
    return;
  }
  if(!locked||!isAnswered(answers[current], questions[current])) return;
  // After last-question unanswered flow: Next jumps to next unanswered (not Q+1)
  if(unansweredMarkersVisible && !allQuestionsAnswered()){
    const nextOpen=nextUnansweredIndex(current);
    if(nextOpen>=0){ stepTo(nextOpen); return; }
  }
  const nxt=current<questions.length-1?nextUnlockedFrom(current+1,1):-1;
  if(nxt>=0){ stepTo(nxt); }
  else {
    if(!allQuestionsAnswered()){
      unansweredMarkersVisible=true;
      updateNextActionButton();
      renderNav();
      return;
    }
    finishQuiz();
  }
}
function goBack(){ const t=prevTarget(); if(t>=0) stepTo(t); }
function jumpToQuestion(i, dir){
  if(!quizActive || !Number.isInteger(i) || i<0 || i>=questions.length) return;
  if(!isUnlocked(i)){
    i=dir?nextUnlockedFrom(i,dir):firstOpenStep(i);
    if(i<0) return;
  }
  stepTo(i);
}
function score(){ let c=0; answers.forEach((a,i)=>{ const q=questions[i]; if(isMatching(q)||isSaq(q)||isLabel(q)||isOrder(q)){ if(a&&a.correct)c++; } else if(a===q.correct)c++; }); return c; }

/* —— PT1 3928–3949 finishQuiz + portal extras (elapsed, mood stamp, Mastery box, review) —— */
function resultItemHTML(q,i){
  if(isMatching(q)){
    const ok=answers[i]&&answers[i].correct;
    return '<div class="rq">'+(i+1)+'. '+escapeHtml(q.q)+'</div><div class="rline '+(ok?'rok':'rbad')+'">'+(ok?'All links locked':'Incomplete')+'</div><div class="rex">'+escapeHtml(q.explain||'')+'</div>';
  }
  if(isOrder(q)){
    const a=answers[i], ok=!!(a&&a.correct);
    return '<div class="rq">'+(i+1)+'. '+escapeHtml(q.q)+'</div><div class="rline '+(ok?'rok':'rbad')+'">'+(ok?'Put in order':'Not finished')+'</div><div class="rline rok">Correct order:</div><ol class="order-review">'+(q.stages||[]).map(s=>'<li>'+escapeHtml(s.text)+'</li>').join('')+'</ol><div class="rex">'+escapeHtml(q.explain||'')+'</div>';
  }
  if(isLabel(q)){
    const a=answers[i], n=(q.labels||[]).length, k=labelDoneCount(q,a);
    return '<div class="rq">'+(i+1)+'. '+escapeHtml(q.q)+'</div><div class="rline '+(k===n?'rok':'rbad')+'">Labels placed: '+k+' / '+n+'</div><div class="label-review">'+labelFigureHTML(q,a,true)+'</div><div class="rex">'+escapeHtml(q.explain||'')+'</div>';
  }
  if(isSaq(q)){
    const a=answers[i], ok=!!(a&&a.correct);
    const sh=isTypedStep(q)?'<div class="rstep">Step '+(q.__stepIdx+1)+' / '+q.__stepCount+' · '+escapeHtml(q.prompt||'')+'</div>':'';
    const ex=(!isTypedStep(q) || q.__stepIdx===q.__stepCount-1)?'<div class="rex">'+escapeHtml(q.explain||'')+'</div>':'';
    return '<div class="rq">'+(i+1)+'. '+escapeHtml(q.q)+'</div>'+sh+(isTypedStep(q)&&q.__stepIdx===0?stepFigureHTML(q,true):'')+'<div class="rline '+(ok?'rok':'rbad')+'">Your answer: '+(ok?escapeHtml(a.text):'—')+'</div><div class="rline rok">Answer: '+escapeHtml(saqAccepts(q)[0]||'')+'</div>'+ex;
  }
  const pick=answers[i], ok=pick===q.correct;
  const opts=q.options||[];
  const head=(isStep(q) && !isSingleStep(q))
    ? '<div class="rq">'+(i+1)+'. '+escapeHtml(q.q)+'</div><div class="rstep">Step '+(q.__stepIdx+1)+' / '+q.__stepCount+' · '+escapeHtml(q.prompt||'')+'</div>'
    : '<div class="rq">'+(i+1)+'. '+escapeHtml(q.q)+'</div>';
  const showEx=!isStep(q) || q.__stepIdx===q.__stepCount-1;
  return head+'<div class="rline '+(ok?'rok':'rbad')+'">Your pick: '+(pick==null?'—':escapeHtml(opts[pick]))+'</div><div class="rline rok">Correct: '+escapeHtml(opts[q.correct]==null?'':opts[q.correct])+'</div>'+(showEx?'<div class="rex">'+escapeHtml(q.explain||'')+'</div>':'')+((isStep(q) && q.__stepIdx===q.__stepCount-1)?stepRecapHTML(i,true):'');
}
function fillResults(list){
  list.innerHTML='';
  questions.forEach((q,i)=>{
    const div=document.createElement('div'); div.className='review-item';
    div.innerHTML=resultItemHTML(q,i);
    list.appendChild(div);
  });
}
function elapsedLabel(){
  const e=runElapsedSec();
  return String(Math.floor(e/60)).padStart(2,'0')+':'+String(e%60).padStart(2,'0');
}
function finishQuiz(){
  hideMatchPairTip();
  clearTimeout(afterAnswerProgress._finishT);
  clearWireLayer();
  const el=elapsedLabel();
  stopElapsedClock();
  document.getElementById('elapsed').textContent=el;
  document.getElementById('quizScreen').style.display='none';
  document.getElementById('reviewScreen').style.display='none';
  document.getElementById('finalScreen').style.display='block';
  const s=score();
  document.getElementById('scoreBig').textContent=s+' / '+questions.length;
  document.getElementById('finalStats').textContent=Math.round(s/questions.length*100)+'% · '+runLabel+' · elapsed '+el;
  document.getElementById('statusText').textContent='results';
  document.getElementById('progressBar').style.width='100%';
  const list=document.getElementById('resultsScroll');
  fillResults(list);
  // PORTAL: remember score + mark the run finished (kept for review)
  if(runCard && window.StudyStore){
    saveRunState({finished:true});
    const st=StudyStore.load(bankId());
    st.cards[runCard.id]=Object.assign({}, st.cards[runCard.id]||{}, {score:s,total:questions.length,done:true,at:Date.now()});
    StudyStore.save(bankId(), st);
  }
  quizActive=false; spawnFireworkBurst(W*.5,H*.3,36);
  if(window.StudyMastery && runCard){
    StudyMastery.endSession();
    StudyMastery.injectResultsMasteryUI(BANK_KEY, runCard.id, document.getElementById('finalScreen'), runCard.label);
  }
  restoreMoodUI();
  try{ list.scrollTop=0; }catch(e){}
}
function showReview(){
  document.getElementById('finalScreen').style.display='none';
  document.getElementById('reviewScreen').style.display='block';
  document.getElementById('reviewHeading').textContent='Answer review · '+runLabel;
  fillResults(document.getElementById('reviewList'));
  document.getElementById('statusText').textContent='review';
}
function cardMoodOf(cardId){
  if(!window.StudyStore||!cardId) return null;
  const m=(StudyStore.load(bankId()).cards[cardId]||{}).mood; return m||null;
}
function restoreMoodUI(){
  const saved=cardMoodOf(runCard&&runCard.id);
  document.querySelectorAll('#moodContainer .mood-btn').forEach(btn=>btn.classList.toggle('selected',!!(saved&&btn.dataset.mood===saved)));
  document.getElementById('moodLabel').textContent=saved?('stamped '+saved+' · saved on its card'):'tap one · stamps this set on its card';
}
document.getElementById('moodContainer').addEventListener('click',e=>{
  const btn=e.target.closest('.mood-btn'); if(!btn||!runCard||!window.StudyStore) return;
  if(typeof unlockAudio==='function') unlockAudio();
  const mood=btn.dataset.mood;
  const st=StudyStore.load(bankId());
  st.cards[runCard.id]=Object.assign({}, st.cards[runCard.id]||{}, {mood, at:Date.now()});
  StudyStore.save(bankId(), st);
  document.querySelectorAll('#moodContainer .mood-btn').forEach(b=>b.classList.toggle('selected',b===btn));
  document.getElementById('moodLabel').textContent='stamped '+mood+' · saved on its card';
});

/* —— leaving a run (PORTAL: save, stop clock, end Mastery session) —— */
function leaveRun(){
  clearTimeout(afterAnswerProgress._finishT);
  if(quizActive && runCard) saveRunState();
  quizActive=false;
  stopElapsedClock();
  clearWireLayer();
  setLinkDrawing(false);
  if(window.StudyMastery) StudyMastery.endSession();
}
function goSets(){
  leaveRun();
  if(window.StudyChat && StudyChat.setActivity) StudyChat.setActivity({ activity:'sets', quiz:null, localRoom:'sets', force:true });
  renderSets();
  updateCounters();
  showView('setsView');
}
function goPortal(){
  leaveRun();
  if(window.StudyChat && StudyChat.setLocalRoom) StudyChat.setLocalRoom('lobby');
  if(window.StudyChat && StudyChat.setActivity) StudyChat.setActivity({ activity:'sets', quiz:null, force:true });
  showView('portalView');
  document.title='Study Portal';
}
/* PORTAL Restart: a new run of what is left in this set; when nothing is
   left, PT1's reset dialog opens and the run starts after confirming. */
let restartAfterReset=null;
function restartCard(){
  if(!runCard) return;
  const card=runCard;
  cardCtx(card);
  leaveRun();
  clearRunState(card.id);
  if(remainingOf(card.pool).length){ startRun(card.pool, card.label, {card}); return; }
  restartAfterReset=card;
  openCardResetConfirm(card.label, card.pool, card);
}
document.getElementById('resetModalConfirm').addEventListener('click',()=>{
  const card=restartAfterReset; restartAfterReset=null;
  if(card) startRun(card.pool, card.label, {card});
});
document.getElementById('resetModalCancel').addEventListener('click',()=>{ restartAfterReset=null; });

document.getElementById('nextBtn').addEventListener('click', goNext);
document.getElementById('backBtn').addEventListener('click', goBack);
document.getElementById('setsBtn').addEventListener('click', ()=>{ if(typeof unlockAudio==='function') unlockAudio(); goSets(); });
document.getElementById('againSetsBtn').addEventListener('click', ()=>{ clearWireLayer(); goSets(); });
document.getElementById('reviewMenuBtn').addEventListener('click', goSets);
document.getElementById('reviewBtn').addEventListener('click', showReview);
document.getElementById('restartBtn').addEventListener('click', restartCard);
document.getElementById('reviewBackBtn').addEventListener('click', ()=>{
  document.getElementById('reviewScreen').style.display='none';
  document.getElementById('finalScreen').style.display='block';
  document.getElementById('statusText').textContent='results';
});
function toggleFullscreen(){ if(!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{}); else document.exitFullscreen(); }
document.getElementById('fsBtn').addEventListener('click', toggleFullscreen);

/* —— keyboard (PT1 3977–3987 + portal Esc) ——
   FIX: Enter only works inside an active run, and not while a button or link
   has focus (that key press already "clicks" it — no double action). */
function runKeysActive(){
  return quizActive && document.getElementById('quizView').classList.contains('active') &&
    document.getElementById('quizScreen').style.display!=='none' &&
    !document.getElementById('cardResetModal').classList.contains('show');
}
window.addEventListener('keydown', e=>{
  if(e.key!=='Escape') return;
  if(document.getElementById('cardResetModal').classList.contains('show')) return; // the dialog closes itself
  if(!document.getElementById('quizView').classList.contains('active')) return;
  if(typeof moodWrap!=='undefined' && moodWrap && moodWrap.classList.contains('open')){ if(typeof openMoodTray==='function') openMoodTray(false); return; }
  goSets();
}, true);
document.addEventListener('keydown', e=>{
  const tag=(e.target&&e.target.tagName||'').toLowerCase();
  const typing=tag==='input'||tag==='textarea'||tag==='select'||(e.target&&e.target.isContentEditable);
  if(e.key==='f'||e.key==='F'){ if(!typing && !e.ctrlKey && !e.metaKey && !e.altKey){ e.preventDefault(); toggleFullscreen(); } }
  if(e.key==='Enter' && !typing && runKeysActive()){
    const t=e.target;
    if(t && t.closest && t.closest('button,a,[role="button"]')) return;
    e.preventDefault();
    goNext();
  }
  if(runKeysActive() && !typing && (e.key==='ArrowLeft'||e.key==='ArrowRight')){
    e.preventDefault();
    const dir=e.key==='ArrowRight'?1:-1;
    jumpToQuestion(current+dir, dir);
    return;
  }
});

/* —— FIX: the fixed connection pill (top right) must not sit on top of the
   run's header buttons (Return / Fullscreen) when the page is scrolled. While
   its normal spot would cover one of those buttons, it slides down just below
   them; once the buttons scroll away it returns to its corner. —— */
function dodgeHeaderButtons(){
  const pill=document.getElementById('netStatus');
  if(!pill) return;
  const clear=()=>{ if(pill.style.top){ pill.style.top=''; } pill.classList.remove('corner-dodged'); };
  if(pill.classList.contains('corner-parked') || pill.hidden){ clear(); return; }
  const view=document.querySelector('.app.view.active');
  const btns=view?[...view.querySelectorAll('.header-right button')]:[];
  if(!btns.length){ clear(); return; }
  // where the pill sits when not dodging
  const cur=pill.getBoundingClientRect();
  const homeTop=parseFloat(getComputedStyle(pill).getPropertyValue('--net-home-top'))||cur.top-(pill.classList.contains('corner-dodged')?(parseFloat(pill.dataset.dodge)||0):0);
  const home={left:cur.left,right:cur.right,top:homeTop,bottom:homeTop+cur.height};
  let bottom=-Infinity;
  btns.forEach(btn=>{ const r=btn.getBoundingClientRect(); if(r.width && r.height && r.bottom>0 && rectsHit(home,r)) bottom=Math.max(bottom,r.bottom); });
  if(bottom===-Infinity){ clear(); return; }
  const top=Math.round(bottom+6)+'px';
  if(pill.style.top!==top){ pill.style.top=top; }
  pill.dataset.dodge=String(Math.round(bottom+6)-homeTop);
  pill.classList.add('corner-dodged');
}
(function wireDodge(){
  let raf=0;
  const go=()=>{ cancelAnimationFrame(raf); raf=requestAnimationFrame(dodgeHeaderButtons); };
  addEventListener('scroll',go,{passive:true,capture:true});
  addEventListener('resize',go);
  const _place=placeSettingsGear;
  placeSettingsGear=function(){ _place(); dodgeHeaderButtons(); };
})();

/* —— gear/corner placement triggers (PT1 3990–3994 + portal buttons appearing late) —— */
window.addEventListener('resize', placeSettingsGear);
if(document.fonts&&document.fonts.ready){
  document.fonts.ready.then(function(){ placeSettingsGear(); });
}
(function watchCornerButtons(){
  let t=0;
  const again=()=>{ clearTimeout(t); t=setTimeout(placeSettingsGear, 60); };
  if(typeof MutationObserver!=='function') return;
  const watched=new WeakSet();
  // The status pill and profile chip are created later by their own scripts.
  const attach=()=>{
    CORNER_BUTTONS.forEach(def=>{
      const el=document.getElementById(def.id);
      if(!el || watched.has(el)) return;
      watched.add(el);
      new MutationObserver(m=>{
        // ignore the class flip placeSettingsGear itself makes
        if(m.every(r=>r.type==='attributes' && ((r.attributeName==='class' && /corner-(parked|dodged)/.test(String(r.oldValue||'')+' '+el.className)) || r.attributeName==='style' || r.attributeName==='data-dodge'))) return;
        again();
      }).observe(el,{attributes:true,attributeOldValue:true,attributeFilter:['hidden','style','class'],childList:true,characterData:true,subtree:true});
      again();
    });
  };
  new MutationObserver(attach).observe(document.body,{childList:true});
  attach();
  [300,1200,3000].forEach(ms=>setTimeout(placeSettingsGear, ms));
})();
placeSettingsGear();

window.StudyQuiz={ loadBank, ingestBank, startRun, resumeRun, startMasteryPlusRun, goSets, goPortal, renderSets, refreshSetsCards,
  get bankKey(){ return BANK_KEY; }, get cards(){ return CARDS; }, get questions(){ return questions; }, get answers(){ return answers; },
  get current(){ return current; }, get active(){ return quizActive; }, jumpToQuestion, selectAnswer, submitSaq, saqMatches, saqHint, orderShuffle, goNext, goBack, idReport:()=>ID_REPORT, get lectureSet(){ return LECTURE_SET; } };
