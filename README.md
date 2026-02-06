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
    git clone https://github.com/Bethuel-Shilesh/Berozgar-Coders.git
    ```
2.  Open Chrome and go to `chrome://extensions/`.
3.  Enable **Developer mode** (top right).
4.  Click **Load unpacked** and select the extension folder.

### 3. Setup
1.  Open the ZenWeb Side Panel.
2.  Go to **Settings** (⚙️).
3.  Paste your **Gemini API Key** and save.

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