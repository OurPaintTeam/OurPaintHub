import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

export default function App() {
  return (
    <Router>
      <nav style={{ marginBottom: "20px" }}>
        <Link to="/hello">Hello</Link> |{" "}
        <Link to="/welcome">Welcome</Link> |{" "}
        <Link to="/send">Send Message</Link>
      </nav>

      <Routes>
        <Route path="/hello" element={<Hello />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/send" element={<SendMessage />} />
      </Routes>
    </Router>
  );
}

function Hello() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/hello/")
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((err) => setMessage("Error: " + err));
  }, []);

  return <h1>{message}</h1>;
}

function Welcome() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/welcome/")
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((err) => setMessage("Error: " + err));
  }, []);

  return <h1>{message}</h1>;
}

function SendMessage() {
  const [text, setText] = useState("");
  const [response, setResponse] = useState("");

  const handleSend = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/send/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setResponse("Sent: " + data.message);
    } catch (err) {
      setResponse("Error: " + err.message);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Введите текст"
      />
      <button onClick={handleSend} style={{ marginLeft: "10px" }}>
        Отправить
      </button>
      <p>{response}</p>
    </div>
  );
}
