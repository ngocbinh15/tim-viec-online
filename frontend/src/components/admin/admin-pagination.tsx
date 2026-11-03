"use client";

import { Pagination } from "@/components/layout/pagination";

export function AdminPagination(props: {
  page: number;
  lastPage: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  return <Pagination {...props} />;
}
