import React, { useState, useEffect } from 'react';
import { FiCalendar, FiClock, FiStar, FiInfo } from 'react-icons/fi';
import { MdRestaurantMenu, MdFreeBreakfast, MdLunchDining, MdDinnerDining } from 'react-icons/md';
import menuService from '../../services/menuService';
import { toast } from 'react-hot-toast';
import { format, addDays, startOfWeek } from 'date-fns';

const WeeklyMenu = () => {
  const [weeklyMenu, setWeeklyMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [weekStartDate, setWeekStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const mealTimes = {
    breakfast: { start: '07:00 AM', end: '09:30 AM', icon: MdFreeBreakfast, color: 'orange' },
    lunch: { start: '12:30 PM', end: '02:30 PM', icon: MdLunchDining, color: 'blue' },
    dinner: { start: '07:30 PM', end: '09:30 PM', icon: MdDinnerDining, color: 'purple' }
  };

  useEffect(() => {
    fetchWeeklyMenu();
  }, []);

  const fetchWeeklyMenu = async () => {
    setLoading(true);
    try {
      const response = await menuService.getWeeklyMenu();
      // Backend returns grouped menu by day: { monday: { breakfast: {...}, lunch: {...} }, tuesday: ... }
      const groupedData = response.data || response;

      // Convert to array format expected by the component
      const menuArray = [];
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

      days.forEach(day => {
        if (groupedData[day]) {
          const dayMenu = {
            day: day.charAt(0).toUpperCase() + day.slice(1),
            breakfast: groupedData[day].breakfast || null,
            lunch: groupedData[day].lunch || null,
            dinner: groupedData[day].dinner || null
          };
          menuArray.push(dayMenu);
        } else {
          // Add empty day if no menu
          menuArray.push({
            day: day.charAt(0).toUpperCase() + day.slice(1),
            breakfast: null,
            lunch: null,
            dinner: null
          });
        }
      });

      setWeeklyMenu(menuArray);
    } catch (error) {
      console.error('Error fetching weekly menu:', error);
      toast.error('Failed to fetch weekly menu');
      setWeeklyMenu([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const getTodaysMeals = () => {
    const today = daysOfWeek[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
    return weeklyMenu?.find(day => day.day === today) || null;
  };

  const getSelectedDayMenu = () => {
    return weeklyMenu?.find(day => day.day === daysOfWeek[selectedDay === 0 ? 6 : selectedDay - 1]) || null;
  };

  const isToday = (dayIndex) => {
    const today = new Date().getDay();
    return dayIndex === (today === 0 ? 6 : today - 1);
  };

  const getCurrentMeal = () => {
    const now = new Date();
    const hours = now.getHours();
    
    if (hours >= 7 && hours < 10) return 'breakfast';
    if (hours >= 12 && hours < 15) return 'lunch';
    if (hours >= 19 && hours < 22) return 'dinner';
    return null;
  };

  const currentMeal = getCurrentMeal();
  const todayMenu = getTodaysMeals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-gray-900 dark:via-dark-bg dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">Weekly Menu</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Delicious meals throughout the week</p>
        </div>

        {/* Today's Special */}
        {todayMenu && currentMeal && todayMenu[currentMeal] && (
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-8 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold flex items-center">
                <FiStar className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                Today's {currentMeal.charAt(0).toUpperCase() + currentMeal.slice(1)}
              </h2>
              <span className="px-2 sm:px-3 py-1 bg-white/20 rounded-full text-xs sm:text-sm w-fit">
                {mealTimes[currentMeal].start} - {mealTimes[currentMeal].end}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <h3 className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">Main Items</h3>
                <ul className="space-y-0.5 sm:space-y-1 text-sm">
                  {todayMenu[currentMeal]?.items?.map((item, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full mr-2"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              {todayMenu[currentMeal]?.special_note && (
                <div>
                  <h3 className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">Chef's Special</h3>
                  <p className="text-white/90 text-sm">{todayMenu[currentMeal].special_note}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Day Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Select Day</h3>
            <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              <FiCalendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              Week of {format(weekStartDate, 'MMM dd')}
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {daysOfWeek.map((day, index) => (
              <button
                key={day}
                onClick={() => setSelectedDay(index === 6 ? 0 : index + 1)}
                className={`py-2 sm:py-3 px-1 sm:px-2 rounded-lg text-center transition-all ${
                  (selectedDay === 0 ? 6 : selectedDay - 1) === index
                    ? 'bg-primary-500 text-white shadow-md transform scale-105'
                    : isToday(index)
                    ? 'bg-primary-100 text-primary-700 border-2 border-primary-300'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <div className="text-[10px] sm:text-xs font-medium">{day.slice(0, 3)}</div>
                <div className="text-sm sm:text-lg font-bold mt-0.5 sm:mt-1">
                  {format(addDays(weekStartDate, index), 'dd')}
                </div>
                {isToday(index) && (
                  <div className="text-[9px] sm:text-xs mt-0.5 sm:mt-1">Today</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Day Menu */}
        {loading ? (
          <div className="flex justify-center py-8 sm:py-12">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {['breakfast', 'lunch', 'dinner'].map((mealType) => {
              const meal = mealTimes[mealType];
              const Icon = meal.icon;
              const menuData = getSelectedDayMenu();
              const mealItems = menuData?.[mealType];

              return (
                <div key={mealType} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                  {/* Meal Header */}
                  <div className={`bg-gradient-to-r from-${meal.color}-500 to-${meal.color}-600 p-3 sm:p-4 text-white`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 mr-1.5 sm:mr-2" />
                        <h3 className="text-base sm:text-lg font-semibold capitalize">{mealType}</h3>
                      </div>
                      <div className="flex items-center text-xs sm:text-sm">
                        <FiClock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                        {meal.start}
                      </div>
                    </div>
                  </div>

                  {/* Meal Items */}
                  <div className="p-3 sm:p-4">
                    {mealItems ? (
                      <>
                        <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                          {mealItems.items?.map((item, index) => (
                            <div key={index} className="flex items-start">
                              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                              <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                            </div>
                          ))}
                        </div>

                        {mealItems.special_note && (
                          <div className="pt-2 sm:pt-3 border-t">
                            <div className="flex items-start">
                              <FiStar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500 mr-1.5 sm:mr-2 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Special</p>
                                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{mealItems.special_note}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {mealItems.calories && (
                          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t">
                            <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                              <span>Cal: {mealItems.calories}</span>
                              <span>Pro: {mealItems.protein}g</span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-3 sm:py-4 text-sm">Not available</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Nutritional Info */}
        <div className="mt-4 sm:mt-8 bg-blue-50 dark:bg-gray-800 rounded-xl p-4 sm:p-6">
          <div className="flex items-start">
            <FiInfo className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-blue-900 dark:text-blue-300 mb-1 sm:mb-2">Nutrition Info</h3>
              <p className="text-blue-700 dark:text-blue-300 text-xs sm:text-sm mb-2 sm:mb-3">
                Balanced nutrition for students.
              </p>
              <div className="grid grid-cols-4 gap-2 sm:gap-4">
                <div>
                  <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 mb-0.5 sm:mb-1">Calories</p>
                  <p className="text-sm sm:text-xl font-bold text-blue-900 dark:text-blue-300">2200</p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 mb-0.5 sm:mb-1">Protein</p>
                  <p className="text-sm sm:text-xl font-bold text-blue-900 dark:text-blue-300">70g</p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 mb-0.5 sm:mb-1">Carbs</p>
                  <p className="text-sm sm:text-xl font-bold text-blue-900 dark:text-blue-300">320g</p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 mb-0.5 sm:mb-1">Fiber</p>
                  <p className="text-sm sm:text-xl font-bold text-blue-900 dark:text-blue-300">28g</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Meal Timings Card */}
        <div className="mt-4 sm:mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Meal Timings</h3>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {Object.entries(mealTimes).map(([meal, info]) => {
              const Icon = info.icon;
              return (
                <div key={meal} className="flex flex-col sm:flex-row items-center sm:items-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center sm:text-left">
                  <Icon className={`w-6 h-6 sm:w-8 sm:h-8 text-${info.color}-500 sm:mr-3 mb-1 sm:mb-0`} />
                  <div>
                    <p className="text-xs sm:text-base font-medium text-gray-900 dark:text-white capitalize">{meal}</p>
                    <p className="text-[10px] sm:text-sm text-gray-600 dark:text-gray-300">{info.start}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyMenu;