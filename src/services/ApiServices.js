import { get } from "lodash";
import { request } from "./api/newAxios";

class ApiServices {
  static async getMe() {
    try {
      const res = await request.post(`api/auth/getme`);
      // console.log(res, "fff");
      if (get(res, "status", 400) == 200 && get(res, "data", false)) {
        return { isOk: true, ...res };
      } else {
        return {
          isOk: false,
          message: get(res, "data.message", "Server eirror"),
        };
      }
    } catch (e) {
      console.log(e);
      return {
        isOk: false,
        message: get(e, "response.data.message", "Server error 2"),
      };
    }
  }
}

export default ApiServices;
