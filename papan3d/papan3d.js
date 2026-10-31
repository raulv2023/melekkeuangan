// =============================================================
//  PAPAN 3D — Melek Keuangan
//  Lapisan TAMPILAN saja. Berkas ini hanya MEMBACA keadaan permainan
//  dari kode utama (P, cur, DK, TILE, ASET, GRAD, NAMAPENDEK, tilePos)
//  lalu menggambarnya dalam 3D. Aturan main tidak disentuh sama sekali.
//
//  Kait di index.html (cari "[3D]"):
//    initGame  → PAPAN3D.mulai()
//    rollDice  → PAPAN3D.lemparDadu(r)
//    floatTxt  → PAPAN3D.teks(i, txt, col)
//    cycleView → PAPAN3D.gantiSudut()
// =============================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { bangunLatar } from './latar.js';

const G = window;
const $ = (s) => document.querySelector(s);
const INK = '#1B1030';
const FONT_D = '"Luckiest Guy", "Arial Black", Impact, sans-serif';
const FONT_B = '"Fredoka", "Nunito", "Segoe UI", Arial, sans-serif';
const FONT_E = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const TILE_H = 0.24, PETAK = 0.92;

// warna petak = warna di CSS versi 2D (.tile.gaji, .tile.mus, ...)
const WARNA_PETAK = { gaji: '#FFC93C', mus: '#FF6B7D', tag: '#FF9BA3', anu: '#5FDC94', inv: '#43D2C4', kar: '#A8E86A',
  god: '#B49BFF', don: '#D3C3FF', bank: '#7FBCFF', roda: '#DED6E8', kel: '#F6E3B4', tanya: '#8E8CFF' };
const ASET_PETAK = { gaji: 'gajian', inv: 'investasi', mus: 'musibah', god: 'godaan', tanya: 'pertanyaan', anu: 'anugerah',
  tag: 'tagihan', kar: 'karier', roda: 'roda', bank: 'bank', don: 'donasi', kel: 'keluarga' };
const TUMPUKAN = [
  { k: 'mus', g: 'mus', ic: '⚡', aset: 'petak-musibah' },
  { k: 'anu', g: 'anu', ic: '🎁', aset: 'petak-anugerah' },
  { k: 'god', g: 'god', ic: '🛍', aset: 'petak-godaan' },
  { k: 'q', g: 'tanya', ic: '❓', aset: 'petak-pertanyaan' },
];
// tombol "sudut pandang" berputar di antara pilihan ini
const SUDUT = [
  { nama: '\u{1F3A5} Miring', az: 0, el: 50 },
  { nama: '\u{1F5FA} Isometrik', az: 45, el: 36 },
  { nama: '\u{1F4D0} Atas', az: 0, el: 76 },
];

const EASE = {
  lin: t => t,
  out: t => 1 - Math.pow(1 - t, 3),
  io: t => -(Math.cos(Math.PI * t) - 1) / 2,
  bounce: t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; },
  elastic: t => (t === 0 || t === 1) ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
};
const rad = THREE.MathUtils.degToRad;

// ---------- bantuan kanvas ----------
export function kanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (f >= 1) { r += (255 - r) * (f - 1); g += (255 - g) * (f - 1); b += (255 - b) * (f - 1); } else { r *= f; g *= f; b *= f; }
  const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
function pasFont(x, teks, maks, ukuran, keluarga, berat = '') {
  let s = ukuran;
  for (; s > 10; s -= 2) { x.font = `${berat} ${s}px ${keluarga}`; if (x.measureText(teks).width <= maks) break; }
  return s;
}
function garisTeks(x, t, a, b, isi, garis, tebal) {
  x.lineJoin = 'round'; x.miterLimit = 2;
  if (tebal) { x.lineWidth = tebal; x.strokeStyle = garis; x.strokeText(t, a, b); }
  x.fillStyle = isi; x.fillText(t, a, b);
}
export function tekstur(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

const cacheGambar = new Map();
function muatGambar(src) {
  if (!src) return Promise.resolve(null);
  if (!cacheGambar.has(src)) cacheGambar.set(src, new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }));
  return cacheGambar.get(src);
}
const aset = (k) => (G.ASET && G.ASET[k]) || null;

// ---------- material ----------
const MAT = new Map();
export function lam(color, o = {}) {
  const k = color + JSON.stringify(o);
  if (!MAT.has(k)) MAT.set(k, new THREE.MeshLambertMaterial({ color, ...o }));
  return MAT.get(k);
}
export function mesh(geo, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; }

// Gabungkan semua mesh statis per material: ratusan objek jadi belasan draw call.
export function gabung(grup) {
  grup.updateMatrixWorld(true);
  const per = new Map();
  grup.traverse(o => {
    if (!o.isMesh) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.clearGroups();
    if (!per.has(o.material)) per.set(o.material, []);
    per.get(o.material).push(g);
  });
  const hasil = new THREE.Group();
  for (const [m, list] of per) {
    const g = mergeGeometries(list, false);
    if (!g) continue;
    const ms = new THREE.Mesh(g, m); ms.castShadow = true; ms.receiveShadow = true; hasil.add(ms);
  }
  return hasil;
}

// ---------- gambar petak, dadu, kartu, logo ----------
function teksturPetak(t, aniso) {
  const c = kanvas(256, 256), x = c.getContext('2d');
  const tx = tekstur(c); tx.anisotropy = aniso;
  const warna = WARNA_PETAK[t[0]] || '#ffffff';
  const nama = (G.NAMAPENDEK && G.NAMAPENDEK[t[0]]) || String(t[1]).toUpperCase();
  const gambar = (img) => {
    x.clearRect(0, 0, 256, 256);
    x.fillStyle = warna; x.fillRect(0, 0, 256, 256);
    const gr = x.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(0.55, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    x.lineWidth = 12; x.strokeStyle = INK; rr(x, 8, 8, 240, 240, 30); x.stroke();
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (img) x.drawImage(img, 128 - 76, 18, 152, 152);
    else { x.font = `104px ${FONT_E}`; x.fillText(t[2] || '?', 128, 98); }
    pasFont(x, nama, 214, 44, FONT_B, '700');
    garisTeks(x, nama, 128, 210, t[0] === 'tanya' ? '#ffffff' : INK, t[0] === 'tanya' ? INK : 'rgba(255,255,255,.7)', t[0] === 'tanya' ? 6 : 4);
    tx.needsUpdate = true;
  };
  gambar(null);
  muatGambar(aset('petak-' + ASET_PETAK[t[0]])).then(img => img && gambar(img));
  return tx;
}
function teksturDadu(v) {
  const c = kanvas(128, 128), x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128);
  const gr = x.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(27,16,48,.12)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  x.lineWidth = 7; x.strokeStyle = INK; rr(x, 6, 6, 116, 116, 22); x.stroke();
  const D = { 1: [[64, 64]], 2: [[38, 38], [90, 90]], 3: [[36, 36], [64, 64], [92, 92]], 4: [[38, 38], [90, 38], [38, 90], [90, 90]],
    5: [[36, 36], [92, 36], [64, 64], [36, 92], [92, 92]], 6: [[40, 32], [88, 32], [40, 64], [88, 64], [40, 96], [88, 96]] };
  x.fillStyle = INK;
  for (const [a, b] of D[v]) { x.beginPath(); x.arc(a, b, v === 1 ? 15 : 11, 0, Math.PI * 2); x.fill(); }
  return tekstur(c);
}
function teksturKartu(d) {
  const c = kanvas(200, 280), x = c.getContext('2d'), tx = tekstur(c);
  const gr = (G.GRAD && G.GRAD[d.g]) || ['#ccc', '#888'];
  const gambar = (img) => {
    x.clearRect(0, 0, 200, 280);
    const g = x.createLinearGradient(0, 0, 200, 280); g.addColorStop(0, gr[0]); g.addColorStop(1, gr[1]);
    x.fillStyle = g; rr(x, 4, 4, 192, 272, 22); x.fill();
    x.lineWidth = 8; x.strokeStyle = INK; rr(x, 4, 4, 192, 272, 22); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = 4; rr(x, 18, 18, 164, 244, 14); x.stroke();
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (img) x.drawImage(img, 100 - 62, 140 - 62, 124, 124);
    else { x.font = `96px ${FONT_E}`; x.fillText(d.ic, 100, 144); }
    tx.needsUpdate = true;
  };
  gambar(null);
  muatGambar(aset(d.aset)).then(img => img && gambar(img));
  return tx;
}
function teksturLencana(n) {
  const c = kanvas(128, 72), x = c.getContext('2d');
  x.fillStyle = '#ffffff'; rr(x, 6, 6, 116, 60, 30); x.fill();
  x.lineWidth = 6; x.strokeStyle = INK; rr(x, 6, 6, 116, 60, 30); x.stroke();
  x.fillStyle = INK; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `700 42px ${FONT_B}`;
  x.fillText(String(n), 64, 38);
  return tekstur(c);
}
function teksturLogo() {
  const c = kanvas(1024, 460), x = c.getContext('2d');
  x.fillStyle = '#FFFDF4'; x.fillRect(0, 0, 1024, 460);
  const g = x.createRadialGradient(512, 160, 40, 512, 230, 600); g.addColorStop(0, '#FFFDF4'); g.addColorStop(1, '#FFEFC8');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 460);
  x.setLineDash([26, 18]); x.lineWidth = 9; x.strokeStyle = 'rgba(27,16,48,.35)'; rr(x, 22, 22, 980, 416, 40); x.stroke(); x.setLineDash([]);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  for (const [t, y, s] of [['Melek', 150, 170], ['Keuangan', 315, 150]]) {
    x.font = `${s}px ${FONT_D}`;
    x.fillStyle = 'rgba(27,16,48,.26)'; x.fillText(t, 512, y + 14);
    garisTeks(x, t, 512, y, '#FF4F87', INK, 22);
  }
  return tekstur(c);
}
function teksturHalaman() {
  const c = kanvas(512, 512), x = c.getContext('2d');
  const g = x.createRadialGradient(256, 180, 30, 256, 256, 380); g.addColorStop(0, '#FFFDF4'); g.addColorStop(1, '#FFEFC8');
  x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  x.setLineDash([16, 12]); x.lineWidth = 5; x.strokeStyle = 'rgba(27,16,48,.3)'; rr(x, 8, 8, 496, 496, 30); x.stroke();
  return tekstur(c);
}
function teksturBidakCadangan(p) {
  const c = kanvas(160, 160), x = c.getContext('2d');
  x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.ellipse(80, 140, 56, 14, 0, 0, 7); x.fill();
  x.fillStyle = p.pr.col || '#7C5CFF'; x.beginPath(); x.arc(80, 80, 56, 0, 7); x.fill();
  x.lineWidth = 7; x.strokeStyle = INK; x.stroke();
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `64px ${FONT_E}`; x.fillText(p.pr.ic || '🙂', 80, 84);
  return tekstur(c);
}

// =============================================================
class Papan3D {
  constructor() {
    this.siap = false; this.aktif = false; this.dibangun = false;
    this.tweens = new Set(); this.partikel = []; this.animasi = [];
    this.petak = []; this.bidak = []; this.tumpukan = [];
    this.sudut = 0; this.az = rad(SUDUT[0].az); this.el = rad(SUDUT[0].el);
    this.azGeser = 0; this.elGeser = 0; this.zoom = 1; this.zoomNow = 1;
    this.target = new THREE.Vector3(); this.kuadran = -1;
    this.waktu = 0; this.ikutiSampai = 0; this.lambat = 0; this.frame = 0;
    this.jarak = 30;
    try {
      const t = document.createElement('canvas');
      this.siap = !!(t.getContext('webgl2') || t.getContext('webgl'));
    } catch { this.siap = false; }
    if (this.siap) document.documentElement.classList.add('bisa3d');
  }

  // ---------- dipanggil dari initGame ----------
  async mulai() {
    if (!this.siap) return;
    if (!this.dibangun) {
      try {
        await Promise.race([
          Promise.all([document.fonts.load('700 40px "Fredoka"'), document.fonts.load('40px "Luckiest Guy"')]),
          new Promise(r => setTimeout(r, 2500)),
        ]);
      } catch { /* pakai font cadangan */ }
      this._bangun();
    }
    this._buatBidak();
    let pilih = '3d';
    try { pilih = localStorage.getItem('mk3d-papan') || '3d'; } catch { /* abaikan */ }
    this.setAktif(pilih !== '2d');
  }

  _bangun() {
    this.dibangun = true;
    const wadah = this.wadah = document.createElement('div'); wadah.id = 'papan3d';
    document.body.appendChild(wadah);
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    r.setPixelRatio(this.dpr);
    r.setClearColor('#a9dcf2');
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    wadah.appendChild(r.domElement);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog('#bfe6f5', 40, 120);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 400);
    this.aniso = Math.min(8, r.capabilities.getMaxAnisotropy());

    // cahaya
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#b9d7a8', 1.5));
    const sun = new THREE.DirectionalLight('#fff3dc', 2.2);
    sun.position.set(9, 18, 12); sun.castShadow = true;
    const besar = Math.max(window.innerWidth, window.innerHeight) > 900;
    sun.shadow.mapSize.set(besar ? 2048 : 1024, besar ? 2048 : 1024);
    Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 70 });
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
    this.scene.add(sun);

    // latar kota & taman (berkas latar.js)
    this.latar = bangunLatar(this.scene, { lam, mesh, gabung, shade, kanvas, rr, tekstur });

    this._bangunPapan();
    this._bangunTengah();
    this._bangunDadu();
    this._bangunPenanda();
    this._pasangInput();

    window.addEventListener('resize', () => this._ukur(true));
    let last = performance.now();
    r.setAnimationLoop((now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; this._frame(dt, now); });
  }

  // ---------- papan 28 petak ----------
  _bangunPapan() {
    const s = this.scene;
    // alas papan krem + bingkai tinta, duduk di atas plaza
    s.add(mesh(new RoundedBoxGeometry(8.6, 0.38, 8.6, 3, 0.16), lam('#FFF3D6'), 0, -0.19, 0));
    s.add(mesh(new RoundedBoxGeometry(8.85, 0.14, 8.85, 3, 0.07), lam(INK), 0, -0.31, 0));
    const halaman = new THREE.Mesh(new THREE.PlaneGeometry(6.08, 6.08), new THREE.MeshLambertMaterial({ map: teksturHalaman() }));
    halaman.rotation.x = -Math.PI / 2; halaman.position.y = 0.004; halaman.receiveShadow = true; s.add(halaman);

    const TILE = G.TILE || [], NT = G.NT || TILE.length;
    for (let i = 0; i < NT; i++) {
      const t = TILE[i];
      const [row, col] = G.tilePos(i);           // fungsi asli versi 2D: [baris, kolom] 1..8
      const x = col - 4.5, z = row - 4.5;
      const sudut = (row === 1 || row === 8) && (col === 1 || col === 8);
      const tinggi = sudut ? TILE_H * 1.35 : TILE_H;
      const warna = WARNA_PETAK[t[0]] || '#ffffff';
      const sisi = lam(shade(warna, 0.72));
      const atas = new THREE.MeshLambertMaterial({ map: teksturPetak(t, this.aniso) });
      const m = new THREE.Mesh(new RoundedBoxGeometry(PETAK, tinggi, PETAK, 2, 0.09), [sisi, sisi, atas, sisi, sisi, sisi]);
      m.position.set(x, tinggi / 2, z); m.castShadow = true; m.receiveShadow = true;
      s.add(m);
      this.petak.push({ i, x, z, m, tinggi, y0: tinggi / 2 });
    }
  }

  // ---------- isi tengah: logo, tumpukan kartu, pohon kecil ----------
  _bangunTengah() {
    const pusat = this.pusat = new THREE.Group(); this.scene.add(pusat);
    const sisiLogo = lam('#FFE7AE');
    const logo = new THREE.Mesh(new RoundedBoxGeometry(4.5, 0.14, 2.02, 2, 0.06),
      [sisiLogo, sisiLogo, new THREE.MeshLambertMaterial({ map: teksturLogo() }), sisiLogo, sisiLogo, sisiLogo]);
    logo.position.set(0, 0.07, -1.05); logo.castShadow = logo.receiveShadow = true; pusat.add(logo);

    const sisiKartu = lam('#FFF8EA');
    TUMPUKAN.forEach((d, k) => {
      const grup = new THREE.Group();
      grup.position.set(-1.5 + k, 0, 0.85);
      grup.rotation.y = rad([-7, 3, -3, 7][k]);
      const badan = mesh(new THREE.BoxGeometry(0.58, 1, 0.8), sisiKartu); badan.scale.y = 0.02; badan.position.y = 0.01;
      const tx = teksturKartu(d);
      const atas = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.8), new THREE.MeshLambertMaterial({ map: tx, transparent: true, alphaTest: 0.1 }));
      atas.rotation.x = -Math.PI / 2; atas.receiveShadow = true;
      const lencana = new THREE.Sprite(new THREE.SpriteMaterial({ map: teksturLencana(0), depthTest: false }));
      lencana.scale.set(0.36, 0.2, 1); lencana.renderOrder = 4;
      grup.add(badan, atas, lencana); pusat.add(grup);
      this.tumpukan.push({ d, grup, badan, atas, tx, lencana, n: -1 });
    });

    // semak bunga rendah di empat pojok dalam (rendah supaya tidak menutupi petak)
    const hiasan = new THREE.Group();
    for (const [a, b] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
      hiasan.add(mesh(new THREE.IcosahedronGeometry(0.26, 0), lam('#45B24F', { flatShading: true }), a * 2.6, 0.16, b * 2.6));
      hiasan.add(mesh(new THREE.IcosahedronGeometry(0.17, 0), lam('#5CC95A', { flatShading: true }), a * 2.42, 0.12, b * 2.72));
      for (let k = 0; k < 4; k++) { const t = k / 4 * Math.PI * 2; hiasan.add(mesh(new THREE.SphereGeometry(0.045, 6, 5), lam(['#FF5E8A', '#FFD23F', '#FFFFFF', '#B07CFF'][k]), a * 2.6 + Math.cos(t) * 0.2, 0.32, b * 2.6 + Math.sin(t) * 0.2)); }
    }
    this.scene.add(gabung(hiasan));
  }

  _bangunDadu() {
    const mats = [2, 5, 1, 6, 3, 4].map(v => new THREE.MeshLambertMaterial({ map: teksturDadu(v) }));
    const d = this.dadu = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.56, 0.56, 4, 0.1), mats);
    d.castShadow = true; d.visible = false; this.scene.add(d);
  }

  _bangunPenanda() {
    this.cincin = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.4, 36), new THREE.MeshBasicMaterial({ color: '#FFC93C', transparent: true, opacity: 0.95 }));
    this.cincin.rotation.x = -Math.PI / 2; this.cincin.visible = false; this.scene.add(this.cincin);
    this.panah = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.26, 4), new THREE.MeshLambertMaterial({ color: '#FFC93C', emissive: '#FFC93C', emissiveIntensity: 0.25 }));
    this.panah.rotation.x = Math.PI; this.panah.visible = false; this.scene.add(this.panah);
    this.bayangGeo = new THREE.CircleGeometry(0.3, 24);
  }

  // ---------- bidak: gambar profesi pemain berdiri di atas petak ----------
  _buatBidak() {
    for (const b of this.bidak) { this.scene.remove(b.sprite, b.bayang); }
    this.bidak = [];
    (G.P || []).forEach((p, i) => {
      const mat = new THREE.SpriteMaterial({ map: teksturBidakCadangan(p), alphaTest: 0.3 });
      const sprite = new THREE.Sprite(mat); sprite.center.set(0.5, 0.06);
      const bayang = new THREE.Mesh(this.bayangGeo, new THREE.MeshBasicMaterial({ color: '#1B1030', transparent: true, opacity: 0.25, depthWrite: false }));
      bayang.rotation.x = -Math.PI / 2;
      this.scene.add(sprite, bayang);
      const b = { i, sprite, mat, bayang, idx: p.pos || 0, sibuk: false, out: false, skala: 0.75 };
      this.bidak.push(b);
      muatGambar(aset(p.pr && p.pr.bidak)).then(img => {
        if (!img || b.out) return;
        const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
        mat.map = t; mat.needsUpdate = true;
      });
    });
    const petakTerisi = new Set(this.bidak.map(b => b.idx));
    for (const k of petakTerisi) this._tata(k, true);
  }
  _petakPos(i) { const t = this.petak[i]; return new THREE.Vector3(t.x, t.tinggi, t.z); }
  _sumbu() { // kanan & menjauh, mengikuti kuadran kamera
    const th = this.kuadran * Math.PI / 2;
    return { kanan: [Math.cos(th), -Math.sin(th)], jauh: [-Math.sin(th), -Math.cos(th)] };
  }
  _slot(n, k) {
    const S = {
      1: [[[0, 0]], 0.8], 2: [[[-0.2, 0], [0.2, 0]], 0.66], 3: [[[-0.24, 0.13], [0.24, 0.13], [0, -0.15]], 0.58],
      4: [[[-0.2, 0.15], [0.2, 0.15], [-0.2, -0.15], [0.2, -0.15]], 0.54],
    };
    if (n <= 4) { const [l, s] = S[n]; return { o: l[k], s }; }
    const depan = n - 4;
    if (k < 4) return { o: [-0.3 + k * 0.2, 0.18], s: 0.46 };
    const j = k - 4; return { o: [(j - (depan - 1) / 2) * 0.22, -0.16], s: 0.46 };
  }
  _tata(idx, langsung = false) {
    const isi = this.bidak.filter(b => b.idx === idx && !b.sibuk);
    const { kanan, jauh } = this._sumbu();
    const base = this._petakPos(idx);
    isi.forEach((b, k) => {
      const { o, s } = this._slot(isi.length, k);
      const ke = new THREE.Vector3(base.x + kanan[0] * o[0] + jauh[0] * o[1], base.y, base.z + kanan[1] * o[0] + jauh[1] * o[1]);
      if (langsung) { b.sprite.position.copy(ke); b.skala = s; return; }
      const dari = b.sprite.position.clone(), s0 = b.skala;
      this.tween(220, e => { b.sprite.position.lerpVectors(dari, ke, e); b.skala = s0 + (s - s0) * e; }, EASE.out);
    });
  }
  _lompat(b, ke) {
    b.sibuk = true;
    const dari = b.sprite.position.clone(), lama = b.idx;
    const tuju = this._petakPos(ke);
    this.ikutiSampai = this.waktu + 1.1; this.ikuti = b;
    this._tata(lama);
    this.tween(205, (e, k) => {
      b.sprite.position.lerpVectors(dari, tuju, e);
      b.sprite.position.y = dari.y + (tuju.y - dari.y) * e + Math.sin(Math.PI * k) * 0.55;
      b.regang = 1 + 0.16 * Math.sin(Math.PI * k);
    }, EASE.io).then(() => {
      b.idx = ke; b.regang = 1;
      this._pentalPetak(ke);
      return this.tween(60, (e, k) => { b.regang = 1 - 0.14 * Math.sin(Math.PI * k); });
    }).then(() => { b.regang = 1; b.sibuk = false; this._tata(ke); });
  }
  _terbang(b, ke) {
    b.sibuk = true;
    const dari = b.sprite.position.clone(), lama = b.idx, tuju = this._petakPos(ke);
    this._tata(lama);
    this.tween(800, (e) => {
      b.sprite.position.lerpVectors(dari, tuju, e); b.sprite.position.y += Math.sin(Math.PI * e) * 2.2;
    }, EASE.io).then(() => { b.idx = ke; b.sibuk = false; this._pentalPetak(ke); this._tata(ke); });
  }
  _pentalPetak(i) {
    const t = this.petak[i]; if (!t) return;
    this.tween(280, (e, k) => { t.m.position.y = t.y0 - Math.sin(Math.PI * k) * 0.07; });
  }
  _gugur(b) {
    b.out = true;
    this.ledakan(b.sprite.position.clone().add(new THREE.Vector3(0, 0.4, 0)), ['#888', '#bbb', '#E8414C', '#fff'], 40);
    muatGambar(aset('bidak-gugur')).then(img => {
      if (img) { const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; b.mat.map = t; b.mat.needsUpdate = true; }
      b.mat.color.set('#d9d9d9');
    });
  }

  // ---------- kait dari kode utama ----------
  lemparDadu(r) {
    if (!this.aktif || !this.dadu) return;
    const d = this.dadu; d.visible = true; d.scale.setScalar(1);
    const faceE = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 2: [0, 0, Math.PI / 2], 5: [0, 0, -Math.PI / 2], 3: [-Math.PI / 2, 0, 0], 4: [Math.PI / 2, 0, 0] }[r];
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.kuadran * Math.PI / 2 + (Math.random() - 0.5) * 0.9)
      .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...faceE)));
    const akhir = new THREE.Euler().setFromQuaternion(q, 'XYZ');
    const tanda = () => (Math.random() < 0.5 ? -1 : 1);
    const mulaiE = [akhir.x + tanda() * Math.PI * 6, akhir.y + tanda() * Math.PI * 2, akhir.z + tanda() * Math.PI * 4];
    const awal = this.pusat.localToWorld(new THREE.Vector3(-1.4, 3.4, 5.2));
    const ujung = this.pusat.localToWorld(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.28, 2.05));
    this.posDadu = ujung;
    this.tween(980, (e, t) => {
      const p = EASE.out(t);
      d.position.set(awal.x + (ujung.x - awal.x) * p, awal.y + (ujung.y - awal.y) * EASE.bounce(t), awal.z + (ujung.z - awal.z) * p);
      const k = EASE.out(Math.min(1, t * 1.1));
      d.rotation.set(mulaiE[0] + (akhir.x - mulaiE[0]) * k, mulaiE[1] + (akhir.y - mulaiE[1]) * k, mulaiE[2] + (akhir.z - mulaiE[2]) * k, 'XYZ');
    }).then(() => this.ledakan(ujung.clone().add(new THREE.Vector3(0, 0.2, 0)), ['#FFC93C', '#FF4F87', '#2EC4B6', '#ffffff'], 18));
    clearTimeout(this._hilangDadu);
    this._hilangDadu = setTimeout(() => this.tween(220, e => d.scale.setScalar(Math.max(0.01, 1 - e))).then(() => { d.visible = false; }), 1720);
  }
  teks(i, txt, col) {
    const b = this.bidak[i], lapis = $('#fly');
    if (!b || !lapis) return;
    const p = this._layar(b.sprite.position.clone().add(new THREE.Vector3(0, b.skala * 1.05, 0)));
    const f = document.createElement('div');
    f.className = 'float'; f.innerHTML = txt; f.style.color = col;
    f.style.left = p.x + 'px'; f.style.top = (p.y - 6) + 'px';
    lapis.appendChild(f); setTimeout(() => f.remove(), 1200);
  }
  gantiSudut() {
    this.sudut = (this.sudut + 1) % SUDUT.length;
    this.azGeser = 0; this.elGeser = 0; this.zoom = 1;
    this._labelSudut();
  }
  _labelSudut() { const b = $('#viewBtn'); if (b) b.innerHTML = SUDUT[this.sudut].nama; }
  toggle() {
    this.setAktif(!this.aktif);
    try { localStorage.setItem('mk3d-papan', this.aktif ? '3d' : '2d'); } catch { /* abaikan */ }
  }
  setAktif(v) {
    this.aktif = !!v && this.siap && this.dibangun;
    document.documentElement.classList.toggle('pakai3d', this.aktif);
    const b = $('#btn3d'); if (b) b.innerHTML = this.aktif ? '\u{1F9CA} Papan 3D' : '\u{1F7E6} Papan 2D';
    const dr = $('#diceres'); if (dr && !this.aktif) { dr.style.left = dr.style.top = dr.style.transform = ''; }
    if (this.aktif) { this._labelSudut(); this._tataSemua(); this._ukur(true); }
    else if (typeof G.terapkanView === 'function') G.terapkanView();
    if (typeof G.layout === 'function') setTimeout(() => G.layout(), 30);
  }

  // ---------- kamera ----------
  _rect() {
    const bw = $('#boardwrap'); if (!bw) return null;
    const r = bw.getBoundingClientRect();
    let { left, right, top, bottom } = r;
    if (window.innerWidth > 1100) {
      const hud = $('#game .hud');
      if (hud) top = Math.min(top, hud.getBoundingClientRect().bottom + 6);
      bottom = Math.max(bottom, window.innerHeight - 6);
    }
    return { left, right, top, bottom };
  }
  _ukur(paksa = false) {
    if (!this.renderer) return;
    const W = window.innerWidth, H = window.innerHeight;
    if (paksa || W !== this._W || H !== this._H) { this.renderer.setSize(W, H); this._W = W; this._H = H; }
    const R = this._rect(); if (!R || R.right - R.left < 20) return;
    const kunci = [W, H, R.left | 0, R.right | 0, R.top | 0, R.bottom | 0, this.az.toFixed(3), this.el.toFixed(3)].join();
    if (!paksa && kunci === this._kunci) return;
    this._kunci = kunci;
    const x0 = R.left / W * 2 - 1, x1 = R.right / W * 2 - 1, y1 = 1 - R.top / H * 2, y0 = 1 - R.bottom / H * 2;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const cam = this.camera;
    cam.aspect = W / H;
    cam.setViewOffset(W, H, -cx * W / 2, cy * H / 2, W, H);
    cam.updateProjectionMatrix();
    const titik = [];
    for (const [a, b] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) { titik.push(new THREE.Vector3(a * 4.35, 0, b * 4.35), new THREE.Vector3(a * 3.9, 0.75, b * 3.9)); }
    const pad = 0.02;
    let lo = 4, hi = 200;
    for (let it = 0; it < 26; it++) {
      const mid = (lo + hi) / 2;
      this._taruhKamera(new THREE.Vector3(), mid);
      let ok = true;
      for (const p of titik) {
        const q = p.clone().project(cam);
        if (q.x < x0 + pad || q.x > x1 - pad || q.y < y0 + pad || q.y > y1 - pad) { ok = false; break; }
      }
      if (ok) hi = mid; else lo = mid;
    }
    this.jarak = hi;
    this.scene.fog.near = hi + 12; this.scene.fog.far = hi + 85;
    this._taruhKamera(this.target, this.jarak * this.zoomNow);
  }
  _taruhKamera(t, d) {
    const ce = Math.cos(this.el), se = Math.sin(this.el);
    this.camera.position.set(t.x + Math.sin(this.az) * ce * d, t.y + se * d, t.z + Math.cos(this.az) * ce * d);
    this.camera.lookAt(t);
    this.camera.updateMatrixWorld();
  }
  _layar(v) {
    const q = v.clone().project(this.camera);
    return { x: (q.x + 1) / 2 * window.innerWidth, y: (1 - q.y) / 2 * window.innerHeight };
  }
  _tataSemua() { for (const k of new Set(this.bidak.map(b => b.idx))) this._tata(k, true); }
  _kuadran() {
    const q = ((Math.round((this.az - 0.02) / (Math.PI / 2)) % 4) + 4) % 4;
    if (q === this.kuadran) return;
    this.kuadran = q;
    const r = q * Math.PI / 2;
    for (const t of this.petak) t.m.rotation.y = r;
    this.pusat.rotation.y = r;
    this._tataSemua();
  }

  // ---------- geser (tetikus) & gulir untuk memutar/zoom ----------
  _pasangInput() {
    const bw = $('#boardwrap'); if (!bw) return;
    let seret = null;
    bw.addEventListener('pointerdown', e => {
      if (!this.aktif || e.pointerType !== 'mouse' || e.button !== 0) return;
      seret = { x: e.clientX, y: e.clientY, az: this.azGeser, el: this.elGeser };
      bw.setPointerCapture && bw.setPointerCapture(e.pointerId);
    });
    bw.addEventListener('pointermove', e => {
      if (!seret) return;
      this.azGeser = seret.az - (e.clientX - seret.x) * 0.006;
      this.elGeser = THREE.MathUtils.clamp(seret.el + (e.clientY - seret.y) * 0.004, rad(22) - rad(SUDUT[this.sudut].el), rad(84) - rad(SUDUT[this.sudut].el));
    });
    const lepas = () => { seret = null; };
    bw.addEventListener('pointerup', lepas); bw.addEventListener('pointercancel', lepas);
    bw.addEventListener('dblclick', () => { if (this.aktif) { this.azGeser = 0; this.elGeser = 0; this.zoom = 1; } });
    bw.addEventListener('wheel', e => {
      if (!this.aktif) return;
      e.preventDefault();
      this.zoom = THREE.MathUtils.clamp(this.zoom * (1 + e.deltaY * 0.0011), 0.55, 1.25);
    }, { passive: false });
  }

  // ---------- efek ----------
  tween(ms, fn, ease = EASE.lin) { return new Promise(res => this.tweens.add({ t: 0, d: Math.max(1, ms), fn, ease, res })); }
  ledakan(pos, warna, n = 40) {
    const geo = this._geoKonf ||= new THREE.PlaneGeometry(0.09, 0.06);
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: warna[k % warna.length], side: THREE.DoubleSide, transparent: true }));
      m.position.copy(pos);
      const a = Math.random() * Math.PI * 2, s = 0.8 + Math.random() * 1.8;
      this.partikel.push({ m, v: new THREE.Vector3(Math.cos(a) * s, 2 + Math.random() * 2.6, Math.sin(a) * s), umur: 1.1 + Math.random() * 0.6, t: 0, putar: Math.random() * 12 });
      this.scene.add(m);
    }
  }
  _kartuDiambil(tp) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.8), new THREE.MeshBasicMaterial({ map: tp.tx, transparent: true, side: THREE.DoubleSide }));
    const awal = tp.atas.getWorldPosition(new THREE.Vector3());
    const arahKamera = Math.atan2(this.camera.position.x - awal.x, this.camera.position.z - awal.z);
    m.position.copy(awal); m.rotation.order = 'YXZ'; m.rotation.set(-Math.PI / 2, arahKamera, 0);
    this.scene.add(m);
    this.tween(720, (e, k) => {
      m.position.set(awal.x, awal.y + e * 1.5, awal.z);
      m.rotation.x = -Math.PI / 2 + e * (Math.PI / 2 - 0.35);
      m.scale.setScalar(1 + e * 0.7);
      m.material.opacity = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
    }, EASE.out).then(() => { this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  }

  // ---------- sinkron dengan keadaan permainan ----------
  _sinkronBidak() {
    const P = G.P || [], NT = G.NT || 28;
    if (P.length !== this.bidak.length) this._buatBidak();
    for (let i = 0; i < P.length; i++) {
      const p = P[i], b = this.bidak[i];
      if (p.out && !b.out) this._gugur(b);
      if (!b.sibuk && b.idx !== p.pos) {
        const beda = (p.pos - b.idx + NT) % NT;
        if (beda >= 1 && beda <= 12) this._lompat(b, (b.idx + 1) % NT); else this._terbang(b, p.pos);
      }
      // gambar sprite: ukuran, regangan, bayangan
      const s = b.skala, reg = b.regang || 1;
      b.sprite.scale.set(s / Math.sqrt(reg), s * reg, 1);
      const alas = this.petak[b.idx] ? this.petak[b.idx].tinggi : TILE_H;
      const tinggi = Math.max(0, b.sprite.position.y - alas);
      b.bayang.position.set(b.sprite.position.x, alas + 0.006, b.sprite.position.z);
      const sb = s * Math.max(0.4, 1 - tinggi * 0.5); b.bayang.scale.set(sb, sb, sb);
      b.bayang.material.opacity = b.out ? 0.12 : 0.25;
    }
    const aktif = this.bidak[G.cur];
    const tampak = !!aktif && !aktif.out;
    this.cincin.visible = this.panah.visible = tampak;
    if (tampak) {
      const p = aktif.sprite.position, col = (P[G.cur].pr && P[G.cur].pr.col) || '#FFC93C';
      this.cincin.material.color.set(col); this.panah.material.color.set(col); this.panah.material.emissive.set(col);
      const alas = this.petak[aktif.idx] ? this.petak[aktif.idx].tinggi : TILE_H;
      this.cincin.position.set(p.x, alas + 0.01, p.z);
      const s = aktif.skala * (1 + Math.sin(this.waktu * 5) * 0.1); this.cincin.scale.set(s, s, s);
      this.panah.position.set(p.x, p.y + aktif.skala * 1.02 + 0.22 + Math.sin(this.waktu * 4) * 0.07, p.z);
      this.panah.rotation.y = this.waktu * 2;
    }
  }
  _sinkronKartu() {
    if (!G.DK) return;
    for (const tp of this.tumpukan) {
      const dk = G.DK[tp.d.k];
      // tumpukan kosong = belum dikocok; kartu berikutnya mengocok ulang semua kartu
      const n = dk && typeof dk.sisa === 'function' ? (dk.sisa() || (dk.src ? dk.src.length : 0)) : 0;
      if (n === tp.n) continue;
      if (tp.n > n && tp.n >= 0) this._kartuDiambil(tp);
      tp.n = n;
      const h = Math.max(0.02, Math.min(n, 30) * 0.022);
      const h0 = tp.badan.scale.y;
      this.tween(260, e => {
        const hh = h0 + (h - h0) * e;
        tp.badan.scale.y = hh; tp.badan.position.y = hh / 2;
        tp.atas.position.y = hh + 0.002; tp.lencana.position.y = hh + 0.3;
      }, EASE.out);
      const lama = tp.lencana.material.map; tp.lencana.material.map = teksturLencana(n); tp.lencana.material.needsUpdate = true; lama && lama.dispose();
    }
  }
  _posisiHasilDadu() {
    const dr = $('#diceres'), cen = $('#center');
    if (!dr || !cen || !dr.classList.contains('on') || !this.posDadu) return;
    const p = this._layar(this.posDadu), c = cen.getBoundingClientRect();
    dr.style.left = (p.x - c.left) + 'px'; dr.style.top = (p.y - c.top + 26) + 'px'; dr.style.transform = 'translate(-50%,0)';
  }

  // ---------- putaran gambar ----------
  _frame(dt, now) {
    const tampil = this.aktif && $('#game') && $('#game').classList.contains('on');
    this.wadah.style.display = tampil ? 'block' : 'none';
    if (!tampil) return;
    this.waktu += dt; this.frame++;
    const ms = dt * 1000;
    for (const tw of [...this.tweens]) {
      tw.t += ms; const k = Math.min(1, tw.t / tw.d);
      try { tw.fn(tw.ease(k), k); } catch (err) { console.error(err); }
      if (k >= 1) { this.tweens.delete(tw); tw.res(); }
    }
    for (let i = this.partikel.length - 1; i >= 0; i--) {
      const p = this.partikel[i]; p.t += dt;
      p.v.y -= 7 * dt; p.m.position.addScaledVector(p.v, dt); p.m.rotation.x += p.putar * dt; p.m.rotation.y += p.putar * 0.7 * dt;
      p.m.material.opacity = Math.max(0, 1 - p.t / p.umur);
      if (p.t >= p.umur) { this.scene.remove(p.m); p.m.material.dispose(); this.partikel.splice(i, 1); }
    }
    // sudut kamera menuju pilihan + geseran tetikus, halus
    const s = SUDUT[this.sudut];
    const azT = rad(s.az) + this.azGeser, elT = rad(s.el) + this.elGeser;
    const k = 1 - Math.exp(-dt * 5);
    this.az += (azT - this.az) * k; this.el += (elT - this.el) * k;
    this._kuadran();
    this._ukur();
    this._sinkronBidak();
    if (this.frame % 15 === 0 || this.tumpukan[0].n < 0) this._sinkronKartu();
    // kamera mendekat ke bidak yang sedang berjalan, lalu kembali
    const tujuan = new THREE.Vector3(); let zt = this.zoom;
    if (this.ikuti && this.waktu < this.ikutiSampai) {
      // layar lebar: kamera mendekat; layar sempit (HP): cukup bergeser sedikit
      const lebar = window.innerWidth > 1100, p = this.ikuti.sprite.position;
      tujuan.set(p.x * (lebar ? 0.3 : 0.12), 0, p.z * (lebar ? 0.3 : 0.12)); zt *= lebar ? 0.9 : 1;
    }
    const kk = 1 - Math.exp(-dt * 2.6);
    this.target.lerp(tujuan, kk); this.zoomNow += (zt - this.zoomNow) * kk;
    let goyang = new THREE.Vector3();
    if ($('#game').classList.contains('shake')) goyang.set((Math.random() - 0.5) * 0.18, 0, (Math.random() - 0.5) * 0.18);
    this._taruhKamera(this.target.clone().add(goyang), this.jarak * this.zoomNow);
    for (const f of this.latar.animasi) f(this.waktu, dt);
    this._posisiHasilDadu();
    // hemat tenaga: kurangi gambar saat kartu/materi menutupi papan
    const tertutup = ['#ov', '#matov', '#aturanov', '#suaraov'].some(q => { const e = $(q); return e && e.classList.contains('on'); });
    if (tertutup && this.frame % 3) return;
    const t0 = performance.now();
    this.renderer.render(this.scene, this.camera);
    this._kualitas(dt, performance.now() - t0);
  }
  // turunkan resolusi otomatis bila laptop terlalu berat
  _kualitas(dt) {
    this.lambat = this.lambat * 0.97 + (dt > 0.034 ? 1 : 0) * 0.03;
    if (this.lambat > 0.6 && this.dpr > 1) {
      this.dpr = 1; this.renderer.setPixelRatio(1); this._ukur(true); this.lambat = 0;
    } else if (this.lambat > 0.6 && this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.enabled = false; this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); this.lambat = 0;
    }
  }
}

const papan = new Papan3D();
G.PAPAN3D = papan;
// kalau modul termuat setelah permainan sudah dimulai
if (document.querySelector('#game') && document.querySelector('#game').classList.contains('on') && (G.P || []).length) papan.mulai();
