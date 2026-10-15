import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { SceneState } from './state';
export const materialColors = {oak:0xb58d60,walnut:0x594232,sage:0x8b9983,ivory:0xe3ded1,charcoal:0x343a36};
export class StudioScene {
 scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(45,1,.05,100); renderer:THREE.WebGLRenderer; controls:OrbitControls;
 root=new THREE.Group(); ray=new THREE.Raycaster(); mode:'orbit'|'walk'='orbit'; keys=new Set<string>(); state!:SceneState;
 private down=[0,0]; private drag=false; private yaw=0; private pitch=0; private last=0;
 constructor(private host:HTMLElement, private interact:(id:string)=>void){
 this.renderer=new THREE.WebGLRenderer({antialias:true}); this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;host.appendChild(this.renderer.domElement);
 this.scene.background=new THREE.Color('#e8e5dc');this.scene.add(this.root);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.maxPolarAngle=Math.PI*.49;this.controls.minDistance=2;this.controls.maxDistance=15;this.home();
 new ResizeObserver(()=>this.resize()).observe(host); this.resize();
 const canvas=this.renderer.domElement;canvas.addEventListener('pointerdown',e=>{this.down=[e.clientX,e.clientY];this.drag=true;});window.addEventListener('pointerup',()=>{this.drag=false;});canvas.addEventListener('pointermove',e=>{if(this.mode==='walk'&&this.drag){this.yaw-=e.movementX*.004;this.pitch=THREE.MathUtils.clamp(this.pitch-e.movementY*.004,-1.1,1.1);}});
 canvas.addEventListener('click',e=>{if(Math.hypot(e.clientX-this.down[0],e.clientY-this.down[1])>6)return;const r=canvas.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);const hit=this.ray.intersectObjects(this.root.children,true).find(x=>x.object.userData.action);if(hit)this.interact(hit.object.userData.action);});
 window.addEventListener('keydown',e=>{if((e.target as HTMLElement).matches('input,textarea,select'))return;this.keys.add(e.key.toLowerCase());if(this.mode==='walk'&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();});window.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>this.keys.clear());requestAnimationFrame(t=>this.frame(t));
 }
 resize(){const {width,height}=this.host.getBoundingClientRect();this.renderer.setSize(width,height);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();}
 home(){this.camera.position.set(7.6,5.8,8.5);this.controls.target.set(0,.65,0);this.controls.update();}
 setMode(mode:'orbit'|'walk'){this.mode=mode;this.controls.enabled=mode==='orbit';if(mode==='walk'){this.camera.position.set(0,1.65,3.25);this.yaw=0;this.pitch=-.05;}else this.home();}
 frame(t:number){const dt=Math.min((t-this.last)/1000,.04);this.last=t;if(this.mode==='walk'){let x=Number(this.keys.has('d')||this.keys.has('arrowright'))-Number(this.keys.has('a')||this.keys.has('arrowleft'));let z=Number(this.keys.has('s')||this.keys.has('arrowdown'))-Number(this.keys.has('w')||this.keys.has('arrowup'));let speed=dt*2.2;const next=this.camera.position.clone();next.x+=(x*Math.cos(this.yaw)+z*Math.sin(this.yaw))*speed;next.z+=(-x*Math.sin(this.yaw)+z*Math.cos(this.yaw))*speed;next.x=THREE.MathUtils.clamp(next.x,-3.05,3.05);next.z=THREE.MathUtils.clamp(next.z,-2.05,3.05);if(!(this.state?.room==='kitchen'&&this.state.island.enabled&&Math.abs(next.x)<this.state.island.width/2+.22&&Math.abs(next.z-.5)<this.state.island.depth/2+.22))this.camera.position.copy(next);this.camera.rotation.order='YXZ';this.camera.rotation.set(this.pitch,this.yaw,0);}else this.controls.update();this.renderer.render(this.scene,this.camera);requestAnimationFrame(t=>this.frame(t));}
 build(s:SceneState){this.state=s;while(this.root.children.length){const item=this.root.children[0];this.root.remove(item);item.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
 const mat=(color:number,roughness=.65,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});const wood=mat(materialColors[s.material]),stone=mat(s.style==='moody'?0xaca99f:0xf0eee5,.3),wall=mat(s.style==='moody'?0x777b72:0xe7e2d6),brass=mat(0xa78b50,.28,.72),black=mat(0x252923,.4),white=mat(0xf6f5ee,.18);
 const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material,parent:THREE.Object3D=this.root,action?:string)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;if(action)mesh.userData.action=action;parent.add(mesh);return mesh;};
 const cylinder=(rt:number,rb:number,h:number,x:number,y:number,z:number,m:THREE.Material)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,32),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;this.root.add(mesh);return mesh;};
 const opened=(id:string)=>s.opened[id]??s.opened['*']??false;
 const front=(id:string,w:number,h:number,x:number,y:number,z:number,drawer=false)=>{const group=new THREE.Group();group.position.set(x-w/2,y,z);if(drawer)group.position.z+=opened(id)?.48:0;else group.rotation.y=opened(id)?-Math.PI*.55:0;this.root.add(group);box(w-.035,h-.025,.045,w/2,0,0,wood,group,id);box(drawer?w*.4:.018,.018,drawer?.035:.16,drawer?w/2:w-.09,drawer?0:0,.045,brass,group,id);if(drawer){box(w-.12,.1,.5,w/2,-h/2+.04,-.25,wood,group,id);}};
 // Architectural shell: cutaway walls keep the entire room inspectable.
 box(7,.14,6.5,0,-.1,.15,mat(0xc6b89e));for(let x=-3.4;x<3.5;x+=.22)box(.008,.006,6.45,x,-.025,.15,mat(0xad9d83));
 box(7,3.1,.12,0,1.5,-3.05,wall);box(.12,3.1,6.3,-3.5,1.5,.05,wall);
 box(.08,1.9,2.8,-3.42,1.9,-.45,mat(0xb7cbd0));for(const z of [-1.85,-.45,.95])box(.12,2.05,.06,-3.35,1.9,z,white);box(.13,.06,2.9,-3.35,1.9,-.45,white);box(.24,.09,3,-3.3,.92,-.45,stone);
 box(7,.09,.08,0,.02,-2.96,stone);box(.07,.09,6.3,-3.4,.02,.05,stone);
 if(s.room==='kitchen'){
 for(let i=0;i<6;i++){const x=-2.55+i*.85;box(.84,.84,.65,x,.44,-2.57,wood);if(i===3){for(let j=0;j<3;j++)front(`drawer-${j}`,.84,.27,x,.17+j*.27,-2.22,true);}else front(`cupboard-${i}`,.84,.82,x,.44,-2.22);}
 box(5.2,.075,.79,-.42,.91,-2.53,stone);box(5.2,.65,.06,-.42,1.28,-2.96,stone);
 for(let i=0;i<4;i++){const x=-2.55+i*.85;box(.84,.74,.36,x,2.12,-2.79,wood);front(`upper-${i}`,.84,.72,x,2.12,-2.58);}
 box(.95,1.87,.76,2.55,.95,-2.53,black);front('fridge',.92,1.8,2.55,1,-2.12);
 box(.78,.025,.48,-1.65,.96,-2.48,black);for(let x of [-1.85,-1.45])for(let z of [-2.62,-2.35])cylinder(.115,.115,.018,x,.98,z,mat(0x454741));
 box(.72,.03,.46,.85,.97,-2.48,mat(0x8c9490,.2,.8));box(.58,.035,.33,.85,.98,-2.48,black);cylinder(.025,.025,.35,.85,1.12,-2.72,brass);box(.03,.03,.2,.85,1.29,-2.63,brass);
 if(s.island.enabled){const {width:w,depth:d,height:h}=s.island;box(w-.13,h-.09,d-.13,0,(h-.09)/2,.5,wood);box(w+.09,.08,d+.09,0,h,.5,stone);for(let i=0;i<Math.max(2,Math.round(w/.55));i++){const n=Math.max(2,Math.round(w/.55));front(`island-${i}`,w/n,h-.14,-w/2+(i+.5)*w/n,(h-.1)/2,.5+d/2-.055);}for(let x of [-w*.28,w*.28]){cylinder(.23,.23,.07,x,.63,.5+d/2+.64,wood);for(let dx of [-.14,.14])for(let dz of [-.14,.14])box(.035,.6,.035,x+dx,.3,.5+d/2+.64+dz,black);}}
 for(let x of [-.7,.7]){cylinder(.015,.015,.6,x,2.7,.5,black);cylinder(.27,.1,.22,x,2.3,.5,brass);const bulb=cylinder(.21,.21,.014,x,2.18,.5,new THREE.MeshStandardMaterial({color:0xffedd0,emissive:0xffd49a,emissiveIntensity:s.lights?2:0}));bulb.userData.action='lights';}
 // Ceramic bowl, chopping board, stems, and original procedural decor.
 cylinder(.23,.1,.12,-.6,s.island.enabled?s.island.height+.11:.99,s.island.enabled?.5:-2.4,white);box(.38,.025,.23,-2.5,.97,-2.5,wood);cylinder(.13,.1,.3,-2.7,1.1,-2.65,mat(0xc0b4a0));for(let i=0;i<5;i++){const stem=cylinder(.008,.008,.45,-2.7+(i-2)*.035,1.45,-2.65,mat(0x62745b));stem.rotation.z=(i-2)*.15;}
 }else{
 box(2.25,.55,.58,-1.9,.65,-2.6,wood);for(let i=0;i<3;i++)front(`vanity-${i}`,.74,.52,-2.65+i*.75,.65,-2.28,true);box(2.4,.065,.68,-1.9,.96,-2.6,stone);for(let x of [-2.5,-1.35]){cylinder(.24,.18,.13,x,1.05,-2.55,white);cylinder(.02,.02,.25,x,1.15,-2.85,brass);}box(2.3,1,.04,-1.9,1.85,-2.96,mat(0xb5c8c6,.05,.8));
 box(1.7,.15,2.1,2.35,.05,-1.8,stone);const glass=new THREE.MeshPhysicalMaterial({color:0xd8e6df,transparent:true,opacity:.23,roughness:.05,metalness:0,side:THREE.DoubleSide});box(.025,2.25,2.1,1.47,1.2,-1.8,glass);const door=new THREE.Group();door.position.set(1.48,0,-.72);door.rotation.y=opened('shower-door')?-1.3:0;this.root.add(door);box(1.7,2.25,.025,.85,1.2,0,glass,door,'shower-door');box(.02,.4,.04,1.5,1.25,.035,brass,door,'shower-door');box(.04,2,.04,2.8,1.1,-2.96,brass);box(.35,.025,.35,2.65,2.15,-2.8,brass);
 box(1.9,.58,.9,-1,.34,.7,white);box(1.67,.035,.67,-1,.65,.7,mat(0x9eada9));box(.04,.5,.04,-2.15,.5,.7,brass);box(.3,.03,.03,-2.03,.76,.7,brass);box(.8,.02,1.6,1.9,.005,1.4,mat(0xc9b99e));
 }
 // Entry door is independently hinged in both rooms.
 const door=new THREE.Group();door.position.set(3.35,0,-2.95);door.rotation.y=opened('entry-door')?-Math.PI*.45:0;this.root.add(door);box(.07,2.4,.94,0,1.2,.47,wood,door,'entry-door');box(.12,.025,.16,-.06,1.05,.78,brass,door,'entry-door');
 this.root.add(new THREE.HemisphereLight(0xfff5df,0x8b8d80,2.1));const sun=new THREE.DirectionalLight(0xffedcf,4);sun.position.set(-5,7,3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-7;sun.shadow.camera.right=7;sun.shadow.camera.top=7;sun.shadow.camera.bottom=-7;sun.shadow.normalBias=.035;this.root.add(sun);if(s.lights){for(let x of [-.7,.7]){const light=new THREE.PointLight(0xffd494,12,7,2);light.position.set(x,2.1,.5);this.root.add(light);}}
 }
}
