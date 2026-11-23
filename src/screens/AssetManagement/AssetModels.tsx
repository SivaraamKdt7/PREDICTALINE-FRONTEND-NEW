import { useEffect, useState } from 'react';
import { Boxes, Check, CopyPlus, Plus, Save, Trash2 } from 'lucide-react';
import { assets } from '../../data';
import { createAssetModel, deleteAssetModel, listAssetModels, modelKey, sensorPresets, type AssetModel, type ModelDraft, type ModelMeasurement } from '../../services/assetModelService';
import './assetModels.css';

const empty=():ModelDraft=>({name:'',measurements:[]});
export default function AssetModels(){
  const [models,setModels]=useState<AssetModel[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [draft,setDraft]=useState<ModelDraft|null>(null);
  const [versionFrom,setVersionFrom]=useState<string|null>(null);
  const [deleteId,setDeleteId]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const selected=models.find(model=>model.id===selectedId);
  const refresh=async(prefer?:string)=>{const rows=await listAssetModels();setModels(rows);setSelectedId(prefer&&rows.some(row=>row.id===prefer)?prefer:rows.some(row=>row.id===selectedId)?selectedId:rows[0]?.id||'')};
  useEffect(()=>{void listAssetModels().then(rows=>{setModels(rows);setSelectedId(rows[0]?.id||'')})},[]);
  const togglePreset=(preset:typeof sensorPresets[number])=>{
    if(!draft)return;
    const exists=draft.measurements.some(item=>item.sensorType===preset.type);
    setDraft({...draft,measurements:exists?draft.measurements.filter(item=>item.sensorType!==preset.type):[...draft.measurements,{key:modelKey(preset.type),name:preset.type,sensorType:preset.type,dataType:preset.dataType,unit:preset.unit}]});
  };
  const duplicate=(index:number)=>{
    if(!draft)return;const source=draft.measurements[index];let count=2;let key=modelKey(source.sensorType+count);
    while(draft.measurements.some(item=>item.key.toLowerCase()===key.toLowerCase())){count++;key=modelKey(source.sensorType+count)}
    setDraft({...draft,measurements:[...draft.measurements,{...source,key,name:`${source.sensorType} ${count}`}]});
  };
  const change=(index:number,patch:Partial<ModelMeasurement>)=>{if(draft)setDraft({...draft,measurements:draft.measurements.map((item,i)=>i===index?{...item,...patch}:item)})};
  const save=async()=>{if(!draft)return;setBusy(true);setError('');try{const created=await createAssetModel(draft);setDraft(null);setVersionFrom(null);await refresh(created.id)}catch(cause){setError(cause instanceof Error?cause.message:'Could not save model.')}finally{setBusy(false)}};
  const remove=async()=>{setBusy(true);setError('');try{await deleteAssetModel(deleteId);setDeleteId('');const rows=await listAssetModels();setModels(rows);setSelectedId(rows[0]?.id||'')}catch(cause){setError(cause instanceof Error?cause.message:'Could not delete model.')}finally{setBusy(false)}};
  return <div className="models-layout">
    <aside className="models-list am-card"><div className="am-card-head"><div><span className="am-kicker">SENSOR TEMPLATES</span><h2>Asset models</h2></div><button className="am-primary" type="button" onClick={()=>{setDraft(empty());setVersionFrom(null);setError('')}}><Plus size={14}/> New</button></div>
      <div className="models-list-body">{models.map(model=><button key={model.id} type="button" className={'models-list-item '+(selectedId===model.id&&!draft?'selected':'')} onClick={()=>{setSelectedId(model.id);setDraft(null);setVersionFrom(null);setDeleteId('');setError('')}}><Boxes size={17}/><span><strong>{model.name} <small>v{model.version}</small></strong><small>{model.measurements.length} sensors · {assets.filter(asset=>asset.type==='Machine'&&asset.modelId===model.id).length} assets</small></span></button>)}</div>
    </aside>
    <section className="models-main am-card">{draft?<><div className="am-card-head"><div><span className="am-kicker">{versionFrom?'NEW MODEL VERSION':'NEW ASSET MODEL'}</span><h2>{draft.name||'Create model'}</h2></div><span className="am-kind-badge">Draft</span></div>
      <div className="models-form"><label className="models-field">Model name<input value={draft.name} disabled={!!versionFrom} onChange={event=>setDraft({...draft,name:event.target.value})} placeholder="e.g. MotorModel"/><small>Fixed after saving. Create a new version to change its sensors.</small></label>
        <div className="models-section-head"><div><strong>Sensors</strong><small>Select any combination used by this equipment</small></div></div>
        <div className="models-presets">{sensorPresets.map(preset=>{const active=draft.measurements.some(item=>item.sensorType===preset.type);return <button type="button" key={preset.type} className={active?'selected':''} aria-pressed={active} onClick={()=>togglePreset(preset)}><Check size={13}/>{preset.type}</button>})}</div>
        <div className="models-rows">{draft.measurements.map((item,index)=><div className="models-row measurement" key={item.key}><div><strong>{item.name}</strong><small>{item.sensorType} · {item.key}</small></div><select aria-label={`${item.name} data type`} value={item.dataType} onChange={event=>change(index,{dataType:event.target.value as ModelMeasurement['dataType']})}><option value="number">Number</option><option value="string">String</option></select><input aria-label={`${item.name} unit`} value={item.unit} onChange={event=>change(index,{unit:event.target.value})} placeholder="Unit"/><button type="button" aria-label={`Duplicate ${item.name}`} title="Add a second sensor of this type" onClick={()=>duplicate(index)}><CopyPlus size={15}/></button><button type="button" aria-label={`Remove ${item.name}`} onClick={()=>setDraft({...draft,measurements:draft.measurements.filter((_,i)=>i!==index)})}><Trash2 size={15}/></button></div>)}{!draft.measurements.length&&<p className="models-empty">Select at least one sensor type above.</p>}</div>
        {error&&<p className="am-error" role="alert">{error}</p>}
      </div><div className="am-form-actions"><button type="button" className="am-secondary" onClick={()=>{setDraft(null);setVersionFrom(null);setError('')}}>Cancel</button><button type="button" className="am-primary" disabled={busy} onClick={()=>void save()}><Save size={15}/> Save model</button></div></>:
    selected?<><div className="am-card-head"><div><span className="am-kicker">READ-ONLY · VERSION {selected.version}</span><h2>{selected.name}</h2></div><span className="am-kind-badge">{assets.filter(asset=>asset.type==='Machine'&&asset.modelId===selected.id).length} assets</span></div><div className="models-form"><p className="models-helper">This version is fixed. New versions do not change existing assets.</p><div className="models-section-head"><div><strong>Sensors</strong><small>{selected.measurements.length} defined</small></div></div>{selected.measurements.map(row=><div className="models-read-row" key={row.key}><strong>{row.name}</strong><span>{row.dataType} · {row.unit||'No unit'}</span></div>)}{error&&<p className="am-error" role="alert">{error}</p>}</div><div className="am-form-actions models-actions">{deleteId===selected.id?<><span>Delete this unused version?</span><button type="button" className="am-secondary" onClick={()=>setDeleteId('')}>Cancel</button><button type="button" className="am-delete-button" disabled={busy} onClick={()=>void remove()}>Delete version</button></>:<><button type="button" className="am-delete-button" disabled={assets.some(asset=>asset.modelId===selected.id)} title={assets.some(asset=>asset.modelId===selected.id)?'This version is in use':''} onClick={()=>setDeleteId(selected.id)}><Trash2 size={14}/> Delete</button><button type="button" className="am-primary" onClick={()=>{setDraft({name:selected.name,measurements:structuredClone(selected.measurements)});setVersionFrom(selected.id);setError('')}}><CopyPlus size={15}/> New version</button></>}</div></>:
    <p className="models-empty">Create a model to choose its sensor types.</p>}</section>
  </div>;
}

