# Digital Forensics Hub

🚀 **Sistem Manajemen Forensik Digital & Penanganan Insiden**

Platform terintegrasi untuk mengelola kasus, korban, bukti digital, dan tindakan forensik secara sistematis dengan role-based access control.

## ✨ Fitur Utama

- 🔐 **Autentikasi & RBAC** - Login aman dengan role-based access control
- 📊 **Dashboard Analitik** - Statistik real-time dengan grafik interaktif
- 📁 **Manajemen Kasus** - CRUD operations dengan status tracking
- 👥 **Manajemen Korban** - Database korban terstruktur
- 🔍 **Manajemen Bukti** - Katalog bukti digital dengan metadata
- ⚡ **Tindakan Forensik** - Workflow terstandar dengan progress tracking

## 🛠️ Teknologi

- **Frontend**: React 18.3.1, TypeScript 5.8.3, Vite 5.4.19
- **UI**: shadcn/ui, Tailwind CSS, Radix UI, Lucide React
- **Backend**: Supabase (PostgreSQL), Realtime subscriptions
- **State**: React Query, React Hook Form, Zod validation
- **Charts**: Recharts untuk visualisasi data
- **Routing**: React Router DOM dengan protected routes

## 🚀 Quick Start

```bash
# Install
npm install

# Setup .env dengan Supabase credentials
cp .env.example .env

# Start development
npm run dev
```

Aplikasi berjalan di `http://localhost:8080`

## 📁 Struktur

```
src/
├── pages/          # Dashboard, Cases, Victims, Evidence, Actions
├── components/     # UI components dan layouts
├── contexts/       # Auth context
└── integrations/   # Supabase client
```

## 🔧 Environment Variables

```env
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
VITE_SUPABASE_URL="your-supabase-url"
```

## 📄 License

MIT License - lihat file [LICENSE](LICENSE) untuk detail.

---

**Built with ❤️ for Digital Forensics Professionals**
# DigitalForensik
