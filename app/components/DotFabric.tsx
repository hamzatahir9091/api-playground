// "use client";
// import { useEffect, useRef } from "react";

// const DotFabric = () => {
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const mouse = useRef({ x: -1000, y: -1000 });

//   useEffect(() => {
//     const canvas = canvasRef.current!;
//     const ctx = canvas.getContext("2d")!;
//     let width = canvas.width = window.innerWidth;
//     let height = canvas.height = window.innerHeight;

//     const cols = 50;
//     const rows = 30;
//     const xStep = width / (cols - 1);
//     const yStep = height / (rows - 1);

//     // 2D array for easier neighbor access
//     const grid: { x: number; y: number; baseSize: number }[][] = [];
//     for (let j = 0; j < rows; j++) {
//       const row = [];
//       for (let i = 0; i < cols; i++) {
//         row.push({ x: i * xStep, y: j * yStep, baseSize: 1.5 });
//       }
//       grid.push(row);
//     }

//     const draw = () => {
//       ctx.clearRect(0, 0, width, height);

//       for (let j = 0; j < rows; j++) {
//         for (let i = 0; i < cols; i++) {
//           const dot = grid[j][i];
//           const dx = dot.x - mouse.current.x;
//           const dy = dot.y - mouse.current.y;
//           const dist = Math.sqrt(dx * dx + dy * dy);

//           const pullRadius = 150;
//           const scale = dist < pullRadius ? (1 - dist / pullRadius) * 2 : 0;
//           const size = dot.baseSize + scale;

//           // Draw dot
//           ctx.fillStyle = `rgba(0,255,255,${0.1 + scale * 0.3})`;
//           ctx.beginPath();
//           ctx.arc(dot.x, dot.y, size, 0, Math.PI * 2);
//           ctx.fill();

//           // Connect right neighbor
//           if (i < cols - 1) {
//             const neighbor = grid[j][i + 1];
//             const lineAlpha = 0.05 + scale * 0.2;
//             ctx.strokeStyle = `rgba(0,255,255,${lineAlpha})`;
//             ctx.lineWidth = 1;
//             ctx.beginPath();
//             ctx.moveTo(dot.x, dot.y);
//             ctx.lineTo(neighbor.x, neighbor.y);
//             ctx.stroke();
//           }

//           // Connect bottom neighbor
//           if (j < rows - 1) {
//             const neighbor = grid[j + 1][i];
//             const lineAlpha = 0.05 + scale * 0.2;
//             ctx.strokeStyle = `rgba(0,255,255,${lineAlpha})`;
//             ctx.lineWidth = 1;
//             ctx.beginPath();
//             ctx.moveTo(dot.x, dot.y);
//             ctx.lineTo(neighbor.x, neighbor.y);
//             ctx.stroke();
//           }
//         }
//       }

//       requestAnimationFrame(draw);
//     };

//     draw();

//     const handleMouse = (e: MouseEvent) => {
//       mouse.current.x = e.clientX;
//       mouse.current.y = e.clientY;
//     };
//     window.addEventListener("mousemove", handleMouse);

//     const handleResize = () => {
//       width = canvas.width = window.innerWidth;
//       height = canvas.height = window.innerHeight;
//       const xStep = width / (cols - 1);
//       const yStep = height / (rows - 1);
//       for (let j = 0; j < rows; j++) {
//         for (let i = 0; i < cols; i++) {
//           grid[j][i].x = i * xStep;
//           grid[j][i].y = j * yStep;
//         }
//       }
//     };
//     window.addEventListener("resize", handleResize);

//     return () => {
//       window.removeEventListener("mousemove", handleMouse);
//       window.removeEventListener("resize", handleResize);
//     };
//   }, []);

//   return <canvas ref={canvasRef} className="fixed inset-0 z-[-1] bg-[#050505]" />;
// };

// export default DotFabric;


"use client";
import { useEffect, useRef } from "react";

const DotFabric = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const cols = 50;
    const rows = 30;

    let dots: { x: number; y: number; baseSize: number }[] = [];

    const initDots = () => {
      dots = [];
      const xStep = width / (cols - 1);
      const yStep = height / (rows - 1);
      // Row-major order: Row 0 (all cols), then Row 1 (all cols)...
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          dots.push({ x: i * xStep, y: j * yStep, baseSize: 1.5 });
        }
      }
    };

    initDots();

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      dots.forEach((dot, index) => {
        const dx = dot.x - mouse.current.x;
        const dy = dot.y - mouse.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const pullRadius = 150;
        const scale = dist < pullRadius ? (1 - dist / pullRadius) * 2 : 0;
        const size = dot.baseSize + scale;

        // Current grid position
        const r = Math.floor(index / cols);
        const c = index % cols;

        // Draw dot
        ctx.fillStyle = `rgba(0,255,255,${0.1 + scale * 0.3})`;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, size, 0, Math.PI * 2);
        ctx.fill();

        const lineAlpha = 0.05 + scale * 0.2;
        ctx.strokeStyle = `rgba(0,255,255,${lineAlpha})`;
        ctx.lineWidth = 1;

        // 1. Connect to Right Neighbor
        if (c < cols - 1) {
          const rightNeighbor = dots[index + 1];
          ctx.beginPath();
          ctx.moveTo(dot.x, dot.y);
          ctx.lineTo(rightNeighbor.x, rightNeighbor.y);
          ctx.stroke();
        }

        // 2. Connect to Bottom Neighbor
        if (r < rows - 1) {
          const bottomNeighbor = dots[index + cols];
          ctx.beginPath();
          ctx.moveTo(dot.x, dot.y);
          ctx.lineTo(bottomNeighbor.x, bottomNeighbor.y);
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
      initDots(); // Re-calculate grid on resize
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