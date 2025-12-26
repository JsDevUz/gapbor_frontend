import { useContext } from "react";
import AuthContext from "../context/auth/AuthContext";
export const IsAuth = ({ children }) => {
  const { getMe } = useContext(AuthContext);
  return getMe ? children : null;
};
