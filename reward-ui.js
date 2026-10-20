import {AD_SECONDS,RewardSession} from './economy.js?v=revive-6';
const CREATIVES={
  wallet:{title:'小猫零食铺',line:'今天的小鱼干，已到货。',file:'fish-snack.png',theme:'mint'},
  picker:{title:'午后软垫屋',line:'给午睡留个好位置。',file:'cushion-side.png',theme:'peach'},
  result:{title:'猫猫玩具屋',line:'下次捣蛋，也要开心。',file:'duck-side.png',theme:'yellow'},
  revive:{title:'小猫加油站',line:'休息一下，再接着玩。',file:'fish-snack.png',theme:'mint'},
};
// Self-contained ad simulator. No network, SDK, redirect, tracking or real ad revenue.
export function bindRewardAd(root,{onOpen=()=>{},onClose=()=>{}}={}){
  const el=root.querySelector('#reward-ad'),get=id=>root.querySelector('#'+id);
  let session=null,callback=null,previousFocus=null,inertStates=[],last=0,raf=0,amount=0,reviving=false;
  function paint(){
    const left=Math.max(0,Math.ceil(AD_SECONDS-session.elapsed)),ready=session.ready;
    get('ad-countdown').textContent=ready?'体验完成':`${left} 秒`;
    get('ad-progress').value=session.elapsed;
    get('ad-claim').disabled=!ready;
    get('ad-claim').textContent=reviving?(ready?'复活继续':'看完后复活'):(ready?`领取 +${amount} 金币`:`完成后领取 +${amount} 金币`);
  }
  function close(){
    if(!session)return;
    session.cancel();session=null;callback=null;cancelAnimationFrame(raf);el.hidden=true;
    for(const [node,value] of inertStates)node.inert=value;
    inertStates=[];onClose();previousFocus?.focus?.({preventScroll:true});
  }
  function tick(now){
    if(!session)return;
    session.advance((now-last)/1000,!document.hidden);last=now;paint();
    raf=requestAnimationFrame(tick);
  }
  get('ad-close').onclick=close;
  get('ad-claim').onclick=()=>{
    if(session?.claim(callback))close();
  };
  // Escape closes the simulator; keyboard focus never falls into the game behind it.
  document.addEventListener('keydown',e=>{
    if(!session)return;
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return;}
    if(e.key==='Tab'){
      const buttons=[get('ad-close'),get('ad-claim')].filter(b=>!b.disabled);
      const index=buttons.indexOf(document.activeElement);
      e.preventDefault();buttons[(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();
    }
    e.stopImmediatePropagation();
  },true);
  return {
    get isOpen(){return !!session;},
    open({placement,coins,onClaim}){
      if(session||!CREATIVES[placement]||(placement!=='revive'&&!(coins>0)))return false;
      const creative=CREATIVES[placement];reviving=placement==='revive';amount=coins;callback=onClaim;session=new RewardSession();
      previousFocus=document.activeElement;
      inertStates=[...root.children].filter(node=>node!==el).map(node=>[node,node.inert]);
      for(const [node] of inertStates)node.inert=true;
      el.dataset.theme=creative.theme;get('ad-title').textContent=creative.title;
      get('ad-copy').textContent=creative.line;get('ad-prop').src=`assets/${creative.file}`;
      el.hidden=false;paint();onOpen();get('ad-close').focus({preventScroll:true});
      last=performance.now();raf=requestAnimationFrame(tick);return true;
    },close
  };
}
