import { Activity, Copy, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { addHierarchyAsset, assetPath, assets, byId, kindOf, parentTypes, type Asset, type HierarchyKind, type Health, typeForKind, updateHierarchyAsset } from '../../data';

export type AssetPreview={parentId:string;name:string;kind:string;topic:string};
type Props={asset?:Asset;draftType:HierarchyKind|null;selectedId:string;onSaved:(asset:Asset)=>void;onDelete:(id:string)=>void;onCancel:()=>void;onPreview:(preview:AssetPreview)=>void};
const slug=(value:string)=>value.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const sensorTypes=['Vibration','Temperature','Pressure','Current','Speed','Other'];
const hasSensor=(node:Asset):boolean=>(node.children||[]).some(id=>{const child=byId(id);return !!child&&(child.type==='Sensor'||hasSensor(child))});

export default function AssetForm({asset,draftType,selectedId,onSaved,onDelete,onCancel,onPreview}:Props){
  const kind=draftType||(asset?kindOf(asset):'Sensor');
  const isSensor=kind==='Sensor';
  const isRoot=kind==='Enterprise';
  const allowed=parentTypes[kind as HierarchyKind]||[];
  const parentOptions=assets.filter(candidate=>allowed.includes(candidate.type)&&candidate.id!==asset?.id&&!assetPath(candidate).some(node=>node.id===asset?.id));
  const initialParent=()=>{
    if(!draftType)return asset?.parent||'';
    let node=byId(selectedId);
    while(node&&!allowed.includes(node.type))node=node.parent?byId(node.parent):undefined;
    return node?.id||parentOptions[0]?.id||'';
  };
  const [parentId,setParentId]=useState(initialParent);
  const [name,setName]=useState(draftType?'':asset?.name||'');
  const [code,setCode]=useState(draftType?'':asset?.code||(asset?.type==='Sensor'?slug(asset.name):''));
  const [description,setDescription]=useState(draftType?'':asset?.description||'');
  const health:Health=asset?.health||'Healthy';
  const [aiEnabled,setAiEnabled]=useState(asset?.aiEnabled??true);
  const [sensorType,setSensorType]=useState(asset?.sensorType||(/temp/i.test(asset?.name||'')?'Temperature':/press/i.test(asset?.name||'')?'Pressure':'Vibration'));
  const [metric,setMetric]=useState(asset?.metric||(/temp/i.test(asset?.name||'')?'Temperature':/press/i.test(asset?.name||'')?'Pressure':'Velocity'));
  const [unit,setUnit]=useState(asset?.unit||(/temp/i.test(asset?.name||'')?'°C':/press/i.test(asset?.name||'')?'bar':'mm/s'));
  const [qos,setQos]=useState(asset?.qos??1);
  const payloadFormat=asset?.payloadFormat||'JSON';
  const direction=asset?.direction||'Telemetry (Publish)';
  const [autoTopic,setAutoTopic]=useState(!asset?.topic);
  const [manualTopic,setManualTopic]=useState(asset?.topic||'');
  const [error,setError]=useState('');
  const [confirmDelete,setConfirmDelete]=useState(false);
  const parent=byId(parentId);
  const generatedTopic=useMemo(()=>[...(parent?assetPath(parent):[]).map(node=>slug(node.code||node.name)),slug(code||name||'sensor'),slug(metric||'telemetry')].filter(Boolean).join('/'),[parent,code,name,metric]);
  const topic=autoTopic?generatedTopic:manualTopic;
  useEffect(()=>onPreview({parentId,name:isSensor?(name||`${code||'New sensor'} (${sensorType})`):name,kind,topic:isSensor?topic:''}),[parentId,name,code,sensorType,isSensor,kind,topic,onPreview]);
  const save=()=>{
    if(!parentId&&!isRoot){setError(`Add a ${allowed.join(' or ')} first.`);return}
    if(isSensor&&!code.trim()){setError('Enter a sensor ID.');return}
    if(!isSensor&&!name.trim()){setError('Enter a name.');return}
    if(isSensor&&(!metric.trim()||!unit.trim()||!topic.trim())){setError('Complete the metric, unit, and MQTT topic.');return}
    const displayName=isSensor?(name.trim()||`${code.trim()} (${sensorType})`):name.trim();
    const change:Partial<Asset>={name:displayName,code:code.trim(),parent:parentId,description:description.trim(),health,aiEnabled};
    if(isSensor)Object.assign(change,{sensorType,metric:metric.trim(),unit:unit.trim(),topic:topic.trim(),qos,payloadFormat,direction});
    try{
      const saved=draftType?addHierarchyAsset({...change,name:displayName,type:typeForKind(draftType),parent:parentId} as Omit<Asset,'id'|'health'|'children'>):updateHierarchyAsset(asset!.id,change);
      onSaved(saved);
    }catch(cause){setError(cause instanceof Error?cause.message:'Could not save.');}
  };
  return <section className="am-card am-form-card">
    <div className="am-card-head"><div><span className="am-kicker">{draftType?'NEW HIERARCHY NODE':'NODE CONFIGURATION'}</span><h2>{draftType?`Add ${draftType}`:asset?.name}</h2></div><span className="am-kind-badge">{kind}</span></div>
    <div className="am-form-scroll">
      <div className="am-section-title"><Activity size={16}/>{isSensor?'Sensor details':`${kind} details`}</div>
      <div className="am-form-grid">
        <label><span>{isSensor?'Sensor ID':'Name'} <b>*</b></span><input value={isSensor?code:name} onChange={event=>isSensor?setCode(event.target.value):setName(event.target.value)} placeholder={isSensor?'e.g. Vib01':`Enter ${kind.toLowerCase()} name`}/></label>
        <label>{isSensor?'Sensor type':'Code / ID'}{isSensor?<select value={sensorType} onChange={event=>setSensorType(event.target.value)}>{sensorTypes.map(type=><option key={type}>{type}</option>)}</select>:<input value={code} onChange={event=>setCode(event.target.value)} placeholder="Optional short ID"/>}</label>
        <label><span>Parent {!isRoot&&<b>*</b>}</span><select value={parentId} onChange={event=>setParentId(event.target.value)} disabled={isRoot}>{isRoot?<option value="">World root</option>:parentOptions.length===0?<option value="">No eligible parent</option>:parentOptions.map(option=><option key={option.id} value={option.id}>{option.name} · {kindOf(option)}</option>)}</select></label>
        {isSensor?<label><span>Measurement / metric <b>*</b></span><input value={metric} onChange={event=>setMetric(event.target.value)} placeholder="e.g. Velocity"/></label>:null}
        {isSensor&&<label><span>Unit <b>*</b></span><input value={unit} onChange={event=>setUnit(event.target.value)} placeholder="e.g. mm/s"/></label>}
        {isSensor&&<label>Display name<input value={name} onChange={event=>setName(event.target.value)} placeholder="Optional name"/></label>}

        {!isSensor&&asset&&['Machine','Component'].includes(asset.type)&&hasSensor(asset)&&<label className="am-span-2 am-ai-option"><span>AI predictions</span><span className="am-ai-control"><input type="checkbox" checked={aiEnabled} onChange={event=>setAiEnabled(event.target.checked)}/> Enable AI for this asset</span></label>}

      </div>
      {isSensor&&<><div className="am-section-title am-section-between"><span><RadioIcon/> MQTT configuration</span><label className="am-inline-check"><input type="checkbox" checked={autoTopic} onChange={event=>setAutoTopic(event.target.checked)}/> Auto-generate topic</label></div>
        <div className="am-form-grid"><label className="am-span-2"><span>MQTT topic <b>*</b></span><div className="am-topic-input"><input value={topic} onChange={event=>setManualTopic(event.target.value)} readOnly={autoTopic}/><button type="button" onClick={()=>void navigator.clipboard?.writeText(topic)} title="Copy topic" aria-label="Copy topic"><Copy size={15}/></button></div></label>



          <label>QoS<select value={qos} onChange={event=>setQos(Number(event.target.value))}><option value={0}>0 · At most once</option><option value={1}>1 · At least once</option><option value={2}>2 · Exactly once</option></select></label>
        </div></>}
      <div className="am-form-grid"><label className="am-span-2">Notes<input value={description} onChange={event=>setDescription(event.target.value)} placeholder="Optional context for maintenance"/></label></div>
      {error&&<p className="am-error" role="alert">{error}</p>}
    </div>
    {confirmDelete&&asset&&<div className="am-delete-confirm" role="alertdialog" aria-label={`Delete ${asset.name}`}><span>Delete <strong>{asset.name}</strong>{asset.children?.length?' and everything beneath it':''}?</span><div><button type="button" onClick={()=>setConfirmDelete(false)}>Cancel</button><button type="button" className="confirm" onClick={()=>onDelete(asset.id)}>Delete</button></div></div>}
    <div className="am-form-actions">{asset&&(asset.parent||assets.filter(a=>a.type==='Plant'&&!a.parent).length>1)&&<button type="button" className="am-delete-button" onClick={()=>setConfirmDelete(true)}><Trash2 size={15}/> Delete</button>}<button type="button" className="am-secondary" onClick={onCancel}>Cancel</button><button type="button" className="am-primary" onClick={save}><Save size={15}/>{draftType?`Save ${draftType}`:'Save changes'}</button></div>
  </section>;
}
function RadioIcon(){return <span className="am-radio-symbol">◉</span>}






