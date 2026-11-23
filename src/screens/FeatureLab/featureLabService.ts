// Replace these mock methods with FastAPI calls when dataset and feature endpoints exist.
export type Row = Record<string,string|number>;
export type Dataset = {id:string;name:string;rowCount:number;columns:string[];target:string|null;sampleRate:number;uploadedAt:string;rows:Row[]};
export type Trace = {sensor:string;points:{time:string;value:number;group?:string}[];min:number;max:number};
export type TraceResult = {traces:Trace[];groupColumn:string|null;groupCounts:Record<string,number>;start:string;end:string;displayedRows:number;missingRows:number};
export type Feature = {id:string;name:string;source:string;domain:'Time'|'Frequency';score:number;redundancy:number};
export type FeatureRun = {id:string;datasetId:string;createdAt:string;options:FeatureOptions;features:Feature[];windowCount:number;previewRows:{start:string;end:string;values:Record<string,number>}[];spectrum:{frequency:number;power:number}[]};
export type FeatureSet = {id:string;version:number;name:string;datasetId:string;datasetName:string;features:string[];mode:'Target'|'Unsupervised';target:string|null;runId:string;options:FeatureOptions;savedAt:string};
export type FeatureOptions = {sensors:string[];windowSeconds:number;overlap:number;timeDomain:boolean;frequencyDomain:boolean;spectrum:'Welch'|'Autoregressive'};

const demoRows=(shift:number):Row[]=>Array.from({length:240},(_,i)=>({timestamp:new Date(Date.UTC(2026,10,20,8,0,i)).toISOString(),vibration:+(3+Math.sin(i/12)*.6+(i>165?2:0)+shift).toFixed(3),temperature:+(63+i*.025+Math.sin(i/20)*1.7+shift).toFixed(2),current:+(26+Math.sin(i/7)*1.2+(i>165?1.5:0)).toFixed(2),fault:i>205?1:0}));
const storage:Dataset[]=[
  {id:'demo-motor',name:'Motor 01 · condition readings',rowCount:240,columns:['timestamp','vibration','temperature','current','fault'],target:'fault',sampleRate:1,uploadedAt:'Demo dataset',rows:demoRows(0)},
  {id:'demo-bearing',name:'Bearing 01 · unlabeled signals',rowCount:240,columns:['timestamp','vibration','temperature','current'],target:null,sampleRate:1,uploadedAt:'Demo dataset',rows:demoRows(.4).map(({fault:_fault,...row})=>row)},
];
const savedSets:FeatureSet[]=[];
const pause=()=>new Promise<void>(resolve=>setTimeout(resolve,180));
export async function listDatasets(){await pause();return [...storage]}
export async function uploadDataset(file:File):Promise<Dataset>{
  if(!/\.csv$/i.test(file.name))throw new Error('Demo upload supports CSV files. Parquet can be enabled with the backend API.');
  const text=await file.text();const lines=text.trim().split(/\r?\n/);if(lines.length<2)throw new Error('The CSV needs a header and at least one data row.');
  const columns=lines[0].split(',').map(x=>x.trim().replace(/^"|"$/g,''));
  if(new Set(columns).size!==columns.length||columns.some(x=>!x))throw new Error('Column names must be present and unique.');
  const rows=lines.slice(1,2001).filter(Boolean).map(line=>Object.fromEntries(line.split(',').map((cell,i)=>[columns[i],Number.isFinite(Number(cell))&&cell.trim()!==''?Number(cell):cell.trim()]))) as Row[];
  const dataset:Dataset={id:crypto.randomUUID(),name:file.name,rowCount:lines.length-1,columns,target:columns.find(c=>/^(fault|label|rul|target)$/i.test(c))||null,sampleRate:1,uploadedAt:new Date().toISOString(),rows};
  storage.unshift(dataset);await pause();return dataset;
}
export async function updateDataset(id:string,change:Pick<Dataset,'target'|'sampleRate'>){const dataset=storage.find(x=>x.id===id);if(!dataset)throw new Error('Dataset not found.');Object.assign(dataset,change);await pause();return {...dataset}}
export async function getTrace(datasetId:string,sensor:string):Promise<Trace>{
  const dataset=storage.find(x=>x.id===datasetId);if(!dataset)throw new Error('Dataset not found.');
  const points=dataset.rows.map((row,i)=>({time:String(row.timestamp||i/dataset.sampleRate),value:Number(row[sensor])})).filter(p=>Number.isFinite(p.value));
  if(!points.length)throw new Error('No numeric readings found for this sensor.');await pause();return {sensor,points,min:Math.min(...points.map(p=>p.value)),max:Math.max(...points.map(p=>p.value))};
}
// Future FastAPI: POST /feature-lab/datasets/{id}/traces with sensors and groupColumn.
export async function getTraces(datasetId:string,sensors:string[],groupByTarget:boolean):Promise<TraceResult>{
  const dataset=storage.find(x=>x.id===datasetId);if(!dataset)throw new Error('Dataset not found.');
  if(!sensors.length)throw new Error('Choose at least one signal.');
  const groupColumn=groupByTarget?dataset.target:null;
  const groupCounts:Record<string,number>={};
  const traces=sensors.map(sensor=>{
    const points=dataset.rows.map((row,i)=>({time:String(row.timestamp||i/dataset.sampleRate),value:Number(row[sensor]),group:groupColumn?String(row[groupColumn]??'Missing'):undefined})).filter(point=>Number.isFinite(point.value));
    if(!points.length)throw new Error(`No numeric readings found for ${sensor}.`);
    return {sensor,points,min:Math.min(...points.map(p=>p.value)),max:Math.max(...points.map(p=>p.value))};
  });
  if(groupColumn)dataset.rows.forEach(row=>{const key=String(row[groupColumn]??'Missing');groupCounts[key]=(groupCounts[key]||0)+1});
  await pause();return {traces,groupColumn,groupCounts,start:String(dataset.rows[0]?.timestamp||'0'),end:String(dataset.rows[dataset.rows.length-1]?.timestamp||dataset.rows.length/dataset.sampleRate),displayedRows:dataset.rows.length,missingRows:dataset.rows.filter(row=>sensors.some(sensor=>row[sensor]===''||row[sensor]===undefined)).length};
}
export async function generateFeatures(datasetId:string,options:FeatureOptions):Promise<Feature[]>{
  if(!storage.some(x=>x.id===datasetId))throw new Error('Dataset not found.');if(!options.sensors.length)throw new Error('Choose at least one sensor.');
  const time=['Mean','RMS','Std dev','Peak','Peak-to-peak','Kurtosis'];
  const frequency=['Dominant frequency','Band power','Spectral centroid','Spectral entropy'];
  const features=options.sensors.flatMap((sensor,sensorIndex)=>[...(options.timeDomain?time.map((name,i)=>({id:`${sensor}_${name.toLowerCase().replace(/[^a-z0-9]+/g,'_')}_${options.windowSeconds}s`,name:`${sensor} · ${name}`,source:sensor,domain:'Time' as const,score:+(.91-i*.075-sensorIndex*.025).toFixed(2),redundancy:+(.12+i*.09).toFixed(2)})):[]),...(options.frequencyDomain?frequency.map((name,i)=>({id:`${sensor}_${name.toLowerCase().replace(/[^a-z0-9]+/g,'_')}_${options.windowSeconds}s`,name:`${sensor} · ${name}`,source:sensor,domain:'Frequency' as const,score:+(.84-i*.09-sensorIndex*.025).toFixed(2),redundancy:+(.18+i*.08).toFixed(2)})):[])]);
  await pause();return features;
}
export async function rankFeatures(features:Feature[],mode:'Target'|'Unsupervised'):Promise<Feature[]>{await pause();return [...features].sort((a,b)=>mode==='Target'?b.score-a.score:a.redundancy-b.redundancy)}
// Future FastAPI: POST /feature-lab/feature-runs; preserve the returned run ID, columns, previews and charts.
export async function createFeatureRun(datasetId:string,options:FeatureOptions):Promise<FeatureRun>{
  const dataset=storage.find(x=>x.id===datasetId);if(!dataset)throw new Error('Dataset not found.');
  const features=await generateFeatures(datasetId,options);
  const windowSize=Math.max(2,Math.round(options.windowSeconds*dataset.sampleRate));
  const step=Math.max(1,Math.round(windowSize*(1-options.overlap/100)));
  const windowCount=Math.max(1,Math.floor(Math.max(0,dataset.rows.length-windowSize)/step)+1);
  const previewRows=Array.from({length:Math.min(windowCount,12)},(_,index)=>{
    const startIndex=index*step;const endIndex=Math.min(dataset.rows.length-1,startIndex+windowSize-1);
    const values=Object.fromEntries(features.map((feature,featureIndex)=>[feature.id,+((featureIndex+1)*.37+Math.sin(index/2+featureIndex)*.22+(index>6?.18:0)).toFixed(3)]));
    return {start:String(dataset.rows[startIndex]?.timestamp||startIndex/dataset.sampleRate),end:String(dataset.rows[endIndex]?.timestamp||endIndex/dataset.sampleRate),values};
  });
  const spectrum=Array.from({length:48},(_,i)=>({frequency:+(i*dataset.sampleRate/96).toFixed(3),power:+(Math.max(.05,12*Math.exp(-(((i-11)/5)**2))+5*Math.exp(-(((i-27)/4)**2))+Math.sin(i*.8)**2)).toFixed(3)}));
  return {id:crypto.randomUUID(),datasetId,createdAt:new Date().toISOString(),options:{...options,sensors:[...options.sensors]},features,windowCount,previewRows,spectrum};
}
// Future FastAPI: POST /feature-lab/rankings with feature run ID and optional target.
export async function createRanking(run:FeatureRun,mode:'Target'|'Unsupervised'){return rankFeatures(run.features,mode)}
// Future FastAPI: POST /feature-lab/feature-sets; backend assigns version and stores metadata.
export async function saveFeatureSet(input:Omit<FeatureSet,'id'|'savedAt'|'version'>):Promise<FeatureSet>{if(!input.name.trim()||!input.features.length)throw new Error('Name the set and select at least one feature.');const version=1+Math.max(0,...savedSets.filter(x=>x.datasetId===input.datasetId&&x.name.toLowerCase()===input.name.toLowerCase()).map(x=>x.version));const saved={...input,id:crypto.randomUUID(),version,savedAt:new Date().toISOString()};savedSets.unshift(saved);await pause();return saved}
export async function listFeatureSets(){await pause();return [...savedSets]}
