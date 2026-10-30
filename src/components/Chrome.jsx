import {forwardRef} from "react";
import {
  PanelLeft,Moon,Sun,FileJson,Maximize,Minimize,Undo2,ListTree,ListCollapse,
  Palette,Plus,Minus,Scan,Keyboard,Columns2,PanelRight,PenLine,Eraser,WandSparkles,Play,FileDown
} from "lucide-react";
import {UNDO_LIMIT} from "../lib/constants.js";

const MOD=/Mac|iPhone|iPad/.test(navigator.platform)?"⌘":"Ctrl+";

export function IconButton({icon:Icon,label,shortcut,active,className="",children,...props}){
  return(
    <button className={"icon-btn"+(active?" active":"")+(className?" "+className:"")}
      aria-label={label} aria-pressed={active===undefined?undefined:active}
      data-tip={shortcut?`${label} · ${shortcut}`:label} {...props}>
      <Icon size={18} strokeWidth={1.9} aria-hidden="true"/>
      {children}
    </button>
  );
}

export function TopBar({title,meta,sidebarOpen,onToggleSidebar,theme,onToggleTheme,mode,onSetMode,onEdit,onExportPdf,fullscreen,onFullscreen,onPresent,hasData}){
  return(
    <>
      <div className="topbar topbar-left glass">
        <IconButton icon={PanelLeft} label={sidebarOpen?"Hide sidebar":"Show sidebar"} onClick={onToggleSidebar}/>
        {title&&<>
          <span className="topbar-divider"/>
          <div className="doc-title">
            <strong>{title}</strong>
            <small>{meta}</small>
          </div>
        </>}
      </div>
      <div className="topbar topbar-right glass">
        {hasData&&<div className="segmented" role="group" aria-label="Layout">
          <IconButton icon={Columns2} label="Balanced layout" active={mode==="balanced"} onClick={()=>onSetMode("balanced")}/>
          <IconButton icon={PanelRight} label="Right layout" active={mode==="right"} onClick={()=>onSetMode("right")}/>
        </div>}
        <IconButton icon={theme==="dark"?Sun:Moon} label={theme==="dark"?"Light mode":"Dark mode"} onClick={onToggleTheme}/>
        {hasData&&<button className="pill-btn present-btn" onClick={onPresent} data-tip="Present · F5"><Play size={15} strokeWidth={2.1}/><span>Present</span></button>}
        {hasData&&<button className="pill-btn" onClick={onEdit}><FileJson size={16} strokeWidth={1.9}/><span>Edit JSON</span></button>}
        {hasData&&<IconButton className="hide-mobile" icon={FileDown} label="Export PDF" onClick={onExportPdf}/>}
        <IconButton className="hide-mobile" icon={fullscreen?Minimize:Maximize} label={fullscreen?"Exit fullscreen":"Fullscreen"} onClick={onFullscreen}/>
      </div>
    </>
  );
}

export const Dock=forwardRef(function Dock({undoCount,colorMode,tool,penColor,onTool,onUndo,onExpand,onCollapse,onToggleColor,onFit,onHelp},ref){
  return(
    <div className="dock glass" ref={ref} aria-label="Mind map controls">
      <IconButton icon={Undo2} label={undoCount?`Undo (${undoCount} of ${UNDO_LIMIT})`:"Undo"} shortcut={`${MOD}Z`}
        disabled={!undoCount} onClick={onUndo}>
        {undoCount>0&&<span className="badge">{undoCount}</span>}
      </IconButton>
      <span className="dock-divider"/>
      <IconButton icon={ListTree} label="Expand all" shortcut="O" onClick={onExpand}/>
      <IconButton icon={ListCollapse} label="Collapse all" shortcut="C" onClick={onCollapse}/>
      <span className="dock-divider"/>
      <IconButton icon={Palette} label="Select & color" shortcut="Shift-drag" active={colorMode} onClick={onToggleColor}/>
      <IconButton icon={PenLine} label="Pen" shortcut="P" active={tool==="pen"} onClick={()=>onTool("pen")}>
        <span className="pen-chip" style={{"--c":penColor==="ink"?"var(--ink)":penColor}}/>
      </IconButton>
      <IconButton icon={Eraser} label="Eraser" shortcut="E" active={tool==="eraser"} onClick={()=>onTool("eraser")}/>
      <IconButton icon={WandSparkles} label="Laser pointer" shortcut="L" active={tool==="laser"} onClick={()=>onTool("laser")}/>
      <IconButton className="show-mobile" icon={Scan} label="Fit view" onClick={onFit}/>
      <IconButton className="hide-mobile" icon={Keyboard} label="Shortcuts" shortcut="?" onClick={onHelp}/>
    </div>
  );
});

export function ZoomControls({zoom,onZoomIn,onZoomOut,onFit}){
  return(
    <div className="zoom-controls glass">
      <IconButton icon={Minus} label="Zoom out" shortcut="−" onClick={onZoomOut}/>
      <button className="zoom-read" onClick={onFit} data-tip="Fit view · F">{Math.round(zoom*100)}%</button>
      <IconButton icon={Plus} label="Zoom in" shortcut="+" onClick={onZoomIn}/>
      <IconButton icon={Scan} label="Fit view" shortcut="F" onClick={onFit}/>
    </div>
  );
}
