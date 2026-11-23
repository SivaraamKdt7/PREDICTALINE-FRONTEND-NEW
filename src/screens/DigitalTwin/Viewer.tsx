import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { Clone, OrbitControls, TransformControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { UploadedModel } from './modelService';

type Tool = 'select'|'rotate'|'scale';
type SceneOptions = { preset:'Custom'|'Factory'|'Grass'|'Studio';camera:'Perspective'|'Orthographic';background:string;floorColor:string;exposure:number;ambient:number;keyLight:number;fillLight:number;lightColor:string;grid:boolean;axes:boolean;shadows:boolean;orbit:boolean };
type Props = { models:UploadedModel[]; selectedIds:string[]; tool:Tool; sceneOptions:SceneOptions; onSelect:(id:string,additive:boolean)=>void; onClear:()=>void; onTransform:(changes:{id:string;position:[number,number,number];rotation:[number,number,number];scale:[number,number,number]}[])=>void; onMeshClick:(modelId:string,name:string)=>void };
const NORMALIZED_SIZE=2.5;
const radians=(v:number)=>THREE.MathUtils.degToRad(v);
const degrees=(v:number)=>Math.round(THREE.MathUtils.radToDeg(v)*100)/100;

function ModelObject({model,origin,selected,onReady,onMeshClick,onDragStart}:{model:UploadedModel;origin:[number,number,number];selected:boolean;onReady:(id:string)=>void;onMeshClick:(id:string,name:string,additive:boolean)=>void;onDragStart:(id:string,event:ThreeEvent<PointerEvent>)=>void}) {
  const gltf=useGLTF(model.modelUrl);
  const root=useRef<THREE.Group>(null);
  const hovered=useRef<THREE.Mesh|null>(null);
  const records=useRef(new Map<THREE.Mesh,THREE.Material|THREE.Material[]>());
  const normalization=useMemo(()=>{
    const box=new THREE.Box3().setFromObject(gltf.scene);
    if(box.isEmpty())return {scale:1,offset:[0,0,0] as [number,number,number],size:[.2,.2,.2] as [number,number,number]};
    const size=box.getSize(new THREE.Vector3());const center=box.getCenter(new THREE.Vector3());
    const scale=NORMALIZED_SIZE/Math.max(size.x,size.y,size.z,0.001);
    return {scale,offset:[-center.x*scale,-center.y*scale,-center.z*scale] as [number,number,number],size:[Math.max(size.x*scale*1.05,.08),Math.max(size.y*scale*1.05,.08),Math.max(size.z*scale*1.05,.08)] as [number,number,number]};
  },[gltf.scene]);
  const clearHover=useCallback(()=>{
    const mesh=hovered.current;if(!mesh)return;
    const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    mats.forEach(mat=>{if(mat instanceof THREE.MeshStandardMaterial&&mat.userData.originalEmissive instanceof THREE.Color)mat.emissive.copy(mat.userData.originalEmissive)});
    hovered.current=null;
  },[]);
  useLayoutEffect(()=>{
    const group=root.current;if(!group)return;
    group.traverse(child=>{
      if(!(child instanceof THREE.Mesh)||records.current.has(child))return;
      const original=child.material;
      const clone=(m:THREE.Material)=>{const copy=m.clone();if(copy instanceof THREE.MeshStandardMaterial)copy.userData.originalEmissive=copy.emissive.clone();return copy};
      child.material=Array.isArray(original)?original.map(clone):clone(original);
      records.current.set(child,original);
    });
    onReady(model.id);
    return ()=>{clearHover();records.current.forEach((original,mesh)=>{const cloned=Array.isArray(mesh.material)?mesh.material:[mesh.material];mesh.material=original;cloned.forEach(m=>m.dispose())});records.current.clear()};
  },[gltf.scene,model.id,onReady,clearHover]);
  useEffect(()=>{root.current?.traverse(child=>{if(!(child instanceof THREE.Mesh))return;child.castShadow=model.castShadow;child.receiveShadow=model.receiveShadow;const materials=Array.isArray(child.material)?child.material:[child.material];materials.forEach(mat=>{if('wireframe' in mat)(mat as THREE.MeshStandardMaterial).wireframe=model.wireframe})})},[model.castShadow,model.receiveShadow,model.wireframe]);
  const position:[number,number,number]=[model.position[0]-origin[0],model.position[1]-origin[1],model.position[2]-origin[2]];
  return <group ref={root} name={model.name} userData={{uploadedModelRoot:true,modelId:model.id}} position={position} rotation={model.rotation.map(radians) as [number,number,number]} scale={model.scale} visible={model.visible}
    onPointerDown={(event:ThreeEvent<PointerEvent>)=>onDragStart(model.id,event)}
    onPointerOver={(event:ThreeEvent<PointerEvent>)=>{event.stopPropagation();const mesh=event.object;if(!(mesh instanceof THREE.Mesh)||hovered.current===mesh)return;clearHover();(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(mat=>{if(mat instanceof THREE.MeshStandardMaterial){mat.emissive.set('#ffaa00');mat.emissiveIntensity=.5}});hovered.current=mesh}}
    onPointerOut={(event:ThreeEvent<PointerEvent>)=>{event.stopPropagation();clearHover()}}
    onClick={(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();const mesh=event.object;onMeshClick(model.id,mesh instanceof THREE.Mesh?(mesh.name||model.name):model.name,event.nativeEvent.shiftKey||event.nativeEvent.ctrlKey||event.nativeEvent.metaKey);if(mesh instanceof THREE.Mesh){console.log('Clicked mesh',{name:mesh.name,uuid:mesh.uuid,materialNames:(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(m=>m.name),componentName:model.componentName,position:mesh.position.toArray()})}}}>
      <group scale={normalization.scale} position={normalization.offset}><Clone object={gltf.scene}/></group>
      {selected&&<lineSegments raycast={()=>{}} renderOrder={999}><edgesGeometry args={[new THREE.BoxGeometry(...normalization.size)]}/><lineBasicMaterial color="#a5f52c" depthTest={false} transparent opacity={.9}/></lineSegments>}
    </group>;
}

function CameraFit({revision,modelCount}:{revision:number;modelCount:number}) {
  const {scene,camera,controls,size}=useThree();
  useEffect(()=>{const frame=requestAnimationFrame(()=>{
    const bounds=new THREE.Box3();let found=false;
    scene.traverse(object=>{if(!object.userData.uploadedModelRoot)return;const box=new THREE.Box3().setFromObject(object);if(!box.isEmpty()){bounds.union(box);found=true}});
    if(!found)return;
    const sphere=bounds.getBoundingSphere(new THREE.Sphere());const center=sphere.center;const radius=Math.max(sphere.radius,.1);
    const direction=new THREE.Vector3(1,.7,1).normalize();
    if(camera instanceof THREE.PerspectiveCamera){const vertical=THREE.MathUtils.degToRad(camera.fov);const horizontal=2*Math.atan(Math.tan(vertical/2)*size.width/Math.max(size.height,1));const distance=radius/Math.sin(Math.min(vertical,horizontal)/2)*1.3;camera.position.copy(center.clone().addScaledVector(direction,distance));camera.near=.02;camera.far=Math.max(1000,distance+radius*4);camera.updateProjectionMatrix()}
    else if(camera instanceof THREE.OrthographicCamera){camera.position.copy(center.clone().addScaledVector(direction,radius*4));camera.zoom=Math.max(.1,Math.min(size.width,size.height)/(radius*4));camera.updateProjectionMatrix();const orbit=controls as {maxZoom?:number}|null;if(orbit)orbit.maxZoom=camera.zoom*4}
    camera.lookAt(center);
    const orbit=controls as {target:THREE.Vector3;update:()=>void}|null;if(orbit){orbit.target.copy(center);orbit.update()}
  });return()=>cancelAnimationFrame(frame)},[revision,modelCount,scene,camera,controls,size.width,size.height]);
  return null;
}
function Exposure({value}:{value:number}) {const gl=useThree(s=>s.gl);useEffect(()=>{gl.toneMappingExposure=value},[gl,value]);return null}
function ModelEnvironment(){const {gl,scene}=useThree();useEffect(()=>{const generator=new THREE.PMREMGenerator(gl);const room=new RoomEnvironment();const target=generator.fromScene(room);scene.environment=target.texture;scene.environmentIntensity=.65;return()=>{scene.environment=null;target.dispose();room.dispose();generator.dispose()}},[gl,scene]);return null}
function Ground({preset,color,shadows}:{preset:SceneOptions['preset'];color:string;shadows:boolean}){
  const texture=useMemo(()=>{if(preset!=='Grass')return null;const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const context=canvas.getContext('2d');if(!context)return null;context.fillStyle='#c8c8c8';context.fillRect(0,0,64,64);for(let i=0;i<180;i++){const x=(i*37)%64,y=(i*53+Math.floor(i/7)*19)%64;context.fillStyle=i%3===0?'#eeeeee':'#a8a8a8';context.fillRect(x,y,1,2)}const map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(45,45);map.colorSpace=THREE.SRGBColorSpace;return map},[preset]);
  useEffect(()=>()=>texture?.dispose(),[texture]);
  if(preset==='Custom')return null;
  return <mesh rotation={[-Math.PI/2,0,0]} position={[0,-1.35,0]} receiveShadow={shadows}><planeGeometry args={[200,200]}/><meshStandardMaterial color={color} map={texture||undefined} roughness={preset==='Studio'?.72:.95} metalness={preset==='Factory'?.08:0}/></mesh>;
}

function SceneContent({models,selectedIds,tool,sceneOptions,onSelect,onTransform,onMeshClick}:{models:UploadedModel[];selectedIds:string[];tool:Tool;sceneOptions:SceneOptions;onSelect:Props['onSelect'];onTransform:Props['onTransform'];onMeshClick:Props['onMeshClick']}) {
  const [revision,setRevision]=useState(0);
  const [dragRevision,setDragRevision]=useState(0);
  const [dragging,setDragging]=useState(false);
  const [preview,setPreview]=useState<Record<string,[number,number,number]>>({});
  const loaded=useRef(new Set<string>());
  const groupRef=useRef<THREE.Group>(null);
  const dragCleanup=useRef<(()=>void)|null>(null);
  const suppressClick=useRef(false);
  const camera=useThree(s=>s.camera);
  const canvas=useThree(s=>s.gl.domElement);
  const controls=useThree(s=>s.controls) as {enabled:boolean}|null;
  useEffect(()=>()=>dragCleanup.current?.(),[]);
  const ready=useCallback((id:string)=>{if(loaded.current.has(id))return;loaded.current.add(id);setRevision(n=>n+1)},[]);
  const displayed=models.map(m=>preview[m.id]?{...m,position:preview[m.id]}:m);
  const chosen=displayed.filter(m=>selectedIds.includes(m.id));
  const unchosen=displayed.filter(m=>!selectedIds.includes(m.id));
  const transform=tool!=='select'&&chosen.length>0;
  const origin:[number,number,number]=chosen.length?[0,1,2].map(i=>chosen.reduce((sum,m)=>sum+m.position[i],0)/chosen.length) as [number,number,number]:[0,0,0];
  const dragStart=(id:string,event:ThreeEvent<PointerEvent>)=>{
    if(tool!=='select'||!selectedIds.includes(id)||event.nativeEvent.button!==0)return;
    const model=models.find(m=>m.id===id);if(!model)return;
    dragCleanup.current?.();
    const normal=camera.getWorldDirection(new THREE.Vector3()).normalize();
    const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,new THREE.Vector3(...model.position));
    const pointAt=(clientX:number,clientY:number)=>{
      const rect=canvas.getBoundingClientRect();
      const pointer=new THREE.Vector2(((clientX-rect.left)/rect.width)*2-1,-((clientY-rect.top)/rect.height)*2+1);
      const ray=new THREE.Raycaster();ray.setFromCamera(pointer,camera);
      return ray.ray.intersectPlane(plane,new THREE.Vector3());
    };
    const start=pointAt(event.nativeEvent.clientX,event.nativeEvent.clientY);if(!start)return;
    event.stopPropagation();event.nativeEvent.preventDefault();
    const base=new Map(models.filter(m=>selectedIds.includes(m.id)).map(m=>[m.id,[...m.position] as [number,number,number]]));
    let moved=false;
    let finalDelta=new THREE.Vector3();
    const pointerId=event.pointerId;
    const previousCursor=canvas.style.cursor;canvas.style.cursor='grabbing';
    if(controls)controls.enabled=false;
    setDragging(true);
    const move=(pointerEvent:PointerEvent)=>{
      if(pointerEvent.pointerId!==pointerId)return;
      pointerEvent.stopPropagation();
      const point=pointAt(pointerEvent.clientX,pointerEvent.clientY);if(!point)return;
      const delta=point.sub(start);
      if(delta.lengthSq()<.0001&&!moved)return;
      moved=true;finalDelta=delta;
      setPreview(Object.fromEntries([...base].map(([modelId,position])=>[modelId,[position[0]+delta.x,position[1]+delta.y,position[2]+delta.z] as [number,number,number]])));
    };
    const cleanup=()=>{
      window.removeEventListener('pointermove',move,true);
      window.removeEventListener('pointerup',finish,true);
      window.removeEventListener('pointercancel',cancel,true);
      window.removeEventListener('blur',cancel);
      canvas.style.cursor=previousCursor;
      if(controls)controls.enabled=sceneOptions.orbit;
      setDragging(false);
      dragCleanup.current=null;
    };
    const finish=(pointerEvent:PointerEvent)=>{
      if(pointerEvent.pointerId!==pointerId)return;
      move(pointerEvent);
      pointerEvent.stopPropagation();
      if(moved){
        onTransform(models.filter(m=>base.has(m.id)).map(m=>{const position=base.get(m.id)!;return {id:m.id,position:[position[0]+finalDelta.x,position[1]+finalDelta.y,position[2]+finalDelta.z] as [number,number,number],rotation:m.rotation,scale:m.scale}}));
        suppressClick.current=true;setTimeout(()=>{suppressClick.current=false},0);
      }
      setPreview({});cleanup();
    };
    const cancel=()=>{setPreview({});cleanup()};
    dragCleanup.current=cleanup;
    window.addEventListener('pointermove',move,true);
    window.addEventListener('pointerup',finish,true);
    window.addEventListener('pointercancel',cancel,true);
    window.addEventListener('blur',cancel);
  };
  const modelClick=(id:string,name:string,additive:boolean)=>{if(suppressClick.current)return;if(additive)onSelect(id,true);else if(!selectedIds.includes(id))onMeshClick(id,name)};
  const commit=()=>{
    const group=groupRef.current;if(!group)return;group.updateWorldMatrix(true,true);
    const changes=chosen.flatMap(model=>{const object=group.children.find(c=>c.userData.modelId===model.id);if(!object)return [];const position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();object.matrixWorld.decompose(position,rotation,scale);const euler=new THREE.Euler().setFromQuaternion(rotation);return [{id:model.id,position:position.toArray() as [number,number,number],rotation:[degrees(euler.x),degrees(euler.y),degrees(euler.z)] as [number,number,number],scale:scale.toArray() as [number,number,number]}]});
    onTransform(changes);setDragRevision(n=>n+1);
  };
  return <><color attach="background" args={[sceneOptions.background]}/><ambientLight intensity={sceneOptions.ambient}/><directionalLight position={[10,15,10]} intensity={sceneOptions.keyLight} color={sceneOptions.lightColor} castShadow={sceneOptions.shadows}/><directionalLight position={[-8,6,-7]} intensity={sceneOptions.fillLight} color={sceneOptions.lightColor}/><Exposure value={sceneOptions.exposure}/><ModelEnvironment/><Ground preset={sceneOptions.preset} color={sceneOptions.floorColor} shadows={sceneOptions.shadows}/>
    <Suspense fallback={null}>
      {unchosen.map(m=><ModelObject key={m.id} model={m} origin={[0,0,0]} selected={false} onReady={ready} onMeshClick={modelClick} onDragStart={dragStart}/>)}
      {transform?<TransformControls key={`${selectedIds.join(',')}-${tool}-${dragRevision}`} mode={tool} onMouseUp={commit}><group ref={groupRef} position={origin}>{chosen.map(m=><ModelObject key={m.id} model={m} origin={origin} selected onReady={ready} onMeshClick={modelClick} onDragStart={dragStart}/>)}</group></TransformControls>:chosen.map(m=><ModelObject key={m.id} model={m} origin={[0,0,0]} selected onReady={ready} onMeshClick={modelClick} onDragStart={dragStart}/>) }
    </Suspense>
    <OrbitControls makeDefault enabled={sceneOptions.orbit&&!dragging} enableDamping dampingFactor={.08} enableZoom enablePan enableRotate minDistance={1.5} maxDistance={10000}/>
    {sceneOptions.grid&&<gridHelper args={[100,100,sceneOptions.preset==='Factory'?'#c9d2d3':'#52645d',sceneOptions.preset==='Factory'?'#828d91':'#283b3b']} position={[0,sceneOptions.preset==='Custom'?-2:-1.34,0]}/>}
    {sceneOptions.axes&&<axesHelper args={[2]}/>}
    <CameraFit revision={revision} modelCount={models.length}/>
  </>;
}

export default function Viewer({models,selectedIds,tool,sceneOptions,onSelect,onClear,onTransform,onMeshClick}:Props) {
  return <div className="twin-canvas"><Canvas key={sceneOptions.camera} shadows={sceneOptions.shadows} orthographic={sceneOptions.camera==='Orthographic'} camera={{position:[5,5,5],fov:50,near:.01,far:1000}} gl={{antialias:true,alpha:false}} onPointerMissed={onClear}>
    <SceneContent models={models} selectedIds={selectedIds} tool={tool} sceneOptions={sceneOptions} onSelect={onSelect} onTransform={onTransform} onMeshClick={onMeshClick}/>
  </Canvas>{models.length===0&&<div className="twin-canvas-empty"><strong>No model loaded</strong><span>Upload a GLB file from Models to view it here.</span></div>}</div>;
}
