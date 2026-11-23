import type React from 'react';
import { Activity } from 'lucide-react';
export const statusClass = (s:string) => s.toLowerCase();
const lines = ['18,40 34,36 50,39 66,26 82,31 98,18 114,24 130,21 146,32 162,26 178,34 194,27','18,33 34,31 50,26 66,28 82,21 98,20 114,26 130,23 146,29 162,22 178,24 194,19','18,35 34,34 50,30 66,27 82,32 98,20 114,23 130,19 146,26 162,24 178,18 194,15'];
export function Spark({index=0, warn=false}:{index?:number;warn?:boolean}) { return <svg className="spark" viewBox="0 0 210 54" preserveAspectRatio="none" aria-hidden="true"><path d="M0 53H210" stroke="var(--border)"/><polyline points={lines[index%3]} fill="none" stroke={warn?'var(--amber)':'var(--green)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
export function Pill({value}:{value:string}) {return <span className={'pill '+statusClass(value)}>{value}</span>}
export function Card({children,className=''}:{children:React.ReactNode;className?:string}) {return <section className={'card '+className}>{children}</section>}
export function Title({kicker,title,description,action}:{kicker:string;title:string;description?:string;action?:React.ReactNode}) {return <div className="page-title"><div><div className="page-title-heading"><span className="kicker">{kicker}</span><h1>{title}</h1></div>{description&&<p>{description}</p>}</div>{action}</div>}
export function Metric({label,value,extra,icon:Icon}:{label:string;value:string;extra:string;icon:typeof Activity}) {return <Card className="metric"><div className="metric-icon"><Icon size={21}/></div><div><span className="muted">{label}</span><strong>{value}</strong><small>{extra}</small></div></Card>}
