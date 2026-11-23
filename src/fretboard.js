import {noteAt,formatNote} from './music-theory.js';
const NS='http://www.w3.org/2000/svg';
const el=(name,attrs={})=>{const node=document.createElementNS(NS,name);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));return node;};

export function drawFretboard(container,{maxFret,question,showAnswer,onSelect,notation='letter'}){
  container.replaceChildren();
  const fmt=note=>formatNote(note,notation);
  const left=96,top=34,right=24,bottom=38,step=maxFret===5?104:54,stringStep=30;
  const width=left+maxFret*step+right,height=top+5*stringStep+bottom;
  // 抱琴视角：1 弦在最上方，6 弦在最下方
  const stringY=string=>top+(5-string)*stringStep;
  const cellX=fret=>fret===0?left-34:left+(fret-.5)*step;
  const svg=el('svg',{viewBox:`0 0 ${width} ${height}`,role:'group','aria-label':`吉他指板，空弦到第 ${maxFret} 品，1 弦在最上方`});
  svg.append(el('rect',{x:left,y:top-17,width:maxFret*step,height:5*stringStep+34,rx:13,fill:'#f7f8fb'}));
  for(let f=0;f<=maxFret;f++){
    const x=left+f*step;
    svg.append(el('line',{x1:x,y1:top-17,x2:x,y2:top+5*stringStep+17,stroke:f===0?'#808690':'#dfe2e9','stroke-width':f===0?5:1}));
  }
  for(let s=0;s<6;s++){
    const y=stringY(s);
    svg.append(el('line',{x1:left-18,y1:y,x2:left+maxFret*step,y2:y,stroke:'#9ca3af','stroke-width':1.1+s*.18}));
    const label=el('text',{x:8,y:y+4,fill:'#9aa1ad','font-size':11,'font-weight':700});label.textContent=`${6-s} 弦 ${fmt(noteAt(s,0))}`;svg.append(label);
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
    const x=cellX(f),y=stringY(s),note=noteAt(s,f);
    const isPrompt=question?.mode==='identify'&&question.position.string===s&&question.position.fret===f;
    const isTarget=showAnswer&&question&&(question.mode==='locate'?question.target===note:question.mode==='identify'?isPrompt:question.mode==='interval'?question.target===note:false);
    const isExploreRoot=question?.mode==='explore'&&note===question.root;
    const isExplore=question?.mode==='explore'&&question.notes.includes(note);
    const active=isPrompt||isTarget||isExplore;
    const clickable=question?.mode==='locate'&&!showAnswer;
    // 认音题面只标记位置，翻答案前不显示音名
    const concealed=isPrompt&&!showAnswer;
    const positionText=`${6-s} 弦，${f===0?'空弦':f+' 品'}`;
    const group=el('g',{class:'fret-cell',tabindex:clickable?'0':'-1',role:clickable?'button':'img','aria-label':`${positionText}${active&&!concealed?'，'+fmt(note):''}`,'aria-disabled':clickable?'false':'true'});
    group.append(el('rect',{class:'cell-hit',x:x-20,y:y-14,width:40,height:28,rx:8,fill:'transparent'}));
    if(active){
      const strong=isPrompt||isExploreRoot;
      group.append(el('circle',{class:'cell-ring',cx:x,cy:y,r:12,fill:strong?'#2e5fdf':'#e5ebfb',stroke:'none'}));
      const txt=el('text',{class:'cell-label',x,y:y+4,'text-anchor':'middle',fill:strong?'#fff':'#4169cd'});
      txt.textContent=concealed?'?':fmt(note);group.append(txt);
    }else group.append(el('circle',{cx:x,cy:y,r:3,fill:'#b2b8c2'}));
    if(clickable){
      group.addEventListener('click',()=>onSelect({string:s,fret:f}));
      group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect({string:s,fret:f});}});
    }
    svg.append(group);
  }
  container.append(svg);
}
