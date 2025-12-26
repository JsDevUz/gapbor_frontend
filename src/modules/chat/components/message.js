import classNames from "classnames";
import { format } from "date-fns";
import useGetMe from "hooks/useGetMe";
import useModal from "hooks/useModal";
import { get } from "lodash";
import { useEffect, useRef, useState } from "react";
import { BiCheck, BiCheckDouble } from "react-icons/bi";
import {
  BsCheck,
  BsCheckAll,
  BsCheckLg,
  BsThreeDotsVertical,
  BsTrashFill,
} from "react-icons/bs";
import { FaPen } from "react-icons/fa";
import { IoArrowUndoSharp } from "react-icons/io5";
import { socket } from "services/socket";
import {
  getChatLogo,
  getContextMenuStyle,
  iReadThisMessageBefore,
  isReadedMyMessage,
} from "utils";
let newNotifys = [];
export default function Message({
  setSelectedMessage,
  message,
  toReplayId,
  setToReplayId,
  readedMessage,
  messageInput,
  setReadedMessage,
}) {
  const [isRead, setIsRead] = useState(false);
  const { getMe } = useGetMe();
  const messageRef = useRef(null);
  const replayTo = useRef(null);
  const {
    setAlert,
    contextMenu,
    setLastAction,
    setContextMenu,
    setToast,
    selectChat,
    setNotifications,
    notifications,
    setSelectChat,
    chats,
    setChats,
  } = useModal();
  let ISReadedMyMessage = isReadedMyMessage(message, getMe._id);
  let IReadThisMessageBefore = iReadThisMessageBefore(
    message,
    getMe._id,
    selectChat
  );
  const onRead = (data) => {
    if (!data) return;
    socket.emit("message:read", data, (res) => {
      if (res.isOk) {
      } else {
        setToast({
          toast: true,
          text: get(res, "message"),
        });
      }
    });
    newNotifys = newNotifys.filter((notify) => notify._id !== data.message._id);
    setNotifications([...newNotifys]);
  };
  useEffect(() => {
    if (readedMessage.includes(message._id)) {
      setIsRead(true);

      setReadedMessage((prev) => prev.filter((id) => id != message._id));
    }
  }, [readedMessage]);

  useEffect(() => {
    newNotifys = notifications;
    if (
      (ISReadedMyMessage && message.sender._id == getMe._id) ||
      IReadThisMessageBefore
    ) {
      setIsRead(true);
    }
  }, []);
  useEffect(() => {
    if (!messageRef.current || isRead) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          onRead({ message, readerID: getMe._id });
          setIsRead(true);
          observer.unobserve(messageRef.current);
        }
      });
    });
    observer.observe(messageRef.current);

    return () => {
      observer.disconnect();
    };
  }, [message, onRead]);
  const handletouch = (e, message) => {
    const targetClassName = get(e, "target.className", "");
    if (typeof targetClassName === "string" && targetClassName.includes("replay")) return;
    if (e.button === 2 || (e.button === 0 && e.buttons === 1))
      setContextMenu({ message, ref: e });
    setContextMenu({
      message,
      ref: e,
      own: message.sender._id === getMe._id,
      child: (
        <div>
          {message.sender._id == getMe._id && (
            <>
              <div
                onClick={(e) => {
                  setAlert({
                    id: 2,
                    alert: true,
                    status: "warring",
                    type: "choosable",
                    txt: "Xabarni o'chirmoqchimisiz?",
                    agree: () => deteleMessage(message),
                  });
                  setContextMenu(false);
                }}
                className="box"
              >
                <BsTrashFill size={15} />
                O'chirish
              </div>
              <div
                className="box"
                onClick={() => {
                  setContextMenu(false);
                  editFunc(message);
                }}
              >
                <FaPen size={15} />
                Tahrirlash
              </div>
            </>
          )}
          <div
            className="box"
            onClick={() => {
              setContextMenu(false);
              setSelectedMessage({ action: "replay", message });
              messageInput.current.focus();
            }}
          >
            <IoArrowUndoSharp size={18} />
            Javob yozish
          </div>
        </div>
      ),
    });
  };

  const deteleMessage = async (e) => {
    socket.emit(
      "message:deleted",
      { messageId: e._id, userId: getMe._id },
      (res) => {
        if (res.isOk) {
          setLastAction("delete_message");
          let groupIndex = 0;
          let messageIndex = 0;
          selectChat.messages.map((m, i) => {
            if (m._id === format(new Date(e.createdAt), "yyyy/MM/dd"))
              groupIndex = i;
          });
          selectChat.messages[groupIndex].messages.map((m, i) => {
            if (m._id === e._id) messageIndex = i;
          });

          delete selectChat.messages[groupIndex].messages[messageIndex];
          setSelectChat((prev) => ({
            ...prev,
            messages: [...get(selectChat, "messages", [])],
          }));

          let newChats = chats;
          chats.map((c, i) => {
            if (c._id === get(message, "chat._id"))
              newChats[i].latestMessage = res.latestMessage;
          });
          setChats(newChats);
          // let newNotifys = notifications.filter(
          //   (notif) => notif._id != get(res, "id")
          // );
          // setNotifications([...newNotifys]);
        } else {
          setToast({
            toast: true,
            text: get(res, "message"),
          });
        }
      }
    );
  };

  const editFunc = (message) => {
    setSelectedMessage({ action: "edit", message });
    messageInput.current.setValue(message.content);
    messageInput.current.focus();
  };

  const goREplayedMsg = (id) => {
    setTimeout(() => {
      setToReplayId(null);
    }, 2000);
    setToReplayId(id);
    document
      .getElementById(`${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
  };

  return (
    <div
      ref={
        isRead || IReadThisMessageBefore || message.sender._id === getMe._id
          ? null
          : messageRef
      }
      onMouseDown={(e) => handletouch(e, message)}
      id={message._id}
      className={classNames("one-chat-one-message", {
        own: message.sender._id == getMe._id,
        readBefore: !IReadThisMessageBefore,
        replayed: toReplayId == message._id,
        isRead: isRead,
        isSender: message.sender._id === getMe._id,
      })}
    >
      {get(selectChat, "chat.type") === "group" &&
        message.sender._id != getMe._id && (
          <div className="one-chat-one-message-logo">
            {getChatLogo(message.sender, getMe._id)}
          </div>
        )}
      <div className="onechat-one-message-text-wrapper">
        {message.sender._id != getMe._id && (
          <div className="onechat-one-message-text-header">
            <span className="one-chat-one-message-name">
              {message.sender.fullName}
            </span>
            <BsThreeDotsVertical size={15} />
          </div>
        )}
        {message?.parentId?.sender && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              goREplayedMsg(message.parentId?._id);
            }}
            className="replayed-message"
          >
            <span className="replayed-message-user">
              {message.parentId?.sender.fullName}
            </span>
            <span className="replayed-message-text">
              {message.parentId?.content}
            </span>
          </div>
        )}
        <span className="one-chat-one-message-message">{message.content}</span>
        <span className="one-chat-one-message-date">
          {format(new Date(message.createdAt), "HH:mm")}{" "}
          {isRead && message.sender._id === getMe._id ? (
            <BiCheckDouble size={20} />
          ) : (
            message.sender._id === getMe._id && <BiCheck size={20} />
          )}
        </span>
      </div>
    </div>
  );
}
