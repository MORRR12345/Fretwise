const KEY='fretwise.v1';
const defaults={maxFret:12,noteRange:'natural',notation:'letter',attempted:0,correct:0};
export function loadState(){
  try{
    const saved=JSON.parse(localStorage.getItem(KEY));
    if(!saved||typeof saved!=='object') return {...defaults};
    return {
      maxFret:[5,12].includes(Number(saved.maxFret))?Number(saved.maxFret):12,
      noteRange:['natural','all'].includes(saved.noteRange)?saved.noteRange:'natural',
      notation:['letter','solfege'].includes(saved.notation)?saved.notation:'letter',
      attempted:Number.isSafeInteger(saved.attempted)&&saved.attempted>=0?saved.attempted:0,
      correct:Number.isSafeInteger(saved.correct)&&saved.correct>=0?saved.correct:0
    };
  }catch{return {...defaults};}
}
export function saveState(state){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{/* 私密浏览模式可能禁止写入 */}}
