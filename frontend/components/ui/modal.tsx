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

type EditField =
  | {
      name: string;
      label: string;
      type: "text" | "number";
      placeholder?: string;
      defaultValue?: string | number;
    }
  | {
      name: string;
      label: string;
      type: "select";
      options: { label: string; value: string | number }[];
      defaultValue?: string | number;
    };

type EditModalProps = {
  title?: string;
  fields: EditField[];
  onSubmit: (values: Record<string, string | number>) => void;
  onCancel: () => void;
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

/**
 * Show a reusable edit modal with dynamic fields.
 * Resolves with form values on submit, or null on cancel.
 */
export function editModal(params: {
  title?: string;
  fields: EditField[];
}): Promise<Record<string, string | number> | null> {
  return new Promise((resolve) => {
    const div = document.createElement("div");
    document.body.appendChild(div);

    const root = ReactDOM.createRoot(div);

    const handleSubmit = (values: Record<string, string | number>) => {
      cleanup();
      resolve(values);
    };

    const handleCancel = () => {
      cleanup();
      resolve(null);
    };

    const cleanup = () => {
      root.unmount();
      div.remove();
    };

    root.render(
      <EditModal
        title={params.title}
        fields={params.fields}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    );
  });
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
      <div className="min-w-[300px] max-w-sm bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col gap-4">
        <span className="text-gray-900 dark:text-gray-100 text-center">
          {message}
        </span>
        <div className="flex justify-center gap-3">
          <button
            className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors cursor-pointer"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition-colors cursor-pointer"
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
      <div className="min-w-[200px] max-w-xs bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
        {message && (
          <span className="text-gray-900 dark:text-gray-100">{message}</span>
        )}
      </div>
    </div>
  );
};

const EditModal = ({ title, fields, onSubmit, onCancel }: EditModalProps) => {
  const [values, setValues] = useState<Record<string, string | number>>(() => {
    const initial: Record<string, string | number> = {};
    fields.forEach((f) => {
      if (f.defaultValue !== undefined) {
        initial[f.name] = f.defaultValue;
      } else {
        initial[f.name] = "";
      }
    });
    return initial;
  });

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const handleChange = (name: string, value: string) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = () => {
    onSubmit(values);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-opacity-30 overflow-hidden transition-opacity duration-300">
      <div className="min-w-[320px] max-w-md w-full bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col gap-4">
        {title && (
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center">
            {title}
          </h2>
        )}

        <div className="flex flex-col gap-3">
          {fields.map((field) => (
            <div key={field.name} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {field.label}
              </label>

              {field.type === "select" ? (
                <select
                  value={values[field.name] ?? ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent text-gray-800 dark:text-gray-100 text-sm"
                >
                  <option value="">Select...</option>
                  {field.options.map((opt) => (
                    <option key={String(opt.value)} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={values[field.name] ?? ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent text-gray-800 dark:text-gray-100 text-sm"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors cursor-pointer"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
            onClick={handleSubmit}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
