import type { KeyboardEvent } from "react";

export function handleMessageComposerKeyDown(
  event: KeyboardEvent<HTMLTextAreaElement>,
  updateDraft: (value: string) => void,
) {
  if (
    event.key !== "Enter" ||
    event.nativeEvent.isComposing ||
    event.nativeEvent.keyCode === 229
  )
    return;

  const textarea = event.currentTarget;
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault();
    const {
      selectionStart: start,
      selectionEnd: end,
      value,
      maxLength,
    } = textarea;
    if (maxLength >= 0 && value.length - (end - start) + 1 > maxLength) return;
    textarea.setRangeText("\n", start, end, "end");
    updateDraft(textarea.value);
  } else if (!event.shiftKey && !event.altKey) {
    event.preventDefault();
    if (!event.repeat) textarea.form?.requestSubmit();
  }
}
