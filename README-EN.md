# TabShelf - Smart Tab Sidebar

A powerful browser sidebar extension for efficiently managing browser tabs, supporting both Edge and Chrome browsers.

## Features

- 🎯 **Instant Tab Search** - Real-time filtering with fuzzy matching support
- 🧠 **Intelligent Title Summarization** - Automatically condenses long titles using Kimi AI to extract core information
- ✏️ **Manual Title Editing** - Double-click to edit tab titles for custom naming
- 📏 **Resizable Panel** - Supports collapsing to 32px and drag-to-resize for width adjustment
- 🖱️ **Convenient Tab Operations** - Click to activate, double-click to close, middle-click to close
- 💾 **Data Persistence** - Custom titles, width, and collapsed state are automatically saved
- 🌓 **Theme Adaptation** - Automatically follows the browser theme (light/dark mode)
- 🌐 **Bilingual Support** - Automatically detects system language, supports both Chinese and English interfaces
- 📌 **Tab Pinning Management** - Supports pinning important tabs for separate management
- 🔧 **Kimi API Integration** - Configurable Kimi API key for intelligent title summarization
- 🎨 **Beautiful UI Design** - Modern interface design with smooth animations

## Installation Instructions

### Install from Source

#### Edge Browser
1. Clone or download this repository
2. Open `edge://extensions/` in your Edge browser
3. Enable "Developer Mode" in the top right corner
4. Click "Load unpacked extension"
5. Select the repository directory

#### Chrome Browser
1. Clone or download this repository
2. Open `chrome://extensions/` in your Chrome browser
3. Enable "Developer Mode" in the top right corner
4. Click "Load unpacked"
5. Select the repository directory

### Extension Icon

TabShelf uses a modern gradient blue icon design with stacked tab styles. Each tab has subtle shadow effects and transparency variations, giving a sense of depth and three-dimensionality. A highlight accent is added in the top right corner to increase visual appeal.

### Keyboard Shortcuts

- Use `Alt+S` to quickly open/close the sidebar

## Usage Guide

### Basic Operations

- **Open Sidebar**: Click the extension icon or use the shortcut `Alt+S`
- **Search Tabs**: Enter keywords in the top search box
- **Activate Tab**: Click on a tab item
- **Close Tab**: Click the close button on the right side of the tab item or use middle-click
- **Add New Tab**: Click the "+" button to the left of the search box

### Advanced Features

- **Edit Title**: Double-click a tab title to enter edit mode, press Enter to save, press Esc to cancel
- **Pin Tab**: Click the pin button in the tab item to pin the tab to the top area
- **Smart Summarization**: Long titles are automatically condensed using Kimi AI (requires API key configuration)
- **Drag and Sort**: Adjust tab order by dragging tab items

### Kimi API Configuration

1. Visit [Moonshot AI Platform](https://platform.moonshot.cn/console/api-keys) to obtain an API key
2. Click the settings button in the top right corner of the sidebar
3. Enter your API key and save
4. Restart the sidebar to apply the configuration

## Technical Details

- **Manifest Version**: Manifest V3 (supports the latest browser extension standards)
- **Permissions**: `tabs`, `sidePanel`, `storage`, `scripting`, `<all_urls>`
- **Browser Compatibility**:
  - Edge: Version 114 and above
  - Chrome: Version 114 and above
- **Core APIs**:
  - chrome.action: Handles extension icon interactions
  - chrome.sidePanel: Manages sidebar display and positioning
  - chrome.tabs: Monitors and manipulates tabs
  - chrome.scripting: Injects CSS to hide the default tab bar
  - chrome.storage: Saves user configurations and settings
  - chrome.runtime: Handles message communication and extension lifecycle events
- **Core Functions**:
  - Tab Management: Create, activate, close, and pin tabs
  - Intelligent Summarization: Uses Kimi AI API to condense long titles
  - Data Persistence: Uses Chrome Storage API to save user settings
  - Theme Adaptation: Automatically adapts to system light/dark themes
  - Cross-browser Support: Compatible with both Edge and Chrome browsers

## Performance Optimization

- Search uses debounce mechanism to avoid frequent updates
- Only re-renders the tab list when necessary
- Uses fallback icons when icon loading fails
- Lazily processes tab update events
- Incremental rendering to avoid interface flickering

## Known Issues

- Icons for large websites may fail to load
- Some dynamically generated tab titles may not be summarized accurately
- Drag-and-drop sorting functionality may be unstable in certain situations
- Sidebar position settings in Chrome browser may require newer versions
- Some websites may restrict extension functionality, causing sidebar interaction limitations

## Contributing

We welcome community contributions! If you'd like to participate in this project, please follow these steps:

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Future Plans

- Add more custom theme options
- Add tab grouping and categorization functionality
- Implement tab history management
- Add cross-device synchronization feature
- Optimize performance and memory usage

## License

MIT