

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatAssistant from './ChatAssistant'; 
import { useAppContext } from '../context/AppContext';
import Card from './common/Card';
import { ICONS } from '../constants';
import AgendaHistoryModal from './AgendaHistoryModal';

const generateTimeSlots = () => {
    const slots = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            const date = new Date(0, 0, 0, h, m);
            const timeString = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            slots.push(timeString);
        }
    }
    return slots;
};
const timeSlots = generateTimeSlots();

const QuickActionsWidget: React.FC = () => {
    const { setChatInput } = useAppContext();
    const navigate = useNavigate();

    const handleAction = (prompt: string) => {
        setChatInput(prompt);
        if (window.location.hash !== '#/') {
            navigate('/');
        }
    };
    
    const actions = [
        { label: 'Draft an email...', prompt: 'Draft an email to ' },
        { label: 'Summarize text...', prompt: 'Summarize the following text: ' },
        { label: 'Translate to French...', prompt: 'Translate this to French: ' },
        { label: 'Create a new to-do', prompt: 'Add a new to-do item: ' },
    ];

    return (
        <Card>
            <h3 className="font-semibold text-text-primary dark:text-dark-text-primary mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
                {actions.map(action => (
                    <button 
                        key={action.label}
                        onClick={() => handleAction(action.prompt)}
                        className="text-left text-sm p-2 bg-background dark:bg-dark-background hover:bg-gray-100 dark:hover:bg-slate-700/60 rounded-lg transition-colors border border-border-color dark:border-dark-border-color text-text-secondary dark:text-dark-text-secondary"
                    >
                        {action.label}
                    </button>
                ))}
            </div>
        </Card>
    );
};


const AgendaWidget: React.FC = () => {
    const { user, calendarEvents, addCalendarEvent, removeCalendarEvent } = useAppContext();
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventTime, setNewEventTime] = useState('09:00 AM');
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const handleAddEvent = (e: React.FormEvent) => {
        e.preventDefault();
        if (newEventTitle.trim() && newEventTime) {
            addCalendarEvent({ title: newEventTitle, time: newEventTime });
            setNewEventTitle('');
            setNewEventTime('09:00 AM');
        }
    };
    
    const widgetTitle = user ? 'Google Calendar' : "Today's Agenda";

    return (
        <>
            <Card className="!p-0 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-border-color dark:border-dark-border-color flex justify-between items-center">
                    <h3 className="font-semibold text-text-primary dark:text-dark-text-primary flex items-center gap-2">
                        {ICONS.calendar} {widgetTitle}
                    </h3>
                    <button 
                        onClick={() => setIsHistoryModalOpen(true)}
                        title="View agenda history"
                        className="text-secondary dark:text-dark-secondary hover:text-primary dark:hover:text-dark-primary transition-colors"
                    >
                        {ICONS.history}
                    </button>
                </div>
                <div className="p-4 space-y-3 text-sm max-h-48 overflow-y-auto flex-grow">
                    {calendarEvents.length > 0 ? calendarEvents.map(event => (
                        <div key={event.id} className="flex items-start group">
                            <div className="font-semibold text-primary dark:text-dark-primary w-20 shrink-0">{event.time}</div>
                            <div className="text-text-secondary dark:text-dark-text-secondary flex-grow">
                                <p className="font-medium text-text-primary dark:text-dark-text-primary">{event.title}</p>
                                {event.attendees && <p className="text-xs">With: {event.attendees.join(', ')}</p>}
                            </div>
                            <button onClick={() => removeCalendarEvent(event.id)} className="text-secondary dark:text-dark-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                                {ICONS.close}
                            </button>
                        </div>
                    )) : (
                        <div className="text-secondary dark:text-dark-secondary text-center h-full flex items-center justify-center">No events scheduled.</div>
                    )}
                </div>
                <form onSubmit={handleAddEvent} className="p-4 border-t border-border-color dark:border-dark-border-color bg-surface dark:bg-dark-surface">
                    <div className="flex gap-2">
                        <div className="relative w-28">
                            <select
                                value={newEventTime}
                                onChange={(e) => setNewEventTime(e.target.value)}
                                className="w-full bg-background dark:bg-dark-background border border-border-color dark:border-dark-border-color rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-8"
                            >
                                {timeSlots.map(time => (
                                    <option key={time} value={time}>{time}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-secondary dark:text-dark-secondary">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                        <input 
                            type="text" 
                            value={newEventTitle}
                            onChange={(e) => setNewEventTitle(e.target.value)}
                            placeholder="New event title..."
                            className="flex-grow bg-background dark:bg-dark-background border border-border-color dark:border-dark-border-color rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button type="submit" className="bg-primary text-white rounded-md px-3 text-sm font-semibold hover:bg-primary-hover disabled:bg-gray-400 dark:disabled:bg-slate-600" disabled={!newEventTitle.trim() || !newEventTime.trim()}>
                            Add
                        </button>
                    </div>
                </form>
            </Card>
            <AgendaHistoryModal 
                isOpen={isHistoryModalOpen} 
                onClose={() => setIsHistoryModalOpen(false)} 
            />
        </>
    );
};

const TodoWidget: React.FC = () => {
    const { user, todos, addTodo, toggleTodo, removeTodo } = useAppContext();
    const [newTodo, setNewTodo] = useState('');
    const widgetTitle = user ? 'Google Tasks' : 'To-Do List';

    const handleAddTodo = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTodo.trim()) {
            addTodo({ item: newTodo });
            setNewTodo('');
        }
    };

    return (
        <Card className="!p-0 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border-color dark:border-dark-border-color">
                <h3 className="font-semibold text-text-primary dark:text-dark-text-primary flex items-center gap-2">
                    {ICONS.todo} {widgetTitle}
                </h3>
            </div>
            <div className="p-4 space-y-2 text-sm max-h-48 overflow-y-auto flex-grow">
                {todos.length > 0 ? todos.map(todo => (
                    <div key={todo.id} className="flex items-center group">
                        <input 
                            type="checkbox" 
                            checked={todo.completed} 
                            onChange={() => toggleTodo(todo.id)}
                            className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-primary focus:ring-primary mr-3 shrink-0 bg-transparent dark:bg-transparent"
                        />
                        <span className={`flex-grow ${todo.completed ? 'line-through text-secondary dark:text-dark-secondary' : 'text-text-primary dark:text-dark-text-primary'}`}>{todo.item}</span>
                        <button onClick={() => removeTodo(todo.id)} className="text-secondary dark:text-dark-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                            {ICONS.close}
                        </button>
                    </div>
                )) : (
                    <div className="text-secondary dark:text-dark-secondary text-center h-full flex items-center justify-center">Your to-do list is empty.</div>
                )}
            </div>
            <form onSubmit={handleAddTodo} className="p-4 border-t border-border-color dark:border-dark-border-color bg-surface dark:bg-dark-surface">
                 <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={newTodo}
                        onChange={(e) => setNewTodo(e.target.value)}
                        placeholder="New to-do item..."
                        className="flex-grow bg-background dark:bg-dark-background border border-border-color dark:border-dark-border-color rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button type="submit" className="bg-primary text-white rounded-md px-3 text-sm font-semibold hover:bg-primary-hover disabled:bg-gray-400 dark:disabled:bg-slate-600" disabled={!newTodo.trim()}>
                        Add
                    </button>
                </div>
            </form>
        </Card>
    );
};

const RemindersWidget: React.FC = () => {
    const { reminders, removeReminder } = useAppContext();
    if (reminders.length === 0) return null;
    return (
        <Card className="!p-0 overflow-hidden">
             <div className="p-4 border-b border-border-color dark:border-dark-border-color">
                <h3 className="font-semibold text-text-primary dark:text-dark-text-primary">Reminders</h3>
            </div>
            <div className="p-4 space-y-2 text-sm max-h-48 overflow-y-auto">
                {reminders.map(reminder => (
                    <div key={reminder.id} className="flex items-center group bg-teal-50/50 dark:bg-teal-500/10 p-2 rounded-md">
                        <div className="flex-grow">
                            <p className="font-semibold text-primary dark:text-dark-primary">{reminder.time}</p>
                            <p className="text-text-secondary dark:text-dark-text-secondary">{reminder.task}</p>
                        </div>
                        <button onClick={() => removeReminder(reminder.id)} className="text-secondary dark:text-dark-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            {ICONS.close}
                        </button>
                    </div>
                ))}
            </div>
        </Card>
    );
}

const Dashboard: React.FC = () => {
  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      <div className="flex-grow h-full flex flex-col">
          <ChatAssistant />
      </div>
      <aside className="w-full lg:w-80 lg:h-full flex-shrink-0 flex flex-col gap-6 animate-fadeIn">
          <QuickActionsWidget />
          <AgendaWidget />
          <TodoWidget />
          <RemindersWidget />
      </aside>
    </div>
  );
};

export default Dashboard;
