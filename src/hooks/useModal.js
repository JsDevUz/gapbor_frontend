import MainContext from "context/main/MainProvider";
import { useContext } from "react";

const useModal = () => {
  return useContext(MainContext);
};

export default useModal;
