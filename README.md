# Kurumsal Ziyaretçi ve Operasyon Yönetim Sistemi

Çok şirketli ve çok tesisli yapılar için geliştirilen, rol odaklı ziyaret planlama ve operasyon arayüzü. Bu repo şu anda React tabanlı, gerçek API'lerle değiştirilebilecek mock servis katmanına sahip bir frontend uygulamasını içerir.

## Öne Çıkanlar

- Ziyaret oluşturma, düzenleme, yeniden planlama ve iptal akışları
- Gün, hafta ve ay görünümleriyle ziyaret zaman çizelgesi
- Yaklaşan ziyaretler ve ziyaret detay diyaloğu
- Yönetici dashboard'u: operasyon akışı, durum dağılımı, içerideki ziyaretçiler ve günün ziyaretleri
- Şirket ve tesis bağlamına göre filtreleme
- Mock veri/servis sınırı sayesinde sonraki API entegrasyonuna hazır mimari

> Uygulama yalnızca frontend aşamasındadır. Gerçek kimlik doğrulama, backend, e-posta, QR ve fiziksel erişim-kontrol entegrasyonları henüz bulunmamaktadır.

## Teknolojiler

- React 19 + TypeScript
- Vite
- Tailwind CSS ve shadcn/ui temelli bileşenler
- React Hook Form + Zod
- date-fns
- Vitest + ESLint

## Başlangıç

```bash
pnpm install
pnpm dev
```

Uygulama varsayılan olarak Vite'ın verdiği yerel adreste çalışır.

## Komutlar

```bash
pnpm dev        # Geliştirme sunucusu
pnpm test       # Vitest test paketi
pnpm typecheck  # TypeScript kontrolü
pnpm lint       # ESLint kontrolü
pnpm build      # Production build
```

## Rotalar

| Rota | Açıklama |
| --- | --- |
| `/my-visits` | Çalışanın ziyaret planlama ve zaman çizelgesi ekranı |
| `/manager/dashboard` | Yönetici operasyon dashboard'u |
| `/manager/my-visits` | Yöneticinin ziyaret planlama ekranı |
| `/manager/all-visits` | Yönetici için tüm ziyaretler görünümü |

## Proje Yapısı

```text
src/
├── app/          # Rota ve uygulama bileşimi
├── components/   # Ortak UI ve uygulama kabuğu
├── domain/       # Merkezi alan tipleri
├── features/     # Ziyaret ve yönetici özellikleri
├── services/     # Değiştirilebilir mock servis katmanı
└── styles/       # Global tasarım token'ları ve stiller
```

## Kapsam Notları

- Ziyaretçi kartları fiziksel numaralı kartlar olarak ele alınır; erişim-kontrol donanımıyla entegre değildir.
- Gecikme durumu saklanan ayrı bir ziyaret statüsü değil, mevcut zaman ve planlanan çıkış üzerinden hesaplanan bir göstergedir.
- Mal teslimatları ziyaretlerden ayrı bir modül olarak tasarlanmıştır.

Ürün davranışı, arayüz ilkeleri ve sonraki aşamalar için sırasıyla `PRODUCT_SPEC.md`, `UI_SPEC.md`, `TECH_STACK.md` ve `DEVELOPMENT_PLAN.md` dosyalarına bakın.
