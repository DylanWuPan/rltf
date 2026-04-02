import { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";

type ConfirmModalProps = {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

type LoadingModalProps = {
  message?: string;
};

/**
 * Show a modal confirmation dialog.
 * Returns a Promise that resolves to true (confirmed) or false (cancelled)
 */
export function confirmModal(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const div = document.createElement("div");
    document.body.appendChild(div);

    const root = ReactDOM.createRoot(div);

    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };
    const handleCancel = () => {
      cleanup();
      resolve(false);
    };
    const cleanup = () => {
      root.unmount();
      div.remove();
    };

    root.render(
      <ConfirmModal
        message={message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  });
}

/**
 * Show a loading modal.
 * Returns an object with a `close` function to dismiss it.
 */
export function loadingModal(message?: string) {
  const div = document.createElement("div");
  document.body.appendChild(div);

  const root = ReactDOM.createRoot(div);

  root.render(<LoadingModal message={message} />);

  return {
    close: () => {
      root.unmount();
      div.remove();
    },
  };
}

const ConfirmModal = ({ message, onConfirm, onCancel }: ConfirmModalProps) => {
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-opacity-30 overflow-hidden transition-opacity duration-300">
      <div className="min-w-[300px] max-w-sm bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col gap-4">
        <span className="text-gray-900 dark:text-gray-100 text-center">
          {message}
        </span>
        <div className="flex justify-center gap-3">
          <button
            className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors cursor-pointer"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors cursor-pointer"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const LoadingModal = ({ message }: LoadingModalProps) => {
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-opacity-30 overflow-hidden transition-opacity duration-300">
      <div className="min-w-[200px] max-w-xs bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
        {message && (
          <span className="text-gray-900 dark:text-gray-100">{message}</span>
        )}
      </div>
    </div>
  );
};
