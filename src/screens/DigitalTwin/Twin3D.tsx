import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  FileBox,
  FolderOpen,
  Grid3X3,
  Move3D,
  PanelRightOpen,
  Plus,
  RefreshCw,
  RotateCcw,
  Rotate3D,
  Scale3D,
  Search,
  Settings2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Viewer from './Viewer';
import { deleteModel, getGeneratedModels, saveModel, uploadModel, type UploadedModel } from './modelService';

type Vector = [number, number, number];
type ScenePreset = 'Custom'|'Factory'|'Grass'|'Studio';
type Scene = {
  preset:ScenePreset;
  camera: "Perspective" | "Orthographic";
  background: string;
  floorColor:string;
  exposure: number;
  ambient:number;
  keyLight:number;
  fillLight:number;
  lightColor:string;
  grid: boolean;
  axes: boolean;
  shadows: boolean;
  orbit: boolean;
};
const sceneDefaults: Scene = {
  preset:'Custom',
  camera: "Perspective",
  background: "#1b2b38",
  floorColor:'#777f84',
  exposure: 1.2,
  ambient:1,
  keyLight:2.2,
  fillLight:.8,
  lightColor:'#ffffff',
  grid: true,
  axes: false,
  shadows: true,
  orbit: true,
};
const scenePresets:Record<Exclude<ScenePreset,'Custom'>,Partial<Scene>>={
  Factory:{background:'#27313b',floorColor:'#747d83',ambient:1.1,keyLight:2.6,fillLight:1.1,lightColor:'#fff4e7',grid:true,shadows:true},
  Grass:{background:'#86aec0',floorColor:'#4f7a48',ambient:1.3,keyLight:2.5,fillLight:1,lightColor:'#fff8dc',grid:false,shadows:true},
  Studio:{background:'#424b55',floorColor:'#a5aaac',ambient:1.2,keyLight:2.8,fillLight:1.5,lightColor:'#ffffff',grid:false,shadows:true},
};
const fileSize = (size: number) =>
  size < 1048576
    ? `${Math.round(size / 1024)} KB`
    : `${(size / 1048576).toFixed(1)} MB`;
async function isGlb(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return (
    file.name.toLowerCase().endsWith(".glb") &&
    bytes.length === 4 &&
    bytes[0] === 103 &&
    bytes[1] === 108 &&
    bytes[2] === 84 &&
    bytes[3] === 70
  );
}

export default function Twin3D() {
  const [models, setModels] = useState<UploadedModel[]>([]);
  const modelsRef = useRef<UploadedModel[]>([]);
  const saveTimers = useRef(new Map<string,ReturnType<typeof setTimeout>>());
  const [selected, setSelected] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [propertiesOpen,setPropertiesOpen]=useState(false);
  const [panel, setPanel] = useState<"models" | "scene" | null>(null);
  const [upload, setUpload] = useState(false);
  const [search, setSearch] = useState("");
  const [tool, setTool] = useState<"select" | "rotate" | "scale">(
    "select",
  );
  const [meshSelection,setMeshSelection]=useState<{modelId:string;meshName:string}|null>(null);
  const [scene, setScene] = useState<Scene>(sceneDefaults);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [assetId, setAssetId] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState("");
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastMesh, setLastMesh] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = models.filter((m) =>
    `${m.name} ${m.assetId} ${m.tags}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const active = models.find((m) => m.id === activeId);
  const refreshModels = useCallback(async () => {
    setLoading(true); setApiError('');
    try {
      const items = await getGeneratedModels();
      modelsRef.current = items; setModels(items);
      setSelected(previous => previous.filter(id => items.some(m => m.id === id)).length ? previous.filter(id => items.some(m => m.id === id)) : items[0] ? [items[0].id] : []);
      setActiveId(previous => previous && items.some(m => m.id === previous) ? previous : items[0]?.id || null);
    } catch (cause) { setApiError(cause instanceof Error ? cause.message : 'Failed to load models'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refreshModels(); return () => { saveTimers.current.forEach(clearTimeout); }; }, [refreshModels]);
  const update = (id: string, change: Partial<UploadedModel>) => {
    const next=modelsRef.current.map(m => m.id===id ? {...m,...change} : m);
    modelsRef.current=next; setModels(next);
    const existing=saveTimers.current.get(id);if(existing)clearTimeout(existing);
    const updated=next.find(m=>m.id===id);if(!updated)return;
    saveTimers.current.set(id,setTimeout(()=>{void saveModel(updated).catch(cause=>setApiError(cause instanceof Error?cause.message:'Could not save model settings'));saveTimers.current.delete(id)},350));
  };
  const updateVector = (
    key: "position" | "rotation" | "scale",
    index: number,
    value: string,
  ) => {
    if (!active) return;
    const next = [...active[key]] as Vector;
    next[index] = Number(value) || 0;
    update(active.id, { [key]: next });
  };
  const choose = (id: string, checked: boolean) => {
    setMeshSelection(null);
    setSelected((ids) => checked ? [...new Set([...ids, id])] : ids.filter((x) => x !== id));
    if (checked) {setActiveId(id);setPropertiesOpen(true)}
  };
  const bulkVisible = (visible: boolean) =>
    selected.forEach(id=>update(id,{visible}));
  const resetSelectedTransforms = () => {
    const selectedModels=modelsRef.current.filter(model=>selected.includes(model.id));
    const otherModels=modelsRef.current.filter(model=>!selected.includes(model.id));
    const spacing=3.5;
    const columns=Math.ceil(Math.sqrt(selectedModels.length));
    const rows=Math.ceil(selectedModels.length/columns);
    const localPositions=selectedModels.map((_,index):Vector=>[
      (index%columns-(columns-1)/2)*spacing,
      0,
      (Math.floor(index/columns)-(rows-1)/2)*spacing,
    ]);
    const offsets:[number,number][]= [[0,0]];
    for(let ring=1;ring<=Math.max(4,modelsRef.current.length);ring++){
      for(let x=-ring;x<=ring;x++)for(let z=-ring;z<=ring;z++){
        if(Math.max(Math.abs(x),Math.abs(z))===ring)offsets.push([x*spacing,z*spacing]);
      }
    }
    offsets.sort((a,b)=>Math.hypot(...a)-Math.hypot(...b));
    const [offsetX,offsetZ]=offsets.find(([x,z])=>localPositions.every(position=>otherModels.every(model=>
      Math.hypot(position[0]+x-model.position[0],position[2]+z-model.position[2])>=spacing-.2,
    )))??[0,0];
    selectedModels.forEach((model,index)=>update(model.id,{
      position:[localPositions[index][0]+offsetX,0,localPositions[index][2]+offsetZ],
      rotation:[0,0,0],
      scale:[1,1,1],
    }));
    setTool('select');
  };
  const removeSelected = async () => {
    try {
      selected.forEach(id=>{const timer=saveTimers.current.get(id);if(timer)clearTimeout(timer);saveTimers.current.delete(id)});
      await Promise.all(selected.map(deleteModel));
      const next=modelsRef.current.filter(m=>!selected.includes(m.id));modelsRef.current=next;setModels(next);
      if(activeId&&selected.includes(activeId))setActiveId(null);
      setSelected([]);
      setMeshSelection(null);
    } catch(cause) { setApiError(cause instanceof Error?cause.message:'Could not remove models'); }
  };
  const openUpload = () => {
    setFile(null);
    setName("");
    setAssetId("");
    setDescription("");
    setTags("");
    setError("");
    setUpload(true);
  };
  const add = async () => {
    if (!file) {
      setError("Choose a GLB file.");
      return;
    }
    if (!(await isGlb(file))) {
      setError("This is not a valid binary GLB file.");
      return;
    }
    setUploading(true);setError('');
    try {
      const model=await uploadModel(file,{name:name.trim(),assetId:assetId.trim(),description:description.trim(),tags:tags.trim()});
      const next=[...modelsRef.current,model];modelsRef.current=next;setModels(next);
      setSelected([model.id]);setActiveId(model.id);setPropertiesOpen(true);setMeshSelection(null);setPanel('models');setUpload(false);
    } catch(cause) { setError(cause instanceof Error?cause.message:'Upload failed'); }
    finally { setUploading(false); }
  };
  const duplicate = async () => {
    if(!active)return;
    try {
      const copy=await fetch(`/api/models/${active.id}/duplicate`,{method:'POST'});
      if(!copy.ok)throw new Error('Could not duplicate model');
      const model=await copy.json() as UploadedModel;
      const next=[...modelsRef.current,model];modelsRef.current=next;setModels(next);setSelected([model.id]);setActiveId(model.id);setPropertiesOpen(true);setMeshSelection(null);
    } catch(cause) { setApiError(cause instanceof Error?cause.message:'Could not duplicate model'); }
  };

  return (
    <div
      className="twin-3d-blank twin-editor"
      aria-label="3D view workspace"
      style={{ background: scene.background }}
    >
      <Viewer models={models} selectedIds={selected} tool={tool} sceneOptions={scene}
        onSelect={(id,additive)=>{setSelected(ids=>additive?(ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]):[id]);setActiveId(id);setPropertiesOpen(true);setMeshSelection(null)}}
        onClear={()=>{setSelected([]);setMeshSelection(null)}}
        onTransform={changes=>changes.forEach(({id,position,rotation,scale})=>update(id,{position,rotation,scale}))}
        onMeshClick={(modelId,meshName)=>{setLastMesh(meshName);setMeshSelection({modelId,meshName});setSelected([]);setActiveId(modelId)}}/>
      {meshSelection&&<div className="twin-whole-model-action"><span>Mesh: {meshSelection.meshName||'unnamed'}</span><button onClick={()=>{setSelected([meshSelection.modelId]);setActiveId(meshSelection.modelId);setPropertiesOpen(true);setMeshSelection(null);setTool('select')}}><Box size={14}/> Whole model</button></div>}
      {selected.length>0&&!meshSelection&&<button className="twin-transform-reset" type="button" onClick={resetSelectedTransforms} title="Arrange selected models around the world origin; reset rotation and scale"><RotateCcw size={14}/> Reset transform{selected.length>1?` (${selected.length})`:''}</button>}
      {apiError&&<div className="twin-api-error" role="alert">{apiError}<button onClick={()=>setApiError('')} aria-label="Dismiss error"><X size={14}/></button></div>}
      <div className="twin-editor-toolbar">
        <button
          className={"twin-tool-button " + (panel === "models" ? "active" : "")}
          onClick={() => setPanel(panel === "models" ? null : "models")}
          aria-expanded={panel === "models"}
        >
          <FolderOpen size={16} /> Models <b>{models.length}</b>
          <ChevronDown size={13} />
        </button>
        <button
          className={"twin-tool-button " + (panel === "scene" ? "active" : "")}
          onClick={() => setPanel(panel === "scene" ? null : "scene")}
          aria-expanded={panel === "scene"}
        >
          <Settings2 size={16} /> Scene
        </button>
        <i className="twin-tool-divider" />
        {(
          [
            ["select", Move3D],
            ["rotate", Rotate3D],
            ["scale", Scale3D],
          ] as const
        ).map(([value, Icon]) => (
          <button
            className={"twin-icon-tool " + (tool === value ? "active" : "")}
            key={value}
            onClick={() => setTool(value)}
            aria-label={value==='select'?'Position tool':`${value} tool`}
            title={value==='select'?'Position: drag the selected model freely':`${value} tool`}
            aria-pressed={tool === value}
          >
            <Icon size={16} />
            <span>{value==='select'?'Position':value[0].toUpperCase() + value.slice(1)}</span>
          </button>
        ))}
        {active&&<button className={'twin-icon-tool twin-details-tool '+(propertiesOpen?'active':'')} type="button" onClick={()=>{setPanel(null);setPropertiesOpen(open=>!open)}} aria-label="Model details" title="Model details" aria-pressed={propertiesOpen}><PanelRightOpen size={16}/><span>Details</span></button>}
      </div>

      {panel === "models" && (
        <div className="twin-models-panel">
          <div className="twin-panel-heading">
            <div>
              <strong>3D Models</strong>
              <small>{loading?'Loading…':`${models.length} saved models`}</small>
            </div>
            <button className="twin-refresh-button" onClick={()=>void refreshModels()} disabled={loading} title="Refresh model list" aria-label="Refresh model list"><RefreshCw size={15}/></button>
            <button
              className="twin-add-button"
              onClick={openUpload}
              title="Upload GLB model"
              aria-label="Upload GLB model"
            >
              <Plus size={17} />
            </button>
          </div>
          <div className="twin-model-search">
            <Search size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search models or assets"
            />
          </div>
          {models.length > 0 && (
            <div className="twin-bulk-row">
              <label>
                <input
                  type="checkbox"
                  checked={
                    filtered.length > 0 &&
                    filtered.every((m) => selected.includes(m.id))
                  }
                  onChange={() => {
                    setMeshSelection(null);
                    setSelected(
                      filtered.length &&
                        filtered.every((m) => selected.includes(m.id))
                        ? []
                        : filtered.map((m) => m.id),
                    );
                  }}
                />{" "}
                Select all
              </label>
              <span>{selected.length} selected</span>
            </div>
          )}
          <div className="twin-model-list">
            {filtered.length ? (
              filtered.map((m) => (
                <div
                  className={
                    "twin-model-row " + (activeId === m.id ? "active" : "")
                  }
                  key={m.id}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(m.id)}
                    onChange={(e) => choose(m.id, e.target.checked)}
                    aria-label={`Select ${m.name}`}
                  />
                  <button onClick={() => {setActiveId(m.id);setSelected([m.id]);setMeshSelection(null);setPropertiesOpen(true);setPanel(null)}}>
                    <FileBox size={18} />
                    <span>
                      <strong>{m.name}</strong>
                      <small>
                        {m.assetId || m.componentName} · {fileSize(m.size)}
                      </small>
                    </span>
                  </button>
                  <button
                    className="twin-row-eye"
                    onClick={() => update(m.id, { visible: !m.visible })}
                    title={m.visible ? "Hide model" : "Show model"}
                    aria-label={m.visible ? `Hide ${m.name}` : `Show ${m.name}`}
                  >
                    {m.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                </div>
              ))
            ) : (
              <div className="twin-model-empty">
                <FileBox size={26} />
                <strong>
                  {models.length ? "No matches" : "No models yet"}
                </strong>
                <span>
                  {models.length
                    ? "Try another search."
                    : "Use + to upload a GLB file."}
                </span>
              </div>
            )}
          </div>
          {selected.length > 0 && (
            <div className="twin-bulk-actions">
              <button onClick={() => bulkVisible(true)}>
                <Eye size={14} /> Show
              </button>
              <button onClick={() => bulkVisible(false)}>
                <EyeOff size={14} /> Hide
              </button>
              <button className="danger" onClick={removeSelected}>
                <Trash2 size={14} /> Remove
              </button>
            </div>
          )}
        </div>
      )}

      {panel === "scene" && (
        <div className="twin-scene-panel">
          <div className="twin-panel-heading">
            <div>
              <strong>Scene settings</strong>
              <small>Presets and lighting</small>
            </div>
            <Settings2 size={17} />
          </div>
          <div className="twin-panel-scroll">
            <div className="twin-scene-presets" role="group" aria-label="Scene preset">{(['Custom','Factory','Grass','Studio'] as const).map(preset=><button key={preset} type="button" className={scene.preset===preset?'active':''} onClick={()=>setScene(current=>preset==='Custom'?{...current,preset}:({...current,...scenePresets[preset],preset}))}><i className={'twin-preset-swatch '+preset.toLowerCase()}/>{preset}</button>)}</div>
            <label className="twin-field">
              Camera
              <select
                value={scene.camera}
                onChange={(e) =>
                  setScene({
                    ...scene,
                    camera: e.target.value as Scene["camera"],
                  })
                }
              >
                <option>Perspective</option>
                <option>Orthographic</option>
              </select>
            </label>
            <label className="twin-field">
              Background
              <div className="twin-color-field">
                <input
                  type="color"
                  value={scene.background}
                  onChange={(e) =>
                    setScene({ ...scene, background: e.target.value })
                  }
                />
                <code>{scene.background}</code>
              </div>
            </label>
            {scene.preset!=='Custom'&&<label className="twin-field">Floor color<div className="twin-color-field"><input type="color" value={scene.floorColor} onChange={event=>setScene({...scene,floorColor:event.target.value})}/><code>{scene.floorColor}</code></div></label>}
            <label className="twin-field">
              Exposure <span>{scene.exposure.toFixed(1)}</span>
              <input
                type="range"
                min="0.2"
                max="2"
                step="0.1"
                value={scene.exposure}
                onChange={(e) =>
                  setScene({ ...scene, exposure: Number(e.target.value) })
                }
              />
            </label>
            {([['ambient','Ambient light',0,2],['keyLight','Key light',0,4],['fillLight','Fill light',0,3]] as const).map(([key,label,min,max])=><label className="twin-field" key={key}>{label} <span>{scene[key].toFixed(1)}</span><input type="range" min={min} max={max} step="0.1" value={scene[key]} onChange={event=>setScene({...scene,[key]:Number(event.target.value)})}/></label>)}
            <label className="twin-field">Light color<div className="twin-color-field"><input type="color" value={scene.lightColor} onChange={event=>setScene({...scene,lightColor:event.target.value})}/><code>{scene.lightColor}</code></div></label>
            <div className="twin-switch-list">
              {(
                [
                  ["grid", "Grid"],
                  ["axes", "Axes"],
                  ["shadows", "Shadows"],
                  ["orbit", "Orbit controls"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  <Grid3X3 size={14} />
                  {label}
                  <input
                    type="checkbox"
                    checked={scene[key]}
                    onChange={(e) =>
                      setScene({ ...scene, [key]: e.target.checked })
                    }
                  />
                </label>
              ))}
            </div>
            <button
              className="twin-reset-button"
              onClick={() => setScene(sceneDefaults)}
            >
              Reset scene settings
            </button>
          </div>
        </div>
      )}

      {active && propertiesOpen && panel !== "scene" && (
        <div className="twin-properties-panel">
          <div className="twin-panel-heading">
            <div>
              <strong>{active.name}</strong>
              <small>Model properties</small>
            </div>
            <button
              onClick={() => setPropertiesOpen(false)}
              aria-label="Close properties"
            >
              <X size={16} />
            </button>
          </div>
          <div className="twin-panel-scroll">
            <label className="twin-field">
              Name
              <input
                value={active.name}
                onChange={(e) => update(active.id, { name: e.target.value })}
              />
            </label>
            <label className="twin-field">
              Asset ID
              <input
                value={active.assetId}
                onChange={(e) => update(active.id, { assetId: e.target.value })}
                placeholder="Optional asset link"
              />
            </label>
            <label className="twin-field">
              Description
              <textarea
                rows={2}
                value={active.description}
                onChange={(e) =>
                  update(active.id, { description: e.target.value })
                }
              />
            </label>
            <label className="twin-field">
              Tags
              <input
                value={active.tags}
                onChange={(e) => update(active.id, { tags: e.target.value })}
                placeholder="Comma separated"
              />
            </label>
            <div className="twin-file-meta">
              <span>Source file</span>
                  <strong>{active.modelUrl.split('/').pop()}</strong>
                  <small>{fileSize(active.size)} · GLB</small>
            </div>
            {(["position", "rotation", "scale"] as const).map((key) => (
              <div className="twin-vector" key={key}>
                <strong>
                  {key[0].toUpperCase() + key.slice(1)}{" "}
                  {key === "rotation" ? "(°)" : ""}
                </strong>
                <div>
                  {["X", "Y", "Z"].map((axis, i) => (
                    <label key={axis}>
                      <span>{axis}</span>
                      <input
                        type="number"
                        step={key === "scale" ? "0.1" : "0.01"}
                        value={active[key][i]}
                        onChange={(e) => updateVector(key, i, e.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="twin-switch-list">
              {(
                [
                  ["visible", "Visible"],
                  ["wireframe", "Wireframe"],
                  ["castShadow", "Cast shadow"],
                  ["receiveShadow", "Receive shadow"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  <Box size={14} />
                  {label}
                  <input
                    type="checkbox"
                    checked={active[key]}
                    onChange={(e) =>
                      update(active.id, { [key]: e.target.checked })
                    }
                  />
                </label>
              ))}
            </div>
            <div className="twin-property-actions">
              <button onClick={duplicate}>
                <Copy size={14} /> Duplicate
              </button>
              <button
                className="danger"
                onClick={() => {const id=active.id;const timer=saveTimers.current.get(id);if(timer)clearTimeout(timer);saveTimers.current.delete(id);void deleteModel(id).then(()=>{const next=modelsRef.current.filter(m=>m.id!==id);modelsRef.current=next;setModels(next);setSelected(ids=>ids.filter(x=>x!==id));setActiveId(null)}).catch(cause=>setApiError(cause instanceof Error?cause.message:'Could not remove model'))}}
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="twin-viewport-status">
        {models.length} models · {selected.length} selected · {tool} tool{lastMesh?` · mesh: ${lastMesh}`:''}
      </div>
      <div className="twin-selection-hint">
        {meshSelection ? 'Choose Whole model above to select the complete model.' : selected.length===0 ? 'Click a mesh, then choose Whole model; or select a model in the Models list.' : selected.length===1 ? `${models.find(m=>m.id===selected[0])?.name||'Model'} selected · drag the model freely to reposition it.` : `${selected.length} whole models selected · drag any selected model to move the group.`}
      </div>
      {upload && (
        <div
          className="twin-upload-backdrop"
          onMouseDown={() => setUpload(false)}
        >
          <div
            className="twin-upload-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Upload 3D model"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="twin-upload-heading">
              <div>
                <Upload size={18} />
                <h2>Add 3D model</h2>
              </div>
              <button
                onClick={() => setUpload(false)}
                aria-label="Close upload"
              >
                <X size={17} />
              </button>
            </div>
            <p>Choose a binary GLB file and add its details.</p>
            <input
              ref={inputRef}
              type="file"
              accept=".glb,model/gltf-binary"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setFile(f);
                setName(f?.name.replace(/\.glb$/i, "") || "");
                setError("");
              }}
            />
            <button
              className="twin-file-picker"
              onClick={() => inputRef.current?.click()}
            >
              <FileBox size={24} />
              <strong>{file?.name || "Choose a .glb file"}</strong>
              <small>{file ? fileSize(file.size) : "Local GLB upload"}</small>
            </button>
            <div className="twin-upload-grid">
              <label>
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Display name"
                />
              </label>
              <label>
                Asset ID
                <input
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  placeholder="e.g. motor"
                />
              </label>
            </div>
            <label className="twin-upload-label">
              Description
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label className="twin-upload-label">
              Tags
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="factory, machine, line 1"
              />
            </label>
            {error && <div className="twin-upload-error">{error}</div>}
            <div className="twin-upload-actions">
              <button onClick={() => setUpload(false)}>Cancel</button>
              <button className="primary" onClick={add} disabled={!file||uploading}>
                <Plus size={15} /> {uploading?'Uploading…':'Add model'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
