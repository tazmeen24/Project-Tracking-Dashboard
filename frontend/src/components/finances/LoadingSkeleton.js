// frontend/src/components/finances/LoadingSkeleton.jsx

import React from 'react';

const LoadingSkeleton = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Skeleton */}
      <div className="mb-6">
        <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
        <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-40 animate-pulse"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Budget Head Sections Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                <div>
                  <div className="h-5 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-48 animate-pulse"></div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden md:block">
                  <div className="h-4 bg-gray-200 rounded w-40 mb-1 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                </div>
                <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoadingSkeleton;