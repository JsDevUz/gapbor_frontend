import CustomImg from "components/image";
import useGetMe from "hooks/useGetMe";
import { get } from "lodash";
import { HiOutlineInformationCircle, HiOutlineUser } from "react-icons/hi";
import {
  HiOutlineKey,
  HiOutlineLockClosed,
  HiOutlinePaintBrush,
} from "react-icons/hi2";
import { SlArrowLeft } from "react-icons/sl";
import { Link, useNavigate, useParams } from "react-router-dom";
import EditProfile from "./pages/editProfile";
import { useEffect } from "react";
import useModal from "hooks/useModal";

function SettingPage() {
  const { getMe } = useGetMe();
  const { menu } = useParams();
  const { setLoading } = useModal();
  const navigate = useNavigate();
  useEffect(() => {
    setLoading({ loading: false });
  }, []);
  return (
    <>
      <div className="chats-wrapper settingsPage ">
        <div className=" ">
          <div
            className="y-center pd-20"
            onClick={() => navigate("/chats/all")}
          >
            <SlArrowLeft size={20} />
            <span className=" fs-20 mg-l-10">Sozlamalar</span>
          </div>

          <div className="y-center pd-20 ">
            <div className="user-sercle-img-container">
              <CustomImg
                className="user-sercle-img"
                image={get(getMe, "pic")}
              />
            </div>
            <div className="mg-l-20 column ellips-width">
              <span className="fs-20 bold ellips">{getMe.fullName}</span>
              <span className="ellips">{getMe.email}</span>
            </div>
          </div>
          <Link to={"/settings/me"} replace={true}>
            <div className="menu-container">
              <HiOutlineUser size={20} />
              <span className="mg-l-10">Tahrirlash</span>
            </div>
          </Link>
          <Link to={"/settings/privacy"} replace={false}>
            <div className="menu-container">
              <HiOutlineLockClosed size={20} />
              <span className="mg-l-10">Maxfiylik</span>
            </div>
          </Link>
          <Link to={"/settings/security"} replace={true}>
            <div className="menu-container">
              <HiOutlineKey size={20} />
              <span className="mg-l-10">Xavfsizlik</span>
            </div>
          </Link>
          <Link to={"/settings/theme"} replace={true}>
            <div className="menu-container">
              <HiOutlinePaintBrush size={20} />
              <span className="mg-l-10">Mavzu</span>
            </div>
          </Link>
          <Link to={"/chats/64ccea3bd1a52d2ed6ee1e48"} replace={true}>
            <div className="menu-container">
              <HiOutlineInformationCircle size={20} />
              <span className="mg-l-10">Yordam</span>
            </div>
          </Link>
        </div>
      </div>
      <div className="one-chat-wrapper settingsPage">
        {menu && (
          <>
            <div className="settings-header">
              <SlArrowLeft size={20} onClick={() => navigate("/settings")} />
              <span>Tahrirlash</span>
            </div>
            {menu === "me" ? (
              <EditProfile />
            ) : (
              <span className="pd-20">Tez kunda....</span>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default SettingPage;
