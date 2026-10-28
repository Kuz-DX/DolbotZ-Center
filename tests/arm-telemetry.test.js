// No ROS runtime required. Node 14+ (Node 12 needs optional/nullish harmony flags).
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const elements = new Map();
const context2d = new Proxy({}, { get: (target, key) => target[key] || (() => {}), set: (target, key, value) => (target[key] = value, true) });
function element() {
  return { dataset: {}, style: {}, classList: { add() {}, remove() {}, toggle() {} },
    append() {}, replaceChildren() {}, getContext: () => context2d,
    getBoundingClientRect: () => ({ width: 600, height: 400 }) };
}
const document = { body: element(), createElement: element, createDocumentFragment: element,
  getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); } };
let now = 10000;
const sandbox = { document, console, URLSearchParams, localStorage: { getItem: () => null },
  window: { location: { search: '' }, devicePixelRatio: 1 }, Date: { now: () => now } };
const source = fs.readFileSync(require('path').join(__dirname, '../app.js'), 'utf8')
  .replace('  initialize();', `globalThis.api = { state, ARM_TF_FRAMES, ARM_JOINT_NAMES, handleArmTf,
    handleJointState, isArmPoseFresh, refreshArmView, resetArmTelemetry, handleResize };`);
vm.runInNewContext(source, sandbox);
const api = sandbox.api;
const tf = (parent, child, t = [0, 0, 0], q = [0, 0, 0, 1]) => ({ header: { frame_id: parent },
  child_frame_id: child, transform: { translation: { x: t[0], y: t[1], z: t[2] },
    rotation: { x: q[0], y: q[1], z: q[2], w: q[3] } } });
const frames = api.ARM_TF_FRAMES;
const chain = frames.map((frame, i) => tf(i ? frames[i - 1] : 'arm_world', frame));
chain[0] = tf('arm_world', frames[0], [1, 0, 0]);
chain[1] = tf(frames[0], frames[1], [0, 0, 0], [0, 0, Math.SQRT1_2, Math.SQRT1_2]);
chain[2] = tf(frames[1], frames[2], [1, 0, 0]);
chain[3] = tf(frames[2], frames[3], [0, 0, 2]);
api.handleArmTf({ transforms: chain.slice(1, 7) }, 'armTf');
assert.strictEqual(api.isArmPoseFresh(), false, 'requires fixed transforms');
api.handleArmTf({ transforms: [chain[0], ...chain.slice(7)] }, 'armTfStatic');
assert.strictEqual(api.isArmPoseFresh(), true);
const end = api.state.latestArmPose.endEffector;
assert.ok(Math.abs(end.x - 1) < 1e-12 && Math.abs(end.y - 1) < 1e-12 && end.z === 2, 'compose translation with parent rotation');
assert.ok(Math.abs(api.state.latestArmPose.reach - Math.sqrt(6)) < 1e-12, '3D reach includes Y');
assert.ok(document.getElementById('endEffectorPosition').textContent.includes('Y 1.000'));
api.handleJointState({ name: ['wrist_yaw_joint', 'base_joint', 'wheel_joint'], position: [0.5, 0, 99], velocity: [0.2] });
assert.strictEqual(api.state.latestJointState.names.length, 7);
assert.strictEqual(api.state.latestJointState.positions[0], 0);
assert.strictEqual(api.state.latestJointState.positions[5], 0.5);
assert.strictEqual(api.state.latestJointState.positions[1], null, 'missing position must not become zero');
assert.strictEqual(api.state.latestJointState.velocities[0], null);
assert.strictEqual(document.getElementById('armJointCount').textContent, '2');
const receivedAt = api.state.latestJointStateAt;
now += 100;
api.handleJointState({ name: ['wheel_joint'], position: [5] });
assert.strictEqual(api.state.latestJointStateAt, receivedAt, 'ignore non-arm publishers');
now += 2000;
api.refreshArmView();
assert.strictEqual(api.isArmPoseFresh(), false);
assert.strictEqual(document.getElementById('armReach').textContent, '-- m');
assert.ok(document.getElementById('jointStateList').innerHTML.includes('수신 중단'));
api.handleArmTf({ transforms: chain.slice(1, 7) }, 'armTf');
assert.strictEqual(api.isArmPoseFresh(), true, 'static transforms survive age timeout');
api.handleArmTf({ transforms: [tf(frames[1], frames[1])] }, 'armTf');
assert.strictEqual(api.isArmPoseFresh(), true, 'reject self-parent transform');
api.handleArmTf({ transforms: [tf(frames[2], frames[1])] }, 'armTf');
assert.strictEqual(api.isArmPoseFresh(), false, 'reject cyclic chain');
api.resetArmTelemetry();
assert.strictEqual(api.state.armTransforms.size, 0);
assert.strictEqual(api.state.latestArmPose, null);
assert.strictEqual(api.state.latestJointState, null);
console.log('PASS: TF composition, static cache, 3D reach, joint ordering/missing data, expiry, cycles, reset');
