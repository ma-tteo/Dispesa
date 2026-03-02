# 📱 Dispensa - Build Android (Play Store)

## Prerequisiti

1. **Android Studio** installato sul tuo computer
2. **JDK 17+** installato
3. **Un server deployato** (es. Vercel, Railway) per le API

---

## 🚀 Passaggi per creare l'APK

### 1. Deploy del backend

Prima di costruire l'app Android, devi deployare il backend:

```bash
# Esempio con Vercel
vercel --prod
```

Annota l'URL del deployment (es. `https://dispensa.vercel.app`)

### 2. Configura l'URL API

Crea/modifica `.env`:
```bash
NEXT_PUBLIC_API_URL=https://dispensa.vercel.app
```

### 3. Build per Android

```bash
# Installa dipendenze (se necessario)
bun install

# Build del progetto per mobile
bun run mobile:build

# Aggiungi piattaforma Android (solo la prima volta)
bun run mobile:add

# Sincronizza i file
bun run mobile:sync

# Apri in Android Studio
bun run mobile:open
```

### 4. In Android Studio

1. Aspetta che Gradle sincronizzi
2. Vai su **Build → Generate Signed Bundle / APK**
3. Scegli **Android App Bundle** (per Play Store) o **APK** (per test)
4. Crea o usa un keystore esistente
5. Build!

---

## 📋 Struttura del progetto

```
dispensa/
├── android/           # Progetto Android (creato da Capacitor)
├── src/
│   ├── app/          # Next.js App Router
│   └── lib/
│       └── api-config.ts  # Config API per mobile
├── capacitor.config.ts    # Config Capacitor
├── public/
│   └── icons/        # Icone app
└── .env              # Configurazione
```

---

## 🔧 Comandi utili

| Comando | Descrizione |
|---------|-------------|
| `bun run mobile:build` | Build per mobile |
| `bun run mobile:sync` | Sincronizza file web → Android |
| `bun run mobile:open` | Apri Android Studio |
| `bun run mobile:run` | Esegui su dispositivo connesso |

---

## 📱 Pubblicare sul Play Store

1. **Crea un account Google Play Developer** ($25 una tantum)
2. Vai su [Google Play Console](https://play.google.com/console)
3. Crea una nuova app
4. Carica l'AAB (Android App Bundle)
5. Compila le informazioni richieste
6. Invia per revisione

---

## 🎨 Icone app

Le icone devono essere in varie dimensioni. Capacitor le genera automaticamente da `public/icons/icon.svg`.

Per icone personalizzate, sostituisci i file in:
```
android/app/src/main/res/
├── mipmap-mdpi/ic_launcher.png    (48x48)
├── mipmap-hdpi/ic_launcher.png    (72x72)
├── mipmap-xhdpi/ic_launcher.png   (96x96)
├── mipmap-xxhdpi/ic_launcher.png  (144x144)
└── mipmap-xxxhdpi/ic_launcher.png (192x192)
```

---

## ⚠️ Note importanti

- L'app Android chiama le API del server remoto
- Il database è sul server, non nel telefono
- Per notifiche push, serve un servizio aggiuntivo (Firebase)
- Per funzionalità offline, serve implementare caching
