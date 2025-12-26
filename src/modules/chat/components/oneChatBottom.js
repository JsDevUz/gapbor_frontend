import Field from "containers/field";
import FormDemo from "containers/form";
import { useEffect, useRef } from "react";
import { BiSend } from "react-icons/bi";
import { FaPen } from "react-icons/fa";
import { IoArrowRedoSharp, IoClose } from "react-icons/io5";

function OneChatBottom({
  selectedMessage,
  messageWritting,
  sendMessage,
  setSelectedMessage,
  selectedChatMessages,
  controllRef,
}) {
  // const controllRef = useRef();
  const sendMessageData = (message) => {
    controllRef.current.resetMyField();
    sendMessage(message);
  };
  useEffect(() => {
    controllRef.current.resetMyField();
  }, [selectedChatMessages]);
  return (
    <FormDemo
      getValueFromField={(e, name) => name === "message" && messageWritting(e)}
      formRequest={({ data }) => sendMessageData(data.message)}
    >
      <div className="one-chat-bottom">
        {selectedMessage && (
          <div className="addition-div">
            {selectedMessage.action == "replay" ? (
              <IoArrowRedoSharp size={25} />
            ) : (
              <FaPen />
            )}
            <div className="replay-message-wrapper">
              <span className="replay-user">
                {selectedMessage.message.sender.fullName}
              </span>
              <span className="replay-message">
                {selectedMessage.message.content}
              </span>
            </div>

            <IoClose
              onClick={() => {
                setSelectedMessage(null);
              }}
              size={25}
            />
          </div>
        )}
        <div className="one-chat-bottom-wrapper">
          <Field
            type={"textarea"}
            name="message"
            // controllRef={messageInput}
            controllRef={controllRef}
            placeholder="Xabar"
          />

          <button className="btn def pd-0">
            <BiSend
              type="submit"
              size={30}
              color="var(--color-dark-menus-click-background)"
            />
          </button>
        </div>
      </div>
    </FormDemo>
  );
}

export default OneChatBottom;
