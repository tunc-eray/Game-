// Sahne testi: GERÇEK three.js (vendor/three.min.js) ile oyunun 3B kodunu çalıştırır (yalnızca ekran çizicisi sahte).
// Kıvrılan deste kartı, ortaya atılan kartın konumu, uçuş animasyonları ve sayısal hatalar (NaN) denetlenir.
const fs=require("fs"),path=require("path");
const vend=path.join(__dirname,"..","vendor","three.min.js");
if(!fs.existsSync(vend)){console.log({sahne:"atlandı (vendor/three.min.js yok: npm run vendor)"});process.exit(0)}
const m={exports:{}};new Function("module","exports",fs.readFileSync(vend,"utf8"))(m,m.exports);
class FakeRenderer{constructor(){this.domElement={addEventListener(){},style:{}}}setPixelRatio(){}setSize(){}render(s,c){s.updateMatrixWorld();c.updateMatrixWorld()}}
const THREE=Object.assign({},m.exports,{WebGLRenderer:FakeRenderer});
const js=fs.readFileSync(process.env.GAME||path.join(__dirname,"..","game.js"),"utf8");
const ctx=()=>new Proxy(function(){},{apply:()=>ctx(),get:(t,k)=>k===Symbol.toPrimitive?()=>0:ctx(),set:()=>true});
const mkEl=e=>Object.assign({style:{},classList:{contains:()=>false,toggle(){},add(){}},appendChild(){},prepend(){},innerHTML:"",textContent:"",firstChild:{style:{},textContent:""},scrollTop:0,remove(){},getContext:()=>ctx(),addEventListener(){},dataset:{}},e);
const pick=a=>a[Math.floor(Math.random()*a.length)];
let clock=0;const Q=[];let LOOP=null;
(async()=>{const res={};let bad=[];
 const doc={getElementById:()=>mkEl(),createElement:()=>mkEl(),createTextNode:()=>mkEl(),body:mkEl()};
 const fn=new Function("THREE","document","window","setTimeout","clearTimeout","requestAnimationFrame","innerWidth","innerHeight","devicePixelRatio","addEventListener","performance","location","URLSearchParams","fetch","WebSocket","KART_BROKERS",
  js+"\nreturn {start,closeHow,drawBtn,take,doAct,grab,held,get G(){return G},get midC(){return midC},get DK(){return DK},get tw(){return tw},get scene(){return scene},get cards(){return cards}}");
 for(const N of [2,3,4])for(let g=0;g<2;g++){
  Q.length=0;clock=0;LOOP=null;
  const I=fn(THREE,doc,{},(f,ms)=>{const e={f,t:clock+ms};Q.push(e);return e},e=>{const i=Q.indexOf(e);if(i>=0)Q.splice(i,1)},f=>{LOOP=f},1000,600,1,()=>{},{now:()=>clock},{protocol:"file:",origin:"null",search:""},URLSearchParams,undefined,undefined,[]);
  I.start(N);I.closeHow();
  const frame=()=>{clock+=16;LOOP&&LOOP()};
  const scan=()=>{I.scene.traverse(o=>{const p=o.position;if(p&&(isNaN(p.x+p.y+p.z)||Math.abs(p.y)>50))bad.push("NaN/uzak konum")});const a=I.G&&I.G.dkt?I.G.dkt.userData.geo.attributes.position.array:[];for(let i=0;i<a.length;i++)if(isNaN(a[i])){bad.push("kıvrım NaN");break}};
  let steps=0,peekSeen=0,flatSeen=0,midOk=0,midBad=0,flights=0;
  const geoMax=()=>{const a=I.G.dkt.userData.geo.attributes.position.array;let mx=-9,mn=9,zmx=-9;for(let i=0;i<a.length;i+=3){mx=Math.max(mx,a[i+1]);mn=Math.min(mn,a[i+1]);zmx=Math.max(zmx,a[i+2])}return {mx,mn,zmx}};
  const humanAct=()=>{const G=I.G;if(G.over)return;
   if(G.card!=null&&G.cur==0){ // deste kıvrımını gözle, sonra karar ver
     for(let k=0;k<40;k++)frame();const q=geoMax();if(I.DK.c>.98&&q.mx>.03&&q.mn>-1e-6&&q.zmx<.36+1e-6)peekSeen++;else bad.push("kıvrım beklenen gibi değil "+JSON.stringify(q)+" c="+I.DK.c);
     const ch=pick(["al","at","geri"]);I.take(ch);for(let k=0;k<45;k++)frame();
     if(ch==="at"){const p=I.midC&&I.midC.position;(p&&Math.abs(p.y-1.12)<.011&&Math.abs(p.z-.16)<.011&&Math.abs(p.x-.04)<.011)?midOk++:bad.push("ortadaki kart yerine oturmadı")}
     if(ch==="geri"){const q2=geoMax();q2.mx<1e-3?flatSeen++:bad.push("kıvrım geri açılmadı "+q2.mx)}
     if(ch==="al"){I.held(0).every(i=>Math.abs(I.cards[i].position.z-2.0)<.011&&Math.abs(I.cards[i].position.y-1.19)<.011)?flights++:bad.push("alınan kart elime oturmadı")}
     return}
   if(G.mid&&G.mid.from!=0&&Math.random()<.25){I.grab(0,G.mid.c);return}
   if(G.my){const r=Math.random(),hd=I.held(0);if(r<.3&&G.deck.length&&!G.drew&&G.card==null)I.drawBtn();else if(hd.length&&r<.6)I.doAct(pick(hd));else I.doAct(null)}};
  while(steps++<30000&&!I.G.over){
   humanAct();if(!Q.length){for(let k=0;k<40&&!Q.length&&!I.G.over;k++)humanAct();if(!Q.length)break}
   Q.sort((a,b)=>a.t-b.t);const e=Q.shift();while(clock+16<e.t){frame();if(steps%7==0)scan()}clock=Math.max(clock,e.t);e.f();frame();scan();
  }
  for(let k=0;k<60;k++)frame();const q=geoMax();
  const flat=I.DK.c===0?(q.mx<1e-5?1:0):1;
  const k=`${N} kişilik: `+(I.G.over?"oyun bitti":"TAKILDI")+` | kıvrım gözlenen:${peekSeen} | ortaya atılan kart yerine oturdu:${midOk} | geri koyunca düzleşti:${flatSeen} | alınan kart ele oturdu:${flights}`;
  res[k]=(res[k]||0)+1;if(midBad)bad.push("ortadaki kart yanlış yerde "+midBad);if(!I.G.over)bad.push("oyun bitmedi")}
 console.log(res);if(bad.length){console.log("SORUN:",[...new Set(bad)].slice(0,6));process.exit(1)}console.log({sahne:"ok"})})();
