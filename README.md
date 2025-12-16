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





