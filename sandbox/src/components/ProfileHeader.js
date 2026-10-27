export function ProfileHeader(user) {
  if (user.id === "0") {
    return "guest";
  }
  return user.name;
}
