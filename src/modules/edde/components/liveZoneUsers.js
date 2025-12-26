import React from "react";
import CustomImg from "components/image";

function LiveZoneUsers() {
  return (
    <div className="livezone-users">
      <div className="live-zone-members-list">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2].map(() => (
          <div className="live-zone-one-person">
            <div className="live-zone-one-person-pic-wrapper">
              <CustomImg
                className="live-zone-one-person-pic"
                image={
                  "https://i.pinimg.com/474x/98/51/1e/98511ee98a1930b8938e42caf0904d2d.jpg"
                }
              />
              <CustomImg
                className="live-zone-one-person-country-pic"
                image={
                  "https://static.vecteezy.com/system/resources/previews/016/328/589/non_2x/uzbekistan-flat-rounded-flag-icon-with-transparent-background-free-png.png"
                }
              />
            </div>

            <span className="live-zone-one-person-name">Lucy</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LiveZoneUsers;
