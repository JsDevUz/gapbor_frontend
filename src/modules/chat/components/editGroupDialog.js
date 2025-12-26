import classNames from "classnames";
import useGetMe from "hooks/useGetMe";
import useModal from "hooks/useModal";
import { get, size } from "lodash";
import { useEffect, useState } from "react";
import { HiOutlineUserPlus, HiOutlineUsers } from "react-icons/hi2";
import { IoClose } from "react-icons/io5";
import { socket } from "services/socket";
import { onlyInLeft, searchUser } from "utils";
import Field from "../../../containers/field";
import FormDemo from "../../../containers/form";
import CustomImg from "components/image";
import { Link } from "react-router-dom";
let tim;

export const EditGroupDialog = ({ chat }) => {
  const [steps, setSteps] = useState(1);
  const [chatName, setChatName] = useState("");
  const [chatPic, setChatPic] = useState("");
  const [canSave, setCanSave] = useState(false);
  const [searchChats, setSearchChats] = useState([]);

  const [users, setusers] = useState([]);
  const { setDialog, setToast, dialog, chats, setSelectChat, setChats } =
    useModal();
  const [usersId, setusersId] = useState([]);
  const { getMe } = useGetMe();
  const detectChanges = () => {
    if (
      compareArray(users, chat?.users) ||
      chatName !== chat.name ||
      chatPic !== chat.pic
    ) {
      setCanSave(true);
    } else {
      setCanSave(false);
    }
  };
  useEffect(() => {
    if (chat) {
      setusers(chat.users);
      setusersId(chat.users.map((e) => e._id));
      setChatName(chat.name);
      setChatPic(chat.pic);
    }
  }, [dialog]);

  const addUser = (user) => {
    if (size(users.filter((u) => u._id == user._id)) == 0) {
      setusers((prev) => [...prev, user]);
      setusersId((prev) => [...prev, user._id]);
    }
  };
  const deleteUser = (user) => {
    let newUsers = users.filter((u) => u._id != user);
    setusers(newUsers);
    setusersId(usersId.filter((u) => u != user));
  };
  const compareArray = (first, second) => {
    let fistIds = first?.map((f) => f._id);
    let secondIds = second?.map((s) => s._id);
    let res =
      size(fistIds) === size(secondIds) &&
      fistIds.every((element, index) => element === secondIds[index]);
    return !res;
  };
  useEffect(() => {
    detectChanges();
  }, [users, chatName, chatPic]);
  const getValueFromField = (data, name) => {
    if (name == "name") {
      setChatName((p) => data);
    }
    if (name == "pic") {
      setChatPic(data);
    }

    if (name == "user") {
      clearTimeout(tim);
      if (size(data) == 0) return;
      searchUser(data, getMe._id, (res) => {
        if (res.isOk) {
          setSearchChats(res.users);
        } else {
          console.log(get(res, "message"));
        }
      });
    }
  };

  useEffect(() => {}, []);
  const edit = async ({ data }) => {
    if (size(data.name) < 1) {
      setToast({
        toast: true,
        text: "guruh nomi qisqa",
      });
      return;
    }
    const kikedUsersList = onlyInLeft(users, chat.users);
    const addedUsersList = onlyInLeft(chat.users, users);
    socket.emit(
      "group:edit",
      {
        chatId: chat._id,
        name: data.name,
        kikedUsersList,
        addedUsersList,
        pic: data.pic,
        users: usersId,
        creator: getMe._id,
      },
      (res) => {
        if (res.isOk) {
          setSelectChat((prev) => ({ ...prev, chat: res.chat }));

          chats.forEach((c, i) => {
            if (c._id == res.chat._id) {
              chats[i] = res.chat;
            }
          });
          setChats([...chats]);

          setDialog({ dialog: false });
        } else {
          setToast({
            toast: true,
            text: get(res, "message"),
          });
        }
      }
    );
  };
  const isAdmin = () => {
    return get(chat, "creator") == get(getMe, "_id");
  };
  return (
    <div className="create-group">
      <div className="box">
        <IoClose onClick={() => setDialog({ dialog: false })} size={25} />
        <FormDemo
          formRequest={(e) => edit(e)}
          getValueFromField={getValueFromField}
        >
          <div className={classNames("first-step", { hidden: steps !== 1 })}>
            {isAdmin() && (
              <>
                <Field
                  type={"dropzone"}
                  name="pic"
                  className="dropzone"
                  defaultValue={get(chat, "pic")}
                />
                <Field
                  name="name"
                  label="Guruh nomi"
                  params={{ required: true }}
                  defaultValue={get(chat, "name")}
                  placeholder=""
                />
              </>
            )}
            <div className="group-users-header">
              <div>
                <HiOutlineUsers size={25} />
                <span>{size(users)} ta a'zo</span>
              </div>

              {isAdmin() && (
                <HiOutlineUserPlus onClick={() => setSteps(2)} size={25} />
              )}
            </div>
            <div className="group-users-wrapper">
              {users?.map((user) => (
                <Link to={`/chats/${get(user, "_id")}`}>
                  <div key={user._id} className="message-row group">
                    <div className={classNames("message-user-logo")}>
                      <CustomImg image={get(user, "pic")} />
                    </div>
                    <div className="message-user-data">
                      <div className="user-data-top">
                        <span className="message-user-name">
                          {user.fullName}
                        </span>
                      </div>
                      <div className="user-data-bottom">
                        <span className="message-user-last-message">
                          yaqinda tarmoqda edi
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {isAdmin() && (
              <button
                className={classNames("submit", {
                  disable: !canSave,
                })}
                type="submit"
              >
                Saqlash
              </button>
            )}
          </div>

          <div className={classNames("second-step", { hidden: steps !== 2 })}>
            <div className="group-users-wrapper">
              {users?.map((e) => (
                <div className="group-users" key={e._id}>
                  <span>{e.fullName}</span>
                  {get(e, "_id") != get(getMe, "_id") && isAdmin() && (
                    <IoClose
                      color="rgb(255 7 7)"
                      onClick={() => deleteUser(e._id)}
                      size={20}
                    />
                  )}
                </div>
              ))}
            </div>
            <Field name="user" placeholder="Search user..." />
            <div className="chats-list">
              qidirilgan odamlar:
              {size(searchChats) > 0 ? (
                searchChats.map((chat, i) => (
                  <div
                    key={chat._id}
                    className={classNames("message-row group", {
                      selected: usersId.includes(chat._id),
                    })}
                    onClick={() => addUser(chat)}
                  >
                    <div className={classNames("message-user-logo")}>
                      <CustomImg image={get(chat, "pic")} />
                    </div>
                    <div className="message-user-data">
                      <div className="user-data-top">
                        <span className="message-user-name">
                          {chat.type === "group" ? chat.name : chat.fullName}
                        </span>
                      </div>
                      <div className="user-data-bottom">
                        <span className="message-user-last-message">
                          yaqinda tarmoqda edi
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <span className="nochat">natija topilmadi</span>
              )}
            </div>
            <div className="button-wrapper">
              <button
                className="submit"
                onClick={() => setSteps(1)}
                type="button"
              >
                Ortga
              </button>
            </div>
          </div>
        </FormDemo>
      </div>
    </div>
  );
};
