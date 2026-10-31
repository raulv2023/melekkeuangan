# Melek Keuangan — papan 3D (kota & taman)

Ini adalah game **Melek Keuangan** milik Anda yang sama persis, ditambah lapisan papan 3D.
Aturan main, kartu, LKPD, materi, bank, suara, dan semua angka **tidak diubah**.

## Apa yang berubah

```
index.html               ← game Anda + 4 kait satu baris + tombol "Papan 3D"
papan3d/papan3d.js       ← papan 3D: petak, bidak, dadu, tumpukan kartu, kamera
papan3d/latar.js         ← latar kota & taman (jalan, mobil, gedung, taman, laut)
papan3d/vendor/          ← Three.js r160 (disertakan, tidak perlu internet)
```

Di `index.html` cari tulisan **`[3D]`**. Hanya ada 4 kait satu baris:

| Fungsi Anda | Kait yang ditambahkan |
|---|---|
| `initGame()` | `PAPAN3D.mulai()` (membangun papan 3D) |
| `rollDice()` | `PAPAN3D.lemparDadu(r)` (dadu 3D dilempar) |
| `floatTxt()` | `PAPAN3D.teks(...)` (angka +/− muncul di atas bidak 3D) |
| `cycleView()` | `PAPAN3D.gantiSudut()` (tombol sudut pandang menggerakkan kamera) |

Papan 2D lama **tetap dibangun dan tetap diperbarui**, hanya disembunyikan. Akibatnya:
- Tombol **🧊 Papan 3D / 🟦 Papan 2D** di menu atas bisa menukar keduanya kapan saja, posisi bidak tetap sama.
- Kalau komputer sekolah tidak mendukung WebGL, papan 2D otomatis dipakai dan tombolnya disembunyikan.
- Laptop yang terlalu berat otomatis diturunkan kualitasnya (resolusi lalu bayangan).

## Cara kerja papan 3D

Papan 3D hanya **membaca** keadaan permainan, tidak pernah mengubahnya:
- `P[i].pos` berubah → bidak melompat petak demi petak, petak memantul saat diinjak.
- `P[i].out` → gambar bidak berganti `bidak-gugur`.
- `cur` → cincin dan panah di bawah/atas bidak yang sedang giliran, kamera mendekat saat bidak berjalan.
- `DK.mus/anu/god/q` → tinggi tumpukan kartu di tengah papan; kartu "terbang" saat diambil.

Gambar petak (`petak-*`) dan gambar bidak (`bidak-*`) diambil langsung dari `ASET_DATA` Anda.

### Kalau Anda mengganti nama sesuatu di kode utama
`papan3d.js` bergantung pada nama-nama ini. Kalau diganti, sesuaikan juga di `papan3d.js`:
- variabel: `P`, `cur`, `DK`, `TILE`, `NT`, `GRAD`, `NAMAPENDEK`, `ASET`
- fungsi: `tilePos()`, `terapkanView()`, `layout()`
- elemen: `#game`, `#boardwrap`, `#board`, `#center`, `#diceres`, `#fly`, `#viewBtn`, `#ov`
- kunci gambar: `petak-gajian` dst., `bidak-…` (dari `PROF[].bidak`), `bidak-gugur`

Menambah petak atau kartu baru **tidak perlu** mengubah papan 3D selama memakai pola yang sama.

## Kontrol kamera
- Tombol **🎥 Miring → 🗺 Isometrik → 📐 Atas** (tombol sudut pandang yang sudah ada).
- Tetikus: seret di papan untuk memutar, gulir untuk zoom, klik dua kali untuk kembali.

## Mengubah latar
Semua isi kota & taman ada di `papan3d/latar.js`: utara gedung kota, timur taman + air mancur + bianglala,
barat pantai + dermaga + mercusuar, selatan kafe payung + rumah. Warna gedung ada di `DINDING` dan `ATAP`,
warna mobil di `WMOBIL`. Untuk tema lain (sekolah, pasar, desa), cukup buat berkas latar baru dengan fungsi
`bangunLatar` yang sama lalu ganti `import` di baris atas `papan3d.js`.

## Menjalankan di komputer
Karena memakai modul JavaScript, buka lewat server lokal (bukan klik dua kali):
```bash
npx serve .            # atau
python -m http.server 8080
```

## Deploy gratis
**GitHub Pages**: upload seluruh isi folder ke repo → Settings → Pages → Deploy from branch → `main` / root.

**Vercel**: import repo → Framework: Other → Build command kosong → Output directory `.` → Deploy.

## Memasang di Blogspot
Blogger tidak bisa menampung berkas `.js` terpisah, jadi host game di GitHub Pages/Vercel lalu tempel ini di
postingan (mode HTML):
```html
<iframe src="https://USERNAME.github.io/NAMA-REPO/" style="width:100%;height:92vh;border:0;border-radius:12px"
        allow="autoplay; fullscreen" loading="lazy"></iframe>
```
Setiap pembaruan cukup di-push ke GitHub; postingan blog tidak perlu disentuh lagi.
