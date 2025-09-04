import React from 'react';
import { ClipLoader, BeatLoader, PuffLoader } from 'react-spinners';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = '#00a000', 
  type = 'clip',
  fullScreen = false,
  message = ''
}) => {
  const sizes = {
    small: 20,
    medium: 35,
    large: 50
  };

  const spinnerSize = sizes[size] || sizes.medium;

  const getSpinner = () => {
    switch (type) {
      case 'beat':
        return <BeatLoader color={color} size={spinnerSize / 3} />;
      case 'puff':
        return <PuffLoader color={color} size={spinnerSize} />;
      default:
        return <ClipLoader color={color} size={spinnerSize} />;
    }
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
        {getSpinner()}
        {message && (
          <p className="mt-4 text-gray-600 dark:text-gray-400">{message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {getSpinner()}
      {message && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{message}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;