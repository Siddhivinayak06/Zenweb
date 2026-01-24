# ZenWeb Browser Assistant

**ZenWeb** is a powerful Chrome extension designed to reduce cognitive load by simplifying web pages and highlighting essential content. Whether you're reading a long article or focusing on a complex form, ZenWeb helps you stay in the zone.

## ✨ Features

### 📖 Simplify Mode (Reader View)
transform cluttered web pages into a clean, distraction-free reading experience.
-   **Readability Integration**: Extracts the main content using Mozilla's Readability library.
-   **Floating Toolbar**: Access controls via a sleek, glassmorphic floating toolbar.
-   **Themes**: Switch between **Light**, **Sepia**, and **Dark** modes to suit your lighting conditions.
-   **Font Size Control**: Adjust text size for comfortable reading.
-   **State Sync**: Your theme and font preferences are saved and synced between the toolbar and the extension popup.

### 🎯 Focus Mode
Highlight interactive elements while dimming the background to minimize distractions during tasks.
-   **Visual Focus**: interactive elements (forms, buttons, links) are highlighted with a glow effect.
-   **Background Dimming**: Non-essential elements fade into the background.

### 🧠 AI Summary
Get a quick overview of the page content.
-   **Smart Summaries**: Uses on-device AI (where available) or smart heuristics to generate concise bullet-point summaries of articles.

### ♿ Accessibility
-   **Dyslexia Font**: Toggle a dyslexia-friendly font (Comic Sans/Verdana mix) globally to improve readability for users with dyslexia.

## 🛠️ Installation (Developer Mode)

1.  Clone this repository:
    ```bash
    git clone https://github.com/Siddhivinayak06/Zenweb.git
    ```
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** (toggle in the top right corner).
4.  Click **Load unpacked**.
5.  Select the directory where you cloned the repository (ensure you select the folder containing `manifest.json`).

## 🚀 Usage

1.  **Pin the Extension**: Click the puzzle piece icon in Chrome and pin **ZenWeb**.
2.  **Open the Popup**: Click the ZenWeb icon to open the control panel.
3.  **Choose a Mode**:
    -   Click **Simplify** to enter Reader Mode.
    -   Click **Focus** to highlight interactive elements.
4.  **Customize**: Use the toggle to enable **Dyslexia Font** or select your preferred **Theme** (Light/Sepia/Dark).

## 📂 Project Structure

-   `manifest.json`: Extension configuration (Manifest V3).
-   `popup.html` / `popup.js` / `popup.css`: The main extension interface.
-   `content.js`: Logic for modifying web pages (Reader Mode, Focus Mode).
-   `styles.css`: Injected styles for the Reader View and overlays.
-   `background.js`: Service worker for background tasks.
-   `lib/`: External libraries (Readability.js).

## 📄 License

[MIT License](LICENSE)
