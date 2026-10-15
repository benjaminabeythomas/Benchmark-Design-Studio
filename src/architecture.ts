import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import type { SceneState } from './state';
import { makePalette,contactTexture } from './materials';
export interface Hinge {id:string;group:THREE.Group;kind:'door'|'drawer';closed:number;open:number;}
export interface Interior {root:THREE.Group;roof:THREE.Group;hinges:Hinge[];lights:THREE.PointLight[];glow:THREE.MeshStandardMaterial;water:THREE.Group;dispose:()=>void;}
export function createInterior(s:SceneState):Interior {
 const root=new THREE.Group(),roof=new THREE.Group(),water=new THREE.Group(),p=makePalette(s),hinges:Hinge[]=[],lights:THREE.PointLight[]=[];
 root.name='Editable architectural interior';root.add(roof,water);
 const mesh=(geo:THREE.BufferGeometry,mat:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=root,action?:string)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;if(action)m.userData.action=action;parent.add(m);return m;};
 const box=(w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material,parent:THREE.Object3D=root,action?:string,r=.008)=>mesh(r>0?new RoundedBoxGeometry(w,h,d,1,Math.min(r,w/3,h/3,d/3)):new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent,action);
 const cyl=(rt:number,rb:number,h:number,x:number,y:number,z:number,mat:THREE.Material,parent:THREE.Object3D=root,action?:string)=>mesh(new THREE.CylinderGeometry(rt,rb,h,32),mat,x,y,z,parent,action);
 const sphere=(r:number,x:number,y:number,z:number,mat:THREE.Material,parent:THREE.Object3D=root)=>mesh(new THREE.SphereGeometry(r,24,16),mat,x,y,z,parent);
 const tube=(points:number[][],radius:number,mat:THREE.Material,parent:THREE.Object3D=root,action?:string)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),32,radius,8,false),mat,0,0,0,parent,action);
 const shadow=(x:number,z:number,w:number,d:number)=>{const m=mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:contactTexture(),transparent:true,depthWrite:false}),x,.016,z);m.rotation.x=-Math.PI/2;m.castShadow=false;return m;};
 const vessel=(profile:number[][],x:number,y:number,z:number,mat:THREE.Material,scale: [number,number,number]=[1,1,1])=>{const m=mesh(new THREE.LatheGeometry(profile.map(v=>new THREE.Vector2(v[0],v[1])),48),mat,x,y,z);m.scale.set(...scale);return m;};
 const bowl=(x:number,y:number,z:number,r=.21)=>vessel([[0,0],[r*.45,0],[r*.9,.065],[r,.105],[r*.96,.11],[r*.82,.073],[r*.36,.025],[0,.025]],x,y,z,p.ceramic);
 const light=(x:number,y:number,z:number,power:number)=>{const l=new THREE.PointLight(0xffd59b,power,6,2);l.position.set(x,y,z);l.userData.power=power;root.add(l);lights.push(l);};
 function cabinet(id:string,w:number,h:number,x:number,y:number,z:number,drawer=false,d=.61){
  // Hollow carcass: opened fronts reveal actual shelves instead of a solid box.
  box(w,.035,d,x,y-h/2,z,p.wood);box(w,.035,d,x,y+h/2,z,p.wood);
  box(.026,h,d,x-w/2+.013,y,z,p.wood);box(.026,h,d,x+w/2-.013,y,z,p.wood);box(w,h,.025,x,y,z-d/2,p.wood);
  if(h>.5)box(w,.022,d-.04,x,y-.07,z,p.wood);
  const group=new THREE.Group();group.position.set(x-w/2,y,z+d/2+.009);root.add(group);group.userData.action=id;
  box(w-.018,h-.018,.028,w/2,0,0,p.wood,group,id,.003);
  box(drawer?w*.28:.014,drawer?.014:.18,.025,drawer?w/2:w-.065,0,.032,p.brass,group,id,.004);
  if(drawer){box(w-.09,.02,.44,w/2,-h/2+.038,-.23,p.walnut,group,id);box(.025,h*.6,.44,.065,-.03,-.23,p.walnut,group,id);box(.025,h*.6,.44,w-.065,-.03,-.23,p.walnut,group,id);}
  hinges.push({id,group,kind:drawer?'drawer':'door',closed:drawer?group.position.z:0,open:drawer?group.position.z+.38:-Math.PI*.56});
 }
 function faucet(x:number,y:number,z:number){
  tube([[x,y,z],[x,y+.28,z],[x,y+.36,z+.065],[x,y+.35,z+.17],[x,y+.28,z+.2]],.018,p.brass,root,'tap');
  cyl(.032,.04,.045,x,y+.025,z,p.brass,root,'tap');box(.065,.012,.022,x+.045,y+.13,z,p.brass,root,'tap');
  const liquid=new THREE.MeshPhysicalMaterial({color:0xd7f2f0,transparent:true,opacity:.37,roughness:.15,metalness:.05,depthWrite:false});
  cyl(.007,.011,.3,x,y+.115,z+.2,liquid,water);water.userData.action='tap';
 }
 function plant(x:number,z:number,scale=1){
  const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);root.add(g);
  vessel([[.16,0],[.2,.02],[.23,.42],[.22,.45],[.19,.45],[.16,.4]],0,0,0,p.terracotta).removeFromParent();
  const pot=new THREE.Mesh(new THREE.CylinderGeometry(.24,.18,.45,32),p.terracotta);pot.position.y=.225;pot.castShadow=true;g.add(pot);
  const dirt=new THREE.Mesh(new THREE.CylinderGeometry(.205,.205,.015,24),p.dark);dirt.position.y=.439;g.add(dirt);
  tube([[0,.4,0],[.025,1.05,.02],[-.04,1.65,0],[.09,2.05,.02]],.018,p.walnut,g);
  const leaves=new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,5),p.green,85),dummy=new THREE.Object3D();
  for(let i=0;i<85;i++){const a=i*2.399,h=.95+(i%19)/19*1.15,r=.15+Math.sin(i*4.17)**2*.43;dummy.position.set(Math.cos(a)*r,h,Math.sin(a)*r);dummy.rotation.set(i*.17,a,.6);dummy.scale.set(.035,.095,.013);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);if(i%12===0)tube([[0,.8,0],[Math.cos(a)*r*.65,h-.12,Math.sin(a)*r*.65],[Math.cos(a)*r,h,Math.sin(a)*r]],.005,p.walnut,g);}
  leaves.castShadow=true;g.add(leaves);shadow(x,z,.95*scale,.95*scale);
 }
 // Architecture: a genuine glazed opening, limewashed walls and finely jointed limestone.
 box(7.25,.15,7.3,0,-.1,.12,p.floor);
 for(let x=0;x<6;x++)for(let z=0;z<6;z++)box(1.194,.025,1.194,-3+x*1.2,0,-2.85+z*1.2,p.floor,root,undefined,.002);
 box(7.25,3.22,.16,0,1.57,-3.43,p.plaster);box(.18,3.22,.65,-3.54,1.57,-3.03,p.plaster);
 box(.18,.19,6.45,-3.54,3.08,.42,p.plaster);box(.18,.1,6.45,-3.54,.02,.42,p.stone);
 for(const z of [-2.72,-.72,1.28,3.35])box(.065,2.96,.055,-3.48,1.54,z,p.dark);
 box(.07,.055,6.15,-3.48,2.97,.32,p.dark);box(.07,.055,6.15,-3.48,.13,.32,p.dark);
 const glass=box(.014,2.81,6.05,-3.5,1.54,.32,p.glass);glass.castShadow=false;
 // Exterior courtyard gives the windows depth rather than an opaque blue rectangle.
 box(3.3,.08,7.1,-5.22,-.055,.12,p.floor);box(.15,1.4,7.1,-6.8,.63,.12,p.plaster);
 for(let i=0;i<9;i++)box(.1,.12,2.8,-5.1,2.95,-3+i*.8,p.walnut,root,undefined,0).rotation.y=Math.PI/2;
 plant(-5.4,-1.1,1.25);plant(-5.9,2.1,.82);
 box(7.2,.13,7.2,0,3.25,.05,p.plaster,roof);
 box(6.95,.016,.045,0,3.1,-3.25,p.glow,roof, 'lights');box(.045,.016,6.8,-3.3,3.1,.1,p.glow,roof,'lights');
 box(7,.055,.018,0,.05,-3.325,p.dark);box(.014,.045,6.1,-3.36,.04,.26,p.dark);
 if(s.room==='kitchen'){
  // A fitted wall with full-height joinery, a stone niche and recessed appliance stack.
  cabinet('pantry',1.02,2.63,-2.83,1.36,-2.985);
  for(let i=0;i<5;i++){const x=-1.89+i*.8;if(i===2){for(let j=0;j<3;j++)cabinet('drawer-'+j,.795,.252,x,.22+j*.27,-2.995,true);}else cabinet('cupboard-'+i,.795,.81,x,.47,-2.995);}
  box(4.12,.052,.735,-.29,.91,-2.95,p.stone);box(4.14,1.75,.055,-.29,1.79,-3.3,p.stone);
  box(4.08,.034,.235,-.29,2.19,-3.17,p.walnut);box(4,.012,.018,-.29,2.16,-3.04,p.glow,root,'lights');
  cabinet('fridge',1.14,1.38,2.64,.755,-2.985);cabinet('appliance-top',1.14,.64,2.64,2.35,-2.985);
  box(1.14,.49,.625,2.64,1.705,-2.975,p.dark);box(.95,.38,.035,2.64,1.705,-2.65,p.glass);box(.7,.025,.05,2.64,1.81,-2.604,p.brass);
  for(const x of [2.25,3.03])cyl(.026,.026,.026,x,1.92,-2.61,p.brass).rotation.x=Math.PI/2;
  box(.71,.015,.48,-1.32,.947,-2.92,p.dark);for(const x of [-1.49,-1.14])for(const z of [-3.04,-2.8]){const ring=mesh(new THREE.TorusGeometry(.095,.003,8,32),p.brass,x,.958,z);ring.rotation.x=-Math.PI/2;}
  box(.61,.011,.41,.89,.943,-2.93,p.dark);box(.49,.013,.31,.89,.949,-2.93,p.brass);box(.44,.014,.26,.89,.952,-2.93,p.dark);faucet(.89,.95,-3.18);
  // Layered styling: grain, ceramic silhouettes and greenery, all real geometry.
  for(let i=0;i<3;i++){const board=box(.21,.35,.015,-1.95+i*.06,1.11,-3.265,p.walnut);board.rotation.z=-.13+i*.1;}
  vessel([[.055,0],[.085,.08],[.075,.19],[.045,.26],[.045,.29]],1.42,.95,-3.11,p.terracotta);
  for(let i=0;i<3;i++)tube([[1.42,1.2,-3.11],[1.4+i*.04,1.45,-3.1],[1.32+i*.12,1.57,-3.08]],.004,p.green);
  const jar=vessel([[.06,0],[.09,.025],[.095,.16],[.07,.21],[.04,.24]],-.2,2.21,-3.12,p.ceramic);jar.scale.setScalar(.8);
  for(let i=0;i<3;i++)box(.23,.022,.13,.2,2.225+i*.023,-3.13,i===1?p.linen:p.terracotta);
  if(s.island.enabled){
   const {width:w,depth:d,height:h}=s.island;
   box(w-.18,h-.12,d-.13,0,(h-.12)/2+.05,.12,p.wood);box(w+.14,.065,d+.2,0,h,.12,p.stone,root,undefined,.012);
   for(const x of [-w/2-.015,w/2+.015])box(.07,h-.015,d+.19,x,h/2,.12,p.stone);
   const n=Math.max(2,Math.round(w/.55));for(let i=0;i<n;i++)cabinet('island-'+i,(w-.16)/n,h-.17,-(w-.16)/2+(i+.5)*(w-.16)/n,(h-.16)/2+.07,.12+d/2-.135,false,.12);
   shadow(0,.12,w+1.1,d+1.3);
   for(const x of [-w*.27,w*.27]){
    const z=.12+d/2+.66;
    cyl(.235,.225,.07,x,.67,z,p.linen);const back=mesh(new THREE.TorusGeometry(.23,.033,10,40,Math.PI),p.walnut,x,.9,z);back.rotation.x=Math.PI/2;
    for(const dx of [-.16,.16])for(const dz of [-.15,.15])tube([[x+dx*1.18,.025,z+dz*1.18],[x+dx,.63,z+dz]],.019,p.walnut);
    tube([[x-.16,.68,z+.15],[x-.17,.87,z+.18],[x+.17,.87,z+.18],[x+.16,.68,z+.15]],.017,p.walnut);box(.31,.014,.018,x,.26,z+.18,p.brass);shadow(x,z,.9,.9);
   }
   bowl(-w*.25,h+.034,.15,.23);for(let i=0;i<4;i++)sphere(.044,-w*.25+Math.cos(i*2.4)*.083,h+.099,.15+Math.sin(i*2.4)*.07,p.terracotta);
   box(.36,.019,.23,w*.27,h+.048,.16,p.walnut);vessel([[.035,0],[.035,.1],[.032,.1],[.03,.02],[0,.02]],w*.27,h+.065,.16,p.ceramic);
  }
  // Sculptural linear pendant: frosted globes and brushed bronze, not flat cones.
  const lamp=new THREE.Group();root.add(lamp);
  for(const x of [-.76,.76])cyl(.007,.007,.53,x,2.88,.12,p.dark,lamp);
  box(1.98,.034,.034,0,2.59,.12,p.brass,lamp,'lights');
  for(const x of [-.77,0,.77]){cyl(.022,.022,.12,x,2.54,.12,p.brass,lamp,'lights');const globe=sphere(.125,x,2.42,.12,p.glow,lamp);globe.userData.action='lights';light(x,2.25,.12,4.5);}
  light(-.2,2.05,-2.75,4);plant(2.85,1.3,.88);
 }else{
  // Spa bathroom: twin floating vanity, curved basins, actual mirror reflections and shower niche.
  for(let i=0;i<3;i++)cabinet('vanity-'+i,.745,.48,-2.52+i*.75,.62,-2.99,true,.57);
  box(2.37,.055,.72,-1.77,.9,-2.985,p.stone);shadow(-1.77,-2.65,3,1.7);
  for(const x of [-2.38,-1.2]){
   vessel([[0,0],[.13,0],[.24,.11],[.255,.15],[.241,.154],[.218,.112],[.11,.028],[0,.028]],x,.93,-2.96,p.ceramic);faucet(x,.94,-3.21);
   const ring=mesh(new THREE.TorusGeometry(.515,.018,12,64),p.brass,x,1.97,-3.32);
   const mirror=new Reflector(new THREE.CircleGeometry(.503,64),{color:0xc9c8c0,textureWidth:512,textureHeight:512,clipBias:.003});mirror.position.set(x,1.97,-3.31);root.add(mirror);ring.name='Bronze mirror frame';
   light(x,2.13,-3.04,2.5);
  }
  box(.05,.56,.08,-.48,1.97,-3.22,p.brass);box(.06,.5,.045,-.48,1.97,-3.155,p.glow,root,'lights');
  box(1.76,.055,2.12,2.44,.025,-2.18,p.stone);
  const partition=box(.018,2.55,2.15,1.49,1.29,-2.18,p.glass);partition.castShadow=false;box(.018,2.55,.025,1.5,1.29,-1.1,p.brass);
  const door=new THREE.Group();door.position.set(1.5,0,-1.09);root.add(door);
  const pane=box(1.83,2.55,.018,.915,1.29,0,p.glass,door,'shower-door');pane.castShadow=false;box(.02,.35,.03,1.65,1.32,.033,p.brass,door,'shower-door');hinges.push({id:'shower-door',group:door,kind:'door',closed:0,open:-1.25});
  box(.45,.67,.04,2.5,1.52,-3.325,p.dark);box(.41,.61,.035,2.5,1.53,-3.291,p.stone);box(.39,.009,.065,2.5,1.81,-3.24,p.glow);
  for(let i=0;i<2;i++){cyl(.038,.038,.145,2.41+i*.13,1.3,-3.235,p.terracotta);cyl(.016,.016,.03,2.41+i*.13,1.39,-3.235,p.brass);}
  tube([[3,.3,-3.3],[3,2.55,-3.3],[3,2.61,-2.91]],.013,p.brass);box(.29,.019,.29,3,2.58,-2.88,p.brass);cyl(.035,.035,.04,3,1.2,-3.26,p.brass).rotation.x=Math.PI/2;
  // Hollow bathtub with continuous rolled rim; not a rectangular block.
  vessel([[.35,0],[.45,.03],[.51,.19],[.56,.49],[.56,.56],[.535,.58],[.508,.557],[.468,.2],[.32,.09],[0,.09]],-.48,.05,.5,p.ceramic,[1.95,1,1]);
  shadow(-.48,.5,3.2,1.8);box(.22,.036,1.12,-.24,.64,.5,p.walnut);box(.16,.016,.28,-.24,.67,.6,p.linen);bowl(-.24,.668,.22,.066);
  tube([[-1.69,.04,.35],[-1.69,.9,.35],[-1.62,.98,.35],[-1.47,.97,.35],[-1.47,.9,.35]],.021,p.brass,root,'tap');
  const rug=box(1.17,.021,1.52,1.4,.025,1.6,p.linen,root,undefined,.02);rug.rotation.y=.04;
  cyl(.28,.22,.44,-2.38,.23,.6,p.walnut);for(let i=0;i<3;i++)box(.4,.043,.22,-2.38,.49+i*.045,.6,p.linen,root,undefined,.017);plant(-2.76,2.5,.75);
 }
 // Entry joinery remains hinged; the open front is a camera cutaway, not a locked wall.
 const entry=new THREE.Group();entry.position.set(3.47,0,-2.2);entry.rotation.y=Math.PI/2;root.add(entry);
 box(.95,2.8,.038,.475,1.4,0,p.wood,entry,'entry-door');box(.016,.22,.032,.82,1.1,.035,p.brass,entry,'entry-door');hinges.push({id:'entry-door',group:entry,kind:'door',closed:Math.PI/2,open:.12});
 const dispose=()=>{const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();root.traverse(o=>{if(o instanceof Reflector){o.getRenderTarget().dispose();}if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const mat of Array.isArray(o.material)?o.material:[o.material])materials.add(mat);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());};
 return {root,roof,hinges,lights,glow:p.glow,water,dispose};
}
