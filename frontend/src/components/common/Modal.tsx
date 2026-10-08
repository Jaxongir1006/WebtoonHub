import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  dismissible?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  dismissible = true
}) => {
  const { t } = useLanguage();
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  const dialogRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    onCloseRef.current = onClose;
    dismissibleRef.current = dismissible;
  }, [onClose, dismissible]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const visibleControls = (root: HTMLElement | null) => root ? Array.from(root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(element => !element.closest('[hidden], [inert], [aria-hidden="true"]') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden') : [];
    const focusTarget = visibleControls(contentRef.current)[0];
    (focusTarget || dialogRef.current)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissibleRef.current) {
        onCloseRef.current();
      } else if (e.key === 'Tab' && dialogRef.current) {
        const controls = visibleControls(dialogRef.current);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first || !last) {
          e.preventDefault();
          return;
        }
        if (e.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement as HTMLElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement as HTMLElement))) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    const originalOverflow = document.body.style.overflow;
    const layer = dialogRef.current?.parentElement;
    const background = Array.from(document.body.children).filter((element): element is HTMLElement => element instanceof HTMLElement && element !== layer);
    const previousInert = background.map(element => element.inert);
    const previousAriaHidden = background.map(element => element.getAttribute('aria-hidden'));
    background.forEach(element => { element.inert = true; element.setAttribute('aria-hidden', 'true'); });
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      background.forEach((element, index) => { element.inert = previousInert[index]; const value = previousAriaHidden[index]; if (value === null) element.removeAttribute('aria-hidden'); else element.setAttribute('aria-hidden', value); });
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  }[maxWidth];

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => { if (dismissibleRef.current) onCloseRef.current(); }}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : t('readerFix.dialog')}
        tabIndex={-1}
        className={`relative w-full ${maxWidthClass} bg-studio-900 border border-studio-800 rounded-2xl shadow-2xl p-4 sm:p-6 z-10 text-studio-100 max-h-[calc(100dvh-2rem)] flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-studio-800/80 mb-4 shrink-0">
          <div id={titleId} className="text-lg font-bold text-white flex items-center gap-2">
            {title}
          </div>
          <button
            type="button"
            aria-label={t('common.close')}
            disabled={!dismissible}
            onClick={() => onCloseRef.current()}
            className="p-1.5 text-studio-400 hover:text-white rounded-lg hover:bg-studio-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div ref={contentRef} className="overflow-y-auto pr-1">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
