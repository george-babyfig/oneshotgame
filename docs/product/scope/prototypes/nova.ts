import { makeLevel, NOVA_CHARGE } from './levels.ts';
import { impact, clonePlanet, lifeScore, SECTORS, novaCharge } from './world.ts';
// gain of a nova vs same throw without nova, greedy, levels 3..60; and kind distribution of charge
let cnt=0, gainSum=0, plainSum=0, firedAt:number[]=[]; let lvlWithNova=0, levels=0; const chargePerThrow:number[]=[];
for(let n=3;n<=60;n++){const L=makeLevel(n);const p=clonePlanet(L.start);let charge=0;let any=false;levels++;
 for(let t=0;t<L.throws;t++){const kind=L.queue[t];const boost={nova:charge>=NOVA_CHARGE};let best=-1e9,at=0;
  for(let i=0;i<SECTORS;i++){const q=clonePlanet(p);const r=impact(q,kind,i,0,boost);if(r.after>best){best=r.after;at=i}}
  if(boost.nova){const a=clonePlanet(p);const rn=impact(a,kind,at,0,{nova:true});
   let bp=-1e9;for(let i=0;i<SECTORS;i++){const q=clonePlanet(p);const r=impact(q,kind,i,0,{});bp=Math.max(bp,r.after-r.before)}
   cnt++;gainSum+=rn.after-rn.before;plainSum+=bp;firedAt.push(t);any=true;}
  const res=impact(p,kind,at,0,boost);const c=novaCharge(res.changed.length,res.spawned.length);chargePerThrow.push(c);
  charge=boost.nova?0:Math.min(NOVA_CHARGE,charge+c);}
 if(any)lvlWithNova++;}
console.log('novas fired',cnt,'in',levels,'levels; levels with >=1 nova',lvlWithNova,'avg nova gain',(gainSum/cnt).toFixed(1),'avg best plain gain same throw',(plainSum/cnt).toFixed(1),'avg throw index fired',(firedAt.reduce((a,b)=>a+b,0)/cnt).toFixed(1));
const avgc=chargePerThrow.reduce((a,b)=>a+b,0)/chargePerThrow.length;console.log('avg charge per greedy throw',avgc.toFixed(2),'=> throws to fill', (10/avgc).toFixed(1));
