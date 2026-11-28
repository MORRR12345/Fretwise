import {NOTES,NATURAL_NOTES,TUNING_MIDI,noteAt,midiAt,formatNote,formatMidi,midiFor,chordNotes,chordsForGroup,chordSymbol,chordName,chordLabel} from './music-theory.js';

const random = items => items[Math.floor(Math.random()*items.length)];
const shuffle = items => {
  const list=[...items];
  for(let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}
  return list;
};
const positionLabel = position => `${6-position.string} 弦 · ${position.fret===0?'空弦':position.fret+' 品'}`;
const poolFor = settings => settings.noteRange==='all'?NOTES:NATURAL_NOTES;

function boardPositions(settings,predicate=()=>true){
  const result=[];
  for(let s=0;s<6;s++) for(let f=0;f<=settings.maxFret;f++){
    const note=noteAt(s,f);
    if(predicate(note,s,f)) result.push({string:s,fret:f,note,midi:midiAt(s,f)});
  }
  return result;
}

function makeIdentify(settings){
  const pool=poolFor(settings);
  const candidates=boardPositions(settings,note=>pool.includes(note));
  const position=random(candidates);
  return {
    mode:'identify',
    position:{string:position.string,fret:position.fret},
    target:position.note,
    targetMidi:position.midi,
    options:shuffle(pool)
  };
}

function makeLocate(settings){
  const pool=poolFor(settings);
  const groups=new Map();
  for(const position of boardPositions(settings,note=>pool.includes(note))){
    if(!groups.has(position.midi)) groups.set(position.midi,[]);
    groups.get(position.midi).push(position);
  }
  const group=random([...groups.values()]);
  const first=group[0];
  return {
    mode:'locate',
    target:first.note,
    targetMidi:first.midi,
    answers:group.map(({string,fret})=>({string,fret}))
  };
}

// 在一段连续品位里，每根弦最多取一个音，找出能覆盖全部和弦音的组合
function candidatesForWindow(tones,start,end){
  const lists=[];
  for(let s=0;s<6;s++){
    const candidates=[];
    for(const note of tones){
      let fret=null;
      for(let f=start;f<=end;f++){
        if(noteAt(s,f)===note&&(fret===null||Math.abs(f-(start+end)/2)<Math.abs(fret-(start+end)/2))) fret=f;
      }
      if(fret!==null) candidates.push({string:s,fret,note,midi:midiAt(s,fret)});
    }
    if(candidates.length) lists.push(candidates);
  }
  return lists;
}

function bestCombination(lists,tones){
  let best=null;
  const chosen=[];
  const covered=new Set();
  const walk=index=>{
    if(index===lists.length){
      if(covered.size===tones.length&&(!best||chosen.length>best.length)) best=chosen.map(item=>({...item}));
      return;
    }
    for(const candidate of lists[index]){
      const isNew=!covered.has(candidate.note);
      if(isNew) covered.add(candidate.note);
      chosen.push(candidate);
      walk(index+1);
      chosen.pop();
      if(isNew) covered.delete(candidate.note);
    }
  };
  walk(0);
  return best;
}

// 返回一组真实可弹的和弦把位：每根弦一个音，且包含和弦的全部组成音
export function buildVoicing(root,chord,maxFret){
  const tones=chordNotes(root,chord);
  let best=null,bestScore=-Infinity;
  for(let width=4;width<=6;width++){
    if(width>maxFret+1) continue;
    for(let start=0;start<=maxFret-width+1;start++){
      const end=start+width-1;
      const lists=candidatesForWindow(tones,start,end);
      if(lists.length<3) continue;
      const combination=bestCombination(lists,tones);
      if(!combination) continue;
      const score=combination.length*10-(width-4)*6-start*.4;
      if(score>bestScore){bestScore=score;best=combination;}
    }
  }
  if(best) return best.sort((a,b)=>a.string-b.string);
  const fallback=bestCombination(candidatesForWindow(tones,0,maxFret),tones);
  return fallback?fallback.sort((a,b)=>a.string-b.string):null;
}

function chordKey(root,chord){return `${root}:${chord.id}`;}
function chordSignature(root,chord){return chordNotes(root,chord).slice().sort().join('|');}

function buildChordOptions(root,chord,settings){
  const roots=poolFor(settings);
  const chords=chordsForGroup(settings.chordGroup);
  const options=[{root,chord}];
  const seen=new Set([chordKey(root,chord)]);
  const usedSets=new Set([chordSignature(root,chord)]);
  const add=(itemRoot,itemChord)=>{
    const key=chordKey(itemRoot,itemChord);
    if(seen.has(key)) return;
    const signature=chordSignature(itemRoot,itemChord);
    if(usedSets.has(signature)) return;
    seen.add(key);usedSets.add(signature);options.push({root:itemRoot,chord:itemChord});
  };
  const sameRoot=shuffle(chords.filter(item=>item.id!==chord.id));
  if(sameRoot.length) add(root,sameRoot[0]);
  const otherRoots=shuffle(roots.filter(item=>item!==root));
  if(otherRoots.length) add(otherRoots[0],chord);
  let guard=0;
  while(options.length<4&&guard++<200) add(random(roots),random(chords));
  return shuffle(options);
}

function makeAnalyze(settings){
  const roots=poolFor(settings);
  const chords=chordsForGroup(settings.chordGroup);
  for(let attempt=0;attempt<80;attempt++){
    const root=random(roots);
    const chord=random(chords);
    const voicing=buildVoicing(root,chord,settings.maxFret);
    if(!voicing||voicing.length<3) continue;
    return {mode:'analyze',root,chord,notes:chordNotes(root,chord),voicing,options:buildChordOptions(root,chord,settings)};
  }
  throw new Error('无法生成分析和弦题');
}

function makeFindChord(settings){
  const root=random(poolFor(settings));
  const chord=random(chordsForGroup(settings.chordGroup));
  const notes=chordNotes(root,chord);
  const positions=boardPositions(settings,note=>notes.includes(note));
  const availableStrings=[...new Set(positions.map(position=>position.string))].sort((a,b)=>a-b);
  return {mode:'findchord',root,chord,notes,positions,availableStrings};
}

export function makeQuestion(mode,settings){
  if(mode==='identify') return makeIdentify(settings);
  if(mode==='locate') return makeLocate(settings);
  if(mode==='analyze') return makeAnalyze(settings);
  if(mode==='findchord') return makeFindChord(settings);
  throw new Error(`未知练习模式：${mode}`);
}

export function questionCopy(question){
  if(question.mode==='identify') return {
    prompt:'听一听，这个位置是什么音？',
    title:positionLabel(question.position),
    hint:'题目已经弹响 · 点击选项可以试听并作答'
  };
  if(question.mode==='locate') return {
    prompt:'在指板上找到这个音',
    title:formatMidi(question.targetMidi),
    hint:'注意八度 · 高八度与低八度是不同的位置'
  };
  if(question.mode==='analyze') return {
    prompt:'依次听这些音，它们组成什么和弦？',
    title:'这是什么和弦？',
    hint:'点击「重听」再听一次 · 选对后一起弹响'
  };
  return {
    prompt:'在指板上找出这个和弦的音',
    title:chordSymbol(question.root,question.chord),
    hint:chordName(question.root,question.chord)
  };
}

export function explanation(question){
  if(question.mode==='identify'){
    const {string,fret}=question.position;
    const open=formatMidi(TUNING_MIDI[string]);
    return `${positionLabel(question.position)} 是 ${formatMidi(question.targetMidi)}：${6-string} 弦空弦为 ${open}${fret===0?'。':`，向上 ${fret} 个半音。`}`;
  }
  if(question.mode==='locate'){
    return `${formatMidi(question.targetMidi)} 在当前指板范围内共有 ${question.answers.length} 个位置。`;
  }
  const tones=question.notes.map(formatNote).join(' · ');
  if(question.mode==='analyze') return `${chordLabel(question.root,question.chord)}的组成音是 ${tones}。`;
  return `${chordLabel(question.root,question.chord)}的组成音是 ${tones}，范围内的和弦音共有 ${question.positions.length} 个。`;
}

// 试听选项时使用的密集排列，根音放在 C3 附近
export function chordAuditionMidis(root,chord){
  const rootMidi=midiFor(root,3);
  return chord.steps.map(step=>rootMidi+step);
}

export function isChordTone(question,midi){
  return question.notes.includes(NOTES[((midi%12)+12)%12]);
}
