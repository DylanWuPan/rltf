"use client";
import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoutButton } from "./logout-button";
import { Button } from "./ui/button";
import { LoginButton } from "./login-button";
import { confirmModal, loadingModal } from "./ui/modal";
import toast from "react-hot-toast";

interface DashboardTemplateProps<T> {
  title?: string;
  subtitle?: string;
  subject?: string;
  items?: T[];
  renderItem?: (item: T) => ReactNode; // how to render each row
  addForm?: ReactNode; // the form JSX to add a new item
  importForm?: ReactNode; // the form JSX to import items in bulk
  links?: ReactNode;
  loading?: boolean;
  onDelete?: () => void;
  onBack?: () => void;
  moreInfo?: ReactNode;
  rosterSection?: ReactNode;
  hideBackButton?: boolean;
  isPublic: boolean;
}

export default function DashboardTemplate<T>({
  title,
  subtitle,
  subject,
  items,
  renderItem,
  addForm,
  importForm,
  links,
  loading,
  onDelete,
  onBack,
  hideBackButton,
  isPublic,
  moreInfo,
  rosterSection,
}: DashboardTemplateProps<T>) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="relative flex min-h-screen w-full max-w-3xl flex-col items-start gap-8 py-32 px-16 bg-white dark:bg-black">
        {!hideBackButton && !isPublic && (
          <button
            onClick={onBack ? onBack : () => router.back()}
            className="absolute top-8 left-8 text-sm text-zinc-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            ← Back
          </button>
        )}

        <div className="w-full flex flex-col gap-4">
          {title && <h1 className="text-4xl font-bold">{title}</h1>}

          {subtitle && <h2 className="text-xl text-gray-500">{subtitle}</h2>}

          {/* Bubble navigation */}

          <div className="flex flex-wrap gap-2">
            {items && !moreInfo && (
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("existing")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="px-3 py-1 text-sm rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <span className="text-xs">↓</span>
                View Existing {subject}
              </button>
            )}
            {!isPublic && addForm && (
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("add-new")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="px-3 py-1 text-sm rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <span className="text-xs">↓</span>
                Add New {subject}
              </button>
            )}
            {!isPublic && importForm && (
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("import-new")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="px-3 py-1 text-sm rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <span className="text-xs">↓</span>
                Import {subject}
              </button>
            )}

            {links}
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800" />
        </div>

        {moreInfo}

        {!isPublic && renderItem && (
          <h1 id="existing" className="text-3xl font-bold pt-10">
            Existing {subject}
          </h1>
        )}

        {/* List of items */}
        {items && renderItem && subject && (
          <section className="w-full">
            {loading ? (
              <p className="text-center">Loading...</p>
            ) : items.length === 0 ? (
              <p className="text-center">No {subject.toLowerCase()} found.</p>
            ) : (
              items.map(renderItem)
            )}
          </section>
        )}

        {!isPublic && addForm && (
          <div className="w-full flex flex-col gap-4">
            <h1 id="add-new" className="text-3xl font-bold pt-10">
              Add New {subject}
            </h1>
            <section className="w-full">{addForm}</section>
          </div>
        )}

        {!isPublic && importForm && (
          <div className="w-full flex flex-col gap-4">
            <h1 id="import-new" className="text-3xl font-bold pt-10">
              Import {subject}
            </h1>
            <section className="w-full">{importForm}</section>
          </div>
        )}

        {rosterSection && (
          <div className="w-full flex flex-col gap-4">
            <h1 id="roster-section" className="text-3xl font-bold pt-10">
              Season Roster
            </h1>
            <section className="w-full">{rosterSection}</section>
          </div>
        )}

        {!isPublic && onDelete && (
          <div className="mt-15 w-full flex justify-center">
            <Button
              onClick={async () => {
                const confirmed = await confirmModal(`Delete '${title}'?`);
                if (!confirmed) return;
                const deleting = loadingModal("Deleting...");
                try {
                  await onDelete();
                } catch (e) {
                  toast.error("Error deleting: " + (e as Error).message);
                }
                deleting.close();
                toast.success("Deleted successfully");
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {`Delete '${title}'`}
            </Button>
          </div>
        )}
      </main>

      <div className="absolute top-4 right-4">
        {isPublic ? <LoginButton /> : <LogoutButton />}
      </div>
    </div>
  );
}
