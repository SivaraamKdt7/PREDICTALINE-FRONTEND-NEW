import { alerts, byId, kindOf, type Asset, type Health } from '../data';

// Placeholder API boundary. Replace these methods with backend requests later.
export type SignalPoint={at:string;value:number};
export type HealthInsight={title:string;detail:string;severity:'info'|'warning'|'critical'};
export type HealthAlert={id:number;assetId:string;asset:string;severity:string;message:string;time:string;read:boolean};
export type SensorSnapshot={kind:'sensor';node:Asset;status:Health|'No data';lastValue:number|null;lastSeen:string|null;points:SignalPoint[];average:number|null;min:number|null;max:number|null;warningLimit:number|null;criticalLimit:number|null;alerts:HealthAlert[];insights:HealthInsight[];maintenanceNote:string};
export type EquipmentSnapshot={kind:'equipment';node:Asset;status:Health|'No data';sensors:Asset[];alerts:HealthAlert[];insights:HealthInsight[];maintenanceNote:string;signalCount:number;lastSeen:string|null};
export type GroupSnapshot={kind:'group';node:Asset;status:Health|'No data';children:Asset[];equipment:Asset[];sensors:Asset[];counts:{healthy:number;warning:number;critical:number;noData:number};alerts:HealthAlert[];insights:HealthInsight[];maintenanceNote:string};
export type HealthSnapshot=SensorSnapshot|EquipmentSnapshot|GroupSnapshot;
const descendants=(node:Asset):Asset[]=>(node.children||[]).flatMap(id=>{const child=byId(id);return child?[child,...descendants(child)]:[]});
const statusOf=(node:Asset):Health|'No data'=>node.type==='Sensor'&&!node.value?'No data':node.health;
export const getDerivedStatus=(node:Asset):Health|'No data'=>{
  const reporting=[node,...descendants(node)].filter(item=>item.type==='Sensor'&&item.value);
  if(!reporting.length)return 'No data';
  if(reporting.some(item=>item.health==='Critical'))return 'Critical';
  if(reporting.some(item=>item.health==='Warning'))return 'Warning';
  return 'Healthy';
};
const relatedAlerts=(nodes:Asset[]):HealthAlert[]=>{const ids=new Set(nodes.map(node=>node.id));return alerts.filter(alert=>ids.has(alert.assetId))};
const sampleSignal=(node:Asset):SignalPoint[]=>{const center=Number(node.value);if(!Number.isFinite(center))return [];return Array.from({length:48},(_,index)=>({at:new Date(Date.now()-(47-index)*60000).toISOString(),value:+(center*(1+Math.sin(index*.48+node.id.length)*.055)+(node.health==='Warning'&&index>35?center*.04:0)).toFixed(2)}))};
const sensorThresholds=(node:Asset,center:number):[number,number]=>node.health==='Warning'?[+(center*.92).toFixed(2),+(center*1.16).toFixed(2)]:[+(center*1.15).toFixed(2),+(center*1.3).toFixed(2)];
const noteFor=(node:Asset,hasData:boolean)=>!hasData?'No readings are available yet. Confirm the sensor topic and incoming payload before assessing condition.':node.health==='Healthy'?'Continue routine monitoring. Review this asset if the trend or alert status changes.':'Inspect the affected equipment and verify the abnormal reading on site before scheduling maintenance.';
const insightFor=(node:Asset,hasData:boolean,alertCount:number):HealthInsight[]=>!hasData?[{title:'Waiting for telemetry',detail:'No recent reading is available for this node.',severity:'info'}]:node.health==='Healthy'?[{title:'Operating in expected range',detail:'Current sample signals show no active condition warning.',severity:'info'}]:[{title:alertCount?'Condition needs review':'Signal above normal range',detail:alertCount?`${alertCount} related alert${alertCount===1?'':'s'} provide evidence. Inspect the linked sensor trends.`:'Review connected readings and confirm the change against the normal baseline.',severity:node.health==='Critical'?'critical':'warning'}];

export async function getAssetHealth(id:string):Promise<HealthSnapshot>{
  const node=byId(id);if(!node)throw new Error('Asset not found.');
  const all=[node,...descendants(node)];const linkedAlerts=relatedAlerts(all);
  if(node.type==='Sensor'){
    const points=sampleSignal(node);const values=points.map(point=>point.value);const lastValue=values.length?values[values.length-1]:null;
    const [warningLimit,criticalLimit]=lastValue===null?[null,null]:sensorThresholds(node,Number(node.value));
    const early=values.slice(0,12),recent=values.slice(-12);const baseline=early.length?early.reduce((a,b)=>a+b,0)/early.length:0;const recentAverage=recent.length?recent.reduce((a,b)=>a+b,0)/recent.length:0;const change=baseline?((recentAverage-baseline)/Math.abs(baseline))*100:0;
    const insights:HealthInsight[]=points.length?[{title:Math.abs(change)>=3?'Trend shifted from baseline':'Signal trend is stable',detail:`The latest 12 sample readings average ${recentAverage.toFixed(2)} ${node.unit||''}, ${Math.abs(change).toFixed(1)}% ${change>=0?'above':'below'} the first 12.`,severity:node.health==='Critical'?'critical':node.health==='Warning'?'warning':'info'},...(linkedAlerts.length?[{title:'Alert linked to this sensor',detail:linkedAlerts[0].message,severity:linkedAlerts[0].severity==='Critical'?'critical' as const:'warning' as const}]:[])]:insightFor(node,false,0);
    return {kind:'sensor',node,status:statusOf(node),lastValue,lastSeen:points.length?points[points.length-1].at:null,points,average:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,min:values.length?Math.min(...values):null,max:values.length?Math.max(...values):null,warningLimit,criticalLimit,alerts:linkedAlerts,insights,maintenanceNote:noteFor(node,!!points.length)};
  }
  if(node.type==='Machine'||node.type==='Component'){
    const sensors=all.filter(item=>item.type==='Sensor');const status=getDerivedStatus(node);const hasData=status!=='No data';const conditionNode={...node,health:hasData?status:node.health};
    const warningSensor=sensors.find(sensor=>sensor.health!=='Healthy'&&sensor.value);
    const insights=warningSensor?[{title:`Review ${warningSensor.name}`,detail:`Its latest sample value is ${warningSensor.value} ${warningSensor.unit||''}. Check its trend and related alerts before planning work.`,severity:warningSensor.health==='Critical'?'critical' as const:'warning' as const},...insightFor(conditionNode,hasData,linkedAlerts.length)]:insightFor(conditionNode,hasData,linkedAlerts.length);
    return {kind:'equipment',node,status,sensors,alerts:linkedAlerts,insights,maintenanceNote:noteFor(conditionNode,hasData),signalCount:sensors.length,lastSeen:hasData?new Date().toISOString():null};
  }
  const equipment=all.filter(item=>item.type==='Machine'||item.type==='Component');const sensors=all.filter(item=>item.type==='Sensor');
  const counts={healthy:0,warning:0,critical:0,noData:0};equipment.forEach(item=>{const state=getDerivedStatus(item);if(state==='Healthy')counts.healthy++;else if(state==='Warning')counts.warning++;else if(state==='Critical')counts.critical++;else counts.noData++});
  const status=getDerivedStatus(node);const hasData=status!=='No data';const conditionNode={...node,health:hasData?status:node.health};
  const priority=equipment.find(item=>getDerivedStatus(item)==='Critical')||equipment.find(item=>getDerivedStatus(item)==='Warning');
  const insights=priority?[{title:`Prioritize ${priority.name}`,detail:`This branch has ${counts.warning+counts.critical} equipment node${counts.warning+counts.critical===1?'':'s'} needing review. Open the affected node to see its readings and alerts.`,severity:getDerivedStatus(priority)==='Critical'?'critical' as const:'warning' as const},...insightFor(conditionNode,hasData,linkedAlerts.length)]:insightFor(conditionNode,hasData,linkedAlerts.length);
  return {kind:'group',node,status,children:(node.children||[]).map(byId).filter((item):item is Asset=>!!item),equipment,sensors,counts,alerts:linkedAlerts,insights,maintenanceNote:noteFor(conditionNode,hasData)};
}

export async function getSensorHistory(id:string,minutes:number):Promise<SignalPoint[]>{const node=byId(id);if(!node||node.type!=='Sensor')throw new Error('Sensor not found.');return sampleSignal(node).slice(-Math.min(48,minutes))}
export async function getTwinRelationships(id:string):Promise<{parent:Asset|null;children:Asset[]}>{const node=byId(id);if(!node)throw new Error('Asset not found.');return {parent:node.parent?byId(node.parent)||null:null,children:(node.children||[]).map(byId).filter((item):item is Asset=>!!item)}}
export async function getHealthAlerts(id:string):Promise<HealthAlert[]>{const node=byId(id);if(!node)throw new Error('Asset not found.');return relatedAlerts([node,...descendants(node)])}
export const getHealthLabel=(node:Asset)=>kindOf(node);
export type AssetPrediction={outcome:string;probability:number;horizon:string;modelVersion:string;generatedAt:string;drivers:string[]};
export async function getAssetPrediction(assetId:string):Promise<AssetPrediction|null>{
  const node=byId(assetId);
  if(!node)throw new Error('Asset not found.');
  const sensors=[node,...descendants(node)].filter(item=>item.type==='Sensor'&&item.value);
  if(!sensors.length||node.aiEnabled===false)return null;
  const atRisk=sensors.some(item=>item.health!=='Healthy');
  return {outcome:atRisk?'Maintenance recommended':'Normal operation',probability:atRisk?0.78:0.91,horizon:'Next 7 days',modelVersion:'demo-1',generatedAt:new Date().toISOString(),drivers:sensors.slice(0,2).map(item=>item.name)};
}

