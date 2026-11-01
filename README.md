# HabitGrid

A mobile-first habit tracker built with HTML, CSS and JavaScript. Check in your habits every day, build streaks, see your progress on a dashboard and export your data, all in the browser with no sign-up.

**Live demo:** https://vamsidhar-reddy-81.github.io/HabitGrid/

---

## Features

- **Dashboard:** today's habits with one-tap check-in and a progress ring showing today's completion
- **Streaks:** current streak for every habit and an overall streak
- **History:** monthly calendar view, tap any day to see what you completed
- **Analysis:** 14-day trend and 30-day completion for each habit
- **Manage habits:** add, edit and delete habits with your own emoji and color
- **Profile:** your name and profile picture (choose from gallery or take a photo with the camera)
- **Light / dark theme**
- **Export and backup:**
  - Excel report (full log, habit summary, daily report) using SheetJS
  - PDF report
  - JSON backup and restore
- **Celebration confetti** when you complete your habits
- **Works offline-friendly:** all data is saved in your browser using `localStorage` (nothing is sent to a server)

## Tech stack

| Technology | Use |
|---|---|
| HTML5, CSS3 | Structure and mobile-first styling |
| JavaScript (vanilla) | App logic, charts, calendar, state |
| `localStorage` | Saving habits and progress in the browser |
| [SheetJS](https://sheetjs.com/) | Excel export |
| html2canvas + jsPDF | PDF export |

## Project structure

```
HabitGrid/
├── index.html    # App layout (Dashboard, History, Analysis, Settings tabs)
├── style.css     # Styles and animations
├── script.js     # App logic
└── README.md
```

## Run locally

1. Download or clone this repository
   ```bash
   git clone https://github.com/vamsidhar-reddy-81/HabitGrid.git
   ```
2. Open `index.html` in your browser. No installation or server is needed.

Internet is needed once to load the SheetJS, html2canvas and jsPDF libraries (used for Excel and PDF export).

## Deploy on GitHub Pages

Settings → Pages → Source: **Deploy from a branch** → `main` / `(root)` → Save.

## Note

Your habit data stays in your own browser. Clearing browser data will delete it, so use **Export → JSON backup** to keep a copy.

## Author

**Vamsidhar Reddy**
GitHub: [vamsidhar-reddy-81](https://github.com/vamsidhar-reddy-81) | LinkedIn: [Vamsidhar Reddy](https://www.linkedin.com/in/morreddy-gari-vamsidharreddy-4b0640378/)
