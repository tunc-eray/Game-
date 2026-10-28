/* Basit yazilim rasterizer: sahneyi three.js geometrilerinden PNG'ye cizer.
   Tarayici/WebGL olmadan karakterlerin ve yerlesimin gorsel kontrolu icin.
   Kullanim: node tools/preview.js [kisi] [cikti.png] [yakin|cekim] */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.join(__dirname, "..");
const m = { exports: {} };
new Function("module", "exports", fs.readFileSync(path.join(root, "vendor", "three.min.js"), "utf8"))(m, m.exports);

class FakeRenderer {
  constructor() { this.domElement = { addEventListener() {}, style: {} }; }
  setPixelRatio() {}
  setSize() {}
  render(s, c) { s.updateMatrixWorld(); c.updateMatrixWorld(); }
}
const THREE = Object.assign({}, m.exports, { WebGLRenderer: FakeRenderer });

const ctxStub = () => new Proxy(function () {}, {
  apply: () => ctxStub(),
  get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : ctxStub()),
  set: () => true
});
const mkEl = (e) => Object.assign({
  style: {}, classList: { contains: () => false, toggle() {}, add() {} },
  appendChild() {}, prepend() {}, innerHTML: "", textContent: "",
  firstChild: { style: {}, textContent: "" }, scrollTop: 0, remove() {},
  getContext: () => ctxStub(), addEventListener() {}, dataset: {}
}, e);

const W = 960, H = 600;
let clock = 0, LOOP = null;
const doc = { getElementById: () => mkEl(), createElement: () => mkEl(), createTextNode: () => mkEl(), body: mkEl() };
const fn = new Function("THREE", "document", "window", "setTimeout", "clearTimeout", "requestAnimationFrame",
  "innerWidth", "innerHeight", "devicePixelRatio", "addEventListener", "performance", "location",
  "URLSearchParams", "fetch", "WebSocket", "KART_BROKERS",
  fs.readFileSync(path.join(root, "game.js"), "utf8") +
  "\nreturn {start,closeHow,drawBtn,take,doAct,grab,scene,camera,cards,DK,tw,avatars,G,CAM_BASE,CAM_LOOK};");

const I = fn(THREE, doc, {}, () => 0, () => {}, (f) => { LOOP = f; }, W, H, 1, () => {},
  { now: () => clock }, { protocol: "file:", origin: "null", search: "" }, URLSearchParams, undefined, undefined, []);

const seatCount = parseInt(process.argv[2] || "4", 10);
const outFile = path.join(root, process.argv[3] || "preview.png");
const mode = process.argv[4] || "";

I.start(seatCount);
I.closeHow();
const step = (n) => { for (let i = 0; i < n; i++) { clock += 16; if (LOOP) LOOP(); } };
step(4);

if (mode === "yakin") {
  const a = I.avatars[1];
  I.CAM_BASE.set(a.position.x + 0.12, a.position.y + 0.46, a.position.z + 0.78);
  I.CAM_LOOK.set(a.position.x, a.position.y + 0.42, a.position.z);
  step(3);
}
if (mode === "boy") {
  const a = I.avatars[1];
  I.CAM_BASE.set(a.position.x + 0.20, a.position.y + 0.52, a.position.z + 1.45);
  I.CAM_LOOK.set(a.position.x, a.position.y + 0.30, a.position.z);
  step(3);
}
if (mode === "cekim") {
  I.drawBtn();
  step(40);
}

const cam = I.camera;
cam.aspect = W / H;
cam.updateProjectionMatrix();
I.scene.updateMatrixWorld(true);
cam.updateMatrixWorld(true);
const viewProj = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);

const img = new Uint8Array(W * H * 3);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const t = y / H;
    const i = (y * W + x) * 3;
    img[i] = 8 + 12 * (1 - t);
    img[i + 1] = 14 + 16 * (1 - t);
    img[i + 2] = 20 + 20 * (1 - t);
  }
}
const zbuf = new Float32Array(W * H).fill(1e9);

const light = new THREE.Vector3(0.35, 0.85, 0.42).normalize();
const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
const v4a = new THREE.Vector4(), v4b = new THREE.Vector4(), v4c = new THREE.Vector4();
const nrm = new THREE.Vector3(), toCam = new THREE.Vector3();
const camPos = cam.position.clone();
let tris = 0;

function shade(col, nx, ny, nz) {
  const lam = Math.max(0, nx * light.x + ny * light.y + nz * light.z);
  const k = 0.32 + 0.78 * lam;
  return [Math.min(255, col.r * k * 255), Math.min(255, col.g * k * 255), Math.min(255, col.b * k * 255)];
}

function rasterize(p0, p1, p2, color) {
  const minX = Math.max(0, Math.floor(Math.min(p0[0], p1[0], p2[0])));
  const maxX = Math.min(W - 1, Math.ceil(Math.max(p0[0], p1[0], p2[0])));
  const minY = Math.max(0, Math.floor(Math.min(p0[1], p1[1], p2[1])));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(p0[1], p1[1], p2[1])));
  if (minX > maxX || minY > maxY) return;
  const ax = p0[0], ay = p0[1], bx = p1[0], by = p1[1], cx = p2[0], cy = p2[1];
  const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (area === 0) return;
  const inv = 1 / area;
  for (let y = minY; y <= maxY; y++) {
    const py = y + 0.5;
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5;
      let w0 = ((bx - px) * (cy - py) - (by - py) * (cx - px)) * inv;
      let w1 = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) * inv;
      let w2 = 1 - w0 - w1;
      if (w0 < -0.001 || w1 < -0.001 || w2 < -0.001) continue;
      const z = p0[2] * w0 + p1[2] * w1 + p2[2] * w2;
      const o = y * W + x;
      if (z >= zbuf[o]) continue;
      zbuf[o] = z;
      const i = o * 3;
      img[i] = color[0]; img[i + 1] = color[1]; img[i + 2] = color[2];
    }
  }
}

function drawObject(obj) {
  if (obj.visible === false) return;
  if (obj.isMesh && obj.geometry && obj.geometry.attributes && obj.geometry.attributes.position) {
    const geo = obj.geometry, pos = geo.attributes.position, index = geo.index;
    const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
    const col = (mat && mat.color) ? mat.color : { r: 0.8, g: 0.8, b: 0.8 };
    const count = index ? index.count : pos.count;
    for (let k = 0; k < count; k += 3) {
      const i0 = index ? index.getX(k) : k;
      const i1 = index ? index.getX(k + 1) : k + 1;
      const i2 = index ? index.getX(k + 2) : k + 2;
      A.fromBufferAttribute(pos, i0).applyMatrix4(obj.matrixWorld);
      B.fromBufferAttribute(pos, i1).applyMatrix4(obj.matrixWorld);
      C.fromBufferAttribute(pos, i2).applyMatrix4(obj.matrixWorld);
      v4a.set(A.x, A.y, A.z, 1).applyMatrix4(viewProj);
      v4b.set(B.x, B.y, B.z, 1).applyMatrix4(viewProj);
      v4c.set(C.x, C.y, C.z, 1).applyMatrix4(viewProj);
      if (v4a.w <= 0.02 || v4b.w <= 0.02 || v4c.w <= 0.02) continue;
      const pa = [(v4a.x / v4a.w * 0.5 + 0.5) * W, (0.5 - v4a.y / v4a.w * 0.5) * H, v4a.z / v4a.w];
      const pb = [(v4b.x / v4b.w * 0.5 + 0.5) * W, (0.5 - v4b.y / v4b.w * 0.5) * H, v4b.z / v4b.w];
      const pc = [(v4c.x / v4c.w * 0.5 + 0.5) * W, (0.5 - v4c.y / v4c.w * 0.5) * H, v4c.z / v4c.w];
      const e1x = B.x - A.x, e1y = B.y - A.y, e1z = B.z - A.z;
      const e2x = C.x - A.x, e2y = C.y - A.y, e2z = C.z - A.z;
      nrm.set(e1y * e2z - e1z * e2y, e1z * e2x - e1x * e2z, e1x * e2y - e1y * e2x).normalize();
      toCam.copy(camPos).sub(A);
      if (nrm.dot(toCam) < 0) nrm.multiplyScalar(-1);
      rasterize(pa, pb, pc, shade(col, nrm.x, nrm.y, nrm.z));
      tris++;
    }
  }
  const kids = obj.children || [];
  for (let i = 0; i < kids.length; i++) drawObject(kids[i]);
}
drawObject(I.scene);

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0;
  Buffer.from(img.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2;
fs.writeFileSync(outFile, Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw, { level: 6 })),
  chunk("IEND", Buffer.alloc(0))
]));
console.log("yazildi:", outFile, "| ucgen:", tris, "| oyuncu:", seatCount, mode ? "| " + mode : "");
