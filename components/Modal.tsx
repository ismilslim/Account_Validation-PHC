
import React, { Fragment } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: 'max-w-lg' | 'max-w-xl' | 'max-w-2xl' | 'max-w-3xl' | 'max-w-4xl' | 'max-w-5xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, maxWidth = 'max-w-lg' }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
            onClick={onClose}
        >
            <div 
                className={`bg-white rounded-lg shadow-xl m-4 ${maxWidth} w-full transform transition-all`}
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 relative">
                     <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        aria-label="Close modal"
                     >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    {children}
                </div>
            </div>
        </div>
    );
};
