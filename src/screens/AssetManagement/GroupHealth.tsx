import { Building2 } from 'lucide-react';
import { getDerivedStatus, type GroupSnapshot } from '../../services/assetHealthService';
import { HealthMeta, RelatedAlerts } from './HealthShared';

export default function GroupHealth({snapshot,onSelect,onOpenTwin}:{snapshot:GroupSnapshot;onSelect:(id:string)=>void;onOpenTwin:(id:string)=>void}){return <div className="health-layout"><div className="health-primary"><section className="ops-panel health-panel"><div className="ops-panel-head"><h2><Building2 size={16}/> Areas and equipment</h2></div>{snapshot.children.length?snapshot.children.map(child=>{const state=getDerivedStatus(child);return <button className="health-child-row" key={child.id} onClick={()=>onSelect(child.id)}><span className={'status-dot '+state.toLowerCase().replace(' ','-')}/><span><strong>{child.name}</strong><small>{child.type}</small></span><b>{state}</b></button>}):<p className="asset-empty">No child nodes yet. Use the hierarchy add menu to build this branch.</p>}</section></div><div className="health-secondary">{snapshot.alerts.length>0&&<RelatedAlerts snapshot={snapshot} onSelect={onSelect}/>}</div><HealthMeta asset={snapshot.node} note={snapshot.maintenanceNote} onOpenTwin={onOpenTwin}/></div>}



