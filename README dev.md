# Sistem Informasi Masa Remaja (SIRemaja) Project Developer Guidline

Anggota:

- Raudhatul Jannah - Project Manager
- Rebeka Alma - Scrum Master
- Alisya Andiny Alhabsyi - Lead System Analyst 
- Syarief Ahmad Al Muhajir - Lead System Designer
- Sania Rizqi Maharani - Lead Programmer

* * *

## Daftar Isi

- [Directory Structure](#directory-structure)
- [Getting Started](#getting-started)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Development](#development)
- [Merge Request](#merge-request)
- [Solve Conflict](#solve-conflict)

## Directory Structure
```bash
SIRemaja/
│
├── masaremaja/                    # Main Django project folder
│   ├── masaremaja/                # Django project settings and configuration
│   ├── user_management/           # Django app for user-related features
│   ├── ... (other Django apps)
│   └── manage.py                  # Entry point for Django commands
│
├── venv/                          # Virtual environment (excluded from Git)
│
├── requirements.txt               # Python dependencies
├── .env                           # Environment variables (excluded from Git)
├── .gitignore                     # Git ignore file
└── README.md                      # Project documentation
```

## Getting Started

1. Clone Repository
```bash
git clone https://gitlab.cs.ui.ac.id/sania.rizqi/siremaja.git
cd siremaja
```

2. Create and Activate a Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate         # MacOS, Linux

source venv\Scripts\activate     # Windows
```

## Environment Setup

1. Install Dependencies
```bash
pip install -r requirements.txt
```
## Database Setup

1. Install PostgreSQL
Kalau belum download, install di from https://www.postgresql.org/download/. or bisa pake homebrew juga.

2. Create a Local Database
Log in to PostgreSQL and create a new database:
```bash
psql -U postgres
CREATE DATABASE masaremaja;
CREATE USER sania WITH PASSWORD 'wonwoo';
GRANT ALL PRIVILEGES ON DATABASE masaremaja TO sania;
```
Bisa juga pake pgAdmin lebih gampang.

3. Apply Migrations
```bash
python manage.py migrate
```

4. Create a Superuser
To access the Django admin panel, create a superuser:
```bash
python manage.py createsuperuser
```
## Development

1. Branching Strategy
- main: Stable branch; untuk production-ready code.
- staging: Integration branch untuk merging features.
- feat/xxx: Untuk features (e.g., feat/user_management).

2. Buat branch baru

- Pastikan kamu sedang berada di **`branch staging`**

- Jika **branch feature belum ada**, maka buatlah dengan format nama **`feat/xxx`** (contoh: `feat/user_management`)
    ```bash
    > git branch feat/user_management (membuat branch baru)
    > git checkout feat/user_management (pindah branch)
    ```

    atau cara cepatnya:

    ```bash
    git checkout -b feat/user_management (membuat sekaligus pindah branch baru)
    ```
    Jika **branch feature sudah ada**, lakukan merge staging ke branch feature:  
    ```bash
    > git checkout feat/user_management
    > git pull origin staging 
    ```

3. Silakan develop featurenya atau lakukan perubahan yang diperlukan
    

4. Commit Changes
> **PENTING**: Sebelum melakukan **commit**, selalu cek apakah kalian berada di branch yang tepat dengan perintah: **`git status`** atau **`git branch`**. 
**JANGAN PANIK** jika kalian lupa pindah branch setelah melakukan perubahan. Selama belum melakukan commit, kalian tinggal **`git checkout`** ke branch feature kalian karena perubahan belum tersimpan.

Pakai commit message yang jelas (e.g., ```git commit -m "Add user login functionality"```).

5. Merge ke branch **stanging**

- Setiap ingin melakukan `push`, lakukan **`git pull origin staging`** terlebih dahulu. Hal ini agar kalian mendapatkan update yang telah dipush ke staging oleh anggota lain.
- Lakukan push ke branch sendiri:
    ```bash
    git push origin <nama-branch-feature>
    ```
    >**PENTING**: Jangan pernah lakukan push ke origin/staging dan origin/main

## Merge Request

1. Setelah push ke origin branch feautre, silakan buat merge request dengan source: `nama-branch-feature` dan target: `staging`
2. `Description`: tulis acceptance criteria mana saja yang berhasil dicapai dan yang belum berhasil dicapai
3. `Assignee`: diri sendiri
4. `Approval Rules`: Approval Required: 2
5. `Milestone`: Sprint terkait
6. (OPSIONAL) Silakan centang kotak `delete branch` karena jika ingin ada penambahan lain, kita bisa langsung push branch lagi dari local ke gitlab 
7. **JANGAN SQUASH COMMIT**. Squash commit menyatukan commit-commit pada branch menjadi 1 sehingga kita akan kehilangan riwayatnya dan tidak bisa meng-undo suatu perubahan yang salah.
8. Create merge request
9. Kabari grup LINE bahwa kalian sudah melakukan merge request
9. Tunggu diapprove oleh Lead Programmer dan 1 orang lainnya
10. Lead Programmer yang akan melakukan merge tersebut
11. Jika semua acceptance criteria sudah terpenuhi, silakan close issue tersebut.

## Solve Conflict
Bila terjadi `conflict`, baik di *local* maupun saat *merge request*, silakan hubungi orang yang bersangkutan. Namun, jika tidak tahu dengan siapa pekerjaan kita `conflict`, silakan umumkan saja di grup LINE## Solve Conflict
Bila terjadi `conflict`, baik di *local* maupun saat *merge request*, silakan hubungi orang yang bersangkutan. Namun, jika tidak tahu dengan siapa pekerjaan kita `conflict`, silakan umumkan saja di grup LINE