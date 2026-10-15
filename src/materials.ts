import * as THREE from 'three';
import type { SceneState } from './state';

// Original, seeded surface maps. No remote texture requests or copied reference assets.
const maps = new Map<string, THREE.CanvasTexture>();
function noise(seed = 719) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; }; }
function surface(kind: 'wood'|'stone'|'plaster'|'linen') {
  if (maps.has(kind)) return maps.get(kind)!;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!; const rng = noise();
  ctx.fillStyle = kind === 'wood' ? '#ddd1bb' : kind === 'stone' ? '#eee9df' : '#eeeae2'; ctx.fillRect(0,0,512,512);
  const image = ctx.getImageData(0,0,512,512);
  for(let i=0;i<image.data.length;i+=4) { const n=(rng()-.5)*(kind==='linen'?28:14); for(let c=0;c<3;c++) image.data[i+c]+=n; }
  ctx.putImageData(image,0,0);
  if(kind==='wood') {
    for(let x=0;x<512;x+=1.4) {
      ctx.strokeStyle=`rgba(76,52,30,${.025+rng()*.18})`; ctx.lineWidth=.35+rng()*.9; ctx.beginPath();
      for(let y=0;y<=512;y+=4) { const a=x+Math.sin(y*.009+x*.04)*3+Math.sin(y*.025+x*.028)*1.3; if(y===0)ctx.moveTo(a,y); else ctx.lineTo(a,y); } ctx.stroke();
    }
  } else if(kind==='stone') {
    for(let k=0;k<24;k++) {
      const start=rng()*800-150; ctx.beginPath();
      for(let y=0;y<=512;y+=3){const x=start+y*.36+Math.sin(y*.013+k)*17+Math.sin(y*.055+k)*2.5;if(y===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
      ctx.strokeStyle=`rgba(108,98,77,${k%4===0?.17:.06})`;ctx.lineWidth=k%4===0?2:.5;ctx.stroke();
    }
    for(let k=0;k<900;k++){ctx.fillStyle=`rgba(108,94,72,${rng()*.1})`;ctx.fillRect(rng()*512,rng()*512,rng()*4+.3,.6);}
  } else if(kind==='linen') {
    ctx.strokeStyle='rgba(112,98,78,.13)';ctx.lineWidth=.5;
    for(let i=0;i<512;i+=3){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,512);ctx.moveTo(0,i);ctx.lineTo(512,i);ctx.stroke();}
  }
  const texture = new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;maps.set(kind,texture);return texture;
}
function material(color:THREE.ColorRepresentation,kind?:'wood'|'stone'|'plaster'|'linen',roughness=.65,metalness=0){
  const map=kind?surface(kind):null;
  let bump:THREE.Texture|null=null;
  if(kind){const key=kind+'-bump';if(!maps.has(key)){const t=map!.clone();t.colorSpace=THREE.NoColorSpace;maps.set(key,t);}bump=maps.get(key)!;}
  return new THREE.MeshStandardMaterial({color,map,bumpMap:bump,bumpScale:kind==='stone'?.008:kind==='wood'?.007:.003,roughness,metalness,envMapIntensity:.65});
}
export function makePalette(state:SceneState){
 const colors={oak:0xb39570,walnut:0x72543b,sage:0x8b9782,ivory:0xe8e0d0,charcoal:0x3e413b};
 const wooden=state.material==='oak'||state.material==='walnut';
 return {
  wood:material(colors[state.material],wooden?'wood':'plaster',.48),
  walnut:material(0x886c4b,'wood',.5),
  stone:material(state.style==='moody'?0xb4ada0:state.style==='minimal'?0xf2eee5:0xe0cfb3,'stone',.32),
  floor:material(state.style==='moody'?0xbdb4a4:0xd6cbb7,'stone',.76),
  plaster:material(state.style==='moody'?0x9c9b8c:0xece6da,'plaster',.88),
  dark:material(0x292a25,undefined,.32),
  brass:material(0xc1a36e,undefined,.3,.82),
  ceramic:material(0xf1eee5,undefined,.2),
  linen:material(0xd9cebb,'linen',.95),
  terracotta:material(0xad896e,'plaster',.92),
  green:material(0x657652,undefined,.87),
  glass:new THREE.MeshPhysicalMaterial({color:0xdce6df,transparent:true,opacity:.13,roughness:.08,metalness:.02,side:THREE.DoubleSide,depthWrite:false}),
  glow:new THREE.MeshStandardMaterial({color:0xffedcf,emissive:0xffcf8b,emissiveIntensity:2.1,roughness:.35}),
 };
}
export type Palette=ReturnType<typeof makePalette>;
export function contactTexture(){
 if(maps.has('contact'))return maps.get('contact')!;
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d')!;
 const g=x.createRadialGradient(64,64,6,64,64,63);g.addColorStop(0,'rgba(40,31,20,.28)');g.addColorStop(.5,'rgba(40,31,20,.16)');g.addColorStop(1,'rgba(40,31,20,0)');x.fillStyle=g;x.fillRect(0,0,128,128);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;maps.set('contact',t);return t;
}
