import CustomAlert from "components/alert";
import Toast from "components/alert/toast";
import Loading from "components/loading";
import React, { useEffect } from "react";
import { socket } from "services/socket";

function MainLayout({ children }) {
  useEffect(() => {
    socket.connect();
  }, []);
  return (
    <>
      <CustomAlert />
      <Toast />
      <Loading />
      {children}
    </>
  );
}

export default MainLayout;
