import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

interface Point { x: number; y: number; }
interface Ripple { x: number; y: number; radius: number; opacity: number; born: number; }

const CELL_SIZE = 55;
const INFLUENCE_RADIUS = 260;
const MAX_WARP = 24;
const DOT_SPACING = 28;
const LERP_SPEED = 0.08;
const LINE_BASE = { r: 255, g: 255, b: 255, a: 0.08 };
const NODE_BASE_RADIUS = 1.8;
const NODE_ACTIVE_RADIUS = 3.2;

const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

function lerpColor(base: typeof LINE_BASE, active: typeof LINE_BASE, amount: number) {
  return `rgba(${Math.round(lerp(base.r, active.r, amount))},${Math.round(lerp(base.g, active.g, amount))},${Math.round(lerp(base.b, active.b, amount))},${lerp(base.a, active.a, amount).toFixed(3)})`;
}

/** A full-viewport, pointer-reactive canvas background. */
export default function KineticGrid({ children, className, globalColor = 'default' }: { children?: ReactNode; className?: string; globalColor?: 'default' | 'monochrome'; }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<Point>({ x: -9999, y: -9999 });
  const targetMouseRef = useRef<Point>({ x: -9999, y: -9999 });
  const ripplesRef = useRef<Ripple[]>([]);
  const rafRef = useRef<number>(0);
  const lastMoveRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });

  const warpedPoint = useCallback((gx: number, gy: number, col: number, row: number, mouse: Point, ripples: Ripple[], cols: number, rows: number) => {
    const edgeMargin = 1.5;
    const colPin = Math.min(col / edgeMargin, (cols - 1 - col) / edgeMargin, 1);
    const rowPin = Math.min(row / edgeMargin, (rows - 1 - row) / edgeMargin, 1);
    const pinFactor = colPin * colPin * rowPin * rowPin;
    const dx = gx - mouse.x;
    const dy = gy - mouse.y;
    const distance = Math.hypot(dx, dy);
    const proximity = Math.max(0, 1 - distance / INFLUENCE_RADIUS) * pinFactor;
    let rippleX = 0;
    let rippleY = 0;

    for (const ripple of ripples) {
      const rdx = gx - ripple.x;
      const rdy = gy - ripple.y;
      const rippleDistance = Math.hypot(rdx, rdy);
      const difference = rippleDistance - ripple.radius;
      if (Math.abs(difference) < 55) {
        const strength = (1 - Math.abs(difference) / 55) * ripple.opacity * 18 * pinFactor;
        const angle = Math.atan2(rdy, rdx);
        const sign = difference < 0 ? -1 : 1;
        rippleX += Math.cos(angle) * strength * sign * -1;
        rippleY += Math.sin(angle) * strength * sign * -1;
      }
    }

    if (distance < INFLUENCE_RADIUS && distance > 0 && pinFactor > 0) {
      const normalizedDistance = distance / INFLUENCE_RADIUS;
      const eased = normalizedDistance < 0.01 ? 0 : (1 - normalizedDistance) ** 2 * Math.min(1, distance / 60);
      const angle = Math.atan2(dy, dx);
      const warp = eased * MAX_WARP * pinFactor;
      return { point: { x: gx - Math.cos(angle) * warp + rippleX, y: gy - Math.sin(angle) * warp + rippleY }, proximity };
    }
    return { point: { x: gx + rippleX, y: gy + rippleY }, proximity };
  }, []);

  const draw = useCallback((now: number) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const { w: width, h: height } = sizeRef.current;
    const theme = globalColor === 'monochrome'
      ? { background: '#09090b', active: { r: 255, g: 255, b: 255, a: 0.9 }, glow: '255,255,255' }
      : { background: '#09090b', active: { r: 74, g: 158, b: 255, a: 0.9 }, glow: '74,158,255' };

    context.clearRect(0, 0, width, height);
    context.fillStyle = theme.background;
    context.fillRect(0, 0, width, height);
    context.fillStyle = 'rgba(255,255,255,0.03)';
    for (let x = DOT_SPACING / 2; x < width; x += DOT_SPACING) for (let y = DOT_SPACING / 2; y < height; y += DOT_SPACING) { context.beginPath(); context.arc(x, y, 0.7, 0, Math.PI * 2); context.fill(); }

    const ripples = ripplesRef.current;
    for (let index = ripples.length - 1; index >= 0; index--) {
      const ripple = ripples[index];
      const age = (now - ripple.born) / 1000;
      ripple.radius = Math.max(0, age * 400);
      ripple.opacity = Math.max(0, 1 - age * 1.2);
      if (ripple.opacity <= 0) ripples.splice(index, 1);
    }

    const cols = Math.max(2, Math.ceil(width / CELL_SIZE)) + 1;
    const rows = Math.max(2, Math.ceil(height / CELL_SIZE)) + 1;
    const cellWidth = width / (cols - 1);
    const cellHeight = height / (rows - 1);
    const points: Point[][] = [];
    const proximity: number[][] = [];
    for (let row = 0; row < rows; row++) {
      points[row] = []; proximity[row] = [];
      for (let col = 0; col < cols; col++) {
        const result = warpedPoint(col * cellWidth, row * cellHeight, col, row, mouseRef.current, ripples, cols, rows);
        points[row][col] = result.point; proximity[row][col] = result.proximity;
      }
    }
    const drawSegment = (first: Point, second: Point, firstProximity: number, secondProximity: number) => {
      const average = (firstProximity + secondProximity) / 2;
      const amount = average * average * (3 - 2 * average);
      context.beginPath(); context.moveTo(first.x, first.y); context.lineTo(second.x, second.y);
      context.strokeStyle = lerpColor(LINE_BASE, theme.active, amount);
      context.lineWidth = lerp(0.8, 1.5, amount); context.stroke();
    };
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols - 1; col++) drawSegment(points[row][col], points[row][col + 1], proximity[row][col], proximity[row][col + 1]);
    for (let col = 0; col < cols; col++) for (let row = 0; row < rows - 1; row++) drawSegment(points[row][col], points[row + 1][col], proximity[row][col], proximity[row + 1][col]);
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const point = points[row][col]; const amount = proximity[row][col] ** 2 * (3 - 2 * proximity[row][col]);
      const radius = lerp(NODE_BASE_RADIUS, NODE_ACTIVE_RADIUS, amount);
      if (amount > 0.3) { const glowRadius = radius + lerp(0, 6, (amount - 0.3) / 0.7); const gradient = context.createRadialGradient(point.x, point.y, radius * 0.5, point.x, point.y, glowRadius); gradient.addColorStop(0, `rgba(${theme.glow},${(amount * 0.3).toFixed(3)})`); gradient.addColorStop(1, `rgba(${theme.glow},0)`); context.beginPath(); context.arc(point.x, point.y, glowRadius, 0, Math.PI * 2); context.fillStyle = gradient; context.fill(); }
      context.beginPath(); context.arc(point.x, point.y, radius, 0, Math.PI * 2); context.fillStyle = lerpColor({ r: 255, g: 255, b: 255, a: 0.2 }, theme.active, amount); context.fill();
    }
    for (const ripple of ripples) { context.beginPath(); context.arc(ripple.x, ripple.y, Math.max(0, ripple.radius), 0, Math.PI * 2); context.strokeStyle = `rgba(${theme.glow},${(ripple.opacity * 0.28).toFixed(3)})`; context.lineWidth = 1.5; context.stroke(); }
  }, [globalColor, warpedPoint]);

  const animate = useCallback((now: number) => {
    if (lastMoveRef.current && now - lastMoveRef.current > 550) targetMouseRef.current = { x: -9999, y: -9999 };
    mouseRef.current.x = lerp(mouseRef.current.x, targetMouseRef.current.x, LERP_SPEED);
    mouseRef.current.y = lerp(mouseRef.current.y, targetMouseRef.current.y, LERP_SPEED);
    draw(now);
    rafRef.current = requestAnimationFrame(animate);
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const supportsPointerInteraction = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const setSize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; sizeRef.current = { w: canvas.width, h: canvas.height }; };
    const onMove = (event: MouseEvent) => { targetMouseRef.current = { x: event.clientX, y: event.clientY }; lastMoveRef.current = performance.now(); };
    const onClick = (event: MouseEvent) => { ripplesRef.current.push({ x: event.clientX, y: event.clientY, radius: 0, opacity: 1, born: performance.now() }); };
    setSize();
    if (!supportsPointerInteraction) { draw(performance.now()); return () => undefined; }
    window.addEventListener('resize', setSize); window.addEventListener('mousemove', onMove); window.addEventListener('click', onClick); rafRef.current = requestAnimationFrame(animate);
    return () => { window.removeEventListener('resize', setSize); window.removeEventListener('mousemove', onMove); window.removeEventListener('click', onClick); cancelAnimationFrame(rafRef.current); };
  }, [animate]);

  return <div className={cn('relative min-h-screen w-full overflow-hidden bg-[#09090b]', className)}><canvas ref={canvasRef} className="fixed inset-0 z-0 h-full w-full pointer-events-none" aria-hidden="true" /><div className="relative z-10 min-h-screen w-full">{children}</div></div>;
}
