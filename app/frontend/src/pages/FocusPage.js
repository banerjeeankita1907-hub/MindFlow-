import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import Navbar from '../components/Navbar';
import { Timer, Play, Pause, RotateCcw } from 'lucide-react';

const FocusPage = ({ user, token, onLogout }) => {
  const [sessions, setSessions] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes default
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [taskDescription, setTaskDescription] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    let interval = null;
    if (isActive && !isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused, timeLeft]);

  const fetchSessions = async () => {
    try {
      const response = await axios.get(`${API}/focus/history?token=${token}`);
      setSessions(response.data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const startSession = async () => {
    try {
      const response = await axios.post(`${API}/focus/start?token=${token}`, {
        duration_minutes: selectedDuration,
        task_description: taskDescription
      });
      setCurrentSessionId(response.data.id);
      setIsActive(true);
      setIsPaused(false);
      setTimeLeft(selectedDuration * 60);
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  const handleComplete = async () => {
    if (currentSessionId) {
      try {
        await axios.post(`${API}/focus/complete/${currentSessionId}?token=${token}`);
        fetchSessions();
      } catch (error) {
        console.error('Error completing session:', error);
      }
    }
    setIsActive(false);
    setIsPaused(false);
    setTimeLeft(selectedDuration * 60);
    setCurrentSessionId(null);
    setTaskDescription('');
    
    // Play a notification sound or show alert
    alert('✅ Focus session completed! Great work!');
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsPaused(false);
    setTimeLeft(selectedDuration * 60);
    setCurrentSessionId(null);
    setTaskDescription('');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((selectedDuration * 60 - timeLeft) / (selectedDuration * 60)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center" data-testid="focus-title">
            <Timer className="w-8 h-8 mr-3 text-indigo-600" />
            Focus Timer
          </h1>
          <p className="text-gray-600 mt-2">Deep work sessions to boost productivity</p>
        </div>

        {/* Timer Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl mb-8">
          {!isActive ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Select Duration</label>
                <div className="grid grid-cols-3 gap-3">
                  {[15, 25, 45].map((duration) => (
                    <button
                      key={duration}
                      onClick={() => {
                        setSelectedDuration(duration);
                        setTimeLeft(duration * 60);
                      }}
                      data-testid={`duration-${duration}`}
                      className={`py-3 rounded-lg font-semibold transition-all ${
                        selectedDuration === duration
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {duration} min
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What are you focusing on?</label>
                <input
                  type="text"
                  data-testid="task-description-input"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Write project proposal"
                />
              </div>

              <button
                onClick={startSession}
                data-testid="start-focus-button"
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all flex items-center justify-center space-x-2"
              >
                <Play className="w-5 h-5" />
                <span>Start Focus Session</span>
              </button>
            </div>
          ) : (
            <div className="text-center">
              {/* Circular Progress */}
              <div className="relative inline-flex items-center justify-center mb-8">
                <svg className="transform -rotate-90 w-64 h-64">
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="#6366f1"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 120}`}
                    strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute">
                  <p className="text-6xl font-bold text-gray-900">{formatTime(timeLeft)}</p>
                </div>
              </div>

              {taskDescription && (
                <p className="text-lg text-gray-600 mb-6">Focusing on: <span className="font-semibold">{taskDescription}</span></p>
              )}

              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  data-testid="pause-focus-button"
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all flex items-center space-x-2"
                >
                  {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>
                <button
                  onClick={resetTimer}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-all flex items-center space-x-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Session History */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Sessions</h3>
          <div className="space-y-3">
            {sessions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No focus sessions yet. Start one to build your streak!</p>
            ) : (
              sessions.slice(0, 10).map((session) => (
                <div key={session.id} className="flex justify-between items-center border-b border-gray-100 pb-3" data-testid="session-item">
                  <div>
                    <p className="font-medium text-gray-900">
                      {session.task_description || 'Focus Session'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(session.started_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-indigo-600">{session.duration_minutes} min</p>
                    {session.completed_at && (
                      <p className="text-xs text-green-600">✓ Completed</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FocusPage;
