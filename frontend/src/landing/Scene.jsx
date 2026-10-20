import {useEffect,useRef,useState} from 'react';
import {Canvas,useFrame} from '@react-three/fiber';
import {Float,OrbitControls,Sparkles} from '@react-three/drei';
import {MathUtils} from 'three';
function Core({pulse}){
 const group=useRef(),ring=useRef(),material=useRef(),life=useRef(0);
 useEffect(()=>{if(pulse>0)life.current=1;},[pulse]);
 useFrame((state,delta)=>{
  const d=Math.min(delta,.05);group.current.rotation.y+=d*.13;
  group.current.rotation.x=MathUtils.damp(group.current.rotation.x,state.pointer.y*.18,3,d);
  group.current.position.x=MathUtils.damp(group.current.position.x,state.pointer.x*.2,3,d);
  life.current=Math.max(0,life.current-d*.65);ring.current.visible=life.current>0;
  ring.current.scale.setScalar(1+(1-life.current)*1.4);material.current.opacity=life.current*.6;
 });
 return <group>
  <group ref={group}>
   <mesh><icosahedronGeometry args={[1.5,1]}/><meshPhysicalMaterial color="#102c43" metalness={.55} roughness={.3} clearcoat={1}/></mesh>
   <mesh scale={1.03}><icosahedronGeometry args={[1.5,1]}/><meshBasicMaterial color="#74d9ff" wireframe transparent opacity={.55}/></mesh>
   {[0,1,2].map(i=><mesh key={i} rotation={[i*.75,i*.45,i*.8]}><torusGeometry args={[2+i*.18,.014,8,96]}/><meshBasicMaterial color={i===1?'#a6ffdd':'#48bfff'} transparent opacity={.65}/></mesh>)}
   <Float speed={1.5} floatIntensity={.35}><group position={[2.1,.9,.2]} rotation={[.1,-.4,-.2]}><mesh><boxGeometry args={[.65,.46,.09]}/><meshStandardMaterial color="#18374d" metalness={.5} roughness={.3}/></mesh><mesh position={[0,0,.055]}><planeGeometry args={[.51,.32]}/><meshBasicMaterial color="#75d4ff"/></mesh><mesh position={[0,-.31,0]}><boxGeometry args={[.34,.07,.2]}/><meshStandardMaterial color="#7996aa"/></mesh></group></Float>
   <Float speed={1.1} floatIntensity={.45}><mesh position={[-2,-.9,.3]} rotation={[.6,.5,.2]}><octahedronGeometry args={[.32]}/><meshStandardMaterial color="#78efce" emissive="#1a6050" emissiveIntensity={.6} metalness={.5} roughness={.25}/></mesh></Float>
  </group>
  <mesh ref={ring} visible={false} position={[0,0,.2]}><ringGeometry args={[1.8,1.84,96]}/><meshBasicMaterial ref={material} color="#9be6ff" transparent opacity={0} depthWrite={false}/></mesh>
 </group>;
}
export default function Scene({pulse=0}){
 const [compact]=useState(()=>window.matchMedia('(max-width: 600px)').matches);
 return <Canvas camera={{position:[0,0,8.2],fov:42}} dpr={[1,compact?1.2:1.5]} gl={{antialias:!compact,alpha:true}}><ambientLight intensity={1.2}/><directionalLight position={[3,4,5]} intensity={3.5} color="#b4dfff"/><pointLight position={[-3,1,3]} intensity={25} color="#54c5ff"/><Float speed={1.1} rotationIntensity={.15} floatIntensity={.4}><Core pulse={pulse}/></Float><Sparkles count={compact?20:52} scale={7} size={1.4} speed={.18} opacity={.4}/><OrbitControls enableZoom={false} enablePan={false} enableDamping autoRotate={false}/></Canvas>;
}
