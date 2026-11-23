import { useState } from 'react';

type Point={label:string;value:number;group?:string};
const axisLabel=(raw:string)=>{const date=new Date(raw);return Number.isNaN(date.getTime())?raw:date.toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})};
export default function FeatureChart({points,unit='',label,groupLabel}:{points:Point[];unit?:string;label:string;groupLabel?:string}){
  const [hover,setHover]=useState<number|null>(null);
  if(!points.length)return <div className="fl-chart-empty">No readings available.</div>;
  const sampled=points.filter((_,i)=>i%Math.max(1,Math.ceil(points.length/240))===0);
  const min=Math.min(...sampled.map(p=>p.value));const max=Math.max(...sampled.map(p=>p.value));const span=max-min||1;
  const position=(p:Point,i:number)=>({x:28+i/(sampled.length-1||1)*712,y:158-(p.value-min)/span*125});
  const path=sampled.map((p,i)=>{const {x,y}=position(p,i);return `${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`}).join(' ');
  const groups=[...new Set(sampled.map(p=>p.group).filter((x):x is string=>x!==undefined))];
  const high=sampled.findIndex(p=>p.value===max);const low=sampled.findIndex(p=>p.value===min);
  const hovered=hover===null?null:sampled[hover];const hoverPoint=hover===null?null:position(sampled[hover],hover);
  return <div className="fl-chart" role="img" aria-label={`${label}: minimum ${min.toFixed(2)}, maximum ${max.toFixed(2)} ${unit}`}>
    <div className="fl-chart-caption"><span>{label}</span><span>{hovered?`${axisLabel(hovered.label)} · ${hovered.value.toFixed(2)} ${unit}${hovered.group?` · ${groupLabel||'Group'} ${hovered.group}`:''}`:`Low ${min.toFixed(2)} · High ${max.toFixed(2)} ${unit}`}</span></div>
    <svg viewBox="0 0 768 190" preserveAspectRatio="none" onMouseLeave={()=>setHover(null)}>
      {[35,75,115,155].map(y=><line key={y} x1="28" x2="740" y1={y} y2={y} className="fl-grid-line"/>)}
      <path d={path} className={groups.length?'fl-signal-line grouped-base':'fl-signal-line'}/>
      {groups.length>0&&sampled.slice(1).map((point,i)=>{const a=position(sampled[i],i),b=position(point,i+1);return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={'fl-group-line '+(point.group==='0'?'normal':point.group==='1'?'fault':'other')}/>})}
      {[high,low].map((index,i)=>{const p=position(sampled[index],index);return <g key={i}><circle cx={p.x} cy={p.y} r="5" className={i?'fl-low-point':'fl-high-point'}/><text x={p.x} y={Math.max(14,p.y-10)} textAnchor="middle" className="fl-point-label">{i?'LOW':'HIGH'}</text></g>})}
      {hoverPoint&&<><line x1={hoverPoint.x} x2={hoverPoint.x} y1="20" y2="165" className="fl-hover-line"/><circle cx={hoverPoint.x} cy={hoverPoint.y} r="5" className="fl-hover-point"/></>}
      {sampled.map((_,i)=><rect key={i} x={28+i/(sampled.length-1||1)*712-3} y="0" width={Math.max(6,712/sampled.length)} height="190" fill="transparent" onMouseEnter={()=>setHover(i)}/>)}
    </svg>
    <div className="fl-chart-axis"><span>{axisLabel(sampled[0].label)}</span><span>{axisLabel(sampled[sampled.length-1].label)}</span></div>
    {groups.length>0&&<div className="fl-group-legend">{groups.map(group=><span key={group}><i className={group==='0'?'normal':group==='1'?'fault':'other'}/>{groupLabel||'Group'} {group}</span>)}</div>}
  </div>;
}
