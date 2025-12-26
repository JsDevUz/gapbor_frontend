import classNames from "classnames";

const CustomDialog = ({ children, close = () => {}, isOpen = false }) => {
  return (
    <>
      <style jsx="true" global="true">{`
        body {
          overflow: ${isOpen ? "hidden" : "scroll"};
        }
      `}</style>
      <div
        onClick={() => close()}
        className={classNames("custom-dialog-container", { open: isOpen })}
      >
        <div className={"dialog"}>{isOpen ? children : null}</div>
      </div>
    </>
  );
};

export default CustomDialog;
