import { CAMPUS_LIST, ZONES } from "@/lib/constants";

// <option>s for every place, grouped by campus. Use inside <Select>.
export function ZoneOptions({ includeOff = false }: { includeOff?: boolean }) {
  return (
    <>
      {CAMPUS_LIST.map((c) => (
        <optgroup key={c.id} label={c.name}>
          {ZONES.filter((z) => z.campus === c.id).map((z) => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </optgroup>
      ))}
      {includeOff && <option value="off">Off campus</option>}
    </>
  );
}
