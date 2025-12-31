import classNames from "classnames";
import { format } from "date-fns";
import useGetMe from "hooks/useGetMe";
import useModal from "hooks/useModal";
import { get, head, last, size } from "lodash";
import { useEffect, useRef, useState } from "react";
import { HiOutlineUsers } from "react-icons/hi";
import { IoArrowBack } from "react-icons/io5";
import { ThreeDots } from "react-loader-spinner";
import { useNavigate, useParams } from "react-router-dom";
import { socket } from "services/socket";
import { getKey } from "services/storage";
import {
  getChatLogo,
  getDate,
  getGroupOnlineUsers,
  isEmptyAllGroupMessages,
  isEmptyGroupMessages,
} from "utils";
import VideoCallButton from "components/VideoCall/VideoCallButton";
import Message from "./message";
import NoChatSelected from "./noChatSelected";
import OneChatBottom from "./oneChatBottom";
let tim;

function SelectedChatMessagesContainer({ lastMessage, onlineUsers: propOnlineUsers, socket, typing: propTyping, webrtcService }) {
  const { getMe } = useGetMe();
  const { chatId } = useParams();
  const [readedMessage, setReadedMessage] = useState([]);
  const [toReplayId, setToReplayId] = useState(null);
  const messageInput = useRef([]);
  const messagesContainerRef = useRef(null); // Scroll container ref

  const [selectedMessage, setSelectedMessage] = useState();
  const {
    setDialog,
    typing,
    notifications,
    lastAction,
    setToast,
    onlineUsers,
    setLastAction,
    chats,
    selectChat,
    setSelectChat,

    setChats,
  } = useModal();
  const navigate = useNavigate();

  // Scroll to bottom function
  const scrollToBottom = (smooth = true) => {
    if (messagesContainerRef.current) {
      const scrollOptions = {
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      };
      messagesContainerRef.current.scrollTo(scrollOptions);
    }
  };

  const getUserStatus = (data) => {
    return onlineUsers.includes(get(selectChat, "chat._id"))
      ? "tarmoqda"
      : "tarmoqda emas";
  };
  useEffect(() => {
    socket.off("yourMessage:read").on("yourMessage:read", (readedmessage) => {
      setReadedMessage((prev) => [...prev, get(readedmessage, "_id")]);
    });
    setSelectedMessage();
    // setSelectChat();
  }, [chatId]);

  // Scroll to bottom when chat changes or messages update
  useEffect(() => {
    if (selectChat && selectChat.messages) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [selectChat?.messages, chatId]);
  const sendMessage = async (message) => {
    if (size(message?.trim()) <= 0) return;
    if (selectedMessage?.action == "edit") {
      setLastAction("edit_message");
      setSelectedMessage();
      socket.emit(
        "message:edited",
        {
          messageId: selectedMessage.message._id,
          message: selectedMessage,
          content: message,
          userId: getMe._id,
        },
        (res) => {
          if (res.isOk) {
            let groupIndex = 0;
            let messageIndex = 0;
            selectChat.messages.map((m, i) => {
              if (
                m._id ===
                format(
                  new Date(selectedMessage.message.createdAt),
                  "yyyy/MM/dd"
                )
              )
                groupIndex = i;
            });
            selectChat.messages[groupIndex].messages.map((m, i) => {
              if (m._id === selectedMessage.message._id) messageIndex = i;
            });
            selectChat.messages[groupIndex].messages[messageIndex].content =
              message;
            socket.emit("typing:stop", get(selectChat, "chat._id"));
            setSelectChat((prev) => ({
              ...prev,
              messages: [...get(selectChat, "messages", [])],
            }));
          } else {
            setToast({
              toast: true,
              text: get(res, "message"),
            });
          }
        }
      );
    } else {
      setSelectedMessage();
      
      // Xabarni darhol UI ga qo'shish (pending status bilan)
      const tempMessage = {
        _id: `temp_${Date.now()}_${Math.random()}`,
        content: message,
        sender: getMe,
        sender_type: get(selectChat, "chat.type"),
        chat: get(selectChat, "chat"),
        parentId: get(selectedMessage, "message._id", null),
        status: 'sending', // pending status
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Xabarni darhol UI ga qo'shish
      let messagesOfToday;
      if (get(last(selectChat.messages), "_id") === format(new Date(), "yyyy/MM/dd")) {
        messagesOfToday = size(selectChat.messages) - 1;
      } else {
        messagesOfToday = size(selectChat.messages);
        selectChat.messages[messagesOfToday] = { _id: "", messages: [] };
        selectChat.messages[messagesOfToday]._id = format(new Date(), "yyyy/MM/dd");
      }
      
      selectChat.messages[messagesOfToday].messages.push(tempMessage);
      setSelectChat((prev) => ({
        ...prev,
        messages: [...selectChat.messages],
      }));
      
      // Scroll to bottom after adding message
      setTimeout(() => scrollToBottom(), 100);
      
      // Backend ga yuborish
      socket.emit(
        "message:send",
        {
          content: message,
          sender: getMe._id,
          sender_type: get(selectChat, "chat.type"),
          chat: get(selectChat, "chat"),
          parentId: get(selectedMessage, "message._id", null),
          token: getKey("token"),
        },
        (res) => {
          if (res.isOk) {
            // Success - temp message ni real message bilan almashtirish
            const messages = selectChat.messages[messagesOfToday].messages;
            const tempIndex = messages.findIndex(msg => msg._id === tempMessage._id);
            
            if (tempIndex !== -1) {
              messages[tempIndex] = {
                ...res.message,
                status: 'sent' // success status
              };
            }
            
            setSelectChat((prev) => ({
              ...prev,
              messages: [...selectChat.messages],
            }));
            
            // Scroll to bottom after successful send
            setTimeout(() => scrollToBottom(), 100);
            
            // Chat listni yangilash
            let newChats = chats;
            chats.map((c, i) => {
              if (c._id === res.message.chat._id) newChats[i].latestMessage = res.message;
            });
            setChats(newChats);

            if (res.isFirstMessgae) {
              if (get(selectChat, "chat.type") === "group") {
                setSelectChat((prev) => ({
                  ...prev,
                  chat: { ...prev.chat, users: [...prev.chat.users, getMe] },
                }));
              }
              setChats((prev) => [
                ...prev,
                { ...get(selectChat, "chat"), latestMessage: res.message },
              ]);
            }
            
            socket.emit("typing:stop", get(selectChat, "chat._id"));
            setLastAction("send_message");
            
          } else {
            // Error - temp message statusini error qilish
            const messages = selectChat.messages[messagesOfToday].messages;
            const tempIndex = messages.findIndex(msg => msg._id === tempMessage._id);
            
            if (tempIndex !== -1) {
              messages[tempIndex] = {
                ...tempMessage,
                status: 'error' // error status
              };
            }
            
            setSelectChat((prev) => ({
              ...prev,
              messages: [...selectChat.messages],
            }));
            
            // Scroll to bottom after error status update
            setTimeout(() => scrollToBottom(), 100);
            
            setToast({
              toast: true,
              text: get(res, "message", "Xabar yuborilmadi"),
              type: "error"
            });
          }
        }
      );
    }
    return;
  };

  const messageWritting = (e) => {
    socket.emit("typing:start", get(selectChat, "chat._id"));

    clearTimeout(tim);
    tim = setTimeout(() => {
      socket.emit("typing:stop", get(selectChat, "chat._id"));

      clearTimeout(tim);
    }, 2000);
  };
  useEffect(() => {
    if (lastAction === "select_chat") {
      let fistUnreadMessageId =
        get(head(notifications), "_id") ||
        get(last(get(selectChat, "messages")), "_id");
      document.getElementById(`${fistUnreadMessageId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "end",
        inline: "nearest",
      });
      setLastAction("default");
    }
    if (lastAction === "send_message") {
      if (size(get(lastMessage, "current")) === 0) return;

      lastMessage?.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
        inline: "nearest",
      });
      setLastAction("default");
    }
  }, [lastAction, selectChat]);
  return (
    <div className={classNames("one-chat-wrapper", { hidden: false })}>
      {get(selectChat, "messages", false) ? (
        <>
          <div className="one-chat-header">
            <IoArrowBack
              size={25}
              className="left-arrow"
              onClick={() => {
                setSelectChat();
                navigate(-1);
              }}
            />
            <div className="one-chat-logo">
              {getChatLogo(get(selectChat, "chat"), getMe._id)}
            </div>
            <div className="one-chat-data">
              <div className="x-y-center mg-b-5 overflow-hidden mw-full">
                <span className="one-chat-name">
                  {get(selectChat, "chat.type") === "group"
                    ? get(selectChat, "chat.name")
                    : get(get(selectChat, "chat"), "fullName")}
                </span>
                {get(selectChat, "chat.type") !== "group" &&
                  get(selectChat, "chat.verified") && (
                    <svg className="VerifiedIcon" viewBox="0 0 24 24">
                      <path
                        d="M12.3 2.9c.1.1.2.1.3.2.7.6 1.3 1.1 2 1.7.3.2.6.4.9.4.9.1 1.7.2 2.6.2.5 0 .6.1.7.7.1.9.1 1.8.2 2.6 0 .4.2.7.4 1 .6.7 1.1 1.3 1.7 2 .3.4.3.5 0 .8-.5.6-1.1 1.3-1.6 1.9-.3.3-.5.7-.5 1.2-.1.8-.2 1.7-.2 2.5 0 .4-.2.5-.6.6-.8 0-1.6.1-2.5.2-.5 0-1 .2-1.4.5-.6.5-1.3 1.1-1.9 1.6-.3.3-.5.3-.8 0-.7-.6-1.4-1.2-2-1.8-.3-.2-.6-.4-.9-.4-.9-.1-1.8-.2-2.7-.2-.4 0-.5-.2-.6-.5 0-.9-.1-1.7-.2-2.6 0-.4-.2-.8-.4-1.1-.6-.6-1.1-1.3-1.6-2-.4-.4-.3-.5 0-1 .6-.6 1.1-1.3 1.7-1.9.3-.3.4-.6.4-1 0-.8.1-1.6.2-2.5 0-.5.1-.6.6-.6.9-.1 1.7-.1 2.6-.2.4 0 .7-.2 1-.4.7-.6 1.4-1.2 2.1-1.7.1-.2.3-.3.5-.2z"
                        style={{ fill: "var(--color-fill)" }}
                      ></path>
                      <path
                        d="M16.4 10.1l-.2.2-5.4 5.4c-.1.1-.2.2-.4 0l-2.6-2.6c-.2-.2-.1-.3 0-.4.2-.2.5-.6.7-.6.3 0 .5.4.7.6l1.1 1.1c.2.2.3.2.5 0l4.3-4.3c.2-.2.4-.3.6 0 .1.2.3.3.4.5.2 0 .3.1.3.1z"
                        style={{ fill: "var(--color-checkmark)" }}
                      ></path>
                    </svg>
                  )}
              </div>
              <span className="one-chat-action">
                {get(selectChat, "chat.type") === "group" ? (
                  size(get(selectChat, "chat.users")) +
                  ` ta a'zo, ${getGroupOnlineUsers(
                    get(selectChat, "chat"),
                    onlineUsers
                  )} ta tarmoqda`
                ) : typing ? (
                  <div className="typing-status">
                    <ThreeDots
                      height="20px"
                      width="20px"
                      radius="9"
                      ariaLabel="three-dots-loading"
                      wrapperStyle={{}}
                      wrapperClassName="three-dots-loading"
                      visible={true}
                    />
                    <span className="typing-text">yozmoqda</span>
                  </div>
                ) : get(selectChat, "chat._id") ===
                  process.env.REACT_APP_GAP_BOR_SEO_ID ? (
                  "xizmat xabarlari"
                ) : (
                  getUserStatus(get(selectChat, "chat"))
                )}
              </span>
            </div>
            <div className="utils">
              {get(selectChat, "chat.type") !== "group" && (
                <VideoCallButton
                  socket={socket}
                  currentUser={getMe}
                  targetUser={get(selectChat, "chat")}
                  disabled={!propOnlineUsers.includes(get(selectChat, "chat._id"))}
                  webrtcService={webrtcService}
                />
              )}
              {get(selectChat, "chat.type") === "group" && (
                <div
                  onClick={() =>
                    setDialog({
                      dialog: true,
                      chat: get(selectChat, "chat"),
                      action: "edit",
                    })
                  }
                  className="one-chat-actions"
                >
                  <HiOutlineUsers size={22} />
                </div>
              )}
            </div>
          </div>
          <div ref={messagesContainerRef} className="one-chat-messages-wrapper">
            {size(get(selectChat, "messages", [])) > 0 &&
            !isEmptyAllGroupMessages(selectChat.messages) ? (
              <>
                {get(selectChat, "messages", []).map((message, i) => (
                  <div key={message._id} className="message-date-group">
                    {!isEmptyGroupMessages(get(message, "messages")) && (
                      <>
                        {getDate(message._id)}
                        {message?.messages.map((message, i) => (
                          <Message
                            message={message}
                            toReplayId={toReplayId}
                            messageInput={messageInput}
                            readedMessage={readedMessage}
                            setToReplayId={setToReplayId}
                            setReadedMessage={setReadedMessage}
                            key={message._id}
                            setSelectedMessage={setSelectedMessage}
                          />
                        ))}
                      </>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <span className="no-message">Hali suhbatlar mavjud emas.</span>
            )}
            <div ref={lastMessage} />
          </div>
          <OneChatBottom
            sendMessage={sendMessage}
            messageWritting={messageWritting}
            controllRef={messageInput}
            selectedMessage={selectedMessage}
            setSelectedMessage={setSelectedMessage}
          />
        </>
      ) : (
        <NoChatSelected />
      )}
    </div>
  );
}

export default SelectedChatMessagesContainer;
