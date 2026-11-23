import {NOTES,PATTERNS,patternNotes,noteAt,formatNote} from './music-theory.js';
import {makeQuestion,questionCopy,explanation} from './exercises.js';
import {drawFretboard} from './fretboard.js';
import {loadState,saveState} from './storage.js';

const $=id=>document.getElementById(id);
const state=loadState();
let mode='locate',question=null,questionNumber=0,settled=false,hadMistake=false;
let sessionAttempted=0,sessionCorrect=0,exploreRoot='C',pattern=PATTERNS[0];
const labels={locate:'指板找音',identify:'位置认音',interval:'音程练习',explore:'音阶与和弦'};
const fmt=note=>formatNote(note,state.notation);
const fretLabel=fret=>fret===0?'空弦':fret+' 品';

function updateProgress(){
  $('session-summary').textContent=`本轮 ${sessionCorrect} / ${sessionAttempted} 正确`;
  $('total-correct').textContent=String(state.correct);
  $('progress-detail').textContent=state.attempted?`累计完成 ${state.attempted} 题 · 正确率 ${Math.round(state.correct/state.attempted*100)}%`:'每一次练习，都算数。';
  saveState(state);
}
function finish(correct){
  if(settled)return;
  settled=true;
  sessionAttempted++;state.attempted++;
  if(correct&&!hadMistake){sessionCorrect++;state.correct++;}
  updateProgress();
}
function feedback(message,type=''){
  const node=$('feedback');node.textContent=message;node.className=`feedback ${type}`;
}
function redraw(showAnswer=false){
  drawFretboard($('fretboard'),{maxFret:state.maxFret,question,showAnswer,onSelect:selectPosition,notation:state.notation});
}
function selectPosition(position){
  if(mode!=='locate'||settled)return;
  const where=`${6-position.string} 弦 ${fretLabel(position.fret)}`;
  if(noteAt(position.string,position.fret)===question.target){
    finish(true);feedback(`答对了！${where}是 ${fmt(question.target)}。${explanation(question,state.notation)}`,'success');redraw(true);
  }else{
    hadMistake=true;feedback(`${where}是 ${fmt(noteAt(position.string,position.fret))}，再试一次。`,'error');
  }
}
function selectOption(value,button){
  if(settled)return;
  if(value===question.target){
    finish(true);feedback(`答对了！${explanation(question,state.notation)}`,'success');
    button.classList.add('selected');
    $('answer-options').querySelectorAll('button').forEach(item=>item.disabled=true);
    redraw(true);
  }else{
    hadMistake=true;button.disabled=true;feedback(`${fmt(value)} 还不对，再想想。`,'error');
  }
}
function renderOptions(){
  const box=$('answer-options');box.replaceChildren();box.hidden=false;box.className='answer-options';
  for(const value of question.options){
    const button=document.createElement('button');button.type='button';button.className='option-button';button.textContent=fmt(value);button.dataset.value=value;
    button.addEventListener('click',()=>selectOption(value,button));box.append(button);
  }
}
function renderExplore(){
  question={mode:'explore',root:exploreRoot,notes:patternNotes(exploreRoot,pattern)};
  $('question-prompt').textContent='选择根音与结构，观察它们在指板上的分布';
  $('question-title').textContent=`${fmt(exploreRoot)} ${pattern.name}`;
  $('question-hint').textContent=pattern.description;
  const box=$('answer-options');box.hidden=false;box.className='answer-options';
  box.replaceChildren();
  const controls=document.createElement('div');controls.className='explore-controls';
  const rootSelect=document.createElement('select');rootSelect.setAttribute('aria-label','根音');
  for(const note of NOTES) rootSelect.add(new Option(fmt(note),note));
  rootSelect.value=exploreRoot;rootSelect.addEventListener('change',()=>{exploreRoot=rootSelect.value;renderExplore();redraw();});
  const patternSelect=document.createElement('select');patternSelect.setAttribute('aria-label','音阶或和弦');
  for(const item of PATTERNS) patternSelect.add(new Option(item.name,item.id));
  patternSelect.value=pattern.id;patternSelect.addEventListener('change',()=>{pattern=PATTERNS.find(item=>item.id===patternSelect.value);renderExplore();redraw();});
  controls.append(rootSelect,patternSelect);box.append(controls);
  const pills=document.createElement('div');pills.className='note-pills';
  for(const note of question.notes){const pill=document.createElement('span');pill.className='note-pill';pill.textContent=fmt(note);pills.append(pill);}box.append(pills);
  $('board-caption').textContent='蓝色为根音 · 淡蓝色为组成音';
  $('reveal-button').hidden=true;
  $('next-button').innerHTML='换一个根音 <span aria-hidden="true">→</span>';
}
function nextQuestion(){
  questionNumber++;settled=false;hadMistake=false;feedback('');
  $('mode-label').textContent=labels[mode];
  $('question-counter').textContent=mode==='explore'?'自由探索':`第 ${String(questionNumber).padStart(2,'0')} 题`;
  $('answer-options').hidden=true;
  $('reveal-button').hidden=mode==='explore';
  $('next-button').innerHTML=mode==='explore'?'换一个根音 <span aria-hidden="true">→</span>':'下一题 <span aria-hidden="true">→</span>';
  if(mode==='explore'){
    exploreRoot=NOTES[Math.floor(Math.random()*NOTES.length)];
    renderExplore();
  }else{
    question=makeQuestion(mode,state);
    const copy=questionCopy(question,state.notation);
    $('question-prompt').textContent=copy.prompt;
    $('question-title').textContent=copy.title;
    $('question-hint').textContent=copy.hint;
    $('board-caption').textContent=mode==='locate'?'点击一个位置作答':mode==='identify'?'蓝色为题目位置':'显示答案后查看目标音';
    if(question.options)renderOptions();
  }
  redraw();
}
function reveal(){
  if(settled||mode==='explore')return;
  finish(false);
  feedback(`答案是 ${fmt(question.target)}。${explanation(question,state.notation)}`);
  $('answer-options').querySelectorAll('button').forEach(button=>{button.disabled=true;if(button.dataset.value===question.target)button.classList.add('selected');});
  redraw(true);
}
function changeMode(next){
  mode=next;questionNumber=0;
  document.querySelectorAll('.mode-tab').forEach(tab=>{
    const active=tab.dataset.mode===mode;tab.classList.toggle('is-active',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
  });
  nextQuestion();
}
function syncRangeOption(){
  $('note-range').options[0].textContent=state.notation==='solfege'?'自然音 · 1 2 3 4 5 6 7':'自然音 · C D E F G A B';
}
function syncBoardFoot(){
  $('foot-high').textContent=`1 弦 · 高音 ${fmt('E')}`;
  $('foot-low').textContent=`6 弦 · 低音 ${fmt('E')}`;
}
document.querySelectorAll('.mode-tab').forEach(tab=>tab.addEventListener('click',()=>changeMode(tab.dataset.mode)));
document.querySelector('.mode-tabs').addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
  event.preventDefault();const tabs=[...document.querySelectorAll('.mode-tab')];
  const index=tabs.findIndex(tab=>tab.dataset.mode===mode);
  const next=tabs[(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length];changeMode(next.dataset.mode);next.focus();
});
$('next-button').addEventListener('click',nextQuestion);
$('reveal-button').addEventListener('click',reveal);
$('fret-range').value=String(state.maxFret);
$('note-range').value=state.noteRange;
$('notation').value=state.notation;
syncRangeOption();
syncBoardFoot();
$('fret-range').addEventListener('change',event=>{state.maxFret=Number(event.target.value);saveState(state);nextQuestion();});
$('note-range').addEventListener('change',event=>{state.noteRange=event.target.value;saveState(state);nextQuestion();});
$('notation').addEventListener('change',event=>{state.notation=event.target.value;saveState(state);syncRangeOption();syncBoardFoot();nextQuestion();});
$('reset-button').addEventListener('click',()=>{state.attempted=0;state.correct=0;updateProgress();});
updateProgress();nextQuestion();
