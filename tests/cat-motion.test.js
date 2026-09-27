import test from 'node:test';
import assert from 'node:assert/strict';

const motion = await import('../src/cat-motion.js').catch(() => ({}));
const close = (a, b, tolerance = 0.002) => assert.ok(Math.abs(a-b) < tolerance, `${a} != ${b}`);

test('all five behaviors return to the same neutral artwork without a jump', () => {
  assert.equal(typeof motion.createClip, 'function', 'the coordinated motion controller is missing');
  for (const name of ['idle', 'curious', 'angry', 'kneading', 'rolling']) {
    const clip = motion.createClip(name);
    const start = motion.worldMatrices(motion.sampleClip(clip, 0));
    const end = motion.worldMatrices(motion.sampleClip(clip, clip.duration));
    for (const layer of Object.keys(start)) start[layer].forEach((v, i) => close(v, end[layer][i]));
  }
});

test('neutral geometry uses the new Figma coordinates, including the face', () => {
  assert.equal(typeof motion.createClip, 'function');
  const matrices = motion.worldMatrices(motion.sampleClip(motion.createClip('idle'), 0));
  close(matrices.head[4], 84);
  close(matrices.head[5], 47);
  close(matrices.eyes[4], 112.3962383);
  close(matrices.eyes[5], 67.7301502);
  close(matrices.tail[4], 140.1609344);
  close(matrices.tail[5], 112.9760056);
});

test('rolling continues through inversion instead of reversing at 180 degrees', () => {
  assert.equal(typeof motion.createClip, 'function');
  const clip = motion.createClip('rolling');
  let previous = 0;
  for (let t=0; t<=clip.duration; t+=5) {
    const angle = motion.sampleClip(clip,t).roll.rotate;
    assert.ok(angle >= previous - 0.001, `roll reversed at ${t}ms`);
    previous = angle;
  }
  close(motion.sampleClip(clip,clip.duration).roll.rotate,360);
});

test('face follows the head through a deep tilt without drifting off the artwork', () => {
  assert.equal(typeof motion.poseState, 'function');
  const state = motion.poseState('curious',3);
  const original = motion.worldMatrices(state);
  state.head.x += 17;
  state.head.y -= 11;
  const moved = motion.worldMatrices(state);
  for (const layer of ['head','mouth','eyes','brows','whiskers','earholes']) {
    close(moved[layer][4]-original[layer][4],17);
    close(moved[layer][5]-original[layer][5],-11);
  }
});

test('all interpolated transforms stay finite and continuous at staggered keyframes', () => {
  assert.equal(typeof motion.createClip, 'function');
  for (const name of ['idle','curious','angry','kneading','rolling']) {
    const clip=motion.createClip(name);
    for (const t of clip.keyTimes) {
      const before=motion.worldMatrices(motion.sampleClip(clip,Math.max(0,t-0.01)));
      const after=motion.worldMatrices(motion.sampleClip(clip,Math.min(clip.duration,t+0.01)));
      for(const layer of Object.keys(before)) before[layer].forEach((v,i)=>{
        assert.ok(Number.isFinite(v));
        close(v,after[layer][i],0.1);
      });
    }
  }
});
