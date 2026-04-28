"use client";

import { Check, ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { ClientTablePagination } from "@/components/ui/client-table-pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/components/ui/toast-provider";
import { Alert, Button, Input } from "@/components/ui/primitives";
import { TASK_TYPE_LABELS, type TaskPackage, type TaskTemplate } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type DraftState = {
  name: string;
  description: string;
  taskTemplateIds: string[];
};

const emptyDraft: DraftState = {
  name: "",
  description: "",
  taskTemplateIds: [],
};

function toggleId(values: string[], id: string, checked: boolean) {
  if (checked) {
    return values.includes(id) ? values : [...values, id];
  }

  return values.filter((value) => value !== id);
}

function createDraft(taskPackage: TaskPackage): DraftState {
  return {
    name: taskPackage.name,
    description: taskPackage.description,
    taskTemplateIds: taskPackage.taskTemplates.map((taskTemplate) => taskTemplate.id),
  };
}

function getTaskTemplateHint(taskTemplates: TaskTemplate[]) {
  if (taskTemplates.length === 0) {
    return "Belum ada master tugas";
  }

  const firstTitle = taskTemplates[0]?.title ?? "Belum ada master tugas";

  if (taskTemplates.length === 1) {
    return firstTitle;
  }

  return `${firstTitle} +${taskTemplates.length - 1}`;
}

function getTaskTemplateSummary(taskTemplateIds: string[], taskTemplates: TaskTemplate[]) {
  if (taskTemplateIds.length === 0) {
    return "Pilih master tugas";
  }

  const titles = taskTemplates
    .filter((taskTemplate) => taskTemplateIds.includes(taskTemplate.id))
    .map((taskTemplate) => taskTemplate.title);

  if (titles.length === 0) {
    return "Pilih master tugas";
  }

  if (titles.length === 1) {
    return titles[0];
  }

  return `${titles[0]} +${titles.length - 1} tugas`;
}

export function MasterTaskPackageManager({
  initialTaskPackages,
  taskTemplates,
}: {
  initialTaskPackages: TaskPackage[];
  taskTemplates: TaskTemplate[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [taskPackages, setTaskPackages] = useState(initialTaskPackages);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createDraftState, setCreateDraftState] = useState<DraftState>(emptyDraft);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isCreatingPending, setIsCreatingPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const deferredQuery = useDeferredValue(query);

  const filteredTaskPackages = useMemo(() => {
    const keyword = deferredQuery.trim().toLowerCase();
    if (!keyword) {
      return taskPackages;
    }

    return taskPackages.filter((taskPackage) =>
      [
        taskPackage.name,
        taskPackage.description,
        ...taskPackage.taskTemplates.map((taskTemplate) => taskTemplate.title),
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [deferredQuery, taskPackages]);
  const totalPages = Math.max(1, Math.ceil(filteredTaskPackages.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginatedTaskPackages = useMemo(
    () => filteredTaskPackages.slice((safePage - 1) * perPage, safePage * perPage),
    [filteredTaskPackages, perPage, safePage],
  );

  function beginCreate() {
    setError("");
    setEditingId(null);
    setDraft(null);
    setIsCreating(true);
    setCreateDraftState(emptyDraft);
  }

  function cancelCreate() {
    setError("");
    setIsCreating(false);
    setCreateDraftState(emptyDraft);
  }

  function beginEdit(taskPackage: TaskPackage) {
    setError("");
    setIsCreating(false);
    setEditingId(taskPackage.id);
    setDraft(createDraft(taskPackage));
  }

  function cancelEdit() {
    setError("");
    setEditingId(null);
    setDraft(null);
  }

  function updateDraft<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateCreateDraft<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setCreateDraftState((current) => ({ ...current, [key]: value }));
  }

  async function handleCreate() {
    setError("");
    setIsCreatingPending(true);

    const response = await fetch("/api/master-task-packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createDraftState),
    });

    setIsCreatingPending(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal membuat paket master tugas.";
      setError(message);
      showToast({ title: "Paket gagal dibuat", description: message, variant: "error" });
      return;
    }

    const body = (await response.json()) as { taskPackage: TaskPackage };
    setTaskPackages((current) => [body.taskPackage, ...current]);
    showToast({
      title: "Paket berhasil dibuat",
      description: `${body.taskPackage.name} sudah ditambahkan.`,
      variant: "success",
    });
    cancelCreate();
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleSave(taskPackage: TaskPackage) {
    if (!draft) {
      return;
    }

    setError("");
    setSavingId(taskPackage.id);

    const response = await fetch(`/api/master-task-packages/${taskPackage.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });

    setSavingId(null);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal memperbarui paket master tugas.";
      setError(message);
      showToast({ title: "Paket gagal diperbarui", description: message, variant: "error" });
      return;
    }

    const body = (await response.json()) as { taskPackage: TaskPackage };
    setTaskPackages((current) =>
      current.map((item) => (item.id === taskPackage.id ? body.taskPackage : item)),
    );
    showToast({
      title: "Paket berhasil diperbarui",
      description: `${body.taskPackage.name} sudah diperbarui.`,
      variant: "success",
    });
    cancelEdit();
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleDelete(taskPackage: TaskPackage) {
    if (!window.confirm(`Hapus paket ${taskPackage.name}?`)) {
      return;
    }

    setError("");
    setDeletingId(taskPackage.id);

    const response = await fetch(`/api/master-task-packages/${taskPackage.id}`, {
      method: "DELETE",
    });

    setDeletingId(null);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal menghapus paket master tugas.";
      setError(message);
      showToast({ title: "Paket gagal dihapus", description: message, variant: "error" });
      return;
    }

    setTaskPackages((current) => current.filter((item) => item.id !== taskPackage.id));
    showToast({
      title: "Paket berhasil dihapus",
      description: `${taskPackage.name} telah dihapus.`,
      variant: "success",
    });
    if (editingId === taskPackage.id) {
      cancelEdit();
    }
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-700">
            Paket Master Tugas
          </p>
          <h4 className="mt-2 text-2xl font-semibold text-slate-950">Daftar paket</h4>
          <p className="mt-2 text-[15px] text-slate-700">
            Gabungkan beberapa master tugas supaya saat membuat master shift cukup memilih satu paket.
          </p>
        </div>
        <Button type="button" onClick={beginCreate} disabled={isCreating || Boolean(editingId) || taskTemplates.length === 0} className="shrink-0">
          <Plus className="h-4 w-4" />
          Tambah Paket
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Cari nama paket, deskripsi, atau isi tugas"
          className="sm:max-w-md bg-white"
          aria-label="Cari paket tugas"
        />
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="responsive-table w-full min-w-[980px] border-separate border-spacing-0">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-[0.12em] text-slate-600">
            <tr>
              <th className="px-5 py-4 font-semibold first:rounded-tl-lg">Nama paket</th>
              <th className="px-5 py-4 font-medium">Deskripsi</th>
              <th className="px-5 py-4 font-medium">Isi paket</th>
              <th className="px-5 py-4 font-medium">Dibuat</th>
              <th className="px-5 py-4 font-medium text-right last:rounded-tr-lg">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isCreating ? (
              <tr className="bg-sky-50/70">
                <td data-label="Nama Paket" className="border-b border-slate-100 px-5 py-4 align-top">
                  <Input
                    value={createDraftState.name}
                    onChange={(event) => updateCreateDraft("name", event.target.value)}
                    placeholder="Nama paket"
                    className="font-semibold"
                  />
                </td>
                <td data-label="Deskripsi" className="border-b border-slate-100 px-5 py-4 align-top">
                  <Input
                    value={createDraftState.description}
                    onChange={(event) => updateCreateDraft("description", event.target.value)}
                    placeholder="Deskripsi opsional"
                  />
                </td>
                <td data-label="Isi Paket" className="border-b border-slate-100 px-5 py-4 align-top">
                  <details className="group relative">
                    <summary
                      className={cn(
                        "flex w-full min-w-0 cursor-pointer list-none items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none sm:min-w-[260px]",
                        "focus:border-blue-500 group-open:border-blue-500",
                      )}
                    >
                      <span className="truncate">
                        {getTaskTemplateSummary(createDraftState.taskTemplateIds, taskTemplates)}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
                    </summary>
                    <div className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-full min-w-0 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:min-w-[300px]">
                      <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                        {taskTemplates.length === 0 ? (
                          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-500">
                            Belum ada master tugas.
                          </p>
                        ) : (
                          taskTemplates.map((taskTemplate) => {
                            const checked = createDraftState.taskTemplateIds.includes(taskTemplate.id);

                            return (
                              <label
                                key={taskTemplate.id}
                                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) =>
                                    updateCreateDraft(
                                      "taskTemplateIds",
                                      toggleId(createDraftState.taskTemplateIds, taskTemplate.id, event.target.checked),
                                    )
                                  }
                                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>
                                  <span className="block font-semibold text-slate-900">{taskTemplate.title}</span>
                                  <span className="block text-xs uppercase tracking-[0.16em] text-blue-600">
                                    {TASK_TYPE_LABELS[taskTemplate.type]}
                                  </span>
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </details>
                </td>
                <td data-label="Dibuat" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                  Paket baru
                </td>
                <td data-label="Aksi" className="border-b border-slate-100 px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <Button type="button" onClick={handleCreate} disabled={isCreatingPending} variant="secondary" size="icon" aria-label="Simpan paket baru">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button type="button" onClick={cancelCreate} disabled={isCreatingPending} variant="ghost" size="icon" aria-label="Batal tambah paket">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ) : null}

            {paginatedTaskPackages.map((taskPackage) => {
              const isEditing = editingId === taskPackage.id;

              return (
                <tr
                  key={taskPackage.id}
                  className={cn(
                    "transition",
                    isEditing ? "bg-sky-50/70" : "bg-white hover:bg-slate-50",
                  )}
                >
                  <td data-label="Nama Paket" className="border-b border-slate-100 px-5 py-4 align-top text-sm font-semibold text-slate-900">
                    {isEditing && draft ? (
                      <Input
                        value={draft.name}
                        onChange={(event) => updateDraft("name", event.target.value)}
                        className="font-semibold"
                      />
                    ) : (
                      taskPackage.name
                    )}
                  </td>
                  <td data-label="Deskripsi" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {isEditing && draft ? (
                      <Input
                        value={draft.description}
                        onChange={(event) => updateDraft("description", event.target.value)}
                      />
                    ) : (
                      taskPackage.description || "-"
                    )}
                  </td>
                  <td data-label="Isi Paket" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {isEditing && draft ? (
                      <details className="group relative">
                        <summary
                          className={cn(
                            "flex w-full min-w-0 cursor-pointer list-none items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none sm:min-w-[260px]",
                            "focus:border-blue-500 group-open:border-blue-500",
                          )}
                        >
                          <span className="truncate">
                            {getTaskTemplateSummary(draft.taskTemplateIds, taskTemplates)}
                          </span>
                          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
                        </summary>
                        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-full min-w-0 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:min-w-[300px]">
                          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                            {taskTemplates.length === 0 ? (
                              <p className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-500">
                                Belum ada master tugas.
                              </p>
                            ) : (
                              taskTemplates.map((taskTemplate) => {
                                const checked = draft.taskTemplateIds.includes(taskTemplate.id);

                                return (
                                  <label
                                    key={taskTemplate.id}
                                    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(event) =>
                                        updateDraft(
                                          "taskTemplateIds",
                                          toggleId(draft.taskTemplateIds, taskTemplate.id, event.target.checked),
                                        )
                                      }
                                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>
                                      <span className="block font-semibold text-slate-900">{taskTemplate.title}</span>
                                      <span className="block text-xs uppercase tracking-[0.16em] text-blue-600">
                                        {TASK_TYPE_LABELS[taskTemplate.type]}
                                      </span>
                                    </span>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </details>
                    ) : taskPackage.taskTemplates.length > 0 ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="max-w-[240px] text-left text-sm text-slate-700 transition hover:text-slate-950"
                          >
                            <span className="block truncate font-medium">
                              {getTaskTemplateHint(taskPackage.taskTemplates)}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-80 p-3">
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">Isi Paket</p>
                            </div>
                            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                              {taskPackage.taskTemplates.map((taskTemplate) => (
                                <div key={taskTemplate.id} className="rounded-xl bg-slate-50 px-3 py-2">
                                  <p className="text-sm font-semibold text-slate-900">{taskTemplate.title}</p>
                                  <p className="text-xs uppercase tracking-[0.16em] text-blue-600">
                                    {TASK_TYPE_LABELS[taskTemplate.type]}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      "Belum ada master tugas"
                    )}
                  </td>
                  <td data-label="Dibuat" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {formatDate(taskPackage.createdAt)}
                  </td>
                  <td data-label="Aksi" className="border-b border-slate-100 px-5 py-4">
                    <div className="flex justify-end gap-2">
                      {isEditing ? (
                        <>
                          <Button type="button" onClick={() => handleSave(taskPackage)} disabled={savingId === taskPackage.id} variant="secondary" size="icon" aria-label="Simpan perubahan paket">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button type="button" onClick={cancelEdit} disabled={savingId === taskPackage.id} variant="ghost" size="icon" aria-label="Batal edit paket">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button type="button" onClick={() => beginEdit(taskPackage)} disabled={Boolean(editingId) || isCreating} variant="secondary" size="icon" aria-label={`Edit ${taskPackage.name}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" onClick={() => handleDelete(taskPackage)} disabled={deletingId === taskPackage.id || Boolean(editingId) || isCreating} variant="danger" size="icon" aria-label={`Hapus ${taskPackage.name}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredTaskPackages.length === 0 && !isCreating ? (
              <tr className="bg-white">
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                  {taskPackages.length === 0 ? "Belum ada paket master tugas." : "Tidak ada paket yang sesuai dengan pencarian."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <ClientTablePagination
        page={safePage}
        totalItems={filteredTaskPackages.length}
        perPage={perPage}
        itemLabel="paket"
        onPageChange={setPage}
        onPerPageChange={(nextPerPage) => {
          setPerPage(nextPerPage);
          setPage(1);
        }}
      />
    </div>
  );
}
