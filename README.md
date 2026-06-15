# 🧭 SWOP Career Path Analyzer

A modern, single-page application (SPA) that evaluates a user's Strengths, Weaknesses, Opportunities, and Projections (SWOP) to recommend highly accurate, data-driven career paths. 

Built with Vanilla JavaScript, Tailwind CSS, and Chart.js, the analyzer takes users through an interactive multi-step assessment and generates a personalized career match dashboard.

## ✨ Features

- **Interactive Stepper UI:** Smooth, animated transitions between assessment steps (Technical Skills, Soft Skills, Interests).
- **Custom Scoring Algorithm:** Calculates a `fitScore` by matching the user's 1-10 slider inputs and industry preferences against an internal database of ideal career profiles.
- **Dynamic Radar Chart:** Uses `Chart.js` to visually compare the user's skill footprint against the ideal footprint of their top-matched career.
- **State Persistence:** Automatically saves progress to `localStorage` so users don't lose their data if they accidentally refresh the page.
- **Shareable Profiles:** Encodes user results into URL parameters, allowing users to generate a shareable link of their exact dashboard.
- **PDF Export:** Allows users to download a beautifully styled PDF of their results using `html2pdf.js`.
- **Fully Accessible (a11y):** Keyboard navigable, screen-reader friendly (including a hidden data table for the chart), and uses proper ARIA semantics.
- **Frontend Human Verification (Math CAPTCHA):** A lightweight, custom math challenge that verifies the user is human before generating results — no third-party CAPTCHA service required.

## 🛠️ Tech Stack

This project requires **no build tools or package managers**. It is entirely client-side and relies on reliable CDNs for a lightweight footprint.

- **HTML5 / CSS3 / Vanilla JavaScript (ES6+)**
- **Tailwind CSS (via CDN):** For rapid, responsive UI styling and glassmorphism effects.
- **Chart.js:** For rendering the responsive, interactive radar chart.
- **html2pdf.js:** For capturing the DOM and exporting the dashboard to a PDF.
- **Google Fonts:** Uses 'Inter' for clean, modern typography.

## 📂 Project Structure

To maintain a clean architecture and separation of concerns, the codebase is split into three core files:

```text
/
├── index.html    # Core markup, CDN links, and accessible UI structure
├── styles.css    # Custom animations, orb effects, and slider styling
├── app.js        # State management, scoring algorithm, chart rendering, and export logic
└── README.md     # Project documentation
