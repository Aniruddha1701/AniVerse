# AniVerse — Premium Cinema & Anime Experience

AniVerse is a state-of-the-art web application designed for a premium, ad-free cinema and anime browsing experience. Combining modern aesthetics with high-performance crawling APIs, AniVerse allows you to discover, stream, and download media in a polished interface without wait timers or intrusive redirects.

---

## ✨ Features

- **🎬 Premium Dark Cinematic UI**: Curated harmonious color palettes, slow-drifting neon radial glow backdrops, glassmorphism overlays, and smooth micro-animations powered by **Framer Motion**.
- **🔍 Multi-Source Aggregator**: Seamlessly browse across Hollywood, Bollywood, UHD 4K movies, and dedicated Anime sections.
- **⭐ Real-time IMDb Ratings**: Color-coded score badges dynamically retrieved from the OMDb API with viewport lazy-loading and request-deduplication to ensure blazing-fast performance.
- **⚡ In-Browser Media Player**: Dynamic, ad-free player capable of streaming high-quality MKV and MP4 formats with advanced range proxying.
- **🖥️ VLC Player Integration**: Spawn full-fidelity external viewing in VLC media player with a single click.
- **🚀 One-Click Timer Bypass**: Integrated multi-step bypass handlers that resolve CDN download links instantly, eliminating wait screens.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 15 App Router](https://nextjs.org/) (Server & Client component split)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strictly typed interfaces)
- **Styling**: Vanilla CSS Modules (Strict tokenized theme scales)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Scraping Engine**: [Cheerio](https://cheerio.js.org/) & [Axios](https://axios-http.com/)
- **Data Flow & State**: React Hooks & Context API (Toast system, view modes, filters)

---

## 🚀 Getting Started

### Prerequisites

Make sure you have Node.js (v18.x or later) installed.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Aniruddha1701/Splitease-Expense-Sharing-.git
   cd Splitease-Expense-Sharing-
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3001` (or the port specified in terminal).

---

## 🏗️ Project Structure

```
├── public/                 # Static brand assets (AniVerse logo, banners)
├── src/
│   ├── app/                # Next.js App Router (Layouts, API routes)
│   │   ├── api/            # API Route handlers (Scraper, ratings, link bypasses)
│   │   ├── globals.css     # Global core design tokens & moving background layers
│   │   ├── layout.tsx      # Core viewport wrappers, typography, and tab metadata
│   │   └── page.tsx        # Dashboard container
│   ├── components/         # Reusable presentation and interaction components
│   │   ├── FilterBar/      # Navigation and view toggle
│   │   ├── Header/         # Branded glass header & search bar
│   │   ├── MovieCard/      # Grid & list glassmorphic cards with IMDb rating badges
│   │   └── MovieModal/     # Interactive details drawer with screenshots
│   ├── hooks/              # Custom reactive hooks (useImdbRating)
│   ├── lib/                # Utility modules (keep-alive agents, parsers)
│   └── types/              # TS interface contracts (Movie, ViewMode, etc.)
```

---

## 🔒 Security & Best Practices

- **Security Headers & Scraper Agents**: Configured secure Cheerio lookups and axios pooling with keep-alive agents for high-throughput responses.
- **Client-Side Throttling**: The OMDb API query queue utilizes stagger delays to respect public request rate limits.
- **Environment Separation**: Sensitive credentials and environment configurations are separated to support standard deployment systems.
