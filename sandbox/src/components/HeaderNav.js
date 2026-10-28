export function HeaderNav(session) {
  if (session.state !== "active") {
    return "guest-nav";
  }
  return "user-nav";
}
