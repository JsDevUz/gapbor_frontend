import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Main from "../modules/chat";
import React from "react";
import { IsAuth } from "../auth/isAuth";
import { IsGuest } from "../auth/isGuest";
import { NotFound } from "../modules/404";
import MainLayout from "layouts";
import AppLayout from "layouts/appLayout";
import SettingPage from "modules/settings/page";
import { LoginOrSignup } from "modules/auth/loginOrSignUp";
import AuthLayout from "layouts/authLayout";
import MeetPage from "pages/MeetPage";
// import LivesPage from "modules/live";

export const Router = () => {
  return (
    <BrowserRouter>
      <MainLayout>
        <IsAuth>
          <Routes>
            <Route path="*" element={<NotFound pag={"user"} />} />
            <Route element={<AppLayout />}>
              <Route
                path="/"
                element={<Navigate to="/chats/all" replace={true} />}
              />
              <Route path="/chats/:chatId" element={<Main />} />
              <Route path="/settings/:menu" element={<SettingPage />} />
              <Route path="/settings/" element={<SettingPage />} />
              {/* Meet routes */}
              <Route path="/meet/:meetId" element={<MeetPage />} />
              {/* <Route path="/lives/" element={<LivesPage />} /> */}
              {/* <Route path="/lives/:liveId" element={<LivesPage />} /> */}
            </Route>
          </Routes>
        </IsAuth>
        <IsGuest>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route
                path="*"
                element={<Navigate to="/auth/login-or-signup" replace={true} />}
              />
              <Route path="/auth/login-or-signup" element={<LoginOrSignup />} />
            </Route>
          </Routes>
        </IsGuest>
      </MainLayout>
    </BrowserRouter>
  );
};
