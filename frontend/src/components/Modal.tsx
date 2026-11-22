import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, type ReactNode } from "react";

interface Props { open: boolean; title: string; onClose: () => void; children: ReactNode }

export default function Modal({ open, title, onClose, children }: Props) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  // Auto-focus first focusable element only on initial open — not on every re-render.
  const didFocus = useRef(false);
  useEffect(() => {
    if (!open) { didFocus.current = false; return; }
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    if (!didFocus.current) {
      didFocus.current = true;
      const t = setTimeout(() => {
        panel.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
      }, 50);
      return () => {
        clearTimeout(t);
        document.removeEventListener("keydown", onKey);
        previous?.focus();
      };
    }
    return () => { document.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={e => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-gray-200 bg-white p-6 shadow-xl sm:rounded-2xl"
            initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 id={titleId} className="text-base font-bold text-gray-900">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="rounded-lg px-2 py-1 text-xl leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                ×
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
