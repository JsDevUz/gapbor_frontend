import { ErrorMessage } from "@hookform/error-message";
import classNames from "classnames";
import { get } from "lodash";
import { useEffect, useImperativeHandle } from "react";

const Input = ({
  register,
  unregister,
  disabled = false,
  name,
  errors,
  params,
  property,
  defaultValue,
  resetField,
  clearErrors,
  getValues,
  watch,
  className,
  hideLabel,
  label,
  setValue,
  getValueFromField = () => {},
  hideError = false,
  maxLength = 524288,
  minLength = 1,
  setError,
  placeholder,
  controllRef,
  ...rest
}) => {
  useEffect(() => {
    getValueFromField(getValues(name), name, setError, clearErrors);
    if (getValues(name) == undefined) setValue(name, defaultValue);
  }, [watch(name)]);

  useEffect(() => {
    if (getValues(name) === "" || getValues(name) !== defaultValue)
      setValue(name, defaultValue);
  }, [defaultValue]);

  useImperativeHandle(controllRef, () => ({
    resetMyField() {
      resetField(name);
    },
  }));

  return (
    <div
      className={classNames(name, "form-input-wrapper", {
        hidden: get(property, "type") === "hidden",
      })}
    >
      {hideLabel ? null : (
        <span className=" column bold fs-12 uppercase mg-b-5">{label}</span>
      )}
      <div className={"wrapper br-10"}>
        <input
          className={`form-input ${name}`}
          name={name}
          {...register(name, params)}
          readOnly={get(property, "disabled")}
          placeholder={get(property, "placeholder", placeholder)}
          type={get(property, "type", "text")}
          defaultValue={defaultValue}
          autoComplete="false"
          disabled={disabled}
          maxLength={maxLength}
          minLength={minLength}
        />
      </div>
      {!hideError && (
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
              messages = `${label} ${errors[name].message}`;
            }
            return <small className="form-error-message">{messages}</small>;
          }}
        />
      )}
    </div>
  );
};

export default Input;
