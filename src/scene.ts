import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createInterior,type Interior } from './architecture';
import type { SceneState } from './state';
export type ViewMode='interior'|'orbit'|'walk'|'plan';
export class StudioScene {
 readonly scene=new THREE.Scene();readonly camera=new THREE.PerspectiveCamera(49,1,.05,85);readonly renderer:THREE.WebGLRenderer;readonly controls:OrbitControls;
 state!:SceneState;mode:ViewMode='interior';private interior?:Interior;private geometryKey='';private keys=new Set<string>();private yaw=0;private pitch=0;private down=[0,0];private drag=false;private last=0;private frameId=0;private dirty=true;private tween?:{from:THREE.Vector3;to:THREE.Vector3;start:THREE.Vector3;target:THREE.Vector3;t:number;startedAt:number};
 private ray=new THREE.Raycaster();private observer:ResizeObserver;private sun:THREE.DirectionalLight;private fill:THREE.HemisphereLight;private environment:THREE.WebGLRenderTarget;private lighting:'day'|'golden'|'evening'='golden';private abort=new AbortController();
 constructor(private host:HTMLElement,private interact:(id:string)=>void){
  this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.shadowMap.autoUpdate=false;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  host.append(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','Interactive three-dimensional interior');this.renderer.domElement.dataset.visualVersion='atelier-02';
  this.scene.background=new THREE.Color(0xe0ddcf);this.scene.fog=new THREE.Fog(0xe0ddcf,25,65);
  const env=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(this.renderer);this.environment=pmrem.fromScene(env,.04);this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.42;env.dispose();pmrem.dispose();
  this.sun=new THREE.DirectionalLight(0xffe1b1,2.8);this.sun.position.set(-6.7,7,3.4);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.5,far:25});this.sun.shadow.normalBias=.025;this.sun.shadow.bias=-.0001;this.sun.shadow.radius=3;this.scene.add(this.sun);
  this.fill=new THREE.HemisphereLight(0xe5eff9,0x9b8669,.75);this.scene.add(this.fill);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.07;this.controls.minDistance=.8;this.controls.maxDistance=20;this.controls.maxPolarAngle=Math.PI*.49;this.controls.target.set(-.5,1.25,-1.4);this.camera.position.set(2.8,1.95,3.35);this.controls.update();this.controls.addEventListener('change',()=>{this.dirty=true;});
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
  const canvas=this.renderer.domElement,options={signal:this.abort.signal};
  canvas.addEventListener('pointerdown',e=>{this.down=[e.clientX,e.clientY];this.drag=true;this.tween=undefined;},options);window.addEventListener('pointerup',()=>{this.drag=false;},options);
  canvas.addEventListener('pointermove',e=>{if(this.mode==='walk'&&this.drag){this.yaw-=e.movementX*.003;this.pitch=THREE.MathUtils.clamp(this.pitch-e.movementY*.003,-1.2,1.2);this.dirty=true;}},options);
  canvas.addEventListener('click',e=>{if(Math.hypot(e.clientX-this.down[0],e.clientY-this.down[1])>5||!this.interior)return;const r=canvas.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);const hits=this.ray.intersectObject(this.interior.root,true).filter(hit=>{let o:THREE.Object3D|null=hit.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});let object:THREE.Object3D|null=hits[0]?.object||null;while(object&&!object.userData.action)object=object.parent;if(object?.userData.action)this.interact(object.userData.action);},options);
  window.addEventListener('keydown',e=>{if((e.target as HTMLElement).matches('input,textarea,select,[contenteditable]'))return;this.keys.add(e.key.toLowerCase());if(this.mode==='walk'&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();},options);
  window.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()),options);window.addEventListener('blur',()=>this.keys.clear(),options);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();host.dataset.error='Graphics context lost. Reload to restore the studio.';host.removeAttribute('data-ready');},options);
  this.frameId=requestAnimationFrame(t=>this.frame(t));
 }
 resize(){const w=Math.max(1,this.host.clientWidth),h=Math.max(1,this.host.clientHeight);this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.dirty=true;}
 setMode(mode:ViewMode,animate=true){
  this.mode=mode;this.keys.clear();this.controls.enabled=mode!=='walk';this.host.dataset.mode=mode;this.dirty=true;this.renderer.shadowMap.needsUpdate=true;
  if(this.interior)this.interior.roof.visible=mode==='walk'||mode==='interior';
  if(mode==='walk'){this.tween=undefined;this.camera.position.set(2,1.67,2.55);this.yaw=.12;this.pitch=-.04;this.camera.rotation.order='YXZ';return;}
  let position=new THREE.Vector3(2.8,1.95,3.35),target=new THREE.Vector3(-.5,1.25,-1.4);
  if(mode==='orbit'){position.set(8,7,9);target.set(-.4,.6,0);}if(mode==='plan'){position.set(0,13,.02);target.set(0,0,0);}
  if(this.state?.room==='bathroom'&&mode==='interior'){position.set(2.85,2,3.65);target.set(-.6,1.05,-1.15);}
  if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)this.tween={from:this.camera.position.clone(),to:position,start:this.controls.target.clone(),target,t:0,startedAt:performance.now()};else{this.camera.position.copy(position);this.controls.target.copy(target);this.controls.update();}
 }
 home(){this.setMode('interior');}
 setLighting(value:'day'|'golden'|'evening'){this.lighting=value;const night=value==='evening';this.sun.intensity=night?.13:value==='day'?2.5:2.8;this.sun.color.set(value==='day'?0xfff2de:0xffd99f);this.sun.position.set(-6.7,value==='day'?10:5.5,4.3);this.fill.intensity=night?.22:.75;this.scene.environmentIntensity=night?.17:.42;this.scene.background=new THREE.Color(night?0x46525a:0xe0ddcf);if(this.scene.fog instanceof THREE.Fog)this.scene.fog.color.copy(this.scene.background);this.dirty=true;this.renderer.shadowMap.needsUpdate=true;}
 build(state:SceneState){
  const key=JSON.stringify([state.room,state.style,state.material,state.island]);const changedRoom=this.state&&state.room!==this.state.room;this.state=state;this.dirty=true;
  if(key!==this.geometryKey){if(this.interior){this.scene.remove(this.interior.root);this.interior.dispose();}this.interior=createInterior(state);this.scene.add(this.interior.root);this.geometryKey=key;this.interior.roof.visible=this.mode==='interior'||this.mode==='walk';for(const h of this.interior.hinges){const open=state.opened[h.id]??state.opened['*']??false;if(h.kind==='door')h.group.rotation.y=open?h.open:h.closed;else h.group.position.z=open?h.open:h.closed;}this.renderer.shadowMap.needsUpdate=true;if(changedRoom)this.setMode(this.mode);}
 }
 private canWalk(x:number,z:number){
  if(x< -3.17||x>3.15||z< -2.4||z>3.1)return false;
  if(this.state.room==='kitchen'&&this.state.island.enabled){const i=this.state.island;if(Math.abs(x)<i.width/2+.24&&Math.abs(z-.12)<i.depth/2+.25)return false;for(const sx of [-i.width*.27,i.width*.27])if(Math.hypot(x-sx,z-(.12+i.depth/2+.66))<.4)return false;}
  if(this.state.room==='bathroom'&&((Math.abs(x+.48)<1.25&&Math.abs(z-.5)<.8)||(x>1.25&&z<-.8)))return false;return true;
 }
 private frame(t:number){
  // Keep collision steps short, but do not stretch visual transitions when frames are slow.
  const elapsed=Math.max(0,(t-this.last)/1000),dt=Math.min(elapsed,.05),visualDelta=Math.min(elapsed,.5);this.last=t;
  if(this.mode==='walk'){
   let x=Number(this.keys.has('d')||this.keys.has('arrowright'))-Number(this.keys.has('a')||this.keys.has('arrowleft')),z=Number(this.keys.has('s')||this.keys.has('arrowdown'))-Number(this.keys.has('w')||this.keys.has('arrowup'));const n=Math.hypot(x,z)||1;x/=n;z/=n;
   const dx=(x*Math.cos(this.yaw)+z*Math.sin(this.yaw))*dt*1.9,dz=(-x*Math.sin(this.yaw)+z*Math.cos(this.yaw))*dt*1.9;
   if(this.state&&(dx||dz)){if(this.canWalk(this.camera.position.x+dx,this.camera.position.z))this.camera.position.x+=dx;if(this.canWalk(this.camera.position.x,this.camera.position.z+dz))this.camera.position.z+=dz;this.dirty=true;}this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');
  }else{if(this.tween){const tw=this.tween;tw.t=THREE.MathUtils.clamp((t-tw.startedAt)/1150,0,1);const k=tw.t*tw.t*(3-2*tw.t);this.camera.position.lerpVectors(tw.from,tw.to,k);this.controls.target.lerpVectors(tw.start,tw.target,k);this.dirty=true;if(tw.t===1)this.tween=undefined;}this.controls.update();}
  if(this.interior&&this.state){
   for(const h of this.interior.hinges){const on=this.state.opened[h.id]??this.state.opened['*']??false;const target=on?h.open:h.closed;const current=h.kind==='door'?h.group.rotation.y:h.group.position.z;if(Math.abs(current-target)>.0003){const next=THREE.MathUtils.damp(current,target,9,visualDelta);if(h.kind==='door')h.group.rotation.y=next;else h.group.position.z=next;this.dirty=true;this.renderer.shadowMap.needsUpdate=true;}}
   for(const l of this.interior.lights){const target=this.state.lights?l.userData.power*(this.lighting==='evening'?1.6:1):0;if(Math.abs(l.intensity-target)>.002){l.intensity=THREE.MathUtils.damp(l.intensity,target,7,visualDelta);this.dirty=true;}}
   this.interior.glow.emissiveIntensity=this.state.lights?2.1:0;this.interior.water.visible=this.state.opened.tap??false;
  }
  // Static views do not continuously redraw shadows and mirror render targets.
  if(this.dirty&&!document.hidden){this.renderer.render(this.scene,this.camera);this.dirty=false;if(this.host.dataset.ready!=='true')this.host.dataset.ready='true';this.host.dataset.triangles=String(this.renderer.info.render.triangles);}
  this.frameId=requestAnimationFrame(n=>this.frame(n));
 }
 dispose(){cancelAnimationFrame(this.frameId);this.abort.abort();this.observer.disconnect();this.controls.dispose();this.interior?.dispose();this.environment.dispose();this.sun.shadow.map?.dispose();this.renderer.dispose();}
}
