const COST_K=[0,1,2.5,6,14,30];
const B={mill:[150,3],den:[250,2],greenhouse:[600,2],tower:[900,1],grove:[2000,2],observatory:[2500,1]};
const bc=(c,lv)=>Math.round(c*COST_K[lv]/10)*10;
let total=0;const per={};
for(const [k,[c,m]] of Object.entries(B)){let s=0;for(let lv=1;lv<=5;lv++)s+=bc(c,lv);per[k]=[s,s*m,m];total+=s*m;}
console.log(per,'total buildings to max all',total);
const decor={fountain:[300,2],lantern:[200,3],flowers:[400,3]};let d=0;for(const [k,[c,m]] of Object.entries(decor))d+=c*m;console.log('decor dust',d,'+statue 120 gems');
const RING_COST=[0,0,1500,5000,12000,30000];console.log('rings',RING_COST.reduce((a,b)=>a+b));
const M=60e3,H=3600e3;const BT=[0,30e3,5*M,30*M,2*H,4*H];
console.log('build time to max one building h',(BT.reduce((a,b)=>a+b))/H);
// plots per ring 6,8,10,12,14 ; building count capacity
const slots={mill:3,den:2,greenhouse:2,tower:1,grove:2,observatory:1};console.log('structures',Object.values(slots).reduce((a,b)=>a+b),'decor',2+3+3+1,'total slots',14);
// mill rates
const R=[0,40,70,110,160,230];console.log('3 mills L5/hr',3*230, 'cap 6h+obs L5*2=16h ->',3*230*16);
// production caps
console.log('mill L1 cap 6h =',40*6,'; L5 obs5 cap16h=',230*16);
// galaxy rate example
const pr=(stars,sp)=>6+stars*3+sp*2;
for(const n of [10,30,60]) console.log(n,'planets @3stars,3species ->',n*pr(3,3),'/hr');
// lab sinks
const lab=[400,1200,3000,7000].reduce((a,b)=>a+b);console.log('lab per kind',lab,'x6',lab*6);
// gem rate from groves
const G=[0,1/6,1/5,1/4,1/3,1/2.5];console.log('2 grove L5 gems/day (cap 16h => ',2*Math.floor(16/2.5),'per collect)', 'per 24h',2*24/2.5*1);
// expedition loot
for(const h of [1,4,8]) for(const t of [1,3,5]) console.log('exp',h,'towerLv',t,Math.round(h*120*(1+t*0.1)));
// friendship gems
let g=0;for(let l=1;l<=5;l++)g+=5*l;console.log('best-friend gems per species total',g,'(rewarded starts at 1 so ',g-5,')');
// ring dust to ring 5 + all
