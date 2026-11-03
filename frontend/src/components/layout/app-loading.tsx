import { Brand } from "./brand";
import { Skeleton } from "@/modules/cores/shadcn/components/ui/skeleton";

/** Static shell: renders immediately while the authenticated workspace streams. */
export function AppLoading() {
  return (
    <div className="app-loading">
      <header className="app-loading__header">
        <div className="site-container">
          <Brand label={null} />
        </div>
      </header>
      <main id="main" className="app-loading__main">
        <div className="app-loading__content">
          <div className="app-loading__preview" aria-hidden="true">
            {[0, 1, 2].map((row) => (
              <div className="app-loading__row" key={row}>
                <Skeleton className="app-loading__avatar" />
                <div className="app-loading__lines">
                  <Skeleton className="app-loading__line" />
                  <Skeleton className="app-loading__line app-loading__line--short" />
                </div>
              </div>
            ))}
          </div>
          <h1>Đang tải trang</h1>
          <p role="status" aria-live="polite">
            Vui lòng chờ trong giây lát.
          </p>
          <div className="app-loading__track" aria-hidden="true">
            <span />
          </div>
        </div>
      </main>
    </div>
  );
}
