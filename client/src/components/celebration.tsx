import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy, Target, Zap } from "lucide-react";

interface CelebrationProps {
  isVisible: boolean;
  onComplete: () => void;
  streak: number;
  accomplishmentText?: string;
}

export function Celebration({ isVisible, onComplete, streak, accomplishmentText }: CelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
        onComplete();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  const getStreakMessage = () => {
    if (streak === 1) return "Great start! 🌟";
    if (streak < 7) return `${streak} days strong! 💪`;
    if (streak < 30) return `${streak} day streak! 🔥`;
    return `${streak} days! You're unstoppable! 🚀`;
  };

  const getStreakIcon = () => {
    if (streak === 1) return <Target className="w-8 h-8" />;
    if (streak < 7) return <Zap className="w-8 h-8" />;
    if (streak < 30) return <Sparkles className="w-8 h-8" />;
    return <Trophy className="w-8 h-8" />;
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl border border-gray-200 dark:border-gray-700"
          >
            {/* Confetti Animation */}
            {showConfetti && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                    initial={{
                      x: "50%",
                      y: "50%",
                      scale: 0,
                    }}
                    animate={{
                      x: `${Math.random() * 400 - 200}%`,
                      y: `${Math.random() * 400 - 200}%`,
                      scale: [0, 1, 0],
                      rotate: 360,
                    }}
                    transition={{
                      duration: 2,
                      delay: i * 0.1,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </div>
            )}

            {/* Celebration Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="text-yellow-500 mb-4 flex justify-center"
            >
              {getStreakIcon()}
            </motion.div>

            {/* Main Message */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
            >
              Well Done!
            </motion.h2>

            {/* Accomplishment Text */}
            {accomplishmentText && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-gray-600 dark:text-gray-300 mb-4 text-sm"
              >
                "{accomplishmentText}"
              </motion.p>
            )}

            {/* Streak Message */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-lg p-4"
            >
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                {getStreakMessage()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Keep up the momentum!
              </p>
            </motion.div>

            {/* Pulse Ring Animation */}
            <motion.div
              className="absolute inset-0 border-2 border-yellow-400 rounded-2xl"
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.5, 0.2, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function MiniCelebration({ streak }: { streak: number }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-full px-3 py-1 text-sm font-medium text-yellow-700 dark:text-yellow-300"
    >
      <Sparkles className="w-4 h-4" />
      <span>{streak} day streak!</span>
    </motion.div>
  );
}