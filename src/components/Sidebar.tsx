import { useEffect, useState, type CSSProperties } from 'react';
import { Activity, Boxes, Building2, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, CircleCheck, Cog, Cpu, Factory, Filter, Gauge, Layers3, MapPin, Plus, Radio, Search, Thermometer, Workflow, X, Zap } from 'lucide-react';
import { assetPath, assets, byId, kindOf, type Asset, type HierarchyKind } from '../data';
import { getDerivedStatus } from '../services/assetHealthService';

type Props = { selected: string; onSelect: (id: string) => void; onAdd: (kind:HierarchyKind|'MQTT Topic') => void; open: boolean; onClose: () => void };
const nodeIcon=(asset:Asset)=>{
  if(asset.type==='Sensor')return /temp/i.test(asset.sensorType||asset.name)?Thermometer:/press/i.test(asset.sensorType||asset.name)?Gauge:/current|battery/i.test(asset.sensorType||asset.name)?Zap:Activity;
  return asset.type==='Plant'?Building2:asset.type==='Site'?MapPin:asset.type==='Area'?Factory:asset.type==='Line'?Workflow:asset.type==='Machine'?Cpu:asset.type==='Component'?Cog:Boxes;
};
const addItems:{kind:HierarchyKind;icon:typeof Building2}[]=[{kind:'Enterprise',icon:Building2},{kind:'Site',icon:MapPin},{kind:'Area',icon:Factory},{kind:'Work Center',icon:Workflow},{kind:'Asset',icon:Cpu},{kind:'Component',icon:Cog},{kind:'Sensor',icon:Activity}];
const descendants = (asset: Asset): Asset[] => (asset.children||[]).flatMap(id=>{const child=byId(id);return child?[child,...descendants(child)]:[]});
const matches = (asset:Asset, query:string, alertOnly:boolean):boolean => {
  const text=(asset.name+' '+(asset.topic||'')).toLowerCase();
  return (!query||text.includes(query.toLowerCase()))&&(!alertOnly||asset.health!=='Healthy');
};
type PathEdge={depth:number;from:number;to:number};
function Row({asset,depth,selected,onSelect,expanded,toggle,query,alertOnly,selectedPath,orderIndex,pathEdges}:{asset:Asset;depth:number;selected:string;onSelect:(id:string)=>void;expanded:Set<string>;toggle:(id:string)=>void;query:string;alertOnly:boolean;selectedPath:string[];orderIndex:Map<string,number>;pathEdges:PathEdge[]}) {
  const children=(asset.children||[]).map(byId).filter((a):a is Asset=>!!a);
  const visible=matches(asset,query,alertOnly)||descendants(asset).some(a=>matches(a,query,alertOnly));
  if(!visible)return null;
  const isExpanded=expanded.has(asset.id)||Boolean(query)||alertOnly;
  const Icon=nodeIcon(asset);
  const health=getDerivedStatus(asset);
  const rowIndex=orderIndex.get(asset.id)??-1;
  const activeColumns=pathEdges.filter(edge=>rowIndex>edge.from&&rowIndex<=edge.to&&depth>=edge.depth);
  return <><div className={'hierarchy-row '+(selected===asset.id?'selected':'')+(selectedPath.includes(asset.id)?' in-path':'')} data-depth={depth} style={{paddingLeft:8+depth*12,'--depth':depth} as CSSProperties}>
    {activeColumns.map(edge=><span key={edge.depth} className="hierarchy-active-guides" style={{left:4+(edge.depth-1)*12,width:12}} aria-hidden="true"/>)}
    <button className="hierarchy-expand" onClick={()=>toggle(asset.id)} aria-label={(isExpanded?'Collapse ':'Expand ')+asset.name}>{children.length?(isExpanded?<ChevronDown size={13}/>:<ChevronRight size={13}/>):<span/>}</button>
    <button className="hierarchy-select" onClick={()=>onSelect(asset.id)} title={`${kindOf(asset)} · ${asset.topic||asset.name}`}><Icon className={'hierarchy-node-icon '+asset.type.toLowerCase()} size={15}/><span>{asset.name}</span></button>
    <i className={'status-dot '+health.toLowerCase().replace(' ','-')} title={health}/>
  </div>{isExpanded&&children.map(child=><Row key={child.id} asset={child} depth={depth+1} selected={selected} onSelect={onSelect} expanded={expanded} toggle={toggle} query={query} alertOnly={alertOnly} selectedPath={selectedPath} orderIndex={orderIndex} pathEdges={pathEdges}/>)}</>;
}
export default function SidebarNew({selected,onSelect,onAdd,open,onClose}:Props) {
  const [query,setQuery]=useState('');
  const [alertOnly,setAlertOnly]=useState(false);
  const [menu,setMenu]=useState(false);
  const [expanded,setExpanded]=useState(new Set(['plant','site','production','line1','crusher','motor','bearing']));
  const branchIds=assets.filter(a=>a.children?.length).map(a=>a.id);
  const toggle=(id:string)=>setExpanded(prev=>{const next=new Set(prev);next.has(id)?next.delete(id):next.add(id);return next});
  const selectedAsset=byId(selected);
  const selectedPath=selectedAsset?assetPath(selectedAsset).map(node=>node.id):[];
  const plants=assets.filter(asset=>asset.type==='Plant'&&!asset.parent);
  const ordered:string[]=[];
  const walk=(node:Asset)=>{ordered.push(node.id);(node.children||[]).map(byId).filter((child):child is Asset=>!!child).forEach(walk)};
  plants.forEach(walk);
  const orderIndex=new Map(ordered.map((id,index)=>[id,index]));
  const pathEdges:PathEdge[]=selectedPath.slice(1).map((id,index)=>({depth:index+1,from:orderIndex.get(selectedPath[index])??-1,to:orderIndex.get(id)??-1}));
  useEffect(()=>{if(selectedAsset)setExpanded(previous=>new Set([...previous,...assetPath(selectedAsset).map(node=>node.id)]))},[selected,selectedAsset]);
  return <><div className={'sidebar-backdrop '+(open?'show':'')} onClick={onClose}/><aside className={'sidebar hierarchy-sidebar '+(open?'open':'')}>
    <div className="hierarchy-header"><div><Layers3 size={17}/><strong>Asset Hierarchy</strong></div><button className="icon-button mobile-only" onClick={onClose} aria-label="Close hierarchy"><X size={17}/></button></div>
    <div className="hierarchy-tools"><div className="search-box"><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search assets, sensors..."/></div><button className={'icon-button '+(alertOnly?'active':'')} onClick={()=>setAlertOnly(!alertOnly)} title="Show assets needing attention"><Filter size={15}/></button><div className="hierarchy-add-wrap"><button className="add-small" aria-label="Add to hierarchy" aria-expanded={menu} onClick={()=>setMenu(!menu)}><Plus size={16}/></button>{menu&&<div className="hierarchy-add-menu"><strong>Existing enterprises</strong>{plants.map(plant=><button key={plant.id} onClick={()=>{onSelect(plant.id);setMenu(false);onClose()}}><Building2 size={15}/> {plant.name}</button>)}<div className="menu-divider"/><strong>Add to hierarchy</strong>{addItems.map(({kind,icon:Icon})=><button key={kind} onClick={()=>{onAdd(kind);setMenu(false);onClose()}}><Icon size={15}/> Add {kind}</button>)}<div className="menu-divider"/><button onClick={()=>{onAdd('MQTT Topic');setMenu(false)}}><Radio size={15}/> Subscribe to topic</button><div className="menu-divider"/><button onClick={()=>{setExpanded(new Set(branchIds));setMenu(false)}}><ChevronsUpDown size={15}/> Expand all</button><button onClick={()=>{setExpanded(new Set());setMenu(false)}}><ChevronsDownUp size={15}/> Collapse all</button></div>}</div></div>
    <div className="hierarchy-meta"><span>{assets.length} nodes · {assets.filter(a=>a.type==='Sensor').length} sensors</span><span>{alertOnly?'Needs attention':'All assets'}</span></div>
    <div className="tree hierarchy-tree">{plants.map(plant=><Row key={plant.id} asset={plant} depth={0} selected={selected} onSelect={id=>{onSelect(id);onClose()}} expanded={expanded} toggle={toggle} query={query} alertOnly={alertOnly} selectedPath={selectedPath} orderIndex={orderIndex} pathEdges={pathEdges}/>)}</div>
    <div className="hierarchy-footer"><div className="hierarchy-selection"><small>SELECTED NODE</small><strong>{selectedAsset?.name||'NMDC'}</strong><span>{selectedAsset?kindOf(selectedAsset):'Enterprise'} · {selectedAsset?getDerivedStatus(selectedAsset):'No data'}</span></div><div className="broker"><span className="status-dot healthy"/><strong>Your Broker</strong><span>Connected</span><CircleCheck size={14}/></div></div>
  </aside></>;
}
