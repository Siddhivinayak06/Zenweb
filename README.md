# ZenWeb Browser Assistant

**ZenWeb** is a powerful Chrome extension designed to reduce cognitive load by simplifying web pages and highlighting essential content. Whether you're reading a long article or focusing on a complex form, ZenWeb helps you stay in the zone.

## ✨ Features

### 📖 Simplify Mode (Reader View)
Transform cluttered web pages into a clean, distraction-free reading experience.
- **Readability Integration**: Extracts the main content using Mozilla's Readability library (lazy-loaded for performance).
- **Floating Toolbar**: Access controls via a sleek, glassmorphic floating toolbar.
- **Themes**: Switch between **Light**, **Sepia**, and **Dark** modes.
- **Font Size Control**: Adjust text size (`+` / `-` keys) for comfortable reading.
- **Text-to-Speech**: Listen to articles with built-in TTS (press `s`).
- **Keyboard Shortcuts**: `Esc` to close, `t` to toggle theme.

### 🎯 Focus Mode
Highlight interactive elements while dimming the background to minimize distractions.
- **Visual Focus**: Interactive elements (forms, buttons, links) are highlighted with a glow effect.
- **Background Dimming**: Non-essential elements fade into the background.
- **Pomodoro Timer**: Built-in persistent timer (25min Focus / 5min Break) that survives page reloads.
- **Reading Guide**: A visual line follows your cursor to help track reading position.

### 🧠 AI Features
Leverage AI to understand page content faster.
- **AI Summary**: Generate concise bullet-point summaries of articles.
- **Chat with Page**: Ask follow-up questions about the page content in the Side Panel.
- **Explain Selection**: Right-click any text → "Explain with ZenWeb" for instant AI explanation.
- **On-Device AI**: Uses Gemini Nano (where available) for privacy, falls back to Cloud API.

### ♿ Accessibility
- **Dyslexia Font**: Toggle a dyslexia-friendly font globally.
- **Theme Persistence**: Your preferences are saved and synced across sessions.

### ⌨️ Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Shift + S` | Toggle Simplify Mode |
| `Cmd/Ctrl + Shift + F` | Toggle Focus Mode |
| `Esc` | Close Reader/Focus Mode |
| `+` / `-` | Adjust font size (Reader) |
| `t` | Toggle theme (Reader) |
| `s` | Toggle speech (Reader) |

## 🛠️ Installation (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/Siddhivinayak06/Zenweb.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top right corner).
4. Click **Load unpacked**.
5. Select the folder containing `manifest.json`.

## 🔑 API Key Setup (For AI Features)

1. Get a [Gemini API Key](https://aistudio.google.com/app/apikey).
2. Open ZenWeb Side Panel → Settings (⚙️).
3. Paste your API key and click **Save**.

## 📂 Project Structure

```
├── manifest.json       # Extension config (Manifest V3)
├── sidepanel.html/js   # Side Panel interface
├── content.js          # Page modification logic
├── background.js       # Service worker & API handlers
├── modules/
│   ├── ai.js           # AI summarization & chat
│   ├── reader.js       # Reader Mode logic
│   ├── focus.js        # Focus Mode & timer
│   ├── speech.js       # Text-to-Speech
│   └── theme.js        # Theme management
├── styles.css          # Injected styles
└── lib/Readability.js  # Mozilla Readability
```

## 📄 License

[MIT License](LICENSE)
