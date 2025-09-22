
import React, { useState, useMemo } from 'react';
import Modal from './common/Modal';
import { useAppContext } from '../context/AppContext';

const generateMonthOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        options.push({ value, label });
    }
    return options;
};

const monthOptions = generateMonthOptions();

const AgendaHistoryModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { agendaHistory } = useAppContext();
    const [selectedMonth, setSelectedMonth] = useState(monthOptions[1].value); // Default to last month

    const currentDay = useMemo(() => new Date().getDate(), []);

    const filteredEvents = useMemo(() => {
        return agendaHistory.filter(event => {
            if (!event.date) return false;
            // Date format is YYYY-MM-DD
            const eventDay = parseInt(event.date.split('-')[2], 10);
            const eventMonthYear = event.date.substring(0, 7);
            return eventDay === currentDay && eventMonthYear === selectedMonth;
        }).sort((a, b) => a.time.localeCompare(b.time));
    }, [agendaHistory, selectedMonth, currentDay]);

    const selectedMonthLabel = monthOptions.find(opt => opt.value === selectedMonth)?.label;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Agenda History for day ${currentDay}`}>
            <div className="space-y-4">
                <div>
                    <label htmlFor="month-select" className="block text-sm font-medium text-text-secondary mb-2">
                        Select a month to view:
                    </label>
                    <div className="relative">
                        <select
                            id="month-select"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-background border border-border-color text-text-secondary text-sm rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none block w-full pl-3 pr-10 py-2.5 appearance-none transition-all"
                        >
                            {monthOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-secondary">
                           <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                </div>

                <div className="border-t border-border-color pt-4">
                    <h4 className="font-semibold text-text-primary mb-3">Events for {selectedMonthLabel}</h4>
                    <div className="space-y-3 text-sm max-h-80 overflow-y-auto">
                        {filteredEvents.length > 0 ? (
                            filteredEvents.map(event => (
                                <div key={event.id} className="flex items-start p-2 bg-background rounded-md">
                                    <div className="font-semibold text-primary w-20 shrink-0">{event.time}</div>
                                    <div className="text-text-secondary flex-grow">
                                        <p className="font-medium text-text-primary">{event.title}</p>
                                        {event.attendees && <p className="text-xs">With: {event.attendees.join(', ')}</p>}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-secondary text-center py-8">
                                No agenda items found for this day in {selectedMonthLabel}.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default AgendaHistoryModal;
