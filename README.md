# PostMost

A reseller operating system that lets you create one listing and cross-post it to multiple marketplaces.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Prisma + SQLite (dev)
- NextAuth (credentials)

## Features

- Universal listing form
- Cross-post queue and status tracking
- Marketplace adapter architecture (eBay, Etsy, Poshmark, Mercari, Depop, Facebook Marketplace, Craigslist, OfferUp, Vinted, Grailed)
- Dashboard with listing stats
- Authentication

## Setup

```bash
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with `demo@postmost.co` / `demo123`.

## Marketplace integrations

- **API-enabled**: eBay, Etsy (scaffolded, needs OAuth credentials)
- **Automation-ready**: Poshmark, Mercari, Depop, Facebook Marketplace, Craigslist, OfferUp, Vinted, Grailed (Playwright stubs)

## Roadmap

- Real OAuth flows for eBay/Etsy
- Playwright worker service for automation platforms
- Image upload and background removal
- AI listing generation
- Sales analytics and P&L
- Mobile app
