import TextArea from "components/elements/form-text-area";
import Input from "../components/elements/form-input";
import FormConsumer from "../context/form/FormConsumer";
import Singledropzone from "components/singledropzone";

const Field = ({ type, ...rest }) => {
  return (
    <>
      {((type) => {
        switch (type) {
          case "textarea":
            return (
              <FormConsumer>
                {({ attrs, getValueFromField }) => (
                  <TextArea
                    {...rest}
                    {...attrs}
                    getValueFromField={getValueFromField}
                  />
                )}
              </FormConsumer>
            );
          case "dropzone":
            return (
              <FormConsumer>
                {({ attrs, getValueFromField }) => (
                  <Singledropzone
                    {...rest}
                    {...attrs}
                    getValueFromField={getValueFromField}
                  />
                )}
              </FormConsumer>
            );
          default:
            return (
              <FormConsumer>
                {({ attrs, getValueFromField }) => (
                  <Input
                    {...rest}
                    {...attrs}
                    getValueFromField={getValueFromField}
                  />
                )}
              </FormConsumer>
            );
        }
      })(type)}
    </>
  );
};

export default Field;
