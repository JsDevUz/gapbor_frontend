import classNames from "classnames";
import useModal from "hooks/useModal";
import { get } from "lodash";
import { useEffect } from "react";

let timeout;
const Toast = () => {
  const { setToast, toast } = useModal();
  useEffect(() => {
    if (get(toast, "toast")) {
      timeout = setTimeout(() => {
        setToast({ toast: false });
        clearTimeout(timeout);
      }, 2000);
    }
    return () => clearTimeout(timeout);
  }, [toast]);
  if (!get(toast, "toast")) return null;

  return (
    <div
      className={classNames("toast-container", { open: get(toast, "toast") })}
    >
      <div className="toast">{get(toast, "text")}</div>
    </div>
  );
};

export default Toast;
