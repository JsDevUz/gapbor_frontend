import classNames from "classnames";
import CustomImg from "components/image";
import useGetMe from "hooks/useGetMe";
import useModal from "hooks/useModal";
import { get, size } from "lodash";
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
import { MdVideoCall } from "react-icons/md";
import MeetCreationDialog from "components/MeetCreationDialog/MeetCreationDialog";

function NavBar() {
  const [menu, setMenu] = useState("all");
  const { chatId } = useParams();
  const { setAlert, setTheme, notifications, theme,setDialog } = useModal();
  const { getMe, setMe } = useGetMe();
  const navigate = useNavigate();
  
  // Meet yaratish dialog state
  const [showMeetDialog, setShowMeetDialog] = useState(false);
  const [meetTitle, setMeetTitle] = useState("Video Meeting");
  const [meetDescription, setMeetDescription] = useState("");
  
  // Yangi meet yaratish funksiyasi
  const createMeet = () => {
    setShowMeetDialog(true);
  };

  // Meet yaratishni tasdiqlash
  const handleCreateMeet = async (meetData) => {
    try {
      const token = getKey("token");
      
      // Meet yaratish
      const response = await fetch(`${process.env.REACT_APP_PUBLIC_SERVER_URL}api/meet/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: meetData.title,
          description: meetData.description
        })
      });

      const result = await response.json();

      if (result.success) {
        const meetLink = `${window.location.origin}/meet/${result.meet.meetId}`;
        
        // Link nusxalash
        navigator.clipboard.writeText(meetLink);
        
        // Meet sahifasiga o'tish
        navigate(`/meet/${result.meet.meetId}`);
        
        setAlert(`Meet yaratildi! Link nusxalandi: ${meetLink}`, "success");
      } else {
        setAlert(result.message || "Meet yaratishda xatolik", "error");
      }
    } catch (error) {
      console.error("Meet create error:", error);
      setAlert("Meet yaratishda xatolik", "error");
    }
  };

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
    <>
    <div className={classNames("discord-nav-bar-wrapper")}>
      {/* Server Sidebar */}
      <div className="discord-server-sidebar">
        <div className="discord-server-item discord-home-server" onClick={() => setMenuFunc("all")}>
          <RxDashboard size={24} />
          <span className="discord-server-tooltip">Direct Messages</span>
        </div>
        
        <div className="discord-server-separator"></div>
        
        <div className="discord-server-item" onClick={() => setMenuFunc("users")}>
          <HiOutlineUser size={24} />
          <span className="discord-server-tooltip">Users</span>
          {getUsersNofiy(notifications) && (
            <span className="discord-server-badge">{getUsersNofiy(notifications)}</span>
          )}
        </div>
        
        <div className="discord-server-item" onClick={() => setMenuFunc("groups")}>
          <HiOutlineUsers size={24} />
          <span className="discord-server-tooltip">Groups</span>
          {getGroupsNofiy(notifications) && (
            <span className="discord-server-badge">{getGroupsNofiy(notifications)}</span>
          )}
        </div>
        
        <div className="discord-server-item discord-meet-server" onClick={createMeet}>
          <MdVideoCall size={24} />
          <span className="discord-server-tooltip">Video Meet</span>
        </div>
        
        <div className="discord-server-separator"></div>
        
        <div className="discord-server-item discord-add-server" onClick={() => setDialog({ dialog: true, action: "add" })}>
          <AiOutlinePlusCircle size={24} />
          <span className="discord-server-tooltip">Add Server</span>
        </div>
        
        <div className="discord-server-item discord-explore-servers">
          <div className="discord-compass-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M13.5 21C13.5 21.8284 12.8284 22.5 12 22.5C11.1716 22.5 10.5 21.8284 10.5 21C10.5 20.1716 11.1716 19.5 12 19.5C12.8284 19.5 13.5 20.1716 13.5 21Z" fill="currentColor"/>
              <path d="M12 2C12.5523 2 13 2.44772 13 3V11L18.7071 16.7071C19.0976 17.0976 19.0976 17.7308 18.7071 18.1213C18.3166 18.5118 17.6834 18.5118 17.2929 18.1213L11 11.8284V3C11 2.44772 11.4477 2 12 2Z" fill="currentColor"/>
            </svg>
          </div>
          <span className="discord-server-tooltip">Explore Public Servers</span>
        </div>
        
        {/* User Profile Section */}
        <div className="discord-user-profile-sidebar">
          <div className="discord-user-avatar-sidebar">
            <CustomImg image={getMe.pic} />
            <div className="discord-user-status online"></div>
          </div>
          <div className="discord-user-controls-sidebar">
            <div className="discord-user-control-sidebar" onClick={() => setTheme(theme == "dark" ? "light" : "dark")}>
              {theme == "dark" ? (
                <MdOutlineModeNight size={16} />
              ) : (
                <MdOutlineLightMode size={16} />
              )}
            </div>
            <div className="discord-user-control-sidebar" onClick={() => {
  setMenuFunc("settings", false);
  navigate("/settings");
}}>
              <AiOutlineSetting size={16} />
            </div>
            <div className="discord-user-control-sidebar discord-mute-control-sidebar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M11 3.78V2.12C7.05 2.57 4 6.18 4 10.5c0 1.19.22 2.32.6 3.36l1.52-1.52C5.41 11.46 5.25 10.5 5.25 9.5c0-3.08 2.07-5.64 4.75-6.22zM12.25 9.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5-2.5-1.12-2.5-2.5zm-1.25 0c0 2.07 1.68 3.75 3.75 3.75s3.75-1.68 3.75-3.75S16.57 5.75 14.5 5.75 10.75 7.43 10.75 9.5z" fill="currentColor"/>
              </svg>
            </div>
            <div className="discord-user-control-sidebar discord-deafen-control-sidebar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z" fill="currentColor"/>
              </svg>
            </div>
            <div 
              className="discord-user-control-sidebar discord-logout-control-sidebar"
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
            >
              <HiOutlineLogout size={16} />
            </div>
          </div>
          <span className="discord-server-tooltip">{getMe.fullName}</span>
        </div>
      </div>
      
      </div>
    
    {/* New Meet Creation Dialog */}
    <MeetCreationDialog
      isOpen={showMeetDialog}
      onClose={() => setShowMeetDialog(false)}
      onCreateMeet={handleCreateMeet}
    />
    </>
  );
}

export default NavBar;
