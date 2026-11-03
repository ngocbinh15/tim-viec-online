export type PublicRealtimeConfig = {
  key: string;
  host: string;
  port: number;
  tls: boolean;
};

/** Read at server runtime so the same build works with a separate test/deploy API. */
export function publicRealtimeConfig(
  environment: Record<string, string | undefined>,
): PublicRealtimeConfig | null {
  const key = environment.NEXT_PUBLIC_REVERB_APP_KEY?.trim();
  if (!key) return null;
  const tls = environment.NEXT_PUBLIC_REVERB_SCHEME === "https";
  const port = Number(
    environment.NEXT_PUBLIC_REVERB_PORT || (tls ? 443 : 8080),
  );
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) return null;
  return { key, host: environment.NEXT_PUBLIC_REVERB_HOST || "", port, tls };
}
