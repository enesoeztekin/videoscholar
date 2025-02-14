import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import VideoPlayer from './components/VideoPlayer';
import StudentAuth from './components/StudentAuth';
import ResearcherPanel from './components/ResearcherPanel';
import ResearcherLogin from './components/ResearcherLogin';
import CreateVideo from './components/CreateVideo';
import ViewInteractions from './components/ViewInteractions';
import MainPage from './components/MainPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/watch/:trackingId" element={<WatchWrapper />} />
          <Route path="/video" element={<VideoWrapper />} />
          <Route path="/researcher-login" element={<ResearcherLogin />} />
          <Route path="/student-login" element={<StudentAuth />} />
          <Route path="/researcher-panel" element={<ResearcherPanel />} />
          <Route path="/create-video" element={<CreateVideo />} />
          <Route path="/view-interactions" element={<ViewInteractions />} />
          <Route path="/" element={<MainPage />} />
        </Routes>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </div>
    </Router>
  );
}

// Video sayfası için wrapper bileşen
function VideoWrapper() {
  const location = useLocation();
  const email = location.state?.email;
  const trackingId = location.state?.trackingId;

  // Email veya trackingId yoksa login sayfasına yönlendir
  if (!email || !trackingId) {
    return <Navigate to="/" />;
  }

  return <VideoPlayer email={email} />;
}

// Oturum kontrolü için wrapper bileşen
function WatchWrapper() {
  const { trackingId } = useParams();
  const studentUser = JSON.parse(localStorage.getItem('studentUser') || 'null');

  if (studentUser) {
    return <Navigate to="/video" state={{ email: studentUser.email, trackingId }} />;
  }

  return <StudentAuth />;
}

export default App;
