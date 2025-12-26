import axios from "axios";
import { Navigate } from "react-router-dom";
import { getKey, removeKey } from "services/storage";
const request = axios.create({
  baseURL: process.env.REACT_APP_PUBLIC_SERVER_URL,
  withCredentials: true,
  params: {},
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

request.interceptors.request.use(
  (request) => {
    const token = getKey("token");
    request.withCredentials = true;
    request.headers.Authorization = `Bearer ${token}`;
    return request;
  },
  (error) => {
    console.log("err");
  }
);

request.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const statusCode = error?.response?.status;
    if (statusCode == 401) {
      Navigate("/auth/login-or-signup");
      // window.location.href = "/auth/login-or-signup";
      removeKey("token");
    }
    return error.response;
  }
);

export { request };
