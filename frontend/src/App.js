import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

export default function App() {
  return (
    <Router>
      <nav>
        <Link to="/hello">Hello</Link> | <Link to="/welcome">Welcome</Link> |{" "}
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

  const handleSend = () => {
    fetch("http://127.0.0.1:8000/api/send/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    })
      .then((res) => res.json())
      .then((data) => setResponse("Sent: " + data.message))
      .catch((err) => setResponse("Error: " + err));
  };

  return (
    <div>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Введите текст"
      />
      <button onClick={handleSend}>Отправить</button>
      <p>{response}</p>
    </div>
  );
}

