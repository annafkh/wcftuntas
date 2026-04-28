"use client";

import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { ClientTablePagination } from "@/components/ui/client-table-pagination";
import { useToast } from "@/components/ui/toast-provider";
import { Alert, Button, Input } from "@/components/ui/primitives";
import type { MasterArea } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type DraftState = {
  name: string;
};

const emptyDraft: DraftState = {
  name: "",
};

export function MasterAreaManager({
  initialAreas,
}: {
  initialAreas: MasterArea[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [areas, setAreas] = useState(initialAreas);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<DraftState>(emptyDraft);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isCreatingPending, setIsCreatingPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const deferredQuery = useDeferredValue(query);

  const filteredAreas = useMemo(() => {
    const keyword = deferredQuery.trim().toLowerCase();
    if (!keyword) {
      return areas;
    }

    return areas.filter((area) => area.name.toLowerCase().includes(keyword));
  }, [areas, deferredQuery]);
  const totalPages = Math.max(1, Math.ceil(filteredAreas.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginatedAreas = useMemo(
    () => filteredAreas.slice((safePage - 1) * perPage, safePage * perPage),
    [filteredAreas, perPage, safePage],
  );

  function beginCreate() {
    setError("");
    setEditingId(null);
    setDraft(null);
    setIsCreating(true);
    setCreateDraft(emptyDraft);
  }

  function cancelCreate() {
    setError("");
    setIsCreating(false);
    setCreateDraft(emptyDraft);
  }

  function beginEdit(area: MasterArea) {
    setError("");
    setIsCreating(false);
    setEditingId(area.id);
    setDraft({
      name: area.name,
    });
  }

  function cancelEdit() {
    setError("");
    setEditingId(null);
    setDraft(null);
  }

  async function handleCreate() {
    setError("");
    setIsCreatingPending(true);

    const response = await fetch("/api/master-areas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createDraft),
    });

    setIsCreatingPending(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal membuat master area.";
      setError(message);
      showToast({ title: "Master area gagal dibuat", description: message, variant: "error" });
      return;
    }

    const body = (await response.json()) as { area: MasterArea };
    setAreas((current) => [body.area, ...current]);
    showToast({
      title: "Master area berhasil dibuat",
      description: `${body.area.name} sudah ditambahkan.`,
      variant: "success",
    });
    cancelCreate();
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleSave(area: MasterArea) {
    if (!draft) {
      return;
    }

    setError("");
    setSavingId(area.id);

    const response = await fetch(`/api/master-areas/${area.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    
    setSavingId(null);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal memperbarui master area.";
      setError(message);
      showToast({ title: "Master area gagal diperbarui", description: message, variant: "error" });
      return;
    }

    const body = (await response.json()) as { area: MasterArea };
    setAreas((current) => current.map((item) => (item.id === area.id ? body.area : item)));
    showToast({
      title: "Master area berhasil diperbarui",
      description: `${body.area.name} sudah diperbarui.`,
      variant: "success",
    });
    setSavingId(null);
    cancelEdit();
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleDelete(area: MasterArea) {
    if (!window.confirm(`Hapus master area ${area.name}?`)) {
      return;
    }

    setError("");
    setDeletingId(area.id);

    const response = await fetch(`/api/master-areas/${area.id}`, {
      method: "DELETE",
    });

    setDeletingId(null);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal menghapus master area.";
      setError(message);
      showToast({ title: "Master area gagal dihapus", description: message, variant: "error" });
      return;
    }

    setAreas((current) => current.filter((item) => item.id !== area.id));
    showToast({
      title: "Master area berhasil dihapus",
      description: `${area.name} telah dihapus.`,
      variant: "success",
    });
    if (editingId === area.id) {
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
            Tabel master area
          </p>
          <h4 className="mt-2 text-2xl font-semibold text-slate-950">Daftar Master Area</h4>
          <p className="mt-2 text-[15px] text-slate-700">
            Kelola daftar area yang nanti dipakai pada form task.
          </p>
        </div>
        <Button type="button" onClick={beginCreate} disabled={isCreating || Boolean(editingId)} className="shrink-0">
          <Plus className="h-4 w-4" />
          Tambah Master Area
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Cari nama area"
          className="sm:max-w-sm bg-white"
          aria-label="Cari area"
        />
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="responsive-table w-full min-w-[680px] border-separate border-spacing-0">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-[0.12em] text-slate-600">
            <tr>
              <th className="px-5 py-4 font-semibold first:rounded-tl-lg">Nama area</th>
              <th className="px-5 py-4 font-medium">Dibuat</th>
              <th className="px-5 py-4 font-medium">Diperbarui</th>
              <th className="px-5 py-4 font-medium text-right last:rounded-tr-lg">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isCreating ? (
              <tr className="bg-sky-50/70">
                <td data-label="Nama Area" className="border-b border-slate-100 px-5 py-4 align-top">
                  <Input
                    value={createDraft.name}
                    onChange={(event) => setCreateDraft({ name: event.target.value })}
                    placeholder="Nama area"
                    className="font-semibold"
                  />
                </td>
                <td data-label="Dibuat" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                  Hari ini
                </td>
                <td data-label="Diperbarui" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                  Hari ini
                </td>
                <td data-label="Aksi" className="border-b border-slate-100 px-5 py-4 align-top">
                  <div className="flex justify-end gap-2">
                    <Button type="button" onClick={handleCreate} disabled={isCreatingPending} variant="secondary" size="icon" aria-label="Simpan master area baru">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button type="button" onClick={cancelCreate} disabled={isCreatingPending} variant="ghost" size="icon" aria-label="Batal tambah master area">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ) : null}

            {paginatedAreas.map((area) => {
              const isEditing = editingId === area.id;

              return (
                <tr key={area.id} className={isEditing ? "bg-sky-50/70" : "bg-white hover:bg-slate-50"}>
                  <td data-label="Nama Area" className="border-b border-slate-100 px-5 py-4 align-top">
                    {isEditing && draft ? (
                      <Input
                        value={draft.name}
                        onChange={(event) => setDraft({ name: event.target.value })}
                        className="font-semibold"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900">{area.name}</p>
                    )}
                  </td>
                  <td data-label="Dibuat" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {formatDate(area.createdAt)}
                  </td>
                  <td data-label="Diperbarui" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {formatDate(area.updatedAt)}
                  </td>
                  <td data-label="Aksi" className="border-b border-slate-100 px-5 py-4 align-top">
                    <div className="flex justify-end gap-2">
                      {isEditing ? (
                        <>
                          <Button type="button" onClick={() => handleSave(area)} disabled={savingId === area.id} variant="secondary" size="icon" aria-label="Simpan perubahan master area">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button type="button" onClick={cancelEdit} disabled={savingId === area.id} variant="ghost" size="icon" aria-label="Batal edit master area">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button type="button" onClick={() => beginEdit(area)} disabled={Boolean(editingId) || isCreating || deletingId === area.id} variant="secondary" size="icon" aria-label={`Edit ${area.name}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" onClick={() => handleDelete(area)} disabled={Boolean(editingId) || isCreating || deletingId === area.id} variant="danger" size="icon" aria-label={`Hapus ${area.name}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredAreas.length === 0 && !isCreating ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-500">
                  {areas.length === 0 ? "Belum ada master area." : "Tidak ada area yang sesuai dengan pencarian."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <ClientTablePagination
        page={safePage}
        totalItems={filteredAreas.length}
        perPage={perPage}
        itemLabel="area"
        onPageChange={setPage}
        onPerPageChange={(nextPerPage) => {
          setPerPage(nextPerPage);
          setPage(1);
        }}
      />
    </div>
  );
}
