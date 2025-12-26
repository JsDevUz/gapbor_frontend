import classNames from "classnames";
import useModal from "hooks/useModal";
import { get } from "lodash";
import React from "react";
import { HiOutlineTrash } from "react-icons/hi";
import { getContextMenuStyle } from "utils";

function ContextMenu() {
  const {
    onlineUsers,
    setAlert,
    selectChat,
    setContextMenu,
    contextMenu,
    notifications,
  } = useModal();
  if (!contextMenu) return null;
  return (
    <>
      <style jsx="true" global="true">{`
        body {
            .one-chat-messages-wrapper{
          overflow: hidden !important}};
        }
      `}</style>
      <div
        className="contextMenuContainer"
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          setContextMenu(false);
        }}
      >
        <div
          className="bubble-reactions open"
          style={getContextMenuStyle(
            contextMenu,
            contextMenu.own,
            get(contextMenu, "isChat", false)
          )}
        >
          {contextMenu.child}
        </div>
      </div>
    </>
  );
}

export default ContextMenu;
