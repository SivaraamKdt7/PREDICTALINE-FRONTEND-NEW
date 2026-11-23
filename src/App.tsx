import { lazy, Suspense, useEffect, useMemo, useState, type PointerEvent } from "react";
import { Check, ChevronRight, Layers3, X } from "lucide-react";
import { addTopic, byId, deleteHierarchyAsset, type Asset, type HierarchyKind } from "./data";
import Sidebar from "./components/Sidebar";
import Dashboard from "./screens/Dashboard";
import AssetWorkspace from "./screens/AssetManagement/AssetWorkspace";
import { Devices } from "./screens/Devices";
import { Alerts } from "./screens/Alerts";
import { AICenter } from "./screens/AICenter";
import { Configuration } from "./screens/Configuration";
import AddTopic from "./components/AddTopic";
import Header, { tabs, type Page } from "./components/Header";
const nav = tabs;
const DigitalTwin = lazy(() => import('./screens/DigitalTwin/DigitalTwin'));
export default function App() {
  const [page, setPage] = useState<Page>("Dashboard");
  const [twinInitialView,setTwinInitialView]=useState<'3D'|'Graph'>('3D');
  const [selected, setSelected] = useState("motor");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [addMode, setAddMode] = useState<"custom" | "isa">("custom");
  const [addType,setAddType]=useState<HierarchyKind|null>(null);
  const [dataVersion,setDataVersion]=useState(0);
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    localStorage.getItem("connectmq-theme") === "light" ? "light" : "dark",
  );
  const [notice, setNotice] = useState("");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("connectmq-theme", theme);
  }, [theme]);
  const current = useMemo(() => byId(selected), [selected,dataVersion]);
  const select = (id: string) => {
    setSelected(id);
    setAddType(null);
    setPage("Asset");
  };
  const navigatePage=(next:Page)=>{if(next==='Digital Twin')setTwinInitialView('3D');setPage(next)};
  const openInTwin=(id:string)=>{setSelected(id);setTwinInitialView('Graph');setPage('Digital Twin')};
  const startHierarchyAdd=(kind:HierarchyKind)=>{setAddType(kind);setPage('Asset');setSidebarOpen(false)};
  const saveHierarchy=(asset:Asset)=>{
    setDataVersion(value=>value+1);
    setSelected(asset.id);
    setAddType(null);
    setNotice(`${asset.name} saved`);
    setTimeout(()=>setNotice(''),4500);
  };
  const add = (path: string) => {
    const asset = addTopic(path);
    setSelected(asset.id);
    setDataVersion(value=>value+1);
    setPage("Asset");
    setModal(false);
    setNotice("Subscribed to " + path);
    setTimeout(() => setNotice(""), 4500);
  };
  const removeAsset=(id:string)=>{
    try {
      const {nextId,count}=deleteHierarchyAsset(id);
      setSelected(nextId);
      setDataVersion(value=>value+1);
      setAddType(null);
      setPage('Asset');
      setNotice(`${count} ${count===1?'node':'nodes'} deleted`);
      setTimeout(()=>setNotice(''),4500);
    } catch(error) {setNotice(error instanceof Error?error.message:'Could not delete this node.');setTimeout(()=>setNotice(''),4500)}
  };
  const moveCardLight=(event:PointerEvent<HTMLElement>)=>{
    if(event.pointerType==='touch')return;
    const card=(event.target as Element).closest<HTMLElement>('.card,.ops-panel,.ops-summary-card,.ops-machine,.fl-panel,.am-card,.asset-hero');
    if(!card)return;
    const bounds=card.getBoundingClientRect();
    card.style.setProperty('--glow-x',`${event.clientX-bounds.left}px`);
    card.style.setProperty('--glow-y',`${event.clientY-bounds.top}px`);
  };
  return (
    <div className="app">
      <Header
        page={page}
        setPage={navigatePage}
        openSidebar={() => setSidebarOpen(true)}
        theme={theme}
        toggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
      />
      <div className="body">
        <Sidebar
          selected={selected}
          onSelect={select}
          onAdd={kind=>kind==='MQTT Topic'?(setAddMode('custom'),setModal(true)):startHierarchyAdd(kind)}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="main" onPointerMove={moveCardLight}>
          <div className="mobile-breadcrumb">
            <button onClick={() => setSidebarOpen(true)}>
              <Layers3 size={15} /> Assets
            </button>
            <ChevronRight size={14} />
            <span>{current?.name || "NMDC"}</span>
          </div>
          {page === "Dashboard" ? (
            <Dashboard
              select={select}
              openAlerts={() => setPage("Alerts")}
              openAI={() => setPage("AI Center")}
            />
          ) : page === "Asset" ? (
            <AssetWorkspace
              selectedId={selected}
              draftType={addType}
              startAdd={startHierarchyAdd}
              cancelDraft={()=>setAddType(null)}
              onSaved={saveHierarchy}
              onDelete={removeAsset}
              back={() => setPage("Dashboard")}
              select={select}
              openTwin={openInTwin}
            />
          ) : page === "Devices" ? (
            <Devices select={select} />
          ) : page === "Digital Twin" ? (
            <Suspense fallback={<div className="twin-loading">Loading Digital Twin…</div>}><DigitalTwin selected={selected} select={setSelected} initialView={twinInitialView}/></Suspense>
          ) : page === "Alerts" ? (
            <Alerts select={select} />
          ) : page === "AI Center" ? (
            <AICenter select={select} />
          ) : (
            <Configuration onAdd={() => setModal(true)} />
          )}
        </main>
      </div>
      {modal && (
        <AddTopic
          close={() => setModal(false)}
          add={add}
          initialMode={addMode}
        />
      )}
      {notice && (
        <div className="toast">
          <Check size={16} />
          {notice}
          <button onClick={() => setNotice("")}>
            <X size={15} />
          </button>
        </div>
      )}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {nav.map(({ name, icon: Icon }) => (
          <button
            key={name}
            onClick={() => navigatePage(name)}
            className={page === name ? "active" : ""}
          >
            <Icon size={19} />
            <span>
              {name === "Digital Twin"
                ? "Twin"
                : name === "Configuration"
                  ? "Config"
                  : name}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}



