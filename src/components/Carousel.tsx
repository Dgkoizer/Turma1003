import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Activity } from '../types';

interface CarouselProps {
  activities: Activity[];
}

export const Carousel: React.FC<CarouselProps> = ({ activities }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (activities.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activities.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activities.length]);

  if (activities.length === 0) {
    return (
      <div className="h-64 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-600 italic border-2 border-dashed border-slate-100 dark:border-white/5">
        Nenhuma atividade em destaque
      </div>
    );
  }

  const next = () => setCurrentIndex((prev) => (prev + 1) % activities.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + activities.length) % activities.length);

  return (
    <div className="relative h-96 w-full overflow-hidden rounded-2xl shadow-2xl group">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <img
            src={activities[currentIndex].image_url}
            alt={activities[currentIndex].title}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-8">
            <h3 className="text-white text-3xl font-bold font-display drop-shadow-lg">{activities[currentIndex].title}</h3>
          </div>
        </motion.div>
      </AnimatePresence>

      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
      >
        <ChevronRight size={24} />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {activities.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === currentIndex ? 'bg-white w-6' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
