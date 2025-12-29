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

  // Meet yaratish funksiyasi
  const createMeet = async () => {
    try {
      const token = getKey("token");
      const user = get(getMe, "_id");
      
      if (!user || !token) {
        setAlert("Iltimos avval tizimga kiring", "error");
        return;
      }

      // Dialogni ochish
      setShowMeetDialog(true);
    } catch (error) {
      console.error("Meet create error:", error);
      setAlert("Meet yaratishda xatolik", "error");
    }
  };

  // Meet yaratishni tasdiqlash
  const handleCreateMeetConfirm = async () => {
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
          title: meetTitle,
          description: meetDescription
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
        
        // Dialogni yopish va state ni tozalash
        setShowMeetDialog(false);
        setMeetTitle("Video Meeting");
        setMeetDescription("");
      } else {
        setAlert(result.message || "Meet yaratishda xatolik", "error");
      }
    } catch (error) {
      console.error("Meet create error:", error);
      setAlert("Meet yaratishda xatolik", "error");
    }
  };

  // Dialogni bekor qilish
  const handleMeetDialogCancel = () => {
    setShowMeetDialog(false);
    setMeetTitle("Video Meeting");
    setMeetDescription("");
  };

  return (
    <>
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
          className="icon"
          onClick={createMeet}
          title="Yangi Meet yaratish"
        >
          <MdVideoCall size={22} />
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
    
    {showMeetDialog && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '10px',
          minWidth: '400px',
          maxWidth: '500px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#333' }}>Yangi Meet yaratish</h2>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#666' }}>Meet nomi:</label>
            <input
              type="text"
              value={meetTitle}
              onChange={(e) => setMeetTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px'
              }}
              placeholder="Meet nomi"
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#666' }}>Tavsif (ixtiyoriy):</label>
            <textarea
              value={meetDescription}
              onChange={(e) => setMeetDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px',
                minHeight: '80px',
                resize: 'vertical'
              }}
              placeholder="Meet tavsifi"
            />
          </div>
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={handleMeetDialogCancel}
              style={{
                padding: '10px 20px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                backgroundColor: '#f5f5f5',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Bekor qilish
            </button>
            <button
              onClick={handleCreateMeetConfirm}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '5px',
                backgroundColor: '#007bff',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Yaratish
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default NavBar;
