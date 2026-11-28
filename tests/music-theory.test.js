import test from 'node:test';
import assert from 'node:assert/strict';
import {NOTES,NATURAL_NOTES,CHORDS,CHORD_GROUPS,noteAt,midiAt,positionsFor,positionsForMidi,transpose,formatNote,formatMidi,frequencyOf,nearestMidi,midiFor,octaveOf,writtenOctaveOf,chordNotes,chordsForGroup,chordSymbol,chordName,chordLabel} from '../src/music-theory.js';
import {makeQuestion,questionCopy,explanation,buildVoicing,chordAuditionMidis,isChordTone} from '../src/exercises.js';
import {renderPluck} from '../src/audio.js';

test('标准调弦的 MIDI 音高与吉他记谱八度',()=>{
  assert.deepEqual([0,1,2,3,4,5].map(s=>midiAt(s,0)),[40,45,50,55,59,64]);
  assert.deepEqual([0,1,2,3,4,5].map(s=>noteAt(s,0)),['E','A','D','G','B','E']);
  assert.equal(formatMidi(40),'3\u0323');
  assert.equal(formatMidi(45),'6\u0323');
  assert.equal(formatMidi(50),'2');
  assert.equal(formatMidi(55),'5');
  assert.equal(formatMidi(59),'7');
  assert.equal(formatMidi(64),'3\u0307');
  assert.equal(formatMidi(88),'3\u0307\u0307\u0307');
  assert.equal(midiAt(0,12),52);
  assert.equal(octaveOf(59),3);
  assert.equal(writtenOctaveOf(59),4);
  assert.equal(frequencyOf(69),440);
});

test('5 弦 3 品是吉他记谱的中央 C',()=>{
  assert.equal(midiAt(1,3),48);
  assert.equal(writtenOctaveOf(48),4);
  assert.equal(formatMidi(48),'1');
  assert.equal(formatMidi(40),'3\u0323');
  assert.equal(formatMidi(64),'3\u0307');
});

test('同一音名在不同八度被视为不同音高',()=>{
  assert.deepEqual(positionsForMidi(45,12).map(p=>`${p.string}:${p.fret}`),['0:5','1:0']);
  assert.deepEqual(positionsForMidi(57,12).map(p=>`${p.string}:${p.fret}`),['1:12','2:7','3:2']);
  assert.equal(positionsFor('A',5).length,4);
});

test('唱名使用数字与 ♯，变化音不显示字母',()=>{
  assert.equal(formatNote('C'),'1');
  assert.equal(formatNote('C#'),'♯1');
  assert.equal(formatNote('B'),'7');
  assert.equal(formatMidi(57),'6');
  assert.equal(formatMidi(61),'♯1\u0307');
  assert.equal(formatMidi(60),'1\u0307');
  assert.equal(formatMidi(72),'1\u0307\u0307');
  assert.equal(formatMidi(40),'3\u0323');
  assert.equal(formatMidi(47),'7\u0323');
  assert.equal(formatMidi(76),'3\u0307\u0307');
  for(let midi=40;midi<=76;midi++){
    assert.ok(!/[A-G]/.test(formatMidi(midi)),`${midi} 不应出现音名字母`);
  }
  assert.equal(nearestMidi('C',59),60);
  assert.equal(nearestMidi('B',60),59);
  assert.equal(midiFor('C',4),60);
  assert.equal(transpose('B',1),'C');
});

test('和弦组成音、吉他符号与中文名称',()=>{
  const major=CHORDS.find(item=>item.id==='major');
  const minor=CHORDS.find(item=>item.id==='minor');
  assert.deepEqual(chordNotes('C',major),['C','E','G']);
  assert.deepEqual(chordNotes('A',minor),['A','C','E']);
  assert.equal(chordSymbol('E',minor),'Em');
  assert.equal(chordName('E',minor),'E小三和弦');
  assert.equal(chordLabel('E',minor),'Em E小三和弦');
  assert.equal(chordSymbol('C',major),'C');
  assert.equal(chordLabel('C',major),'C C大三和弦');
  assert.deepEqual(chordAuditionMidis('C',major),[48,52,55]);
});

test('认音题目播放的音高与指板位置一致',()=>{
  for(let i=0;i<200;i++){
    const question=makeQuestion('identify',{noteRange:'natural',maxFret:5});
    assert.ok(question.position.fret<=5);
    assert.equal(noteAt(question.position.string,question.position.fret),question.target);
    assert.equal(midiAt(question.position.string,question.position.fret),question.targetMidi);
    assert.ok(question.options.includes(question.target));
    assert.equal(question.options.length,NATURAL_NOTES.length);
  }
});

test('找音题目只接受完全相同的音高与八度',()=>{
  for(let i=0;i<200;i++){
    const question=makeQuestion('locate',{noteRange:'all',maxFret:12});
    assert.ok(question.answers.length>0);
    assert.ok(question.answers.every(position=>midiAt(position.string,position.fret)===question.targetMidi));
    assert.ok(question.answers.every(position=>noteAt(position.string,position.fret)===question.target));
    const samePitchClass=positionsFor(question.target,12);
    assert.ok(samePitchClass.length>=question.answers.length);
  }
});

test('分析和弦的指板把位包含全部和弦音，且每根弦最多一个',()=>{
  for(const maxFret of [5,12]) for(const root of NOTES) for(const chord of CHORDS){
    const voicing=buildVoicing(root,chord,maxFret);
    assert.ok(voicing&&voicing.length>=3,`${root} ${chord.id} 在 ${maxFret} 品内应有把位`);
    const strings=new Set(voicing.map(position=>position.string));
    assert.equal(strings.size,voicing.length);
    const notes=new Set(voicing.map(position=>noteAt(position.string,position.fret)));
    for(const note of chordNotes(root,chord)) assert.ok(notes.has(note),`${root} ${chord.id} 缺少 ${note}`);
    assert.ok(voicing.every(position=>position.fret<=maxFret));
  }
});

test('分析和弦题目给出完整把位与四个不重复选项',()=>{
  for(const settings of [
    {noteRange:'natural',maxFret:5,chordGroup:'all'},
    {noteRange:'all',maxFret:12,chordGroup:'all'}
  ]){
    for(let i=0;i<60;i++){
      const question=makeQuestion('analyze',settings);
      assert.ok(question.voicing.length>=3);
      assert.equal(question.options.length,4);
      const keys=question.options.map(option=>`${option.root}:${option.chord.id}`);
      assert.equal(new Set(keys).size,4);
      const signatures=question.options.map(option=>chordNotes(option.root,option.chord).slice().sort().join('|'));
      assert.equal(new Set(signatures).size,4,'选项的和弦音不能完全相同');
      assert.ok(keys.includes(`${question.root}:${question.chord.id}`));
      const notes=new Set(question.voicing.map(position=>noteAt(position.string,position.fret)));
      for(const note of question.notes) assert.ok(notes.has(note));
      assert.ok(!questionCopy(question).title.includes(question.root));
    }
  }
});

test('和弦类别筛选出对应的和弦类型',()=>{
  for(const group of CHORD_GROUPS){
    for(let i=0;i<25;i++){
      const settings={noteRange:'all',maxFret:12,chordGroup:group.id};
      const analyze=makeQuestion('analyze',settings);
      const find=makeQuestion('findchord',settings);
      assert.equal(analyze.options.length,4);
      if(group.types){
        assert.ok(group.types.includes(analyze.chord.id),`${group.id} 分析题生成了 ${analyze.chord.id}`);
        assert.ok(group.types.includes(find.chord.id),`${group.id} 找和弦生成了 ${find.chord.id}`);
        assert.ok(analyze.options.every(option=>group.types.includes(option.chord.id)));
      }
    }
  }
  assert.deepEqual(chordsForGroup('seventh').map(chord=>chord.id),['major7','minor7','dominant7']);
  assert.deepEqual(chordsForGroup('suspended').map(chord=>chord.id),['sus4']);
  assert.equal(chordsForGroup('unknown').length,CHORDS.length);
});

test('找和弦题目使用吉他符号，组成音全部是数字唱名',()=>{
  for(let i=0;i<100;i++){
    const question=makeQuestion('findchord',{noteRange:'natural',maxFret:5,chordGroup:'all'});
    assert.ok(question.positions.length>0);
    assert.equal(question.positions.length,question.positions.filter(position=>isChordTone(question,position.midi)).length);
    assert.deepEqual(question.availableStrings,[...new Set(question.positions.map(position=>position.string))].sort((a,b)=>a-b));
    assert.ok(question.positions.every(position=>position.fret<=5));
    const copy=questionCopy(question);
    assert.equal(copy.title,chordSymbol(question.root,question.chord));
    assert.ok(copy.hint.includes(chordName(question.root,question.chord)));
    const detail=explanation(question);
    assert.ok(detail.includes(chordLabel(question.root,question.chord)));
    assert.ok(!/[A-G]/.test(detail.replace(chordLabel(question.root,question.chord),'')),'解析中的组成音不应出现字母');
  }
});

test('题面不会泄露认音答案，解析会给出答案',()=>{
  for(let i=0;i<40;i++){
    const question=makeQuestion('identify',{noteRange:'all',maxFret:12});
    const copy=questionCopy(question);
    assert.ok(!copy.title.includes(question.target));
    assert.ok(!copy.hint.includes(question.target));
    assert.ok(explanation(question).includes(formatMidi(question.targetMidi)));
  }
});

test('拨弦合成产生非静音且自然衰减的波形',()=>{
  const data=renderPluck(44100,57,1.4);
  assert.equal(data.length,Math.ceil(44100*1.4));
  let peak=0;
  for(const value of data) peak=Math.max(peak,Math.abs(value));
  assert.ok(peak>0.5);
  const rms=(from,to)=>{
    let sum=0;
    for(let i=from;i<to;i++) sum+=data[i]*data[i];
    return Math.sqrt(sum/(to-from));
  };
  const head=rms(0,Math.floor(44100*.08));
  const tail=rms(data.length-Math.floor(44100*.12),data.length);
  assert.ok(head>tail*4,`包络应衰减：${head} / ${tail}`);
});

test('拨弦音高接近目标频率',()=>{
  const sampleRate=44100;
  const data=renderPluck(sampleRate,57,.6);
  const start=Math.floor(sampleRate*.08);
  const segment=data.subarray(start,start+Math.floor(sampleRate*.35));
  const minLag=Math.floor(sampleRate/240);
  const maxLag=Math.ceil(sampleRate/200);
  let bestLag=minLag,best=-Infinity;
  for(let lag=minLag;lag<=maxLag;lag++){
    let sum=0;
    for(let i=0;i<segment.length-lag;i++) sum+=segment[i]*segment[i+lag];
    if(sum>best){best=sum;bestLag=lag;}
  }
  const frequency=sampleRate/bestLag;
  assert.ok(Math.abs(frequency-220)<5,`A3 应接近 220 Hz，实际 ${frequency.toFixed(2)} Hz`);
});
