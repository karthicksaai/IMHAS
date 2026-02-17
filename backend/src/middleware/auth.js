export function authenticate(req, res, next) {
  // TODO: Implement JWT authentication
  next();
}

export function authorize(roles = []) {
  return (req, res, next) => {
    // TODO: Implement role-based access control
    next();
  };
}
