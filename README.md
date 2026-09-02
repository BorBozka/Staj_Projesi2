# Kurumsal Ziyaretçi ve Operasyon Yönetim Sistemi

Çok şirketli ve çok tesisli yapılarda ziyaret planlama, giriş-çıkış operasyonları, kaynak atama ve yönetici raporlamasını ortak bir çalışma alanında birleştiren rol tabanlı web uygulaması.

[Canlı uygulamayı görüntüle](https://visitor-operations-platform.vercel.app)

![Admin dashboard; aktif ziyaretler, durum dağılımı ve günlük operasyon görünümü](visitor-operations-dashboard.jpg)

> **Güncel durum:** Frontend, ayrı Fastify/Prisma/MSSQL backend'ine HTTP adaptörleri üzerinden bağlıdır; runtime'da mock servis yoktur ve sessiz mock fallback yoktur. Backend LOCAL kimlik doğrulama, server-side yetki/kapsam denetimi, hashed invitation tokenları ve environment-based e-posta teslim altyapısını içerir. Tarayıcı E2E testi için Playwright suite'i `pnpm e2e` ile çalışır.

## Problem ve Ürün Yaklaşımı

Kurumsal ziyaret süreçleri; çalışan, yönetici, güvenlik ve admin kullanıcılarının farklı ihtiyaçları nedeniyle yalnızca bir kayıt formundan ibaret değildir. Planlama, giriş-çıkış takibi, ziyaretçi kartları, kaynak kullanımı, operasyonel gecikmeler ve dönemsel raporlama aynı ürün içinde fakat rol bazlı yetkilerle ele alınmalıdır.

Bu proje, ziyaret yaşam döngüsünü tek bir sistemde görünür ve yönetilebilir hâle getirmek amacıyla tasarlanmıştır. Ürün; çalışanların ziyaret planlayabildiği, yöneticilerin şirket genelindeki operasyonları izleyebildiği, güvenliğin fiziksel giriş-çıkış sürecini yürütebildiği ve adminlerin sistem yapılandırmasını yönetebildiği modüler bir yapıya sahiptir.

## Rolüm ve Katkılarım

- Kurum ihtiyaçlarını ve paydaş beklentilerini ürün kapsamına dönüştürdüm.
- Kullanıcı rollerini, yetki sınırlarını ve temel iş akışlarını belirledim.
- Ziyaret planlama, zaman çizelgesi, toplantı yaşam döngüsü, kaynak atama ve raporlama özelliklerini kapsamlandırdım.
- Bilgi hiyerarşisi, kullanıcı akışları ve arayüz davranışları hakkında ürün ve UI/UX kararları aldım.
- İşleri aşamalara ayırarak görevleri AI ajanlarına tanımladım.
- Üretilen çıktıları işlevsel ve görsel gereksinimlere göre değerlendirdim; düzeltme ve iyileştirmeleri PR tabanlı bir süreçle yönlendirdim.

> Ürün kararları, kapsam, kullanıcı akışları ve çıktı değerlendirmesi tarafımdan yürütülmüştür. Kod üretimi AI ajanlarıyla gerçekleştirilmiştir.

## Ürün Kapsamı

- Ziyaret oluşturma, düzenleme, yeniden planlama ve iptal akışları
- Gün, hafta ve ay görünümleriyle ziyaret zaman çizelgesi
- Ziyaret detayları ve toplantı yaşam döngüsü
- Şirket ve tesis bağlamına göre filtreleme
- Yönetici ve admin dashboard'ları
- Aktif ziyaretler, durum dağılımı ve günlük operasyon görünümü
- Kaynak, kullanıcı ve organizasyon yönetimi arayüzleri
- Mal hareketleri ve araç planlama modülleri
- Filtrelenebilir raporlar ile CSV, Excel ve PDF çıktıları

## Kullanıcı Rolleri

| Rol | Temel sorumluluk |
| --- | --- |
| Çalışan | Kendi ziyaretlerini planlama, düzenleme, erteleme ve iptal etme |
| Yönetici | Şirket genelindeki ziyaretleri ve raporları görüntüleme |
| Güvenlik | Plansız ziyaret kaydı, kart atama ve giriş-çıkış operasyonları |
| Admin | Kullanıcı, organizasyon, kaynak ve sistem yapılandırmasını yönetme |

## Teknolojiler

- React 19 ve TypeScript
- Vite
- Tailwind CSS ve shadcn/ui temelli bileşenler
- React Hook Form ve Zod
- Recharts ve date-fns
- Vitest ve ESLint

## Yerel Çalıştırma

Frontend verisini gerçek backend'den alır; önce backend + veritabanı ayağa kalkmalıdır.

1. **MSSQL** — yerel bir SQL Server örneği çalışır durumda olsun.
2. **Backend env** — `server/.env` içinde en az `DATABASE_URL` (Prisma SQL Server formatı).
   `EMAIL_DELIVERY_MODE` varsayılanı `log`'dur (gerçek SMTP gerekmez).
3. **Bağımlılıklar + migrate + seed**

       pnpm install
       pnpm db:migrate
       pnpm db:seed          # NODE_ENV=development + DEMO_SEED_ENABLED=true iken çalışır; idempotenttir

4. **Backend** — `pnpm dev:api` → `http://localhost:3001`
5. **Frontend** — `pnpm dev` → `http://localhost:5173`

### Frontend API yapılandırması

Frontend, backend adresini `VITE_API_BASE_URL` ortam değişkeninden okur (`/api` yolu dahil).
Değişken tanımlı değilse `http://localhost:3001/api` varsayılanına düşer. Yerel değişiklik için
kök dizinde `.env.example` dosyasını `.env.local` olarak kopyalayın:

    cp .env.example .env.local

### Doğrulama komutları

    pnpm test              # frontend unit/component
    pnpm typecheck         # frontend
    pnpm test:api          # backend unit (MSSQL gerektirmez)
    pnpm --filter @visitor-management/api exec vitest run --config vitest.config.ts src/integration
                           # ↑ MSSQL entegrasyon suite'i (RUN_MSSQL_INTEGRATION=true ortam değişkeniyle)
    pnpm e2e               # Playwright tarayıcı E2E (backend + vite preview + MSSQL + seed)
    pnpm lint
    pnpm build

## Backend e-posta teslimi

`server/.env.example` geliştirme için güvenli varsayılanı kullanır:

    EMAIL_DELIVERY_MODE=log

Bu mod e-posta göndermez; teslim denemesinin alıcı/konu metadatasını loglar ve davet tokenını
veya ön-kayıt URL'sini loglamaz. SMTP için `EMAIL_DELIVERY_MODE=smtp` seçin ve `SMTP_HOST`,
`SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM_ADDRESS` ile
`MAIL_FROM_NAME` değerlerinin tamamını environment üzerinden sağlayın. Secret ve gerçek SMTP
credential'ları commit edilmez.

## Proje Dokümantasyonu

- [Ürün kapsamı ve davranışları](docs/PRODUCT_SPEC.md)
- [Arayüz ilkeleri](docs/UI_SPEC.md)
- [Teknoloji yığını](docs/TECH_STACK.md)
- [Geliştirme planı](docs/DEVELOPMENT_PLAN.md)
- [Paydaş notları](docs/STAKEHOLDER_NOTES.md)

## Kapsam Notları

- Ziyaretçi kartları fiziksel numaralı kartlar olarak ele alınır; erişim-kontrol donanımıyla entegre değildir.
- Gecikme durumu ayrı bir ziyaret statüsü değil, mevcut zaman ve planlanan çıkış üzerinden hesaplanan bir göstergedir.
- Mal hareketleri ve araç planlama, ziyaret yaşam döngüsünden ayrı operasyon modülleri olarak ele alınır.
