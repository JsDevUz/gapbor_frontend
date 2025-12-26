import classNames from "classnames";
import { GiClick } from "react-icons/gi";

function NoChatSelected() {
  return (
    <div className={classNames("noselect")}>
      <GiClick />
      <span>Biron suhbatni tanlang</span>
    </div>
  );
}

export default NoChatSelected;
