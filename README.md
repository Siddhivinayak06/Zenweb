# ZenWeb Browser Assistant

**Reduce cognitive load. Stay in the zone.**

ZenWeb is a powerful Chrome extension designed to simplify web pages and highlight essential content. Whether you're reading a long article or focusing on a complex form, ZenWeb helps you focus on what matters.

## 📋 Table of Contents

- [Features](#-features)
  - [Simplify Mode](#-simplify-mode-reader-view)
  - [Focus Mode](#-focus-mode)
  - [AI Features](#-ai-features)
  - [Enhanced News Support](#-enhanced-news-support)
- [Getting Started](#-getting-started)
- [Keyboard Shortcuts](#-keyboard-shortcuts)
- [Project Structure](#-project-structure)
- [Contributors](#-contributors)
- [License](#-license)

---

## ✨ Features

### 📖 Simplify Mode (Reader View)
Transform cluttered web pages into a clean, distraction-free reading experience.
*   **Clean Layout**: Extracts main content using Mozilla's Readability library.
*   **Customizable**: Adjust font size and switch between **Light**, **Sepia**, and **Dark** themes.
*   **Text-to-Speech**: Listen to articles with built-in TTS (Press `s`).

### 🎯 Focus Mode
Highlight interactive elements while dimming the background.
*   **Visual Focus**: Interactive elements glow; non-essential elements fade away.
*   **Pomodoro Timer**: Persistent 25/5 min timer that survives page reloads.
*   **Reading Guide**: Visual line follows your cursor to keep your place.

### 🧠 AI Features
*   **AI Summary**: Generate bullet-point summaries of articles.
*   **Chat with Page**: Ask questions about the content in the sidebar.
*   **Explain Selection**: Right-click text -> "Explain with ZenWeb".

### 📰 Enhanced News Support
Optimized for major news sites (Times of India, Hindustan Times, etc.) to correctly detect layouts and prevent errors.

> **New! Simultaneous Modes**: Enable **Simplify** and **Focus** modes at the same time for the ultimate reading experience.

---

## 🚀 Getting Started

### 1. Prerequisites
To use AI features, you need a Google Gemini API Key.
*   Get a key here: [Google AI Studio](https://aistudio.google.com/app/apikey)

### 2. Installation (Developer Mode)
1.  Clone this repository:
    ```bash
    git clone https://github.com/Siddhivinayak06/Zenweb.git
    ```
2.  Move into the project folder:
    ```bash
    cd Zenweb
    ```
3.  Open Chrome and go to `chrome://extensions/`.
4.  Enable **Developer mode** (top right).
5.  Click **Load unpacked** and select the extension folder.

### 3. Setup
1.  **Configure API Keys**:
    - Copy `.env.example` to `.env`.
    - Open `.env` and add your Supabase, Stripe, and Gemini keys.
    - Generate runtime config files from `.env`:
      ```bash
      npm run generate-config
      ```
    - Optional (recommended while developing): auto-sync config files when `.env` changes:
      ```bash
      npm run watch-config
      ```
2.  Open the ZenWeb Side Panel.
3.  Go to **Settings** (⚙️).
4.  Ensure your **Gemini API Key** is correctly configured.
5.  After changing `.env`, regenerate config files (or keep `watch-config` running) and reload the extension from `chrome://extensions`.

### 4. Environment Variables

ZenWeb uses a `.env` file in the project root and generates runtime config files used by the extension and website.

Required keys:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `STRIPE_PAYMENT_LINK`
- `GEMINI_API_KEY`

Generated files (auto-ignored by git):

- `config.js`
- `website/config.js`

Available scripts:

- `npm run generate-config`: one-time generation from `.env`
- `npm run watch-config`: auto-regenerate when `.env` changes

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| `Ctrl + Shift + S` | Toggle **Simplify Mode** |
| `Ctrl + Shift + F` | Toggle **Focus Mode** |
| `Ctrl + Shift + E` | Open **Side Panel** |
| `Esc` | Close Modes |
| `t` | Toggle Theme (Reader) |
| `s` | Toggle Speech (Reader) |
| `+` / `-` | Adjust Font Size |

---

## 📂 Project Structure

```text
├── manifest.json       # Config
├── sidepanel.html/js   # UI Interface
├── content.js          # Page Logic
├── background.js       # API Handlers
├── modules/            # Core Features
│   ├── ai.js           # Gemini Integration
│   ├── reader.js       # Readability Logic
│   └── ...
└── lib/                # Dependencies
```

---

## 👥 Contributors

Proudly developed by **Berozgar-Coders**.

## 📄 License
[MIT License](LICENSE)