# Prompt

Implement an experiment, a very simple window manager, whats important for me is that there is some "physics", maybe not literally, but it shuold feel like it.

Features I want to add:
- There is a button to close all windows
- There is a button to restart
- There is a button to re-position windows to their original positions
- On resize window position will accomodate relative to viewport new size (they might overlap, that's possible).
- Windows can contain images (like being only images), or have text (markdown), or have any object. Windows should be variable height. Windows have fixed width (but depends on the config of the specific window). Window width will max-width to viewport width minus outer gutter.
- Window may have a fixed height, in that case scroll content inside
- Windows may have a title
- Windows may have a close button (default true) and a minimze button (default true).

Also some toggle features can be added:
- Sticky windows (placing one next to the other, sticks together, just closes the gap, but they don't merge
- You can drag and drop on top of each other to merge windows. An overlay helps you to understand if you will stack them or you will add them horizontally (a hover overlay based on if you are % closer to top, % closer to bottom, % closer to left, % closer to right (note that you can also overlap without merging, there should be some tollerance).
- A toggle that prevents (or not), to move the window outside of the canvas
- A select that allows you to have infinite canvas (Options: Non growing canvas, Infinite canvas vertically, infinite canvas horizontally, or both).

---

After implementation (or while), generate some example windows and instance them into the canvas.
