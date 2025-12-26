import useGetMe from "hooks/useGetMe";
import useModal from "hooks/useModal";
import { get, size } from "lodash";
import { memo, useState } from "react";
import { BiSearch } from "react-icons/bi";
import { IoClose } from "react-icons/io5";
import { useParams } from "react-router-dom";
import { socket } from "services/socket";
import { getKey } from "services/storage";
import { getFilteredChats } from "utils";
import OneChatRow from "./oneChatRow";
import SearchOneChatRow from "./searchOneChatRow";
import OutsideClickHandler from "react-outside-click-handler";
let tim;
const ChatsList = ({ selectChatFunc = () => {} }) => {
  const [searchChats, setSearchChats] = useState([]);
  const [openSearch, setOpenSearch] = useState(false);
  const { chatId } = useParams();
  const { getMe } = useGetMe();
  const { setChats, setToast, chats, selectChat, setSelectChat } = useModal();

  const filteredChats = getFilteredChats(chats, chatId);
  const myId = get(getMe, "_id");
  const leaveChat = async (chat) => {
    socket.emit(
      "chat:leave",
      {
        chat,
        userId: myId,
        token: getKey("token"),
      },
      (res) => {
        if (res.isOk) {
          let newChats = chats.filter((ch) => ch._id !== chat._id);
          setChats([...newChats]);
          if (get(selectChat, "chat._id") === chat._id) {
            setSelectChat({});
          }
        } else {
          setToast({
            toast: true,
            text: get(res, "message"),
          });
        }
      }
    );
  };
  const search = async (event) => {
    setOpenSearch(true);
    clearTimeout(tim);
    let value = get(event, "target.value");

    if (size(value) === 0) return setOpenSearch(false);

    tim = setTimeout(async () => {
      socket.emit("search:chat", { title: value, userId: myId }, (res) => {
        if (res.isOk) {
          setSearchChats(res.data);
        } else {
          setToast({
            toast: true,
            text: get(res, "message"),
          });
        }
      });
      clearTimeout(tim);
    }, 500);
  };

  const joinChat = async (chatId) => {
    setOpenSearch(false);
    selectChatFunc(chatId);
  };
  return (
    <div className="chats-wrapper">
      <OutsideClickHandler
        onOutsideClick={() => {
          setOpenSearch(false);
        }}
      >
        <div className="searchbar">
          <BiSearch className="search-icon" />
          <input
            onChange={(e) => search(e)}
            type="text"
            className="search-text"
            placeholder="Search..."
          />
          {openSearch && <IoClose onClick={() => setOpenSearch(false)} />}

          {openSearch && (
            <div className="search-result">
              {size(searchChats) > 0 ? (
                searchChats.map((chat, i) => (
                  <SearchOneChatRow
                    joinChat={joinChat}
                    chat={chat}
                    myId={myId}
                    key={get(chat, "_id")}
                  />
                ))
              ) : (
                <span className="nochat">User not found</span>
              )}
            </div>
          )}
        </div>
      </OutsideClickHandler>

      <div className="messages-wrapper">
        <div className="messages-list">
          {size(filteredChats) === 0 ? (
            <span className="nochat">Sizda suhbatlar mavjud emas</span>
          ) : (
            filteredChats.map((chat, i) => (
              <OneChatRow
                selectChatFunc={selectChatFunc}
                leaveChat={leaveChat}
                chat={chat}
                key={chat._id}
                myId={myId}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
export default memo(ChatsList);
