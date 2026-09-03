import React, { lazy, Suspense } from 'react';
import './App.css';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import LandingPage from './pages/landing';
import Authentication from './pages/authentication';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load heavy routes to optimize initial bundle size & interactive load performance
const VideoMeetComponent = lazy(() => import('./pages/VideoMeet'));
const HomeComponent = lazy(() => import('./pages/home'));
const History = lazy(() => import('./pages/history'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const Notes = lazy(() => import('./pages/Notes'));

const PageLoader = () => (
  <div className="flex h-screen flex-col items-center justify-center bg-slate-950 text-white font-sans">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent mb-4"></div>
    <p className="text-xs text-gray-400 font-mono tracking-wide">Loading ConnectNOW...</p>
  </div>
);

function App() {
  return (
    <div className="App">
      <Router>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Routes */}
              <Route path='/' element={<LandingPage />} />
              <Route path='/auth' element={<Authentication />} />
              <Route path='/forgot-password' element={<ForgotPassword />} />
              <Route path='/reset-password/:token' element={<ResetPassword />} />
              <Route path='/:url' element={<VideoMeetComponent />} />

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

              <Route path='/notes' element={
                <ProtectedRoute>
                  <Notes />
                </ProtectedRoute>
              } />
            </Routes>
          </Suspense>
        </AuthProvider>
      </Router>
    </div>
  );
}


export default App;
