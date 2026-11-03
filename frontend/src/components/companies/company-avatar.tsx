import type { CompanyProfile } from "@/features/companies/types";
import Image from "next/image";

export function CompanyAvatar({
  company,
  large = false,
}: {
  company: Pick<CompanyProfile, "mark" | "brand" | "logo">;
  large?: boolean;
}) {
  return (
    <span
      className={`company-avatar${large ? " company-avatar--large" : ""}`}
      data-brand={company.brand}
      aria-hidden="true"
    >
      {company.logo ? (
        <Image
          src={company.logo}
          alt=""
          width={80}
          height={80}
          unoptimized
          className="size-full object-contain"
        />
      ) : (
        <span>{company.mark}</span>
      )}
    </span>
  );
}
