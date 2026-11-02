import React from 'react';

export default function LoadingSkeleton() {
  return (
    <main className="min-h-screen bg-slate-50 p-8 md:p-12 animate-pulse">
      <div className="max-w-6xl mx-auto mb-8 flex justify-between items-center">
        <div className="h-10 bg-gray-200 rounded-xl w-48"></div>
        <div className="h-6 bg-gray-200 rounded-xl w-24"></div>
      </div>
      <div className="max-w-6xl mx-auto flex gap-4 mb-8">
        <div className="h-10 bg-gray-200 rounded-xl w-32"></div>
        <div className="h-10 bg-gray-200 rounded-xl w-32"></div>
        <div className="h-10 bg-gray-200 rounded-xl w-32"></div>
      </div>
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="h-64 bg-white border border-gray-100 rounded-3xl w-full"></div>
        <div className="h-64 bg-white border border-gray-100 rounded-3xl w-full"></div>
        <div className="h-64 bg-white border border-gray-100 rounded-3xl w-full"></div>
      </div>
    </main>
  );
}
