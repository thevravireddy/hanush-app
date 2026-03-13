// src/pages/Auth.tsx
import React, { useState } from "react";
import axios from "axios";
import api from "../api";

const Auth = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    await api.post(`${import.meta.env.VITE_API_URL}/auth/register`, {
      username,
      password,
    });
    alert("Registered successfully!");
  };

  const handleLogin = async () => {
    const res = await api.post(`${import.meta.env.VITE_API_URL}/auth/login`, {
      username,
      password,
    });
    localStorage.setItem("token", res.data.access_token);
    alert("Logged in!");
  };

  return (
    <div style={{ maxWidth: 400, margin: "auto", padding: 20 }}>
      <h2>Login / Register</h2>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
      />
      <br />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <br />
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleRegister}>Register</button>
    </div>
  );
};

export default Auth;
