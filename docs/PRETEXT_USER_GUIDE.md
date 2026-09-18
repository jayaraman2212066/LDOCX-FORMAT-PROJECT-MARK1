# LDOCX Living Typography User Guide
## Visual Publication Layout & Dynamic Spatial Typesetting Without Code

---

## 1. What is Living Typography?

In traditional document editors, text is confined to rigid rectangular boxes. If you drop an image, card, or pull-quote into the text, paragraphs either push down awkwardly or break into choppy columns.

**Living Typography** (powered by Pretext) brings high-end magazine and editorial typography into LDOCX. Text flows organically around images, callout boxes, shapes, and interactive charts in real time. As you move or resize elements on your canvas, the typography dances around them smoothly at 60 to 120 frames per second—with zero lag.

---

## 2. Accessing Living Typography

You can access Living Typography tools from anywhere across the LDOCX suite:

1. **Toolbar Button**: Look for the golden **✦ Living Type** button in the main application toolbar.
2. **Keyboard Shortcut**: Press `Ctrl + Alt + T` (or `Cmd + Option + T` on macOS) to instantly toggle the Living Typography Studio drawer.
3. **Command Palette**: Press `Ctrl + K` (or `Cmd + K`), type `living` or `typography`, and select:
   - *Living Typography: Open Studio Drawer*
   - *Living Typography: Insert Editorial Spread*
   - *Living Typography: Auto-Fit Selected Text*
   - *Living Typography: Toggle Flow Guides Overlay*
4. **Context Menu**: Right-click any text block, image, or card on the canvas:
   - Choose **Make Living Flow Obstacle** to have nearby text wrap around it.
   - Choose **Auto-Fit Text Frame** to calculate the perfect font size to fill the container.

---

## 3. The Living Typography Studio Drawer

Opening the Living Typography Studio drawer reveals a sleek, visual control panel docked to the right of your screen:

```
┌──────────────────────────────────────────────┐
│  ✦ LIVING TYPOGRAPHY STUDIO                   │
│  Dynamic Text Layout Powered by Pretext       │
├──────────────────────────────────────────────┤
│  LAYOUT PRESETS                              │
│  [ Editorial Spread ]   [ Magazine Split ]   │
│  [ Callout Wrap ]       [ Responsive Flow ]  │
├──────────────────────────────────────────────┤
│  SLIDERS & GEOMETRY                          │
│  Columns:       [ 1 | 2 | 3 | 4 ]            │
│  Column Gap:    ────○──────── 32px           │
│  Line Height:   ──────○────── 26px           │
├──────────────────────────────────────────────┤
│  INTELLIGENT FITTING                         │
│  [ Auto-Fit to Box ]   [ Tight-Fit Width ]   │
├──────────────────────────────────────────────┤
│  VISUAL FLOW GUIDES                          │
│  [ Toggle SVG Flow Guides ]                  │
├──────────────────────────────────────────────┤
│  OBSTACLES & AVOIDANCE                       │
│  Active Obstacles: 1                         │
│  [ + Register Selected Element as Obstacle ] │
└──────────────────────────────────────────────┘
```

### Layout Presets:
- **Editorial Spread**: Creates a two-column editorial layout featuring an interactive pull-quote card embedded in the middle. Text automatically splits and wraps around the card.
- **Magazine Split**: Splits text into 3 balanced columns with generous margins and classic drop-cap styling.
- **Callout Wrap**: Single column layout with an interactive key-takeaway callout box docked to the upper right.
- **Responsive Flow**: Sets up fluid breakpoints that smoothly transition from 3 columns on desktop to 2 columns on tablet, down to 1 column on mobile.

---

## 4. Working with Obstacles & Live Drag Avoidance

Any element on your LDOCX canvas—images, charts, callouts, cards, or shapes—can become a **Flow Obstacle**.

### How to Create an Obstacle:
1. Select the element you want text to avoid.
2. Click **+ Register as Obstacle** in the Living Typography drawer, or right-click the element and select **Make Living Flow Obstacle**.
3. A subtle golden outline will appear indicating the element is registered as an active obstacle.

### Live Dragging:
- Simply click and drag the obstacle anywhere across the text container.
- Watch as the text instantly reflows around the obstacle at 60–120fps.
- As the obstacle moves up, down, left, or right, text slots are carved on the fly, keeping the reading flow natural and elegant.

### The Obstacle Inspector HUD:
When an obstacle is selected, a floating Inspector HUD appears beside it:
- **Flow Margin Slider**: Adjust the breathing room around the obstacle from `0px` to `64px`. Notice how the text smoothly glides away as you increase the margin.
- **Shape Inset**: Choose between rectangular boundary clearance or tight inset.
- **Remove Obstacle**: Restores the element to a standard floating layer.

---

## 5. Intelligent Sizing: Auto-Fit & Tight-Fit

Never spend minutes manually guessing font sizes again:

### Auto-Fit Text Frame:
- Have a headline or summary card that must fill its bounding box without awkward empty space or overflow?
- Click **Auto-Fit to Box**. Living Typography runs an instant mathematical binary search (<1.5 milliseconds) that identifies the exact optimal font size (e.g. `34.5px`) to fill the container perfectly.

### Tight-Fit Container:
- Want your container to shrink-wrap tightly around a headline or quote without leaving trailing white space?
- Click **Tight-Fit Width**. The engine calculates the narrowest possible container width that preserves your exact line count.

---

## 6. Visual Flow Guides

To see how the engine views your page geometry, click **Toggle Visual Flow Guides**:
- **Slot Boundaries**: Displays cyan SVG bounding boxes showing where text slots are carved.
- **Baseline Rhythms**: Shows gold dashed guidelines indicating the precise baseline grid for every line.
- **Clearance Zones**: Highlights obstacle padding zones in transparent amber.

*Note: Flow guides are authoring helpers for the editor only. They never appear when printing or presenting.*

---

## 7. Presentation Mode & Exporting

When you enter **Universal Presentation Mode** (`Ctrl + F5`):
- All authoring chrome, drawer panels, and flow guides are completely hidden.
- Living Typography text blocks and obstacles remain **100% live and interactive**. You can highlight text, click embedded links, and even interact with embedded widgets during a presentation.
- Text is never flattened into static, blurry images. Your typography stays razor-sharp on 4K projectors and Retina displays.

---

## 8. Tips for Responsive Documents

1. **Use Multi-Column Presets**: For wide monitors (Full HD 1080p and 4K), set columns to `2` or `3`. On mobile screens, Living Typography automatically coalesces columns into a single, easily readable stream.
2. **Keep Obstacle Margins Symmetrical**: A margin of `16px` to `24px` provides comfortable reading clearance.
3. **Combine with Reactive Variables**: Place reactive placeholders like `{{customer_name}}` inside living text. When data changes, the layout automatically recalculates without breaking your obstacle flow.
