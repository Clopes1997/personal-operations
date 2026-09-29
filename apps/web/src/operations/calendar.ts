import { dayNumber } from "./domain";
export const formatDate = (iso: string) => iso.replaceAll("-", "/");
export function parseDate(value: string): string {
  if (!/^\d{4}\/\d{2}\/\d{2}$/.test(value)) throw new Error("Use YYYY/MM/DD");
  const iso = value.replaceAll("/", "-");
  dayNumber(iso);
  return iso;
}
