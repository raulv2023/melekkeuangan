// =============================================================
//  LATAR KOTA & TAMAN untuk papan 3D Melek Keuangan
//  Papan berdiri di plaza berpaving merah muda, dikelilingi jalan
//  dengan mobil yang berputar. Utara: deretan gedung kota.
//  Timur: taman dengan air mancur & bianglala. Barat: pantai & laut.
//  Selatan: kafe payung & rumah warga.
//  Ganti tema cukup di berkas ini; papan3d.js tidak perlu diubah.
// =============================================================
import * as THREE from './vendor/three.module.min.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

const GY = -0.63;          // tinggi tanah
const TROTOAR = -0.47;     // tinggi trotoar luar
const PLAZA = -0.38;       // tinggi plaza (alas papan)
const JALAN = -0.59;       // tinggi aspal

// pengacak berbenih supaya tata kota selalu sama setiap dibuka
function acak(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// lintasan persegi bersudut bulat (setengah sisi h, jari-jari sudut r)
export function lintasan(h, r) {
  const lurus = 2 * (h - r), busur = Math.PI * r / 2, L = 4 * (lurus + busur);
  return {
    L,
    at(s) {
      s = ((s % L) + L) % L;
      const k = Math.floor(s / (lurus + busur)); s -= k * (lurus + busur);
      let x, z, dx, dz;
      if (s < lurus) { x = h; z = -(h - r) + s; dx = 0; dz = 1; }
      else { const f = (s - lurus) / r; x = h - r + r * Math.cos(f); z = h - r + r * Math.sin(f); dx = -Math.sin(f); dz = Math.cos(f); }
      const th = k * Math.PI / 2, c = Math.cos(th), si = Math.sin(th);
      return { x: x * c - z * si, z: x * si + z * c, dx: dx * c - dz * si, dz: dx * si + dz * c };
    },
  };
}
function bentuk(h, r) {
  const s = new THREE.Shape();
  s.moveTo(-h + r, -h); s.lineTo(h - r, -h); s.absarc(h - r, -h + r, r, -Math.PI / 2, 0, false);
  s.lineTo(h, h - r); s.absarc(h - r, h - r, r, 0, Math.PI / 2, false);
  s.lineTo(-h + r, h); s.absarc(-h + r, h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-h, -h + r); s.absarc(-h + r, -h + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
// cincin (atau lempeng penuh bila dalam = 0) dengan sudut sepusat di ±5,2
function lempeng(luar, dalam, tebal, bawah, material) {
  const s = bentuk(luar, luar - 5.2);
  if (dalam) s.holes.push(bentuk(dalam, dalam - 5.2));
  const g = new THREE.ExtrudeGeometry(s, { depth: tebal, bevelEnabled: false, curveSegments: 12 });
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, material); m.position.y = bawah; m.receiveShadow = true;
  return m;
}

export function bangunLatar(scene, alat) {
  const { lam, mesh, gabung, shade, kanvas, rr, tekstur } = alat;
  const rnd = acak(20261101);
  const pilih = (a) => a[Math.floor(rnd() * a.length)];
  const statis = new THREE.Group();
  const animasi = [];

  // ---------- tekstur ----------
  const tPaving = (() => {
    const c = kanvas(256, 256), x = c.getContext('2d');
    x.fillStyle = '#E7B3B3'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const v = 0.96 + rnd() * 0.08;
      x.fillStyle = shade('#F6CFCB', v); rr(x, i * 64 + 3, j * 64 + 3, 58, 58, 6); x.fill();
    }
    const t = tekstur(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.7, 0.7); return t;
  })();
  const tRumput = (() => {
    const c = kanvas(128, 128), x = c.getContext('2d');
    x.fillStyle = '#93D56E'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 260; i++) { x.fillStyle = rnd() < 0.5 ? 'rgba(70,150,60,.18)' : 'rgba(200,240,150,.22)'; x.fillRect(rnd() * 128, rnd() * 128, 2 + rnd() * 3, 2 + rnd() * 3); }
    const t = tekstur(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(70, 90); return t;
  })();
  const tAir = (() => {
    const c = kanvas(256, 256), x = c.getContext('2d');
    x.fillStyle = '#46C9DA'; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 4; x.lineCap = 'round';
    for (let i = 0; i < 26; i++) { const a = rnd() * 256, b = rnd() * 256, w = 14 + rnd() * 26; x.beginPath(); x.moveTo(a, b); x.quadraticCurveTo(a + w / 2, b - 5, a + w, b); x.stroke(); }
    const t = tekstur(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 40); return t;
  })();

  // ---------- tanah, plaza, jalan, trotoar ----------
  const rumput = new THREE.Mesh(new THREE.PlaneGeometry(130, 220), new THREE.MeshLambertMaterial({ map: tRumput }));
  rumput.rotation.x = -Math.PI / 2; rumput.position.set(54, GY, 0); rumput.receiveShadow = true; scene.add(rumput);
  const pasir = mesh(new THREE.BoxGeometry(1.9, 0.7, 220), lam('#F5DB9C'), -11.95, GY - 0.35, 0); pasir.castShadow = false; scene.add(pasir);
  const air = new THREE.Mesh(new THREE.PlaneGeometry(150, 220), new THREE.MeshLambertMaterial({ map: tAir }));
  air.rotation.x = -Math.PI / 2; air.position.set(-87.4, GY - 0.32, 0); air.receiveShadow = true; scene.add(air);
  animasi.push((t) => { tAir.offset.set(t * 0.012, t * 0.006); });

  const matPaving = new THREE.MeshLambertMaterial({ map: tPaving });
  scene.add(lempeng(6.2, 0, PLAZA - GY, GY, matPaving));                          // plaza tempat papan
  scene.add(lempeng(8.0, 6.2, JALAN - GY, GY, lam('#8A8399')));                   // aspal
  scene.add(lempeng(9.0, 8.0, TROTOAR - GY, GY, matPaving));                      // trotoar luar
  // garis putus-putus tengah jalan & zebra cross
  const garis = lintasan(7.1, 1.9);
  for (let s = 0; s < garis.L; s += 1.05) {
    const p = garis.at(s);
    const g = mesh(new THREE.BoxGeometry(0.5, 0.012, 0.07), lam('#FFFFFF'), p.x, JALAN + 0.006, p.z);
    g.rotation.y = Math.atan2(-p.dz, p.dx); statis.add(g);
  }
  for (const [ax, az] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    for (let k = -3; k <= 3; k++) {
      const pos = 7.1;
      const z = mesh(new THREE.BoxGeometry(ax ? 1.7 : 0.22, 0.014, ax ? 0.22 : 1.7), lam('#F8F8FF'),
        ax ? ax * pos : k * 0.38 + 2.2, JALAN + 0.008, ax ? k * 0.38 - 2.2 : az * pos);
      statis.add(z);
    }
  }

  // ---------- pembuat objek ----------
  const kayu = lam('#C98A4B'), besi = lam('#3B3550'), batang = lam('#9B6A3C');
  const daun = ['#43B04F', '#58C55A', '#3A9E49', '#6BCF5E'].map(c => lam(c, { flatShading: true }));
  function pohon(x, z, s = 1, y = GY) {
    statis.add(mesh(new THREE.CylinderGeometry(0.07 * s, 0.11 * s, 0.7 * s, 6), batang, x, y + 0.35 * s, z));
    const d = pilih(daun);
    statis.add(mesh(new THREE.IcosahedronGeometry(0.55 * s, 0), d, x, y + 1.0 * s, z));
    statis.add(mesh(new THREE.IcosahedronGeometry(0.38 * s, 0), d, x + 0.25 * s, y + 1.32 * s, z - 0.12 * s));
    statis.add(mesh(new THREE.IcosahedronGeometry(0.34 * s, 0), pilih(daun), x - 0.28 * s, y + 1.2 * s, z + 0.15 * s));
  }
  function nyiur(x, z, s = 1, y = GY) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s);
    let px = 0, py = 0;
    for (let k = 0; k < 5; k++) { const seg = mesh(new THREE.CylinderGeometry(0.07 - k * 0.006, 0.085 - k * 0.006, 0.42, 6), lam('#B98551'), px, py + 0.21, 0); seg.rotation.z = -0.08 * k; g.add(seg); px += 0.04 * k; py += 0.4; }
    for (let j = 0; j < 7; j++) {
      const h = new THREE.Group(); h.position.set(px, py, 0); h.rotation.y = j / 7 * Math.PI * 2;
      const l = mesh(new THREE.ConeGeometry(0.13, 0.95, 4), pilih(daun), 0.42, -0.12, 0);
      l.rotation.z = Math.PI / 2 + 0.45; l.scale.z = 0.35; h.add(l); g.add(h);
    }
    g.add(mesh(new THREE.SphereGeometry(0.07, 6, 5), lam('#7A4E25'), px + 0.06, py - 0.08, 0.05));
    statis.add(g);
  }
  function semak(x, z, s = 1, y = GY) { statis.add(mesh(new THREE.IcosahedronGeometry(0.3 * s, 0), pilih(daun), x, y + 0.2 * s, z)); }
  function lampu(x, z, y = PLAZA) {
    statis.add(mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.1, 6), besi, x, y + 0.55, z));
    statis.add(mesh(new THREE.SphereGeometry(0.1, 10, 8), lam('#FFF4C2', { emissive: '#FFE27A', emissiveIntensity: 0.7 }), x, y + 1.15, z));
  }
  function bangku(x, z, rotY, y = PLAZA) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY;
    g.add(mesh(new THREE.BoxGeometry(0.72, 0.06, 0.22), kayu, 0, 0.22, 0));
    g.add(mesh(new THREE.BoxGeometry(0.72, 0.18, 0.05), kayu, 0, 0.36, -0.1));
    for (const a of [-0.3, 0.3]) g.add(mesh(new THREE.BoxGeometry(0.05, 0.22, 0.2), besi, a, 0.11, 0));
    statis.add(g);
  }
  function pot(x, z, y = PLAZA) {
    statis.add(mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.24, 10), lam('#E9E1D3'), x, y + 0.12, z));
    statis.add(mesh(new THREE.IcosahedronGeometry(0.24, 0), pilih(daun), x, y + 0.34, z));
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; statis.add(mesh(new THREE.SphereGeometry(0.055, 6, 5), lam(pilih(['#FF5E8A', '#FFD23F', '#FF8A3D', '#FFFFFF', '#B07CFF'])), x + Math.cos(a) * 0.17, y + 0.42, z + Math.sin(a) * 0.17)); }
  }
  function payung(x, z, warna, y = GY) {
    statis.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 5), lam('#FFFFFF'), x, y + 0.5, z));
    statis.add(mesh(new THREE.ConeGeometry(0.62, 0.28, 8), lam(warna), x, y + 1.05, z));
    statis.add(mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 12), lam('#FFFFFF'), x, y + 0.42, z));
    for (const a of [0, Math.PI]) statis.add(mesh(new THREE.BoxGeometry(0.2, 0.26, 0.2), lam('#4FA3E0'), x + Math.cos(a) * 0.45, y + 0.13, z + Math.sin(a) * 0.45));
  }
  const DINDING = ['#FFE3A3', '#FFC6D0', '#BDE3FF', '#C9F2C2', '#FFD6A8', '#E3D4FF', '#FFFFFF', '#FFE9E0', '#D5F1F4'];
  const ATAP = ['#FF6B6B', '#FF9F43', '#5B8DEF', '#36B37E', '#8C6CF0', '#F25F9A'];
  function gedung(x, z, w, d, lantai, gaya = 'kantor', hadap = 1) {
    const hl = 0.46, h = lantai * hl + 0.12, wd = pilih(DINDING);
    statis.add(mesh(new THREE.BoxGeometry(w, h, d), lam(wd), x, GY + h / 2, z));
    const kaca = lam(pilih(['#9FD8FF', '#B6E4FF', '#8FC7F2']));
    for (let f = 0; f < lantai; f++) statis.add(mesh(new THREE.BoxGeometry(w + 0.03, 0.17, d + 0.03), kaca, x, GY + 0.3 + f * hl, z));
    statis.add(mesh(new THREE.BoxGeometry(w + 0.1, 0.1, d + 0.1), lam(shade(wd, 0.78)), x, GY + h + 0.05, z));
    if (rnd() < 0.7) statis.add(mesh(new THREE.BoxGeometry(w * 0.3, 0.22, d * 0.3), lam('#D9D4E8'), x + (rnd() - 0.5) * w * 0.4, GY + h + 0.2, z + (rnd() - 0.5) * d * 0.3));
    if (gaya === 'toko') {
      const aw = mesh(new THREE.BoxGeometry(w * 0.9, 0.05, 0.4), lam(pilih(ATAP)), x, GY + 0.62, z + hadap * (d / 2 + 0.18));
      aw.rotation.x = hadap * 0.35; statis.add(aw);
      statis.add(mesh(new THREE.BoxGeometry(w * 0.55, 0.16, 0.04), lam('#FFFFFF'), x, GY + 0.84, z + hadap * (d / 2 + 0.02)));
    }
  }
  function rumah(x, z, w, d, hadap = 1) {
    const h = 0.8, wd = pilih(DINDING), r = Math.SQRT1_2;
    statis.add(mesh(new THREE.BoxGeometry(w, h, d), lam(wd), x, GY + h / 2, z));
    const atap = mesh(new THREE.ConeGeometry(1, 0.62, 4), lam(pilih(ATAP)), x, GY + h + 0.31, z);
    atap.rotation.y = Math.PI / 4; atap.scale.set((w + 0.2) * r, 1, (d + 0.2) * r); statis.add(atap);
    statis.add(mesh(new THREE.BoxGeometry(0.24, 0.42, 0.04), lam('#8A5530'), x, GY + 0.21, z + hadap * (d / 2 + 0.01)));
    for (const a of [-1, 1]) statis.add(mesh(new THREE.BoxGeometry(0.22, 0.22, 0.04), lam('#BDE6FF'), x + a * w * 0.28, GY + 0.5, z + hadap * (d / 2 + 0.01)));
  }

  // ---------- plaza di sekeliling papan ----------
  for (const [a, b] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) nyiur(a * 5.35, b * 5.35, 0.95, PLAZA);
  for (const sisi of [0, 1, 2, 3]) {
    const th = sisi * Math.PI / 2, c = Math.cos(th), s = Math.sin(th);
    const titik = (u, v) => [u * c - v * s, u * s + v * c];
    for (const v of [-2.6, 0, 2.6]) { const [x, z] = titik(5.88, v); lampu(x, z); }
    for (const v of [-1.3, 1.3]) { const [x, z] = titik(5.35, v); bangku(x, z, -th - Math.PI / 2); }
    for (const v of [-4.0, 4.0]) { const [x, z] = titik(5.45, v); pot(x, z); }
  }

  // ---------- utara: kota ----------
  const baris = [[-11.3, 2.2, [2, 4], 'toko'], [-14.7, 2.6, [4, 7], 'kantor'], [-18.7, 3.0, [6, 11], 'kantor'], [-23.2, 3.2, [5, 9], 'kantor']];
  for (const [z, d, [a, b], gaya] of baris) {
    let x = -10.2;
    while (x < 30) {
      const w = 1.5 + rnd() * 1.2;
      if (rnd() < 0.88) gedung(x + w / 2, z + (rnd() - 0.5) * 0.3, w, d, a + Math.floor(rnd() * (b - a + 1)), gaya, 1);
      x += w + 0.35;
    }
  }
  for (let x = -9; x < 30; x += 2.6) pohon(x, -9.75, 0.62);

  // ---------- timur: taman ----------
  const jalanTaman = lam('#F3E3C3');
  statis.add(mesh(new THREE.BoxGeometry(18, 0.02, 1.2), jalanTaman, 18.4, GY + 0.01, 0));
  statis.add(mesh(new THREE.BoxGeometry(1.1, 0.02, 18), jalanTaman, 14.6, GY + 0.01, 0));
  // air mancur
  const AM = [14.6, 0];
  statis.add(mesh(new THREE.CylinderGeometry(1.7, 1.8, 0.32, 24), lam('#E8E4DC'), AM[0], GY + 0.16, AM[1]));
  statis.add(mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.05, 24), lam('#5FD3E6', { emissive: '#1C8BA0', emissiveIntensity: 0.15 }), AM[0], GY + 0.3, AM[1]));
  statis.add(mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.9, 10), lam('#E8E4DC'), AM[0], GY + 0.7, AM[1]));
  statis.add(mesh(new THREE.CylinderGeometry(0.62, 0.28, 0.16, 16), lam('#E8E4DC'), AM[0], GY + 1.15, AM[1]));
  const tetes = new THREE.Group(); scene.add(tetes);
  const matTetes = new THREE.MeshLambertMaterial({ color: '#BFF3FF', emissive: '#6FD8EA', emissiveIntensity: 0.3, transparent: true, opacity: 0.85 });
  const geoTetes = new THREE.SphereGeometry(0.06, 6, 5);
  const daftarTetes = [];
  for (let k = 0; k < 24; k++) { const m = new THREE.Mesh(geoTetes, matTetes); tetes.add(m); daftarTetes.push({ m, a: k / 24 * Math.PI * 2, f: (k % 6) / 6 }); }
  animasi.push((t) => {
    for (const d of daftarTetes) {
      const ph = (t * 0.7 + d.f) % 1, r = 0.15 + ph * 1.15;
      d.m.position.set(AM[0] + Math.cos(d.a) * r, GY + 1.3 + Math.sin(ph * Math.PI) * 0.9 - ph * 0.9, AM[1] + Math.sin(d.a) * r);
    }
  });
  for (const [a, b] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) { pot(AM[0] + a * 2.6, AM[1] + b * 2.6, GY); bangku(AM[0] + a * 2.3, AM[1] + b * 1.05, a > 0 ? -Math.PI / 2 : Math.PI / 2, GY); }
  let ditanam = 0;
  for (let n = 0; n < 400 && ditanam < 30; n++) {
    const x = 10 + rnd() * 16, z = -9 + rnd() * 18;
    if (Math.abs(z) < 1.2 || Math.abs(x - 14.6) < 1.1 || Math.hypot(x - AM[0], z - AM[1]) < 3.2 || (x > 18 && x < 25 && z > -7 && z < 1)) continue;
    pohon(x, z, 0.75 + rnd() * 0.45); ditanam++;
  }
  for (let k = 0; k < 18; k++) semak(10 + rnd() * 15, (rnd() < 0.5 ? -1 : 1) * (1.6 + rnd() * 7), 0.7 + rnd() * 0.5);
  // bianglala (berputar)
  const BG = new THREE.Group(); BG.position.set(21.5, GY, -3.2); BG.rotation.y = Math.PI / 2; scene.add(BG);
  for (const zz of [-0.55, 0.55]) for (const sx of [-1, 1]) {
    const kaki = mesh(new THREE.BoxGeometry(0.14, 4.6, 0.14), lam('#FFFFFF'), sx * 1.05, 2.2, zz); kaki.rotation.z = sx * 0.24; BG.add(kaki);
  }
  const roda = new THREE.Group(); roda.position.y = 4.4; BG.add(roda);
  for (const zz of [-0.35, 0.35]) roda.add(mesh(new THREE.TorusGeometry(3, 0.07, 6, 40), lam('#FF4F87'), 0, 0, zz));
  const kabin = [];
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2;
    const jari = mesh(new THREE.BoxGeometry(0.05, 3, 0.05), lam('#FFFFFF'), Math.cos(a) * 1.5, Math.sin(a) * 1.5, 0); jari.rotation.z = a - Math.PI / 2; roda.add(jari);
    const kb = new THREE.Group(); kb.position.set(Math.cos(a) * 3, Math.sin(a) * 3, 0);
    kb.add(mesh(new THREE.BoxGeometry(0.42, 0.36, 0.5), lam(pilih(['#FFC93C', '#2EC4B6', '#7C5CFF', '#36BE5F', '#FF8A3D', '#3DA5F5'])), 0, -0.3, 0));
    roda.add(kb); kabin.push(kb);
  }
  roda.add(mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.0, 12), lam('#FFC93C'), 0, 0, 0).rotateX(Math.PI / 2));
  animasi.push((t) => { roda.rotation.z = t * 0.12; for (const kb of kabin) kb.rotation.z = -roda.rotation.z; });

  // ---------- selatan: kafe & rumah ----------
  for (let x = -6; x <= 6.5; x += 2.5) payung(x, 10.6, pilih(['#FF6B6B', '#FF9F43', '#3DA5F5', '#36BE5F']));
  for (let x = -9.5; x < 30; x += 2.6) rumah(x + rnd() * 0.3, 14.2 + rnd() * 0.6, 1.7, 1.5, -1);
  for (let x = -9; x < 30; x += 2.6) rumah(x + 1.2 + rnd() * 0.3, 18.6 + rnd() * 0.6, 1.6, 1.5, -1);
  for (let x = -8; x < 30; x += 3.1) pohon(x + rnd(), 12.2, 0.6 + rnd() * 0.2);
  for (let k = 0; k < 14; k++) pohon(-9 + rnd() * 38, 21.5 + rnd() * 6, 0.8 + rnd() * 0.4);

  // ---------- pojok & tepi ----------
  for (let k = 0; k < 10; k++) pohon(9.6 + rnd() * 3, 9.8 + rnd() * 2.5, 0.7 + rnd() * 0.3);
  for (let z = -8; z <= 26; z += 2.4) nyiur(-10.0 + rnd() * 0.4, z + rnd(), 0.9 + rnd() * 0.2);
  for (let z = -26; z < -9; z += 3) nyiur(-10.2, z, 0.9);
  for (let k = 0; k < 6; k++) payung(-11.9, 6 + k * 3.2, pilih(['#FF6B6B', '#FFC93C', '#3DA5F5']), GY);

  // ---------- barat: dermaga, mercusuar ----------
  statis.add(mesh(new THREE.BoxGeometry(5, 0.1, 1.0), kayu, -15.3, GY - 0.12, -3));
  for (let x = -17.5; x <= -13; x += 1.1) for (const z of [-3.45, -2.55]) statis.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6), lam('#8A5A2E'), x, GY - 0.4, z));
  statis.add(mesh(new THREE.CylinderGeometry(2.4, 2.8, 0.7, 16), lam('#F5DB9C'), -24, GY - 0.55, -15));
  statis.add(mesh(new THREE.CylinderGeometry(1.8, 2.2, 0.14, 16), lam('#8BD06A'), -24, GY - 0.13, -15));
  for (let k = 0; k < 6; k++) statis.add(mesh(new THREE.CylinderGeometry(0.42 - k * 0.04, 0.46 - k * 0.04, 0.55, 14), lam(k % 2 ? '#FFFFFF' : '#E8414C'), -24, GY + 0.22 + k * 0.55, -15));
  statis.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 10), lam('#FFF4C2', { emissive: '#FFD54A', emissiveIntensity: 0.8 }), -24, GY + 3.5, -15));
  statis.add(mesh(new THREE.ConeGeometry(0.42, 0.45, 10), lam('#E8414C'), -24, GY + 3.92, -15));

  // ---------- gabungkan semua yang diam ----------
  scene.add(gabung(statis));

  // ---------- yang bergerak: mobil, pejalan kaki, perahu ----------
  const lajur = [{ p: lintasan(6.65, 1.45), arah: 1 }, { p: lintasan(7.55, 2.35), arah: -1 }];
  const WMOBIL = ['#FF4F87', '#FFC93C', '#3DA5F5', '#36BE5F', '#FF8A3D', '#7C5CFF', '#FFFFFF', '#2EC4B6'];
  const mobil = [];
  for (let k = 0; k < 8; k++) {
    const g = new THREE.Group(), w = WMOBIL[k];
    g.add(mesh(new RoundedBoxGeometry(0.82, 0.24, 0.42, 2, 0.08), lam(w), 0, 0.2, 0));
    g.add(mesh(new RoundedBoxGeometry(0.44, 0.2, 0.36, 2, 0.07), lam('#DDF2FF'), -0.04, 0.38, 0));
    for (const [a, b] of [[0.26, 0.2], [-0.26, 0.2], [0.26, -0.2], [-0.26, -0.2]]) { const r = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 10), besi, a, 0.1, b); r.rotation.x = Math.PI / 2; g.add(r); }
    g.add(mesh(new THREE.BoxGeometry(0.03, 0.06, 0.3), lam('#FFF6C9', { emissive: '#FFE27A', emissiveIntensity: 0.5 }), 0.41, 0.22, 0));
    scene.add(g);
    const l = lajur[k % 2];
    mobil.push({ g, l, s: (k >> 1) * l.p.L / 4 + rnd() * 2, v: 1.3 + rnd() * 0.6 });
  }
  animasi.push((t, dt) => {
    for (const m of mobil) {
      m.s += m.v * dt * m.l.arah;
      const p = m.l.p.at(m.s), dx = p.dx * m.l.arah, dz = p.dz * m.l.arah;
      m.g.position.set(p.x, JALAN, p.z); m.g.rotation.y = Math.atan2(-dz, dx);
    }
  });
  const trotoar = lintasan(8.5, 3.3), orang = [];
  for (let k = 0; k < 12; k++) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CapsuleGeometry(0.075, 0.18, 3, 8), lam(pilih(['#FF5E8A', '#3DA5F5', '#FFC93C', '#36BE5F', '#7C5CFF', '#FF8A3D'])), 0, 0.2, 0));
    g.add(mesh(new THREE.SphereGeometry(0.07, 10, 8), lam('#F2C6A0'), 0, 0.43, 0));
    g.add(mesh(new THREE.SphereGeometry(0.072, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), lam(pilih(['#2B1D14', '#5A3A22', '#1B1030'])), 0, 0.45, 0));
    scene.add(g);
    orang.push({ g, s: k * trotoar.L / 12 + rnd(), v: (k % 2 ? 1 : -1) * (0.35 + rnd() * 0.2), off: (k % 2 ? 0.22 : -0.22), f: rnd() * 6 });
  }
  animasi.push((t, dt) => {
    for (const o of orang) {
      o.s += o.v * dt;
      const p = trotoar.at(o.s), arah = Math.sign(o.v);
      o.g.position.set(p.x + p.dz * o.off, TROTOAR + Math.abs(Math.sin(t * 9 + o.f)) * 0.04, p.z - p.dx * o.off);
      o.g.rotation.y = Math.atan2(-p.dz * arah, p.dx * arah);
    }
  });
  const perahu = [];
  for (let k = 0; k < 4; k++) {
    const g = new THREE.Group(), layar = k % 2 === 0;
    g.add(mesh(new RoundedBoxGeometry(1.1, 0.26, 0.46, 2, 0.1), lam('#FFFFFF'), 0, 0.1, 0));
    g.add(mesh(new THREE.BoxGeometry(1.12, 0.06, 0.48), lam(pilih(['#3DA5F5', '#FF4F87', '#FF8A3D'])), 0, 0.02, 0));
    if (layar) {
      g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 5), lam('#8A5A2E'), 0.05, 0.85, 0));
      const s = mesh(new THREE.ConeGeometry(0.42, 1.1, 3), lam('#FFFFFF'), 0.28, 0.8, 0); s.scale.z = 0.08; g.add(s);
    } else g.add(mesh(new RoundedBoxGeometry(0.42, 0.24, 0.36, 2, 0.06), lam('#DDF2FF'), -0.12, 0.33, 0));
    scene.add(g);
    perahu.push({ g, x: -15.5 - k * 2.8, z: -12 + k * 7.5, f: k * 1.7 });
  }
  animasi.push((t) => {
    for (const b of perahu) {
      b.g.position.set(b.x + Math.sin(t * 0.18 + b.f) * 1.4, GY - 0.32 + Math.sin(t * 1.6 + b.f) * 0.04, b.z + Math.cos(t * 0.13 + b.f) * 1.8);
      b.g.rotation.set(Math.sin(t * 1.3 + b.f) * 0.06, Math.PI / 2 + Math.sin(t * 0.18 + b.f) * 0.5, Math.cos(t * 1.1 + b.f) * 0.05);
    }
  });

  return { animasi };
}
