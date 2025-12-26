import useModal from "hooks/useModal";
import React, { useEffect } from "react";
import CustomImg from "components/image";
import LiveBoxes from "./containers/LiveBoxes";
import { SlArrowLeft } from "react-icons/sl";
import LiveZoneContainer from "./containers/LiveZone";
import { useParams } from "react-router-dom";

function LivesPage() {
  const { setLoading } = useModal();
  const { liveId } = useParams();

  useEffect(() => {
    setLoading({ loading: false });
  }, []);
  return (
    <>
      <div className="chats-wrapper settingsPage ">
        <div className=" ">
          <LiveBoxes />
        </div>
      </div>

      <LiveZoneContainer />
    </>
  );
}

export default LivesPage;
