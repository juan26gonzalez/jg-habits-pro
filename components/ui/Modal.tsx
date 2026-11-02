import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D1C14]/40 backdrop-blur-md animate-fade-in">
      <div 
        className={`bg-white w-full ${maxWidth} rounded-3xl shadow-[0_20px_50px_rgba(45,28,20,0.15)] border border-[#EADBCE]/80 overflow-hidden transform transition-all max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 px-6 border-b border-[#EADBCE]/60">
          <h3 className="text-lg font-bold text-[#2D1C14] tracking-tight">{title}</h3>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-[#FAF5F0] text-[#8D6B57] hover:text-[#2D1C14] hover:bg-[#EADBCE]/60 flex items-center justify-center transition-all font-bold text-sm active:scale-90"
          >
            ✕
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
