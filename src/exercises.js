import {NOTES,NATURAL_NOTES,TUNING,INTERVALS,noteAt,positionsFor,transpose,formatNote} from './music-theory.js';
const random = items => items[Math.floor(Math.random()*items.length)];
const formatter = notation => note => formatNote(note, notation);
const positionLabel = position => `${6-position.string} 弦 · ${position.fret===0?'空弦':position.fret+' 品'}`;

// 题目只保存乐理数据，显示文案由 questionCopy / explanation 按当前记谱法生成
export function makeQuestion(mode,settings){
  const pool=settings.noteRange==='all'?NOTES:NATURAL_NOTES;
  if(mode==='locate'){
    const target=random(pool);
    return {mode,target,answer:positionsFor(target,settings.maxFret)};
  }
  if(mode==='identify'){
    const candidates=[];
    for(let s=0;s<6;s++) for(let f=0;f<=settings.maxFret;f++) if(pool.includes(noteAt(s,f))) candidates.push({string:s,fret:f});
    const position=random(candidates);
    return {mode,target:noteAt(position.string,position.fret),position,options:pool};
  }
  const root=random(pool);
  const interval=random(INTERVALS.filter(item=>item.semitones<=9));
  return {mode:'interval',root,interval,target:transpose(root,interval.semitones),options:NOTES};
}
export function questionCopy(question,notation='letter'){
  const fmt=formatter(notation);
  if(question.mode==='locate') return {prompt:'在指板上找到这个音',title:fmt(question.target),hint:'任意一个正确位置都可以 · 包括空弦'};
  if(question.mode==='identify') return {prompt:'这个位置是什么音？',title:positionLabel(question.position),hint:'观察指板上高亮的位置，再选择音名'};
  return {prompt:'从根音向上数一个音程',title:`${fmt(question.root)} 的${question.interval.name}是什么音？`,hint:`${question.interval.name} = ${question.interval.semitones} 个半音`};
}
export function explanation(question,notation='letter'){
  const fmt=formatter(notation);
  if(question.mode==='locate') return `${fmt(question.target)} 在当前指板范围内共有 ${question.answer.length} 个位置。`;
  if(question.mode==='identify') return `${6-question.position.string} 弦的空弦音是 ${fmt(TUNING[question.position.string])}，向上走 ${question.position.fret} 个半音得到 ${fmt(question.target)}。`;
  return `${fmt(question.root)} 向上 ${question.interval.semitones} 个半音是 ${fmt(question.target)}。`;
}
