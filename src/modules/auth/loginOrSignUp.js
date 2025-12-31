

import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import useGetMe from "hooks/useGetMe";
import jwt_decode from "jwt-decode";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "services/socket";
import { setKey } from "services/storage";
import { FcGoogle } from "react-icons/fc";
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff } from "react-icons/fi";

export const LoginOrSignup = () => {
  const [err, setErr] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { setMe } = useGetMe();

  const socketLogin = (res) => {
    socket.emit(
      "loginOrSignup",
      {
        name: res.data?.name,
        pic: res.data?.picture,
        email: res.data?.email,
      },
      (response) => {
        if (response.isOk) {
          setKey("token", res.token);
          setMe(res.user);
          navigate("/");
        } else {
          setErr({ message: response.message });
        }
      }
    );
  };

  const emailLogin = async () => {
    if (!email || !password || (isRegistering && !fullName)) {
      setErr({ message: isRegistering ? "Please fill in all fields" : "Please enter email and password" });
      return;
    }

    setLoading(true);
    setErr([]);

    try {
      const url = isRegistering ? 'https://gapbor-server.onrender.com/api/auth/register' : 'https://gapbor-server.onrender.com/api/auth/login';
      const body = isRegistering ? { email, password, fullName } : { email, password };
      
      const response = await axios.post(url, body);

      if (response.data.isOk) {
        setKey("token", response.data.token);
        setMe(response.data.user);
        navigate("/");
      } else {
        setErr({ message: response.data.message || "Authentication failed" });
      }
    } catch (error) {
      console.error("Email auth error:", error);
      const errorMessage = error.response?.data?.message || "Server error. Please try again.";
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
          socketLogin(res);
        })
        .catch((error) => {
          console.warn(JSON.stringify(error, null, 4));
        });
    },
  });

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setErr([]);
  };

  const toggleMode = () => {
    clearForm();
    setIsRegistering(!isRegistering);
  };

  return (
    <div className="login-or-signup" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo/Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            color: 'white', 
            marginBottom: '10px' 
          }}>
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>
            {isRegistering ? 'Sign up to get started' : 'Sign in to your account'}
          </p>
        </div>

        {/* Error Display */}
        {err.message && (
          <div style={{
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            color: '#c00',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <svg style={{ width: '20px', height: '20px', marginRight: '8px' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 0116 0zm-1 1a1 1 0 110 2 1 1 0 01-2 0zm3-1a1 1 0 100 2 1 1 0 002 0z" clipRule="evenodd" />
              </svg>
              <span>{err.message}</span>
            </div>
          </div>
        )}

        {/* Email Login/Register Form */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {isRegistering && (
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '8px' 
                }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <FiUser style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: '12px', 
                    color: '#9ca3af' 
                  }} />
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{
                      width: '100%',
                      paddingLeft: '40px',
                      paddingRight: '12px',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '8px' 
              }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <FiMail style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '12px', 
                  color: '#9ca3af' 
                }} />
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    paddingLeft: '40px',
                    paddingRight: '12px',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '8px' 
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <FiLock style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '12px', 
                  color: '#9ca3af' 
                }} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && emailLogin()}
                  style={{
                    width: '100%',
                    paddingLeft: '40px',
                    paddingRight: '40px',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '12px',
                    background: 'none',
                    border: 'none',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    padding: '0'
                  }}
                >
                  {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
              </div>
            </div>

            {/* Login/Register Toggle */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginBottom: '8px' 
            }}>
              <button 
                type="button"
                onClick={toggleMode}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '14px',
                  color: '#4f46e5',
                  cursor: 'pointer',
                  fontWeight: '500',
                  textDecoration: 'underline'
                }}
              >
                {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>

            <button 
              onClick={emailLogin}
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 16px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '500',
                borderRadius: '8px',
                color: 'white',
                backgroundColor: '#4f46e5',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'all 0.2s',
                boxSizing: 'border-box'
              }}
            >
              {loading ? (
                <>
                  <svg style={{ 
                    animation: 'spin 1s linear infinite', 
                    marginRight: '12px', 
                    height: '20px', 
                    width: '20px' 
                  }} fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V8C4 4.585 6.585 2 12s2-8 8-8 2.585 0 5.415 2 8 2zm2 2a2 2 0 100 4 2 2 0 004 0z"></path>
                  </svg>
                  {isRegistering ? 'Creating account...' : 'Signing in...'}
                </>
              ) : (
                <>
                  <FiMail style={{ marginRight: '8px' }} />
                  {isRegistering ? 'Create Account' : 'Sign In'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Google Login - Secondary Option */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '16px' 
          }}>
            <div style={{ 
              flex: 1, 
              height: '1px', 
              backgroundColor: '#e5e7eb' 
            }}></div>
            <span style={{ 
              padding: '0 16px', 
              fontSize: '12px', 
              color: '#6b7280',
              textTransform: 'uppercase',
              fontWeight: '500'
            }}>
              Or continue with
            </span>
            <div style={{ 
              flex: 1, 
              height: '1px', 
              backgroundColor: '#e5e7eb' 
            }}></div>
          </div>
          
          <button 
            onClick={() => login()}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '8px',
              color: '#374151',
              backgroundColor: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxSizing: 'border-box'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#f9fafb';
              e.target.style.borderColor = '#9ca3af';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.borderColor = '#d1d5db';
            }}
          >
            <FcGoogle size={20} style={{ marginRight: '8px' }} />
            Continue with Google
          </button>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
          <p>By continuing, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
