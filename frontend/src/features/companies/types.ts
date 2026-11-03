import type { Company } from "../jobs/types";

export const COMPANY_SECTORS = {
  technology: "Công nghệ thông tin (IT)",
  finance: "Ngân hàng / Tài chính",
  retail: "Bán lẻ / FMCG",
  industry: "Sản xuất / Vận tải",
} as const;

export type CompanySector = keyof typeof COMPANY_SECTORS;
export type CompanyProfile = Company & {
  short_name: string;
  mark: string;
  brand: string;
  industry_label: string;
  sectors: CompanySector[];
  subtitle: string;
  summary: string;
  introduction: string[];
  locations: { city: string; address: string }[];
  active_jobs_count: number;
};
