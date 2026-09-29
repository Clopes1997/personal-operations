import { useState } from "react";
export function MonthInput({ name, defaultValue, required }: { name: string; defaultValue: string; required?: boolean }) {
  const [value, setValue] = useState(defaultValue.replace("-", "/"));
  return <><input type="text" required={required} inputMode="numeric" placeholder="YYYY/MM" pattern="(19[0-9]{2}|20[0-9]{2}|2100)/(0[1-9]|1[0-2])" value={value} onChange={e => setValue(e.target.value)} /><input type="hidden" name={name} value={value.replace("/", "-")} /></>;
}
