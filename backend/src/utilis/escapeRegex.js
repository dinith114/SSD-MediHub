// Escape every regular-expression metacharacter so a user's search term is
// matched literally, not interpreted as a regex. Without this, characters like
// | . * ( ) turn search input into query commands (V-08 injection).
export const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
