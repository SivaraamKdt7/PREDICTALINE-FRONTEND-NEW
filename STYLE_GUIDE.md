# PredictaLine UI style guide

Use this guide for every new screen or component. The current dashboard, header, hierarchy, and asset detail screen are the visual references. Keep the industrial look compact and legible: dark navy framing, layered surfaces, restrained green emphasis, and clear warning states.

## Source of truth

| Concern | File |
| --- | --- |
| Light and dark colors, spacing, responsive rules | `src/styles.css` |
| Top navigation and sliding selection | `src/components/Header.tsx` |
| Asset hierarchy and add menu | `src/components/Sidebar.tsx` |
| Dashboard density and cards | `src/screens/Dashboard.tsx` |
| Selected asset Health layouts | `src/screens/AssetManagement/AssetHealth.tsx`, `SensorHealth.tsx`, `EquipmentHealth.tsx`, `GroupHealth.tsx` |
| Digital Twin view switch, graph, empty 3D workspace | `src/screens/DigitalTwin/` |
| Shared primitives (`Card`, `Pill`, `Spark`, `Title`) | `src/components/ui.tsx` |
| Shared sample assets, topics, and alerts | `src/data.ts` |
| Replaceable Health demo reads and derived status | `src/services/assetHealthService.ts` |
| Feature Lab screen, charts, and mock API boundary | `src/screens/FeatureLab/` |

Keep screen components in `src/screens`, with a nested folder only when a screen has child views, as Digital Twin does. Put shared components in `src/components`; put only patterns used by multiple screens in `components/ui.tsx`. The app shell and screen switching stay in `App.tsx`.

## Themes and colors

The default theme is dark. The profile menu in the header switches between dark and light; the choice is saved in local storage. Both themes must use the same layout and component states. The light theme uses cool stone and sage surfaces, with visible layers between the workspace, cards, and selected rows. Do not introduce pure-white cards or a pure-white page background.

Use the CSS variables in `styles.css` for new components:

- `--bg` for the workspace; `--surface`, `--surface-2`, and `--surface-3` for layered panels.
- `--text`, `--muted`, and `--border` for readable text and subtle separation.
- `--green` and `--green-bright` for healthy status, primary actions, and active navigation.
- `--teal` for a selected graph item or linked asset.
- `--amber` for warning and `--red` for critical. Pair each status color with a text label or icon.
- `--green-soft`, `--amber-soft`, and `--red-soft` for tinted status backgrounds.

Avoid adding one-off colors to screen components. If a new color role is necessary, define it for **both** themes before using it. The header has its own dark styling in `styles.css`; keep it dark in either theme to match the supplied reference.

In light mode, use `--bg` for the darkest workspace layer, `--surface` for panels, and `--surface-2` for nested cards and controls. Keep borders visible but subtle. Reserve bright green for actions and active navigation; use softer green for selected rows and healthy-state backgrounds.

## Page structure

1. Use the shared header and asset hierarchy. Do not recreate them inside a screen.
2. Start a screen with a short breadcrumb or kicker, one clear title, and a one-line description. Put filters or actions on the same row where space allows.
3. Group data in bordered panels with a compact header. Prefer 8–16 px internal gaps and consistent card radii rather than large empty areas.
4. Put the most important condition and action near the top. Keep related readings, alerts, predictions, and relationships together.
5. Use sample data sparingly and label predictions or simulated readings as sample data. Reuse asset IDs from `data.ts` so clicking a card, tree row, alert, or graph node opens the same asset.

The dashboard should feel like an operations console: a concise summary row, a dense machine grid, attention and AI panels, and condition trends. Asset details should answer **what is it, how healthy is it, what readings explain that, and what is connected to it?**

The Health view has distinct sensor, equipment, and group layouts. Keep the order clear: key condition and signals first, then evidence-based insights and related alerts, then twin relationships and maintenance guidance. A relationship click opens the Digital Twin Graph with that node selected. Parent status is derived from reporting descendant sensors; nodes without readings show **No data**. Keep demo readings and insights labelled as sample data.

## Navigation and hierarchy

The top tabs are Dashboard, Devices, Digital Twin, Alerts, AI Center, and Configuration. Keep their widths stable. The single green highlight slides between tabs; do not give the active tab different padding or font size. On wide screens, the whole tab group is centered within the header. Keep the header's brand and right controls separate from the tab group.

The left hierarchy is the primary asset selector. Preserve its compact indentation, type badges, health dots, search, alert filter, and selected row. The **+** menu contains topic actions and tree expansion controls. Selecting an asset opens its detail screen; the same asset should be identifiable in the Digital Twin graph. Do not build a second, conflicting hierarchy for another screen.

## Responsive and accessible behavior

- Desktop: keep the hierarchy visible; use multi-column panels where the content fits.
- Laptop: reduce columns before shrinking text. Keep the tab group and right header controls from overlapping.
- Mobile: open the hierarchy as a drawer, use the bottom navigation, stack cards, and turn wide tables into readable rows.
- Keep controls large enough to tap and give icon-only buttons an accessible label.
- Show keyboard focus, use semantic buttons for actions, and avoid using color alone to convey status.
- Respect reduced-motion preferences for animated elements such as the sliding tab highlight.

## Before adding a new screen

Check it in both themes at mobile, laptop, and desktop widths. Confirm navigation and selection lead to the right asset, active states do not shift layout, text does not overflow, and `npm run build` passes.

Model definitions and locally created hierarchy nodes currently use browser storage through mock services. Live MQTT data and backend persistence can replace this layer later without changing these visual rules.

## Feature Lab

Feature Lab opens from the right-side action in AI Center and has its own Datasets, Signal Trace, Generate Features, and Rank & Save sections. Keep the current dataset visible above these sections. Use the existing theme variables, compact panels, readable charts, and a horizontally scrollable step selector on phones.

Signal Trace supports several selected signals at once, with aligned time ranges, full timestamps on hover, a metadata summary, and optional grouping by a categorical fault/label column. Generated output shows the added column names, a window-value preview, feature trends, and a spectral preview. Ranking shows a score chart, manual selection, and a configurable Top K action. Saved feature-set records include a version, dataset, source feature run, ranking mode, target, selected column IDs, window settings, and save time.

`src/screens/FeatureLab/featureLabService.ts` is the single placeholder API boundary. Its in-memory datasets and saved feature sets are demo-only and reset on reload. Replace its methods with FastAPI calls when RustFS-backed dataset, trace, feature generation, ranking, and feature-set endpoints exist. Keep demo spectra, rankings, and correlation previews explicitly labelled until the backend calculates them. Target-based ranking and unsupervised redundancy ranking are separate modes; never present an unsupervised score as target importance.

## 3D editor controls

`src/screens/DigitalTwin/Twin3D.tsx` owns the editor layout, Models list, multi-selection, properties, and scene controls. `Viewer.tsx` renders GLB files with React Three Fiber, keeps orbit/zoom/pan, hover highlighting and mesh click events, and applies single or group transform tools. `modelService.ts` calls the Vite API in `plugins/modelUpload.ts`. The API stores uploaded GLBs and model settings in `public/models`, so they reload across sessions when the same local server and files are available. The current API is supplied by the local Vite dev/preview server; a deployed static site needs an equivalent backend.

Keep Three.js code inside the Digital Twin folder. Do not place canvas controls in the shared header or asset hierarchy. When changing a model setting, update both the renderer and saved model record. Keep the 3D/Graph switch stationary and the 3D canvas full-height.
Scene settings offer Custom, Factory, Grass, and Studio presets. Keep preset floor and background colors configurable, and expose Exposure, Ambient, Key, Fill, and Light color controls. Use local scene lighting so uploaded models remain visible without external assets.

Clicking a mesh shows a contextual **Whole model** button at the top of the viewport. Use it to select the parent uploaded model; the selected model gets a green bounding outline. Shift/Ctrl-click adds or removes whole models from the selection. The Models panel checkboxes and Select all provide the same multi-selection. In Position mode, drag the selected model directly to move it freely in the camera-facing plane. The movement can change X, Y, and Z together, depending on camera angle. All selected models move together and their positions are saved on release. Rotate and Scale use transform gizmos. Keep the lower-left hint aligned with this interaction.
When whole models are selected, show **Reset transform** beside the viewport controls. It restores rotation to `[0, 0, 0]` and scale to `[1, 1, 1]`, then arranges the selected models around the world origin with enough spacing for their normalized bounds. If another model occupies that area, use the nearest clear placement. Persist each record after reset.
The editor uses its own width for responsive breakpoints because the plant hierarchy reduces the available workspace on laptops. On narrow screens, keep 3D/Graph and Reset in the first row, wrap the Models/Scene/transform/Details toolbar below, and keep Models and Scene as scrollable overlays. Model properties start closed and open through Details or model selection; on phones they become a dismissible bottom sheet. Keep the canvas visible and avoid horizontal scrolling at 375, 768, and desktop widths.

## Asset models and hierarchy

Configuration → Asset Models is the single library for equipment schemas. Keep saved versions read-only. A new version copies the selected schema and increments its version; existing assets remain pinned to the version used at creation. Block deletion while any asset or generated sensor references that version. Use the compact list and form styles in `src/screens/AssetManagement/assetModels.css` and the shared theme tokens.

An Asset Model has an immutable name and sensor definitions only. The preset chips cover common industrial and mining sensors, support multiple types, and supply default units. Draft rows can be duplicated, assigned number/string data types, or given another unit. MQTT topics and sensor mounting locations belong to asset instances, never to reusable models.

The left hierarchy add menu offers Enterprise, Site, Area, Work Center, and Asset. Add Asset opens `ModelAssetForm.tsx`: the hierarchy parent is inferred from the selected left-tree node, as in the original form. It shows Name, a unique immutable Asset ID, Parent, and Model type at the top, then an MQTT topic and optional mounting-location dropdown for every model sensor. The parent defaults from the selected left-tree node. Saving creates the asset and its sensor children together. Generated sensors remain selectable for Health, while Manage points to the parent asset for topic changes. Existing legacy nodes remain readable and editable through `AssetForm.tsx`.

`src/services/assetModelService.ts` is the mock API boundary for model list/create/delete and model-based asset save. Model definitions and locally created hierarchy nodes use browser storage for now; replace the service calls and storage adapter with backend APIs later. Keep model IDs and measurement keys stable, validate duplicate MQTT topics, and never reset live sensor state when an asset's metadata is edited.

The tree and existing sensor Health screens use the shared asset nodes. Keep ISA-95 order, muted dotted guides, responsive one-column forms on mobile, and the existing dark/light theme variables.



