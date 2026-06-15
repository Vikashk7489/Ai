import { motion } from "framer-motion";

interface Props {
  isActive: boolean;
}

export const AudioVisualizer = ({ isActive }: Props) => {
  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            height: isActive ? [8, 24, 12, 32, 8] : 4,
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.05,
            ease: "easeInOut",
          }}
          className="w-1 bg-jarvis-blue rounded-full shadow-[0_0_5px_rgba(0,242,255,0.5)]"
        />
      ))}
    </div>
  );
};
