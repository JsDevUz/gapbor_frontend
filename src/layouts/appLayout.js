import classNames from "classnames";
import ContextMenu from "components/contextMenu";
import CustomDialog from "components/dialog/customDialog";
import useModal from "hooks/useModal";
import { get } from "lodash";
import { CreateGroupDialog } from "modules/chat/components/createGroupDialog";
import { EditGroupDialog } from "modules/chat/components/editGroupDialog";
import NavBar from "modules/chat/components/navBar";
import { useEffect } from "react";
import { Outlet, useParams } from "react-router-dom";
import { socket } from "services/socket";
import { getKey } from "services/storage";

function AppLayout() {
  const { theme, setTheme } = useModal();
  const { setDialog, dialog, selectChat } = useModal();
  const { menu } = useParams();
  useEffect(() => {
    let check =
      getKey("theme") == "null" || typeof getKey("theme") !== "string"
        ? "dark"
        : getKey("theme");
    setTheme(check);

    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
  }, []);

  const handletouchMain = (event) => {
    if (event.detail > 1) {
      event.preventDefault();
    }
  };

  return (
    <div
      onMouseDown={(e) => handletouchMain(e)}
      id="mainBox"
      className={classNames("main", {
        light: theme === "light",
        selected: get(selectChat, "chat", false) || menu,
        noSelected: !get(selectChat, "chat", false) && !menu,
      })}
    >
      <NavBar />

      <Outlet />
      <ContextMenu />
      <CustomDialog
        close={() =>
          get(dialog, "canClose", false) && setDialog({ dialog: false })
        }
        isOpen={get(dialog, "dialog")}
      >
        {get(dialog, "action") === "edit" ? (
          <EditGroupDialog
            chat={get(dialog, "chat")}
            action={get(dialog, "action")}
          />
        ) : (
          <CreateGroupDialog chat={get(dialog, "chat")} />
        )}
      </CustomDialog>
    </div>
  );
}

export default AppLayout;
