import React from 'react';

export const Table = ({ children, className = '', ...props }) => {
  return (
    <div className="overflow-x-auto">
      <table 
        className={`w-full ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
};

export const TableHeader = ({ children, className = '', ...props }) => {
  return (
    <thead 
      className={`bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 ${className}`}
      {...props}
    >
      {children}
    </thead>
  );
};

export const TableBody = ({ children, className = '', ...props }) => {
  return (
    <tbody 
      className={`divide-y divide-gray-200 dark:divide-gray-700 ${className}`}
      {...props}
    >
      {children}
    </tbody>
  );
};

export const TableRow = ({ 
  children, 
  hover = true,
  selected = false,
  className = '', 
  ...props 
}) => {
  const hoverClass = hover ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50' : '';
  const selectedClass = selected ? 'bg-primary-50 dark:bg-primary-900/20' : '';
  
  return (
    <tr 
      className={`
        transition-colors duration-150
        ${hoverClass}
        ${selectedClass}
        ${className}
      `}
      {...props}
    >
      {children}
    </tr>
  );
};

export const TableHead = ({ 
  children, 
  sortable = false,
  sorted = null,
  onClick,
  className = '', 
  ...props 
}) => {
  const baseClasses = `
    px-6 py-3 text-left text-xs font-medium 
    text-gray-600 dark:text-gray-300 
    uppercase tracking-wider
  `;
  
  const sortableClasses = sortable ? `
    cursor-pointer select-none
    hover:text-gray-900 dark:hover:text-white
  ` : '';
  
  return (
    <th 
      className={`${baseClasses} ${sortableClasses} ${className}`}
      onClick={sortable ? onClick : undefined}
      {...props}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortable && (
          <span className="ml-1">
            {sorted === 'asc' && '↑'}
            {sorted === 'desc' && '↓'}
            {sorted === null && (
              <svg 
                className="w-4 h-4 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" 
                />
              </svg>
            )}
          </span>
        )}
      </div>
    </th>
  );
};

export const TableCell = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <td 
      className={`
        px-6 py-4 whitespace-nowrap text-sm 
        text-gray-900 dark:text-gray-100
        ${className}
      `}
      {...props}
    >
      {children}
    </td>
  );
};

export const TableFooter = ({ children, className = '', ...props }) => {
  return (
    <tfoot 
      className={`
        bg-gray-50 dark:bg-gray-800/50 
        border-t border-gray-200 dark:border-gray-700 
        ${className}
      `}
      {...props}
    >
      {children}
    </tfoot>
  );
};

export const TablePagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  itemsPerPage = 10,
  totalItems,
  className = '' 
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  const pages = [];
  const maxVisiblePages = 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  
  return (
    <div className={`flex items-center justify-between px-6 py-3 ${className}`}>
      <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
        Showing {startItem} to {endItem} of {totalItems} results
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`
            px-3 py-1 rounded-md text-sm font-medium
            ${currentPage === 1 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600' 
              : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }
            border border-gray-300 dark:border-gray-600
            transition-colors duration-200
          `}
        >
          Previous
        </button>
        
        {startPage > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className="px-3 py-1 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600"
            >
              1
            </button>
            {startPage > 2 && (
              <span className="px-2 text-gray-500 dark:text-gray-400">...</span>
            )}
          </>
        )}
        
        {pages.map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`
              px-3 py-1 rounded-md text-sm font-medium
              ${page === currentPage 
                ? 'bg-primary-600 text-white dark:bg-primary-500' 
                : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }
              border border-gray-300 dark:border-gray-600
              transition-colors duration-200
            `}
          >
            {page}
          </button>
        ))}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <span className="px-2 text-gray-500 dark:text-gray-400">...</span>
            )}
            <button
              onClick={() => onPageChange(totalPages)}
              className="px-3 py-1 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600"
            >
              {totalPages}
            </button>
          </>
        )}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`
            px-3 py-1 rounded-md text-sm font-medium
            ${currentPage === totalPages 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600' 
              : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }
            border border-gray-300 dark:border-gray-600
            transition-colors duration-200
          `}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Table;