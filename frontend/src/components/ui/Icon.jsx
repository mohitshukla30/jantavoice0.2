import React from 'react';
import * as Lucide from 'lucide-react';

// Usage: <Icon name="Mic" size={24} />
export default function Icon({ name, size = 24, strokeWidth = 1.5, color = 'currentColor', className = '', ...props }) {
  const Component = Lucide[name];
  if (!Component) return null;
  return <Component size={size} strokeWidth={strokeWidth} color={color} className={className} {...props} />;
}
