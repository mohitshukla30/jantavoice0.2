import React from 'react';
import { motion } from 'framer-motion';

export default function Card({ children, glass = true, className = '', ...props }) {
  const base = glass ? 'glass-card' : 'bg-card border border-border shadow-sm rounded-2xl';
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`${base} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
