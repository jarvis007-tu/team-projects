import React from 'react';

export const Card = ({ 
  children, 
  className = '', 
  padding = true,
  hover = false,
  onClick,
  ...props 
}) => {
  const baseClasses = `
    bg-white dark:bg-gray-800 
    rounded-xl shadow-sm 
    border border-gray-200 dark:border-gray-700
    transition-all duration-200
  `;
  
  const hoverClasses = hover ? `
    hover:shadow-md hover:border-gray-300 
    dark:hover:border-gray-600 cursor-pointer
  ` : '';
  
  const paddingClasses = padding ? 'p-6' : '';
  
  return (
    <div 
      className={`${baseClasses} ${hoverClasses} ${paddingClasses} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`px-6 py-4 border-b border-gray-200 dark:border-gray-700 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardTitle = ({ children, className = '', ...props }) => {
  return (
    <h3 
      className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
};

export const CardDescription = ({ children, className = '', ...props }) => {
  return (
    <p 
      className={`text-sm text-gray-600 dark:text-gray-400 mt-1 ${className}`}
      {...props}
    >
      {children}
    </p>
  );
};

export const CardContent = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardFooter = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`px-6 py-4 border-t border-gray-200 dark:border-gray-700 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const StatsCard = ({ 
  title, 
  value, 
  change, 
  changeType = 'positive', 
  icon: Icon,
  iconBgColor = 'blue',
  className = '' 
}) => {
  const changeColors = {
    positive: 'text-green-600 dark:text-green-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-600 dark:text-gray-400',
  };

  const iconBgColors = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  };

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-4">
        {Icon && (
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconBgColors[iconBgColor]}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
        {change && (
          <span className={`text-sm font-medium ${changeColors[changeType]}`}>
            {change}
          </span>
        )}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
        {title}
      </p>
    </Card>
  );
};

export const MetricCard = ({ 
  metric, 
  value, 
  label, 
  icon: Icon,
  trend,
  className = '' 
}) => {
  return (
    <Card className={`flex items-center space-x-4 ${className}`} padding={true}>
      {Icon && (
        <div className="flex-shrink-0">
          <Icon className="w-8 h-8 text-gray-600 dark:text-gray-400" />
        </div>
      )}
      <div className="flex-1">
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </span>
          {metric && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {metric}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {label}
        </p>
        {trend && (
          <div className="flex items-center mt-2">
            <span className={`text-xs font-medium ${
              trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default Card;