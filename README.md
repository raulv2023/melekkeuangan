# Melek Keuangan — papan 3D & 2D

Game **Melek Keuangan** Anda, ditambah lapisan tampilan yang memasang dirinya sendiri.
Aturan main, kartu, LKPD, materi, panduan guru, bank, suara, dan semua angka **tidak diubah**.

## Satu-satunya syarat di HTML Anda

Baris ini harus ada **tepat sebelum `</body>`** di `index.html`:

```html
<script type="module" src="papan3d/papan3d.js"></script>
```

Itu saja. Setiap kali Anda memperbarui HTML, cukup pastikan baris ini tetap ada.
Tidak ada kait lain yang perlu ditempel di dalam kode Anda.

## Pengantar & tutorial (baru)
Setelah budgeting, sebelum giliran pertama, muncul:
1. Kartu **Misi kamu**: tujuan permainan, cara menang (target 20%/30% mengikuti durasi), dan manfaat per bab materi.
2. **Tutorial 6 langkah** yang menyorot bagian layar sungguhan: papan, dadu, arti petak, kartu pemain, Bank, tombol bantuan.

Bisa dilewati, dan bisa diputar ulang lewat tombol **Tutorial** di layar Aturan main (timer otomatis dijeda).
Kalimat tujuan disimpan di `TUJUAN_GAME` dan dipakai juga di Aturan main, jadi cukup diubah di satu tempat.

## Musik latar (baru)
Tiga lagu diputar bergantian dari folder `musik/`, dan bisa dilompati dengan tombol **⏭ Lagu berikutnya**
di panel Suara. Daftarnya ada di `LAGU` dalam `index.html`.

| Berkas | Lagu |
|---|---|
| `musik/something-broke.mp3` | Something Broke — Mark Fabian |
| `musik/cat-walk.mp3` | Cat Walk — Roie Shpigler |
| `musik/jellybean-heist.mp3` | Jellybean Heist (Creative Cut – Alternative) — Steven Beddall |

Berkas yang tidak ada dilewati otomatis. Kalau seluruh folder `musik/` hilang, permainan memakai nada bangkitan.

## Dua mode (tombol "Papan 3D / Papan 2D" di menu atas)

| | Mode 3D | Mode 2D |
|---|---|---|
| Papan | 28 petak 3D di tengah kota & taman | papan 2D asli Anda |
| Bidak | tokoh 3D warna profesi, bertopi sesuai profesi | bidak bergambar asli Anda |
| Dadu | dadu 3D dilempar di atas papan | dadu 3D dilempar di tengah papan 2D |
| Kamera | Miring / Isometrik / Atas, seret & gulir tetikus | sudut pandang asli (Datar/Miring/Isometrik) |

Pilihan mode diingat browser. Papan 3D baru dibangun saat dipakai, jadi mode 2D tetap ringan.

Topi per profesi: CEO mahkota · Staf Bank topi tinggi · Admin headset · Perawat topi perawat ·
Pegawai Pabrik helm proyek · Kasir topi · Barista baret · Montir topi terbalik · Guru Honorer kacamata ·
Pedagang Bakso ikat kepala · Ojol helm hijau · Konten Kreator headphone.
(Diatur di `TOPI` dalam `papan3d/papan3d.js`, dibaca dari nomor di `PROF[].bidak`.)

## Cara kerjanya

`papan3d.js` membungkus empat fungsi Anda tanpa mengubah isinya — fungsi asli tetap dipanggil:

| Fungsi Anda | Yang ditambahkan |
|---|---|
| `initGame()` | membangun papan 3D |
| `daduIncar()` | melempar dadu 3D dengan angka hasil undian |
| `floatTxt()` | (mode 3D) angka +/− muncul di atas tokoh 3D |
| `cycleView()` | (mode 3D) tombol sudut pandang menggerakkan kamera |

Papan 3D hanya **membaca** keadaan permainan (`P`, `cur`, `DK`, `TILE`, `ASET`) dan tidak pernah mengubahnya.

Pengaman:
- Dibuka dengan klik dua kali (alamat `file://`) atau di komputer tanpa WebGL → game berjalan dalam 2D asli, termasuk dadu CSS asli.
- Laptop berat → resolusi lalu bayangan diturunkan otomatis.
- HTML versi lama yang masih berisi kait `[3D]` manual tetap jalan (dadu tidak terlempar dua kali).

### Kalau Anda mengganti nama sesuatu di kode utama
Nama yang dipakai papan 3D: variabel `P`, `cur`, `DK`, `TILE`, `NT`, `GRAD`, `NAMAPENDEK`, `ASET`, `PROF[].bidak`;
fungsi `initGame`, `daduIncar`, `floatTxt`, `cycleView`, `tilePos`, `terapkanView`, `layout`;
elemen `#game`, `#boardwrap`, `#board`, `#center`, `#diceres`, `#fly`, `#viewBtn`, `#ov`.
Menambah petak, kartu, materi, atau aturan baru **tidak perlu** mengubah papan 3D.

## Struktur folder
```
index.html               ← game Anda + 1 baris di atas </body>
musik/                   ← tiga lagu latar (mp3, ±1,5 MB per lagu)
papan3d/papan3d.js       ← papan, tokoh, dadu, kamera, dadu mini mode 2D
papan3d/latar.js         ← latar kota & taman
papan3d/vendor/          ← Three.js r160 (disertakan, tidak perlu internet)
```

## Menjalankan di komputer
Buka lewat server lokal, bukan klik dua kali: `npx serve .` atau `python -m http.server 8080`.

## Deploy & Blogspot
Lihat dokumen "Panduan Unggah Melek Keuangan 3D". Singkatnya: unggah `index.html`, folder `papan3d`, dan folder `musik`
ke repo GitHub (Settings → Pages → Deploy from a branch → main / root), atau sambungkan repo ke Vercel
(Framework: Other, Output Directory `.`). Di Blogspot, tempel `<iframe>` yang menunjuk ke alamat itu.
