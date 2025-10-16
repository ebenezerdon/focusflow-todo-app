# FocusFlow Todo App

FocusFlow is a polished todo app built by [Teda.dev](https://teda.dev), the simplest AI app builder for regular people. It demonstrates a modern, responsive interface that supports drag and drop, persistent local storage, and mobile-friendly interactions.

Features
- Drag and drop tasks between columns and reorder within columns.
- Mobile-friendly pick and drop mode for precise movement on touch devices.
- Local storage persistence so your tasks survive reloads.
- Accessible controls: keyboard navigation, focus states, and clear ARIA patterns.
- Beautiful, diagonal hero landing page and a clean app UI with thoughtful color choices.

Files
- index.html - Landing page with a diagonal hero and CTAs.
- app.html - Main application page where you manage your todos.
- styles/main.css - Custom CSS. Tailwind is used via CDN for utilities.
- scripts/helpers.js - Storage and utility helpers (exposes window.AppStorage).
- scripts/ui.js - Main UI rendering and behavior. Defines window.App with App.init and App.render.
- scripts/main.js - Entry point that initializes the app safely.

Quick start
1. Open index.html in your browser and click "Open the app" or open app.html directly.
2. Add tasks, drag them between columns, use the pick button on mobile, or use the keyboard arrows to move between columns.

Notes
- The app uses Tailwind CSS via CDN and jQuery 3.7.1 for DOM handling.
- The app persists to localStorage under the key "teda_todo_v1".

Built with care by Teda.dev.
