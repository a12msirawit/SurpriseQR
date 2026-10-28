"use client";

import { useEffect, useRef } from "react";

const STAR_COLORS = ["#ffffff", "#ff69b4", "#d8b4fe", "#8a2be2", "#7dd3fc"];

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  speed: number;
  color: string;
}

class SparkleParticle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;

  constructor(x: number, y: number) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 4;
    this.x = x;
    this.y = y;
    this.velocityX = Math.cos(angle) * speed;
    this.velocityY = Math.sin(angle) * speed;
    this.size = 2 + Math.random() * 3;
    this.alpha = 1;
    this.decay = 0.015 + Math.random() * 0.025;
    this.color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
  }

  update() {
    this.velocityX *= 0.95;
    this.velocityY *= 0.95;
    this.x += this.velocityX;
    this.y += this.velocityY;
    this.alpha -= this.decay;
  }

  draw(context: CanvasRenderingContext2D) {
    context.save();
    context.globalAlpha = Math.max(this.alpha, 0);
    context.fillStyle = this.color;
    context.beginPath();
    context.moveTo(this.x, this.y - this.size);
    context.lineTo(this.x + this.size * 0.35, this.y - this.size * 0.35);
    context.lineTo(this.x + this.size, this.y);
    context.lineTo(this.x + this.size * 0.35, this.y + this.size * 0.35);
    context.lineTo(this.x, this.y + this.size);
    context.lineTo(this.x - this.size * 0.35, this.y + this.size * 0.35);
    context.lineTo(this.x - this.size, this.y);
    context.lineTo(this.x - this.size * 0.35, this.y - this.size * 0.35);
    context.closePath();
    context.fill();
    context.restore();
  }

  get isAlive() {
    return this.alpha > 0;
  }
}

export default function CosmicBackground() {
  const starfieldCanvasRef = useRef<HTMLCanvasElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const starFrameRef = useRef<number | null>(null);
  const particleFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<SparkleParticle[]>([]);

  useEffect(() => {
    const canvas = starfieldCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let stars: Star[] = [];
    let devicePixelRatio = 1;

    const resize = () => {
      devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      const count = Math.floor((window.innerWidth * window.innerHeight) / 9000);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: 0.3 + Math.random() * 1.5,
        alpha: 0.35 + Math.random() * 0.65,
        speed: 0.002 + Math.random() * 0.012,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      }));
    };

    const animate = (time: number) => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const star of stars) {
        const twinkle = star.alpha * (0.78 + Math.sin(time * star.speed) * 0.22);
        context.globalAlpha = twinkle;
        context.fillStyle = star.color;
        context.beginPath();
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      starFrameRef.current = window.requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener("resize", resize);
    starFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      if (starFrameRef.current !== null) window.cancelAnimationFrame(starFrameRef.current);
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };
  }, []);

  useEffect(() => {
    const canvas = particleCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let devicePixelRatio = 1;
    const resize = () => {
      devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    const handleClick = (event: MouseEvent) => {
      for (let index = 0; index < 24; index += 1) {
        particlesRef.current.push(new SparkleParticle(event.clientX, event.clientY));
      }
    };
    const animate = () => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      particlesRef.current = particlesRef.current.filter((particle) => {
        particle.update();
        particle.draw(context);
        return particle.isAlive;
      });
      particleFrameRef.current = window.requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("click", handleClick);
    particleFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("click", handleClick);
      if (particleFrameRef.current !== null) window.cancelAnimationFrame(particleFrameRef.current);
      particlesRef.current = [];
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };
  }, []);

  return (
    <>
      <canvas ref={starfieldCanvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0" />
      <canvas ref={particleCanvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[9999]" />
    </>
  );
}
