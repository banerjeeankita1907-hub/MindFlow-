import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import Navbar from '../components/Navbar';
import { Sparkles, TrendingUp, BookOpen, Smile, CheckCircle, Target, Clock, Award } from 'lucide-react';

const Dashboard = ({ user, token, onLogout }) => {
  const [analytics, setAnalytics] = useState(null);
  const [dailyMessage, setDailyMessage] = useState('');
  const [showCheckin, setShowCheckin] = useState(false);
  const [checkinData, setCheckinData] = useState({
    current_mood: '',
    sleep_quality: '',
    energy_level: '',
    goals_for_today: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/analytics/dashboard?token=${token}`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDailyCheckin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${API}/ai/daily-checkin?token=${token}`,
        checkinData
      );
      setDailyMessage(response.data.message);
      setShowCheckin(false);
      fetchDashboardData();
    } catch (error) {
      console.error('Error with check-in:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} onLogout={onLogout} />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white mb-8 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2" data-testid="dashboard-welcome">Welcome back, {user?.name}! ✨</h1>
              <p className="text-indigo-100">Let's make today amazing</p>
            </div>
            <button
              onClick={() => setShowCheckin(true)}
              data-testid="daily-checkin-button"
              className="px-6 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-all"
            >
              Daily Check-in
            </button>
          </div>
        </div>

        {/* AI Message */}
        {dailyMessage && (
          <div className="bg-white rounded-xl p-6 mb-8 shadow-lg border-l-4 border-indigo-600" data-testid="ai-message">
            <div className="flex items-start space-x-3">
              <Sparkles className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Your AI Coach Says:</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{dailyMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Award className="w-6 h-6" />}
            label="Current Streak"
            value={`${analytics?.current_streak || 0} days`}
            color="bg-yellow-500"
          />
          <StatCard
            icon={<CheckCircle className="w-6 h-6" />}
            label="Total Check-ins"
            value={analytics?.total_check_ins || 0}
            color="bg-green-500"
          />
          <StatCard
            icon={<BookOpen className="w-6 h-6" />}
            label="Journal Entries"
            value={analytics?.total_journal_entries || 0}
            color="bg-blue-500"
          />
          <StatCard
            icon={<Clock className="w-6 h-6" />}
            label="Focus Time"
            value={`${analytics?.total_focus_minutes || 0} min`}
            color="bg-purple-500"
          />
        </div>

        {/* Additional Insights */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Smile className="w-5 h-5 mr-2 text-indigo-600" />
              Mood Insights
            </h3>
            <div className="space-y-3">
              <InsightRow label="7-Day Average" value={`${analytics?.average_mood_7days || 5.0}/10`} />
              <InsightRow label="Weekly Focus" value={`${analytics?.weekly_focus_minutes || 0} minutes`} />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2 text-indigo-600" />
              Performance
            </h3>
            <div className="space-y-3">
              <InsightRow label="Task Completion" value={`${analytics?.task_completion_rate || 0}%`} />
              <InsightRow label="Longest Streak" value={`${analytics?.longest_streak || 0} days`} />
            </div>
          </div>
        </div>
      </div>

      {/* Daily Check-in Modal */}
      {showCheckin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Daily Check-in</h2>
            <form onSubmit={handleDailyCheckin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">How are you feeling?</label>
                <input
                  type="text"
                  data-testid="checkin-mood-input"
                  value={checkinData.current_mood}
                  onChange={(e) => setCheckinData({ ...checkinData, current_mood: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., energized, calm, anxious..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sleep Quality</label>
                <select
                  value={checkinData.sleep_quality}
                  onChange={(e) => setCheckinData({ ...checkinData, sleep_quality: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select...</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Energy Level</label>
                <select
                  value={checkinData.energy_level}
                  onChange={(e) => setCheckinData({ ...checkinData, energy_level: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select...</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Goals for Today</label>
                <textarea
                  value={checkinData.goals_for_today}
                  onChange={(e) => setCheckinData({ ...checkinData, goals_for_today: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows="3"
                  placeholder="What do you want to accomplish today?"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  data-testid="submit-checkin-button"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-all"
                >
                  Submit Check-in
                </button>
                <button
                  type="button"
                  onClick={() => setShowCheckin(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`${color} text-white p-3 rounded-lg`}>
        {icon}
      </div>
    </div>
  </div>
);

const InsightRow = ({ label, value }) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-600">{label}</span>
    <span className="font-semibold text-gray-900">{value}</span>
  </div>
);

export default Dashboard;
