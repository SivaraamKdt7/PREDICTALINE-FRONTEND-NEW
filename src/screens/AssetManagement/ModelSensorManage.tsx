import { ArrowRight, Radio } from 'lucide-react';
import { byId, type Asset } from '../../data';

export default function ModelSensorManage({sensor,onSelect}:{sensor:Asset;onSelect:(id:string)=>void}){
  const parent=sensor.parent?byId(sensor.parent):undefined;
  return <section className="am-card am-form-card"><div className="am-card-head"><div><span className="am-kicker">MODEL MEASUREMENT</span><h2>{sensor.name}</h2></div><span className="am-kind-badge">Sensor</span></div><div className="am-form-scroll"><p className="am-model-note">This sensor was created from an asset model. Its MQTT topic is managed with the parent asset.</p><div className="am-topic-preview"><Radio size={15}/><code>{sensor.topic||'No MQTT topic'}</code></div><div className="am-form-grid"><div className="am-model-note">Type: {sensor.sensorType||'Sensor'}</div><div className="am-model-note">Unit: {sensor.unit||'—'}</div><div className="am-model-note">Location: {sensor.sensorLocation||'General'}</div></div>{parent&&<button className="am-primary am-model-parent" type="button" onClick={()=>onSelect(parent.id)}>Manage {parent.name}<ArrowRight size={15}/></button>}</div></section>;
}


