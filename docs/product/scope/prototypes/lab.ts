import { makeLevel, NOVA_CHARGE } from './levels.ts';
import { impact, clonePlanet, lifeScore, SECTORS, novaCharge, labBonus } from './world.ts';
function run(n:number, lv:number){
  const L = makeLevel(n); const p = clonePlanet(L.start); let charge=0, bonus=0, novas=0;
  for (let t=0;t<L.throws;t++){ const kind=L.queue[t]; const boost={nova:charge>=NOVA_CHARGE}; let best=-1e9,at=0;
    for(let i=0;i<SECTORS;i++){const q=clonePlanet(p);const r=impact(q,kind,i,0,boost);const v=r.after+labBonus(lv,r.changed.length,r.spawned.length); if(v>best){best=v;at=i}}
    const r=impact(p,kind,at,0,boost); bonus+=labBonus(lv,r.changed.length,r.spawned.length); if(boost.nova) novas++; charge=boost.nova?0:Math.min(NOVA_CHARGE,charge+novaCharge(r.changed.length,r.spawned.length,lv)); }
  return {score:lifeScore(p)+bonus, bonus, novas, s3:L.stars[2], s1:L.stars[0]};
}
for (const lv of [1,2,3,4,5]) { let ratio=0,bon=0,nov=0,c=0,over=0; for(let n=6;n<=60;n++){const r=run(n,lv); ratio+=r.score/r.s3; bon+=r.bonus/r.s3; nov+=r.novas; c++; if(r.score>=r.s3) over++;} console.log('lab lv',lv,'avg greedy score/3star',(ratio/c).toFixed(2),'bonus share of 3star target',(bon/c).toFixed(2),'avg novas per level',(nov/c).toFixed(2),'levels where greedy reaches 3*',over,'/',c); }
// how often does greedy nova fire, and nova gain
