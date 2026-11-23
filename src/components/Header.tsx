import { useLayoutEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, CircleHelp, Cpu, GitBranch, LayoutDashboard, Menu, Moon, Settings2, Sparkles, Sun, TriangleAlert } from 'lucide-react';

export type Page = 'Dashboard'|'Devices'|'Digital Twin'|'Alerts'|'AI Center'|'Configuration'|'Asset';
type Props = { page: Page; setPage: (page: Page) => void; openSidebar: () => void; theme: 'light'|'dark'; toggleTheme: () => void };
export const tabs = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Devices', icon: Cpu },
  { name: 'Digital Twin', icon: GitBranch },
  { name: 'Alerts', icon: TriangleAlert },
  { name: 'AI Center', icon: Sparkles },
  { name: 'Configuration', icon: Settings2 },
] as const;

export default function Header({ page, setPage, openSidebar, theme, toggleTheme }: Props) {
  const [menu, setMenu] = useState<'plant'|'profile'|'help'|null>(null);
  const navRef = useRef<HTMLElement>(null);
  const [highlight, setHighlight] = useState({ left: 0, width: 0, ready: false });
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const update = () => {
      const active = nav.querySelector<HTMLButtonElement>('.active');
      if (active) setHighlight({ left: active.offsetLeft, width: active.offsetWidth, ready: true });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [page]);
  return <header className="reference-header"><div className="reference-header-inner">
    <button className="reference-mobile-menu" onClick={openSidebar} aria-label="Open asset hierarchy"><Menu size={20}/></button>
    <button className="reference-brand" onClick={()=>setPage('Dashboard')} aria-label="PredictaLine Dashboard"><span className="signal-logo"><i/><i/><i/><i/></span><strong>Predicta<span>Line</span></strong></button>
    <div className="reference-subtitle">Predictive Maintenance<br/>Platform</div>
    <nav className="reference-tabs" ref={navRef} aria-label="Main navigation"><span className={'reference-tab-highlight '+(highlight.ready?'ready':'')} style={{width:highlight.width,transform:`translateX(${highlight.left}px)`}} aria-hidden="true"/>{tabs.map(({name,icon:Icon})=><button className={page===name?'active':''} aria-current={page===name?'page':undefined} aria-label={name} title={name} key={name} onClick={()=>setPage(name)}><Icon size={17}/><span>{name}</span></button>)}</nav>
    <div className="reference-right">
      <div className="reference-menu-wrap"><button className="reference-plant" onClick={()=>setMenu(menu==='plant'?null:'plant')} aria-expanded={menu==='plant'}><span>Enterprise:</span><strong>NMDC</strong><ChevronDown size={13}/></button>{menu==='plant'&&<div className="reference-dropdown plant"><small>CURRENT WORKSPACE</small><strong>NMDC</strong><span>4 sites · 3 assets · 4 topics</span></div>}</div>
      <div className="reference-menu-wrap"><button className="reference-icon" aria-label="Help" onClick={()=>setMenu(menu==='help'?null:'help')}><CircleHelp size={17}/></button>{menu==='help'&&<div className="reference-dropdown help"><strong>PredictaLine help</strong><span>Choose an asset in the left hierarchy to inspect its condition and relationships.</span></div>}</div>
      <button className="reference-icon reference-notification" aria-label="View alerts" onClick={()=>setPage('Alerts')}><Bell size={17}/><i/></button>
      <div className="reference-menu-wrap"><button className="reference-profile" aria-label="Profile and theme" aria-expanded={menu==='profile'} onClick={()=>setMenu(menu==='profile'?null:'profile')}><span>JD</span><ChevronDown size={12}/></button>{menu==='profile'&&<div className="reference-dropdown profile"><strong>Operator workspace</strong><button onClick={()=>{toggleTheme();setMenu(null)}}>{theme==='dark'?<Sun size={15}/>:<Moon size={15}/>} Switch to {theme==='dark'?'light':'dark'} theme</button></div>}</div>
    </div>
  </div></header>;
}
