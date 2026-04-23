# Review dan Revisi Bab 4

## Kesimpulan Singkat

Bab 4 pada dokumen skripsi masih **belum sepenuhnya sesuai** dengan implementasi sistem yang ada pada project saat ini. Masalah utamanya bukan hanya pada redaksi, tetapi juga pada:

- ketidakkonsistenan struktur subbab,
- perbedaan antara fitur yang ditulis dengan fitur yang benar-benar ada di sistem,
- pembahasan yang masih dominan deskriptif dan belum cukup analitis,
- serta beberapa klaim implementasi yang berpotensi dipertanyakan saat sidang.

## Temuan Utama

### 1. Struktur Bab 4 belum rapi

Pada hasil ekstraksi dokumen, Bab 4 dimulai dari `HASIL DAN PEMBAHASAN`, lalu:

- `4.1 ITERASI SATU`
- setelah itu langsung muncul bagian `4.2.3.3 Implementasi Halaman Material Requests (Updated)`
- lalu `4.2.4 Pengujian`
- kemudian `4.3 ITERASI TIGA`

Ini menunjukkan struktur `Iterasi Dua` tidak lengkap atau tidak konsisten. Idealnya setiap iterasi memiliki pola yang sama:

1. `Planning`
2. `Design`
3. `Coding/Implementasi`
4. `Testing`
5. `Analisis hasil iterasi`

### 2. Bab 4 masih berisi hasil, tetapi pembahasannya belum kuat

Judul bab adalah `Hasil dan Pembahasan`, tetapi isi mayoritas masih berupa:

- penjelasan screenshot,
- daftar tabel,
- penjelasan activity/use case,
- dan klaim keberhasilan.

Bab 4 seharusnya juga menjawab:

- bagaimana hasil sistem menyelesaikan rumusan masalah,
- bagaimana fitur mendukung tujuan penelitian,
- bagian mana yang berhasil,
- bagian mana yang masih terbatas,
- dan bagaimana hasil ini dibandingkan dengan kebutuhan awal stakeholder.

### 2a. Klaim XP berbasis TDD belum terlihat pada artefak implementasi

Pada bab sebelumnya Anda beberapa kali menekankan penggunaan Extreme Programming dan Test-Driven Development. Namun pada project saat ini saya tidak menemukan artefak pengujian terotomasi yang menunjukkan praktik TDD secara jelas, seperti:

- unit test,
- integration test,
- file `*.test.*` atau `*.spec.*` milik aplikasi,
- ataupun penjelasan siklus red-green-refactor pada Bab 4.

Artinya, jika Bab 4 tetap menuliskan bahwa TDD telah diterapkan, Anda perlu:

- menambahkan bukti pengujian terotomasi yang nyata,
- atau menurunkan klaim menjadi penerapan XP secara iteratif dengan fokus pada `planning`, `feedback`, `refactoring`, `black box testing`, dan `UAT`.

Secara akademik, pilihan kedua lebih aman jika memang sistem belum memiliki test suite otomatis yang terdokumentasi.

### 3. Klaim implementasi database tidak sesuai dengan project saat ini

Dalam Bab 4 tertulis implementasi menggunakan `MySQL` dan ditunjukkan dalam bentuk `CREATE TABLE ...`.

Namun implementasi project saat ini menggunakan:

- `Sequelize`
- `SQLite`

Lihat:

- [database.js](/D:/SEMESTER%208/Projek%20Akhir/warehouse%20sundaya/server/src/config/database.js)

Jadi kalau sistem yang akan Anda presentasikan adalah project ini, maka bagian Bab 4 harus direvisi menjadi:

- database diimplementasikan menggunakan `SQLite` untuk penyimpanan lokal,
- ORM `Sequelize` digunakan untuk mendefinisikan model dan relasi,
- bukan implementasi manual DDL MySQL.

### 4. Model data pada Bab 4 tidak sesuai dengan model aktual sistem

Bab 4 masih menyederhanakan model menjadi:

- `Users`
- `MaterialRequest`
- `Material`
- `Stock`
- `Distribution`
- `Notification`
- `Site`
- `UsedMaterial`

Padahal pada project saat ini model yang benar adalah:

- `User`
- `Site`
- `Material`
- `Inventory`
- `MaterialRequest`
- `MaterialRequestItem`
- `StockMovement`
- `Alert`
- `Notification`
- `AuditLog`
- `UsedMaterialReport`

Lihat:

- [models/index.js](/D:/SEMESTER%208/Projek%20Akhir/warehouse%20sundaya/server/src/models/index.js)
- [MaterialRequest.js](/D:/SEMESTER%208/Projek%20Akhir/warehouse%20sundaya/server/src/models/MaterialRequest.js)
- [MaterialRequestItem.js](/D:/SEMESTER%208/Projek%20Akhir/warehouse%20sundaya/server/src/models/MaterialRequestItem.js)
- [Alert.js](/D:/SEMESTER%208/Projek%20Akhir/warehouse%20sundaya/server/src/models/Alert.js)
- [AuditLog.js](/D:/SEMESTER%208/Projek%20Akhir/warehouse%20sundaya/server/src/models/AuditLog.js)
- [UsedMaterialReport.js](/D:/SEMESTER%208/Projek%20Akhir/warehouse%20sundaya/server/src/models/UsedMaterialReport.js)

Artinya class diagram dan penjelasan relasi di Bab 4 perlu disesuaikan.

### 5. Penjelasan auto-alert pada Bab 4 belum akurat

Di Bab 4 terdapat narasi bahwa alert aktif saat stok turun di bawah `5 unit`.

Pada project aktual:

- threshold disimpan per item dan per site melalui field `minThreshold`,
- alert dipicu saat `stock <= minThreshold`,
- threshold dapat diperbarui,
- alert tidak hanya tampil di halaman, tapi juga memicu:
  - `Alert`,
  - `Notification`,
  - `socket event`,
  - dan email.

Lihat:

- [Inventory.js](/D:/SEMESTER%208/Projek%20Akhir/warehouse%20sundaya/server/src/models/Inventory.js)
- [cron.js](/D:/SEMESTER%208/Projek%20Akhir/warehouse%20sundaya/server/src/utils/cron.js)
- [notificationController.js](/D:/SEMESTER%208/Projek%20Akhir/warehouse%20sundaya/server/src/controllers/notificationController.js)
- [SystemAlerts.jsx](/D:/SEMESTER%208/Projek%20Akhir/warehouse%20sundaya/client/src/pages/SystemAlerts.jsx)

Jadi deskripsi yang lebih tepat adalah:

> Sistem melakukan pengecekan stok secara periodik. Ketika nilai `stock` pada suatu material di site tertentu lebih kecil atau sama dengan `minThreshold`, sistem otomatis membentuk data alert, membuat notifikasi ke pengguna terkait, mengirim event realtime, dan menampilkan peringatan pada halaman `System Alerts`.

### 6. Klaim fitur `Return Barang Rusak` tidak sepenuhnya cocok dengan implementasi

Bab 4 Iterasi Tiga menjelaskan adanya modul khusus `Return Barang Rusak` dengan tabel `returns`, alur verifikasi NOC, dan laporan return.

Pada project saat ini saya **tidak menemukan model atau route khusus `returns`**. Yang tersedia justru:

- `UsedMaterialReport`
- field seperti `returnSite`, `condition`, `photo`, dan `status`
- halaman `Used Materials`

Lihat:

- [UsedMaterialReport.js](/D:/SEMESTER%208/Projek%20Akhir/warehouse%20sundaya/server/src/models/UsedMaterialReport.js)
- [usedMaterialController.js](/D:/SEMESTER%208/Projek%20Akhir/warehouse%20sundaya/server/src/controllers/usedMaterialController.js)
- [UsedMaterials.jsx](/D:/SEMESTER%208/Projek%20Akhir/warehouse%20sundaya/client/src/pages/UsedMaterials.jsx)

Jadi jika Anda memakai codebase ini saat sidang, lebih aman jika Bab 4 diubah dari:

- `Return Barang Rusak`

menjadi:

- `Pelaporan Material Bekas/Rusak`
- atau `Used Materials dan proses tindak lanjut`

Kecuali Anda memang benar-benar memiliki versi sistem lain yang sudah punya modul `returns`.

### 7. Role pengguna di Bab 4 tidak lagi mencerminkan sistem final

Bab 4 hanya menulis tiga aktor:

- OM
- NOC
- GM

Padahal pada project saat ini ada role tambahan:

- `PROGRAMMER`

Lihat:

- [User.js](/D:/SEMESTER%208/Projek%20Akhir/warehouse%20sundaya/server/src/models/User.js)
- [App.jsx](/D:/SEMESTER%208/Projek%20Akhir/warehouse%20sundaya/client/src/App.jsx)

Kalau role `PROGRAMMER` hanya untuk kebutuhan teknis/pengembangan, maka di Bab 4 bisa ditulis sebagai:

> Selain tiga aktor utama penelitian (OM, NOC, GM), pada implementasi sistem terdapat role tambahan `Programmer` yang digunakan untuk administrasi teknis dan pengujian sistem.

### 8. Material request di Bab 4 masih ditulis seolah satu request hanya satu item

Di Bab 4, struktur `material_requests` masih memakai:

- `material_id`
- `quantity`

seolah satu request hanya memuat satu material.

Padahal implementasi aktual memakai:

- `MaterialRequest`
- `MaterialRequestItem`

yang berarti satu request dapat memuat banyak item.

Lihat:

- [MaterialRequest.js](/D:/SEMESTER%208/Projek%20Akhir/warehouse%20sundaya/server/src/models/MaterialRequest.js)
- [MaterialRequestItem.js](/D:/SEMESTER%208/Projek%20Akhir/warehouse%20sundaya/server/src/models/MaterialRequestItem.js)
- [requestRoutes.js](/D:/SEMESTER%208/Projek%20Akhir/warehouse%20sundaya/server/src/routes/requestRoutes.js)

Ini penting karena jika dosen melihat ERD/class diagram dan alur request Anda, beliau bisa bertanya kenapa implementasi aktual sudah multi-item tapi penjelasan skripsi masih single-item.

### 9. Notifikasi dan system alerts perlu dijelaskan lebih hati-hati

Di Bab 4 ada klaim badge notifikasi tertentu seperti `234` dan `326`. Ini berisiko dipandang sebagai angka kosmetik jika tidak dijelaskan sumber datanya.

Pada implementasi aktual:

- `Notifications` menggunakan data unread notification,
- `System Alerts` mengambil data alert,
- tetapi di sidebar count masih mengambil unread count notification untuk badge alert.

Lihat:

- [Sidebar.jsx](/D:/SEMESTER%208/Projek%20Akhir/warehouse%20sundaya/client/src/components/Sidebar.jsx)

Saran:

- hindari angka spesifik pada deskripsi naratif jika itu hanya data contoh,
- cukup tulis bahwa badge menampilkan jumlah notifikasi/alert aktif berdasarkan data sistem.

### 10. Audit log ada, tetapi deskripsi di Bab 4 perlu disesuaikan

Bab 4 menulis `audit_logs` dengan struktur yang cukup detail (`entity_type`, `old_value`, `new_value`, dll).

Implementasi aktual `AuditLog` lebih sederhana:

- `userId`
- `action`
- `details`
- `module`
- `ipAddress`
- `timestamp`

Lihat:

- [AuditLog.js](/D:/SEMESTER%208/Projek%20Akhir/warehouse%20sundaya/server/src/models/AuditLog.js)

Jadi Bab 4 sebaiknya menjelaskan sesuai model aktual, bukan model konseptual yang belum diwujudkan.

## Rekomendasi Revisi Struktur Bab 4

Struktur Bab 4 yang lebih aman:

### 4.1 Iterasi Satu

- 4.1.1 Planning
- 4.1.2 Design
- 4.1.3 Coding/Implementasi
- 4.1.4 Testing
- 4.1.5 Analisis Hasil Iterasi Satu

Isi Iterasi Satu:

- login dan autentikasi,
- manajemen inventory dasar,
- material request dasar,
- shipping,
- receiving,
- used materials,
- auto-alert stok dasar,
- audit log dasar.

### 4.2 Iterasi Dua

- 4.2.1 Planning
- 4.2.2 Design
- 4.2.3 Coding/Implementasi
- 4.2.4 Testing
- 4.2.5 Analisis Hasil Iterasi Dua

Isi Iterasi Dua:

- penyempurnaan UI/UX,
- perbaikan dashboard,
- perbaikan halaman material request,
- penyempurnaan visualisasi alur,
- evaluasi feedback pengguna.

### 4.3 Iterasi Tiga

- 4.3.1 Planning
- 4.3.2 Design
- 4.3.3 Coding/Implementasi
- 4.3.4 Testing
- 4.3.5 Analisis Hasil Iterasi Tiga

Isi Iterasi Tiga yang lebih sesuai codebase:

- notifications dan system alerts,
- laporan dan export,
- audit logs,
- penyempurnaan used materials sebagai pelaporan material rusak/bekas,
- bukan modul `returns` terpisah kecuali memang tersedia di versi final Anda.

### 4.4 Pembahasan Umum

Bagian ini sebaiknya ditambahkan agar Bab 4 benar-benar layak disebut `Hasil dan Pembahasan`.

Isi yang disarankan:

- keterkaitan hasil sistem dengan rumusan masalah,
- keterkaitan hasil dengan tujuan penelitian,
- bagaimana XP membantu pengembangan bertahap,
- kelebihan sistem,
- keterbatasan sistem,
- peluang pengembangan lanjutan.

## Rekomendasi Revisi Isi yang Paling Penting

### A. Revisi narasi implementasi database

Narasi lama:

> Implementasi database dilakukan menggunakan MySQL. Struktur tabel diwujudkan dengan perintah DDL.

Narasi revisi:

> Implementasi basis data pada sistem dilakukan menggunakan SQLite yang terintegrasi melalui ORM Sequelize pada sisi backend Node.js. Pendekatan ini memudahkan pengelolaan model data, relasi antartabel, serta sinkronisasi struktur basis data selama proses pengembangan iteratif menggunakan metode Extreme Programming.

### B. Revisi narasi auto-alert

Narasi revisi:

> Fitur auto-alert diimplementasikan untuk memantau stok material pada setiap site secara periodik. Sistem membandingkan nilai `stock` terhadap `minThreshold` pada data inventory. Jika stok berada pada kondisi kurang dari atau sama dengan batas minimum, sistem secara otomatis membuat data alert, menyimpan notifikasi untuk pengguna terkait, serta mengirimkan informasi secara realtime ke antarmuka pengguna melalui mekanisme socket.

### C. Revisi narasi class diagram

Narasi revisi:

> Class diagram sistem final tidak hanya memuat entitas pengguna, material, site, dan permintaan material, tetapi juga melibatkan entitas `Inventory`, `MaterialRequestItem`, `Notification`, `Alert`, `StockMovement`, `AuditLog`, serta `UsedMaterialReport`. Penambahan entitas tersebut mencerminkan kebutuhan sistem terhadap pencatatan stok per site, permintaan multi-item, pelacakan pergerakan stok, mekanisme auto-alert, serta jejak audit aktivitas pengguna.

### D. Revisi iterasi tiga

Jika mengikuti codebase saat ini, narasi Iterasi Tiga lebih aman ditulis:

> Iterasi Tiga difokuskan pada penguatan monitoring dan kontrol operasional, yaitu melalui implementasi halaman `Notifications`, `System Alerts`, `Audit Logs`, `Reports`, serta penguatan modul `Used Materials` untuk pelaporan material bekas atau rusak. Iterasi ini bertujuan meningkatkan visibilitas kondisi operasional, memperkuat monitoring aktivitas sistem, dan menyediakan keluaran laporan yang dapat digunakan dalam evaluasi manajerial.

## Bagian yang Harus Segera Diperbaiki

1. Perbaiki struktur dan penomoran subbab Bab 4.
2. Tambahkan bagian `analisis hasil` di setiap iterasi.
3. Selaraskan klaim XP/TDD dengan bukti pengujian yang benar-benar ada.
4. Samakan teknologi implementasi dengan sistem yang benar-benar digunakan.
5. Sesuaikan ERD/class diagram dengan model aktual.
6. Ubah penjelasan auto-alert dari threshold tetap `5 unit` menjadi `minThreshold`.
7. Hapus atau revisi klaim modul `return barang rusak` jika belum benar-benar ada.
8. Jelaskan role `PROGRAMMER` sebagai role teknis tambahan, atau keluarkan dari pembahasan jika tidak termasuk ruang lingkup penelitian.
9. Sesuaikan penjelasan request menjadi mendukung multi-item.
10. Hindari angka badge notifikasi yang terlalu spesifik jika hanya berasal dari data contoh.
11. Tambahkan pembahasan umum yang menghubungkan hasil dengan rumusan masalah dan tujuan penelitian.

## Kalimat Penilaian Akademik

Jika dinilai dari sisi akademik, Bab 4 Anda sudah memiliki bahan yang kuat karena:

- sudah memecah pengembangan ke dalam iterasi,
- sudah memuat implementasi dan pengujian,
- dan sudah mencoba menghubungkan hasil dengan kebutuhan stakeholder.

Namun Bab 4 masih perlu direvisi agar:

- konsisten secara struktur,
- valid terhadap implementasi aktual,
- dan lebih kuat secara analitis.

Jika tidak diperbaiki, risiko terbesarnya saat sidang adalah dosen akan menangkap adanya perbedaan antara dokumen dan sistem yang didemokan.
