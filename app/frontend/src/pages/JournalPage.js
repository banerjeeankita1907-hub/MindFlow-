import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import Navbar from '../components/Navbar';
import { BookOpen, Sparkles, Calendar } from 'lucide-react';

const JournalPage = ({ user, token, onLogout }) => {
  const [entries, setEntries] = useState([]);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({ content: '', mood_score: 5, tags: [] });
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await axios.get(`${API}/journal/entries?token=${token}`);
      setEntries(response.data);
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  };

  const getPrompt = async () => {
    try {
      const response = await axios.post(`${API}/ai/journal-prompt?token=${token}`, {});
      setPrompt(response.data.prompt);
    } catch (error) {
      console.error('Error getting prompt:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/journal/entry?token=${token}`, newEntry);
      setNewEntry({ content: '', mood_score: 5, tags: [] });
      setShowNewEntry(false);
      setPrompt('');
      fetchEntries();
    } catch (error) {
      console.error('Error creating entry:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center" data-testid="journal-title">
              <BookOpen className="w-8 h-8 mr-3 text-indigo-600" />
              My Journal
            </h1>
            <p className="text-gray-600 mt-2">Reflect, process, and grow</p>
          </div>
          <button
            onClick={() => {
              setShowNewEntry(true);
              getPrompt();
            }}
            data-testid="new-entry-button"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all shadow-lg"
          >
            New Entry
          </button>
        </div>

        {/* New Entry Modal */}
        {showNewEntry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full my-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">New Journal Entry</h2>
              
              {prompt && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-2">
                    <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-indigo-900 mb-1">AI Prompt:</p>
                      <p className="text-indigo-800">{prompt}</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Thoughts</label>
                  <textarea
                    value={newEntry.content}
                    data-testid="journal-content-input"
                    onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[200px]"
                    placeholder="Write freely... your AI companion will respond with insights."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mood Score: {newEntry.mood_score}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={newEntry.mood_score}
                    onChange={(e) => setNewEntry({ ...newEntry, mood_score: parseInt(e.target.value) })}
                    className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    data-testid="submit-entry-button"
                    disabled={loading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Entry'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewEntry(false);
                      setPrompt('');
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Entries List */}
        <div className="space-y-6">
          {entries.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-lg">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No journal entries yet. Start writing to unlock AI insights!</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all" data-testid="journal-entry">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {new Date(entry.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  {entry.mood_score && (
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                      Mood: {entry.mood_score}/10
                    </span>
                  )}
                </div>
                
                <p className="text-gray-800 mb-4 whitespace-pre-wrap">{entry.content}</p>
                
                {entry.ai_response && (
                  <div className="bg-indigo-50 border-l-4 border-indigo-600 rounded-lg p-4 mt-4">
                    <div className="flex items-start space-x-2">
                      <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-indigo-900 mb-1">AI Response:</p>
                        <p className="text-indigo-800">{entry.ai_response}</p>
                      </div>
                    </div>
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

export default JournalPage;
