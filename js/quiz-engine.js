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
/* MULTI (select all that apply): {id, type:'multi', cat, q, options:[...], correct:[0-based indexes], explain}.
   Graded all-or-nothing: solved only when the picked set equals the correct set. */
function isMulti(q){ return !!(q && q.type==='multi' && Array.isArray(q.options) && Array.isArray(q.correct)); }
function multiSetEq(a,b){ if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length) return false; const s=new Set(a); return b.every(x=>s.has(x)); }
/* the engine shows its own "Select all that apply" hint, so a trailing copy in the stem is not repeated */
const MULTI_HINT_RE=/\s*\(?\s*select all that apply\s*[.:!]?\s*\)?\s*$/i;
function multiStem(s){ const t=String(s==null?'':s).replace(MULTI_HINT_RE,'').trim(); return t||String(s==null?'':s); }
function isSaq(q){ return !!(q && !isMatching(q) && !isStepped(q) && !isLabel(q) && !isOrder(q) && !isMulti(q) && (q.type==='saq' || Array.isArray(q.answers) || (q.answer!=null && !Array.isArray(q.options)))); }
/* several blanks in one stem: {type:'saq', q:'… ____ meaning ____.', answers:[[alts for blank 1],[alts for blank 2]]} */
function isSaqMulti(q){ return isSaq(q) && Array.isArray(q.answers) && q.answers.length>1; }
const SAQ_BLANK_RE=/_{3,}/g;
function saqBlankAlts(q,k){ const a=q.answers[k]; return (Array.isArray(a)?a:[a]).filter(x=>x!=null&&String(x).trim()!==''); }
/* saq grading: spelling, punctuation and slashes count; capitals do NOT (a question can opt back in
   with "caseSensitive": true, e.g. a unit symbol). Leading/trailing whitespace is trimmed and runs of
   internal whitespace collapse to one space. */
function saqNorm(s){ return String(s==null?'':s).trim().replace(/\s+/g,' '); }
function saqKey(s, cs){ const t=saqNorm(s); return cs?t:t.toLowerCase(); }
function saqAccepts(q){
  if(q && Array.isArray(q.answers)) return [q.answers.map((a,k)=>saqBlankAlts(q,k)[0]||'').join(', ')];
  const a=q&&q.answer; return (Array.isArray(a)?a:[a]).concat(Array.isArray(q&&q.accept)?q.accept:[]).filter(x=>x!=null&&String(x).trim()!=='');
}
/* implied-word completion: "Coronary" for "Coronary circulation" when the stem itself already names the
   circulation. The added word is shown highlighted. The generic word alone never counts. */
const SAQ_GENERIC=new Set(['circulation','system','systems','muscle','muscles','gland','glands','valve','valves','artery','arteries','vein','veins','bone','bones','node','nodes','cell','cells','tissue','tissues','membrane','membranes','layer','layers','nerve','nerves','vessel','vessels','duct','ducts','cavity','cavities','chamber','chambers','sac','organ','organs','circuit','fluid','disease','disorder','condition','procedure']);
function saqStem(q){ return String((q&&q.q)||'')+' '+String((q&&q.prompt)||''); }
function saqWordBase(w){ w=String(w).toLowerCase(); return w.replace(/(ies)$/,'y').replace(/(es|s)$/,''); }
function saqStemNames(q, word){ const b=saqWordBase(word); return (saqStem(q).toLowerCase().match(/[a-z]+/g)||[]).some(w=>saqWordBase(w)===b); }
function saqCompletions(q){
  const out=[], cs=!!(q&&q.caseSensitive), seen=new Set();
  const add=(part, fill, at, full)=>{ const k=saqKey(part,cs)+'|'+at; if(!saqNorm(part) || seen.has(k)) return; seen.add(k); out.push({part:saqNorm(part), fill, at, full}); };
  const accs=saqAccepts(q).map(saqNorm);
  // explicit: "complete": ["coronary"] — each entry is the start or the end of an accepted answer
  (Array.isArray(q&&q.complete)?q.complete:[]).forEach(p=>{
    const pk=saqKey(p,cs);
    accs.forEach(a=>{ const ak=saqKey(a,cs);
      if(ak.startsWith(pk+' ')) add(p, a.slice(saqNorm(p).length), 'end', a);
      else if(ak.endsWith(' '+pk)) add(p, a.slice(0, a.length-saqNorm(p).length), 'start', a); });
  });
  if(q && q.complete===false) return out;
  // automatic: a trailing or leading generic word that the stem already names
  accs.forEach(a=>{
    const w=a.split(' '); if(w.length<2) return;
    const allGeneric=ws=>ws.every(x=>SAQ_GENERIC.has(x.toLowerCase()));
    const last=w[w.length-1], first=w[0];
    if(SAQ_GENERIC.has(last.toLowerCase()) && saqStemNames(q,last) && !allGeneric(w.slice(0,-1))) add(w.slice(0,-1).join(' '), ' '+last, 'end', a);
    if(SAQ_GENERIC.has(first.toLowerCase()) && saqStemNames(q,first) && !allGeneric(w.slice(1))) add(w.slice(1).join(' '), first+' ', 'start', a);
  });
  return out;
}
/* → {text, fill?:{text, at}} for an accepted answer, else null */
function saqResult(q, typed){
  const cs=!!(q&&q.caseSensitive), t=saqNorm(typed); if(!t) return null;
  const tk=saqKey(t,cs);
  if(saqAccepts(q).some(a=>saqKey(a,cs)===tk)) return {text:t};
  const c=saqCompletions(q).find(c=>saqKey(c.part,cs)===tk);
  if(!c) return null;
  // the added word follows the way the answer was typed: "Coronary" → "Coronary Circulation"
  const titled=t.split(' ').every(x=>/^[A-Z]/.test(x));
  let fill=c.fill; if(titled) fill=fill.replace(/(^|\s)([a-z])/g,(m,s,ch)=>s+ch.toUpperCase());
  return {text:c.at==='end'?t+fill:fill+t, fill:{text:fill, at:c.at}};
}
function saqMatches(q, typed){ return !!saqResult(q, typed); }
/* Hint for a wrong short answer (the answer itself is never shown). Lower case, PT1 style. */
function saqHint(q, typed){
  const t=saqNorm(typed), lc=x=>x.toLowerCase(), cs=!!(q&&q.caseSensitive);
  const acc=saqAccepts(q).map(saqNorm);
  if(cs && acc.some(a=>lc(a)===lc(t))) return 'wrong capitalization · try again';
  const noSlash=acc.filter(a=>a.includes('/')).map(a=>a.replace(/\//g,''));
  if(noSlash.some(a=>saqKey(a,cs)===saqKey(t,cs))) return 'missing slash · try again';
  if(cs && noSlash.some(a=>lc(a)===lc(t))) return 'missing slash and wrong capitalization · try again';
  return 'not that one · try again';
}
function isSingleStep(q){ return isStep(q) && q.__stepCount===1; }
function qType(q){ return isMatching(q)?'matching':(isStepped(q)?'stepped':(isSaq(q)?'saq':(isLabel(q)?'label':(isOrder(q)?'order':(isMulti(q)?'multi':'mcq'))))); }
function isAnswered(val,q){
  if(val==null) return false;
  if(isMatching(q)) return !!(val && val.correct);
  if(isSaq(q)) return !!(val && val.correct);
  if(isLabel(q)) return !!(val && val.correct);
  if(isOrder(q)) return !!(val && val.correct);
  if(isMulti(q)) return !!(val && val.correct);
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
  const multi=Array.isArray(q.correct), cs=multi?new Set(q.correct):null; // MULTI: a set of right indexes
  const paired=(q.options||[]).map((opt,i)=>({opt,ok:multi?cs.has(i):i===q.correct,i}));
  const mixed=doShuffle?shuffle(paired):paired;
  q.options=mixed.map(x=>x.opt);
  q.correct=multi?mixed.map((x,k)=>x.ok?k:-1).filter(k=>k>=0):mixed.findIndex(x=>x.ok);
  q.__perm=mixed.map(x=>x.i);
  return q;
}
function applyPerm(q, perm){
  const n=(q.options||[]).length;
  if(!Array.isArray(perm) || perm.length!==n || perm.some(x=>!(x>=0&&x<n)) || new Set(perm).size!==n) return permuteChoices(q,false);
  const orig=q.options.slice(), origCorrect=q.correct;
  q.options=perm.map(i=>orig[i]);
  q.correct=Array.isArray(origCorrect)?origCorrect.map(c=>perm.indexOf(c)).sort((a,b)=>a-b):perm.indexOf(origCorrect);
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
      if(isTypedStepDef(st)){ e.type='saq'; e.answer=st.answer; e.accept=Array.isArray(st.accept)?st.accept.slice():[]; if(st.caseSensitive) e.caseSensitive=true; if(st.complete!=null) e.complete=st.complete; delete e.options; delete e.correct; delete e.__perm; }
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
       && !(isOrder(q) && a && Array.isArray(a.order))
       && !(isSaqMulti(q) && a && Array.isArray(a.parts) && a.parts.some(x=>x!=null))) return;
    if(isMatching(q)) out[entryKey(q)]={pairs:Object.assign({},a.pairs||{}), correct:!!a.correct, wires:(a.wires||[]).map(w=>Object.assign({},w,{points:(w.points||[]).map(p=>({x:+p.x.toFixed(1),y:+p.y.toFixed(1)}))}))};
    else if(isSaqMulti(q)) out[entryKey(q)]={parts:a.parts.slice(), correct:!!a.correct}; // solved blanks too
    else if(isSaq(q)) out[entryKey(q)]=Object.assign({text:String(a.text||''), correct:true}, a.fill?{fill:a.fill}:{});
    else if(isLabel(q)) out[entryKey(q)]={slots:Object.assign({},a.slots), correct:!!a.correct}; // partial progress too, per label id
    else if(isOrder(q)) out[entryKey(q)]={order:a.order.slice(), locked:Object.keys(a.locked||{}).filter(k=>a.locked[k]), correct:!!a.correct};
    else if(isMulti(q)) out[entryKey(q)]={sel:(a.sel||[]).map(k=>(q.__perm&&q.__perm[k]!=null)?q.__perm[k]:k), correct:true}; // original option indexes
    else out[entryKey(q)]=(q.__perm&&q.__perm[a]!=null)?q.__perm[a]:a;
  });
  return out;
}
let runDeck=null; // un-expanded deck of the active run (for saving)
function saveRunState(extra){
  if(quizActive) updateSolvedProgress();
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
      if(isSaqMulti(q)){
        if(a && typeof a==='object' && Array.isArray(a.parts)){
          const parts=q.answers.map((_,k)=>{ const v=a.parts[k]; return v!=null && saqBlankResult(q,k,v) ? String(v) : null; });
          if(parts.some(x=>x!=null)) answers[i]={parts, correct:parts.every(x=>x!=null)};
        }
        return;
      }
      if(a && typeof a==='object' && a.correct && saqMatches(q, a.text)){
        const r=saqResult(q, a.text);
        answers[i]=Object.assign({text:String(a.text), correct:true}, a.fill&&a.fill.text?{fill:{text:String(a.fill.text), at:a.fill.at==='start'?'start':'end'}}:(r&&r.fill?{fill:r.fill}:{}));
      }
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
    if(isMulti(q)){
      // saved as original option indexes; restored only when they still make the right set
      if(a && typeof a==='object' && a.correct && Array.isArray(a.sel)){
        const perm=Array.isArray(q.__perm)?q.__perm:q.options.map((_,k)=>k);
        const cur=a.sel.map(o=>perm.indexOf(o));
        if(cur.every(k=>k>=0) && multiSetEq(cur,q.correct)) answers[i]={sel:cur.sort((x,y)=>x-y), correct:true};
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
  const multi=pool.filter(isMulti).length;
  return {linking, stepped, saq, label, order, multi, choice:pool.length-linking-stepped-saq-label-order-multi};
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
  const sub=(BANK && BANK.showCardCounts?pool.length+' questions · ':'')+c.linking+' linking · '+c.choice+' choice'+(c.stepped?(' · '+c.stepped+' stepped'):'')+(c.multi?(' · '+c.multi+' select-all'):'')+(c.saq?(' · '+c.saq+' short answer'):'')+(c.label?(' · '+c.label+' labeling'):'')+(c.order?(' · '+c.order+' ordering'):'');
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
/* The run clock pauses only while the page truly isn't visible: hidden tab,
   minimised window, phone screen off (visibilityState), pagehide, or a window
   dragged almost entirely off-screen (checked about once a second). Losing focus
   to another app while the page stays visible does NOT pause it. Away time is
   shifted out of startTime on return, so the timestamp-based clock never jumps. */
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
let pageHiddenByNav=false, windowOffscreen=false, screenAreas=null;
function pageIsAway(){ return document.visibilityState==='hidden' || document.hidden || pageHiddenByNav || windowOffscreen; }
/* fraction of the browser window that lies on a screen (1 = fully on screen) */
function windowOnScreenFraction(){
  const w=window.outerWidth, h=window.outerHeight, x=window.screenX, y=window.screenY;
  if(!(w>0 && h>0) || !isFinite(x) || !isFinite(y)) return 1;
  const areas=(screenAreas && screenAreas.length) ? screenAreas : [{l:screen.availLeft||0, t:screen.availTop||0, w:screen.availWidth||0, h:screen.availHeight||0}];
  let on=0;
  areas.forEach(a=>{ if(!(a.w>0 && a.h>0)) return; const ix=Math.max(0, Math.min(x+w, a.l+a.w)-Math.max(x, a.l)), iy=Math.max(0, Math.min(y+h, a.t+a.h)-Math.max(y, a.t)); on+=ix*iy; });
  if(!areas.some(a=>a.w>0 && a.h>0)) return 1;
  return Math.min(1, on/(w*h));
}
function checkWindowOffscreen(){
  const off=windowOnScreenFraction()<0.1;
  if(off===windowOffscreen) return;
  windowOffscreen=off;
  off?pauseElapsedClock():resumeElapsedClock();
}
/* Window Management API: use every screen's area, but only if permission is already granted (never prompt) */
(function(){
  try{
    if(!('getScreenDetails' in window) || !navigator.permissions || !navigator.permissions.query) return;
    navigator.permissions.query({name:'window-management'}).then(st=>{
      if(st.state!=='granted') return;
      window.getScreenDetails().then(d=>{
        const upd=()=>{ screenAreas=d.screens.map(s=>({l:s.availLeft, t:s.availTop, w:s.availWidth, h:s.availHeight})); };
        upd(); d.addEventListener('screenschange',upd);
      }).catch(()=>{});
    }).catch(()=>{});
  }catch(e){}
})();
setInterval(checkWindowOffscreen,1000);
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
document.addEventListener('visibilitychange',()=>{ (document.visibilityState==='hidden'||document.hidden)?pauseElapsedClock():resumeElapsedClock(); });
window.addEventListener('pagehide',()=>{ pageHiddenByNav=true; pauseElapsedClock(); });
window.addEventListener('pageshow',()=>{ pageHiddenByNav=false; resumeElapsedClock(); });
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
/* Counter on the timer line and the progress bar both show solved / total. */
function updateSolvedProgress(){
  if(!questions.length) return;
  const solved=answers.filter((a,i)=>isAnswered(a,questions[i])).length;
  const num=document.getElementById('qNum'), tot=document.getElementById('qTotal');
  if(num) num.textContent=solved;
  if(tot) tot.textContent=questions.length;
  if(runMastery>=1 && window.StudyMastery){
    StudyMastery.updateProgressBar(); // PORTAL: Mastery+ layer bar
  } else {
    const bar=document.getElementById('progressBar');
    if(bar) bar.style.width=Math.round(solved/questions.length*100)+'%';
  }
}
function afterAnswerProgress(){
  updateSolvedProgress();
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
    b.classList.toggle('multi', isMulti(q));
    b.innerHTML=isMatching(q)
      ? '<span class=\"q-nav-icon\" aria-hidden=\"true\">🔗</span><span class=\"q-nav-number\">'+(i+1)+'</span>'
      : (isSaq(q) ? '<span class=\"q-nav-icon\" aria-hidden=\"true\">✎</span><span class=\"q-nav-number\">'+(i+1)+'</span>'
      : isLabel(q) ? '<span class=\"q-nav-icon\" aria-hidden=\"true\">🏷</span><span class=\"q-nav-number\">'+(i+1)+'</span>'
      : isOrder(q) ? '<span class=\"q-nav-icon\" aria-hidden=\"true\">⇅</span><span class=\"q-nav-number\">'+(i+1)+'</span>'
      : isMulti(q) ? '<span class=\"q-nav-icon\" aria-hidden=\"true\">☑</span><span class=\"q-nav-number\">'+(i+1)+'</span>'
      : '<span class=\"q-nav-number\">'+(i+1)+'</span>');
    b.title=isMatching(q)?'Linking question'+(skipped?' — skipped — unanswered':(done?' — answered':''))
      :((isSaq(q)?'Short answer':(isMulti(q)?'Select all that apply':''))+(skipped?(((isSaq(q)||isMulti(q))?' — ':'')+'Skipped — unanswered'):(done?(((isSaq(q)||isMulti(q))?' — ':'')+'Answered'):'')));
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

/* SAQ: a text box graded on Enter or when the box loses focus (no Check button). The global
   Enter → Next handler ignores keys typed in inputs, so one press never does both; a blur right
   after Enter does not grade the same text twice, and an empty box on blur does nothing. */
/* a blur caused by a press (Back / Next, a navigator pill, another box) is graded at the start of
   that click, so a re-drawn navigator never swallows the click and navigation still happens */
let saqPtrDown=false;
document.addEventListener('pointerdown',()=>{ saqPtrDown=true; },true);
document.addEventListener('pointerup',()=>{ setTimeout(()=>{ saqPtrDown=false; },0); },true);
document.addEventListener('pointercancel',()=>{ saqPtrDown=false; },true);
function saqAutoGrade(input, grade){
  input.addEventListener('keydown',e=>{
    if(e.key!=='Enter') return;
    e.preventDefault(); e.stopPropagation();
    input._saqGraded=input.value;
    grade({kb:true});
  });
  input.addEventListener('focusout',e=>{
    if(input.disabled || !input.isConnected || !quizActive || locked) return;
    if(!saqNorm(input.value) || input._saqGraded===input.value) return;
    input._saqGraded=input.value;
    const o={blur:true, to:e.relatedTarget||null};
    if(!saqPtrDown){ grade(o); return; }
    let ran=false;
    const run=()=>{ if(ran) return; ran=true; window.removeEventListener('click', run, true); grade(o); };
    window.addEventListener('click', run, true);
    document.addEventListener('pointerup', ()=>setTimeout(run,0), {capture:true, once:true});
  });
}
/* picture on a stepped question (shown on every step), with its license caption */
function stepFigureHTML(q, review){
  if(!q || !q.image) return '';
  const cr=q.credit?('<figcaption class="label-credit step-credit">'+(q.creditUrl?'<a href="'+escapeHtml(q.creditUrl)+'" target="_blank" rel="noopener">'+escapeHtml(q.credit)+'</a>':escapeHtml(q.credit))+'</figcaption>'):'';
  return '<figure class="step-figure'+(review?' in-review':'')+'"><img class="step-img" src="'+escapeHtml(q.image)+'" alt="'+escapeHtml(q.alt||'')+'" draggable="false">'+cr+'</figure>';
}
/* a solved answer that the engine completed: the added word is highlighted */
function saqDoneHTML(ans){
  const f=ans.fill, t=String(ans.text||'');
  if(!f||!f.text) return escapeHtml(t);
  const typed=f.at==='start'?t.slice(f.text.length):t.slice(0,t.length-f.text.length);
  const mark='<mark class="saq-fill" title="Completed for you">'+escapeHtml(f.text)+'</mark>';
  return f.at==='start'?mark+escapeHtml(typed):escapeHtml(typed)+mark;
}
function saqShowCompleted(input, ans){
  if(!ans||!ans.fill||!input) return;
  const d=document.createElement('div');
  d.className='saq-input correct saq-done'; d.id='saqInput'; d.setAttribute('role','textbox'); d.setAttribute('aria-readonly','true');
  d.setAttribute('aria-label','Your answer: '+ans.text);
  d.innerHTML=saqDoneHTML(ans);
  input.replaceWith(d);
}
function saqInputEl(id, name, label){
  const input=document.createElement('input');
  input.type='text'; input.className='saq-input'; if(id) input.id=id;
  input.name=name; input.autocomplete='off'; input.setAttribute('autocomplete','off'); input.setAttribute('data-form-type','other'); input.setAttribute('data-lpignore','true'); input.setAttribute('data-1p-ignore',''); input.spellcheck=false; input.setAttribute('autocapitalize','sentences'); input.setAttribute('autocorrect','off');
  input.placeholder='Type your answer'; input.setAttribute('aria-label',label||'Your answer');
  return input;
}
function renderSaq(q, ans){
  if(isSaqMulti(q)) return renderSaqMulti(q, ans);
  const opts=document.getElementById('options');
  const done=!!(ans && ans.correct);
  const wrap=document.createElement('div'); wrap.className='saq-wrap';
  const input=saqInputEl('saqInput','saqAnswer');
  if(done) input.classList.add('correct');
  input.value=done?ans.text:'';
  input.disabled=done;
  const qi=current;
  saqAutoGrade(input, o=>{ if(current===qi) submitSaq(undefined, o); });
  wrap.append(input);
  opts.appendChild(wrap);
  if(done) saqShowCompleted(input, ans);
  // typed step in a stepped question: the labeling highlighter under the box
  // (each wrong letter is marked in the accent colour as you type)
  if(isTypedStep(q) && !done){
    const echo=document.createElement('div'); echo.className='label-echo saq-echo'; echo.id='saqEcho'; echo.setAttribute('aria-live','polite');
    wrap.appendChild(echo);
    const cand={answer:q.answer, accept:q.accept, caseSensitive:q.caseSensitive};
    input.addEventListener('input',()=>{ echo.innerHTML=labelEchoHTML(cand, input.value); });
  }
  if(!done && quizActive) setTimeout(()=>{ if(document.activeElement!==input && document.getElementById('quizView').classList.contains('active')) try{ input.focus({preventScroll:true}); }catch(e){} },0);
}
function saqSoftWrong(input, msg, o){
  if(window.StudyAchievements && typeof StudyAchievements.recordWrong==='function') StudyAchievements.recordWrong();
  input.classList.remove('soft-wrong'); void input.offsetWidth;
  input.classList.add('soft-wrong');
  setTimeout(()=>input.classList.remove('soft-wrong'), 480);
  const fb=document.getElementById('feedback');
  fb.className='feedback soft'; fb.textContent=msg;
  clearTimeout(selectAnswer._t); selectAnswer._t=setTimeout(()=>{ if(!locked){ fb.className='feedback idle'; fb.textContent=''; } },1400);
  if(!(o && o.blur)) input.select(); // a blur grade never pulls the focus back
}
function saqSolvedFx(q, o){
  const fb=document.getElementById('feedback');
  fb.className='feedback good'; fb.textContent=correctFeedbackText(q);
  renderStepRecap(); // a typed last step shows the series recap at once, like a choice step
  document.getElementById('mainPanel').classList.add('correct-pulse');
  setTimeout(()=>document.getElementById('mainPanel').classList.remove('correct-pulse'),650);
  pt1Confetti();
  rewardCorrect(2);
  afterAnswerProgress();
  if(o && o.kb && !allQuestionsAnswered()) startKbAdvance();
}
function submitSaq(k, o){
  o=o||{};
  if(!quizActive||locked) return;
  const q=questions[current]; if(!isSaq(q)) return;
  if(isSaqMulti(q)) return submitSaqBlank(k, o);
  const input=document.getElementById('saqInput'); if(!input) return;
  const typed=input.value;
  if(!saqNorm(typed)){ if(!o.blur) input.focus(); return; }
  const r=saqResult(q, typed);
  if(!r){ saqSoftWrong(input, saqHint(q, typed), o); return; }
  locked=true; answers[current]=Object.assign({text:r.text, correct:true}, r.fill?{fill:r.fill}:{}); onQuestionSolved(q);
  input.disabled=true; input.classList.add('correct'); input.value=r.text;
  if(r.fill) saqShowCompleted(input, answers[current]);
  saqSolvedFx(q, o);
}
/* —— several blanks: one box per blank, in order. Enter or leaving a box grades that box; a right one locks and the
   focus moves to the next open blank; the question is solved when every blank is right. —— */
function saqBlankResult(q, k, typed){
  const cs=!!q.caseSensitive, t=saqNorm(typed); if(!t) return null;
  return saqBlankAlts(q,k).some(a=>saqKey(a,cs)===saqKey(t,cs)) ? t : null;
}
function saqBlankContext(q, k){
  // the words just before the blank name it ("combining form", "meaning")
  const parts=String(q.q||'').split(SAQ_BLANK_RE);
  const before=(parts[k]||'').replace(/[^A-Za-z0-9/' -]+/g,' ').trim().split(/\s+/).filter(Boolean);
  const stop=new Set(['the','a','an','of','is','are','and','its','from','to','in']);
  while(before.length && stop.has(before[before.length-1].toLowerCase())) before.pop();
  const w=before.slice(-2).join(' ');
  return w || ('blank '+(k+1));
}
function saqMultiState(i){
  const q=questions[i]; let a=answers[i];
  if(!(a && Array.isArray(a.parts) && a.parts.length===q.answers.length)){ a={parts:q.answers.map(()=>null), correct:false}; answers[i]=a; }
  return a;
}
function paintSaqBlanks(q, a){
  const qText=document.getElementById('qText'); if(!qText) return;
  let k=0;
  const walk=n=>{ [...n.childNodes].forEach(c=>{
    if(c.nodeType===3 && SAQ_BLANK_RE.test(c.nodeValue)){
      SAQ_BLANK_RE.lastIndex=0;
      const frag=document.createDocumentFragment(); let last=0, m;
      const v=c.nodeValue;
      while((m=SAQ_BLANK_RE.exec(v))){
        frag.append(document.createTextNode(v.slice(last,m.index)));
        const sp=document.createElement('span'); const done=a&&a.parts&&a.parts[k]!=null;
        sp.className='saq-blank'+(done?' filled':''); sp.dataset.k=String(k);
        sp.textContent=done?a.parts[k]:String(k+1);
        frag.append(sp); k++; last=m.index+m[0].length;
      }
      frag.append(document.createTextNode(v.slice(last)));
      c.replaceWith(frag);
    } else if(c.nodeType===1 && !c.classList.contains('saq-blank')) walk(c);
    SAQ_BLANK_RE.lastIndex=0;
  }); };
  walk(qText);
}
function renderSaqMulti(q, ans){
  const opts=document.getElementById('options');
  const a=(ans && Array.isArray(ans.parts))?ans:{parts:q.answers.map(()=>null), correct:false};
  const wrap=document.createElement('div'); wrap.className='saq-wrap saq-multi';
  const list=document.createElement('div'); list.className='saq-blanks';
  q.answers.forEach((_,k)=>{
    const row=document.createElement('label'); row.className='saq-blank-row';
    const num=document.createElement('span'); num.className='saq-blank-num'; num.textContent=String(k+1);
    const ctx=document.createElement('span'); ctx.className='saq-blank-ctx'; ctx.textContent=saqBlankContext(q,k);
    const input=saqInputEl('saqInput'+k,'saqAnswer'+k,'Blank '+(k+1)+' · '+saqBlankContext(q,k));
    input.dataset.k=String(k);
    const done=a.parts[k]!=null;
    if(done){ input.value=a.parts[k]; input.disabled=true; input.classList.add('correct'); }
    const qi=current;
    saqAutoGrade(input, o=>{ if(current===qi) submitSaq(k, o); });
    row.append(num,ctx,input);
    list.appendChild(row);
  });
  wrap.append(list);
  opts.appendChild(wrap);
  paintSaqBlanks(q,a);
  if(!a.correct && quizActive) setTimeout(()=>{ const f=wrap.querySelector('input.saq-input:not(:disabled)'); if(f && document.activeElement!==f && document.getElementById('quizView').classList.contains('active')) try{ f.focus({preventScroll:true}); }catch(e){} },0);
}
function submitSaqBlank(k, o){
  o=o||{};
  const q=questions[current], a=saqMultiState(current);
  const inputs=[...document.querySelectorAll('.saq-multi input.saq-input')];
  const lockPart=(j,text)=>{ a.parts[j]=text; const inp=inputs[j]; if(inp){ inp.value=text; inp.disabled=true; inp.classList.add('correct'); } };
  const check=j=>{
    const inp=inputs[j]; if(!inp || inp.disabled) return 'skip';
    const typed=inp.value; if(!saqNorm(typed)) return 'empty';
    const r=saqBlankResult(q,j,typed);
    if(r){ lockPart(j,r); return 'ok'; }
    // the whole answer typed into one box ("Phleb/o vein"): fill this blank and the next one
    if(j+1<q.answers.length && a.parts[j+1]==null){
      const t=saqNorm(typed);
      for(const x of saqBlankAlts(q,j)) for(const y of saqBlankAlts(q,j+1)){
        for(const sep of [' ',', ',',',' meaning ',' - ',' – ']){ if(saqKey(x+sep+y,q.caseSensitive)===saqKey(t,q.caseSensitive)){ lockPart(j,saqNorm(x)); lockPart(j+1,saqNorm(y)); return 'ok'; } }
      }
    }
    return 'wrong';
  };
  let res=[];
  if(k!=null) res=[[k,check(k)]];
  else inputs.forEach((_,j)=>res.push([j,check(j)]));
  const firstWrong=res.find(r=>r[1]==='wrong');
  paintSaqBlanks(q,a); document.querySelectorAll('#qText .saq-blank').forEach(sp=>{ const j=+sp.dataset.k; if(a.parts[j]!=null){ sp.textContent=a.parts[j]; sp.classList.add('filled'); } });
  if(a.parts.every(x=>x!=null)){
    a.correct=true; locked=true; onQuestionSolved(q);
    saqSolvedFx(q, o);
    return;
  }
  saveRunState();
  if(firstWrong){
    const j=firstWrong[0];
    saqSoftWrong(inputs[j], (q.answers.length>1?'blank '+(j+1)+' · ':'')+saqHint({answer:saqBlankAlts(q,j), caseSensitive:q.caseSensitive}, inputs[j].value), o);
    return;
  }
  if(res.some(r=>r[1]==='ok')){
    const fb=document.getElementById('feedback');
    const left=a.parts.filter(x=>x==null).length;
    fb.className='feedback good'; fb.textContent='✓ blank right · '+left+' to go';
    const from=k!=null?k:0;
    const order=inputs.map((_,j)=>(from+1+j)%inputs.length);
    // a right blank moves on to the next open one, unless the blur already took the focus
    // somewhere (another blank, Back / Next, the navigator)
    const next=order.map(j=>inputs[j]).find(x=>x && !x.disabled);
    if(next && !(o.blur && o.to)) try{ next.focus({preventScroll:true}); }catch(e){}
    return;
  }
  if(o.blur) return;
  const empty=inputs.find(x=>!x.disabled && !saqNorm(x.value)); if(empty) empty.focus();
}
/* —— LABEL (image labeling) questions ——
   q: {id, type:'label', cat, q, image, alt, credit?, creditUrl?, labels:[{id, answer, accept?, x, y, w, h}], explain}
   x / y / w / h are percents of the image, so the slots scale with it.
   Answer state: {slots:{<label id>: <text placed>}, correct:<every slot placed>}.
   A slot locks the moment it is right (drag or typing) and never unlocks. */
let labelTyping=(function(){ try{ return localStorage.getItem('sp_label_mode_v1')==='type'; }catch(e){ return false; } })();
let labelSelectedChip=null;
function labelCands(l){ return [l.answer].concat(Array.isArray(l.accept)?l.accept:[]).filter(x=>x!=null&&String(x).trim()!==''); }
function labelMatches(l, text){ const cs=!!(l&&l.caseSensitive), t=saqKey(text,cs); return !!t && labelCands(l).some(c=>saqKey(c,cs)===t); }
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
  // capitals are not graded (unless the item opts in), so only wrong letters are marked
  const cs=!!(l&&l.caseSensitive), eq=(a,b)=>a!=null&&b!=null&&(cs?a===b:a.toLowerCase()===b.toLowerCase());
  labelCands(l).forEach(c=>{ c=saqNorm(c); let n=0; while(n<c.length && n<t.length && eq(c[n],t[n])) n++; if(n>bestN){ bestN=n; best=c; } });
  let h='';
  for(let k=0;k<t.length;k++){
    const ch=escapeHtml(t[k]===' '?'\u00a0':t[k]);
    h+= eq(best[k],t[k]) ? ch : '<mark class="label-mark">'+ch+'</mark>';
  }
  return h;
}
/* —— label box fitting ——
   A placed label (or a typing box) grows to show its whole text: it widens first, wraps to
   two lines when one line would be too wide, and never shows an ellipsis. Each candidate
   position is scored against the other boxes and against the picture's own ink (arrows,
   leader lines) so a grown box does not cover them; the best one wins. Re-run on resize/zoom. */
const LABEL_INK={};
function labelInk(img, done){
  const src=img && img.currentSrc || (img && img.src) || '';
  if(!src) return null;
  const c=LABEL_INK[src];
  if(c) return c.grid ? c : (c.wait.push(done), null);
  const ent=LABEL_INK[src]={wait:[done], grid:null};
  const build=()=>{
    try{
      const W=160, H=Math.max(1, Math.round(W*(img.naturalHeight||1)/(img.naturalWidth||1)));
      const cv=document.createElement('canvas'); cv.width=W; cv.height=H;
      const cx=cv.getContext('2d', {willReadFrequently:true}); cx.drawImage(img,0,0,W,H);
      const px=cx.getImageData(0,0,W,H).data, g=new Uint8Array(W*H);
      for(let i=0;i<W*H;i++){ const r=px[i*4], gg=px[i*4+1], b=px[i*4+2], al=px[i*4+3]; g[i]= al>40 && (r+gg+b)/3<170 ? 1 : 0; }
      ent.grid={W,H,g};
    }catch(e){ ent.grid={W:1,H:1,g:new Uint8Array(1)}; }
    const w=ent.wait; ent.wait=[]; w.forEach(f=>{ try{ f(); }catch(e){} });
  };
  if(img.complete && img.naturalWidth) setTimeout(build,0); else img.addEventListener('load', build, {once:true});
  return null;
}
function labelInkIn(ink, F, r, skip){
  if(!ink || !ink.grid) return 0;
  const {W,H,g}=ink.grid; let n=0;
  const x0=Math.max(0,Math.floor(r.x/F.w*W)), x1=Math.min(W-1,Math.ceil((r.x+r.w)/F.w*W)-1);
  const y0=Math.max(0,Math.floor(r.y/F.h*H)), y1=Math.min(H-1,Math.ceil((r.y+r.h)/F.h*H)-1);
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
    if(!g[y*W+x]) continue;
    const px=(x+.5)/W*F.w, py=(y+.5)/H*F.h;
    if(skip && px>=skip.x && px<=skip.x+skip.w && py>=skip.y && py<=skip.y+skip.h) continue;
    n++;
  }
  return n*(F.w/W)*(F.h/H);
}
function labelOverlap(a,b){ const w=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x), h=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y); return w>0&&h>0 ? w*h : 0; }
let labelMeasureCv=null;
function labelTextWidth(el, text){
  const cs=getComputedStyle(el);
  labelMeasureCv=labelMeasureCv||document.createElement('canvas');
  const cx=labelMeasureCv.getContext('2d');
  cx.font=cs.fontStyle+' '+cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;
  return {w:cx.measureText(String(text)).width, fs:parseFloat(cs.fontSize)||12};
}
function labelFit(fig, labels){
  if(!fig || !labels || !labels.length) return;
  const FR=fig.getBoundingClientRect(); if(!FR.width || !FR.height) return;
  const F={w:FR.width, h:FR.height};
  const img=fig.querySelector('.label-img');
  const ink=labelInk(img, ()=>labelFit(fig, labels));
  const byId={}; labels.forEach(l=>{ byId[l.id]=l; });
  const orig=l=>({x:l.x/100*F.w, y:l.y/100*F.h, w:l.w/100*F.w, h:l.h/100*F.h});
  const slots=[...fig.querySelectorAll('.label-slot[data-id]')].filter(s=>byId[s.dataset.id]);
  const placed={}, cands={};
  slots.forEach(s=>{ placed[s.dataset.id]=orig(byId[s.dataset.id]); });
  const pad=8, maxW=Math.max(F.w*0.46, 60);
  // 1) candidate boxes for every slot whose text does not fit its own box
  slots.forEach(slot=>{
    const id=slot.dataset.id, l=byId[id], o=orig(l);
    const locked=slot.classList.contains('locked'), typing=slot.classList.contains('typing');
    slot.classList.remove('grown','wrapped');
    slot.style.left=l.x+'%'; slot.style.top=l.y+'%'; slot.style.width=l.w+'%'; slot.style.height=l.h+'%';
    let text='', el=null;
    if(locked){ el=slot.querySelector('.label-slot-text'); text=el ? el.textContent : ''; }
    else if(typing){ el=slot.querySelector('input'); text=el ? el.value : ''; }
    if(!el || !text) return;
    const m=labelTextWidth(el, text), lineH=m.fs*1.12, need=m.w+pad+(locked?6:4);
    if(need<=o.w+0.5 && lineH+3<=o.h+0.5) return;
    const list=[], sx=F.w*0.02, sy=Math.max(2, lineH*0.5);
    const addW=(w,h,wrap)=>{
      w=Math.min(w, F.w); h=Math.min(h, F.h);
      const xs=[o.x, o.x+o.w-w, o.x+o.w/2-w/2];
      for(let k=1;k<=16;k++) xs.push(o.x-k*sx, o.x+o.w-w+k*sx);
      const yc=o.y+o.h/2-h/2, ys=[yc, o.y, o.y+o.h-h];
      for(let k=1;k<=6;k++) ys.push(yc-k*sy, yc+k*sy);
      xs.forEach(x=>ys.forEach(y=>{
        x=Math.max(0,Math.min(F.w-w,x)); y=Math.max(0,Math.min(F.h-h,y));
        const c={x,y,w,h,wrap};
        // the box must still sit on its own spot (where the leader line ends): keep the original centre inside
        const ocx=o.x+o.w/2, ocy=o.y+o.h/2;
        if(ocx<x-0.5 || ocx>x+w+0.5 || ocy<y-lineH*0.9 || ocy>y+h+lineH*0.9) return;
        c.ink=labelInkIn(ink, F, c, o);
        c.move=Math.abs(c.x+c.w/2-(o.x+o.w/2))+1.6*Math.abs(c.y+c.h/2-(o.y+o.h/2));
        c.base=c.ink*2+c.move*0.8+(wrap?20:0)+(w*h-o.w*o.h)*0.003;
        list.push(c);
      }));
    };
    const h1=Math.max(o.h, lineH+3);
    if(need<=maxW || !locked) addW(Math.max(o.w, Math.min(need, typing?F.w*0.7:maxW)), h1, false);
    const words=locked ? text.trim().split(/\s+/) : [];
    if(words.length>1){
      // two lines, broken at the space that gives the narrowest box; never inside a word
      let best=Infinity;
      for(let k=1;k<words.length;k++){ const a=labelTextWidth(el, words.slice(0,k).join(' ')).w, b=labelTextWidth(el, words.slice(k).join(' ')).w; best=Math.min(best, Math.max(a,b)); }
      const w2=Math.max(o.w, best+pad+6), h2=Math.max(o.h, 2*lineH+5);
      addW(w2, h2, true);
    }
    if(!list.length) addW(need, h1, false);
    cands[id]=list;
  });
  // 2) choose: a few passes so each box also avoids the grown boxes chosen after it
  const ids=Object.keys(cands);
  for(let pass=0;pass<3;pass++){
    ids.forEach(id=>{
      let pick=null, ps=Infinity;
      cands[id].forEach(c=>{
        let ov=0;
        slots.forEach(s2=>{ const j=s2.dataset.id; if(j!==id) ov+=labelOverlap(c, placed[j]); });
        const sc=ov*40+c.base;
        if(sc<ps){ ps=sc; pick=c; }
      });
      if(pick) placed[id]=pick;
    });
  }
  slots.forEach(slot=>{
    const id=slot.dataset.id; if(!cands[id]) return;
    const pick=placed[id];
    slot.style.left=(pick.x/F.w*100)+'%'; slot.style.top=(pick.y/F.h*100)+'%';
    slot.style.width=(pick.w/F.w*100)+'%'; slot.style.height=(pick.h/F.h*100)+'%';
    slot.classList.add('grown'); if(pick.wrap) slot.classList.add('wrapped');
  });
}
function labelFitWire(fig, labels){
  if(!fig) return;
  fig.__labels=labels;
  const run=()=>labelFit(fig, fig.__labels);
  run(); requestAnimationFrame(run);
  if(!fig.__fitRO && window.ResizeObserver){
    let lastW=0;
    fig.__fitRO=new ResizeObserver(()=>{ const w=fig.getBoundingClientRect().width; if(Math.abs(w-lastW)>0.5){ lastW=w; run(); } });
    fig.__fitRO.observe(fig);
  }
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(run).catch(()=>{});
}
/* capitals are not graded, so a typed label is shown in its listed form ("left atrium" → "Left Atrium") */
function labelCanon(l, typed){
  const t=saqNorm(typed); if(l && l.caseSensitive) return t;
  const hit=labelCands(l).map(saqNorm).find(c=>c.toLowerCase()===t.toLowerCase());
  return hit || t;
}
/* leader lines: an invisible overlay over each line drawn into the picture (from the blank's own
   edge to its anchor point, in picture percents), lit in the accent colour while that blank is the
   drop target. Works at any zoom because it scales with the picture. */
function labelLeaderStart(l){
  const a=l.anchor, x0=l.x, y0=l.y, x1=l.x+l.w, y1=l.y+l.h;
  if(a.x>x1) return [x1,(y0+y1)/2];
  if(a.x<x0) return [x0,(y0+y1)/2];
  return [(x0+x1)/2, a.y>y1?y1:y0];
}
/* anchor: {x,y} (or a list of them for a blank with several lines); optional from:{x,y} where the
   drawn line leaves the blank, and via:[{x,y}] for its bends. All in percent of the picture. */
function labelAnchors(l){ const a=l && l.anchor; const list=Array.isArray(a)?a:(a?[a]:[]); return list.filter(p=>p && isFinite(p.x) && isFinite(p.y)); }
function labelLeadersSVG(q){
  const ls=(q.labels||[]).filter(l=>labelAnchors(l).length);
  if(!ls.length) return '';
  return '<svg class="label-leaders" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'+ls.map(l=>
    '<g class="label-leader" data-id="'+escapeHtml(l.id)+'">'+labelAnchors(l).map(a=>{
      const st=(a.from && isFinite(a.from.x) && isFinite(a.from.y)) ? [a.from.x,a.from.y] : labelLeaderStart({x:l.x,y:l.y,w:l.w,h:l.h,anchor:a});
      const pts=[st].concat((Array.isArray(a.via)?a.via:[]).filter(v=>v&&isFinite(v.x)&&isFinite(v.y)).map(v=>[v.x,v.y])).concat([[a.x,a.y]]);
      return '<polyline points="'+pts.map(p=>p[0]+','+p[1]).join(' ')+'"/><line class="label-leader-dot" x1="'+a.x+'" y1="'+a.y+'" x2="'+a.x+'" y2="'+a.y+'"/>';
    }).join('')+'</g>').join('')+'</svg>';
}
function labelLight(slot){
  document.querySelectorAll('.label-leader.lit').forEach(g=>{ if(!slot || g.dataset.id!==slot.dataset.id) g.classList.remove('lit'); });
  if(!slot) return;
  const fig=slot.closest('.label-figure'); if(!fig) return;
  fig.querySelectorAll('.label-leader').forEach(g=>{ if(g.dataset.id===slot.dataset.id) g.classList.add('lit'); });
}
function labelFigureHTML(q, a, review){
  const slots=(a&&a.slots)||{};
  let h='<div class="label-figure'+(review?' in-review':'')+'"><img class="label-img" src="'+escapeHtml(q.image||'')+'" alt="'+escapeHtml(q.alt||'')+'" draggable="false">'+(review?'':labelLeadersSVG(q));
  (q.labels||[]).forEach(l=>{
    const done=slots[l.id]!=null;
    const style='left:'+l.x+'%;top:'+l.y+'%;width:'+l.w+'%;height:'+l.h+'%';
    if(review){
      h+='<div class="label-slot locked'+(done?'':' missed')+'" data-id="'+escapeHtml(l.id)+'" style="'+style+'"><span class="label-slot-text">'+escapeHtml(done?slots[l.id]:l.answer)+'</span></div>';
    } else if(done){
      h+='<div class="label-slot locked" data-id="'+escapeHtml(l.id)+'" style="'+style+'"><span class="label-slot-text">'+escapeHtml(slots[l.id])+'</span></div>';
    } else if(labelTyping){
      h+='<div class="label-slot typing" data-id="'+escapeHtml(l.id)+'" style="'+style+'"><input class="label-input" name="quiz-label-answer" type="text" data-form-type="other" data-lpignore="true" data-1p-ignore autocomplete="off" spellcheck="false" autocapitalize="sentences" autocorrect="off" aria-label="Label '+escapeHtml(l.id)+'"><div class="label-echo" aria-live="polite"></div></div>';
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
  labelFitWire(wrap.querySelector('.label-figure'), q.labels);
  const mb=wrap.querySelector('#labelModeBtn');
  if(mb) mb.addEventListener('click',()=>{ labelTyping=!labelTyping; try{ localStorage.setItem('sp_label_mode_v1', labelTyping?'type':'drag'); }catch(e){} renderQuestion(); });
  wrap.querySelectorAll('.label-chip').forEach(chip=>{
    chip.addEventListener('pointerdown',e=>labelPointerDown(e,chip));
    chip.addEventListener('click',()=>{ if(chip.__suppressClick) return; labelSelect(labelSelectedChip===chip?null:chip); });
  });
  const figEl=wrap.querySelector('.label-figure');
  if(figEl) wrap.addEventListener('click',e=>{
    // tap-to-place uses the same enlarged zones as dragging (a zone can reach past the picture's edge)
    if(!labelSelectedChip || (e.target.closest && e.target.closest('.label-chip, button, .label-bank, input, a'))) return;
    const direct=e.target.closest && e.target.closest('.label-slot.open');   // a tap on the box itself (or a click with no pointer position)
    const slot=(direct && figEl.contains(direct)) ? direct : labelZoneTarget(figEl, [{x:e.clientX, y:e.clientY}], null);
    if(slot) labelTryPlace(labelSelectedChip, slot, null);
  });
  if(figEl){
    let hov=null;
    const setHov=s=>{ if(s===hov) return; if(hov) hov.classList.remove('drop-over'); hov=s; if(hov) hov.classList.add('drop-over'); labelLight(hov); };
    wrap.addEventListener('pointermove',e=>{ if(e.pointerType!=='mouse' || !labelSelectedChip || document.querySelector('.label-ghost')) { if(hov && !labelSelectedChip) setHov(null); return; } setHov(labelZoneTarget(figEl,[{x:e.clientX,y:e.clientY}],hov)); });
    wrap.addEventListener('pointerleave',()=>setHov(null));
    wrap.addEventListener('click',()=>{ setTimeout(()=>{ if(!labelSelectedChip) setHov(null); },0); });
  }
  wrap.querySelectorAll('.label-slot.open').forEach(slot=>{
    slot.addEventListener('focus',()=>labelLight(slot)); slot.addEventListener('blur',()=>labelLight(null));
    const go=()=>{ if(labelSelectedChip) labelTryPlace(labelSelectedChip, slot, null); };
    slot.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); e.stopPropagation(); go(); } });
  });
  wrap.querySelectorAll('.label-slot.typing').forEach(slot=>{
    const input=slot.querySelector('input'), echo=slot.querySelector('.label-echo');
    const l=q.labels.find(x=>x.id===slot.dataset.id);
    input.addEventListener('input',()=>{
      labelFit(slot.closest('.label-figure'), q.labels);
      echo.innerHTML=labelEchoHTML(l, input.value);
      slot.classList.toggle('has-echo', !!echo.innerHTML);
      if(labelMatches(l, input.value)) labelLock(l, labelCanon(l, input.value), slot);
    });
    input.addEventListener('keydown',e=>{
      if(e.key!=='Enter') return;
      e.preventDefault(); e.stopPropagation();
      if(!saqNorm(input.value)) return;
      if(!labelMatches(l, input.value)) labelWrong(input, null, saqHint({answer:l.answer, accept:l.accept, caseSensitive:l.caseSensitive}, input.value));
    });
  });
}
function labelSelect(chip){
  document.querySelectorAll('.label-chip.selected').forEach(c=>c.classList.remove('selected'));
  labelSelectedChip=chip||null;
  if(chip) chip.classList.add('selected');
  const fig=document.querySelector('.label-figure'); if(fig) fig.classList.toggle('picking', !!chip);
  if(!chip){ labelLight(null); document.querySelectorAll('#options .label-slot.drop-over').forEach(s=>s.classList.remove('drop-over')); }
}
/* —— drop targets: every open drop field gets an invisible hit zone DROP_RADIUS× its drawn size,
   centred on the field (never under 44×44 screen px for tiny fields), measured in screen px so it
   works at any zoom. Where zones overlap, the nearest field centre wins. While dragging, an entered
   field is locked (hysteresis): it stays the target until the pointer leaves the DROP_EXIT× zone,
   or clearly enters another field's zone. Tune both factors here. */
const DROP_RADIUS=1.3, DROP_EXIT=1.6, DROP_MIN_PX=44;
function labelZone(slot, k){
  k=k||DROP_RADIUS;
  const r=slot.getBoundingClientRect();
  const min=DROP_MIN_PX*k/DROP_RADIUS;
  const w=Math.max(min, r.width*k), h=Math.max(min, r.height*k);
  const cx=r.left+r.width/2, cy=r.top+r.height/2;
  return {cx, cy, w, h, left:cx-w/2, right:cx+w/2, top:cy-h/2, bottom:cy+h/2};
}
function labelInZone(z, p){ return p && p.x>=z.left && p.x<=z.right && p.y>=z.top && p.y<=z.bottom; }
/* normalised distance from a point to a slot centre (1 = on the zone edge) */
function labelZoneDist(z, p){ return Math.hypot((p.x-z.cx)/(z.w/2), (p.y-z.cy)/(z.h/2)); }
function labelZoneTarget(root, points, current){
  const slots=[...(root||document).querySelectorAll('.label-slot.open')];
  const pts=(points||[]).filter(Boolean);
  let best=null, bd=Infinity;
  slots.forEach(s=>{
    const z=labelZone(s);
    const r=s.getBoundingClientRect();
    // a point on the drawn box itself always picks that box; otherwise the nearest centre wins
    pts.forEach(p=>{ if(!labelInZone(z,p)) return; const onBox=p.x>=r.left && p.x<=r.right && p.y>=r.top && p.y<=r.bottom; const d=labelZoneDist(z,p)-(onBox?10:0); if(d<bd){ bd=d; best=s; } });
  });
  if(current && current.isConnected && current.classList.contains('open')){
    const zin=labelZone(current), zex=labelZone(current, DROP_EXIT);
    const insideOwn=pts.some(p=>labelInZone(zin,p));
    const insideExit=pts.some(p=>labelInZone(zex,p));
    if(best && best!==current){
      // clearly entered another slot's zone: outside our own entry zone, or much nearer the other centre
      const zb=labelZone(best);
      const dCur=Math.min(...pts.map(p=>labelZoneDist(zin,p))), dBest=Math.min(...pts.filter(p=>labelInZone(zb,p)).map(p=>labelZoneDist(zb,p)));
      if(!insideOwn || dBest<dCur*0.7) return best;
    }
    if(insideOwn || insideExit) return current;            // still locked
    return best;                                           // left the exit zone
  }
  return best;
}
function labelPointerDown(e, chip){
  if(!quizActive || locked) return;
  if(e.pointerType==='mouse' && e.button!==0) return;
  const sx=e.clientX, sy=e.clientY; let ghost=null, over=null;
  const cr=chip.getBoundingClientRect(); const off={x:cr.left+cr.width/2-sx, y:cr.top+cr.height/2-sy};
  const fig=document.querySelector('#options .label-figure');
  const setOver=s=>{
    if(s===over) return;
    if(over) over.classList.remove('drop-over');
    over=s;
    if(over){ over.classList.add('drop-over'); try{ if(navigator.vibrate) navigator.vibrate(10); }catch(er){} }
    labelLight(over);
    if(ghost) ghost.classList.toggle('snapped', !!over);
  };
  const move=ev=>{
    if(!ghost){
      if(Math.hypot(ev.clientX-sx, ev.clientY-sy)<6) return;
      ghost=chip.cloneNode(true); ghost.classList.add('label-ghost'); ghost.classList.remove('selected');
      document.body.appendChild(ghost); chip.classList.add('dragging'); labelSelect(null);
    }
    ev.preventDefault();
    const ptr={x:ev.clientX, y:ev.clientY}, ctr={x:ev.clientX+off.x, y:ev.clientY+off.y};
    // drag near the top/bottom edge scrolls the page so far-away slots can be reached
    if(ev.clientY<48) window.scrollBy(0,-14); else if(ev.clientY>window.innerHeight-48) window.scrollBy(0,14);
    setOver(labelZoneTarget(fig, [ptr, ctr], over));
    if(over){ const r=over.getBoundingClientRect(); ghost.style.left=(r.left+r.width/2)+'px'; ghost.style.top=(r.top+r.height/2)+'px'; }
    else { ghost.style.left=ctr.x+'px'; ghost.style.top=ctr.y+'px'; }
  };
  const end=ev=>{
    window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',end); window.removeEventListener('pointercancel',end);
    const target=over; if(over) over.classList.remove('drop-over'); labelLight(null);
    if(!ghost) return; // a tap: the click handler selects the chip
    chip.__suppressClick=true; setTimeout(()=>{ chip.__suppressClick=false; },60);
    chip.classList.remove('dragging');
    if(ev.type==='pointerup' && target) labelTryPlace(chip, target, ghost);
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
  labelFit(done.closest('.label-figure'), q.labels);
  const r=done.getBoundingClientRect();
  if(typeof spawnFireworkBurst==='function') spawnFireworkBurst(r.left+r.width/2, r.top+r.height/2, 14);
  const n=q.labels.length, k=labelDoneCount(q,a);
  const pr=document.getElementById('labelProgress'); if(pr) pr.textContent=k+' / '+n+' labels';
  const fb=document.getElementById('feedback');
  if(k>=n){
  a.correct=true; locked=true; onQuestionSolved(q);
  rewardCorrect(2);
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

/* Schematic heart: our own drawing (right heart on the viewer's left, as in textbook diagrams).
   Each part has waypoints the pulse travels through, drawn in the direction blood flows.
   No vessel crosses another and no path cuts diagonally through the heart:
   vena cava → RA → tricuspid → RV → pulmonary valve → pulmonary trunk (between the atria) → lungs →
   pulmonary veins → LA → mitral → LV → aortic valve → aorta → body tissues → vena cava; the coronary
   arteries branch off the aorta and run along the heart wall to the myocardium. */
const FLOW_PARTS={
  body:{pts:[[280,300],[230,300],[170,300],[120,300]], oxyIn:true, oxyOut:false},
  vc:{pts:[[120,300],[30,300],[30,128],[92,128]], oxy:false},
  ra:{pts:[[92,128],[112,128],[112,142]], oxy:false},
  tv:{pts:[[112,142],[112,186]], oxy:false},
  rv:{pts:[[112,186],[112,218],[186,218],[186,190]], oxy:false},
  psv:{pts:[[186,190],[186,176]], oxy:false},
  pa:{pts:[[186,176],[186,46]], oxy:false},
  lungs:{pts:[[186,46],[186,30],[230,30],[280,30]], oxyIn:false, oxyOut:true},
  pvn:{pts:[[280,30],[345,30],[345,128],[308,128]], oxy:true},
  la:{pts:[[308,128],[288,128],[288,142]], oxy:true},
  mv:{pts:[[288,142],[288,186]], oxy:true},
  lv:{pts:[[288,186],[288,218],[302,218]], oxy:true},
  av:{pts:[[302,218],[316,218]], oxy:true},
  aorta:{pts:[[316,218],[340,218],[372,218],[372,300],[280,300]], oxy:true},
  cor:{pts:[[340,218],[340,258],[290,258],[240,258]], oxy:true},
  myo:{pts:[[240,258],[190,258],[140,258]], oxyIn:true, oxyOut:false}
};
/* the whole circulation, always animated; the coronary branch joins it where a question asks about it */
const FLOW_LOOP=['body','vc','ra','tv','rv','psv','pa','lungs','pvn','la','mv','lv','av','aorta'];
const FLOW_BRANCH=['cor','myo'];
function flowPathD(part){ const P=FLOW_PARTS[part]; return 'M'+P.pts.map(p=>p[0]+' '+p[1]).join(' L'); }
function flowParts(q){ return new Set((q.stages||[]).map(s=>s.part).filter(p=>FLOW_PARTS[p])); }
function flowSVG(q){
  const on=flowParts(q||{});
  const hi=p=>on.has(p)?' flow-focus':'';
  const L=(x,y,t,cls,anchor)=>'<text x="'+x+'" y="'+y+'" class="flow-label'+(cls?' '+cls:'')+'"'+(anchor?' text-anchor="'+anchor+'"':'')+'>'+t+'</text>';
  const L2=(x,y,a,b)=>'<text x="'+x+'" y="'+y+'" class="flow-label chamber-label"><tspan x="'+x+'">'+a+'</tspan><tspan x="'+x+'" dy="12">'+b+'</tspan></text>';
  const run=(p,cls)=>'<path data-part="'+p+'" class="flow-part flow-vessel '+cls+hi(p)+'" d="'+flowPathD(p)+'"/>'
    +'<path class="flow-run '+cls+hi(p)+'" data-run="'+p+'" d="'+flowPathD(p)+'"/>';
  const branch=on.has('cor')||on.has('myo');
  return '<svg class="flow-svg" viewBox="0 0 400 330" role="img" aria-label="Schematic heart showing the whole path of blood through the heart, lungs and body">'
   +'<defs><linearGradient id="flowLungGrad" gradientUnits="userSpaceOnUse" x1="183" y1="0" x2="280" y2="0"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#ef4444"/></linearGradient>'
   +'<linearGradient id="flowBodyGrad" gradientUnits="userSpaceOnUse" x1="280" y1="0" x2="120" y2="0"><stop offset="0" stop-color="#ef4444"/><stop offset="1" stop-color="#3b82f6"/></linearGradient></defs>'
   +'<rect data-part="myo" class="flow-part flow-wall'+hi('myo')+'" x="80" y="88" width="240" height="176" rx="24"/>'
   +'<rect data-part="lungs" class="flow-part flow-box'+hi('lungs')+'" x="120" y="8" width="160" height="38" rx="10"/>'+L(150,32,'Lungs')
   +'<rect data-part="body" class="flow-part flow-box'+hi('body')+'" x="120" y="288" width="160" height="36" rx="10"/>'+L(200,318,'Body Tissues')
   +'<rect data-part="ra" class="flow-part flow-chamber'+hi('ra')+'" x="92" y="98" width="78" height="44" rx="10"/>'+L2(145,114,'Right','Atrium')
   +'<rect data-part="rv" class="flow-part flow-chamber'+hi('rv')+'" x="92" y="186" width="104" height="66" rx="12"/>'+L2(149,235,'Right','Ventricle')
   +'<rect data-part="la" class="flow-part flow-chamber'+hi('la')+'" x="230" y="98" width="78" height="44" rx="10"/>'+L2(255,114,'Left','Atrium')
   +'<rect data-part="lv" class="flow-part flow-chamber'+hi('lv')+'" x="204" y="186" width="104" height="66" rx="12"/>'+L2(252,235,'Left','Ventricle')
   +run('vc','deoxy')+run('ra','deoxy')+run('tv','deoxy')+run('rv','deoxy')+run('psv','deoxy')+run('pa','deoxy')
   +run('lungs','mixed')+run('pvn','oxy')+run('la','oxy')+run('mv','oxy')+run('lv','oxy')+run('av','oxy')+run('aorta','oxy')+run('body','mixed-back')
   +(branch?run('cor','oxy thin')+run('myo','oxy thin'):'<path data-part="cor" class="flow-part flow-vessel oxy thin" d="'+flowPathD('cor')+'"/>')
   +'<rect data-part="tv" class="flow-part flow-valve'+hi('tv')+'" x="100" y="161" width="24" height="6" rx="3"/>'
   +'<rect data-part="mv" class="flow-part flow-valve'+hi('mv')+'" x="276" y="161" width="24" height="6" rx="3"/>'
   +'<rect data-part="psv" class="flow-part flow-valve'+hi('psv')+'" x="176" y="180" width="20" height="6" rx="3"/>'
   +'<rect data-part="av" class="flow-part flow-valve'+hi('av')+'" x="305" y="209" width="6" height="18" rx="3"/>'
   +L(128,158,'Tricuspid','valve-label','start')+L(173,178,'Pulmonary','valve-label','end')
   +L(272,158,'Mitral','valve-label','end')+L(272,171,'(Bicuspid)','valve-label','end')+L(319,207,'Aortic','valve-label','start')
   +L(16,214,'Vena Cava','vert')+L(203,94,'Pulmonary Artery','vert')+L(358,80,'Pulmonary Veins','vert')+L(386,258,'Aorta','vert')
   +L(300,281,'Coronary Arteries','small')+L(180,281,'Myocardium','small')
   +'<circle class="flow-dot deoxy" r="6.5" cx="-20" cy="-20"/>'+(branch?'<circle class="flow-dot flow-dot-branch oxy" r="5" cx="-20" cy="-20"/>':'')
   +'</svg>';
}
/* waypoint list for a run of parts, each point tagged with its part + oxygenation */
function flowRouteOf(parts){
  const out=[];
  parts.forEach(part=>{
    const P=FLOW_PARTS[part]; if(!P) return;
    P.pts.forEach((pt,k)=>{
      if(out.length && k===0){ const l=out[out.length-1]; if(l.x===pt[0] && l.y===pt[1]) return; }
      const oxy=('oxy' in P)?P.oxy:(k<P.pts.length-1?P.oxyIn:P.oxyOut);
      out.push({x:pt[0],y:pt[1],part,oxy});
    });
  });
  return out;
}
function flowSegs(route){ const segs=[]; let total=0; for(let k=1;k<route.length;k++){ const a=route[k-1], b=route[k]; const len=Math.hypot(b.x-a.x,b.y-a.y); segs.push({a,b,len,start:total}); total+=len; } return {segs,total}; }
/* the question's own stages, kept for the order cards (the route itself is always the whole loop) */
function flowRoute(q){ return flowRouteOf((q.stages||[]).map(s=>s.part)); }
let flowAnim=null;
function flowStageOfPart(q, part){ const st=(q.stages||[]).find(s=>s.part===part); return st?st.id:null; }
function flowHighlight(box, q, part){
  box.querySelectorAll('.flow-part.flow-on').forEach(e=>e.classList.remove('flow-on'));
  document.querySelectorAll('.order-card.flow-on').forEach(e=>e.classList.remove('flow-on'));
  if(!part) return;
  box.querySelectorAll('.flow-part[data-part="'+part+'"]').forEach(e=>e.classList.add('flow-on'));
  const sid=flowStageOfPart(q, part);
  const card=sid && document.querySelector('.order-card[data-id="'+sid+'"]'); if(card) card.classList.add('flow-on');
}
function flowStatic(box, q){
  // reduced motion: the whole path drawn at once, the question's part emphasised, no moving pulse
  if(flowAnim){ cancelAnimationFrame(flowAnim.raf); flowAnim=null; }
  box.classList.remove('is-playing'); box.classList.add('is-static');
  box.querySelectorAll('.flow-dot').forEach(d=>{ d.setAttribute('cx',-20); d.setAttribute('cy',-20); });
  flowHighlight(box,q,null);
}
function flowPlay(box, q){
  if(flowAnim){ cancelAnimationFrame(flowAnim.raf); flowAnim=null; }
  box.classList.remove('is-static');
  if(REDUCED_MOTION()){ flowStatic(box,q); return; }
  const main=flowSegs(flowRouteOf(FLOW_LOOP));
  const hasBranch=!!box.querySelector('.flow-dot-branch');
  // the branch pulse leaves the aorta at the coronary junction, in step with the main pulse
  const br=hasBranch?flowSegs(flowRouteOf(FLOW_BRANCH)):null;
  const junction=(()=>{ let s=0; const r=flowRouteOf(FLOW_LOOP); for(let k=1;k<r.length;k++){ const a=r[k-1], b=r[k]; if(a.part==='aorta' && a.x===340 && a.y===218) return s; s+=Math.hypot(b.x-a.x,b.y-a.y); } return 0; })();
  const speed=105; // svg units per second
  const period=main.total/speed*1000;
  const dot=box.querySelector('.flow-dot:not(.flow-dot-branch)'), bdot=box.querySelector('.flow-dot-branch');
  const at=(S,d)=>{ const s=S.segs.find(x=>d<=x.start+x.len) || S.segs[S.segs.length-1]; const f=s.len?Math.min(1,Math.max(0,(d-s.start)/s.len)):1; return {x:s.a.x+(s.b.x-s.a.x)*f, y:s.a.y+(s.b.y-s.a.y)*f, s}; };
  let t0=null, lastPart=null;
  box.classList.add('is-playing');
  const frame=ts=>{
    if(!box.isConnected){ flowAnim=null; return; }
    if(t0==null) t0=ts;
    const d=(((ts-t0)/period)%1)*main.total;
    const p=at(main,d);
    dot.setAttribute('cx',p.x.toFixed(1)); dot.setAttribute('cy',p.y.toFixed(1));
    // a segment takes the colour of where it ends: blue until the blood leaves the lungs, then red
    dot.classList.toggle('oxy',p.s.b.oxy); dot.classList.toggle('deoxy',!p.s.b.oxy);
    let part=p.s.b.part;
    if(br){
      const bd=(d-junction+main.total)%main.total;
      if(bd<=br.total){ const b=at(br,bd); bdot.setAttribute('cx',b.x.toFixed(1)); bdot.setAttribute('cy',b.y.toFixed(1)); bdot.style.opacity='1'; if(!flowParts(q).has(part)) part=b.s.b.part; }
      else bdot.style.opacity='0';
    }
    if(part!==lastPart){ lastPart=part; flowHighlight(box,q,part); box.dataset.part=part; const sid=flowStageOfPart(q,part); if(sid) box.dataset.stage=sid; }
    flowAnim={raf:requestAnimationFrame(frame)};
  };
  flowAnim={raf:requestAnimationFrame(frame)};
}
function flowPanelHTML(q){
  return '<div class="flow-panel" id="flowPanel"><div class="flow-head"><span class="flow-title">Blood flow'+(q.title?' · '+escapeHtml(q.title):'')+'</span>'
    +'<span class="flow-legend"><i class="lg deoxy"></i>deoxygenated <i class="lg oxy"></i>oxygenated</span></div>'+flowSVG(q)+'</div>';
}
function mountFlowPanel(q){
  const old=document.getElementById('flowPanel'); if(old) old.remove();
  const wrap=document.querySelector('.order-wrap'); if(!wrap) return;
  wrap.insertAdjacentHTML('beforeend', flowPanelHTML(q));
  flowPlay(document.getElementById('flowPanel'),q);
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
    mountFlowPanel(q);
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
    } else {
      wrong++;
      if(li){ li.classList.remove('soft-wrong'); void li.offsetWidth; li.classList.add('soft-wrong'); setTimeout(()=>li.classList.remove('soft-wrong'),480); }
    }
  });
  const n=ids.length, k=Object.keys(a.locked).length;
  const pr=document.getElementById('orderProgress'); if(pr) pr.textContent=k+' / '+n+' locked';
  if(k>=n){
  a.correct=true; locked=true; onQuestionSolved(q);
  rewardCorrect(2);
  fb.className='feedback good'; fb.textContent=correctFeedbackText(q);
    const act=document.querySelector('.order-actions'); if(act) act.remove();
    document.getElementById('mainPanel').classList.add('correct-pulse');
    setTimeout(()=>document.getElementById('mainPanel').classList.remove('correct-pulse'),650);
    pt1Confetti();
    mountFlowPanel(q);
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

/* MULTI: checkbox-style options (each toggles), a "Select all that apply" hint and a Check
   button. Keys: ↑ ↓ highlight, 1–n toggle (never submit), Space toggles the highlighted one,
   Enter checks. A wrong check shakes and marks the wrong picks and says how many picks are
   right, wrong and missed, without naming the missed ones (retry like a choice question). */
function multiState(i){
  let a=answers[i];
  if(!a || typeof a!=='object' || !Array.isArray(a.sel)){ a={sel:[], correct:false}; answers[i]=a; }
  return a;
}
function renderMulti(q, ans){
  const opts=document.getElementById('options');
  const done=!!(ans && ans.correct);
  const sel=new Set(ans && Array.isArray(ans.sel)?ans.sel:[]);
  const wrongMarks=new Set(ans && Array.isArray(ans.wrong)?ans.wrong:[]);
  const hint=document.createElement('div'); hint.className='multi-hint'; hint.id='multiHint';
  hint.innerHTML='<span class="multi-hint-icon" aria-hidden="true">☑</span><span class="multi-hint-text">Select all that apply</span>';
  opts.appendChild(hint);
  (q.options||[]).forEach((opt,i)=>{
    const btn=document.createElement('button');
    btn.className='opt multi-opt'; btn.type='button'; btn.dataset.key=String.fromCharCode(65+i); btn.dataset.idx=String(i);
    btn.setAttribute('role','checkbox'); btn.setAttribute('aria-checked', sel.has(i)?'true':'false');
    btn.textContent=opt;
    if(sel.has(i)) btn.classList.add('selected');
    if(!done && wrongMarks.has(i) && sel.has(i)) btn.classList.add('multi-wrong');
    if(done){ btn.disabled=true; if(q.correct.includes(i)) btn.classList.add('correct'); else btn.classList.add('multi-not'); }
    btn.onclick=()=>toggleMulti(i);
    opts.appendChild(btn);
  });
}
function toggleMulti(idx, fromKb){
  if(!quizActive||locked) return;
  const q=questions[current]; if(!isMulti(q) || !(idx>=0 && idx<q.options.length)) return;
  const a=multiState(current);
  const btn=document.querySelector('#options .multi-opt[data-idx="'+idx+'"]');
  const isCorrect=q.correct.includes(idx);
  const already=a.sel.includes(idx);

  if(already && isCorrect && btn && btn.disabled) return;

  if(already){
    a.sel.splice(a.sel.indexOf(idx),1);
    if(btn){ btn.classList.remove('selected','multi-wrong'); btn.setAttribute('aria-checked','false'); }
  } else {
    a.sel.push(idx);
    a.sel.sort((x,y)=>x-y);
    if(btn){ btn.classList.add('selected'); btn.setAttribute('aria-checked','true'); }
    if(isCorrect){
      if(btn){ btn.disabled=true; btn.classList.add('correct'); btn.classList.remove('multi-wrong'); }
    } else {
      if(window.StudyAchievements && typeof StudyAchievements.recordWrong==='function') StudyAchievements.recordWrong();
      if(btn){ btn.classList.add('multi-wrong'); btn.classList.remove('soft-wrong'); void btn.offsetWidth; btn.classList.add('soft-wrong'); setTimeout(()=>btn.classList.remove('soft-wrong'),480); }
      const fb=document.getElementById('feedback');
      fb.className='feedback soft'; fb.textContent='not that one · try again';
      clearTimeout(selectAnswer._t); selectAnswer._t=setTimeout(()=>{ if(!locked){ fb.className='feedback idle'; fb.textContent=''; } },1400);
    }
  }

  const lockedCorrects=a.sel.filter(k=>q.correct.includes(k));
  const stillWrong=a.sel.filter(k=>!q.correct.includes(k));
  if(lockedCorrects.length===q.correct.length && !stillWrong.length){
    locked=true; a.correct=true; delete a.wrong; onQuestionSolved(q);
    document.querySelectorAll('#options .multi-opt').forEach(o=>{ const k=+o.dataset.idx; o.disabled=true; o.classList.remove('multi-wrong'); o.classList.add(q.correct.includes(k)?'correct':'multi-not'); });
    const fb=document.getElementById('feedback');
    fb.className='feedback good'; fb.textContent=correctFeedbackText(q);
    document.getElementById('mainPanel').classList.add('correct-pulse');
    setTimeout(()=>document.getElementById('mainPanel').classList.remove('correct-pulse'),650);
    pt1Confetti(); rewardCorrect(); afterAnswerProgress();
    if(fromKb && !allQuestionsAnswered()) startKbAdvance();
  }
}
function multiFeedbackText(right, wrong, missed){
  const parts=[];
  if(right) parts.push(right+' right');
  if(wrong) parts.push(wrong+' wrong');
  if(missed) parts.push(missed+' missed');
  return parts.join(' · ')+' · try again';
}
function submitMulti(){
  if(!quizActive||locked) return;
  const q=questions[current]; if(!isMulti(q)) return;
  const a=multiState(current);
  const fb=document.getElementById('feedback');
  if(!a.sel.length){ fb.className='feedback soft'; fb.textContent='select at least one option'; clearTimeout(selectAnswer._t); selectAnswer._t=setTimeout(()=>{ if(!locked){ fb.className='feedback idle'; fb.textContent=''; } },1400); return; }
  const right=a.sel.filter(k=>q.correct.includes(k)), wrong=a.sel.filter(k=>!q.correct.includes(k)), missed=q.correct.filter(k=>!a.sel.includes(k));
  if(wrong.length || missed.length){
    if(window.StudyAchievements && typeof StudyAchievements.recordWrong==='function') StudyAchievements.recordWrong();
    a.wrong=wrong.slice();
    wrong.forEach(k=>{ const btn=document.querySelector('#options .multi-opt[data-idx="'+k+'"]'); if(btn){ btn.classList.remove('soft-wrong'); void btn.offsetWidth; btn.classList.add('soft-wrong','multi-wrong'); setTimeout(()=>btn.classList.remove('soft-wrong'),480); } });
    if(!wrong.length){ const cb=document.getElementById('multiCheck'); if(cb){ cb.classList.remove('soft-wrong'); void cb.offsetWidth; cb.classList.add('soft-wrong'); setTimeout(()=>cb.classList.remove('soft-wrong'),480); } }
    fb.className='feedback soft'; fb.textContent=multiFeedbackText(right.length, wrong.length, missed.length);
    clearTimeout(selectAnswer._t); selectAnswer._t=setTimeout(()=>{ if(!locked){ fb.className='feedback idle'; fb.textContent=''; } },2600);
    return;
  }
  locked=true; a.correct=true; delete a.wrong; onQuestionSolved(q);
  document.querySelectorAll('#options .multi-opt').forEach(o=>{ const k=+o.dataset.idx; o.disabled=true; o.classList.remove('multi-wrong'); o.classList.add(q.correct.includes(k)?'correct':'multi-not'); });
  const act=document.querySelector('#options .multi-actions'); if(act) act.remove();
  fb.className='feedback good'; fb.textContent=correctFeedbackText(q);
  document.getElementById('mainPanel').classList.add('correct-pulse');
  setTimeout(()=>document.getElementById('mainPanel').classList.remove('correct-pulse'),650);
  pt1Confetti();
  rewardCorrect();
  afterAnswerProgress();
  if(submitMulti._kb && !allQuestionsAnswered()) startKbAdvance();
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
    qText.textContent=isMulti(q)?multiStem(q.q):q.q;
  }
  // per-question badges (bank field q.badges = [{text, tone?, tip?}]), same component as the card badges
  if(Array.isArray(q.badges) && q.badges.length){
    const qb=document.createElement('div'); qb.className='q-badges card-badges';
    qb.innerHTML=q.badges.map(b=>noteBadgeHTML(b)).join('');
    if(qb.innerHTML) qText.prepend(qb);
  }
  updateSolvedProgress();
  // Reveal red marks for earlier unanswered questions when the user lands on the final question
  if(questions.length>0 && current===questions.length-1 && !allQuestionsAnswered()){
    unansweredMarkersVisible=true;
  }
  renderNav();
  updateCounters();
  document.getElementById('catTag').textContent=(isMatching(q)?'linking · ':((isStep(q)&&!isSingleStep(q))?'stepped · ':(isSaq(q)?'short answer · ':(isLabel(q)?'labeling · ':(isOrder(q)?'ordering · ':(isMulti(q)?'select all · ':''))))))+((q.cat||q.__form||'').toString().replace(/_/g,' '));
  const opts=document.getElementById('options'); opts.innerHTML='';
  const answered=isAnswered(answers[current], q);
  locked=answered;
  if(isMatching(q)) renderMatching(q, answers[current]||{pairs:{},wires:[],checked:false,correct:false});
  else if(isSaq(q)) renderSaq(q, answers[current]);
  else if(isLabel(q)) renderLabel(q, answers[current]);
  else if(isOrder(q)) renderOrder(q, answers[current]);
  else if(isMulti(q)) renderMulti(q, answers[current]);
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

function rewardCorrect(xpAmount){
  const xp = Math.max(1, xpAmount | 0);
  if(window.StudyProfiles && typeof StudyProfiles.bumpQuestionsAnswered==='function') StudyProfiles.bumpQuestionsAnswered(1, xp);
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
  const q=questions[current]; if(isMatching(q) || isSaq(q) || isLabel(q) || isOrder(q) || isMulti(q)) return;
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
  if(selectAnswer._kb && !allQuestionsAnswered()) startKbAdvance();
}

/* PT1 3892–3926 + STEPPED: moves never land on a locked step. */
function stepTo(i){
  if(typeof clearKbAdvance==='function') clearKbAdvance();
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
function score(){ let c=0; answers.forEach((a,i)=>{ const q=questions[i]; if(isMatching(q)||isSaq(q)||isLabel(q)||isOrder(q)||isMulti(q)){ if(a&&a.correct)c++; } else if(a===q.correct)c++; }); return c; }

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
  if(isMulti(q)){
    const a=answers[i], ok=!!(a&&a.correct), opts=q.options||[];
    const picks=(a&&Array.isArray(a.sel))?a.sel:[];
    const list=(ks)=>ks.length?ks.map(k=>escapeHtml(opts[k]==null?'':opts[k])).join(' · '):'—';
    return '<div class="rq">'+(i+1)+'. '+escapeHtml(multiStem(q.q))+'</div><div class="rline rmulti-tag">Select all that apply</div><div class="rline '+(ok?'rok':'rbad')+'">Your picks: '+list(ok?picks:[])+'</div><div class="rline rok">Correct: '+list(q.correct)+'</div><div class="rex">'+escapeHtml(q.explain||'')+'</div>';
  }
  if(isSaq(q)){
    const a=answers[i], ok=!!(a&&a.correct);
    const sh=isTypedStep(q)?'<div class="rstep">Step '+(q.__stepIdx+1)+' / '+q.__stepCount+' · '+escapeHtml(q.prompt||'')+'</div>':'';
    const ex=(!isTypedStep(q) || q.__stepIdx===q.__stepCount-1)?'<div class="rex">'+escapeHtml(q.explain||'')+'</div>':'';
    return '<div class="rq">'+(i+1)+'. '+escapeHtml(q.q)+'</div>'+sh+(isTypedStep(q)&&q.__stepIdx===0?stepFigureHTML(q,true):'')+'<div class="rline '+(ok?'rok':'rbad')+'">Your answer: '+(ok?(isSaqMulti(q)?a.parts.map(escapeHtml).join(' · '):saqDoneHTML(a)):'—')+'</div><div class="rline rok">Answer: '+escapeHtml(saqAccepts(q)[0]||'')+'</div>'+ex;
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
    if(isLabel(q)){ const f=div.querySelector('.label-figure'); if(f) labelFitWire(f, q.labels); }
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
document.querySelectorAll('[data-fs]').forEach(b=>b.addEventListener('click', toggleFullscreen));
/* app chrome is unselectable; Ctrl/Cmd+A selects nothing unless focus is in a field or a selectable reading region */
const SELECTABLE_SEL='input,textarea,select,[contenteditable]:not([contenteditable="false"]),.chat-msg-body,.chat-input,.selectable-text,#studyView .chapter-body .md:not(.simg-chapter),#studyView .study-note,#studyView .simg-caption,#studyView .simg-credit,.pt1q .explanation,.pt1q .feedback.good,.pt1q .feedback.bad';
document.addEventListener('keydown', e=>{
  if(!(e.ctrlKey||e.metaKey) || e.altKey || (e.key!=='a'&&e.key!=='A')) return;
  const t=document.activeElement;
  if(t && t!==document.body && t.closest && t.closest(SELECTABLE_SEL)) return;
  try{ const a=getSelection().anchorNode, el=a&&(a.nodeType===1?a:a.parentElement); if(el && el.closest && el.closest(SELECTABLE_SEL) && !getSelection().isCollapsed) return; }catch(er){}
  e.preventDefault();
  try{ const sel=getSelection(); if(sel) sel.removeAllRanges(); }catch(er){}
}, true);

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
/* after a keyboard correct answer: the formula-practice depleting bar, then auto-advance (skipped when the form is complete) */
let kbAdv=null;
function clearKbAdvance(){ if(!kbAdv) return; const k=kbAdv; kbAdv=null; cancelAnimationFrame(k.raf); clearTimeout(k.timer); if(k.wrap.isConnected) k.wrap.remove(); }
function startKbAdvance(){
  clearKbAdvance();
  const host=document.getElementById('feedback'); if(!host) return;
  const MS=3200; // formula practice's ADVANCE_MS
  const w=document.createElement('div'); w.className='formula-advance-wrap kb-advance';
  w.innerHTML='<div class="formula-advance-track" aria-hidden="true"><div class="formula-advance-fill"></div></div>';
  host.insertAdjacentElement('afterend', w);
  const fill=w.querySelector('.formula-advance-fill'), t0=performance.now();
  const tick=now=>{ if(!kbAdv) return; const t=Math.min(1,(now-t0)/MS); fill.style.transform='scaleX('+(1-t)+')'; if(t<1) kbAdv.raf=requestAnimationFrame(tick); };
  kbAdv={wrap:w, raf:requestAnimationFrame(tick), timer:setTimeout(()=>{ if(kbAdv){ clearKbAdvance(); if(quizActive) goNext(); } }, MS)};
}
function kbOptions(){ const o=document.getElementById('options'); return o ? [...o.querySelectorAll('.opt')].filter(b=>!b.disabled && b.offsetParent!==null) : []; }
function kbHighlight(btn){ document.querySelectorAll('#options .opt.kb-hl').forEach(b=>b.classList.remove('kb-hl')); if(btn){ btn.classList.add('kb-hl'); try{ btn.scrollIntoView({block:'nearest'}); }catch(e){} } }
document.addEventListener('keydown', e=>{
  const tag=(e.target&&e.target.tagName||'').toLowerCase();
  const typing=tag==='input'||tag==='textarea'||tag==='select'||(e.target&&e.target.isContentEditable);
  if(e.key==='f'||e.key==='F'){ if(!typing && !e.ctrlKey && !e.metaKey && !e.altKey){ e.preventDefault(); toggleFullscreen(); } }
  /* keyboard answering for choice questions / steps: ↑ ↓ or 1–n highlight (same look as hover), same number again or Enter chooses */
  /* MULTI: 1–n (and Space on the highlighted option) toggle, Enter checks; ↑ ↓ fall through to the shared highlight */
  if(!typing && runKeysActive() && !e.ctrlKey && !e.metaKey && !e.altKey && !locked && isMulti(questions[current])){
    const opts=kbOptions();
    if(e.key==='Enter'){ e.preventDefault(); kbHighlight(null); submitMulti._kb=true; try{ submitMulti(); } finally { submitMulti._kb=false; } return; }
    if(/^[1-9]$/.test(e.key)){ const k=+e.key-1; if(k>=opts.length) return; e.preventDefault(); kbHighlight(opts[k]); toggleMulti(+opts[k].dataset.idx, true); return; }
    if(e.key===' ' || e.code==='Space'){
      const onBtn=e.target && e.target.closest && e.target.closest('button');
      const hl=opts.find(b=>b.classList.contains('kb-hl'));
      if(hl && !onBtn){ e.preventDefault(); toggleMulti(+hl.dataset.idx, true); return; }
    }
  }
  if(!typing && runKeysActive() && !e.ctrlKey && !e.metaKey && !e.altKey){
    const opts=kbOptions();
    if(opts.length && (e.key==='ArrowUp'||e.key==='ArrowDown')){
      e.preventDefault();
      const i=opts.findIndex(b=>b.classList.contains('kb-hl'));
      const n=i<0 ? (e.key==='ArrowDown'?0:opts.length-1) : (i+(e.key==='ArrowDown'?1:-1)+opts.length)%opts.length;
      kbHighlight(opts[n]); return;
    }
    if(e.key==='Enter' || e.key==='ArrowRight'){ if(kbAdv){ e.preventDefault(); clearKbAdvance(); goNext(); return; } }
    if(e.key==='Enter'){
      const hl=opts.find(b=>b.classList.contains('kb-hl'));
      if(hl){ e.preventDefault(); kbHighlight(null); selectAnswer._kb=true; try{ hl.click(); } finally { selectAnswer._kb=false; } return; }
    }
    if(/^[1-9]$/.test(e.key)){
      const k=+e.key-1; if(k>=opts.length) return;
      e.preventDefault();
      if(opts[k].classList.contains('kb-hl')){ kbHighlight(null); selectAnswer._kb=true; try{ opts[k].click(); } finally { selectAnswer._kb=false; } }
      else kbHighlight(opts[k]);
      return;
    }
  }
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

window.StudyQuiz={ isAnswered, leaveRun, labelFit, labelFitWire, labelZoneTarget, DROP_RADIUS, DROP_EXIT, loadBank, ingestBank, startRun, resumeRun, startMasteryPlusRun, goSets, goPortal, renderSets, refreshSetsCards,
  get bankKey(){ return BANK_KEY; }, get cards(){ return CARDS; }, get questions(){ return questions; }, get answers(){ return answers; },
  get current(){ return current; }, get active(){ return quizActive; }, jumpToQuestion, selectAnswer, submitSaq, toggleMulti, submitMulti, isMulti, saqMatches, saqHint, orderShuffle, goNext, goBack, idReport:()=>ID_REPORT, get lectureSet(){ return LECTURE_SET; } };
