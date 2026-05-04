"use client";
import { useEffect, useRef } from "react";

const DotFabric = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -1000, y: -1000 });        // real mouse
  const smoothedMouse = useRef({ x: -1000, y: -1000 }); // virtual mouse

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const cols = 50;
    const rows = 30;

    let dots: { x: number; y: number; baseSize: number; phase: number }[] = [];

    const initDots = () => {
      dots = [];
      const xStep = width / (cols - 1);
      const yStep = height / (rows - 1);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          dots.push({ x: i * xStep, y: j * yStep, baseSize: 1.5, phase: Math.random() * Math.PI * 2 });
        }
      }
    };

    initDots();

    let time = 0;
    const lagFactor = 0.1; // smaller = slower catch up, larger = snappier

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.05;

      // Smoothly move smoothedMouse toward real mouse
      smoothedMouse.current.x += (mouse.current.x - smoothedMouse.current.x) * lagFactor;
      smoothedMouse.current.y += (mouse.current.y - smoothedMouse.current.y) * lagFactor;

      dots.forEach((dot, index) => {
        const dx = dot.x - smoothedMouse.current.x;
        const dy = dot.y - smoothedMouse.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const pullRadius = 150;
        const scale = dist < pullRadius ? (1 - dist / pullRadius) * 2 : 0;
        const size = dot.baseSize + scale;

        const r = Math.floor(index / cols);
        const c = index % cols;

        // Add small vibration
        const wobbleX = Math.sin(time + dot.phase) * 1.5;
        const wobbleY = Math.cos(time + dot.phase) * 1.5;
        const x = dot.x + wobbleX;
        const y = dot.y + wobbleY;

        // Draw dot
        ctx.fillStyle = `rgba(0,255,255,${0.2 + scale * 0.5})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();

        const lineAlpha = 0.05 + scale * 0.2;
        ctx.strokeStyle = `rgba(0,255,255,${lineAlpha})`;
        ctx.lineWidth = 1;

        // Connect right neighbor
        if (c < cols - 1) {
          const rightNeighbor = dots[index + 1];
          const rx = rightNeighbor.x + Math.sin(time + rightNeighbor.phase) * 1.5;
          const ry = rightNeighbor.y + Math.cos(time + rightNeighbor.phase) * 1.5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(rx, ry);
          ctx.stroke();
        }

        // Connect bottom neighbor
        if (r < rows - 1) {
          const bottomNeighbor = dots[index + cols];
          const bx = bottomNeighbor.x + Math.sin(time + bottomNeighbor.phase) * 1.5;
          const by = bottomNeighbor.y + Math.cos(time + bottomNeighbor.phase) * 1.5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }
      });

      requestAnimationFrame(draw);
    };

    draw();

    const handleMouse = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initDots();
    };

    window.addEventListener("mousemove", handleMouse);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouse);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-[-1] bg-[#050505]" />;
};

export default DotFabric;