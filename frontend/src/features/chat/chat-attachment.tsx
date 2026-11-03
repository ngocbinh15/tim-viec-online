import Image from "next/image";

/** Reserve the same space for local previews and downloaded private images. */
export function ChatAttachment({ src }: { src: string }) {
  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      aria-label="Xem ảnh đính kèm"
      style={{
        display: "block",
        position: "relative",
        width: 240,
        maxWidth: "100%",
        aspectRatio: "4 / 3",
        overflow: "hidden",
        borderRadius: 10,
        background: "var(--card)",
        border: "1px solid var(--border)",
      }}
    >
      <Image
        src={src}
        alt="Ảnh đính kèm trong hội thoại"
        fill
        sizes="240px"
        unoptimized
        style={{ objectFit: "contain" }}
      />
    </a>
  );
}
