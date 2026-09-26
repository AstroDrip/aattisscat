import anime from 'animejs/lib/anime.es.js';
import './style.css';

const app = document.querySelector('#app');

app.innerHTML = `
  <section class="intro panel">
    <div class="copy">
      <p class="eyebrow">LAYERED MOTION STUDY / 01</p>
      <h1>A hand-drawn cat that stays alive while you scroll.</h1>
      <p class="lede">Each drawing stays independent. Anime.js handles the small idle behaviors while scroll moves the complete rig through the page.</p>
      <p class="scroll-cue">Scroll to move the scene ↓</p>
    </div>
  </section>

  <section class="experience" aria-label="Scrollable cat animation demonstration">
    <div class="sticky-stage">
      <div class="scene-grid" aria-hidden="true"></div>
      <div class="stage-copy" aria-hidden="true">
        <span id="chapterNumber">01</span>
        <p id="chapterLabel">CALM / IDLE</p>
      </div>

      <div class="cat-scroll-rig" id="catScrollRig">
        <div class="cat-idle-rig" id="catIdleRig" role="img" aria-label="Hand drawn sitting cat looking around and gently kneading">
          <div class="layer tail-wrap"><img class="cat-layer tail" src="/cat/tail.png" alt="" draggable="false"></div>
          <img class="cat-layer body" src="/cat/body.png" alt="" draggable="false">

          <div class="feet-clip feet-left" aria-hidden="true">
            <img class="cat-layer feet-source" src="/cat/feet.png" alt="" draggable="false">
          </div>
          <div class="feet-clip feet-right" aria-hidden="true">
            <img class="cat-layer feet-source" src="/cat/feet.png" alt="" draggable="false">
          </div>

          <img class="cat-layer head" src="/cat/head.png" alt="" draggable="false">

          <div class="face-rig">
            <img class="cat-layer earholes" src="/cat/earholes.png" alt="" draggable="false">
            <div class="eye-window"><img class="cat-layer eyes" src="/cat/eyes.png" alt="" draggable="false"></div>
            <img class="cat-layer brows" src="/cat/brows.png" alt="" draggable="false">
            <img class="cat-layer whiskers" src="/cat/whiskers.png" alt="" draggable="false">
            <img class="cat-layer mouth" src="/cat/mouth.png" alt="" draggable="false">
          </div>
        </div>
      </div>

      <div class="progress-rail" aria-hidden="true"><div class="progress-fill" id="progressFill"></div></div>
    </div>

    <article class="scroll-beat beat-one">
      <p>01</p><h2>Idle</h2><span>Breathing and the tail carry the base motion.</span>
    </article>
    <article class="scroll-beat beat-two">
      <p>02</p><h2>Notice</h2><span>Eyes shift first. The ears answer a fraction later.</span>
    </article>
    <article class="scroll-beat beat-three">
      <p>03</p><h2>Knead</h2><span>Separate clipped foot layers create a soft alternating weight change.</span>
    </article>
  </section>

  <section class="outro panel">
    <div class="copy narrow">
      <p class="eyebrow">ANIME.JS + DOM LAYERS</p>
      <h2>Scroll and idle motion never fight for the same transform.</h2>
      <p class="lede">The outer wrapper is reserved for page choreography. The inner rig and individual drawings own the character animation.</p>
      <a class="restart" href="#">Back to top ↑</a>
    </div>
  </section>
`;

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rig = document.querySelector('#catScrollRig');
const idleRig = document.querySelector('#catIdleRig');
const experience = document.querySelector('.experience');
const progressFill = document.querySelector('#progressFill');
const chapterNumber = document.querySelector('#chapterNumber');
const chapterLabel = document.querySelector('#chapterLabel');

const rand = (min, max) => Math.random() * (max - min) + min;
const later = (fn, min, max) => window.setTimeout(fn, rand(min, max));

function startAmbientMotion() {
  if (prefersReducedMotion) return;

  anime({
    targets: '.cat-idle-rig',
    translateY: [0, -1.8],
    scaleY: [1, 1.006],
    duration: 2600,
    direction: 'alternate',
    loop: true,
    easing: 'easeInOutSine'
  });

  anime({
    targets: '.head',
    translateY: [0, -0.7],
    duration: 2650,
    delay: 150,
    direction: 'alternate',
    loop: true,
    easing: 'easeInOutSine'
  });

  anime({
    targets: '.tail-wrap',
    rotate: [
      { value: -10, duration: 1550 },
      { value: 13, duration: 1850 },
      { value: -7, duration: 1650 },
      { value: 9, duration: 1750 }
    ],
    loop: true,
    easing: 'easeInOutSine'
  });

  anime({
    targets: '.feet-left',
    translateY: [0, 2.5],
    rotate: [0, -1.4],
    duration: 900,
    direction: 'alternate',
    loop: true,
    easing: 'easeInOutSine'
  });

  anime({
    targets: '.feet-right',
    translateY: [0, 2.5],
    rotate: [0, 1.4],
    duration: 900,
    delay: 430,
    direction: 'alternate',
    loop: true,
    easing: 'easeInOutSine'
  });

  const eyeLook = () => {
    const x = rand(-3.4, 3.4);
    const y = rand(-1.2, 1.1);
    anime({
      targets: '.eyes',
      translateX: x,
      translateY: y,
      duration: rand(160, 250),
      easing: 'easeOutQuad',
      complete: () => {
        later(() => anime({
          targets: '.eyes',
          translateX: 0,
          translateY: 0,
          duration: rand(180, 300),
          easing: 'easeOutQuad'
        }), 700, 2100);
      }
    });
    if (Math.random() > 0.38) later(earListen, 120, 260);
    later(eyeLook, 3600, 7800);
  };

  const earListen = () => {
    const direction = Math.random() > 0.5 ? 1 : -1;
    anime({
      targets: '.earholes',
      translateX: direction * rand(1.2, 2.7),
      scaleX: rand(0.985, 1.02),
      duration: 180,
      easing: 'easeOutQuad',
      complete: () => later(() => anime({
        targets: '.earholes',
        translateX: 0,
        scaleX: 1,
        duration: 430,
        easing: 'easeOutElastic(1, .7)'
      }), 220, 650)
    });
  };

  const browReact = () => {
    anime({
      targets: '.brows',
      translateY: -rand(0.8, 2.2),
      rotate: rand(-1.8, 1.8),
      duration: 260,
      easing: 'easeOutQuad',
      complete: () => later(() => anime({
        targets: '.brows',
        translateY: 0,
        rotate: 0,
        duration: 520,
        easing: 'easeOutElastic(1, .65)'
      }), 320, 920)
    });
    later(browReact, 5700, 11800);
  };

  const sniff = () => {
    anime.timeline({ easing: 'easeInOutSine' })
      .add({ targets: '.mouth', translateY: -0.8, scale: 1.015, duration: 180 })
      .add({ targets: '.whiskers', translateY: -0.65, scaleX: 1.006, duration: 180 }, '-=150')
      .add({ targets: '.mouth', translateY: 0, scale: 1, duration: 300 })
      .add({ targets: '.whiskers', translateY: 0, scaleX: 1, duration: 300 }, '-=260');
    later(sniff, 8000, 15000);
  };

  later(eyeLook, 900, 2200);
  later(browReact, 2600, 5200);
  later(sniff, 5000, 9000);
}

function updateScroll() {
  const rect = experience.getBoundingClientRect();
  const scrollable = Math.max(1, experience.offsetHeight - window.innerHeight);
  const travelled = Math.min(scrollable, Math.max(0, -rect.top));
  const p = travelled / scrollable;

  progressFill.style.transform = `scaleY(${p})`;

  const x = Math.sin(p * Math.PI * 1.1) * Math.min(window.innerWidth * 0.075, 72);
  const y = (p - 0.5) * -28;
  const scale = 0.91 + Math.sin(p * Math.PI) * 0.13;
  const rotate = (p - 0.5) * 2.4;
  rig.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale}) rotate(${rotate}deg)`;

  if (p < 0.34) {
    chapterNumber.textContent = '01';
    chapterLabel.textContent = 'CALM / IDLE';
  } else if (p < 0.68) {
    chapterNumber.textContent = '02';
    chapterLabel.textContent = 'NOTICE / LISTEN';
  } else {
    chapterNumber.textContent = '03';
    chapterLabel.textContent = 'SOFT / KNEAD';
  }

  requestAnimationFrame(updateScroll);
}

Promise.all([...document.images].map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
  img.addEventListener('load', resolve, { once: true });
  img.addEventListener('error', resolve, { once: true });
}))).then(() => document.body.classList.add('ready'));

startAmbientMotion();
requestAnimationFrame(updateScroll);
