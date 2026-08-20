"use client";

import { useEffect, useRef } from "react";

export default function QRCode({ value, size = 200, className = "", onDataUrl }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    let cancelled = false;
    import("qrcode").then((QRLib) => {
      if (cancelled || !canvasRef.current) return;
      QRLib.toCanvas(canvasRef.current, value, {
        width: size, margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      }, (err) => {
        if (err) { console.error("QRCode render error:", err); return; }
        if (onDataUrl && canvasRef.current) onDataUrl(canvasRef.current.toDataURL("image/png"));
      });
    }).catch(console.error);
    return () => { cancelled = true; };
  }, [value, size, onDataUrl]);

  if (!value) return null;
  return <canvas ref={canvasRef} width={size} height={size} className={className} />;
}
