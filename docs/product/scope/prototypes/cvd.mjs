const B={barren:'#a08aa6',ocean:'#2f7fe0',reef:'#1fc6c0',icesheet:'#bfe8ff',springs:'#5ed1b8',meadow:'#8fd65a',forest:'#2f9e4f',jungle:'#1f8a3b',mountain:'#8a7f8d',highland:'#7fa36a',desert:'#e6c170',savanna:'#d9b84a',tundra:'#dfe9f2',taiga:'#5f9a7f',swamp:'#6f8a4a',marsh:'#4f8f5a',volcano:'#d9533b'};
const lin=c=>{c/=255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4};
const gam=c=>{c=Math.max(0,Math.min(1,c));return c<=0.0031308?12.92*c:1.055*c**(1/2.4)-0.055};
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
// Machado 2009 severity 1.0
const M={deutan:[[0.367322,0.860646,-0.227968],[0.280085,0.672501,0.047413],[-0.011820,0.042940,0.968881]],
protan:[[0.152286,1.052583,-0.204868],[0.114503,0.786281,0.099216],[-0.003882,-0.048116,1.051998]],
tritan:[[1.255528,-0.076749,-0.178779],[-0.078411,0.930809,0.147602],[0.004733,0.691367,0.303900]],
none:[[1,0,0],[0,1,0],[0,0,1]]};
function sim(h,m){const l=hex(h).map(lin);return M[m].map(r=>gam(r[0]*l[0]+r[1]*l[1]+r[2]*l[2]));}
function lab(rgb){const [r,g,b]=rgb.map(v=>lin(v*255));let X=(r*0.4124+g*0.3576+b*0.1805)/0.95047,Y=r*0.2126+g*0.7152+b*0.0722,Z=(r*0.0193+g*0.1192+b*0.9505)/1.08883;const f=t=>t>0.008856?Math.cbrt(t):7.787*t+16/116;return [116*f(Y)-16,500*(f(X)-f(Y)),200*(f(Y)-f(Z))];}
// CIEDE2000
function de00(a,b){const [L1,a1,b1]=a,[L2,a2,b2]=b;const C1=Math.hypot(a1,b1),C2=Math.hypot(a2,b2),Cm=(C1+C2)/2;const G=0.5*(1-Math.sqrt(Cm**7/(Cm**7+25**7)));const a1p=a1*(1+G),a2p=a2*(1+G);const C1p=Math.hypot(a1p,b1),C2p=Math.hypot(a2p,b2);const h=(x,y)=>{let v=Math.atan2(y,x)*180/Math.PI;return v<0?v+360:v};const h1=h(a1p,b1),h2=h(a2p,b2);const dL=L2-L1,dC=C2p-C1p;let dh=h2-h1;if(C1p*C2p===0)dh=0;else if(dh>180)dh-=360;else if(dh<-180)dh+=360;const dH=2*Math.sqrt(C1p*C2p)*Math.sin(dh*Math.PI/360);const Lm=(L1+L2)/2,Cpm=(C1p+C2p)/2;let hm=h1+h2;if(C1p*C2p!==0){if(Math.abs(h1-h2)>180)hm+=hm<360?360:-360;hm/=2}const T=1-0.17*Math.cos((hm-30)*Math.PI/180)+0.24*Math.cos(2*hm*Math.PI/180)+0.32*Math.cos((3*hm+6)*Math.PI/180)-0.2*Math.cos((4*hm-63)*Math.PI/180);const SL=1+0.015*(Lm-50)**2/Math.sqrt(20+(Lm-50)**2),SC=1+0.045*Cpm,SH=1+0.015*Cpm*T;const dT=30*Math.exp(-(((hm-275)/25)**2));const RC=2*Math.sqrt(Cpm**7/(Cpm**7+25**7));const RT=-Math.sin(2*dT*Math.PI/180)*RC;return Math.sqrt((dL/SL)**2+(dC/SC)**2+(dH/SH)**2+RT*(dC/SC)*(dH/SH));}
const ids=Object.keys(B);
for(const m of ['none','deutan','protan','tritan']){const bad=[];for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const d=de00(lab(sim(B[ids[i]],m)),lab(sim(B[ids[j]],m)));if(d<8)bad.push(`${ids[i]}/${ids[j]} ${d.toFixed(1)}`);}console.log(m,bad.length,'pairs dE00<8:',bad.join(', '));}
