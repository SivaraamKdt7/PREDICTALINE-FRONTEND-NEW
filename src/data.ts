export type Health = 'Healthy' | 'Warning' | 'Critical';
export type Asset = { id: string; name: string; type: string; parent?: string; health: Health; topic?: string; value?: string; unit?: string; children?: string[]; code?: string; description?: string; sensorType?: string; metric?: string; qos?: number; payloadFormat?: string; direction?: string; aiEnabled?: boolean; modelId?: string; measurementKey?: string; attributeValues?: Record<string,string>; createdLocally?: boolean; manufacturer?: string; serialNumber?: string; modelNumber?: string; installedAt?: string; sensorLocation?: string; dataType?: string };
export const assets: Asset[] = [
  {id:'plant',name:'NMDC',type:'Plant',health:'Healthy',children:['site','bacheli','donimalai','kumaraswamy']},
  {id:'site',name:'Kirandul',type:'Site',parent:'plant',health:'Healthy',children:['mining','production','screening','beneficiation']},
  {id:'mining',name:'Mining',type:'Area',parent:'site',health:'Healthy'},
  {id:'production',name:'Crushing Plant',type:'Area',parent:'site',health:'Warning',children:['line1','conveyor']},
  {id:'line1',name:'Crushing Line 01',type:'Line',parent:'production',health:'Warning',children:['crusher']},
  {id:'crusher',name:'Crusher 01',type:'Machine',parent:'line1',health:'Warning',children:['motor','bearing']},
  {id:'motor',name:'Motor 01',type:'Component',parent:'crusher',health:'Warning',children:['vibration','temperature']},
  {id:'vibration',name:'Vib01 (Vibration)',type:'Sensor',parent:'motor',health:'Warning',topic:'nmdc/kirandul/crushing-plant/crushing-line-01/crusher-01/motor-01/vib01/velocity',value:'4.82',unit:'mm/s'},
  {id:'temperature',name:'Temp01 (Temperature)',type:'Sensor',parent:'motor',health:'Healthy',topic:'nmdc/kirandul/crushing-plant/crushing-line-01/crusher-01/motor-01/temp01/temperature',value:'68.4',unit:'°C'},
  {id:'bearing',name:'Bearing 01',type:'Component',parent:'crusher',health:'Warning',children:['current']},
  {id:'current',name:'Temp02 (Temperature)',type:'Sensor',parent:'bearing',health:'Healthy',topic:'nmdc/kirandul/crushing-plant/crushing-line-01/crusher-01/bearing-01/temp02/temperature',value:'72.1',unit:'°C'},
  {id:'conveyor',name:'Conveyor 01',type:'Machine',parent:'production',health:'Healthy',children:['speed']},
  {id:'speed',name:'Speed sensor',type:'Sensor',parent:'conveyor',health:'Healthy',topic:'nmdc/kirandul/crushing-plant/conveyor-01/speed',value:'989.6',unit:'rpm'},
  {id:'screening',name:'Screening Plant',type:'Area',parent:'site',health:'Healthy'},
  {id:'beneficiation',name:'Beneficiation',type:'Area',parent:'site',health:'Healthy'},
  {id:'bacheli',name:'Bacheli',type:'Site',parent:'plant',health:'Healthy'},
  {id:'donimalai',name:'Donimalai',type:'Site',parent:'plant',health:'Healthy'},
  {id:'kumaraswamy',name:'Kumaraswamy',type:'Site',parent:'plant',health:'Healthy'}
];
const modelAssetsStorageKey='predictaline.modelAssets.v1';
try{
  const saved=typeof localStorage==='undefined'?null:localStorage.getItem(modelAssetsStorageKey);
  const restored=saved?JSON.parse(saved) as Asset[]:[];
  for(const node of restored)if(!assets.some(existing=>existing.id===node.id))assets.push(node);
  for(const node of restored){const parent=node.parent?assets.find(item=>item.id===node.parent):undefined;if(parent&&!parent.children?.includes(node.id))parent.children=[...(parent.children||[]),node.id]}
}catch{/* Keep demo hierarchy when storage is unavailable. */}
export function persistModelAssets(){try{localStorage.setItem(modelAssetsStorageKey,JSON.stringify(assets.filter(asset=>asset.modelId||asset.createdLocally)))}catch{/* Demo data still works in memory. */}}export const byId = (id: string) => assets.find(a => a.id === id);
export type HierarchyKind = 'Enterprise'|'Site'|'Area'|'Work Center'|'Asset'|'Component'|'Sensor';
export const kindOf = (asset:Asset):HierarchyKind|'Enterprise' => asset.type==='Plant'?'Enterprise':asset.type==='Line'?'Work Center':asset.type==='Machine'?'Asset':asset.type as HierarchyKind;
export const parentTypes:Record<HierarchyKind,string[]> = {Enterprise:[],Site:['Plant'],Area:['Site'], 'Work Center':['Area'],Asset:['Line','Area'],Component:['Machine','Component'],Sensor:['Machine','Component']};
export const typeForKind = (kind:HierarchyKind) => kind==='Enterprise'?'Plant':kind==='Work Center'?'Line':kind==='Asset'?'Machine':kind;
export const assetPath = (asset:Asset):Asset[] => {const path:Asset[]=[];let node:Asset|undefined=asset;while(node){path.unshift(node);node=node.parent?byId(node.parent):undefined}return path};
export function addHierarchyAsset(details:Omit<Asset,'id'|'health'|'children'>):Asset {
  const parent=details.parent?byId(details.parent):undefined;
  if(!parent&&details.type!=='Plant')throw new Error('Choose a parent asset.');
  const asset:Asset={...details,id:globalThis.crypto?.randomUUID?.()||`asset-${Date.now()}`,health:'Healthy',children:[],createdLocally:true};
  assets.push(asset);if(parent)parent.children=[...(parent.children||[]),asset.id];persistModelAssets();return asset;
}
export function updateHierarchyAsset(id:string,change:Partial<Asset>):Asset {
  const asset=byId(id);if(!asset)throw new Error('Asset not found.');
  if(change.parent&&change.parent!==asset.parent){
    const parent=byId(change.parent);if(!parent)throw new Error('Parent not found.');
    const previous=asset.parent?byId(asset.parent):undefined;
    if(previous)previous.children=(previous.children||[]).filter(child=>child!==id);
    parent.children=[...(parent.children||[]),id];
  }
  Object.assign(asset,change);if(asset.modelId||asset.createdLocally)persistModelAssets();return asset;
}
export function deleteHierarchyAsset(id:string):{nextId:string;count:number} {
  const asset=byId(id);if(!asset)throw new Error('Asset not found.');
  const parent=asset.parent?byId(asset.parent):undefined;
  if(!parent&&assets.filter(a=>a.type==='Plant'&&!a.parent).length===1)throw new Error('Keep at least one enterprise in the hierarchy.');
  const ids=new Set<string>();
  const collect=(node:Asset)=>{ids.add(node.id);(node.children||[]).forEach(childId=>{const child=byId(childId);if(child)collect(child)})};
  collect(asset);
  if(parent)parent.children=(parent.children||[]).filter(childId=>childId!==id);
  for(const list of [assets,sensors,machines])for(let index=list.length-1;index>=0;index--)if(ids.has(list[index].id))list.splice(index,1);
  for(let index=alerts.length-1;index>=0;index--)if(ids.has(alerts[index].assetId))alerts.splice(index,1);
  persistModelAssets();return {nextId:parent?.id||assets.find(a=>a.type==='Plant'&&!a.parent)?.id||'',count:ids.size};
}
export const sensors = assets.filter(a => a.type === 'Sensor');
export const machines = assets.filter(a => a.type === 'Machine' || a.id === 'motor');
export const alerts = [
  {id:1,asset:'Motor 01',assetId:'motor',severity:'Critical',message:'Vibration exceeds baseline; inspect Bearing 01.',time:'8 min ago',read:false},
  {id:2,asset:'Crusher 01',assetId:'crusher',severity:'Warning',message:'Crusher vibration is above the expected range.',time:'22 min ago',read:false},
  {id:3,asset:'Bearing 01',assetId:'bearing',severity:'Warning',message:'Bearing wear pattern detected in the last 24 hours.',time:'1 hr ago',read:true}
];
export function addTopic(path: string): Asset {
  const clean = path.trim().replace(/^\/+|\/+$/g, '');
  const existing = assets.find(a => a.topic === clean);
  if (existing) return existing;
  const lower = clean.toLowerCase();
  const parentId = lower.includes('bearing-01') ? 'bearing' : lower.includes('conveyor-01') ? 'conveyor' : lower.includes('crusher-01') && !lower.includes('motor-01') ? 'crusher' : 'motor';
  const parent = byId(parentId)!;
  const name = clean.split('/').pop()?.replace(/[-_]/g, ' ') || 'New topic';
  const asset: Asset = { id: 'topic-' + Date.now(), name: name.charAt(0).toUpperCase() + name.slice(1), type: 'Sensor', parent: parentId, health: 'Healthy', topic: clean, value: '—', unit: '' };
  assets.push(asset);
  parent.children = [...(parent.children || []), asset.id];
  return asset;
}




