import AuthContext from "context/auth/AuthContext";
import { useContext } from "react";

const useGetMe = () => {
  return useContext(AuthContext);
};

export default useGetMe;
