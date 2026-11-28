export const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
// 固定唱名：自然音 1–7，变化音用 ♯1、♯2 等
export const SOLFEGE = ['1','♯1','2','♯2','3','4','♯4','5','♯5','6','♯6','7'];
export const NATURAL_NOTES = ['C','D','E','F','G','A','B'];

// 标准调弦，从 6 弦到 1 弦；MIDI 中 C4 = 60
export const TUNING = ['E','A','D','G','B','E'];
export const TUNING_MIDI = [40,45,50,55,59,64];

export const CHORDS = [
  {id:'major',name:'大三和弦',suffix:'',steps:[0,4,7]},
  {id:'minor',name:'小三和弦',suffix:'m',steps:[0,3,7]},
  {id:'major7',name:'大七和弦',suffix:'maj7',steps:[0,4,7,11]},
  {id:'minor7',name:'小七和弦',suffix:'m7',steps:[0,3,7,10]},
  {id:'dominant7',name:'属七和弦',suffix:'7',steps:[0,4,7,10]},
  {id:'sus4',name:'挂四和弦',suffix:'sus4',steps:[0,5,7]}
];

// 和弦练习的类别 / 难度筛选；“完全随机”放在最后
export const CHORD_GROUPS = [
  {id:'major',name:'大三和弦',level:'简单',types:['major']},
  {id:'minor',name:'小三和弦',level:'简单',types:['minor']},
  {id:'seventh',name:'七和弦',level:'进阶',types:['major7','minor7','dominant7']},
  {id:'suspended',name:'挂四和弦',level:'进阶',types:['sus4']},
  {id:'all',name:'完全随机',level:'',types:null}
];

export const pitchClass = note => NOTES.indexOf(note);
export const octaveOf = midi => Math.floor(midi/12)-1;
// 吉他记谱比实际发声高一个八度：5 弦 3 品写作 C4，实际音高为 C3
export const writtenOctaveOf = midi => octaveOf(midi)+1;

// 简谱式八度点：以写作 C4–B4 为无点中音区，上点表示高八度，下点表示低八度
const DOT_ABOVE = '\u0307';
const DOT_BELOW = '\u0323';

export const formatNote = note => SOLFEGE[pitchClass(note)] || note;

// 所有音名统一使用简谱唱名；变化音用 ♯1，八度用上下点
export const formatMidi = midi => {
  const note = NOTES[((midi % 12) + 12) % 12];
  const shift = writtenOctaveOf(midi) - 4;
  const dots = shift > 0 ? DOT_ABOVE.repeat(shift) : shift < 0 ? DOT_BELOW.repeat(-shift) : '';
  return `${formatNote(note)}${dots}`;
};

export const noteAt = (stringIndex, fret) => {
  if (!Number.isInteger(stringIndex) || stringIndex<0 || stringIndex>5 || !Number.isInteger(fret) || fret<0) throw new RangeError('无效的弦或品位');
  return NOTES[(pitchClass(TUNING[stringIndex])+fret)%12];
};

export const midiAt = (stringIndex, fret) => {
  if (!Number.isInteger(stringIndex) || stringIndex<0 || stringIndex>5 || !Number.isInteger(fret) || fret<0) throw new RangeError('无效的弦或品位');
  return TUNING_MIDI[stringIndex]+fret;
};

export const frequencyOf = midi => 440*Math.pow(2,(midi-69)/12);
export const midiFor = (note, octave) => (octave+1)*12+pitchClass(note);

// 在参考音高附近，找到同名音中最接近的一个八度
export const nearestMidi = (note, referenceMidi) => {
  const octave = octaveOf(referenceMidi);
  return [octave-1,octave,octave+1]
    .map(item=>midiFor(note,item))
    .reduce((best,current)=>Math.abs(current-referenceMidi)<Math.abs(best-referenceMidi)?current:best);
};

export const transpose = (note, semitones) => NOTES[(pitchClass(note)+semitones+120)%12];
export const chordNotes = (root, chord) => chord.steps.map(step => transpose(root, step));

// 和弦名称优先使用吉他习惯写法：Em、Cmaj7、G7、Dsus4
export const chordSymbol = (root, chord) => `${root}${chord.suffix}`;
export const chordName = (root, chord) => `${root}${chord.name}`;
export const chordLabel = (root, chord) => `${chordSymbol(root, chord)} ${chordName(root, chord)}`;

export const chordsForGroup = groupId => {
  const group = CHORD_GROUPS.find(item => item.id === groupId) || CHORD_GROUPS[CHORD_GROUPS.length-1];
  return group.types ? CHORDS.filter(chord => group.types.includes(chord.id)) : [...CHORDS];
};

export const positionsFor = (note,maxFret) => {
  const result=[];
  for(let s=0;s<6;s++) for(let f=0;f<=maxFret;f++) if(noteAt(s,f)===note) result.push({string:s,fret:f});
  return result;
};

export const positionsForMidi = (midi,maxFret) => {
  const result=[];
  for(let s=0;s<6;s++) for(let f=0;f<=maxFret;f++) if(midiAt(s,f)===midi) result.push({string:s,fret:f,midi});
  return result;
};
