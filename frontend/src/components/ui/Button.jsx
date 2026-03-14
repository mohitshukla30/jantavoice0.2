import React from 'react';
import { motion } from 'framer-motion';

// type can be 'primary' | 'secondary' | 'outline' | 'ghost'
export default function Button({ children, type = 'primary', className = '', ...props }) {
  const variant = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
  }[type] || 'btn-primary';

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      className={`${variant} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
