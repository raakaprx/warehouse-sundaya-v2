# 📦 Warehouse Sundaya

![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js)
![Express](https://img.shields.io/badge/Express.js-API-black?logo=express)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-UI-06B6D4?logo=tailwindcss)

## 📖 Tentang Proyek

Warehouse Sundaya merupakan sistem manajemen gudang (Warehouse Management System) berbasis web yang dikembangkan untuk membantu proses pengelolaan inventaris, distribusi material, monitoring stok, serta pelaporan operasional secara terpusat.

Sistem ini dirancang untuk meningkatkan efisiensi operasional gudang dengan menyediakan platform yang mampu mengelola data inventaris secara real-time, mempermudah proses permintaan material, serta menghasilkan laporan yang akurat dan terdokumentasi dengan baik.

Proyek ini dikembangkan menggunakan arsitektur Full Stack JavaScript dengan React sebagai frontend dan Node.js sebagai backend untuk menciptakan sistem yang modern, responsif, dan mudah dikembangkan.

---

## 🎯 Tujuan Pengembangan

Warehouse Sundaya dikembangkan dengan tujuan untuk:

* Mendigitalisasi proses operasional gudang.
* Mempermudah pengelolaan inventaris barang.
* Mengurangi risiko kesalahan pencatatan manual.
* Meningkatkan visibilitas terhadap pergerakan stok.
* Mempermudah monitoring aktivitas gudang.
* Menyediakan laporan operasional yang lebih akurat dan cepat.
* Mendukung pengambilan keputusan berbasis data.

---

## ✨ Fitur Utama

### 📦 Inventory Management

* Pengelolaan data inventaris barang.
* Monitoring ketersediaan stok.
* Pencatatan pergerakan barang.
* Tracking histori inventaris.

### 📝 Material Request Management

* Pembuatan permintaan material.
* Monitoring status permintaan.
* Pelacakan progres permintaan.
* Pengelolaan data distribusi material.

### 📊 Reporting & Analytics

* Laporan inventaris.
* Laporan penggunaan material.
* Export data ke format Excel.
* Generate laporan dalam format PDF.

### 🔔 Notification System

* Notifikasi aktivitas sistem.
* Informasi perubahan data.
* Pembaruan status secara real-time.

### 👥 User Management

* Authentication dan Authorization.
* Manajemen pengguna.
* Pengaturan hak akses.
* Pengelolaan akun pengguna.

### 📁 File Management

* Upload dokumen pendukung.
* Penyimpanan file operasional.
* Manajemen lampiran data.

---

## 🔄 Alur Sistem

Warehouse Sundaya dirancang untuk membantu proses pengelolaan inventaris dan distribusi material secara terstruktur.

Pengguna melakukan login ke dalam sistem menggunakan akun yang telah terdaftar. Setelah berhasil masuk, pengguna dapat melihat informasi inventaris yang tersedia serta membuat permintaan material sesuai kebutuhan operasional.

Setiap permintaan yang dibuat akan tersimpan dalam sistem dan dapat dipantau statusnya secara langsung. Tim gudang kemudian melakukan pengecekan terhadap permintaan tersebut berdasarkan ketersediaan stok yang ada.

Setelah proses distribusi dilakukan, sistem akan memperbarui data inventaris secara otomatis sehingga informasi stok selalu sesuai dengan kondisi aktual di lapangan.

Seluruh aktivitas yang terjadi pada sistem dapat dipantau melalui dashboard dan laporan yang tersedia. Selain itu, pengguna juga akan menerima notifikasi terkait perubahan status maupun aktivitas penting lainnya.

Data operasional yang telah tersimpan dapat diolah menjadi laporan dan diekspor ke dalam format PDF maupun Excel untuk kebutuhan dokumentasi, monitoring, dan analisis bisnis.

---

## 🏗️ Arsitektur Sistem

Sistem dibangun menggunakan pendekatan Client-Server Architecture.

Frontend dikembangkan menggunakan React.js yang bertugas menangani tampilan antarmuka pengguna dan interaksi sistem.

Backend dikembangkan menggunakan Node.js dan Express.js yang bertugas menangani proses bisnis, autentikasi pengguna, pengelolaan data, serta komunikasi dengan database.

Data sistem disimpan menggunakan SQLite melalui Sequelize ORM untuk mempermudah pengelolaan dan integrasi database.

Selain itu, sistem juga mengimplementasikan Socket.IO untuk kebutuhan komunikasi real-time, Nodemailer untuk layanan email, serta PDFKit dan XLSX untuk pembuatan laporan.

---

## 💻 Technology Stack

### Frontend

* React.js
* Vite
* Tailwind CSS
* Axios
* React Router
* Recharts
* React Hot Toast
* Socket.IO Client

### Backend

* Node.js
* Express.js
* Sequelize ORM
* JWT Authentication
* BcryptJS
* Multer
* Nodemailer
* Socket.IO
* Node Cron
* PDFKit
* XLSX

### Database

* SQLite3

### Development Tools

* Git
* GitHub
* Visual Studio Code
* Postman
* npm

---

## 📂 Struktur Proyek

```bash
warehouse-sundaya/
│
├── client/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── server/
│   ├── src/
│   ├── uploads/
│   └── package.json
│
└── README.md
```

---

## ⚙️ Instalasi

### Clone Repository

```bash
git clone https://github.com/raakaprx/warehouse-sundaya.git

cd warehouse-sundaya
```

### Install Frontend

```bash
cd client

npm install
```

### Install Backend

```bash
cd ../server

npm install
```

---

## 🔐 Konfigurasi Environment

Buat file `.env` pada folder server.

```env
PORT=5000

JWT_SECRET=your_secret_key

DB_STORAGE=database.sqlite

EMAIL_USER=your_email

EMAIL_PASSWORD=your_password
```

---

## ▶️ Menjalankan Aplikasi

### Menjalankan Backend

```bash
cd server

npm run dev
```

### Menjalankan Frontend

```bash
cd client

npm run dev
```

Frontend akan berjalan pada:

```text
http://localhost:5173
```

Backend akan berjalan pada:

```text
http://localhost:5000
```

---

## 🔒 Keamanan Sistem

Sistem telah menerapkan beberapa mekanisme keamanan, di antaranya:

* JWT Authentication
* Password Hashing menggunakan Bcrypt
* Protected API Routes
* User Authorization
* Secure File Upload Handling
* Session Validation

---

## 🎓 Informasi Proyek

**Project Type**
Warehouse Management System

**Development Type**
Internship Project & Portfolio Project

**Category**
Business Information System

**Development Approach**
Full Stack Web Development

**Status**
Active Development

---

## 🚀 Pengembangan Selanjutnya

Beberapa pengembangan yang direncanakan untuk meningkatkan kapabilitas sistem:

* Migrasi Database ke MySQL atau PostgreSQL.
* Dukungan Multi Warehouse.
* Dashboard Analitik yang lebih komprehensif.
* Integrasi Barcode Scanner.
* Integrasi QR Code Tracking.
* Mobile Application.
* Audit Trail yang lebih detail.
* Monitoring stok otomatis.
* Sistem Approval Berjenjang.
* Integrasi Email Notification yang lebih luas.

---

## 👨‍💻 Pengembang

**Muhammad Raka Pradana**

Mahasiswa Sistem Informasi Universitas Telkom Purwokerto yang berfokus pada pengembangan aplikasi web, sistem informasi bisnis, dan solusi digital berbasis teknologi modern.

### Connect With Me

GitHub:
https://github.com/raakaprx

LinkedIn:
https://www.linkedin.com/in/muhammadrakapradana/

Email:
[rakapradana.work@gmail.com](mailto:rakapradana.work@gmail.com)

---

## 📄 Lisensi

Proyek ini dibuat untuk kebutuhan pembelajaran, pengembangan portofolio, dan implementasi sistem operasional bisnis berbasis web.

© 2026 Muhammad Raka Pradana
