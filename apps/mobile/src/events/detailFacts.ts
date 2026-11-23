export type DetailFact = "when" | "where" | "host" | "attendees" | "access";

/** Host is included only when the viewer is the owner. The API has no host name for anyone else. */
export function detailFacts(event: { isOwner: boolean }): DetailFact[] {
  const rows: DetailFact[] = ["when", "where"];
  if (event.isOwner) rows.push("host");
  rows.push("attendees", "access");
  return rows;
}
