"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function useChatScroll(
  id: number | undefined,
  lastMessage: string | undefined,
  requested: string | null,
  firstMessage?: string,
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const positions = useRef<Record<number, { top: number; pinned: boolean }>>(
    {},
  );
  const [pinned, setPinned] = useState<Record<number, boolean>>({});
  const prepend = useRef<{ height: number; top: number } | null>(null);
  const preserveScroll = () => {
    const node = scrollRef.current;
    if (node)
      prepend.current = { height: node.scrollHeight, top: node.scrollTop };
  };
  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node || !prepend.current || id === undefined) return;
    node.scrollTop =
      prepend.current.top + node.scrollHeight - prepend.current.height;
    positions.current[id] = { top: node.scrollTop, pinned: false };
    prepend.current = null;
  }, [firstMessage, id]);
  const onScroll = () => {
    const node = scrollRef.current;
    if (!node || id === undefined || !node.clientHeight) return;
    const nearBottom =
      node.scrollHeight - node.scrollTop - node.clientHeight < 64;
    positions.current[id] = { top: node.scrollTop, pinned: nearBottom };
    setPinned((current) =>
      current[id] === nearBottom ? current : { ...current, [id]: nearBottom },
    );
  };
  const scrollBottom = () => {
    if (id !== undefined) {
      setPinned((current) => ({ ...current, [id]: true }));
      positions.current[id] = { top: 0, pinned: true };
    }
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  };
  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node || id === undefined || !node.clientHeight) return;
    const position = positions.current[id];
    node.scrollTop =
      !position || position.pinned ? node.scrollHeight : position.top;
  }, [id, lastMessage, requested]);
  useEffect(() => {
    const node = scrollRef.current;
    if (!node || id === undefined) return;
    const observer = new ResizeObserver(() => {
      if (node.clientHeight && (positions.current[id]?.pinned ?? true))
        node.scrollTop = node.scrollHeight;
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [id, requested]);
  return {
    scrollRef,
    onScroll,
    scrollBottom,
    preserveScroll,
    atBottom: id === undefined || (pinned[id] ?? true),
  };
}
