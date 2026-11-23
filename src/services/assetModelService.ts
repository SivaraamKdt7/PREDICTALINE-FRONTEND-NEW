import { addHierarchyAsset, assets, byId, sensors, machines, updateHierarchyAsset, deleteHierarchyAsset, persistModelAssets, type Asset } from '../data';

export type ModelMeasurement={key:string;name:string;sensorType:string;dataType:'number'|'string';unit:string};
export type AssetModel={id:string;name:string;version:number;measurements:ModelMeasurement[];createdAt:string};
export type ModelDraft=Pick<AssetModel,'name'|'measurements'>;
export type AssetInstanceInput={modelId:string;parentId:string;name:string;code:string;topics:Record<string,string>;sensorLocations:Record<string,string>;aiEnabled:boolean};

export const sensorPresets=[
  {type:'Temperature',unit:'°C',dataType:'number'},
  {type:'Vibration',unit:'mm/s',dataType:'number'},
  {type:'Pressure',unit:'bar',dataType:'number'},
  {type:'Current',unit:'A',dataType:'number'},
  {type:'Voltage',unit:'V',dataType:'number'},
  {type:'Speed',unit:'rpm',dataType:'number'},
  {type:'Flow',unit:'m³/h',dataType:'number'},
  {type:'Level',unit:'%',dataType:'number'},
  {type:'Proximity',unit:'mm',dataType:'number'},
  {type:'Displacement',unit:'mm',dataType:'number'},
  {type:'Strain',unit:'µε',dataType:'number'},
  {type:'Load',unit:'kN',dataType:'number'},
  {type:'Torque',unit:'Nm',dataType:'number'},
  {type:'Acoustic',unit:'dB',dataType:'number'},
  {type:'Dust',unit:'mg/m³',dataType:'number'},
  {type:'Gas',unit:'ppm',dataType:'number'},
  {type:'Status',unit:'',dataType:'string'},
  {type:'Fault code',unit:'',dataType:'string'},
] as const;
export const sensorLocations=['General','Bearing','Shaft','Motor winding','Housing','Inlet','Outlet','Impeller','Gearbox','Conveyor belt','Hydraulic line','Electrical panel','Other'] as const;

const key='predictaline.assetModels.v1';
const initial:AssetModel[]=[
  {id:'MotorModel:v1',name:'MotorModel',version:1,measurements:[{key:'vibration',name:'Vibration',sensorType:'Vibration',dataType:'number',unit:'mm/s'},{key:'temperature',name:'Temperature',sensorType:'Temperature',dataType:'number',unit:'°C'}],createdAt:'2026-11-23T00:00:00.000Z'},
  {id:'PumpModel:v1',name:'PumpModel',version:1,measurements:[{key:'pressure',name:'Pressure',sensorType:'Pressure',dataType:'number',unit:'bar'},{key:'flow',name:'Flow',sensorType:'Flow',dataType:'number',unit:'m³/h'}],createdAt:'2026-11-23T00:00:00.000Z'}
];
const normalize=(model:AssetModel):AssetModel=>({...model,measurements:(model.measurements||[]).map(row=>({...row,dataType:row.dataType==='number'?'number':'string'}))});
const read=():AssetModel[]=>{try{const raw=localStorage.getItem(key);return raw?(JSON.parse(raw) as AssetModel[]).map(normalize):initial}catch{return initial}};
const write=(models:AssetModel[])=>{try{localStorage.setItem(key,JSON.stringify(models))}catch{/* mock storage unavailable */}};
export const modelKey=(value:string)=>value.trim().replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_|_$/g,'').replace(/^[0-9]/,'_$&');
export const topicSlug=(value:string)=>value.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export async function listAssetModels():Promise<AssetModel[]>{return read().map(model=>structuredClone(model))}
export async function getAssetModel(id:string):Promise<AssetModel|undefined>{return (await listAssetModels()).find(model=>model.id===id)}
export async function createAssetModel(draft:ModelDraft):Promise<AssetModel>{
  const name=draft.name.trim();
  if(!/^[A-Za-z][A-Za-z0-9_]{2,63}$/.test(name))throw new Error('Use 3–64 letters, numbers or underscores; start with a letter.');
  const models=read();const versions=models.filter(model=>model.name.toLowerCase()===name.toLowerCase());
  if(versions.length&&versions[0].name!==name)throw new Error('Model name must match the existing version exactly.');
  if(!draft.measurements.length)throw new Error('Select at least one sensor type.');
  if(new Set(draft.measurements.map(row=>row.key.toLowerCase())).size!==draft.measurements.length)throw new Error('Sensor keys must be unique.');
  for(const row of draft.measurements)if(!row.key.trim()||!row.name.trim())throw new Error('Complete every sensor definition.');
  const version=Math.max(0,...versions.map(model=>model.version))+1;
  const model:AssetModel={id:`${name}:v${version}`,name,version,measurements:structuredClone(draft.measurements),createdAt:new Date().toISOString()};
  write([...models,model]);return structuredClone(model);
}
export async function deleteAssetModel(id:string):Promise<void>{
  if(assets.some(asset=>asset.modelId===id))throw new Error('This model is used by an asset. Remove the asset before deleting the model.');
  const models=read();if(!models.some(model=>model.id===id))throw new Error('Model not found.');
  write(models.filter(model=>model.id!==id));
}
export async function saveAssetInstance(input:AssetInstanceInput,existingId?:string):Promise<Asset>{
  const model=await getAssetModel(input.modelId);if(!model)throw new Error('Select an available model.');
  const parent=byId(input.parentId);if(!parent||!['Line','Area'].includes(parent.type))throw new Error('Select an area or work center parent.');
  if(!input.name.trim())throw new Error('Enter an asset name.');
  if(!input.code.trim())throw new Error('Enter an Asset ID.');
  if(assets.some(item=>item.type==='Machine'&&item.code?.toLowerCase()===input.code.trim().toLowerCase()&&item.id!==existingId))throw new Error('Asset ID is already in use.');
  if(existingId&&byId(existingId)?.code&&byId(existingId)?.code!==input.code.trim())throw new Error('Asset ID cannot be changed after creation.');
  const ownChildren=existingId?new Set((byId(existingId)?.children||[]).map(byId).filter((child):child is Asset=>!!child?.measurementKey).map(child=>child.id)):new Set<string>();
  const topics=model.measurements.map(measurement=>input.topics[measurement.key]?.trim()||'');
  if(topics.some(topic=>!topic))throw new Error('Enter an MQTT topic for each sensor.');
  if(new Set(topics).size!==topics.length)throw new Error('Each sensor needs a different MQTT topic.');
  if(topics.some(topic=>assets.some(asset=>asset.type==='Sensor'&&asset.topic===topic&&!ownChildren.has(asset.id))))throw new Error('An MQTT topic is already mapped to another sensor.');
  const common={name:input.name.trim(),code:input.code.trim(),parent:input.parentId,modelId:model.id,aiEnabled:input.aiEnabled};
  let asset:Asset;
  if(existingId){const current=byId(existingId);if(!current)throw new Error('Asset not found.');
    if(current.modelId!==model.id){const generated=(current.children||[]).map(byId).filter((item):item is Asset=>!!item&&!!item.measurementKey);
      if(generated.some(sensor=>sensor.value&&sensor.value!=='—'))throw new Error('This asset already has sensor readings. Create a new asset to use another model.');
      generated.forEach(sensor=>deleteHierarchyAsset(sensor.id));
    }
    asset=updateHierarchyAsset(existingId,common)}
  else {asset=addHierarchyAsset({...common,type:'Machine'});machines.push(asset)}
  for(const measurement of model.measurements){
    const location=input.sensorLocations[measurement.key]||'General';
    const displayName=location==='General'?measurement.name:`${measurement.name} · ${location}`;
    const previous=(asset.children||[]).map(byId).find(child=>child?.measurementKey===measurement.key);
    const sensorDetails={name:displayName,type:'Sensor',parent:asset.id,health:'Healthy' as const,topic:input.topics[measurement.key].trim(),value:'',unit:measurement.unit,sensorType:measurement.sensorType,metric:measurement.name,measurementKey:measurement.key,modelId:model.id,sensorLocation:location,dataType:measurement.dataType};
    if(previous)updateHierarchyAsset(previous.id,{name:displayName,topic:sensorDetails.topic,unit:measurement.unit,sensorType:measurement.sensorType,metric:measurement.name,sensorLocation:location,dataType:measurement.dataType});
    else {const child=addHierarchyAsset(sensorDetails);sensors.push(child)}
  }
  persistModelAssets();return asset;
}




