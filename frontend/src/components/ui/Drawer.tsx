"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/cn";

type DrawerPosition = "right" | "left" | "bottom";
type DrawerSize = "sm" | "md" | "lg" | "xl";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  position?: DrawerPosition;
  size?: DrawerSize;
  showClose?: boolean;
}

const positionConfig = {
  right: {
    wrapper: "justify-end",
    enter: "translate-x-0",
    enterFrom: "translate-x-full",
    leaveTo: "translate-x-full",
    panel: "h-full rounded-r-none rounded-l-2xl",
  },
  left: {
    wrapper: "justify-start",
    enter: "translate-x-0",
    enterFrom: "-translate-x-full",
    leaveTo: "-translate-x-full",
    panel: "h-full rounded-l-none rounded-r-2xl",
  },
  bottom: {
    wrapper: "items-end",
    enter: "translate-y-0",
    enterFrom: "translate-y-full",
    leaveTo: "translate-y-full",
    panel: "w-full rounded-b-none rounded-t-2xl",
  },
};

const sizeConfig: Record<DrawerSize, string> = {
  sm:  "w-72",
  md:  "w-80 md:w-96",
  lg:  "w-full md:w-[480px]",
  xl:  "w-full md:w-[640px]",
};

export const Drawer = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  position = "right",
  size = "md",
  showClose = true,
}: DrawerProps) => {
  const config = positionConfig[position];
  const isVertical = position === "bottom";

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className={cn("fixed inset-0 flex", config.wrapper)}>
          <Transition.Child
            as={Fragment}
            enter="transform transition ease-out duration-300"
            enterFrom={config.enterFrom}
            enterTo={config.enter}
            leave="transform transition ease-in duration-200"
            leaveFrom={config.enter}
            leaveTo={config.leaveTo}
          >
            <Dialog.Panel
              className={cn(
                "bg-white shadow-2xl flex flex-col",
                config.panel,
                !isVertical && sizeConfig[size],
                isVertical && "max-h-[85vh]"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
                {title && (
                  <Dialog.Title className="text-lg font-bold text-primary-700">
                    {title}
                  </Dialog.Title>
                )}
                {showClose && (
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors ml-auto"
                    aria-label="بستن"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0 flex items-center justify-end gap-3">
                  {footer}
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};