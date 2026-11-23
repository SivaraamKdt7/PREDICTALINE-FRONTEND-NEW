import { Activity, Building2, ChevronRight, Copy, Cpu, Radio } from 'lucide-react';
import { assetPath, byId, kindOf, type Asset } from '../../data';

type Props={context:Asset;previewName:string;previewKind:string;topic:string;onSelect:(id:string)=>void};
const descendants=(asset:Asset):Asset[]=>(asset.children||[]).flatMap(id=>{const child=byId(id);return child?[child,...descendants(child)]:[]});
export default function AssetContext({context,previewName,previewKind,topic,onSelect}:Props){
  const sensors=descendants(context).filter(node=>node.type==='Sensor');
  const path=assetPath(context);
  return <aside className="am-context">
    <section className="am-card am-compact-card am-asset-card"><div className="am-card-head"><h2><Building2 size={15}/> Asset context</h2></div><div className="am-context-asset"><div className="am-context-icon"><Cpu size={23}/></div><div><strong>{context.name}</strong><span>{kindOf(context)} · Parent: {context.parent?byId(context.parent)?.name:'—'}</span></div><em>{context.health}</em></div></section>
    <section className="am-card am-compact-card am-sensors-card"><div className="am-card-head"><h2><Activity size={15}/> Sensors in {context.name} <small>({sensors.length})</small></h2></div><div className="am-sensor-list">{sensors.length?sensors.map(sensor=><button key={sensor.id} type="button" onClick={()=>onSelect(sensor.id)}><span className={'status-dot '+sensor.health.toLowerCase()}/><span><strong>{sensor.code||sensor.name}</strong><small>{sensor.sensorType||'Sensor'} · {sensor.sensorLocation||sensor.metric||sensor.unit||'Telemetry'}</small></span><ChevronRight size={14}/></button>):<p>No sensors linked to this asset yet.</p>}</div></section>
    <section className="am-card am-compact-card am-mqtt-card"><div className="am-card-head"><h2><Radio size={15}/> Topic preview & hierarchy</h2></div><div className="am-preview-body">{topic?<div className="am-topic-preview"><Radio size={16}/><code>{topic}</code><button type="button" onClick={()=>void navigator.clipboard?.writeText(topic)} aria-label="Copy topic"><Copy size={15}/></button></div>:<p className="am-topic-empty">Configure a sensor to preview its topic.</p>}<strong className="am-preview-label">ISA-95 path</strong><div className="am-path-chips">{path.map(node=><div key={node.id}><small>{kindOf(node)}</small><span>{node.code||node.name}</span></div>)}{previewName&&<div className="current"><small>{previewKind}</small><span>{previewName}</span></div>}</div></div></section>
  </aside>;
}



