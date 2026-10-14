import { makeLevel, NOVA_CHARGE } from './levels.ts';
import { impact, clonePlanet, SECTORS, novaCharge, KINDS } from './world.ts';
const agg: Record<string,{n:number,best:number,dead:number,late:number,lateBest:number}> = {};
let deadAll=0,total=0; const bestShare:number[]=[];
for(let n=6;n<=60;n++){const L=makeLevel(n);const p=clonePlanet(L.start);let charge=0;
 for(let t=0;t<L.throws;t++){const kind=L.queue[t];const boost={nova:charge>=NOVA_CHARGE};let best=-1e9,at=0,bd=-1e9;
  for(let i=0;i<SECTORS;i++){const q=clonePlanet(p);const r=impact(q,kind,i,0,boost);const d=r.after-r.before;if(r.after>best+ -1e9 && d>bd){bd=d;at=i;best=r.after}}
  const a=(agg[kind]??={n:0,best:0,dead:0,late:0,lateBest:0}); a.n++;a.best+=bd; if(bd<=3)a.dead++; if(t>=L.throws/2){a.late++;a.lateBest+=bd}
  total++; if(bd<=3)deadAll++;
  const res=impact(p,kind,at,0,boost);charge=boost.nova?0:Math.min(NOVA_CHARGE,charge+novaCharge(res.changed.length,res.spawned.length));}}
for(const [k,a] of Object.entries(agg)) console.log(k.padEnd(6),'throws',a.n,'avg best gain',(a.best/a.n).toFixed(1),'dead(<=+3) %',(100*a.dead/a.n).toFixed(0),'avg best gain in 2nd half',(a.lateBest/a.late).toFixed(1));
console.log('overall dead throws %',(100*deadAll/total).toFixed(0));
