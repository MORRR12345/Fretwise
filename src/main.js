import {NOTES,midiAt,formatNote,formatMidi,writtenOctaveOf,nearestMidi,chordSymbol,chordName,chordLabel} from './music-theory.js';
import {makeQuestion,questionCopy,explanation,chordAuditionMidis,isChordTone} from './exercises.js';
import {drawFretboard} from './fretboard.js';
import {loadState,saveState} from './storage.js';
import {playNote,playChord,playArpeggioThenChord,stopAll,setSoundEnabled} from './audio.js';

const $=id=>document.getElementById(id);
const state=loadState();
const MODES={
  identify:{label:'位置认音',idle:'听一听，再开始认音'},
  locate:{label:'指板找音',idle:'听清高低八度，再开始找音'},
  analyze:{label:'和弦分析',idle:'听一听和弦色彩，再开始分析'},
  findchord:{label:'和弦寻找',idle:'先熟悉指板，再开始找和弦'}
};
let mode='identify';
let phase='idle';
let question=null,questionNumber=0,settled=false,hadMistake=false;
let sessionAttempted=0,sessionCorrect=0;
let selection=new Map();
let wrongOptions=new Set();
let preview=null,wrongMark=null,wrongTimer=0;
let feedbackState={message:'',type:''};

const fmt=formatNote;
const fmtMidi=formatMidi;
// 大字标题里的唱名八度点用独立元素绘制，保证清晰
function fmtMidiHTML(midi){
  const degree=formatNote(NOTES[((midi%12)+12)%12]);
  const shift=writtenOctaveOf(midi)-4;
  const side=shift>0?'above':shift<0?'below':'none';
  const dots=Math.min(Math.abs(shift),2);
  return `<span class="solfege-pitch ${side} dots-${dots}">${degree}</span>`;
}
const fretLabel=fret=>fret===0?'空弦':`${fret} 品`;
const positionText=position=>`${6-position.string} 弦 ${fretLabel(position.fret)}`;
const chordKey=(root,chord)=>`${root}:${chord.id}`;
const sameChord=(option,item)=>option.root===item.root&&option.chord.id===item.chord.id;

function updateProgress(){
  $('session-summary').textContent=`本轮 ${sessionCorrect} / ${sessionAttempted} 正确`;
  $('total-correct').textContent=String(state.correct);
  $('progress-detail').textContent=state.attempted?`累计完成 ${state.attempted} 题 · 正确率 ${Math.round(state.correct/state.attempted*100)}%`:'每一次练习，都算数。';
  saveState(state);
}

function finish(correct){
  if(settled) return false;
  settled=true;
  wrongMark=null;
  clearTimeout(wrongTimer);
  sessionAttempted++;state.attempted++;
  if(correct&&!hadMistake){sessionCorrect++;state.correct++;}
  updateProgress();
  updateNextLock();
  $('reveal-button').hidden=true;
  return true;
}

function feedback(message,type=''){
  feedbackState={message,type};
  const node=$('feedback');
  node.textContent=message;
  node.className=`feedback ${type}`;
}

function clearFeedback(){feedback('');}

function updateNextLock(){
  const locked=phase==='question'&&(mode==='analyze'||mode==='findchord')&&!settled;
  const button=$('next-button');
  button.disabled=locked;
  button.title=locked?'完成本题后再进入下一题':'';
}

function updateSoundToggle(){
  const button=$('sound-toggle');
  button.setAttribute('aria-pressed',String(state.sound));
  button.classList.toggle('is-off',!state.sound);
  button.title=state.sound?'关闭声音':'开启声音';
  $('sound-label').textContent=state.sound?'声音 开':'声音 关';
}

function buildMarks(){
  const marks=[];
  if(wrongMark) marks.push(wrongMark);
  if(phase==='idle'){
    if(preview){
      marks.push({...preview,kind:'note',label:fmtMidi(midiAt(preview.string,preview.fret))});
    }
    return marks;
  }
  if(!question) return marks;
  if(mode==='identify'){
    const hidden=!settled;
    marks.push({
      string:question.position.string,
      fret:question.position.fret,
      kind:hidden?'hidden':'target',
      label:hidden?'?':fmtMidi(question.targetMidi)
    });
  }else if(mode==='locate'&&settled){
    for(const answer of question.answers){
      marks.push({...answer,kind:'target',label:fmtMidi(question.targetMidi)});
    }
  }else if(mode==='analyze'){
    for(const position of question.voicing){
      marks.push({...position,kind:settled&&position.note===question.root?'root':'note',label:fmtMidi(position.midi)});
    }
  }else if(mode==='findchord'){
    if(settled){
      for(const position of question.positions){
        marks.push({...position,kind:'note',label:fmtMidi(position.midi)});
      }
    }
    for(const item of selection.values()){
      marks.push({...item,kind:'selected',label:fmtMidi(item.midi)});
    }
  }
  return marks;
}

function redraw(){
  const active=document.activeElement;
  const focus=active?.classList?.contains('fret-cell')
    ?{string:active.dataset.string,fret:active.dataset.fret}
    :null;
  drawFretboard($('fretboard'),{
    maxFret:state.maxFret,
    showAllNotes:phase==='idle',
    marks:buildMarks(),
    onSelect:handleCell,
    actionLabel:phase==='idle'?'试听':mode==='locate'?'作答':mode==='findchord'?'选择和弦音':'试听'
  });
  if(focus){
    $('fretboard')
      .querySelector(`.fret-cell[data-string="${focus.string}"][data-fret="${focus.fret}"]`)
      ?.focus({preventScroll:true});
  }
}

function flashWrong(string,fret){
  wrongMark={string,fret,kind:'wrong',label:'✕'};
  redraw();
  clearTimeout(wrongTimer);
  wrongTimer=setTimeout(()=>{
    wrongMark=null;
    if(phase==='question') redraw();
  },620);
}

function renderIdle(){
  phase='idle';question=null;questionNumber=0;settled=false;hadMistake=false;
  selection.clear();wrongOptions.clear();preview=null;wrongMark=null;
  clearTimeout(wrongTimer);
  stopAll();
  clearFeedback();
  $('mode-label').textContent=MODES[mode].label;
  $('question-counter').textContent='准备中';
  $('question-prompt').textContent='先听一听，再开始练习';
  $('question-title').textContent='点击指板，认识每个音';
  $('question-hint').textContent=MODES[mode].idle;
  $('answer-options').hidden=true;
  $('answer-options').replaceChildren();
  $('practice-tools').hidden=true;
  $('practice-tools').replaceChildren();
  $('replay-button').hidden=true;
  $('reveal-button').hidden=true;
  const next=$('next-button');
  next.disabled=false;next.title='';
  next.innerHTML='开始练习 <span aria-hidden="true">→</span>';
  $('board-caption').textContent='自然音 1–7 可见 · 点击试听';
  redraw();
}

function renderNoteOptions(){
  const box=$('answer-options');
  box.hidden=false;box.className='answer-options';box.replaceChildren();
  for(const value of question.options){
    const button=document.createElement('button');
    button.type='button';button.className='option-button';button.textContent=fmt(value);button.dataset.value=value;
    if(wrongOptions.has(value)) button.disabled=true;
    if(settled&&value===question.target){button.classList.add('selected');button.disabled=true;}
    button.addEventListener('click',()=>chooseNote(value,button));
    box.append(button);
  }
}

function renderChordOptions(){
  const box=$('answer-options');
  box.hidden=false;box.className='answer-options chord-options';box.replaceChildren();
  for(const option of question.options){
    const key=chordKey(option.root,option.chord);
    const button=document.createElement('button');
    button.type='button';button.className='option-button';button.dataset.key=key;
    const symbol=document.createElement('span');
    symbol.className='option-symbol';symbol.textContent=chordSymbol(option.root,option.chord);
    const name=document.createElement('span');
    name.className='option-name';name.textContent=` ${chordName(option.root,option.chord)}`;
    button.append(symbol,name);
    if(wrongOptions.has(key)) button.disabled=true;
    if(settled&&sameChord(option,question)){button.classList.add('selected');button.disabled=true;}
    button.addEventListener('click',()=>chooseChord(option,button));
    box.append(button);
  }
}

function renderFindTools(){
  const tools=$('practice-tools');
  tools.hidden=false;tools.className='practice-tools';tools.replaceChildren();
  const composition=document.createElement('div');
  composition.className='chord-composition';
  const label=document.createElement('span');
  label.className='tool-label';label.textContent='组成音';
  const pills=document.createElement('div');
  pills.className='note-pills';
  for(const note of question.notes){
    const pill=document.createElement('span');
    pill.className='note-pill';pill.textContent=fmt(note);pills.append(pill);
  }
  composition.append(label,pills);
  const note=document.createElement('p');
  note.className='tool-note';
  note.textContent=`每根弦选一个和弦音 · 可用弦：${question.availableStrings.map(s=>`${6-s}`).join('、')}`;
  tools.append(composition,note);
}

function renderQuestion(){
  const copy=questionCopy(question);
  $('mode-label').textContent=MODES[mode].label;
  $('question-counter').textContent=`第 ${String(questionNumber).padStart(2,'0')} 题`;
  $('question-prompt').textContent=copy.prompt;
  if(mode==='locate') $('question-title').innerHTML=fmtMidiHTML(question.targetMidi);
  else $('question-title').textContent=copy.title;
  $('question-hint').textContent=copy.hint;
  $('replay-button').hidden=false;
  $('reveal-button').hidden=settled;
  $('answer-options').hidden=true;
  $('answer-options').replaceChildren();
  $('answer-options').className='answer-options';
  $('practice-tools').hidden=true;
  $('practice-tools').replaceChildren();
  if(mode==='identify'){
    renderNoteOptions();
    $('board-caption').textContent='蓝色标记为题目位置';
  }else if(mode==='analyze'){
    renderChordOptions();
    $('board-caption').textContent='蓝色为和弦音 · 先听再选';
  }else if(mode==='locate'){
    $('board-caption').textContent='点击指板作答 · 注意八度';
  }else{
    renderFindTools();
    $('board-caption').textContent='在指板上选择和弦音';
  }
  const next=$('next-button');
  next.innerHTML='下一题 <span aria-hidden="true">→</span>';
  updateNextLock();
  if(settled){
    $('answer-options').querySelectorAll('button').forEach(button=>button.disabled=true);
  }
  redraw();
  if(feedbackState.message) feedback(feedbackState.message,feedbackState.type);
}

function playQuestionAudio(){
  if(phase!=='question'||!question) return;
  if(mode==='identify'||mode==='locate'){
    playNote(question.targetMidi,{gain:.55});
  }else if(mode==='analyze'){
    playArpeggioThenChord(question.voicing.map(position=>position.midi));
  }else{
    playArpeggioThenChord(chordAuditionMidis(question.root,question.chord));
  }
}

function startQuestion(){
  phase='question';questionNumber++;settled=false;hadMistake=false;
  selection.clear();wrongOptions.clear();preview=null;wrongMark=null;
  clearTimeout(wrongTimer);
  stopAll();
  clearFeedback();
  try{
    question=makeQuestion(mode,state);
  }catch(error){
    console.error(error);
    renderIdle();
    feedback('出题失败，请重试。','error');
    return;
  }
  renderQuestion();
  playQuestionAudio();
}

function nextQuestion(){
  startQuestion();
}

function handleCell({string,fret,midi,note}){
  playNote(midi,{gain:.45});
  if(phase==='idle'){
    preview={string,fret};
    feedback(`♪ ${fmtMidi(midi)} · ${positionText({string,fret})}`);
    redraw();
    return;
  }
  if(phase!=='question') return;
  if(settled){
    feedback(`${fmtMidi(midi)} · ${positionText({string,fret})}（试听）`);
    return;
  }
  if(mode==='locate'){
    handleLocate(string,fret,midi,note);
  }else if(mode==='findchord'){
    handleFindChord(string,fret,midi);
  }
}

function handleLocate(string,fret,midi,note){
  if(midi===question.targetMidi){
    finish(true);
    feedback(`答对了！${fmtMidi(midi)} 在 ${positionText({string,fret})}。${explanation(question)}`,'success');
    redraw();
    return;
  }
  hadMistake=true;
  let message=`${fmtMidi(midi)} 不是 ${fmtMidi(question.targetMidi)}。`;
  if(note===question.target){
    const difference=writtenOctaveOf(midi)-writtenOctaveOf(question.targetMidi);
    message=`这是 ${fmtMidi(midi)}，比目标${difference>0?'高':'低'}了 ${Math.abs(difference)} 个八度；题目要的是 ${fmtMidi(question.targetMidi)}。`;
  }
  feedback(message,'error');
  flashWrong(string,fret);
}

function chooseNote(value,button){
  if(phase!=='question'||settled) return;
  playNote(nearestMidi(value,question.targetMidi),{gain:.45});
  if(value===question.target){
    finish(true);
    button.classList.add('selected');
    $('answer-options').querySelectorAll('button').forEach(item=>{item.disabled=true;});
    feedback(`答对了！${explanation(question)}`,'success');
    redraw();
  }else{
    hadMistake=true;
    wrongOptions.add(value);
    button.disabled=true;
    feedback(`${fmt(value)} 还不对，再听听题目和选项的音高。`,'error');
  }
}

function chooseChord(option,button){
  if(phase!=='question'||settled) return;
  playChord(chordAuditionMidis(option.root,option.chord),{gain:.22});
  if(sameChord(option,question)){
    finish(true);
    button.classList.add('selected');
    $('answer-options').querySelectorAll('button').forEach(item=>{item.disabled=true;});
    feedback(`答对了！${explanation(question)}`,'success');
    redraw();
    playChord(question.voicing.map(position=>position.midi),{at:.35,gain:.22});
  }else{
    hadMistake=true;
    wrongOptions.add(chordKey(option.root,option.chord));
    button.disabled=true;
    feedback(`${chordLabel(option.root,option.chord)} 不对，再听听。`,'error');
  }
}

function selectedStrings(){
  return new Set([...selection.values()].map(item=>item.string));
}

function updateFindStatus(){
  if(settled) return;
  const picked=selectedStrings().size;
  feedback(`已选 ${picked} / ${question.availableStrings.length} 根弦。`,'');
}

function checkFindComplete(){
  if(settled) return;
  const complete=question.availableStrings.every(string=>selectedStrings().has(string));
  if(!complete) return;
  const counted=!hadMistake;
  finish(true);
  playChord([...selection.values()].map(item=>item.midi),{at:.12,gain:.22});
  feedback(counted?`完成！${explanation(question)}`:`完成了，但中间有错误。${explanation(question)}`,counted?'success':'error');
  redraw();
}

function handleFindChord(string,fret,midi){
  if(!isChordTone(question,midi)){
    hadMistake=true;
    feedback(`${fmtMidi(midi)} 不在 ${chordLabel(question.root,question.chord)} 里。`,'error');
    flashWrong(string,fret);
    return;
  }
  const key=`${string}:${fret}`;
  if(selection.has(key)){
    selection.delete(key);
  }else{
    for(const [otherKey,item] of selection){
      if(item.string===string) selection.delete(otherKey);
    }
    selection.set(key,{string,fret,midi});
  }
  updateFindStatus();
  redraw();
  checkFindComplete();
}

function reveal(){
  if(phase!=='question'||settled) return;
  finish(false);
  if(mode==='identify'){
    const button=$('answer-options').querySelector(`[data-value="${question.target}"]`);
    button?.classList.add('selected');
    $('answer-options').querySelectorAll('button').forEach(item=>{item.disabled=true;});
    feedback(`答案是 ${fmtMidi(question.targetMidi)}。${explanation(question)}`);
  }else if(mode==='locate'){
    feedback(`答案是 ${fmtMidi(question.targetMidi)}。${explanation(question)}`);
  }else if(mode==='analyze'){
    const button=$('answer-options').querySelector(`[data-key="${chordKey(question.root,question.chord)}"]`);
    button?.classList.add('selected');
    $('answer-options').querySelectorAll('button').forEach(item=>{item.disabled=true;});
    playChord(question.voicing.map(position=>position.midi),{gain:.22});
    feedback(`答案是 ${chordLabel(question.root,question.chord)}。${explanation(question)}`);
  }else{
    selection.clear();
    for(const string of question.availableStrings){
      const first=question.positions.filter(position=>position.string===string).sort((a,b)=>a.fret-b.fret)[0];
      if(first) selection.set(`${string}:${first.fret}`,{...first});
    }
    playChord([...selection.values()].map(item=>item.midi),{gain:.22});
    feedback(`答案是 ${chordLabel(question.root,question.chord)}。${explanation(question)}`);
  }
  redraw();
}

function replay(){
  if(phase!=='question') return;
  stopAll();
  playQuestionAudio();
}

function changeMode(next){
  if(mode===next&&phase==='idle') return;
  mode=next;
  document.querySelectorAll('.mode-tab').forEach(tab=>{
    const active=tab.dataset.mode===mode;
    tab.classList.toggle('is-active',active);
    tab.setAttribute('aria-selected',String(active));
    tab.tabIndex=active?0:-1;
  });
  renderIdle();
}

function toggleSound(){
  state.sound=!state.sound;
  saveState(state);
  setSoundEnabled(state.sound);
  updateSoundToggle();
  if(state.sound) playNote(64,{gain:.45});
}

document.querySelectorAll('.mode-tab').forEach(tab=>tab.addEventListener('click',()=>changeMode(tab.dataset.mode)));
document.querySelector('.mode-tabs').addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
  event.preventDefault();
  const tabs=[...document.querySelectorAll('.mode-tab')];
  const index=tabs.findIndex(tab=>tab.dataset.mode===mode);
  const next=tabs[(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length];
  changeMode(next.dataset.mode);
  next.focus();
});
$('next-button').addEventListener('click',nextQuestion);
$('replay-button').addEventListener('click',replay);
$('reveal-button').addEventListener('click',reveal);
$('sound-toggle').addEventListener('click',toggleSound);
$('fret-range').value=String(state.maxFret);
$('note-range').value=state.noteRange;
$('chord-group').value=state.chordGroup;
$('fret-range').addEventListener('change',event=>{state.maxFret=Number(event.target.value);saveState(state);renderIdle();});
$('note-range').addEventListener('change',event=>{state.noteRange=event.target.value;saveState(state);renderIdle();});
$('chord-group').addEventListener('change',event=>{
  state.chordGroup=event.target.value;
  saveState(state);
  if(mode==='analyze'||mode==='findchord') renderIdle();
});
$('reset-button').addEventListener('click',()=>{state.attempted=0;state.correct=0;sessionAttempted=0;sessionCorrect=0;updateProgress();});

setSoundEnabled(state.sound);
updateSoundToggle();
updateProgress();
renderIdle();
