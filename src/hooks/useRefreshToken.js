import axios from "services/api/axios";

const useRefreshToken = () => {
  const refresh = async () => {
    try {
      const response = await axios.get("/auth0/accounts/refresh", {
        withCredentials: true,
      });
      return response.data.accessToken;
    } catch (e) {
      if (e.response.status === 401) {
        // window.location.href = "/auth/login-or-signup";
      }
    }
  };
  return refresh;
};

export default useRefreshToken;
