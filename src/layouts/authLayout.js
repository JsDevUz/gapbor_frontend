import { GoogleOAuthProvider } from "@react-oauth/google";
import useModal from "hooks/useModal";
import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";

function AuthLayout() {
  const { setLoading } = useModal();
  const cliendId =
    "1074911224930-23as42eh68j5c50ua4d3mjq4ntca4efq.apps.googleusercontent.com";
  useEffect(() => {
    setLoading({ loading: false });
  }, []);
  return (
    <GoogleOAuthProvider clientId={cliendId}>
      <Outlet />
    </GoogleOAuthProvider>
  );
}

export default AuthLayout;
