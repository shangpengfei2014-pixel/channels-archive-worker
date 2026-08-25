import { randomBytes } from "node:crypto";

const tickets = new Map();
const MAX_TICKETS = 5000;

function pruneTickets(now = Date.now()) {
  for (const [ticket, value] of tickets) {
    if (value.expiresAt < now) tickets.delete(ticket);
  }
  while (tickets.size > MAX_TICKETS) {
    tickets.delete(tickets.keys().next().value);
  }
}

export function createDownloadTicket({
  videoUrl,
  author = "",
  title = "",
  expiresAt = Date.now() + 10 * 60 * 1000,
}) {
  pruneTickets();
  const ticket = randomBytes(12).toString("base64url");
  tickets.set(ticket, { videoUrl, author, title, expiresAt });
  return `/d/${ticket}`;
}

export function resolveDownloadTicket(ticket, now = Date.now()) {
  pruneTickets(now);
  const value = tickets.get(ticket);
  if (!value || value.expiresAt < now) throw new Error("下载链接已过期");
  return value;
}

