import { Controller, useForm } from "react-hook-form";
import FormProvider from "../context/form/FormProvider";

const FormDemo = ({
  children,
  formRequest,
  isFetched,
  footer = "",
  getValueFromField = () => {},

  mainClassName = "",
  ...rest
}) => {
  const {
    unregister,
    register,
    handleSubmit,
    setError,
    formState: { errors },
    getValues,
    setValue,
    watch,
    clearErrors,
    resetField,
    control,
    setFocus,
  } = useForm({ mode: "onSubmit" });

  const onSubmit = (data) => {
    formRequest({ data, unregister, setError, setValue });
  };
  const attrs = {
    Controller,
    register,
    unregister,
    errors,
    control,
    getValues,
    watch,
    setError,
    clearErrors,

    resetField,
    setValue,
    setFocus,
    ...rest,
  };
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      {...rest}
      className={mainClassName + "formdemo"}
    >
      <FormProvider value={{ attrs, getValueFromField }}>
        {children}
      </FormProvider>
      {footer}
    </form>
  );
};

export default FormDemo;
