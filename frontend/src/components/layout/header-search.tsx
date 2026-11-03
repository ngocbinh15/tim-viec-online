"use client";

import { ArrowUpRight, BriefcaseBusiness, MapPin, Search } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Form from "next/form";
import Link from "next/link";
import { SearchableSelectionField } from "@/components/forms/selection-field";
import {
  jobQueryString,
  normalizeSearch,
  parseJobQuery,
} from "@/features/jobs/query";
import type { HomeJobCard } from "@/features/home/types";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/modules/cores/shadcn/components/ui/popover";

type Mode = "idle" | "keyword" | "location";
type SearchJob = Pick<HomeJobCard, "id" | "title" | "company" | "salary">;
const popularKeywords = [
  "ReactJS",
  "Laravel",
  "Java",
  "Marketing",
  "Kế toán",
  "Tester",
];

export function HeaderSearch({
  cities,
  jobs,
}: {
  cities: string[];
  jobs: SearchJob[];
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const route = `${pathname}?${params}`;
  const [interaction, setInteraction] = useState({
    route,
    mode: "idle" as Mode,
    keyword: params.get("keyword") ?? "",
    city: params.get("city") ?? "",
  });
  // Next preserves route components; a new URL must reset the editing session.
  if (interaction.route !== route) {
    setInteraction({
      route,
      mode: "idle",
      keyword: params.get("keyword") ?? "",
      city: params.get("city") ?? "",
    });
  }
  const { mode, keyword, city } = interaction;
  const active = mode !== "idle";
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<number | null>(null);
  const restoreKeywordFocus = useRef(false);
  const suppressOpen = useRef(false);
  const locations = city && !cities.includes(city) ? [city, ...cities] : cities;
  const query = parseJobQuery({
    ...Object.fromEntries(params),
    category_ids: params.getAll("category_ids"),
  });
  const suggestions = jobs
    .filter((job) =>
      normalizeSearch(`${job.title} ${job.company}`).includes(
        normalizeSearch(keyword),
      ),
    )
    .slice(0, 4);
  const setMode = (next: Mode) => {
    if (next !== "idle" && mode === "idle") {
      const header = form.current?.closest<HTMLElement>(".site-header");
      const actions = header?.querySelector<HTMLElement>(".header-actions");
      // Start the collapse from its actual size, avoiding the dead portion of
      // a transition from an arbitrary max-width larger than the contents.
      if (header && actions && actions.getBoundingClientRect().width > 0)
        header.style.setProperty(
          "--header-actions-width",
          `${actions.getBoundingClientRect().width}px`,
        );
    }
    setInteraction((current) => ({ ...current, mode: next }));
  };
  const close = () => setMode("idle");

  function focusSuggestion(last: boolean) {
    const focus = () => {
      pendingFocus.current = null;
      const items = panel.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not(:disabled)",
      );
      if (items?.length)
        items[last ? items.length - 1 : 0].focus({ preventScroll: true });
    };
    if (mode === "keyword") focus();
    else {
      setMode("keyword");
      pendingFocus.current = requestAnimationFrame(focus);
    }
  }

  useLayoutEffect(
    () => () => {
      if (pendingFocus.current !== null)
        cancelAnimationFrame(pendingFocus.current);
      // Activity hides cached pages without unmounting their state.
      setInteraction((current) => ({ ...current, mode: "idle" }));
    },
    [],
  );

  useEffect(() => {
    if (!active) return;
    const onFocus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (
        !form.current?.contains(target) &&
        target.closest<HTMLElement>("[data-search-owner]")?.dataset
          .searchOwner !== id
      ) {
        setInteraction((current) => ({ ...current, mode: "idle" }));
      }
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, [active, id]);

  return (
    <>
      <Popover
        open={mode === "keyword"}
        onOpenChange={(open) => {
          if (!open && mode === "keyword") close();
        }}
      >
        <PopoverAnchor asChild>
          <Form
            ref={form}
            action="/jobs"
            className="header-search"
            data-mode={mode}
            role="search"
            aria-label="Tìm việc nhanh"
            onSubmit={close}
            onKeyDown={(event) => {
              if (event.key === "Escape" && mode === "keyword") {
                event.preventDefault();
                close();
              }
            }}
          >
            <label className="sr-only" htmlFor={`${id}-keyword`}>
              Việc làm, công ty hoặc kỹ năng
            </label>
            <input
              ref={input}
              id={`${id}-keyword`}
              type="text"
              name="keyword"
              value={keyword}
              maxLength={200}
              role="combobox"
              aria-haspopup="dialog"
              placeholder="Tìm kiếm việc làm, công ty, kỹ năng..."
              autoComplete="off"
              aria-expanded={mode === "keyword"}
              aria-controls={
                mode === "keyword" ? `${id}-suggestions` : undefined
              }
              onFocus={() => {
                if (!suppressOpen.current) setMode("keyword");
              }}
              onClick={() => setMode("keyword")}
              onKeyDown={(event) => {
                if (
                  !event.nativeEvent.isComposing &&
                  (event.key === "ArrowDown" || event.key === "ArrowUp")
                ) {
                  event.preventDefault();
                  focusSuggestion(event.key === "ArrowUp");
                }
              }}
              onChange={(event) =>
                setInteraction((current) => ({
                  ...current,
                  keyword: event.target.value,
                  mode: "keyword",
                }))
              }
            />
            <span className="header-search-divider" aria-hidden="true" />
            <div className="header-location">
              <MapPin size={13} aria-hidden="true" />
              <SearchableSelectionField
                searchLabel="Tìm tỉnh/thành phố"
                className="header-city-selection"
                label="Địa điểm tìm nhanh"
                placeholder="Tất cả địa điểm"
                name="city"
                options={locations.map((location) => ({
                  value: location,
                  label: location,
                }))}
                value={city}
                onValueChange={(value) =>
                  setInteraction((current) => ({ ...current, city: value }))
                }
                open={mode === "location"}
                onOpenChange={(open) => setMode(open ? "location" : "idle")}
                popupClassName="header-location-popup"
                popupOwner={id}
                popupTitle="Địa điểm"
              />
            </div>
            {pathname === "/jobs" &&
              ["category_ids", "job_type", "salary", "level", "sort"].flatMap(
                (name) =>
                  params
                    .getAll(name)
                    .map((value, index) => (
                      <input
                        type="hidden"
                        name={name}
                        value={value}
                        key={`${name}-${index}`}
                      />
                    )),
              )}
            <button type="submit" aria-label="Tìm việc nhanh">
              <Search size={15} aria-hidden="true" />
              <span>Tìm kiếm</span>
            </button>
          </Form>
        </PopoverAnchor>
        <PopoverContent
          ref={panel}
          id={`${id}-suggestions`}
          data-search-owner={id}
          className="header-keyword-panel"
          aria-label="Gợi ý tìm việc"
          side="bottom"
          align="start"
          sideOffset={12}
          collisionPadding={12}
          sticky="always"
          updatePositionStrategy="always"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onEscapeKeyDown={() => {
            restoreKeywordFocus.current = true;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const restore = restoreKeywordFocus.current;
            restoreKeywordFocus.current = false;
            if (
              restore &&
              form.current?.dataset.mode === "idle" &&
              input.current?.offsetParent !== null
            ) {
              suppressOpen.current = true;
              input.current?.focus({ preventScroll: true });
              suppressOpen.current = false;
            }
          }}
          onInteractOutside={(event) => {
            if (
              event.target instanceof Node &&
              form.current?.contains(event.target)
            )
              event.preventDefault();
          }}
        >
          <section aria-label="Từ khóa phổ biến">
            <h2>Từ khóa phổ biến</h2>
            <div className="header-popular-keywords">
              {popularKeywords.map((word) => (
                <Link
                  key={word}
                  href={`/jobs?${jobQueryString({ ...query, city, keyword: word, page: 1 })}`}
                  onClick={close}
                >
                  {word}
                  <ArrowUpRight size={13} aria-hidden="true" />
                </Link>
              ))}
            </div>
            {keyword.trim() && (
              <button
                className="header-search-all"
                type="button"
                onClick={() => form.current?.requestSubmit()}
              >
                <Search size={16} aria-hidden="true" />
                Tìm “{keyword.trim()}”
              </button>
            )}
          </section>
          <section aria-label="Việc làm đang tuyển">
            <h2>Việc làm đang tuyển</h2>
            <div className="header-job-suggestions">
              {suggestions.map((job) => (
                <Link key={job.id} href={`/jobs/${job.id}`} onClick={close}>
                  <BriefcaseBusiness size={18} aria-hidden="true" />
                  <span>
                    <strong>{job.title}</strong>
                    <small>{job.company}</small>
                  </span>
                  <em>{job.salary}</em>
                </Link>
              ))}
            </div>
            {suggestions.length === 0 && (
              <button
                className="header-search-all"
                type="button"
                onClick={() => form.current?.requestSubmit()}
              >
                Xem kết quả cho “{keyword.trim()}”
                <ArrowUpRight size={14} aria-hidden="true" />
              </button>
            )}
          </section>
        </PopoverContent>
      </Popover>
      <div
        className="header-search-backdrop"
        data-active={active}
        aria-hidden="true"
        onPointerDown={(event) => {
          event.preventDefault();
          close();
        }}
      />
    </>
  );
}
