import React from 'react';

export const Input = ({ className = '', ...props }) => {
  const baseClasses = `
    w-full px-4 py-2.5 
    border border-gray-300 rounded-lg 
    bg-white text-gray-900 placeholder-gray-500
    focus:ring-2 focus:ring-primary-500 focus:border-transparent
    dark:bg-gray-800 dark:border-gray-600 
    dark:text-white dark:placeholder-gray-400
    dark:focus:ring-primary-400 dark:focus:border-transparent
    transition-colors duration-200
  `;
  
  return (
    <input 
      className={`${baseClasses} ${className}`} 
      {...props} 
    />
  );
};

export const Select = ({ className = '', children, ...props }) => {
  const baseClasses = `
    w-full px-4 py-2.5 
    border border-gray-300 rounded-lg 
    bg-white text-gray-900
    focus:ring-2 focus:ring-primary-500 focus:border-transparent
    dark:bg-gray-800 dark:border-gray-600 dark:text-white
    dark:focus:ring-primary-400 dark:focus:border-transparent
    transition-colors duration-200
    cursor-pointer
  `;
  
  return (
    <select 
      className={`${baseClasses} ${className}`} 
      {...props}
    >
      {children}
    </select>
  );
};

export const Textarea = ({ className = '', ...props }) => {
  const baseClasses = `
    w-full px-4 py-2.5 
    border border-gray-300 rounded-lg 
    bg-white text-gray-900 placeholder-gray-500
    focus:ring-2 focus:ring-primary-500 focus:border-transparent
    dark:bg-gray-800 dark:border-gray-600 
    dark:text-white dark:placeholder-gray-400
    dark:focus:ring-primary-400 dark:focus:border-transparent
    transition-colors duration-200
    resize-y min-h-[100px]
  `;
  
  return (
    <textarea 
      className={`${baseClasses} ${className}`} 
      {...props} 
    />
  );
};

export const Label = ({ className = '', children, required = false, ...props }) => {
  const baseClasses = `
    block text-sm font-medium mb-2
    text-gray-700 dark:text-gray-200
  `;
  
  return (
    <label className={`${baseClasses} ${className}`} {...props}>
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
};

export const FormGroup = ({ children, className = '' }) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {children}
    </div>
  );
};

export const ErrorMessage = ({ message, className = '' }) => {
  if (!message) return null;
  
  return (
    <p className={`text-sm text-red-600 dark:text-red-400 mt-1 ${className}`}>
      {message}
    </p>
  );
};

export const HelperText = ({ children, className = '' }) => {
  return (
    <p className={`text-sm text-gray-500 dark:text-gray-400 mt-1 ${className}`}>
      {children}
    </p>
  );
};

export const Checkbox = ({ label, className = '', ...props }) => {
  return (
    <label className="flex items-center space-x-3 cursor-pointer">
      <input
        type="checkbox"
        className={`
          w-4 h-4 
          text-primary-600 
          border-gray-300 rounded 
          focus:ring-primary-500 focus:ring-2
          dark:border-gray-600 dark:bg-gray-800
          dark:focus:ring-primary-400
          ${className}
        `}
        {...props}
      />
      {label && (
        <span className="text-gray-700 dark:text-gray-200 select-none">
          {label}
        </span>
      )}
    </label>
  );
};

export const RadioButton = ({ label, className = '', ...props }) => {
  return (
    <label className="flex items-center space-x-3 cursor-pointer">
      <input
        type="radio"
        className={`
          w-4 h-4 
          text-primary-600 
          border-gray-300 
          focus:ring-primary-500 focus:ring-2
          dark:border-gray-600 dark:bg-gray-800
          dark:focus:ring-primary-400
          ${className}
        `}
        {...props}
      />
      {label && (
        <span className="text-gray-700 dark:text-gray-200 select-none">
          {label}
        </span>
      )}
    </label>
  );
};

export const SearchInput = ({ className = '', ...props }) => {
  return (
    <div className="relative">
      <Input 
        className={`pl-10 ${className}`}
        {...props}
      />
      <svg 
        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
        />
      </svg>
    </div>
  );
};