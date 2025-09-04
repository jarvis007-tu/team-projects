import React from 'react';

const Badge = ({ 
  children, 
  variant = 'default',
  size = 'medium',
  dot = false,
  removable = false,
  onRemove,
  className = '',
  ...props 
}) => {
  const baseClasses = `
    inline-flex items-center font-medium rounded-full
    transition-colors duration-200
  `;

  const variants = {
    default: `
      bg-gray-100 text-gray-800 
      dark:bg-gray-700 dark:text-gray-300
    `,
    primary: `
      bg-primary-100 text-primary-800 
      dark:bg-primary-900/30 dark:text-primary-400
    `,
    secondary: `
      bg-blue-100 text-blue-800 
      dark:bg-blue-900/30 dark:text-blue-400
    `,
    success: `
      bg-green-100 text-green-800 
      dark:bg-green-900/30 dark:text-green-400
    `,
    warning: `
      bg-yellow-100 text-yellow-800 
      dark:bg-yellow-900/30 dark:text-yellow-400
    `,
    danger: `
      bg-red-100 text-red-800 
      dark:bg-red-900/30 dark:text-red-400
    `,
    info: `
      bg-blue-100 text-blue-800 
      dark:bg-blue-900/30 dark:text-blue-400
    `,
    outline: `
      border border-gray-300 text-gray-700
      dark:border-gray-600 dark:text-gray-300
    `,
  };

  const sizes = {
    small: 'px-2 py-0.5 text-xs',
    medium: 'px-2.5 py-1 text-sm',
    large: 'px-3 py-1.5 text-base',
  };

  const dotSizes = {
    small: 'w-1.5 h-1.5',
    medium: 'w-2 h-2',
    large: 'w-2.5 h-2.5',
  };

  return (
    <span 
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {dot && (
        <span 
          className={`
            ${dotSizes[size]} 
            bg-current rounded-full mr-1.5
          `}
        />
      )}
      {children}
      {removable && (
        <button
          onClick={onRemove}
          className="ml-1.5 hover:text-current focus:outline-none"
          aria-label="Remove"
        >
          <svg 
            className={`${size === 'small' ? 'w-3 h-3' : 'w-4 h-4'}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        </button>
      )}
    </span>
  );
};

export const StatusBadge = ({ status, className = '', ...props }) => {
  const statusConfig = {
    active: { variant: 'success', label: 'Active' },
    inactive: { variant: 'danger', label: 'Inactive' },
    pending: { variant: 'warning', label: 'Pending' },
    approved: { variant: 'success', label: 'Approved' },
    rejected: { variant: 'danger', label: 'Rejected' },
    completed: { variant: 'success', label: 'Completed' },
    cancelled: { variant: 'danger', label: 'Cancelled' },
    processing: { variant: 'info', label: 'Processing' },
    draft: { variant: 'default', label: 'Draft' },
  };

  const config = statusConfig[status?.toLowerCase()] || { 
    variant: 'default', 
    label: status 
  };

  return (
    <Badge 
      variant={config.variant} 
      className={className}
      dot={true}
      {...props}
    >
      {config.label}
    </Badge>
  );
};

export const RoleBadge = ({ role, className = '', ...props }) => {
  const roleConfig = {
    admin: { variant: 'primary', label: 'Admin' },
    manager: { variant: 'secondary', label: 'Manager' },
    subscriber: { variant: 'info', label: 'Subscriber' },
    user: { variant: 'default', label: 'User' },
    guest: { variant: 'outline', label: 'Guest' },
  };

  const config = roleConfig[role?.toLowerCase()] || { 
    variant: 'default', 
    label: role 
  };

  return (
    <Badge 
      variant={config.variant} 
      className={className}
      {...props}
    >
      {config.label}
    </Badge>
  );
};

export const MealTypeBadge = ({ mealType, className = '', ...props }) => {
  const mealConfig = {
    breakfast: { variant: 'warning', label: 'Breakfast', icon: '🌅' },
    lunch: { variant: 'info', label: 'Lunch', icon: '☀️' },
    snack: { variant: 'secondary', label: 'Snack', icon: '🍪' },
    dinner: { variant: 'primary', label: 'Dinner', icon: '🌙' },
  };

  const config = mealConfig[mealType?.toLowerCase()] || { 
    variant: 'default', 
    label: mealType 
  };

  return (
    <Badge 
      variant={config.variant} 
      className={className}
      {...props}
    >
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </Badge>
  );
};

export const CountBadge = ({ count, className = '', ...props }) => {
  const displayCount = count > 99 ? '99+' : count;
  
  return (
    <Badge 
      variant="danger" 
      size="small"
      className={`px-1.5 min-w-[20px] text-center ${className}`}
      {...props}
    >
      {displayCount}
    </Badge>
  );
};

export default Badge;