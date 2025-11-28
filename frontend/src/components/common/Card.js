// components/common/Card.js
import React from 'react';

const Card = ({
  children,
  className = '',
  padding = 'md',
  hover = false,
  onClick,
  ...props
}) => {
  const baseStyles = 'bg-white rounded-2xl border border-slate-200 transition-all duration-300';
  
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const hoverStyles = hover ? 'hover:shadow-xl hover:scale-[1.02] cursor-pointer' : 'shadow-sm';

  const classes = `${baseStyles} ${paddings[padding]} ${hoverStyles} ${className}`;

  return (
    <div className={classes} onClick={onClick} {...props}>
      {children}
    </div>
  );
};

export default Card;