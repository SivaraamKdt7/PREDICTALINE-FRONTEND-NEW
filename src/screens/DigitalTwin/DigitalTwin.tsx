import { useState } from 'react';
import { Title } from '../../components/ui';
import TwinGraph from './TwinGraphDynamic';
import Twin3D from './Twin3D';

type View = 'Graph' | '3D';
type Props = { selected: string; select: (id: string) => void; initialView?: View };

export default function DigitalTwin({ selected, select, initialView='3D' }: Props) {
  const [view, setView] = useState<View>(initialView);
  return <div className={'twin-screen '+(view==='3D'?'is-3d':'is-graph')}>
    <div className="twin-view-switch twin-screen-switch" role="group" aria-label="Digital Twin view">
      <button type="button" className={view==='3D'?'active':''} aria-pressed={view==='3D'} onClick={()=>setView('3D')}>3D</button>
      <button type="button" className={view==='Graph'?'active':''} aria-pressed={view==='Graph'} onClick={()=>setView('Graph')}>Graph</button>
    </div>
    {view==='Graph'&&<Title
      kicker="CONNECTED ASSETS"
      title="Digital Twin"
      description="Explore your plant hierarchy and the relationships between assets."
    />}
    {view==='Graph' ? <TwinGraph selected={selected} select={select}/> : <Twin3D/>}
  </div>;
}
