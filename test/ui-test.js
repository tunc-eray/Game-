// Arayuz duman testi: buton/tus/pointer akisi (tarayici dali) sahte DOM ile.
// Calistirma: npm run test:ui
const fs=require('fs');
const m={exports:{}};new Function('module','exports',fs.readFileSync(require('path').join(__dirname,'..','vendor','three.min.js'),'utf8'))(m,m.exports);
const handlers={};
class FakeRenderer{constructor(){this.domElement={style:{},addEventListener:(t,f)=>{handlers[t]=f},getContext:()=>null,getBoundingClientRect:()=>({left:0,top:0,width:960,height:600})}}setPixelRatio(){}setSize(){}render(s,c){s.updateMatrixWorld();c.updateMatrixWorld()}}
const THREE=Object.assign({},m.exports,{WebGLRenderer:FakeRenderer});
const els={};
const mkEl=(id)=>{const e={id,style:{},classList:{contains:()=>false,toggle(){},add(){}},children:[],appendChild(){},prepend(){},innerHTML:'',textContent:'',firstChild:{style:{},textContent:''},scrollTop:0,remove(){},disabled:false,getContext:()=>null,addEventListener:(t,f)=>{e['on'+t]=f},dataset:{}};return e};
const doc={getElementById:(id)=>(els[id]=els[id]||mkEl(id)),createElement:()=>mkEl('tmp'),createTextNode:()=>mkEl('txt'),body:mkEl('body')};
const globalH={};
let clock=0,LOOP=null;
const fn=new Function('THREE','document','window','setTimeout','clearTimeout','requestAnimationFrame','innerWidth','innerHeight','devicePixelRatio','addEventListener','performance','location','URLSearchParams','fetch','WebSocket','KART_BROKERS',
 fs.readFileSync(require('path').join(__dirname,'..','game.js'),'utf8')+'\nreturn {G,cards,start,take,doAct,drawBtn,held,DK,avatars,REAL_CANVAS};');
const Q=[];
const I=fn(THREE,doc,{},(f,ms)=>{Q.push({f,t:clock+(ms||0)});return f},(h)=>{for(let i=Q.length-1;i>=0;i--)if(Q[i].f===h)Q.splice(i,1)},f=>{LOOP=f},960,600,1,(t,f)=>{globalH[t]=f},{now:()=>clock},{protocol:'http:',origin:'http://x',search:''},URLSearchParams,undefined,undefined,[]);
const step=(n)=>{for(let i=0;i<n;i++){clock+=16;LOOP&&LOOP();if(Q.length){Q.sort((a,b)=>a.t-b.t);while(Q.length&&Q[0].t<=clock){const e=Q.shift();e.f()}}}};
step(3);
const res=[];
res.push(['REAL_CANVAS',I.REAL_CANVAS]);
res.push(['oyun otomatik basladi',!I.G.over && I.G.n===2]);
res.push(['elim 5 kart',I.held(0).length===5]);
res.push(['sirada ben',I.G.my && I.G.cur===0]);
res.push(['"Cek" butonu aktif',els.btnDraw && els.btnDraw.disabled===false]);
res.push(['"Al" butonu pasif',els.btnKeep.disabled===true]);
els.btnDraw.onclick(); step(30);
res.push(['kart cekildi',I.G.card!=null && I.DK.target===1]);
res.push(['deste kirildi',I.DK.c>0.9]);
res.push(['"Al" butonu aktif',els.btnKeep.disabled===false]);
els.btnKeep.onclick(); step(40);
res.push(['kart ele geldi (6)',I.held(0).length===6]);
res.push(['deste duzlesti',I.DK.c<0.05]);
res.push(['sira bilgisayarda',!I.G.my]);
// tus testi: sira bize gelene kadar bekle
let guard=0; while(!I.G.my && !I.G.over && guard++<400){ step(10); }
res.push(['tekrar sira bende',I.G.my||I.G.over]);
if(I.G.my){ globalH.keydown({key:' ',preventDefault(){}}); step(6); res.push(['bosluk ile cekildi',I.G.card!=null]); globalH.keydown({key:'2',preventDefault(){}}); step(40); res.push(['2 ile ortaya atildi',I.G.mid!=null && I.G.mid.from===0]); }
// kart tiklamasi (raycast) - sadece hata vermemeli
if(handlers.pointerdown){ try{ handlers.pointerdown({clientX:480,clientY:300}); res.push(['pointerdown hata yok',true]); }catch(e){ res.push(['pointerdown HATA: '+e.message,false]); } }
res.push(['avatar gorunur',I.avatars[1].visible]);
let bad=res.filter(r=>r[1]===false);
res.forEach(r=>console.log((r[1]===false?'FAIL ':'ok   ')+r[0]));
console.log(bad.length?('SORUN: '+bad.length):'DOM testi ok');
