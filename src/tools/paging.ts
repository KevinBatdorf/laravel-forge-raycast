export const PER_PAGE = 30;

type Options = {
  kind: "sites" | "servers";
  offset?: number;
  limit?: number;
  complete: boolean;
};

export const paged = <T>(rows: T[], { kind, offset, limit, complete }: Options) => {
  const from = Math.max(0, Math.trunc(offset ?? 0));
  const size = Math.max(1, Math.trunc(limit ?? PER_PAGE));
  const shown = rows.slice(from, from + size);
  const end = from + shown.length;

  const notes = [
    `Showing ${kind} ${shown.length ? from + 1 : 0} to ${end} of ${complete ? "" : "at least "}${rows.length}.`,
  ];
  if (end < rows.length) notes.push(`Pass offset: ${end} for the next page.`);
  if (!complete) notes.push("Forge pages at 30 and reports no total, so more exist than are counted here.");

  return { rows: shown, note: notes.join(" "), perPage: size, offset: from, total: rows.length };
};
