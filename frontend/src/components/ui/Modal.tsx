"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/cn";

type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  showClose?: boolean;
  className?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm:   "max-w-sm",
  md:   "max-w-md",
  lg:   "max-w-lg",
  xl:   "max-w-2xl",
  "2xl": "max-w-4xl",
  full: "max-w-[95vw]",
};

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
  showClose = true,
  className,
}: ModalProps) => (
  <Transition appear show={isOpen} as={Fragment}>
    <Dialog
      as="div"
      className="relative z-50"
      onClose={closeOnBackdrop ? onClose : () => {}}
    >
      {/* Backdrop */}
      <Transition.Child
        as={Fragment}
        enter="ease-out duration-200"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-150"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
          aria-hidden="true"
        />
      </Transition.Child>

      {/* Panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0 scale-95 translate-y-2"
          enterTo="opacity-100 scale-100 translate-y-0"
          leave="ease-in duration-150"
          leaveFrom="opacity-100 scale-100 translate-y-0"
          leaveTo="opacity-0 scale-95 translate-y-2"
        >
          <Dialog.Panel
            className={cn(
              "w-full bg-white rounded-2xl shadow-2xl",
              "border border-slate-100",
              "divide-y divide-slate-100",
              sizeClasses[size],
              className
            )}
          >
            {/* Header */}
            {(title || showClose) && (
              <div className="flex items-start justify-between px-6 py-4">
                <div>
                  {title && (
                    <Dialog.Title className="text-lg font-bold text-primary-700">
                      {title}
                    </Dialog.Title>
                  )}
                  {description && (
                    <Dialog.Description className="mt-1 text-sm text-slate-500">
                      {description}
                    </Dialog.Description>
                  )}
                </div>
                {showClose && (
                  <button
                    onClick={onClose}
                    className={cn(
                      "p-1.5 rounded-lg text-slate-400",
                      "hover:bg-slate-100 hover:text-slate-600",
                      "transition-colors duration-150",
                      "focus:outline-none focus:ring-2 focus:ring-primary-500"
                    )}
                    aria-label="بستن"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="px-6 py-4">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-4 bg-slate-50 rounded-b-2xl flex items-center justify-end gap-3">
                {footer}
              </div>
            )}
          </Dialog.Panel>
        </Transition.Child>
      </div>
    </Dialog>
  </Transition>
);