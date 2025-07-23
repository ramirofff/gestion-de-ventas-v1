import { motion } from 'framer-motion';

export function ConfettiSuccess() {
  // Animación simple de confetti (puedes mejorarla con una librería externa si lo deseas)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 pointer-events-none z-[99] flex items-center justify-center"
    >
      <div className="text-6xl">🎉</div>
    </motion.div>
  );
}
