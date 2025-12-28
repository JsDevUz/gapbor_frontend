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
    if (!isUrlSelect) navigate(`/chats/${chatId}`);
    socket.emit("chat:select", { chatId, userId: getMe._id }, (res) => {
      if (res.isOk) {
        setSelectChat({ chat: res.chat, messages: res.messages });
        // socket.emit("chat:join", res.chat._id);
        setLastAction("select_chat");
        // setLoading({ loading: false });
      } else {
        setToast({
          toast: true,
          text: get(res, "message"),
        });
        navigate("/chats/all");
      }
    });
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
    socket.emit("user:connected", getMe._id, (res) => {
      setOnlineUsers(res.onlineUsers.map((u) => u.userId));
    });

    // Global WebRTC service ni yaratish
    if (!webrtcService.current) {
      webrtcService.current = new WebRTCService(socket);

      webrtcService.current.onIncomingCall = (callData) => {
        setIncomingCall(callData);
        setShowVideoCall(true);
      };
    }

    // Global socket listeners for WebRTC
    const handleIncomingCall = (data) => {
      if (webrtcService.current) {
        webrtcService.current.handleIncomingCall(data);
      }
    };

    const handleOfferReceived = (data) => {
      setIncomingCall({
        callId: data.callId,
        callerId: data.callerId,
        callerName: data.callerName,
        callerPic: data.callerPic,
        offer: data.offer,
      });
      setShowVideoCall(true);
    };

    const handleCallAnswered = (data) => {
      if (webrtcService.current) {
        webrtcService.current.handleAnswer(data);
        setShowVideoCall(true);
        setIncomingCall({
          callId: data.callId,
          answered: true,
          isInCall: true,
        });
      }
    };

    const handleIceCandidate = (data) => {
      if (webrtcService.current) {
        webrtcService.current.handleIceCandidate(data);
      }
    };

    const handleCallEnded = () => {
      if (webrtcService.current) {
        webrtcService.current.cleanup();
      }
      setShowVideoCall(false);
      setIncomingCall(null);
    };

    const handleCallRejected = () => {
      if (webrtcService.current) {
        webrtcService.current.cleanup();
      }
      setShowVideoCall(false);
      setIncomingCall(null);
    };

    // Socket listenerlarni tozalab qo'yish
    socket.off("call:incoming").on("call:incoming", handleIncomingCall);
    socket
      .off("call:offer-received")
      .on("call:offer-received", handleOfferReceived);
    socket.off("call:answered").on("call:answered", handleCallAnswered);
    socket
      .off("call:ice-candidate")
      .on("call:ice-candidate", handleIceCandidate);
    socket.off("call:ended").on("call:ended", handleCallEnded);
    socket.off("call:rejected").on("call:rejected", handleCallRejected);

    // Typing listeners
    const handleTypingStart = (userId) => {
      if (get(selectChat, "chat._id") === userId && userId !== getMe._id) {
        setTyping(true);
      }
    };

    const handleTypingStop = (userId) => {
      if (userId !== getMe._id) {
        setTyping(false);
      }
    };

    socket.off("typing:start").on("typing:start", handleTypingStart);
    socket.off("typing:stop").on("typing:stop", handleTypingStop);

    // Cleanup function
    return () => {
      socket.off("call:incoming", handleIncomingCall);
      socket.off("call:offer-received", handleOfferReceived);
      socket.off("call:answered", handleCallAnswered);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:rejected", handleCallRejected);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
    };
  }, [getMe, selectChat]);
  useEffect(() => {
    getChats(getMe._id);
  }, [getMe]);
  useEffect(() => {
    const handleNewOnlineUser = (userId) => {
      if (!onlineUsers.includes(userId)) {
        setOnlineUsers((prev) => [...prev, userId]);
      }
    };

    const handleUserDisconnected = (userId) => {
      setOnlineUsers((prev) => prev.filter((u) => u !== userId));
    };

    socket.off("new:onlineUser").on("new:onlineUser", handleNewOnlineUser);
    socket
      .off("user:disconnected")
      .on("user:disconnected", handleUserDisconnected);

    return () => {
      socket.off("new:onlineUser", handleNewOnlineUser);
      socket.off("user:disconnected", handleUserDisconnected);
    };
  }, [onlineUsers]);

  useEffect(() => {
    let menus = ["users", "all", "setting", "groups"];
    let validateId = /^[0-9a-fA-F]{24}$/.test(chatId?.toString());
    if (chatId && !menus.includes(chatId) && validateId)
      selectChatFunc(chatId, true);
  }, [chatId]);

  useEffect(() => {
    const findMessageIndex = (messages, messageId, createdAt) => {
      const dateStr = format(new Date(createdAt), "yyyy/MM/dd");
      let groupIndex = -1;
      let messageIndex = -1;

      messages.forEach((m, i) => {
        if (m._id === dateStr) {
          groupIndex = i;
        }
      });

      if (groupIndex >= 0) {
        messages[groupIndex].messages.forEach((m, i) => {
          if (m._id === messageId) {
            messageIndex = i;
          }
        });
      }

      return { groupIndex, messageIndex };
    };

    const handleEditedMessage = (newmessage) => {
      if (!checkUserSelectThisChat(selectChat, newmessage)) return;

      const { groupIndex, messageIndex } = findMessageIndex(
        selectChat.messages,
        newmessage._id,
        newmessage.createdAt
      );

      if (groupIndex >= 0 && messageIndex >= 0) {
        const updatedMessages = [...selectChat.messages];
        updatedMessages[groupIndex] = {
          ...updatedMessages[groupIndex],
          messages: [...updatedMessages[groupIndex].messages],
        };
        updatedMessages[groupIndex].messages[messageIndex] = {
          ...updatedMessages[groupIndex].messages[messageIndex],
          content: newmessage.content,
        };

        setSelectChat((prev) => ({
          ...prev,
          messages: updatedMessages,
        }));
      }
    };

    const handleDeletedMessage = (newmessage) => {
      if (checkUserSelectThisChat(selectChat, newmessage)) {
        const { groupIndex, messageIndex } = findMessageIndex(
          selectChat.messages,
          newmessage._id,
          newmessage.createdAt
        );

        if (groupIndex >= 0 && messageIndex >= 0) {
          const updatedMessages = [...selectChat.messages];
          updatedMessages[groupIndex] = {
            ...updatedMessages[groupIndex],
            messages: updatedMessages[groupIndex].messages.filter(
              (m) => m._id !== newmessage._id
            ),
          };

          setSelectChat((prev) => ({
            ...prev,
            messages: updatedMessages,
          }));
          setLastAction("delete_message");
        }
      }

      setNotifications((prev) =>
        prev.filter((notif) => notif._id !== newmessage._id)
      );
    };

    socket
      .off("edited:message:received")
      .on("edited:message:received", handleEditedMessage);
    socket
      .off("deleted:message:received")
      .on("deleted:message:received", handleDeletedMessage);

    return () => {
      socket.off("edited:message:received", handleEditedMessage);
      socket.off("deleted:message:received", handleDeletedMessage);
    };
    const handleNewUserJoin = (chat) => {
      setSelectChat((prev) => ({ ...prev, chat: chat }));
    };

    const handleUserNew = (newChats) => {
      setChats(newChats);
    };

    const handleNewChat = (chat) => {
      if (!chats.some((c) => c._id === chat._id)) {
        setChats((prev) => [...prev, chat]);
      }
    };

    const handleGroupChange = (chat) => {
      if (get(selectChat, "chat._id") === chat._id) {
        setSelectChat((prev) => ({ ...prev, chat: chat }));
        selectChatFunc(chat._id);
      }
      setChats((prev) => prev.map((c) => (c._id === chat._id ? chat : c)));
    };

    const handleMessageNewUser = (chat) => {
      if (!chats.some((c) => c._id === chat._id)) {
        setChats((prev) => [...prev, chat]);
      }
    };

    const handleKikyou = (chat) => {
      if (get(selectChat, "chat._id") === chat._id) {
        setSelectChat({});
        setDialog({ dialog: false });
        navigate("/chats/all");
      }
      setChats((prev) => prev.filter((c) => c._id !== chat._id));
    };

    const handleAddyou = (chat) => {
      if (!chats.some((c) => c._id === chat._id)) {
        setChats((prev) => [...prev, chat]);
      }
    };

    socket.off("newUserJoin").on("newUserJoin", handleNewUserJoin);
    socket.off("user:new").on("user:new", handleUserNew);
    socket.off("newChat").on("newChat", handleNewChat);
    socket.off("group:change").on("group:change", handleGroupChange);
    socket.off("message:newUser").on("message:newUser", handleMessageNewUser);
    socket.off("kikyou").on("kikyou", handleKikyou);
    socket.off("addyou").on("addyou", handleAddyou);

    return () => {
      socket.off("newUserJoin", handleNewUserJoin);
      socket.off("user:new", handleUserNew);
      socket.off("newChat", handleNewChat);
      socket.off("group:change", handleGroupChange);
      socket.off("message:newUser", handleMessageNewUser);
      socket.off("kikyou", handleKikyou);
      socket.off("addyou", handleAddyou);
    };

    const handleMessageReceived = ({ newmessage, isFirstMessgae }) => {
      // Agar tanlangan chat bo'lsa, xabarni qo'shish
      if (checkUserSelectThisChat(selectChat, newmessage)) {
        const today = format(new Date(), "yyyy/MM/dd");
        const lastMessageGroup = last(selectChat.messages);
        const isToday = lastMessageGroup?._id === today;

        const updatedMessages = [...selectChat.messages];
        const messagesOfToday = isToday
          ? updatedMessages.length - 1
          : updatedMessages.length;

        if (!isToday) {
          updatedMessages.push({ _id: today, messages: [] });
        }

        updatedMessages[messagesOfToday].messages.push(newmessage);
        updatedMessages[messagesOfToday]._id = today;

        setSelectChat((prev) => ({
          ...prev,
          messages: updatedMessages,
        }));
      }

      // Notification va chat list yangilash
      if (
        get(newmessage, "chat._id") === get(getMe, "_id") ||
        get(newmessage, "chat.users")?.includes(get(getMe, "_id"))
      ) {
        if (!notifications.some((n) => n._id === newmessage._id)) {
          setNotifications((prev) => [...prev, newmessage]);
        }

        const lastChatId =
          get(newmessage, "sender_type") === "group"
            ? get(newmessage, "chat._id")
            : get(newmessage, "sender._id");

        if (isFirstMessgae) {
          setChats((prev) => [
            ...prev,
            { ...get(newmessage, "chat"), latestMessage: newmessage },
          ]);
        } else {
          setChats((prev) => {
            const updated = prev.map((c) =>
              c._id === lastChatId ? { ...c, latestMessage: newmessage } : c
            );
            return updated.sort(
              (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
            );
          });
        }
      }
    };

    socket
      .off("message:received")
      .on("message:received", handleMessageReceived);

    return () => {
      socket.off("message:received", handleMessageReceived);
    };
  }, [selectChat, chats, notifications, getMe]);

  useEffect(() => {
    if (messageRowRef?.current) {
      document.oncontextmenu = () => false;
    }
  }, []);
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
};

export default memo(OneChat);
