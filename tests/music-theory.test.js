import test from 'node:test';
import assert from 'node:assert/strict';
import {noteAt,positionsFor,patternNotes,PATTERNS,transpose,formatNote} from '../src/music-theory.js';
import {makeQuestion,questionCopy,explanation} from '../src/exercises.js';

test('标准调弦的空弦与第 12 品相同',()=>{
  assert.deepEqual([0,1,2,3,4,5].map(s=>noteAt(s,0)),['E','A','D','G','B','E']);
  assert.deepEqual([0,1,2,3,4,5].map(s=>noteAt(s,12)),['E','A','D','G','B','E']);
});
test('指板位置涵盖空弦，且不超出范围',()=>{
  const positions=positionsFor('E',5);
  assert.ok(positions.some(p=>p.string===0&&p.fret===0));
  assert.ok(positions.every(p=>p.fret>=0&&p.fret<=5&&noteAt(p.string,p.fret)==='E'));
});
test('音程和结构使用半音计算',()=>{
  assert.equal(transpose('B',1),'C');
  assert.deepEqual(patternNotes('C',PATTERNS.find(p=>p.id==='major-chord')),['C','E','G']);
  assert.deepEqual(patternNotes('A',PATTERNS.find(p=>p.id==='minor-chord')),['A','C','E']);
});
test('出题位置与答案始终匹配当前范围',()=>{
  for(let i=0;i<100;i++){
    const identify=makeQuestion('identify',{noteRange:'natural',maxFret:5});
    assert.ok(identify.position.fret<=5);
    assert.equal(noteAt(identify.position.string,identify.position.fret),identify.target);
    const locate=makeQuestion('locate',{noteRange:'all',maxFret:5});
    assert.ok(locate.answer.length>0);
    assert.ok(locate.answer.every(p=>noteAt(p.string,p.fret)===locate.target));
  }
});
test('音名与唱名可以切换',()=>{
  assert.equal(formatNote('C','solfege'),'1');
  assert.equal(formatNote('C#','solfege'),'♯1');
  assert.equal(formatNote('B','solfege'),'7');
  assert.equal(formatNote('C'),'C');
});
test('认音题面不暴露答案',()=>{
  for(let i=0;i<20;i++){
    const question=makeQuestion('identify',{noteRange:'all',maxFret:12});
    assert.ok(!questionCopy(question,'letter').title.includes(question.target));
    assert.ok(explanation(question,'letter').includes(question.target));
  }
});
