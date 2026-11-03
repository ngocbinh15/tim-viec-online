export type SaveStatus = "saved" | "dirty" | "saving" | "error" | "conflict";
export class ResumeAutosave<T> {
  revision: number;
  status: SaveStatus = "saved";
  error?: unknown;
  dirty = false;
  private draft?: T;
  private version = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private inFlight?: Promise<number>;
  private closed = false;
  private controller = new AbortController();
  constructor(
    revision: number,
    private send: (
      value: T,
      revision: number,
      signal: AbortSignal,
    ) => Promise<number>,
    private notify: (status: SaveStatus, error?: unknown) => void,
  ) {
    this.revision = revision;
  }
  private report(status: SaveStatus, error?: unknown) {
    this.status = status;
    this.error = error;
    if (!this.closed) this.notify(status, error);
  }
  change(value: T) {
    if (this.closed) return;
    this.draft = structuredClone(value);
    this.version++;
    this.dirty = true;
    clearTimeout(this.timer);
    if (this.status === "conflict") return;
    this.report("dirty");
    this.timer = setTimeout(() => {
      void this.flush().catch(() => {});
    }, 1000);
  }
  flush(): Promise<number> {
    clearTimeout(this.timer);
    if (this.closed || this.status === "conflict")
      return Promise.reject(
        new Error(
          "Không thể lưu. Vui lòng tải phiên bản mới hoặc tạo bản sao.",
        ),
      );
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.perform().finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }
  private async perform(): Promise<number> {
    while (this.dirty && this.draft !== undefined) {
      const version = this.version;
      const snapshot = structuredClone(this.draft);
      this.report("saving");
      try {
        let revision = this.revision;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (this.closed) throw new Error("Editor closed");
          try {
            revision = await this.send(
              snapshot,
              this.revision,
              this.controller.signal,
            );
            break;
          } catch (error) {
            if (
              this.closed ||
              (error as { status?: number }).status !== 503 ||
              attempt === 2
            )
              throw error;
            await new Promise((resolve) =>
              setTimeout(resolve, 250 * (attempt + 1)),
            );
          }
        }
        if (this.closed) throw new Error("Editor closed");
        this.revision = revision;
        if (version === this.version) this.dirty = false;
      } catch (error) {
        this.report(
          (error as { status?: number }).status === 409 ? "conflict" : "error",
          error,
        );
        throw error;
      }
    }
    this.report("saved");
    return this.revision;
  }
  dispose() {
    this.closed = true;
    clearTimeout(this.timer);
    this.controller.abort();
  }
}
