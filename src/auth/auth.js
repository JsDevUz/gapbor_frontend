import useModal from "hooks/useModal";
import { useEffect, useState } from "react";
import ApiServices from "services/ApiServices";
import { getKey } from "services/storage";
import AuthProvider from "../context/auth/AuthProvider";
import { get } from "lodash";
import Loading from "components/loading";

export const Auth = ({ children }) => {
  let token = getKey("token");

  const [loading, setLoading] = useState({ loading: true });
  const [me, setMe] = useState();

  const getMe = async () => {
    setLoading({ loading: true, small: false });
    const res = await ApiServices.getMe();
    console.log(res, "User data");
    if (res.isOk) {
      setMe(res.data);
      setLoading({ loading: false });
    } else {
      setLoading({ loading: false });
    }
  };
  
  useEffect(() => {
    if (token) {
      getMe();
    } else {
      setLoading({ loading: false });
    }
  }, [token]);
  
  return (
    <AuthProvider
      value={{
        getMe: me,
        setMe: setMe,
      }}
    >
      {get(loading, "loading") ? <Loading /> : children}
    </AuthProvider>
  );
};
