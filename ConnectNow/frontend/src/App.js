// Adapted and customized for ConnectNOW
import './App.css';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import LandingPage from './pages/landing';
import Authentication from './pages/authentication';
import { AuthProvider } from './contexts/AuthContext';
import VideoMeetComponent from './pages/VideoMeet';
import HomeComponent from './pages/home';
import History from './pages/history';
import ProtectedRoute from './components/ProtectedRoute';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import UserProfile from './pages/UserProfile';

function App() {
  return (
    <div className="App">
      <Router>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path='/' element={<LandingPage />} />
            <Route path='/auth' element={<Authentication />} />
            <Route path='/forgot-password' element={<ForgotPassword />} />
            <Route path='/reset-password/:token' element={<ResetPassword />} />

            {/* Protected Routes */}
            <Route path='/home' element={
              <ProtectedRoute>
                <HomeComponent />
              </ProtectedRoute>
            } />
            
            <Route path='/profile' element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } />

            <Route path='/history' element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            } />

            <Route path='/:url' element={
              <ProtectedRoute>
                <VideoMeetComponent />
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </Router>
    </div>
  );
}

export default App;
