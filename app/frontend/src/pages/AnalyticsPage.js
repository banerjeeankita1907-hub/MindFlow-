import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import Navbar from '../components/Navbar';
import { BarChart3, TrendingUp, Award, Activity, Sparkles } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const AnalyticsPage = ({ user, token, onLogout }) => {
  const [analytics, setAnalytics] = useState(null);
  const [insights, setInsights] = useState('');
  const [moods, setMoods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [analyticsRes, moodsRes, insightsRes] = await Promise.all([
        axios.get(`${API}/analytics/dashboard?token=${token}`),
        axios.get(`${API}/mood/history?token=${token}&days=14`),
        axios.post(`${API}/ai/insights?token=${token}`)
      ]);
      setAnalytics(analyticsRes.data);
      setMoods(moodsRes.data);
      setInsights(insightsRes.data.insights);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
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

  const moodChartData = moods.slice(0, 14).reverse().map(mood => ({
    date: new Date(mood.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    mood: mood.mood_score,
    energy: mood.energy_level
  }));

  const statsData = [
    { name: 'Check-ins', value: analytics?.total_check_ins || 0, color: '#6366f1' },
    { name: 'Journal', value: analytics?.total_journal_entries || 0, color: '#8b5cf6' },
    { name: 'Focus (hrs)', value: Math.round((analytics?.total_focus_minutes || 0) / 60), color: '#a855f7' }
  ];

  const COLORS = ['#6366f1', '#8b5cf6', '#a855f7'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center" data-testid="analytics-title">
            <BarChart3 className="w-8 h-8 mr-3 text-indigo-600" />
            Analytics & Insights
          </h1>
          <p className="text-gray-600 mt-2">Your personal growth dashboard</p>
        </div>

        {/* AI Insights */}
        {insights && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white mb-8 shadow-xl" data-testid="ai-insights">
            <div className="flex items-start space-x-3">
              <Sparkles className="w-6 h-6 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">AI-Powered Insights</h3>
                <p className="text-indigo-100 whitespace-pre-wrap">{insights}</p>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            icon={<Award className="w-6 h-6" />}
            title="Current Streak"
            value={`${analytics?.current_streak || 0} days`}
            color="bg-yellow-500"
          />
          <MetricCard
            icon={<Activity className="w-6 h-6" />}
            title="Avg Mood (7d)"
            value={`${analytics?.average_mood_7days || 0}/10`}
            color="bg-green-500"
          />
          <MetricCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="Task Completion"
            value={`${analytics?.task_completion_rate || 0}%`}
            color="bg-blue-500"
          />
          <MetricCard
            icon={<BarChart3 className="w-6 h-6" />}
            title="Weekly Focus"
            value={`${analytics?.weekly_focus_minutes || 0} min`}
            color="bg-purple-500"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Mood Trend */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mood & Energy Trend (14 Days)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={moodChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Line type="monotone" dataKey="mood" stroke="#6366f1" strokeWidth={2} name="Mood" />
                <Line type="monotone" dataKey="energy" stroke="#a855f7" strokeWidth={2} name="Energy" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Activity Distribution */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Overall Performance</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <StatRow label="Total Check-ins" value={analytics?.total_check_ins || 0} />
            <StatRow label="Journal Entries" value={analytics?.total_journal_entries || 0} />
            <StatRow label="Total Focus Time" value={`${analytics?.total_focus_minutes || 0} min`} />
            <StatRow label="Longest Streak" value={`${analytics?.longest_streak || 0} days`} />
            <StatRow label="Weekly Focus" value={`${analytics?.weekly_focus_minutes || 0} min`} />
            <StatRow label="Task Success Rate" value={`${analytics?.task_completion_rate || 0}%`} />
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, title, value, color }) => (
  <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`${color} text-white p-3 rounded-lg`}>
        {icon}
      </div>
    </div>
  </div>
);

const StatRow = ({ label, value }) => (
  <div className="border-l-4 border-indigo-600 pl-4">
    <p className="text-sm text-gray-600">{label}</p>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

export default AnalyticsPage;
