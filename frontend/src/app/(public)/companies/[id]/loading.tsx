import { CompaniesSkeleton } from "@/components/companies/companies-skeleton";

export default function Loading() {
  return (
    <main id="main" className="companies-page">
      <CompaniesSkeleton />
    </main>
  );
}
