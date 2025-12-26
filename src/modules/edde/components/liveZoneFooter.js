import React from "react";
import { FaMicrophoneLines, FaMicrophoneLinesSlash, FaPersonDrowning } from "react-icons/fa6";
import { IoMdVolumeOff } from "react-icons/io";
import { IoHandLeftSharp, IoVolumeHigh } from "react-icons/io5";
function LiveZoneFooter() {
  return (
    <div className="livezone-footer">
      <input placeholder="comment..."  className="livezone-comment-input"/>
      <IoVolumeHigh size={30} />
      <IoMdVolumeOff size={25} />
      <FaMicrophoneLines size={25} />
      <FaMicrophoneLinesSlash size={30} />
      <IoHandLeftSharp size={35} className="rise-hand-icon" />
    </div> 
  );
}

export default LiveZoneFooter;
