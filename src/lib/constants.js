export const STORAGE_KEY="mindmap_studio_projects_v1";
export const ACTIVE_KEY="mindmap_studio_active_v1";
export const UNDO_LIMIT=10;
export const THEME_KEY="mindmap_studio_theme_v1";
export const LAYOUT_KEY="mindmap_studio_layout_v1";

export const COLORS=["#6ea8fe","#a78bfa","#43c7a4","#ffb456","#ef83c6","#5fcf82","#56b6d8","#f08a79"];

// Quick-pick colors offered in the style panel.
export const FILL_SWATCHES=["#6ea8fe","#a78bfa","#43c7a4","#ffb456","#ef83c6","#5fcf82","#56b6d8","#f08a79","#facc15","#94a3b8","#1f2937","#ffffff"];
export const TEXT_SWATCHES=["#141826","#ffffff","#4f46e5","#b42318","#067647"];

// Theme colors that computed node fills are blended against.
export const THEME_COLORS={
  light:{surface:"#ffffff",root:"#1c2030"},
  dark:{surface:"#1a1d26",root:"#eceef5"}
};

export const EXAMPLE={
  title:"How to Use MindMap Studio",
  data:{
    label:"HOW TO USE MINDMAP STUDIO",
    children:[
      {label:"01 START HERE",color:"#6ea8fe",children:[
        {label:"Click + New JSON Project"},
        {label:"Give your project a name"},
        {label:"Paste your JSON"},
        {label:"Click Save Project"}
      ]},
      {label:"02 CREATE JSON WITH AI",color:"#a78bfa",children:[
        {label:"Write your topic or idea"},
        {label:"Give AI the sample JSON format"},
        {label:"Ask it to generate mind-map JSON"},
        {label:"Copy the JSON here"}
      ]},
      {label:"03 JSON STRUCTURE",color:"#43c7a4",children:[
        {label:"label = node text"},
        {label:"color = branch color"},
        {label:"children = sub-items",children:[
          {label:"Children can have more children"},
          {label:"Build as many levels as needed"}
        ]}
      ]},
      {label:"04 INTERACT",color:"#ffb456",children:[
        {label:"Click a node to expand"},
        {label:"Click again to collapse"},
        {label:"Drag canvas to pan"},
        {label:"Two-finger scroll to pan"},
        {label:"Ctrl / Cmd + scroll to zoom"}
      ]},
      {label:"05 PRESENT",color:"#ef83c6",children:[
        {label:"Fit View"},
        {label:"Expand All"},
        {label:"Collapse All"},
        {label:"Fullscreen mode"},
        {label:"Hide sidebar while presenting"}
      ]},
      {label:"06 MANAGE PROJECTS",color:"#5fcf82",children:[
        {label:"Projects appear in the sidebar"},
        {label:"Switch between projects"},
        {label:"Edit JSON anytime"},
        {label:"Duplicate a project"},
        {label:"Delete projects you no longer need"},
        {label:"Everything saves in localStorage"}
      ]}
    ]
  }
};
