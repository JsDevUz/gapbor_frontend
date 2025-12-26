import React from "react";

function LiveZoneChats() {
  return (
    <div className="livezone-chats">
      {[1, 2, 3, 4, 4, 5, 6].map((a) => (
        <div className="live-chat-comment">LiveZoneChat</div>
      ))}
    </div>
  );
}

export default LiveZoneChats;
