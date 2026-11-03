"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { CalendarDays } from "lucide-react";
import { vi } from "react-day-picker/locale";
import type { DropdownProps } from "react-day-picker";
import { Calendar } from "@/modules/cores/shadcn/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/modules/cores/shadcn/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/cores/shadcn/components/ui/select";

function parseDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isFinite(+date) ? date : undefined;
}

function DateDropdown({
  options,
  value,
  onChange,
  disabled,
  "aria-label": label,
}: DropdownProps) {
  return (
    <div className="selection-field ep-calendar-select">
      <Select
        value={String(value)}
        disabled={disabled}
        onValueChange={(next) =>
          onChange?.({
            target: { value: next },
          } as ChangeEvent<HTMLSelectElement>)
        }
      >
        <SelectTrigger className="selection-trigger" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          className="selection-menu"
          position="popper"
          sideOffset={6}
        >
          {options?.map((option) => (
            <SelectItem
              className="selection-option"
              key={option.value}
              value={String(option.value)}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function DeadlineField({
  value,
  today,
  onChange,
  error,
}: {
  value: string;
  today: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const popupId = useId();
  const content = useRef<HTMLDivElement>(null);
  const selected = parseDay(value);
  const current = parseDay(today)!;
  const first = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate() + 1,
  );
  return (
    <div className="ep-field" data-invalid={!!error}>
      <span id={`${popupId}-label`}>
        Hạn chót nộp hồ sơ <span className="ep-required" aria-hidden="true" />
      </span>
      <input name="deadline" type="hidden" value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="ep-date-trigger"
            role="combobox"
            aria-expanded={open}
            aria-controls={popupId}
            aria-haspopup="dialog"
            aria-labelledby={`${popupId}-label`}
            aria-invalid={!!error}
            aria-required="true"
            aria-describedby={`${popupId}-help`}
          >
            <span>
              {selected
                ? new Intl.DateTimeFormat("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  }).format(selected)
                : "Chọn ngày / tháng / năm"}
            </span>
            <CalendarDays size={18} aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          id={popupId}
          ref={content}
          className="ep-deadline-calendar"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          aria-label="Lịch chọn hạn nộp hồ sơ"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                const popup = content.current;
                if (
                  popup?.dataset.state !== "open" ||
                  popup.contains(document.activeElement)
                )
                  return;
                const day =
                  popup.querySelector<HTMLButtonElement>(
                    'button[data-selected-single="true"]:not(:disabled)',
                  ) ??
                  popup.querySelector<HTMLButtonElement>(
                    "button[data-day]:not(:disabled)",
                  );
                day?.focus({ preventScroll: true });
              }),
            );
          }}
        >
          <p>Hạn chót nhận hồ sơ</p>
          <Calendar
            mode="single"
            locale={vi}
            weekStartsOn={1}
            today={current}
            selected={selected}
            defaultMonth={selected && selected > current ? selected : first}
            startMonth={current}
            endMonth={new Date(current.getFullYear() + 10, 11, 31)}
            disabled={{ before: first }}
            captionLayout="dropdown"
            navLayout="after"
            showOutsideDays={false}
            components={{ Dropdown: DateDropdown }}
            labels={{
              labelMonthDropdown: () => "Chọn tháng",
              labelYearDropdown: () => "Chọn năm",
              labelPrevious: () => "Tháng trước",
              labelNext: () => "Tháng sau",
            }}
            formatters={{
              formatMonthDropdown: (date) => `Tháng ${date.getMonth() + 1}`,
            }}
            onSelect={(date) => {
              if (!date) return;
              onChange(
                `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
              );
              setOpen(false);
            }}
          />
          <small>Chỉ chọn ngày sau hôm nay.</small>
        </PopoverContent>
      </Popover>
      <small
        id={`${popupId}-help`}
        data-slot="deadline-help"
        className={error ? "ep-field-error" : ""}
        role={error ? "alert" : undefined}
      >
        {error ?? "Hạn nộp hồ sơ phải sau ngày hôm nay."}
      </small>
    </div>
  );
}
