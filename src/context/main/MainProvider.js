import { createContext, useState } from "react";
import { setKey } from "services/storage";

const MainContext = createContext({});

export const MainProvider = ({ children }) => {
  const [loading, setLoading] = useState({ loading: true, small: false });
  const [alert, setAlert] = useState({ alert: false });
  const [dialog, setDialog] = useState({ dialog: false });
  const [toast, setToast] = useState({ toast: false });
  const [theme, setMode] = useState("dark");
  const setTheme = (theme) => {
    setKey("theme", theme);
    setMode(theme);
  };

  const [selectChat, setSelectChat] = useState();
  const [notifications, setNotifications] = useState([]);
  const [typing, setTyping] = useState(false);
  const [contextMenu, setContextMenu] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [lastAction, setLastAction] = useState("default");
  const [chats, setChats] = useState([]);

  return (
    <MainContext.Provider
      value={{
        alert,
        setAlert,
        loading,
        setDialog,
        dialog,
        setLoading,
        toast,
        setToast,
        theme,
        setTheme,
        selectChat,
        setSelectChat,
        contextMenu,
        setContextMenu,
        typing,
        setTyping,
        notifications,
        setNotifications,
        lastAction,
        setLastAction,
        chats,
        setChats,
        onlineUsers,
        setOnlineUsers,
      }}
    >
      {children}
    </MainContext.Provider>
  );
};

export default MainContext;
