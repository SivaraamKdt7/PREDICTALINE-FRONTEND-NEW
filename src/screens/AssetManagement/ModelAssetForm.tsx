import { useEffect, useMemo, useState } from 'react';
import { Cpu, Radio, Save, Trash2 } from 'lucide-react';
import { assetPath, assets, byId, type Asset } from '../../data';
import { listAssetModels, saveAssetInstance, sensorLocations as locationOptions, topicSlug, type AssetModel } from '../../services/assetModelService';
import type { AssetPreview } from './AssetForm';

type Props={asset?:Asset;selectedId:string;onSaved:(asset:Asset)=>void;onDelete:(id:string)=>void;onCancel:()=>void;onPreview:(preview:AssetPreview)=>void};
const parents=()=>assets.filter(node=>node.type==='Line'||node.type==='Area');
function initialParent(selectedId:string,asset?:Asset){if(asset?.parent)return asset.parent;let node=byId(selectedId);while(node&&!['Line','Area'].includes(node.type))node=node.parent?byId(node.parent):undefined;return node?.id||parents()[0]?.id||''}
const suggested=(parentId:string,assetName:string,location:string,sensorKey:string)=>{const parent=byId(parentId);return [...(parent?assetPath(parent):[]).map(node=>topicSlug(node.code||node.name)),topicSlug(assetName||'asset'),...(location==='General'?[]:[topicSlug(location)]),topicSlug(sensorKey)].filter(Boolean).join('/')};
export default function ModelAssetForm({asset,selectedId,onSaved,onDelete,onCancel,onPreview}:Props){
  const [models,setModels]=useState<AssetModel[]>([]);
  const [modelId,setModelId]=useState(asset?.modelId||'');
  const [parentId,setParentId]=useState(()=>initialParent(selectedId,asset));
  const [name,setName]=useState(asset?.name||'');
  const [code,setCode]=useState(asset?.code||'');
  const [aiEnabled,setAiEnabled]=useState(asset?.aiEnabled??true);
  const childSensors=(asset?.children||[]).map(byId).filter((item):item is Asset=>!!item&&!!item.measurementKey);
  const [topics,setTopics]=useState<Record<string,string>>(()=>Object.fromEntries(childSensors.map(item=>[item.measurementKey!,item.topic||''])));
  const [sensorLocations,setSensorLocations]=useState<Record<string,string>>(()=>Object.fromEntries(childSensors.map(item=>[item.measurementKey!,item.sensorLocation||'General'])));
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const [confirmDelete,setConfirmDelete]=useState(false);
  useEffect(()=>{let active=true;listAssetModels().then(rows=>{if(!active)return;setModels(rows);if(!asset?.modelId){const latest=rows.filter(row=>row.version===Math.max(...rows.filter(other=>other.name===row.name).map(other=>other.version)));setModelId(latest[0]?.id||'')}}).catch(cause=>active&&setError(cause instanceof Error?cause.message:'Could not load models.'));return()=>{active=false}},[asset?.modelId]);
  const model=useMemo(()=>models.find(row=>row.id===modelId),[models,modelId]);
  const modelOptions=models.filter(row=>row.version===Math.max(...models.filter(other=>other.name===row.name).map(other=>other.version)));
  const topicFor=(key:string)=>topics[key]??suggested(parentId,code||name,sensorLocations[key]||'General',key);
  useEffect(()=>onPreview({parentId,name,kind:'Asset',topic:model?.measurements[0]?topicFor(model.measurements[0].key):''}),[parentId,name,code,model,topics,sensorLocations,onPreview]);
  const save=async()=>{if(!model)return setError('Create an Asset Model in Configuration first.');setLoading(true);setError('');try{const saved=await saveAssetInstance({modelId,parentId,name,code,topics:Object.fromEntries(model.measurements.map(row=>[row.key,topicFor(row.key)])),sensorLocations,aiEnabled},asset?.id);onSaved(saved)}catch(cause){setError(cause instanceof Error?cause.message:'Could not save asset.')}finally{setLoading(false)}};
  return <section className="am-card am-form-card"><div className="am-card-head"><div><span className="am-kicker">{asset?'MODEL-BASED ASSET':'NEW MODEL-BASED ASSET'}</span><h2>{asset?asset.name:'Add Asset'}</h2></div><span className="am-kind-badge">Asset</span></div>
    <div className="am-form-scroll"><div className="am-section-title"><Cpu size={16}/> Asset details</div><div className="am-form-grid">
      <label>Name <b>*</b><input value={name} onChange={event=>setName(event.target.value)} placeholder="e.g. Motor 02"/></label>
      <label>Asset ID <b>*</b><input value={code} disabled={!!asset?.code} onChange={event=>setCode(event.target.value)} placeholder="e.g. MOTOR-02"/></label>
      <label className="am-span-2">Parent <b>*</b><select value={parentId} onChange={event=>setParentId(event.target.value)}>{parents().map(node=><option key={node.id} value={node.id}>{assetPath(node).map(item=>item.name).join(' / ')}</option>)}</select></label>
      <label className="am-span-2">Model type <b>*</b><select value={modelId} onChange={event=>{setModelId(event.target.value);setTopics({});setSensorLocations({})}}>{!modelOptions.length&&<option value="">No models available</option>}{asset?.modelId&&models.find(item=>item.id===asset.modelId)&&!modelOptions.some(item=>item.id===asset.modelId)&&<option value={asset.modelId}>{models.find(item=>item.id===asset.modelId)?.name} v{models.find(item=>item.id===asset.modelId)?.version}</option>}{modelOptions.map(row=><option key={row.id} value={row.id}>{row.name} · v{row.version}</option>)}</select></label>
    </div>
    {asset&&modelId!==asset.modelId&&<p className="am-model-note">Changing the model replaces sensors created from the previous model. Assets with sensor readings cannot be changed.</p>}
    {model&&<><div className="am-section-title"><Radio size={16}/> Sensor MQTT configuration</div><p className="am-model-note">The selected model adds these sensors beneath this asset. Choose an optional mounting location for each sensor, then confirm its MQTT topic.</p>
      <div className="am-model-measurements">{model.measurements.map(row=><div className="am-model-sensor" key={row.key}><div><strong>{row.name}</strong><small>{row.dataType} · {row.unit||'No unit'}</small></div><label>Mounting location (optional)<select aria-label={`${row.name} location`} value={sensorLocations[row.key]||'General'} onChange={event=>setSensorLocations({...sensorLocations,[row.key]:event.target.value})}>{locationOptions.map(location=><option key={location} value={location}>{location}</option>)}</select></label><label className="am-model-topic">MQTT topic<input aria-label={`${row.name} MQTT topic`} value={topicFor(row.key)} onChange={event=>setTopics({...topics,[row.key]:event.target.value})}/></label></div>)}</div>
      <label className="am-model-ai"><input type="checkbox" checked={aiEnabled} onChange={event=>setAiEnabled(event.target.checked)}/> Enable AI predictions for this asset</label></>}
      {error&&<p className="am-error" role="alert">{error}</p>}
    </div>
    {confirmDelete&&asset&&<div className="am-delete-confirm" role="alertdialog" aria-label={`Delete ${asset.name}`}><span>Delete <strong>{asset.name}</strong> and its sensors?</span><div><button type="button" onClick={()=>setConfirmDelete(false)}>Cancel</button><button type="button" className="confirm" onClick={()=>onDelete(asset.id)}>Delete</button></div></div>}
    <div className="am-form-actions">{asset&&<button type="button" className="am-delete-button" onClick={()=>setConfirmDelete(true)}><Trash2 size={15}/> Delete</button>}<button type="button" className="am-secondary" onClick={onCancel}>Cancel</button><button type="button" className="am-primary" disabled={loading||!model} onClick={()=>void save()}><Save size={15}/>{asset?'Save changes':'Create asset and sensors'}</button></div>
  </section>;
}



