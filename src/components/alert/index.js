import useModal from "hooks/useModal";
import { get } from "lodash";
import CustomDialog from "../dialog/customDialog";

const CustomAlert = () => {
  const { setAlert, alert } = useModal();
  if (!get(alert, "alert")) return null;
  const onClose = () => setAlert({ alert: false });
  const agree = () => {
    alert?.agree();
    setAlert({ alert: false });
  };
  return (
    <div className="custom-alert-container">
      <CustomDialog
        isOpen={get(alert, "alert")}
        close={() => get(alert, "canClose", true) && onClose()}
      >
        <div className="alert pd-20">
          <span
            className="nowrap fs-17 fw-500 mg-y-20 text-center"
            color="#fff"
          >
            {get(alert, "txt")}
          </span>
          {get(alert, "type") === "choosable" ? (
            <div className="container btn">
              <button className="btn light mg-r-10" onClick={onClose}>
                Yo'q
              </button>
              <button onClick={agree} className={"btn light mg-l-10px"}>
                Ha
              </button>
            </div>
          ) : (
            <div className="container">
              <button
                className="btn success"
                onClick={() => {
                  onClose();
                  get(alert, "onClose") && get(alert, "onClose")();
                }}
              >
                Yaxshi
              </button>
            </div>
          )}
        </div>
      </CustomDialog>
    </div>
  );
};

export default CustomAlert;
