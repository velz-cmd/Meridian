"use client";

import { useEffect, useRef } from "react";

/** Animated amber/teal signal line — Gate hero only */
export function GateSignalCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let t = 0;
    const points = Array.from({ length: 120 }, (_, i) => ({
      x: i,
      y: 50 + Math.sin(i * 0.18) * 20 + Math.sin(i * 0.07) * 12,
    }));

    function draw() {
      if (!canvas || !ctx) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(0.25, "rgba(245,166,35,0.55)");
      grad.addColorStop(0.55, "rgba(0,212,170,0.45)");
      grad.addColorStop(1, "transparent");

      ctx.beginPath();
      points.forEach((p, i) => {
        const x = (i / points.length) * W;
        const y = H / 2 + (p.y - 50) * (H / 140) * Math.sin(t * 0.02 + i * 0.03);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      t++;
      frame = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={ref} className="gate-signal-canvas" aria-hidden />;
}
