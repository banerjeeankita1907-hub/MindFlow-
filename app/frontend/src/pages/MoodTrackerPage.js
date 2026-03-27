import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import Navbar from '../components/Navbar';
import { Smile, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MoodTrackerPage = ({ user, token, onLogout }) => {
  const [moods, setMoods] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [showLogMood, setShowLogMood] = useState(false);
  const [newMood, setNewMood] = useState({
    mood_score: 5,
    energy_level: 5,
    notes: '',
    activities: []
  });

  useEffect(() => {
    fetchMoods();
    fetchAnalytics();
  }, []);

  const fetchMoods = async () => {
    try {
      const response = await axios.get(`${API}/mood/history?token=${token}`);
      setMoods(response.data);
    } catch (error) {
      console.error('Error fetching moods:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/mood/analytics?token=${token}`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/mood/log?token=${token}`, newMood);
      setNewMood({ mood_score: 5, energy_level: 5, notes: '', activities: [] });
      setShowLogMood(false);
      fetchMoods();
      fetchAnalytics();
    } catch (error) {
      console.error('Error logging mood:', error);
    }
  };

  const chartData = moods.slice(0, 30).reverse().map(mood => ({
    date: new Date(mood.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    mood: mood.mood_score,
    energy: mood.energy_level
  }));

  const getTrendIcon = () => {
    if (!analytics) return null;
    if (analytics.trend === 'improving') return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (analytics.trend === 'declining') return <TrendingDown className="w-5 h-5 text-red-600" />;
    return <Minus className="w-5 h-5 text-gray-600" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center" data-testid="mood-title">
              <Smile className="w-8 h-8 mr-3 text-indigo-600" />
              Mood Tracker
            </h1>
            <p className="text-gray-600 mt-2">Track your emotional wellbeing</p>
          </div>
          <button
            onClick={() => setShowLogMood(true)}
            data-testid="log-mood-button"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all shadow-lg"
          >
            Log Mood
          </button>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <p className="text-sm text-gray-600 mb-2">Average Mood</p>
              <p className="text-3xl font-bold text-indigo-600">{analytics.average_mood}/10</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <p className="text-sm text-gray-600 mb-2">Average Energy</p>
              <p className="text-3xl font-bold text-purple-600">{analytics.average_energy}/10</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <p className="text-sm text-gray-600 mb-2 flex items-center">
                Trend {getTrendIcon()}
              </p>
              <p className="text-2xl font-bold text-gray-900 capitalize">{analytics.trend}</p>
            </div>
          </div>
        )}

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">30-Day Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Line type="monotone" dataKey="mood" stroke="#6366f1" strokeWidth={2} name="Mood" />
                <Line type="monotone" dataKey="energy" stroke="#a855f7" strokeWidth={2} name="Energy" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Log Mood Modal */}
        {showLogMood && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Log Your Mood</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mood Score: {newMood.mood_score}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    data-testid="mood-score-slider"
                    value={newMood.mood_score}
                    onChange={(e) => setNewMood({ ...newMood, mood_score: parseInt(e.target.value) })}
                    className="w-full h-3 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>😢 Low</span>
                    <span>😊 High</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Energy Level: {newMood.energy_level}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={newMood.energy_level}
                    onChange={(e) => setNewMood({ ...newMood, energy_level: parseInt(e.target.value) })}
                    className="w-full h-3 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>🔋 Low</span>
                    <span>⚡ High</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={newMood.notes}
                    onChange={(e) => setNewMood({ ...newMood, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    rows="3"
                    placeholder="What's influencing your mood today?"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    data-testid="submit-mood-button"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-all"
                  >
                    Log Mood
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogMood(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Recent Logs */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Logs</h3>
          <div className="space-y-3">
            {moods.slice(0, 10).map((mood) => (
              <div key={mood.id} className="flex justify-between items-center border-b border-gray-100 pb-3" data-testid="mood-log-item">
                <div>
                  <p className="text-sm text-gray-500">
                    {new Date(mood.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  {mood.notes && <p className="text-gray-700 mt-1">{mood.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Mood: <span className="font-semibold text-indigo-600">{mood.mood_score}/10</span></p>
                  <p className="text-sm text-gray-600">Energy: <span className="font-semibold text-purple-600">{mood.energy_level}/10</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoodTrackerPage;
