import {NOTES,NATURAL_NOTES,INTERVALS,noteAt,positionsFor,transpose} from './music-theory.js';
const random = items => items[Math.floor(Math.random()*items.length)];
export function makeQuestion(mode,settings){
  const pool=settings.noteRange==='all'?NOTES:NATURAL_NOTES;
  if(mode==='locate'){
    const target=random(pool);
    return {mode,target,prompt:'在指板上找到这个音',title:target,hint:'任意一个正确位置都可以 · 包括空弦',answer:positionsFor(target,settings.maxFret)};
  }
  if(mode==='identify'){
    const candidates=[];
    for(let s=0;s<6;s++) for(let f=0;f<=settings.maxFret;f++) if(pool.includes(noteAt(s,f))) candidates.push({string:s,fret:f});
    const position=random(candidates);
    const target=noteAt(position.string,position.fret);
    return {mode,target,position,prompt:'这个位置是什么音？',title:`${6-position.string} 弦 · ${position.fret===0?'空弦':position.fret+' 品'}`,hint:'观察指板上高亮的位置，再选择音名',options:pool};
  }
  const root=random(pool);
  const interval=random(INTERVALS.filter(item=>item.semitones<=9));
  const target=transpose(root,interval.semitones);
  return {mode:'interval',root,interval,target,prompt:'从根音向上数一个音程',title:`${root} 的${interval.name}是什么音？`,hint:`${interval.name} = ${interval.semitones} 个半音`,options:NOTES};
}
export function explanation(question){
  if(question.mode==='locate') return `${question.target} 在当前指板范围内共有 ${question.answer.length} 个位置。`;
  if(question.mode==='identify') return `${6-question.position.string} 弦的空弦音是 ${['E','A','D','G','B','E'][question.position.string]}，向上走 ${question.position.fret} 个半音得到 ${question.target}。`;
  return `${question.root} 向上 ${question.interval.semitones} 个半音是 ${question.target}。`;
}
