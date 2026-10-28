/* =====================================================================
   KART BROKERS - tek dosya three.js (r128) oyunu
   ---------------------------------------------------------------------
   Oyuncular: "kurbağa büyücü" karakterleri.
     * bağdaş kurmuş bacaklar (gövdenin altında çapraz, sabit)
     * havada süzülür: yukarı-aşağı ÇOK ÇOK yavaş salınım (12 sn'de bir tur)
     * kamera salınımı daha da yavaş (17-28 sn) ve çok küçük genlikli
       => mide bulantısı yapmaz, fare paralaksı yok.
   Test: npm test   (test/scene-test.js, gerçek three.js + sahte çizici)
   ===================================================================== */
"use strict";

/* ------------------------------ yardımcılar ------------------------- */
var PI2 = Math.PI * 2;

var nowMs = function () {
  if (typeof performance !== "undefined" && performance && typeof performance.now === "function") return performance.now();
  return Date.now();
};
function num(v, d) { return (typeof v === "number" && isFinite(v)) ? v : d; }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function smoothstep(p) { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); }
function rnd(a, b) { return a + Math.random() * (b - a); }
function el(id) {
  return (typeof document !== "undefined" && document && document.getElementById) ? document.getElementById(id) : null;
}
function setText(id, txt) { var e = el(id); if (e) e.textContent = txt; }
function show(id, on) { var e = el(id); if (e && e.style) e.style.display = on ? "" : "none"; }
function shuffle(a) {
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/* ------------------------------ ölçüler ----------------------------- */
var CARD_W = 0.24, CARD_H = 0.34;
var HAND_Y = 1.19, HAND_Z = 2.0;         // elimin kartları (kameranın önü)
var MID_X = 0.04, MID_Y = 1.12, MID_Z = 0.16; // ortaya atılan kartın yeri
var TABLE_TOP = 1.10;
var DECK_X = 0.52, DECK_Y = 1.115, DECK_Z = 0.30;
var PILE_X = -0.82, PILE_Z = 0.44;
var HAND_SIZE = 5;               /* dağıtılan el sayısı */

var SUIT_COLORS = [0xd05353, 0x4a86d8, 0x4fab63, 0xd6a33c];
var SEAT_NAMES = ["Sen", "Mira", "Kara", "Tilki"];



/* ------------------------------ sahne ------------------------------- */
var GL_OK = true;
var renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
} catch (eRender) {
  GL_OK = false;
  renderer = null;
}
if (!renderer) {
  /* WebGL yok: oyun mantığı çalışsın, ekranda uyarı gösterelim */
  renderer = {
    domElement: (typeof document !== "undefined" && document.createElement)
      ? document.createElement("canvas")
      : { style: {}, addEventListener: function () {} },
    setPixelRatio: function () {},
    setSize: function () {},
    render: function () {}
  };
}
renderer.setPixelRatio(Math.min(num(typeof devicePixelRatio === "number" ? devicePixelRatio : 1, 1), 2));
renderer.setSize(num(typeof innerWidth === "number" ? innerWidth : 0, 1280), num(typeof innerHeight === "number" ? innerHeight : 0, 720));
if (typeof document !== "undefined" && document && document.body && document.body.appendChild) {
  if (renderer.domElement && renderer.domElement.style) renderer.domElement.style.display = "block";
  document.body.appendChild(renderer.domElement);
}

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1119);
scene.fog = new THREE.Fog(0x0a1119, 7, 16);

var viewW = num(typeof innerWidth === "number" ? innerWidth : 0, 1280);
var viewH = num(typeof innerHeight === "number" ? innerHeight : 0, 720);
var camera = new THREE.PerspectiveCamera(50, viewH > 0 ? viewW / viewH : 1.7, 0.1, 60);
camera.position.set(0, 1.58, 3.15);
camera.lookAt(new THREE.Vector3(0, 1.05, 0.05));

/* ışıklar */
var hemi = new THREE.HemisphereLight(0xbfe0ff, 0x241a12, 0.85);
scene.add(hemi);
var key = new THREE.DirectionalLight(0xfff0d6, 0.95);
key.position.set(2.4, 4.2, 3.0);
scene.add(key);
var lamp = new THREE.PointLight(0xffd9a0, 0.55, 8, 2);
lamp.position.set(0, 2.25, 0.6);
scene.add(lamp);

/* zemin */
var floor = new THREE.Mesh(
  new THREE.CircleGeometry(7, 48),
  new THREE.MeshStandardMaterial({ color: 0x131a22, roughness: 0.95, metalness: 0.05 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

/* masa */
var tableGroup = new THREE.Group();
scene.add(tableGroup);
var felt = new THREE.Mesh(
  new THREE.CylinderGeometry(1.05, 1.05, 0.08, 56),
  new THREE.MeshStandardMaterial({ color: 0x1d5f45, roughness: 0.92, metalness: 0.03 })
);
felt.position.y = TABLE_TOP - 0.04;
tableGroup.add(felt);
var rim = new THREE.Mesh(
  new THREE.TorusGeometry(1.055, 0.028, 10, 56),
  new THREE.MeshStandardMaterial({ color: 0x8a6338, roughness: 0.5, metalness: 0.45 })
);
rim.rotation.x = Math.PI / 2;
rim.position.y = TABLE_TOP - 0.005;
tableGroup.add(rim);
var inlay = new THREE.Mesh(
  new THREE.TorusGeometry(0.42, 0.008, 6, 48),
  new THREE.MeshStandardMaterial({ color: 0xb08d4e, roughness: 0.45, metalness: 0.5 })
);
inlay.rotation.x = Math.PI / 2;
inlay.position.y = TABLE_TOP + 0.002;
tableGroup.add(inlay);
var pedestal = new THREE.Mesh(
  new THREE.CylinderGeometry(0.16, 0.24, TABLE_TOP - 0.12, 20),
  new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 0.85 })
);
pedestal.position.y = (TABLE_TOP - 0.12) * 0.5;
tableGroup.add(pedestal);


/* ------------------------------ kartlar ----------------------------- */
var cards = [];
var RANKS = 6, SUITS = 4;

function makeCardMesh(id) {
  var rank = Math.floor(id / SUITS) + 1;
  var suit = id % SUITS;
  var g = new THREE.Group();

  var body = new THREE.Mesh(
    new THREE.BoxGeometry(CARD_W, CARD_H, 0.006),
    new THREE.MeshStandardMaterial({ color: 0xf7f2e6, roughness: 0.72, metalness: 0.02 })
  );
  g.add(body);

  /* arka yüz (arka bize dönükse bu görünür) */
  var back = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD_W * 0.97, CARD_H * 0.97),
    new THREE.MeshStandardMaterial({ color: 0x1f3550, roughness: 0.6, metalness: 0.18 })
  );
  back.position.z = -0.0036;
  back.rotation.y = Math.PI;
  g.add(back);

  var colMat = new THREE.MeshStandardMaterial({ color: SUIT_COLORS[suit], roughness: 0.5, metalness: 0.12 });

  /* köşe noktaları */
  var sy, pip, col, row, i;
  for (i = 0; i < 2; i++) {
    sy = i === 0 ? 1 : -1;
    pip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.004, 12), colMat);
    pip.rotation.x = Math.PI / 2;
    pip.position.set(-CARD_W / 2 + 0.033, sy * (CARD_H / 2 - 0.042), 0.0036);
    g.add(pip);
  }

  /* sayı kadar pul */
  for (i = 0; i < rank; i++) {
    col = i % 2; row = Math.floor(i / 2);
    pip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.004, 14), colMat);
    pip.rotation.x = Math.PI / 2;
    pip.position.set(col ? 0.042 : -0.042, 0.108 - row * 0.068, 0.0036);
    g.add(pip);
  }

  /* ince renk çerçevesi */
  var fw = CARD_W - 0.022, fh = CARD_H - 0.022, th = 0.004;
  var frames = [[0, fh / 2], [0, -fh / 2], [-fw / 2, 0], [fw / 2, 0]];
  for (i = 0; i < frames.length; i++) {
    var horizontal = i < 2;
    var bar = new THREE.Mesh(
      new THREE.BoxGeometry(horizontal ? fw : th, horizontal ? th : fh, 0.003),
      colMat
    );
    bar.position.set(frames[i][0], frames[i][1], 0.0032);
    g.add(bar);
  }

  g.userData.id = id;
  return g;
}

for (var ci = 0; ci < RANKS * SUITS; ci++) {
  var cm = makeCardMesh(ci);
  cm.position.set(DECK_X, DECK_Y, DECK_Z + CARD_H / 2);
  cm.rotation.x = -Math.PI / 2;
  scene.add(cm);
  cards.push(cm);
}

/* --------------------- deste (kıvrılan üst kart) -------------------- */
var deckGroup = new THREE.Group();
scene.add(deckGroup);

var deckBackMat = new THREE.MeshStandardMaterial({ color: 0x1f3550, roughness: 0.62, metalness: 0.2 });
var deckEdgeMat = new THREE.MeshStandardMaterial({ color: 0xd9cba6, roughness: 0.7 });
for (var di = 0; di < 7; di++) {
  var slab = new THREE.Mesh(new THREE.BoxGeometry(CARD_W * 1.02, 0.008, CARD_H * 1.02), deckBackMat);
  slab.position.set(DECK_X, DECK_Y + di * 0.0086, DECK_Z + CARD_H / 2);
  deckGroup.add(slab);
}
var deckEdge = new THREE.Mesh(new THREE.BoxGeometry(CARD_W * 1.03, 0.055, 0.004), deckEdgeMat);
deckEdge.position.set(DECK_X, DECK_Y + 0.028, DECK_Z + CARD_H + 0.004);
deckGroup.add(deckEdge);

/* Kıvrılan yaprak: yerel olarak x [-0.12..0.12], z [0..0.30], y = 0 (düz).
   DK.c -> 1 olduğunda uzak kenar yukarı kıvrılır (y max = 0.055, z max = 0.30). */
var SHEET_LEN = 0.30;
var sheetGeo = new THREE.PlaneGeometry(CARD_W, SHEET_LEN, 8, 12);
sheetGeo.translate(0, SHEET_LEN / 2, 0);
sheetGeo.rotateX(Math.PI / 2);           /* (x, y, z) -> (x, -z, y): y = 0, z = 0..0.30 */
var sheetFace = new THREE.Mesh(
  sheetGeo,
  new THREE.MeshStandardMaterial({ color: 0x223a56, roughness: 0.55, metalness: 0.22, side: THREE.DoubleSide })
);
sheetFace.position.set(DECK_X, DECK_Y + 7 * 0.0086, DECK_Z);
deckGroup.add(sheetFace);

var DK = { c: 0, target: 0, p: 0, dur: 0.42, mesh: sheetFace, geo: sheetGeo, baseY: DECK_Y + 7 * 0.0086 };

function applyDeckCurl() {
  var pos = DK.geo.attributes.position;
  var arr = pos.array;
  var curl = DK.c * 0.055;
  for (var i = 0; i < arr.length; i += 3) {
    var t = clamp(arr[i + 2] / SHEET_LEN, 0, 1);
    arr[i + 1] = curl * t * t;
  }
  pos.needsUpdate = true;
  DK.geo.computeVertexNormals();
}
applyDeckCurl();

function updateDeckCurl(dt) {
  var aim = DK.target;
  if (DK.p !== aim) {
    var step = dt / DK.dur;
    if (DK.p < aim) DK.p = Math.min(aim, DK.p + step);
    else DK.p = Math.max(aim, DK.p - step);
    DK.c = smoothstep(DK.p);
    if (Math.abs(DK.c - aim) < 0.0005) { DK.p = aim; DK.c = aim; }
    DK.mesh.position.y = DK.baseY + 0.004 * DK.c;
    applyDeckCurl();
  }
}

/* --------------------------- tween yardımcısı ----------------------- */
var tw = {
  list: [],
  add: function (obj, pos, quat, dur) {
    var t = null, i;
    for (i = 0; i < this.list.length; i++) if (this.list[i].obj === obj) { t = this.list[i]; break; }
    if (!t) { t = { obj: obj, p0: new THREE.Vector3(), q0: new THREE.Quaternion(), p1: new THREE.Vector3(), q1: new THREE.Quaternion() }; this.list.push(t); }
    t.p0.copy(obj.position);
    t.q0.copy(obj.quaternion);
    t.p1.copy(pos);
    t.q1.copy(quat);
    t.time = 0;
    t.dur = dur || 0.45;
  },
  kill: function (obj) {
    for (var i = this.list.length - 1; i >= 0; i--) if (this.list[i].obj === obj) this.list.splice(i, 1);
  },
  clear: function () { this.list.length = 0; },
  update: function (dt) {
    for (var i = this.list.length - 1; i >= 0; i--) {
      var t = this.list[i];
      t.time += dt;
      var k = t.time / t.dur;
      if (k > 1) k = 1;
      var e = 1 - Math.pow(1 - k, 3);
      t.obj.position.lerpVectors(t.p0, t.p1, e);
      t.obj.quaternion.copy(t.q0).slerp(t.q1, e);
      if (k >= 1) {
        t.obj.position.copy(t.p1);
        t.obj.quaternion.copy(t.q1);
        this.list.splice(i, 1);


      }
    }
  }
};

/* ====================================================================
   KARAKTER: kurbağa büyücü
   - bağdaş kurmuş bacaklar (gövdenin altında çapraz, hiç oynamaz)
   - gövde havada asılı; süzülme animasyonu dışarıda (updateAvatars)
   ==================================================================== */
function addMesh(parent, geo, mat, x, y, z) {
  var m = new THREE.Mesh(geo, mat);
  m.position.set(x || 0, y || 0, z || 0);
  parent.add(m);
  return m;
}

function makeFrogWizard(accent) {
  var g = new THREE.Group();

  var skin = new THREE.MeshStandardMaterial({ color: 0x3fa87e, roughness: 0.72, metalness: 0.03, flatShading: true });
  var skinDark = new THREE.MeshStandardMaterial({ color: 0x2c7f5c, roughness: 0.8, flatShading: true });
  var bellyMat = new THREE.MeshStandardMaterial({ color: 0xa8dcc0, roughness: 0.7, flatShading: true });
  var leather = new THREE.MeshStandardMaterial({ color: 0x6b4632, roughness: 0.86, flatShading: true });
  var leatherDark = new THREE.MeshStandardMaterial({ color: 0x4a2f22, roughness: 0.9, flatShading: true });
  var hatMat = new THREE.MeshStandardMaterial({ color: 0x6d5842, roughness: 0.9, flatShading: true });
  var goldMat = new THREE.MeshStandardMaterial({ color: accent || 0xf0c04a, roughness: 0.42, metalness: 0.4 });
  var boneMat = new THREE.MeshStandardMaterial({ color: 0xe9e2d2, roughness: 0.55 });
  var amberMat = new THREE.MeshStandardMaterial({ color: 0xf0a72c, roughness: 0.35, metalness: 0.1, emissive: 0x2a1600 });
  var inkMat = new THREE.MeshStandardMaterial({ color: 0x14180f, roughness: 0.5 });
  var woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2a1c, roughness: 0.9 });

  /* --- bağdaş kurmuş bacaklar --- */
  var legGeo = new THREE.SphereGeometry(0.088, 16, 12);
  var legL = addMesh(g, legGeo, skin, -0.025, 0.048, 0.052);
  legL.scale.set(1.62, 0.52, 1.05);
  legL.rotation.set(0.05, 0.62, 0.06);

  var legR = addMesh(g, legGeo, skin, 0.025, 0.044, 0.052);
  legR.scale.set(1.62, 0.52, 1.05);
  legR.rotation.set(0.05, -0.62, -0.06);

  var footGeo = new THREE.SphereGeometry(0.046, 14, 10);
  var footL = addMesh(g, footGeo, skinDark, -0.072, 0.034, 0.132);
  footL.scale.set(1.15, 0.7, 1.5);
  footL.rotation.y = 0.4;
  var footR = addMesh(g, footGeo, skinDark, 0.072, 0.034, 0.132);
  footR.scale.set(1.15, 0.7, 1.5);
  footR.rotation.y = -0.4;

  /* --- gövde --- */
  var body = addMesh(g, new THREE.SphereGeometry(0.175, 24, 18), skin, 0, 0.26, 0);
  body.scale.set(1.03, 0.95, 0.93);

  var belly = addMesh(g, new THREE.SphereGeometry(0.125, 18, 14), bellyMat, 0, 0.225, 0.072);
  belly.scale.set(1.0, 0.82, 0.5);

  /* --- gözler (amber iris) --- */
  var eyeGeo = new THREE.SphereGeometry(0.072, 18, 14);
  var irisGeo = new THREE.SphereGeometry(0.038, 14, 12);
  var pupilGeo = new THREE.SphereGeometry(0.017, 10, 8);
  var eyes = [];
  for (var e = 0; e < 2; e++) {
    var sx = e === 0 ? 1 : -1;
    var eye = addMesh(g, eyeGeo, skin, sx * 0.112, 0.435, 0.052);
    eye.scale.set(0.95, 0.98, 0.9);
    eyes.push(eye);
    var iris = addMesh(g, irisGeo, amberMat, sx * 0.118, 0.437, 0.108);
    iris.scale.set(1, 1.15, 0.55);
    addMesh(g, pupilGeo, inkMat, sx * 0.12, 0.437, 0.128);
    var brow = addMesh(g, new THREE.BoxGeometry(0.075, 0.012, 0.014), inkMat, sx * 0.115, 0.505, 0.075);
    brow.rotation.z = sx * 0.22;
    brow.rotation.x = -0.35;
  }

  /* --- ağız: gövde yüzeyine oturan, gülümseyen nokta dizisi --- */
  var mouthR = 0.163;
  var mouthGeo = new THREE.SphereGeometry(0.0105, 8, 6);
  for (var mt = -3; mt <= 3; mt++) {
    var tt = mt / 3;
    var mx = tt * 0.082;
    var myOff = 0.042 + 0.021 * tt * tt;      /* uçlar yukarı: gülümseme */
    var mz = Math.sqrt(Math.max(0.004, mouthR * mouthR - (mx / 1.03) * (mx / 1.03) - (myOff / 0.95) * (myOff / 0.95))) * 0.93 + 0.004;
    var mp = addMesh(g, mouthGeo, inkMat, mx, 0.26 + myOff, mz);
    mp.scale.set(1.05, 0.72, 0.7);
  }
  /* küçük dişler */
  var toothGeo = new THREE.ConeGeometry(0.009, 0.022, 6);
  addMesh(g, toothGeo, boneMat, -0.032, 0.291, 0.152).rotation.x = Math.PI;
  addMesh(g, toothGeo, boneMat, 0.032, 0.291, 0.152).rotation.x = Math.PI;

  /* --- deri lekeler --- */
  var spotGeo = new THREE.SphereGeometry(0.026, 10, 8);
  var spots = [[0.10, 0.33, 0.11], [-0.12, 0.35, 0.10], [0.15, 0.24, 0.06], [-0.06, 0.42, 0.09], [0.02, 0.20, -0.14]];
  for (var s = 0; s < spots.length; s++) {
    var sp = addMesh(g, spotGeo, skinDark, spots[s][0], spots[s][1], spots[s][2]);
    sp.scale.set(1.0, 0.55, 0.55);
  }

  /* --- kuşak + çapraz kayış --- */
  var belt = addMesh(g, new THREE.TorusGeometry(0.168, 0.019, 8, 24), leather, 0, 0.152, 0);
  belt.rotation.x = Math.PI / 2;

  var strap = addMesh(g, new THREE.TorusGeometry(0.162, 0.013, 8, 22, Math.PI * 0.55), leather, 0, 0.235, -0.02);
  strap.rotation.set(1.25, 0.0, -1.15);

  /* --- yan çanta --- */
  var bag = new THREE.Group();
  bag.position.set(-0.155, 0.115, 0.075);
  bag.rotation.y = 0.55;
  bag.rotation.z = 0.12;
  g.add(bag);
  addMesh(bag, new THREE.BoxGeometry(0.105, 0.095, 0.055), leather, 0, 0, 0);
  var flap = addMesh(bag, new THREE.BoxGeometry(0.11, 0.042, 0.06), leatherDark, 0, 0.032, 0.002);
  flap.rotation.x = -0.12;

  /* --- ön tılsım / sarı püskül --- */
  var amulet = new THREE.Group();
  amulet.position.set(0.015, 0.115, 0.158);
  g.add(amulet);
  addMesh(amulet, new THREE.SphereGeometry(0.026, 12, 10), goldMat, 0, 0, 0);
  var tassel = addMesh(amulet, new THREE.ConeGeometry(0.018, 0.048, 10), goldMat, 0, -0.04, 0);
  tassel.rotation.x = Math.PI;

  /* --- kollar --- */
  var armGeo = new THREE.SphereGeometry(0.056, 14, 12);
  var armL = addMesh(g, armGeo, skin, -0.168, 0.245, 0.055);
  armL.scale.set(0.85, 1.35, 0.85);
  armL.rotation.z = 0.38;
  addMesh(g, new THREE.SphereGeometry(0.048, 12, 10), skin, -0.205, 0.172, 0.085);

  var armR = addMesh(g, armGeo, skin, 0.168, 0.245, 0.055);
  armR.scale.set(0.85, 1.35, 0.85);
  armR.rotation.z = -0.38;
  addMesh(g, new THREE.SphereGeometry(0.05, 12, 10), skin, 0.208, 0.175, 0.092);

  /* --- kurukafa asa --- */
  var staff = new THREE.Group();
  staff.position.set(0.215, 0.175, 0.10);
  staff.rotation.z = -0.16;
  staff.rotation.x = -0.08;
  g.add(staff);
  addMesh(staff, new THREE.CylinderGeometry(0.011, 0.013, 0.27, 8), woodMat, 0, 0.0, 0);
  addMesh(staff, new THREE.CylinderGeometry(0.017, 0.017, 0.016, 8), leatherDark, 0, 0.10, 0);
  var skull = addMesh(staff, new THREE.SphereGeometry(0.053, 14, 12), boneMat, 0, 0.168, 0);
  skull.scale.set(1.0, 0.92, 1.08);
  addMesh(staff, new THREE.BoxGeometry(0.054, 0.03, 0.05), boneMat, 0, 0.128, 0.012);
  var socketGeo = new THREE.SphereGeometry(0.014, 8, 8);
  addMesh(staff, socketGeo, inkMat, -0.02, 0.178, 0.042);
  addMesh(staff, socketGeo, inkMat, 0.02, 0.178, 0.042);
  addMesh(staff, new THREE.SphereGeometry(0.009, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xc0392b, metalness: 0.5, roughness: 0.3 }), 0, 0.13, 0.045);

  /* --- büyücü şapkası --- */
  var hat = new THREE.Group();
  hat.position.set(0, 0.47, 0);
  hat.rotation.z = 0.05;
  hat.rotation.y = 0.15;
  g.add(hat);
  var brim = addMesh(hat, new THREE.CylinderGeometry(0.238, 0.258, 0.02, 28), hatMat, 0, 0, 0);
  brim.rotation.z = 0.03;
  addMesh(hat, new THREE.CylinderGeometry(0.16, 0.172, 0.038, 24), leatherDark, 0, 0.028, 0);
  var crown = addMesh(hat, new THREE.ConeGeometry(0.158, 0.26, 24), hatMat, 0.005, 0.17, 0);
  crown.rotation.z = 0.02;
  var tip = addMesh(hat, new THREE.ConeGeometry(0.062, 0.14, 16), hatMat, 0.048, 0.32, 0);
  tip.rotation.z = -0.62;
  addMesh(hat, new THREE.SphereGeometry(0.026, 10, 8), hatMat, 0.10, 0.36, 0);
  var patch = addMesh(hat, new THREE.BoxGeometry(0.05, 0.036, 0.01), leather, -0.055, 0.115, 0.098);
  patch.rotation.set(-0.35, -0.5, 0.15);

  g.userData.eyes = eyes;
  return g;
}


/* ====================================================================
   KOLTUKLAR / SÜZÜLEN KARAKTERLER
   ==================================================================== */
var AVATAR_LAYOUT = {
  2: [[0.0, -1.30]],
  3: [[-1.02, -1.02], [1.02, -1.02]],
  4: [[-1.26, -0.72], [0.0, -1.45], [1.26, -0.72]]
};
var AVATAR_BASE_Y = 1.48;      /* havada asılı yükseklik */
var BOB_AMP = 0.032;           /* +-3.2 cm, çok çok yavaş */
var BOB_PERIOD = 12.0;         /* 12 saniyede bir yukarı-aşağı */

var avatars = [null];
for (var av = 1; av < 4; av++) {
  var buddy = makeFrogWizard(0xf0c04a);
  buddy.visible = false;
  scene.add(buddy);
  buddy.userData.float = {
    base: AVATAR_BASE_Y,
    amp: BOB_AMP,
    period: BOB_PERIOD + (av - 1) * 0.9,
    phase: av * 1.7,
    rot: 0
  };
  avatars.push(buddy);
}

var SEAT_ANCHOR = [
  new THREE.Vector3(0, HAND_Y, HAND_Z),
  new THREE.Vector3(0, 1.44, -0.81),
  new THREE.Vector3(0, 1.44, -0.81),
  new THREE.Vector3(0, 1.44, -0.81)
];

function layoutSeats(n) {
  var spots = AVATAR_LAYOUT[n] || AVATAR_LAYOUT[4];
  var i;
  for (i = 1; i < 4; i++) avatars[i].visible = false;
  for (i = 0; i < spots.length; i++) {
    var a = avatars[i + 1];
    var x = spots[i][0], z = spots[i][1];
    a.visible = true;
    a.position.set(x, AVATAR_BASE_Y, z);
    a.rotation.set(0, Math.atan2(x, z + 6) * 0.6, 0);
    a.userData.float.base = AVATAR_BASE_Y;
    a.userData.float.rot = a.rotation.y;
    SEAT_ANCHOR[i + 1].set(x * 0.62, 1.44, z * 0.62);
  }
}

function updateAvatars(t) {
  for (var i = 1; i < 4; i++) {
    var a = avatars[i];
    if (!a || !a.visible) continue;
    var f = a.userData.float;
    /* yukarı-aşağı: 12 sn'de bir tur, +-3.2 cm -> mide bulantısı yok */
    a.position.y = f.base + Math.sin(t * PI2 / f.period + f.phase) * f.amp;
    /* çok hafif yön salınımı */
    a.rotation.y = f.rot + Math.sin(t * PI2 / (f.period * 2.5) + f.phase) * 0.025;
  }
}

/* ====================================================================
   OYUN DURUMU
   ==================================================================== */
var G = {
  n: 2, over: true, winner: null,
  cur: 0, my: false, drew: false, card: null,
  deck: [], hands: [[], [], [], []],
  mid: null, turnCount: 0, passes: 0,
  dkt: sheetFace
};
sheetFace.userData.geo = sheetGeo;

var pile = [];
var midC = null;
var HAND_DUR = 0.45;

function slotFor(seat, idx, count) {
  var off = idx - (count - 1) / 2;
  if (seat === 0) {
    var step = count > 4 ? 0.135 : 0.158;
    return {
      p: new THREE.Vector3(off * step, HAND_Y, HAND_Z),
      q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -off * 0.14, off * 0.02))
    };
  }
  var an = SEAT_ANCHOR[seat];
  var step2 = count > 4 ? 0.082 : 0.115;
  return {
    p: new THREE.Vector3(an.x + off * step2, an.y, an.z),
    q: new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.8, Math.PI, off * 0.12))
  };
}

function placeCard(id, p, q, scale, visible, instant) {
  var m = cards[id];
  if (!m) return;
  m.visible = visible !== false;
  m.scale.setScalar(scale || 1);
  if (instant) {
    tw.kill(m);
    m.position.copy(p);
    m.quaternion.copy(q);
  } else {
    tw.add(m, p, q, HAND_DUR);
  }
}

var MID_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0.10));
var PEEK_P = new THREE.Vector3(0.46, 1.32, 0.85);
var PEEK_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.10, 0.22, 0));

function refresh(instant) {
  var zone = {}, seat, i, id, h, s;

  for (seat = 0; seat < 4; seat++) {
    h = G.hands[seat] || [];
    for (i = 0; i < h.length; i++) {
      id = h[i];
      s = slotFor(seat, i, h.length);
      placeCard(id, s.p, s.q, seat === 0 ? 0.86 : 0.62, true, instant);
      zone[id] = 1;
    }
  }

  if (G.card != null && !zone[G.card]) {
    if (G.cur === 0) {
      placeCard(G.card, PEEK_P, PEEK_Q, 1.05, true, instant);
    } else {
      var an2 = SEAT_ANCHOR[G.cur] || SEAT_ANCHOR[1];
      var bp = new THREE.Vector3(an2.x, an2.y + 0.14, an2.z);
      var bq = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.75, Math.PI, 0));
      placeCard(G.card, bp, bq, 0.7, true, instant);
    }
    zone[G.card] = 1;
  }

  if (G.mid) {
    placeCard(G.mid.id, new THREE.Vector3(MID_X, MID_Y, MID_Z), MID_Q, 1, true, instant);
    zone[G.mid.id] = 1;
  }

  for (i = 0; i < G.deck.length; i++) {
    id = G.deck[i];
    if (zone[id]) continue;
    zone[id] = 1;
    var m = cards[id];
    m.visible = false;
    tw.kill(m);
    m.position.set(DECK_X, DECK_Y, DECK_Z + CARD_H / 2);
    m.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  }

  for (i = 0; i < cards.length; i++) {
    if (zone[i]) continue;
    var pi = pile.indexOf(i);
    if (pi < 0) continue;
    var pp = new THREE.Vector3(PILE_X + (pi % 3) * 0.006, TABLE_TOP + 0.012 + Math.min(pi, 12) * 0.0026, PILE_Z + Math.floor(pi / 3) * 0.006);
    var pq = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -0.12 + (pi % 5) * 0.05));
    placeCard(i, pp, pq, 0.96, true, instant);
  }
}

/* ====================================================================
   OYUN KURALLARI / AKIŞ
   ==================================================================== */
function seatName(i) { return SEAT_NAMES[i] || ("Oyuncu " + (i + 1)); }

function start(n) {
  n = clamp(Math.round(num(n, 2)), 2, 4);
  G.n = n; G.over = false; G.winner = null;
  G.cur = 0; G.my = false; G.drew = false; G.card = null;
  G.hands = [[], [], [], []];
  G.mid = null; G.turnCount = 0; G.passes = 0;
  pile.length = 0; midC = null;
  tw.clear();
  DK.p = 0; DK.c = 0; DK.target = 0;
  DK.mesh.position.y = DK.baseY;
  applyDeckCurl();
  layoutSeats(n);

  var ids = [], i;
  for (i = 0; i < cards.length; i++) ids.push(i);
  shuffle(ids);
  G.deck = [];
  for (i = n * HAND_SIZE; i < ids.length; i++) G.deck.push(ids[i]);
  for (var k = 0; k < HAND_SIZE; k++) {
    for (var s = 0; s < n; s++) G.hands[s].push(ids[k * n + s]);
  }

  refresh(true);
  flash("Yeni el dağıtıldı. Desteden kart çek ya da elinden bir kart at.");
  beginTurn(0);
}

function beginTurn(seat) {
  if (G.over) return;
  G.turnCount++;
  if (G.turnCount > 140) { endGame("tur sınırı", fewest()); return; }
  if (G.passes >= G.n * 3) { endGame("herkes pas geçti", fewest()); return; }
  G.cur = seat; G.my = (seat === 0); G.drew = false; G.card = null;
  updateHUD();
  if (seat !== 0) {
    setTimeout(function () { botAct(seat); }, 900 + Math.random() * 400);
  }
}

function endTurn() {
  if (G.over) return;
  var next = (G.cur + 1) % G.n;
  G.my = false; G.card = null; G.drew = false;
  beginTurn(next);
}

function fewest() {
  var best = 0, bestLen = 999, i, l;
  for (i = 0; i < G.n; i++) {
    l = (G.hands[i] || []).length;
    if (l < bestLen) { bestLen = l; best = i; }
  }
  return best;
}

function endGame(reason, winner) {
  if (G.over) return;
  G.over = true; G.my = false; G.winner = winner;
  if (G.card != null) { G.deck.push(G.card); G.card = null; }
  DK.target = 0;
  refresh();
  flash(seatName(winner) + " kazandı! (" + reason + ")");
  updateHUD();
}

function setMid(id, from) {
  if (G.mid && G.mid.id !== id) pile.push(G.mid.id);
  G.mid = { id: id, from: from, c: id };
  midC = cards[id];
}

function afterAction(seat) {
  if (G.over) return;
  if ((G.hands[seat] || []).length === 0) { endGame("eli bitti", seat); return; }
  endTurn();
}

/* --- oyuncu aksiyonları (test + arayüz aynı fonksiyonları kullanır) --- */
function drawBtn() {
  if (G.over || G.cur !== 0 || !G.my || G.drew || G.card != null) return;
  if (!G.deck.length) { flash("Deste bitti: elinden kart at ya da pas geç."); return; }
  var id = G.deck.pop();
  G.card = id;
  G.drew = true;
  G.passes = 0;
  DK.target = 1;
  flash("Kart çektin: al, at ya da geri koy.");
  refresh();
  updateHUD();
}

function take(choice) {
  if (G.over || G.cur !== 0 || G.card == null) return;
  var id = G.card;
  G.card = null;
  G.drew = false;
  G.passes = 0;
  DK.target = 0;
  if (choice === "al") {
    G.hands[0].push(id);
    flash("Kartı eline aldın.");
  } else if (choice === "at") {
    setMid(id, 0);
    flash("Kartı ortaya attın.");
  } else {
    G.deck.push(id);
    flash("Kartı desteye geri koydun.");
  }
  refresh();
  endTurn();
}

function doAct(id) {
  if (G.over || G.cur !== 0 || !G.my) return;
  if (G.card != null) return;
  if (id == null) { G.passes++; flash("Pas geçtin."); endTurn(); return; }
  var hand = G.hands[0];
  var at = hand.indexOf(id);
  if (at < 0) { flash("Bu kart elinde yok."); endTurn(); return; }
  hand.splice(at, 1);
  setMid(id, 0);
  G.passes = 0;
  flash("Kartı ortaya attın.");
  refresh();
  afterAction(0);
}

function grab(seat) {
  if (G.over || !G.mid) return;
  if (G.cur !== seat || !G.my) return;
  if (G.mid.from === seat) return;
  var id = G.mid.id;
  G.mid = null;
  G.hands[seat].push(id);
  G.passes = 0;
  flash("Ortadaki kartı kaptın!");
  refresh();
  endTurn();
}


/* --- bilgisayar oyuncular --- */
function botAct(seat) {
  if (G.over || G.cur !== seat) return;
  var hand = G.hands[seat] || [];
  if (G.deck.length > 0 && hand.length <= 5 && Math.random() < 0.45) {
    var id = G.deck.pop();
    G.card = id;
    DK.target = 1;
    refresh();
    setTimeout(function () {
      if (G.over || G.cur !== seat || G.card !== id) return;
      var r = Math.random();
      if (r < 0.62) botKeep(seat, id);
      else if (r < 0.86) botThrow(seat, id);
      else botBack(seat, id);
    }, 620);
    return;
  }
  if (hand.length) {
    setTimeout(function () {
      if (G.over || G.cur !== seat) return;
      var h = G.hands[seat] || [];
      if (!h.length) { G.passes++; endTurn(); return; }
      var k = Math.floor(Math.random() * h.length);
      var card = h.splice(k, 1)[0];
      setMid(card, seat);
      DK.target = 0;
      G.card = null;
      refresh();
      flash(seatName(seat) + " ortaya bir kart attı.");
      setTimeout(function () {
        if (G.over) return;
        if ((G.hands[seat] || []).length === 0) { endGame("eli bitti", seat); return; }
        endTurn();
      }, 470);
    }, 260);
    return;
  }
  setTimeout(function () {
    if (G.over || G.cur !== seat) return;
    G.passes++;
    endTurn();
  }, 320);
}

function botKeep(seat, id) {
  if (G.over || G.cur !== seat || G.card !== id) return;
  G.card = null;
  DK.target = 0;
  G.hands[seat].push(id);
  flash(seatName(seat) + " kartı eline aldı.");
  refresh();
  endTurn();
}

function botThrow(seat, id) {
  if (G.over || G.cur !== seat || G.card !== id) return;
  G.card = null;
  DK.target = 0;
  setMid(id, seat);
  flash(seatName(seat) + " " + "kartı ortaya attı.");
  refresh();
  endTurn();
}

function botBack(seat, id) {
  if (G.over || G.cur !== seat || G.card !== id) return;
  G.card = null;
  DK.target = 0;
  G.deck.push(id);
  flash(seatName(seat) + " kartı desteye geri koydu.");
  refresh();
  endTurn();
}

/* ====================================================================
   ARAYÜZ
   ==================================================================== */
function flash(msg) { setText("msg", msg); }

function btnState(id, on) {
  var b = el(id);
  if (!b) return;
  b.disabled = !on;
  if (b.style) b.style.opacity = on ? "1" : "0.4";
}

function updateHUD() {
  var seatsEl = el("seats");
  if (seatsEl && seatsEl.innerHTML !== undefined) {
    var out = "", i;
    for (i = 0; i < G.n; i++) {
      out += '<div class="seat' + (i === G.cur && !G.over ? " on" : "") + '">' +
        '<span>' + seatName(i) + '</span><b>' + ((G.hands[i] || []).length) + '</b></div>';
    }
    seatsEl.innerHTML = out;
  }
  var myTurn = !G.over && G.my && G.cur === 0;
  var canDraw = myTurn && !G.drew && G.card == null && G.deck.length > 0;
  var haveCard = myTurn && G.card != null;
  var idle = myTurn && G.card == null;
  btnState("btnDraw", canDraw);
  btnState("btnKeep", haveCard);
  btnState("btnThrow", haveCard);
  btnState("btnBack", haveCard);
  btnState("btnPass", idle);
  setText("deckCount", G.deck.length + " kart");
  if (G.over) setText("turn", "Oyun bitti");
  else setText("turn", G.cur === 0 ? "Sıra sende" : "Sıra: " + seatName(G.cur));
}

function closeHow() { show("how", false); }

function bindBtn(id, fn) {
  var e = el(id);
  if (e && e.addEventListener) e.addEventListener("click", fn);
}

function bindUI() {
  bindBtn("btnDraw", function () { drawBtn(); });
  bindBtn("btnKeep", function () { take("al"); });
  bindBtn("btnThrow", function () { take("at"); });
  bindBtn("btnBack", function () { take("geri"); });
  bindBtn("btnPass", function () { doAct(null); });
  bindBtn("btnHow", function () { show("how", true); });
  bindBtn("btnCloseHow", closeHow);
  bindBtn("btnNew", function () { start(G.n); });
}


/* ====================================================================
   KAMERA: ÇOK YAVAŞ salınım (mide bulantısı yapmasın)
   - fare paralaksı YOK, ani hareket YOK
   - 17 sn / 28 sn periyotlu, 1.6 cm'lik milimetrik kayma
   ==================================================================== */
var CAM_BASE = new THREE.Vector3(0, 1.58, 3.15);
var CAM_LOOK = new THREE.Vector3(0, 1.05, 0.05);
var CAM_AMP_X = 0.016, CAM_PERIOD_X = 17.0;
var CAM_AMP_Y = 0.011, CAM_PERIOD_Y = 28.0;
var CAM_LOOK_PERIOD = 23.0;

function updateCamera(t) {
  var ox = Math.sin(t * PI2 / CAM_PERIOD_X) * CAM_AMP_X;
  var oy = Math.sin(t * PI2 / CAM_PERIOD_Y + 1.1) * CAM_AMP_Y;
  var oz = Math.sin(t * PI2 / (CAM_PERIOD_X * 1.6) + 0.4) * 0.008;
  camera.position.set(CAM_BASE.x + ox, CAM_BASE.y + oy, CAM_BASE.z + oz);
  camera.lookAt(
    CAM_LOOK.x + Math.sin(t * PI2 / CAM_LOOK_PERIOD) * 0.006,
    CAM_LOOK.y + Math.sin(t * PI2 / (CAM_LOOK_PERIOD * 1.4) + 0.8) * 0.005,
    CAM_LOOK.z
  );
}

/* ====================================================================
   ANA DÖNGÜ
   ==================================================================== */
var lastT = nowMs();
var elapsed = 0;

function frame() {
  var n = nowMs();
  var dt = (n - lastT) / 1000;
  if (!(dt >= 0)) dt = 0.016;
  if (dt > 0.12) dt = 0.12;
  lastT = n;
  elapsed += dt;

  updateDeckCurl(dt);
  updateCamera(elapsed);
  updateAvatars(elapsed);
  tw.update(dt);

  renderer.render(scene, camera);
}

function loop() {
  requestAnimationFrame(loop);
  frame();
}

/* ====================================================================
   GİRDİ / KURULUM
   ==================================================================== */
var REAL_CANVAS = !!(renderer && renderer.domElement && typeof renderer.domElement.getContext === "function");
var _ray = new THREE.Raycaster();
var _ndc = new THREE.Vector2();

function onResize() {
  var w = num(typeof innerWidth === "number" ? innerWidth : 0, 1280);
  var h = num(typeof innerHeight === "number" ? innerHeight : 0, 720);
  camera.aspect = h > 0 ? w / h : 1.7;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function onPointerDown(ev) {
  if (!REAL_CANVAS || !ev) return;
  var rect = renderer.domElement.getBoundingClientRect ? renderer.domElement.getBoundingClientRect() : { left: 0, top: 0, width: 1, height: 1 };
  _ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  _ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  _ray.setFromCamera(_ndc, camera);
  var hits = _ray.intersectObjects(cards.concat([sheetFace]), true);
  if (!hits.length) return;
  var obj = hits[0].object;
  var id = null, isDeck = false;
  while (obj) {
    if (obj === sheetFace) { isDeck = true; break; }
    if (obj.userData && obj.userData.id !== undefined) { id = obj.userData.id; break; }
    obj = obj.parent;
  }
  if (isDeck) {
    if (!G.over && G.my && G.cur === 0 && G.card == null) drawBtn();
    return;
  }
  if (id == null) return;
  if (G.mid && G.mid.id === id) { grab(0); return; }
  if ((G.hands[0] || []).indexOf(id) >= 0) doAct(id);
}

function onKeyDown(ev) {
  if (!ev || G.over) return;
  var k = ev.key;
  if (k === " " || k === "d" || k === "D") { drawBtn(); ev.preventDefault && ev.preventDefault(); }
  else if (k === "1") take("al");
  else if (k === "2") take("at");
  else if (k === "3") take("geri");
  else if (k === "p" || k === "P") doAct(null);
  else if (k === "?" || k === "h") show("how", true);
  else if (k === "Escape") closeHow();
}

function boot() {
  bindUI();
  if (typeof addEventListener === "function") addEventListener("resize", onResize);
  if (REAL_CANVAS && renderer.domElement.addEventListener) {
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    addEventListener("keydown", onKeyDown);
  }
  if (!GL_OK) {
    var uy = el("webgl-uyari");
    if (uy) { uy.style.display = "block"; }
    var m = el("msg");
    if (m) m.textContent = "Tarayıcın WebGL açamadı — donanım hızlandırmayı açıp yenile.";
  }
  var yuk = el("yukleniyor");
  if (yuk && yuk.style) yuk.style.display = "none";
  if (REAL_CANVAS) {
    start(2);
    show("how", true);
  }
}

boot();
requestAnimationFrame(loop);

function held(seat) { return (G.hands[seat] || []).slice(); }
