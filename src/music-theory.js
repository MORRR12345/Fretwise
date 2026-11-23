export const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const SOLFEGE = ['1','♯1','2','♯2','3','4','♯4','5','♯5','6','♯6','7'];
export const NATURAL_NOTES = ['C','D','E','F','G','A','B'];
export const TUNING = ['E','A','D','G','B','E']; // 6 弦到 1 弦
export const INTERVALS = [
  {name:'小二度',semitones:1},{name:'大二度',semitones:2},
  {name:'小三度',semitones:3},{name:'大三度',semitones:4},
  {name:'纯四度',semitones:5},{name:'纯五度',semitones:7},
  {name:'小六度',semitones:8},{name:'大六度',semitones:9},
  {name:'小七度',semitones:10},{name:'大七度',semitones:11},
  {name:'纯八度',semitones:12}
];
export const PATTERNS = [
  {id:'major-scale',name:'大调音阶',steps:[0,2,4,5,7,9,11],kind:'scale',description:'全全半全全全半 · 明亮、稳定的七声音阶'},
  {id:'minor-scale',name:'自然小调音阶',steps:[0,2,3,5,7,8,10],kind:'scale',description:'全半全全半全全 · 柔和、内省的七声音阶'},
  {id:'pentatonic',name:'大调五声音阶',steps:[0,2,4,7,9],kind:'scale',description:'由大调音阶中五个音构成，适合熟悉指板'},
  {id:'major-chord',name:'大三和弦',steps:[0,4,7],kind:'chord',description:'根音 + 大三度 + 纯五度'},
  {id:'minor-chord',name:'小三和弦',steps:[0,3,7],kind:'chord',description:'根音 + 小三度 + 纯五度'}
];
export const pitchClass = note => NOTES.indexOf(note);
export const formatNote = (note, notation = 'letter') => {
  if (notation !== 'solfege') return note;
  const index = pitchClass(note);
  return index < 0 ? note : SOLFEGE[index];
};
export const noteAt = (stringIndex, fret) => {
  if (!Number.isInteger(stringIndex) || stringIndex<0 || stringIndex>5 || !Number.isInteger(fret) || fret<0) throw new RangeError('无效的弦或品位');
  return NOTES[(pitchClass(TUNING[stringIndex])+fret)%12];
};
export const transpose = (note, semitones) => NOTES[(pitchClass(note)+semitones+120)%12];
export const patternNotes = (root, pattern) => pattern.steps.map(step => transpose(root,step));
export const positionsFor = (note,maxFret) => {
  const result=[];
  for(let s=0;s<6;s++) for(let f=0;f<=maxFret;f++) if(noteAt(s,f)===note) result.push({string:s,fret:f});
  return result;
};
