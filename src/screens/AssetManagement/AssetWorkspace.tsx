import { useCallback, useState } from 'react';
import { ChevronRight, GitBranch, HeartPulse, Layers3 } from 'lucide-react';
import { assetPath, byId, kindOf, type Asset, type HierarchyKind } from '../../data';
import AssetHealth from './AssetHealth';
import AssetForm, { type AssetPreview } from './AssetForm';
import AssetContext from './AssetContext';
import './assetManagement.css';

type Props={selectedId:string;draftType:HierarchyKind|null;select:(id:string)=>void;startAdd:(kind:HierarchyKind)=>void;cancelDraft:()=>void;onSaved:(asset:Asset)=>void;onDelete:(id:string)=>void;back:()=>void;openTwin:(id:string)=>void};
export default function AssetWorkspace({selectedId,draftType,select,startAdd,cancelDraft,onSaved,onDelete,back,openTwin}:Props){
  const [tab,setTab]=useState<'Manage'|'Health'>('Health');
  const activeTab=draftType?'Manage':tab;
  const [preview,setPreview]=useState<AssetPreview>({parentId:'',name:'',kind:'',topic:''});
  const updatePreview=useCallback((next:AssetPreview)=>setPreview(next),[]);
  const selected=byId(selectedId)||byId('plant')!;
  const context=(draftType?byId(preview.parentId):selected.type==='Sensor'&&selected.parent?byId(selected.parent):selected)||selected;
  const path=draftType==='Enterprise'?[]:assetPath(draftType?context:selected);
  const previewName=draftType?preview.name:selected.type==='Sensor'?selected.name:'';
  const topic=preview.topic||(!draftType?selected.topic||'':'');
  return <div className="am-workspace">
    <div className="am-page-top"><div><div className="page-title-heading"><span className="am-kicker">ASSET HIERARCHY</span><h1>Asset & Sensor Management</h1></div><p>Configure your hierarchy, sensors, and MQTT topics in one place.</p></div><div className="am-page-tabs"><button className={activeTab==='Health'?'active':''} onClick={()=>setTab('Health')}><HeartPulse size={15}/> Health</button><button className={activeTab==='Manage'?'active':''} onClick={()=>setTab('Manage')}><Layers3 size={15}/> Manage</button></div></div>
    {activeTab==='Health'?<AssetHealth id={selected.id} back={back} select={select} openTwin={openTwin}/>:<>
      <nav className="am-breadcrumb" aria-label="Hierarchy path"><GitBranch size={15}/>{path.map((node,index)=><span key={node.id}><ChevronRight size={13}/><button onClick={()=>select(node.id)}>{node.name}</button>{index===path.length-1&&<small>{kindOf(node)}</small>}</span>)}{draftType&&<span><ChevronRight size={13}/><strong>Add {draftType}</strong></span>}</nav>
      <div className="am-layout"><AssetForm key={`${selectedId}-${draftType||'edit'}`} asset={draftType?undefined:selected} draftType={draftType} selectedId={selectedId} onSaved={onSaved} onDelete={onDelete} onCancel={draftType?cancelDraft:back} onPreview={updatePreview}/><AssetContext context={context} previewName={previewName} previewKind={draftType||kindOf(selected)} topic={topic} onSelect={select} onAddSensor={()=>startAdd('Sensor')}/></div>
    </>}
  </div>;
}
