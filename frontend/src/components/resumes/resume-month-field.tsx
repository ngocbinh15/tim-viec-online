"use client";

import { useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
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

export function ResumeMonthField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string | null;
  disabled?: boolean;
  onChange: (value: string | null) => void;
}) {
  const id = useId();
  const content = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const selectedYear = value ? Number(value.slice(0, 4)) : currentYear;
  const [year, setYear] = useState(selectedYear);
  const firstYear = Math.min(1900, selectedYear);
  const lastYear = Math.max(currentYear + 10, selectedYear);
  function choose(month: number) {
    onChange(
      `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`,
    );
    setOpen(false);
  }
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setYear(selectedYear);
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="resume-month-trigger"
          disabled={disabled}
          aria-label={label}
          aria-describedby={`${id}-value`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={id}
        >
          <span id={`${id}-value`} data-empty={!value}>
            {value
              ? `${value.slice(5)}/${value.slice(0, 4)}`
              : "Chọn tháng / năm"}
          </span>
          <CalendarDays size={17} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        id={id}
        ref={content}
        className="resume-month-popover"
        align="start"
        sideOffset={8}
        collisionPadding={12}
        aria-label={`Chọn ${label.toLocaleLowerCase("vi")}`}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          requestAnimationFrame(() => {
            const popup = content.current;
            if (popup?.dataset.state !== "open") return;
            (
              popup.querySelector<HTMLButtonElement>(
                '[data-month][aria-pressed="true"]',
              ) ?? popup.querySelector<HTMLButtonElement>("[data-month]")
            )?.focus({ preventScroll: true });
          });
        }}
      >
        <div className="resume-month-year">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={year <= firstYear}
            aria-label="Năm trước"
            onClick={() => setYear(year - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Select
            value={String(year)}
            onValueChange={(next) => setYear(Number(next))}
          >
            <SelectTrigger aria-label="Chọn năm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              position="popper"
              className="resume-month-year-menu"
              sideOffset={6}
            >
              {Array.from(
                { length: lastYear - firstYear + 1 },
                (_, index) => lastYear - index,
              ).map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={year >= lastYear}
            aria-label="Năm sau"
            onClick={() => setYear(year + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
        <div className="resume-month-grid">
          {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
            <button
              key={month}
              type="button"
              data-month={month}
              aria-label={`Tháng ${month} năm ${year}`}
              aria-pressed={
                value ===
                `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`
              }
              onClick={() => choose(month)}
            >
              Tháng {month}
            </button>
          ))}
        </div>
        <div className="resume-month-footer">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!value}
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            Xóa tháng
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const now = new Date();
              onChange(
                `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
              );
              setOpen(false);
            }}
          >
            Tháng này
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
