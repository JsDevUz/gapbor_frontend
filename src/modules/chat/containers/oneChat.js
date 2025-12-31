import useGetMe from "hooks/useGetMe";
import useModal from "hooks/useModal";
import { get, last, size } from "lodash";
import { memo, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { socket } from "services/socket";
import { checkUserSelectThisChat } from "utils";
import SelectedChatMessagesContainer from "../components/SelectedChatMessagesContainer";
import ChatsList from "../components/chatsList";
import { format } from "date-fns";
import VideoCall from "components/VideoCall";
import WebRTCService from "services/webrtc.service";

const OneChat = (props) => {
  const { chatId } = useParams();
  const { getMe } = useGetMe();
  const { setDialog } = useModal();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState(null);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const webrtcService = useRef(null);

  const {
    setLoading,
    setChats,
    chats,
    notifications,
    lastAction,
    setLastAction,
    setNotifications,
    onlineUsers,
    setSelectChat,
    setOnlineUsers,
    setToast,
    typing,
    setTyping,
    selectChat,
  } = useModal();
  const messageRowRef = useRef([]);
  const lastMessage = useRef([]);
  const selectChatFunc = async (chatId, isUrlSelect = false) => {
    setTyping(false);
    
    // Socket connection holatini tekshirish
    if (!socket.connected) {
      setToast({
        toast: true,
        text: "Server bilan aloqa yo'q. Qaytadan urinib ko'ring.",
        type: "error"
      });
      return;
    }
    
    // Loading state qo'shish
    setLoading({ loading: true, small: true });
    
    if (!isUrlSelect) navigate(`/chats/${chatId}`);
    
    // Socket timeout qo'shish
    const timeout = setTimeout(() => {
      setLoading({ loading: false });
      setToast({
        toast: true,
        text: "Chat tanlashda xatolik. Qaytadan urinib ko'ring.",
        type: "error"
      });
    }, 5000); // 5 sekund timeout
    
    // Retry mechanism
    const retrySelect = (attempt = 1) => {
      if (attempt > 3) {
        clearTimeout(timeout);
        setLoading({ loading: false });
        setToast({
          toast: true,
          text: "Chat tanlash muvaffaqiyatsiz. Keyinroq urinib ko'ring.",
          type: "error"
        });
        return;
      }
      
      socket.emit("chat:select", { chatId, userId: getMe._id }, (res) => {
        if (res && res.isOk) {
          clearTimeout(timeout);
          setLoading({ loading: false });
          setSelectChat({ chat: res.chat, messages: res.messages });
          setLastAction("select_chat");
        } else if (attempt <= 3) {
          // Retry with delay
          setTimeout(() => retrySelect(attempt + 1), 1000 * attempt);
        } else {
          clearTimeout(timeout);
          setLoading({ loading: false });
          setToast({
            toast: true,
            text: get(res, "message", "Chat tanlashda xatolik"),
            type: "error"
          });
          navigate("/chats/all");
        }
      });
    };
    
    retrySelect();
  };
  const getChats = (userId) => {
    if (get(selectChat, "chat._id") === userId) return;
    setLoading({ loading: true, small: true });
    socket.emit("chat:get", { userId }, (res) => {
      setLoading({ loading: false });
      if (res.isOk) {
        setChats(res.chats);
        setNotifications(res.notify);
      } else {
        setToast({
          toast: true,
          text: get(res, "message"),
        });
      }
    });
  };
  useEffect(() => {
    // setLoading({ loading: true, small: false });
    socket.emit("user:connected", getMe._id, (res) => {
      setOnlineUsers(res.onlineUsers.map((u) => u.userId));
    });
    console.log(webrtcService,socket);
    
    // Global WebRTC service ni yaratish
    if (!webrtcService.current) {
      webrtcService.current = new WebRTCService(socket);
    }
    
    // Event handlers ni har doim o'rnatish (service mavjud bo'lsa ham)
    webrtcService.current.onIncomingCall = (callData) => {
      console.log("Incoming call:",callData);
      
      setIncomingCall(callData);
      setShowVideoCall(true);
    };
      
      // Global socket listeners for WebRTC
      socket.on('call:incoming', (data) => {
        console.log('call:incoming yetib keldi oneChatga',data);
        
        // Safety check before calling handleIncomingCall
        if (webrtcService.current && typeof webrtcService.current.handleIncomingCall === 'function') {
          webrtcService.current.handleIncomingCall(data);
        } else {
          console.warn('webrtcService.current or handleIncomingCall is not available');
        }
      });
      
      socket.on('call:offer-received', (data) => {
        // console.log('call:offer-received yetib keldi oneChatga',data);
        setIncomingCall({
          callId: data.callId,
          callerId: data.callerId,
          callerName: data.callerName,
          callerPic: data.callerPic,
          offer: data.offer
        });
        setShowVideoCall(true);
      });
      
      socket.on('call:answered', (data) => {
        console.log('call:answered yetib keldi oneChatga',data);
        if (webrtcService.current) {
          webrtcService.current.handleAnswer(data);
          // Qabul qiluvchi tomonida call boshlandi - UI yangilash
          setShowVideoCall(true);
          setIncomingCall({
            callId: data.callId,
            answered: true,
            isInCall: true
          });
        }
      });
      
      socket.on('call:ice-candidate', (data) => {
        webrtcService.current.handleIceCandidate(data);
      });
      
      socket.on('call:ended', (data) => {
        console.log('call:ended yetib keldi oneChatga',data);
        if (webrtcService.current) {
          webrtcService.current.cleanup();
        }
        setShowVideoCall(false);
        setIncomingCall(null);
      });
      
      socket.on('call:rejected', (data) => {
        console.log('call:rejected yetib keldi oneChatga',data);
        if (webrtcService.current) {
          webrtcService.current.cleanup();
        }
        setShowVideoCall(false);
        setIncomingCall(null);
      });
      
      socket.off("typing:start");
      socket.on("typing:start", (userId) => {
        if (get(selectChat, "chat._id") === userId) {
          userId != getMe._id && setTyping(true);
        }
      });
      socket.off("typing:stop");
      socket.on("typing:stop", (userId) => userId != getMe._id && setTyping(false));
    
  }, [getMe, selectChat]);
  useEffect(() => {
    getChats(getMe._id);
  }, [getMe]);
  useEffect(() => {
    socket.off("new:onlineUser");
    socket.on("new:onlineUser", (e) => {
      if (!onlineUsers.includes(e)) setOnlineUsers((prev) => [...prev, e]);
    });
    socket.off("user:disconnected");
    socket.on("user:disconnected", (e) => {
      let newUserList = onlineUsers.filter((u) => u != e);
      setOnlineUsers(newUserList);
    });
  }, [onlineUsers]);

  useEffect(() => {
    let menus = ["users", "all", "setting", "groups"];
    let validateId = /^[0-9a-fA-F]{24}$/.test(chatId?.toString());
    if (chatId && !menus.includes(chatId) && validateId)
      selectChatFunc(chatId, true);
  }, [chatId]);

  useEffect(() => {
    socket
      .off("edited:message:received")
      .on("edited:message:received", (newmessage) => {
        if (checkUserSelectThisChat(selectChat, newmessage)) {
          let groupIndex = 0;
          let messageIndex = 0;
          selectChat.messages.map((m, i) => {
            if (m._id === format(new Date(newmessage.createdAt), "yyyy/MM/dd"))
              groupIndex = i;
          });
          selectChat.messages[groupIndex].messages.map((m, i) => {
            if (m._id === newmessage._id) messageIndex = i;
          });
          selectChat.messages[groupIndex].messages[messageIndex].content =
            newmessage.content;

          setSelectChat((prev) => ({
            ...prev,
            messages: [...get(selectChat, "messages", [])],
          }));
        }
      });
    socket.off("deleted:message:received");
    socket.on("deleted:message:received", (newmessage) => {
        if (checkUserSelectThisChat(selectChat, newmessage)) {
          let groupIndex = 0;
          let messageIndex = 0;
          selectChat.messages.map((m, i) => {
            if (m._id === format(new Date(newmessage.createdAt), "yyyy/MM/dd"))
              groupIndex = i;
          });
          selectChat.messages[groupIndex].messages.map((m, i) => {
            if (m._id === newmessage._id) messageIndex = i;
          });
          delete selectChat.messages[groupIndex].messages[messageIndex];
          setSelectChat((prev) => ({
            ...prev,
            messages: [...get(selectChat, "messages", [])],
          }));
          // if (get(selectChat, "messages", [])) {
          //   let newList = get(selectChat, "messages", []).find(
          //     (m) => m._id == newmessage._id
          //   );
          //   get(selectChat, "messages", []).splice(
          //     get(selectChat, "messages", []).indexOf(newList),
          //     1
          //   );
          //   setSelectChat((prev) => ({
          //     ...prev,
          //     messages: get(selectChat, "messages", []),
          //   }));

          setLastAction("delete_message");
        }
        let newNotifys = notifications.filter(
          (notif) => notif._id != newmessage._id
        );
        setNotifications([...newNotifys]);
        // }
      });
    socket.off("newUserJoin");
    socket.on("newUserJoin", (chat) => {
      setSelectChat((prev) => ({ ...prev, chat: chat }));
    });
    socket.off("user:new");
    socket.on("user:new", (chats) => {
      setChats(chats);
    });

    socket.off("newChat");
    socket.on("newChat", (chat) => {
      if (size(chats.filter((c) => c._id == chat._id)) == 0) {
        setChats((prev) => [...prev, chat]);
      }
    });
    socket.off("group:change");
    socket.on("group:change", (chat) => {
      if (get(selectChat, "chat._id") == chat._id) {
        setSelectChat((prev) => ({ ...prev, chat: chat }));

        selectChatFunc(chat._id);
      }

      chats.forEach((c, i) => {
        if (c._id == chat._id) {
          chats[i] = chat;
        }
      });
      setChats([...chats]);
    });
    socket.off("message:newUser");
    socket.on("message:newUser", (chat) => {
      if (size(chats.filter((c) => c._id == chat._id)) == 0) {
        setChats((prev) => [...prev, chat]);
      }
    });

    socket.off("kikyou");
    socket.on("kikyou", (chat) => {
      if (get(selectChat, "chat._id") == chat._id) {
        setSelectChat({});
        setDialog({ dialog: false });
        navigate("/chats/all");
      }

      setChats((prev) => prev.filter((c) => c._id != chat._id));
    });

    socket.off("addyou");
    socket.on("addyou", (chat) => {
      if (size(chats.filter((c) => c._id == chat._id)) == 0) {
        setChats((prev) => [...prev, chat]);
      }
    });

    socket.off("message:received");
    socket.on("message:received", ({ newmessage, isFirstMessgae }) => {
        if (checkUserSelectThisChat(selectChat, newmessage)) {
          let messagesOfToday;
          if (
            get(last(selectChat.messages), "_id") ===
            format(new Date(), "yyyy/MM/dd")
          ) {
            messagesOfToday = size(selectChat.messages) - 1;
          } else {
            messagesOfToday = size(selectChat.messages);
            selectChat.messages[messagesOfToday] = { _id: "", messages: [] };
          }
          selectChat.messages[messagesOfToday].messages.push(newmessage);
          selectChat.messages[messagesOfToday]._id = format(
            new Date(),
            "yyyy/MM/dd"
          );

          setSelectChat((prev) => ({
            ...prev,
            messages: [...selectChat.messages],
          }));
        }

        if (
          get(newmessage, "chat._id") === get(getMe, "_id") ||
          get(newmessage, "chat.users").includes(get(getMe, "_id"))
        ) {
          if (size(notifications.filter((n) => n._id == newmessage._id)) == 0) {
            setNotifications((prev) => [...prev, newmessage]);
          }
          let lastChtId =
            get(newmessage, "sender_type") === "group"
              ? get(newmessage, "chat._id")
              : get(newmessage, "sender._id");

          let newChats = chats;

          if (isFirstMessgae) {
            setChats((prev) => [
              ...prev,
              { ...get(newmessage, "chat"), latestMessage: newmessage },
            ]);
          } else {
            chats.map((c, i) => {
              if (c._id == lastChtId) newChats[i].latestMessage = newmessage;
            });
          }
          newChats = newChats.sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
          );

          setChats([...newChats]);
        }
      });
  }, [get(selectChat, "messages", []), selectChat, chats, notifications]);

  useEffect(() => {
    if (messageRowRef && messageRowRef?.current) {
      document.oncontextmenu = () => false;
    }
  });
  return (
    <>
      <ChatsList selectChatFunc={selectChatFunc} onlineUsers={onlineUsers} />
      <SelectedChatMessagesContainer
        onlineUsers={onlineUsers}
        socket={socket}
        typing={typing}
        lastMessage={lastMessage}
        webrtcService={webrtcService.current}
      />
      {showVideoCall && (
        <VideoCall
          socket={socket}
          currentUser={getMe}
          onClose={() => {
            setShowVideoCall(false);
            setIncomingCall(null);
          }}
          incomingCall={incomingCall}
          webrtcService={webrtcService.current}
        />
      )}
    </>
  );
  // fd
};

export default memo(OneChat);

