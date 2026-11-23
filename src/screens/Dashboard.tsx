import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  CalendarDays,
  ChevronRight,
  Factory,
  Gauge,
  HeartPulse,
  RefreshCw,
  Settings2,
  Wrench,
} from "lucide-react";
import { byId, machines } from "../data";
import { Spark } from "../components/ui";

type Props = {
  select: (id: string) => void;
  openAlerts: () => void;
  openAI: () => void;
};
const summaries = [
  {
    label: "Fleet Health",
    value: "92.4%",
    detail: "Across connected assets",
    icon: HeartPulse,
    style: "good",
  },
  {
    label: "Healthy Devices",
    value: "1 / 3",
    detail: "33.3% of fleet",
    icon: Gauge,
    style: "good",
  },
  {
    label: "At Risk",
    value: "2",
    detail: "Require review",
    icon: AlertTriangle,
    style: "warn",
  },
  {
    label: "In Alert",
    value: "1",
    detail: "Active critical signal",
    icon: Activity,
    style: "bad",
  },
  {
    label: "Predicted Failures (7d)",
    value: "1",
    detail: "Sample prediction",
    icon: CalendarDays,
    style: "good",
  },
];
const machineMeta: Record<
  string,
  { health: string; rul: string; trend: string; picture: string }
> = {
  conveyor: { health: "96.8%", rul: "> 30 d", trend: "−0.7%", picture: "▰" },
  motor: { health: "78.0%", rul: "7 d", trend: "+8.2%", picture: "⚙" },
  crusher: { health: "87.3%", rul: "6.8 d", trend: "+4.9%", picture: "◉" },
};
const condition = [
  {
    name: "Vibration (RMS)",
    value: "4.82",
    unit: "mm/s",
    change: "+36%",
    warn: true,
  },
  {
    name: "Bearing Temperature",
    value: "68.4",
    unit: "°C",
    change: "+5%",
    warn: false,
  },
  {
    name: "Motor Current",
    value: "28.7",
    unit: "A",
    change: "+3%",
    warn: false,
  },
];
export default function DashboardNew({ select, openAlerts, openAI }: Props) {
  const [filter, setFilter] = useState<"All" | "Healthy" | "At Risk">("All");
  const [range, setRange] = useState("Last 24 Hours");
  const filtered = machines.filter(
    (m) =>
      filter === "All" ||
      (filter === "Healthy" ? m.health === "Healthy" : m.health !== "Healthy"),
  );
  return (
    <div className="ops-dashboard">
      <div className="ops-crumb">
        NMDC <ChevronRight size={12} /> Dashboard
      </div>
      <div className="ops-title">
        <div>
          <div className="page-title-heading"><span className="kicker">PLANT OPERATIONS</span><h1>NMDC Maintenance Dashboard</h1></div>
          <p>
            Fleet health, machine condition, and predictive insights in real
            time.
          </p>
        </div>
        <div className="ops-title-actions">
          <span>Sample data</span>
          <RefreshCw size={14} />
          <select
            aria-label="Dashboard time range"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option>Last 24 Hours</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
          </select>
        </div>
      </div>
      <div className="ops-summary">
        {summaries.map((s, i) => (
          <div
            className={"ops-summary-card " + s.style + (i === 0 ? " hero" : "")}
            key={s.label}
          >
            <div className="ops-summary-label">
              <s.icon size={19} />
              <strong>{s.label}</strong>
            </div>
            <div className="ops-summary-bottom">
              <b>{s.value}</b>
              {i === 0 && <Spark index={1} />}
            </div>
            <small>{s.detail}</small>
          </div>
        ))}
      </div>
      <div className="ops-layout">
        <section className="ops-panel ops-machines">
          <div className="ops-panel-head">
            <h2>
              <Factory size={17} /> Key Machines <span>— Fleet Status</span>
            </h2>
            <div className="ops-filter">
              {(["All", "Healthy", "At Risk"] as const).map((x) => (
                <button
                  className={filter === x ? "active" : ""}
                  onClick={() => setFilter(x)}
                  key={x}
                >
                  {x} (
                  {x === "All"
                    ? machines.length
                    : x === "Healthy"
                      ? machines.filter((m) => m.health === "Healthy").length
                      : machines.filter((m) => m.health !== "Healthy").length}
                  )
                </button>
              ))}
            </div>
          </div>
          <div className="ops-machine-grid">
            {filtered.map((m) => {
              const meta = machineMeta[m.id];
              return (
                <button
                  className="ops-machine"
                  key={m.id}
                  onClick={() => select(m.id)}
                >
                  <div className="machine-art">
                    <span>{meta?.picture || "⚙"}</span>
                  </div>
                  <div className="machine-body">
                    <div className="machine-name">
                      <strong>{m.name}</strong>
                      <span
                        className={
                          "ops-status " +
                          (m.health === "Healthy" ? "healthy" : "warning")
                        }
                      >
                        {m.health === "Healthy" ? "Healthy" : "At Risk"}
                      </span>
                    </div>
                    <small>{byId(m.parent || "")?.name}</small>
                    <div className="machine-stats">
                      <div>
                        <span>Health</span>
                        <b
                          className={
                            m.health === "Healthy" ? "good-text" : "warn-text"
                          }
                        >
                          {meta?.health || "91.4%"}
                        </b>
                      </div>
                      <div>
                        <span>RUL</span>
                        <b
                          className={m.health === "Healthy" ? "" : "warn-text"}
                        >
                          {meta?.rul || "> 30 d"}
                        </b>
                      </div>
                      <div>
                        <span>Trend</span>
                        <b>{meta?.trend || "+0.4%"}</b>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
        <div className="ops-side">
          <section className="ops-panel">
            <div className="ops-panel-head">
              <h2>
                <AlertTriangle size={17} className="warn-text" /> Attention (3)
              </h2>
              <button className="ops-link" onClick={openAlerts}>
                View All <ChevronRight size={13} />
              </button>
            </div>
            <button className="ops-attention" onClick={() => select("motor")}>
              <span className="severity critical">Critical</span>
              <span>
                <b>Motor 01 · high vibration</b>
                <small>Vibration exceeds expected baseline</small>
              </span>
              <em>8 min ago</em>
            </button>
            <button
              className="ops-attention"
              onClick={() => select("crusher")}
            >
              <span className="severity warning">Warning</span>
              <span>
                <b>Crusher 01 · vibration rise</b>
                <small>Discharge pressure above range</small>
              </span>
              <em>22 min ago</em>
            </button>
            <button className="ops-attention" onClick={() => select("motor")}>
              <span className="severity info">Info</span>
              <span>
                <b>Maintenance review due soon</b>
                <small>Inspect motor bearing within 7 days</small>
              </span>
              <em>1 hr ago</em>
            </button>
          </section>
          <section className="ops-panel">
            <div className="ops-panel-head">
              <h2>
                <Bot size={17} className="good-text" /> AI Insights
              </h2>
              <button className="ops-link" onClick={openAI}>
                Open AI Center <ChevronRight size={13} />
              </button>
            </div>
            <button className="ops-insight" onClick={() => select("motor")}>
              <Activity size={15} /> Motor 01: possible bearing wear within
              7 days
            </button>
            <button
              className="ops-insight amber"
              onClick={() => select("crusher")}
            >
              <Wrench size={15} /> Crusher 01: inspect vibration system
            </button>
          </section>
        </div>
        <section className="ops-panel ops-trends">
          <div className="ops-panel-head">
            <h2>
              <Activity size={17} /> Key Condition Trends
            </h2>
            <span className="ops-small-note">{range}</span>
          </div>
          <div className="ops-trend-grid">
            {condition.map((c, i) => (
              <div className="ops-trend" key={c.name}>
                <div>
                  <strong>{c.name}</strong>
                  <span>{c.unit}</span>
                </div>
                <div className="ops-trend-value">
                  <b>{c.value}</b>
                  <span className={c.warn ? "warn-text" : "good-text"}>
                    {c.warn ? (
                      <ArrowUpRight size={14} />
                    ) : (
                      <ArrowDownRight size={14} />
                    )}{" "}
                    {c.change}
                  </span>
                </div>
                <Spark index={i} warn={c.warn} />
                <div className="ops-axis">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>Now</span>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="ops-panel ops-health">
          <div className="ops-panel-head">
            <h2>
              <Settings2 size={17} /> Fleet Health by Area
            </h2>
          </div>
          {[
            ["Crushing Plant", "89.2%"],
            ["Mining", "95.6%"],
            ["Utilities", "87.3%"],
          ].map(([name, value]) => (
            <div className="ops-area" key={name}>
              <div>
                <span>{name}</span>
                <strong>{value}</strong>
              </div>
              <i>
                <span style={{ width: value }} />
              </i>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
