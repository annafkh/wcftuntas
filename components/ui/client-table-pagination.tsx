"use client";

import { Select } from "@/components/ui/primitives";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

function getVisiblePages(currentPage: number, totalPages: number) {
  return Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (pageNumber) =>
      Math.abs(pageNumber - currentPage) <= 1 || pageNumber === 1 || pageNumber === totalPages,
  );
}

export function ClientTablePagination({
  page,
  totalItems,
  perPage,
  perPageOptions = [5, 10, 25, 50],
  itemLabel,
  onPageChange,
  onPerPageChange,
}: {
  page: number;
  totalItems: number;
  perPage: number;
  perPageOptions?: number[];
  itemLabel: string;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const safePage = Math.min(page, totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * perPage + 1;
  const end = Math.min(safePage * perPage, totalItems);
  const visiblePages = getVisiblePages(safePage, totalPages);

  return (
    <div className="flex flex-col gap-4 border-t border-slate-200 px-4 py-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Select
            value={String(perPage)}
            onChange={(event) => onPerPageChange(Number(event.target.value))}
            className="!min-h-9 !w-[72px] shrink-0 bg-white px-3 pr-7 text-sm"
            aria-label={`Jumlah ${itemLabel} per halaman`}
          >
            {perPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          <span>entries</span>
        </div>
        <p className="text-sm leading-5 text-slate-600">
          Menampilkan {start}-{end} dari {totalItems} {itemLabel}
        </p>
      </div>

      <Pagination className="mx-0 w-auto justify-start lg:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(event) => {
                event.preventDefault();
                if (safePage > 1) {
                  onPageChange(safePage - 1);
                }
              }}
              className={safePage <= 1 ? "pointer-events-none opacity-40" : ""}
            />
          </PaginationItem>
          {visiblePages.map((pageNumber, index) => {
            const previousPage = visiblePages[index - 1];
            const showDots = index > 0 && previousPage && pageNumber - previousPage > 1;

            return (
              <PaginationItem key={pageNumber} className="flex items-center">
                {showDots ? <PaginationEllipsis /> : null}
                <PaginationLink
                  href="#"
                  isActive={pageNumber === safePage}
                  onClick={(event) => {
                    event.preventDefault();
                    onPageChange(pageNumber);
                  }}
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            );
          })}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(event) => {
                event.preventDefault();
                if (safePage < totalPages) {
                  onPageChange(safePage + 1);
                }
              }}
              className={safePage >= totalPages ? "pointer-events-none opacity-40" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
