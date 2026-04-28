"use client";

import { Check, KeyRound, LogIn, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { Alert, Button, Input, Select } from "@/components/ui/primitives";
import { ROLE_LABELS, type Partner, type SessionPayload, type User } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type DraftUser = {
  name: string;
  username: string;
  email: string;
  role: "karyawan" | "pengawas";
  partnerId: string;
  isActive: boolean;
};

type CreateDraftUser = DraftUser & {
  password: string;
};

export function UserTable({
  users,
  partners,
  session,
  startInCreateMode = false,
}: {
  users: User[];
  partners: Partner[];
  session: SessionPayload;
  startInCreateMode?: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftUser | null>(null);
  const [isCreating, setIsCreating] = useState(startInCreateMode);
  const [createDraft, setCreateDraft] = useState<CreateDraftUser>({
    name: "",
    username: "",
    email: "",
    role: "karyawan",
    partnerId: "",
    isActive: true,
    password: "",
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isCreatingPending, setIsCreatingPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function beginEdit(user: User) {
    setError("");
    setIsCreating(false);
    setEditingId(user.id);
    setDraft({
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role === "pengawas" ? "pengawas" : "karyawan",
      partnerId: user.partnerId ?? "",
      isActive: user.isActive,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
    setError("");
  }

  function cancelCreate() {
    setIsCreating(false);
    setCreateDraft({
      name: "",
      username: "",
      email: "",
      role: "karyawan",
      partnerId: "",
      isActive: true,
      password: "",
    });
    setError("");
  }

  function updateDraft<K extends keyof DraftUser>(key: K, value: DraftUser[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateCreateDraft<K extends keyof CreateDraftUser>(key: K, value: CreateDraftUser[K]) {
    setCreateDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(user: User) {
    if (!draft) {
      return;
    }

    setError("");
    setSavingId(user.id);

    const response = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(draft),
    });

    setSavingId(null);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal memperbarui user.";
      setError(message);
      showToast({ title: "User Gagal Diperbarui", description: message, variant: "error" });
      return;
    }

    showToast({
      title: "User Berhasil Diperbarui",
      description: `${draft.name} sudah diperbarui.`,
      variant: "success",
    });

    cancelEdit();
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleCreate() {
    setError("");
    setIsCreatingPending(true);

    const response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createDraft),
    });

    setIsCreatingPending(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal membuat user.";
      setError(message);
      showToast({ title: "User Gagal Dibuat", description: message, variant: "error" });
      return;
    }

    showToast({
      title: "User Berhasil Dibuat",
      description: `${createDraft.name} sudah ditambahkan.`,
      variant: "success",
    });

    cancelCreate();
    startTransition(() => {
      router.replace("/users");
      router.refresh();
    });
  }

  async function handleDelete(user: User) {
    if (!window.confirm(`Hapus user ${user.name}?`)) {
      return;
    }

    setError("");
    setDeletingId(user.id);

    const response = await fetch(`/api/users/${user.id}`, {
      method: "DELETE",
    });

    setDeletingId(null);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal menghapus user.";
      setError(message);
      showToast({ title: "User Gagal Dihapus", description: message, variant: "error" });
      return;
    }

    showToast({
      title: "User Berhasil Dihapus",
      description: `${user.name} telah dihapus.`,
      variant: "success",
    });

    startTransition(() => {
      router.refresh();
    });
  }

  async function handleResetPassword(user: User) {
    const password = window.prompt(`Masukkan password baru untuk ${user.name}:`);
    if (!password) {
      return;
    }

    setError("");
    setSavingId(user.id);

    const response = await fetch(`/api/users/${user.id}/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    setSavingId(null);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal reset password user.";
      setError(message);
      showToast({ title: "Reset Password Gagal", description: message, variant: "error" });
      return;
    }

    showToast({
      title: "Password Berhasil Direset",
      description: `${user.name} wajib mengganti password saat login berikutnya.`,
      variant: "success",
    });
  }

  async function handleLoginAs(user: User) {
    if (!window.confirm(`Login As sebagai ${user.name}?`)) {
      return;
    }

    setError("");
    setSavingId(user.id);

    const response = await fetch(`/api/users/${user.id}/login-as`, {
      method: "POST",
    });

    setSavingId(null);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      const message = body.error ?? "Gagal menjalankan Login As.";
      setError(message);
      showToast({ title: "Login As Gagal", description: message, variant: "error" });
      return;
    }

    const body = (await response.json()) as { redirectTo?: string };
    showToast({
      title: "Login As Berhasil",
      description: `Sekarang masuk sebagai ${user.name}.`,
      variant: "success",
    });

    startTransition(() => {
      router.push(body.redirectTo ?? "/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error ? <Alert>{error}</Alert> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="responsive-table min-w-[1180px] w-full border-separate border-spacing-0">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-[0.12em] text-slate-600">
            <tr>
              <th className="px-5 py-4 font-semibold first:rounded-tl-lg">Nama</th>
              <th className="px-5 py-4 font-medium">Username</th>
              <th className="px-5 py-4 font-medium">Email</th>
              <th className="px-5 py-4 font-medium">Role</th>
              <th className="px-5 py-4 font-medium">Mitra</th>
              <th className="px-5 py-4 font-medium">Non Aktif</th>
              <th className="px-5 py-4 font-medium">Dibuat</th>
              <th className="px-5 py-4 text-center font-medium last:rounded-tr-lg">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isCreating ? (
              <tr className="bg-sky-50/70">
                <td data-label="Nama" className="border-b border-slate-100 px-5 py-4 align-top">
                  <Input
                    value={createDraft.name}
                    onChange={(event) => updateCreateDraft("name", event.target.value)}
                    placeholder="Nama lengkap"
                    className="font-semibold"
                  />
                </td>
                <td data-label="Username" className="border-b border-slate-100 px-5 py-4 align-top">
                  <Input
                    value={createDraft.username}
                    onChange={(event) => updateCreateDraft("username", event.target.value)}
                    placeholder="Username"
                  />
                </td>
                <td data-label="Email" className="border-b border-slate-100 px-5 py-4 align-top">
                  <Input
                    type="email"
                    value={createDraft.email}
                    onChange={(event) => updateCreateDraft("email", event.target.value)}
                    placeholder="Email Opsional"
                  />
                </td>
                <td data-label="Role" className="border-b border-slate-100 px-5 py-4 align-top">
                  <div className="space-y-2">
                    <Select
                      value={createDraft.role}
                      onChange={(event) =>
                        updateCreateDraft("role", event.target.value as CreateDraftUser["role"])
                      }
                    >
                      <option value="karyawan">{ROLE_LABELS.karyawan}</option>
                      <option value="pengawas">{ROLE_LABELS.pengawas}</option>
                    </Select>
                    <Input
                      type="password"
                      value={createDraft.password}
                      onChange={(event) => updateCreateDraft("password", event.target.value)}
                      placeholder="Password awal"
                    />
                  </div>
                </td>
                <td data-label="Mitra" className="border-b border-slate-100 px-5 py-4 align-top">
                  <Select
                    value={createDraft.partnerId}
                    onChange={(event) => updateCreateDraft("partnerId", event.target.value)}
                  >
                    <option value="">Pilih mitra</option>
                    {partners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name}
                      </option>
                    ))}
                  </Select>
                </td>
                <td data-label="Non Aktif" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                  Tidak
                </td>
                <td data-label="Dibuat" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                  User baru
                </td>
                <td data-label="Aksi" className="border-b border-slate-100 px-5 py-4">
                  <div className="flex justify-center gap-2">
                    <Button type="button" onClick={handleCreate} disabled={isCreatingPending} variant="secondary" size="icon" aria-label="Simpan user baru">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button type="button" onClick={cancelCreate} disabled={isCreatingPending} variant="ghost" size="icon" aria-label="Batal tambah user">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ) : null}

            {users.map((user) => {
              const isEditing = editingId === user.id;
              const canDelete = user.role !== "pt_wcf" && user.id !== session.userId;
              const canEdit = user.role !== "pt_wcf" && user.id !== session.userId;
              const canLoginAs = session.role === "pt_wcf" && user.role !== "pt_wcf" && user.id !== session.userId;

              return (
                <tr
                  key={user.id}
                  className={cn(
                    "transition",
                    isEditing ? "bg-sky-50/70" : "bg-white hover:bg-slate-50",
                  )}
                >
                  <td data-label="Nama" className="border-b border-slate-100 px-5 py-4 align-top text-sm font-semibold text-slate-900">
                    {isEditing && draft ? (
                      <Input
                        value={draft.name}
                        onChange={(event) => updateDraft("name", event.target.value)}
                        className="font-semibold"
                      />
                    ) : (
                      user.name
                    )}
                  </td>
                  <td data-label="Username" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {isEditing && draft ? (
                      <Input
                        value={draft.username}
                        onChange={(event) => updateDraft("username", event.target.value)}
                      />
                    ) : (
                      user.username
                    )}
                  </td>
                  <td data-label="Email" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {isEditing && draft ? (
                      <Input
                        type="email"
                        value={draft.email}
                        onChange={(event) => updateDraft("email", event.target.value)}
                      />
                    ) : (
                      user.email || "-"
                    )}
                  </td>
                  <td data-label="Role" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {isEditing && draft ? (
                      <Select
                        value={draft.role}
                        onChange={(event) => updateDraft("role", event.target.value as DraftUser["role"])}
                      >
                        <option value="karyawan">{ROLE_LABELS.karyawan}</option>
                        <option value="pengawas">{ROLE_LABELS.pengawas}</option>
                      </Select>
                    ) : (
                      ROLE_LABELS[user.role]
                    )}
                  </td>
                  <td data-label="Mitra" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {isEditing && draft ? (
                      <Select
                        value={draft.partnerId}
                        onChange={(event) => updateDraft("partnerId", event.target.value)}
                      >
                        <option value="">Pilih mitra</option>
                        {partners.map((partner) => (
                          <option key={partner.id} value={partner.id}>
                            {partner.name}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      user.department
                    )}
                  </td>
                  <td data-label="Non Aktif" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {isEditing && draft ? (
                      <Select
                        value={draft.isActive ? "active" : "inactive"}
                        onChange={(event) => updateDraft("isActive", event.target.value === "active")}
                      >
                        <option value="active">Tidak</option>
                        <option value="inactive">Ya</option>
                      </Select>
                    ) : user.isActive ? (
                      "Tidak"
                    ) : (
                      "Ya"
                    )}
                  </td>
                  <td data-label="Dibuat" className="border-b border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                    {formatDate(user.createdAt)}
                  </td>
                  <td data-label="Aksi" className="border-b border-slate-100 px-5 py-4">
                    <div className="flex justify-center gap-2">
                      {isEditing ? (
                        <>
                          <Button type="button" onClick={() => handleSave(user)} disabled={savingId === user.id} variant="secondary" size="icon" aria-label="Simpan perubahan">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button type="button" onClick={cancelEdit} disabled={savingId === user.id} variant="ghost" size="icon" aria-label="Batal edit">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {canEdit ? (
                            <Button type="button" onClick={() => beginEdit(user)} disabled={Boolean(editingId) || isCreating} variant="secondary" size="icon" aria-label={`Edit ${user.name}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-300">
                              <Pencil className="h-4 w-4" />
                            </span>
                          )}
                          {canEdit ? (
                            <Button type="button" onClick={() => handleResetPassword(user)} disabled={savingId === user.id || Boolean(editingId) || isCreating} variant="ghost" size="icon" aria-label={`Reset password ${user.name}`}>
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-300">
                              <KeyRound className="h-4 w-4" />
                            </span>
                          )}
                          {canDelete ? (
                            <Button type="button" onClick={() => handleDelete(user)} disabled={deletingId === user.id || Boolean(editingId) || isCreating} variant="danger" size="icon" aria-label={`Hapus ${user.name}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-300">
                              <Trash2 className="h-4 w-4" />
                            </span>
                          )}
                          {canLoginAs ? (
                            <Button
                              type="button"
                              onClick={() => handleLoginAs(user)}
                              disabled={savingId === user.id || Boolean(editingId) || isCreating}
                              variant="ghost"
                              size="icon"
                              aria-label={`Login As ${user.name}`}
                            >
                              <LogIn className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {users.length === 0 && !isCreating ? (
              <tr className="bg-white">
                <td
                  colSpan={8}
                  className="px-5 py-10 text-center text-sm text-slate-500"
                >
                  Tidak ada user yang sesuai dengan filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
