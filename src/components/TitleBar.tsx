import { useState } from "react";
import { Minus, Square, X, Copy } from "lucide-react";

// Tauri imports will work when running in Tauri context
// import { appWindow } from '@tauri-apps/api/window';

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  // Check if we're in Tauri context
  const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

  async function handleMinimize() {
    if (isTauri) {
      // @ts-ignore
      const { appWindow } = await import("@tauri-apps/api/window");
      await appWindow.minimize();
    }
  }

  async function handleMaximize() {
    if (isTauri) {
      // @ts-ignore
      const { appWindow } = await import("@tauri-apps/api/window");
      await appWindow.toggleMaximize();
      setIsMaximized(!isMaximized);
    }
  }

  async function handleClose() {
    if (isTauri) {
      // @ts-ignore
      const { appWindow } = await import("@tauri-apps/api/window");
      await appWindow.close();
    }
  }

  return (
    <div
      data-tauri-drag-region
      className="h-9 flex items-center justify-between bg-surface-900 border-b border-surface-800 select-none"
    >
      {/* Left - App name (for macOS) */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 px-4 h-full"
      >
        <span className="text-sm font-medium text-surface-400">SACVPN</span>
      </div>

      {/* Center - Draggable area */}
      <div data-tauri-drag-region className="flex-1 h-full" />

      {/* Right - Window controls (Windows/Linux style) */}
      <div className="flex items-center h-full">
        <button
          onClick={handleMinimize}
          className="w-12 h-full flex items-center justify-center hover:bg-surface-800 text-surface-400 hover:text-white transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-12 h-full flex items-center justify-center hover:bg-surface-800 text-surface-400 hover:text-white transition-colors"
        >
          {isMaximized ? (
            <Copy className="w-3.5 h-3.5" />
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={handleClose}
          className="w-12 h-full flex items-center justify-center hover:bg-red-500 text-surface-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
