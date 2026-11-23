import { useEffect, useState } from 'react';
import { BrainCircuit } from 'lucide-react';
import type { EquipmentSnapshot } from '../../services/assetHealthService';
import { getAssetPrediction, type AssetPrediction } from '../../services/assetHealthService';

export default function MLPredictions({snapshot}:{snapshot:EquipmentSnapshot}){
  const [prediction,setPrediction]=useState<AssetPrediction|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{let active=true;getAssetPrediction(snapshot.node.id).then(value=>{if(active)setPrediction(value)}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Prediction unavailable')});return()=>{active=false}},[snapshot.node.id,snapshot.node.aiEnabled]);
  const enabled=snapshot.node.aiEnabled!==false;
  return <section className="ops-panel health-panel"><div className="ops-panel-head"><h2><BrainCircuit size={16}/> ML predictions</h2><span className="health-demo-tag">Demo model</span></div>
    {!snapshot.sensors.length?<p className="asset-note">Connect a sensor to this asset to enable predictions.</p>:!enabled?<p className="asset-note">AI is disabled for this asset. Enable it in Manage.</p>:error?<p className="asset-note" role="alert">{error}</p>:prediction?<div className="health-prediction"><div><small>PREDICTED OUTCOME</small><strong>{prediction.outcome}</strong></div><div><small>CONFIDENCE</small><strong>{Math.round(prediction.probability*100)}%</strong></div><div><small>HORIZON</small><strong>{prediction.horizon}</strong></div><p>Based on {prediction.drivers.join(', ')} · Model {prediction.modelVersion} · {new Date(prediction.generatedAt).toLocaleString()}</p></div>:<p className="asset-note">Loading prediction…</p>}
  </section>;
}

