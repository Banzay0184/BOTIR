import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Модальное окно с порталом в document.body.
 * Используется вместо Material Tailwind Dialog, чтобы избежать ошибки
 * "aria-hidden ... not contained inside body" (Floating UI).
 */
const SimpleDialog = ({ open, onClose, size = 'lg', className = '', children }) => {
    useEffect(() => {
        if (!open) return;
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    if (!open) return null;

    const sizeClasses = {
        sm: 'max-w-[90%] sm:max-w-sm',
        md: 'max-w-[90%] md:max-w-md',
        lg: 'max-w-[90%] md:max-w-lg lg:max-w-xl',
        xl: 'max-w-[90%] md:max-w-xl lg:max-w-2xl',
        xxl: 'max-w-[90%] md:max-w-2xl lg:max-w-4xl',
    };

    const content = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
        >
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
                onKeyDown={(e) => e.key === 'Enter' && onClose?.()}
                role="button"
                tabIndex={0}
                aria-label="Закрыть"
            />
            <div
                className={`relative bg-white rounded-lg shadow-2xl text-blue-gray-700 w-full overflow-auto ${sizeClasses[size] || sizeClasses.lg} ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );

    return createPortal(content, document.body);
};

export default SimpleDialog;
