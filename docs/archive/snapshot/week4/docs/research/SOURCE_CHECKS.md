# Retained implementation source notes

Condensed from the 2026-10-03 Cloud source audit. These are historical reading notes, not fresh verification or native platform evidence. The full audit is available through [history](../../../docs/HISTORY.md).

The retained mock broker models a per-monitor wallpaper path alongside global position/background/enabled state. It must not change global values. Unknown/non-restorable configurations degrade rather than guessing. Window identity includes handle, PID and process start time because handles can be recycled. Workspace coordinates and screen coordinates must not be confused.

The earlier worker reported full-page reading of the official Microsoft API material, including [SetWallpaper](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nf-shobjidl_core-idesktopwallpaper-setwallpaper), [GetWallpaper](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nf-shobjidl_core-idesktopwallpaper-getwallpaper), [WINDOWPLACEMENT](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-windowplacement) and [IsWindow](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-iswindow). Spotlight/policy detection and secure-desktop handling were not established.

Retained projection math uses synthetic eye-center inputs and an assumed interpupillary distance. It is approximate math, not verified camera tracking, metric depth or a performance result. The previous MediaPipe review left units, metric accuracy and latency unestablished.

The crime-scene and memory-palace proposals cannot inherit capability or validation from these unrelated historical notes. No native effects or tracking integration is added by retaining them.
