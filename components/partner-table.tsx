"use client";

import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { ClientTablePagination } from "@/components/ui/client-table-pagination";
import { useToast } from "@/components/ui/toast-provider";
import { Alert, Button, Input } from "@/components/ui/primitives";
import type { Partner } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type DraftPartner = {
  name: string;
  description: string;
};

const emptyDraft: DraftPartner = {
  name: "",
  description: "",
};

export function PartnerTable({ initialPartners }: { initialPartners: Partner[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [partners, setPartners] = useState(initialPartners);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftPartner | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<DraftPartner>(emptyDraft);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isCreatingPending, setIsCreatingPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const deferredQuery = useDeferredValue(query);

  const filteredPartners = useMemo(() => {
    const keyword = deferredQuery.trim().toLowerCase();
    if (!keyword) {
      return partners;
    }

    return partners.filter((partner) =>
      `${partner.name} ${partner.description}`.toLowerCase().includes(keyword),
    );
  }, [deferredQuery, partners]);
  const totalPages = Math.max(1, Math.ceil(filteredPartners.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginatedPartners = useMemo(
    () => filteredPartners.slice((safePage - 1) * perPage, safePage * perPage),
    [filteredPartners, perPage, safePage],
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

  function beginEdit(partner: Partner) {
    setError("");
    setIsCreating(false);
    setEditingId(partner.id);
    setDraft({
      name: partner.name,
      description: partner.description,
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

    const response = await fetch("/api/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createDraft),
    });

    setIsCreatingPending(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal membuat mitra.";
      setError(message);
      showToast({ title: "Mitra gagal dibuat", description: message, variant: "error" });
      return;
    }

    const body = (await response.json()) as { partner: Partner };
    setPartners((current) => [body.partner, ...current]);
    showToast({ title: "Mitra berhasil dibuat", description: `${body.partner.name} sudah ditambahkan.`, variant: "success" });
    cancelCreate();
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleSave(partner: Partner) {
    if (!draft) {
      return;
    }

    setError("");
    setSavingId(partner.id);

    const response = await fetch(`/api/partners/${partner.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });

    setSavingId(null);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal memperbarui mitra.";
      setError(message);
      showToast({ title: "Mitra gagal diperbarui", description: message, variant: "error" });
      return;
    }

    const body = (await response.json()) as { partner: Partner };
    setPartners((current) => current.map((item) => (item.id === partner.id ? body.partner : item)));
    showToast({ title: "Mitra berhasil diperbarui", description: `${body.partner.name} sudah diperbarui.`, variant: "success" });
    cancelEdit();
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleDelete(partner: Partner) {
    if (!window.confirm(`Hapus mitra ${partner.name}?`)) {
      return;
    }

    setError("");
    setDeletingId(partner.id);

    const response = await fetch(`/api/partners/${partner.id}`, {
      method: "DELETE",
    });

    setDeletingId(null);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal menghapus mitra.";
      setError(message);
      showToast({ title: "Mitra gagal dihapus", description: message, variant: "error" });
      return;
    }

    setPartners((current) => current.filter((item) => item.id !== partner.id));
    showToast({ title: "Mitra berhasil dihapus", description: `${partner.name} telah dihapus.`, variant: "success" });
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Cari nama mitra atau deskripsi"
          className="bg-white sm:max-w-sm"
          aria-label="Cari mitra"
        />
        <Button type="button" onClick={beginCreate} disabled={isCreating || Boolean(editingId)} className="shrink-0">
          <Plus className="h-4 w-4" />
          Tambah mitra
        </Button>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="responsive-table min-w-[760px] w-full border-separate border-spacing-0">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-[0.12em] text-slate-600">
            <tr>
              <th className="px-5 py-4 font-semibold first:rounded-tl-lg">Nama mitra</th>
              <th className="px-5 py-4 font-medium">Deskripsi</th>
              <th className="px-5 py-4 font-medium">Dibuat</th>
              <th className="px-5 py-4 font-medium text-right last:rounded-tr-lg">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isCreating ? (
              <tr className="bg-sky-50/70">
                <td data-label="Nama Mitra" className="border-b border-slate-100 px-5 py-4 align-top">
                  <Input
                    value={createDraft.name}
                    onChange={(event) => setCreateDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Nama mitra"
                    className="font-semibold"
                  />
                </td>
                <td data-label="Deskripsi" className="border-b border-slate-100 px-5 py-4 align-top">
                  <Input
                    value={createDraft.description}
                    onChange={(event) => setCreateDraft((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Deskripsi opsional"
                  />
                </td>
                <td data-label="Dibuat" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">Mitra baru</td>
                <td data-label="Aksi" className="border-b border-slate-100 px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <Button type="button" onClick={handleCreate} disabled={isCreatingPending} variant="secondary" size="icon" aria-label="Simpan mitra baru">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button type="button" onClick={cancelCreate} disabled={isCreatingPending} variant="ghost" size="icon" aria-label="Batal tambah mitra">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ) : null}

            {paginatedPartners.map((partner) => {
              const isEditing = editingId === partner.id;

              return (
                <tr key={partner.id} className={cn("transition", isEditing ? "bg-sky-50/70" : "bg-white hover:bg-slate-50")}>
                  <td data-label="Nama Mitra" className="border-b border-slate-100 px-5 py-4 align-top text-sm font-semibold text-slate-900">
                    {isEditing && draft ? (
                      <Input
                        value={draft.name}
                        onChange={(event) => setDraft((current) => (current ? { ...current, name: event.target.value } : current))}
                        className="font-semibold"
                      />
                    ) : (
                      partner.name
                    )}
                  </td>
                  <td data-label="Deskripsi" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {isEditing && draft ? (
                      <Input
                        value={draft.description}
                        onChange={(event) => setDraft((current) => (current ? { ...current, description: event.target.value } : current))}
                      />
                    ) : (
                      partner.description || "-"
                    )}
                  </td>
                  <td data-label="Dibuat" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">{formatDate(partner.createdAt)}</td>
                  <td data-label="Aksi" className="border-b border-slate-100 px-5 py-4">
                    <div className="flex justify-end gap-2">
                      {isEditing ? (
                        <>
                          <Button type="button" onClick={() => handleSave(partner)} disabled={savingId === partner.id} variant="secondary" size="icon" aria-label="Simpan perubahan mitra">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button type="button" onClick={cancelEdit} disabled={savingId === partner.id} variant="ghost" size="icon" aria-label="Batal edit mitra">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button type="button" onClick={() => beginEdit(partner)} disabled={Boolean(editingId) || isCreating} variant="secondary" size="icon" aria-label={`Edit ${partner.name}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" onClick={() => handleDelete(partner)} disabled={deletingId === partner.id || Boolean(editingId) || isCreating} variant="danger" size="icon" aria-label={`Hapus ${partner.name}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredPartners.length === 0 && !isCreating ? (
              <tr className="bg-white">
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-500">
                  {partners.length === 0 ? "Belum ada mitra." : "Tidak ada mitra yang sesuai dengan pencarian."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <ClientTablePagination
        page={safePage}
        totalItems={filteredPartners.length}
        perPage={perPage}
        itemLabel="mitra"
        onPageChange={setPage}
        onPerPageChange={(nextPerPage) => {
          setPerPage(nextPerPage);
          setPage(1);
        }}
      />
    </div>
  );
}
