// Prepare licensed mono PCM recordings: trim silence, remove sub-bass, fade, level.
// Usage: node tools/prepare-cat-call.mjs /absolute/input.wav /absolute/output.wav
import fs from 'node:fs';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Expected input and output WAV paths');
const raw=fs.readFileSync(input);
if(raw.toString('ascii',0,4)!=='RIFF'||raw.toString('ascii',8,12)!=='WAVE')throw Error('Expected RIFF WAV');
let rate,data;
for(let p=12;p+8<=raw.length;){
  const type=raw.toString('ascii',p,p+4),size=raw.readUInt32LE(p+4),start=p+8;
  if(type==='fmt '){
    if(raw.readUInt16LE(start)!==1||raw.readUInt16LE(start+2)!==1||raw.readUInt16LE(start+14)!==16)throw Error('Expected mono PCM16');
    rate=raw.readUInt32LE(start+4);
  }
  if(type==='data')data=raw.subarray(start,start+size);
  p=start+size+(size%2);
}
if(!rate||!data)throw Error('Missing audio');
const samples=new Float64Array(data.length/2),a=Math.exp(-2*Math.PI*65/rate);
let prevX=0,prevY=0;
for(let i=0;i<samples.length;i++){
  const x=data.readInt16LE(i*2)/32768,y=a*(prevY+x-prevX);
  samples[i]=y;prevX=x;prevY=y;
}
const block=Math.round(rate*.01),audible=[];
for(let i=0;i<samples.length;i+=block){
  let sum=0;for(let j=i;j<Math.min(i+block,samples.length);j++)sum+=samples[j]**2;
  if(Math.sqrt(sum/block)>.012)audible.push(i);
}
if(!audible.length)throw Error('No audible call');
const start=Math.max(0,audible[0]-Math.round(rate*.015));
const end=Math.min(samples.length,audible.at(-1)+block+Math.round(rate*.045),start+Math.round(rate*1.3));
const call=samples.slice(start,end),fadeIn=Math.round(rate*.008),fadeOut=Math.round(rate*.04);
let peak=0;for(const sample of call)peak=Math.max(peak,Math.abs(sample));
const gain=Math.min(4,.84/peak),pcm=Buffer.alloc(call.length*2);
for(let i=0;i<call.length;i++){
  const fade=Math.min(1,i/fadeIn,(call.length-1-i)/fadeOut);
  pcm.writeInt16LE(Math.round(Math.max(-1,Math.min(1,call[i]*gain*fade))*32767),i*2);
}
const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+pcm.length,4);header.write('WAVE',8);header.write('fmt ',12);
header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);
header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
fs.writeFileSync(output,Buffer.concat([header,pcm]));
console.log(`${output}: ${(call.length/rate).toFixed(3)}s, mono PCM16 ${rate} Hz`);
