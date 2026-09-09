# MindMap Studio

A lightweight, offline-first interactive mind-map presentation app built with plain HTML, CSS, and JavaScript.

## Features

- Paste JSON to create a new mind-map project
- Multiple projects stored in browser `localStorage`
- Project switching from the sidebar
- Edit, duplicate, and delete saved projects
- Expand/collapse individual nodes
- Expand All / Collapse controls
- Drag canvas to pan
- Two-finger trackpad scroll to pan
- `Ctrl` / `Cmd` + scroll to zoom
- Zoom in/out buttons
- Fit View
- Fullscreen presentation mode
- Hideable sidebar
- No framework, backend, database, or internet connection required

## Files

- `index.html` — app structure
- `styles.css` — all UI and mind-map styling
- `app.js` — project management, localStorage, layout, pan/zoom, and rendering logic

## Run locally

You can simply open `index.html` in a modern browser.

For the most consistent local-development experience, you can also serve the folder with any simple static server.

Example with VS Code Live Server:

1. Open the folder in VS Code.
2. Install the **Live Server** extension.
3. Right-click `index.html`.
4. Choose **Open with Live Server**.

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

1. Click **Select & Color** (or **Color** on mobile).
2. Drag a rectangle across nodes to select them, or click a single node. Shift-click adds or removes nodes; Shift-drag adds a group. **Ctrl+A** (Windows/Linux) or **Cmd+A** (Mac) selects all visible nodes and opens color mode. The shortcut keeps its normal text-selection behavior in input fields and the JSON editor.
3. Choose **Background** and **Text** colors. Uncheck either option to preserve that property on selected nodes. With mixed colors, the pickers show the first selected node's values.
4. Click **Apply colors**, then **Done** to return to panning and expanding nodes. Escape also exits selection mode.

Only visible nodes intersecting the selection rectangle are selected. Background colors save as `color`, and text colors save as `textColor` in each selected node's JSON. Changes appear in **Edit JSON** and persist after refreshing. Descendants without an explicit background color follow their branch color with a lighter fill; explicitly colored descendants keep their chosen colors. Text uses automatic contrast unless `textColor` is set.

## Storage

Projects are stored locally in the browser using `localStorage`.

This means:

- Projects remain available after refreshing the page.
- Data is tied to the current browser/device.
- Clearing browser site data will remove saved projects.
- No project data is sent to a server.

## Presentation controls

- **Click node:** expand/collapse
- **Drag canvas:** pan
- **Two-finger scroll:** pan
- **Ctrl/Cmd + scroll:** zoom
- **+ / −:** zoom
- **Fit View:** automatically fit visible nodes
- **Expand All:** reveal the full tree
- **Collapse:** return to the top-level roadmap
- **Fullscreen:** presentation mode

## Tech

- HTML5
- CSS3
- Vanilla JavaScript
- SVG for nodes and connectors
- `localStorage` for persistence

## License

Use and modify freely for personal, teaching, and presentation purposes.
