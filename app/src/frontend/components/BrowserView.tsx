/**
 * BrowserView — "Watch your agent" via Browser Use live_url iframe
 *
 * Embeds the Browser Use Cloud live view so users can see
 * what their agent is browsing in real-time.
 *
 * Props:
 *   - liveUrl: the Browser Use live_url for this instance
 *   - onClose: callback to close the view
 */

interface BrowserViewProps {
  liveUrl: string
  onClose: () => void
}

export default function BrowserView({liveUrl, onClose}: BrowserViewProps) {
  return (
    <div className="flex flex-col h-full border border-neutral-800 rounded-2xl overflow-hidden bg-neutral-925">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/50">
        <div className="flex items-center gap-2">
          <span className="text-sm">👁</span>
          <h3 className="text-sm font-medium">Watch Agent</h3>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
          </span>
          <span className="text-[10px] text-green-400">Live</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Open in new tab ↗
          </a>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-300 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* Browser iframe */}
      <div className="flex-1 relative bg-black">
        <iframe
          src={liveUrl}
          title="Browser Use Live View"
          className="absolute inset-0 w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          allow="clipboard-read; clipboard-write"
        />

        {/* Loading overlay — shows briefly while iframe loads */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-none animate-fade-out">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-neutral-700 border-t-neutral-300" />
            <p className="text-xs text-neutral-500">Connecting to browser...</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
        <p className="text-[10px] text-neutral-600">
          Powered by Browser Use Cloud · Stealth browsing · CAPTCHA solving
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const iframe = document.querySelector("iframe[title='Browser Use Live View']") as HTMLIFrameElement
              if (iframe) {
                iframe.src = liveUrl
              }
            }}
            className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      </div>
    </div>
  )
}
