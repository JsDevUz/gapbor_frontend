import classNames from "classnames";
import { format } from "date-fns";
import useModal from "hooks/useModal";
import { get, size } from "lodash";
import React from "react";
import { BsTrashFill } from "react-icons/bs";
import { HiOutlineTrash } from "react-icons/hi";
import { MdOutlineMarkEmailRead } from "react-icons/md";
import {
  getChatLogo,
  getContextMenuStyle,
  getNofiy,
  getSenderId,
  markAsRead,
} from "utils";
let tim;
function OneChatRow({ leaveChat, selectChatFunc, chat, myId }) {
  const {
    onlineUsers,
    setAlert,
    selectChat,
    setContextMenu,
    contextMenu,
    notifications,
    setNotifications,
  } = useModal();
  const canMarkAsRead = notifications.filter((notify) =>
    get(notify, "chat.type") === "group"
      ? get(notify, "chat._id") === get(chat, "_id")
      : get(notify, "sender._id") === get(chat, "_id")
  );
  const handletouch = (e, chat) => {
    if (e.button === 2)
      setContextMenu({
        chat,
        ref: e,
        own: true,
        isChat: true,

        child: (
          <div className="column pd-5">
            <div
              className="y-center"
              onClick={() =>
                setAlert({
                  id: 2,
                  alert: true,
                  status: "warring",
                  type: "choosable",
                  txt: "Chtani o'chirmoqchimisiz?",
                  agree: () => leaveChat(chat),
                })
              }
            >
              <HiOutlineTrash size={20} />
              Tark etish
            </div>
            {size(canMarkAsRead) > 0 && (
              <div
                className="row mg-b-5"
                onClick={() =>
                  markAsRead(chat, notifications, setNotifications, myId)
                }
              >
                <MdOutlineMarkEmailRead size={20} />
                Barchasini o'qish
              </div>
            )}
          </div>
        ),
      });
  };
  const startTouch = (chat, event) => {
    tim = setTimeout(() => {
      setContextMenu({
        chat,
        own: true,
        isChat: true,
        ref: event.touches[0],
        child: (
          <div className="column pd-5">
            <div
              className="row mg-b-5"
              onClick={() =>
                setAlert({
                  id: 2,
                  alert: true,
                  status: "warring",
                  type: "choosable",
                  txt: "Chtani o'chirmoqchimisiz?",
                  agree: () => leaveChat(chat),
                })
              }
            >
              <HiOutlineTrash size={20} />
              Tark etish
            </div>
            {size(canMarkAsRead) > 0 && (
              <div
                className="y-center"
                onClick={() =>
                  markAsRead(chat, notifications, setNotifications, myId)
                }
              >
                <MdOutlineMarkEmailRead size={20} />
                Barchasini o'qish
              </div>
            )}
          </div>
        ),
      });
    }, 1000);
  };
  const stopTouch = () => {
    clearTimeout(tim);
  };
  return (
    <div
      onTouchEnd={() => stopTouch()}
      onTouchStart={(e) => startTouch(chat, e)}
      onMouseDown={(e) => handletouch(e, chat)}
      className={classNames("message-row", {
        selected: get(selectChat, "chat._id") == chat?._id,
      })}
      onClick={() => selectChatFunc(chat._id)}
    >
      <div
        className={classNames("message-user-logo", {
          online:
            get(chat, "_id") !== process.env.REACT_APP_GAP_BOR_SEO_ID &&
            onlineUsers.includes(get(chat, "_id")),
          group: chat.type === "group",
        })}
      >
        {getChatLogo(chat, myId)}
      </div>

      <div className="message-user-data">
        <div className="user-data-top">
          <div className="x-y-center">
            <span className="message-user-name">
              {chat.type === "group" ? chat.name : chat.fullName}
            </span>
            {chat.type !== "group" && get(chat, "verified") && (
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

          {chat?.latestMessage && (
            <span className="message-date">
              {format(new Date(chat?.latestMessage?.createdAt), "HH:mm")}
            </span>
          )}
        </div>
        <div className="user-data-bottom">
          {chat.latestMessage ? (
            <span className="message-user-last-message">
              {chat.type === "group"
                ? chat.latestMessage.sender.fullName +
                  ": " +
                  chat.latestMessage.content
                : chat.latestMessage?.content}
            </span>
          ) : (
            <span className="message-user-last-message">Xabar yo'q</span>
          )}
          {getNofiy(notifications, chat) && (
            <span className="notify">{getNofiy(notifications, chat)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default OneChatRow;
