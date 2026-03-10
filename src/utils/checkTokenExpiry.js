import { jwtDecode } from "jwt-decode";

export const checkTokenExpiry = (token) => {
  try {
    if (!token) return true;

    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;

    return decoded.exp < currentTime;
  } catch (error) {
    return true; // treat invalid token as expired
  }
};
