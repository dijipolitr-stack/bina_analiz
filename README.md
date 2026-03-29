# 🏢 Ticari Bina Yatırım Tarayıcı

Sahibinden.com'u otomatik taran, kira tahmini ve amortisman hesaplayan AI destekli yatırım analiz aracı.

---

## 🚀 Canlıya Alma (Vercel — Ücretsiz, ~10 dakika)

### 1. Anthropic API Anahtarı Alın
1. https://console.anthropic.com adresine gidin
2. "API Keys" → "Create Key" tıklayın
3. Anahtarı kopyalayın: `sk-ant-...`

### 2. GitHub'a Yükleyin
```bash
# Bu klasörde terminal açın
git init
git add .
git commit -m "ilk yükleme"

# GitHub'da yeni repo oluşturun → URL'yi kopyalayın
git remote add origin https://github.com/KULLANICI_ADI/bina-analiz.git
git push -u origin main
```

### 3. Vercel'e Deploy Edin
1. https://vercel.com adresine gidin → GitHub ile giriş yapın
2. "Add New Project" → GitHub reponuzu seçin
3. **Framework Preset**: Vite
4. **Environment Variables** bölümüne ekleyin:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-...` (1. adımda kopyaladığınız anahtar)
5. "Deploy" tıklayın

✅ Birkaç dakika sonra `https://bina-analiz-xxx.vercel.app` adresiniz hazır!

---

## 💻 Yerel Geliştirme

```bash
npm install

# .env.local dosyası oluşturun:
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local

# Geliştirme sunucusunu başlatın:
npm run dev
```

Tarayıcıda http://localhost:5173 adresini açın.

---

## 📁 Proje Yapısı

```
bina-analiz/
├── api/
│   └── claude.js        # Vercel serverless proxy (API anahtarını gizler)
├── src/
│   ├── App.jsx          # Ana uygulama
│   └── main.jsx         # React entry point
├── index.html           # HTML şablonu
├── vite.config.js       # Vite yapılandırması
├── vercel.json          # Vercel yönlendirme kuralları
└── package.json         # Bağımlılıklar
```

## 🔒 Güvenlik

API anahtarı hiçbir zaman tarayıcıya gitmez. Tüm Anthropic çağrıları `/api/claude` sunucu taraflı proxy üzerinden yapılır ve anahtar sadece Vercel ortam değişkeninde tutulur.
