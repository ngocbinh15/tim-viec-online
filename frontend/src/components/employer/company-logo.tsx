"use client";

import { useState } from "react";
import Image from "next/image";
import type { Company } from "@/features/jobs/types";

export function CompanyLogo({
  company,
  className = "ep-company-logo",
}: {
  company: Pick<Company, "name" | "logo">;
  className?: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = company.logo;

  return (
    <span className={className} aria-hidden="true">
      {source && failedSource !== source ? (
        <Image
          key={source}
          src={source}
          alt=""
          width={44}
          height={44}
          unoptimized
          onError={() => setFailedSource(source)}
        />
      ) : (
        company.name.slice(0, 3).toUpperCase()
      )}
    </span>
  );
}
