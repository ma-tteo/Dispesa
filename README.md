# 🛒 Spesa Insieme

**Lista della spesa condivisa per famiglie**

Un'app moderna e intuitiva per gestire le liste della spesa in famiglia, con sincronizzazione in tempo reale e un'interfaccia mobile-first.

![Version](https://img.shields.io/badge/version-1.0.0-mint)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## ✨ Funzionalità

- 📱 **Mobile-first** - Design ottimizzato per smartphone
- 👨‍👩‍👧‍👦 **Gruppi famiglia** - Fino a 10 membri per gruppo
- 📝 **Liste multiple** - Organizza per negozio (Conad, Esselunga, ecc.)
- 🔄 **Sync real-time** - Aggiornamenti istantanei tra tutti i dispositivi
- 👆 **Swipe gestures** - Completa o elimina con un gesto
- 🎨 **Personalizzazione** - Temi, colori e font
- 💰 **Prezzi** - Tracciamento spese stimate
- 🔗 **Codici invito** - Condividi facilmente con la famiglia

## 🛠️ Tecnologie

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4, shadcn/ui
- **Database**: Prisma ORM + SQLite
- **Real-time**: Socket.io
- **Stato**: Zustand

## 📦 Installazione

```bash
# Installa dipendenze
bun install

# Avvia il server di sviluppo
bun run dev
```

## 🗄️ Database

Il database SQLite viene salvato in `db/custom.db` e **non viene resettato automaticamente**.

```bash
# Aggiorna lo schema senza perdere dati
bun run db:push

# Genera il client Prisma
bun run db:generate

# Visualizza il database
bun run db:studio
```

## 📱 Schermate

### Login
Schermata di accesso con design moderno e animazioni fluide.

### Gruppi
Gestisci i tuoi gruppi famiglia e unisciti a nuovi gruppi con codici invito.

### Liste
Crea liste multiple per organizzare la spesa per negozio.

### Prodotti
Aggiungi prodotti con categoria, prezzo, quantità e swipe gestures.

### Impostazioni
Personalizza tema, colori, dimensione font e molto altro.

## 🔐 Autenticazione

Sistema di autenticazione sicuro con:
- Password hashate (bcrypt)
- Sessioni persistenti (localStorage)
- Logout sicuro

## 📄 Licenza

MIT License - Fatto con ❤️ in Italia

---

**Spesa Insieme v1.0.0** - Lista della spesa condivisa
