import { type ReactNode, useEffect, useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="backdrop:bg-black/60 bg-stone-800 text-stone-100 rounded-xl p-0 max-w-2xl w-full shadow-xl"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-stone-100">{title}</h2>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-300 text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
