import classNames from "classnames";
import useModal from "hooks/useModal";
import { get } from "lodash";
import { Puff } from "react-loader-spinner";

function Loading() {
  const { loading } = useModal();
  return (
    <div
      className={classNames("loading-wrapper", {
        hidden: !get(loading, "loading"),
        small: get(loading, "small"),
      })}
    >
      <Puff
        height="80"
        width="80"
        color="#4fa94d"
        className="loading-puff"
        secondaryColor="#4fa94d"
        radius="12.5"
        ariaLabel="mutating-dots-loading"
        wrapperStyle={{}}
        wrapperClass="loading-puff"
        visible={true}
      />
    </div>
  );
}

export default Loading;
