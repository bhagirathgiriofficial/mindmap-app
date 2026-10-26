import {useCallback,useLayoutEffect,useRef,useState} from "react";

const NODE_DURATION=320,VIEW_DURATION=380;
const ease=t=>1-Math.pow(1-t,3);
const lerp=(a,b,t)=>a+(b-a)*t;
const reducedMotion=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/*
 * Smoothly moves nodes from their previous positions to a new layout.
 * Newly shown nodes grow out of their parent and fade in.
 */
export function useTweenedNodes(nodes){
  const [frame,setFrame]=useState(nodes);
  const shown=useRef(new Map());

  useLayoutEffect(()=>{
    const prev=shown.current;
    const remember=list=>{shown.current=new Map(list.map(n=>[n.id,{x:n.x,y:n.y}]))};
    if(!prev.size||reducedMotion()){remember(nodes);setFrame(nodes);return}

    const byId=new Map(nodes.map(n=>[n.id,n]));
    const start=new Map();
    for(const n of nodes){
      const old=prev.get(n.id);
      if(old){start.set(n.id,{...old,o:1});continue}
      const p=byId.get(n.parentId),ps=p&&start.get(p.id);
      start.set(n.id,ps?{x:ps.x+p.w/2-n.w/2,y:ps.y+p.h/2-n.h/2,o:0}:{x:n.x,y:n.y,o:1});
    }

    const at=t=>nodes.map(n=>{
      const s=start.get(n.id);
      return{...n,x:lerp(s.x,n.x,t),y:lerp(s.y,n.y,t),opacity:lerp(s.o,1,t)};
    });
    const t0=performance.now();
    let raf;
    const step=now=>{
      const t=Math.min(1,(now-t0)/NODE_DURATION);
      const f=at(ease(t));
      remember(f);setFrame(f);
      if(t<1)raf=requestAnimationFrame(step);
    };
    const first=at(0);
    remember(first);setFrame(first);
    raf=requestAnimationFrame(step);
    // Animation frames pause in hidden or throttled pages; always land on the final layout.
    const done=setTimeout(()=>{cancelAnimationFrame(raf);remember(nodes);setFrame(nodes)},NODE_DURATION+120);
    return()=>{cancelAnimationFrame(raf);clearTimeout(done)};
  },[nodes]);

  return frame;
}

/*
 * Pan/zoom state. `set` applies immediately (and cancels any running animation);
 * `animateTo` eases toward a target view.
 */
export function useViewTransform(initial){
  const [transform,setTransform]=useState(initial);
  const ref=useRef(transform);
  ref.current=transform;
  const raf=useRef(0);
  const done=useRef(0);
  const stop=()=>{cancelAnimationFrame(raf.current);clearTimeout(done.current)};

  const set=useCallback(next=>{
    stop();
    setTransform(next);
  },[]);

  const animateTo=useCallback(target=>{
    stop();
    if(reducedMotion()){setTransform(target);return}
    const from={...ref.current},t0=performance.now();
    const step=now=>{
      const t=Math.min(1,(now-t0)/VIEW_DURATION),e=ease(t);
      setTransform({x:lerp(from.x,target.x,e),y:lerp(from.y,target.y,e),k:lerp(from.k,target.k,e)});
      if(t<1)raf.current=requestAnimationFrame(step);
    };
    raf.current=requestAnimationFrame(step);
    done.current=setTimeout(()=>{cancelAnimationFrame(raf.current);setTransform(target)},VIEW_DURATION+120);
  },[]);

  return{transform,transformRef:ref,set,animateTo};
}
