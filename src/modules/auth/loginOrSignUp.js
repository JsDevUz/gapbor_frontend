

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
  const [loginMethod, setLoginMethod] = useState('google'); // 'google', 'email', or 'token'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false); // login or register mode
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
    if (!email || !password || (isRegistering && !fullName)) {
      setErr({ message: isRegistering ? "Barcha maydonlarni to'ldiring" : "Email va passwordni kiriting" });
      return;
    }

    setLoading(true);
    setErr([]);

    try {
      const url = isRegistering ? 'http://192.168.100.253:5001/api/auth/register' : 'http://192.168.100.253:5001/api/auth/login';
      const body = isRegistering ? { email, password, fullName } : { email, password };
      
      const response = await axios.post(url, body);

      if (response.data.isOk) {
        setKey("token", response.data.token);
        setMe(response.data.user);
        navigate("/");
      } else {
        setErr({ message: response.data.message || "Xatolik" });
      }
    } catch (error) {
      console.error("Email auth error:", error);
      const errorMessage = error.response?.data?.message || `Server xatoligi, qayta urinib ko'ring ${error}`;
      setErr({ message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const tokenLogin = async () => {
    if (!token) {
      setErr({ message: "JWT tokenni kiriting" });
      return;
    }

    setLoading(true);
    setErr([]);

    try {
      // Token bilan user ma'lumotlarini olish
      const response = await axios.post('http://192.168.100.253:5001/1/api/auth/getme', {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data) {
        setKey("token", token);
        setMe(response.data);
        navigate("/");
      } else {
        setErr({ message: `Noto'g'ri token ${response.data}` });
      }
    } catch (error) {
      console.error("Token auth error:", error);
      const errorMessage = error.response?.data?.message || `Noto'g'ri token, qayta urinib ko'ring ${error}`;
      setErr({ message: errorMessage });
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
          <button 
            className={`tab-btn ${loginMethod === 'token' ? 'active' : ''}`}
            onClick={() => setLoginMethod('token')}
          >
            Token
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
        ) : loginMethod === 'token' ? (
          <>
            <span className="fs-17 mg-t-10 mg-b-20">
              JWT token bilan kirishingiz mumkin
            </span>
            <div className="email-login-form">
              <div className="input-group">
                <FiLock className="input-icon" />
                <textarea
                  placeholder="JWT tokenni shu yerga kiriting..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="login-input token-textarea"
                  rows={4}
                  style={{ resize: 'vertical', minHeight: '80px' }}
                />
              </div>
              <button 
                className="login-btn email-login-btn" 
                onClick={tokenLogin}
                disabled={loading}
              >
                {loading ? 'Kutilmoqda...' : 'Token bilan kirish'}
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="fs-17 mg-t-10 mg-b-20">
              Email va parol bilan kirishingiz mumkin
            </span>
            
            {/* Login/Register switch */}
            <div className="auth-switch">
              <button 
                className={`switch-btn ${!isRegistering ? 'active' : ''}`}
                onClick={() => setIsRegistering(false)}
              >
                Kirish
              </button>
              <button 
                className={`switch-btn ${isRegistering ? 'active' : ''}`}
                onClick={() => setIsRegistering(true)}
              >
                Ro'yxatdan o'tish
              </button>
            </div>

            <div className="email-login-form">
              {isRegistering && (
                <div className="input-group">
                  <FiMail className="input-icon" />
                  <input
                    type="text"
                    placeholder="To'liq ism"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="login-input"
                  />
                </div>
              )}
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
                {loading ? 'Kutilmoqda...' : (isRegistering ? "Ro'yxatdan o'tish" : 'Kirish')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
