import classNames from "classnames";
import CustomImg from "components/image";
import useGetMe from "hooks/useGetMe";
import useModal from "hooks/useModal";
import { size } from "lodash";
import { useEffect, useState } from "react";
import { AiOutlinePlusCircle, AiOutlineSetting } from "react-icons/ai";
import { HiOutlineLogout, HiOutlineUser, HiOutlineUsers } from "react-icons/hi";
import {
  MdLiveTv,
  MdOutlineLightMode,
  MdOutlineModeNight,
} from "react-icons/md";
import { RxDashboard } from "react-icons/rx";
import { useNavigate, useParams } from "react-router-dom";
import { getKey, removeKey, setKey } from "services/storage";
import { getGroupsNofiy, getNofiy, getUsersNofiy } from "utils";

function NavBar() {
  const [menu, setMenu] = useState("all");
  const { chatId } = useParams();
  const { setAlert, setDialog, setTheme, notifications, theme } = useModal();
  const { getMe, setMe } = useGetMe();
  const navigate = useNavigate();
  useEffect(() => {
    setKey("menu", getKey("menu") == "null" ? "all" : getKey("menu"));
    setMenu(getKey("menu") == "null" ? "all" : getKey("menu"));
  }, []);
  useEffect(() => {
    if (["all", "groups", "users", "settings"].includes(chatId)) {
      setMenu(chatId);
    }
  }, [chatId]);
  const logout = () => {
    setMe();
    removeKey("token");
    navigate(`/`);
  };
  const setMenuFunc = (e, option = true) => {
    if (option) {
      navigate(`/chats/${e}`);
    }
    setKey("menu", e);
    setMenu(e);
  };

  return (
    <div className={classNames("nav-bar-wrapper")}>
      <div className="icons-wrapper">
        <div
          className={classNames("icon", { active: menu == "all" })}
          onClick={() => setMenuFunc("all")}
        >
          <RxDashboard size={22} />
          {size(notifications) > 0 && (
            <span className="notify navbar-notifys">{size(notifications)}</span>
          )}
        </div>
        <div
          className={classNames("icon", { active: menu == "users" })}
          onClick={() => setMenuFunc("users")}
        >
          <HiOutlineUser size={22} />
          {getUsersNofiy(notifications) && (
            <span className="notify navbar-notifys">
              {getUsersNofiy(notifications)}
            </span>
          )}
        </div>
        <div
          className={classNames("icon", { active: menu == "groups" })}
          onClick={() => setMenuFunc("groups")}
        >
          <HiOutlineUsers size={22} />
          {getGroupsNofiy(notifications) && (
            <span className="notify navbar-notifys">
              {getGroupsNofiy(notifications)}
            </span>
          )}
        </div>
        <div
          className={classNames("icon", { active: menu == "lives" })}
          onClick={() => {
            setMenuFunc("lives", false);
            navigate("/lives");
          }}
        >
          <MdLiveTv size={22} />
          {/* {getGroupsNofiy(notifications) && (
            <span className="notify navbar-notifys">
              {getGroupsNofiy(notifications)}
            </span>
          )} */}
        </div>
      </div>
      <div className={classNames("icon")}>
        {theme == "dark" ? (
          <MdOutlineLightMode onClick={() => setTheme("light")} size={22} />
        ) : (
          <MdOutlineModeNight onClick={() => setTheme("dark")} size={22} />
        )}
      </div>
      <div className={"icon"}>
        <AiOutlinePlusCircle
          onClick={() => setDialog({ dialog: true, action: "add" })}
          size={22}
        />
      </div>

      <div className={classNames("icon")}>
        <HiOutlineLogout
          onClick={() =>
            setAlert({
              id: 2,
              alert: true,
              status: "warring",
              type: "choosable",
              txt: "Dasturdan chiqmoqchimisiz?",
              agree: () => logout(),
            })
          }
          size={22}
        />
      </div>
      <div className={classNames("icon", { active: menu == "settings" })}>
        <AiOutlineSetting
          onClick={() => {
            setMenuFunc("settings", false);
            navigate("/settings");
          }}
          size={22}
        />
      </div>
      <div className="user-logo">
        <div className="getMe">
          <span>Ism: {getMe.fullName}</span>
          <span>Email: {getMe.email}</span>
        </div>
        <CustomImg image={getMe.pic} />
      </div>
    </div>
  );
}

export default NavBar;
