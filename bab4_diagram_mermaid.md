# Diagram Bab 4

Diagram-diagram berikut disusun untuk menggantikan placeholder kosong pada Bab 4.
Seluruh diagram diselaraskan dengan implementasi sistem yang ada pada project saat ini.

## Gambar 4.1 Use Case Diagram Iterasi Satu

```mermaid
flowchart LR
    OM[OM]
    NOC[NOC]
    GM[GM]

    UC1((Login))
    UC2((Logout))
    UC3((Lihat Site Overview))
    UC4((Ajukan Material Request))
    UC5((Lihat Status Request))
    UC6((Konfirmasi Penerimaan))
    UC7((Lapor Used Materials))
    UC8((Lihat Stock View))
    UC9((Review Request))
    UC10((Kelola Stock Master))
    UC11((Proses Shipping))
    UC12((Pantau NOC Control))
    UC13((Approve / Reject Request))
    UC14((Lihat Executive Monitor))
    UC15((Pantau System Alerts))

    OM --> UC1
    OM --> UC2
    OM --> UC3
    OM --> UC4
    OM --> UC5
    OM --> UC6
    OM --> UC7
    OM --> UC8

    NOC --> UC1
    NOC --> UC2
    NOC --> UC9
    NOC --> UC10
    NOC --> UC11
    NOC --> UC12
    NOC --> UC15

    GM --> UC1
    GM --> UC2
    GM --> UC13
    GM --> UC14
    GM --> UC15
```

## Gambar 4.2 Activity Diagram Login

```mermaid
flowchart TD
    A([Mulai]) --> B[Buka halaman login]
    B --> C[Input username dan password]
    C --> D[Klik tombol masuk]
    D --> E{Kredensial valid?}
    E -- Tidak --> F[Tampilkan pesan gagal login]
    F --> C
    E -- Ya --> G[Ambil data user dan role]
    G --> H{Role pengguna}
    H -- OM --> I[Masuk ke Site Dashboard]
    H -- NOC --> J[Masuk ke NOC Dashboard]
    H -- GM --> K[Masuk ke Executive Dashboard]
    H -- PROGRAMMER --> L[Masuk ke Programmer Dashboard]
    I --> M([Selesai])
    J --> M
    K --> M
    L --> M
```

## Gambar 4.3 Activity Diagram Material Request oleh OM

```mermaid
flowchart TD
    A([Mulai]) --> B[OM membuka halaman Material Requests]
    B --> C[Isi data request: site, project, item, quantity, deskripsi]
    C --> D[Klik submit]
    D --> E{Data valid?}
    E -- Tidak --> F[Tampilkan pesan validasi]
    F --> C
    E -- Ya --> G[Simpan MaterialRequest dengan status PENDING]
    G --> H[Simpan item ke MaterialRequestItem]
    H --> I[Buat audit log]
    I --> J[Kirim event realtime new_material_request]
    J --> K[Tampilkan request pada daftar]
    K --> L([Selesai])
```

## Gambar 4.4 Activity Diagram NOC Technical Review

```mermaid
flowchart TD
    A([Mulai]) --> B[NOC membuka daftar request]
    B --> C[Pilih request berstatus PENDING]
    C --> D[Tinjau item, quantity, dan kebutuhan proyek]
    D --> E{Request disetujui NOC?}
    E -- Tidak --> F[Isi alasan penolakan]
    F --> G[Ubah status menjadi REJECTED]
    G --> H[Buat notifikasi ke requester]
    H --> I[Buat audit log]
    I --> Z([Selesai])
    E -- Ya --> J[Isi catatan teknis NOC]
    J --> K[Ubah status menjadi REVIEWED_BY_NOC]
    K --> L[Kirim event request_reviewed]
    L --> M[Buat notifikasi ke requester]
    M --> N[Buat audit log]
    N --> Z
```

## Gambar 4.5 Activity Diagram Persetujuan GM

```mermaid
flowchart TD
    A([Mulai]) --> B[GM membuka daftar request]
    B --> C[Pilih request berstatus REVIEWED_BY_NOC]
    C --> D[Tinjau catatan NOC dan kebutuhan proyek]
    D --> E{Request disetujui GM?}
    E -- Tidak --> F[Isi alasan penolakan]
    F --> G[Ubah status menjadi REJECTED]
    G --> H[Kirim notifikasi ke requester]
    H --> I[Buat audit log]
    I --> Z([Selesai])
    E -- Ya --> J[Ubah status menjadi APPROVED_BY_GM]
    J --> K[Kirim event request_approved]
    K --> L[Kirim notifikasi ke requester]
    L --> M[Kirim email pemberitahuan]
    M --> N[Buat audit log]
    N --> Z
```

## Gambar 4.6 Activity Diagram Shipping Control

```mermaid
flowchart TD
    A([Mulai]) --> B[NOC membuka Shipping Control]
    B --> C[Pilih request berstatus APPROVED_BY_GM]
    C --> D[Isi nomor resi, ETA, dan unggah foto pengiriman]
    D --> E{Data pengiriman lengkap?}
    E -- Tidak --> F[Tampilkan pesan gagal]
    F --> D
    E -- Ya --> G[Kurangi stok gudang pusat]
    G --> H[Catat stock movement pengiriman]
    H --> I[Ubah status request menjadi ON_DELIVERY]
    I --> J[Kirim event request_shipped]
    J --> K[Buat notifikasi ke requester]
    K --> L[Buat audit log]
    L --> M([Selesai])
```

## Gambar 4.7 Activity Diagram Konfirmasi Penerimaan

```mermaid
flowchart TD
    A([Mulai]) --> B[OM membuka detail request]
    B --> C[Pilih request berstatus ON_DELIVERY]
    C --> D[Unggah foto bukti penerimaan]
    D --> E{Bukti penerimaan tersedia?}
    E -- Tidak --> F[Tampilkan pesan validasi]
    F --> D
    E -- Ya --> G[Ubah status request menjadi FULFILLED]
    G --> H[Tambahkan stok ke site tujuan]
    H --> I[Catat stock movement penerimaan]
    I --> J[Buat notifikasi ke requester]
    J --> K[Buat audit log]
    K --> L([Selesai])
```

## Gambar 4.8 Activity Diagram Used Materials

```mermaid
flowchart TD
    A([Mulai]) --> B[OM membuka halaman Used Materials]
    B --> C[Isi form material, quantity, kondisi, return site, deskripsi]
    C --> D[Unggah foto jika ada]
    D --> E[Klik submit]
    E --> F{Data valid?}
    F -- Tidak --> G[Tampilkan pesan validasi]
    G --> C
    F -- Ya --> H[Simpan UsedMaterialReport dengan status REPORTED]
    H --> I[Buat audit log]
    I --> J[Tampilkan laporan pada daftar]
    J --> K[NOC meninjau laporan]
    K --> L{Tindak lanjut laporan}
    L -- Acknowledge --> M[Ubah status menjadi ACKNOWLEDGED]
    L -- Recycle --> N[Ubah status menjadi RECYCLED]
    L -- Dispose --> O[Ubah status menjadi DISPOSED]
    M --> P([Selesai])
    N --> P
    O --> P
```

## Gambar 4.9 Activity Diagram Auto-Alert Stok Kritis

```mermaid
flowchart TD
    A([Mulai]) --> B[Scheduler / perubahan stok memicu threshold check]
    B --> C[Ambil seluruh data inventory]
    C --> D[Bandingkan stock dengan minThreshold]
    D --> E{stock <= minThreshold?}
    E -- Tidak --> F{Ada alert aktif sebelumnya?}
    F -- Tidak --> Z([Selesai])
    F -- Ya --> G[Ubah alert menjadi RESOLVED]
    G --> H[Buat notifikasi alert resolved]
    H --> I[Kirim event alert_resolved]
    I --> Z
    E -- Ya --> J{Alert aktif sudah ada?}
    J -- Ya --> K[Update alert yang ada dan set status NEW]
    K --> L[Kirim event new_alert]
    L --> Z
    J -- Tidak --> M[Buat data Alert baru]
    M --> N[Buat Notification ke user terkait]
    N --> O[Kirim event new_alert]
    O --> P[Kirim email alert]
    P --> Z
```

## Gambar 4.10 Activity Diagram Logout

```mermaid
flowchart TD
    A([Mulai]) --> B[Pengguna klik Logout]
    B --> C[Hapus token dari local storage]
    C --> D[Reset state autentikasi]
    D --> E[Arahkan ke halaman login]
    E --> F([Selesai])
```

## Gambar 4.11 Class Diagram Iterasi Satu

```mermaid
classDiagram
    class User {
        +id:int
        +username:string
        +email:string
        +password:string
        +role:string
        +siteId:int
    }

    class Site {
        +id:int
        +name:string
        +location:string
    }

    class Material {
        +id:int
        +sku:string
        +itemCode:string
        +name:string
        +category:string
        +unit:string
        +specs:text
        +isDeleted:boolean
    }

    class Inventory {
        +id:int
        +stock:int
        +minThreshold:int
        +siteId:int
        +materialId:int
    }

    class MaterialRequest {
        +id:int
        +project:string
        +description:text
        +status:string
        +urgency:string
        +requesterId:int
        +siteId:int
        +trackingNumber:string
        +eta:date
    }

    class MaterialRequestItem {
        +id:int
        +requestId:int
        +materialId:int
        +quantity:int
        +unit:string
        +serialNumbers:text
    }

    class Notification {
        +id:int
        +userId:int
        +type:string
        +message:text
        +metadata:text
        +readAt:date
    }

    class Alert {
        +id:int
        +materialId:int
        +siteId:int
        +stock:int
        +minThreshold:int
        +shortage:int
        +type:string
        +priority:string
        +status:string
        +message:text
    }

    class StockMovement {
        +id:int
        +materialId:int
        +siteId:int
        +userId:int
        +type:string
        +quantity:int
        +referenceType:string
        +referenceId:int
    }

    class AuditLog {
        +id:int
        +userId:int
        +action:string
        +details:text
        +module:string
        +ipAddress:string
        +timestamp:date
    }

    class UsedMaterialReport {
        +id:int
        +materialId:int
        +siteId:int
        +reporterId:int
        +quantity:int
        +condition:string
        +status:string
        +returnSite:string
        +photo:string
    }

    Site "1" --> "*" User : has
    Site "1" --> "*" Inventory : stores
    Material "1" --> "*" Inventory : tracked in
    User "1" --> "*" MaterialRequest : creates
    Site "1" --> "*" MaterialRequest : destination
    MaterialRequest "1" --> "*" MaterialRequestItem : contains
    Material "1" --> "*" MaterialRequestItem : requested
    User "1" --> "*" Notification : receives
    Material "1" --> "*" Alert : triggers
    Site "1" --> "*" Alert : occurs at
    Material "1" --> "*" StockMovement : records
    Site "1" --> "*" StockMovement : records
    User "1" --> "*" StockMovement : performs
    User "1" --> "*" AuditLog : writes
    Material "1" --> "*" UsedMaterialReport : referenced
    Site "1" --> "*" UsedMaterialReport : reported at
    User "1" --> "*" UsedMaterialReport : reports
```

## Gambar 4.12 Relational Model Data

```mermaid
erDiagram
    USER {
        int id PK
        string username
        string email
        string password
        string role
        int siteId FK
    }

    SITE {
        int id PK
        string name
        string location
    }

    MATERIAL {
        int id PK
        string sku
        string itemCode
        string name
        string category
        string unit
    }

    INVENTORY {
        int id PK
        int siteId FK
        int materialId FK
        int stock
        int minThreshold
    }

    MATERIAL_REQUEST {
        int id PK
        int requesterId FK
        int siteId FK
        string project
        string status
        string urgency
        string trackingNumber
    }

    MATERIAL_REQUEST_ITEM {
        int id PK
        int requestId FK
        int materialId FK
        int quantity
        string unit
    }

    NOTIFICATION {
        int id PK
        int userId FK
        string type
        text message
        date readAt
    }

    ALERT {
        int id PK
        int materialId FK
        int siteId FK
        int stock
        int minThreshold
        string priority
        string status
    }

    STOCK_MOVEMENT {
        int id PK
        int materialId FK
        int siteId FK
        int userId FK
        string type
        int quantity
    }

    AUDIT_LOG {
        int id PK
        int userId FK
        string action
        string module
        text details
    }

    USED_MATERIAL_REPORT {
        int id PK
        int materialId FK
        int siteId FK
        int reporterId FK
        int quantity
        string condition
        string status
    }

    SITE ||--o{ USER : has
    SITE ||--o{ INVENTORY : contains
    MATERIAL ||--o{ INVENTORY : stocked_as
    USER ||--o{ MATERIAL_REQUEST : creates
    SITE ||--o{ MATERIAL_REQUEST : targets
    MATERIAL_REQUEST ||--o{ MATERIAL_REQUEST_ITEM : contains
    MATERIAL ||--o{ MATERIAL_REQUEST_ITEM : requested
    USER ||--o{ NOTIFICATION : receives
    MATERIAL ||--o{ ALERT : triggers
    SITE ||--o{ ALERT : occurs_at
    MATERIAL ||--o{ STOCK_MOVEMENT : moved
    SITE ||--o{ STOCK_MOVEMENT : happens_at
    USER ||--o{ STOCK_MOVEMENT : performs
    USER ||--o{ AUDIT_LOG : creates
    MATERIAL ||--o{ USED_MATERIAL_REPORT : reported_as
    SITE ||--o{ USED_MATERIAL_REPORT : happens_at
    USER ||--o{ USED_MATERIAL_REPORT : reports
```

## Gambar 4.39 Activity Diagram Notifikasi GM & NOC

```mermaid
flowchart TD
    A([Mulai]) --> B{Ada perubahan status request / alert?}
    B -- Tidak --> Z([Selesai])
    B -- Ya --> C[Identifikasi jenis event]
    C --> D{Event request atau alert?}
    D -- Request --> E[Tentukan penerima berdasarkan status]
    E --> F[Buat data Notification]
    F --> G[Kirim event socket realtime]
    G --> H[Sidebar dan halaman notifikasi diperbarui]
    H --> Z
    D -- Alert --> I[Ambil user role NOC, GM, PROGRAMMER]
    I --> J[Buat notifikasi alert]
    J --> K[Kirim event new_alert / alert_resolved]
    K --> L[Tampilkan toast dan update badge]
    L --> Z
```

## Gambar 4.40 Activity Diagram Return Barang Rusak

Diagram ini disesuaikan dengan implementasi aktual pada modul `Used Materials / UsedMaterialReport`.

```mermaid
flowchart TD
    A([Mulai]) --> B[OM membuka halaman Used Materials]
    B --> C[Isi data material rusak atau bekas]
    C --> D[Isi quantity, return site, kondisi, deskripsi]
    D --> E[Unggah foto bukti]
    E --> F[Submit laporan]
    F --> G{Data valid?}
    G -- Tidak --> H[Tampilkan pesan validasi]
    H --> C
    G -- Ya --> I[Simpan UsedMaterialReport status REPORTED]
    I --> J[Buat audit log]
    J --> K[NOC membuka daftar laporan]
    K --> L[Tinjau foto dan detail kerusakan]
    L --> M{Keputusan tindak lanjut}
    M -- Diterima --> N[Ubah status ACKNOWLEDGED]
    M -- Didaur ulang --> O[Ubah status RECYCLED]
    M -- Dibuang --> P[Ubah status DISPOSED]
    N --> Q([Selesai])
    O --> Q
    P --> Q
```

## Gambar 4.41 Activity Diagram Laporan

```mermaid
flowchart TD
    A([Mulai]) --> B[Pengguna membuka halaman laporan / dashboard]
    B --> C[Pilih jenis laporan]
    C --> D{Jenis laporan}
    D -- Stock Opname --> E[Ambil data Inventory per site]
    D -- Mutasi Stok --> F[Ambil data StockMovement]
    D -- Material Request --> G[Ambil data MaterialRequest dan item]
    E --> H[Terapkan filter tanggal atau site jika ada]
    F --> H
    G --> H
    H --> I[Tampilkan tabel / grafik]
    I --> J{Ekspor diperlukan?}
    J -- Tidak --> Z([Selesai])
    J -- PDF --> K[Generate PDF]
    J -- Excel --> L[Generate XLSX]
    K --> Z
    L --> Z
```
