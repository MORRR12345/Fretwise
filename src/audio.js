import {frequencyOf} from './music-theory.js';

// 用 Karplus-Strong 物理建模合成拨弦音：短噪声激励 + 延迟线衰减，接近木吉他的音色。
// 所有缓冲区按需生成并缓存，页面不加载任何音频文件。

let context=null;
let master=null;
let enabled=true;
const buffers=new Map();
const voices=new Set();
const CACHE_LIMIT=48;

function ensureContext(){
  if(typeof window==='undefined') return null;
  if(!context){
    const AudioCtor=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtor) return null;
    try{context=new AudioCtor();}catch{return null;}
    master=context.createGain();
    master.gain.value=enabled?.9:0;
    const compressor=context.createDynamicsCompressor();
    compressor.threshold.value=-22;
    compressor.knee.value=20;
    compressor.ratio.value=3;
    compressor.attack.value=.006;
    compressor.release.value=.28;
    const tone=context.createBiquadFilter();
    tone.type='lowpass';tone.frequency.value=4600;tone.Q.value=.4;
    const body=context.createBiquadFilter();
    body.type='peaking';body.frequency.value=200;body.Q.value=.9;body.gain.value=2.5;
    const air=context.createBiquadFilter();
    air.type='highshelf';air.frequency.value=3000;air.gain.value=-4;
    const rumble=context.createBiquadFilter();
    rumble.type='highpass';rumble.frequency.value=80;rumble.Q.value=.5;
    master.connect(compressor).connect(tone).connect(body).connect(air).connect(rumble).connect(context.destination);
  }
  if(context.state==='suspended') context.resume().catch(()=>{});
  return context;
}

function bufferSeconds(midi){
  if(midi<52) return 2.6;
  if(midi<64) return 2;
  return 1.5;
}

// 两拍平均滤波器会带来约一个采样的延迟，这里预先补偿；实测误差在数音分内
function pluckPeriod(sampleRate,midi){
  return Math.max(3,Math.round(sampleRate/frequencyOf(midi)+1));
}

// 独立的合成函数，方便在 Node 测试里检查音色包络与音高
export function renderPluck(sampleRate,midi,seconds=bufferSeconds(midi)){
  const freq=frequencyOf(midi);
  const length=Math.max(1,Math.ceil(sampleRate*seconds));
  const data=new Float32Array(length);
  const period=pluckPeriod(sampleRate,midi);
  const line=new Float32Array(period);

  // 噪声激励：稍强的低通让拨弦音更圆润，减少高频毛刺
  let filtered=0;
  for(let i=0;i<period;i++){
    const white=Math.random()*2-1;
    filtered=filtered*.56+white*.44;
    line[i]=filtered;
  }
  let mean=0;
  for(let i=0;i<period;i++) mean+=line[i];
  mean/=period;
  for(let i=0;i<period;i++) line[i]-=mean;

  // 延迟线平均滤波 + 按频率补偿衰减，保证不同音高都有自然的余音
  const decay=Math.pow(.0009,1/(freq*seconds));
  let index=0;
  for(let n=0;n<length;n++){
    const next=(index+1)%period;
    const value=(line[index]+line[next])*.5*decay;
    line[index]=value;
    data[n]=value;
    index=next;
  }

  // 拨片触弦的瞬态：更软、更短，避免尖锐的点击感
  const attack=Math.min(length,Math.floor(sampleRate*.016));
  let noise=0;
  for(let n=0;n<attack;n++){
    const white=Math.random()*2-1;
    noise=noise*.72+white*.28;
    const envelope=1-n/attack;
    data[n]+=noise*envelope*envelope*envelope*.18;
  }

  // 去首尾爆音并归一化
  const fadeIn=Math.min(length,Math.floor(sampleRate*.0025));
  for(let n=0;n<fadeIn;n++) data[n]*=n/fadeIn;
  const fadeOut=Math.min(length,Math.floor(sampleRate*.05));
  for(let n=0;n<fadeOut;n++) data[length-1-n]*=n/fadeOut;
  let peak=0;
  for(let n=0;n<length;n++) peak=Math.max(peak,Math.abs(data[n]));
  if(peak>0){const scale=.92/peak;for(let n=0;n<length;n++) data[n]*=scale;}
  return data;
}

function buildPluck(audio,midi){
  const data=renderPluck(audio.sampleRate,midi);
  const buffer=audio.createBuffer(1,data.length,audio.sampleRate);
  buffer.copyToChannel(data,0);
  return buffer;
}

function getBuffer(audio,midi){
  let buffer=buffers.get(midi);
  if(buffer) return buffer;
  buffer=buildPluck(audio,midi);
  if(buffers.size>=CACHE_LIMIT){
    const oldest=buffers.keys().next().value;
    buffers.delete(oldest);
  }
  buffers.set(midi,buffer);
  return buffer;
}

export function setSoundEnabled(value){
  enabled=Boolean(value);
  if(!context||!master) return;
  const now=context.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setTargetAtTime(enabled?.9:0,now,.02);
}

export function playNote(midi,{at=0,gain=.5}={}){
  if(!enabled) return;
  const audio=ensureContext();
  if(!audio||!master) return;
  const source=audio.createBufferSource();
  source.buffer=getBuffer(audio,midi);
  const voice=audio.createGain();
  voice.gain.value=gain;
  source.connect(voice).connect(master);
  const startAt=audio.currentTime+Math.max(0,at);
  const entry={source,gain:voice};
  voices.add(entry);
  source.onended=()=>voices.delete(entry);
  source.start(startAt);
}

export function playChord(midis,{at=0,gain=.24,strum=.012}={}){
  const notes=[...midis].sort((a,b)=>a-b);
  notes.forEach((midi,index)=>playNote(midi,{at:at+index*strum,gain}));
}

export function playArpeggioThenChord(midis,{gap=.24,hold=.62}={}){
  const notes=[...midis].sort((a,b)=>a-b);
  if(!notes.length) return;
  notes.forEach((midi,index)=>playNote(midi,{at:index*gap,gain:.34}));
  const chordAt=notes.length*gap+hold;
  notes.forEach((midi,index)=>playNote(midi,{at:chordAt+index*.014,gain:.2}));
}

export function stopAll(){
  if(!context) return;
  const now=context.currentTime;
  for(const voice of voices){
    try{
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setTargetAtTime(0,now,.015);
      voice.source.stop(now+.06);
    }catch{/* 已结束的音源 */ }
  }
  voices.clear();
}
