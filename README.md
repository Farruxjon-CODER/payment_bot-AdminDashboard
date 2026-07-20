# 🎓 Telegram Payment Bot — O'quv Markazi

Telegram bot for educational center tuition payments in Uzbekistan. Built with Node.js, TypeScript, Telegraf, PostgreSQL, and Prisma.

## Features

- 📱 Phone-based student identification
- 📚 View enrolled courses, teachers, and schedules
- 💳 Pay tuition via Telegram Payments (Payme / Click)
- 🧾 Automatic digital receipts
- 🔔 Real-time admin notifications
- 📊 Daily/monthly revenue reports

## Prerequisites

- **Node.js** 18+ 
- **PostgreSQL** 14+
- **Telegram Bot Token** (from [@BotFather](https://t.me/BotFather))
- **Payment Provider Token** (from @BotFather → Payments → Connect Payme/Click)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual values
```

Required environment variables:
| Variable | Description |
|----------|-------------|
| `BOT_TOKEN` | Telegram Bot API token |
| `PROVIDER_TOKEN` | Payment provider token (Payme/Click) |
| `DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_CHAT_ID` | Admin's Telegram chat ID |
| `DIRECTOR_CHAT_ID` | Director's chat ID (optional) |

### 3. Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (creates tables)
npx prisma db push

# Seed with sample data
npm run db:seed
```

### 4. Run the Bot

```bash
# Development mode
npm run dev

# Production
npm run build
npm start
```

## Bot Commands

| Command | Access | Description |
|---------|--------|-------------|
| `/start` | Everyone | Start bot & register |
| `/help` | Everyone | Show help |
| `/report` | Admin | Daily payment report |
| `/monthly` | Admin | Monthly statistics |
| `/send_report` | Admin | Send report to director |

## Project Structure

```
payment_bot/
├── prisma/
│   ├── schema.prisma          # Database models
│   └── seed.ts                # Sample data
├── src/
│   ├── bot/
│   │   ├── handlers/          # Command & event handlers
│   │   ├── keyboards/         # Reply & inline keyboards
│   │   ├── middlewares/       # Session management
│   │   └── index.ts           # Bot factory
│   ├── services/              # Business logic
│   ├── repositories/          # Database access
│   ├── config/                # Environment config
│   ├── types/                 # TypeScript types
│   └── index.ts               # Entry point
├── .env.example
├── package.json
└── tsconfig.json
```

## Testing Payments

For testing, use Telegram's test payment provider:
1. In @BotFather, use `/mybots` → select your bot → Payments → Test
2. Use the test provider token in your `.env`
3. Test card: `4242 4242 4242 4242`, any future expiry, any CVC

## License

MIT
