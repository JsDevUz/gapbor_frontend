import classNames from "classnames";
import Field from "containers/field";
import FormDemo from "containers/form";
import useGetMe from "hooks/useGetMe";
import useModal from "hooks/useModal";
import { get, size } from "lodash";
import React from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "services/socket";

function EditProfile() {
  const { getMe, setMe } = useGetMe();
  const { setToast } = useModal();
  const navigate = useNavigate();

  const editProfile = ({ data }) => {
    socket.emit("edit:me", { ...data, userId: getMe._id }, (res) => {
      if (res.isOk) {
        setMe(res.me);
        setToast({
          toast: true,
          text: "Saqlandi",
        });
        navigate("/settings");
      } else {
        setToast({
          toast: true,
          text: get(res, "message"),
        });
      }
    });
  };
  return (
    <div className="editProfile">
      <FormDemo formRequest={(e) => editProfile(e)}>
        <Field
          type={"dropzone"}
          name="pic"
          className="dropzone"
          defaultValue={get(getMe, "pic")}
        />
        <Field
          name="fullName"
          label="CHATNAME"
          params={{ required: true }}
          defaultValue={get(getMe, "fullName")}
          placeholder="chat name"
        />
        <button className="btn def">Saqlash</button>
      </FormDemo>
    </div>
  );
}

export default EditProfile;
