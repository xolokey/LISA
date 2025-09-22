

import React, { useState } from 'react';
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

const AgendaWidget: React.FC = () => {
    const { calendarEvents, addCalendarEvent, removeCalendarEvent } = useAppContext();
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

    return (
        <>
            <Card className="!p-0 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-border-color flex justify-between items-center">
                    <h3 className="font-semibold text-text-primary flex items-center gap-2">
                        {ICONS.calendar} Today's Agenda
                    </h3>
                    <button 
                        onClick={() => setIsHistoryModalOpen(true)}
                        title="View agenda history"
                        className="text-secondary hover:text-primary transition-colors"
                    >
                        {ICONS.history}
                    </button>
                </div>
                <div className="p-4 space-y-3 text-sm max-h-48 overflow-y-auto flex-grow">
                    {calendarEvents.length > 0 ? calendarEvents.map(event => (
                        <div key={event.id} className="flex items-start group">
                            <div className="font-semibold text-primary w-20 shrink-0">{event.time}</div>
                            <div className="text-text-secondary flex-grow">
                                <p className="font-medium text-text-primary">{event.title}</p>
                                {event.attendees && <p className="text-xs">With: {event.attendees.join(', ')}</p>}
                            </div>
                            <button onClick={() => removeCalendarEvent(event.id)} className="text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                                {ICONS.close}
                            </button>
                        </div>
                    )) : (
                        <div className="text-secondary text-center h-full flex items-center justify-center">No events scheduled.</div>
                    )}
                </div>
                <form onSubmit={handleAddEvent} className="p-4 border-t border-border-color bg-surface">
                    <div className="flex gap-2">
                        <div className="relative w-28">
                            <select
                                value={newEventTime}
                                onChange={(e) => setNewEventTime(e.target.value)}
                                className="w-full bg-background border border-border-color rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-8"
                            >
                                {timeSlots.map(time => (
                                    <option key={time} value={time}>{time}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-secondary">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                        <input 
                            type="text" 
                            value={newEventTitle}
                            onChange={(e) => setNewEventTitle(e.target.value)}
                            placeholder="New event title..."
                            className="flex-grow bg-background border border-border-color rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button type="submit" className="bg-primary text-white rounded-md px-3 text-sm font-semibold hover:bg-primary-hover disabled:bg-gray-300" disabled={!newEventTitle.trim() || !newEventTime.trim()}>
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
    const { todos, addTodo, toggleTodo, removeTodo } = useAppContext();
    const [newTodo, setNewTodo] = useState('');

    const handleAddTodo = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTodo.trim()) {
            addTodo({ item: newTodo });
            setNewTodo('');
        }
    };

    return (
        <Card className="!p-0 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border-color">
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                    {ICONS.todo} To-Do List
                </h3>
            </div>
            <div className="p-4 space-y-2 text-sm max-h-48 overflow-y-auto flex-grow">
                {todos.length > 0 ? todos.map(todo => (
                    <div key={todo.id} className="flex items-center group">
                        <input 
                            type="checkbox" 
                            checked={todo.completed} 
                            onChange={() => toggleTodo(todo.id)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mr-3 shrink-0"
                        />
                        <span className={`flex-grow ${todo.completed ? 'line-through text-secondary' : 'text-text-primary'}`}>{todo.item}</span>
                        <button onClick={() => removeTodo(todo.id)} className="text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                            {ICONS.close}
                        </button>
                    </div>
                )) : (
                    <div className="text-secondary text-center h-full flex items-center justify-center">Your to-do list is empty.</div>
                )}
            </div>
            <form onSubmit={handleAddTodo} className="p-4 border-t border-border-color bg-surface">
                 <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={newTodo}
                        onChange={(e) => setNewTodo(e.target.value)}
                        placeholder="New to-do item..."
                        className="flex-grow bg-background border border-border-color rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button type="submit" className="bg-primary text-white rounded-md px-3 text-sm font-semibold hover:bg-primary-hover disabled:bg-gray-300" disabled={!newTodo.trim()}>
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
             <div className="p-4 border-b border-border-color">
                <h3 className="font-semibold text-text-primary">Reminders</h3>
            </div>
            <div className="p-4 space-y-2 text-sm max-h-48 overflow-y-auto">
                {reminders.map(reminder => (
                    <div key={reminder.id} className="flex items-center group bg-teal-50/50 p-2 rounded-md">
                        <div className="flex-grow">
                            <p className="font-semibold text-primary">{reminder.time}</p>
                            <p className="text-text-secondary">{reminder.task}</p>
                        </div>
                        <button onClick={() => removeReminder(reminder.id)} className="text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
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
          <AgendaWidget />
          <TodoWidget />
          <RemindersWidget />
      </aside>
    </div>
  );
};

export default Dashboard;