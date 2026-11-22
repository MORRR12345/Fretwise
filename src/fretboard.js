import {noteAt} from './music-theory.js';
const NS='http://www.w3.org/2000/svg';
const el=(name,attrs={})=>{const node=document.createElementNS(NS,name);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));return node;};
export function drawFretboard(container,{maxFret,question,showAnswer,onSelect}){
  container.replaceChildren();
  const left=100,top=44,right=26,bottom=48,step=maxFret===5?112:66,stringStep=36;
  const width=left+maxFret*step+right,height=top+5*stringStep+bottom;
  const svg=el('svg',{viewBox:`0 0 ${width} ${height}`,role:'group','aria-label':`吉他指板，空弦到第 ${maxFret} 品`});
  svg.style.minWidth=`${Math.max(width,760)}px`;
  const board=el('rect',{x:left,y:top-17,width:maxFret*step,height:5*stringStep+34,rx:13,fill:'#f7f8fb'});
  svg.append(board);
  for(let f=0;f<=maxFret;f++){
    const x=left+f*step;
    svg.append(el('line',{x1:x,y1:top-17,x2:x,y2:top+5*stringStep+17,stroke:f===0?'#808690':'#dfe2e9','stroke-width':f===0?5:1}));
  }
  for(let s=0;s<6;s++){
    const y=top+s*stringStep;
    svg.append(el('line',{x1:left-18,y1:y,x2:left+maxFret*step,y2:y,stroke:'#9ca3af','stroke-width':1.1+s*.18}));
    const label=el('text',{x:12,y:y+4,fill:'#9aa1ad','font-size':11,'font-weight':700});label.textContent=`${6-s} 弦  ${['E','A','D','G','B','E'][s]}`;svg.append(label);
  }
  for(let f=0;f<=maxFret;f++){
    const x=f===0?left-34:left+(f-.5)*step;
    const number=el('text',{x,y:height-11,'text-anchor':'middle',fill:'#a6acb8','font-size':11,'font-weight':700});number.textContent=f===0?'0':String(f);svg.append(number);
    if([3,5,7,9,12].includes(f)){
      const dotX=left+(f-.5)*step;
      svg.append(el('circle',{cx:dotX,cy:top+2.5*stringStep,r:f===12?5:4,fill:'#d3d9e4'}));
    }
  }
  for(let s=0;s<6;s++) for(let f=0;f<=maxFret;f++){
    const x=f===0?left-34:left+(f-.5)*step,y=top+s*stringStep;
    const key=`${s}:${f}`;
    const isPrompt=question?.mode==='identify'&&question.position.string===s&&question.position.fret===f;
    const isAnswer=showAnswer&&question&&(question.mode==='locate'?question.target===noteAt(s,f):question.mode==='identify'?isPrompt:question.mode==='interval'?question.target===noteAt(s,f):false);
    const isExplore=question?.mode==='explore'&&question.notes.includes(noteAt(s,f));
    const active=isPrompt||isAnswer||isExplore;
    const group=el('g',{class:'fret-cell',tabindex:question?.mode==='locate'&&!showAnswer?'0':'-1',role:question?.mode==='locate'&&!showAnswer?'button':'img','aria-label':`${6-s} 弦，${f===0?'空弦':f+' 品'}${active?'，'+noteAt(s,f):''}`,'aria-disabled':question?.mode==='locate'&&!showAnswer?'false':'true'});
    group.append(el('rect',{class:'cell-hit',x:x-20,y:y-17,width:40,height:34,rx:8,fill:'transparent'}));
    if(active){
      group.append(el('circle',{class:'cell-ring',cx:x,cy:y,r:14,fill:isPrompt?'#2e5fdf':isExplore&&noteAt(s,f)===question.root?'#2e5fdf':'#e5ebfb',stroke:'none'}));
      const txt=el('text',{class:'cell-label',x,y:y+4,'text-anchor':'middle',fill:isPrompt||isExplore&&noteAt(s,f)===question.root?'#fff':'#4169cd'});txt.textContent=noteAt(s,f);group.append(txt);
    }else group.append(el('circle',{cx:x,cy:y,r:3,fill:'#b2b8c2'}));
    if(question?.mode==='locate'&&!showAnswer){
      group.addEventListener('click',()=>onSelect({string:s,fret:f,key}));
      group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect({string:s,fret:f,key});}});
    }
    svg.append(group);
  }
  container.append(svg);
}
