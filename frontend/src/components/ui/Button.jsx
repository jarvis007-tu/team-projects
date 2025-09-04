import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium',
  fullWidth = false,
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  onClick,
  type = 'button',
  ...props 
}) => {
  const baseClasses = `
    inline-flex items-center justify-center
    font-medium rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variants = {
    primary: `
      bg-primary-600 text-white 
      hover:bg-primary-700 active:bg-primary-800
      focus:ring-primary-500
      dark:bg-primary-500 dark:hover:bg-primary-600
    `,
    secondary: `
      bg-gray-200 text-gray-900 
      hover:bg-gray-300 active:bg-gray-400
      focus:ring-gray-500
      dark:bg-gray-700 dark:text-gray-100 
      dark:hover:bg-gray-600 dark:active:bg-gray-500
    `,
    outline: `
      border-2 border-gray-300 bg-transparent text-gray-700
      hover:bg-gray-50 active:bg-gray-100
      focus:ring-gray-500
      dark:border-gray-600 dark:text-gray-300
      dark:hover:bg-gray-800 dark:active:bg-gray-700
    `,
    ghost: `
      bg-transparent text-gray-700
      hover:bg-gray-100 active:bg-gray-200
      focus:ring-gray-500
      dark:text-gray-300 dark:hover:bg-gray-800 
      dark:active:bg-gray-700
    `,
    danger: `
      bg-red-600 text-white 
      hover:bg-red-700 active:bg-red-800
      focus:ring-red-500
      dark:bg-red-500 dark:hover:bg-red-600
    `,
    success: `
      bg-green-600 text-white 
      hover:bg-green-700 active:bg-green-800
      focus:ring-green-500
      dark:bg-green-500 dark:hover:bg-green-600
    `,
    warning: `
      bg-yellow-500 text-white 
      hover:bg-yellow-600 active:bg-yellow-700
      focus:ring-yellow-400
      dark:bg-yellow-400 dark:hover:bg-yellow-500
    `,
  };

  const sizes = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  const LoadingSpinner = () => (
    <svg 
      className="animate-spin h-4 w-4" 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${widthClass}
        ${className}
      `}
      {...props}
    >
      {loading && iconPosition === 'left' && (
        <LoadingSpinner />
      )}
      {!loading && Icon && iconPosition === 'left' && (
        <Icon className="w-5 h-5 mr-2" />
      )}
      <span>{children}</span>
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="w-5 h-5 ml-2" />
      )}
      {loading && iconPosition === 'right' && (
        <LoadingSpinner />
      )}
    </button>
  );
};

export const IconButton = ({ 
  icon: Icon,
  variant = 'ghost',
  size = 'medium',
  className = '',
  'aria-label': ariaLabel,
  ...props 
}) => {
  const baseClasses = `
    inline-flex items-center justify-center
    rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variants = {
    primary: `
      bg-primary-600 text-white 
      hover:bg-primary-700
      focus:ring-primary-500
    `,
    ghost: `
      text-gray-700 hover:bg-gray-100
      dark:text-gray-300 dark:hover:bg-gray-800
      focus:ring-gray-500
    `,
    danger: `
      text-red-600 hover:bg-red-50
      dark:text-red-400 dark:hover:bg-red-900/20
      focus:ring-red-500
    `,
  };

  const sizes = {
    small: 'p-1',
    medium: 'p-2',
    large: 'p-3',
  };

  const iconSizes = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6',
  };

  return (
    <button
      aria-label={ariaLabel}
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      <Icon className={iconSizes[size]} />
    </button>
  );
};

export const ButtonGroup = ({ children, className = '' }) => {
  return (
    <div className={`inline-flex rounded-lg shadow-sm ${className}`} role="group">
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          const isFirst = index === 0;
          const isLast = index === React.Children.count(children) - 1;
          
          return React.cloneElement(child, {
            className: `
              ${child.props.className || ''}
              ${!isFirst && !isLast ? 'rounded-none border-x-0' : ''}
              ${isFirst ? 'rounded-r-none' : ''}
              ${isLast ? 'rounded-l-none' : ''}
            `,
          });
        }
        return child;
      })}
    </div>
  );
};

export default Button;