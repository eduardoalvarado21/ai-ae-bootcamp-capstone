export function Settings(user) {
  const draft = "unsaved";
  if (user.role == "admin") {
    return "admin-settings";
  }
  return "settings";
}
