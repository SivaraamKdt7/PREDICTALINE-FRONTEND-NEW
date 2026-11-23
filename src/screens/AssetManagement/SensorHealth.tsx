import { Activity, Radio } from 'lucide-react';
import type { SensorSnapshot } from '../../services/assetHealthService';
import { MaintenanceNote, RelatedAlerts, TwinRelationships } from './HealthShared';

export default function SensorHealth({snapshot,onSelect,onOpenTwin}:{snapshot:SensorSnapshot;onSelect:(id:string)=>void;onOpenTwin:(id:string)=>void}){
  const {node,points}=snapshot;
  const values=points.map(point=>point.value);
  const low=values.length?Math.min(...values,snapshot.warningLimit??Infinity):0;
  const high=values.length?Math.max(...values,snapshot.criticalLimit??-Infinity):1;
  const span=high-low||1;
  const line=points.map((point,index)=>`${index?'L':'M'}${22+index/(points.length-1||1)*716} ${145-(point.value-low)/span*112}`).join(' ');
  const level=(value:number)=>145-(value-low)/span*112;
  return <div className="sensor-detail-layout">
    <section className="ops-panel health-signal-panel"><div className="ops-panel-head"><h2><Activity size={16}/> Signal trend</h2><span className="health-demo-tag">Sample readings · 48 min</span></div>
      {points.length?<div className="health-signal-body"><div className="health-current"><div><small>LATEST READING</small><strong>{snapshot.lastValue?.toFixed(2)} <span>{node.unit}</span></strong></div><div><small>UPDATED</small><strong className="health-time">{snapshot.lastSeen?new Date(snapshot.lastSeen).toLocaleString():'—'}</strong></div></div>
        <div className="health-chart"><svg viewBox="0 0 760 170" preserveAspectRatio="none" role="img" aria-label={`${node.name} signal trend`}>{[35,75,115,145].map(y=><line className="health-grid-line" key={y} x1="22" x2="738" y1={y} y2={y}/>)}{snapshot.warningLimit!==null&&<line className="health-limit warning" x1="22" x2="738" y1={level(snapshot.warningLimit)} y2={level(snapshot.warningLimit)}/>} {snapshot.criticalLimit!==null&&<line className="health-limit critical" x1="22" x2="738" y1={level(snapshot.criticalLimit)} y2={level(snapshot.criticalLimit)}/>}<path className="health-signal-path" d={line}/></svg><div><span>{new Date(points[0].at).toLocaleTimeString()}</span><span>{new Date(points[points.length-1].at).toLocaleTimeString()}</span></div></div>
        <div className="health-chart-key"><span><i className="signal"/> Signal</span><span><i className="warning"/> Warning {snapshot.warningLimit} {node.unit}</span><span><i className="critical"/> Critical {snapshot.criticalLimit} {node.unit}</span></div></div>:<p className="asset-empty">No readings yet. Check the MQTT topic in Manage.</p>}
    </section>
    <aside className="sensor-detail-side"><section className="ops-panel health-panel"><div className="ops-panel-head"><h2><Radio size={16}/> Sensor details</h2></div><div className="health-source"><span>Metric</span><strong>{node.metric||node.sensorType||node.name}</strong><span>MQTT topic</span><code>{node.topic||'Not configured'}</code><span>Average</span><strong>{snapshot.average?.toFixed(2)||'—'} {node.unit}</strong><span>Range</span><strong>{snapshot.min?.toFixed(2)||'—'}–{snapshot.max?.toFixed(2)||'—'} {node.unit}</strong></div></section>
      <TwinRelationships asset={node} onOpenTwin={onOpenTwin}/></aside>
    <div className="sensor-detail-bottom"><RelatedAlerts snapshot={snapshot} onSelect={onSelect}/><MaintenanceNote note={snapshot.maintenanceNote}/></div>
  </div>;
}

