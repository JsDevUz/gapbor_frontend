import CustomImg from "components/image";
import { format } from "date-fns";
import { get, head, size } from "lodash";
import { socket } from "services/socket";
import { getKey } from "services/storage";

export const getSender = (user, userList, src) => {
  return get(head(userList), "_id", null) === user
    ? get(userList[1], src, null)
    : get(head(userList), src, null);
};
export const isEmptyGroupMessages = (messages) => {
  const nums = messages.filter((mess) => mess != null);
  return size(nums) === 0;
};
export const isEmptyAllGroupMessages = (messages) => {
  const nums = messages.filter(
    (value) => Object.keys(get(value, "messages")).length !== 0
  );
  return size(nums) === 0;
};
export const markAsRead = (chat, notifications, setNotifications, readerID) => {
  let newNotifs = notifications.filter((notif) => {
    if (get(notif, "chat._id") == get(chat, "_id")) {
      socket.emit("message:read", { message: notif, readerID }, (res) => {
        if (res.isOk) {
        } else {
          console.log("xatoo");
        }
      });
    }
    return get(notif, "chat._id") != get(chat, "_id");
  });
  setNotifications([...newNotifs]);
};
export const getSenderId = (user, userList) => {
  return get(head(userList), "_id", null) === user
    ? get(userList[1], "_id", null)
    : get(head(userList), "_id", null);
};
let i = 0;

export const getGroupOnlineUsers = (chat, list) => {
  i = 0;
  let groupOnlineUsers = [];
  for (const user of get(chat, "users")) {
    i++;
    list.includes(get(user, "_id")) && groupOnlineUsers.push(user);
  }
  if (i === size(get(chat, "users", []))) {
    return size(groupOnlineUsers);
  }
};
export const getContextMenuStyle = (bubble, own, isChat = false) => {
  if (!own) {
    const check = get(bubble, "ref.clientY") + 64 >= window.innerHeight;
    const checkX = get(bubble, "ref.clientX") + 170 >= window.innerWidth;

    return {
      left: checkX
        ? get(bubble, "ref.clientX") - 200
        : get(bubble, "ref.clientX"),

      marginTop: check
        ? get(bubble, "ref.clientY") - 70
        : get(bubble, "ref.clientY"),
    };
  } else if (own && isChat) {
    const checkY = get(bubble, "ref.clientY") + 170 >= window.innerHeight;
    return {
      left: 150,
      marginTop: checkY
        ? get(bubble, "ref.clientY") - 150
        : get(bubble, "ref.clientY"),
    };
  } else if (own) {
    const checkY = get(bubble, "ref.clientY") + 170 >= window.innerHeight;
    const checkX = get(bubble, "ref.clientX") + 170 >= window.innerWidth;
    return {
      left: checkX
        ? get(bubble, "ref.clientX") - 200
        : get(bubble, "ref.clientX"),
      marginTop: checkY
        ? get(bubble, "ref.clientY") - 150
        : get(bubble, "ref.clientY"),
    };
  }
};

export const cleanNotifications = (notifications, setNotifications, chatId) => {
  let notify = [];
  for (const message of notifications) {
    if (get(message, "chat.type") === "user") {
      if (get(message, "sender._id") != chatId) notify.push(message);
    } else {
      if (get(message, "chat._id") != chatId) notify.push(message);
    }
  }
  setNotifications((prev) => notify);
};
export const isReadedMyMessage = (message, senderID) => {
  let readBy = get(message, "readBy", []);
  if (!Array.isArray(readBy)) {
    return false;
  }
  
  if (
    readBy.length > 1 &&
    get(message, "sender._id") === senderID
  )
    return true;
  else return false;
};

export const iReadThisMessageBefore = (message, senderID, selectChat) => {
  if (get(selectChat, "chat.type") === "user") {
    let readMe = get(message, "readBy", []);
    if (Array.isArray(readMe)) {
      readMe = readMe.filter((userId) => userId === senderID);
    }

    if (
      Array.isArray(readMe) &&
      readMe.length > 0 &&
      get(message, "sender._id") !== senderID
    ) {
      return true;
    } else {
      return false;
    }
  } else {
    let readBy = get(message, "readBy", []);
    if (!Array.isArray(readBy)) {
      return false;
    }
    
    let readMe = readBy.filter((userId) => userId === senderID);

    if (
      Array.isArray(readBy) &&
      readBy.length > 0 &&
      readBy.length > 1 &&
      get(message, "sender._id") !== senderID
    )
      return true;
    else return false;
  }
};

export const getNofiy = (notifys, chat) => {
  let num = 0;
  for (const notify of notifys) {
    if (get(notify, "chat.type") === "user" && get(chat, "type") === "user") {
      if (get(notify, "sender._id") === get(chat, "_id")) {
        num++;
      }
    }
    if (get(notify, "chat.type") === "group" && get(chat, "type") === "group") {
      if (get(notify, "chat._id") === get(chat, "_id")) {
        num++;
      }
    }
  }

  return num > 0 ? num : false;
};

export const getGroupsNofiy = (notifys) => {
  let num = 0;
  for (const notify of notifys) {
    if (get(notify, "chat.type") === "group") {
      num++;
    }
  }

  return num > 0 ? num : false;
};

export const getUsersNofiy = (notifys) => {
  let num = 0;
  for (const notify of notifys) {
    if (get(notify, "chat.type") === "user") {
      num++;
    }
  }

  return num > 0 ? num : false;
};

// A comparer used to determine if two entries are equal.
const isSameUser = (a, b) => get(a, "_id") === get(b, "_id");

// Get items that only occur in the left array,
// using the compareFunction to determine equality.
export const onlyInLeft = (left, right) =>
  left.filter(
    (leftValue) =>
      !right.some((rightValue) => isSameUser(leftValue, rightValue))
  );
const getNameForInstedImg = (name) => {
  let splitName = name.split(" ");
  if (size(splitName) > 1) {
    return `${splitName[0].charAt(0)}${splitName[1].charAt(0)}`;
  } else {
    return `${splitName[0].charAt(0)}${splitName[0].charAt(1)}`;
  }
};

export const checkUserSelectThisChat = (selectChat, newMessage) => {
  let selectedChatId = get(selectChat, "chat._id");
  let senderId = get(newMessage, "sender._id");
  let chatId = get(newMessage, "chat._id");
  let chatType = get(selectChat, "chat.type");
  if (
    selectedChatId &&
    ((chatType === "group" &&
      chatType === get(newMessage, "chat.type") &&
      selectedChatId === chatId) ||
      (chatType === "user" &&
        chatType === get(newMessage, "chat.type") &&
        selectedChatId === senderId))
  ) {
    return true;
  } else {
    return false;
  }
};

export const getChatLogo = (selectChat, myID) => {
  const chatType = get(selectChat, "type");
  const hasLogo =
    chatType === "group" ? get(selectChat, "pic") : get(selectChat, "pic");
  const chatLogo =
    chatType === "group" ? get(selectChat, "pic") : get(selectChat, "pic");

  return hasLogo ? (
    <CustomImg image={chatLogo} />
  ) : chatType === "group" ? (
    <div className="chatNameImg br-50">
      {getNameForInstedImg(get(selectChat, "name", "name"))}
    </div>
  ) : (
    <div className="chatNameImg br-50">
      {getNameForInstedImg(get(selectChat, "fullName", "name"))}
    </div>
  );
};

export const getFilteredChats = (chats, chatId) => {
  let menu =
    getKey("menu") == "null"
      ? "null"
      : getKey("menu") == "settings"
      ? "all"
      : getKey("menu");
  let filteredChats = [];
  if (chatId === "groups") {
    filteredChats = chats.filter((chat) => chat.type === "group");
  } else if (chatId === "all") {
    filteredChats = chats;
  } else if (chatId !== "all" && chatId !== "group" && chatId !== "users") {
    filteredChats = chats.filter((chat) => chat.type !== "group");
  } else if (chatId !== "group") {
    filteredChats = chats.filter((chat) => chat.type !== "group");
  }
  return filteredChats;
};

export const getMonth = (num) => {
  const month = [
    "Yanvar",
    "Fevral",
    "Mart",
    "Aprel",
    "May",
    "iyul",
    "iyun",
    "Avgust",
    "sentabr",
    "oktabr",
    "noyabr",
    "dekabr",
  ];
  return month[num - 1];
};
export const getDate = (date) => {
  const today = new Date();
  const messageMonth = format(new Date(date), "MM");
  const messageDay = format(new Date(date), "d");
  if (`${date}` == format(today, "yyyy/MM/dd")) {
    return <span className="message-date-group-date">Bugun</span>;
  } else {
    return (
      <span className="message-date-group-date">
        {messageDay}-{getMonth(messageMonth)}
      </span>
    );
  }
};

let tim;
export const searchUser = (data, userId, response) => {
  tim = setTimeout(async () => {
    socket.emit("search:user", { user: data, userId }, (res) => {
      response(res);
    });
    clearTimeout(tim);
  }, 500);
};
