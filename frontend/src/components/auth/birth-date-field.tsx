"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type FocusEventHandler,
} from "react";
import { CalendarDays } from "lucide-react";
import { vi } from "react-day-picker/locale";
import type { DropdownProps } from "react-day-picker";
import {
  displayBirthDate,
  parseBirthDate,
  readBirthDate,
  serializeBirthDate,
} from "@/features/auth/birth-date";
import { latestRegistrationDob } from "@/features/auth/validation";
import { Calendar } from "@/modules/cores/shadcn/components/ui/calendar";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/modules/cores/shadcn/components/ui/field";
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

function CalendarDropdown({
  options,
  value,
  onChange,
  disabled,
  "aria-label": label,
}: DropdownProps) {
  return (
    <div className="selection-field birth-calendar-select">
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
          className="selection-menu birth-calendar-menu"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
        >
          {options?.map((option) => (
            <SelectItem
              key={option.value}
              className="selection-option"
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

export function BirthDateField({
  id,
  value,
  today,
  disabled,
  error,
  onChange,
  onBlur,
}: {
  id: string;
  value: string;
  today: string;
  disabled: boolean;
  error?: string;
  onChange: (value: string) => void;
  onBlur: FocusEventHandler<HTMLInputElement>;
}) {
  const [open, setOpen] = useState(false);
  const calendarContent = useRef<HTMLDivElement>(null);
  const selected = parseBirthDate(value);
  const lastDate = parseBirthDate(latestRegistrationDob(today));
  const firstYear = Math.min(1900, selected?.getFullYear() ?? 1900);
  return (
    <Field className="auth-field" data-invalid={!!error}>
      <FieldLabel htmlFor={id}>Ngày sinh</FieldLabel>
      <div className="auth-input-wrap auth-birth-date">
        <input type="hidden" name="dob" value={value} disabled={disabled} />
        <Input
          id={id}
          data-auth-field="dob"
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          placeholder="DD/MM/YYYY"
          value={displayBirthDate(value)}
          onChange={(event) => onChange(readBirthDate(event.target.value))}
          onBlur={onBlur}
          disabled={disabled}
          required
          maxLength={10}
          aria-invalid={!!error}
          aria-describedby={`${id}-description${error ? ` ${id}-error` : ""}`}
          className="h-12 pr-12"
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="auth-date-toggle"
              disabled={disabled || !lastDate}
              aria-label="Chọn ngày sinh"
            >
              <CalendarDays aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            ref={calendarContent}
            className="birth-calendar"
            align="end"
            sideOffset={8}
            collisionPadding={12}
            sticky="always"
            updatePositionStrategy="always"
            aria-label="Lịch chọn ngày sinh"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              const content = calendarContent.current;
              // Focus only after the portal has its collision-adjusted position.
              requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                  if (
                    !content?.isConnected ||
                    content.dataset.state !== "open" ||
                    content.contains(document.activeElement) ||
                    content.querySelector(
                      '[role="combobox"][data-state="open"]',
                    )
                  )
                    return;
                  const day =
                    content.querySelector<HTMLButtonElement>(
                      'button[data-selected-single="true"]:not(:disabled)',
                    ) ??
                    content.querySelector<HTMLButtonElement>(
                      "button[data-day]:not(:disabled)",
                    );
                  day?.focus({ preventScroll: true });
                }),
              );
            }}
          >
            <p className="birth-calendar-title">Chọn ngày sinh</p>
            <Calendar
              mode="single"
              locale={vi}
              weekStartsOn={1}
              today={parseBirthDate(today)}
              selected={selected}
              defaultMonth={
                selected && lastDate && selected <= lastDate
                  ? selected
                  : lastDate
              }
              startMonth={parseBirthDate(
                `${String(firstYear).padStart(4, "0")}-01-01`,
              )}
              endMonth={lastDate}
              disabled={lastDate ? { after: lastDate } : true}
              captionLayout="dropdown"
              navLayout="after"
              reverseYears
              showOutsideDays={false}
              components={{ Dropdown: CalendarDropdown }}
              labels={{
                labelMonthDropdown: () => "Chọn tháng sinh",
                labelYearDropdown: () => "Chọn năm sinh",
                labelPrevious: () => "Tháng trước",
                labelNext: () => "Tháng sau",
              }}
              formatters={{
                formatMonthDropdown: (date) => `Tháng ${date.getMonth() + 1}`,
              }}
              onSelect={(date) => {
                if (!date) return;
                onChange(serializeBirthDate(date));
                setOpen(false);
              }}
            />
            <div className="birth-calendar-footer">
              <span>Định dạng ngày / tháng / năm</span>
              <button
                type="button"
                disabled={!value}
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Xóa ngày
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <FieldDescription id={`${id}-description`}>
        Bạn cần từ 15 tuổi trở lên.
      </FieldDescription>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}
