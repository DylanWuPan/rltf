"use client";
import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoutButton } from "./logout-button";
import { Button } from "./ui/button";

interface DashboardTemplateProps<T> {
  title: string;
  subject: string;
  items: T[];
  renderItem: (item: T) => ReactNode; // how to render each row
  addForm?: ReactNode; // the form JSX to add a new item
  links?: ReactNode;
  loading?: boolean;
  error?: string | null;
  onDelete?: () => void;
  hideBackButton?: boolean;
  moreInfo?: ReactNode;
  rosterSection?: ReactNode;
  viewLink?: boolean;
  addLink?: boolean;
}

export default function DashboardTemplate<T>({
  title,
  subject,
  items,
  renderItem,
  addForm,
  links,
  loading,
  error,
  onDelete,
  hideBackButton,
  moreInfo,
  rosterSection,
  viewLink = true,
  addLink = true,
}: DashboardTemplateProps<T>) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="relative flex min-h-screen w-full max-w-3xl flex-col items-start gap-8 py-32 px-16 bg-white dark:bg-black">
        {!hideBackButton && (
          <button
            onClick={() => router.back()}
            className="absolute top-8 left-8 text-sm text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
          >
            ← Back
          </button>
        )}

        <div className="w-full flex flex-col gap-4">
          <h1 className="text-4xl font-bold">{title}</h1>

          {/* Bubble navigation */}
          <div className="flex flex-wrap gap-2">
            {viewLink && (
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("existing")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="px-3 py-1 text-sm rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors inline-flex items-center gap-1"
              >
                <span className="text-xs">↗</span>
                View Existing {subject}
              </button>
            )}
            {addLink && (
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("add-new")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="px-3 py-1 text-sm rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors inline-flex items-center gap-1"
              >
                <span className="text-xs">↗</span>
                Add New {subject}
              </button>
            )}
            {links}
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800" />
        </div>

        {moreInfo}

        <h1 id="existing" className="text-3xl font-bold pt-10">
          View Existing {subject}
        </h1>

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
          <h1 id="add-new" className="text-3xl font-bold pt-10">
            Add New {subject}
          </h1>
        )}
        <section className="w-full">{addForm}</section>

        {rosterSection && (
          <h1 id="roster-section" className="text-3xl font-bold pt-10">
            Team Roster
          </h1>
        )}
        <section className="w-full">{rosterSection}</section>

        {onDelete && (
          <div className="mt-15 w-full flex justify-center">
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
      </main>

      <div className="absolute top-4 right-4">
        <LogoutButton />
      </div>
    </div>
  );
}
