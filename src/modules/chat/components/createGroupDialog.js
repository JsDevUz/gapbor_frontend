import classNames from "classnames";
import useGetMe from "hooks/useGetMe";
import useModal from "hooks/useModal";
import { get, size } from "lodash";
import { useEffect, useState } from "react";
import { IoClose } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { socket } from "services/socket";
import Field from "../../../containers/field";
import FormDemo from "../../../containers/form";
import { searchUser } from "utils";
import CustomImg from "components/image";
let tim;

export const CreateGroupDialog = ({ chat }) => {
  const navigate = useNavigate();

  const [steps, setSteps] = useState(1);
  const [chatName, setChatName] = useState("");
  const [searchChats, setSearchChats] = useState([]);
  const [users, setusers] = useState([]);
  const { setDialog, chats, setToast, setChats } = useModal();
  const [usersId, setusersId] = useState([]);
  const { getMe } = useGetMe();

  const addUser = (user) => {
    if (size(users.filter((u) => u._id === user._id)) == 0) {
      setusers((prev) => [...prev, user]);
      setusersId((prev) => [...prev, user._id]);
    }
  };
  const deleteUser = (userId) => {
    setusers(users.filter((user) => get(user, "_id") !== userId));
    setusersId(usersId.filter((id) => id !== userId));
  };
  const getValueFromField = (data, name) => {
    if (name === "name") {
      setChatName(data);
    }
    if (name === "user") {
      clearTimeout(tim);
      if (size(data) === 0) return setSearchChats([]);

      searchUser(data, getMe._id, (res) => {
        if (res.isOk) {
          setSearchChats(res.users);
        } else {
          setToast({
            toast: true,
            text: get(res, "message"),
          });
        }
      });
    }
  };

  useEffect(() => {}, []);
  const create = async ({ data }) => {
    if (size(data.name) < 1) {
      setToast({
        toast: true,
        text: "guruh nomi qisqa",
      });
      return;
    }
    socket.emit(
      "group:create",
      {
        name: data.name,
        chatLogo: data.chatLogo,
        users: [...users, getMe],
        creator: get(getMe, "_id"),
      },
      (res) => {
        if (res.isOk) {
          if (
            size(
              chats.filter((chat) => get(chat, "_id") === get(res, "chat._id"))
            ) === 0
          ) {
            setChats((prev) => [...prev, get(res, "chat")]);
          }
          setDialog({ dialog: false });
          navigate(`/chats/${get(res, "chat._id")}`);
        } else {
          setToast({
            toast: true,
            text: get(res, "message"),
          });
        }
      }
    );
  };

  return (
    <div className="create-group">
      <div className="box">
        <IoClose onClick={() => setDialog({ dialog: false })} size={25} />
        <FormDemo
          formRequest={(e) => create(e)}
          getValueFromField={getValueFromField}
        >
          <div className={classNames("first-step", { hidden: steps !== 1 })}>
            <Field
              type={"dropzone"}
              name="chatLogo"
              className="dropzone"
              defaultValue={get(chat, "chatLogo")}
            />
            <Field
              name="name"
              label="Guruh nomi"
              params={{ required: true }}
              defaultValue={get(chat, "name")}
              placeholder="..."
            />
            <button
              className={classNames("submit", {
                disable: size(chatName) === 0,
              })}
              type="button"
              onClick={() => size(chatName) > 0 && setSteps(2)}
            >
              Keyingisi
            </button>
          </div>

          <div className={classNames("second-step", { hidden: steps !== 2 })}>
            <div className="group-users-wrapper">
              {users?.map((user) => (
                <div className="group-users" key={user._id}>
                  <span>{user.fullName}</span>
                  {get(user, "_id") !== get(getMe, "_id") && (
                    <IoClose
                      color="rgb(255 7 7)"
                      onClick={() => deleteUser(user._id)}
                      size={20}
                    />
                  )}
                </div>
              ))}
            </div>
            <Field name="user" placeholder="Qidirish" />
            <div className="chats-list">
              Qidirilgan odamlar:
              {size(searchChats) > 0 ? (
                searchChats.map((chat, i) => (
                  <div
                    key={get(chat, "_id")}
                    className={classNames("message-row group", {
                      selected: usersId.includes(get(chat, "_id")),
                    })}
                    onClick={() => addUser(chat)}
                  >
                    <div className={classNames("message-user-logo")}>
                      <CustomImg image={get(chat, "pic")} />
                    </div>
                    <div className="message-user-data">
                      <div className="user-data-top">
                        <span className="message-user-name">
                          {get(chat, "type") === "group"
                            ? get(chat, "name")
                            : get(chat, "fullName")}
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
              <button className="submit" type="submit">
                Yaratish
              </button>
            </div>
          </div>
        </FormDemo>
      </div>
    </div>
  );
};
