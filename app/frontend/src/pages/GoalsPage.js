import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import Navbar from '../components/Navbar';
import { Target, Plus, Trash2 } from 'lucide-react';

const GoalsPage = ({ user, token, onLogout }) => {
  const [goals, setGoals] = useState([]);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'personal',
    target_date: ''
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await axios.get(`${API}/goals?token=${token}`);
      setGoals(response.data);
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/goals?token=${token}`, newGoal);
      setNewGoal({ title: '', description: '', category: 'personal', target_date: '' });
      setShowNewGoal(false);
      fetchGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const updateProgress = async (goalId, newProgress) => {
    try {
      await axios.patch(`${API}/goals/${goalId}?token=${token}`, {
        progress: newProgress,
        completed: newProgress >= 100
      });
      fetchGoals();
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'health': return 'bg-green-100 text-green-700';
      case 'career': return 'bg-blue-100 text-blue-700';
      case 'learning': return 'bg-purple-100 text-purple-700';
      case 'personal': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center" data-testid="goals-title">
              <Target className="w-8 h-8 mr-3 text-indigo-600" />
              Goals
            </h1>
            <p className="text-gray-600 mt-2">Set and track your aspirations</p>
          </div>
          <button
            onClick={() => setShowNewGoal(true)}
            data-testid="new-goal-button"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all shadow-lg flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>New Goal</span>
          </button>
        </div>

        {/* New Goal Modal */}
        {showNewGoal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">New Goal</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    data-testid="goal-title-input"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={newGoal.category}
                    onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="personal">Personal</option>
                    <option value="health">Health</option>
                    <option value="career">Career</option>
                    <option value="learning">Learning</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Date (Optional)</label>
                  <input
                    type="date"
                    value={newGoal.target_date}
                    onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    data-testid="submit-goal-button"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-all"
                  >
                    Create Goal
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewGoal(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Goals Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {goals.length === 0 ? (
            <div className="col-span-2 text-center py-16 bg-white rounded-xl shadow-lg">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No goals yet. Set one to start your journey!</p>
            </div>
          ) : (
            goals.map((goal) => (
              <div key={goal.id} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all" data-testid="goal-item">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(goal.category)}`}>
                        {goal.category}
                      </span>
                      {goal.completed && (
                        <span className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-medium">
                          ✓ Completed
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{goal.title}</h3>
                    {goal.description && (
                      <p className="text-gray-600 text-sm mb-3">{goal.description}</p>
                    )}
                    {goal.target_date && (
                      <p className="text-sm text-gray-500">
                        Target: {new Date(goal.target_date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Progress</span>
                    <span className="text-sm font-bold text-indigo-600">{goal.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-indigo-600 h-3 rounded-full transition-all"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>

                {/* Progress Controls */}
                {!goal.completed && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => updateProgress(goal.id, Math.max(0, goal.progress - 10))}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-all"
                    >
                      -10%
                    </button>
                    <button
                      onClick={() => updateProgress(goal.id, Math.min(100, goal.progress + 10))}
                      className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all"
                    >
                      +10%
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GoalsPage;
