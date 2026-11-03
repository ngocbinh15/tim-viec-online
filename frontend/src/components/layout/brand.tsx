import Link from "next/link";
import Image from "next/image";

export function Brand({
  label = "TimViecOnline — Tìm việc làm",
}: {
  label?: string | null;
}) {
  return (
    <Link href="/" className="brand" aria-label={label ?? undefined}>
      <Image
        src="/brand/logo.png"
        alt=""
        width={48}
        height={48}
        sizes="48px"
        loading="eager"
        className="brand-mark"
      />
      <span>
        <span className="brand-name">
          TimViec<span>Online</span>
        </span>
        <span className="brand-tagline">Cổng việc làm & tuyển dụng</span>
      </span>
    </Link>
  );
}
