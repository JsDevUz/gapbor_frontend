import classNames from "classnames";
import React from "react";

export const Dialog = ({ dialog }) => {
  return (
    <div className={classNames("dialog", { active: dialog.dialog })}>
      <div className="dialog-box">
        <span>{dialog.text}</span>
        <div className="buttons">
          <button
            onClick={() => {
              dialog.yes();
              dialog.no();
            }}
          >
            Ha
          </button>
          <button onClick={() => dialog.no()}>Yo'q</button>
        </div>
      </div>
    </div>
  );
};
