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
- `children` — optional array of child nodes

## Change node colors

1. Click **Node Color** (or **Color** on mobile).
2. Click any node, including the root or a nested item.
3. Choose a color and click **Save color**.
4. Click **Done** to return to expanding and collapsing nodes.

The chosen color is saved in that node’s `color` property and is immediately available in **Edit JSON**. Colors persist after refreshing. Descendants without their own color follow their branch color with a lighter fill; explicitly colored descendants keep their chosen colors.

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
