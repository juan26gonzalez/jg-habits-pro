import React from 'react';

export default function LoadingSkeleton() {
  return (
    <main className="min-h-screen bg-[#FAF7F4] p-6 md:p-10 animate-pulse">
      <div className="max-w-6xl mx-auto mb-8 flex justify-between items-center">
        <div className="h-10 bg-[#EADBCE]/70 rounded-2xl w-48"></div>
        <div className="h-8 bg-[#EADBCE]/70 rounded-xl w-24"></div>
      </div>
      <div className="max-w-6xl mx-auto flex gap-3 mb-8">
        <div className="h-9 bg-[#EADBCE]/70 rounded-xl w-28"></div>
        <div className="h-9 bg-[#EADBCE]/70 rounded-xl w-28"></div>
        <div className="h-9 bg-[#EADBCE]/70 rounded-xl w-28"></div>
      </div>
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="h-64 bg-white border border-[#EADBCE]/80 rounded-3xl w-full"></div>
        <div className="h-64 bg-white border border-[#EADBCE]/80 rounded-3xl w-full"></div>
        <div className="h-64 bg-white border border-[#EADBCE]/80 rounded-3xl w-full"></div>
      </div>
    </main>
  );
}
