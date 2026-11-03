import Link from "next/link";
import { paginationPages } from "@/features/pagination";

type PaginationProps = {
  page: number;
  lastPage: number;
  label?: string;
  prefetch?: boolean;
} & (
  | { pageUrl: (page: number) => string; onPageChange?: never }
  | { pageUrl?: never; onPageChange: (page: number) => void }
);

export function Pagination({
  page,
  lastPage,
  pageUrl,
  onPageChange,
  label = "Phân trang",
  prefetch,
}: PaginationProps) {
  if (lastPage <= 1) return null;
  const control = (
    number: number,
    name: string,
    text: string,
    current = false,
  ) =>
    pageUrl ? (
      <Link
        key={name}
        href={pageUrl(number)}
        prefetch={prefetch}
        aria-label={name}
        aria-current={current ? "page" : undefined}
      >
        {text}
      </Link>
    ) : (
      <button
        key={name}
        type="button"
        onClick={() => onPageChange(number)}
        aria-label={name}
        aria-current={current ? "page" : undefined}
      >
        {text}
      </button>
    );
  return (
    <nav className="pagination" aria-label={label}>
      {page > 1 && (
        <>
          {control(1, "Trang đầu", "<<")}
          {control(page - 1, "Trang trước", "<")}
        </>
      )}
      {paginationPages(page, lastPage).map((number) =>
        control(number, `Trang ${number}`, String(number), number === page),
      )}
      {page < lastPage && control(page + 1, "Trang sau", ">")}
    </nav>
  );
}
