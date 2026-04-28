"use client";

import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { ClientTablePagination } from "@/components/ui/client-table-pagination";
import { useToast } from "@/components/ui/toast-provider";
import { Alert, Button, Input, Select, TextArea } from "@/components/ui/primitives";
import { TASK_TYPE_LABELS, type MasterArea, type TaskTemplate, type TaskType } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type DraftState = {
  areaId: string;
  title: string;
  description: string;
  type: TaskType;
};

export function MasterTaskManager({
  initialTaskTemplates,
  areas,
}: {
  initialTaskTemplates: TaskTemplate[];
  areas: MasterArea[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [taskTemplates, setTaskTemplates] = useState(initialTaskTemplates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<DraftState>({
    areaId: areas[0]?.id ?? "",
    title: "",
    description: "",
    type: "harian",
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isCreatingPending, setIsCreatingPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | TaskType>("");
  const [areaFilter, setAreaFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const deferredQuery = useDeferredValue(query);

  const filteredTaskTemplates = useMemo(() => {
    const keyword = deferredQuery.trim().toLowerCase();

    return taskTemplates.filter((taskTemplate) => {
      const matchesQuery = keyword
        ? `${taskTemplate.title} ${taskTemplate.description} ${taskTemplate.area?.name ?? ""}`
            .toLowerCase()
            .includes(keyword)
        : true;
      const matchesType = typeFilter ? taskTemplate.type === typeFilter : true;
      const matchesArea = areaFilter ? taskTemplate.areaId === areaFilter : true;

      return matchesQuery && matchesType && matchesArea;
    });
  }, [areaFilter, deferredQuery, taskTemplates, typeFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredTaskTemplates.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginatedTaskTemplates = useMemo(
    () => filteredTaskTemplates.slice((safePage - 1) * perPage, safePage * perPage),
    [filteredTaskTemplates, perPage, safePage],
  );

  function beginCreate() {
    setError("");
    setEditingId(null);
    setDraft(null);
    setIsCreating(true);
    setCreateDraft({
      areaId: areas[0]?.id ?? "",
      title: "",
      description: "",
      type: "harian",
    });
  }

  function cancelCreate() {
    setError("");
    setIsCreating(false);
    setCreateDraft({
      areaId: areas[0]?.id ?? "",
      title: "",
      description: "",
      type: "harian",
    });
  }

  function beginEdit(taskTemplate: TaskTemplate) {
    setError("");
    setIsCreating(false);
    setEditingId(taskTemplate.id);
    setDraft({
      areaId: taskTemplate.areaId ?? "",
      title: taskTemplate.title,
      description: taskTemplate.description,
      type: taskTemplate.type,
    });
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
    setCreateDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleCreate() {
    setError("");
    setIsCreatingPending(true);

    const response = await fetch("/api/master-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createDraft),
    });

    setIsCreatingPending(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal membuat master tugas.";
      setError(message);
      showToast({ title: "Master Tugas Gagal Dibuat", description: message, variant: "error" });
      return;
    }

    const body = (await response.json()) as { taskTemplate: TaskTemplate };
    setTaskTemplates((current) => [body.taskTemplate, ...current]);
    showToast({
      title: "Master Tugas Berhasil Dibuat",
      description: `${body.taskTemplate.title} sudah ditambahkan.`,
      variant: "success",
    });
    cancelCreate();
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleSave(taskTemplate: TaskTemplate) {
    if (!draft) {
      return;
    }

    setError("");
    setSavingId(taskTemplate.id);

    const response = await fetch(`/api/master-tasks/${taskTemplate.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });

    setSavingId(null);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal memperbarui master tugas.";
      setError(message);
      showToast({ title: "Master Tugas Gagal Diperbarui", description: message, variant: "error" });
      return;
    }

    const body = (await response.json()) as { taskTemplate: TaskTemplate };
    setTaskTemplates((current) =>
      current.map((item) => (item.id === taskTemplate.id ? body.taskTemplate : item)),
    );
    showToast({
      title: "Master Tugas Berhasil Diperbarui",
      description: `${body.taskTemplate.title} sudah diperbarui.`,
      variant: "success",
    });
    cancelEdit();
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleDelete(taskTemplate: TaskTemplate) {
    if (!window.confirm(`Hapus master tugas ${taskTemplate.title}?`)) {
      return;
    }

    setError("");
    setDeletingId(taskTemplate.id);

    const response = await fetch(`/api/master-tasks/${taskTemplate.id}`, {
      method: "DELETE",
    });

    setDeletingId(null);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal menghapus master tugas.";
      setError(message);
      showToast({ title: "Master Tugas Gagal Dihapus", description: message, variant: "error" });
      return;
    }

    setTaskTemplates((current) => current.filter((item) => item.id !== taskTemplate.id));
    showToast({
      title: "Master Tugas Berhasil Dihapus",
      description: `${taskTemplate.title} telah dihapus.`,
      variant: "success",
    });
    if (editingId === taskTemplate.id) {
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
            Tabel Master Tugas
          </p>
          <h4 className="mt-2 text-2xl font-semibold text-slate-950">Daftar Master Tugas</h4>
          <p className="mt-2 text-[15px] text-slate-700">
            Tambah, edit, dan hapus master tugas langsung dari baris tabel.
          </p>
        </div>
        <Button type="button" onClick={beginCreate} disabled={isCreating || Boolean(editingId) || areas.length === 0} className="shrink-0">
          <Plus className="h-4 w-4" />
          Tambah Master Tugas
        </Button>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[minmax(0,1.5fr)_220px_220px_auto] lg:items-center">
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Cari judul, deskripsi, atau area"
          className="bg-white"
          aria-label="Cari master tugas"
        />
        <Select
          value={typeFilter}
          onChange={(event) => {
            setTypeFilter(event.target.value as "" | TaskType);
            setPage(1);
          }}
          className="bg-white"
          aria-label="Filter jenis tugas"
        >
          <option value="">Semua jenis</option>
          {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          value={areaFilter}
          onChange={(event) => {
            setAreaFilter(event.target.value);
            setPage(1);
          }}
          className="bg-white"
          aria-label="Filter area"
        >
          <option value="">Semua area</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </Select>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="responsive-table w-full min-w-[1100px] border-separate border-spacing-0">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-[0.12em] text-slate-600">
            <tr>
              <th className="px-5 py-4 font-semibold first:rounded-tl-lg">Area</th>
              <th className="px-5 py-4 font-medium">Judul</th>
              <th className="px-5 py-4 font-medium">Jenis</th>
              <th className="px-5 py-4 font-medium">Deskripsi</th>
              <th className="px-5 py-4 font-medium">Dibuat</th>
              <th className="px-5 py-4 font-medium">Diperbarui</th>
              <th className="px-5 py-4 font-medium text-right last:rounded-tr-lg">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isCreating ? (
              <tr className="bg-sky-50/70">
                <td data-label="Area" className="border-b border-slate-100 px-5 py-4 align-top">
                  <Select
                    value={createDraft.areaId}
                    onChange={(event) => updateCreateDraft("areaId", event.target.value)}
                  >
                    <option value="">Pilih area</option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </Select>
                </td>
                <td data-label="Judul" className="border-b border-slate-100 px-5 py-4 align-top">
                  <Input
                    value={createDraft.title}
                    onChange={(event) => updateCreateDraft("title", event.target.value)}
                    placeholder="Judul master tugas"
                    className="font-semibold"
                  />
                </td>
                <td data-label="Jenis" className="border-b border-slate-100 px-5 py-4 align-top">
                  <Select
                    value={createDraft.type}
                    onChange={(event) => updateCreateDraft("type", event.target.value as TaskType)}
                  >
                    {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </td>
                <td data-label="Deskripsi" className="border-b border-slate-100 px-5 py-4 align-top">
                  <TextArea
                    rows={3}
                    value={createDraft.description}
                    onChange={(event) => updateCreateDraft("description", event.target.value)}
                    placeholder="Deskripsi master tugas"
                  />
                </td>
                <td data-label="Dibuat" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                  Master baru
                </td>
                <td data-label="Diperbarui" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                  -
                </td>
                <td data-label="Aksi" className="border-b border-slate-100 px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <Button type="button" onClick={handleCreate} disabled={isCreatingPending} variant="secondary" size="icon" aria-label="Simpan master tugas baru">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button type="button" onClick={cancelCreate} disabled={isCreatingPending} variant="ghost" size="icon" aria-label="Batal tambah master tugas">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ) : null}

            {paginatedTaskTemplates.map((taskTemplate) => {
              const isEditing = editingId === taskTemplate.id;

              return (
                <tr
                  key={taskTemplate.id}
                  className={cn(
                    "transition",
                    isEditing ? "bg-sky-50/70" : "bg-white hover:bg-slate-50",
                  )}
                >
                  <td data-label="Area" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {isEditing && draft ? (
                      <Select
                        value={draft.areaId}
                        onChange={(event) => updateDraft("areaId", event.target.value)}
                      >
                        <option value="">Pilih area</option>
                        {areas.map((area) => (
                          <option key={area.id} value={area.id}>
                            {area.name}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      taskTemplate.area?.name ?? "-"
                    )}
                  </td>
                  <td data-label="Judul" className="border-b border-slate-100 px-5 py-4 align-top text-sm font-semibold text-slate-900">
                    {isEditing && draft ? (
                      <Input
                        value={draft.title}
                        onChange={(event) => updateDraft("title", event.target.value)}
                        className="font-semibold"
                      />
                    ) : (
                      taskTemplate.title
                    )}
                  </td>
                  <td data-label="Jenis" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {isEditing && draft ? (
                      <Select
                        value={draft.type}
                        onChange={(event) => updateDraft("type", event.target.value as TaskType)}
                      >
                        {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      TASK_TYPE_LABELS[taskTemplate.type]
                    )}
                  </td>
                  <td data-label="Deskripsi" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {isEditing && draft ? (
                      <TextArea
                        rows={3}
                        value={draft.description}
                        onChange={(event) => updateDraft("description", event.target.value)}
                      />
                    ) : (
                      <p className="max-w-xl leading-6">{taskTemplate.description}</p>
                    )}
                  </td>
                  <td data-label="Dibuat" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {formatDate(taskTemplate.createdAt)}
                  </td>
                  <td data-label="Diperbarui" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {formatDate(taskTemplate.updatedAt)}
                  </td>
                  <td data-label="Aksi" className="border-b border-slate-100 px-5 py-4">
                    <div className="flex justify-end gap-2">
                      {isEditing ? (
                        <>
                          <Button type="button" onClick={() => handleSave(taskTemplate)} disabled={savingId === taskTemplate.id} variant="secondary" size="icon" aria-label="Simpan perubahan master tugas">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button type="button" onClick={cancelEdit} disabled={savingId === taskTemplate.id} variant="ghost" size="icon" aria-label="Batal edit master tugas">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button type="button" onClick={() => beginEdit(taskTemplate)} disabled={Boolean(editingId) || isCreating} variant="secondary" size="icon" aria-label={`Edit ${taskTemplate.title}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" onClick={() => handleDelete(taskTemplate)} disabled={deletingId === taskTemplate.id || Boolean(editingId) || isCreating} variant="danger" size="icon" aria-label={`Hapus ${taskTemplate.title}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredTaskTemplates.length === 0 && !isCreating ? (
              <tr className="bg-white">
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                  {taskTemplates.length === 0 ? "Belum ada master tugas." : "Tidak ada master tugas yang sesuai dengan filter."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <ClientTablePagination
        page={safePage}
        totalItems={filteredTaskTemplates.length}
        perPage={perPage}
        itemLabel="tugas"
        onPageChange={setPage}
        onPerPageChange={(nextPerPage) => {
          setPerPage(nextPerPage);
          setPage(1);
        }}
      />
    </div>
  );
}
