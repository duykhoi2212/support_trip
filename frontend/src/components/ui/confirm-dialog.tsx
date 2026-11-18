import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cn } from '../../lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy bỏ',
  variant = 'default',
  loading = false,
  onConfirm,
}) => {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm" />
        <AlertDialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <AlertDialogPrimitive.Title className="text-lg font-bold text-slate-900">
            {title}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="mt-2 text-sm text-slate-600 leading-relaxed">
            {description}
          </AlertDialogPrimitive.Description>
          <div className="mt-6 flex items-center justify-end gap-2.5">
            <AlertDialogPrimitive.Cancel
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {cancelLabel}
            </AlertDialogPrimitive.Cancel>
            <button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 shadow-sm',
                variant === 'destructive'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              )}
            >
              {loading ? 'Đang xử lý...' : confirmLabel}
            </button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
};
