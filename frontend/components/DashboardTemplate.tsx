"use client";
import { ReactNode, useState } from "react";
import { LogoutButton } from "./logout-button";
import { Button } from "./ui/button";

interface DashboardTemplateProps<T> {
  title: string;
  subject: string;
  items: T[];
  renderItem: (item: T) => ReactNode; // how to render each row
  addForm: ReactNode; // the form JSX to add a new item
  loading?: boolean;
  error?: string | null;
  onDelete?: () => void;
}

export default function DashboardTemplate<T>({
  title,
  subject,
  items,
  renderItem,
  addForm,
  loading,
  error,
  onDelete,
}: DashboardTemplateProps<T>) {
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      {onDelete && (
        <div className="absolute top-4 left-4">
          <Button
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              try {
                await onDelete();
              } finally {
                setDeleting(false);
              }
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 disabled:opacity-60"
          >
            {deleting && (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            )}
            {deleting ? "Deleting…" : `Delete ${title}`}
          </Button>
        </div>
      )}

      <main className="relative flex min-h-screen w-full max-w-3xl flex-col items-start gap-8 py-32 px-16 bg-white dark:bg-black">
        <h1 className="text-4xl font-bold">{title}</h1>

        <h1 className="text-3xl font-bold">Existing {subject}</h1>

        {/* Error */}
        {error && <p className="text-red-600 mb-2">{error}</p>}

        {/* List of items */}
        <section className="w-full">
          {loading ? (
            <p>Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-center">No {subject.toLowerCase()} found.</p>
          ) : (
            items.map(renderItem)
          )}
        </section>

        {addForm && (
          <h1 className="text-3xl font-bold">Add New {subject}</h1>
        )}
        <section className="w-full">{addForm}</section>
      </main>

      <div className="absolute top-4 right-4">
        <LogoutButton />
      </div>
    </div>
  );
}
