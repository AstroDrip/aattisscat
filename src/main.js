import anime from 'animejs/lib/anime.es.js';
import { behaviorNames, layout, faceLayers, createClip, sampleClip, channelMatrix } from './cat-motion.js';
import './style.css';

const params=new URLSearchParams(location.search);
const inspection=params.has('inspect') || params.has('edit');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const listeners=new AbortController();
const listenerOptions={signal:listeners.signal};
let disposed=false;
const clips=Object.fromEntries(behaviorNames.map(name=>[name,createClip(name)]));
const asset=name=>`${import.meta.env.BASE_URL}cat-v2/${name}.png`;
const image=name=>`<image class="cat-layer ${name}" href="${asset(name)}" width="${layout[name].width}" height="${layout[name].height}" preserveAspectRatio="xMidYMid slice"/>`;
const layer=name=>`<g data-channel="${name}">${image(name)}</g>`;
const feet=layout.feet;

document.querySelector('#app').innerHTML=`
  <section class="experience" aria-label="Scrollable cat animation">
    <div class="sticky-stage">
      <div class="scene-grid" aria-hidden="true"></div>
      <div class="cat-scroll-rig" id="catScrollRig">
        <svg class="cat-art" id="catIdleRig" viewBox="0 0 272 250" role="img" aria-labelledby="catTitle">
          <title id="catTitle">Hand-drawn cat, resting</title>
          <defs>
            <clipPath id="leftPaw"><rect width="${feet.width/2}" height="${feet.height}"/></clipPath>
            <clipPath id="rightPaw"><rect x="${feet.width/2}" width="${feet.width/2}" height="${feet.height}"/></clipPath>
          </defs>
          <g data-channel="roll">
            ${layer('tail')}
            <g data-channel="feet">
              <g class="paw-left"><g clip-path="url(#leftPaw)">${image('feet')}</g></g>
              <g class="paw-right"><g clip-path="url(#rightPaw)">${image('feet')}</g></g>
            </g>
            ${layer('body')}
            <g data-channel="head">${image('head')}${faceLayers.map(layer).join('')}</g>
          </g>
        </svg>
      </div>
      <p class="load-error" role="alert" hidden>The cat artwork could not load. Please reload the page.</p>
    </div>
  </section>
  ${inspection?`<aside class="motion-inspector" aria-label="Animation inspector">
    <label>Behavior <select id="behavior">${behaviorNames.map(name=>`<option value="${name}">${name[0].toUpperCase()+name.slice(1)}</option>`).join('')}</select></label>
    <label class="scrubber">Timeline <input id="scrub" type="range" min="0" max="1000" value="0" step="1"></label>
    <output id="time">0.00 s</output>
    <button id="play" type="button">Play</button>
    <button id="reset" type="button">Reset pose</button>
  </aside>`:''}
`;

const channelElements=Object.fromEntries([...document.querySelectorAll('[data-channel]')].map(el=>[el.dataset.channel,el]));
const rig=document.querySelector('#catScrollRig');
const experience=document.querySelector('.experience');
const pawLeft=document.querySelector('.paw-left');
const pawRight=document.querySelector('.paw-right');
const title=document.querySelector('#catTitle');
const scrub=document.querySelector('#scrub');
const timeOutput=document.querySelector('#time');
const playButton=document.querySelector('#play');
const behaviorSelect=document.querySelector('#behavior');
let current=clips.idle;
let animation;
let playing=false;
let ready=false;
let sequenceIndex=0;
const clock={time:0};
const sequence=['idle','idle','curious','idle','kneading','idle','angry','idle','idle','rolling'];

function render(time) {
  const state=sampleClip(current,time);
  for(const [name,value] of Object.entries(state)) {
    channelElements[name].setAttribute('transform',`matrix(${channelMatrix(value,name).join(' ')})`);
  }
  // Small alternating paw presses fade to zero at both ends of the burst.
  const press=current.name==='kneading'?Math.sin(Math.PI*time/current.duration)*Math.sin((time-590)*Math.PI/460)*1.15:0;
  pawLeft.setAttribute('transform',`translate(0 ${Math.max(0,press)})`);
  pawRight.setAttribute('transform',`translate(0 ${Math.max(0,-press)})`);
  if(scrub) {
    scrub.value=String(time/current.duration*1000);
    timeOutput.value=`${(time/1000).toFixed(2)} / ${(current.duration/1000).toFixed(2)} s`;
  }
}

function pause() {
  playing=false;
  animation?.pause();
  if(playButton) playButton.textContent='Play';
}

function run(name,{autoplay=true}={}) {
  if(disposed) return;
  animation?.pause();
  current=clips[name] || clips.idle;
  clock.time=0;
  title.textContent=`Hand-drawn cat — ${current.name}`;
  rig.dataset.behavior=current.name;
  if(behaviorSelect) behaviorSelect.value=current.name;
  render(0);
  playing=autoplay && ready && !reducedMotion.matches;
  animation=anime({
    targets:clock,time:current.duration,duration:current.duration,easing:'linear',autoplay:false,
    update:()=>render(clock.time),
    complete:()=>{
      render(current.duration);
      if(inspection) { pause(); return; }
      sequenceIndex=(sequenceIndex+1)%sequence.length;
      run(sequence[sequenceIndex]);
    }
  });
  if(playing && !document.hidden) animation.play();
  if(playButton) playButton.textContent=playing?'Pause':'Play';
}

if(inspection) {
  behaviorSelect.addEventListener('change',()=>run(behaviorSelect.value,{autoplay:false}));
  scrub.addEventListener('input',()=>{
    pause();
    clock.time=Number(scrub.value)/1000*current.duration;
    animation.seek(clock.time);
    render(clock.time);
  });
  playButton.addEventListener('click',()=>{
    if(playing) { pause(); return; }
    if(reducedMotion.matches || !ready) return;
    if(clock.time>=current.duration-1) { run(current.name); return; }
    playing=true;
    animation.play();
    playButton.textContent='Pause';
  });
  document.querySelector('#reset').addEventListener('click',()=>run('idle',{autoplay:false}));
}

document.addEventListener('visibilitychange',()=>{
  if(document.hidden) animation?.pause();
  else if(playing && !reducedMotion.matches) animation?.play();
},listenerOptions);

// Scroll owns only the outer wrapper and stops requesting frames at rest.
let scrollFrame=0;
let progress=0;
let previousTime=0;
function updateScroll(now) {
  scrollFrame=0;
  if(reducedMotion.matches) { rig.style.transform='none'; return; }
  const distance=Math.max(1,experience.offsetHeight-innerHeight);
  const target=Math.max(0,Math.min(1,-experience.getBoundingClientRect().top/distance));
  const dt=previousTime?Math.min(64,now-previousTime):16;
  previousTime=now;
  progress+=(target-progress)*(1-Math.exp(-dt/115));
  const x=Math.sin(progress*Math.PI*1.1)*Math.min(innerWidth*.045,34);
  const y=-18*progress;
  const scale=1+Math.sin(progress*Math.PI)*.045;
  rig.style.transform=`translate3d(${x}px,${y}px,0) scale(${scale}) rotate(${progress*1.4}deg)`;
  if(Math.abs(target-progress)>.0001) scrollFrame=requestAnimationFrame(updateScroll);
  else previousTime=0;
}
function scheduleScroll() {
  if(!scrollFrame) scrollFrame=requestAnimationFrame(updateScroll);
}
addEventListener('scroll',scheduleScroll,{...listenerOptions,passive:true});
addEventListener('resize',scheduleScroll,listenerOptions);
reducedMotion.addEventListener('change',()=>{
  sequenceIndex=0;
  run('idle',{autoplay:!inspection});
  scheduleScroll();
},listenerOptions);

run('idle',{autoplay:false});
Promise.all(Object.keys(layout).map(name=>new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=resolve;
  img.onerror=()=>reject(new Error(`Failed to load ${name}`));
  img.src=asset(name);
}))).then(()=>{
  if(disposed) return;
  ready=true;
  document.body.classList.add('ready');
  const requested=behaviorNames.includes(params.get('behavior'))?params.get('behavior'):'idle';
  run(reducedMotion.matches?'idle':requested,{autoplay:!inspection});
  scheduleScroll();
}).catch(error=>{
  if(disposed) return;
  document.querySelector('.load-error').hidden=false;
  console.error(error);
});

if(import.meta.hot) import.meta.hot.dispose(()=>{
  disposed=true;
  playing=false;
  listeners.abort();
  animation?.pause();
  cancelAnimationFrame(scrollFrame);
});
