import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, Cpu } from 'lucide-react';
import { byId, kindOf } from '../../data';
import { getAssetHealth, type HealthSnapshot } from '../../services/assetHealthService';
import SensorHealth from './SensorHealth';
import EquipmentHealth from './EquipmentHealth';
import GroupHealth from './GroupHealth';
import './assetHealth.css';

type Props={id:string;back:()=>void;select:(id:string)=>void;openTwin:(id:string)=>void};
export default function AssetHealth({id,back,select,openTwin}:Props){
  const [snapshot,setSnapshot]=useState<HealthSnapshot|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{let active=true;setSnapshot(null);setError('');getAssetHealth(id).then(result=>active&&setSnapshot(result)).catch(cause=>active&&setError(cause instanceof Error?cause.message:'Could not load health data.'));return()=>{active=false}},[id]);
  const node=snapshot?.node||byId(id);const parent=node?.parent?byId(node.parent):undefined;
  if(!node)return <div className="health-loading">Asset not found.</div>;
  return <div className="asset-detail"><div className="asset-crumb"><button onClick={back}><ArrowLeft size={15}/> Dashboard</button><ChevronRight size={13}/>{parent?.name||'NMDC'}<ChevronRight size={13}/><strong>{node.name}</strong></div><div className="asset-hero"><div className="asset-hero-icon"><Cpu size={34}/></div><div><div className="kicker">{snapshot?.kind==='sensor'?'SENSOR HEALTH':kindOf(node).toUpperCase()+' OVERVIEW'}</div><h1>{node.name}</h1><p>{parent?.name||'Enterprise root'} · {node.description||'Condition and connected signals'}</p></div><span className={'health-status '+(snapshot?.status||'no-data').toLowerCase().replace(' ','-')}>{snapshot?.status||'Loading'}</span></div>{error&&<p className="health-error" role="alert">{error}</p>}{!snapshot&&!error?<div className="health-loading">Loading health view…</div>:snapshot?.kind==='sensor'?<SensorHealth snapshot={snapshot} onSelect={select} onOpenTwin={openTwin}/>:snapshot?.kind==='equipment'?<EquipmentHealth snapshot={snapshot} onSelect={select} onOpenTwin={openTwin}/>:snapshot?.kind==='group'?<GroupHealth snapshot={snapshot} onSelect={select} onOpenTwin={openTwin}/>:null}</div>;
}


