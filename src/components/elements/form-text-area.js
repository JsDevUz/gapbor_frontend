import { get } from "lodash";
import { useEffect, useImperativeHandle, useRef } from "react";

const TextArea = ({
  register,
  disabled = false,
  name,
  errors,
  params,
  property,
  defaultValue,
  getValues,
  watch,
  hideLabel,
  label,
  setValue,
  getValueFromField = () => {},
  hideError = false,
  maxLength = 524288,
  minLength = 1,
  placeholder,
  resetField,
  controllRef,
  setFocus,
  ...rest
}) => {
  const messageInputRef = useRef();
  useEffect(() => {
    getValueFromField(getValues(name), name);
    if (getValues(name) == undefined) setValue(name, defaultValue);
  }, [watch(name)]);

  useImperativeHandle(controllRef, () => ({
    resetMyField() {
      resetField(name);
    },
    focus() {
      setFocus(name);
      // messageInputRef.current.focus();
    },
    setValue(value) {
      setValue(name, value);
    },
  }));

  useEffect(() => {
    if (getValues(name) === "" || getValues(name) !== defaultValue)
      setValue(name, defaultValue);
  }, [defaultValue]);
  return (
    <>
      <textarea
        className={`form-textarea ${name}`}
        name={name}
        {...register(name, params)}
        // ref={messageInputRef}
        readOnly={get(property, "disabled")}
        placeholder={get(property, "placeholder", placeholder)}
        type={get(property, "type", "text")}
        defaultValue={defaultValue}
        autoComplete="off"
        disabled={disabled}
        maxLength={maxLength}
        minLength={minLength}
      />
    </>
  );
};

export default TextArea;
