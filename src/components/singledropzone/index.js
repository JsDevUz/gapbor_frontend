import { ErrorMessage } from "@hookform/error-message";
import classNames from "classnames";
import CustomImg from "components/image";
import Field from "containers/field";
import useModal from "hooks/useModal";
import { getDroppedOrSelectedFiles } from "html5-file-selector";
import { get, size } from "lodash";
import { memo, useEffect, useState } from "react";
import Dropzone from "react-dropzone-uploader";
import "react-dropzone-uploader/dist/styles.css";
import { BsCameraFill } from "react-icons/bs";

const CustomInput = ({ name, errors, defaultValue, label }) => {
  const [file, setFile] = useState([]);
  const { loading, setToast, setLoading } = useModal();

  const handleSubmit = (files, allFiles) => {
    allFiles.forEach((f) => f.remove());
  };

  useEffect(() => {
    setFile(defaultValue);
  }, [defaultValue]);

  const Layout = ({ input, dropzoneProps, files, extra: { maxFiles } }) => {
    return (
      <div>
        <div {...dropzoneProps}>{size(files) < maxFiles && input}</div>
      </div>
    );
  };
  const getFilesFromEvent = (e) => {
    return new Promise((resolve) => {
      getDroppedOrSelectedFiles(e).then((chosenFiles) => {
        resolve(chosenFiles.map((f) => f.fileObject));
      });
    });
  };
  const Input = ({ accept, onFiles, getFilesFromEvent }) => {
    return (
      <>
        <div className={classNames({ donut: loading })}></div>
        <label>
          {size(file) ? (
            <CustomImg image={`${file}`} />
          ) : (
            <BsCameraFill size={40} />
          )}
          <input
            style={{ display: "none" }}
            type="file"
            accept={accept}
            multiple
            onChange={(e) => {
              getFilesFromEvent(e).then((chosenFiles) => {
                onFiles(chosenFiles);
              });
            }}
          />
        </label>
      </>
    );
  };
  const getUploadParams = ({ meta }) => {
    return {
      url: `${process.env.REACT_APP_PUBLIC_SERVER_URL}api/getFile/upload`,
    };
  };
  const handleChangeStatus = ({ xhr }, status) => {
    setLoading({ loading: true, small: true });
    if (
      status === "exception_upload" ||
      status === "error_upload" ||
      status === "aborted" ||
      status === "done"
    ) {
      setLoading({ loading: false });
    }
    if (status === "exception_upload" || status === "error_upload") {
      setToast({
        toast: true,
        text: "Rasim hajmi yoki turi mos kelmadi",
      });
    }
    if (status === "done") {
      setFile(JSON.parse(xhr.response).path);
    }
  };
  return (
    <>
      <Field
        type={"input"}
        hideLabel
        property={{ type: "hidden" }}
        label={"img"}
        defaultValue={file}
        name={name}
      />
      <Dropzone
        accept="image/*,audio/*,video/*,.pdf"
        getUploadParams={getUploadParams}
        onSubmit={handleSubmit}
        InputComponent={Input}
        onChangeStatus={handleChangeStatus}
        LayoutComponent={Layout}
        getFilesFromEvent={getFilesFromEvent}
      />
      <ErrorMessage
        errors={errors}
        name={name}
        render={({ messages = `${label} is required` }) => {
          if (errors[name].type === "required") {
            messages = `${label} is required`;
          }
          if (errors[name].type === "pattern") {
            messages = `${label} is not valid`;
          }
          if (errors[name].type === "manual") {
            messages = `${label} ${get(get(errors, name), "message")}`;
          }
          return <small className="form-error-message">{messages}</small>;
        }}
      />
    </>
  );
};

export default memo(CustomInput);
