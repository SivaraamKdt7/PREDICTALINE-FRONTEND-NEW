import { Activity, Gauge, Radio, TriangleAlert, Wrench } from 'lucide-react';
import type { EquipmentSnapshot } from '../../services/assetHealthService';
import { MaintenanceNote, RelatedAlerts, TwinRelationships } from './HealthShared';
import MLPredictions from './MLPredictions';

export default function EquipmentHealth({snapshot,onSelect,onOpenTwin}:{snapshot:EquipmentSnapshot;onSelect:(id:string)=>void;onOpenTwin:(id:string)=>void}){
  const reporting=snapshot.sensors.filter(sensor=>sensor.value).length;
  return <div className="equipment-overview">
    <div className="asset-stat-grid">
      <div className="ops-panel asset-stat"><Gauge size={23}/><span>Condition</span><strong>{snapshot.status}</strong><small>Based on connected sensors</small></div>
      <div className="ops-panel asset-stat"><Activity size={23}/><span>Connected signals</span><strong>{reporting} <small>/ {snapshot.signalCount}</small></strong><small>Reporting readings</small></div>
      <div className="ops-panel asset-stat"><TriangleAlert size={23}/><span>Active alerts</span><strong>{snapshot.alerts.filter(alert=>!alert.read).length}</strong><small>Linked to this asset</small></div>
      <div className="ops-panel asset-stat"><Wrench size={23}/><span>Maintenance outlook</span><strong>{snapshot.lastSeen?'7':'—'} <small>{snapshot.lastSeen?'days':''}</small></strong><small>Sample estimate</small></div>
    </div>
    <div className="asset-detail-grid equipment-overview-grid">
      <section className="ops-panel"><div className="ops-panel-head"><h2><Radio size={16}/> Condition &amp; sensor readings</h2></div>{snapshot.sensors.length?snapshot.sensors.map(sensor=><button className="asset-reading equipment-reading" key={sensor.id} onClick={()=>onSelect(sensor.id)}><div><strong>{sensor.name}</strong><span>{sensor.topic||'No MQTT topic'}</span></div><b>{sensor.value||'—'} <small>{sensor.unit}</small></b><span className={'health-status '+sensor.health.toLowerCase()}>{sensor.health}</span></button>):<p className="asset-empty">No sensors attached.</p>}</section>
      <TwinRelationships asset={snapshot.node} onOpenTwin={onOpenTwin}/>
      <RelatedAlerts snapshot={snapshot} onSelect={onSelect}/>
      <MaintenanceNote note={snapshot.maintenanceNote}/>
    </div>
    <MLPredictions snapshot={snapshot}/>
  </div>;
}
