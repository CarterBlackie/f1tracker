# 🏎️ F1 Tracker Web App

A modern Formula 1 web application focused on **season browsing, race details, standings, and circuit visualization**, built with a clean UI-first approach.

Live telemetry is intentionally paused while the core experience is polished.

---

## 🚀 Project Overview

This project is a Formula 1 data explorer that allows users to:

- Browse **full F1 seasons**
- View **race weekends and results**
- Explore **driver & constructor standings**
- See **real circuit outlines** for each race
- Preview the **next upcoming race with a live countdown**

The app emphasizes:
- Clear navigation
- Consistent dark UI
- Smooth animations
- Readable data presentation

---

## ✨ Key Features

### 🗓️ Season View
- Full season calendar
- Upcoming and completed races
- Race cards with location, date, and circuit info
- Clean grid layout with hover motion

### 🏁 Race Page
- Race header with circuit details
- Embedded **track outline map** (no placeholders)
- Race results table
- Session fallback when results are not available

### 📊 Standings
- Driver standings
- Constructor standings
- Tabbed UI
- Responsive tables

### ⏱️ Next Race Countdown
- Automatically finds the **next upcoming race**
- Works across seasons (e.g. early 2026 races)
- Live countdown (days / hours / minutes)
- Embedded circuit map preview

### 🎨 UI & Motion
- Dark F1-inspired theme
- Global hover lift + glow
- Animated aurora-style background
- Responsive layout for mobile and desktop
- Reduced-motion support for accessibility

---

## 🧠 Design Decisions

- **Live tracking paused**  
  Live telemetry is intentionally disabled to focus on UI stability and clarity.

- **UI-first development**  
  Layout, spacing, and visual hierarchy were prioritized before advanced data features.

- **Real circuit outlines**  
  Each race loads the correct track shape instead of placeholders.

- **No external UI frameworks**  
  Styling is custom CSS for full control and performance.

---

## 🛠️ Tech Stack

- **Frontend:** React + TypeScript
- **Routing:** React Router
- **Styling:** Custom CSS (no frameworks)
- **Data Source:** Jolpica / Ergast-style F1 APIs
- **Build Tool:** Vite
- **Deployment:** GitHub Pages 

---

## Testing Strategy

This project uses **Vitest** with **React Testing Library** to ensure the application behaves correctly from a user perspective while keeping core logic easy to test.

### Goals
- Catch breaking changes before deployment
- Keep tests fast and reliable
- Test behavior rather than implementation details

### What is tested

**API layer (`src/api`)**
- Correct request URL and query construction
- Proper handling of success and error responses
- Caching behavior where applicable

**Utilities (`src/utils`)**
- Pure logic functions with direct unit tests
- Edge cases such as empty inputs, invalid data, and boundaries

**Components (`src/components`)**
- Rendering of expected content
- Conditional UI states (data present, missing, or loading)
- Avoids testing internal component state unless required

**Pages (`src/pages`)**
- Page-level user-visible behavior
- Routing and navigation
- API calls are mocked to keep tests deterministic

### Mocking approach
- All network requests are mocked
- Page tests mock imported API functions
- Heavy visual components (maps/SVG) may be mocked with lightweight stubs

### Coverage
- Coverage is generated using the V8 provider
- Focus is placed on line and function coverage
- Branch coverage is tracked but not forced to 100%, especially for UI conditionals

### Commands

```bash
# Run all tests
npm test

# Run tests once (CI-style)
npx vitest run

# Run a specific test file
npx vitest run src/test/page.home.test.tsx

# Generate coverage report
npm run test:coverage



