import { motion } from 'framer-motion';

const StreakCalendar = ({ streak }) => {
    if (!streak) return null;

    // Generate calendar for current month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Get first day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Convert history to set for O(1) lookup
    const activeSet = new Set(streak.history || []);

    // Days of week
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    // Get achievement for streak level
    const getAchievement = (current) => {
        if (current >= 30) return { emoji: '💎', color: 'text-purple-600', label: 'Diamond Streak!' };
        if (current >= 10) return { emoji: '⭐', color: 'text-yellow-500', label: 'Star Streak!' };
        if (current >= 5) return { emoji: '🔥', color: 'text-orange-500', label: 'Fire Streak!' };
        return null;
    };

    const achievement = getAchievement(streak.current);

    // Generate calendar grid
    const calendar = [];
    let day = 1;

    for (let week = 0; week < 6; week++) {
        const weekDays = [];
        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
            if ((week === 0 && dayOfWeek < firstDay) || day > daysInMonth) {
                weekDays.push(null);
            } else {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isActive = activeSet.has(dateStr);
                const isToday = day === now.getDate();
                weekDays.push({ day, dateStr, isActive, isToday });
                day++;
            }
        }
        calendar.push(weekDays);
        if (day > daysInMonth) break;
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-gray-200 dark:border-gray-700"
        >
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Learning Streak
                    </h3>
                    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full">
                        <span className="text-2xl">🔥</span>
                        <span className="text-2xl font-black text-white">{streak.current}</span>
                    </div>
                </div>

                {achievement && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-2 text-lg font-semibold"
                    >
                        <span className="text-3xl">{achievement.emoji}</span>
                        <span className={achievement.color}>{achievement.label}</span>
                    </motion.div>
                )}

                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                        <span className="font-semibold">Longest:</span> {streak.longest} days
                    </div>
                    <div>
                        <span className="font-semibold">Total:</span> {(streak.history || []).length} days
                    </div>
                </div>
            </div>

            {/* Calendar */}
            <div>
                <div className="text-center font-semibold text-lg mb-4 text-gray-800 dark:text-gray-200">
                    {monthNames[month]} {year}
                </div>

                {/* Day names */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {dayNames.map(name => (
                        <div key={name} className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400">
                            {name}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="space-y-2">
                    {calendar.map((week, weekIdx) => (
                        <div key={weekIdx} className="grid grid-cols-7 gap-2">
                            {week.map((dayObj, dayIdx) => {
                                if (!dayObj) {
                                    return <div key={dayIdx} className="aspect-square" />;
                                }

                                const { day, isActive, isToday } = dayObj;

                                return (
                                    <motion.div
                                        key={dayIdx}
                                        whileHover={{ scale: 1.1 }}
                                        className={`
                                            aspect-square rounded-lg flex items-center justify-center text-sm font-medium
                                            transition-all cursor-pointer
                                            ${isActive
                                                ? 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-md'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                            }
                                            ${isToday
                                                ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800'
                                                : ''
                                            }
                                        `}
                                        title={isActive ? 'Active day!' : 'No activity'}
                                    >
                                        {day}
                                    </motion.div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Achievement Badges */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Streak Milestones
                </h4>
                <div className="flex gap-4">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${streak.current >= 5
                            ? 'bg-orange-100 dark:bg-orange-900/30'
                            : 'bg-gray-100 dark:bg-gray-700 opacity-50'
                        }`}>
                        <span className="text-2xl">🔥</span>
                        <div className="text-xs">
                            <div className="font-semibold text-gray-800 dark:text-gray-200">5 Days</div>
                            <div className="text-gray-600 dark:text-gray-400">Fire</div>
                        </div>
                    </div>

                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${streak.current >= 10
                            ? 'bg-yellow-100 dark:bg-yellow-900/30'
                            : 'bg-gray-100 dark:bg-gray-700 opacity-50'
                        }`}>
                        <span className="text-2xl">⭐</span>
                        <div className="text-xs">
                            <div className="font-semibold text-gray-800 dark:text-gray-200">10 Days</div>
                            <div className="text-gray-600 dark:text-gray-400">Star</div>
                        </div>
                    </div>

                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${streak.current >= 30
                            ? 'bg-purple-100 dark:bg-purple-900/30'
                            : 'bg-gray-100 dark:bg-gray-700 opacity-50'
                        }`}>
                        <span className="text-2xl">💎</span>
                        <div className="text-xs">
                            <div className="font-semibold text-gray-800 dark:text-gray-200">30 Days</div>
                            <div className="text-gray-600 dark:text-gray-400">Diamond</div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default StreakCalendar;
