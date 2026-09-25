import type { ReactNode } from "react";
import type { Snapshot } from "./domain";
export type Update = (
  transform: (state: Snapshot) => Snapshot,
) => Promise<void>;
export type Props = {
  state: Snapshot;
  update: Update;
  safely: (action: () => Promise<void> | void) => void;
};
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="ops-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export const text = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();
export const uid = () => crypto.randomUUID();
export function download(name: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
