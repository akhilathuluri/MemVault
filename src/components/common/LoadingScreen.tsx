import { motion } from 'framer-motion';

const LoadingScreen = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50">
      <motion.div
        className="p-4 max-w-md w-full flex flex-col items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-20 h-20 relative">
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-t-primary-600 border-r-primary-300 border-b-primary-100 border-l-primary-300"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-primary-700">MemVault</h1>
        <p className="mt-2 text-neutral-500">Loading your memories...</p>
      </motion.div>
    </div>
  );
};

export default LoadingScreen;