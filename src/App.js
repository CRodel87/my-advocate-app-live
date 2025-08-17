import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, onSnapshot, doc, updateDoc, deleteDoc, query, where, setDoc } from 'firebase/firestore';
import { Scale, CalendarDays, FolderOpen, Users, BarChart2, Settings, Plus, Minus, Edit, Trash2, CheckCircle, Upload, Sun, Moon, Palette, Type, ArrowUp, ArrowDown } from 'lucide-react'; // Import Lucide React icons

// Utility function to check if two dates are the same day
const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() &&
                              d1.getMonth() === d2.getMonth() &&
                              d1.getDate() === d2.getDate();

// Utility function to format dates based on a given format string
const formatDate = (dateString, format) => {
  const date = new Date(dateString);
  if (isNaN(date)) return ''; // Return empty string for invalid dates

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(date.getDate()).padStart(2, '0');

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
    return `${month}/${day}/${year}`;
    default:
      return date.toLocaleDateString('en-ZA'); // Fallback
  }
};


// Simple Modal Component for Time Input
const TimeInputModal = ({ isOpen, onClose, onSubmit, briefDescription }) => { // Renamed taskDescription to briefDescription
  const [timeSpent, setTimeSpent] = useState('');

  const handleSubmit = () => {
    const parsedTime = parseFloat(timeSpent);
    if (!isNaN(parsedTime) && parsedTime > 0) {
      onSubmit(parsedTime);
      setTimeSpent(''); // Reset input
    } else {
      alert('Please enter a valid positive number for time spent.'); // Simple alert for modal validation
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Complete Brief</h3> {/* Renamed Complete Task to Complete Brief */}
        <p className="mb-4 text-gray-700">Enter time spent (in hours) for: <br />
          <strong className="block mt-1 p-2 bg-gray-100 rounded-md break-words">{briefDescription}</strong> {/* Renamed taskDescription to briefDescription */}
        </p>
        <div className="mb-4">
          <label htmlFor="timeSpentInput" className="block text-gray-700 text-sm font-bold mb-2">
            Time Spent (Hours):
          </label>
          <input
            type="number"
            id="timeSpentInput"
            value={timeSpent}
            onChange={(e) => setTimeSpent(e.target.value)}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            min="0.01"
            step="0.01"
            required
          />
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};


// New Calendar Action Choice Modal
const CalendarActionChoiceModal = ({ isOpen, onClose, onAddMatter, onViewBriefs, selectedDate, appDateFormat }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Select Action for {formatDate(selectedDate, appDateFormat)}</h3>
        <p className="mb-6 text-gray-700">What would you like to do for this date?</p>
        <div className="flex flex-col gap-4">
          <button
            onClick={onAddMatter}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-200 text-lg flex items-center justify-center"
          >
            <Plus size={20} className="mr-2" /> Add New Matter
          </button>
          <button
            onClick={onViewBriefs}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-200 text-lg flex items-center justify-center"
          >
            <CalendarDays size={20} className="mr-2" /> View Day's Briefs
          </button>
          <button
            onClick={onClose}
            className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200 mt-4"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};


// Placeholder for a simple calendar component if a library isn't available
const SimpleCalendar = ({ value, onChange, tileContent, view, onViewChange, onDayClickToChooseAction }) => {
  const [currentDate, setCurrentDate] = useState(value || new Date());
  const [currentView, setCurrentView] = useState(view || 'month'); // 'month' or 'week'

  // Update internal date if external value prop changes
  useEffect(() => {
    setCurrentDate(value || new Date());
  }, [value]);

  // Calculate days for month view
  const daysInMonth = useMemo(() => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Get the start of the week for the first day of the month (Sunday for simplicity)
    const startDay = new Date(startOfMonth);
    startDay.setDate(startOfMonth.getDate() - startOfMonth.getDay());

    const days = [];
    let day = new Date(startDay);
    // Ensure all days of the month and padding days are included to fill the calendar grid
    while (day <= endOfMonth || days.length % 7 !== 0) {
      days.push(new Date(day));
      day.setDate(day.getDate() + 1);
      // Prevent infinite loop if somehow condition is never met (e.g., if endOfMonth calculation is off)
      if (days.length > 42) break; // Max 6 weeks * 7 days
    }
    return days;
  }, [currentDate]);

  // Calculate days for week view
  const daysInWeek = useMemo(() => {
    const days = [];
    let day = new Date(currentDate);
    day.setDate(currentDate.getDate() - currentDate.getDay()); // Start of current week (Sunday)
    for (let i = 0; i < 7; i++) {
      days.push(new Date(day));
      day.setDate(day.getDate() + 1);
    }
    return days;
  }, [currentDate]);

  // Navigate month
  const navigateMonth = (direction) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + direction);
      if (onViewChange) onViewChange({ date: newDate, view: 'month' }); // Notify parent
      return newDate;
    });
  };

  // Navigate week
  const navigateWeek = (direction) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + (direction * 7));
      if (onViewChange) onViewChange({ date: newDate, view: 'week' }); // Notify parent
      return newDate;
    });
  };


  // Handle day click
  const handleDayClick = (day) => {
    if (onChange) onChange(day); // Always update the main calendar date state
    if (onDayClickToChooseAction) onDayClickToChooseAction(day); // New: Call this prop on day click to show choice modal
  };

  // Determine which set of days to display
  const currentDays = currentView === 'month' ? daysInMonth : daysInWeek;

  return (
    <div className="react-calendar-mock p-4 bg-white rounded-lg shadow-md border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => currentView === 'month' ? navigateMonth(-1) : navigateWeek(-1)}
                className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 transition duration-150">
          Prev {currentView === 'month' ? 'Month' : 'Week'}
        </button>
        <span className="font-semibold text-lg">
          {currentDate.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={() => currentView === 'month' ? navigateMonth(1) : navigateWeek(1)}
                className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 transition duration-150">
          Next {currentView === 'month' ? 'Month' : 'Week'}
        </button>
      </div>

      <div className="grid grid-cols-7 text-center font-medium text-sm text-gray-500 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {currentDays.map((day, index) => (
          <div
            key={index} // Index is acceptable here as daysInMonth/Week are regenerated for each view change
            onClick={() => handleDayClick(day)}
            className={`p-2 rounded-md cursor-pointer text-center text-sm
              ${day.getMonth() !== currentDate.getMonth() && currentView === 'month' ? 'text-gray-400 bg-gray-100' : ''}
              ${isSameDay(day, new Date()) ? 'border-2 border-indigo-500 bg-indigo-100 text-indigo-800 font-bold' : 'hover:bg-blue-100'}
              ${isSameDay(day, value) ? 'bg-blue-200 border border-blue-400' : ''}
              flex flex-col items-center justify-center relative min-h-[60px] md:min-h-[80px]
            `}
            style={{backgroundColor: day.getMonth() !== currentDate.getMonth() && currentView === 'month' ? '#f5f5f5' : ''}}
          >
            <span className="font-semibold">{day.getDate()}</span>
            {/* Render content returned by tileContent prop */}
            {tileContent && tileContent({ date: day, view: currentView === 'month' ? 'month' : 'week' }).length > 0 && (
              <div className="absolute bottom-1 right-1 left-1 text-xs text-center overflow-hidden">
                {tileContent({ date: day, view: currentView === 'month' ? 'month' : 'week' }).map((contentString, idx) => (
                  <div key={idx} className="bg-indigo-500 text-white rounded-full px-1 py-0.5 mt-0.5 w-full truncate">
                    {contentString} {/* Render string directly */}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};


// Define global variables provided by the Canvas environment
// eslint-disable-next-line no-undef
const firebaseConfig = {
 apiKey: "AIzaSyDqUyS8UebUnFrRq3MwcYzTRIGjFrvlNgk",
  authDomain: "advocatepracticemanagerv2.firebaseapp.com",
  projectId: "advocatepracticemanagerv2",
  storageBucket: "advocatepracticemanagerv2.firebasestorage.app",
  messagingSenderId: "350631597709",
  appId: "1:350631597709:web:77d879ed2641976fdc34c4",
  measurementId: "G-2V7P43Y04E"
};
// eslint-disable-next-line no-undef
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
// eslint-disable-next-line no-undef
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Define color schemes
const colorSchemes = {
  indigo: {
    primary: 'indigo-600',
    hover: 'indigo-700',
    gradientFrom: 'blue-50',
    gradientTo: 'indigo-100',
    textPrimary: 'indigo-700',
    textSecondary: 'gray-800',
    tableHeaderBg: 'indigo-50',
    tableHoverBg: 'gray-50',
    border: 'indigo-200',
    inputFocus: 'indigo-500',
    buttonBg: 'indigo-600',
    buttonHover: 'indigo-700',
    buttonBorder: 'indigo-300',
    tabBgActive: 'indigo-600',
    tabTextActive: 'white',
    tabBgInactive: 'gray-200',
    tabTextInactive: 'gray-700',
    tabHoverBg: 'gray-300',
    headingColor: 'indigo-700',
    cardBorder: 'indigo-200',
  },
  teal: {
    primary: 'teal-600',
    hover: 'teal-700',
    gradientFrom: 'teal-50',
    gradientTo: 'cyan-100',
    textPrimary: 'teal-700',
    textSecondary: 'gray-800',
    tableHeaderBg: 'teal-50',
    tableHoverBg: 'gray-50',
    border: 'teal-200',
    inputFocus: 'teal-500',
    buttonBg: 'teal-600',
    buttonHover: 'teal-700',
    buttonBorder: 'teal-300',
    tabBgActive: 'teal-600',
    tabTextActive: 'white',
    tabBgInactive: 'gray-200',
    tabTextInactive: 'gray-700',
    tabHoverBg: 'gray-300',
    headingColor: 'teal-700',
    cardBorder: 'teal-200',
  },
  purple: {
    primary: 'purple-600',
    hover: 'purple-700',
    gradientFrom: 'purple-50',
    gradientTo: 'fuchsia-100',
    textPrimary: 'purple-700',
    textSecondary: 'gray-800',
    tableHeaderBg: 'purple-50',
    tableHoverBg: 'gray-50',
    border: 'purple-200',
    inputFocus: 'purple-500',
    buttonBg: 'purple-600',
    buttonHover: 'purple-700',
    buttonBorder: 'purple-300',
    tabBgActive: 'purple-600',
    tabTextActive: 'white',
    tabBgInactive: 'gray-200',
    tabTextInactive: 'gray-700',
    tabHoverBg: 'gray-300',
    headingColor: 'purple-700',
    cardBorder: 'purple-200',
  },
};

// Define font families to be used
const fontFamilies = {
  Inter: 'font-inter', // Using 'font-inter' utility class for Inter
  Roboto: 'font-roboto',
  'Open Sans': 'font-open-sans',
  Lato: 'font-lato',
  Montserrat: 'font-montserrat',
};

// Helper for court locations (common to Add and Edit Brief forms)
const CourtLocationInputs = ({
  briefCategory,
  appearType,
  courtType,
  setCourtType,
  highCourtLocation,
  setHighCourtLocation,
  magistratesCourtLocation,
  setMagistratesCourtLocation,
  customMagistratesCourtLocation,
  setCustomMagistratesCourtLocation,
  appTextColor
}) => {
  if (briefCategory === 'Appear') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2 p-2 border border-gray-300 rounded-md bg-gray-50">
        <div>
          <label htmlFor="courtType" className={`block ${appTextColor} text-sm font-bold mb-1`}>
            Court Type:
          </label>
          <select
            id="courtType"
            value={courtType}
            onChange={(e) => {
              setCourtType(e.target.value);
              setHighCourtLocation('');
              setMagistratesCourtLocation('');
              setCustomMagistratesCourtLocation('');
            }}
            className={`shadow border rounded-md w-full py-2 px-3 ${appTextColor}`}
            required={appearType === 'Application' || appearType === 'Action'} // Required if it's an appearance
          >
            <option value="">Select Court Type</option>
            <option value="High Court">High Court</option>
            <option value="Magistrates Court">Magistrates Court</option>
          </select>
        </div>

        {courtType === 'High Court' && (
          <div>
            <label htmlFor="highCourtLocation" className={`block ${appTextColor} text-sm font-bold mb-1`}>
              High Court Location:
            </label>
            <select
              id="highCourtLocation"
              value={highCourtLocation}
              onChange={(e) => setHighCourtLocation(e.target.value)}
              className={`shadow border rounded-md w-full py-2 px-3 ${appTextColor}`}
              required
            >
              <option value="">Select Location</option>
              <option value="Durban">Durban</option>
              <option value="Pietermaritzburg">Pietermaritzburg</option>
            </select>
          </div>
        )}

        {courtType === 'Magistrates Court' && (
          <div className="flex flex-col">
            <label htmlFor="magistratesCourtLocation" className={`block ${appTextColor} text-sm font-bold mb-1`}>
              Magistrates Court Location:
            </label>
            <select
              id="magistratesCourtLocation"
              value={magistratesCourtLocation}
              onChange={(e) => {
                setMagistratesCourtLocation(e.target.value);
                if (e.target.value !== 'Other') {
                  setCustomMagistratesCourtLocation('');
                }
              }}
              className={`shadow border rounded-md w-full py-2 px-3 ${appTextColor}`}
              required
            >
              <option value="">Select Location</option>
              <option value="Pinetown">Pinetown</option>
              <option value="Durban">Durban</option>
              <option value="Verulam">Verulam</option>
              <option value="Pietermaritzburg">Pietermaritzburg</option>
              <option value="Scottburgh">Scottburgh</option>
              <option value="Other">Other</option>
            </select>
            {magistratesCourtLocation === 'Other' && (
              <input
                type="text"
                value={customMagistratesCourtLocation}
                onChange={(e) => setCustomMagistratesCourtLocation(e.target.value)}
                className={`shadow appearance-none border rounded-md w-full py-2 px-3 mt-2 ${appTextColor}`}
                placeholder="Specify town/city"
                required
              />
            )}
          </div>
        )}
      </div>
    );
  }
  return null;
};


// AddBriefFormForMatter component to handle local state for brief creation
const AddBriefFormForMatter = ({
  matter,
  onAddBriefSubmit,
  onBriefAdded, // New prop to notify parent when brief is added
  draftingOptions,
  setDraftingOptions, // Pass this setter to allow updating global drafting options
  appTextColor,
  activeColorScheme,
  buttonPrimaryBg,
  buttonPrimaryHover,
  buttonPrimaryText,
  theme // Pass theme for conditional styling
}) => {
  const [briefDescription, setBriefDescription] = useState('');
  const [briefDate, setBriefDate] = useState('');
  const [briefCategory, setBriefCategory] = useState('');
  const [appearType, setAppearType] = useState('');
  const [applicationSubtype, setApplicationSubtype] = useState('');
  const [draftType, setDraftType] = useState('');
  const [customDraftType, setCustomDraftType] = useState('');
  // New states for court details
  const [courtType, setCourtType] = useState('');
  const [highCourtLocation, setHighCourtLocation] = useState('');
  const [magistratesCourtLocation, setMagistratesCourtLocation] = useState('');
  const [customMagistratesCourtLocation, setCustomMagistratesCourtLocation] = useState('');


  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!briefDate || !briefCategory) {
      alert('Brief date and category are required.');
      return;
    }

    // Validate specific brief category fields
    if (briefCategory === 'Appear') {
      if (!appearType) {
        alert('Please select an appearance type.');
        return;
      }
      if (appearType === 'Application' && !applicationSubtype) {
        alert('Please select an application subtype (unopposed/opposed).');
        return;
      }
      if (!courtType) { // Court type is required for appearances
        alert('Please select a court type.');
        return;
      }
      if (courtType === 'High Court' && !highCourtLocation) {
        alert('Please select a High Court location.');
        return;
      }
      if (courtType === 'Magistrates Court' && !magistratesCourtLocation) {
        alert('Please select a Magistrates Court location.');
        return;
      }
      if (magistratesCourtLocation === 'Other' && !customMagistratesCourtLocation.trim()) {
        alert('Please specify the Magistrates Court location.');
        return;
      }

    } else if (briefCategory === 'Draft') {
      if (!draftType) {
        alert('Please select a drafting type.');
        return;
      }
      if (draftType === 'Other' && !customDraftType.trim()) {
        alert('Please specify the custom drafting type.');
        return;
      }
      // Add custom draft type to options if not already present
      if (draftType === 'Other' && customDraftType.trim() !== '' && !draftingOptions.includes(customDraftType.trim())) {
        setDraftingOptions(prev => {
          const newOptions = [...prev.filter(opt => opt !== 'Other'), customDraftType.trim(), 'Other'];
          return newOptions.sort((a, b) => {
            if (a === 'Other') return 1;
            if (b === 'Other') return -1;
            return a.localeCompare(b);
          });
        });
      }
    }

    // Construct full brief description and specific details
    let fullBriefDescription = briefDescription.trim();
    let specificBriefDetails = {};

    if (briefCategory === 'Appear') {
      fullBriefDescription = `Appear: ${appearType}`;
      if (appearType === 'Application') {
        fullBriefDescription += ` (${applicationSubtype})`;
      }
      // Add court details to description
      if (courtType) {
        let courtLocation = '';
        if (courtType === 'High Court' && highCourtLocation) {
          courtLocation = highCourtLocation;
        } else if (courtType === 'Magistrates Court' && magistratesCourtLocation) {
          courtLocation = magistratesCourtLocation === 'Other' ? customMagistratesCourtLocation : magistratesCourtLocation;
        }
        if (courtLocation) {
          fullBriefDescription += ` at ${courtType} (${courtLocation})`;
        } else {
          fullBriefDescription += ` at ${courtType}`; // If location not specified
        }
      }

      if (briefDescription.trim()) { // Only append if there's actual brief specific details
        fullBriefDescription += ` - ${briefDescription.trim()}`;
      }
      specificBriefDetails = { briefCategory, appearType, applicationSubtype, courtType, highCourtLocation, magistratesCourtLocation, customMagistratesCourtLocation: customMagistratesCourtLocation.trim() };
    } else if (briefCategory === 'Consult') {
      fullBriefDescription = `Consult: ${briefDescription.trim()}`;
      specificBriefDetails = { briefCategory };
    } else if (briefCategory === 'Draft') {
      fullBriefDescription = `Draft: ${draftType}`;
      if (draftType === 'Other') {
        fullBriefDescription += ` (${customDraftType.trim()})`;
      }
      if (briefDescription.trim()) { // Only append if there's actual brief specific details
        fullBriefDescription += ` - ${briefDescription.trim()}`;
      }
      specificBriefDetails = { briefCategory, draftType, customDraftType: customDraftType.trim() };
    }

    // Call the parent's submit handler with the new brief data
    await onAddBriefSubmit({
      description: fullBriefDescription,
      originalDescription: briefDescription.trim(),
      date: briefDate,
      matterId: matter.id,
      attorneysFirmId: matter.assignedAttorneysFirmId,
      selectedContactPersonNames: matter.assignedContactPersonNames || [],
      ...specificBriefDetails,
      completed: false,
      createdAt: new Date(),
    });

    // Reset local form states after submission
    setBriefDescription('');
    setBriefDate('');
    setBriefCategory('');
    setAppearType('');
    setApplicationSubtype('');
    setDraftType('');
    setCustomDraftType('');
    setCourtType('');
    setHighCourtLocation('');
    setMagistratesCourtLocation('');
    setCustomMagistratesCourtLocation('');

    // Notify parent that brief was added (to collapse form)
    onBriefAdded();
  };

  return (
    <form onSubmit={handleSubmit} className={`p-4 rounded-lg shadow-inner ${theme === 'light' ? 'bg-gray-100' : 'bg-gray-800'}`}>
      <div className="mb-2">
        <label htmlFor={`briefCategory-${matter.id}`} className={`block ${appTextColor} text-sm font-bold mb-1`}>
          Brief Category:
        </label>
        <select
          id={`briefCategory-${matter.id}`}
          value={briefCategory}
          onChange={(e) => {
            setBriefCategory(e.target.value);
            setAppearType('');
            setApplicationSubtype('');
            setDraftType('');
            setCustomDraftType('');
            setCourtType(''); // Reset court details on category change
            setHighCourtLocation('');
            setMagistratesCourtLocation('');
            setCustomMagistratesCourtLocation('');
          }}
          className={`shadow border rounded-md w-full py-2 px-3 ${appTextColor}`}
          required
        >
          <option value="">Select a Category</option>
          <option value="Appear">Appear</option>
          <option value="Consult">Consult</option>
          <option value="Draft">Draft</option>
        </select>
      </div>

      {briefCategory === 'Appear' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2 p-2 border border-gray-300 rounded-md bg-gray-50">
          <div>
            <label htmlFor={`appearType-${matter.id}`} className={`block ${appTextColor} text-sm font-bold mb-1`}>
              Appearance Type:
            </label>
            <select
              id={`appearType-${matter.id}`}
              value={appearType}
              onChange={(e) => {
                setAppearType(e.target.value);
                if (e.target.value !== 'Application') {
                  setApplicationSubtype('');
                }
              }}
              className={`shadow border rounded-md w-full py-2 px-3 ${appTextColor}`}
              required
            >
              <option value="">Select Type</option>
              <option value="Application">Application</option>
              <option value="Action">Action</option>
            </select>
          </div>
          {appearType === 'Application' && (
            <div>
              <label htmlFor={`applicationSubtype-${matter.id}`} className={`block ${appTextColor} text-sm font-bold mb-1`}>
                Application Subtype:
              </label>
              <select
                id={`applicationSubtype-${matter.id}`}
                value={applicationSubtype}
                onChange={(e) => setApplicationSubtype(e.target.value)}
                className={`shadow border rounded-md w-full py-2 px-3 ${appTextColor}`}
                required
              >
                <option value="">Select Subtype</option>
                <option value="Unopposed">Unopposed</option>
                <option value="Opposed">Opposed</option>
              </select>
            </div>
          )}
          {/* Court Location Inputs for Appearance */}
          <CourtLocationInputs
            briefCategory={briefCategory}
            appearType={appearType}
            courtType={courtType}
            setCourtType={setCourtType}
            highCourtLocation={highCourtLocation}
            setHighCourtLocation={setHighCourtLocation}
            magistratesCourtLocation={magistratesCourtLocation}
            setMagistratesCourtLocation={setMagistratesCourtLocation}
            customMagistratesCourtLocation={customMagistratesCourtLocation}
            setCustomMagistratesCourtLocation={setCustomMagistratesCourtLocation}
            appTextColor={appTextColor}
          />
        </div>
      )}

      {briefCategory === 'Draft' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2 p-2 border border-gray-300 rounded-md bg-gray-50">
          <div>
            <label htmlFor={`draftType-${matter.id}`} className={`block ${appTextColor} text-sm font-bold mb-1`}>
              Drafting Type:
            </label>
            <select
              id={`draftType-${matter.id}`}
              value={draftType}
              onChange={(e) => {
                setDraftType(e.target.value);
                if (e.target.value !== 'Other') {
                  setCustomDraftType('');
                }
              }}
              className={`shadow border rounded-md w-full py-2 px-3 ${appTextColor}`}
              required
            >
              <option value="">Select Type</option>
              {draftingOptions.map((option, optIndex) => (
                <option key={optIndex} value={option}>{option}</option>
              ))}
            </select>
          </div>
          {draftType === 'Other' && (
            <div>
              <label htmlFor={`customDraftType-${matter.id}`} className={`block ${appTextColor} text-sm font-bold mb-1`}>
                Specify Other Drafting:
              </label>
              <input
                type="text"
                id={`customDraftType-${matter.id}`}
                value={customDraftType}
                onChange={(e) => setCustomDraftType(e.target.value)}
                className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor}`}
                placeholder="e.g., Heads of Argument"
                required
              />
            </div>
          )}
        </div>
      )}

      <div className="mb-2">
        <label htmlFor={`briefDescription-${matter.id}`} className={`block ${appTextColor} text-sm font-bold mb-1`}>
          Brief Specific Details / Description (Optional):
        </label>
        <input
          type="text"
          id={`briefDescription-${matter.id}`}
          value={briefDescription}
          onChange={(e) => setBriefDescription(e.target.value)}
          className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor}`}
          placeholder="e.g., Argue motion, Research on property law, etc."
        />
      </div>
      <div className="grid grid-cols-1 gap-2 mb-4">
        <div>
          <label htmlFor={`briefDate-${matter.id}`} className={`block ${appTextColor} text-sm font-bold mb-1`}>
            {briefCategory === 'Consult' ? 'Consultation Date:' : 'Due Date:'}
          </label>
          <input
            type="date"
            id={`briefDate-${matter.id}`}
            value={briefDate}
            onChange={(e) => setBriefDate(e.target.value)}
            className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor}`}
            required
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          className={`bg-${buttonPrimaryBg} hover:bg-${buttonPrimaryHover} ${buttonPrimaryText} font-bold py-2 px-4 rounded-lg shadow-md transition duration-200`}
        >
          Add Brief
        </button>
      </div>
    </form>
  );
};

// EditBriefForm component for inline editing
const EditBriefForm = ({
  brief,
  onUpdateBriefSubmit,
  onCancelEdit,
  draftingOptions,
  setDraftingOptions,
  appTextColor,
  activeColorScheme,
  buttonPrimaryBg,
  buttonPrimaryHover,
  buttonPrimaryText,
  buttonSecondaryBg,
  buttonSecondaryHover,
  buttonSecondaryText,
  theme
}) => {
  const [briefDescription, setBriefDescription] = useState(brief.originalDescription || '');
  const [briefDate, setBriefDate] = useState(brief.date);
  const [briefCategory, setBriefCategory] = useState(brief.briefCategory || '');
  const [appearType, setAppearType] = useState(brief.appearType || '');
  const [applicationSubtype, setApplicationSubtype] = useState(brief.applicationSubtype || '');
  const [draftType, setDraftType] = useState(brief.draftType || '');
  const [customDraftType, setCustomDraftType] = useState(brief.customDraftType || '');
  // New states for court details, initialized from brief
  const [courtType, setCourtType] = useState(brief.courtType || '');
  const [highCourtLocation, setHighCourtLocation] = useState(brief.highCourtLocation || '');
  const [magistratesCourtLocation, setMagistratesCourtLocation] = useState(brief.magistratesCourtLocation || '');
  const [customMagistratesCourtLocation, setCustomMagistratesCourtLocation] = useState(brief.customMagistratesCourtLocation || '');


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!briefDate || !briefCategory) {
      alert('Brief date and category are required.');
      return;
    }

    if (briefCategory === 'Appear') {
      if (!appearType) {
        alert('Please select an appearance type.');
        return;
      }
      if (appearType === 'Application' && !applicationSubtype) {
        alert('Please select an application subtype (unopposed/opposed).');
        return;
      }
      if (!courtType) { // Court type is required for appearances
        alert('Please select a court type.');
        return;
      }
      if (courtType === 'High Court' && !highCourtLocation) {
        alert('Please select a High Court location.');
        return;
      }
      if (courtType === 'Magistrates Court' && !magistratesCourtLocation) {
        alert('Please select a Magistrates Court location.');
        return;
      }
      if (magistratesCourtLocation === 'Other' && !customMagistratesCourtLocation.trim()) {
        alert('Please specify the Magistrates Court location.');
        return;
      }
    } else if (briefCategory === 'Draft') {
      if (!draftType) {
        alert('Please select a drafting type.');
        return;
      }
      if (draftType === 'Other' && !customDraftType.trim()) {
        alert('Please specify the custom drafting type.');
        return;
      }
      if (draftType === 'Other' && customDraftType.trim() !== '' && !draftingOptions.includes(customDraftType.trim())) {
        setDraftingOptions(prev => {
          const newOptions = [...prev.filter(opt => opt !== 'Other'), customDraftType.trim(), 'Other'];
          return newOptions.sort((a, b) => {
            if (a === 'Other') return 1;
            if (b === 'Other') return -1;
            return a.localeCompare(b);
          });
        });
      }
    }

    let fullBriefDescription = briefDescription.trim();
    let specificBriefDetails = {};

    if (briefCategory === 'Appear') {
      fullBriefDescription = `Appear: ${appearType}`;
      if (appearType === 'Application') {
        fullBriefDescription += ` (${applicationSubtype})`;
      }
      // Add court details to description
      if (courtType) {
        let courtLocation = '';
        if (courtType === 'High Court' && highCourtLocation) {
          courtLocation = highCourtLocation;
        } else if (courtType === 'Magistrates Court' && magistratesCourtLocation) {
          courtLocation = magistratesCourtLocation === 'Other' ? customMagistratesCourtLocation : magistratesCourtLocation;
        }
        if (courtLocation) {
          fullBriefDescription += ` at ${courtType} (${courtLocation})`;
        } else {
          fullBriefDescription += ` at ${courtType}`; // If location not specified
        }
      }

      if (briefDescription.trim()) {
        fullBriefDescription += ` - ${briefDescription.trim()}`;
      }
      specificBriefDetails = { briefCategory, appearType, applicationSubtype, courtType, highCourtLocation, magistratesCourtLocation, customMagistratesCourtLocation: customMagistratesCourtLocation.trim() };
    } else if (briefCategory === 'Consult') {
      fullBriefDescription = `Consult: ${briefDescription.trim()}`;
      specificBriefDetails = { briefCategory };
    } else if (briefCategory === 'Draft') {
      fullBriefDescription = `Draft: ${draftType}`;
      if (draftType === 'Other') {
        fullBriefDescription += ` (${customDraftType.trim()})`;
      }
      if (briefDescription.trim()) {
        fullBriefDescription += ` - ${briefDescription.trim()}`;
      }
      specificBriefDetails = { briefCategory, draftType, customDraftType: customDraftType.trim() };
    }


    await onUpdateBriefSubmit(brief.id, {
      description: fullBriefDescription,
      originalDescription: briefDescription.trim(),
      date: briefDate,
      matterId: brief.matterId,
      attorneysFirmId: brief.attorneysFirmId,
      selectedContactPersonNames: brief.selectedContactPersonNames,
      ...specificBriefDetails,
      completed: brief.completed, // Preserve completion status
    });
  };

  return (
    <form onSubmit={handleSubmit} className={`p-4 rounded-lg shadow-inner ${theme === 'light' ? 'bg-gray-50' : 'bg-gray-700'}`}>
      <div className="mb-2">
        <label htmlFor={`editBriefCategory-${brief.id}`} className={`block ${appTextColor} text-sm font-bold mb-1`}>
          Brief Category:
        </label>
        <select
          id={`editBriefCategory-${brief.id}`}
          value={briefCategory}
          onChange={(e) => {
            setBriefCategory(e.target.value);
            setAppearType('');
            setApplicationSubtype('');
            setDraftType('');
            setCustomDraftType('');
            setCourtType(''); // Reset court details on category change
            setHighCourtLocation('');
            setMagistratesCourtLocation('');
            setCustomMagistratesCourtLocation('');
          }}
          className={`shadow border rounded-md w-full py-2 px-3 ${appTextColor}`}
          required
        >
          <option value="">Select a Category</option>
          <option value="Appear">Appear</option>
          <option value="Consult">Consult</option>
          <option value="Draft">Draft</option>
        </select>
      </div>

      {briefCategory === 'Appear' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2 p-2 border border-gray-300 rounded-md bg-gray-100">
          <div>
            <label htmlFor={`editAppearType-${brief.id}`} className={`block ${appTextColor} text-sm font-bold mb-1`}>
              Appearance Type:
            </label>
            <select
              id={`editAppearType-${brief.id}`}
              value={appearType}
              onChange={(e) => {
                setAppearType(e.target.value);
                if (e.target.value !== 'Application') {
                  setApplicationSubtype('');
                }
              }}
              className={`shadow border rounded-md w-full py-2 px-3 ${appTextColor}`}
              required
            >
              <option value="">Select Type</option>
              <option value="Application">Application</option>
              <option value="Action">Action</option>
            </select>
          </div>
          {appearType === 'Application' && (
            <div>
              <label htmlFor={`editApplicationSubtype-${brief.id}`} className={`block ${appTextColor} text-sm font-bold mb-1`}>
                Application Subtype:
              </label>
              <select
                id={`editApplicationSubtype-${brief.id}`}
                value={applicationSubtype}
                onChange={(e) => setApplicationSubtype(e.target.value)}
                className={`shadow border rounded-md w-full py-2 px-3 ${appTextColor}`}
                required
              >
                <option value="">Select Subtype</option>
                <option value="Unopposed">Unopposed</option>
                <option value="Opposed">Opposed</option>
              </select>
            </div>
          )}
          {/* Court Location Inputs for Appearance */}
          <CourtLocationInputs
            briefCategory={briefCategory}
            appearType={appearType}
            courtType={courtType}
            setCourtType={setCourtType}
            highCourtLocation={highCourtLocation}
            setHighCourtLocation={setHighCourtLocation}
            magistratesCourtLocation={magistratesCourtLocation}
            setMagistratesCourtLocation={setMagistratesCourtLocation}
            customMagistratesCourtLocation={customMagistratesCourtLocation}
            setCustomMagistratesCourtLocation={setCustomMagistratesCourtLocation}
            appTextColor={appTextColor}
          />
        </div>
      )}

      {briefCategory === 'Draft' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2 p-2 border border-gray-300 rounded-md bg-gray-100">
          <div>
            <label htmlFor={`editDraftType-${brief.id}`} className={`block ${appTextColor} text-sm font-bold mb-1`}>
              Drafting Type:
            </label>
            <select
              id={`editDraftType-${brief.id}`}
              value={draftType}
              onChange={(e) => {
                setDraftType(e.target.value);
                if (e.target.value !== 'Other') {
                  setCustomDraftType('');
                }
              }}
              className={`shadow border rounded-md w-full py-2 px-3 ${appTextColor}`}
              required
            >
              <option value="">Select Type</option>
              {draftingOptions.map((option, optIndex) => (
                <option key={optIndex} value={option}>{option}</option>
              ))}
            </select>
          </div>
          {draftType === 'Other' && (
            <div>
              <label htmlFor={`editCustomDraftType-${brief.id}`} className={`block ${appTextColor} text-sm font-bold mb-1`}>
                Specify Other Drafting:
              </label>
              <input
                type="text"
                id={`editCustomDraftType-${brief.id}`}
                value={customDraftType}
                onChange={(e) => setCustomDraftType(e.target.value)}
                className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor}`}
                placeholder="e.g., Heads of Argument"
                required
              />
            </div>
          )}
        </div>
      )}

      <div className="mb-2">
        <label htmlFor={`editBriefDescription-${brief.id}`} className={`block ${appTextColor} text-sm font-bold mb-1`}>
          Brief Specific Details / Description (Optional):
        </label>
        <input
          type="text"
          id={`editBriefDescription-${brief.id}`}
          value={briefDescription}
          onChange={(e) => setBriefDescription(e.target.value)}
          className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor}`}
          placeholder="e.g., Argue motion, Research on property law, etc."
        />
      </div>
      <div className="grid grid-cols-1 gap-2 mb-4">
        <div>
          <label htmlFor={`editBriefDate-${brief.id}`} className={`block ${appTextColor} text-sm font-bold mb-1`}>
            {briefCategory === 'Consult' ? 'Consultation Date:' : 'Due Date:'}
          </label>
          <input
            type="date"
            id={`editBriefDate-${brief.id}`}
            value={briefDate}
            onChange={(e) => setBriefDate(e.target.value)}
            className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor}`}
            required
          />
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button
          type="submit"
          className={`bg-${buttonPrimaryBg} hover:bg-${buttonPrimaryHover} ${buttonPrimaryText} font-bold py-2 px-4 rounded-lg shadow-md transition duration-200`}
        >
          Save Changes
        </button>
        <button
          type="button"
          onClick={onCancelEdit}
          className={`${buttonSecondaryBg} hover:bg-${buttonSecondaryHover} ${buttonSecondaryText} font-bold py-2 px-4 rounded-lg shadow-md transition duration-200`}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};


// NEW COMPONENT: ReceptionistBriefEntry
const ReceptionistBriefEntry = ({
  matters,
  attorneys,
  userId, // Pass userId for Firestore operations
  appId, // Pass appId for Firestore operations
  db, // Pass db for Firestore operations
  addBriefToFirestore, // Re-use the existing brief submission
  showMessage,
  appTextColor,
  activeColorScheme,
  buttonPrimaryBg,
  buttonPrimaryHover,
  buttonPrimaryText,
  theme,
}) => {
  const [matterName, setMatterName] = useState('');
  const [briefDate, setBriefDate] = useState('');
  const [attorneysFirmId, setAttorneysFirmId] = useState('');
  const [selectedContactPersonNames, setSelectedContactPersonNames] = useState([]);
  const [briefCategory, setBriefCategory] = useState('Appear'); // Default to Appear
  // New states for court details
  const [courtType, setCourtType] = useState('');
  const [highCourtLocation, setHighCourtLocation] = useState('');
  const [magistratesCourtLocation, setMagistratesCourtLocation] = useState('');
  const [customMagistratesCourtLocation, setCustomMagistratesCourtLocation] = useState('');


  const getContactsForFirm = useCallback((firmId) => {
    const firm = attorneys.find(att => att.id === firmId);
    return firm ? (firm.contactPersons || []) : [];
  }, [attorneys]);

  const handleReceptionistSubmit = async (e) => {
    e.preventDefault();

    if (!matterName.trim() || !briefDate.trim() || !attorneysFirmId) {
      showMessage('Matter Name, Brief Date, and Attorneys\' Firm are required.', 'error');
      return;
    }

    // Validate court details if briefCategory is 'Appear'
    if (briefCategory === 'Appear') {
      if (!courtType) {
        showMessage('Please select a court type for appearance briefs.', 'error');
        return;
      }
      if (courtType === 'High Court' && !highCourtLocation) {
        showMessage('Please select a High Court location.', 'error');
        return;
      }
      if (courtType === 'Magistrates Court' && !magistratesCourtLocation) {
        showMessage('Please select a Magistrates Court location.', 'error');
        return;
      }
      if (magistratesCourtLocation === 'Other' && !customMagistratesCourtLocation.trim()) {
        showMessage('Please specify the custom Magistrates Court location.', 'error');
        return;
      }
    }


    // Default values for brief category specifics when entered by receptionist
    let appearType = '';
    let applicationSubtype = '';
    let draftType = '';
    let customDraftType = '';
    const briefDescription = ''; // Receptionist does not enter specific brief details here


    let currentMatterId;
    // Check if matter exists (case-insensitive search)
    let existingMatter = matters.find(m => m.name.toLowerCase() === matterName.trim().toLowerCase());

    if (existingMatter) {
      currentMatterId = existingMatter.id;
    } else {
      // Create new matter if it doesn't exist
      try {
        const newMatterRef = await addDoc(collection(db, `artifacts/${appId}/users/${userId}/matters`), {
          name: matterName.trim(),
          description: 'Matter created via Receptionist Brief Entry.', // Default description
          attorneyReference: '', // No attorney reference from receptionist
          assignedAttorneysFirmId: attorneysFirmId,
          assignedContactPersonNames: selectedContactPersonNames,
          createdAt: new Date(),
        });
        currentMatterId = newMatterRef.id;
        showMessage(`New matter "${matterName.trim()}" created automatically.`, 'success');
      } catch (e) {
        showMessage(`Failed to create new matter: ${e.message}`, 'error');
        console.error('Error creating new matter:', e);
        return; // Stop if matter creation fails
      }
    }

    // Construct full brief description and specific details based on selected category
    // This part ensures a meaningful description is saved even if reception doesn't enter details
    let fullBriefDescription = '';
    let specificBriefDetails = {};

    // For receptionist, simplify the auto-description. Detailed parts can be added later by advocate.
    switch(briefCategory) {
      case 'Appear':
        fullBriefDescription = 'Appearance Brief (details to be added)';
        appearType = 'Application'; // Default for later edit
        applicationSubtype = 'Unopposed'; // Default for later edit
        // Add court details
        if (courtType) {
          let courtLocation = '';
          if (courtType === 'High Court' && highCourtLocation) {
            courtLocation = highCourtLocation;
          } else if (courtType === 'Magistrates Court' && magistratesCourtLocation) {
            courtLocation = magistratesCourtLocation === 'Other' ? customMagistratesCourtLocation : magistratesCourtLocation;
          }
          if (courtLocation) {
            fullBriefDescription += ` at ${courtType} (${courtLocation})`;
          } else {
            fullBriefDescription += ` at ${courtType}`;
          }
        }
        break;
      case 'Consult':
        fullBriefDescription = 'Consultation Brief (details to be added)';
        break;
      case 'Draft':
        fullBriefDescription = 'Drafting Brief (details to be added)';
        draftType = 'Opinion'; // Default for later edit
        break;
      default:
        fullBriefDescription = 'Brief (details to be added)';
    }

    specificBriefDetails = { briefCategory, appearType, applicationSubtype, draftType, customDraftType, courtType, highCourtLocation, magistratesCourtLocation, customMagistratesCourtLocation: customMagistratesCourtLocation.trim() };


    try {
      await addBriefToFirestore({ // Re-using the central brief addition function
        description: fullBriefDescription,
        originalDescription: briefDescription.trim(), // This will be empty now
        date: briefDate,
        matterId: currentMatterId,
        attorneysFirmId: attorneysFirmId,
        selectedContactPersonNames: selectedContactPersonNames,
        ...specificBriefDetails,
        completed: false,
        createdAt: new Date(),
      });
      showMessage('Brief submitted successfully!', 'success');
      // Reset form fields after successful submission
      setMatterName('');
      setBriefDate('');
      setAttorneysFirmId('');
      setSelectedContactPersonNames([]);
      setBriefCategory('Appear'); // Reset to default
      setCourtType('');
      setHighCourtLocation('');
      setMagistratesCourtLocation('');
      setCustomMagistratesCourtLocation('');
      // No need to reset appearType, applicationSubtype, draftType, customDraftType as they are not controlled by inputs
    } catch (e) {
      showMessage(`Error submitting brief: ${e.message}`, 'error');
      console.error('Error submitting brief:', e);
    }
  };

  const handleReceptionistContactPersonsChange = useCallback((e) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
    setSelectedContactPersonNames(selectedOptions);
  }, []);

  const handleBriefCategoryChange = (e) => {
    setBriefCategory(e.target.value);
    setCourtType(''); // Reset court details on category change
    setHighCourtLocation('');
    setMagistratesCourtLocation('');
    setCustomMagistratesCourtLocation('');
  };


  return (
    <div className={`${theme === 'light' ? 'bg-gray-100' : 'bg-gray-800'} p-6 rounded-lg shadow-inner`}>
      <h3 className={`text-2xl font-bold ${activeColorScheme.headingColor} mb-6 text-center`}>
        Receptionist Brief Entry
      </h3>
      <form onSubmit={handleReceptionistSubmit} className={`space-y-4 ${appTextColor}`}>
        <div>
          <label htmlFor="receptionistMatterName" className="block text-sm font-bold mb-1">
            Matter Name:
          </label>
          <input
            type="text"
            id="receptionistMatterName"
            value={matterName}
            onChange={(e) => setMatterName(e.target.value)}
            className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus}`}
            placeholder="e.g., A v B"
            required
          />
        </div>

        <div>
            <label htmlFor="receptionistBriefCategory" className="block text-sm font-bold mb-1">
                Brief Category:
            </label>
            <select
                id="receptionistBriefCategory"
                value={briefCategory}
                onChange={handleBriefCategoryChange}
                className={`shadow border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus}`}
                required
            >
                <option value="Appear">Appear</option>
                <option value="Consult">Consult</option>
                <option value="Draft">Draft</option>
            </select>
        </div>

        {/* Court Location Inputs for Appearance for Receptionist */}
        {briefCategory === 'Appear' && (
          <CourtLocationInputs
            briefCategory={briefCategory}
            appearType="Any" // Placeholder since receptionist doesn't choose specific appear type
            courtType={courtType}
            setCourtType={setCourtType}
            highCourtLocation={highCourtLocation}
            setHighCourtLocation={setHighCourtLocation}
            magistratesCourtLocation={magistratesCourtLocation}
            setMagistratesCourtLocation={setMagistratesCourtLocation}
            customMagistratesCourtLocation={customMagistratesCourtLocation}
            setCustomMagistratesCourtLocation={setCustomMagistratesCourtLocation}
            appTextColor={appTextColor}
          />
        )}


        <div>
          <label htmlFor="receptionistBriefDate" className="block text-sm font-bold mb-1">
            {briefCategory === 'Consult' ? 'Consultation Date:' : 'Due Date:'}
          </label>
          <input
            type="date"
            id="receptionistBriefDate"
            value={briefDate}
            onChange={(e) => setBriefDate(e.target.value)}
            className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus}`}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="receptionistAttorneysFirm" className="block text-sm font-bold mb-1">
              Attorneys' Firm:
            </label>
            <select
              id="receptionistAttorneysFirm"
              value={attorneysFirmId}
              onChange={(e) => {
                setAttorneysFirmId(e.target.value);
                setSelectedContactPersonNames([]); // Clear contacts when firm changes
              }}
              className={`shadow border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus}`}
              required
            >
              <option value="">Select an Attorneys' Firm</option>
              {attorneys.map((firm) => (
                <option key={firm.id} value={firm.id}>{firm.firmName}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="receptionistContactPersons" className="block text-sm font-bold mb-1">
              Contact Person(s):
            </label>
            <select
              id="receptionistContactPersons"
              multiple
              value={selectedContactPersonNames}
              onChange={handleReceptionistContactPersonsChange}
              className={`shadow border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} h-24`}
              disabled={!attorneysFirmId}
            >
              {attorneysFirmId ? (
                getContactsForFirm(attorneysFirmId).map((contact, index) => (
                  <option key={index} value={contact.name}>
                    {contact.name} ({contact.phone || 'N/A'})
                  </option>
                ))
              ) : (
                <option value="" disabled>Select a firm first</option>
              )}
            </select>
          </div>
        </div>

        {/* Brief Specific Details (Optional) textarea removed for receptionist */}

        <div className="flex justify-end">
          <button
            type="submit"
            className={`bg-${buttonPrimaryBg} hover:bg-${buttonPrimaryHover} ${buttonPrimaryText} font-bold py-2 px-6 rounded-lg shadow-md transition duration-200`}
          >
            Submit Brief
          </button>
        </div>
      </form>
    </div>
  );
};


function App() {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [currentPage, setCurrentPage] = useState('practice-overview'); // Set default to new dashboard page
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success', 'error', 'info'

  // State for data
  const [matters, setMatters] = useState([]);
  const [attorneys, setAttorneys] = useState([]);
  const [briefs, setBriefs] = useState([]);
  const [workRecords, setWorkRecords] = useState([]);

  // State for forms - Matters
  const [newMatterName, setNewMatterName] = useState('');
  const [newMatterDescription, setNewMatterDescription] = useState('');
  const [newMatterAttorneyRef, setNewMatterAttorneyRef] = useState(''); // New state for attorney reference
  const [editingMatterId, setEditingMatterId] = useState(null);
  const [newMatterAttorneysFirmId, setNewMatterAttorneysFirmId] = useState('');
  const [newMatterSelectedContactPersons, setNewMatterSelectedContactPersons] = useState([]);
  const [initialMatterBriefs, setInitialMatterBriefs] = useState([]);

  // State for forms - Attorneys
  const [newFirmName, setNewFirmName] = useState('');
  const [newFirmBuilding, setNewFirmBuilding] = useState('');
  const [newFirmStreet, setNewFirmStreet] = useState('');
  const [newFirmCity, setNewFirmCity] = useState('');
  const [newFirmProvince, setNewFirmProvince] = useState('');
  const [newFirmGeneralPhone, setNewFirmGeneralPhone] = useState('');
  const [newFirmGeneralEmail, setNewFirmGeneralEmail] = useState('');
  const [currentContactPersons, setCurrentContactPersons] = useState([{ name: '', phone: '', email: '' }]);
  const [editingAttorneyId, setEditingAttorneyId] = useState(null);
  const [attorneysSubTab, setAttorneysSubTab] = useState('registered-attorneys'); // New state for Attorneys sub-tabs


  // States for Fee Settings
  const [hourlyRate, setHourlyRate] = useState(1500);
  const [unopposedMotionCourtFee, setUnopposedMotionCourtFee] = useState(3000);
  const [opposedMotionCourtFee, setOpposedMotionCourtFee] = useState(5000);
  const [dayFee, setDayFee] = useState(8000);
  const [appDateFormat, setAppDateFormat] = useState('YYYY-MM-DD'); // Default format

  // New states for display settings
  const [theme, setTheme] = useState('light'); // 'light' or 'dark'
  const [colorScheme, setColorScheme] = useState('indigo'); // e.g., 'indigo', 'teal', 'purple'
  const [fontFamily, setFontFamily] = useState('Inter'); // e.g., 'Inter', 'Roboto', 'Open Sans'

  // Sorting and Filtering for Matters & Briefs View
  const [sortByKey, setSortByKey] = useState('name'); // 'name', 'attorney', 'dueDate'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc', 'desc'
  const [dashboardFilterDate, setDashboardFilterDate] = useState(new Date()); // For dashboard calendar filter
  const [calendarDate, setCalendarDate] = useState(new Date());

  // State for Time Input Modal
  const [showTimeInputModal, setShowTimeInputModal] = useState(false);
  const [briefToComplete, setBriefToComplete] = useState(null);

  // State for Calendar Action Choice Modal
  const [showCalendarActionChoiceModal, setShowCalendarActionChoiceModal] = useState(false);
  const [selectedCalendarDateForAction, setSelectedCalendarDateForAction] = useState(null);


  // Sub-tabs for Matters & Briefs section
  const [mattersBriefsSubTab, setMattersBriefsSubTab] = useState('your-matters-briefs');

  // State for collapsing Add New Brief forms for each matter
  const [expandedAddBriefForms, setExpandedAddBriefForms] = useState({}); // Stores { matterId: true/false }

  // State for inline brief editing
  const [editingBriefId, setEditingBriefId] = useState(null);

  // Drafting options state for briefs (needs to be global to be saved/loaded via localStorage)
  const [draftingOptions, setDraftingOptions] = useState(() => {
    const savedOptions = localStorage.getItem('draftingOptions');
    return savedOptions ? JSON.parse(savedOptions) : [
      'Opinion', 'Particulars of Claim', 'Plea', 'Replication',
      'Application Papers', 'Answering Affidavit', 'Replying Affidavit', 'Other'
    ];
  });

  // State to track if sample data has been loaded
  const [sampleDataLoaded, setSampleDataLoaded] = useState(false);


  // Utility functions
  const showMessage = useCallback((msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  }, []);

  // Initialize Firebase and handle authentication
  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const authInstance = getAuth(app);
      const firestoreInstance = getFirestore(app);

      setAuth(authInstance);
      setDb(firestoreInstance);

      onAuthStateChanged(authInstance, async (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          try {
            if (initialAuthToken) {
              await signInWithCustomToken(authInstance, initialAuthToken);
            } else {
              await signInAnonymously(authInstance);
            }
            setUserId(authInstance.currentUser?.uid || crypto.randomUUID());
          } catch (error) {
            console.error('Firebase authentication failed:', error);
            showMessage(`Authentication error: ${error.message}`, 'error');
            setUserId(crypto.randomUUID());
          }
        }
        setAuthReady(true);
      });
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      showMessage(`Firebase initialization error: ${error.message}`, 'error');
    }
  }, [initialAuthToken, showMessage]);

  // Firestore listeners for real-time updates
  useEffect(() => {
    if (!db || !userId || !authReady) return;

    // Matters Listener
    const mattersCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/matters`);
    const unsubscribeMatters = onSnapshot(mattersCollectionRef, (snapshot) => {
      const mattersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMatters(mattersData);
    }, (error) => {
      console.error('Error fetching matters:', error);
      showMessage(`Failed to load matters: ${error.message}`, 'error');
    });

    // Attorneys Listener
    const attorneysCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/attorneys`);
    const unsubscribeAttorneys = onSnapshot(attorneysCollectionRef, (snapshot) => {
      const attorneysData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttorneys(attorneysData);
    }, (error) => {
      console.error('Error fetching attorneys:', error);
      showMessage(`Failed to load attorneys: ${error.message}`, 'error');
    });

    // Briefs Listener
    const briefsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/briefs`);
    const unsubscribeBriefs = onSnapshot(briefsCollectionRef, (snapshot) => {
      const briefsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBriefs(briefsData);
    }, (error) => {
      console.error('Error fetching briefs:', error);
      showMessage(`Failed to load briefs: ${error.message}`, 'error');
    });

    // Work Records Listener
    const workRecordsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/workRecords`);
    const unsubscribeWorkRecords = onSnapshot(workRecordsCollectionRef, (snapshot) => {
      const workRecordsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWorkRecords(workRecordsData);
    }, (error) => {
      console.error('Error fetching work records:', error);
      showMessage(`Failed to load work records: ${error.message}`, 'error');
    });

    // Settings Listener
    const userSettingsDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings/userSettings`);
    const unsubscribeSettings = onSnapshot(userSettingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const settingsData = docSnap.data();
        setHourlyRate(settingsData.hourlyRate || 1500);
        setUnopposedMotionCourtFee(settingsData.unopposedMotionCourtFee || 3000);
        setOpposedMotionCourtFee(settingsData.opposedMotionCourtFee || 5000);
        setDayFee(settingsData.dayFee || 8000);
        setAppDateFormat(settingsData.dateFormat || 'YYYY-MM-DD');
        setTheme(settingsData.theme || 'light');
        setColorScheme(settingsData.colorScheme || 'indigo');
        setFontFamily(settingsData.fontFamily || 'Inter');
        setSampleDataLoaded(settingsData.sampleDataLoaded || false); // Read sample data flag
      } else {
        // If settings document doesn't exist, create it with default values
        setDoc(userSettingsDocRef, {
          hourlyRate: 1500,
          unopposedMotionCourtFee: 3000,
          opposedMotionCourtFee: 5000,
          dayFee: 8000,
          dateFormat: 'YYYY-MM-DD',
          theme: 'light',
          colorScheme: 'indigo',
          fontFamily: 'Inter',
          sampleDataLoaded: false, // Initialize sample data flag
          createdAt: new Date(),
        }, { merge: true }).catch(e => console.error("Error setting default settings:", e));
      }
    }, (error) => {
      console.error('Error fetching settings:', error);
      showMessage(`Failed to load settings: ${error.message}`, 'error');
    });


    return () => {
      unsubscribeMatters();
      unsubscribeBriefs();
      unsubscribeWorkRecords();
      unsubscribeSettings(); // Cleanup settings listener
    };
  }, [db, userId, authReady, showMessage]);

  // Update localStorage when draftingOptions change
  useEffect(() => {
    localStorage.setItem('draftingOptions', JSON.stringify(draftingOptions));
  }, [draftingOptions]);

  // Helper to format Attorneys' Firm address for display and export
  const formatAttorneysFirmAddress = useCallback((address) => {
    if (!address) return 'N/A';
    const parts = [];
    if (address.building) parts.push(address.building);
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.province) parts.push(address.province);
    return parts.join(', ');
  }, []);

  // Helper to get contact persons for a given Attorneys' Firm ID
  const getContactsForFirm = useCallback((firmId) => {
    const firm = attorneys.find(att => att.id === firmId);
    return firm ? (firm.contactPersons || []) : [];
  }, [attorneys]);


  // --- Matter Management Functions ---
  const addMatter = async (e) => {
    e.preventDefault();
    if (!db || !userId) {
      showMessage('Database not ready. Please try again.', 'error');
      return;
    }
    if (!newMatterName.trim()) {
      showMessage('Matter name cannot be empty.', 'error');
      return;
    }

    try {
      const newMatterRef = await addDoc(collection(db, `artifacts/${appId}/users/${userId}/matters`), {
        name: newMatterName,
        description: newMatterDescription,
        attorneyReference: newMatterAttorneyRef, // Save attorney reference
        assignedAttorneysFirmId: newMatterAttorneysFirmId,
        // Store multiple contact persons as an array
        assignedContactPersonNames: newMatterSelectedContactPersons,
        createdAt: new Date(),
      });

      // Add initial briefs associated with this new matter
      for (const brief of initialMatterBriefs) {
        // Here, the brief object from initialMatterBriefs should already have the full description and specific details
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/briefs`), {
          description: brief.description, // Already full description from handleInitialBriefCategoryChange etc.
          originalDescription: brief.originalDescription || '', // Ensure it's an empty string if undefined
          date: brief.date, // This will be the appearance date or due date
          matterId: newMatterRef.id, // Link to the newly created matter
          attorneysFirmId: newMatterAttorneysFirmId,
          // Store multiple contact persons for the brief
          selectedContactPersonNames: newMatterSelectedContactPersons,
          briefCategory: brief.briefCategory,
          appearType: brief.appearType,
          applicationSubtype: brief.applicationSubtype,
          draftType: brief.draftType,
          customDraftType: brief.customDraftType,
          courtType: brief.courtType || '', // Store court details
          highCourtLocation: brief.highCourtLocation || '',
          magistratesCourtLocation: brief.magistratesCourtLocation || '',
          customMagistratesCourtLocation: brief.customMagistratesCourtLocation || '',
          completed: false,
          createdAt: new Date(),
        });
      }

      setNewMatterName('');
      setNewMatterDescription('');
      setNewMatterAttorneyRef(''); // Clear attorney reference
      setNewMatterAttorneysFirmId('');
      setNewMatterSelectedContactPersons([]); // Clear selected contacts
      setInitialMatterBriefs([]); // Clear initial briefs
      showMessage('Matter and associated briefs added successfully!', 'success');
    } catch (e) {
      console.error("Error adding matter: ", e);
      showMessage(`Error adding matter: ${e.message}`, 'error');
    }
  };

  const updateMatter = async (e) => {
    e.preventDefault();
    if (!db || !userId || !editingMatterId) {
      showMessage('Database not ready or no matter selected for editing.', 'error');
      return;
    }
    if (!newMatterName.trim()) {
      showMessage('Matter name cannot be empty.', 'error');
      return;
    }

    try {
      const matterRef = doc(db, `artifacts/${appId}/users/${userId}/matters`, editingMatterId);
      await updateDoc(matterRef, {
        name: newMatterName,
        description: newMatterDescription,
        attorneyReference: newMatterAttorneyRef, // Update attorney reference
        assignedAttorneysFirmId: newMatterAttorneysFirmId,
        // Update multiple contact persons as an array
        assignedContactPersonNames: newMatterSelectedContactPersons,
      });
      setNewMatterName('');
      setNewMatterDescription('');
      setNewMatterAttorneyRef(''); // Clear attorney reference
      setNewMatterAttorneysFirmId('');
      setNewMatterSelectedContactPersons([]); // Clear selected contacts
      setEditingMatterId(null);
      showMessage('Matter updated successfully!', 'success');
    } catch (e) {
      console.error("Error updating matter: ", e);
      showMessage(`Error updating matter: ${e.message}`, 'error');
    }
  };

  const deleteMatter = async (id) => {
    if (!db || !userId) {
      showMessage('Database not ready. Please try again.', 'error');
      return;
    }
    try {
      const briefsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/briefs`), where("matterId", "==", id));
      const briefsSnapshot = await getDocs(briefsQuery);
      if (!briefsSnapshot.empty) {
        showMessage('Cannot delete matter: It has associated briefs. Please delete briefs first.', 'error');
        return;
      }

      const workRecordsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/workRecords`), where("matterId", "==", id));
      const workRecordsSnapshot = await getDocs(workRecordsQuery);
      if (!workRecordsSnapshot.empty) {
        showMessage('Cannot delete matter: It has associated work records. Please delete work records first.', 'error');
        return;
      }

      const mattersQuery = query(collection(db, `artifacts/${appId}/users/${userId}/matters`), where("assignedAttorneysFirmId", "==", id));
      const mattersSnapshot = await getDocs(mattersQuery);
      if (!mattersSnapshot.empty) {
        showMessage('Cannot delete matter: One or more matters are assigned to this firm. Please unassign them first.', 'error');
        return;
      }

      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/matters`, id));
      showMessage('Matter deleted successfully!', 'success');
    } catch (e) {
      console.error("Error deleting matter: ", e);
      showMessage(`Error deleting matter: ${e.message}`, 'error');
    }
  };

  const editMatter = (matter) => {
    setNewMatterName(matter.name);
    setNewMatterDescription(matter.description);
    setNewMatterAttorneyRef(matter.attorneyReference || ''); // Set attorney reference
    setNewMatterAttorneysFirmId(matter.assignedAttorneysFirmId || '');
    // Set multiple contact persons
    setNewMatterSelectedContactPersons(matter.assignedContactPersonNames || []);
    setEditingMatterId(matter.id);
    setMattersBriefsSubTab('add-new-matter'); // Switch to add/edit form
  };

  // --- Attorney Management Functions ---
  const addAttorney = async (e) => {
    e.preventDefault();
    if (!db || !userId) {
      showMessage('Database not ready. Please try again.', 'error');
      return;
    }
    if (!newFirmName.trim()) {
      showMessage('Firm name cannot be empty.', 'error');
      return;
    }
    if (currentContactPersons.some(cp => !cp.name.trim())) {
      showMessage('All contact persons must have a name.', 'error');
      return;
    }

    try {
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/attorneys`), {
        firmName: newFirmName,
        address: {
          building: newFirmBuilding,
          street: newFirmStreet,
          city: newFirmCity,
          province: newFirmProvince,
        },
        generalPhone: newFirmGeneralPhone,
        generalEmail: newFirmGeneralEmail,
        contactPersons: currentContactPersons.filter(cp => cp.name.trim()),
        createdAt: new Date(),
      });
      setNewFirmName('');
      setNewFirmBuilding('');
      setNewFirmStreet('');
      setNewFirmCity('');
      setNewFirmProvince('');
      setNewFirmGeneralPhone('');
      setNewFirmGeneralEmail('');
      setCurrentContactPersons([{ name: '', phone: '', email: '' }]);
      showMessage('Firm of Attorneys added successfully!', 'success');
    } catch (e) {
      console.error("Error adding attorney: ", e);
      showMessage(`Error adding Attorneys' Firm: ${e.message}`, 'error');
    }
  };

  const updateAttorney = async (e) => {
    e.preventDefault();
    if (!db || !userId || !editingAttorneyId) {
      showMessage('Database not ready or no attorney selected for editing.', 'error');
      return;
    }
    if (!newFirmName.trim()) {
      showMessage('Firm name cannot be empty.', 'error');
      return;
    }
    if (currentContactPersons.some(cp => !cp.name.trim())) {
      showMessage('All contact persons must have a name.', 'error');
      return;
    }

    try {
      const attorneyRef = doc(db, `artifacts/${appId}/users/${userId}/attorneys`, editingAttorneyId);
      await updateDoc(attorneyRef, {
        firmName: newFirmName,
        address: {
          building: newFirmBuilding,
          street: newFirmStreet,
          city: newFirmCity,
          province: newFirmProvince,
        },
        generalPhone: newFirmGeneralPhone,
        generalEmail: newFirmGeneralEmail,
        contactPersons: currentContactPersons.filter(cp => cp.name.trim()),
      });
      setNewFirmName('');
      setNewFirmBuilding('');
      setNewFirmStreet('');
      setNewFirmCity('');
      setNewFirmProvince('');
      setNewFirmGeneralPhone('');
      setNewFirmGeneralEmail('');
      setCurrentContactPersons([{ name: '', phone: '', email: '' }]);
      setEditingAttorneyId(null);
      showMessage('Firm of Attorneys updated successfully!', 'success');
    } catch (e) {
      console.error("Error updating attorney: ", e);
      showMessage(`Error updating Attorneys' Firm: ${e.message}`, 'error');
    }
  };

  const deleteAttorney = async (id) => {
    if (!db || !userId) {
      showMessage('Database not ready. Please try again.', 'error');
      return;
    }
    try {
      const briefsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/briefs`), where("attorneysFirmId", "==", id));
      const briefsSnapshot = await getDocs(briefsQuery);
      if (!briefsSnapshot.empty) {
        showMessage('Cannot delete Attorneys\' Firm: It has associated briefs. Please delete briefs first.', 'error');
        return;
      }

      const workRecordsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/workRecords`), where("attorneysFirmId", "==", id));
      const workRecordsSnapshot = await getDocs(workRecordsQuery);
      if (!workRecordsSnapshot.empty) {
        showMessage('Cannot delete Attorneys\' Firm: It has associated work records. Please delete work records first.', 'error');
        return;
      }

      const mattersQuery = query(collection(db, `artifacts/${appId}/users/${userId}/matters`), where("assignedAttorneysFirmId", "==", id));
      const mattersSnapshot = await getDocs(mattersQuery);
      if (!mattersSnapshot.empty) {
        showMessage('Cannot delete Attorneys\' Firm: One or more matters are assigned to this firm. Please unassign them first.', 'error');
        return;
      }

      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/attorneys`, id));
      showMessage('Firm of Attorneys deleted successfully!', 'success');
    } catch (e) {
      console.error("Error deleting attorney: ", e);
      showMessage(`Error deleting Attorneys' Firm: ${e.message}`, 'error');
    }
  };

  const editAttorney = (attorney) => {
    setNewFirmName(attorney.firmName);
    setNewFirmBuilding(attorney.address?.building || '');
    setNewFirmStreet(attorney.address?.street || '');
    setNewFirmCity(attorney.address?.city || '');
    setNewFirmProvince(attorney.address?.province || '');
    setNewFirmGeneralPhone(attorney.generalPhone || '');
    setNewFirmGeneralEmail(attorney.generalEmail || '');

    if (attorney.contactPersons && attorney.contactPersons.length > 0) {
      setCurrentContactPersons(attorney.contactPersons);
    } else if (attorney.contactPerson) {
      // Handle legacy single contact if it exists
      setCurrentContactPersons([{
        name: attorney.contactPerson,
        phone: attorney.phone || attorney.generalPhone || '',
        email: attorney.email || ''
      }]);
    } else {
      setCurrentContactPersons([{ name: '', phone: '', email: '' }]);
    }
    setEditingAttorneyId(attorney.id);
    setAttorneysSubTab('add-new-attorney'); // Switch to add/edit form
  };

  const handleAddContactPerson = () => {
    setCurrentContactPersons([...currentContactPersons, { name: '', phone: newFirmGeneralPhone, email: '' }]);
  };

  const handleContactPersonChange = (index, field, value) => {
    const updatedContacts = currentContactPersons.map((contact, i) =>
      i === index ? { ...contact, [field]: value } : contact
    );
    setCurrentContactPersons(updatedContacts);
  };

  const handleRemoveContactPerson = (index) => {
    const updatedContacts = currentContactPersons.filter((_, i) => i !== index);
    setCurrentContactPersons(updatedContacts.length > 0 ? updatedContacts : [{ name: '', phone: '', email: '' }]);
  };


  // --- Brief Management Functions (general add brief, potentially from matter context) ---
  // This function now receives a pre-constructed brief object from AddBriefFormForMatter
  const handleAddBriefForMatterSubmit = async (briefData) => {
    if (!db || !userId) {
      showMessage('Database not ready. Please try again.', 'error');
      return;
    }

    try {
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/briefs`), briefData);
      showMessage('Brief added successfully!', 'success');
    } catch (e) {
      console.error("Error adding brief: ", e);
      showMessage(`Error adding brief: ${e.message}`, 'error');
    }
  };

  const handleUpdateBrief = async (briefId, updatedData) => {
    if (!db || !userId) {
      showMessage('Database not ready. Please try again.', 'error');
      return;
    }
    try {
      const briefRef = doc(db, `artifacts/${appId}/users/${userId}/briefs`, briefId);
      await updateDoc(briefRef, updatedData);
      showMessage('Brief updated successfully!', 'success');
      setEditingBriefId(null); // Exit editing mode
    } catch (e) {
      console.error("Error updating brief: ", e);
      showMessage(`Error updating brief: ${e.message}`, 'error');
    }
  };


  const handleMarkBriefCompleteClick = (brief) => {
    setBriefToComplete(brief);
    setShowTimeInputModal(true);
  };


  const handleTimeInputSubmit = (timeSpent) => {
    if (briefToComplete) {
      markBriefComplete(briefToComplete, timeSpent);
    }
    setShowTimeInputModal(false);
    setBriefToComplete(null);
  };


  const markBriefComplete = async (brief, timeSpent) => {
    if (!db || !userId) {
      showMessage('Database not ready. Please try again.', 'error');
      return;
    }

    try {
      const matter = matters.find(m => m.id === brief.matterId);
      const attorneysFirm = attorneys.find(a => a.id === brief.attorneysFirmId);

      // --- Fee calculation logic (using rates from settings) ---
      let feeDue = 0;
      // Implement specific fee logic based on brief category and types
      if (brief.briefCategory === 'Appear') {
          if (brief.appearType === 'Application') {
              if (brief.applicationSubtype === 'Unopposed') {
                  feeDue = unopposedMotionCourtFee;
              } else if (brief.applicationSubtype === 'Opposed') {
                  feeDue = opposedMotionCourtFee;
              } else { // Fallback for other application types
                  feeDue = timeSpent * hourlyRate;
              }
          } else if (brief.appearType === 'Action') {
              // Assuming a full day action for dayFee, otherwise hourly
              if (timeSpent >= 7) { // Example threshold for a full day
                  feeDue = dayFee;
              } else {
                  feeDue = timeSpent * hourlyRate;
              }
          } else { // Fallback for other appearances
              feeDue = timeSpent * hourlyRate;
          }
      } else if (brief.briefCategory === 'Consult' || brief.briefCategory === 'Draft') {
          feeDue = timeSpent * hourlyRate;
      } else { // Default fallback for any other brief type
          feeDue = timeSpent * hourlyRate;
      }

      // Consolidate contact info for work record
      const selectedContactsDetails = (brief.selectedContactPersonNames || []).map(contactName => {
        const firmContacts = getContactsForFirm(brief.attorneysFirmId);
        const contactDetail = firmContacts.find(c => c.name === contactName);
        return {
          name: contactName,
          phone: contactDetail?.phone || 'N/A',
          email: contactDetail?.email || 'N/A'
        };
      });

      // Dynamically generated description for work record
      let workRecordDescription = "";
      let recordDate = brief.date; // Default to brief's original date
      if (brief.briefCategory === 'Appear') {
        let courtInfo = '';
        if (brief.courtType) {
          let location = '';
          if (brief.courtType === 'High Court') {
            location = brief.highCourtLocation;
          } else if (brief.courtType === 'Magistrates Court') {
            location = brief.magistratesCourtLocation === 'Other' ? brief.customMagistratesCourtLocation : brief.magistratesCourtLocation;
          }
          if (location) {
            courtInfo = ` at ${brief.courtType} (${location})`;
          } else {
            courtInfo = ` at ${brief.courtType}`;
          }
        }

        if (brief.appearType === 'Application') {
          workRecordDescription = `On appearance in application (${brief.applicationSubtype.toLowerCase()})${courtInfo}`;
        } else if (brief.appearType === 'Action') {
          workRecordDescription = `On trial${courtInfo}`;
        }
        recordDate = brief.date; // Appearance date
      } else if (brief.briefCategory === 'Consult') {
        workRecordDescription = `On consultation for ${timeSpent.toFixed(2)} hours`;
        recordDate = brief.date; // Consultation date
      } else if (brief.briefCategory === 'Draft') {
        const docType = brief.draftType === 'Other' ? brief.customDraftType : brief.draftType;
        workRecordDescription = `On drawing ${docType} for ${timeSpent.toFixed(2)} hours`;
        recordDate = new Date().toISOString().split('T')[0]; // Completion date
      }
      // Append original description only if it adds more specific detail beyond the generated phrase
      if (brief.originalDescription && brief.originalDescription.trim() !== '' &&
          !workRecordDescription.includes(brief.originalDescription.trim())) {
        workRecordDescription += ` - ${brief.originalDescription.trim()}`;
      }


      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/workRecords`), {
        briefId: brief.id,
        description: workRecordDescription,
        originalDescription: brief.originalDescription,
        timeSpent: timeSpent, // Use the newly acquired timeSpent
        date: recordDate, // Use appropriate date for the record
        matterName: matter ? matter.name : 'Unknown Matter',
        attorneysFirmName: attorneysFirm ? attorneysFirm.firmName : 'N/A',
        attorneysFirmAddress: attorneysFirm ? formatAttorneysFirmAddress(attorneysFirm.address) : 'N/A',
        attorneyReference: matter ? matter.attorneyReference || 'N/A' : 'N/A', // Add attorney reference
        // Store contacts as an array of objects
        attorneyContactPersonsDetails: selectedContactsDetails,
        feeDue: feeDue, // The calculated fee based on settings
        completedAt: new Date(),
        briefCategory: brief.briefCategory || 'N/A',
        appearType: brief.appearType || 'N/A',
        applicationSubtype: brief.applicationSubtype || 'N/A',
        draftType: brief.draftType || 'N/A',
        customDraftType: brief.customDraftType || 'N/A',
        courtType: brief.courtType || '', // Store court details
        highCourtLocation: brief.highCourtLocation || '',
        magistratesCourtLocation: brief.magistratesCourtLocation || '',
        customMagistratesCourtLocation: brief.customMagistratesCourtLocation || '',
        invoiceNumber: '', // NEW: Initialize invoice number as empty
      });

      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/briefs`, brief.id));
      showMessage('Brief marked complete and work record generated!', 'success');
    } catch (e) {
      console.error("Error marking brief complete: ", e);
      showMessage(`Error marking brief complete: ${e.message}`, 'error');
    }
  };

  const deleteBrief = async (id) => {
    if (!db || !userId) {
      showMessage('Database not ready. Please try again.', 'error');
      return;
    }
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/briefs`, id));
      showMessage('Brief deleted successfully!', 'success');
    } catch (e) {
      console.error("Error deleting brief: ", e);
      showMessage(`Error deleting brief: ${e.message}`, 'error');
    }
  };

  // eslint-disable-next-line no-undef
  const deleteWorkRecord = async (id) => {
  if (!db || !userId) {
    showMessage('Database not ready. Please try again.', 'error');
    return;
  }
  try {
    await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/workRecords`, id));
    showMessage('Work record deleted successfully!', 'success');
  } catch (e) {
    console.error("Error deleting work record: ", e);
    showMessage(`Error deleting work record: ${e.message}`, 'error');
  }
};

  const exportWorkRecords = () => {
    if (workRecords.length === 0) {
      showMessage('No work records to export.', 'info');
      return;
    }

    // Updated headers for export to match display order
    const headers = [
      "Attorneys' Firm", "Matter", "Attorney's Reference", "Date", "Description", "Fee (R)", "Contact Person Names", "Contact Person Phones", "Contact Person Emails", "Completed At (UTC)",
      "Invoice No.", // NEW: Invoice No. header
      "Brief Category", "Appear Type", "Application Subtype", "Draft Type", "Custom Draft Type", "Court Type", "High Court Location", "Magistrates Court Location", "Custom Magistrates Court Location", "Time Spent (Hours)"
    ].join(',');


    const rows = workRecords.map(record => {
      const date = formatDate(record.date, appDateFormat);
      const completedAtDate = record.completedAt ? new Date(record.completedAt) : null;
      const completedAt = completedAtDate && !isNaN(completedAtDate) ? completedAtDate.toISOString() : '';
      const contactNames = (record.attorneyContactPersonsDetails || []).map(cp => cp.name).join('; ');
      const contactPhones = (record.attorneyContactPersonsDetails || []).map(cp => cp.phone).join('; ');
      const contactEmails = (record.attorneyContactPersonsDetails || []).map(cp => cp.email).join('; ');

      return [
        `"${record.attorneysFirmName.replace(/"/g, '""')}"`,
        `"${record.matterName.replace(/"/g, '""')}"`,
        `"${(record.attorneyReference || 'N/A').replace(/"/g, '""')}"`, // Export attorney reference
        `"${date}"`,
        `"${record.description.replace(/"/g, '""')}"`,
        record.feeDue.toFixed(2),
        `"${contactNames.replace(/"/g, '""')}"`,
        `"${contactPhones.replace(/"/g, '""')}"`,
        `"${contactEmails.replace(/"/g, '""')}"`,
        `"${completedAt}"`,
        `"${(record.invoiceNumber || '').replace(/"/g, '""')}"`, // NEW: Export invoice number
        `"${record.briefCategory || ''}"`,
        `"${record.appearType || ''}"`,
        `"${record.applicationSubtype || ''}"`,
        `"${record.draftType || ''}"`,
        `"${record.customDraftType || ''}"`,
        `"${record.courtType || ''}"`, // Export court details
        `"${record.highCourtLocation || ''}"`,
        `"${record.magistratesCourtLocation || ''}"`,
        `"${record.customMagistratesCourtLocation || ''}"`,
        record.timeSpent.toFixed(2),
      ].join(',');
    });

    const csvContent = [headers, ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `work_records_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showMessage('Work records exported as CSV!', 'success');
    } else {
      showMessage('Your browser does not support automatic downloads. Please copy the text below and save it as a .csv file:\n\n' + csvContent, 'info');
    }
  };

  // --- Combined Matters & Briefs Logic ---
  const handleAddInitialBrief = () => {
    setInitialMatterBriefs([...initialMatterBriefs, {
      id: Date.now() + Math.random(), // Unique ID for React key
      description: '',
      originalDescription: '', // Initialize originalDescription to an empty string
      date: '',
      briefCategory: '',
      appearType: '',
      applicationSubtype: '',
      draftType: '',
      customDraftType: '',
      courtType: '', // Initialize new court fields
      highCourtLocation: '',
      magistratesCourtLocation: '',
      customMagistratesCourtLocation: '',
    }]);
  };

  // Specific handlers for initial briefs to ensure correct state updates
  const handleInitialBriefCategoryChange = useCallback((index, value) => {
    setInitialMatterBriefs(prevBriefs => prevBriefs.map((brief, i) => {
      if (i === index) {
        // Reset dependent fields based on the new category
        const updatedBrief = {
          ...brief,
          briefCategory: value,
          appearType: '',
          applicationSubtype: '',
          draftType: '',
          customDraftType: '',
          courtType: '', // Reset court details on category change
          highCourtLocation: '',
          magistratesCourtLocation: '',
          customMagistratesCourtLocation: '',
        };
        return updatedBrief;
      }
      return brief;
    }));
  }, []);

  const handleInitialAppearTypeChange = useCallback((index, value) => {
    setInitialMatterBriefs(prevBriefs => prevBriefs.map((brief, i) => {
      if (i === index) {
        // Reset dependent subtype if main type changes
        const updatedBrief = { ...brief, appearType: value };
        if (value !== 'Application') {
          updatedBrief.applicationSubtype = '';
        }
        return updatedBrief;
      }
      return brief;
    }));
  }, []);

  const handleInitialApplicationSubtypeChange = useCallback((index, value) => {
    setInitialMatterBriefs(prevBriefs => prevBriefs.map((brief, i) =>
      i === index ? { ...brief, applicationSubtype: value } : brief
    ));
  }, []);

  const handleInitialDraftTypeChange = useCallback((index, value) => {
    setInitialMatterBriefs(prevBriefs => prevBriefs.map((brief, i) => {
      if (i === index) {
        // Reset custom field if not 'Other'
        const updatedBrief = { ...brief, draftType: value };
        if (value !== 'Other') {
          updatedBrief.customDraftType = '';
        }
        return updatedBrief;
      }
      return brief;
    }));
  }, []);

  const handleInitialCustomDraftTypeChange = useCallback((index, value) => {
    setInitialMatterBriefs(prevBriefs => prevBriefs.map((brief, i) =>
      i === index ? { ...brief, customDraftType: value } : brief
    ));
  }, []);

  // NEW: Handlers for initial brief court details
  const handleInitialCourtTypeChange = useCallback((index, value) => {
    setInitialMatterBriefs(prevBriefs => prevBriefs.map((brief, i) => {
      if (i === index) {
        const updatedBrief = { ...brief, courtType: value };
        if (value !== 'High Court') updatedBrief.highCourtLocation = '';
        if (value !== 'Magistrates Court') {
          updatedBrief.magistratesCourtLocation = '';
          updatedBrief.customMagistratesCourtLocation = '';
        }
        return updatedBrief;
      }
      return brief;
    }));
  }, []);

  const handleInitialHighCourtLocationChange = useCallback((index, value) => {
    setInitialMatterBriefs(prevBriefs => prevBriefs.map((brief, i) =>
      i === index ? { ...brief, highCourtLocation: value } : brief
    ));
  }, []);

  const handleInitialMagistratesCourtLocationChange = useCallback((index, value) => {
    setInitialMatterBriefs(prevBriefs => prevBriefs.map((brief, i) => {
      if (i === index) {
        const updatedBrief = { ...brief, magistratesCourtLocation: value };
        if (value !== 'Other') updatedBrief.customMagistratesCourtLocation = '';
        return updatedBrief;
      }
      return brief;
    }));
  }, []);

  const handleInitialCustomMagistratesCourtLocationChange = useCallback((index, value) => {
    setInitialMatterBriefs(prevBriefs => prevBriefs.map((brief, i) =>
      i === index ? { ...brief, customMagistratesCourtLocation: value } : brief
    ));
  }, []);

  const handleInitialBriefChange = useCallback((index, field, value) => {
    setInitialMatterBriefs(prevBriefs => prevBriefs.map((brief, i) => {
      if (i === index) {
        return { ...brief, [field]: value };
      }
      return brief;
    }));
  }, []);

  const handleRemoveInitialBrief = (index) => {
    setInitialMatterBriefs(initialMatterBriefs.filter((_, i) => i !== index));
  };

  // Handler for multi-select contact persons
  const handleNewMatterContactPersonsChange = useCallback((e) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
    setNewMatterSelectedContactPersons(selectedOptions);
  }, []);


  const getFilteredAndSortedMatters = useMemo(() => {
    let combinedMatters = matters.map(matter => ({
      ...matter,
      // Attach briefs to matters for easier rendering
      briefs: briefs.filter(brief => brief.matterId === matter.id)
    }));

    // Sort matters
    combinedMatters.sort((a, b) => {
      if (sortByKey === 'name') {
        return sortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      } else if (sortByKey === 'attorney') {
        const firmA = attorneys.find(att => att.id === a.assignedAttorneysFirmId)?.firmName || '';
        const firmB = attorneys.find(att => att.id === b.assignedAttorneysFirmId)?.firmName || '';
        return sortDirection === 'asc' ? firmA.localeCompare(firmB) : firmB.localeCompare(firmA);
      } else if (sortByKey === 'dueDate') {
        // Find the earliest due date for each matter's briefs
        const dateA = a.briefs.length > 0 ? new Date(Math.min(...a.briefs.map(brief => new Date(brief.date)))) : new Date('9999-12-31');
        const dateB = b.briefs.length > 0 ? new Date(Math.min(...b.briefs.map(brief => new Date(brief.date)))) : new Date('9999-12-31');
        return sortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      }
      return 0;
    });

    return combinedMatters;
  }, [matters, briefs, attorneys, sortByKey, sortDirection]);

  const getBriefsForToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    return briefs.filter(brief => {
      const briefDate = new Date(brief.date);
      briefDate.setHours(0, 0, 0, 0);
      return briefDate.getTime() === today.getTime() && !brief.completed;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [briefs]);

  // NEW: Memoized selector for all past due briefs
  const getPastDueBriefs = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    return briefs.filter(brief => {
      const briefDate = new Date(brief.date);
      briefDate.setHours(0, 0, 0, 0);
      return briefDate.getTime() < today.getTime() && !brief.completed;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort oldest first
  }, [briefs]);


  // New Memoized selector for all upcoming briefs (filtered by date, sorted)
  const getAllUpcomingBriefsSorted = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    // Filter briefs for the selected dashboard filter date if it's not "today"
    // Otherwise, show all upcoming briefs from today onwards
    const filteredBriefs = (dashboardFilterDate && !isSameDay(dashboardFilterDate, new Date()))
      ? briefs.filter(brief => {
          const briefDate = new Date(brief.date);
          briefDate.setHours(0, 0, 0, 0);
          const filterDateNormalized = new Date(dashboardFilterDate);
          filterDateNormalized.setHours(0, 0, 0, 0);
          return briefDate.getTime() === filterDateNormalized.getTime() && !brief.completed;
        })
      : briefs.filter(brief => {
          const briefDate = new Date(brief.date);
          briefDate.setHours(0, 0, 0, 0);
          return briefDate.getTime() >= today.getTime() && !brief.completed; // Keep briefs from today onwards
        });

    return filteredBriefs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [briefs, dashboardFilterDate]);


  // Prepare briefs for calendar tile content
  const getCalendarTileContent = ({ date, view }) => {
    if (view === 'month' || view === 'week') {
      const dayBriefs = briefs.filter(brief => {
        const briefDate = new Date(brief.date);
        return briefDate.getFullYear() === date.getFullYear() &&
               briefDate.getMonth() === date.getMonth() &&
               briefDate.getDate() === date.getDate();
      });

      // Return an array of strings
      return dayBriefs.map(brief => (
        brief.description.split('-')[0].trim()
      ));
    }
    return []; // Return empty array if no content
  };

  const handleCalendarDateChange = (date) => {
    setCalendarDate(date);
    setDashboardFilterDate(date); // Set filter date for dashboard briefs
    setShowCalendarActionChoiceModal(false); // Close modal after selection
    showMessage(`Briefs filtered for ${formatDate(date, appDateFormat)}.`, 'info');
  };

  // New function to handle day click to show choice modal
  const handleCalendarDayClickToChooseAction = (date) => {
    setSelectedCalendarDateForAction(date);
    setShowCalendarActionChoiceModal(true);
  };

  // Function to handle "Add New Matter" choice from calendar modal
  const handleAddMatterFromCalendar = () => {
    const date = selectedCalendarDateForAction;
    setCurrentPage('matters-briefs'); // Navigate to Matters & Briefs page
    setMattersBriefsSubTab('add-new-matter'); // Switch to Add New Matter sub-tab
    setEditingMatterId(null); // Ensure we are adding a new matter, not editing
    setNewMatterName('');
    setNewMatterDescription('');
    setNewMatterAttorneyRef('');
    setNewMatterAttorneysFirmId('');
    setNewMatterSelectedContactPersons([]);
    // Pre-fill initial brief with the clicked date
    setInitialMatterBriefs([{
      id: Date.now() + Math.random(),
      description: '',
      originalDescription: '',
      date: formatDate(date, 'YYYY-MM-DD'), // Pre-fill with clicked date
      briefCategory: '',
      appearType: '',
      applicationSubtype: '',
      draftType: '',
      customDraftType: '',
      courtType: '', // Initialize new court fields
      highCourtLocation: '',
      magistratesCourtLocation: '',
      customMagistratesCourtLocation: '',
    }]);
    setShowCalendarActionChoiceModal(false); // Close modal after selection
    showMessage(`Ready to add a new matter for ${formatDate(date, appDateFormat)}.`, 'info');
  };


  const clearDashboardDateFilter = () => {
    setDashboardFilterDate(new Date()); // Reset filter to today
    setCalendarDate(new Date()); // Reset calendar view to today
  };

  // --- Settings Management Functions ---
  const updateAppSettings = async (e) => {
    e.preventDefault();
    if (!db || !userId) {
      showMessage('Database not ready. Please try again.', 'error');
      return;
    }

    try {
      const userSettingsDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings/userSettings`);
      await setDoc(userSettingsDocRef, {
        hourlyRate: parseFloat(hourlyRate) || 0, // Ensure storing a number, default to 0 if NaN
        unopposedMotionCourtFee: parseFloat(unopposedMotionCourtFee) || 0,
        opposedMotionCourtFee: parseFloat(opposedMotionCourtFee) || 0,
        dayFee: parseFloat(dayFee) || 0,
        dateFormat: appDateFormat, // Save selected date format
        theme: theme, // Save selected theme
        colorScheme: colorScheme, // Save selected color scheme
        fontFamily: fontFamily, // Save selected font family
      }, { merge: true }); // Use merge: true to only update specified fields

      showMessage('Settings updated successfully!', 'success');
    } catch (e) {
      console.error("Error updating settings: ", e);
      showMessage(`Error updating settings: ${e.message}`, 'error');
    }
  };

  // Toggle visibility of Add Brief form for a specific matter
  const toggleAddBriefForm = (matterId) => {
    setExpandedAddBriefForms(prev => ({
      ...prev,
      [matterId]: !prev[matterId]
    }));
  };

  // Callback after brief is added to collapse the form
  const handleBriefAddedAndCollapse = (matterId) => {
    setExpandedAddBriefForms(prev => ({
      ...prev,
      [matterId]: false
    }));
  };


  // Get active color scheme and apply theme colors
  const activeColorScheme = colorSchemes[colorScheme] || colorSchemes.indigo; // Fallback to indigo

  const appBgClass = theme === 'light' ? `bg-gradient-to-br from-${activeColorScheme.gradientFrom} to-${activeColorScheme.gradientTo}` : 'bg-gradient-to-br from-gray-800 to-gray-950';
  const appTextColor = theme === 'light' ? activeColorScheme.textSecondary : 'text-gray-100';
  const cardBgClass = theme === 'light' ? 'bg-white' : 'bg-gray-700';
  const cardBorderClass = theme === 'light' ? `border ${activeColorScheme.cardBorder}` : 'border border-gray-600';
  const headingColorClass = theme === 'light' ? activeColorScheme.headingColor : 'text-gray-200';
  const tableHeaderBgClass = theme === 'light' ? activeColorScheme.tableHeaderBg : 'bg-gray-800 text-gray-300';
  const tableRowHoverClass = theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-gray-600';
  const buttonPrimaryBg = activeColorScheme.buttonBg;
  const buttonPrimaryHover = activeColorScheme.buttonHover;
  const buttonPrimaryText = 'text-white';
  const buttonSecondaryBg = 'bg-gray-400';
  const buttonSecondaryHover = 'bg-gray-500';
  const buttonSecondaryText = 'text-white';
  const buttonOutlineBorder = activeColorScheme.buttonBorder;
  const buttonOutlineText = activeColorScheme.headingColor; // Use heading color for outline button text

  // Dynamically load Google Fonts
  const fontLinks = useMemo(() => {
    const fontNames = Object.keys(fontFamilies).filter(font => font !== 'Inter'); // Inter is default
    return fontNames.map(fontName => (
      <link key={fontName} href={`https://fonts.googleapis.com/css2?family=${fontName.replace(' ', '+')}:wght@400;600;700&display=swap`} rel="stylesheet" />
    ));
  }, []);

  // --- Sample Data Generation Function ---
  const loadSampleData = async () => {
    if (!db || !userId) {
      showMessage('Database not ready. Please try again.', 'error');
      return;
    }

    if (sampleDataLoaded) {
      showMessage('Sample data already loaded!', 'info');
      return;
    }

    try {
      showMessage('Loading sample data... This may take a moment.', 'info');

      // 1. Generate 10 Attorneys
      const sampleAttorneys = [];
      const attorneyFirmNames = [
        "Legal Eagles Inc.", "Justice Partners", "Lex Chambers", "Veritas Law Group",
        "Apex Legal Advisors", "Cornerstone Counsel", "Integrity Law", "Global Advocates",
        "Harbour Law Firm", "Frontier Attorneys"
      ];
      const provinces = ["Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape"];
      const cities = ["Johannesburg", "Cape Town", "Durban", "Gqeberha", "Pretoria", "Stellenbosch"];

      for (let i = 0; i < 10; i++) {
        const firmName = attorneyFirmNames[i] || `Sample Law Firm ${i + 1}`;
        const newAttorneyRef = await addDoc(collection(db, `artifacts/${appId}/users/${userId}/attorneys`), {
          firmName: firmName,
          address: {
            building: `Building ${i + 1}`,
            street: `${(i + 1) * 10} Sample Rd`,
            city: cities[i % cities.length],
            province: provinces[i % provinces.length],
          },
          generalPhone: `+27 11 123 ${1000 + i}`,
          generalEmail: `info@${firmName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}.com`,
          contactPersons: [
            { name: `Contact Person A${i + 1}`, phone: `+27 82 111 ${100 + i}`, email: `contactA${i}@${firmName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}.com` },
            { name: `Contact Person B${i + 1}`, phone: `+27 72 222 ${100 + i}`, email: `contactB${i}@${firmName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}.com` }
          ],
          createdAt: new Date(),
        });
        sampleAttorneys.push({ id: newAttorneyRef.id, ...{ firmName: firmName, contactPersons: [
          { name: `Contact Person A${i + 1}`, phone: `+27 82 111 ${100 + i}`, email: `contactA${i}@${firmName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}.com` },
          { name: `Contact Person B${i + 1}`, phone: `+27 72 222 ${100 + i}`, email: `contactB${i}@${firmName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}.com` }
        ]} });
      }

      // 2. Generate 20 Matters
      const sampleMatters = [];
      const matterNames = [
        "Estate of John Doe", "Dispute: Alpha Corp vs. Beta Ltd", "Family Law: Smith v Smith",
        "Criminal Case: State vs. Joe Bloggs", "Property Transfer: Erf 123", "Contract Breach: XYZ Ltd",
        "Personal Injury Claim: Driver A", "Intellectual Property: Patent Dispute", "Labour Dispute: Worker B",
        "Environmental Permit Appeal", "Tax Appeal: Company C", "Debt Recovery: Debtor D",
        "Defamation Suit: Public Figure E", "Medical Malpractice: Patient F", "Arbitration: Party G",
        "Constitutional Challenge: Act 10", "Trust Amendment: Trust H", "Insolvency: Debtor I",
        "Administrative Review: Decision J", "International Law: Treaty K"
      ];

      for (let i = 0; i < 20; i++) {
        const randomAttorney = sampleAttorneys[Math.floor(Math.random() * sampleAttorneys.length)];
        const newMatterRef = await addDoc(collection(db, `artifacts/${appId}/users/${userId}/matters`), {
          name: matterNames[i] || `Sample Matter ${i + 1}`,
          description: `General description for ${matterNames[i] || `Sample Matter ${i + 1}`}.`,
          attorneyReference: `REF-${1000 + i}`,
          assignedAttorneysFirmId: randomAttorney.id,
          assignedContactPersonNames: [randomAttorney.contactPersons[0].name], // Assign first contact person
          createdAt: new Date(),
        });
        sampleMatters.push({ id: newMatterRef.id, attorneysFirmId: randomAttorney.id, assignedContactPersonNames: [randomAttorney.contactPersons[0].name] });
      }

      // 3. Generate 2-3 Briefs for each Matter
      const briefCategories = ['Appear', 'Consult', 'Draft'];
      const appearTypes = ['Application', 'Action'];
      const applicationSubtypes = ['Unopposed', 'Opposed'];
      const draftingTypes = [
        'Opinion', 'Particulars of Claim', 'Plea', 'Replication',
        'Application Papers', 'Answering Affidavit', 'Replying Affidavit', 'Heads of Argument'
      ];
      setDraftingOptions(prev => { // Ensure sample drafting types are in options
        const updatedOptions = new Set([...prev, ...draftingTypes, 'Other']);
        return Array.from(updatedOptions).sort((a,b) => {
          if (a === 'Other') return 1;
          if (b === 'Other') return -1;
          return a.localeCompare(b);
        });
      });

      const highCourtLocations = ['Durban', 'Pietermaritzburg'];
      const magistratesCourtLocations = ['Pinetown', 'Durban', 'Verulam', 'Pietermaritzburg', 'Scottburgh', 'Other'];
      const customMagistratesCourtTowns = ['Estcourt', 'Port Shepstone'];

      for (const matter of sampleMatters) {
        const numBriefs = Math.floor(Math.random() * 2) + 2; // 2 or 3 briefs per matter
        for (let i = 0; i < numBriefs; i++) {
          const randomCategory = briefCategories[Math.floor(Math.random() * briefCategories.length)];
          let briefData = {
            matterId: matter.id,
            attorneysFirmId: matter.attorneysFirmId,
            selectedContactPersonNames: matter.assignedContactPersonNames,
            completed: false,
            createdAt: new Date(),
          };

          const randomDayOffset = Math.floor(Math.random() * 60) - 30; // Dates from 30 days ago to 30 days in future
          const briefDate = new Date();
          briefDate.setDate(briefDate.getDate() + randomDayOffset);
          briefData.date = formatDate(briefDate, 'YYYY-MM-DD');

          switch (randomCategory) {
            case 'Appear':
              const randomAppearType = appearTypes[Math.floor(Math.random() * appearTypes.length)];
              briefData.briefCategory = 'Appear';
              briefData.appearType = randomAppearType;
              briefData.description = `Appear: ${randomAppearType}`;

              if (randomAppearType === 'Application') {
                const randomAppSubtype = applicationSubtypes[Math.floor(Math.random() * applicationSubtypes.length)];
                briefData.applicationSubtype = randomAppSubtype;
                briefData.description += ` (${randomAppSubtype})`;
              }

              const randomCourtType = Math.random() < 0.5 ? 'High Court' : 'Magistrates Court';
              briefData.courtType = randomCourtType;

              let courtLocationName = '';
              if (randomCourtType === 'High Court') {
                courtLocationName = highCourtLocations[Math.floor(Math.random() * highCourtLocations.length)];
                briefData.highCourtLocation = courtLocationName;
              } else { // Magistrates Court
                courtLocationName = magistratesCourtLocations[Math.floor(Math.random() * magistratesCourtLocations.length)];
                briefData.magistratesCourtLocation = courtLocationName;
                if (courtLocationName === 'Other') {
                  const customTown = customMagistratesCourtTowns[Math.floor(Math.random() * customMagistratesCourtTowns.length)];
                  briefData.customMagistratesCourtLocation = customTown;
                  courtLocationName = customTown; // Use custom town for description
                }
              }
              briefData.description += ` at ${randomCourtType} (${courtLocationName})`;
              briefData.originalDescription = `Attend court for ${briefData.description.toLowerCase()}`;
              break;
            case 'Consult':
              briefData.briefCategory = 'Consult';
              briefData.description = `Consult: Client meeting regarding dispute resolution.`;
              briefData.originalDescription = `Client meeting regarding dispute resolution`;
              break;
            case 'Draft':
              const randomDraftType = draftingTypes[Math.floor(Math.random() * draftingTypes.length)];
              briefData.briefCategory = 'Draft';
              briefData.draftType = randomDraftType;
              briefData.customDraftType = randomDraftType === 'Other' ? 'Special Drafting' : '';
              briefData.description = `Draft: ${randomDraftType}`;
              if (randomDraftType === 'Other') {
                briefData.description += ` (${briefData.customDraftType})`;
              }
              briefData.originalDescription = `Prepare ${randomDraftType.toLowerCase()}`;
              briefData.description += ` - Prepare relevant document.`;
              break;
          }

          await addDoc(collection(db, `artifacts/${appId}/users/${userId}/briefs`), briefData);
        }
      }

      // Update sampleDataLoaded flag in settings
      const userSettingsDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings/userSettings`);
      await updateDoc(userSettingsDocRef, {
        sampleDataLoaded: true,
      });

      showMessage('Sample data loaded successfully!', 'success');
      setSampleDataLoaded(true); // Update state
    } catch (e) {
      console.error("Error loading sample data: ", e);
      showMessage(`Error loading sample data: ${e.message}`, 'error');
    }
  };


  // Loading state
  if (!authReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl font-semibold text-gray-700">Loading application...</div>
      </div>
    );
  }

  // Main application UI
  return (
    <div className={`min-h-screen ${appBgClass} ${appTextColor} ${fontFamilies[fontFamily]} p-4 sm:p-6 lg:p-8`}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      {fontLinks} {/* Dynamically loaded fonts */}

      {/* Message Box */}
      {message && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${messageType === 'success' ? 'bg-green-500 text-white' : messageType === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
          {message}
        </div>
      )}

      {/* Time Input Modal */}
      <TimeInputModal
        isOpen={showTimeInputModal}
        onClose={() => setShowTimeInputModal(false)}
        onSubmit={handleTimeInputSubmit}
        briefDescription={briefToComplete?.description || ''}
      />

      {/* Calendar Action Choice Modal */}
      <CalendarActionChoiceModal
        isOpen={showCalendarActionChoiceModal}
        onClose={() => setShowCalendarActionChoiceModal(false)}
        onAddMatter={handleAddMatterFromCalendar}
        onViewBriefs={() => handleCalendarDateChange(selectedCalendarDateForAction)}
        selectedDate={selectedCalendarDateForAction}
        appDateFormat={appDateFormat}
      />


      <div className={`${cardBgClass} rounded-xl shadow-2xl p-6 sm:p-8 lg:p-10 mb-8 max-w-7xl mx-auto`}>
        <h1 className={`text-4xl sm:text-5xl font-extrabold text-center ${headingColorClass} mb-6 flex items-center justify-center gap-3`}>
          Advocate's Practice Manager <Scale size={40} className={`text-${activeColorScheme.primary}`} />
        </h1>
        <p className={`text-center ${appTextColor} mb-8`}>
          Welcome, User ID: <span className="font-mono bg-gray-100 rounded px-2 py-1 text-sm">{userId || 'Not Authenticated'}</span>
        </p>

        {/* Navigation Tabs */}
        <nav className="mb-8 flex flex-wrap justify-center gap-3 sm:gap-4">
          <button
            onClick={() => setCurrentPage('practice-overview')}
            className={`px-5 py-2 rounded-lg font-semibold text-lg transition duration-300 ease-in-out ${
              currentPage === 'practice-overview' ? `bg-${activeColorScheme.tabBgActive} text-${activeColorScheme.tabTextActive} shadow-md` : `bg-${activeColorScheme.tabBgInactive} text-${activeColorScheme.tabTextInactive} hover:bg-${activeColorScheme.tabHoverBg}`
            } focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:ring-opacity-50`}
          >
            Practice Overview
          </button>
          <button
            onClick={() => { setCurrentPage('matters-briefs'); setMattersBriefsSubTab('your-matters-briefs');}}
            className={`px-5 py-2 rounded-lg font-semibold text-lg transition duration-300 ease-in-out ${
              currentPage === 'matters-briefs' ? `bg-${activeColorScheme.tabBgActive} text-${activeColorScheme.tabTextActive} shadow-md` : `bg-${activeColorScheme.tabBgInactive} text-${activeColorScheme.tabTextInactive} hover:bg-${activeColorScheme.tabHoverBg}`
            } focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:ring-opacity-50`}
          >
            Matters & Briefs
          </button>
          <button
            onClick={() => setCurrentPage('attorneys')}
            className={`px-5 py-2 rounded-lg font-semibold text-lg transition duration-300 ease-in-out ${
              currentPage === 'attorneys' ? `bg-${activeColorScheme.tabBgActive} text-${activeColorScheme.tabTextActive} shadow-md` : `bg-${activeColorScheme.tabBgInactive} text-${activeColorScheme.tabTextInactive} hover:bg-${activeColorScheme.tabHoverBg}`
            } focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:ring-opacity-50`}
          >
            Attorneys
          </button>
          <button
            onClick={() => setCurrentPage('workRecords')}
            className={`px-5 py-2 rounded-lg font-semibold text-lg transition duration-300 ease-in-out ${
              currentPage === 'workRecords' ? `bg-${activeColorScheme.tabBgActive} text-${activeColorScheme.tabTextActive} shadow-md` : `bg-${activeColorScheme.tabBgInactive} text-${activeColorScheme.tabTextInactive} hover:bg-${activeColorScheme.tabHoverBg}`
            } focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:ring-opacity-50`}
          >
            Work Records
          </button>
          <button
            onClick={() => setCurrentPage('settings')}
            className={`px-5 py-2 rounded-lg font-semibold text-lg transition duration-300 ease-in-out ${
              currentPage === 'settings' ? `bg-${activeColorScheme.tabBgActive} text-${activeColorScheme.tabTextActive} shadow-md` : `bg-${activeColorScheme.tabBgInactive} text-${activeColorScheme.tabTextInactive} hover:bg-${activeColorScheme.tabHoverBg}`
            } focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:ring-opacity-50`}
          >
            Settings
          </button>
        </nav>


        {/* --- Practice Overview (Dashboard) Section --- */}
        {currentPage === 'practice-overview' && (
          <div className="space-y-8">
            <h2 className={`text-3xl font-bold ${headingColorClass} text-center flex items-center justify-center gap-2`}>
              Your Daily & Weekly Snapshot <CalendarDays size={28} className={`text-${activeColorScheme.primary}`} />
            </h2>

            {/* Today's Briefs */}
            <div className={`${cardBgClass} rounded-lg shadow-xl p-6 ${cardBorderClass}`}>
              <h3 className={`text-2xl font-bold ${headingColorClass} mb-4`}>Briefs for Today ({formatDate(new Date(), appDateFormat)})</h3>
              {getBriefsForToday.length === 0 ? (
                <p className="text-gray-500 italic">No briefs due today. Enjoy your day!</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                    <thead className={`${tableHeaderBgClass}`}>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider rounded-tl-lg">Matter</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Attorneys' Firm</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider rounded-tr-lg">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getBriefsForToday.map((brief) => (
                        <tr key={brief.id} className={tableRowHoverClass}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{matters.find(m => m.id === brief.matterId)?.name || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-normal text-sm text-gray-600">{brief.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{attorneys.find(a => a.id === brief.attorneysFirmId)?.firmName || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleMarkBriefCompleteClick(brief)}
                              className={`bg-green-500 hover:bg-green-600 ${buttonPrimaryText} px-3 py-1 rounded-md mr-2 text-sm transition duration-150`}
                            >
                              <CheckCircle size={16} className="inline-block mr-1" /> Complete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* NEW: Past Due Briefs */}
            <div className={`${cardBgClass} rounded-lg shadow-xl p-6 ${cardBorderClass}`}>
              <h3 className={`text-2xl font-bold ${headingColorClass} mb-4`}>Past Due Briefs</h3>
              {getPastDueBriefs.length === 0 ? (
                <p className="text-gray-500 italic">No past due briefs. You're all caught up!</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                    <thead className={`${tableHeaderBgClass}`}>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider rounded-tl-lg">Due Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Matter</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Attorneys' Firm</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider rounded-tr-lg">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPastDueBriefs.map((brief) => (
                        <tr key={brief.id} className={tableRowHoverClass}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold">{formatDate(brief.date, appDateFormat)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{matters.find(m => m.id === brief.matterId)?.name || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-normal text-sm text-gray-600">{brief.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{attorneys.find(a => a.id === brief.attorneysFirmId)?.firmName || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleMarkBriefCompleteClick(brief)}
                              className={`bg-green-500 hover:bg-green-600 ${buttonPrimaryText} px-3 py-1 rounded-md mr-2 text-sm transition duration-150`}
                            >
                              <CheckCircle size={16} className="inline-block mr-1" /> Complete
                            </button>
                            <button
                              onClick={() => deleteBrief(brief.id)}
                              className={`text-red-600 hover:text-red-900 px-3 py-1 rounded-md border border-red-300 text-sm hover:border-red-400 transition duration-150`}
                            >
                              <Trash2 size={16} className="inline-block mr-1" /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Calendar View */}
            <div className={`${cardBgClass} rounded-lg shadow-xl p-6 ${cardBorderClass}`}>
              <h3 className={`text-2xl font-bold ${headingColorClass} mb-4 text-center`}>Full Calendar</h3>
              <SimpleCalendar
                onChange={handleCalendarDateChange}
                value={calendarDate}
                tileContent={getCalendarTileContent}
                onViewChange={({ view }) => console.log('Calendar view changed to:', view)}
                onDayClickToChooseAction={handleCalendarDayClickToChooseAction} // Pass new handler to calendar
              />
              {dashboardFilterDate && !isSameDay(dashboardFilterDate, new Date()) && (
                <div className="text-center mt-4">
                  <span className={`font-medium ${appTextColor}`}>
                    Currently filtering briefs for: {formatDate(dashboardFilterDate, appDateFormat)}
                  </span>
                  <button
                    onClick={clearDashboardDateFilter}
                    className={`ml-4 px-4 py-2 bg-red-500 hover:bg-red-600 ${buttonPrimaryText} rounded-lg shadow-md transition duration-200`}
                  >
                    Clear Date Filter
                  </button>
                </div>
              )}
            </div>

            {/* All Upcoming Briefs (No filter, always sorted) */}
            <div className={`${cardBgClass} rounded-lg shadow-xl p-6 ${cardBorderClass}`}>
              <h3 className={`text-2xl font-bold ${headingColorClass} mb-4`}>
                {dashboardFilterDate && !isSameDay(dashboardFilterDate, new Date())
                  ? `Briefs on ${formatDate(dashboardFilterDate, appDateFormat)}`
                  : 'All Upcoming Briefs'}
              </h3>
              {getAllUpcomingBriefsSorted.length === 0 ? (
                <p className="text-gray-500 italic">No upcoming briefs found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                    <thead className={`${tableHeaderBgClass}`}>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider rounded-tl-lg">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Matter</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Attorneys' Firm</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider rounded-tr-lg">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getAllUpcomingBriefsSorted.map((brief) => (
                        <tr key={brief.id} className={tableRowHoverClass}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(brief.date, appDateFormat)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{matters.find(m => m.id === brief.matterId)?.name || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-normal text-sm text-gray-600">{brief.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{attorneys.find(a => a.id === brief.attorneysFirmId)?.firmName || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleMarkBriefCompleteClick(brief)}
                              className={`bg-green-500 hover:bg-green-600 ${buttonPrimaryText} px-3 py-1 rounded-md mr-2 text-sm transition duration-150`}
                            >
                              <CheckCircle size={16} className="inline-block mr-1" /> Complete
                            </button>
                            <button
                              onClick={() => deleteBrief(brief.id)}
                              className={`text-red-600 hover:text-red-900 px-3 py-1 rounded-md border border-red-300 text-sm hover:border-red-400 transition duration-150`}
                            >
                              <Trash2 size={16} className="inline-block mr-1" /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}


        {/* --- Matters & Briefs Management Section (separated into sub-tabs) --- */}
        {currentPage === 'matters-briefs' && (
          <div className="space-y-8">
            <h2 className={`text-3xl font-bold ${headingColorClass} text-center flex items-center justify-center gap-2`}>
              Matter & Brief Management <FolderOpen size={28} className={`text-${activeColorScheme.primary}`} />
            </h2>

            {/* Sub-navigation for Matters & Briefs */}
            <nav className="mb-6 flex justify-center gap-2">
              <button
                onClick={() => setMattersBriefsSubTab('your-matters-briefs')}
                className={`px-4 py-2 rounded-lg font-semibold text-base transition duration-300 ease-in-out ${
                  mattersBriefsSubTab === 'your-matters-briefs' ? `bg-${activeColorScheme.primary} text-white shadow-md` : `bg-gray-200 text-gray-700 hover:bg-gray-300`
                }`}
              >
                Your Matters & Briefs
              </button>
              <button
                onClick={() => { setMattersBriefsSubTab('add-new-matter'); setEditingMatterId(null); setNewMatterName(''); setNewMatterDescription(''); setNewMatterAttorneyRef(''); setNewMatterAttorneysFirmId(''); setNewMatterSelectedContactPersons([]); setInitialMatterBriefs([]);}}
                className={`px-4 py-2 rounded-lg font-semibold text-base transition duration-300 ease-in-out ${
                  mattersBriefsSubTab === 'add-new-matter' ? `bg-${activeColorScheme.primary} text-white shadow-md` : `bg-gray-200 text-gray-700 hover:bg-gray-300`
                }`}
              >
                Add New Matter
              </button>
              <button
                onClick={() => { setMattersBriefsSubTab('receptionist-brief-entry'); }}
                className={`px-4 py-2 rounded-lg font-semibold text-base transition duration-300 ease-in-out ${
                  mattersBriefsSubTab === 'receptionist-brief-entry' ? `bg-${activeColorScheme.primary} text-white shadow-md` : `bg-gray-200 text-gray-700 hover:bg-gray-300`
                }`}
              >
                Receptionist Brief Entry
              </button>
            </nav>

            {/* Content for "Add New Matter" sub-tab */}
            {mattersBriefsSubTab === 'add-new-matter' && (
              <div className="space-y-8">
                <h3 className={`text-2xl font-bold ${headingColorClass} text-center mb-4`}>
                  {editingMatterId ? 'Edit Matter' : 'Add New Matter'} <Plus size={24} className={`inline-block ml-1 text-${activeColorScheme.primary}`} />
                </h3>
                <form onSubmit={editingMatterId ? updateMatter : addMatter} className={`${cardBgClass} rounded-lg shadow-lg p-6 ${cardBorderClass}`}>
                  <div className="mb-4">
                    <label htmlFor="matterName" className={`block ${appTextColor} text-sm font-bold mb-2`}>
                      Matter Name:
                    </label>
                    <input
                      type="text"
                      id="matterName"
                      value={newMatterName}
                      onChange={(e) => setNewMatterName(e.target.value)}
                      className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:border-${activeColorScheme.inputFocus}`}
                      placeholder="e.g., Doe vs. Smith Case"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="matterDescription" className={`block ${appTextColor} text-sm font-bold mb-2`}>
                      Description (Optional):
                    </label>
                    <textarea
                      id="matterDescription"
                      value={newMatterDescription}
                      onChange={(e) => setNewMatterDescription(e.target.value)}
                      className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:border-${activeColorScheme.inputFocus} h-24 resize-y`}
                      placeholder="Brief description of the matter (optional)"
                    ></textarea>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="matterAttorneyRef" className={`block ${appTextColor} text-sm font-bold mb-2`}>
                      Attorney's Reference No. (Optional):
                    </label>
                    <input
                      type="text"
                      id="matterAttorneyRef"
                      value={newMatterAttorneyRef}
                      onChange={(e) => setNewMatterAttorneyRef(e.target.value)}
                      className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:border-${activeColorScheme.inputFocus}`}
                      placeholder="e.g., JSM-2024-001"
                    />
                  </div>


                  {/* Assign Attorney to Matter with Multi-Select Contact Persons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label htmlFor="matterAttorneysFirm" className={`block ${appTextColor} text-sm font-bold mb-2`}>
                        Assign to Attorneys' Firm:
                      </label>
                      <select
                        id="matterAttorneysFirm"
                        value={newMatterAttorneysFirmId}
                        onChange={(e) => {
                          setNewMatterAttorneysFirmId(e.target.value);
                          setNewMatterSelectedContactPersons([]); // Clear contacts when firm changes
                        }}
                        className={`shadow border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:border-${activeColorScheme.inputFocus}`}
                      >
                        <option value="">Select an Attorneys' Firm (Optional)</option>
                        {attorneys.map((attorney) => (
                          <option key={attorney.id} value={attorney.id}>
                            {attorney.firmName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="matterContactPersons" className={`block ${appTextColor} text-sm font-bold mb-2`}>
                        Assign to Contact Person(s) (Optional):
                      </label>
                      <select
                        id="matterContactPersons"
                        multiple // Enable multi-select
                        value={newMatterSelectedContactPersons}
                        onChange={handleNewMatterContactPersonsChange}
                        className={`shadow border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:border-${activeColorScheme.inputFocus} h-24`} // Increased height for multiple options
                        disabled={!newMatterAttorneysFirmId}
                      >
                        {newMatterAttorneysFirmId ? (
                          getContactsForFirm(newMatterAttorneysFirmId).map((contact, index) => (
                            <option key={index} value={contact.name}>
                              {contact.name} ({contact.phone || 'N/A'})
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>Select a firm first</option>
                        )}
                      </select>
                      {newMatterSelectedContactPersons.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">Selected: {newMatterSelectedContactPersons.join(', ')}</p>
                      )}
                    </div>
                  </div>


                  {/* Initial Briefs for New Matter */}
                  {!editingMatterId && ( // Only show when adding a new matter
                    <>
                      <h3 className={`text-lg font-bold ${appTextColor} mb-2 mt-4`}>Initial Briefs for this Matter:</h3>
                      {initialMatterBriefs.length === 0 && (
                        <p className="text-gray-500 text-sm italic mb-4">No initial briefs added. Click "Add Initial Brief" below.</p>
                      )}
                      {initialMatterBriefs.map((brief, index) => (
                        <div key={brief.id} className={`mb-4 p-4 border border-gray-200 rounded-md ${theme === 'light' ? 'bg-gray-50' : 'bg-gray-600 text-gray-200'}`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className={`font-semibold ${appTextColor}`}>Brief {index + 1}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveInitialBrief(index)}
                              className="text-red-500 hover:text-red-700 transition duration-150"
                            >
                              <Minus size={16} className="inline-block mr-1" /> Remove
                            </button>
                          </div>

                          <div className="mb-2">
                            <label htmlFor={`initialBriefCategory-${brief.id}`} className={`block ${appTextColor} text-sm font-bold mb-1`}>
                              Category:
                            </label>
                            <select
                              id={`initialBriefCategory-${brief.id}`}
                              value={brief.briefCategory}
                              onChange={(e) => handleInitialBriefCategoryChange(index, e.target.value)}
                              className={`shadow border rounded-md w-full py-2 px-3 ${appTextColor}`}
                              required
                            >
                              <option value="">Select a Category</option>
                              <option value="Appear">Appear</option>
                              <option value="Consult">Consult</option>
                              <option value="Draft">Draft</option>
                            </select>
                          </div>

                          {brief.briefCategory === 'Appear' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                              <div>
                                <label htmlFor={`initialAppearType-${brief.id}`} className={`block ${appTextColor} text-sm font-bold mb-1`}>
                                  Appearance Type:
                                </label>
                                <select
                                  id={`initialAppearType-${brief.id}`}
                                  value={brief.appearType}
                                  onChange={(e) => {
                                    setInitialMatterBriefs(prevBriefs => prevBriefs.map((currentBrief, i) => {
                                      if (i === index) {
                                        const updatedBrief = { ...currentBrief, appearType: e.target.value };
                                        if (e.target.value !== 'Application') {
                                          updatedBrief.applicationSubtype = '';
                                        }
                                        return updatedBrief;
                                      }
                                      return currentBrief;
                                    }));
                                  }}
                                  className={`shadow border rounded-md w-full py-2 px-3 ${appTextColor}`}
                                  required
                                >
                                  <option value="">Select Type</option>
                                  <option value="Application">Application</option>
                                  <option value="Action">Action</option>
                                </select>
                              </div>
                              {brief.appearType === 'Application' && (
                                <div>
                                  <label htmlFor={`initialApplicationSubtype-${brief.id}`} className={`block ${appTextColor} text-sm font-bold mb-1`}>
                                    Application Subtype:
                                  </label>
                                  <select
                                    id={`initialApplicationSubtype-${brief.id}`}
                                    value={brief.applicationSubtype}
                                    onChange={(e) => handleInitialApplicationSubtypeChange(index, e.target.value)}
                                    className={`shadow border rounded-md w-full py-2 px-3 ${appTextColor}`}
                                    required
                                  >
                                    <option value="">Select Subtype</option>
                                    <option value="Unopposed">Unopposed</option>
                                    <option value="Opposed">Opposed</option>
                                  </select>
                                </div>
                              )}
                              {/* Court Location Inputs for Initial Brief Appearance */}
                              <CourtLocationInputs
                                briefCategory={brief.briefCategory}
                                appearType={brief.appearType}
                                courtType={brief.courtType}
                                setCourtType={(val) => handleInitialCourtTypeChange(index, val)}
                                highCourtLocation={brief.highCourtLocation}
                                setHighCourtLocation={(val) => handleInitialHighCourtLocationChange(index, val)}
                                magistratesCourtLocation={brief.magistratesCourtLocation}
                                setMagistratesCourtLocation={(val) => handleInitialMagistratesCourtLocationChange(index, val)}
                                customMagistratesCourtLocation={brief.customMagistratesCourtLocation}
                                setCustomMagistratesCourtLocation={(val) => handleInitialCustomMagistratesCourtLocationChange(index, val)}
                                appTextColor={appTextColor}
                              />
                            </div>
                          )}

                          {brief.briefCategory === 'Draft' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                              <div>
                                <label htmlFor={`initialDraftType-${brief.id}`} className={`block ${appTextColor} text-sm font-bold mb-1`}>
                                  Drafting Type:
                                </label>
                                <select
                                  id={`initialDraftType-${brief.id}`}
                                  value={brief.draftType}
                                  onChange={(e) => {
                                    setInitialMatterBriefs(prevBriefs => prevBriefs.map((currentBrief, i) => {
                                      if (i === index) {
                                        const updatedBrief = { ...currentBrief, draftType: e.target.value };
                                        if (e.target.value !== 'Other') {
                                          updatedBrief.customDraftType = '';
                                        }
                                        return updatedBrief;
                                      }
                                      return currentBrief;
                                    }));
                                  }}
                                  className={`shadow border rounded-md w-full py-2 px-3 ${appTextColor}`}
                                  required
                                >
                                  <option value="">Select Type</option>
                                  {draftingOptions.map((option, optIndex) => (
                                    <option key={optIndex} value={option}>{option}</option>
                                  ))}
                                </select>
                              </div>
                              {brief.draftType === 'Other' && (
                                <div>
                                  <label htmlFor={`initialCustomDraftType-${brief.id}`} className={`block ${appTextColor} text-sm font-bold mb-1`}>
                                    Specify Other Drafting:
                                  </label>
                                  <input
                                    type="text"
                                    id={`initialCustomDraftType-${brief.id}`}
                                    value={brief.customDraftType}
                                    onChange={(e) => handleInitialCustomDraftTypeChange(index, e.target.value)}
                                    className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor}`}
                                    placeholder="e.g., Heads of Argument"
                                    required
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mb-2">
                            <label htmlFor={`initialBriefDescription-${brief.id}`} className={`block ${appTextColor} text-sm font-bold mb-1`}>
                              Brief Specific Details / Description (Optional):
                            </label>
                            <input
                              type="text"
                              id={`initialBriefDescription-${brief.id}`}
                              value={brief.description}
                              onChange={(e) => handleInitialBriefChange(index, 'description', e.target.value)}
                              className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor}`}
                              placeholder="e.g., Argue motion, Research on property law, etc."
                            />
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            <div>
                              <label htmlFor={`initialBriefDate-${brief.id}`} className={`block ${appTextColor} text-sm font-bold mb-1`}>
                                {brief.briefCategory === 'Consult' ? 'Consultation Date:' : 'Due Date:'}
                              </label>
                              <input
                                type="date"
                                id={`initialBriefDate-${brief.id}`}
                                value={brief.date}
                                onChange={(e) => handleInitialBriefChange(index, 'date', e.target.value)}
                                className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor}`}
                                required
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-start mb-6">
                        <button
                          type="button"
                          onClick={handleAddInitialBrief}
                          className={`bg-${buttonPrimaryBg} hover:bg-${buttonPrimaryHover} ${buttonPrimaryText} font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 shadow-md flex items-center`}
                        >
                          <Plus size={20} className="mr-2" /> Add Initial Brief
                        </button>
                      </div>
                    </>
                  )}


                  <div className="flex justify-end gap-3">
                    <button
                      type="submit"
                      className={`bg-${buttonPrimaryBg} hover:bg-${buttonPrimaryHover} ${buttonPrimaryText} font-bold py-2 px-6 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 shadow-md`}
                    >
                      {editingMatterId ? 'Update Matter' : 'Add Matter'}
                    </button>
                    {editingMatterId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMatterId(null);
                          setNewMatterName('');
                          setNewMatterDescription('');
                          setNewMatterAttorneyRef('');
                          setNewMatterAttorneysFirmId('');
                          setNewMatterSelectedContactPersons([]);
                          setInitialMatterBriefs([]);
                        }}
                        className={`${buttonSecondaryBg} hover:bg-${buttonSecondaryHover} ${buttonSecondaryText} font-bold py-2 px-6 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 shadow-md`}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Content for "Your Matters & Briefs" sub-tab */}
            {mattersBriefsSubTab === 'your-matters-briefs' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                  <h3 className={`text-2xl font-bold ${headingColorClass}`}>Your Matters & Briefs</h3>
                  <button
                    onClick={() => { setMattersBriefsSubTab('add-new-matter'); setEditingMatterId(null); setNewMatterName(''); setNewMatterDescription(''); setNewMatterAttorneyRef(''); setNewMatterAttorneysFirmId(''); setNewMatterSelectedContactPersons([]); setInitialMatterBriefs([]); }}
                    className={`bg-${activeColorScheme.primary} hover:bg-${activeColorScheme.hover} text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200`}
                  >
                    Add New Matter
                  </button>
                </div>

                {/* Sorting Controls */}
                <div className="mb-4 flex flex-wrap gap-3 items-center">
                  <span className={`font-semibold ${appTextColor}`}>Sort by:</span>
                  <select
                    value={sortByKey}
                    onChange={(e) => setSortByKey(e.target.value)}
                    className={`px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-${activeColorScheme.inputFocus} focus:border-${activeColorScheme.inputFocus}`}
                  >
                    <option value="name">Matter Name</option>
                    <option value="attorney">Attorneys' Firm</option>
                    <option value="dueDate">Nearest Due Date</option>
                  </select>
                  <button
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                    className={`px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition duration-150 shadow-sm flex items-center gap-1`}
                  >
                    {sortDirection === 'asc' ? <ArrowUp size={16} className="inline-block mr-1" /> : <ArrowDown size={16} className="inline-block mr-1" />} {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                  </button>
                </div>


                {getFilteredAndSortedMatters.length === 0 ? (
                  <p className="text-gray-500 italic">No matters or briefs found. Add a new matter above!</p>
                ) : (
                  <div className="space-y-6">
                    {getFilteredAndSortedMatters.map((matter) => {
                      const assignedFirm = attorneys.find(att => att.id === matter.assignedAttorneysFirmId);
                      const assignedContactNames = (matter.assignedContactPersonNames || []).join(', ');

                      return (
                        <div key={matter.id} className={`${cardBorderClass.replace('border ', 'border-')} rounded-lg p-4 shadow-md ${cardBgClass}`}>
                          {/* Attorney's details first */}
                          <p className={`text-lg font-bold ${activeColorScheme.headingColor} mb-1`}>
                            {assignedFirm ? assignedFirm.firmName : 'N/A'}
                            {assignedContactNames && ` (Contacts: ${assignedContactNames})`}
                          </p>
                          <p className={`text-sm text-gray-600 ${theme === 'dark' ? 'text-gray-400' : ''} mb-3`}>
                            <strong>Attorney's Ref:</strong> {matter.attorneyReference || 'N/A'}
                          </p>

                          <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                            <h4 className={`text-xl font-bold ${activeColorScheme.headingColor}`}>{matter.name}</h4>
                            <div className="flex gap-2">
                              <button
                                onClick={() => editMatter(matter)}
                                className={`text-${buttonOutlineText} hover:text-${activeColorScheme.hover} px-3 py-1 rounded-md border border-${buttonOutlineBorder} hover:border-${activeColorScheme.hover} transition duration-150 shadow-sm flex items-center`}
                              >
                                <Edit size={16} className="inline-block mr-1" /> Edit Matter
                              </button>
                              <button
                                onClick={() => deleteMatter(matter.id)}
                                className={`text-red-600 hover:text-red-900 px-3 py-1 rounded-md border border-red-300 hover:border-red-400 transition duration-150 shadow-sm flex items-center`}
                              >
                                <Trash2 size={16} className="inline-block mr-1" /> Delete Matter
                              </button>
                            </div>
                          </div>
                          <p className={`text-gray-700 ${theme === 'dark' ? 'text-gray-300' : ''} mb-2`}>{matter.description}</p>
                          

                          <h5 className={`text-lg font-bold ${activeColorScheme.headingColor} mb-2`}>Briefs for this Matter:</h5>
                          {matter.briefs && matter.briefs.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className={`${tableHeaderBgClass}`}>
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Brief</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {matter.briefs.map((brief) => {
                                    // Construct the brief display string
                                    let briefDisplay = brief.briefCategory || '';
                                    if (brief.appearType) {
                                      briefDisplay += `: ${brief.appearType}`;
                                      if (brief.applicationSubtype) {
                                        briefDisplay += ` (${brief.applicationSubtype})`;
                                      }
                                      // Add court info to display
                                      if (brief.courtType) {
                                        let courtLocation = '';
                                        if (brief.courtType === 'High Court' && brief.highCourtLocation) {
                                          courtLocation = brief.highCourtLocation;
                                        } else if (brief.courtType === 'Magistrates Court' && brief.magistratesCourtLocation) {
                                          courtLocation = brief.magistratesCourtLocation === 'Other' ? brief.customMagistratesCourtLocation : brief.magistratesCourtLocation;
                                        }
                                        if (courtLocation) {
                                          briefDisplay += ` at ${brief.courtType} (${courtLocation})`;
                                        } else {
                                          briefDisplay += ` at ${brief.courtType}`;
                                        }
                                      }
                                    } else if (brief.draftType) {
                                      briefDisplay += `: ${brief.draftType}`;
                                      if (brief.draftType === 'Other' && brief.customDraftType) {
                                        briefDisplay += ` (${brief.customDraftType})`;
                                      }
                                    }
                                    if (brief.originalDescription && brief.originalDescription.trim() !== '') {
                                        briefDisplay += ` - ${brief.originalDescription.trim()}`;
                                    }

                                    return (
                                      <React.Fragment key={brief.id}>
                                        {editingBriefId === brief.id ? (
                                          <tr>
                                            <td colSpan="3" className="p-2">
                                              <EditBriefForm
                                                brief={brief}
                                                onUpdateBriefSubmit={handleUpdateBrief}
                                                onCancelEdit={() => setEditingBriefId(null)}
                                                draftingOptions={draftingOptions}
                                                setDraftingOptions={setDraftingOptions}
                                                appTextColor={appTextColor}
                                                activeColorScheme={activeColorScheme}
                                                buttonPrimaryBg={buttonPrimaryBg}
                                                buttonPrimaryHover={buttonPrimaryHover}
                                                buttonPrimaryText={buttonPrimaryText}
                                                buttonSecondaryBg={buttonSecondaryBg}
                                                buttonSecondaryHover={buttonSecondaryHover}
                                                buttonSecondaryText={buttonSecondaryText}
                                                theme={theme}
                                              />
                                            </td>
                                          </tr>
                                        ) : (
                                          <tr className={tableRowHoverClass}>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm">{formatDate(brief.date, appDateFormat)}</td>
                                            <td className="px-4 py-2 whitespace-normal text-sm text-gray-600">{briefDisplay}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                                              <button
                                                onClick={() => handleMarkBriefCompleteClick(brief)}
                                                className={`bg-green-500 hover:bg-green-600 ${buttonPrimaryText} px-3 py-1 rounded-md mr-2 text-sm transition duration-150 flex items-center`}
                                              >
                                                <CheckCircle size={16} className="inline-block mr-1" /> Complete
                                              </button>
                                              <button
                                                onClick={() => setEditingBriefId(brief.id)}
                                                className={`text-${buttonOutlineText} hover:text-${activeColorScheme.hover} px-3 py-1 rounded-md border border-${buttonOutlineBorder} hover:border-${activeColorScheme.hover} transition duration-150 shadow-sm flex items-center mr-2`}
                                              >
                                                <Edit size={16} className="inline-block mr-1" /> Edit
                                              </button>
                                              <button
                                                onClick={() => deleteBrief(brief.id)}
                                                className={`text-red-600 hover:text-red-900 px-3 py-1 rounded-md border border-red-300 text-sm hover:border-red-400 transition duration-150 flex items-center`}
                                              >
                                                <Trash2 size={16} className="inline-block mr-1" /> Delete
                                              </button>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-gray-500 italic">No briefs assigned to this matter yet.</p>
                          )}

                          {/* Add Brief for Existing Matter Form (Collapsible) */}
                          <div className="mt-6">
                            <button
                              onClick={() => toggleAddBriefForm(matter.id)}
                              className={`bg-${activeColorScheme.primary} hover:bg-${activeColorScheme.hover} text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200 flex items-center`}
                            >
                              {expandedAddBriefForms[matter.id] ? <Minus size={20} className="mr-2" /> : <Plus size={20} className="mr-2" />}
                              Add New Brief for "{matter.name}"
                            </button>
                            {expandedAddBriefForms[matter.id] && (
                              <div className="mt-4">
                                <AddBriefFormForMatter
                                  matter={matter}
                                  onAddBriefSubmit={handleAddBriefForMatterSubmit}
                                  onBriefAdded={() => handleBriefAddedAndCollapse(matter.id)} // Callback to collapse
                                  draftingOptions={draftingOptions}
                                  setDraftingOptions={setDraftingOptions}
                                  appTextColor={appTextColor}
                                  activeColorScheme={activeColorScheme}
                                  buttonPrimaryBg={buttonPrimaryBg}
                                  buttonPrimaryHover={buttonPrimaryHover}
                                  buttonPrimaryText={buttonPrimaryText}
                                  theme={theme}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {/* NEW: Content for "Receptionist Brief Entry" sub-tab */}
            {mattersBriefsSubTab === 'receptionist-brief-entry' && (
              <ReceptionistBriefEntry
                matters={matters}
                attorneys={attorneys}
                userId={userId} // Pass userId for Firestore operations
                appId={appId} // Pass appId for Firestore operations
                db={db} // Pass db for Firestore operations
                addBriefToFirestore={handleAddBriefForMatterSubmit} // Re-use the brief submission logic
                showMessage={showMessage}
                appTextColor={appTextColor}
                activeColorScheme={activeColorScheme}
                buttonPrimaryBg={buttonPrimaryBg}
                buttonPrimaryHover={buttonPrimaryHover}
                buttonPrimaryText={buttonPrimaryText}
                theme={theme}
              />
            )}
          </div>
        )}

        {/* --- Attorneys Section --- */}
        {currentPage === 'attorneys' && (
          <div className="space-y-8">
            <h2 className={`text-3xl font-bold ${headingColorClass} text-center flex items-center justify-center gap-2`}>
              Manage Attorneys <Users size={28} className={`text-${activeColorScheme.primary}`} />
            </h2>

            {/* Sub-navigation for Attorneys */}
            <nav className="mb-6 flex justify-center gap-2">
              <button
                onClick={() => setAttorneysSubTab('registered-attorneys')}
                className={`px-4 py-2 rounded-lg font-semibold text-base transition duration-300 ease-in-out ${
                  attorneysSubTab === 'registered-attorneys' ? `bg-${activeColorScheme.primary} text-white shadow-md` : `bg-gray-200 text-gray-700 hover:bg-gray-300`
                }`}
              >
                Registered Attorneys' Firms
              </button>
              <button
                onClick={() => { setAttorneysSubTab('add-new-attorney'); setEditingAttorneyId(null); setNewFirmName(''); setNewFirmBuilding(''); setNewFirmStreet(''); setNewFirmCity(''); setNewFirmProvince(''); setNewFirmGeneralPhone(''); setNewFirmGeneralEmail(''); setCurrentContactPersons([{ name: '', phone: '', email: '' }]);}}
                className={`px-4 py-2 rounded-lg font-semibold text-base transition duration-300 ease-in-out ${
                  attorneysSubTab === 'add-new-attorney' ? `bg-${activeColorScheme.primary} text-white shadow-md` : `bg-gray-200 text-gray-700 hover:bg-gray-300`
                }`}
              >
                Add New Firm of Attorneys
              </button>
            </nav>

            {/* Content for "Add New Attorney" sub-tab */}
            {attorneysSubTab === 'add-new-attorney' && (
              <div className="space-y-8">
                <h3 className={`text-2xl font-bold ${headingColorClass} text-center mb-4`}>
                  {editingAttorneyId ? 'Edit Firm of Attorneys' : 'Add New Firm of Attorneys'} <Plus size={24} className={`inline-block ml-1 text-${activeColorScheme.primary}`} />
                </h3>
                <form onSubmit={editingAttorneyId ? updateAttorney : addAttorney} className={`${cardBgClass} rounded-lg shadow-lg p-6 ${cardBorderClass}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="firmName" className={`block ${appTextColor} text-sm font-bold mb-2`}>
                        Firm Name:
                      </label>
                      <input
                        type="text"
                        id="firmName"
                        value={newFirmName}
                        onChange={(e) => setNewFirmName(e.target.value)}
                        className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:border-${activeColorScheme.inputFocus}`}
                        placeholder="e.g., Legal & Co."
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="generalPhone" className={`block ${appTextColor} text-sm font-bold mb-2`}>
                        Firm General Phone:
                      </label>
                      <input
                        type="tel"
                        id="generalPhone"
                        value={newFirmGeneralPhone}
                        onChange={(e) => setNewFirmGeneralPhone(e.target.value)}
                        className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:border-${activeColorScheme.inputFocus}`}
                        placeholder="e.g., +27 11 123 4567"
                      />
                    </div>
                    <div>
                      <label htmlFor="generalEmail" className={`block ${appTextColor} text-sm font-bold mb-2`}>
                        Firm General Email:
                      </label>
                      <input
                        type="email"
                        id="generalEmail"
                        value={newFirmGeneralEmail}
                        onChange={(e) => setNewFirmGeneralEmail(e.target.value)}
                        className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:border-${activeColorScheme.inputFocus}`}
                        placeholder="e.g., info@legalco.com"
                      />
                    </div>
                  </div>

                  {/* Address Fields */}
                  <h3 className={`text-lg font-bold ${appTextColor} mb-2 mt-4`}>Firm Address:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="firmBuilding" className={`block ${appTextColor} text-sm font-bold mb-2`}>
                        Building Name / Office No.:
                      </label>
                      <input
                        type="text"
                        id="firmBuilding"
                        value={newFirmBuilding}
                        onChange={(e) => setNewFirmBuilding(e.target.value)}
                        className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:border-${activeColorScheme.inputFocus}`}
                        placeholder="e.g., Apex Towers, Office 501"
                      />
                    </div>
                    <div>
                      <label htmlFor="firmStreet" className={`block ${appTextColor} text-sm font-bold mb-2`}>
                        Street Address:
                      </label>
                      <input
                        type="text"
                        id="firmStreet"
                        value={newFirmStreet}
                        onChange={(e) => setNewFirmStreet(e.target.value)}
                        className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:border-${activeColorScheme.inputFocus}`}
                        placeholder="e.g., 123 Main Street"
                      />
                    </div>
                    <div>
                      <label htmlFor="firmCity" className={`block ${appTextColor} text-sm font-bold mb-2`}>
                        City:
                      </label>
                      <input
                        type="text"
                        id="firmCity"
                        value={newFirmCity}
                        onChange={(e) => setNewFirmCity(e.target.value)}
                        className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:border-${activeColorScheme.inputFocus}`}
                        placeholder="e.g., Johannesburg"
                      />
                    </div>
                    <div>
                      <label htmlFor="firmProvince" className={`block ${appTextColor} text-sm font-bold mb-2`}>
                        Province:
                      </label>
                      <input
                        type="text"
                        id="firmProvince"
                        value={newFirmProvince}
                        onChange={(e) => setNewFirmProvince(e.target.value)}
                        className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:border-${activeColorScheme.inputFocus}`}
                        placeholder="e.g., Gauteng"
                      />
                    </div>
                  </div>

                  {/* Contact Persons Section */}
                  <h3 className={`text-lg font-bold ${appTextColor} mb-2 mt-4`}>Contact Persons:</h3>
                  {currentContactPersons.map((contact, index) => (
                    <div key={index} className={`grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 p-4 border border-gray-200 rounded-md ${theme === 'light' ? 'bg-gray-50' : 'bg-gray-600'}`}>
                      <div>
                        <label htmlFor={`contactName-${index}`} className={`block ${appTextColor} text-sm font-bold mb-2`}>
                          Contact Name:
                        </label>
                        <input
                          type="text"
                          id={`contactName-${index}`}
                          value={contact.name}
                          onChange={(e) => handleContactPersonChange(index, 'name', e.target.value)}
                          className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:border-${activeColorScheme.inputFocus}`}
                          placeholder="e.g., Jane Smith"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor={`contactPhone-${index}`} className={`block ${appTextColor} text-sm font-bold mb-2`}>
                          Contact Phone:
                        </label>
                        <input
                          type="tel"
                          id={`contactPhone-${index}`}
                          value={contact.phone}
                          onChange={(e) => handleContactPersonChange(index, 'phone', e.target.value)}
                          className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:border-${activeColorScheme.inputFocus}`}
                          placeholder="Defaults to Firm Phone"
                        />
                      </div>
                      <div>
                        <label htmlFor={`contactEmail-${index}`} className={`block ${appTextColor} text-sm font-bold mb-2`}>
                          Contact Email:
                        </label>
                        <div className="flex items-center">
                          <input
                            type="email"
                            id={`contactEmail-${index}`}
                            value={contact.email}
                            onChange={(e) => handleContactPersonChange(index, 'email', e.target.value)}
                            className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:border-${activeColorScheme.inputFocus}`}
                            placeholder="e.g., jane@legalco.com"
                          />
                          {currentContactPersons.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveContactPerson(index)}
                              className="ml-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition duration-200 shadow-sm"
                              title="Remove Contact Person"
                            >
                              <Minus size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-start mb-6">
                    <button
                      type="button"
                      onClick={handleAddContactPerson}
                      className={`bg-${buttonPrimaryBg} hover:bg-${buttonPrimaryHover} ${buttonPrimaryText} font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 shadow-md flex items-center`}
                    >
                      <Plus size={20} className="mr-2" /> Add Contact Person
                    </button>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="submit"
                      className={`bg-${buttonPrimaryBg} hover:bg-${buttonPrimaryHover} ${buttonPrimaryText} font-bold py-2 px-6 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 shadow-md`}
                    >
                      {editingAttorneyId ? 'Update Attorneys\' Firm' : 'Add Firm of Attorneys'}
                    </button>
                    {editingAttorneyId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAttorneyId(null);
                          setNewFirmName('');
                          setNewFirmBuilding('');
                          setNewFirmStreet('');
                          setNewFirmCity('');
                          setNewFirmProvince('');
                          setNewFirmGeneralPhone('');
                          setNewFirmGeneralEmail('');
                          setCurrentContactPersons([{ name: '', phone: '', email: '' }]);
                        }}
                        className={`${buttonSecondaryBg} hover:bg-${buttonSecondaryHover} ${buttonSecondaryText} font-bold py-2 px-6 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 shadow-md`}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Content for "Registered Attorneys" sub-tab */}
            {attorneysSubTab === 'registered-attorneys' && (
              <div className={`${cardBgClass} rounded-lg shadow-xl p-6 ${cardBorderClass}`}>
                <h3 className={`text-2xl font-bold ${headingColorClass} mb-4`}>Registered Attorneys' Firms</h3>
                {attorneys.length === 0 ? (
                  <p className="text-gray-500 italic">No Firm of Attorneys added yet. Add your first Firm of Attorneys above!</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                      <thead className={`${tableHeaderBgClass}`}>
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider rounded-tl-lg">Firm Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">General Phone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">General Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Address</th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Contact Persons</th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider rounded-tr-lg">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attorneys.map((attorney) => (
                          <tr key={attorney.id} className={tableRowHoverClass}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{attorney.firmName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{attorney.generalPhone || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{attorney.generalEmail || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-600">{formatAttorneysFirmAddress(attorney.address)}</td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-600">
                              {(attorney.contactPersons || []).length > 0 ? (
                                <ul>
                                  {attorney.contactPersons.map((cp, idx) => (
                                    <li key={idx}>
                                      {cp.name} ({cp.phone || 'N/A'}, {cp.email || 'N/A'})
                                    </li>
                                  ))}
                                </ul>
                              ) : attorney.contactPerson ? (
                                `${attorney.contactPerson} (${attorney.phone || 'N/A'}, ${attorney.email || 'N/A'})`
                              ) : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => editAttorney(attorney)}
                                className={`text-${buttonOutlineText} hover:text-${activeColorScheme.hover} mr-3 px-3 py-1 rounded-md border border-${buttonOutlineBorder} hover:border-${activeColorScheme.hover} transition duration-150 flex items-center`}
                              >
                                <Edit size={16} className="inline-block mr-1" /> Edit
                              </button>
                              <button
                                onClick={() => deleteAttorney(attorney.id)}
                                className={`text-red-600 hover:text-red-900 px-3 py-1 rounded-md border border-red-300 hover:border-red-400 transition duration-150 flex items-center`}
                              >
                                <Trash2 size={16} className="inline-block mr-1" /> Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- Work Records Section --- */}
        {currentPage === 'workRecords' && (
          <div className="space-y-8">
            <h2 className={`text-3xl font-bold ${headingColorClass} text-center flex items-center justify-center gap-2`}>
              Work Done Records <BarChart2 size={28} className={`text-${activeColorScheme.primary}`} />
            </h2>
            <div className={`${cardBgClass} rounded-lg shadow-xl p-6 ${cardBorderClass}`}>
              <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                <h3 className={`text-2xl font-bold ${headingColorClass}`}>Completed Work</h3>
                <button
                  onClick={exportWorkRecords}
                  className={`bg-green-600 hover:bg-green-700 ${buttonPrimaryText} font-bold py-2 px-6 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 shadow-md flex items-center`}
                >
                  <Upload size={20} className="mr-2" /> Export to CSV
                </button>
              </div>
              {workRecords.length === 0 ? (
                <p className="text-gray-500 italic">No work records yet. Complete some briefs!</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                    <thead className={`${tableHeaderBgClass}`}>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider rounded-tl-lg">Attorneys' Firm</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Matter</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Attorney's Reference</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Fee (R)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Contact Person</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Invoice No.</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Court Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Court Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider rounded-tr-lg">Completed At</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider rounded-tr-lg">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workRecords.map((record) => {
                        let courtLocationDisplay = '';
                        if (record.courtType === 'High Court') {
                          courtLocationDisplay = record.highCourtLocation || 'N/A';
                        } else if (record.courtType === 'Magistrates Court') {
                          courtLocationDisplay = record.magistratesCourtLocation === 'Other' ? (record.customMagistratesCourtLocation || 'N/A') : (record.magistratesCourtLocation || 'N/A');
                        }
                        return (
                          <tr key={record.id} className={tableRowHoverClass}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{record.attorneysFirmName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{record.matterName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.attorneyReference || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(record.date, appDateFormat)}</td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-600">{record.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">R {record.feeDue.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-600">
                              {(record.attorneyContactPersonsDetails || []).map(cp => cp.name).join(', ') || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.invoiceNumber || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.courtType || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{courtLocationDisplay}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(record.completedAt, appDateFormat)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => deleteWorkRecord(record.id)}
                                className={`text-red-600 hover:text-red-900 px-3 py-1 rounded-md border border-red-300 hover:border-red-400 transition duration-150 flex items-center`}
                              >
                                <Trash2 size={16} className="inline-block mr-1" /> Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- Settings Section --- */}
        {currentPage === 'settings' && (
          <div className="space-y-8">
            <h2 className={`text-3xl font-bold ${headingColorClass} text-center flex items-center justify-center gap-2`}>
              Application Settings <Settings size={28} className={`text-${activeColorScheme.primary}`} />
            </h2>

            <form onSubmit={updateAppSettings} className={`${cardBgClass} rounded-lg shadow-lg p-6 ${cardBorderClass}`}>
              <h3 className={`text-2xl font-bold ${headingColorClass} mb-4`}>Fee Structure</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="hourlyRateSetting" className={`block ${appTextColor} text-sm font-bold mb-2`}>
                    Hourly Rate (R):
                  </label>
                  <input
                    id="hourlyRateSetting"
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:border-${activeColorScheme.inputFocus}`}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="unopposedMotionCourtFee" className={`block ${appTextColor} text-sm font-bold mb-2`}>
                    Unopposed Motion Court Fee (R):
                  </label>
                  <input
                    id="unopposedMotionCourtFee"
                    type="number"
                    value={unopposedMotionCourtFee}
                    onChange={(e) => setUnopposedMotionCourtFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:border-${activeColorScheme.inputFocus}`}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="opposedMotionCourtFee" className={`block ${appTextColor} text-sm font-bold mb-2`}>
                    Opposed Motion Court Fee (R):
                  </label>
                  <input
                    id="opposedMotionCourtFee"
                    type="number"
                    value={opposedMotionCourtFee}
                    onChange={(e) => setOpposedMotionCourtFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:border-${activeColorScheme.inputFocus}`}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="dayFee" className={`block ${appTextColor} text-sm font-bold mb-2`}>
                    Day Fee (R):
                  </label>
                  <input
                    id="dayFee"
                    type="number"
                    value={dayFee}
                    onChange={(e) => setDayFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className={`shadow appearance-none border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:border-${activeColorScheme.inputFocus}`}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <h3 className={`text-2xl font-bold ${headingColorClass} mb-4 mt-8`}>Display Settings</h3>
              <div className="mb-4">
                <label htmlFor="dateFormatSetting" className={`block ${appTextColor} text-sm font-bold mb-2`}>
                  Date Format:
                </label>
                <select
                  id="dateFormatSetting"
                  value={appDateFormat}
                  onChange={(e) => setAppDateFormat(e.target.value)}
                  className={`shadow border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:border-${activeColorScheme.inputFocus}`}
                >
                  <option value="YYYY-MM-DD">YYYY-MM-DD (e.g., 2024-01-31)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (e.g., 31/01/2024)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (e.g., 01/31/2024)</option>
                </select>
              </div>

              {/* Theme (Light/Dark) */}
              <div className="mb-4">
                <label className={`block ${appTextColor} text-sm font-bold mb-2`}>
                  Theme:
                </label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      className={`form-radio text-${activeColorScheme.primary} h-5 w-5`}
                      name="theme"
                      value="light"
                      checked={theme === 'light'}
                      onChange={(e) => setTheme(e.target.value)}
                    />
                    <span className={`ml-2 ${appTextColor} flex items-center gap-1`}>
                      <Sun size={18} /> Light Mode
                    </span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      className={`form-radio text-${activeColorScheme.primary} h-5 w-5`}
                      name="theme"
                      value="dark"
                      checked={theme === 'dark'}
                      onChange={(e) => setTheme(e.target.value)}
                    />
                    <span className={`ml-2 ${appTextColor} flex items-center gap-1`}>
                      <Moon size={18} /> Dark Mode
                    </span>
                  </label>
                </div>
              </div>

              {/* Color Scheme */}
              <div className="mb-4">
                <label className={`block ${appTextColor} text-sm font-bold mb-2`}>
                  Color Scheme:
                </label>
                <div className="flex flex-wrap gap-4">
                  {Object.keys(colorSchemes).map(schemeKey => (
                    <label key={schemeKey} className="inline-flex items-center cursor-pointer">
                      <input
                        type="radio"
                        className={`form-radio text-${colorSchemes[schemeKey].primary} h-5 w-5`} // Use scheme's primary color
                        name="colorScheme"
                        value={schemeKey}
                        checked={colorScheme === schemeKey}
                        onChange={(e) => setColorScheme(e.target.value)}
                      />
                      <span className={`ml-2 ${appTextColor} flex items-center gap-1`}>
                        <Palette size={18} style={{ color: colorSchemes[schemeKey].primary.split('-')[0] }} /> {/* Represent scheme color visually */}
                        {schemeKey.charAt(0).toUpperCase() + schemeKey.slice(1)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Font Family */}
              <div className="mb-4">
                <label htmlFor="fontFamilySetting" className={`block ${appTextColor} text-sm font-bold mb-2`}>
                  Font Family:
                </label>
                <select
                  id="fontFamilySetting"
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className={`shadow border rounded-md w-full py-2 px-3 ${appTextColor} leading-tight focus:outline-none focus:ring-2 focus:ring-${activeColorScheme.inputFocus} focus:border-${activeColorScheme.inputFocus}`}
                >
                  {Object.keys(fontFamilies).map(fontName => (
                    <option key={fontName} value={fontName}>
                      {fontName}
                    </option>
                  ))}
                </select>
              </div>


              <div className="flex justify-end mt-6">
                <button
                  type="submit"
                  className={`bg-${buttonPrimaryBg} hover:bg-${buttonPrimaryHover} ${buttonPrimaryText} font-bold py-2 px-6 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 shadow-md`}
                >
                  Save Settings
                </button>
              </div>
            </form>

            {/* Sample Data Section */}
            <div className={`${cardBgClass} rounded-lg shadow-lg p-6 ${cardBorderClass} mt-8`}>
              <h3 className={`text-2xl font-bold ${headingColorClass} mb-4`}>Sample Data</h3>
              <p className="text-gray-500 italic mb-4">
                Load sample attorneys, matters, and briefs to see the app in action.
                This will only load if you don't have existing data or haven't loaded sample data before.
              </p>
              <button
                onClick={loadSampleData}
                disabled={sampleDataLoaded} // Disable if already loaded
                className={`bg-${buttonPrimaryBg} hover:bg-${buttonPrimaryHover} ${buttonPrimaryText} font-bold py-2 px-6 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 shadow-md ${sampleDataLoaded ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {sampleDataLoaded ? 'Sample Data Loaded' : 'Load Sample Data'}
              </button>
              {sampleDataLoaded && (
                <p className={`text-sm mt-2 text-green-600`}>Sample data has been loaded and will persist across sessions.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
