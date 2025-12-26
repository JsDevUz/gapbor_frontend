import { useContext } from "react";
import AuthContext from "../context/auth/AuthContext";
import { get } from "lodash";

export const IsGuest = ({ children }) => {
  const { getMe } = useContext(AuthContext);
  return get(getMe, "fullName", false) ? null : children;
};
