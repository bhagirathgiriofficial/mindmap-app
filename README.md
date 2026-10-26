# MindMap Studio

A lightweight, offline-first interactive mind-map presentation app built with React and Vite.

## Features

- Modern canvas: measured, auto-sized nodes, tapered branches, and a dot grid that moves with the map
- **Balanced** (branches on both sides) or **Right** layout
- Smooth animations when expanding, collapsing, and fitting the view
- Light and dark themes (follows your system on first visit)
- Keyboard shortcuts (press **?** to see them all)
- Paste JSON to create a new mind map, with live validation and a Format button
- Multiple maps stored in browser `localStorage`, with search, duplicate, and delete
- Click-to-color styling with preset swatches and a custom picker
- 10-step undo per map
- Touch-friendly: pinch to zoom, bottom dock and sheets on phones
- No backend, database, or internet connection required at runtime

## Files

- `index.html` — Vite entry page
- `src/main.jsx` — React entry point
- `src/App.jsx` — app state: projects, expansion, pan/zoom, selection, undo
- `src/components/` — `Sidebar`, `Toolbar`, `MindMapCanvas` (SVG rendering and gestures), `ColorPanel`, `ProjectModal`, `ProjectMenu`
- `src/lib/` — tree helpers, layout, `localStorage` persistence, and constants
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

## Select nodes and change colors

1. Click the palette button in the bottom dock, or hold **Shift** and click/drag on the canvas, to enter selection mode.
2. Drag a rectangle across nodes, or click a single node. Shift-click adds or removes nodes; Shift-drag adds a group. **Ctrl+A** / **Cmd+A** selects every visible node.
3. In the style panel, pick a **Fill** or **Text** swatch. The change saves immediately and counts as one undo step. Use the pipette swatch for a custom color, or the crossed-out swatch to go back to the automatic color.
4. Press **Escape** or the close button to return to panning.

Fill colors save as `color` and text colors as `textColor` in the node's JSON; choosing automatic removes the property. Nodes without an explicit fill follow their branch color (with a lighter tint below the first level), and text uses automatic contrast unless `textColor` is set.

## Undo

Click **Undo** in the dock or press **Ctrl+Z / Cmd+Z** to undo up to 10 color changes or saved JSON edits per map. A color change applied to many nodes counts as one step. Undo restores the saved JSON as well as the map. Histories remain available when switching projects during the current session and reset on page reload. Text fields and the JSON editor retain their native text undo.

## Storage

Projects are stored locally in the browser using `localStorage`.

This means:

- Projects remain available after refreshing the page.
- Data is tied to the current browser/device.
- Clearing browser site data will remove saved projects.
- No project data is sent to a server.

## Presentation controls

| Action | Mouse / touch | Keyboard |
| --- | --- | --- |
| Open / close a branch | Click a node | |
| Pan | Drag the canvas, two-finger scroll | |
| Zoom | Ctrl/Cmd + scroll, pinch, **+ / −** buttons | **+** / **−** |
| Fit view | Zoom percentage or fit button | **F** |
| Expand all / collapse all | Dock buttons | **E** / **C** |
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
- `localStorage` for persistence

## License

Use and modify freely for personal, teaching, and presentation purposes.
