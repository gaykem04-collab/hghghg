/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Play, RotateCcw, Pause, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

// Constants
const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 2;
const MIN_SPEED = 60;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [isPaused, setIsPaused] = useState(true);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const gameLoopRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('snake-high-score');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Save high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('snake-high-score', score.toString());
    }
  }, [score, highScore]);

  const generateFood = useCallback((currentSnake: Point[]): Point => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // Ensure food doesn't spawn on snake
      const onSnake = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!onSnake) break;
    }
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setFood({ x: 5, y: 5 });
    setDirection('RIGHT');
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setIsGameOver(false);
    setIsPaused(false);
  };

  const moveSnake = useCallback(() => {
    if (isPaused || isGameOver) return;

    setSnake(prevSnake => {
      const head = prevSnake[0];
      const newHead = { ...head };

      switch (direction) {
        case 'UP': newHead.y -= 1; break;
        case 'DOWN': newHead.y += 1; break;
        case 'LEFT': newHead.x -= 1; break;
        case 'RIGHT': newHead.x += 1; break;
      }

      // Collision detection: Walls
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setIsGameOver(true);
        return prevSnake;
      }

      // Collision detection: Self
      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setIsGameOver(true);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check if food eaten
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 10);
        setFood(generateFood(newSnake));
        setSpeed(prev => Math.max(MIN_SPEED, prev - SPEED_INCREMENT));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, isPaused, isGameOver, generateFood]);

  // Game loop
  useEffect(() => {
    const loop = (timestamp: number) => {
      if (!lastUpdateTimeRef.current) lastUpdateTimeRef.current = timestamp;
      const elapsed = timestamp - lastUpdateTimeRef.current;

      if (elapsed > speed) {
        moveSnake();
        lastUpdateTimeRef.current = timestamp;
      }
      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [moveSnake, speed]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': if (direction !== 'DOWN') setDirection('UP'); break;
        case 'ArrowDown': if (direction !== 'UP') setDirection('DOWN'); break;
        case 'ArrowLeft': if (direction !== 'RIGHT') setDirection('LEFT'); break;
        case 'ArrowRight': if (direction !== 'LEFT') setDirection('RIGHT'); break;
        case ' ': setIsPaused(prev => !prev); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / GRID_SIZE;

    // Clear canvas
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines (subtle)
    ctx.strokeStyle = '#1e293b'; // slate-800
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }

    // Draw food
    ctx.fillStyle = '#ef4444'; // red-500
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ef4444';
    ctx.beginPath();
    ctx.arc(
      food.x * cellSize + cellSize / 2,
      food.y * cellSize + cellSize / 2,
      cellSize / 2.5,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw snake
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      ctx.fillStyle = isHead ? '#10b981' : '#059669'; // emerald-500 : emerald-600
      
      if (isHead) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#10b981';
      }

      // Rounded rectangle for snake segments
      const x = segment.x * cellSize + 2;
      const y = segment.y * cellSize + 2;
      const size = cellSize - 4;
      const radius = 4;

      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + size - radius, y);
      ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
      ctx.lineTo(x + size, y + size - radius);
      ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
      ctx.lineTo(x + radius, y + size);
      ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
      
      ctx.shadowBlur = 0;
    });
  }, [snake, food]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md flex flex-col gap-6"
      >
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tighter text-emerald-500">NEON SNAKE</h1>
            <p className="text-slate-400 text-sm">Classic arcade, modern feel</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
              <Trophy size={16} />
              <span>BEST: {highScore}</span>
            </div>
            <div className="text-2xl font-mono font-bold">{score.toString().padStart(5, '0')}</div>
          </div>
        </div>

        {/* Game Area */}
        <div className="relative aspect-square w-full bg-slate-900 rounded-2xl border-4 border-slate-800 shadow-2xl overflow-hidden">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="w-full h-full"
          />

          {/* Overlays */}
          <AnimatePresence>
            {(isPaused || isGameOver) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
              >
                {isGameOver ? (
                  <>
                    <motion.h2 
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="text-5xl font-black text-red-500 mb-2"
                    >
                      GAME OVER
                    </motion.h2>
                    <p className="text-slate-300 mb-8">You scored {score} points!</p>
                    <button
                      onClick={resetGame}
                      className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-8 py-3 rounded-full font-bold transition-all transform hover:scale-105 active:scale-95"
                    >
                      <RotateCcw size={20} />
                      TRY AGAIN
                    </button>
                  </>
                ) : (
                  <>
                    <motion.h2 
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="text-5xl font-black text-emerald-500 mb-8"
                    >
                      PAUSED
                    </motion.h2>
                    <button
                      onClick={() => setIsPaused(false)}
                      className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-8 py-3 rounded-full font-bold transition-all transform hover:scale-105 active:scale-95"
                    >
                      <Play size={20} />
                      RESUME
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls & Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Controls</h3>
            <div className="flex flex-col gap-2 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <kbd className="bg-slate-800 px-2 py-1 rounded text-xs">Arrows</kbd>
                <span>to Move</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="bg-slate-800 px-2 py-1 rounded text-xs">Space</kbd>
                <span>to Pause</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => setIsPaused(prev => !prev)}
              disabled={isGameOver}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
            >
              {isPaused ? <Play size={20} /> : <Pause size={20} />}
              <span className="font-bold">{isPaused ? 'START' : 'PAUSE'}</span>
            </button>
            <button
              onClick={resetGame}
              className="flex-1 flex items-center justify-center gap-2 border border-slate-800 hover:bg-slate-900 rounded-xl transition-colors"
            >
              <RotateCcw size={18} />
              <span className="font-bold text-sm">RESET</span>
            </button>
          </div>
        </div>

        {/* Mobile Controls (Visible on small screens) */}
        <div className="md:hidden grid grid-cols-3 gap-2 max-w-[200px] mx-auto mt-4">
          <div />
          <ControlButton icon={<ChevronUp />} onClick={() => direction !== 'DOWN' && setDirection('UP')} />
          <div />
          <ControlButton icon={<ChevronLeft />} onClick={() => direction !== 'RIGHT' && setDirection('LEFT')} />
          <ControlButton icon={<ChevronDown />} onClick={() => direction !== 'UP' && setDirection('DOWN')} />
          <ControlButton icon={<ChevronRight />} onClick={() => direction !== 'LEFT' && setDirection('RIGHT')} />
        </div>
      </motion.div>
    </div>
  );
}

function ControlButton({ icon, onClick }: { icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="aspect-square bg-slate-800 active:bg-emerald-500 active:text-slate-950 rounded-xl flex items-center justify-center transition-all"
    >
      {icon}
    </button>
  );
}
