"use client";

import { useSyncExternalStore } from "react";

import { formatDateTime, formatSettlementDate } from "@/lib/dates";

const emptySubscribe = () => () => {};

type LocalDateTimeProps = {
  value: Date | string;
  variant?: "datetime" | "date";
};

function formatLocalDateTime(value: Date | string) {
  return formatDateTime(value);
}

function formatLocalDate(value: Date | string) {
  return formatSettlementDate(value);
}

export function LocalDateTime({ value, variant = "datetime" }: LocalDateTimeProps) {
  const iso = new Date(value).toISOString();
  const format = variant === "date" ? formatLocalDate : formatLocalDateTime;

  const formatted = useSyncExternalStore(
    emptySubscribe,
    () => format(value),
    () => format(value),
  );

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {formatted}
    </time>
  );
}
