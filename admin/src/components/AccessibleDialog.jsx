import { useEffect, useRef } from 'react';
export default function AccessibleDialog({ children, onClose, label, busy = false }) {
  const dialog = useRef(null);
  useEffect(() => { const element = dialog.current; element.showModal(); return () => element.close(); }, []);
  return <dialog ref={dialog} aria-label={label} aria-busy={busy} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} className="m-auto max-h-[90vh] overflow-auto p-0 rounded-xl border-0 backdrop:bg-black/50">{children}</dialog>;
}
