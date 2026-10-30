# MindMap Studio

A lightweight, offline-first interactive mind-map presentation app built with React and Vite.

## Features

- Modern canvas: measured, auto-sized nodes, tapered branches, and a dot grid that moves with the map
- **Balanced** (branches on both sides) or **Right** layout
- Smooth animations when expanding, collapsing, and fitting the view
- Light and dark themes (follows your system on first visit)
- Keyboard shortcuts (press **?** to see them all)
- Build a map by hand from a central topic (hover a node and click **+**, or press **Tab** while typing), or paste JSON to create one, with live validation and a Format button
- Multiple maps stored in the browser's IndexedDB, with search, duplicate, and delete
- Edit node text in place and delete nodes (with undo)
- Click-to-color styling with preset swatches and a custom picker
- Presentation mode (**F5** or the Present button): steps through each branch with the arrow keys, zooming to it and dimming the rest
- A laser pointer (**L**) for presenting: a glowing trail that fades on its own and is never saved
- Whiteboard-style ink: a smooth, pressure-sensitive pen (**P**) and highlighter (**H**) with 8 colors, a custom color, and 5 sizes; an eraser (**E**) with 4 sizes that erases precisely or whole strokes; palm rejection and the stylus eraser end are supported
- Export to PDF: downloads the whole map with every branch open on a single page, including ink, in the current theme and layout (collapsed branches on screen stay collapsed)
- 10-step undo per map (covers ink too); **O** opens (expands) every branch
- Touch-friendly: pinch to zoom, bottom dock and sheets on phones
- No backend, database, or internet connection required at runtime

## Files

- `index.html` — Vite entry page
- `src/main.jsx` — React entry point
- `src/App.jsx` — app state: projects, expansion, pan/zoom, selection, undo
- `src/components/` — `Sidebar`, `Toolbar`, `MindMapCanvas` (SVG rendering and gestures), `ColorPanel`, `ProjectModal`, `ProjectMenu`
- `src/lib/` — tree helpers, layout, IndexedDB persistence, and constants
- `src/styles.css` — all UI and mind-map styling

## Run locally

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

To build a static version for hosting:

```bash
npm run build
```

The `dist/` folder can be served from any static host. It uses relative paths, so it also works from a subfolder. Opening `dist/index.html` directly from disk (`file://`) is not supported because browsers block module scripts there; use `npm run preview` or any static server instead.

## JSON format

The simplest supported JSON is:

```json
{
  "label": "START TODAY",
  "children": [
    {
      "label": "Foundation",
      "color": "#6ea8fe",
      "children": [
        { "label": "How computers work" },
        { "label": "Internet" },
        { "label": "Browser" }
      ]
    },
    {
      "label": "Programming",
      "color": "#a78bfa",
      "children": [
        { "label": "JavaScript" },
        { "label": "Functions" },
        { "label": "Arrays & Objects" }
      ]
    }
  ]
}
```

You may also wrap the map in a project object:

```json
{
  "title": "Coding Roadmap",
  "data": {
    "label": "START TODAY",
    "children": []
  }
}
```

### Node properties

Each node supports:

- `label` — required text shown in the node
- `color` — optional hex color for any node. Nodes without a color inherit their branch color.
- `textColor` — optional hex text color; otherwise automatic contrast is used
- `children` — optional array of child nodes

## Build a map by hand

1. Click **New map**, keep **Build manually** selected, enter a name and a central topic, and press **Enter**.
2. Hover any node and click the **+** beside it to add a child (the central topic shows its **+** until it has branches). You can also right-click a node (long-press on touch screens) for **Add child** and **Add sibling**.
3. A new node opens ready to type. Press **Enter** to save, **Tab** to save and add a child under it, or **Shift+Tab** to save and add a sibling. **Escape** (or leaving it empty) removes a node you just added.
4. In selection mode, with one node selected, **Tab** adds a child and **Shift+Tab** a sibling.

Each added node counts as one undo step. Hand-built maps are ordinary maps: **Edit JSON** shows and edits their JSON like any other.

## Edit and delete nodes

- **Edit text:** double-click a node, type, then press **Enter** (or click away) to save. **Escape** cancels. Empty text is not allowed.
- **Node menu:** right-click a node (long-press on touch screens) for **Add child**, **Add sibling**, **Edit text**, **Color…** and **Delete**.
- **Delete:** removes the node and everything below it. The central topic can't be deleted. A message with an **Undo** button appears after each delete.
- **In selection mode:** with nodes selected, press **Delete** / **Backspace** to delete them, or **Enter** / **F2** to edit a single selected node. The style panel has the same **Edit text** and **Delete** buttons.

Edits and deletes save immediately, update the map's JSON, and each counts as one undo step.

## Select nodes and change colors

1. Click the palette button in the bottom dock, or hold **Shift** and click/drag on the canvas, to enter selection mode.
2. Drag a rectangle across nodes, or click a single node. Shift-click adds or removes nodes; Shift-drag adds a group. **Ctrl+A** / **Cmd+A** selects every visible node.
3. In the style panel, pick a **Fill** or **Text** swatch. The change saves immediately and counts as one undo step. Use the pipette swatch for a custom color, or the crossed-out swatch to go back to the automatic color.
4. Press **Escape** or the close button to return to panning.

Fill colors save as `color` and text colors as `textColor` in the node's JSON; choosing automatic removes the property. Nodes without an explicit fill follow their branch color (with a lighter tint below the first level), and text uses automatic contrast unless `textColor` is set.

## Undo

Click **Undo** in the dock or press **Ctrl+Z / Cmd+Z** to undo up to 10 color changes, text edits, deletes or saved JSON edits per map. A color change applied to many nodes counts as one step. Undo restores the saved JSON as well as the map. Histories remain available when switching projects during the current session and reset on page reload. Text fields and the JSON editor retain their native text undo.

## Storage

Projects are stored locally in the browser using IndexedDB, one record per map, so saving a change only rewrites the map that changed. Maps saved by earlier versions in `localStorage` move to IndexedDB automatically the first time the app opens, and the old copy is removed once the move succeeds. If IndexedDB isn't available (for example in some private-browsing modes), the app falls back to `localStorage`. Small preferences (theme, layout, ink settings) stay in `localStorage`.

This means:

- Projects remain available after refreshing the page.
- Data is tied to the current browser/device.
- Clearing browser site data will remove saved projects.
- No project data is sent to a server.

## Presentation controls

| Action | Mouse / touch | Keyboard |
| --- | --- | --- |
| Open / close a branch | Click a node or its badge | |
| Add a child | Hover a node, click **+** · node menu | **Tab** (while typing or selected) |
| Add a sibling | Node menu | **Shift+Tab** (while typing or selected) |
| Edit node text | Double-click a node | **Enter** (selected node) |
| Node menu | Right-click / long-press a node | |
| Delete nodes | Node menu | **Delete** (selected nodes) |
| Pan | Drag the canvas, two-finger scroll | |
| Zoom | Ctrl/Cmd + scroll, pinch, **+ / −** buttons | **+** / **−** |
| Fit view | Zoom percentage or fit button | **F** |
| Expand all / collapse all | Dock buttons | **O** / **C** |
| Pen / highlighter / eraser | Dock buttons | **P** / **H** / **E** |
| Laser pointer (fades, not saved) | Dock button | **L** |
| Present: start / next / previous / end | Present button, bar arrows, click a branch | **F5** / **→** / **←** / **Esc** |
| Export PDF | Top-right button · map's **⋯** menu in the sidebar | |
| Undo | Dock button | **Ctrl/Cmd+Z** |
| Shortcuts list | Keyboard button | **?** |
| Fullscreen | Top-right button | |

Layout (balanced or right) and theme (light or dark) are in the top-right bar and are remembered in this browser.

## Tech

- React 18
- Vite
- [Lucide](https://lucide.dev) icons and the Inter font, bundled for offline use
- CSS3
- SVG for nodes and connectors
- IndexedDB for persistence

## License

Use and modify freely for personal, teaching, and presentation purposes.
