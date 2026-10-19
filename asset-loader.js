// Keep completed images on retry. A missing image must not trap the player forever.
export function loadImage(src,{ImageClass=globalThis.Image,timeout=25000}={}){
  return new Promise((resolve,reject)=>{
    const img=new ImageClass();let timer;
    const finish=(error)=>{clearTimeout(timer);img.onload=img.onerror=null;error?reject(error):resolve(img);};
    img.onload=()=>finish();img.onerror=()=>finish(new Error(src));
    timer=setTimeout(()=>finish(new Error(`Timeout: ${src}`)),timeout);
    img.src=src;
  });
}
export async function loadAssets(files,{cache=new Map(),concurrency=6,load=loadImage,onProgress=()=>{},onAsset=()=>{}}={}){
  const unique=[...new Set(files)],pending=unique.filter(file=>!cache.has(file)),failed=[];
  let cursor=0,complete=unique.length-pending.length;
  onProgress(complete,unique.length);
  await Promise.all(Array.from({length:Math.min(concurrency,pending.length)},async()=>{
    while(cursor<pending.length){
      const file=pending[cursor++];
      try{
        const img=await load(`assets/${file}${file==='race-cats-back.png'?'?v=clean-edges-1':''}`);
        cache.set(file,img);complete++;onAsset(file,img);onProgress(complete,unique.length);
      }catch{failed.push(file);}
    }
  }));
  return {cache,failed};
}
