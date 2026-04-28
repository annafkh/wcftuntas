import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserTable } from "@/components/user-table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { QuerySelect } from "@/components/ui/query-select";
import { Card, Input, PageIntro, Select, buttonStyles } from "@/components/ui/primitives";
import { getSession } from "@/lib/auth";
import { listPartners, listUsersPaginated } from "@/lib/data";
import { ROLE_LABELS, type UserRole } from "@/lib/types";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  function getVisiblePages(currentPage: number, totalPages: number) {
    return Array.from({ length: totalPages }, (_, index) => index + 1).filter(
      (pageNumber) =>
        Math.abs(pageNumber - currentPage) <= 1 || pageNumber === 1 || pageNumber === totalPages,
    );
  }

  const session = await getSession();
  if (!session) {
    return null;
  }

  if (session.role !== "pt_wcf") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const filters = {
    search: typeof params.search === "string" ? params.search : undefined,
    role: typeof params.role === "string" ? (params.role as UserRole) : undefined,
    partnerId: typeof params.partnerId === "string" ? params.partnerId : undefined,
  };
  const page = typeof params.page === "string" ? Math.max(1, Number.parseInt(params.page, 10) || 1) : 1;
  const perPage =
    typeof params.perPage === "string" ? Math.max(5, Number.parseInt(params.perPage, 10) || 10) : 10;

  const [result, partners] = await Promise.all([
    listUsersPaginated(filters, { page, perPage }),
    listPartners(),
  ]);
  const users = result.items;
  const createRowParams = new URLSearchParams();
  if (filters.search) {
    createRowParams.set("search", filters.search);
  }
  if (filters.role) {
    createRowParams.set("role", filters.role);
  }
  if (filters.partnerId) {
    createRowParams.set("partnerId", filters.partnerId);
  }
  createRowParams.set("page", String(result.page));
  createRowParams.set("perPage", String(result.perPage));
  createRowParams.set("new", "1");

  function buildUsersUrl(nextPage: number) {
    const query = new URLSearchParams();
    if (filters.search) {
      query.set("search", filters.search);
    }
    if (filters.role) {
      query.set("role", filters.role);
    }
    if (filters.partnerId) {
      query.set("partnerId", filters.partnerId);
    }
    if (perPage !== 10) {
      query.set("perPage", String(perPage));
    }
    if (nextPage > 1) {
      query.set("page", String(nextPage));
    }
    return `/users${query.toString() ? `?${query.toString()}` : ""}`;
  }

  const visiblePages = getVisiblePages(result.page, result.totalPages);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-700">
                Tabel User
              </p>
              <h4 className="mt-2 text-2xl font-semibold text-slate-950">Daftar Pengguna</h4>
            </div>

            <form className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_220px_220px_auto]">
              <label className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-3.5 focus-within:border-sky-700 focus-within:ring-2 focus-within:ring-sky-600/20">
                <Search className="h-4 w-4 text-slate-400" />
                <Input
                  name="search"
                  defaultValue={filters.search}
                  placeholder="Cari nama, username, email, atau mitra"
                  className="border-0 bg-transparent px-0 focus:border-transparent focus-visible:ring-0"
                />
              </label>
              <Select
                name="role"
                defaultValue={filters.role ?? ""}
              >
                <option value="">Semua Role</option>
                <option value="pt_wcf">{ROLE_LABELS.pt_wcf}</option>
                <option value="karyawan">{ROLE_LABELS.karyawan}</option>
                <option value="pengawas">{ROLE_LABELS.pengawas}</option>
              </Select>
              <Select name="partnerId" defaultValue={filters.partnerId ?? ""}>
                <option value="">Semua Mitra</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </Select>
              <div className="flex flex-wrap gap-3">
                <button type="submit" className={buttonStyles({ variant: "primary" })}>
                  Terapkan Filter
                </button>
                <Link
                  href={`/users?${createRowParams.toString()}`}
                  className="inline-flex min-h-11 min-w-[140px] items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold !text-white transition hover:bg-slate-800 hover:!text-white"
                >
                  <Plus className="h-4 w-4" />
                  Tambah User
                </Link>
              </div>
            </form>
          </div>

          <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            {(filters.search || filters.role || filters.partnerId) && (
              <a href="/users" className="text-sm font-semibold text-sky-700 transition hover:text-sky-800">
                Reset Filter
              </a>
            )}
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <UserTable
            key={params.new === "1" ? "creating-user" : "listing-users"}
            users={users}
            partners={partners}
            session={session}
            startInCreateMode={params.new === "1"}
          />

          <div className="mt-5 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Tampil</span>
                <QuerySelect
                  name="perPage"
                  value={String(perPage)}
                  className="min-h-9! w-18! shrink-0 bg-white px-3 pr-7 text-sm"
                  options={[
                    { label: "5", value: "5" },
                    { label: "10", value: "10" },
                    { label: "25", value: "25" },
                    { label: "50", value: "50" },
                  ]}
                />
                <span>entries</span>
              </div>
              <p className="text-sm text-slate-500">
                Menampilkan {(result.total === 0 ? 0 : (result.page - 1) * result.perPage + 1)}-
                {Math.min(result.page * result.perPage, result.total)} dari {result.total} user
              </p>
            </div>

            <Pagination className="mx-0 w-auto justify-start sm:justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={result.page > 1 ? buildUsersUrl(result.page - 1) : "#"}
                    className={result.page === 1 ? "pointer-events-none opacity-40" : ""}
                  />
                </PaginationItem>
                {visiblePages.map((pageNumber, index) => {
                  const prev = visiblePages[index - 1];
                  const showDots = index > 0 && prev && pageNumber - prev > 1;

                  return (
                    <PaginationItem key={pageNumber} className="flex items-center">
                      {showDots ? <PaginationEllipsis /> : null}
                      <PaginationLink href={buildUsersUrl(pageNumber)} isActive={pageNumber === result.page}>
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    href={result.page < result.totalPages ? buildUsersUrl(result.page + 1) : "#"}
                    className={result.page >= result.totalPages ? "pointer-events-none opacity-40" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </Card>
    </div>
  );
}
