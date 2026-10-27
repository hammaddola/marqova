"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        "ios-src"?: string;
        alt?: string;
        ar?: boolean;
        "ar-modes"?: string;
        "camera-controls"?: boolean;
        "auto-rotate"?: boolean;
        "shadow-intensity"?: string;
        exposure?: string;
        "touch-action"?: string;
        "interaction-prompt"?: string;
      };
    }
  }
}

/** Google <model-viewer>: drag to rotate, pinch to zoom, AR on supported phones. Loaded on demand. */
export function ModelViewer({ src, iosSrc, alt, className }: { src: string; iosSrc?: string | null; alt: string; className?: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    import("@google/model-viewer").then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);
  if (!ready)
    return (
      <div className={`grid place-items-center bg-sand-50 ${className ?? ""}`}>
        <Loader2 className="size-6 animate-spin text-gold-text" aria-label="Loading 3D model" />
      </div>
    );
  return (
    <model-viewer
      src={src}
      ios-src={iosSrc ?? undefined}
      alt={alt}
      ar
      ar-modes="webxr scene-viewer quick-look"
      camera-controls
      auto-rotate
      touch-action="pan-y"
      shadow-intensity="1"
      exposure="1"
      interaction-prompt="auto"
      className={className}
      style={{ width: "100%", height: "100%", background: "radial-gradient(circle at 50% 40%, #fff, #F3F0E9)" }}
    />
  );
}
