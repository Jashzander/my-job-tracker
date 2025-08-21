import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase'; 

const EditIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const DeleteIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" />
    <line x1="18" y1="9" x2="12" y2="15" />
    <line x1="12" y1="9" x2="18" y2="15" />
  </svg>
);

const CustomAlert = ({ message, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-gray-900 opacity-50" onClick={onClose}></div>
    <div className="bg-white rounded-lg p-6 max-w-sm mx-auto z-10 shadow-lg border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Alert</h3>
      <p className="text-gray-600 mb-6">{message}</p>
      <button onClick={onClose} className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors">OK</button>
    </div>
  </div>
);

const GeminiAssistantModal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gray-900 opacity-50" onClick={onClose}></div>
        <div className="bg-white rounded-lg p-6 sm:p-8 max-w-2xl w-full mx-auto z-10 shadow-xl border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{title}</h3>
            {children}
            <button onClick={onClose} className="mt-6 w-full px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-md hover:bg-gray-400 transition-colors">Close</button>
        </div>
    </div>
);


// --- Main App Component ---

const App = () => {
  const [applications, setApplications] = useState([]);
  const [newApplication, setNewApplication] = useState({
    jobTitle: '', companyName: '', jobId: '', link: '', status: 'Applied', dateApplied: new Date().toISOString().split('T')[0],
    location: '', employmentType: '', salaryRange: '', jobDescription: '',
    nextAction: '', reminderAt: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [editingApplication, setEditingApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [alertMessage, setAlertMessage] = useState(null);

  // Gemini State
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [geminiResult, setGeminiResult] = useState('');
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiAssistantType, setGeminiAssistantType] = useState('');
  const [geminiPromptInput, setGeminiPromptInput] = useState('');
  // Auto-fill
  const [jobUrlInput, setJobUrlInput] = useState('');
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({ profileSummary: '', techStack: '', targetRoles: '' });

  // Load settings from localStorage
  useEffect(() => {
    const raw = localStorage.getItem('settings');
    if (raw) {
      try { setSettings(JSON.parse(raw)); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if (user) {
        setUserId(user.uid);
        const userRef = collection(db, `users/${user.uid}/jobApplications`);
        const unsubscribeSnapshot = onSnapshot(userRef, (snapshot) => {
          const applicationsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setApplications(applicationsList);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching documents:", error);
          setLoading(false);
        });
        return () => unsubscribeSnapshot();
      } else {
        setUserId(null);
        setApplications([]);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewApplication({ ...newApplication, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) return;

    const isDuplicate = applications.some(app => app.jobId === newApplication.jobId && app.id !== editingApplication?.id);
    if (isDuplicate && newApplication.jobId) {
      setAlertMessage("This Job ID already exists. Please use a unique ID.");
      return;
    }

    try {
      if (editingApplication) {
        const docRef = doc(db, `users/${userId}/jobApplications`, editingApplication.id);
        await updateDoc(docRef, { ...newApplication });
        setEditingApplication(null);
      } else {
        const userRef = collection(db, `users/${userId}/jobApplications`);
        await addDoc(userRef, { ...newApplication });
      }
      setNewApplication({ jobTitle: '', companyName: '', jobId: '', link: '', status: 'Applied', dateApplied: new Date().toISOString().split('T')[0], location: '', employmentType: '', salaryRange: '', jobDescription: '', nextAction: '', reminderAt: '' });
    } catch (error) {
      console.error("Error adding/updating document:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!userId) return;
    try {
      const docRef = doc(db, `users/${userId}/jobApplications`, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const handleEdit = (application) => {
    setEditingApplication(application);
    setNewApplication(application);
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedApplications = React.useMemo(() => {
    let sortableItems = [...applications];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [applications, sortConfig]);

  const filteredApplications = sortedApplications.filter(app => {
    const query = searchQuery.toLowerCase();
    const matchesQuery = (
      (app.jobTitle || '').toLowerCase().includes(query) ||
      (app.companyName || '').toLowerCase().includes(query) ||
      (app.jobId || '').toLowerCase().includes(query)
    );
    const matchesStatus = statusFilter === 'All' ? true : app.status === statusFilter;
    return matchesQuery && matchesStatus;
  });
  
    // Function to call the Gemini API
    const generateContent = async (prompt) => {
        setGeminiLoading(true);
        setGeminiResult('');
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // <-- Use environment variable
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
                setGeminiResult(result.candidates[0].content.parts[0].text);
            } else {
                setGeminiResult("Sorry, I couldn't generate content. The response was empty.");
            }
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            setGeminiResult(`An error occurred: ${error.message}. Check the console for more details.`);
        } finally {
            setGeminiLoading(false);
        }
    };

    // Ask Gemini to return JSON only
    const generateJson = async (prompt) => {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: 'application/json' }
      };
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      try {
        return JSON.parse(text);
      } catch {
        const match = text.match(/\{[\s\S]*\}/);
        return match ? JSON.parse(match[0]) : {};
      }
    };

    // Fetch cleaned page text via Jina Reader (avoids CORS)
    const fetchJobPageText = async (url) => {
      const normalized = url.startsWith('http') ? url : `https://${url}`;
      const readerUrl = `https://r.jina.ai/${normalized}`;
      const res = await fetch(readerUrl);
      if (!res.ok) throw new Error(`Failed to fetch job page: ${res.status}`);
      return await res.text();
    };

    // Extract structured fields from page text
    const extractJobFieldsWithAI = async (pageText) => {
      const schema = `Return strict JSON with keys: jobTitle, companyName, location, employmentType, salaryRange, jobDescription, applicationLink.`;
      const instr = `${schema} If unknown, use empty string. No commentary.`;
      const prompt = `${instr}\n\nPAGE:\n${pageText.slice(0, 12000)}`;
      return await generateJson(prompt);
    };

    const handleAutoFillFromUrl = async () => {
      if (!jobUrlInput) {
        setAlertMessage('Please paste a job URL first.');
        return;
      }
      setAutoFillLoading(true);
      try {
        const text = await fetchJobPageText(jobUrlInput.trim());
        const data = await extractJobFieldsWithAI(text);
        setNewApplication(prev => ({
          ...prev,
          jobTitle: data.jobTitle || prev.jobTitle,
          companyName: data.companyName || prev.companyName,
          link: data.applicationLink || jobUrlInput.trim() || prev.link,
          location: data.location || prev.location,
          employmentType: data.employmentType || prev.employmentType,
          salaryRange: data.salaryRange || prev.salaryRange,
          jobDescription: data.jobDescription || prev.jobDescription,
        }));
        setAlertMessage('Auto-fill complete. Review and submit.');
      } catch (e) {
        console.error('Auto-fill error', e);
        setAlertMessage(`Auto-fill failed: ${e.message}`);
      } finally {
        setAutoFillLoading(false);
      }
    };


    const handleGenerateCoverLetter = (app) => {
      setGeminiAssistantType('coverLetter');
      setGeminiResult('');
      const base = settings.profileSummary ? `Profile: ${settings.profileSummary}\n` : '';
      const jobCtx = app ? `Job: ${app.jobTitle} at ${app.companyName}. Link: ${app.link || ''}.` : '';
      setGeminiPromptInput(`${base}${jobCtx}`.trim());
      setShowGeminiModal(true);
    };

    const handleGenerateInterviewQuestions = (app) => {
        setGeminiAssistantType('interviewQuestions');
        setShowGeminiModal(true);
        generateContent(`Provide a list of common interview questions and tips for a ${app.jobTitle} position at ${app.companyName}. The output should be a clear, concise list of questions followed by a few helpful tips for the interview.`);
    };

    const handleResumeTuner = () => {
      setGeminiAssistantType('resumeTuner');
      setGeminiResult('');
      setGeminiPromptInput('');
      setShowGeminiModal(true);
    };

    const handleGenerateResumeBullets = (app) => {
      setGeminiAssistantType('resumeBullets');
      setGeminiResult('');
      const profile = settings.profileSummary ? `Profile: ${settings.profileSummary}\n` : '';
      const tech = settings.techStack ? `Tech Stack: ${settings.techStack}\n` : '';
      const jd = app?.jobDescription ? `Job Description: ${app.jobDescription}` : '';
      setGeminiPromptInput(`${profile}${tech}${jd}`.trim());
      setShowGeminiModal(true);
    };

    const handleCopyText = () => {
        const textToCopy = document.getElementById('gemini-output').value;
        navigator.clipboard.writeText(textToCopy).then(() => {
            setAlertMessage("Text copied to clipboard!");
        });
    };

    // Quick status update
    const handleQuickStatusUpdate = async (app, status) => {
      if (!userId) return;
      try {
        const docRef = doc(db, `users/${userId}/jobApplications`, app.id);
        await updateDoc(docRef, { status });
      } catch (e) {
        console.error('Quick status update failed', e);
        setAlertMessage('Failed to update status');
      }
    };

  // --- JSX Rendering ---
  // The rest of your JSX remains largely the same.
  // ... Paste your entire return (...) block here ...
  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-[Inter] text-gray-800">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl p-6 sm:p-10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Job Application Tracker</h1>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowSettings(true)} className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md border hover:bg-gray-200">Settings</button>
                <button onClick={() => {
                  const headers = ['jobTitle','companyName','jobId','status','dateApplied','link','location','employmentType','salaryRange'];
                  const rows = applications.map(a => headers.map(h => `"${String(a[h] || '').replace(/"/g, '""')}"`).join(','));
                  const csv = [headers.join(','), ...rows].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url; link.setAttribute('download', 'job-applications.csv');
                  document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
                }} className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700">Export CSV</button>
              </div>
            </div>
            {userId && <p className="text-sm text-center text-gray-500 mb-4">Your unique user ID: <span className="font-mono bg-gray-200 px-2 py-1 rounded-md text-sm">{userId}</span></p>}

            {/* AI Auto-Fill from URL */}
            <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <div className="flex flex-col md:flex-row gap-3">
                <input type="url" placeholder="Paste job posting URL (LinkedIn, Greenhouse, Lever, company careers)" value={jobUrlInput} onChange={(e) => setJobUrlInput(e.target.value)} className="flex-1 rounded-md border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <button onClick={handleAutoFillFromUrl} disabled={autoFillLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300">{autoFillLoading ? 'Auto-filling…' : 'Auto-Fill with AI'}</button>
              </div>
              <p className="text-xs text-indigo-700 mt-2">We fetch a clean version of the page and extract key fields using AI.</p>
            </div>

            {/* Form Section */}
            <form onSubmit={handleSubmit} className="mb-10 p-6 bg-gray-50 rounded-xl border border-gray-200 shadow-inner">
                <h2 className="text-2xl font-semibold mb-6 text-gray-700">{editingApplication ? 'Edit Application' : 'Add New Application'}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label className="block">
                        <span className="text-gray-700 font-medium">Job Title</span>
                        <input type="text" name="jobTitle" value={newApplication.jobTitle} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" required />
                    </label>
                    <label className="block">
                        <span className="text-gray-700 font-medium">Company Name</span>
                        <input type="text" name="companyName" value={newApplication.companyName} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" required />
                    </label>
                    <label className="block">
                        <span className="text-gray-700 font-medium">Job ID (Mandatory)</span>
                        <input type="text" name="jobId" value={newApplication.jobId} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" required />
                    </label>
                    <label className="block">
                        <span className="text-gray-700 font-medium">Link</span>
                        <input type="url" name="link" value={newApplication.link} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" />
                    </label>
                    <label className="block">
                        <span className="text-gray-700 font-medium">Location</span>
                        <input type="text" name="location" value={newApplication.location} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" />
                    </label>
                    <label className="block">
                        <span className="text-gray-700 font-medium">Employment Type</span>
                        <input type="text" name="employmentType" value={newApplication.employmentType} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" />
                    </label>
                    <label className="block">
                        <span className="text-gray-700 font-medium">Salary Range</span>
                        <input type="text" name="salaryRange" value={newApplication.salaryRange} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" />
                    </label>
                    <label className="block">
                        <span className="text-gray-700 font-medium">Status</span>
                        <select name="status" value={newApplication.status} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                            <option value="Applied">Applied</option>
                            <option value="Interview">Interview</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Offer">Offer</option>
                        </select>
                    </label>
                    <label className="block">
                        <span className="text-gray-700 font-medium">Date Applied</span>
                        <input type="date" name="dateApplied" value={newApplication.dateApplied} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" required />
                    </label>
                    <label className="block md:col-span-2">
                        <span className="text-gray-700 font-medium">Job Description (optional)</span>
                        <textarea name="jobDescription" value={newApplication.jobDescription} onChange={handleInputChange} rows="4" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" placeholder="Auto-filled from URL when available" />
                    </label>
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                    <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors">{editingApplication ? 'Save Changes' : 'Add Application'}</button>
                    {editingApplication && <button type="button" onClick={() => { setEditingApplication(null); setNewApplication({ jobTitle: '', companyName: '', jobId: '', link: '', status: 'Applied', dateApplied: new Date().toISOString().split('T')[0] }); }} className="px-6 py-2 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors">Cancel</button>}
                </div>
            </form>

            {/* Table Section */}
            <div className="relative mb-6 flex flex-col md:flex-row gap-3 md:items-center">
              <div className="relative flex-1">
                <input type="text" placeholder="Search by job title, company, or job ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow" />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full md:w-56 px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="All">All Statuses</option>
                <option value="Applied">Applied</option>
                <option value="Interview">Interview</option>
                <option value="Rejected">Rejected</option>
                <option value="Offer">Offer</option>
              </select>
              <div className="flex gap-2">
                <input type="text" placeholder="Next action (e.g., follow up)" value={newApplication.nextAction} onChange={(e)=> setNewApplication(prev=> ({...prev, nextAction: e.target.value}))} className="w-full md:w-60 px-3 py-2 rounded-md border border-gray-300" />
                <input type="datetime-local" value={newApplication.reminderAt} onChange={(e)=> setNewApplication(prev=> ({...prev, reminderAt: e.target.value}))} className="w-full md:w-60 px-3 py-2 rounded-md border border-gray-300" />
              </div>
            </div>

            {loading ? <div className="text-center py-10"><p className="text-lg text-gray-500 animate-pulse">Loading applications...</p></div> : filteredApplications.length === 0 ? <div className="text-center py-10"><p className="text-lg text-gray-500">No applications found. Add one to get started!</p></div> : (
                <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><button onClick={() => requestSort('jobTitle')} className="flex items-center space-x-1">Job Title</button></th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><button onClick={() => requestSort('companyName')} className="flex items-center space-x-1">Company</button></th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><button onClick={() => requestSort('status')} className="flex items-center space-x-1">Status</button></th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredApplications.map(app => (
                                <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{app.jobTitle}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.companyName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${app.status === 'Applied' ? 'bg-indigo-100 text-indigo-800' : app.status === 'Interview' ? 'bg-yellow-100 text-yellow-800' : app.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{app.status}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-center flex-wrap gap-2">
                                            <button onClick={() => handleResumeTuner(app)} title="Generate Resume Tips" className="p-2 rounded-full bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors">📄</button>
                                            <button onClick={() => handleGenerateCoverLetter(app)} title="Generate Cover Letter" className="p-2 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">✨</button>
                                            <button onClick={() => handleGenerateInterviewQuestions(app)} title="Generate Interview Questions" className="p-2 rounded-full bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition-colors">💡</button>
                                            <button onClick={() => handleGenerateResumeBullets(app)} title="Generate Resume Bullets" className="p-2 rounded-full bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors">• • •</button>
                                            <button onClick={() => handleQuickStatusUpdate(app, 'Applied')} className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800 hover:bg-indigo-200">Applied</button>
                                            <button onClick={() => handleQuickStatusUpdate(app, 'Interview')} className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Interview</button>
                                            <button onClick={() => handleQuickStatusUpdate(app, 'Rejected')} className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 hover:bg-red-200">Rejected</button>
                                            <button onClick={() => handleQuickStatusUpdate(app, 'Offer')} className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 hover:bg-green-200">Offer</button>
                                            <button onClick={() => handleEdit(app)} className="text-indigo-600 hover:text-indigo-900 transition-colors"><EditIcon /></button>
                                            <button onClick={() => handleDelete(app.id)} className="text-red-600 hover:text-red-900 transition-colors"><DeleteIcon /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {alertMessage && <CustomAlert message={alertMessage} onClose={() => setAlertMessage(null)} />}
            
            {showGeminiModal && (
                <GeminiAssistantModal title={
                  geminiAssistantType === 'coverLetter' ? '✨ Cover Letter Generator' :
                  geminiAssistantType === 'interviewQuestions' ? '💡 Interview Questions' :
                  geminiAssistantType === 'resumeBullets' ? '🧩 Resume Bullets' :
                  '📄 Resume Tuner'
                } onClose={() => { setShowGeminiModal(false); setGeminiResult(''); setGeminiPromptInput(''); }}>
                    {geminiAssistantType === 'coverLetter' && (
                        <>
                            <p className="text-gray-600 mb-2">We’ll tailor a cover letter using your profile and the selected job (if present). You can tweak the input below.</p>
                            <textarea className="w-full h-28 p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-3" placeholder="Paste or edit your profile/job context here" value={geminiPromptInput} onChange={(e) => setGeminiPromptInput(e.target.value)} />
                            <button onClick={() => generateContent(`Write a concise, professional cover letter in 200-300 words. Use an enthusiastic but grounded tone. Base it on: ${geminiPromptInput}`)} disabled={geminiLoading} className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-400">
                                {geminiLoading ? 'Generating...' : 'Generate Letter'}
                            </button>
                        </>
                    )}
                    {geminiAssistantType === 'resumeTuner' && (
                        <>
                            <p className="text-gray-600 mb-4">Paste the job description below for tailored resume suggestions.</p>
                            <textarea className="w-full h-40 p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none mb-4" placeholder="Paste job description here..." value={geminiPromptInput} onChange={(e) => setGeminiPromptInput(e.target.value)} />
                            <button onClick={() => generateContent(`Analyze this job description and provide actionable suggestions for tailoring a resume to it: ${geminiPromptInput}`)} disabled={geminiLoading} className="w-full px-4 py-2 bg-teal-600 text-white font-semibold rounded-md hover:bg-teal-700 transition-colors disabled:bg-gray-400">
                                {geminiLoading ? 'Analyzing...' : 'Get Resume Tips'}
                            </button>
                        </>
                    )}

                    {geminiAssistantType === 'resumeBullets' && (
                      <>
                        <p className="text-gray-600 mb-2">We’ll generate 5-8 concise, ATS-friendly bullet points emphasizing outcomes and metrics.</p>
                        <textarea className="w-full h-40 p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none mb-3" placeholder="Context (profile, tech stack, job description)" value={geminiPromptInput} onChange={(e) => setGeminiPromptInput(e.target.value)} />
                        <button onClick={() => generateContent(`Generate 6 resume bullet points (STAR-style when possible), each <= 22 words, action-verb first, quantify impact, tailored to this context: ${geminiPromptInput}`)} disabled={geminiLoading} className="w-full px-4 py-2 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 transition-colors disabled:bg-gray-400">
                          {geminiLoading ? 'Generating...' : 'Generate Bullets'}
                        </button>
                      </>
                    )}

                    {geminiLoading && <div className="text-center py-6"><p className="text-lg text-gray-500 animate-pulse">Generating...</p></div>}
                    {geminiResult && (
                        <div className="mt-6 border-t border-gray-200 pt-6">
                            <h4 className="text-lg font-semibold text-gray-800 mb-2">Result:</h4>
                            <textarea id="gemini-output" className="w-full h-64 p-3 bg-gray-50 rounded-md border border-gray-200 text-gray-700 resize-none" value={geminiResult} readOnly />
                            <button onClick={handleCopyText} className="mt-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors">Copy to Clipboard</button>
                        </div>
                    )}
                </GeminiAssistantModal>
            )}

            {showSettings && (
              <GeminiAssistantModal title={'Settings'} onClose={() => { localStorage.setItem('settings', JSON.stringify(settings)); setShowSettings(false); }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Profile Summary</label>
                    <textarea rows="3" className="mt-1 w-full rounded-md border border-gray-300 p-2" value={settings.profileSummary} onChange={(e)=> setSettings(prev=> ({...prev, profileSummary: e.target.value}))} placeholder="Fresh CS grad with internship experience in ..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tech Stack</label>
                    <input className="mt-1 w-full rounded-md border border-gray-300 p-2" value={settings.techStack} onChange={(e)=> setSettings(prev=> ({...prev, techStack: e.target.value}))} placeholder="React, Node, Python, SQL, AWS" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target Roles</label>
                    <input className="mt-1 w-full rounded-md border border-gray-300 p-2" value={settings.targetRoles} onChange={(e)=> setSettings(prev=> ({...prev, targetRoles: e.target.value}))} placeholder="SWE, Backend, Data, ML" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gemini API Key (optional)</label>
                    <input className="mt-1 w-full rounded-md border border-gray-300 p-2" defaultValue={localStorage.getItem('geminiApiKey') || ''} onBlur={(e)=> localStorage.setItem('geminiApiKey', e.target.value || '')} placeholder="Overrides env key in this browser" />
                  </div>
                </div>
              </GeminiAssistantModal>
            )}
        </div>
    </div>
);

};

export default App;