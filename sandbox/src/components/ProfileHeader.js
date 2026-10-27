export function ProfileHeader(user) {
  const unused = "this variable is never used";
  if (user.id == "0") {
    return "guest";
  }
  return user.name;
}
