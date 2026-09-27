import source from './cat-poses.json' with { type: 'json' };

export const behaviorNames = Object.keys(source.behaviors);
export const layout = source.behaviors.idle[0].layers;
export const faceLayers = ['mouth', 'eyes', 'brows', 'whiskers', 'earholes'];
const channels = ['roll', 'tail', 'feet', 'body', 'head', ...faceLayers];
const properties = ['x', 'y', 'rotate', 'sx', 'sy', 'skew'];
const radians = Math.PI / 180;
const clamp = (v, low, high) => Math.min(high, Math.max(low, v));

export function multiply(a, b) {
  return [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1],
    a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3],
    a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
}

function inverse(m) {
  const det=m[0]*m[3]-m[1]*m[2];
  return [m[3]/det,-m[1]/det,-m[2]/det,m[0]/det,
    (m[2]*m[5]-m[3]*m[4])/det,(m[1]*m[4]-m[0]*m[5])/det];
}

function pivot(name) {
  if (name === 'roll') return [136, 150];
  const {width:w,height:h}=layout[name];
  if(name==='head') return [w*.5,h*.32];
  if(name==='tail') return [w*.1,h*.84];
  if(name==='body'||name==='feet') return [w*.5,h*.94];
  return [w*.5,h*.5];
}

function decompose(m, name) {
  let sx=Math.hypot(m[0],m[1]);
  const det=m[0]*m[3]-m[1]*m[2];
  // Mirrored tails turn behind the torso; mirrored eyes close vertically.
  if(name==='tail' && det<0) sx=-sx;
  const sy=det/sx;
  const rotate=Math.atan2(m[1]/sx,m[0]/sx)/radians;
  const skew=Math.atan((m[0]*m[2]+m[1]*m[3])/(sx*sy))/radians;
  const [px,py]=pivot(name);
  return {x:m[0]*px+m[2]*py+m[4],y:m[1]*px+m[3]*py+m[5],rotate,sx,sy,skew};
}

export function channelMatrix(state,name) {
  const c=Math.cos(state.rotate*radians),s=Math.sin(state.rotate*radians);
  const k=Math.tan(state.skew*radians);
  const a=c*state.sx,b=s*state.sx,cc=(c*k-s)*state.sy,d=(s*k+c)*state.sy;
  const [px,py]=pivot(name);
  return [a,b,cc,d,state.x-a*px-cc*py,state.y-b*px-d*py];
}

function rotationMatrix(angle) {
  return channelMatrix({x:136,y:150,rotate:angle,sx:1,sy:1,skew:0},'roll');
}

function sourceMatrix(layer,name) {
  return multiply(layer.matrix,[layer.width/layout[name].width,0,0,layer.height/layout[name].height,0,0]);
}

export function poseState(behavior,index,rollAngle=0) {
  const pose=source.behaviors[behavior][index];
  const world=Object.fromEntries(Object.entries(pose.layers).map(([name,l])=>[name,sourceMatrix(l,name)]));
  const root=rotationMatrix(rollAngle);
  const state={roll:{x:136,y:150,rotate:rollAngle,sx:1,sy:1,skew:0}};
  for(const name of Object.keys(layout)) {
    // Facial detail is always relative to the head, including during a roll.
    const parent=faceLayers.includes(name)?world.head:root;
    state[name]=decompose(multiply(inverse(parent),world[name]),name);
  }
  return state;
}

export function worldMatrices(state) {
  const root=channelMatrix(state.roll,'roll');
  const head=multiply(root,channelMatrix(state.head,'head'));
  return Object.fromEntries(Object.keys(layout).map(name=>[name,
    multiply(faceLayers.includes(name)?head:root,channelMatrix(state[name],name))]));
}

// Times are authored from the accompanying motion notes. Geometry is from
// the .fig export, not the enlarged axis-aligned boxes described in the notes.
// Each entry is [time in ms, pose index]; -1 means canonical Idle 01.
const sequences={
  idle:[[0,-1],[1000,-1],[1450,1],[2070,2],[2670,3],[2900,3],[3520,4],[4350,-1],[4600,-1]],
  curious:[[0,-1],[160,0],[360,1],[500,1],[870,2],[1310,3],[1660,3],[2210,4],[2720,-1]],
  angry:[[0,-1],[150,0],[370,1],[650,2],[970,3],[1260,4],[1720,4],[2340,-1]],
  kneading:[[0,-1],[180,0],[590,1],[1010,2],[1470,3],[1930,4],[2390,3],[2850,4],[3310,3],[3770,4],[4340,1],[4850,-1]],
  rolling:[[0,-1],[120,0],[380,1],[600,2],[800,3],[980,4],[1140,5],[1270,6],[1430,7],[1620,8],[1750,8],[2020,9],[2370,10],[2810,-1]]
};

const delays={roll:0,tail:0,feet:35,body:55,head:115,whiskers:145,earholes:150,mouth:150,eyes:180,brows:195};

function unwrap(angle,previous) {
  while(angle-previous>180) angle-=360;
  while(angle-previous < -180) angle+=360;
  return angle;
}

// Shape-preserving cubic interpolation: matching tangents through moving
// keys, zero velocity at holds and direction changes, no elastic overshoot.
function slope(keys,index,property) {
  if(index===0 || index===keys.length-1) return 0;
  const a=keys[index-1],b=keys[index],c=keys[index+1];
  const h0=b.time-a.time,h1=c.time-b.time;
  const d0=(b.value[property]-a.value[property])/h0;
  const d1=(c.value[property]-b.value[property])/h1;
  if(d0*d1<=0) return 0;
  const w0=2*h1+h0,w1=h1+2*h0;
  return (w0+w1)/(w0/d0+w1/d1);
}

export function createClip(name) {
  if(!behaviorNames.includes(name)) throw new Error(`Unknown cat behavior: ${name}`);
  let lastRoll=0;
  const frames=sequences[name].map(([time,index])=>{
    let roll=0;
    if(name==='rolling') {
      if(index<0) roll=time===0?0:360;
      else {
        const m=source.behaviors.rolling[index].layers.head.matrix;
        roll=unwrap(Math.atan2(m[1],m[0])/radians,lastRoll);
      }
      lastRoll=roll;
    }
    return {time,state:poseState(index<0?'idle':name,index<0?0:index,roll)};
  });
  const stagger=name==='rolling'?0.22:name==='angry'?0.55:1;
  const tracks={};
  for(const channel of channels) {
    let delay=delays[channel]*stagger;
    if(name==='curious') delay=faceLayers.includes(channel)?10:channel==='head'?50:channel==='body'?90:0;
    let angle=frames[0].state[channel].rotate;
    tracks[channel]=frames.map((frame,index)=>{
      const value={...frame.state[channel]};
      if(channel!=='roll') value.rotate=unwrap(value.rotate,angle);
      angle=value.rotate;
      return {time:index===0?0:frame.time+delay,value};
    });
    tracks[channel].forEach((key,i)=>key.slope=Object.fromEntries(properties.map(p=>[p,slope(tracks[channel],i,p)])));
  }
  const keyTimes=[...new Set(Object.values(tracks).flatMap(track=>track.map(k=>k.time)))].sort((a,b)=>a-b);
  return {name,tracks,keyTimes,duration:keyTimes.at(-1)};
}

export function sampleClip(clip,time) {
  time=clamp(time,0,clip.duration);
  return Object.fromEntries(Object.entries(clip.tracks).map(([name,keys])=>{
    let i=0;
    while(i<keys.length-2 && time>keys[i+1].time) i++;
    const a=keys[i],b=keys[i+1];
    const h=b.time-a.time,t=clamp((time-a.time)/h,0,1),t2=t*t,t3=t2*t;
    const value=Object.fromEntries(properties.map(p=>[p,
      (2*t3-3*t2+1)*a.value[p]+(t3-2*t2+t)*h*a.slope[p]+
      (-2*t3+3*t2)*b.value[p]+(t3-t2)*h*b.slope[p]]));
    return [name,value];
  }));
}
