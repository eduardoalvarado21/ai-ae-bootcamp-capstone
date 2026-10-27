export function HeaderNav(session) {
  const theme = "dark";
  if (session.state != "active") {
    return "guest-nav";
  }
  return "user-nav";
}
