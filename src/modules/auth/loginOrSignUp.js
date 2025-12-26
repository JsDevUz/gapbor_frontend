import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import useGetMe from "hooks/useGetMe";
import jwt_decode from "jwt-decode";
import { get, size } from "lodash";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "services/socket";
import { setKey } from "services/storage";
import { FcGoogle } from "react-icons/fc";
import { FiMail, FiLock } from "react-icons/fi";

export const LoginOrSignup = () => {
  const [err, setErr] = useState([]);
  const [loginMethod, setLoginMethod] = useState('google'); // 'google' or 'email'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setMe } = useGetMe();
  const socketLogin = (res) => {
    console.log("defefe");
    socket.emit(
      "loginOrSignup",
      {
        name: get(res, "data.name"),
        pic: get(res, "data.picture"),
        email: get(res, "data.email"),
      },
      (res) => {
        if (res.isOk) {
          console.log("xammasi ok");
          setKey("token", get(res, "token"));
          setMe(get(res, "user"));
          navigate("/");
        } else {
          console.log("err log sock");
          setErr({ message: get(res, "message") });
        }
      }
    );
  };

  const emailLogin = async () => {
    if (!email || !password) {
      setErr({ message: "Email va passwordni kiriting" });
      return;
    }

    setLoading(true);
    setErr([]);

    try {
      const response = await axios.post('http://localhost:5001/api/auth/login', {
        email,
        password
      });

      if (response.data.isOk) {
        setKey("token", response.data.token);
        setMe(response.data.user);
        navigate("/");
      } else {
        setErr({ message: response.data.message || "Login xatoligi" });
      }
    } catch (error) {
      console.error("Email login error:", error);
      setErr({ message: "Server xatoligi, qayta urinib ko'ring" });
    } finally {
      setLoading(false);
    }
  };
  const login = useGoogleLogin({
    onError: (err) => console.log(err),
    onSuccess: async (res) => {
      axios
        .get(
          `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${res.access_token}`
        )
        .then((res) => {
          console.log(res);
          socketLogin(res);
        })
        .catch((error) => {
          console.warn(JSON.stringify(error, null, 4));
        });
    },
  });

  return (
    <div className="login-or-signup">
      <div className="container">
        {size(err) ? <div className="errors">{get(err, "message")}</div> : null}
        <span className="fs-20 bold">Suhbatga qo'shilish</span>
        
        {/* Login method tanlash */}
        <div className="login-method-tabs">
          <button 
            className={`tab-btn ${loginMethod === 'google' ? 'active' : ''}`}
            onClick={() => setLoginMethod('google')}
          >
            Google
          </button>
          <button 
            className={`tab-btn ${loginMethod === 'email' ? 'active' : ''}`}
            onClick={() => setLoginMethod('email')}
          >
            Email
          </button>
        </div>

        {loginMethod === 'google' ? (
          <>
            <span className="fs-17 mg-t-10 mg-b-20">
              Shunchaki google hisobingiz bilan bizning suhbatimizga qo'shiling!
            </span>
            <div className="login-btn" onClick={() => login()}>
              <FcGoogle size={30} /> Google orqali kirish
            </div>
          </>
        ) : (
          <>
            <span className="fs-17 mg-t-10 mg-b-20">
              Email va parol bilan kirishingiz mumkin
            </span>
            <div className="email-login-form">
              <div className="input-group">
                <FiMail className="input-icon" />
                <input
                  type="email"
                  placeholder="Email manzili"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input"
                />
              </div>
              <div className="input-group">
                <FiLock className="input-icon" />
                <input
                  type="password"
                  placeholder="Parol"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input"
                  onKeyPress={(e) => e.key === 'Enter' && emailLogin()}
                />
              </div>
              <button 
                className="login-btn email-login-btn" 
                onClick={emailLogin}
                disabled={loading}
              >
                {loading ? 'Kirilmoqda...' : 'Kirish'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
