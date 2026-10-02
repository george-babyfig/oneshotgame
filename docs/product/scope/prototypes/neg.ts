import { makeLevel, greedyPlan, NOVA_CHARGE } from './levels.ts';
import { impact, clonePlanet, lifeScore, SECTORS, novaCharge, KINDS } from './world.ts';
// walk greedy play through levels, at each throw enumerate all 24 sectors for the dealt kind
const kinds = Object.keys(KINDS);
const acc: Record<string, {n:number,neg:number,zero:number,pos:number,lostCreature:number,minDelta:number, worst:number}> = {};
let throws=0;
const spread: number[] = []; const nearBest: number[] = []; const bestUnique: number[] = []; const bestVsMedian: number[] = [];
const swapGain: number[] = [];
const bestWidth: number[] = [];
for (let n=1;n<=60;n++){
  const L = makeLevel(n);
  const p = clonePlanet(L.start);
  let charge = 0;
  for (let t=0;t<L.throws;t++){
    const kind = L.queue[t];
    const boost = {nova: charge>=NOVA_CHARGE};
    const deltas: number[] = [];
    let best=-1e9,bestAt=0;
    for (let i=0;i<SECTORS;i++){
      const q = clonePlanet(p);
      const r = impact(q, kind, i, 0, boost);
      const d = r.after-r.before;
      deltas.push(d);
      const a = (acc[kind] ??= {n:0,neg:0,zero:0,pos:0,lostCreature:0,minDelta:0,worst:0});
      a.n++; if (d<0) a.neg++; else if (d===0) a.zero++; else a.pos++;
      if (r.lost.length) a.lostCreature++;
      a.minDelta = Math.min(a.minDelta,d);
      if (r.after>best){best=r.after;bestAt=i;}
    }
    const bd = Math.max(...deltas);
    const sorted=[...deltas].sort((a,b)=>a-b);
    const med = sorted[12];
    bestVsMedian.push(bd-med);
    nearBest.push(deltas.filter(d=>d>=bd*0.9).length);
    bestWidth.push(deltas.filter(d=>d===bd).length);
    throws++;
    const res = impact(p, kind, bestAt, 0, boost);
    charge = boost.nova?0:Math.min(NOVA_CHARGE,charge+novaCharge(res.changed.length,res.spawned.length));
  }
}
console.log('throws simulated', throws);
for (const [k,a] of Object.entries(acc)) console.log(k, 'options',a.n,'neg%',(100*a.neg/a.n).toFixed(1),'zero%',(100*a.zero/a.n).toFixed(1),'pos%',(100*a.pos/a.n).toFixed(1),'creature-loss options%',(100*a.lostCreature/a.n).toFixed(1),'worst',a.minDelta);
const avg=(x:number[])=>x.reduce((a,b)=>a+b,0)/x.length;
console.log('avg sectors within 90% of best delta', avg(nearBest).toFixed(2), ' avg #sectors tied at best', avg(bestWidth).toFixed(2), ' avg best-minus-median', avg(bestVsMedian).toFixed(1));
