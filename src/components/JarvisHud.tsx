import { motion } from "framer-motion";

export const JarvisHud = () => {
  return (
    <div className="relative flex items-center justify-center w-full h-[60vh]">
      {/* Outer Glow */}
      <div className="absolute w-96 h-96 rounded-full bg-jarvis-blue/5 blur-3xl" />

      {/* Outer Ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute w-80 h-80 rounded-full border-2 border-dashed border-jarvis-blue/30"
      />

      {/* Middle Ring */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute w-64 h-64 rounded-full border-2 border-jarvis-blue/20"
      >
        <div className="absolute -top-1 left-1/2 w-2 h-2 bg-jarvis-blue rounded-full shadow-[0_0_10px_#00f2ff]" />
      </motion.div>

      {/* Inner Rotating Segments */}
      <motion.div
        animate={{ rotate: 180 }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }}
        className="absolute w-48 h-48 flex items-center justify-center"
      >
        {[0, 90, 180, 270].map((angle) => (
          <div
            key={angle}
            className="absolute h-12 w-1 bg-jarvis-blue/60"
            style={{ transform: `rotate(${angle}deg) translateY(-50px)` }}
          />
        ))}
      </motion.div>

      {/* Core Unit */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-32 h-32 rounded-full border-4 border-jarvis-blue flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.5)] bg-jarvis-bg"
        >
          <div className="w-24 h-24 rounded-full border border-jarvis-blue/40 flex items-center justify-center">
            <span className="text-jarvis-blue font-display text-xs tracking-widest uppercase">System</span>
          </div>
        </motion.div>
      </div>

      {/* Data Lines */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-0 w-32 h-[1px] bg-gradient-to-r from-transparent to-jarvis-blue/40" />
        <div className="absolute top-1/2 right-0 w-32 h-[1px] bg-gradient-to-l from-transparent to-jarvis-blue/40" />
      </div>
    </div>
  );
};
