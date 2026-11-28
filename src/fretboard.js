import {noteAt,midiAt,formatNote,formatMidi,NATURAL_NOTES,writtenOctaveOf} from './music-theory.js';

const NS='http://www.w3.org/2000/svg';
const el=(name,attrs={})=>{
  const node=document.createElementNS(NS,name);
  for(const [key,value] of Object.entries(attrs)) node.setAttribute(key,String(value));
  return node;
};

// 用独立的圆点画简谱八度：上点高八度、下点低八度，比组合字符更清晰
function appendSolfegePitch(group,{x,baseline,note,midi,fill,fontSize,halo=false}){
  const label=el('text',{
    class:'cell-label',
    x,
    y:baseline,
    'text-anchor':'middle',
    fill,
    'font-size':fontSize,
    'font-weight':700
  });
  if(halo){
    label.setAttribute('stroke','#f7f8fb');
    label.setAttribute('stroke-width','2.4');
    label.setAttribute('paint-order','stroke');
  }
  label.textContent=formatNote(note);
  group.append(label);
  const shift=writtenOctaveOf(midi)-4;
  if(!shift) return;
  const radius=Math.max(1.3,fontSize*.13);
  const gap=Math.max(3,fontSize*.32);
  const count=Math.abs(shift);
  for(let index=0;index<count;index++){
    const cy=shift>0
      ?baseline-fontSize*.88-index*gap
      :baseline+fontSize*.22+index*gap;
    group.append(el('circle',{class:'octave-dot',cx:x,cy,r:radius,fill}));
  }
}

const MARK_STYLES={
  hidden:{fill:'#eef3ff',stroke:'#2e5fdf','stroke-width':1.4,dash:'4 3',text:'#2e5fdf'},
  target:{fill:'#2e5fdf',stroke:'none',text:'#fff'},
  note:{fill:'#e7eeff',stroke:'none',text:'#3157c8'},
  root:{fill:'#1f49b8',stroke:'none',text:'#fff'},
  selected:{fill:'#dcebff',stroke:'#2e5fdf','stroke-width':2,text:'#1d4dbd'},
  wrong:{fill:'#fdeceb',stroke:'#c05256','stroke-width':1.6,text:'#c05256'}
};

export function drawFretboard(container,{
  maxFret,
  showAllNotes=false,
  marks=[],
  onSelect=null,
  actionLabel='试听'
}={}){
  container.replaceChildren();
  const left=108,top=34,right=24,bottom=22;
  const step=maxFret===5?102:54,stringStep=30;
  const width=left+maxFret*step+right,height=top+5*stringStep+bottom;
  // 抱琴视角：1 弦在最上方，6 弦在最下方
  const stringY=string=>top+(5-string)*stringStep;
  const cellX=fret=>fret===0?left-36:left+(fret-.5)*step;
  const svg=el('svg',{viewBox:`0 0 ${width} ${height}`,role:'group','aria-label':`吉他指板，空弦到第 ${maxFret} 品，1 弦在最上方`});

  svg.append(el('rect',{x:left,y:top-17,width:maxFret*step,height:5*stringStep+34,rx:13,fill:'#f7f8fb'}));
  for(let f=0;f<=maxFret;f++){
    const x=left+f*step;
    svg.append(el('line',{x1:x,y1:top-17,x2:x,y2:top+5*stringStep+17,stroke:f===0?'#808690':'#dfe2e9','stroke-width':f===0?5:1}));
  }
  for(let s=0;s<6;s++){
    const y=stringY(s);
    svg.append(el('line',{x1:left-18,y1:y,x2:left+maxFret*step,y2:y,stroke:'#9ca3af','stroke-width':1.1+s*.18}));
    const label=el('text',{x:6,y:y+4,fill:'#9aa1ad','font-size':10.5,'font-weight':700});
    label.textContent=`${6-s} 弦`;
    svg.append(label);
  }
  for(let f=0;f<=maxFret;f++){
    if([3,5,7,9,12].includes(f)){
      const dotX=left+(f-.5)*step;
      svg.append(el('circle',{cx:dotX,cy:top+2.5*stringStep,r:f===12?5:4,fill:'#d3d9e4'}));
    }
  }

  const markMap=new Map(marks.map(mark=>[`${mark.string}:${mark.fret}`,mark]));
  const cells=new Map();
  let rovingAssigned=false;

  for(let s=0;s<6;s++) for(let f=0;f<=maxFret;f++){
    const x=cellX(f),y=stringY(s);
    const mark=markMap.get(`${s}:${f}`);
    const note=noteAt(s,f);
    const midi=midiAt(s,f);
    const accidental=!NATURAL_NOTES.includes(note);
    const positionText=`${6-s} 弦，${f===0?'空弦':f+' 品'}`;
    const visibleLabel=mark?.label||(showAllNotes&&!accidental?formatMidi(midi):null);
    const ariaParts=[positionText];
    if(visibleLabel&&mark?.kind!=='hidden') ariaParts.push(visibleLabel);
    if(onSelect) ariaParts.push(`点击${actionLabel}`);
    const group=el('g',{
      class:'fret-cell',
      role:onSelect?'button':'img',
      tabindex:onSelect?(rovingAssigned?-1:0):'-1',
      'data-string':s,
      'data-fret':f,
      'aria-label':ariaParts.join('，')
    });
    if(!rovingAssigned&&onSelect) rovingAssigned=true;

    group.append(el('rect',{class:'cell-hit',x:x-20,y:y-14,width:40,height:28,rx:8,fill:'transparent'}));

    if(mark){
      const style=MARK_STYLES[mark.kind]||MARK_STYLES.note;
      const ring=el('circle',{class:'cell-ring',cx:x,cy:y,r:12.5,fill:style.fill,stroke:style.stroke,'stroke-width':style['stroke-width']||0});
      if(style.dash) ring.setAttribute('stroke-dasharray',style.dash);
      group.append(ring);
      if(mark.kind==='hidden'||mark.kind==='wrong'){
        const text=mark.kind==='hidden'?'?':(mark.label||'✕');
        const label=el('text',{class:'cell-label',x,y:y+3.6,'text-anchor':'middle',fill:style.text,'font-size':text.length>2?9:10.5});
        label.textContent=text;
        group.append(label);
      }else{
        appendSolfegePitch(group,{x,baseline:y+3.6,note,midi,fill:style.text,fontSize:10.5});
      }
    }else if(showAllNotes&&!accidental){
      appendSolfegePitch(group,{
        x,
        baseline:y+3,
        note,
        midi,
        fill:'#8b93a1',
        fontSize:maxFret===5?12:10.5,
        halo:true
      });
    }else{
      group.append(el('circle',{cx:x,cy:y,r:3,fill:'#b2b8c2'}));
    }

    if(onSelect){
      group.addEventListener('click',()=>{
        group.classList.add('is-ringing');
        setTimeout(()=>group.classList.remove('is-ringing'),260);
        onSelect({string:s,fret:f,midi,note});
      });
      group.addEventListener('focus',()=>{
        for(const other of cells.values()) other.setAttribute('tabindex','-1');
        group.setAttribute('tabindex','0');
      });
      group.addEventListener('keydown',event=>{
        const moves={
          ArrowUp:[1,0],ArrowDown:[-1,0],
          ArrowLeft:[0,-1],ArrowRight:[0,1]
        };
        if(event.key==='Enter'||event.key===' '){
          event.preventDefault();
          onSelect({string:s,fret:f,midi,note});
          return;
        }
        if(event.key==='Home'||event.key==='End'){
          event.preventDefault();
          const target=cells.get(`${s}:${event.key==='Home'?0:maxFret}`);
          target?.focus();
          return;
        }
        const move=moves[event.key];
        if(!move) return;
        event.preventDefault();
        const nextString=Math.min(5,Math.max(0,s+move[0]));
        const nextFret=Math.min(maxFret,Math.max(0,f+move[1]));
        cells.get(`${nextString}:${nextFret}`)?.focus();
      });
    }
    cells.set(`${s}:${f}`,group);
    svg.append(group);
  }
  container.append(svg);
}
